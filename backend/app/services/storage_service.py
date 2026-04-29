"""Storage service: direct Google Drive upload.

Reusable across gallery and chat features.
No local file system dependency — images are uploaded immediately to Drive
and the thumbnailLink is stored in Firestore as `image_url`.

⚠️  Google Drive 업로드 대상 폴더의 공유 권한을
    '링크가 있는 모든 사용자(뷰어)'로 반드시 변경해야 이미지가 정상 렌더링됩니다.
    (Drive > 폴더 우클릭 > 공유 > '링크가 있는 모든 사용자' 선택)
"""

import uuid
import hashlib
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Allowed extensions
ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"}
ALLOWED_VIDEO_EXT = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXT | ALLOWED_VIDEO_EXT

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file


def _is_allowed(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS


def _get_media_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in ALLOWED_IMAGE_EXT:
        return "image"
    return "video"


def _build_thumbnail_url(file_id: str, size: int = 1000) -> str:
    """Build a resizable Google Drive thumbnail URL.

    The `sz=w{size}` parameter controls the max width.
    The Drive folder must be shared as 'Anyone with the link' for this to work.
    """
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w{size}"


def _get_drive_service():
    """Build and return an authenticated Google Drive API service.

    Tries OAuth 2.0 Refresh Token first, falls back to Service Account.
    """
    from googleapiclient.discovery import build
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from app.config import settings
    import json, os

    drive_cred = None

    # 1. Try OAuth 2.0 (Preferred for Personal Drive)
    if settings.google_refresh_token and settings.google_client_id and settings.google_client_secret:
        try:
            drive_cred = Credentials(
                token=None,
                refresh_token=settings.google_refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
            )
            logger.info("Using OAuth 2.0 Refresh Token for Drive upload")
        except Exception as e:
            logger.error(f"Failed to build OAuth credentials: {e}")

    # 2. Fallback to Service Account
    if not drive_cred:
        logger.info("Falling back to Service Account for Drive upload")
        svc_info = None
        if settings.firebase_credentials_json:
            svc_info = json.loads(settings.firebase_credentials_json)
        elif settings.firebase_credentials_path and os.path.exists(settings.firebase_credentials_path):
            with open(settings.firebase_credentials_path) as f:
                svc_info = json.load(f)

        if svc_info:
            drive_cred = service_account.Credentials.from_service_account_info(
                svc_info,
                scopes=["https://www.googleapis.com/auth/drive.file"],
            )
        else:
            raise RuntimeError("Drive upload: No credentials found (OAuth or Service Account)")

    return build("drive", "v3", credentials=drive_cred)


def _get_or_create_drive_folder(service, parent_id: str, folder_name: str) -> str:
    """Return the Drive folder ID for folder_name inside parent_id.
    Creates the folder if it doesn't exist yet.
    """
    query = (
        f"name = '{folder_name}' "
        f"and '{parent_id}' in parents "
        f"and mimeType = 'application/vnd.google-apps.folder' "
        f"and trashed = false"
    )
    results = service.files().list(
        q=query, fields="files(id)", supportsAllDrives=True
    ).execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(
        body=metadata, fields="id", supportsAllDrives=True
    ).execute()
    return folder["id"]


async def upload_to_drive_direct(
    file_bytes: bytes,
    original_filename: str,
    group_id: str,
    date_label: str,
    folder_id: str,
) -> dict:
    """Upload file bytes directly to Google Drive (no local temp file).

    Returns a metadata dict with `image_url` set to the Drive thumbnail link.
    Raises ValueError for disallowed file types or oversized files.
    Raises RuntimeError if credentials are missing.
    """
    import io
    from googleapiclient.http import MediaIoBaseUpload

    if not _is_allowed(original_filename):
        raise ValueError(f"File type not allowed: {original_filename}")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError("File too large (max 100MB)")

    content_hash = hashlib.sha256(file_bytes).hexdigest()
    ext = Path(original_filename).suffix.lower()
    file_id = uuid.uuid4().hex[:12]
    safe_name = f"{file_id}{ext}"

    service = _get_drive_service()

    # Mirror structure: root/{group_id}/{date_label}/
    target_folder_id = folder_id
    if group_id:
        target_folder_id = _get_or_create_drive_folder(service, target_folder_id, group_id)
    if date_label:
        target_folder_id = _get_or_create_drive_folder(service, target_folder_id, date_label)

    file_metadata = {
        "name": original_filename,
        "parents": [target_folder_id],
    }

    media_body = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype="application/octet-stream", resumable=True)
    result = service.files().create(
        body=file_metadata,
        media_body=media_body,
        fields="id, thumbnailLink, webViewLink",
        supportsAllDrives=True,
    ).execute()

    drive_file_id = result.get("id")
    # Use a high-resolution thumbnail URL (resizable via sz parameter)
    thumbnail_url = _build_thumbnail_url(drive_file_id, size=1000)

    logger.info(f"Drive upload success: {group_id}/{date_label}/{original_filename} -> file_id={drive_file_id}")

    return {
        "file_id": file_id,
        "filename": safe_name,
        "original_name": original_filename,
        "media_type": _get_media_type(original_filename),
        "size": len(file_bytes),
        "content_hash": content_hash,
        "date_label": date_label,
        "group_id": group_id,
        "drive_file_id": drive_file_id,
        "image_url": thumbnail_url,           # ← Drive thumbnail, stored in Firestore
        "drive_status": "done",
        "created_at": datetime.utcnow().isoformat(),
    }

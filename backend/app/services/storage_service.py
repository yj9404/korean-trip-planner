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


def _build_thumbnail_url(drive_file_id: str, size: int = 1000) -> str:
    """Build a resizable Google Drive thumbnail URL.

    The `sz=w{size}` parameter controls the max width.
    """
    return f"https://drive.google.com/thumbnail?id={drive_file_id}&sz=w{size}"


def get_drive_access_token() -> str:
    """Return a fresh OAuth access token for Drive API calls.

    Mirrors _get_drive_service() credential logic but only returns the token,
    which can then be used directly in HTTP requests (e.g. streaming proxy).
    """
    import google.auth.transport.requests
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from app.config import settings
    import json, os

    cred = None

    # 1. OAuth 2.0 Refresh Token
    if settings.google_refresh_token and settings.google_client_id and settings.google_client_secret:
        try:
            cred = Credentials(
                token=None,
                refresh_token=settings.google_refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.google_client_id,
                client_secret=settings.google_client_secret,
            )
        except Exception as e:
            logger.error(f"OAuth credential build failed: {e}")

    # 2. Service Account fallback
    if cred is None:
        svc_info = None
        if settings.firebase_credentials_json:
            svc_info = json.loads(settings.firebase_credentials_json)
        elif settings.firebase_credentials_path and os.path.exists(settings.firebase_credentials_path):
            with open(settings.firebase_credentials_path) as f:
                svc_info = json.load(f)
        if svc_info:
            cred = service_account.Credentials.from_service_account_info(
                svc_info,
                scopes=["https://www.googleapis.com/auth/drive.file"],
            )
        else:
            raise RuntimeError("No Drive credentials available")

    cred.refresh(google.auth.transport.requests.Request())
    return cred.token


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

    # Make the file publicly readable (Anyone with the link → no Google login required).
    # NOTE: Folder-level sharing does NOT automatically propagate to API-created files.
    try:
        service.permissions().create(
            fileId=drive_file_id,
            body={"type": "anyone", "role": "reader"},
            supportsAllDrives=True,
        ).execute()
        logger.info(f"Set public permission on Drive file {drive_file_id}")
    except Exception as e:
        logger.warning(f"Could not set public permission on {drive_file_id}: {e}")

    thumbnail_url = _build_thumbnail_url(drive_file_id)
    logger.info(f"Drive upload success: {group_id}/{date_label}/{original_filename} -> {thumbnail_url}")

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
        "image_url": thumbnail_url,
        "drive_status": "done",
        "created_at": datetime.utcnow().isoformat(),
    }


async def create_drive_upload_session(
    original_filename: str,
    file_size: int,
    group_id: str,
    date_label: str,
    folder_id: str,
) -> str:
    """Create a Google Drive resumable upload session URI for direct client-side upload.

    The returned URI can be used by the browser to PUT the file directly to Drive,
    bypassing Cloud Run's request body / timeout limits for large videos.
    """
    import asyncio
    import httpx

    if not _is_allowed(original_filename):
        raise ValueError(f"File type not allowed: {original_filename}")
    if file_size > MAX_FILE_SIZE:
        raise ValueError("File too large (max 100MB)")

    service = await asyncio.to_thread(_get_drive_service)
    target_folder_id = folder_id
    if group_id:
        target_folder_id = await asyncio.to_thread(
            _get_or_create_drive_folder, service, target_folder_id, group_id
        )
    if date_label:
        target_folder_id = await asyncio.to_thread(
            _get_or_create_drive_folder, service, target_folder_id, date_label
        )

    access_token = await asyncio.to_thread(get_drive_access_token)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://www.googleapis.com/upload/drive/v3/files",
            params={"uploadType": "resumable", "supportsAllDrives": "true"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Upload-Content-Type": "application/octet-stream",
                "X-Upload-Content-Length": str(file_size),
            },
            json={"name": original_filename, "parents": [target_folder_id]},
        )

    if resp.status_code != 200:
        raise RuntimeError(
            f"Drive resumable session creation failed: {resp.status_code} {resp.text[:300]}"
        )

    session_uri = resp.headers.get("location")
    if not session_uri:
        raise RuntimeError("Drive did not return a session URI (Location header missing)")

    logger.info(f"Created Drive upload session: {original_filename} ({file_size} bytes)")
    return session_uri


async def set_drive_file_public(drive_file_id: str) -> str:
    """Set 'anyone can read' permission on a Drive file. Returns the thumbnail URL."""
    import asyncio

    service = await asyncio.to_thread(_get_drive_service)
    try:
        await asyncio.to_thread(
            lambda: service.permissions().create(
                fileId=drive_file_id,
                body={"type": "anyone", "role": "reader"},
                supportsAllDrives=True,
            ).execute()
        )
        logger.info(f"Set public permission on Drive file {drive_file_id}")
    except Exception as e:
        logger.warning(f"Could not set public permission on {drive_file_id}: {e}")

    return _build_thumbnail_url(drive_file_id)

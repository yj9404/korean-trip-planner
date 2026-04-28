"""Storage service: local file save + async Google Drive upload.

Reusable across gallery and chat features.
"""

import os
import uuid
import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Local upload directory
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

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


def save_file_locally(
    file_bytes: bytes,
    original_filename: str,
    group_id: str,
    date_label: str,  # e.g. "2026-02-20"
) -> dict:
    """Save file to local disk. Returns metadata dict.

    Directory structure: uploads/{group_id}/{date_label}/{uuid_filename}
    """
    if not _is_allowed(original_filename):
        raise ValueError(f"File type not allowed: {original_filename}")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError("File too large (max 100MB)")

    content_hash = hashlib.sha256(file_bytes).hexdigest()

    ext = Path(original_filename).suffix.lower()
    file_id = uuid.uuid4().hex[:12]
    safe_name = f"{file_id}{ext}"

    target_dir = UPLOAD_DIR / group_id / date_label
    target_dir.mkdir(parents=True, exist_ok=True)

    file_path = target_dir / safe_name
    file_path.write_bytes(file_bytes)

    return {
        "file_id": file_id,
        "filename": safe_name,
        "original_name": original_filename,
        "media_type": _get_media_type(original_filename),
        "size": len(file_bytes),
        "content_hash": content_hash,
        "local_path": str(file_path),
        "date_label": date_label,
        "group_id": group_id,
        "drive_status": "pending",  # pending | uploading | done | failed
        "drive_url": None,
        "created_at": datetime.utcnow().isoformat(),
    }


def get_local_file_path(group_id: str, date_label: str, filename: str) -> Optional[Path]:
    """Get full path of a locally stored file."""
    path = UPLOAD_DIR / group_id / date_label / filename
    return path if path.exists() else None


def delete_local_file(group_id: str, date_label: str, filename: str) -> bool:
    """Delete a file from local storage."""
    path = UPLOAD_DIR / group_id / date_label / filename
    if path.exists():
        path.unlink()
        return True
    return False


# ---------------------------------------------------------------------------
# Google Drive async upload (background task)
# ---------------------------------------------------------------------------

def _get_or_create_drive_folder(service, parent_id: str, folder_name: str) -> str:
    """Return the Drive folder ID for folder_name inside parent_id.
    Creates the folder if it doesn't exist yet.
    """
    # Search for existing folder first to avoid duplicates
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

    # Create the folder
    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    folder = service.files().create(
        body=metadata, fields="id", supportsAllDrives=True
    ).execute()
    return folder["id"]


async def upload_to_google_drive(
    file_path: str,
    original_name: str,
    folder_id: Optional[str] = None,
    group_id: Optional[str] = None,
    date_label: Optional[str] = None,
) -> Optional[str]:
    """Upload a file to Google Drive, mirroring local folder structure.

    Creates /{folder_id}/{group_id}/{date_label}/ on Drive automatically.
    Uses OAuth 2.0 Refresh Token if available, falls back to Service Account.
    """
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        from google.oauth2 import service_account
        from google.oauth2.credentials import Credentials
        from app.config import settings
        import json, os

        drive_cred = None

        # 1. Try OAuth 2.0 (Preferred for Personal Drive)
        if settings.google_refresh_token and settings.google_client_id and settings.google_client_secret:
            try:
                drive_cred = Credentials(
                    token=None,  # Access token will be auto-refreshed
                    refresh_token=settings.google_refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=settings.google_client_id,
                    client_secret=settings.google_client_secret,
                )
                logger.info("Using OAuth 2.0 Refresh Token for Drive upload")
            except Exception as e:
                logger.error(f"Failed to use Refresh Token: {e}")

        # 2. Fallback to Service Account (If OAuth not configured)
        if not drive_cred:
            logger.info("Falling back to Service Account for Drive upload")
            svc_info: dict | None = None
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
                logger.error("Drive upload: No credentials found (OAuth or Service Account)")
                return None

        service = build("drive", "v3", credentials=drive_cred)

        if not folder_id:
            logger.error("Drive upload: No root folder ID configured (GOOGLE_DRIVE_FOLDER_ID)")
            return None

        # Mirror local folder structure: root/{group_id}/{date_label}/
        target_folder_id = folder_id
        if group_id:
            target_folder_id = _get_or_create_drive_folder(service, target_folder_id, group_id)
        if date_label:
            target_folder_id = _get_or_create_drive_folder(service, target_folder_id, date_label)

        file_metadata = {
            "name": original_name,
            "parents": [target_folder_id],
        }

        media = MediaFileUpload(file_path, resumable=True)
        result = service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, webViewLink",
            supportsAllDrives=True,
        ).execute()

        drive_url = result.get("webViewLink")
        logger.info(f"Drive upload success: {group_id}/{date_label}/{original_name} -> {drive_url}")
        return drive_url

    except Exception as e:
        logger.error(f"Drive upload failed for {original_name}: {e}")
        return None



async def background_drive_upload(
    file_meta: dict,
    db,  # Firestore client
    folder_id: Optional[str] = None,
):
    """Background task: upload to Drive and update Firestore metadata."""
    file_path = file_meta["local_path"]
    group_id = file_meta["group_id"]
    file_id = file_meta["file_id"]

    # Update status to uploading
    try:
        doc_ref = db.collection("groups").document(group_id)\
                    .collection("media").document(file_id)
        doc_ref.update({"drive_status": "uploading"})
    except Exception:
        pass

    drive_url = await upload_to_google_drive(
        file_path, file_meta["original_name"], folder_id,
        group_id=group_id,
        date_label=file_meta.get("date_label"),
    )

    status = "done" if drive_url else "failed"
    try:
        doc_ref = db.collection("groups").document(group_id)\
                    .collection("media").document(file_id)
        doc_ref.update({
            "drive_status": status,
            "drive_url": drive_url,
        })
    except Exception as e:
        logger.error(f"Failed to update Firestore after Drive upload: {e}")

async def download_from_google_drive(
    drive_url: str,
    group_id: str,
    date_label: str,
    filename: str,
) -> Optional[Path]:
    """Download a file from Google Drive to local storage."""
    import re
    import json
    import os
    import io
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from google.oauth2 import service_account
    from google.oauth2.credentials import Credentials
    from app.config import settings

    # Extract Drive file ID
    match = re.search(r"/d/([a-zA-Z0-9_-]+)", drive_url)
    if not match:
        logger.error(f"Could not parse Drive file ID from URL: {drive_url}")
        return None
    file_id = match.group(1)

    try:
        drive_cred = None

        # 1. Try OAuth 2.0
        if settings.google_refresh_token and settings.google_client_id and settings.google_client_secret:
            try:
                drive_cred = Credentials(
                    token=None,
                    refresh_token=settings.google_refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=settings.google_client_id,
                    client_secret=settings.google_client_secret,
                )
            except Exception as e:
                logger.error(f"Failed to use Refresh Token for download: {e}")

        # 2. Fallback to Service Account
        if not drive_cred:
            svc_info: dict | None = None
            if settings.firebase_credentials_json:
                svc_info = json.loads(settings.firebase_credentials_json)
            elif settings.firebase_credentials_path and os.path.exists(settings.firebase_credentials_path):
                with open(settings.firebase_credentials_path) as f:
                    svc_info = json.load(f)

            if svc_info:
                drive_cred = service_account.Credentials.from_service_account_info(
                    svc_info,
                    scopes=["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive.readonly"],
                )
            else:
                logger.error("Drive download: No credentials found")
                return None

        service = build("drive", "v3", credentials=drive_cred)

        target_dir = UPLOAD_DIR / group_id / date_label
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / filename

        tmp_file_path = file_path.with_suffix('.tmp')

        # Download file synchronously
        def do_download():
            request = service.files().get_media(fileId=file_id)
            with io.FileIO(tmp_file_path, "wb") as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while done is False:
                    status, done = downloader.next_chunk()

        # Run blocking network and file I/O in threadpool
        import anyio.to_thread
        await anyio.to_thread.run_sync(do_download)

        # Atomically rename to prevent serving corrupted partial files
        tmp_file_path.rename(file_path)

        logger.info(f"Drive download success: {file_id} -> {file_path}")
        return file_path

    except Exception as e:
        logger.error(f"Drive download failed for {filename} ({file_id}): {e}")
        return None

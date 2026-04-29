"""Media upload/list/delete API for gallery and chat."""

import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.services.firebase_service import firebase_service
from app.dependencies import get_current_user, get_current_group
from app.services.storage_service import (
    upload_to_drive_direct, ALLOWED_EXTENSIONS, get_drive_access_token,
    create_drive_upload_session, set_drive_file_public, _get_media_type,
)
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload")
async def upload_media(
    files: List[UploadFile] = File(...),
    date_label: str = Form(...),  # "2026-02-20"
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """Upload up to 30 files at once. Uploads directly to Google Drive and
    stores the thumbnailLink as `image_url` in Firestore.
    Skips files that are exact duplicates (same SHA-256 hash) within the group.

    ⚠️  PM 안내: Google Drive 업로드 대상 폴더의 공유 권한을
        '링크가 있는 모든 사용자(뷰어)'로 반드시 변경해야 이미지가 정상 렌더링됩니다.
    """
    import hashlib

    if len(files) > 30:
        raise HTTPException(400, "Maximum 30 files per upload")

    if not settings.google_drive_folder_id:
        raise HTTPException(500, "Google Drive folder not configured (GOOGLE_DRIVE_FOLDER_ID)")

    group_id = current_group_id
    uploader_id = current_user["uid"]
    uploader_name = current_user.get("name", "Unknown")
    db = firebase_service.db
    media_col = db.collection("groups").document(group_id).collection("media")

    results = []
    duplicates = []
    errors = []

    for f in files:
        try:
            content = await f.read()

            # --- Duplicate check via SHA-256 hash ---
            content_hash = hashlib.sha256(content).hexdigest()
            existing = list(media_col.where("content_hash", "==", content_hash).limit(1).stream())
            if existing:
                existing_data = existing[0].to_dict()
                duplicates.append({
                    "file": f.filename,
                    "existing_date": existing_data.get("date_label", ""),
                    "existing_name": existing_data.get("original_name", ""),
                })
                continue

            # Upload directly to Google Drive — no local temp file
            meta = await upload_to_drive_direct(
                file_bytes=content,
                original_filename=f.filename,
                group_id=group_id,
                date_label=date_label,
                folder_id=settings.google_drive_folder_id,
            )
            meta["uploader_id"] = uploader_id
            meta["uploader_name"] = uploader_name

            # Save metadata (including image_url) to Firestore
            media_col.document(meta["file_id"]).set(meta)

            results.append({
                "file_id": meta["file_id"],
                "filename": meta["filename"],
                "original_name": meta["original_name"],
                "media_type": meta["media_type"],
                "size": meta["size"],
                "date_label": meta["date_label"],
                "image_url": meta["image_url"],
                "drive_status": "done",
            })
        except ValueError as e:
            errors.append({"file": f.filename, "error": str(e)})
        except Exception as e:
            logger.error(f"Upload error for {f.filename}: {e}")
            errors.append({"file": f.filename, "error": "Upload failed"})

    return {
        "uploaded": results,
        "duplicates": duplicates,
        "errors": errors,
        "total": len(results),
    }


@router.post("/create-upload-session")
async def create_upload_session(
    filename: str = Form(...),
    date_label: str = Form(...),
    file_size: int = Form(...),
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """Create a Google Drive resumable upload session URI.
    The client uploads the file directly to Drive using the returned URI,
    bypassing Cloud Run's body size / timeout limits for large videos.
    """
    if not settings.google_drive_folder_id:
        raise HTTPException(500, "Google Drive folder not configured")

    try:
        session_uri = await create_drive_upload_session(
            original_filename=filename,
            file_size=file_size,
            group_id=current_group_id,
            date_label=date_label,
            folder_id=settings.google_drive_folder_id,
        )
        return {"session_uri": session_uri}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"create_upload_session error for {filename}: {e}")
        raise HTTPException(500, "Failed to create Drive upload session")


@router.post("/finalize-upload")
async def finalize_upload(
    drive_file_id: str = Form(...),
    original_name: str = Form(...),
    date_label: str = Form(...),
    file_size: int = Form(...),
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """Save Drive file metadata to Firestore after a direct client upload completes."""
    import uuid
    from pathlib import Path

    group_id = current_group_id
    db = firebase_service.db
    media_col = db.collection("groups").document(group_id).collection("media")

    existing = list(media_col.where("drive_file_id", "==", drive_file_id).limit(1).stream())
    if existing:
        existing_data = existing[0].to_dict()
        return {"status": "duplicate", "file_id": existing_data.get("file_id", existing[0].id)}

    try:
        thumbnail_url = await set_drive_file_public(drive_file_id)
        ext = Path(original_name).suffix.lower()
        file_id = uuid.uuid4().hex[:12]

        meta = {
            "file_id": file_id,
            "filename": f"{file_id}{ext}",
            "original_name": original_name,
            "media_type": _get_media_type(original_name),
            "size": file_size,
            "date_label": date_label,
            "group_id": group_id,
            "drive_file_id": drive_file_id,
            "image_url": thumbnail_url,
            "drive_status": "done",
            "created_at": datetime.utcnow().isoformat(),
            "uploader_id": current_user["uid"],
            "uploader_name": current_user.get("name", "Unknown"),
        }
        media_col.document(file_id).set(meta)
        logger.info(f"Finalized direct upload: {original_name} -> drive:{drive_file_id}")

        return {
            "status": "ok",
            "file_id": file_id,
            "image_url": thumbnail_url,
            "media_type": meta["media_type"],
        }
    except Exception as e:
        logger.error(f"finalize_upload error for drive:{drive_file_id}: {e}")
        raise HTTPException(500, "Failed to save upload metadata")


@router.get("/list")
async def list_media(
    date_label: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """List media files for current group, optionally filtered by date."""
    group_id = current_group_id
    db = firebase_service.db
    from firebase_admin import firestore as fs

    query = db.collection("groups").document(group_id).collection("media")

    if date_label:
        query = query.where("date_label", "==", date_label)

    query = query.order_by("created_at", direction=fs.Query.DESCENDING)

    docs = query.stream()
    items = []
    for doc in docs:
        data = doc.to_dict()
        items.append(data)

    return items


@router.get("/dates")
async def list_dates(
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """List all dates that have media for current group."""
    group_id = current_group_id
    db = firebase_service.db

    docs = db.collection("groups").document(group_id)\
             .collection("media")\
             .order_by("date_label")\
             .stream()

    dates = sorted(set(doc.to_dict().get("date_label", "") for doc in docs))
    return dates


@router.get("/{file_id}/stream")
async def stream_video(
    file_id: str,
    request: Request,
    token: str,  # Firebase ID token via query param (video element cannot send headers)
):
    """Stream a video file from Google Drive with HTTP Range request support.

    The `token` query param is used because the browser's <video> element
    cannot attach custom Authorization headers.
    """
    import httpx
    from firebase_admin import auth as firebase_auth

    # --- Auth: verify Firebase token from query param ---
    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=False, clock_skew_seconds=60)
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")

    user_id = decoded["uid"]

    # Resolve group
    preferences = await firebase_service.get_user_preferences(user_id)
    group_id = preferences.get("current_group_id")
    if not group_id or not await firebase_service.check_user_group_access(user_id, group_id):
        groups = await firebase_service.get_user_groups(user_id)
        if groups:
            group_id = groups[0]["id"]
        else:
            raise HTTPException(403, "No group access")

    # --- Fetch media doc ---
    db = firebase_service.db
    doc = db.collection("groups").document(group_id).collection("media").document(file_id).get()
    if not doc.exists:
        raise HTTPException(404, "File not found")

    data = doc.to_dict()
    if data.get("media_type") != "video":
        raise HTTPException(400, "Not a video file")

    drive_file_id = data.get("drive_file_id")
    if not drive_file_id:
        raise HTTPException(404, "Drive file ID not found")

    # --- Get fresh Drive access token ---
    try:
        access_token = get_drive_access_token()
    except Exception as e:
        logger.error(f"Failed to get Drive access token: {e}")
        raise HTTPException(500, "Failed to authenticate with Drive")

    # --- Determine content type ---
    original_name = data.get("original_name", "video.mp4")
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else "mp4"
    content_type = {
        "mp4": "video/mp4",
        "mov": "video/quicktime",
        "avi": "video/x-msvideo",
        "webm": "video/webm",
        "mkv": "video/x-matroska",
    }.get(ext, "video/mp4")

    drive_url = (
        f"https://www.googleapis.com/drive/v3/files/{drive_file_id}"
        f"?alt=media&supportsAllDrives=true"
    )

    # --- Forward Range header if present (enables seeking) ---
    proxy_headers = {"Authorization": f"Bearer {access_token}"}
    range_header = request.headers.get("range")
    if range_header:
        proxy_headers["Range"] = range_header

    logger.info(
        f"Stream request: file_id={file_id} drive_file_id={drive_file_id} "
        f"ext={ext} range={range_header!r}"
    )

    # Open the Drive stream and keep it alive for the generator
    client = httpx.AsyncClient(follow_redirects=True, timeout=httpx.Timeout(10.0, read=None))
    drive_req = client.build_request("GET", drive_url, headers=proxy_headers)
    drive_resp = await client.send(drive_req, stream=True)

    logger.info(
        f"Drive response: status={drive_resp.status_code} "
        f"content-type={drive_resp.headers.get('content-type')} "
        f"content-length={drive_resp.headers.get('content-length')}"
    )

    if drive_resp.status_code not in (200, 206):
        await drive_resp.aclose()
        await client.aclose()
        logger.error(f"Drive stream error: {drive_resp.status_code} for {drive_file_id}")
        raise HTTPException(502, f"Drive returned {drive_resp.status_code}")

    # Build response headers — Content-Type is passed via media_type param, not here
    resp_headers = {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
    }
    for h in ("content-length", "content-range"):
        if h in drive_resp.headers:
            resp_headers[h] = drive_resp.headers[h]

    async def generate():
        try:
            async for chunk in drive_resp.aiter_bytes(65536):
                yield chunk
        finally:
            await drive_resp.aclose()
            await client.aclose()

    return StreamingResponse(
        generate(),
        status_code=drive_resp.status_code,
        headers=resp_headers,
        media_type=content_type,
    )


@router.delete("/{file_id}")
async def delete_media(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """Delete a media file (Drive + Firestore)."""
    group_id = current_group_id
    db = firebase_service.db

    doc_ref = db.collection("groups").document(group_id)\
                .collection("media").document(file_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(404, "File not found")

    data = doc.to_dict()

    # Only uploader can delete
    if data.get("uploader_id") != current_user["uid"]:
        raise HTTPException(403, "Not authorized to delete this file")

    # Delete from Firestore
    doc_ref.delete()

    # Best-effort: delete from Google Drive
    drive_file_id = data.get("drive_file_id")
    if drive_file_id:
        try:
            from app.services.storage_service import _get_drive_service
            service = _get_drive_service()
            service.files().delete(fileId=drive_file_id, supportsAllDrives=True).execute()
            logger.info(f"Deleted Drive file {drive_file_id} for media {file_id}")
        except Exception as e:
            logger.warning(f"Could not delete Drive file {drive_file_id}: {e}")

    return {"status": "deleted", "file_id": file_id}

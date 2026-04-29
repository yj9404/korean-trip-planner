"""Media upload/list/delete API for gallery and chat."""

import asyncio
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from app.services.firebase_service import firebase_service
from app.dependencies import get_current_user, get_current_group
from app.services.storage_service import (
    save_file_locally,
    get_local_file_path,
    delete_local_file,
    background_drive_upload,
    ALLOWED_EXTENSIONS,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload")
async def upload_media(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    date_label: str = Form(...),  # "2026-02-20"
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """Upload up to 30 files at once. Saves locally, then async uploads to Drive.
    Skips files that are exact duplicates (same SHA-256 hash) within the group.
    """
    import hashlib

    if len(files) > 30:
        raise HTTPException(400, "Maximum 30 files per upload")

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

            meta = save_file_locally(content, f.filename, group_id, date_label)
            meta["uploader_id"] = uploader_id
            meta["uploader_name"] = uploader_name

            # Save metadata to Firestore
            doc_ref = media_col.document(meta["file_id"])
            doc_ref.set(meta)

            # Schedule async Drive upload
            background_tasks.add_task(_run_drive_upload, meta, db)

            results.append({
                "file_id": meta["file_id"],
                "filename": meta["filename"],
                "original_name": meta["original_name"],
                "media_type": meta["media_type"],
                "size": meta["size"],
                "date_label": meta["date_label"],
                "drive_status": "pending",
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


async def _run_drive_upload(meta: dict, db):
    """Wrapper to run the async drive upload in background."""
    from app.config import settings
    await background_drive_upload(meta, db, folder_id=settings.google_drive_folder_id)


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
        # Build serve URL for local files
        data["serve_url"] = f"/api/v1/media/file/{group_id}/{data['date_label']}/{data['filename']}"
        # Build thumbnail URL (same as serve for now)
        data["thumbnail_url"] = data["serve_url"]
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


@router.get("/file/{group_id}/{date_label}/{filename}")
async def serve_file(group_id: str, date_label: str, filename: str):
    """Serve a locally stored media file."""
    path = get_local_file_path(group_id, date_label, filename)
    if not path:
        raise HTTPException(404, "File not found")
    return FileResponse(path)


@router.delete("/{file_id}")
async def delete_media(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    current_group_id: str = Depends(get_current_group),
):
    """Delete a media file (local + Firestore)."""
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

    # 1. Delete Firestore document first (so UI updates immediately)
    doc_ref.delete()

    # 2. Delete local file — best-effort; on Windows the file may be
    #    locked by an active FileResponse, so we silently ignore errors.
    try:
        delete_local_file(group_id, data["date_label"], data["filename"])
    except Exception as e:
        logger.warning(f"Could not delete local file for {file_id}: {e}")

    return {"status": "deleted", "file_id": file_id}

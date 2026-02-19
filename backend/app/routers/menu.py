"""Menu scan router - AI-powered Korean menu analysis"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.services.gemini_service import gemini_service
from app.dependencies import get_current_user

router = APIRouter()

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_SIZE_MB = 10


@router.post("/menu/analyze")
async def analyze_menu(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a Korean menu photo and get English descriptions for each item."""

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.",
        )

    image_bytes = await file.read()

    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Maximum size is {MAX_SIZE_MB}MB.",
        )

    result = await gemini_service.analyze_menu_image(image_bytes, file.content_type)

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    return result

"""Translation API router"""

from fastapi import APIRouter, HTTPException

from app.models.translation import TranslationRequest, TranslationResponse
from app.services.gemini_service import gemini_service

router = APIRouter()


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """
    Translate text using Google Gemini AI
    
    - **text**: Text to translate
    - **source_lang**: Source language code (ko, en, ja, zh, auto)
    - **target_lang**: Target language code (ko, en, ja, zh)
    - **context**: Optional context for better translation
    """
    try:
        result = await gemini_service.translate(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

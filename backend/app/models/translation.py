"""Translation data models"""

from pydantic import BaseModel, Field
from typing import Optional


class TranslationRequest(BaseModel):
    """Request model for translation"""
    text: str = Field(..., min_length=1)
    source_lang: str = Field(default="auto", description="Source language code (e.g., 'ko', 'en', 'auto')")
    target_lang: str = Field(..., description="Target language code (e.g., 'ko', 'en')")
    context: Optional[str] = Field(None, description="Additional context for better translation")


class TranslationResponse(BaseModel):
    """Response model for translation"""
    original_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    confidence: Optional[float] = None

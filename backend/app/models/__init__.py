"""Data models for the application"""

from .trip import Trip, TripCreate, TripUpdate
from .translation import TranslationRequest, TranslationResponse
from .ai_guide import AIGuideRequest, AIGuideResponse

__all__ = [
    "Trip",
    "TripCreate",
    "TripUpdate",
    "TranslationRequest",
    "TranslationResponse",
    "AIGuideRequest",
    "AIGuideResponse",
]

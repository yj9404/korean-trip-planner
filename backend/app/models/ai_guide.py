"""AI Guide data models"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AIGuideRequest(BaseModel):
    """Request model for AI travel guide"""
    query: str = Field(..., min_length=1, description="User's travel question or request")
    language: str = Field(default="en", description="Response language (ko, en)")
    location: Optional[str] = Field(None, description="Specific location in Korea")
    trip_dates: Optional[dict] = Field(None, description="Start and end dates")
    preferences: Optional[List[str]] = Field(None, description="User preferences (e.g., food, culture, nature)")


class Recommendation(BaseModel):
    """Single recommendation item"""
    title: str
    description: str
    category: str  # e.g., "restaurant", "attraction", "activity"
    location: Optional[str] = None
    estimated_cost: Optional[str] = None
    tips: Optional[List[str]] = None


class AIGuideResponse(BaseModel):
    """Response model for AI travel guide"""
    query: str
    response: str
    recommendations: List[Recommendation] = Field(default_factory=list)
    language: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)

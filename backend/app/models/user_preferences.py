"""User preferences data models"""

from pydantic import BaseModel, Field
from typing import Optional


class UserPreferences(BaseModel):
    """User preferences model"""
    user_id: str
    preferred_lang: str = Field(default="en", pattern="^(ko|en)$", description="Preferred language: ko or en")
    ai_bot_enabled: bool = Field(default=True, description="Enable/disable AI bot explanations")
    korean_name: Optional[str] = None
    english_name: Optional[str] = None
    display_name: Optional[str] = None
    current_group_id: Optional[str] = None


class UserPreferencesUpdate(BaseModel):
    """User preferences update request"""
    preferred_lang: Optional[str] = Field(None, pattern="^(ko|en)$")
    ai_bot_enabled: Optional[bool] = None
    korean_name: Optional[str] = None
    english_name: Optional[str] = None
    display_name: Optional[str] = None
    current_group_id: Optional[str] = None


class UserPreferencesResponse(BaseModel):
    """User preferences response"""
    user_id: str
    preferred_lang: str
    ai_bot_enabled: bool
    korean_name: Optional[str] = None
    english_name: Optional[str] = None
    display_name: Optional[str] = None
    current_group_id: Optional[str] = None

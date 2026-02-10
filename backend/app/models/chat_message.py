"""Chat message data models"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChatMessage(BaseModel):
    """Chat message model"""
    id: Optional[str] = None
    room_id: str
    sender_id: str
    sender_name: str
    text: str
    original_lang: str = Field(..., pattern="^(ko|en)$", description="Language code: ko or en")
    timestamp: Optional[datetime] = None
    is_ai_bot: bool = False


class ChatMessageCreate(BaseModel):
    """Chat message creation request"""
    text: str = Field(..., min_length=1, max_length=5000)
    sender_id: str
    sender_name: str
    original_lang: str = Field(..., pattern="^(ko|en)$")


class ChatMessageResponse(BaseModel):
    """Chat message response"""
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    text: str
    original_lang: str
    timestamp: datetime
    is_ai_bot: bool

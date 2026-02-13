"""Chat room data models"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChatRoom(BaseModel):
    """Chat room model"""
    id: Optional[str] = None
    group_id: Optional[str] = None  # NEW
    trip_id: Optional[str] = None   # Legacy
    participants: List[str]  # List of user IDs
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ChatRoomCreate(BaseModel):
    """Chat room creation request"""
    group_id: Optional[str] = None
    trip_id: Optional[str] = None
    participants: List[str] = Field(..., min_length=1, description="At least one participant required")


class ChatRoomResponse(BaseModel):
    """Chat room response"""
    id: str
    group_id: Optional[str] = None
    trip_id: Optional[str] = None
    participants: List[str]
    created_at: datetime
    updated_at: datetime

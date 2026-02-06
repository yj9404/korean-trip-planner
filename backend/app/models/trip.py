"""Trip data models"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TripBase(BaseModel):
    """Base trip model"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    destinations: List[str] = Field(default_factory=list)
    participants: List[str] = Field(default_factory=list)  # User IDs
    

class TripCreate(TripBase):
    """Model for creating a new trip"""
    created_by: str  # User ID


class TripUpdate(BaseModel):
    """Model for updating a trip"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    destinations: Optional[List[str]] = None
    participants: Optional[List[str]] = None


class Trip(TripBase):
    """Full trip model with metadata"""
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

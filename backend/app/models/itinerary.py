"""Itinerary and Place data models"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class PlaceBase(BaseModel):
    """Base place item model"""
    name_ko: str = Field(..., description="Place name in Korean")
    name_en: str = Field(..., description="Place name in English")
    address_ko: str = Field(..., description="Address in Korean for Taxi Card")
    address_en: Optional[str] = Field(None, description="Address in English")
    
    # Map Info
    naver_map_link: Optional[str] = None
    google_map_link: Optional[str] = None
    coordinate_lat: Optional[float] = None
    coordinate_lng: Optional[float] = None
    map_x: Optional[str] = None  # Naver mapx (string/int)
    map_y: Optional[str] = None  # Naver mapy
    
    # Scheduling
    visit_date: date = Field(..., description="Date of visit")
    visit_time: Optional[str] = Field(None, description="Time of visit (HH:MM)")
    order_index: int = Field(0, description="Order within the day")
    
    notes: Optional[str] = None
    category: Optional[str] = Field("place", description="place, restaurant, hotel")


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(BaseModel):
    name_ko: Optional[str] = None
    name_en: Optional[str] = None
    address_ko: Optional[str] = None
    address_en: Optional[str] = None
    naver_map_link: Optional[str] = None
    coordinate_lat: Optional[float] = None
    coordinate_lng: Optional[float] = None
    map_x: Optional[str] = None
    map_y: Optional[str] = None
    visit_date: Optional[date] = None
    visit_time: Optional[str] = None
    order_index: Optional[int] = None
    notes: Optional[str] = None
    category: Optional[str] = None


class PlaceResponse(PlaceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

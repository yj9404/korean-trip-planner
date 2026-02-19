"""Group and GroupMember data models"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class GroupRole(str, Enum):
    """Group member roles"""
    OWNER = "OWNER"
    MEMBER = "MEMBER"


class GroupMemberStatus(str, Enum):
    """Group member status"""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"


class Group(BaseModel):
    """Group model"""
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    owner_id: str
    invite_code: str = Field(..., min_length=6, max_length=6)
    created_at: Optional[datetime] = None


class GroupCreate(BaseModel):
    """Group creation request"""
    name: str = Field(..., min_length=1, max_length=100)


class GroupResponse(BaseModel):
    """Group response"""
    id: str
    name: str
    owner_id: str
    invite_code: str
    created_at: datetime
    role: Optional[GroupRole] = None  # Populated when fetched via my-groups


class GroupMember(BaseModel):
    """Group member model"""
    id: Optional[str] = None
    group_id: str
    user_id: str
    role: GroupRole
    status: GroupMemberStatus
    joined_at: Optional[datetime] = None


class GroupMemberCreate(BaseModel):
    """Group member creation request (for join request)"""
    invite_code: str = Field(..., min_length=6, max_length=6)


class GroupMemberResponse(BaseModel):
    """Group member response"""
    id: str
    group_id: Optional[str] = None
    user_id: str
    display_name: Optional[str] = None  # english_name from user_preferences
    role: GroupRole
    status: GroupMemberStatus
    joined_at: Optional[datetime] = None


class GroupMemberApprove(BaseModel):
    """Approve/reject membership request"""
    member_id: str
    approved: bool

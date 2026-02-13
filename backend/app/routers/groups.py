"""Groups router for multi-group management"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.dependencies import get_current_user, get_current_group
from app.services.firebase_service import firebase_service
from app.models.group import (
    GroupCreate,
    GroupResponse,
    GroupMemberCreate,
    GroupMemberResponse,
    GroupMemberApprove
)

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("/create", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new group"""
    user_id = current_user["uid"]
    
    try:
        group = await firebase_service.create_group(
            name=group_data.name,
            owner_id=user_id
        )
        return group
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create group: {str(e)}"
        )


@router.post("/join", status_code=status.HTTP_200_OK)
async def join_group(
    join_data: GroupMemberCreate,
    current_user: dict = Depends(get_current_user)
):
    """Request to join a group using invite code"""
    user_id = current_user["uid"]
    
    # Find group
    group = await firebase_service.find_group_by_invite_code(join_data.invite_code)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite code"
        )
    
    # Create join request
    member_id = await firebase_service.request_join_group(user_id, join_data.invite_code)
    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member or pending approval"
        )
    
    return {
        "message": "Join request submitted. Waiting for owner approval.",
        "group_name": group["name"]
    }


@router.get("/my-groups", response_model=List[GroupResponse])
async def get_my_groups(current_user: dict = Depends(get_current_user)):
    """Get all groups where user has ACTIVE membership"""
    user_id = current_user["uid"]
    groups = await firebase_service.get_user_groups(user_id)
    return groups


@router.post("/switch/{group_id}", status_code=status.HTTP_200_OK)
async def switch_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Switch to a different group"""
    user_id = current_user["uid"]
    
    # Check if user has ACTIVE access to this group
    has_access = await firebase_service.check_user_group_access(user_id, group_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Update current_group_id
    await firebase_service.update_user_preferences(user_id, {"current_group_id": group_id})
    
    return {"message": "Group switched successfully", "group_id": group_id}


@router.get("/pending-members", response_model=List[GroupMemberResponse])
async def get_pending_members(
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)
):
    """Get pending members for current group (OWNER only)"""
    user_id = current_user["uid"]
    
    # Check if user is owner
    is_owner = await firebase_service.is_group_owner(user_id, group_id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group owner can view pending members"
        )
    
    members = await firebase_service.get_pending_members(group_id)
    return members


@router.post("/approve-member", status_code=status.HTTP_200_OK)
async def approve_member(
    approval_data: GroupMemberApprove,
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)
):
    """Approve or reject a pending member (OWNER only)"""
    user_id = current_user["uid"]
    
    # Check if user is owner
    is_owner = await firebase_service.is_group_owner(user_id, group_id)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only group owner can approve members"
        )
    
    success = await firebase_service.approve_member(
        member_id=approval_data.member_id,
        approved=approval_data.approved
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member request not found"
        )
    
    action = "approved" if approval_data.approved else "rejected"
    return {"message": f"Member {action} successfully"}


@router.get("/current", response_model=GroupResponse)
async def get_current_group_info(
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)
):
    """Get current group information"""
    group = await firebase_service.get_group(group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    return group

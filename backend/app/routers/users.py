"""User endpoints (FCM token sync, etc.)"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import logging

from app.services.firebase_service import firebase_service
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


class FCMTokenRequest(BaseModel):
    token: str


@router.post("/users/me/fcm-token", status_code=204)
async def save_fcm_token(
    body: FCMTokenRequest,
    current_user: dict = Depends(get_current_user),
):
    """Save (or update) the FCM token for the authenticated user.
    Supports multiple devices per user — tokens are stored as an array.
    """
    user_id = current_user["uid"]
    success = await firebase_service.save_fcm_token(user_id, body.token)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save FCM token")
    # 204 No Content — nothing to return


@router.delete("/users/me/fcm-token", status_code=204)
async def delete_fcm_token(
    body: FCMTokenRequest,
    current_user: dict = Depends(get_current_user),
):
    """Remove a specific FCM token for the authenticated user (e.g. on SW update)."""
    user_id = current_user["uid"]
    await firebase_service.remove_fcm_token(user_id, body.token)
    # 204 No Content — nothing to return

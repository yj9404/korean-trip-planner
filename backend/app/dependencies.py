from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from app.services.firebase_service import firebase_service

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Verify the ID token with clock skew allowance
        decoded_token = auth.verify_id_token(token, check_revoked=False, clock_skew_seconds=60)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_group(current_user: dict = Depends(get_current_user)) -> str:
    """
    Get the current group ID for the authenticated user.
    Ensures the user has ACTIVE access to the group.
    Raises 403 if no group or access denied.
    """
    user_id = current_user["uid"]
    
    # Get user preferences to find current_group_id
    preferences = await firebase_service.get_user_preferences(user_id)
    current_group_id = preferences.get("current_group_id")
    
    if not current_group_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No group selected. Please select or create a group first."
        )
    
    # Verify user has ACTIVE access to this group
    has_access = await firebase_service.check_user_group_access(user_id, current_group_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this group."
        )
    
    return current_group_id


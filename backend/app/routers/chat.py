"""Chat router for real-time messaging with AI translation"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
import traceback

from app.models.chat_room import ChatRoomCreate, ChatRoomResponse
from app.models.chat_message import ChatMessageCreate, ChatMessageResponse
from app.models.user_preferences import UserPreferencesUpdate, UserPreferencesResponse
from app.services.firebase_service import firebase_service
from app.services.gemini_service import gemini_service
from app.dependencies import get_current_user, get_current_group

logger = logging.getLogger(__name__)

router = APIRouter()


# Chat Room Endpoints
@router.post("/chat/rooms", response_model=ChatRoomResponse)
async def create_chat_room(
    room_data: ChatRoomCreate,
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)
):
    """Create a new chat room for the current group"""
    try:
        room_dict = room_data.model_dump()
        room_dict["group_id"] = group_id
        # Ensure creator is in participants
        user_id = current_user["uid"]
        if user_id not in room_dict["participants"]:
            room_dict["participants"].append(user_id)
            
        room_id = await firebase_service.create_chat_room(room_dict)
        
        created_room = await firebase_service.get_chat_room(room_id)
        if not created_room:
            raise HTTPException(status_code=500, detail="Failed to retrieve created room")
        
        return ChatRoomResponse(**created_room)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create chat room: {str(e)}")


@router.get("/chat/rooms/{room_id}", response_model=ChatRoomResponse)
async def get_chat_room(
    room_id: str,
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)
):
    """Get chat room information (secured by group)"""
    room = await firebase_service.get_chat_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    # Check if room belongs to current group
    if room.get("group_id") and room["group_id"] != group_id:
         raise HTTPException(status_code=403, detail="Room belongs to another group")
         
    return ChatRoomResponse(**room)


@router.get("/chat/rooms/user/{user_id}", response_model=List[ChatRoomResponse])
async def get_user_chat_rooms(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    group_id: str = Depends(get_current_group)
):
    """Get all chat rooms for the current group"""
    # Security check: ensure requesting own rooms
    if current_user["uid"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access other user's rooms")
        
    try:
        # Fetch rooms for this group
        rooms = await firebase_service.get_group_chat_rooms(group_id)
        return [ChatRoomResponse(**room) for room in rooms]
    except Exception as e:
        if "Legacy" in str(e): # Fallback strictly for legacy support if needed
             rooms = await firebase_service.get_user_chat_rooms(user_id)
             # Filter out rooms that have a group_id different from current
             filtered = [r for r in rooms if not r.get("group_id") or r.get("group_id") == group_id]
             return [ChatRoomResponse(**room) for room in filtered]
             
        raise HTTPException(status_code=500, detail=f"Failed to get chat rooms: {str(e)}")


# Chat Message Endpoints
@router.get("/chat/rooms/{room_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(room_id: str, limit: int = 50):
    """Get messages from a chat room"""
    # Verify room exists
    room = await firebase_service.get_chat_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    try:
        messages = await firebase_service.get_messages(room_id, limit)
        return [ChatMessageResponse(**msg) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")


@router.post("/chat/rooms/{room_id}/messages", response_model=ChatMessageResponse)
async def send_message(room_id: str, message_data: ChatMessageCreate):
    """Send a message to a chat room (with AI bot logic)"""
    # Verify room exists
    room = await firebase_service.get_chat_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    
    try:
        # 1. Translate message before saving
        source_lang = message_data.original_lang
        target_lang = "en" if source_lang == "ko" else "ko"
        
        translated_text = None
        try:
            translated_text = await gemini_service.translate_message(message_data.text, source_lang, target_lang)
        except Exception as e:
            logger.error(f"Failed to pre-translate message: {e}")
            # Even if translation fails, we still want to save the original message
        
        # 2. Send the user message
        message_dict = message_data.model_dump()
        message_dict["room_id"] = room_id
        message_dict["is_ai_bot"] = False
        message_dict["translated_text"] = translated_text
        
        message_id = await firebase_service.send_message(room_id, message_dict)
        message_dict["id"] = message_id
        message_dict["timestamp"] = datetime.utcnow()

        # 3. Send push notifications to group members (best-effort, never fails the request)
        try:
            group_id = room.get("group_id")
            if group_id:
                sender_id = message_data.sender_id
                sender_name = message_dict.get("sender_name", "Someone")
                token_map = await firebase_service.get_group_member_fcm_tokens(group_id)
                logger.info(f"[FCM] Found tokens for {len(token_map)} group members")
                # Build recipient map (exclude sender) for token cleanup support
                recipient_map = {
                    uid: tokens
                    for uid, tokens in token_map.items()
                    if uid != sender_id
                }
                recipient_tokens = [t for tokens in recipient_map.values() for t in tokens]
                logger.info(f"[FCM] Sending push to {len(recipient_tokens)} tokens for {len(recipient_map)} recipients")
                if recipient_tokens:
                    push_body = message_data.text[:100]  # Truncate long messages
                    success = await firebase_service.send_push_notifications(
                        tokens=recipient_tokens,
                        title=f"New message from {sender_name}",
                        body=push_body,
                        data={"url": "/chat"},
                        uid_token_map=recipient_map,
                    )
                    logger.info(f"[FCM] {success}/{len(recipient_tokens)} notifications sent successfully")
        except Exception as push_err:
            logger.warning(f"Push notification failed (non-critical): {push_err}")

        # 4. Check for keywords and trigger AI bot if enabled
        keywords = gemini_service.detect_keywords(message_data.text)
        
        if keywords:
            # Get user preferences to check if AI bot is enabled
            user_prefs = await firebase_service.get_user_preferences(message_data.sender_id)
            
            if user_prefs.get("ai_bot_enabled", True):
                # Generate AI explanation for the first detected keyword
                keyword = keywords[0]
                explanation = await gemini_service.generate_explanation(
                    keyword=keyword,
                    context=message_data.text,
                    language=source_lang
                )
                
                # Send AI bot message
                ai_message = {
                    "room_id": room_id,
                    "sender_id": "ai_bot",
                    "sender_name": "AI Travel Guide",
                    "text": f"💡 About '{keyword}': {explanation}",
                    "original_lang": message_data.original_lang,
                    "is_ai_bot": True
                }
                
                await firebase_service.send_message(room_id, ai_message)
        
        return ChatMessageResponse(**message_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")


# Translation Endpoint
class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str


@router.post("/chat/translate")
async def translate_message(
    request: TranslateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Translate a message"""
    try:
        translated = await gemini_service.translate_message(request.text, request.source_lang, request.target_lang)
        return {
            "original": request.text,
            "translated": translated,
            "source_lang": request.source_lang,
            "target_lang": request.target_lang
        }
    except Exception as e:
        logger.error(f"[TRANSLATE API] Translation failed: {type(e).__name__}: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


# User Preferences Endpoints
@router.get("/chat/preferences/{user_id}", response_model=UserPreferencesResponse)
async def get_user_preferences(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user chat preferences"""
    # Security check: ensure requesting own preferences
    if current_user["uid"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot access other user's preferences")

    try:
        prefs = await firebase_service.get_user_preferences(user_id)
        return UserPreferencesResponse(**prefs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


@router.put("/chat/preferences/{user_id}", response_model=UserPreferencesResponse)
async def update_user_preferences(
    user_id: str,
    preferences: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user chat preferences"""
    # Security check: ensure updating own preferences
    if current_user["uid"] != user_id:
        raise HTTPException(status_code=403, detail="Cannot update other user's preferences")

    try:
        prefs_dict = preferences.model_dump(exclude_none=True)
        prefs_dict["user_id"] = user_id
        
        await firebase_service.update_user_preferences(user_id, prefs_dict)
        
        updated_prefs = await firebase_service.get_user_preferences(user_id)
        return UserPreferencesResponse(**updated_prefs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

"""Firebase service for authentication and Firestore operations"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, Dict, List, Any
from datetime import datetime
import json
import os

from app.config import settings


class FirebaseService:
    """Service for Firebase operations"""
    
    def __init__(self):
        self._app: Optional[firebase_admin.App] = None
        self._db: Optional[firestore.Client] = None
        self.is_initialized = False
    
    def initialize(self):
        """Initialize Firebase Admin SDK"""
        if self.is_initialized:
            return
        
        try:
            # Try to load from environment variable first (for production/CI/CD)
            firebase_creds_json = settings.firebase_credentials_json
            if firebase_creds_json:
                try:
                    cred_dict = json.loads(firebase_creds_json)
                    cred = credentials.Certificate(cred_dict)
                    print("🔥 Firebase initialized from environment variable")
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse FIREBASE_CREDENTIALS_JSON: {e}")
                    raise
            # Fallback to file path (for local development)
            elif settings.firebase_credentials_path and os.path.exists(settings.firebase_credentials_path):
                cred = credentials.Certificate(settings.firebase_credentials_path)
                print(f"🔥 Firebase initialized from file: {settings.firebase_credentials_path}")
            else:
                raise ValueError(
                    "Firebase credentials not found. Please set either:\n"
                    "- FIREBASE_CREDENTIALS_JSON (JSON string in env var), or\n"
                    "- FIREBASE_CREDENTIALS_PATH (path to JSON file)"
                )
            
            self._app = firebase_admin.initialize_app(cred)
            self._db = firestore.client()
            self.is_initialized = True
        except Exception as e:
            print(f"❌ Firebase initialization error: {e}")
            raise
    
    @property
    def db(self) -> firestore.Client:
        """Get Firestore client"""
        if not self._db:
            raise RuntimeError("Firebase not initialized. Call initialize() first.")
        return self._db
    
    # Trip operations
    async def create_trip(self, trip_data: Dict[str, Any]) -> str:
        """Create a new trip in Firestore"""
        trip_data["created_at"] = datetime.utcnow()
        trip_data["updated_at"] = datetime.utcnow()
        
        doc_ref = self.db.collection("trips").document()
        doc_ref.set(trip_data)
        return doc_ref.id
    
    async def get_trip(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Get a trip by ID"""
        doc = self.db.collection("trips").document(trip_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    
    async def update_trip(self, trip_id: str, trip_data: Dict[str, Any]) -> bool:
        """Update a trip"""
        trip_data["updated_at"] = datetime.utcnow()
        
        doc_ref = self.db.collection("trips").document(trip_id)
        doc_ref.update(trip_data)
        return True
    
    async def delete_trip(self, trip_id: str) -> bool:
        """Delete a trip"""
        self.db.collection("trips").document(trip_id).delete()
        return True
    
    async def get_user_trips(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all trips for a user"""
        trips = []
        docs = self.db.collection("trips").where("created_by", "==", user_id).stream()
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            trips.append(data)
        
        return trips
    
    async def get_trips_by_participant(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all trips where user is a participant"""
        trips = []
        docs = self.db.collection("trips").where("participants", "array_contains", user_id).stream()
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            trips.append(data)
        
        return trips
    
    # User verification
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token"""
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    
    # Chat room operations
    async def create_chat_room(self, room_data: Dict[str, Any]) -> str:
        """Create a new chat room in Firestore"""
        room_data["created_at"] = datetime.utcnow()
        room_data["updated_at"] = datetime.utcnow()
        
        doc_ref = self.db.collection("chat_rooms").document()
        doc_ref.set(room_data)
        return doc_ref.id
    
    async def get_chat_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get a chat room by ID"""
        doc = self.db.collection("chat_rooms").document(room_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    
    async def get_user_chat_rooms(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all chat rooms for a user"""
        rooms = []
        docs = self.db.collection("chat_rooms").where("participants", "array_contains", user_id).stream()
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            rooms.append(data)
        
        return rooms
    
    # Chat message operations
    async def send_message(self, room_id: str, message_data: Dict[str, Any]) -> str:
        """Send a message to a chat room"""
        message_data["timestamp"] = datetime.utcnow()
        
        doc_ref = self.db.collection("chat_rooms").document(room_id).collection("messages").document()
        doc_ref.set(message_data)
        
        # Update room's updated_at timestamp
        self.db.collection("chat_rooms").document(room_id).update({
            "updated_at": datetime.utcnow()
        })
        
        return doc_ref.id
    
    async def get_messages(self, room_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages from a chat room"""
        messages = []
        docs = (
            self.db.collection("chat_rooms")
            .document(room_id)
            .collection("messages")
            .order_by("timestamp", direction=firestore.Query.ASCENDING)
            .limit(limit)
            .stream()
        )
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            messages.append(data)
        
        return messages
    
    # User preferences operations
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        doc = self.db.collection("user_preferences").document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        # Return default preferences if not found
        return {
            "user_id": user_id,
            "preferred_lang": "en",
            "ai_bot_enabled": True
        }
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Update user preferences"""
        doc_ref = self.db.collection("user_preferences").document(user_id)
        doc_ref.set(preferences, merge=True)
        return True


# Global Firebase service instance
firebase_service = FirebaseService()


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
        """Get all chat rooms for a user (Legacy Support)"""
        rooms = []
        docs = self.db.collection("chat_rooms").where("participants", "array_contains", user_id).stream()
        
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            rooms.append(data)
        
        return rooms

    async def get_group_chat_rooms(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all chat rooms for a specific group"""
        rooms = []
        # Filter by group_id
        docs = self.db.collection("chat_rooms").where("group_id", "==", group_id).stream()
        
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
    
    
    # Itinerary / Place operations (user-based, no trip context)
    def add_place(self, user_id: str, place_data: Dict[str, Any], group_id: Optional[str] = None) -> str:
        """Add a place to user's itinerary"""
        place_data["user_id"] = user_id
        if group_id:
            place_data["group_id"] = group_id
        
        place_data["created_at"] = datetime.utcnow()
        place_data["updated_at"] = datetime.utcnow()
        doc_ref = self.db.collection("places").document(user_id).collection("items").document()
        doc_ref.set(place_data)
        return doc_ref.id
    
    def get_user_places(self, user_id: str, group_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all places for a user, ordered by date and index"""
        places = []
        docs = (
            self.db.collection("places").document(user_id).collection("items")
            .order_by("visit_date").stream()
        )
        for doc in docs:
            data = doc.to_dict()
            
            # Filter by group_id if provided
            if group_id:
                if data.get("group_id") != group_id:
                    continue
            
            data["id"] = doc.id
            places.append(data)
        return places
    
    def update_place(self, user_id: str, place_id: str, place_data: Dict[str, Any]) -> bool:
        """Update a place in user's itinerary"""
        # Ensure we don't accidentally remove group_id if not provided
        place_data["updated_at"] = datetime.utcnow()
        doc_ref = self.db.collection("places").document(user_id).collection("items").document(place_id)
        doc_ref.set(place_data, merge=True) # Change update to set with merge=True for safer partial updates
        return True
    
    def delete_place(self, user_id: str, place_id: str) -> bool:
        """Delete a place from user's itinerary"""
        self.db.collection("places").document(user_id).collection("items").document(place_id).delete()
        return True
    
    
    # ========== Group Management ==========
    def _generate_invite_code(self) -> str:
        """Generate a unique 6-character alphanumeric invite code"""
        import random
        import string
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            # Check if code already exists
            existing = self.db.collection("groups").where("invite_code", "==", code).limit(1).get()
            if not existing:
                return code
    
    async def create_group(self, name: str, owner_id: str) -> Dict[str, Any]:
        """Create a new group and set creator as OWNER/ACTIVE member"""
        invite_code = self._generate_invite_code()
        group_data = {
            "name": name,
            "owner_id": owner_id,
            "invite_code": invite_code,
            "created_at": datetime.utcnow()
        }
        
        # Create group
        group_ref = self.db.collection("groups").document()
        group_ref.set(group_data)
        group_id = group_ref.id
        
        # Add owner as ACTIVE member
        member_data = {
            "group_id": group_id,
            "user_id": owner_id,
            "role": "OWNER",
            "status": "ACTIVE",
            "joined_at": datetime.utcnow()
        }
        member_ref = self.db.collection("group_members").document()
        member_ref.set(member_data)
        
        # Set user's current_group_id
        await self.update_user_preferences(owner_id, {"current_group_id": group_id})
        
        group_data["id"] = group_id
        return group_data
    
    async def get_group(self, group_id: str) -> Optional[Dict[str, Any]]:
        """Get a group by ID"""
        doc = self.db.collection("groups").document(group_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    
    async def find_group_by_invite_code(self, invite_code: str) -> Optional[Dict[str, Any]]:
        """Find a group by invite code"""
        docs = self.db.collection("groups").where("invite_code", "==", invite_code).limit(1).get()
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    
    async def request_join_group(self, user_id: str, invite_code: str) -> Optional[str]:
        """Request to join a group (creates PENDING membership)"""
        group = await self.find_group_by_invite_code(invite_code)
        if not group:
            return None
        
        # Check if already a member
        existing = self.db.collection("group_members").where("group_id", "==", group["id"]).where("user_id", "==", user_id).limit(1).get()
        if list(existing):
            return None  # Already requested or member
        
        member_data = {
            "group_id": group["id"],
            "user_id": user_id,
            "role": "MEMBER",
            "status": "PENDING",
            "joined_at": datetime.utcnow()
        }
        member_ref = self.db.collection("group_members").document()
        member_ref.set(member_data)
        return member_ref.id
    
    async def get_user_groups(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all groups where user has ACTIVE membership"""
        groups = []
        try:
            # Query by single field to avoid composite index requirement
            member_docs = self.db.collection("group_members").where("user_id", "==", user_id).stream()
            for member_doc in member_docs:
                member_data = member_doc.to_dict()
                # Filter ACTIVE status in Python
                if member_data.get("status") != "ACTIVE":
                    continue
                group = await self.get_group(member_data["group_id"])
                if group:
                    # Attach role info from member record
                    group["role"] = member_data.get("role", "MEMBER")
                    group["member_id"] = member_doc.id
                    groups.append(group)
        except Exception as e:
            print(f"Error getting user groups: {e}")
        return groups
    
    async def get_pending_members(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all pending members for a group (OWNER only should call)"""
        members = []
        try:
            docs = self.db.collection("group_members").where("group_id", "==", group_id).stream()
            for doc in docs:
                data = doc.to_dict()
                # Filter PENDING status in Python
                if data.get("status") != "PENDING":
                    continue

                user_id = data.get("user_id")

                # Fetch display name from user_preferences (same as get_group_members)
                display_name = user_id  # fallback to uid
                try:
                    prefs_doc = self.db.collection("user_preferences").document(user_id).get()
                    if prefs_doc.exists:
                        prefs = prefs_doc.to_dict()
                        display_name = prefs.get("english_name") or prefs.get("display_name") or user_id
                except Exception:
                    pass

                members.append({
                    "id": doc.id,
                    "user_id": user_id,
                    "display_name": display_name,
                    "role": data.get("role"),
                    "joined_at": data.get("joined_at"),
                    "status": data.get("status")
                })
        except Exception as e:
            print(f"Error getting pending members: {e}")
        return members
    
    async def approve_member(self, member_id: str, approved: bool) -> bool:
        """Approve or reject a pending member"""
        member_ref = self.db.collection("group_members").document(member_id)
        member_doc = member_ref.get()
        
        if not member_doc.exists:
            return False
        
        if approved:
            member_ref.update({"status": "ACTIVE"})
        else:
            member_ref.delete()  # Reject = delete the request
        
        return True
    
    async def check_user_group_access(self, user_id: str, group_id: str) -> bool:
        """Check if user has ACTIVE access to a group"""
        try:
            # Query by single field, filter in Python
            docs = self.db.collection("group_members").where("user_id", "==", user_id).stream()
            for doc in docs:
                data = doc.to_dict()
                if data.get("group_id") == group_id and data.get("status") == "ACTIVE":
                    return True
        except Exception as e:
            print(f"Error checking group access: {e}")
        return False
    
    async def is_group_owner(self, user_id: str, group_id: str) -> bool:
        """Check if user is the owner of a group"""
        try:
            # Query by single field, filter in Python
            docs = self.db.collection("group_members").where("user_id", "==", user_id).stream()
            for doc in docs:
                data = doc.to_dict()
                if data.get("group_id") == group_id and data.get("role") == "OWNER":
                    return True
        except Exception as e:
            print(f"Error checking group owner: {e}")
        return False
    
    async def get_group_members(self, group_id: str) -> List[Dict[str, Any]]:
        """Get all ACTIVE members of a group, enriched with english_name from user_preferences"""
        members = []
        try:
            # Query by single field to avoid composite index requirement
            members_docs = self.db.collection("group_members").where("group_id", "==", group_id).get()
            for doc in members_docs:
                data = doc.to_dict()
                # Filter ACTIVE status in Python
                if data.get("status") != "ACTIVE":
                    continue

                user_id = data.get("user_id")

                # Fetch english_name from user_preferences
                display_name = user_id  # fallback to uid
                try:
                    prefs_doc = self.db.collection("user_preferences").document(user_id).get()
                    if prefs_doc.exists:
                        prefs = prefs_doc.to_dict()
                        display_name = prefs.get("english_name") or user_id
                except Exception:
                    pass  # Keep fallback uid

                members.append({
                    "id": doc.id,
                    "user_id": user_id,
                    "display_name": display_name,
                    "role": data.get("role"),
                    "joined_at": data.get("joined_at"),
                    "status": data.get("status")
                })
        except Exception as e:
            print(f"Error getting group members: {e}")
        return members
    
    async def delete_group(self, group_id: str) -> bool:
        """Delete a group and all associated memberships"""
        try:
            # Delete all group members
            members_docs = self.db.collection("group_members").where("group_id", "==", group_id).get()
            for doc in members_docs:
                doc.reference.delete()
            
            # Delete the group
            self.db.collection("groups").document(group_id).delete()
            
            # Clear current_group_id for users who had this group selected
            # Note: This is a best-effort cleanup. Users will automatically handle missing groups on next login
            
            return True
        except Exception as e:
            print(f"Error deleting group: {e}")
            return False
    
    async def leave_group(self, user_id: str, group_id: str) -> bool:
        """Remove user from a group (user leaves voluntarily)"""
        try:
            # Find and delete the membership
            docs = self.db.collection("group_members").where("user_id", "==", user_id).where("group_id", "==", group_id).get()
            
            for doc in docs:
                doc.reference.delete()
            
            # Clear current_group_id if this was the active group
            prefs_ref = self.db.collection("user_preferences").document(user_id)
            prefs = prefs_ref.get()
            if prefs.exists:
                data = prefs.to_dict()
                if data.get("current_group_id") == group_id:
                    prefs_ref.update({"current_group_id": None})
            
            return True
        except Exception as e:
            print(f"Error leaving group: {e}")
            return False
    
    async def kick_member(self, group_id: str, member_user_id: str) -> bool:
        """Remove a member from a group (kicked by owner)"""
        try:
            # Find and delete the membership (only ACTIVE and MEMBER role, not OWNER)
            docs = self.db.collection("group_members").where("user_id", "==", member_user_id).where("group_id", "==", group_id).where("role", "==", "MEMBER").get()
            
            deleted = False
            for doc in docs:
                doc.reference.delete()
                deleted = True
            
            if not deleted:
                return False
            
            # Clear current_group_id if this was the active group
            prefs_ref = self.db.collection("user_preferences").document(member_user_id)
            prefs = prefs_ref.get()
            if prefs.exists:
                data = prefs.to_dict()
                if data.get("current_group_id") == group_id:
                    prefs_ref.update({"current_group_id": None})
            
            return True
        except Exception as e:
            print(f"Error kicking member: {e}")
            return False




# Global Firebase service instance
firebase_service = FirebaseService()


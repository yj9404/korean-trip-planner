"""Firebase service for authentication and Firestore operations"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from typing import Optional, Dict, List, Any
from datetime import datetime

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
            cred = credentials.Certificate(settings.firebase_credentials_path)
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


# Global Firebase service instance
firebase_service = FirebaseService()

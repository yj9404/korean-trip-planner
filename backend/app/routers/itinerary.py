"""Itinerary router for places management (single-trip architecture)"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import date

from app.models.itinerary import PlaceCreate, PlaceUpdate, PlaceResponse
from app.services.firebase_service import firebase_service
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/itinerary", tags=["itinerary"])


@router.get("/debug/health")
async def health_check():
    """Debug endpoint to verify router is working"""
    return {"status": "ok", "message": "Itinerary router is working"}


@router.get("/debug/test-places")
async def debug_test_places():
    """Debug endpoint to test places retrieval without auth (REMOVE IN PRODUCTION)"""
    try:
        # Use a test user ID - replace with your actual Firebase user ID
        test_user_id = "test-user-123"
        places = firebase_service.get_user_places(test_user_id)
        return {"status": "ok", "count": len(places), "places": places}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/places", response_model=dict)
async def add_place(
    place: PlaceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new place to user's itinerary"""
    user_id = current_user.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    place_dict = place.dict()
    # Convert date to ISO string for Firestore
    if isinstance(place_dict.get("visit_date"), date):
        place_dict["visit_date"] = place_dict["visit_date"].isoformat()
    
    place_id = firebase_service.add_place(user_id, place_dict)
    return {"id": place_id, "message": "Place added successfully"}


@router.get("/places", response_model=List[dict])
async def get_places(
    current_user: dict = Depends(get_current_user)
):
    """Get all places for the current user"""
    user_id = current_user.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    places = firebase_service.get_user_places(user_id)
    return places


@router.put("/places/{place_id}", response_model=dict)
async def update_place(
    place_id: str,
    place_update: PlaceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a place in user's itinerary"""
    user_id = current_user.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    update_data = place_update.dict(exclude_unset=True)
    
    # Convert date to ISO string if present
    if "visit_date" in update_data and isinstance(update_data["visit_date"], date):
        update_data["visit_date"] = update_data["visit_date"].isoformat()
    
    firebase_service.update_place(user_id, place_id, update_data)
    return {"message": "Place updated successfully"}


@router.delete("/places/{place_id}", response_model=dict)
async def delete_place(
    place_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a place from user's itinerary"""
    user_id = current_user.get("uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found")
    
    firebase_service.delete_place(user_id, place_id)
    return {"message": "Place deleted successfully"}

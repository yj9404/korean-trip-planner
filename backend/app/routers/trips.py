"""Trips API router"""

from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional

from app.models.trip import Trip, TripCreate, TripUpdate
from app.services.firebase_service import firebase_service

router = APIRouter()


async def verify_user(authorization: Optional[str] = Header(None)) -> str:
    """Verify user from authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    user_data = await firebase_service.verify_token(token)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return user_data["uid"]


@router.post("/trips", response_model=dict)
async def create_trip(trip: TripCreate, authorization: Optional[str] = Header(None)):
    """
    Create a new trip
    
    Requires authentication via Bearer token in Authorization header
    """
    user_id = await verify_user(authorization)
    
    trip_data = trip.model_dump()
    trip_data["created_by"] = user_id
    
    try:
        trip_id = await firebase_service.create_trip(trip_data)
        return {"id": trip_id, "message": "Trip created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating trip: {str(e)}")


@router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str, authorization: Optional[str] = Header(None)):
    """
    Get a trip by ID
    
    Requires authentication via Bearer token in Authorization header
    """
    await verify_user(authorization)
    
    trip = await firebase_service.get_trip(trip_id)
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return trip


@router.put("/trips/{trip_id}", response_model=dict)
async def update_trip(
    trip_id: str,
    trip_update: TripUpdate,
    authorization: Optional[str] = Header(None)
):
    """
    Update a trip
    
    Requires authentication via Bearer token in Authorization header
    """
    await verify_user(authorization)
    
    # Filter out None values
    update_data = {k: v for k, v in trip_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    try:
        await firebase_service.update_trip(trip_id, update_data)
        return {"message": "Trip updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating trip: {str(e)}")


@router.delete("/trips/{trip_id}", response_model=dict)
async def delete_trip(trip_id: str, authorization: Optional[str] = Header(None)):
    """
    Delete a trip
    
    Requires authentication via Bearer token in Authorization header
    """
    await verify_user(authorization)
    
    try:
        await firebase_service.delete_trip(trip_id)
        return {"message": "Trip deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting trip: {str(e)}")


@router.get("/trips", response_model=List[Trip])
async def get_user_trips(authorization: Optional[str] = Header(None)):
    """
    Get all trips for the authenticated user
    
    Requires authentication via Bearer token in Authorization header
    """
    user_id = await verify_user(authorization)
    
    try:
        trips = await firebase_service.get_user_trips(user_id)
        return trips
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trips: {str(e)}")


@router.get("/trips/participant/me", response_model=List[Trip])
async def get_participant_trips(authorization: Optional[str] = Header(None)):
    """
    Get all trips where the user is a participant
    
    Requires authentication via Bearer token in Authorization header
    """
    user_id = await verify_user(authorization)
    
    try:
        trips = await firebase_service.get_trips_by_participant(user_id)
        return trips
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching participant trips: {str(e)}")

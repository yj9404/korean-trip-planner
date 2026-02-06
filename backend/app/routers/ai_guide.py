"""AI Travel Guide API router"""

from fastapi import APIRouter, HTTPException
from typing import List

from app.models.ai_guide import AIGuideRequest, AIGuideResponse, Recommendation
from app.services.gemini_service import gemini_service

router = APIRouter()


@router.post("/ai-guide", response_model=AIGuideResponse)
async def get_travel_guide(request: AIGuideRequest):
    """
    Get AI-powered travel guidance and recommendations
    
    - **query**: User's travel question or request
    - **language**: Response language (ko or en)
    - **location**: Specific location in Korea (optional)
    - **trip_dates**: Start and end dates (optional)
    - **preferences**: User preferences like food, culture, nature (optional)
    """
    try:
        result = await gemini_service.get_travel_guide(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI guide error: {str(e)}")


@router.get("/recommendations/{category}/{location}", response_model=List[Recommendation])
async def get_recommendations(
    category: str,
    location: str,
    language: str = "en"
):
    """
    Get recommendations for a specific category and location
    
    - **category**: Type of recommendation (restaurants, attractions, activities)
    - **location**: Location in Korea
    - **language**: Response language (ko or en)
    """
    try:
        result = await gemini_service.get_recommendations(category, location, language)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendations error: {str(e)}")

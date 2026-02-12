from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
import logging
from app.services.gemini_service import gemini_service
from app.services.naver_service import naver_service

router = APIRouter(prefix="/places", tags=["Places"])
logger = logging.getLogger(__name__)

@router.get("/search/foreign")
async def search_places_foreign(query: str):
    """
    Search places for foreign users (English -> Korean -> Naver -> English)
    """
    if not query:
        return []
        
    try:
        # Step 1: English -> Korean
        logger.info(f"Translating query to Korean: {query}")
        korean_query = await gemini_service.translate_to_korean(query)
        logger.info(f"Translated query: {korean_query}")
        
        # Step 2: Naver Local Search
        logger.info(f"Searching Naver for: {korean_query}")
        naver_results = naver_service.search_local(korean_query, display=5)
        
        if not naver_results:
            logger.info("No results found from Naver. Returning as custom address.")
            return [{
                "title": query,
                "address": query,
                "category": "Custom Address",
                "mapx": "",
                "mapy": "",
                "title_ko": korean_query,
                "address_ko": korean_query
            }]
            
        # Step 3: Korean -> English
        logger.info(f"Translating {len(naver_results)} results back to English")
        translated_results = await gemini_service.translate_results_to_english(naver_results)
        
        # Add the custom address option at the end if results are few? 
        # Or just rely on search results. 
        # For now, let's keep search results pure if found.
        
        return translated_results
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search/description")
async def get_place_description(place_name: str, location: str = ""):
    """
    Get an AI-generated description for a place
    """
    if not place_name:
        raise HTTPException(status_code=400, detail="Place name is required")
        
    try:
        description = await gemini_service.get_place_description(place_name, location)
        return {"description": description}
    except Exception as e:
        logger.error(f"Failed to get description: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


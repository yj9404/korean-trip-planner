from fastapi import APIRouter, HTTPException, Query
from typing import List
import logging
from app.services.gemini_service import gemini_service
from app.services.naver_service import naver_service

router = APIRouter(prefix="/places", tags=["Places"])
logger = logging.getLogger(__name__)


@router.get("/search/foreign")
async def search_places_foreign(query: str):
    """
    Smart search for foreign users.

    - SPECIFIC place  → Naver search + translate results to EN
    - CATEGORY intent → Return Gemini recommendations directly (no Naver call)
    """
    if not query or not query.strip():
        return []

    try:
        # Step 1: Gemini classifies the query
        logger.info(f"[smart-search] analyzing query: {query!r}")
        analysis = await gemini_service.analyze_search_query(query)
        search_type = analysis.get("type", "SPECIFIC")

        # ── CATEGORY branch ──────────────────────────────────────────────────
        if search_type == "CATEGORY":
            recommendations = analysis.get("recommendations", [])
            logger.info(f"[smart-search] CATEGORY → {len(recommendations)} recommendations")
            # Tag each item so the frontend knows it's a recommendation card
            return {
                "type": "CATEGORY",
                "results": [
                    {
                        "title": r.get("name_en", ""),
                        "title_ko": r.get("name_ko", ""),
                        "desc_en": r.get("desc_en", ""),
                        # Coordinates are unknown until user selects – filled later
                        "address": "",
                        "address_ko": "",
                        "category": "AI Recommendation",
                        "mapx": "",
                        "mapy": "",
                    }
                    for r in recommendations
                ],
            }

        # ── SPECIFIC branch ──────────────────────────────────────────────────
        query_ko = analysis.get("query_ko", query)
        logger.info(f"[smart-search] SPECIFIC → Naver search: {query_ko!r}")

        naver_results = naver_service.search_local(query_ko, display=5)

        if not naver_results:
            logger.info("[smart-search] No Naver results, returning custom address.")
            return {
                "type": "SPECIFIC",
                "results": [
                    {
                        "title": query,
                        "title_ko": query_ko,
                        "address": query,
                        "address_ko": query_ko,
                        "category": "Custom Address",
                        "mapx": "",
                        "mapy": "",
                    }
                ],
            }

        logger.info(f"[smart-search] translating {len(naver_results)} Naver results to EN")
        translated = await gemini_service.translate_results_to_english(naver_results)
        return {"type": "SPECIFIC", "results": translated}

    except Exception as e:
        logger.error(f"[smart-search] failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/resolve")
async def resolve_recommendation(name_ko: str):
    """
    Resolve a CATEGORY recommendation into a concrete place with coordinates.
    Called when user clicks a recommendation card.

    Flow: name_ko → Naver Local Search (top 1) → translate to EN → return
    """
    if not name_ko or not name_ko.strip():
        raise HTTPException(status_code=400, detail="name_ko is required")

    try:
        logger.info(f"[resolve] Naver search for recommendation: {name_ko!r}")
        naver_results = naver_service.search_local(name_ko, display=1)

        if not naver_results:
            # No Naver hit – return minimal info so place can still be saved
            logger.warning(f"[resolve] No Naver result for {name_ko!r}, returning stub")
            return {
                "title": name_ko,
                "title_ko": name_ko,
                "address": "",
                "address_ko": "",
                "category": "",
                "mapx": "",
                "mapy": "",
            }

        translated = await gemini_service.translate_results_to_english(naver_results)
        return translated[0]  # return single resolved place

    except Exception as e:
        logger.error(f"[resolve] failed: {e}")
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
        logger.error(f"Failed to get description: {e}")
        raise HTTPException(status_code=500, detail=str(e))

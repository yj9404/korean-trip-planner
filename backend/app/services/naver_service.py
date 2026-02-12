"""Naver Open API Service for local search"""

import requests
import logging
from typing import List, Dict, Optional
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NaverService:
    """Service for interacting with Naver Open API"""
    
    BASE_URL = "https://openapi.naver.com/v1/search/local.json"
    
    def __init__(self):
        pass
        
    def search_local(self, query: str, display: int = 5) -> List[Dict]:
        """
        Search for places using Naver Local Search API
        
        Args:
            query (str): Search keyword (Korean)
            display (int): Number of results to return (max 5)
            
        Returns:
            List[Dict]: List of place items from Naver API
        """
        if not settings.naver_client_id or not settings.naver_client_secret:
            logger.warning("Naver API credentials not configured. Skipping search.")
            return []
            
        headers = {
            "X-Naver-Client-Id": settings.naver_client_id,
            "X-Naver-Client-Secret": settings.naver_client_secret
        }
        
        params = {
            "query": query,
            "display": display,
            "sort": "random"  # 'random' = accuracy, 'comment' = popularity
        }
        
        try:
            response = requests.get(self.BASE_URL, headers=headers, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            items = data.get('items', [])
            
            # Clean up HTML tags in results (<b>...</b>)
            for item in items:
                item['title'] = item['title'].replace('<b>', '').replace('</b>', '')
                item['address'] = item['address'] if 'address' in item else item.get('roadAddress', '')
                
            return items
            
        except Exception as e:
            logger.error(f"Naver Local Search failed: {str(e)}")
            return []

# Global instance
naver_service = NaverService()

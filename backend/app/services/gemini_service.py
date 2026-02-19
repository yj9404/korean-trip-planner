"""Google Gemini AI service for translation and travel guidance"""

import google.generativeai as genai
from typing import Optional, List
from datetime import datetime
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.config import settings
from app.models.translation import TranslationRequest, TranslationResponse
from app.models.ai_guide import AIGuideRequest, AIGuideResponse, Recommendation
import json


class GeminiService:
    """Service for Google Gemini AI operations"""
    
    def __init__(self):
        self.model_flash_lite: Optional[genai.GenerativeModel] = None
        self.model_flash: Optional[genai.GenerativeModel] = None
        self._configure()
    
    def _configure(self):
        """Configure Gemini API"""
        genai.configure(api_key=settings.gemini_api_key)
        # Use Gemini 2.5 Flash Lite for translation (fast)
        self.model_flash_lite = genai.GenerativeModel('gemini-2.5-flash-lite')
        # Use Gemini 2.5 Flash for AI guide/explanations (smart)
        self.model_flash = genai.GenerativeModel('gemini-2.5-flash')
    
    async def translate(self, request: TranslationRequest) -> TranslationResponse:
        """Translate text using Gemini"""
        
        lang_names = {
            "ko": "Korean",
            "en": "English",
            "ja": "Japanese",
            "zh": "Chinese",
            "auto": "auto-detected language"
        }
        
        source = lang_names.get(request.source_lang, request.source_lang)
        target = lang_names.get(request.target_lang, request.target_lang)
        
        prompt = f"""Translate the following text from {source} to {target}.
Only provide the translation, without any explanations or additional text.

{f"Context: {request.context}" if request.context else ""}

Text to translate:
{request.text}

Translation:"""
        
        response = self.model_flash_lite.generate_content(prompt)
        translated_text = response.text.strip()
        
        return TranslationResponse(
            original_text=request.text,
            translated_text=translated_text,
            source_lang=request.source_lang,
            target_lang=request.target_lang
        )
    
    async def get_travel_guide(self, request: AIGuideRequest) -> AIGuideResponse:
        """Get AI-powered travel guide recommendations"""
        
        # Always respond in English for international family trip context
        lang_instruction = "Respond in English."
        
        location_context = f" focusing on {request.location}" if request.location else ""
        dates_context = ""
        if request.trip_dates:
            dates_context = f"\nTrip dates: {request.trip_dates.get('start')} to {request.trip_dates.get('end')}"
        
        preferences_context = ""
        if request.preferences:
            preferences_context = f"\nUser preferences: {', '.join(request.preferences)}"
        
        prompt = f"""{lang_instruction}

You are an expert Korea travel guide assistant helping families plan their trip to Korea.

User Question: {request.query}{location_context}{dates_context}{preferences_context}

Provide a helpful, detailed response that includes:
1. Direct answer to their question
2. Practical tips and recommendations
3. Any cultural insights that would be valuable
4. Family-friendly suggestions when relevant

Keep the tone warm, informative, and encouraging."""
        
        response = self.model_flash.generate_content(prompt)
        guide_text = response.text.strip()
        
        # For now, return a simple response
        # In the future, we can parse the response to extract structured recommendations
        return AIGuideResponse(
            query=request.query,
            response=guide_text,
            recommendations=[],
            language=request.language,
            generated_at=datetime.utcnow()
        )
    
    async def get_recommendations(
        self,
        category: str,
        location: str,
        language: str = "en"
    ) -> List[Recommendation]:
        """Get specific recommendations for a category and location"""
        
        # Always respond in English
        lang_instruction = "Respond in English."
        
        prompt = f"""{lang_instruction}

Provide 5 top recommendations for {category} in {location}, Korea.

For each recommendation, provide:
1. Name/Title
2. Brief description (2-3 sentences)
3. Location/Address
4. Estimated cost range
5. 2-3 practical tips

Format your response as a numbered list with clear sections."""
        
        response = self.model_flash.generate_content(prompt)
        
        # TODO: Parse the response and create structured Recommendation objects
        return []
    
    async def translate_message(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> str:
        """Translate a chat message quickly"""
        import asyncio
        
        if source_lang == target_lang:
            return text
        
        lang_names = {
            "ko": "Korean",
            "en": "English"
        }
        
        source = lang_names.get(source_lang, source_lang)
        target = lang_names.get(target_lang, target_lang)
        
        prompt = f"""Translate this message from {source} to {target}. 
Only provide the translation, no explanations.

{text}

Translation:"""
        
        try:
            logger.info(f"Translate Request: {text}, {source_lang} -> {target_lang}")
            
            if not self.model_flash_lite:
                self._configure()
            
            response = await self.model_flash_lite.generate_content_async(prompt)
            
            if not response:
                logger.warning("Gemini returned None response")
                return text

            if not response.text:
                logger.warning(f"Gemini returned empty text. Candidates: {response.candidates}")
                return text

            raw = response.text.strip()
            # "Translation:" prefix removal
            for prefix in ("Translation:", "Translation :", "translation:", "translation :"): 
                if raw.lower().startswith(prefix.lower()):
                    raw = raw[len(prefix):].strip()
                    break
            
            logger.info(f"Translation successful: '{raw[:50]}...'")
            return raw
        except Exception as e:
            logger.error(f"Gemini translation error: {type(e).__name__}: {str(e)}")
            traceback.print_exc()
            return text
    
    def detect_keywords(self, text: str) -> List[str]:
        """Detect Korean culture keywords in text"""
        # Keywords that trigger AI bot explanations
        korean_keywords = {
            # Food
            '김치', 'kimchi', '불고기', 'bulgogi', '삼겹살', 'samgyeopsal',
            '비빔밥', 'bibimbap', '떡볶이', 'tteokbokki', '치킨', 'korean chicken',
            '삼계탕', 'samgyetang', '냉면', 'naengmyeon', '갈비', 'galbi',
            '순대', 'sundae', '호떡', 'hotteok', '붕어빵', 'bungeoppang',
            
            # Places
            '경복궁', 'gyeongbokgung', '남산', 'namsan', '명동', 'myeongdong',
            '홍대', 'hongdae', '강남', 'gangnam', '인사동', 'insadong',
            '북촌', 'bukchon', '이태원', 'itaewon', '동대문', 'dongdaemun',
            
            # Culture
            '한복', 'hanbok', '사물놀이', 'samulnori', 'k-pop', 'kpop',
            '노래방', 'noraebang', 'karaoke', 'pc방', 'pc bang',
            '찜질방', 'jjimjilbang', '한옥', 'hanok'
        }
        
        text_lower = text.lower()
        found_keywords = []
        
        for keyword in korean_keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)
        
        return found_keywords
    
    async def generate_explanation(
        self,
        keyword: str,
        context: str,
        language: str = "en"
    ) -> str:
        """Generate AI explanation for a keyword"""
        # Always respond in English
        lang_instruction = "Respond in English."
        
        prompt = f"""{lang_instruction}

A user mentioned "{keyword}" in a chat about Korea travel.

Context: {context}

Provide a brief, friendly explanation about "{keyword}" (2-3 sentences max).
Focus on:
1. What it is
2. Why it's popular or interesting
3. A quick tip for trying/visiting it

Keep it conversational and helpful."""
        
        response = self.model_flash.generate_content(prompt)
        return response.text.strip()


    async def translate_to_korean(self, text: str) -> str:
        """Translate English search term to Korean for Naver Map Search"""
        
        prompt = f"""Translate the following location search query into Korean for Naver Maps search.
Input: '{text}'
Output: Just the Korean term. No explanations."""

        try:
            response = await self.model_flash_lite.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to translate to Korean: {e}")
            return text  # Fallback to original

    async def translate_results_to_english(self, items: List[dict]) -> List[dict]:
        """Translate Naver search results to English"""
        
        if not items:
            return []
            
        # Prepare valid JSON input for Gemini
        items_json = json.dumps([{
            "title": item['title'],
            "address": item.get('roadAddress') or item.get('address'),
            "category": item.get('category'),
            "mapx": item.get('mapx'),
            "mapy": item.get('mapy')
        } for item in items], ensure_ascii=False)
        
        prompt = f"""Translate these place names and addresses to English.
        
Context: These are search results from Naver Maps in Korea.

Original Data:
{items_json}

Instructions:
1. Translate "title" to English (keep it recognizable).
2. Translate "address" to English.
3. Keep "category", "mapx", "mapy" as is.
4. Add original Korean "title" as "title_ko".
5. Add original Korean "address" as "address_ko".

Output Format: A pure JSON list of objects. No markdown formatting.
Example:
[
  {{
    "title": "Gyeongbokgung Palace",
    "address": "161 Sajik-ro, Jongno-gu, Seoul",
    "category": "Tourist Attraction",
    "mapx": "...", 
    "mapy": "...",
    "title_ko": "경복궁",
    "address_ko": "서울 종로구 사직로 161"
  }}
]"""

        try:
            response = await self.model_flash_lite.generate_content_async(prompt)
            text = response.text.strip()
            # Clean up markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
                
            return json.loads(text.strip())
        except Exception as e:
            logger.error(f"Failed to translate results to English: {e}")
            # Fallback: return original items with minimal adaptation
            return [{
                **item,
                "title_ko": item['title'],
                "address_ko": item.get('roadAddress') or item.get('address'),
                "title": item['title'], # Should ideally use original if translation fails
                "address": item.get('roadAddress') or item.get('address')
            } for item in items]


    async def get_place_description(self, place_name: str, location: str = "") -> str:
        """Get a brief description of a place using Gemini"""
        
        prompt = f"""Provide a brief, engaging description (2-3 sentences) for the place "{place_name}"{f" located in {location}" if location else ""} in Korea.
        Focus on what makes it famous or worth visiting for a tourist.
        Write in English."""
        
        try:
            response = await self.model_flash_lite.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to get place description: {e}")
            return "Description unavailable."

    async def analyze_menu_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
        """Analyze a Korean menu image and return English descriptions for each item"""
        import google.generativeai as genai

        prompt = """You are a Korean food expert helping foreign tourists understand a Korean restaurant menu.

Analyze this menu image and extract every menu item you can see.

For each item, provide:
1. Korean name (as written on the menu)
2. English name / transliteration
3. Brief description in English (what it is, main ingredients, taste profile)
4. Approximate price if visible (write null if not visible)
5. Whether it's spicy (true/false/unknown)
6. Whether it's vegetarian-friendly (true/false/unknown)

Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
{
  "items": [
    {
      "korean_name": "비빔밥",
      "english_name": "Bibimbap",
      "description": "Mixed rice bowl with assorted vegetables, egg, and gochujang (red pepper paste). Colorful, nutritious, and delicious.",
      "price": "9,000",
      "is_spicy": true,
      "is_vegetarian": false
    }
  ],
  "restaurant_type": "Korean BBQ / Traditional / Noodles / etc.",
  "notes": "Any important notes about the menu (e.g., seasonal items, set menus)"
}

If you cannot read the menu clearly, return:
{"error": "Cannot read menu clearly. Please try a clearer photo."}"""

        try:
            image_part = {
                "mime_type": mime_type,
                "data": image_bytes
            }
            response = await self.model_flash.generate_content_async([prompt, image_part])
            raw = response.text.strip()

            # Clean up markdown code blocks
            if raw.startswith("```json"):
                raw = raw[7:]
            if raw.startswith("```"):
                raw = raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]

            return json.loads(raw.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse menu analysis JSON: {e}")
            return {"error": "Failed to parse AI response. Please try again."}
        except Exception as e:
            logger.error(f"Failed to analyze menu image: {e}")
            return {"error": f"Analysis failed: {str(e)}"}


# Global Gemini service instance
gemini_service = GeminiService()



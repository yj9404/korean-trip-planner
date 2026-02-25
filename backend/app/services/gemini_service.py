"""Google Gemini AI service for translation and travel guidance"""

from google import genai
from typing import Optional, List
from datetime import datetime
import logging
import traceback
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.config import settings
from app.models.translation import TranslationRequest, TranslationResponse
from app.models.ai_guide import AIGuideRequest, AIGuideResponse, Recommendation


FLASH_LITE = 'gemini-2.5-flash-lite'
FLASH = 'gemini-2.5-flash'

import asyncio

class GeminiService:
    """Service for Google Gemini AI operations"""
    
    def __init__(self):
        self.client: Optional[genai.Client] = None
        self._configure()
    
    def _configure(self):
        """Configure Gemini API"""
        self.client = genai.Client(api_key=settings.gemini_api_key)

    async def _safe_generate(self, model: str, contents, retries: int = 3, **kwargs):
        """Helper to securely call Gemini API with exponential backoff on 503/429 errors."""
        for attempt in range(retries):
            try:
                return await self.client.aio.models.generate_content(
                    model=model,
                    contents=contents,
                    **kwargs
                )
            except Exception as e:
                err_str = str(e)
                # Check for rate limit or high demand indicators
                if "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    if attempt < retries - 1:
                        wait_ms = (attempt + 1) * 1.5  # 1.5s, 3.0s...
                        logger.warning(f"Gemini API high demand ({err_str[:40]}...). Retrying {attempt+1}/{retries} in {wait_ms}s...")
                        await asyncio.sleep(wait_ms)
                        continue
                logger.error(f"Gemini API failed after {attempt+1} attempts: {type(e).__name__}: {str(e)}")
                raise
    
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
        
        response = await self._safe_generate(
            model=FLASH_LITE,
            contents=prompt
        )
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
        
        response = await self._safe_generate(
            model=FLASH,
            contents=prompt
        )
        guide_text = response.text.strip()
        
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
        
        response = await self._safe_generate(
            model=FLASH,
            contents=prompt
        )
        
        # TODO: Parse the response and create structured Recommendation objects
        return []
    
    async def translate_message(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> str:
        """Translate a chat message quickly"""
        
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
            response = await self._safe_generate(
                model=FLASH_LITE,
                contents=prompt
            )
            
            if not response or not response.text:
                logger.warning("Gemini returned empty response")
                return text

            raw = response.text.strip()
            # "Translation:" prefix removal
            for prefix in ("Translation:", "Translation :", "translation:", "translation :"): 
                if raw.lower().startswith(prefix.lower()):
                    raw = raw[len(prefix):].strip()
                    break
            
            return raw
        except Exception as e:
            logger.error(f"Gemini translation error: {type(e).__name__}: {str(e)}")
            traceback.print_exc()
            return text
    
    def detect_keywords(self, text: str) -> List[str]:
        """Detect Korean culture keywords in text"""
        # Keywords that trigger AI bot explanations
        korean_keywords = {
            # Food & Drinks
            '김치', 'kimchi', '불고기', 'bulgogi', '삼겹살', 'samgyeopsal',
            '비빔밥', 'bibimbap', '떡볶이', 'tteokbokki', '치킨', 'korean chicken',
            '삼계탕', 'samgyetang', '냉면', 'naengmyeon', '갈비', 'galbi',
            '순대', 'sundae', '호떡', 'hotteok', '붕어빵', 'bungeoppang',
            '된장찌개', 'doenjang jjigae', '김치찌개', 'kimchi jjigae',
            '부대찌개', 'budae jjigae', '순두부찌개', 'sundubu jjigae',
            '잡채', 'japchae', '전', 'jeon', '파전', 'pajeon', '해물파전', 'haemul pajeon',
            '만두', 'mandu', '군만두', 'goon mandu', '족발', 'jokbal',
            '보쌈', 'bossam', '쌈', 'ssam', '곱창', 'gopchang',
            '국밥', 'gukbap', '설렁탕', 'seolleongtang', '해장국', 'haejangguk',
            '순대국', 'sundae guk', '우거지국', 'ugeoijiguk',
            '라면', 'ramyeon', '라볶이', 'rabokki', '김밥', 'gimbap', '유부초밥',
            '회', 'hoe', 'sashimi', '초밥', '간장게장', 'ganjang gejang',
            '치맥', 'chimaek', '소맥', 'somaek', '막걸리', 'makgeolli',
            '소주', 'soju', '맥주', '한국 맥주', 'korean beer', '식혜', 'sikhye',
            '수정과', 'sujeonggwa', '믹스커피', 'mix coffee', '아이스아메리카노',
            '탕수육', 'tangsuyuk', '짜장면', 'jajangmyeon', '짬뽕', 'jjamppong',
            '마라탕', 'malatang', '양꼬치', 'yangggochi',
            '오겹살', '고기집', 'korean bbq', 'bbq',
            '편의점', 'convenience store', '세븐일레븐', 'cu', 'gs25',
            '삼각김밥', 'triangle gimbap', '핫바', '컵라면',
            '노포', 'old restaurant', '맛집', 'matjip', 'famous restaurant',
            '디저트', 'dessert', '빙수', 'bingsu', '팥빙수', 'patbingsu',
            '달고나', 'dalgona', '약과', 'yakgwa', '한과', 'hangwa',

            # Places — Seoul
            '경복궁', 'gyeongbokgung', '창덕궁', 'changdeokgung', '덕수궁', 'deoksugung',
            '경희궁', 'gyeonghuigung', '종묘', 'jongmyo',
            '남산', 'namsan', '남산타워', 'n seoul tower', 'namsan tower',
            '명동', 'myeongdong', '홍대', 'hongdae', '강남', 'gangnam',
            '인사동', 'insadong', '북촌', 'bukchon', '이태원', 'itaewon',
            '동대문', 'dongdaemun', 'ddp', '동대문디자인플라자',
            '잠실', 'jamsil', '롯데월드', 'lotte world', '코엑스', 'coex',
            '광화문', 'gwanghwamun', '청계천', 'cheonggyecheon',
            '한강', 'han river', '여의도', 'yeouido', '뚝섬', 'ttukseom',
            '서촌', 'seochon', '연남동', 'yeonnam', '성수동', 'seongsu',
            '익선동', 'ikseon-dong', '을지로', 'euljiro',
            '합정', 'hapjeong', '망원', 'mangwon', '상수', 'sangsu',
            '신촌', 'sinchon', '건대', 'konkuk', '왕십리', 'wangsimni',
            '동묘', 'dongmyo', '낙원상가', 'nakwon',
            '서울숲', 'seoul forest', '올림픽공원', 'olympic park',
            '북한산', 'bukhansan', '관악산', 'gwanaksan', '도봉산', 'dobongsan',

            # Places — Outside Seoul
            '부산', 'busan', '해운대', 'haeundae', '광안리', 'gwangalli',
            '자갈치', 'jagalchi', '국제시장', 'gukje market', '감천문화마을', 'gamcheon',
            '경주', 'gyeongju', '불국사', 'bulguksa', '석굴암', 'seokguram',
            '제주', 'jeju', '한라산', 'hallasan', '성산일출봉', 'seongsan ilchulbong',
            '협재', 'hyeopjae', '애월', 'aewol',
            '전주', 'jeonju', '전주한옥마을', 'jeonju hanok village',
            '수원', 'suwon', '수원화성', 'hwaseong fortress',
            '춘천', 'chuncheon', '남이섬', 'nami island',
            '강릉', 'gangneung', '정동진', 'jeongdongjin',
            '속초', 'sokcho', '설악산', 'seoraksan',
            '인천', 'incheon', '인천공항', 'incheon airport', '차이나타운',

            # Culture & Entertainment
            '한복', 'hanbok', '한옥', 'hanok', '사물놀이', 'samulnori',
            'k-pop', 'kpop', '케이팝', '아이돌', 'idol',
            '노래방', 'noraebang', 'karaoke', 'pc방', 'pc bang', 'pc cafe',
            '찜질방', 'jjimjilbang', '사우나', 'sauna', '목욕탕', 'bathhouse',
            '한류', 'hallyu', 'korean wave', '드라마', 'k-drama', 'kdrama',
            '방탄소년단', 'bts', '블랙핑크', 'blackpink', '뉴진스', 'newjeans',
            '투어', 'tour', '팬미팅', 'fan meeting', '콘서트', 'concert',
            '무속신앙', '무당', 'shaman', '도깨비', 'goblin', '귀신',
            '태권도', 'taekwondo', '합기도', 'hapkido',
            '배드민턴', '탁구', '볼링', '당구',
            '보드게임카페', 'board game cafe', '방탈출', 'escape room',
            '오락실', 'arcade', '인형뽑기',

            # Shopping
            '쇼핑', 'shopping', '시장', 'market', '재래시장', 'traditional market',
            '광장시장', 'gwangjang market', '남대문시장', 'namdaemun market',
            '면세점', 'duty free', '올리브영', 'olive young',
            '다이소', 'daiso', '무신사', 'musinsa',
            '롯데백화점', 'lotte department', '현대백화점', 'hyundai department',
            '신세계', 'shinsegae', '갤러리아',
            '이케아', 'ikea', '코스트코', 'costco',
            '홍대 쇼핑', '명동 쇼핑', '동대문 쇼핑',

            # Transport & Practical
            '지하철', 'subway', 'metro', '버스', 'bus', '택시', 'taxi',
            '카카오택시', 'kakao taxi', '우버', 'uber',
            'ktx', '고속열차', 'high-speed rail', '기차', 'train',
            '교통카드', 't-money', 'tmoney', '티머니',
            '환승', 'transfer', '환불', 'refund',
            '공항철도', 'arex', '리무진버스', 'limousine bus',
            '투어버스', 'city tour bus',

            # Practical / Useful
            '약국', 'pharmacy', '편의점', '병원', 'hospital', '경찰', 'police',
            '환전', 'currency exchange', '환율', 'exchange rate',
            '와이파이', 'wifi', '포켓와이파이', 'pocket wifi', '유심', 'sim card',
            '숙소', 'accommodation', '호텔', 'hotel', '게스트하우스', 'guesthouse',
            '에어비앤비', 'airbnb', '한옥스테이', 'hanok stay',
            '짐 보관', 'luggage storage', '코인로커', 'coin locker',
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
        
        response = await self._safe_generate(
            model=FLASH,
            contents=prompt
        )
        return response.text.strip()


    async def translate_to_korean(self, text: str) -> str:
        """Translate English search term to Korean for Naver Map Search"""
        
        prompt = f"""Translate the following location search query into Korean for Naver Maps search.
Input: '{text}'
Output: Just the Korean term. No explanations."""

        try:
            response = await self._safe_generate(
                model=FLASH_LITE,
                contents=prompt
            )
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
            response = await self._safe_generate(
                model=FLASH_LITE,
                contents=prompt
            )
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
                "title": item['title'],
                "address": item.get('roadAddress') or item.get('address')
            } for item in items]


    async def get_place_description(self, place_name: str, location: str = "") -> str:
        """Get a brief description of a place using Gemini"""
        
        prompt = f"""Provide a brief, engaging description (2-3 sentences) for the place "{place_name}"{f" located in {location}" if location else ""} in Korea.
        Focus on what makes it famous or worth visiting for a tourist.
        Write in English."""
        
        try:
            response = await self._safe_generate(
                model=FLASH_LITE,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to get place description: {e}")
            return "Description unavailable."

    async def analyze_menu_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
        """Analyze a Korean menu image and return English descriptions for each item"""
        import base64

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
            # New SDK: inline_data with base64 encoded bytes
            image_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64.b64encode(image_bytes).decode("utf-8")
                }
            }
            response = await self._safe_generate(
                model=FLASH,
                contents=[prompt, image_part]
            )
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

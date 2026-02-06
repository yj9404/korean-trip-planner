"""Google Gemini AI service for translation and travel guidance"""

import google.generativeai as genai
from typing import Optional, List
from datetime import datetime

from app.config import settings
from app.models.translation import TranslationRequest, TranslationResponse
from app.models.ai_guide import AIGuideRequest, AIGuideResponse, Recommendation


class GeminiService:
    """Service for Google Gemini AI operations"""
    
    def __init__(self):
        self.model: Optional[genai.GenerativeModel] = None
        self._configure()
    
    def _configure(self):
        """Configure Gemini API"""
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
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
        
        response = self.model.generate_content(prompt)
        translated_text = response.text.strip()
        
        return TranslationResponse(
            original_text=request.text,
            translated_text=translated_text,
            source_lang=request.source_lang,
            target_lang=request.target_lang
        )
    
    async def get_travel_guide(self, request: AIGuideRequest) -> AIGuideResponse:
        """Get AI-powered travel guide recommendations"""
        
        lang_instruction = "Respond in Korean." if request.language == "ko" else "Respond in English."
        
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
        
        response = self.model.generate_content(prompt)
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
        
        lang_instruction = "Respond in Korean." if language == "ko" else "Respond in English."
        
        prompt = f"""{lang_instruction}

Provide 5 top recommendations for {category} in {location}, Korea.

For each recommendation, provide:
1. Name/Title
2. Brief description (2-3 sentences)
3. Location/Address
4. Estimated cost range
5. 2-3 practical tips

Format your response as a numbered list with clear sections."""
        
        response = self.model.generate_content(prompt)
        
        # For now, return empty list
        # TODO: Parse the response and create structured Recommendation objects
        return []


# Global Gemini service instance
gemini_service = GeminiService()

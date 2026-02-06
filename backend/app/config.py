"""Application configuration management"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Settings
    api_version: str = "v1"
    debug: bool = True
    
    # Google Gemini API
    gemini_api_key: str
    
    # Firebase
    firebase_credentials_path: str = "./firebase-credentials.json"
    
    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list"""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()

"""
GazeConnect Backend Configuration
Uses Pydantic v2 BaseSettings for type-safe environment configuration.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    SUPABASE_URL: str = Field(default="", description="Supabase Project URL")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase Anonymous Key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="", description="Supabase Service Role Key")
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated list of CORS origins",
    )
    ENVIRONMENT: str = Field(default="development", description="Execution environment")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()

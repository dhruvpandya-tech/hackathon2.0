from functools import lru_cache
from pydantic import BaseModel
import os


class Settings(BaseModel):
    app_name: str = "ConvertX AI"
    environment: str = os.getenv("ENV", "development")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    openai_timeout_seconds: float = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))
    resend_api_key: str | None = os.getenv("RESEND_API_KEY")
    screenshot_timeout_ms: int = int(os.getenv("SCREENSHOT_TIMEOUT_MS", "10000"))
    http_timeout_seconds: float = float(os.getenv("HTTP_TIMEOUT_SECONDS", "10"))


@lru_cache
def get_settings() -> Settings:
    return Settings()

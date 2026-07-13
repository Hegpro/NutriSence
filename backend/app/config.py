import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class Settings(BaseSettings):
    PORT: int = int(os.getenv("PORT", 8000))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nutrisense.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkeyfornutrisenseagent123456")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

    # AI Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Notifications
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    BREVO_SENDER_EMAIL: str = os.getenv("BREVO_SENDER_EMAIL", "reminders@nutrisense.ai")
    BREVO_SENDER_NAME: str = os.getenv("BREVO_SENDER_NAME", "NutriSense AI Coach")

    # ChromaDB
    CHROMA_API_KEY: str = os.getenv("CHROMA_API_KEY", "")
    CHROMA_TENANT: str = os.getenv("CHROMA_TENANT", "")
    CHROMA_DATABASE: str = os.getenv("CHROMA_DATABASE", "NutriSence")
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "api.trychroma.com")

    class Config:
        case_sensitive = True

settings = Settings()

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    # API Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://rishovsen@localhost/chillconnect")
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "https://your-domain.vercel.app"]
    
    # External Services
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # PayPal
    PAYPAL_CLIENT_ID: str = os.getenv("PAYPAL_CLIENT_ID", "")
    PAYPAL_CLIENT_SECRET: str = os.getenv("PAYPAL_CLIENT_SECRET", "")
    PAYPAL_MODE: str = os.getenv("PAYPAL_MODE", "sandbox")  # sandbox or live
    
    # Redis for caching and sessions
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    
    # Token economy
    TOKEN_VALUE_INR: int = 100  # 1 token = ₹100
    PLATFORM_COMMISSION: float = 0.15  # 15% commission

settings = Settings()
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from app.core.config import settings
from app.database.database import engine, Base
from app.api.auth import router as auth_router
from app.api.providers import router as providers_router
from app.api.bookings import router as bookings_router
from app.api.tokens import router as tokens_router
from app.api.chat import router as chat_router
from app.api.admin import router as admin_router
from app.api.support import router as support_router
from app.api.ratings import router as ratings_router
from app.api.platform_fees import router as platform_fees_router

load_dotenv()

app = FastAPI(
    title="ChillConnect Booking Platform",
    description="Premium adult services booking platform with token-based payments",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include API routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(providers_router, prefix="/api/v1/providers", tags=["Providers"])
app.include_router(bookings_router, prefix="/api/v1/bookings", tags=["Bookings"])
app.include_router(tokens_router, prefix="/api/v1/tokens", tags=["Tokens"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(support_router, prefix="/api/v1/support", tags=["Support"])
app.include_router(ratings_router, prefix="/api/v1/ratings", tags=["Ratings"])
app.include_router(platform_fees_router, prefix="/api/v1/platform-fees", tags=["Platform Fees"])

@app.get("/")
async def root():
    return {"message": "ChillConnect Booking Platform API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "ChillConnect API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
#!/usr/bin/env python3
"""
Simple test server to verify basic functionality
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="ChillConnect Test API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "ChillConnect Test API is running!",
        "status": "✅ Backend is working",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "ChillConnect backend is operational"
    }

@app.get("/api/v1/test")
async def test_endpoint():
    return {
        "success": True,
        "message": "API endpoint working correctly",
        "features": [
            "✅ FastAPI server running",
            "✅ CORS configured",
            "✅ API routes working",
            "✅ Ready for frontend connection"
        ]
    }

if __name__ == "__main__":
    print("🚀 Starting ChillConnect Test Server...")
    print("📡 Backend will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
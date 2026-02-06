"""FastAPI application entry point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.routers import translate, trips, ai_guide
from app.services.firebase_service import firebase_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup: Initialize Firebase
    firebase_service.initialize()
    print("🔥 Firebase initialized")
    print(f"🤖 Gemini API configured")
    
    yield
    
    # Shutdown: Cleanup
    print("👋 Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Korea Trip Planner API",
    description="Backend API for Korea Trip Planner PWA",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(translate.router, prefix=f"/api/{settings.api_version}", tags=["Translation"])
app.include_router(trips.router, prefix=f"/api/{settings.api_version}", tags=["Trips"])
app.include_router(ai_guide.router, prefix=f"/api/{settings.api_version}", tags=["AI Guide"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Korea Trip Planner API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "firebase": firebase_service.is_initialized,
        "gemini": bool(settings.gemini_api_key)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )

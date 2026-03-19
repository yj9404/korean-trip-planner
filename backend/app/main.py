"""FastAPI application entry point"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import logging
import sys

# Configure logging with timestamp
logging.basicConfig(
    format='%(asctime)s [%(levelname)s] %(message)s',
    level=logging.INFO,
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

from app.config import settings
from app.routers import translate, trips, ai_guide, chat, itinerary, places, groups, menu, media
from app.services.firebase_service import firebase_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup: Initialize Firebase
    firebase_service.initialize()
    logger.info("🔥 Firebase initialized")
    logger.info(f"🤖 Gemini API configured")
    
    yield
    
    # Shutdown: Cleanup
    logger.info("👋 Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Korea Trip Planner API",
    description="Backend API for Korea Trip Planner PWA",
    version="0.1.1",
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

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include routers
app.include_router(groups.router, prefix=f"/api/{settings.api_version}", tags=["Groups"])
app.include_router(translate.router, prefix=f"/api/{settings.api_version}", tags=["Translation"])
# app.include_router(trips.router, prefix=f"/api/{settings.api_version}", tags=["Trips"])  # Removed - single trip architecture
app.include_router(ai_guide.router, prefix=f"/api/{settings.api_version}", tags=["AI Guide"])
app.include_router(chat.router, prefix=f"/api/{settings.api_version}", tags=["Chat"])
app.include_router(itinerary.router, tags=["Itinerary"])
app.include_router(places.router, prefix="/api/v1", tags=["Places"])
app.include_router(menu.router, prefix="/api/v1", tags=["Menu"])
app.include_router(media.router, prefix="/api/v1", tags=["Media"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Korea Trip Planner API",
        "version": "0.1.1",
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

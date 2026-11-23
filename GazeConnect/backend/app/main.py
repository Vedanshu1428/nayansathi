"""
GazeConnect FastAPI Main Application
Provides endpoints for AI sentence assistance, system health, and secure proxy logic.
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import (
    SentencePredictRequest,
    SentencePredictResponse,
    HealthResponse,
)
from app.gemini_service import predict_sentences
from app.auth_guard import (
    get_current_user,
    verify_active_caregiver_permission,
    AuthenticatedUser,
)

app = FastAPI(
    title="GazeConnect Backend Service",
    description="Accessible AI Assistive Communication API powered by Google Gemini 2.5 Flash",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Returns the operational status of the service."""
    has_gemini = bool(settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"))
    return HealthResponse(
        status="healthy",
        service="gazeconnect-backend",
        version="1.0.0",
        gemini_configured=has_gemini,
    )


@app.post(
    "/api/ai/predict-sentences",
    response_model=SentencePredictResponse,
    tags=["Assistive AI"],
)
async def api_predict_sentences(request: SentencePredictRequest):
    """
    Predicts up to 3 natural, complete, polite sentence completions
    from patient keywords or partial input.
    """
    return await predict_sentences(request)


@app.get(
    "/api/caregiver/patients/{patient_id}/phrases",
    tags=["Caregiver Sync"],
)
async def get_patient_phrases_for_caregiver(
    patient_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Protected caregiver endpoint: fetches patient's configured phrases."""
    await verify_active_caregiver_permission(patient_id, user)
    return {
        "patient_id": patient_id,
        "phrases": [
            "I need water.",
            "Could you raise the backrest 15 degrees?",
            "My feet feel cold.",
            "Please bring my medication.",
        ],
    }


@app.get("/", tags=["System"])
async def root_info():
    return {
        "app": "GazeConnect API",
        "tagline": "Your Eyes. Your Voice. Your Freedom.",
        "documentation": "/docs",
        "health": "/health",
    }

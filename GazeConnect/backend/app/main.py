"""
GazeConnect FastAPI Main Application
Provides endpoints for AI sentence assistance, Caregiver live replies,
system-wide OS desktop eye control (WebSocket), and secure proxy logic.
"""

import json
import logging
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import (
    SentencePredictRequest,
    SentencePredictResponse,
    CaregiverReplyRequest,
    CaregiverReplyResponse,
    HealthResponse,
)
from app.gemini_service import predict_sentences, generate_caregiver_replies
from app.os_controller import os_controller
from app.auth_guard import (
    get_current_user,
    verify_active_caregiver_permission,
    AuthenticatedUser,
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="GazeConnect Backend Service",
    description="Accessible AI Assistive Communication & OS Eye Control API",
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


@app.get("/", tags=["System"])
async def root():
    """Returns application name and operational metadata."""
    return {
        "app": "GazeConnect Accessible Communication API",
        "description": "Your Eyes. Your Voice. Your Freedom.",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
    }


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


@app.post(
    "/api/ai/reply-suggestions",
    response_model=CaregiverReplyResponse,
    tags=["Assistive AI"],
)
async def api_caregiver_replies(request: CaregiverReplyRequest):
    """
    Generates 3 direct 1-dwell patient replies from caregiver spoken input.
    """
    return await generate_caregiver_replies(request)


@app.websocket("/ws/os-control")
async def websocket_os_control(websocket: WebSocket):
    """
    Real-time bidirectional WebSocket bridge for Windows OS desktop control.
    Receives gaze move, click, double click, right click, and scroll commands.
    """
    await websocket.accept()
    logger.info("Client connected to /ws/os-control")

    # Send initial screen geometry
    width, height = os_controller.get_screen_resolution()
    await websocket.send_text(
        json.dumps({
            "type": "init",
            "screenWidth": width,
            "screenHeight": height,
            "status": "ready",
        })
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                action = cmd.get("action", "move")

                if action == "move":
                    x = float(cmd.get("x", 0.5))
                    y = float(cmd.get("y", 0.5))
                    success, msg = os_controller.move_cursor(x, y)
                    if not success:
                        await websocket.send_text(
                            json.dumps({"type": "override", "message": msg, "paused": True})
                        )

                elif action in ("click", "double_click", "right_click"):
                    btn = "right" if action == "right_click" else "left"
                    is_double = action == "double_click"
                    success, msg = os_controller.click(button=btn, double=is_double)
                    await websocket.send_text(
                        json.dumps({"type": "action_result", "action": action, "success": success, "message": msg})
                    )

                elif action == "scroll":
                    delta = int(cmd.get("delta", 0))
                    success, msg = os_controller.scroll(delta)
                    await websocket.send_text(
                        json.dumps({"type": "action_result", "action": "scroll", "success": success, "message": msg})
                    )

                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

            except Exception as e:
                logger.error("Error processing os-control command: %s", str(e))
                await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))

    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/os-control")


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

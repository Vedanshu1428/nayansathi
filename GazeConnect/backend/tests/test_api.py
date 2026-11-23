"""
GazeConnect Backend Unit & Integration Tests
Validates API health, sentence prediction, offline fallbacks, and authentication guards.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Validates that GET /health returns 200 with service metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "gazeconnect-backend"
    assert "gemini_configured" in data


def test_root_endpoint():
    """Validates GET / returns brand tagline and info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "GazeConnect" in data["app"]


def test_predict_sentences_english():
    """Validates POST /api/ai/predict-sentences with English keywords."""
    payload = {
        "keywords": ["water", "please"],
        "partial_text": "I want",
        "language": "en",
        "context": "General",
    }
    response = client.post("/api/ai/predict-sentences", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "suggestions" in data
    assert isinstance(data["suggestions"], list)
    assert len(data["suggestions"]) > 0
    assert len(data["suggestions"]) <= 3
    assert data["source"] in ["gemini", "fallback"]
    assert "disclaimer" in data


def test_predict_sentences_hindi_fallback():
    """Validates deterministic fallback in Hindi."""
    payload = {
        "keywords": ["पानी"],
        "partial_text": "",
        "language": "hi",
    }
    response = client.post("/api/ai/predict-sentences", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["suggestions"]) > 0
    # Suggestions should contain Hindi text or safe completions
    assert any("पानी" in s or "कृपया" in s for s in data["suggestions"])


def test_predict_sentences_spanish():
    """Validates prediction in Spanish."""
    payload = {
        "keywords": ["agua"],
        "partial_text": "",
        "language": "es",
    }
    response = client.post("/api/ai/predict-sentences", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["suggestions"]) > 0
    assert any("agua" in s.lower() or "favor" in s.lower() for s in data["suggestions"])


def test_caregiver_endpoint_requires_auth():
    """Validates that protected caregiver endpoints reject unauthorized requests with 401."""
    response = client.get("/api/caregiver/patients/00000000-0000-0000-0000-000000000001/phrases")
    assert response.status_code == 401
    assert "Authorization" in response.json()["detail"] or "token" in response.json()["detail"]


def test_caregiver_endpoint_authorized_mock():
    """Validates that protected caregiver endpoints succeed with valid mock caregiver token."""
    headers = {"Authorization": "Bearer mock-caregiver-token"}
    response = client.get(
        "/api/caregiver/patients/00000000-0000-0000-0000-000000000001/phrases",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "phrases" in data
    assert len(data["phrases"]) > 0


def test_predict_sentences_invalid_payload():
    """Validates that Pydantic rejects invalid non-object payload with 422."""
    response = client.post("/api/ai/predict-sentences", json="invalid string")
    assert response.status_code == 422

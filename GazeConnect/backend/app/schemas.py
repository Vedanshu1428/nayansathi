"""
GazeConnect Pydantic v2 Schemas
Strict validation and type safety for API requests and responses.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class SentencePredictRequest(BaseModel):
    keywords: Optional[List[str]] = Field(
        default=None,
        description="List of keywords entered by the patient",
        examples=[["water", "please"], ["hungry", "food"]],
    )
    partial_text: Optional[str] = Field(
        default="",
        description="Active composer text or partial sentence typed so far",
        examples=["I want", "Please call"],
    )
    language: str = Field(
        default="en",
        description="Target language code: en, hi, es, or zh",
        examples=["en", "hi", "es", "zh"],
    )
    context: Optional[str] = Field(
        default=None,
        description="Optional situational context: morning, mealtime, medical, general",
    )


class SentencePredictResponse(BaseModel):
    suggestions: List[str] = Field(
        description="List of up to 3 natural, complete, polite sentence suggestions",
        max_length=3,
    )
    source: Literal["gemini", "fallback"] = Field(
        description="Generation source: 'gemini' for live AI or 'fallback' for rule-based",
    )
    disclaimer: str = Field(
        default="AI generated suggestions. Never speaks or acts without explicit user selection.",
        description="Clinical and safety transparency disclosure",
    )


class CaregiverReplyRequest(BaseModel):
    spoken_question: str = Field(
        description="Spoken question or statement from the caregiver",
        examples=["Are you feeling dizzy or just thirsty?", "Do you want to lie down?"],
    )
    language: Literal["en", "hi", "es", "zh"] = Field(
        default="en",
        description="Language code for the generated patient replies",
    )
    patient_context: Optional[str] = Field(
        default="",
        description="Optional background context on patient condition or environment",
    )


class CaregiverReplyResponse(BaseModel):
    replies: List[str] = Field(
        description="Up to 3 tailored, direct 1-dwell replies for the patient",
        max_length=3,
    )
    source: Literal["gemini", "fallback"] = Field(
        description="Generation source: 'gemini' or 'fallback'",
    )


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "gazeconnect-backend"
    version: str = "1.0.0"
    gemini_configured: bool

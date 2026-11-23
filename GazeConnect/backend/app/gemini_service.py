"""
GazeConnect Gemini Generative AI Service
Interfaces with Google GenAI (gemini-2.5-flash) with clinical safety safeguards.
Provides instantaneous deterministic rule-based fallback when offline or API key is absent.
"""

import logging
from typing import List, Tuple
from app.config import settings
from app.schemas import SentencePredictRequest, SentencePredictResponse

logger = logging.getLogger(__name__)

CLINICAL_SYSTEM_INSTRUCTION = """
You are GazeConnect Assistive Communication AI. Your sole mission is to help individuals with severe speech and motor paralysis (such as ALS or locked-in syndrome) communicate efficiently.
Given keywords or a partial sentence from a patient:
1. Generate up to 3 short, natural, polite, and complete sentences preserving the patient's exact intended meaning.
2. Formulate in the requested target language (English, Hindi, Spanish, or Chinese).
3. CLINICAL SAFETY RULE: NEVER invent symptoms, medical diagnoses, medication changes, or emergency actions that the patient did not request.
4. Output ONLY the 3 candidate sentences, one per line, with no extra commentary or numbering.
"""

# Deterministic fallback rules for offline or unconfigured API
FALLBACK_TEMPLATES = {
    "en": {
        "water": [
            "I would like some water, please.",
            "Could you bring me a glass of water?",
            "I am thirsty, please help me drink.",
        ],
        "hungry": [
            "I am hungry, I would like something to eat.",
            "Could I please have my meal now?",
            "I need some food, please.",
        ],
        "pain": [
            "I am feeling pain, could you please help?",
            "I am uncomfortable and need assistance.",
            "Please call the nurse or caregiver.",
        ],
        "tired": [
            "I am tired and would like to rest.",
            "Could you please help me lie down?",
            "I need to sleep for a while.",
        ],
        "bathroom": [
            "I need to use the bathroom, please.",
            "Could you please assist me to the restroom?",
            "I need assistance right now.",
        ],
        "position": [
            "Could you please adjust my position?",
            "I need my backrest adjusted slightly.",
            "My pillow feels uncomfortable.",
        ],
        "default": [
            "Could you please assist me with this?",
            "I would like to tell you something.",
            "Please wait a moment with me.",
        ],
    },
    "hi": {
        "water": [
            "मुझे थोड़ा पानी चाहिए, कृपया।",
            "कृपया मुझे एक गिलास पानी दें।",
            "मुझे प्यास लगी है।",
        ],
        "pain": [
            "मुझे दर्द हो रहा है, कृपया मदद करें।",
            "मैं असहज महसूस कर रहा हूँ।",
            "कृपया डॉक्टर को बुलाएं।",
        ],
        "default": [
            "कृपया मेरी मदद करें।",
            "मुझे आपसे कुछ कहना है।",
            "कृपया थोड़ा रुकिए।",
        ],
    },
    "es": {
        "water": [
            "Me gustaría un poco de agua, por favor.",
            "¿Podrías traerme un vaso de agua?",
            "Tengo sed, por favor.",
        ],
        "pain": [
            "Siento dolor, ¿podrías ayudarme por favor?",
            "Me siento incómodo y necesito ayuda.",
            "Por favor llama al médico.",
        ],
        "default": [
            "¿Podrías ayudarme con esto, por favor?",
            "Me gustaría decirte algo.",
            "Por favor espera un momento.",
        ],
    },
    "zh": {
        "water": [
            "我想喝点水，谢谢。",
            "请帮我倒杯水好吗？",
            "我口渴了，请给我水。",
        ],
        "pain": [
            "我感到疼痛，请帮帮我。",
            "我感觉不舒服，需要帮助。",
            "请叫医生过来一下。",
        ],
        "default": [
            "请帮我一下，谢谢。",
            "我想对你说些事情。",
            "请稍微等我一下。",
        ],
    },
}


def get_deterministic_fallback(req: SentencePredictRequest) -> List[str]:
    """Generates rule-based completions when Gemini AI is not available."""
    lang = req.language.lower()[:2]
    lang_dict = FALLBACK_TEMPLATES.get(lang, FALLBACK_TEMPLATES["en"])

    input_text = ""
    if req.keywords:
        input_text += " ".join(req.keywords) + " "
    if req.partial_text:
        input_text += req.partial_text

    input_lower = input_text.lower()

    for key, phrases in lang_dict.items():
        if key in input_lower and key != "default":
            return phrases[:3]

    if req.partial_text and req.partial_text.strip():
        # Custom completion from partial text
        base = req.partial_text.strip()
        if lang == "en":
            return [
                f"{base}, please.",
                f"Could you help me with {base}?",
                f"I really need {base} right now.",
            ]
        elif lang == "hi":
            return [
                f"{base} चाहिए, कृपया।",
                f"कृपया {base} में मेरी मदद करें।",
                f"मुझे {base} की आवश्यकता है।",
            ]
        elif lang == "es":
            return [
                f"{base}, por favor.",
                f"¿Podrías ayudarme con {base}?",
                f"Necesito {base} ahora.",
            ]
        elif lang == "zh":
            return [
                f"请给我{base}。",
                f"我想{base}，谢谢。",
                f"我需要{base}。",
            ]

    return lang_dict["default"][:3]


async def predict_sentences(req: SentencePredictRequest) -> SentencePredictResponse:
    """
    Expands patient's input keywords or partial sentence into up to 3 natural sentences.
    Attempts Google GenAI (gemini-2.5-flash) first; falls back gracefully to deterministic rule engine.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("your_"):
        logger.info("GEMINI_API_KEY not configured. Using deterministic fallback.")
        return SentencePredictResponse(
            suggestions=get_deterministic_fallback(req),
            source="fallback",
        )

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""Language: {req.language}
Patient input keywords: {req.keywords or []}
Patient partial text: '{req.partial_text or ''}'
Context: {req.context or 'General'}

Provide 3 concise, polite sentence options:"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                "system_instruction": CLINICAL_SYSTEM_INSTRUCTION,
                "temperature": 0.3,
                "max_output_tokens": 150,
            },
        )

        text = response.text or ""
        lines = [line.strip().lstrip("-").lstrip("1234567890.").strip() for line in text.split("\n") if line.strip()]
        valid_suggestions = [l for l in lines if len(l) > 2][:3]

        if len(valid_suggestions) > 0:
            return SentencePredictResponse(
                suggestions=valid_suggestions,
                source="gemini",
            )
        else:
            return SentencePredictResponse(
                suggestions=get_deterministic_fallback(req),
                source="fallback",
            )
    except Exception as e:
        logger.warning("Gemini API call failed (%s). Using deterministic fallback.", str(e))
        return SentencePredictResponse(
            suggestions=get_deterministic_fallback(req),
            source="fallback",
        )

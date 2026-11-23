# NayanSathi — GazeConnect

**Your Eyes. Your Voice. Your Freedom.**

NayanSathi (featuring GazeConnect) is an open-source, browser-based AAC (Augmentative and Alternative Communication) platform designed for individuals living with ALS, Locked-In Syndrome, Cerebral Palsy, and severe motor impairments.

By transforming any standard consumer webcam into a clinical-grade eye-tracking interface, NayanSathi removes the multi-thousand dollar barrier of proprietary assistive hardware.

---

## 🌟 Key Features

- **100% In-Browser Privacy:** Face landmarking (478 3D points) and iris tracking are processed 100% client-side via Google MediaPipe WebAssembly. Zero video frames or biometric data ever leave the user's browser.
- **Intentional Hold-Blink Selection:** Automatic freeze guard locks cursor coordinates the instant eyes close, completely eliminating downward cursor drag. Fast natural blinks (<350ms) are ignored, while deliberate hold-blinks (≥450ms) trigger reliable clicks.
- **Slow Calibrated Glide & Magnetic Snapping:** 1-Euro adaptive low-pass filter (`minCutoff = 0.22`, `beta = 0.004`), 22px deadzone, and 24px 8-directional magnetic snapping on all interactive elements.
- **9-Point Polynomial Ridge Regression Calibration:** Includes 80/20 train/validation split, validation error metrics, stability score, and persistent `localStorage` model storage.
- **AI-Accelerated Communication:** Google Gemini 2.5 Flash sentence assistance turns 1-2 keywords into natural, complete phrases, with instant deterministic offline fallback.
- **Multilingual Large-Key Virtual Keyboard:** Oversized `min-h-[84px]` layout with support for English, Hindi (Devanagari), Spanish, and Chinese, plus offline word completion.
- **Text-to-Speech (TTS):** Integrated Web SpeechSynthesis with Speak, Pause, Resume, Repeat, and Stop controls.
- **Patient Dashboard & Emergency Panel:** Manage custom phrase decks, emergency contact networks with confirmation guards, and consent-gated communication history.

---

## 📁 Repository Structure

```text
d:\NayanSathi\
├── GazeConnect\
│   ├── frontend\         # Next.js 14 (TypeScript Strict) App Router AAC Interface
│   │   ├── src\app\      # Routes: /, /communicate, /dashboard, /caregiver, /auth
│   │   ├── src\lib\gaze\ # Core Eye-Tracking: featureExtractor, oneEuroFilter, dwellEngine
│   │   └── src\components# GazeCursor, WebcamTracker, VirtualKeyboard, PredictionBar
│   ├── backend\          # FastAPI (Python 3.12) AI sentence assistance service
│   │   ├── app\          # Gemini 2.5 Flash integration & CORS security
│   │   └── tests\        # pytest test suite
│   ├── database\         # PostgreSQL + Supabase schema with Row-Level Security
│   ├── docs\             # Testing & deployment documentation
│   ├── AGENTS.md         # Clinical honesty, privacy, and architectural guidelines
│   └── ARCHITECTURE.md   # System architecture specifications
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18 or v20+)
- Python (v3.11 or v3.12+)
- A standard consumer webcam (720p or 1080p built-in or USB)

### 2. Start Backend (FastAPI)
```powershell
cd GazeConnect/backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Health endpoint: `http://127.0.0.1:8000/health`

### 3. Start Frontend (Next.js)
```powershell
cd GazeConnect/frontend
npm install
npm run build
npm run start -- -p 3000
```
Open your browser and navigate to: `http://localhost:3000`

---

## 🧪 Testing

```powershell
# Run backend tests
cd GazeConnect/backend
python -m pytest tests/test_api.py -v

# Run frontend linting & type checks
cd GazeConnect/frontend
npm run lint
npm run build
```

---

## 🛡️ Clinical & Privacy Notice

NayanSathi / GazeConnect is open-source assistive technology software. It is not a certified medical device and is not intended for life-support or critical emergency dispatch.

# GazeConnect — "Your Eyes. Your Voice. Your Freedom."

> **GazeConnect** is a production-ready, open-source Assistive and Augmentative Communication (AAC) web platform engineered for individuals with severe physical disabilities (ALS, cerebral palsy, spinal cord injuries, locked-in syndrome) using an ordinary consumer webcam.

---

## Highlights

- **Standard Webcam Powered**: No specialized infrared or eye-tracking hardware required.
- **100% Client-Side Privacy**: MediaPipe Face & Iris Landmarker runs entirely in browser WebAssembly/GPU. Webcam frames are never recorded or sent across the network.
- **Micro-Jitter Resilient Dwell Engine**: Adaptive 1-Euro Low-Pass Filter with customizable dwell ring selection, cooldown guards, and saccade rejection.
- **Offline-First Resilience**: Full virtual keyboard, local word prediction, emergency phrases, and Text-to-Speech work completely offline.
- **Gemini 2.5 Flash Assisted**: When online, predictive sentence completion expands typed keywords into complete, natural statements via a secure backend proxy.
- **Dual Patient & Caregiver Portals**: Manage customized phrases, emergency contacts, accessibility presets, and consent-gated communication history.

---

## Architecture Overview

```text
Webcam Stream -> MediaPipe Face & Iris (WASM) -> Eye/EAR/Iris Feature Extractor
   -> 9-Point Polynomial Ridge Regression -> 1-Euro Adaptive Low-Pass Filter
   -> Floating Dwell Cursor -> Virtual Keyboard / Quick Panels
   -> Local Word Predictor / FastAPI Gemini 2.5 Flash -> SpeechSynthesis
```

---

## Directory Structure

```text
GazeConnect/
├── AGENTS.md                          # Strict engineering rules & guidelines
├── ARCHITECTURE.md                    # In-depth architectural & mathematical docs
├── IMPLEMENTATION_PLAN.md             # 10-phase master implementation checklist
├── README.md                          # Setup, privacy & overview
├── frontend/                          # Next.js App Router, TypeScript, Tailwind CSS
│   ├── public/sw.js                   # Offline PWA service worker
│   └── src/
│       ├── app/                       # App Router pages (/communicate, /dashboard, /caregiver, /auth)
│       ├── components/                # UI, Gaze trackers, Virtual Keyboard, Quick Panels
│       └── lib/                       # Gaze maths, calibration, 1-Euro, dwell, speech, storage
├── backend/                           # Python FastAPI backend service
│   ├── app/                           # Gemini 2.5 Flash service, auth guard, REST endpoints
│   ├── tests/                         # Backend pytest suite
│   └── requirements.txt
├── database/                          # Supabase PostgreSQL schema & RLS policies
│   └── schema.sql
└── docs/                              # Deployment and testing guide
    └── testing_and_deployment.md
```

---

## Quickstart Setup

### Prerequisites
- Node.js 18+ (tested with Node 20 / 25)
- Python 3.11+
- Web camera (standard laptop or USB webcam)

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start at `http://localhost:3000`.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
The backend API documentation is available at `http://localhost:8000/docs`.

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Backend (`backend/.env`)
```ini
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## Privacy Commitment

1. **Zero Video Capture**: Video frames captured by your camera are analyzed frame-by-frame in browser RAM via `@mediapipe/tasks-vision`. Video is never saved, uploaded, or transmitted anywhere.
2. **Local Machine Learning**: Eye feature extraction and polynomial calibration calculations occur exclusively on your device.
3. **Consent-Gated History**: Communication history is saved only when the user explicitly enables the toggle in their settings, and can be purged instantly with one click.
4. **Clinical Honesty**: GazeConnect does not guarantee emergency dispatch. External phone/SMS alerts require explicit confirmation.

---

## License
MIT License. Built to empower voices worldwide.

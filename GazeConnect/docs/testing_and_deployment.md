# TESTING_AND_DEPLOYMENT.md — Production Testing & Deployment Guide

This document outlines the testing, verification, deployment, and operational procedures for **GazeConnect**.

---

## 1. Testing Procedures

### A. Frontend Verification
Run full linting and production type checking:
```bash
cd frontend
npm run lint
npm run build
```

### B. Backend API & Unit Testing
Execute the test suite with `pytest`:
```bash
cd backend
python -m pytest tests/test_api.py -v
```
Test coverage includes:
- Health check endpoint verification (`/health`).
- Generative AI sentence expansion (`/api/ai/predict-sentences`).
- Offline deterministic rule-based fallback across EN, HI, ES, ZH.
- Unauthorized request rejection (401) on caregiver routes.
- Active caregiver consent permission validation.
- Pydantic v2 request body schema validation (422).

### C. Gaze Engine Mathematical Verification
During 9-point calibration:
- Discards initial 300ms saccade frames automatically.
- Requires 25 valid eye frames per target dot ($9 \times 25 = 225$ total frames).
- Computes Eye Aspect Ratio (EAR); frames with $\text{EAR} < 0.16$ are rejected with status `'blink_ignored'`.
- Solves 2nd-degree polynomial Ridge Regression ($\lambda = 0.01$).
- Reports truthful mean validation error in pixels and stability score (0–100).

### D. Offline Resilience Testing
1. In Google Chrome DevTools, open the **Network** tab and toggle **Offline**.
2. Navigate between tabs: Virtual Keyboard, Quick Phrases, Emergency, and Face-to-Face Mode.
3. Type letters and confirm offline bigram/trigram word suggestions update instantaneously.
4. Select a phrase and confirm browser SpeechSynthesis plays local audio.
5. In Navbar, observe the status pill switch to **"Offline Active"**.

---

## 2. Production Deployment

### A. Frontend Deployment (Vercel / Cloudflare Pages)
1. Link your GitHub repository to Vercel or Cloudflare Pages.
2. Set Root Directory to `frontend`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed FastAPI backend (e.g., `https://api.gazeconnect.app`).
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://your-id.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase public anon key.
4. Build Command: `npm run build`
5. Output Directory: `.next`

### B. Backend Deployment (Google Cloud Run / Fly.io / Docker)
Deploy using standard Python container:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8000
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
```
Set environment variables:
- `GEMINI_API_KEY`: Google AI Studio Gemini API Key.
- `SUPABASE_URL`: Supabase Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Secret Key (Never exposed to client).
- `ALLOWED_ORIGINS`: Comma-separated frontend domains.

### C. Supabase Database Setup
1. Open your Supabase SQL Editor.
2. Execute the entire `database/schema.sql` script.
3. Verify that Row-Level Security (RLS) is enabled on all tables:
   - `profiles`
   - `patient_preferences`
   - `saved_phrases`
   - `communication_history`
   - `caregiver_connections`
   - `emergency_contacts`

---

## 3. Privacy & Clinical Honesty Checklist

- [x] Camera frames are strictly processed in volatile browser memory; zero frames uploaded or saved.
- [x] Communication history is only logged when the patient explicitly enables the consent toggle.
- [x] External emergency calls (`tel:` links) require dual explicit screen confirmation.
- [x] Audio enunciations are visibly badged as "Spoken Aloud Locally".
- [x] Clear disclaimer that GazeConnect is an assistive AAC tool, not a certified life-support system.

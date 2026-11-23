# IMPLEMENTATION_PLAN.md — GazeConnect Master Build Tracking

Track progress across all 10 sequential build phases (0 to 9). Mark tasks `[x]` as they pass build, lint, and verification gates.

---

## [x] Phase 0: Repository Skeleton & Root Documentation
- [x] Create directory structure according to specification.
- [x] Create `AGENTS.md` with all 8 strict engineering and anti-hallucination rules.
- [x] Create `ARCHITECTURE.md` documenting end-to-end pipeline and mathematical models.
- [x] Create `IMPLEMENTATION_PLAN.md` tracking all 10 phases.
- [x] Create `README.md` with setup guides, env variables, privacy commitment, and architecture.

---

## [x] Phase 1: Frontend Infrastructure, Design System & App Shell
- [x] Initialize Next.js (App Router, TypeScript `strict: true`, Tailwind CSS).
- [x] Install dependencies: `framer-motion`, `lucide-react`, `@mediapipe/tasks-vision`, `@supabase/supabase-js`.
- [x] Configure Tailwind theme: Deep Navy (`#0F172A`), Crisp White (`#FFFFFF`), Soft Ice Blue (`#F0F9FF`), Medical Teal (`#0D9488`), Alert Coral (`#DC2626`), High-Contrast Yellow (`#FACC15`).
- [x] Implement `frontend/src/app/globals.css` with accessibility styles and dwell animations.
- [x] Implement `frontend/src/app/layout.tsx` with font setup, theme providers, and offline status.
- [x] Implement `frontend/src/components/ui/Navbar.tsx` (Brand, Nav links, Gaze vs Mouse Toggle, Online/Offline Pill, Emergency CTA).
- [x] Implement `frontend/src/app/page.tsx` (Landing page: Hero, Tagline, Disability Context, 4-Step Workflow, UI Preview, Privacy Guarantee).
- [x] Scaffold `frontend/src/app/communicate/page.tsx` (Main workspace shell).
- [x] Scaffold `frontend/src/app/dashboard/page.tsx` (Patient dashboard shell).
- [x] Scaffold `frontend/src/app/caregiver/page.tsx` (Caregiver portal shell).
- [x] Scaffold `frontend/src/app/auth/page.tsx` (Auth login/signup shell).
- [x] Verification Gate: Run `npm run build` in `frontend/` without errors.

---

## [x] Phase 2: Computer Vision Pipeline & Real-Time Feature Extractor
- [x] Implement `frontend/src/lib/gaze/types.ts` with strict TypeScript types for all eye features, statuses, points, and calibration data.
- [x] Implement `frontend/src/lib/gaze/featureExtractor.ts` using `@mediapipe/tasks-vision` FaceLandmarker (numFaces: 1, runningMode: 'VIDEO', landmark indices 33, 133, 159, 145, 362, 263, 386, 374, iris 468-477, EAR computation, blink rejection, 3-frame rolling median filter).
- [x] Implement `frontend/src/components/gaze/WebcamTracker.tsx` (local getUserMedia, permission handling, canvas landmarks overlay, tracking status callbacks).
- [x] Wire `WebcamTracker.tsx` into `communicate/page.tsx` and persistent `GazeProvider.tsx`.
- [x] Verification Gate: Run `npm run build` in `frontend/` without errors.

---

## [x] Phase 3: 9-Point Polynomial Ridge Regression Calibration
- [x] Implement `frontend/src/lib/gaze/calibrationModel.ts` (2nd-degree polynomial expansion, L2 regularized Ridge Regression solver, 80/20 train/validation split, truthful CalibrationReport).
- [x] Implement `frontend/src/components/gaze/CalibrationModal.tsx` (9 sequential screen targets, 300ms saccade delay, ~25 valid frames per target, live quality report with Accept/Recalibrate, local persistence).
- [x] Wire `CalibrationModal.tsx` into `communicate/page.tsx`.
- [x] Verification Gate: Run `npm run build` in `frontend/` without errors.

---

## [x] Phase 4: 1-Euro Filter & Gaze Dwell Engine
- [x] Implement `frontend/src/lib/gaze/oneEuroFilter.ts` (1€ filter with minCutoff 0.22, beta 0.004, dCutoff 1.0, 22px deadzone, velocity clamping 900px/s, saccade detection).
- [x] Implement `frontend/src/lib/gaze/dwellEngine.ts` (hit testing with 24px magnetic snapping, 150ms micro-jitter exit grace buffer, intentional hold-blink click at >=450ms, cursor freeze on blink, 100% dwell trigger, 600ms/900ms post-selection cooldown).
- [x] Implement `frontend/src/components/gaze/GazeCursor.tsx` (floating SVG radial progress ring, amber blink-hold ring, tuning pill for Hold-Blink / Slow Dwell / Hybrid, cursor speed presets, timing sliders).
- [x] Wire `GazeCursor.tsx` and `dwellEngine.ts` into global `GazeProvider.tsx` and `communicate/page.tsx`.
- [x] Verification Gate: Run `npm run build` in `frontend/` without errors.

---

## [x] Phase 5: Multi-Layout Virtual Keyboard & Offline Predictor
- [x] Implement `frontend/src/lib/prediction/localPredictor.ts` (100% offline bigram/trigram predictor + frequency tables for EN, HI, ES, ZH).
- [x] Implement `frontend/src/components/keyboard/VirtualKeyboard.tsx`:
  - 5-slot offline word prediction bar.
  - Layout switchers: QWERTY, Simplified, Large-Key (`min-h-[84px]`), High-Contrast.
  - Script switchers: English (EN), Hindi (HI), Spanish (ES), Chinese (ZH).
  - High-target keys (68px–84px min height), Space, Backspace, Delete Word, Undo, Clear.
  - Full `data-dwell="true"` and manual mouse/keyboard support.
- [x] Wire `VirtualKeyboard.tsx` into `communicate/page.tsx`.
- [x] Verification Gate: Run `npm run build` in `frontend/` without errors.

---

## [x] Phase 6: Text-to-Speech Engine & Categorized Quick Panels
- [x] Implement `frontend/src/lib/speech/ttsEngine.ts` (speechSynthesis wrapper, voice selector, honest missing voice reporting, speak/pause/resume/stop/repeatLast, rate 0.6x-1.5x).
- [x] Implement `frontend/src/components/keyboard/QuickPanels.tsx`:
  - Tab 2: Categorized Quick Phrases (Daily Needs, Medical, Social, Favourites).
  - Tab 3: Emergency Communication (High-contrast red grid, local TTS speech badge, dual confirmation prompt for external phone/SMS).
  - Tab 4: Face-to-Face Conversation Mode (Extra-large text-4xl display for listeners across the room + YES/NO/WAIT/REPEAT buttons).
- [x] Wire `ttsEngine.ts` and `QuickPanels.tsx` into `communicate/page.tsx`.
- [x] Verification Gate: Run `npm run build` in `frontend/` without errors.

---

## [x] Phase 7: FastAPI Backend, Gemini AI Sentence Assistance & Prediction Bar
- [x] Implement `backend/requirements.txt` and `backend/.env.example`.
- [x] Implement `backend/app/config.py` (Pydantic Settings).
- [x] Implement `backend/app/schemas.py` (Pydantic v2 schemas: SentencePredictRequest, SentencePredictResponse).
- [x] Implement `backend/app/gemini_service.py` (Google GenAI gemini-2.5-flash with clinical safety instructions, deterministic fallback when offline or key missing).
- [x] Implement `backend/app/main.py` (FastAPI app, CORS, `/health`, `/api/ai/predict-sentences`).
- [x] Implement `frontend/src/components/keyboard/PredictionBar.tsx` (AI sentence suggestions with Use, Append, Dismiss).
- [x] Wire `PredictionBar.tsx` into `communicate/page.tsx`.
- [x] Verification Gate: Run `python -m py_compile backend/app/*.py` and `npm run build` in `frontend/`.

---

## [x] Phase 8: Supabase Database Schema, Auth Guard & Portals
- [x] Implement `database/schema.sql` (PostgreSQL DDL with RLS: profiles, patient_preferences, saved_phrases, communication_history, caregiver_connections, emergency_contacts).
- [x] Implement `frontend/src/lib/supabase/client.ts` (safe Supabase browser client).
- [x] Implement `backend/app/auth_guard.py` (Supabase JWT verification and active caregiver permission checks).
- [x] Complete `frontend/src/app/auth/page.tsx` (Patient / Caregiver signup, login, recovery).
- [x] Complete `frontend/src/app/dashboard/page.tsx` (Saved phrases manager, consent-gated history, emergency contacts, caregiver permissions, accessibility settings).
- [x] Complete `frontend/src/app/caregiver/page.tsx` (Active patient selector, phrase configuration, dwell settings, emergency contacts, consented history).
- [x] Verification Gate: Run `npm run build` in `frontend/` and `python -m py_compile backend/app/*.py`.

---

## [x] Phase 9: PWA Service Worker, Local Storage Cache, Testing & Verification Gate
- [x] Implement `frontend/src/lib/storage/localStore.ts` (localStorage fallback for calibration, preferences, offline phrases, emergency settings).
- [x] Implement `frontend/public/sw.js` (PWA service worker caching shell and assets for offline use).
- [x] Implement `backend/tests/test_api.py` (pytest suite covering health, sentence prediction, offline fallback, and auth validation).
- [x] Implement `docs/testing_and_deployment.md` (comprehensive testing guidelines, deployment steps, environment configs, and troubleshooting).
- [x] Execute `npm run lint` in `frontend/` → **PASSED** (zero warnings, zero errors).
- [x] Execute `npm run build` in `frontend/` → **PASSED** (all 6 routes prerendered successfully).
- [x] Execute `python -m pytest tests/test_api.py -v` in `backend/` → **8/8 PASSED in 0.50s**.
- [x] Final Project Completion Report written.

# AGENTS.md — Strict Engineering & Behavioral Directives

This document outlines the inviolable engineering standards and operational protocols for any AI agent or software engineer contributing to **GazeConnect**.

## 1. Strict Engineering & Anti-Hallucination Rules

### Rule 1: NO FAKE OR SIMULATED GAZE DATA
- Never generate random, hardcoded, synthetic, or mouse-mirrored coordinates as fake eye-tracking.
- All gaze coordinates MUST mathematically originate from real webcam frames captured via `navigator.mediaDevices.getUserMedia` and processed by `@mediapipe/tasks-vision` Face Landmarker.
- If no face or eyes are detected in the webcam stream, the tracking engine must report `no_face` or `blink_ignored` explicitly rather than fabricating fallback coordinates.

### Rule 2: 100% LOCAL CAMERA PRIVACY
- All webcam frames and MediaPipe machine-learning inferences execute 100% locally in browser memory.
- Under NO circumstance may video frames, canvas image snapshots, or raw biometric images be recorded, saved to disk, or transmitted over any network, API endpoint, or backend server.
- WebCam tracking is strictly client-side.

### Rule 3: API KEY SECURITY
- Never expose `GEMINI_API_KEY` or Supabase `SERVICE_ROLE_KEY` in client-side code, Next.js client bundles, or `NEXT_PUBLIC_*` environment variables.
- All Gemini generative AI requests route exclusively through the protected Python FastAPI backend service (`/api/ai/*`).
- Supabase public client uses ONLY `NEXT_PUBLIC_SUPABASE_ANON_KEY` governed by strict Row-Level Security (RLS) policies.

### Rule 4: STRICT FILE-COUNT DISCIPLINE
- Adhere precisely to the locked repository structure defined in the master specification.
- Consolidate related logic and UI components cleanly into designated files.
- Never spawn unnecessary micro-files, fragmented helper utilities, or unreferenced boilerplate code.

### Rule 5: STRICT TYPING & VALIDATION
- TypeScript: Enforce `strict: true` across all frontend code. Zero `any` types permitted. All interfaces and type definitions must be explicit and exhaustive.
- Python: Enforce Pydantic v2 schemas for all request payloads, configuration models, and API responses. Strict typing (`typing` module) must be maintained across all backend services.

### Rule 6: MANDATORY MANUAL FALLBACK
- Every gaze-selectable UI element (`data-dwell="true"`) must also function instantaneously via standard mouse clicks, trackpad taps, and keyboard accessibility navigation (`Tab` / `Enter`).
- The user must be able to switch smoothly between Gaze Tracking and Manual Mouse/Touch interaction at any time via the global navigation toggle.

### Rule 7: CLINICAL & EMERGENCY HONESTY
- GazeConnect is an assistive communication technology, NOT a certified medical diagnostic device.
- Never claim clinical-grade accuracy or guaranteed automated emergency dispatch.
- External alerts (such as `tel:` or `sms:` links) require explicit dual-stage user confirmation and must visibly and audibly distinguish local Text-to-Speech enunciations from external emergency contacts.

### Rule 8: NO BLINK-BY-DEFAULT SELECTION
- Involuntary blinks and eye fatigue must never accidentally trigger keyboard selections.
- Selection must utilize a visual **Dwell-Time Engine** featuring:
  - An animated radial progress ring indicator.
  - A configurable dwell duration (600ms – 2500ms).
  - A post-selection cooldown buffer (600ms).
  - An exit grace window (150ms) to withstand micro-saccades and tremors.
  - Mandatory gaze exit from the target boundary before the same element can be selected again.

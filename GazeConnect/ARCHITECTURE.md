# ARCHITECTURE.md — End-to-End System Pipeline & Design

GazeConnect is an open, browser-native Assistive and Augmentative Communication (AAC) platform engineered for individuals with severe motor and vocal impairments (e.g., ALS, cerebral palsy, spinal cord injuries, locked-in syndrome). It delivers millisecond-level gaze typing, sentence prediction, and speech synthesis on standard consumer webcams without specialized hardware.

---

## 1. End-to-End System Architecture

```text
+---------------------------------------------------------------------------------------------------------+
|                                           CLIENT BROWSER (100% LOCAL)                                   |
|                                                                                                         |
|  [ WebCam Stream (640x480 @ 30-60 FPS) ]                                                               |
|                        |                                                                                |
|                        v                                                                                |
|  [ @mediapipe/tasks-vision Face Landmarker ]                                                            |
|    - 478 3D facial landmarks                                                                            |
|    - Iris landmarks (left: 468-472, right: 473-477)                                                     |
|    - Eye corners & eyelids (left: 33, 133, 159, 145 | right: 362, 263, 386, 374)                       |
|                        |                                                                                |
|                        v                                                                                |
|  [ Feature Extractor (featureExtractor.ts) ]                                                            |
|    - Eye Aspect Ratio (EAR) blink detection -> 'blink_ignored' status                                   |
|    - Horizontal & vertical iris position ratios within eye bounding box (0.0 to 1.0)                   |
|    - Head pose proxy (inter-ocular distance & nose tip vector)                                          |
|                        |                                                                                |
|                        v                                                                                |
|  [ 9-Point Ridge Regression Calibration (calibrationModel.ts) ]                                         |
|    - 2nd-degree polynomial expansion: [x_L, y_L, x_R, y_R, h_x, h_y] + pairwise cross terms + bias      |
|    - L2 regularized Ridge Regression (lambda = 0.01, Cholesky / Gauss solver)                           |
|    - Validation report: Mean error px, stability score, recommendation                                  |
|                        |                                                                                |
|                        v                                                                                |
|  [ 1-Euro Adaptive Low-Pass Filter (oneEuroFilter.ts) ]                                                 |
|    - Dynamic cutoff frequency balancing jitter suppression at rest vs latency during saccades           |
|    - Outlier jump gate (>25% viewport suppression unless sustained over 2 frames)                      |
|                        |                                                                                |
|                        v                                                                                |
|  [ Gaze Cursor & Dwell Engine (dwellEngine.ts + GazeCursor.tsx) ]                                      |
|    - document.elementsFromPoint(x, y) targeting `data-dwell="true"`                                     |
|    - 150ms micro-jitter exit grace buffer                                                               |
|    - Radial SVG dwell progress ring (600ms - 2500ms configurable)                                       |
|    - Post-selection cooldown (600ms) & gaze-exit re-arm cycle                                           |
|                        |                                                                                |
|                        +------------------------------+-------------------------------+                 |
|                        |                              |                               |                 |
|                        v                              v                               v                 |
|               [ Virtual Keyboard ]           [ Quick Panels ]              [ Emergency Mode ]           |
|               - QWERTY, Simplified,          - Daily Needs, Medical,       - High-contrast red          |
|                 Large-Key, High-Contrast       Social, Favourites            - Spoken aloud locally     |
|               - EN, HI, ES, ZH scripts       - 1-dwell instant speech      - Dual confirmation for      |
|                        |                                                       external alerts          |
|                        v                                                                                |
|               [ Message Composer Bar ]                                                                  |
|                        |                                                                                |
|                        +------------------------------+                                                 |
|                        |                              |                                                 |
|                        v                              v                                                 |
|         [ Local Word Predictor ]             [ FastAPI AI Sentence Assistance ]                         |
|         - 100% offline bigram/trigram        - POST /api/ai/predict-sentences                           |
|         - High-frequency vocabulary          - Google Gemini 2.5 Flash                                  |
|         - Adaptive user lexicon              - Contextual conversational suggestions                    |
|                        \                              /                                                 |
|                         \                            /                                                  |
|                          v                          v                                                   |
|                      [ Browser SpeechSynthesis Engine (ttsEngine.ts) ]                                  |
|                      - Multi-lingual native speech voices (en, hi, es, zh)                              |
|                      - Play, pause, resume, repeat last, speech rate tuning                             |
+---------------------------------------------------------------------------------------------------------+
                                                |
                                                | Authenticated requests (JWT)
                                                v
+---------------------------------------------------------------------------------------------------------+
|                                    BACKEND & CLOUD INFRASTRUCTURE                                       |
|                                                                                                         |
|  [ FastAPI Backend (Python 3.11+) ]                                                                     |
|    - CORS & Rate Limiting                                                                               |
|    - Gemini Generative AI Service (gemini_service.py) -> google-genai gemini-2.5-flash                 |
|    - Auth Guard (auth_guard.py) -> Validates Supabase JWT & caregiver active permissions                |
|                                                                                                         |
|  [ Supabase Cloud (PostgreSQL 15+) ]                                                                    |
|    - Supabase Auth (Patient & Caregiver authentication)                                                 |
|    - PostgreSQL tables with Row-Level Security (RLS):                                                    |
|        * profiles                                                                                       |
|        * patient_preferences                                                                            |
|        * saved_phrases                                                                                  |
|        * communication_history (consent-gated)                                                         |
|        * caregiver_connections                                                                          |
|        * emergency_contacts                                                                             |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Mathematical Gaze Pipeline

### A. Feature Extraction
1. **Eye Aspect Ratio (EAR)**:
   $$\text{EAR} = \frac{\|p_{159} - p_{145}\| + \|p_{158} - p_{144}\|}{2 \cdot \|p_{33} - p_{133}\|}$$
   When $\text{EAR} < 0.18$, the eye is classified as closed or blinking. The sample is discarded with status `'blink_ignored'` to prevent calibration skew.
2. **Normalized Iris Coordinate**:
   $$r_x = \frac{\text{iris}_x - \text{corner}_{\text{medial}, x}}{\text{corner}_{\text{lateral}, x} - \text{corner}_{\text{medial}, x}}, \quad r_y = \frac{\text{iris}_y - \text{lid}_{\text{top}, y}}{\text{lid}_{\text{bottom}, y} - \text{lid}_{\text{top}, y}}$$

### B. Polynomial Ridge Regression
Given feature vector $\mathbf{x} = [1, r_{xL}, r_{yL}, r_{xR}, r_{yR}, h_x, h_y, r_{xL}^2, r_{xL}r_{yL}, \dots] \in \mathbb{R}^{28}$:
$$\mathbf{W} = (\mathbf{X}^T \mathbf{X} + \lambda \mathbf{I})^{-1} \mathbf{X}^T \mathbf{Y}$$
where $\lambda = 0.01$ ensures numerical stability against collinearity.

### C. 1-Euro Filter
Calculates speed-dependent cutoff frequency:
$$f_c = f_{c,\min} + \beta \cdot |\dot{x}|$$
$$\alpha = \frac{1}{1 + \frac{\tau}{\Delta t}}, \quad \tau = \frac{1}{2\pi f_c}$$
$$\hat{x}_t = \alpha x_t + (1 - \alpha) \hat{x}_{t-1}$$
Suppresses micro-jitter when gazing statically, yet reacts instantaneously when saccading between keys.

---

## 3. Data Privacy & Offline Resilience
- **Zero Video Uploads**: Video frames never leave GPU/RAM.
- **Offline First**: PWA Service Worker caches the Next.js shell, MediaPipe WASM bundles, and local vocabulary. If the device loses internet connection, typing, local prediction, phrase access, and speech synthesis continue uninterrupted.

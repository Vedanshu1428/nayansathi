/**
 * GazeConnect Feature Extractor
 * Loads MediaPipe FaceLandmarker via WASM, processes video frames locally,
 * and extracts normalized iris ratios, 3D eye blendshapes, EAR (blink detection), and head pose proxies.
 *
 * 100% Client-Side In-Browser. No video frames leave memory.
 */

import {
  EyeFeatures,
  TrackingStatus,
  HeadPoseProxy,
  NormalizedLandmark,
} from "./types";

// Type definitions matching @mediapipe/tasks-vision
type FaceLandmarkerType = import("@mediapipe/tasks-vision").FaceLandmarker;

let landmarkerInstance: FaceLandmarkerType | null = null;
let isLoadingLandmarker = false;
let landmarkerLoadPromise: Promise<FaceLandmarkerType> | null = null;

/** Module-level tracker: timestamp (ms) when eyes first entered the closed state. */
let eyeClosedStartTime: number | null = null;

/** Module-level setting: horizontal mirror toggle (default true for front webcams). */
let mirrorXSetting: boolean = true;

export function setMirrorX(enabled: boolean): void {
  mirrorXSetting = enabled;
}

export function getMirrorX(): boolean {
  return mirrorXSetting;
}

/**
 * Dynamic Open-Eye EAR Baseline Tracker:
 * Gathers open-eye samples during the first 1000ms of open-eye tracking
 * to adapt baseline EAR accurately for any eye shape, ethnicity, or glasses.
 */
let openEyeEARBaseline = 0.28;
let earCalibrationStartTime: number | null = null;
let openEyeEARSamples: number[] = [];
let isBaselineLocked = false;

let lastValidFeatures: EyeFeatures | null = null;

// ── Triple-Blink Emergency SOS Tracker ──
// 3 deliberate blinks within 1.8s (each 120ms–450ms, gap < 450ms)
interface CompletedBlink {
  start: number;
  end: number;
  duration: number;
}
let recentBlinks: CompletedBlink[] = [];
let prevEyesClosed = false;
let blinkEntryTime: number | null = null;

// ── Rolling Ocular Fatigue Monitor (30s window) ──
let rollingBlinkTimestamps: number[] = [];
let droopStartTime: number | null = null;
let currentFatigueLevel: "fresh" | "mild" | "high" = "fresh";

// 5-frame median rolling history for fused gaze coordinates
let historyFusedGazeX: number[] = [];
let historyFusedGazeY: number[] = [];

// 5-frame rolling history for iris displacement
let historyLX: number[] = [];
let historyLY: number[] = [];
let historyRX: number[] = [];
let historyRY: number[] = [];

function rollingMedian5(history: number[], newVal: number): number {
  history.push(newVal);
  if (history.length > 5) history.shift();
  const sorted = [...history].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const WASM_CDN_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/**
 * Initializes and returns the shared singleton FaceLandmarker instance.
 * Enables outputFaceBlendshapes: true for head-pose-invariant 3D eye gaze tracking.
 */
export async function getFaceLandmarker(): Promise<FaceLandmarkerType> {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }

  if (landmarkerLoadPromise) {
    return landmarkerLoadPromise;
  }

  isLoadingLandmarker = true;
  landmarkerLoadPromise = (async () => {
    try {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN_URL);

      let landmarker: FaceLandmarkerType;
      try {
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });
      } catch (gpuError) {
        console.warn("MediaPipe GPU delegate unavailable, falling back to CPU:", gpuError);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });
      }

      landmarkerInstance = landmarker;
      isLoadingLandmarker = false;
      return landmarker;
    } catch (err) {
      landmarkerLoadPromise = null;
      isLoadingLandmarker = false;
      throw err;
    }
  })();

  return landmarkerLoadPromise;
}

/**
 * Euclidean distance helper between two normalized landmarks.
 */
function distance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

/**
 * Clamps a number between min and max.
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Computes Eye Aspect Ratio (EAR) for blink detection.
 * Left eye landmarks: 33 (outer), 133 (inner), 159 (upper), 145 (lower)
 * Right eye landmarks: 263 (outer), 362 (inner), 386 (upper), 374 (lower)
 */
export function computeEAR(
  outer: NormalizedLandmark,
  inner: NormalizedLandmark,
  upper: NormalizedLandmark,
  lower: NormalizedLandmark
): number {
  const horizontal = distance(outer, inner);
  if (horizontal < 1e-6) return 0;
  const vertical = distance(upper, lower);
  return vertical / horizontal;
}

export interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

/**
 * Extracts 3D head-pose-invariant gaze signals from MediaPipe eye blendshapes:
 * - eyeLookInLeft, eyeLookOutLeft, eyeLookUpLeft, eyeLookDownLeft
 * - eyeLookInRight, eyeLookOutRight, eyeLookUpRight, eyeLookDownRight
 */
export function extractBlendshapeGaze(
  blendshapes: BlendshapeCategory[] | undefined,
  mirrorX: boolean
): { rawX: number; rawY: number; normX: number; normY: number } {
  if (!blendshapes || blendshapes.length === 0) {
    return { rawX: 0, rawY: 0, normX: 0.5, normY: 0.5 };
  }

  const scores: Record<string, number> = {};
  for (let i = 0; i < blendshapes.length; i++) {
    scores[blendshapes[i].categoryName] = blendshapes[i].score;
  }

  const inL = scores["eyeLookInLeft"] ?? 0;
  const outL = scores["eyeLookOutLeft"] ?? 0;
  const upL = scores["eyeLookUpLeft"] ?? 0;
  const downL = scores["eyeLookDownLeft"] ?? 0;

  const inR = scores["eyeLookInRight"] ?? 0;
  const outR = scores["eyeLookOutRight"] ?? 0;
  const upR = scores["eyeLookUpRight"] ?? 0;
  const downR = scores["eyeLookDownRight"] ?? 0;

  // Horizontal gaze from 3D blendshapes:
  // When looking to the user's left: left eye turns OUT, right eye turns IN -> (outL - inL) > 0, (inR - outR) > 0.
  // When looking to user's right: right eye turns OUT, left eye turns IN -> (outR - inR) > 0, (inL - outL) > 0.
  // Standard formula:
  // Looking Right: gazeX_delta > 0
  // Looking Left: gazeX_delta < 0
  const rightShift = (outR - inR);
  const leftShift = (inL - outL);
  const baseGazeX = (rightShift + leftShift) / 2; // Positive when looking right, negative when looking left

  // Respect mirrorX toggle (standard front webcam: left/right matches screen mirroring)
  const effGazeX = mirrorX ? baseGazeX : -baseGazeX;

  // Vertical gaze: positive when looking down, negative when looking up
  const baseGazeY = ((downL + downR) - (upL + upR)) / 2;

  // Normalize from roughly [-0.6, +0.6] blendshape domain to [0.0, 1.0]
  const normX = clamp(0.5 + effGazeX * 1.5, 0.0, 1.0);
  const normY = clamp(0.5 + baseGazeY * 1.6, 0.0, 1.0);

  return {
    rawX: effGazeX,
    rawY: baseGazeY,
    normX,
    normY,
  };
}

/**
 * Extracts normalized, jitter-resistant eye features fusing 3D eye blendshapes (70%)
 * with normalized iris ratios (30%) and a 5-frame median filter.
 */
export function extractEyeFeatures(
  landmarks: NormalizedLandmark[] | null | undefined,
  timestamp: number,
  blendshapeCategories?: BlendshapeCategory[],
  mirrorXOverride?: boolean
): EyeFeatures {
  const mirrorX = mirrorXOverride ?? mirrorXSetting;

  if (!landmarks || landmarks.length < 478) {
    eyeClosedStartTime = null;
    lastValidFeatures = null;
    historyFusedGazeX = [];
    historyFusedGazeY = [];
    historyLX = [];
    historyLY = [];
    historyRX = [];
    historyRY = [];

    const emptyHead: HeadPoseProxy = {
      noseTipX: 0.5,
      noseTipY: 0.5,
      interOcularDistance: 0.2,
      pitchProxy: 0,
      yawProxy: 0,
    };
    return {
      timestamp,
      status: "no_face",
      leftIrisRatioX: 0.5,
      leftIrisRatioY: 0.5,
      rightIrisRatioX: 0.5,
      rightIrisRatioY: 0.5,
      gazeX: 0.5,
      gazeY: 0.5,
      blendshapesGazeX: 0.5,
      blendshapesGazeY: 0.5,
      leftEAR: 0,
      rightEAR: 0,
      averageEAR: 0,
      openEyeEARBaseline,
      isBlinking: false,
      isEyesClosed: false,
      closedDurationMs: 0,
      headPose: emptyHead,
      featureVector: [1, 0.5, 0.5, 0.5, 0.5],
    };
  }

  // Canonical landmarks
  // Left eye in camera image (subject's right eye):
  const p33 = landmarks[33];   // outer canthus
  const p133 = landmarks[133]; // inner canthus
  const p159 = landmarks[159]; // upper lid
  const p145 = landmarks[145]; // lower lid
  const p468 = landmarks[468]; // iris center

  // Right eye in camera image (subject's left eye):
  const p263 = landmarks[263]; // outer canthus
  const p362 = landmarks[362]; // inner canthus
  const p386 = landmarks[386]; // upper lid
  const p374 = landmarks[374]; // lower lid
  const p473 = landmarks[473]; // iris center

  const p1 = landmarks[1];     // nose tip

  // Eye Aspect Ratios (blink detection)
  const leftEAR = computeEAR(p33, p133, p159, p145);
  const rightEAR = computeEAR(p263, p362, p386, p374);
  const averageEAR = (leftEAR + rightEAR) / 2;

  // ── Dynamic Open-Eye EAR Baseline Calibration (First 1000ms) ──
  if (averageEAR > 0.16) {
    if (earCalibrationStartTime === null) {
      earCalibrationStartTime = timestamp;
    }
    const elapsedCalibration = timestamp - earCalibrationStartTime;
    if (elapsedCalibration <= 1000) {
      openEyeEARSamples.push(averageEAR);
      if (openEyeEARSamples.length > 5) {
        const sorted = [...openEyeEARSamples].sort((a, b) => a - b);
        openEyeEARBaseline = sorted[Math.floor(sorted.length * 0.75)]; // 75th percentile of open eyes
      }
    } else {
      isBaselineLocked = true;
      // Gentle continuous adaptation during open eye states
      openEyeEARBaseline = openEyeEARBaseline * 0.98 + averageEAR * 0.02;
    }
  }

  // Blink and intentional eye closure thresholds relative to individualized baseline
  const isEarlyBlinkOnset = averageEAR < openEyeEARBaseline * 0.80;
  const isBlinking = isEarlyBlinkOnset || averageEAR < 0.16;
  const isEyesClosed = averageEAR < openEyeEARBaseline * 0.72 || averageEAR < 0.14;

  // Track continuous closure duration
  let closedDurationMs: number;
  if (isEyesClosed) {
    if (eyeClosedStartTime === null) {
      eyeClosedStartTime = timestamp;
    }
    closedDurationMs = timestamp - eyeClosedStartTime;
  } else {
    eyeClosedStartTime = null;
    closedDurationMs = 0;
  }

  // ── Early Blink Freeze Guard ──
  // The instant avgEAR drops within 20% of open-eye baseline, freeze gaze coordinates
  // at the last valid open-eye fixation point so pre-blink downward lid motion never dives cursor!
  if (isEarlyBlinkOnset && lastValidFeatures !== null) {
    return {
      timestamp,
      status: "blink_ignored",
      leftIrisRatioX: lastValidFeatures.leftIrisRatioX,
      leftIrisRatioY: lastValidFeatures.leftIrisRatioY,
      rightIrisRatioX: lastValidFeatures.rightIrisRatioX,
      rightIrisRatioY: lastValidFeatures.rightIrisRatioY,
      gazeX: lastValidFeatures.gazeX,
      gazeY: lastValidFeatures.gazeY,
      blendshapesGazeX: lastValidFeatures.blendshapesGazeX,
      blendshapesGazeY: lastValidFeatures.blendshapesGazeY,
      leftEAR,
      rightEAR,
      averageEAR,
      openEyeEARBaseline,
      isBlinking: true,
      isEyesClosed,
      closedDurationMs,
      headPose: lastValidFeatures.headPose,
      featureVector: lastValidFeatures.featureVector,
    };
  }

  // ── 1. Stable Eye Socket Centers and Widths ──
  const leftEyeWidth = Math.max(1e-4, distance(p33, p133));
  const leftEyeCenterX = (p33.x + p133.x) / 2;
  const leftCornerBaseY = (p33.y + p133.y) / 2;

  const rightEyeWidth = Math.max(1e-4, distance(p362, p263));
  const rightEyeCenterX = (p362.x + p263.x) / 2;
  const rightCornerBaseY = (p362.y + p263.y) / 2;

  // ── 2. Relative Iris Displacements in Socket ──
  const rawLeftGazeX = (p468.x - leftEyeCenterX) / leftEyeWidth;
  const rawRightGazeX = (p473.x - rightEyeCenterX) / rightEyeWidth;
  const rawLeftGazeY = (p468.y - leftCornerBaseY) / leftEyeWidth;
  const rawRightGazeY = (p473.y - rightCornerBaseY) / rightEyeWidth;

  const medLeftX = rollingMedian5(historyLX, rawLeftGazeX);
  const medLeftY = rollingMedian5(historyLY, rawLeftGazeY);
  const medRightX = rollingMedian5(historyRX, rawRightGazeX);
  const medRightY = rollingMedian5(historyRY, rawRightGazeY);

  const effLeftX = mirrorX ? -medLeftX : medLeftX;
  const effRightX = mirrorX ? -medRightX : medRightX;

  const leftIrisRatioX = clamp(0.5 + effLeftX * 2.5, 0.0, 1.0);
  const rightIrisRatioX = clamp(0.5 + effRightX * 2.5, 0.0, 1.0);
  const leftIrisRatioY = clamp(0.5 + medLeftY * 3.0, 0.0, 1.0);
  const rightIrisRatioY = clamp(0.5 + medRightY * 3.0, 0.0, 1.0);

  const avgIrisX = (leftIrisRatioX + rightIrisRatioX) / 2;
  const avgIrisY = (leftIrisRatioY + rightIrisRatioY) / 2;

  // ── 3. MediaPipe 3D Eye Blendshapes Extraction ──
  const bsGaze = extractBlendshapeGaze(blendshapeCategories, mirrorX);

  // ── 4. Signal Fusion: 70% 3D Blendshapes + 30% Iris Ratios ──
  // If blendshapes are available and confident, use 70/30 weighting; otherwise fallback gracefully to iris
  const hasBlendshapes = blendshapeCategories && blendshapeCategories.length > 0;
  const fusedRawX = hasBlendshapes
    ? 0.70 * bsGaze.normX + 0.30 * avgIrisX
    : avgIrisX;
  const fusedRawY = hasBlendshapes
    ? 0.70 * bsGaze.normY + 0.30 * avgIrisY
    : avgIrisY;

  // Apply 5-frame rolling median to fused gaze signals to eliminate residual micro-tremors
  const gazeX = rollingMedian5(historyFusedGazeX, fusedRawX);
  const gazeY = rollingMedian5(historyFusedGazeY, fusedRawY);

  // ── 5. Head Pose Estimation ──
  const interOcularDist = Math.max(1e-4, distance(p33, p263));
  const eyeMidpointX = (leftEyeCenterX + rightEyeCenterX) / 2;
  const eyeMidpointY = (leftCornerBaseY + rightCornerBaseY) / 2;

  const yawProxy = (p1.x - eyeMidpointX) / interOcularDist;
  const pitchProxy = (p1.y - eyeMidpointY) / interOcularDist;

  const headPose: HeadPoseProxy = {
    noseTipX: p1.x,
    noseTipY: p1.y,
    interOcularDistance: interOcularDist,
    pitchProxy,
    yawProxy,
  };

  // ── 6. Robust Feature Vector [1, gazeX, gazeY, headCenterX, headCenterY] ──
  const featureVector = [
    1.0,
    gazeX,
    gazeY,
    headPose.noseTipX,
    headPose.noseTipY,
  ];

  const status: TrackingStatus = isBlinking ? "blink_ignored" : "ready";

  // ── 7. Triple-Blink SOS & Fatigue Guardian Detection ──
  let isTripleBlinkSOS = false;

  // Detect blink transitions: Eyes closed -> open
  if (isEyesClosed && !prevEyesClosed) {
    blinkEntryTime = timestamp;
  } else if (!isEyesClosed && prevEyesClosed && blinkEntryTime !== null) {
    const blinkDuration = timestamp - blinkEntryTime;
    // Intentional deliberate blink range: 120ms to 450ms
    if (blinkDuration >= 120 && blinkDuration <= 450) {
      recentBlinks.push({ start: blinkEntryTime, end: timestamp, duration: blinkDuration });
      rollingBlinkTimestamps.push(timestamp);

      // Keep only blinks within last 1800ms
      recentBlinks = recentBlinks.filter((b) => timestamp - b.start <= 1800);

      // Verify triple-blink pattern: exactly 3 blinks with inter-blink gap < 450ms
      if (recentBlinks.length >= 3) {
        const b1 = recentBlinks[recentBlinks.length - 3];
        const b2 = recentBlinks[recentBlinks.length - 2];
        const b3 = recentBlinks[recentBlinks.length - 1];
        const gap1 = b2.start - b1.end;
        const gap2 = b3.start - b2.end;
        if (gap1 < 450 && gap2 < 450) {
          isTripleBlinkSOS = true;
          recentBlinks = []; // Reset after firing
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("gazeconnect_sos_triple_blink"));
          }
        }
      }
    }
    blinkEntryTime = null;
  }
  prevEyesClosed = isEyesClosed;

  // Prune rolling blink timestamps (> 30s)
  rollingBlinkTimestamps = rollingBlinkTimestamps.filter((t) => timestamp - t <= 30000);
  const blinksPerMinute = rollingBlinkTimestamps.length * 2; // Extrapolate 30s to 60s

  // Eyelid droop detection (avgEAR hovering between 0.72x and 0.85x of baseline)
  const isDrooping =
    averageEAR >= openEyeEARBaseline * 0.72 &&
    averageEAR <= openEyeEARBaseline * 0.85;

  if (isDrooping) {
    if (droopStartTime === null) droopStartTime = timestamp;
    const droopDuration = timestamp - droopStartTime;
    if (droopDuration > 3000 || blinksPerMinute > 32) {
      currentFatigueLevel = "high";
    } else if (droopDuration > 1500 || blinksPerMinute > 24) {
      currentFatigueLevel = "mild";
    }
  } else {
    droopStartTime = null;
    if (blinksPerMinute < 18) {
      currentFatigueLevel = "fresh";
    } else if (blinksPerMinute < 26) {
      currentFatigueLevel = "mild";
    }
  }

  const features: EyeFeatures = {
    timestamp,
    status,
    leftIrisRatioX,
    leftIrisRatioY,
    rightIrisRatioX,
    rightIrisRatioY,
    gazeX,
    gazeY,
    blendshapesGazeX: bsGaze.normX,
    blendshapesGazeY: bsGaze.normY,
    leftEAR,
    rightEAR,
    averageEAR,
    openEyeEARBaseline,
    isBlinking,
    isEyesClosed,
    closedDurationMs,
    fatigueLevel: currentFatigueLevel,
    blinksPerMinute,
    isTripleBlinkSOS,
    headPose,
    featureVector,
  };

  if (!isBlinking) {
    lastValidFeatures = features;
  }

  return features;
}
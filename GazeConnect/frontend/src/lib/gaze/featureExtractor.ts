/**
 * GazeConnect Feature Extractor
 * Loads MediaPipe FaceLandmarker via WASM, processes video frames locally,
 * and extracts normalized iris ratios, EAR (blink detection), and head pose proxies.
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

/** Open-eye EAR baseline tracker and freeze cache for early blink onset */
let openEyeBaselineEAR = 0.28;
let lastValidFeatures: EyeFeatures | null = null;

// 3-frame rolling history for single-frame spike elimination
let historyLX: number[] = [];
let historyLY: number[] = [];
let historyRX: number[] = [];
let historyRY: number[] = [];

function rollingMedian(history: number[], newVal: number): number {
  history.push(newVal);
  if (history.length > 3) history.shift();
  if (history.length === 1) return history[0];
  if (history.length === 2) return (history[0] + history[1]) / 2;
  const a = history[0], b = history[1], c = history[2];
  return a <= b
    ? b <= c ? b : a <= c ? c : a
    : a <= c ? a : b <= c ? c : b;
}

const WASM_CDN_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_ASSET_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/**
 * Initializes and returns the shared singleton FaceLandmarker instance.
 * Gracefully tries GPU delegate first, then falls back to CPU if WebGL fails.
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
          outputFaceBlendshapes: false,
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
          outputFaceBlendshapes: false,
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

/**
 * Extracts normalized, jitter-resistant eye features from raw facial landmarks.
 * - Horizontal iris ratio: when looking physically LEFT, avgIrisX decreases toward 0.0;
 *   when looking physically RIGHT, avgIrisX increases toward 1.0 (with mirrorX: true).
 * - Vertical iris position: calculated strictly relative to rigid eye corner baseline
 *   ((innerCorner.y + outerCorner.y) / 2) to eliminate eyelid droop / flutter drift.
 * - Early blink freeze: freezes coordinates if avgEAR drops within 20% of open-eye baseline.
 * - Feature vector: pure linear 5-feature vector [1, avgIrisX, avgIrisY, headCenterX, headCenterY].
 */
export function extractEyeFeatures(
  landmarks: NormalizedLandmark[] | null | undefined,
  timestamp: number,
  mirrorXOverride?: boolean
): EyeFeatures {
  const mirrorX = mirrorXOverride ?? mirrorXSetting;

  if (!landmarks || landmarks.length < 478) {
    // No face detected — reset closed-eye tracking, freeze buffer, and rolling history
    eyeClosedStartTime = null;
    lastValidFeatures = null;
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
      leftEAR: 0,
      rightEAR: 0,
      averageEAR: 0,
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

  // Track / adapt open-eye baseline during clear open-eye intervals
  if (averageEAR > 0.20) {
    openEyeBaselineEAR = openEyeBaselineEAR * 0.95 + averageEAR * 0.05;
  }

  // Early blink onset: EAR dropped by >= 20% from open-eye baseline
  const isEarlyBlinkOnset = averageEAR < openEyeBaselineEAR * 0.80;
  const isBlinking = isEarlyBlinkOnset || averageEAR < 0.16;
  const isEyesClosed = averageEAR < 0.14;

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
      leftEAR,
      rightEAR,
      averageEAR,
      isBlinking: true,
      isEyesClosed,
      closedDurationMs,
      headPose: lastValidFeatures.headPose,
      featureVector: lastValidFeatures.featureVector,
    };
  }

  // ── 1. Stable Eye Socket Centers and Widths (attached to skull bone) ──
  const leftEyeWidth = Math.max(1e-4, distance(p33, p133));
  const leftEyeCenterX = (p33.x + p133.x) / 2;
  // Eye Corner Baseline: strictly derived from rigid inner/outer canthi, NOT moving eyelid!
  const leftCornerBaseY = (p33.y + p133.y) / 2;

  const rightEyeWidth = Math.max(1e-4, distance(p362, p263));
  const rightEyeCenterX = (p362.x + p263.x) / 2;
  const rightCornerBaseY = (p362.y + p263.y) / 2;

  // ── 2. Relative Iris Displacements in Socket ──
  // X: relative to eye center
  const rawLeftGazeX = (p468.x - leftEyeCenterX) / leftEyeWidth;
  const rawRightGazeX = (p473.x - rightEyeCenterX) / rightEyeWidth;

  // Y: strictly relative to rigid eye corner baseline (inner + outer) / 2
  const rawLeftGazeY = (p468.y - leftCornerBaseY) / leftEyeWidth;
  const rawRightGazeY = (p473.y - rightCornerBaseY) / rightEyeWidth;

  // 3-frame rolling median filter kills single-frame micro-spikes
  const medLeftX = rollingMedian(historyLX, rawLeftGazeX);
  const medLeftY = rollingMedian(historyLY, rawLeftGazeY);
  const medRightX = rollingMedian(historyRX, rawRightGazeX);
  const medRightY = rollingMedian(historyRY, rawRightGazeY);

  // ── 3. Horizontal Direction & Mirroring ──
  // When looking physically LEFT, irises shift camera-right (positive raw displacement).
  // With mirrorX=true (standard front webcam), effX becomes negative -> avgIrisX decreases toward 0.0.
  // When looking physically RIGHT, irises shift camera-left -> effX positive -> avgIrisX increases toward 1.0.
  const effLeftX = mirrorX ? -medLeftX : medLeftX;
  const effRightX = mirrorX ? -medRightX : medRightX;
  const effLeftY = medLeftY;
  const effRightY = medRightY;

  // ── 4. Normalized 0.0 to 1.0 Iris Ratios ──
  const leftIrisRatioX = clamp(0.5 + effLeftX * 2.5, 0.0, 1.0);
  const rightIrisRatioX = clamp(0.5 + effRightX * 2.5, 0.0, 1.0);
  const leftIrisRatioY = clamp(0.5 + effLeftY * 3.0, 0.0, 1.0);
  const rightIrisRatioY = clamp(0.5 + effRightY * 3.0, 0.0, 1.0);

  const avgIrisX = (leftIrisRatioX + rightIrisRatioX) / 2;
  const avgIrisY = (leftIrisRatioY + rightIrisRatioY) / 2;

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

  // ── 6. Pure Linear Feature Vector [1, avgIrisX, avgIrisY, headCenterX, headCenterY] ──
  // Pure linear representation prevents non-linear polynomial edge blow-ups!
  const featureVector = [
    1.0,
    avgIrisX,
    avgIrisY,
    headPose.noseTipX,
    headPose.noseTipY,
  ];

  const status: TrackingStatus = isBlinking ? "blink_ignored" : "ready";

  const features: EyeFeatures = {
    timestamp,
    status,
    leftIrisRatioX,
    leftIrisRatioY,
    rightIrisRatioX,
    rightIrisRatioY,
    leftEAR,
    rightEAR,
    averageEAR,
    isBlinking,
    isEyesClosed,
    closedDurationMs,
    headPose,
    featureVector,
  };

  if (!isBlinking) {
    lastValidFeatures = features;
  }

  return features;
}

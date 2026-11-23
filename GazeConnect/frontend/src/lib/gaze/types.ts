/**
 * GazeConnect Core Gaze & Vision TypeScript Interfaces
 * Strict: true, zero any types permitted.
 */

export type TrackingStatus = "ready" | "no_face" | "blink_ignored" | "off" | "error";

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface EyeLandmarks {
  // Left eye corners & lids
  leftOuterCorner: NormalizedLandmark; // 33
  leftInnerCorner: NormalizedLandmark; // 133
  leftUpperLid: NormalizedLandmark;    // 159
  leftLowerLid: NormalizedLandmark;    // 145

  // Right eye corners & lids
  rightOuterCorner: NormalizedLandmark;// 263
  rightInnerCorner: NormalizedLandmark;// 362
  rightUpperLid: NormalizedLandmark;   // 386
  rightLowerLid: NormalizedLandmark;   // 374

  // Iris centers
  leftIrisCenter: NormalizedLandmark;  // 468
  rightIrisCenter: NormalizedLandmark; // 473
}

export interface HeadPoseProxy {
  noseTipX: number;          // Landmark 1 x
  noseTipY: number;          // Landmark 1 y
  interOcularDistance: number;// Distance between outer corners
  pitchProxy: number;        // Vertical nose displacement relative to eye center
  yawProxy: number;          // Horizontal nose displacement relative to eye center
}

export interface EyeFeatures {
  timestamp: number;
  status: TrackingStatus;
  leftIrisRatioX: number;    // 0.0 to 1.0 (lateral to medial)
  leftIrisRatioY: number;    // 0.0 to 1.0 (superior to inferior)
  rightIrisRatioX: number;   // 0.0 to 1.0
  rightIrisRatioY: number;   // 0.0 to 1.0
  /** 3D head-pose-invariant gaze signals derived from MediaPipe blendshapes */
  gazeX?: number;            // 0.0 to 1.0
  gazeY?: number;            // 0.0 to 1.0
  blendshapesGazeX?: number; // Raw normalized blendshape gaze X
  blendshapesGazeY?: number; // Raw normalized blendshape gaze Y
  leftEAR: number;           // Eye Aspect Ratio
  rightEAR: number;
  averageEAR: number;
  openEyeEARBaseline?: number;
  isBlinking: boolean;
  /** True when avgEAR < openEyeBaseline * 0.72 — intentional closure tracking */
  isEyesClosed: boolean;
  /** How long eyes have been continuously closed (ms); 0 if open */
  closedDurationMs: number;
  headPose: HeadPoseProxy;
  featureVector: number[];   // [1, gazeX, gazeY, headPose.noseTipX, headPose.noseTipY]
}

export interface CalibrationTarget {
  id: number;
  xPercent: number;          // 0 to 100
  yPercent: number;          // 0 to 100
  screenX: number;           // absolute viewport px
  screenY: number;
}

export interface CalibrationSample {
  targetId: number;
  target: CalibrationTarget;
  features: number[];
  timestamp: number;
}

export interface GridAnchor {
  targetId: number;
  row: number; // 0, 1, 2
  col: number; // 0, 1, 2
  targetScreenX: number;
  targetScreenY: number;
  medianGazeX: number;
  medianGazeY: number;
}

export interface CalibrationModelData {
  weightsX: number[];
  weightsY: number[];
  trainedAt: string;
  featureDim: number;
  anchors?: GridAnchor[]; // 9 anchors for Piecewise 3x3 Bilinear + Ridge Hybrid
  report: CalibrationReport;
}

export interface CalibrationReport {
  completed: boolean;
  sampleCount: number;
  rejectedSamples: number;
  meanValidationErrorPx: number;
  stabilityScore: number;     // 0 to 100
  faceVisibilityRate: number; // 0 to 100
  recommendation: "Good" | "Recalibrate Recommended";
}

export interface GazePoint {
  x: number;                 // Viewport X pixels
  y: number;                 // Viewport Y pixels
  rawX: number;              // Unfiltered X
  rawY: number;              // Unfiltered Y
  timestamp: number;
  confidence: number;        // 0.0 to 1.0
  status: TrackingStatus;
  isCalibrated?: boolean;
}

export type SelectionMode = "hold_blink" | "slow_dwell" | "hybrid";

export interface GazeSettings {
  mirrorX: boolean;          // Default true for front-facing webcams
  selectionMode: SelectionMode;
  dwellTimeMs: number;
  blinkHoldMs: number;
  blinkCooldownMs: number;
}

export interface DwellSettings {
  dwellTimeMs: number;       // Time in ms to trigger dwell (e.g. 1200)
  exitGraceMs: number;       // Buffer to absorb jitter before dwell resets (e.g. 150)
  cooldownMs: number;        // Wait time after trigger before re-triggering (e.g. 600)
  hitPaddingPx: number;      // Accessibility hit margin (e.g. 24)
  /** Which trigger mode is active */
  selectionMode: SelectionMode;
  /** Ms of eye closure required to fire blink_click (default 450) */
  blinkHoldMs: number;
  /** Cooldown after blink_click (default 900) */
  blinkCooldownMs: number;
  /** Front-facing webcam mirror toggle */
  mirrorX?: boolean;
  /** Cell-snap capture radius in pixels (default 90) */
  snapRadiusPx?: number;
  /** Whether magnetic cell snapping to [data-dwell="true"] centers is enabled */
  enableCellSnap?: boolean;
}

export interface DwellState {
  targetElement: HTMLElement | null;
  dwellProgress: number;     // 0.0 to 1.0
  isCoolingDown: boolean;
  lastSelectedElement: HTMLElement | null;
  /** 0.0 to 1.0 — how far into the hold-blink the user is */
  blinkProgress: number;
  /** True while eyes are closed and blink-hold is building */
  isBlinkHolding: boolean;
  /** Snapped screen coordinates when locked to target center */
  snappedX?: number;
  snappedY?: number;
  isSnapped?: boolean;
}

export interface CursorSpeedPreset {
  label: string;        // "Very Slow / Precision" | "Slow / Balanced" | "Normal"
  minCutoff: number;
  beta: number;
  dCutoff: number;
  maxSpeedPxPerSec: number;
  deadzoneRadius: number;
}

export const CURSOR_SPEED_PRESETS: CursorSpeedPreset[] = [
  {
    label: "Very Slow / Precision",
    minCutoff: 0.50,
    beta: 0.04,
    dCutoff: 1.0,
    maxSpeedPxPerSec: 600,
    deadzoneRadius: 5,
  },
  {
    label: "Slow / Balanced",
    minCutoff: 1.0,
    beta: 0.08,
    dCutoff: 1.0,
    maxSpeedPxPerSec: 900,
    deadzoneRadius: 5,
  },
  {
    label: "Normal",
    minCutoff: 1.5,
    beta: 0.12,
    dCutoff: 1.0,
    maxSpeedPxPerSec: 1400,
    deadzoneRadius: 5,
  },
];

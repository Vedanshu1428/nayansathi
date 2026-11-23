/**
 * GazeConnect Polynomial Ridge Regression Calibration Engine
 * 2nd-degree polynomial expansion with L2 regularized Ridge Regression solver.
 * Robust zero-centered feature conditioning prevents matrix singularity and overfitting.
 */

import {
  CalibrationSample,
  CalibrationModelData,
  CalibrationReport,
  EyeFeatures,
  GazePoint,
} from "./types";
import { expandPolynomialFeatures } from "./featureExtractor";

const RIDGE_LAMBDA = 0.05; // Balanced L2 regularization penalty
const STORAGE_KEY = "gazeconnect_calibration_v1";

/**
 * Solves linear system A * x = b using Gaussian elimination with partial pivoting.
 * A is an n x n matrix, b is an n-length vector.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M: number[][] = A.map((row) => [...row]);
  const y: number[] = [...b];

  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxVal) {
        maxVal = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    if (maxRow !== i) {
      const tempRow = M[i];
      M[i] = M[maxRow];
      M[maxRow] = tempRow;

      const tempY = y[i];
      y[i] = y[maxRow];
      y[maxRow] = tempY;
    }

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      M[i][i] = 1e-5;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      y[k] -= factor * y[i];
      for (let j = i; j < n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = sum / (Math.abs(M[i][i]) < 1e-12 ? 1e-5 : M[i][i]);
  }

  return x;
}

/**
 * Fits Ridge Regression weights W for given design matrix X and target vector Y:
 * W = (X^T * X + lambda * I)^(-1) * X^T * Y
 */
function fitRidgeRegression(X: number[][], Y: number[], lambda: number): number[] {
  const numSamples = X.length;
  const numFeatures = X[0].length;

  // Compute X^T * X
  const XtX: number[][] = Array.from({ length: numFeatures }, () =>
    new Array(numFeatures).fill(0)
  );

  for (let i = 0; i < numFeatures; i++) {
    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      for (let s = 0; s < numSamples; s++) {
        sum += X[s][i] * X[s][j];
      }
      XtX[i][j] = sum;
    }
    // Add L2 ridge penalty to diagonal (skip bias term at index 0 for better fit)
    if (i > 0) {
      XtX[i][i] += lambda;
    } else {
      XtX[i][i] += lambda * 0.1;
    }
  }

  // Compute X^T * Y
  const XtY: number[] = new Array(numFeatures).fill(0);
  for (let i = 0; i < numFeatures; i++) {
    let sum = 0;
    for (let s = 0; s < numSamples; s++) {
      sum += X[s][i] * Y[s];
    }
    XtY[i] = sum;
  }

  return solveLinearSystem(XtX, XtY);
}

/**
 * Trains polynomial calibration model from collected 9-point samples.
 * Uses 80% train / 20% validation split.
 */
export function trainCalibrationModel(
  samples: CalibrationSample[],
  rejectedSamplesCount: number,
  screenWidth: number,
  screenHeight: number
): CalibrationModelData {
  if (samples.length < 9) {
    throw new Error("Insufficient calibration samples to train model.");
  }

  // Stratified train / validation split
  const trainSamples: CalibrationSample[] = [];
  const valSamples: CalibrationSample[] = [];

  const targetGroups = new Map<number, CalibrationSample[]>();
  for (const s of samples) {
    if (!targetGroups.has(s.targetId)) {
      targetGroups.set(s.targetId, []);
    }
    targetGroups.get(s.targetId)!.push(s);
  }

  targetGroups.forEach((group) => {
    const splitIndex = Math.floor(group.length * 0.8);
    for (let i = 0; i < group.length; i++) {
      if (i < splitIndex) {
        trainSamples.push(group[i]);
      } else {
        valSamples.push(group[i]);
      }
    }
  });

  // Prepare training matrices (normalized 0 to 1 screen targets)
  const X_train = trainSamples.map((s) => s.features);
  const Y_x_train = trainSamples.map((s) => s.target.screenX / screenWidth);
  const Y_y_train = trainSamples.map((s) => s.target.screenY / screenHeight);

  // Fit Ridge Regression weights
  const weightsX = fitRidgeRegression(X_train, Y_x_train, RIDGE_LAMBDA);
  const weightsY = fitRidgeRegression(X_train, Y_y_train, RIDGE_LAMBDA);

  // Evaluate on validation set
  let totalErrorPx = 0;
  const evalSamples = valSamples.length > 0 ? valSamples : trainSamples;

  for (const s of evalSamples) {
    let normX = 0;
    let normY = 0;
    for (let f = 0; f < s.features.length; f++) {
      normX += s.features[f] * weightsX[f];
      normY += s.features[f] * weightsY[f];
    }
    const predX = normX * screenWidth;
    const predY = normY * screenHeight;

    const dx = predX - s.target.screenX;
    const dy = predY - s.target.screenY;
    totalErrorPx += Math.hypot(dx, dy);
  }

  const meanValidationErrorPx = Math.round(totalErrorPx / evalSamples.length);
  const totalAttempted = samples.length + rejectedSamplesCount;
  const faceVisibilityRate = totalAttempted > 0
    ? Math.round((samples.length / totalAttempted) * 100)
    : 0;

  // Resolution-independent stability score
  const screenDiag = Math.hypot(screenWidth, screenHeight);
  // Calibration stability: 100% at 0 error, ~85% for standard webcam (~60-100px error)
  const stabilityScore = Math.max(
    20,
    Math.min(100, Math.round(100 * Math.exp(-meanValidationErrorPx / (screenDiag * 0.15))))
  );

  const isGood = meanValidationErrorPx < 180 && stabilityScore >= 60 && faceVisibilityRate >= 70;
  const recommendation = isGood ? "Good" : "Recalibrate Recommended";

  const report: CalibrationReport = {
    completed: true,
    sampleCount: samples.length,
    rejectedSamples: rejectedSamplesCount,
    meanValidationErrorPx,
    stabilityScore,
    faceVisibilityRate,
    recommendation,
  };

  const modelData: CalibrationModelData = {
    weightsX,
    weightsY,
    trainedAt: new Date().toISOString(),
    featureDim: weightsX.length,
    report,
  };

  saveCalibrationModel(modelData);
  return modelData;
}

/**
 * Predicts screen coordinates from live eye features.
 * When a custom 9-point calibration model is available, uses the trained polynomial Ridge Regression weights.
 * When uncalibrated, uses an instant geometric eye-tracking model derived from normalized iris displacement
 * and head pose, so gaze tracking is active immediately.
 */
export function predictGaze(
  features: EyeFeatures,
  model: CalibrationModelData | null | undefined,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  // 1. If trained Ridge Regression calibration model is provided, use it
  if (model && model.weightsX && model.weightsX.length > 0) {
    let normX = 0;
    let normY = 0;

    const len = Math.min(features.featureVector.length, model.weightsX.length);
    for (let i = 0; i < len; i++) {
      normX += features.featureVector[i] * model.weightsX[i];
      normY += features.featureVector[i] * model.weightsY[i];
    }

    // Constrain within screen bounds
    const clampedX = Math.max(0, Math.min(screenWidth, normX * screenWidth));
    const clampedY = Math.max(0, Math.min(screenHeight, normY * screenHeight));

    return { x: clampedX, y: clampedY };
  }

  // 2. Default Geometric Gaze Model (active immediately without calibration)
  // Uses zero-centered iris displacement in eye socket (from featureExtractor).
  // leftIrisRatioX/Y are already 0.5-centered: 0.5 = center, >0.5 = right/down in camera frame.
  //
  // Direction conventions (MediaPipe raw, NON-mirrored video):
  //   User looks screen-RIGHT → iris appears at LEFT side of eye socket in raw frame
  //                           → leftIrisRatioX < 0.5  → (0.5 - ratio) > 0 → normX > 0.5 ✓
  //   User looks screen-UP   → iris appears at TOP of eye socket in raw frame
  //                           → leftIrisRatioY < 0.5  → (ratio - 0.5) < 0 → normY < 0.5 ✓
  //
  // Head pose is intentionally EXCLUDED from uncalibrated model:
  //   pitchProxy ≈ 0.43 at typical webcam angle adds +0.21 offset → cursor stuck at 71% vertically.
  //   Head pose is handled by the calibrated Ridge Regression model only.
  const lx = features.leftIrisRatioX - 0.5;   // zero-centered: neg = camera-left = screen-right
  const rx = features.rightIrisRatioX - 0.5;
  const ly = features.leftIrisRatioY - 0.5;    // zero-centered: neg = camera-up = screen-up
  const ry = features.rightIrisRatioY - 0.5;

  const avgIrisX = (lx + rx) / 2;
  const avgIrisY = (ly + ry) / 2;

  // Gain tuning: 2.5× maps ±0.2 iris displacement → ±0.5 of screen (full range)
  const gainX = 2.5;
  const gainY = 3.0; // slightly higher vertical gain since eye vertical range is smaller

  // Iris left in camera (avgIrisX < 0) → screen right (normX > 0.5), so we subtract
  const normX = 0.5 - (avgIrisX * gainX);
  // Iris up in camera (avgIrisY < 0) → screen top (normY < 0.5), so we add
  const normY = 0.5 + (avgIrisY * gainY);

  const clampedX = Math.max(0, Math.min(screenWidth, normX * screenWidth));
  const clampedY = Math.max(0, Math.min(screenHeight, normY * screenHeight));

  return { x: clampedX, y: clampedY };
}

/**
 * Saves trained calibration model to localStorage.
 */
export function saveCalibrationModel(model: CalibrationModelData): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
    } catch (e) {
      console.error("Failed to save calibration model to localStorage:", e);
    }
  }
}

/**
 * Loads saved calibration model from localStorage if available.
 */
export function loadCalibrationModel(): CalibrationModelData | null {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CalibrationModelData;
      }
    } catch (e) {
      console.error("Failed to parse stored calibration model:", e);
    }
  }
  return null;
}

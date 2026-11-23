/**
 * GazeConnect Linear Ridge Regression Calibration Engine
 * Pure 5-feature linear Ridge Regression solver ([1, avgIrisX, avgIrisY, headCenterX, headCenterY]).
 * Eliminates non-linear polynomial edge blow-ups and wild extrapolations.
 * Strictly clamps normalized coordinates to [0.02, 0.98].
 * Parks cursor at screen center when uncalibrated.
 */

import {
  CalibrationSample,
  CalibrationModelData,
  CalibrationReport,
  EyeFeatures,
} from "./types";

const RIDGE_LAMBDA = 0.1; // Balanced L2 regularization penalty for pure linear fit
const STORAGE_KEY = "gazeconnect_calibration_v2";

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
      XtX[i][i] += lambda * 0.05;
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
 * Trains pure linear Ridge Regression calibration model from collected 9-point samples.
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
  // Each sample's feature vector is 5-dimensional: [1, avgIrisX, avgIrisY, headCenterX, headCenterY]
  const X_train = trainSamples.map((s) => s.features.slice(0, 5));
  const Y_x_train = trainSamples.map((s) => s.target.screenX / screenWidth);
  const Y_y_train = trainSamples.map((s) => s.target.screenY / screenHeight);

  // Fit Ridge Regression weights (5 weights for X, 5 weights for Y)
  const weightsX = fitRidgeRegression(X_train, Y_x_train, RIDGE_LAMBDA);
  const weightsY = fitRidgeRegression(X_train, Y_y_train, RIDGE_LAMBDA);

  // Evaluate on validation set
  let totalErrorPx = 0;
  const evalSamples = valSamples.length > 0 ? valSamples : trainSamples;

  for (const s of evalSamples) {
    let normX = 0;
    let normY = 0;
    const feat = s.features.slice(0, 5);
    for (let f = 0; f < feat.length; f++) {
      normX += feat[f] * weightsX[f];
      normY += feat[f] * weightsY[f];
    }
    // Strict bounding box [0.02, 0.98]
    normX = Math.max(0.02, Math.min(0.98, normX));
    normY = Math.max(0.02, Math.min(0.98, normY));

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
 * - When trained Ridge Regression calibration model is provided (5 weights),
 *   computes linear projection and clamps strictly to [0.02, 0.98].
 * - When uncalibrated, parks the cursor at exact screen center (screenWidth / 2, screenHeight / 2)
 *   with isCalibrated: false, preventing erratic wild drift!
 */
export function predictGaze(
  features: EyeFeatures,
  model: CalibrationModelData | null | undefined,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number; isCalibrated: boolean } {
  // 1. If trained 5-feature Ridge Regression calibration model is available, use it
  if (model && model.weightsX && model.weightsX.length === 5) {
    let normX = 0;
    let normY = 0;

    const feat = features.featureVector.slice(0, 5);
    for (let i = 0; i < 5; i++) {
      normX += feat[i] * model.weightsX[i];
      normY += feat[i] * model.weightsY[i];
    }

    // Strict clamping to [0.02, 0.98] to prevent out-of-screen extrapolation
    const clampedNormX = Math.max(0.02, Math.min(0.98, normX));
    const clampedNormY = Math.max(0.02, Math.min(0.98, normY));

    return {
      x: clampedNormX * screenWidth,
      y: clampedNormY * screenHeight,
      isCalibrated: true,
    };
  }

  // 2. Strict Uncalibrated Fallback:
  // Do NOT let an uncalibrated guess move the cursor across the screen.
  // Park cursor steadily at screen center until 9-point calibration is completed!
  return {
    x: screenWidth / 2,
    y: screenHeight / 2,
    isCalibrated: false,
  };
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
 * Discards legacy or incompatible models (must have featureDim === 5).
 */
export function loadCalibrationModel(): CalibrationModelData | null {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CalibrationModelData;
        if (parsed.featureDim === 5 && parsed.weightsX && parsed.weightsX.length === 5) {
          return parsed;
        } else {
          // Remove outdated legacy model
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to parse stored calibration model:", e);
    }
  }
  return null;
}

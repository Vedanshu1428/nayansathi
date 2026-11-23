"use client";
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import {
  EyeFeatures,
  TrackingStatus,
  CalibrationModelData,
  GazePoint,
  SelectionMode,
  CURSOR_SPEED_PRESETS,
  DwellState,
} from "@/lib/gaze/types";
import { loadCalibrationModel, predictGaze } from "@/lib/gaze/calibrationModel";
import { setMirrorX as setFeatureExtractorMirrorX } from "@/lib/gaze/featureExtractor";
import { OneEuroFilter2D } from "@/lib/gaze/oneEuroFilter";
import { DwellEngine } from "@/lib/gaze/dwellEngine";
import WebcamTracker from "@/components/gaze/WebcamTracker";
import GazeCursor from "@/components/gaze/GazeCursor";

interface GazeContextValue {
  latestEyeFeatures: EyeFeatures | null;
  cameraStatus: TrackingStatus;
  gazePoint: GazePoint | null;
  dwellProgress: number;
  isDwellCoolingDown: boolean;
  blinkProgress: number;
  isBlinkHolding: boolean;
  calibrationModel: CalibrationModelData | null;
  setCalibrationModel: (m: CalibrationModelData | null) => void;
  calibrationScore: number | null;
  setCalibrationScore: (s: number | null) => void;
  isCalibrated: boolean;
  interactionMode: "gaze" | "mouse";
  setInteractionMode: (m: "gaze" | "mouse") => void;
  selectionMode: SelectionMode;
  setSelectionMode: (m: SelectionMode) => void;
  mirrorX: boolean;
  setMirrorX: (m: boolean) => void;
  blinkHoldMs: number;
  setBlinkHoldMs: (ms: number) => void;
  dwellDurationMs: number;
  setDwellDurationMs: (ms: number) => void;
  smoothingBeta: number;
  setSmoothingBeta: (b: number) => void;
  cursorSpeedPresetIndex: number;
  setCursorSpeedPresetIndex: (i: number) => void;
  showCameraPreview: boolean;
  setShowCameraPreview: (v: boolean) => void;
  showLandmarksDebug: boolean;
  setShowLandmarksDebug: (v: boolean) => void;
}

const GazeContext = createContext<GazeContextValue | null>(null);

export function useGaze(): GazeContextValue {
  const ctx = useContext(GazeContext);
  if (!ctx) throw new Error("useGaze must be used within GazeProvider");
  return ctx;
}

export default function GazeProvider({ children }: { children: React.ReactNode }) {
  const [latestEyeFeatures, setLatestEyeFeatures] = useState<EyeFeatures | null>(null);
  const [cameraStatus, setCameraStatus] = useState<TrackingStatus>("off");
  const [gazePoint, setGazePoint] = useState<GazePoint | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isDwellCoolingDown, setIsDwellCoolingDown] = useState(false);
  const [blinkProgress, setBlinkProgress] = useState(0);
  const [isBlinkHolding, setIsBlinkHolding] = useState(false);
  const [calibrationModel, setCalibrationModel] = useState<CalibrationModelData | null>(null);
  const [calibrationScore, setCalibrationScore] = useState<number | null>(null);
  const [interactionMode, setInteractionMode] = useState<"gaze" | "mouse">("gaze");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("hold_blink");
  const [mirrorX, setMirrorXState] = useState<boolean>(true); // default true for front webcams
  const [blinkHoldMs, setBlinkHoldMs] = useState(450);
  const [dwellDurationMs, setDwellDurationMs] = useState(1600);
  const [smoothingBeta, setSmoothingBeta] = useState(0.002);
  const [cursorSpeedPresetIndex, setCursorSpeedPresetIndex] = useState(1); // Slow/Balanced default
  const [showCameraPreview, setShowCameraPreview] = useState(true);
  const [showLandmarksDebug, setShowLandmarksDebug] = useState(false);

  const filterRef = useRef(
    new OneEuroFilter2D({ minCutoff: 0.15, beta: 0.002, dCutoff: 1.0 })
  );
  const dwellEngineRef = useRef(
    new DwellEngine({
      dwellTimeMs: 1600,
      exitGraceMs: 150,
      cooldownMs: 600,
      selectionMode: "hold_blink",
      blinkHoldMs: 450,
      blinkCooldownMs: 900,
    })
  );

  // Sync mirrorX to featureExtractor module & persistence
  const setMirrorX = useCallback((enabled: boolean) => {
    setMirrorXState(enabled);
    setFeatureExtractorMirrorX(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_mirror_x", String(enabled));
    }
  }, []);

  // Load calibration and settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = loadCalibrationModel();
      if (saved) {
        setCalibrationModel(saved);
        setCalibrationScore(saved.report.stabilityScore);
      }
      const savedMode = localStorage.getItem("gazeconnect_interaction_mode");
      if (savedMode === "gaze" || savedMode === "mouse") setInteractionMode(savedMode);

      const savedMirror = localStorage.getItem("gazeconnect_mirror_x");
      if (savedMirror !== null) {
        const val = savedMirror === "true";
        setMirrorXState(val);
        setFeatureExtractorMirrorX(val);
      }
    }
  }, []);

  // Sync cursor speed preset to filter
  useEffect(() => {
    const preset = CURSOR_SPEED_PRESETS[cursorSpeedPresetIndex];
    if (preset) {
      filterRef.current.applyPreset(preset);
      setSmoothingBeta(preset.beta);
    }
  }, [cursorSpeedPresetIndex]);

  // Sync dwell engine settings
  useEffect(() => {
    dwellEngineRef.current.setSettings({
      dwellTimeMs: dwellDurationMs,
      selectionMode,
      blinkHoldMs,
      blinkCooldownMs: 900,
    });
  }, [dwellDurationMs, selectionMode, blinkHoldMs]);

  // Process eye features into gaze point & dwell
  const handleFeaturesUpdate = useCallback(
    (features: EyeFeatures) => {
      setLatestEyeFeatures(features);
      if (interactionMode !== "gaze") return;
      if (typeof window === "undefined") return;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      const raw = predictGaze(features, calibrationModel, screenW, screenH);
      let finalX = raw.x;
      let finalY = raw.y;
      let dwellState: DwellState;

      if (raw.isCalibrated) {
        // Calibrated: Two-Stage Stabilizer (EMA + 1-Euro)
        const filtered = filterRef.current.filter(raw.x, raw.y, features.timestamp, screenW);
        finalX = filtered.x;
        finalY = filtered.y;

        // Process dwell selection
        dwellState = dwellEngineRef.current.update(
          finalX,
          finalY,
          features.timestamp,
          {
            isEyesClosed: features.isEyesClosed,
            closedDurationMs: features.closedDurationMs,
            avgEAR: features.averageEAR,
          }
        );
      } else {
        // Uncalibrated: Firmly park cursor at screen center. Never dwell-click background buttons!
        finalX = screenW / 2;
        finalY = screenH / 2;
        dwellEngineRef.current.reset();
        dwellState = {
          targetElement: null,
          dwellProgress: 0,
          isCoolingDown: false,
          lastSelectedElement: null,
          blinkProgress: 0,
          isBlinkHolding: false,
        };
      }

      setDwellProgress(dwellState.dwellProgress);
      setIsDwellCoolingDown(dwellState.isCoolingDown);
      setBlinkProgress(dwellState.blinkProgress);
      setIsBlinkHolding(dwellState.isBlinkHolding);

      setGazePoint({
        x: finalX,
        y: finalY,
        rawX: raw.x,
        rawY: raw.y,
        timestamp: features.timestamp,
        confidence: features.status === "ready" ? 1.0 : 0.2,
        status: features.status,
        isCalibrated: raw.isCalibrated,
      });
    },
    [interactionMode, calibrationModel]
  );

  const handleStatusChange = useCallback((s: TrackingStatus) => {
    setCameraStatus(s);
  }, []);

  return (
    <GazeContext.Provider
      value={{
        latestEyeFeatures,
        cameraStatus,
        gazePoint,
        dwellProgress,
        isDwellCoolingDown,
        blinkProgress,
        isBlinkHolding,
        calibrationModel,
        setCalibrationModel,
        calibrationScore,
        setCalibrationScore,
        isCalibrated: !!calibrationModel,
        interactionMode,
        setInteractionMode,
        selectionMode,
        setSelectionMode,
        mirrorX,
        setMirrorX,
        blinkHoldMs,
        setBlinkHoldMs,
        dwellDurationMs,
        setDwellDurationMs,
        smoothingBeta,
        setSmoothingBeta,
        cursorSpeedPresetIndex,
        setCursorSpeedPresetIndex,
        showCameraPreview,
        setShowCameraPreview,
        showLandmarksDebug,
        setShowLandmarksDebug,
      }}
    >
      {/* Persistent global webcam tracker — stays mounted across page navigation */}
      <div
        className={showCameraPreview ? "fixed bottom-20 right-4 z-30" : "sr-only"}
        aria-hidden="true"
      >
        <WebcamTracker
          showPreview={showCameraPreview}
          showDebugMesh={showLandmarksDebug}
          onFeaturesUpdate={handleFeaturesUpdate}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Global gaze cursor overlay */}
      {interactionMode === "gaze" && (
        <GazeCursor
          gazePoint={gazePoint}
          dwellProgress={dwellProgress}
          isCoolingDown={isDwellCoolingDown}
          status={cameraStatus}
          visible={true}
          isCalibrated={!!calibrationModel}
          mirrorX={mirrorX}
          onMirrorXChange={setMirrorX}
          dwellTimeMs={dwellDurationMs}
          onDwellTimeChange={setDwellDurationMs}
          smoothingBeta={smoothingBeta}
          onSmoothingBetaChange={setSmoothingBeta}
          selectionMode={selectionMode}
          onSelectionModeChange={setSelectionMode}
          blinkHoldMs={blinkHoldMs}
          onBlinkHoldMsChange={setBlinkHoldMs}
          blinkProgress={blinkProgress}
          isBlinkHolding={isBlinkHolding}
          cursorSpeedPresetIndex={cursorSpeedPresetIndex}
          onCursorSpeedPresetChange={setCursorSpeedPresetIndex}
        />
      )}

      {children}
    </GazeContext.Provider>
  );
}

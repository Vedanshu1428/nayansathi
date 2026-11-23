"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CalibrationTarget,
  CalibrationSample,
  CalibrationModelData,
  CalibrationReport,
  EyeFeatures,
} from "@/lib/gaze/types";
import { trainCalibrationModel, predictGaze } from "@/lib/gaze/calibrationModel";
import {
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Activity,
  ShieldCheck,
  Target,
} from "lucide-react";

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrationComplete: (model: CalibrationModelData) => void;
  latestFeatures: EyeFeatures | null;
}

// 9 standardized calibration target coordinates (% of viewport)
const TARGET_GRID: Array<{ id: number; xPercent: number; yPercent: number }> = [
  { id: 0, xPercent: 10, yPercent: 10 },
  { id: 1, xPercent: 50, yPercent: 10 },
  { id: 2, xPercent: 90, yPercent: 10 },
  { id: 3, xPercent: 10, yPercent: 50 },
  { id: 4, xPercent: 50, yPercent: 50 },
  { id: 5, xPercent: 90, yPercent: 50 },
  { id: 6, xPercent: 10, yPercent: 90 },
  { id: 7, xPercent: 50, yPercent: 90 },
  { id: 8, xPercent: 90, yPercent: 90 },
];

// 5 big verification targets (Top-Left, Top-Right, Center, Bottom-Left, Bottom-Right)
const VERIFICATION_TARGETS = [
  { id: "TL", label: "Top Left", xPercent: 20, yPercent: 25 },
  { id: "TR", label: "Top Right", xPercent: 80, yPercent: 25 },
  { id: "C",  label: "Center", xPercent: 50, yPercent: 50 },
  { id: "BL", label: "Bottom Left", xPercent: 20, yPercent: 75 },
  { id: "BR", label: "Bottom Right", xPercent: 80, yPercent: 75 },
];

const SAMPLES_PER_TARGET = 25;
const SACCADE_DISCARD_MS = 500; // Discard first 500ms after target moves for saccade settlement

export default function CalibrationModal({
  isOpen,
  onClose,
  onCalibrationComplete,
  latestFeatures,
}: CalibrationModalProps) {
  const [stage, setStage] = useState<"intro" | "calibrating" | "verifying" | "report">("intro");
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(0);
  const [samplesCollected, setSamplesCollected] = useState<number>(0);
  const [collectedSamples, setCollectedSamples] = useState<CalibrationSample[]>([]);
  const [rejectedSamplesCount, setRejectedSamplesCount] = useState<number>(0);
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [trainedModel, setTrainedModel] = useState<CalibrationModelData | null>(null);

  // 5-Target Verification State
  const [verificationActiveIdx, setVerificationActiveIdx] = useState<number>(0);
  const [verificationHits, setVerificationHits] = useState<number>(0);
  const [dwellHoldProgress, setDwellHoldProgress] = useState<number>(0);

  const targetStartTimeRef = useRef<number>(0);
  const verificationStartRef = useRef<number>(0);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage("intro");
      setCurrentTargetIndex(0);
      setSamplesCollected(0);
      setCollectedSamples([]);
      setRejectedSamplesCount(0);
      setReport(null);
      setTrainedModel(null);
      setVerificationActiveIdx(0);
      setVerificationHits(0);
      setDwellHoldProgress(0);
    }
  }, [isOpen]);

  const startCalibration = () => {
    setStage("calibrating");
    setCurrentTargetIndex(0);
    setSamplesCollected(0);
    setCollectedSamples([]);
    setRejectedSamplesCount(0);
    targetStartTimeRef.current = performance.now();
  };

  // Target sampling loop during 9-point calibration
  useEffect(() => {
    if (!isOpen || stage !== "calibrating" || !latestFeatures) return;

    const now = performance.now();
    // 1. Discard first 500ms after dot repositioning to allow ocular saccade to complete
    if (now - targetStartTimeRef.current < SACCADE_DISCARD_MS) {
      return;
    }

    // 2. Reject frames with blinks or no face detected
    if (
      latestFeatures.status === "blink_ignored" ||
      latestFeatures.status === "no_face" ||
      latestFeatures.isBlinking
    ) {
      setRejectedSamplesCount((prev) => prev + 1);
      return;
    }

    // 3. Compute absolute screen pixel target
    const currentTargetConfig = TARGET_GRID[currentTargetIndex];
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const target: CalibrationTarget = {
      id: currentTargetConfig.id,
      xPercent: currentTargetConfig.xPercent,
      yPercent: currentTargetConfig.yPercent,
      screenX: (currentTargetConfig.xPercent / 100) * screenW,
      screenY: (currentTargetConfig.yPercent / 100) * screenH,
    };

    const newSample: CalibrationSample = {
      targetId: currentTargetConfig.id,
      target,
      features: [...latestFeatures.featureVector],
      timestamp: now,
    };

    const nextCount = samplesCollected + 1;
    setSamplesCollected(nextCount);
    setCollectedSamples((prev) => [...prev, newSample]);

    // Check if target has accumulated 25 valid samples
    if (nextCount >= SAMPLES_PER_TARGET) {
      if (currentTargetIndex < TARGET_GRID.length - 1) {
        setCurrentTargetIndex((prev) => prev + 1);
        setSamplesCollected(0);
        targetStartTimeRef.current = performance.now();
      } else {
        // All 9 targets completed! Train hybrid model and transition to live verification
        try {
          const allSamples = [...collectedSamples, newSample];
          const model = trainCalibrationModel(
            allSamples,
            rejectedSamplesCount,
            screenW,
            screenH
          );
          setTrainedModel(model);
          setReport(model.report);
          setStage("verifying");
          setVerificationActiveIdx(0);
          setVerificationHits(0);
          setDwellHoldProgress(0);
          verificationStartRef.current = performance.now();
        } catch (err) {
          console.error("Training error:", err);
          alert("Calibration failed. Please ensure steady lighting and retry.");
          setStage("intro");
        }
      }
    }
  }, [
    latestFeatures,
    isOpen,
    stage,
    currentTargetIndex,
    samplesCollected,
    collectedSamples,
    rejectedSamplesCount,
  ]);

  // Live 5-Target Verification Check loop
  useEffect(() => {
    if (!isOpen || stage !== "verifying" || !trainedModel || !latestFeatures) return;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const pred = predictGaze(latestFeatures, trainedModel, screenW, screenH);

    const activeTarget = VERIFICATION_TARGETS[verificationActiveIdx];
    if (!activeTarget) return;

    const targetPixelX = (activeTarget.xPercent / 100) * screenW;
    const targetPixelY = (activeTarget.yPercent / 100) * screenH;

    // Check distance from predicted gaze to target center (hit radius: 140px)
    const dist = Math.hypot(pred.x - targetPixelX, pred.y - targetPixelY);
    const HIT_RADIUS = 140;

    if (dist < HIT_RADIUS) {
      setDwellHoldProgress((prev) => {
        const next = prev + 0.10; // ~500ms to hit target at 30 FPS
        if (next >= 1.0) {
          // Target hit confirmed!
          setVerificationHits((h) => h + 1);
          if (verificationActiveIdx < VERIFICATION_TARGETS.length - 1) {
            setVerificationActiveIdx((idx) => idx + 1);
            return 0;
          } else {
            // Completed all 5 verification targets!
            setStage("report");
            return 0;
          }
        }
        return next;
      });
    } else {
      setDwellHoldProgress((prev) => Math.max(0, prev - 0.05));
    }
  }, [latestFeatures, isOpen, stage, trainedModel, verificationActiveIdx]);

  if (!isOpen) return null;

  const currentTarget = TARGET_GRID[currentTargetIndex];
  const activeVerificationTarget = VERIFICATION_TARGETS[verificationActiveIdx];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* STAGE 1: INTRO */}
      {stage === "intro" && (
        <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <Eye className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              High-Precision 3D Gaze Calibration
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We will display 9 dots across your screen. Fix your gaze steadily on each pulsing dot as it appears. Keep your head relatively still.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-ice-50 border border-teal-200 text-xs text-teal-900 space-y-1.5 text-left font-medium">
            <div className="flex items-center gap-2 font-bold text-teal-800">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>3D Blendshape + Piecewise Bilinear Pipeline</span>
            </div>
            <p>• 8 MediaPipe 3D eye blendshapes fused with normalized iris vectors.</p>
            <p>• Initial 500ms ocular saccade latency discarded automatically.</p>
            <p>• Piecewise 3x3 grid interpolation prevents cross-screen edge distortion.</p>
            <p>• 5-target live verification test verifies accuracy before entering app.</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              data-dwell="true"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              data-dwell="true"
              onClick={startCalibration}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Begin Calibration</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: ACTIVE 9-POINT CALIBRATING */}
      {stage === "calibrating" && currentTarget && (
        <div className="relative w-full h-full">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 border border-teal-500/40 px-6 py-2.5 rounded-full text-white text-xs font-bold flex items-center gap-4 z-20 backdrop-blur">
            <span>
              Target <strong className="text-teal-400">{currentTargetIndex + 1}</strong> of 9
            </span>
            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-400 h-full transition-all duration-75"
                style={{ width: `${(samplesCollected / SAMPLES_PER_TARGET) * 100}%` }}
              />
            </div>
            <span className="text-slate-400">
              {samplesCollected}/{SAMPLES_PER_TARGET} frames
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300"
            style={{
              left: `${currentTarget.xPercent}%`,
              top: `${currentTarget.yPercent}%`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-teal-400 opacity-75" />
              <div className="w-10 h-10 rounded-full bg-teal-500 border-4 border-white shadow-xl flex items-center justify-center text-[10px] font-black text-white">
                {currentTargetIndex + 1}
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute" />
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2.5: 5-TARGET LIVE ACCURACY VERIFICATION */}
      {stage === "verifying" && activeVerificationTarget && (
        <div className="relative w-full h-full">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-indigo-950/90 border border-indigo-500/40 px-6 py-3 rounded-full text-white text-xs font-bold flex items-center gap-4 z-20 backdrop-blur shadow-2xl">
            <Target className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>
              Verification Mini-Test: Look at Target <strong className="text-indigo-300">{verificationActiveIdx + 1}</strong> of 5 ({activeVerificationTarget.label})
            </span>
            <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-75"
                style={{ width: `${dwellHoldProgress * 100}%` }}
              />
            </div>
            <span className="text-emerald-400 font-mono">
              Hits: {verificationHits}/5
            </span>
            <button
              type="button"
              onClick={() => setStage("report")}
              className="text-slate-400 hover:text-white text-[11px] underline ml-2"
            >
              Skip
            </button>
          </div>

          {/* Verification Target Button */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={{
              left: `${activeVerificationTarget.xPercent}%`,
              top: `${activeVerificationTarget.yPercent}%`,
            }}
          >
            <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-indigo-600/90 border-4 border-white shadow-2xl text-white">
              <Target className="w-10 h-10 text-white animate-pulse mb-1" />
              <span className="font-black text-sm tracking-wide">{activeVerificationTarget.label}</span>
              <span className="text-[10px] text-indigo-200">Hold Gaze to Verify</span>
              {dwellHoldProgress > 0 && (
                <div className="w-full bg-white/30 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all"
                    style={{ width: `${dwellHoldProgress * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: CALIBRATION REPORT */}
      {stage === "report" && report && trainedModel && (
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
            report.recommendation === "Good"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
              : "bg-amber-50 border border-amber-200 text-amber-600"
          }`}>
            {report.recommendation === "Good" ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">
              Calibration Quality Report
            </h2>
            <p className="text-xs text-slate-500">
              Piecewise 3x3 Bilinear + Ridge Hybrid Evaluation
            </p>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Mean Error
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {report.meanValidationErrorPx} <span className="text-xs font-normal text-slate-500">px</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Stability Score
              </span>
              <p className="text-lg font-black text-teal-600 mt-0.5">
                {report.stabilityScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Verification Hits
              </span>
              <p className="text-lg font-black text-indigo-600 mt-0.5">
                {verificationHits} / 5 <span className="text-xs font-normal text-slate-500">({Math.round((verificationHits / 5) * 100)}%)</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Face Visibility
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {report.faceVisibilityRate}%
              </p>
            </div>
          </div>

          {/* Recommendation Banner */}
          <div className={`p-3.5 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 ${
            report.recommendation === "Good"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}>
            <Activity className="w-4 h-4 flex-shrink-0" />
            <span>
              Recommendation: {report.recommendation} ({report.recommendation === "Good" ? "High precision ready for typing" : "Consider recalibrating in steady lighting"})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              data-dwell="true"
              onClick={startCalibration}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recalibrate</span>
            </button>
            <button
              type="button"
              data-dwell="true"
              onClick={() => {
                onCalibrationComplete(trainedModel);
                onClose();
              }}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Use</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
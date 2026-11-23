"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CalibrationTarget,
  CalibrationSample,
  CalibrationModelData,
  CalibrationReport,
  EyeFeatures,
} from "@/lib/gaze/types";
import { trainCalibrationModel } from "@/lib/gaze/calibrationModel";
import {
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Activity,
  ShieldCheck,
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

const SAMPLES_PER_TARGET = 25;
const SACCADE_DISCARD_MS = 300; // Ignore initial 300ms after target moves

export default function CalibrationModal({
  isOpen,
  onClose,
  onCalibrationComplete,
  latestFeatures,
}: CalibrationModalProps) {
  const [stage, setStage] = useState<"intro" | "calibrating" | "report">("intro");
  const [currentTargetIndex, setCurrentTargetIndex] = useState<number>(0);
  const [samplesCollected, setSamplesCollected] = useState<number>(0);
  const [collectedSamples, setCollectedSamples] = useState<CalibrationSample[]>([]);
  const [rejectedSamplesCount, setRejectedSamplesCount] = useState<number>(0);
  const [report, setReport] = useState<CalibrationReport | null>(null);
  const [trainedModel, setTrainedModel] = useState<CalibrationModelData | null>(null);

  const targetStartTimeRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);
  targetIndexRef.current = currentTargetIndex;

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

  // Target sampling loop triggered on each new eye features update
  useEffect(() => {
    if (!isOpen || stage !== "calibrating" || !latestFeatures) return;

    const now = performance.now();
    // 1. Discard first 300ms after dot repositioning to allow saccade to complete
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
        // Advance to next target dot
        setCurrentTargetIndex((prev) => prev + 1);
        setSamplesCollected(0);
        targetStartTimeRef.current = performance.now();
      } else {
        // All 9 targets completed! Train model.
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
          setStage("report");
        } catch (err) {
          console.error("Training error:", err);
          alert("Calibration failed. Please ensure your camera is positioned correctly and retry.");
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

  if (!isOpen) return null;

  const currentTarget = TARGET_GRID[currentTargetIndex];

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
              9-Point Eye Gaze Calibration
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We will display 9 dots across your screen. Fix your gaze steadily on each pulsing dot as it appears. Keep your head relatively still.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-ice-50 border border-teal-200 text-xs text-teal-900 space-y-1.5 text-left font-medium">
            <div className="flex items-center gap-2 font-bold text-teal-800">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Mathematical Calibration Pipeline</span>
            </div>
            <p>• 25 valid eye frames collected per dot.</p>
            <p>• Initial 300ms saccade movements are discarded automatically.</p>
            <p>• Blinks and closed eyes are rejected to prevent skewing.</p>
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

      {/* STAGE 2: ACTIVE CALIBRATING */}
      {stage === "calibrating" && currentTarget && (
        <div className="relative w-full h-full">
          {/* Top HUD instruction strip */}
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
            {/* Live tracking status pill */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-[10px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  latestFeatures?.status === "ready"
                    ? "bg-emerald-400 animate-pulse"
                    : latestFeatures?.status === "blink_ignored"
                    ? "bg-amber-400"
                    : "bg-red-500"
                }`}
              />
              <span
                className={
                  latestFeatures?.status === "ready"
                    ? "text-emerald-300"
                    : latestFeatures?.status === "blink_ignored"
                    ? "text-amber-300"
                    : "text-red-300"
                }
              >
                {latestFeatures?.status === "ready"
                  ? "Eyes Detected"
                  : latestFeatures?.status === "blink_ignored"
                  ? "Blink"
                  : "No Face Detected"}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Calibrating Target Dot */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300"
            style={{
              left: `${currentTarget.xPercent}%`,
              top: `${currentTarget.yPercent}%`,
            }}
          >
            {/* Outer pulsating ring */}
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
              Truthful mathematical evaluation from 80/20 train/validation split
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
                Valid Samples
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {report.sampleCount} <span className="text-xs font-normal text-slate-500">frames</span>
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

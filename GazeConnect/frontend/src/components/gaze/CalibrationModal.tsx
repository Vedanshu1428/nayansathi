"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CalibrationModelData,
  EyeFeatures,
} from "@/lib/gaze/types";
import { trainNeutralBaseline } from "@/lib/gaze/calibrationModel";
import {
  Eye,
  CheckCircle2,
  Check,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalibrationComplete: (model: CalibrationModelData) => void;
  latestFeatures: EyeFeatures | null;
}

const CALIBRATION_DURATION_MS = 3000;

export default function CalibrationModal({
  isOpen,
  onClose,
  onCalibrationComplete,
  latestFeatures,
}: CalibrationModalProps) {
  const [stage, setStage] = useState<"intro" | "calibrating" | "report">("intro");
  const [progressMs, setProgressMs] = useState<number>(0);
  const [, setCollectedSamples] = useState<EyeFeatures[]>([]);
  const [trainedModel, setTrainedModel] = useState<CalibrationModelData | null>(null);

  const startTimeRef = useRef<number>(0);
  const samplesRef = useRef<EyeFeatures[]>([]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage("intro");
      setProgressMs(0);
      setCollectedSamples([]);
      samplesRef.current = [];
      setTrainedModel(null);
    }
  }, [isOpen]);

  const startCalibration = () => {
    setStage("calibrating");
    setProgressMs(0);
    setCollectedSamples([]);
    samplesRef.current = [];
    startTimeRef.current = performance.now();
  };

  // 3-Second Center Sampling Loop
  useEffect(() => {
    if (!isOpen || stage !== "calibrating") return;

    let animId: number;
    const interval = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      setProgressMs(Math.min(CALIBRATION_DURATION_MS, elapsed));

      if (latestFeatures && latestFeatures.status === "ready" && !latestFeatures.isBlinking) {
        samplesRef.current.push({ ...latestFeatures });
      }

      if (elapsed >= CALIBRATION_DURATION_MS) {
        const samples = [...samplesRef.current];
        setCollectedSamples(samples);
        const model = trainNeutralBaseline(samples);
        setTrainedModel(model);
        setStage("report");
        onCalibrationComplete(model);
        return;
      }

      animId = requestAnimationFrame(interval);
    };

    animId = requestAnimationFrame(interval);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, stage, latestFeatures, onCalibrationComplete]);

  if (!isOpen) return null;

  const progressRatio = Math.min(1, progressMs / CALIBRATION_DURATION_MS);
  const secondsLeft = Math.max(0, ((CALIBRATION_DURATION_MS - progressMs) / 1000)).toFixed(1);
  const alignment = latestFeatures?.headAlignment;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* STAGE 1: INTRO & ALIGNMENT CHECK */}
      {stage === "intro" && (
        <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
            <Eye className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              3-Second Neutral Eye Calibration
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Look naturally at the center dot for 3 seconds. GazeConnect will lock your forward neutral eye position to power responsive 4-directional eye navigation.
            </p>
          </div>

          {/* Live Head Alignment Pill */}
          {alignment && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                alignment.isOptimal
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    alignment.isOptimal ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span>Face Status: {alignment.guidanceMessage}</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 dark:bg-slate-800">
                {alignment.isOptimal ? "Ready" : "Adjust"}
              </span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 text-left font-medium">
            <div className="flex items-center gap-2 font-bold text-teal-600 dark:text-teal-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Relative Eye-Deflection System</span>
            </div>
            <p>• Zero screen-dimension distortion: navigates relative to your neutral center.</p>
            <p>• Locks your individual open-eye baseline and 3D MediaPipe blendshapes.</p>
            <p>• Takes only 3 seconds — recalibrate anytime from the bottom HUD.</p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              data-dwell="true"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              data-dwell="true"
              onClick={startCalibration}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Begin 3s Calibration</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: ACTIVE 3-SECOND CENTER RECORDING */}
      {stage === "calibrating" && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Top Instruction Pill */}
          <div className="absolute top-8 bg-black/80 border border-teal-500/50 px-6 py-3 rounded-full text-white text-sm font-black flex items-center gap-3 backdrop-blur shadow-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
            <span>Look Steadily at Center Dot ({secondsLeft}s)</span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Center Target with Pulsing Concentric Rings & Progress Fill */}
          <div className="relative flex items-center justify-center">
            {/* Outer expanding ping ring */}
            <span className="animate-ping absolute inline-flex h-36 w-36 rounded-full bg-teal-400 opacity-40" />

            {/* SVG Progress Ring */}
            <svg className="w-32 h-32 -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="6"
                className="text-slate-800"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="6"
                className="text-teal-400 transition-all duration-75"
                fill="none"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - progressRatio)}
                strokeLinecap="round"
              />
            </svg>

            {/* Center Core Dot with Countdown */}
            <div className="absolute w-20 h-20 rounded-full bg-teal-500 border-4 border-white shadow-2xl flex flex-col items-center justify-center text-white">
              <span className="font-black text-xl leading-none">{secondsLeft}s</span>
              <span className="text-[9px] uppercase font-bold tracking-tight opacity-90 mt-0.5">Center</span>
            </div>
          </div>

          <p className="mt-8 text-sm font-bold text-slate-300">
            Keep your head relaxed and eyes focused directly forward.
          </p>
        </div>
      )}

      {/* STAGE 3: CALIBRATION SUCCESS REPORT */}
      {stage === "report" && trainedModel && (
        <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Neutral Baseline Locked!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              4-Directional eye navigation and hold-blink clicking are calibrated and ready.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Neutral Center X</span>
              <span className="text-base font-black text-teal-600 dark:text-teal-400 font-mono">
                {((trainedModel.neutralGazeX ?? 0.5) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Neutral Center Y</span>
              <span className="text-base font-black text-teal-600 dark:text-teal-400 font-mono">
                {((trainedModel.neutralGazeY ?? 0.5) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Frames Sampled</span>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                {trainedModel.report.sampleCount} frames
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Open-Eye EAR</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {(trainedModel.openEyeBaseline ?? 0.28).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-dwell="true"
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Done & Start Communicating</span>
          </button>
        </div>
      )}
    </div>
  );
}

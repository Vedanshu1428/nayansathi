"use client";

import React, { useState, useEffect } from "react";
import { useGaze } from "@/components/gaze/GazeProvider";
import { GazePoint, TrackingStatus, SelectionMode, GazeSensitivity } from "@/lib/gaze/types";
import {
  FlipHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Circle,
  Eye,
  Sliders,
  Play,
  Pause,
  Sparkles,
  MousePointer,
} from "lucide-react";

interface GazeCursorProps {
  gazePoint: GazePoint | null;
  dwellProgress: number;
  isCoolingDown: boolean;
  status: TrackingStatus;
  visible?: boolean;
  isCalibrated?: boolean;
  mirrorX?: boolean;
  onMirrorXChange?: (m: boolean) => void;
  dwellTimeMs: number;
  onDwellTimeChange: (newTime: number) => void;
  smoothingBeta: number;
  onSmoothingBetaChange: (newBeta: number) => void;
  selectionMode: SelectionMode;
  onSelectionModeChange: (mode: SelectionMode) => void;
  blinkHoldMs: number;
  onBlinkHoldMsChange: (ms: number) => void;
  blinkProgress: number;
  isBlinkHolding: boolean;
  cursorSpeedPresetIndex: number;
  onCursorSpeedPresetChange: (index: number) => void;
}

export default function GazeCursor({
  visible = true,
  isCalibrated = true,
  mirrorX = true,
  onMirrorXChange,
}: GazeCursorProps) {
  let gazeCtx: ReturnType<typeof useGaze> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gazeCtx = useGaze();
  } catch {
    gazeCtx = null;
  }

  // Real-time discrete navigation state from 60 FPS custom event
  const [direction, setDirection] = useState<"LEFT" | "RIGHT" | "UP" | "DOWN" | "CENTER">("CENTER");
  const [liveBlinkProgress, setLiveBlinkProgress] = useState<number>(0);
  const [liveIsHolding, setLiveIsHolding] = useState<boolean>(false);
  const [focusedLabel, setFocusedLabel] = useState<string>("");

  useEffect(() => {
    const handleFrame = (e: Event) => {
      const customEvent = e as CustomEvent<{
        discreteDirection?: "LEFT" | "RIGHT" | "UP" | "DOWN" | "CENTER";
        blinkProgress?: number;
        isBlinkHolding?: boolean;
        focusedText?: string;
      }>;
      const d = customEvent.detail;
      if (!d) return;

      if (d.discreteDirection) setDirection(d.discreteDirection);
      if (typeof d.blinkProgress === "number") setLiveBlinkProgress(d.blinkProgress);
      if (typeof d.isBlinkHolding === "boolean") setLiveIsHolding(d.isBlinkHolding);
      if (d.focusedText !== undefined) setFocusedLabel(d.focusedText);
    };

    window.addEventListener("gazeconnect_frame", handleFrame);
    return () => window.removeEventListener("gazeconnect_frame", handleFrame);
  }, []);

  if (!visible) return null;

  const currentSens: GazeSensitivity = gazeCtx?.sensitivity ?? "medium";
  const isAutoScanning = gazeCtx?.isAutoScanning ?? false;

  const handleSensitivityCycle = () => {
    if (!gazeCtx) return;
    const next: GazeSensitivity =
      currentSens === "low" ? "medium" : currentSens === "medium" ? "high" : "low";
    gazeCtx.setSensitivity(next);
  };

  const handleAutoScanToggle = () => {
    if (!gazeCtx) return;
    gazeCtx.setIsAutoScanning(!isAutoScanning);
  };

  const handleOpenNeutralCalib = () => {
    if (gazeCtx?.openCalibrationModal) {
      gazeCtx.openCalibrationModal();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gazeconnect_open_calibration"));
    }
  };

  return (
    <>
      {/* ── Fixed Bottom Eye-Navigation HUD Pill ── */}
      <aside aria-label="Gaze Navigation Bar" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex flex-col items-center gap-2 max-w-[95vw]">
        {/* Floating OS Control Status (if active) */}
        {gazeCtx?.isOSControlActive && (
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-teal-500/50 text-white text-[11px] font-bold shadow-xl flex items-center gap-3 backdrop-blur">
            <span className="flex items-center gap-1.5 text-teal-400">
              <MousePointer className="w-3.5 h-3.5 animate-pulse" />
              <span>OS Control Active</span>
            </span>
            <div className="flex gap-1">
              {(["left", "double", "right"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-dwell="true"
                  onClick={() => gazeCtx?.setOSClickType(mode)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                    gazeCtx?.osClickType === mode
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-dwell="true"
              onClick={() => gazeCtx?.setIsOSControlActive(false)}
              className="p-1 rounded bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white"
              title="Pause OS Eye Control"
            >
              <Pause className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Primary Eye-Navigation HUD Pill */}
        <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/80 text-white rounded-2xl sm:rounded-full px-4 sm:px-5 py-2.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-bold">
          {/* 1. Live 4-Direction Indicator Cluster */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
            <span
              className={`p-1 rounded transition-all ${
                direction === "LEFT"
                  ? "bg-teal-500 text-white scale-110 shadow-[0_0_12px_rgba(20,184,166,0.8)]"
                  : "text-slate-500"
              }`}
              title="Gaze Left"
            >
              <ChevronLeft className="w-4 h-4 stroke-[3]" />
            </span>

            <div className="flex flex-col items-center -my-1">
              <span
                className={`p-0.5 rounded transition-all ${
                  direction === "UP"
                    ? "bg-teal-500 text-white scale-110 shadow-[0_0_12px_rgba(20,184,166,0.8)]"
                    : "text-slate-500"
                }`}
                title="Gaze Up"
              >
                <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <span
                className={`p-0.5 rounded transition-all ${
                  direction === "CENTER"
                    ? "text-teal-400 scale-125"
                    : "text-slate-600"
                }`}
                title="Neutral Center"
              >
                <Circle className="w-2.5 h-2.5 fill-current" />
              </span>
              <span
                className={`p-0.5 rounded transition-all ${
                  direction === "DOWN"
                    ? "bg-teal-500 text-white scale-110 shadow-[0_0_12px_rgba(20,184,166,0.8)]"
                    : "text-slate-500"
                }`}
                title="Gaze Down"
              >
                <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            </div>

            <span
              className={`p-1 rounded transition-all ${
                direction === "RIGHT"
                  ? "bg-teal-500 text-white scale-110 shadow-[0_0_12px_rgba(20,184,166,0.8)]"
                  : "text-slate-500"
              }`}
              title="Gaze Right"
            >
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </span>

            <span className="text-[10px] font-mono font-black text-teal-400 ml-1">
              {direction}
            </span>
          </div>

          {/* 2. Hold-Blink Click Progress Meter */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
            <Eye className={`w-3.5 h-3.5 ${liveIsHolding ? "text-amber-400 animate-pulse" : "text-slate-400"}`} />
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-[9px] gap-2">
                <span className="text-slate-400 uppercase font-black">Blink Click</span>
                <span className={`font-mono ${liveBlinkProgress >= 1 ? "text-emerald-400 font-black" : "text-amber-300"}`}>
                  {Math.round(liveBlinkProgress * 100)}%
                </span>
              </div>
              <div className="w-20 bg-slate-700 rounded-full h-1.5 overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-75 ${
                    liveBlinkProgress >= 1.0 ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(100, liveBlinkProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. Action: Set Neutral Center (3s) */}
          <button
            type="button"
            data-dwell="true"
            onClick={handleOpenNeutralCalib}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-black shadow-md shadow-teal-600/30 transition-all flex items-center gap-1.5 active:scale-95"
            title="Calibrate forward eye position in 3 seconds"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Set Neutral (3s)</span>
          </button>

          {/* 4. Action: Sensitivity Selector */}
          <button
            type="button"
            data-dwell="true"
            onClick={handleSensitivityCycle}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 transition-all flex items-center gap-1"
            title="Cycle Sensitivity: Low / Medium / High"
          >
            <Sliders className="w-3 h-3 text-teal-400" />
            <span>Sens: <strong className="text-teal-400 uppercase">{currentSens}</strong></span>
          </button>

          {/* 5. Action: Flip Left/Right Toggle */}
          <button
            type="button"
            data-dwell="true"
            onClick={() => onMirrorXChange?.(!mirrorX)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 ${
              mirrorX
                ? "bg-slate-800 border-teal-500/50 text-teal-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            }`}
            title="Toggle Left/Right horizontal camera flip"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>{mirrorX ? "Flip: ON" : "Flip: OFF"}</span>
          </button>

          {/* 6. Action: Auto-Scan Mode Toggle */}
          <button
            type="button"
            data-dwell="true"
            onClick={handleAutoScanToggle}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              isAutoScanning
                ? "bg-emerald-600 border-emerald-500 text-white animate-pulse shadow-md shadow-emerald-600/40"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
            }`}
            title="Automatically advance through buttons every 1.8s (Blink to Click)"
          >
            {isAutoScanning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isAutoScanning ? "Auto-Scan (1.8s)" : "Auto-Scan"}</span>
          </button>

          {/* Active button indicator badge (if any) */}
          {focusedLabel && (
            <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400 border-l border-slate-700 pl-3">
              <span>Target:</span>
              <span className="text-teal-300 font-mono font-bold max-w-[100px] truncate">
                {focusedLabel}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

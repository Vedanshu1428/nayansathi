"use client";

import React, { useState } from "react";
import { GazePoint, TrackingStatus, SelectionMode, CURSOR_SPEED_PRESETS } from "@/lib/gaze/types";
import { Sliders, FlipHorizontal, AlertCircle } from "lucide-react";

interface GazeCursorProps {
  gazePoint: GazePoint | null;
  dwellProgress: number;       // 0.0 to 1.0
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
  blinkProgress: number;         // 0.0 to 1.0
  isBlinkHolding: boolean;
  cursorSpeedPresetIndex: number; // 0=Very Slow, 1=Slow/Balanced, 2=Normal
  onCursorSpeedPresetChange: (index: number) => void;
}

export default function GazeCursor({
  gazePoint,
  dwellProgress,
  isCoolingDown,
  status,
  visible = true,
  isCalibrated = true,
  mirrorX = true,
  onMirrorXChange,
  dwellTimeMs,
  onDwellTimeChange,
  smoothingBeta,
  onSmoothingBetaChange,
  selectionMode,
  onSelectionModeChange,
  blinkHoldMs,
  onBlinkHoldMsChange,
  blinkProgress,
  isBlinkHolding,
  cursorSpeedPresetIndex,
  onCursorSpeedPresetChange,
}: GazeCursorProps) {
  const [showTuning, setShowTuning] = useState(false);

  if (!visible || !gazePoint) return null;

  // SVG circle calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - dwellProgress);

  // Status-based colors
  // Flash green when blink fires (blinkProgress >= 1.0), blue during cooldown, amber if uncalibrated, teal otherwise
  const cursorColor =
    !isCalibrated
      ? "#DC2626" // Red when calibration required
      : status === "ready"
      ? blinkProgress >= 1.0
        ? "#22C55E" // Green flash on blink fire
        : isCoolingDown
        ? "#3B82F6" // Blue during cooldown
        : "#0D9488" // Medical Teal
      : status === "blink_ignored"
      ? "#F59E0B"   // Amber for blink
      : "#EF4444";  // Red for no face or error

  const pillLabel =
    selectionMode === "hold_blink"
      ? "Blink-Hold"
      : selectionMode === "slow_dwell"
      ? "Slow Dwell"
      : "Hybrid";

  return (
    <>
      {/* Floating Gaze Cursor Ring */}
      <div
        className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${gazePoint.x}px`,
          top: `${gazePoint.y}px`,
          willChange: "left, top",
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" className="overflow-visible">
          {/* Background circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="rgba(0, 0, 0, 0.25)"
            strokeWidth="5"
          />

          {/* Blink-hold progress ring (amber, behind main ring) */}
          {isBlinkHolding && isCalibrated && (
            <circle
              cx="30"
              cy="30"
              r={28}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={2 * Math.PI * 28 * (1 - blinkProgress)}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
            />
          )}

          {/* Dwell Progress Ring */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill={dwellProgress > 0.95 ? cursorColor : "rgba(255, 255, 255, 0.4)"}
            stroke={cursorColor}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={isCalibrated ? strokeDashoffset : circumference}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
            className="transition-all duration-75"
          />

          {/* Center Point */}
          <circle
            cx="30"
            cy="30"
            r={4}
            fill={cursorColor}
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        </svg>

        {/* Uncalibrated Status Badge — Parked at Center */}
        {!isCalibrated && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1.5 animate-pulse border border-red-300">
            <AlertCircle className="w-3 h-3 text-white" />
            <span>CALIBRATION REQUIRED</span>
          </div>
        )}

        {/* Labels when calibrated */}
        {isCalibrated && isCoolingDown && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap">
            COOLDOWN
          </div>
        )}
        {isCalibrated && status === "blink_ignored" && !isBlinkHolding && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
            BLINK
          </div>
        )}
        {/* HOLD label when eyes closed */}
        {isCalibrated && isBlinkHolding && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
            HOLD
          </div>
        )}
      </div>

      {/* Compact Floating Tuning Pill */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {showTuning && (
          <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl w-72 text-xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-teal-600" />
                Tune Gaze ({pillLabel})
              </span>
              <button
                type="button"
                onClick={() => setShowTuning(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Section 0 — Camera Mirror X */}
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide flex items-center gap-1">
                <FlipHorizontal className="w-3.5 h-3.5 text-teal-600" />
                <span>Camera Direction</span>
              </div>
              <button
                type="button"
                data-dwell="true"
                onClick={() => onMirrorXChange?.(!mirrorX)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between ${
                  mirrorX
                    ? "bg-teal-50 border-teal-500 text-teal-900"
                    : "bg-slate-50 border-slate-300 text-slate-700"
                }`}
              >
                <span>{mirrorX ? "Mirror X: ON (Front Webcam)" : "Mirror X: OFF (Unmirrored)"}</span>
                <span className="text-[10px] font-mono text-teal-700 underline">Flip</span>
              </button>
            </div>

            {/* Section 1 — Trigger Mode */}
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Trigger Mode</div>
              <div className="flex gap-2">
                {(["hold_blink", "slow_dwell", "hybrid"] as SelectionMode[]).map((m) => (
                  <button
                    key={m}
                    data-dwell="true"
                    onClick={() => onSelectionModeChange(m)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                      selectionMode === m
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "border-slate-300 text-slate-600"
                    }`}
                  >
                    {m === "hold_blink" ? "Hold-Blink" : m === "slow_dwell" ? "Slow Dwell" : "Hybrid"}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2 — Cursor Speed */}
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Cursor Speed</div>
              <div className="flex gap-2">
                {CURSOR_SPEED_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    data-dwell="true"
                    onClick={() => onCursorSpeedPresetChange(i)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                      cursorSpeedPresetIndex === i
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "border-slate-300 text-slate-600"
                    }`}
                  >
                    {i === 0 ? "Very Slow" : i === 1 ? "Balanced" : "Normal"}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3 — Time Sliders */}
            <div className="space-y-3">
              <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wide">Timing</div>

              {/* Hold-Blink Time slider */}
              {(selectionMode === "hold_blink" || selectionMode === "hybrid") && (
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Hold-Blink Time</span>
                    <span className="text-teal-600 font-bold">{blinkHoldMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="350"
                    max="900"
                    step="25"
                    value={blinkHoldMs}
                    onChange={(e) => onBlinkHoldMsChange(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Quick (350ms)</span>
                    <span>Long (900ms)</span>
                  </div>
                </div>
              )}

              {/* Dwell Time slider */}
              {(selectionMode === "slow_dwell" || selectionMode === "hybrid") && (
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Dwell Time</span>
                    <span className="text-teal-600 font-bold">{dwellTimeMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="3000"
                    step="100"
                    value={dwellTimeMs}
                    onChange={(e) => onDwellTimeChange(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>Fast (1000ms)</span>
                    <span>Relaxed (3000ms)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Legacy smoothing (hidden from main UI but kept for internal reference) */}
            <details className="text-[10px] text-slate-400">
              <summary className="cursor-pointer select-none">Advanced</summary>
              <div className="mt-2">
                <div className="flex justify-between font-semibold text-slate-600 mb-1">
                  <span>Cursor Smoothing (Beta)</span>
                  <span className="text-teal-600 font-bold">{smoothingBeta.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.050"
                  step="0.001"
                  value={smoothingBeta}
                  onChange={(e) => onSmoothingBetaChange(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Steadier</span>
                  <span>More Responsive</span>
                </div>
              </div>
            </details>
          </div>
        )}

        <button
          type="button"
          data-dwell="true"
          onClick={() => setShowTuning(!showTuning)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-slate-700 border border-slate-200 shadow-md backdrop-blur transition-all"
          title="Tune Gaze Settings"
        >
          <Sliders className="w-3.5 h-3.5 text-teal-600" />
          <span>Tune Gaze ({pillLabel})</span>
        </button>
      </div>
    </>
  );
}

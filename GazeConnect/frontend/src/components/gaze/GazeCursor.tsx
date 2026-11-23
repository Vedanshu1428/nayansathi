"use client";

import React, { useState, useEffect, useRef } from "react";
import { GazePoint, TrackingStatus, SelectionMode, CURSOR_SPEED_PRESETS } from "@/lib/gaze/types";
import { Sliders, FlipHorizontal, AlertCircle } from "lucide-react";

interface GazeCursorProps {
  gazePoint: GazePoint | null;
  dwellProgress: number; // 0.0 to 1.0 (throttled fallback)
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
  blinkProgress: number; // 0.0 to 1.0
  isBlinkHolding: boolean;
  cursorSpeedPresetIndex: number; // 0=Very Slow, 1=Slow/Balanced, 2=Normal
  onCursorSpeedPresetChange: (index: number) => void;
}

export default function GazeCursor({
  gazePoint,
  dwellProgress: propDwellProgress,
  isCoolingDown: propIsCoolingDown,
  status: propStatus,
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
  blinkProgress: propBlinkProgress,
  isBlinkHolding: propIsBlinkHolding,
  cursorSpeedPresetIndex,
  onCursorSpeedPresetChange,
}: GazeCursorProps) {
  const [showTuning, setShowTuning] = useState(false);

  // Direct DOM references for 60 FPS zero-lag rendering without triggering React re-renders
  const cursorContainerRef = useRef<HTMLDivElement>(null);
  const dwellCircleRef = useRef<SVGCircleElement>(null);
  const blinkCircleRef = useRef<SVGCircleElement>(null);
  const centerDotRef = useRef<SVGCircleElement>(null);
  const cooldownBadgeRef = useRef<HTMLDivElement>(null);
  const blinkBadgeRef = useRef<HTMLDivElement>(null);
  const holdBadgeRef = useRef<HTMLDivElement>(null);

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const blinkRadius = 28;
  const blinkCircumference = 2 * Math.PI * blinkRadius;

  // Listen to the high-frequency 60 FPS custom event for ultra-smooth pointer rendering
  useEffect(() => {
    const handleFrame = (e: Event) => {
      const customEvent = e as CustomEvent<{
        x: number;
        y: number;
        rawX: number;
        rawY: number;
        dwellProgress: number;
        blinkProgress: number;
        isBlinkHolding: boolean;
        isCoolingDown: boolean;
        status: TrackingStatus;
        isCalibrated: boolean;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      // 1. Position cursor via hardware-accelerated translate3d
      if (cursorContainerRef.current) {
        cursorContainerRef.current.style.transform = `translate3d(${detail.x}px, ${detail.y}px, 0) translate(-50%, -50%)`;
      }

      // 2. Update Dwell stroke progress
      if (dwellCircleRef.current) {
        if (detail.isCalibrated) {
          const offset = circumference * (1 - Math.max(0, Math.min(1, detail.dwellProgress)));
          dwellCircleRef.current.style.strokeDashoffset = `${offset}`;
          dwellCircleRef.current.style.fill =
            detail.dwellProgress > 0.95
              ? detail.isCoolingDown
                ? "#3B82F6"
                : "#0D9488"
              : "rgba(255, 255, 255, 0.4)";
        } else {
          dwellCircleRef.current.style.strokeDashoffset = `${circumference}`;
        }
      }

      // 3. Update Blink-hold progress ring
      if (blinkCircleRef.current) {
        if (detail.isBlinkHolding && detail.isCalibrated) {
          blinkCircleRef.current.style.display = "block";
          const bOffset = blinkCircumference * (1 - Math.max(0, Math.min(1, detail.blinkProgress)));
          blinkCircleRef.current.style.strokeDashoffset = `${bOffset}`;
        } else {
          blinkCircleRef.current.style.display = "none";
        }
      }

      // 4. Update badge visibility directly on the DOM
      if (cooldownBadgeRef.current) {
        cooldownBadgeRef.current.style.display =
          detail.isCalibrated && detail.isCoolingDown ? "block" : "none";
      }
      if (holdBadgeRef.current) {
        holdBadgeRef.current.style.display =
          detail.isCalibrated && detail.isBlinkHolding ? "block" : "none";
      }
      if (blinkBadgeRef.current) {
        blinkBadgeRef.current.style.display =
          detail.isCalibrated && detail.status === "blink_ignored" && !detail.isBlinkHolding
            ? "block"
            : "none";
      }
    };

    window.addEventListener("gazeconnect_frame", handleFrame);
    return () => {
      window.removeEventListener("gazeconnect_frame", handleFrame);
    };
  }, [circumference, blinkCircumference]);

  if (!visible) return null;

  // Fallback initial position
  const initialX = gazePoint ? gazePoint.x : typeof window !== "undefined" ? window.innerWidth / 2 : 500;
  const initialY = gazePoint ? gazePoint.y : typeof window !== "undefined" ? window.innerHeight / 2 : 500;

  // Status-based colors for static markup
  const cursorColor = !isCalibrated
    ? "#DC2626"
    : propStatus === "ready"
    ? propBlinkProgress >= 1.0
      ? "#22C55E"
      : propIsCoolingDown
      ? "#3B82F6"
      : "#0D9488"
    : propStatus === "blink_ignored"
    ? "#F59E0B"
    : "#EF4444";

  const pillLabel =
    selectionMode === "hold_blink"
      ? "Blink-Hold"
      : selectionMode === "slow_dwell"
      ? "Slow Dwell"
      : "Hybrid";

  return (
    <>
      {/* Floating Gaze Cursor Ring — Decoupled via Direct Ref + Hardware Transform */}
      <div
        ref={cursorContainerRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          transform: `translate3d(${initialX}px, ${initialY}px, 0) translate(-50%, -50%)`,
          willChange: "transform",
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" className="overflow-visible pointer-events-none">
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
          <circle
            ref={blinkCircleRef}
            cx="30"
            cy="30"
            r={blinkRadius}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="4"
            strokeDasharray={blinkCircumference}
            strokeDashoffset={blinkCircumference * (1 - propBlinkProgress)}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
            style={{ display: propIsBlinkHolding && isCalibrated ? "block" : "none" }}
          />

          {/* Dwell Progress Ring */}
          <circle
            ref={dwellCircleRef}
            cx="30"
            cy="30"
            r={radius}
            fill={propDwellProgress > 0.95 ? cursorColor : "rgba(255, 255, 255, 0.4)"}
            stroke={cursorColor}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={isCalibrated ? circumference * (1 - propDwellProgress) : circumference}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
          />

          {/* Center Point */}
          <circle
            ref={centerDotRef}
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
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap flex items-center gap-1.5 animate-pulse border border-red-300 pointer-events-none">
            <AlertCircle className="w-3 h-3 text-white" />
            <span>CALIBRATION REQUIRED</span>
          </div>
        )}

        {/* Labels when calibrated */}
        <div
          ref={cooldownBadgeRef}
          style={{ display: isCalibrated && propIsCoolingDown ? "block" : "none" }}
          className="absolute top-14 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none"
        >
          COOLDOWN
        </div>

        <div
          ref={blinkBadgeRef}
          style={{
            display:
              isCalibrated && propStatus === "blink_ignored" && !propIsBlinkHolding ? "block" : "none",
          }}
          className="absolute top-14 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none"
        >
          BLINK
        </div>

        <div
          ref={holdBadgeRef}
          style={{ display: isCalibrated && propIsBlinkHolding ? "block" : "none" }}
          className="absolute top-14 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none"
        >
          HOLD
        </div>
      </div>

      {/* Compact Floating Tuning Pill — Interactive with pointer-events-auto */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto">
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

            {/* Advanced Beta */}
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
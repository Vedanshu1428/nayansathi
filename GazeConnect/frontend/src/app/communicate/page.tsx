"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/ui/Navbar";
import CalibrationModal from "@/components/gaze/CalibrationModal";
import VirtualKeyboard from "@/components/keyboard/VirtualKeyboard";
import QuickPanels from "@/components/keyboard/QuickPanels";
import PredictionBar from "@/components/keyboard/PredictionBar";
import { useGaze } from "@/components/gaze/GazeProvider";
import { tts } from "@/lib/speech/ttsEngine";
import { LocalStore } from "@/lib/storage/localStore";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  BookmarkPlus,
  AlertTriangle,
  Camera,
  Eye,
  Activity,
  Keyboard,
  Grid,
  HeartPulse,
  Users,
} from "lucide-react";

export default function CommunicatePage() {
  const {
    latestEyeFeatures,
    cameraStatus,
    gazePoint,
    dwellProgress,
    blinkProgress,
    isBlinkHolding,
    calibrationModel,
    setCalibrationModel,
    calibrationScore,
    setCalibrationScore,
    interactionMode,
    setInteractionMode,
    showCameraPreview,
    setShowCameraPreview,
    showLandmarksDebug,
    setShowLandmarksDebug,
  } = useGaze();

  const [activeMessage, setActiveMessage] = useState<string>("");
  const [lastSpokenMessage, setLastSpokenMessage] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "keyboard" | "phrases" | "emergency" | "facetoface"
  >("keyboard");
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<"md" | "lg" | "xl">("lg");
  const [showEyeDiagnostics, setShowEyeDiagnostics] = useState<boolean>(true);
  const [hoveredDwellLabel, setHoveredDwellLabel] = useState<string | null>(
    null
  );
  const [showCalibrationModal, setShowCalibrationModal] =
    useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeLanguage, setActiveLanguage] = useState<string>("en-US");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null
  );

  // Parse ?tab=emergency from URL if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "emergency" ||
        tabParam === "phrases" ||
        tabParam === "facetoface"
      ) {
        setActiveTab(tabParam as "emergency" | "phrases" | "facetoface");
      }
    }
  }, []);

  // Track hovered dwell target label from gaze state
  useEffect(() => {
    if (!gazePoint) {
      setHoveredDwellLabel(null);
      return;
    }
    const el = document.elementFromPoint(gazePoint.x, gazePoint.y);
    if (el) {
      const dwellTarget = el.closest("[data-dwell='true']") as HTMLElement | null;
      if (dwellTarget) {
        const label =
          dwellTarget.getAttribute("aria-label") ||
          dwellTarget.getAttribute("title") ||
          dwellTarget.innerText?.trim()?.slice(0, 32) ||
          dwellTarget.tagName;
        setHoveredDwellLabel(label);
        return;
      }
    }
    setHoveredDwellLabel(null);
  }, [gazePoint]);

  // Unified Text-to-Speech handlers
  const handleSpeak = useCallback(
    (textToSpeak?: string) => {
      const text = textToSpeak ?? activeMessage;
      if (!text || text.trim() === "") return;

      tts.speak(text, {
        lang: activeLanguage,
        rate: speechRate,
        onStart: () => {
          setIsSpeaking(true);
          setIsPaused(false);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onError: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
      });
      setLastSpokenMessage(text);
      LocalStore.appendHistory(text);
    },
    [activeMessage, activeLanguage, speechRate]
  );

  const handlePauseResume = () => {
    if (isSpeaking && !isPaused) {
      tts.pause();
      setIsPaused(true);
    } else if (isPaused) {
      tts.resume();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    tts.stop();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleRepeatLast = () => {
    if (lastSpokenMessage) {
      handleSpeak(lastSpokenMessage);
    } else {
      tts.repeatLast();
    }
  };

  const handleClear = () => {
    setActiveMessage("");
  };

  const handleSavePhrase = () => {
    if (!activeMessage.trim()) return;
    try {
      const stored = localStorage.getItem("gazeconnect_saved_phrases");
      const phrases: Array<{
        id: string;
        phrase: string;
        category: string;
        is_favorite: boolean;
        created_at: string;
      }> = stored ? JSON.parse(stored) : [];
      phrases.push({
        id: "phrase_" + Date.now(),
        phrase: activeMessage.trim(),
        category: "Daily Needs",
        is_favorite: true,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("gazeconnect_saved_phrases", JSON.stringify(phrases));
      setSaveSuccessMessage("Phrase saved to favourites!");
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (e) {
      console.error("Failed to save phrase", e);
    }
  };

  const fontClass = {
    md: "text-xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
  }[fontSize];

  void blinkProgress;
  void isBlinkHolding;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isHighContrast
          ? "bg-slate-950 text-slate-100"
          : "bg-ice-50 text-slate-900"
      }`}
    >
      <Navbar
        interactionMode={interactionMode}
        onToggleInteractionMode={(mode) => setInteractionMode(mode)}
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
      />

      {/* Full-width edge-to-edge workspace layout with px-4 md:px-6 */}
      <main className="flex-1 w-full max-w-none px-4 md:px-6 py-3 flex flex-col gap-3">
        {/* Top Camera & Calibration Status Strip */}
        <section
          className={`px-4 py-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
            isHighContrast
              ? "bg-slate-900 border-slate-800 text-slate-200"
              : "bg-white border-slate-200 shadow-sm text-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold">
              <Camera className="w-4 h-4 text-teal-500" />
              <span>Camera Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold ${
                  cameraStatus === "ready"
                    ? isHighContrast ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-emerald-100 text-emerald-800"
                    : cameraStatus === "blink_ignored"
                    ? isHighContrast ? "bg-amber-950 text-amber-300 border border-amber-800" : "bg-amber-100 text-amber-800"
                    : isHighContrast ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-rose-100 text-rose-800"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cameraStatus === "ready"
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                {cameraStatus === "ready"
                  ? "Face & Eyes Detected"
                  : cameraStatus === "blink_ignored"
                  ? "Blink Ignored"
                  : "Searching for Face..."}
              </span>
            </div>

            {calibrationScore !== null && (
              <span className={`hidden sm:inline ${isHighContrast ? "text-slate-400" : "text-slate-500"}`}>
                Calibration:{" "}
                <strong className="text-teal-500 font-black">
                  {calibrationScore}% accuracy
                </strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-dwell="true"
              aria-label="Calibrate Gaze — open 9-point calibration"
              onClick={() => setShowCalibrationModal(true)}
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-all min-h-[38px] shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Calibrate Gaze (9-Point)</span>
            </button>

            <button
              type="button"
              data-dwell="true"
              aria-label={showCameraPreview ? "Hide Camera Preview" : "Show Camera Preview"}
              onClick={() => setShowCameraPreview(!showCameraPreview)}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all min-h-[38px] ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
              }`}
            >
              {showCameraPreview ? "Hide Camera" : "Show Camera"}
            </button>

            <button
              type="button"
              data-dwell="true"
              aria-label={showLandmarksDebug ? "Hide Iris Debug Mesh" : "Show Iris Debug Mesh"}
              onClick={() => setShowLandmarksDebug(!showLandmarksDebug)}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all hidden md:inline min-h-[38px] ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
              }`}
            >
              {showLandmarksDebug ? "Hide Iris Mesh" : "Debug Mesh"}
            </button>

            <button
              type="button"
              data-dwell="true"
              aria-label={showEyeDiagnostics ? "Hide Eye Diagnostics HUD" : "Show Eye Diagnostics HUD"}
              onClick={() => setShowEyeDiagnostics(!showEyeDiagnostics)}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all flex items-center gap-1 min-h-[38px] ${
                showEyeDiagnostics
                  ? isHighContrast
                    ? "bg-teal-950/70 border-teal-700 text-teal-300"
                    : "bg-teal-50 border-teal-400 text-teal-800"
                  : isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-teal-500" />
              <span>
                {showEyeDiagnostics ? "Hide Diagnostics" : "Diagnostics"}
              </span>
            </button>
          </div>
        </section>

        {/* Live Eye Position Diagnostics HUD */}
        {showEyeDiagnostics && (
          <section
            className={`px-4 py-2 rounded-2xl border transition-all text-xs flex flex-wrap items-center justify-between gap-3 ${
              isHighContrast
                ? "bg-slate-900 border-slate-800 text-slate-200 shadow-sm"
                : "bg-white border-teal-200/90 shadow-sm text-slate-700"
            }`}
          >
            {/* Eye 1: Left Iris */}
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isHighContrast ? "text-slate-400" : "text-slate-500"}`}>Left Eye:</span>
              <div className={`flex items-center gap-1.5 font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                isHighContrast ? "bg-slate-800 text-teal-300" : "bg-slate-100 text-teal-700"
              }`}>
                <span className={isHighContrast ? "text-slate-500" : "text-slate-400"}>H:</span>
                <span>{latestEyeFeatures ? `${(latestEyeFeatures.leftIrisRatioX * 100).toFixed(0)}%` : "--"}</span>
                <span className={isHighContrast ? "text-slate-500" : "text-slate-400"}>V:</span>
                <span>{latestEyeFeatures ? `${(latestEyeFeatures.leftIrisRatioY * 100).toFixed(0)}%` : "--"}</span>
              </div>
            </div>

            {/* Eye 2: Right Iris */}
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isHighContrast ? "text-slate-400" : "text-slate-500"}`}>Right Eye:</span>
              <div className={`flex items-center gap-1.5 font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                isHighContrast ? "bg-slate-800 text-teal-300" : "bg-slate-100 text-teal-700"
              }`}>
                <span className={isHighContrast ? "text-slate-500" : "text-slate-400"}>H:</span>
                <span>{latestEyeFeatures ? `${(latestEyeFeatures.rightIrisRatioX * 100).toFixed(0)}%` : "--"}</span>
                <span className={isHighContrast ? "text-slate-500" : "text-slate-400"}>V:</span>
                <span>{latestEyeFeatures ? `${(latestEyeFeatures.rightIrisRatioY * 100).toFixed(0)}%` : "--"}</span>
              </div>
            </div>

            {/* Gaze Target Coordinates */}
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isHighContrast ? "text-slate-400" : "text-slate-500"}`}>Gaze:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                isHighContrast ? "bg-blue-950 text-blue-300 border border-blue-800" : "text-blue-600 bg-blue-50"
              }`}>
                {gazePoint ? `${Math.round(gazePoint.x)}px, ${Math.round(gazePoint.y)}px` : "Searching..."}
              </span>
            </div>

            {/* Active Hover Target */}
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isHighContrast ? "text-slate-400" : "text-slate-500"}`}>Target:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  hoveredDwellLabel
                    ? "bg-teal-600 text-white shadow-sm"
                    : isHighContrast ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-400"
                }`}
              >
                {hoveredDwellLabel ? `🎯 ${hoveredDwellLabel}` : "Looking at Screen"}
              </span>
              {dwellProgress > 0 && (
                <span className="font-mono text-teal-500 font-bold text-[11px]">
                  {(dwellProgress * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Calibration Mode Indicator */}
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${
              isHighContrast ? "text-slate-400" : "text-slate-500"
            }`}>
              <span
                className={`w-2 h-2 rounded-full ${
                  calibrationScore !== null ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
                }`}
              />
              <span>
                {calibrationScore !== null ? `Piecewise Hybrid (${calibrationScore}%)` : "Uncalibrated Center Lock"}
              </span>
            </div>
          </section>
        )}

        {/* Message Composer & Main Action Bar */}
        <section
          className={`p-4 rounded-3xl border flex flex-col gap-3 ${
            isHighContrast
              ? "bg-slate-900 border-slate-800 text-slate-100 shadow-xl"
              : "bg-white border-slate-200 shadow-md text-slate-900"
          }`}
        >
          {/* Active Message Text Display */}
          <div className="relative">
            <div
              className={`w-full min-h-[84px] p-4 rounded-2xl border font-bold leading-relaxed flex items-center justify-between ${
                isHighContrast
                  ? "bg-slate-950 border-slate-800 text-slate-100"
                  : "bg-ice-50 border-slate-200 text-slate-900 shadow-inner"
              } ${fontClass}`}
              aria-live="polite"
              aria-label="Active composed message"
            >
              {activeMessage ? (
                <span>{activeMessage}</span>
              ) : (
                <span className={`font-normal italic text-lg sm:text-xl ${
                  isHighContrast ? "text-slate-500" : "text-slate-400"
                }`}>
                  Gaze at keys below or select quick phrases to start composing...
                </span>
              )}

              {saveSuccessMessage && (
                <span className="absolute top-2 right-3 text-xs bg-emerald-600 text-white px-2 py-1 rounded shadow animate-fade-in">
                  {saveSuccessMessage}
                </span>
              )}
            </div>
          </div>

          {/* Large Gaze-Selectable Action Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
            {/* SPEAK */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Speak active message aloud"
              onClick={() => handleSpeak()}
              disabled={!activeMessage.trim()}
              className="h-14 min-h-[56px] rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 transition-all shadow-md active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
              <span>SPEAK</span>
            </button>

            {/* PAUSE / RESUME */}
            <button
              type="button"
              data-dwell="true"
              aria-label={isPaused ? "Resume speech" : "Pause speech"}
              onClick={handlePauseResume}
              disabled={!isSpeaking}
              className={`h-14 min-h-[56px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all border ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-emerald-500" />
              ) : (
                <Pause className="w-4 h-4 text-amber-500" />
              )}
              <span>{isPaused ? "RESUME" : "PAUSE"}</span>
            </button>

            {/* STOP */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Stop speech"
              onClick={handleStop}
              disabled={!isSpeaking}
              className={`h-14 min-h-[56px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all border ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              <VolumeX className="w-4 h-4 text-rose-500" />
              <span>STOP</span>
            </button>

            {/* REPEAT LAST */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Repeat last spoken message"
              onClick={handleRepeatLast}
              disabled={!lastSpokenMessage}
              className={`h-14 min-h-[56px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all border ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              <RotateCcw className="w-4 h-4 text-teal-500" />
              <span>REPEAT</span>
            </button>

            {/* CLEAR */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Clear composed message"
              onClick={handleClear}
              disabled={!activeMessage}
              className={`h-14 min-h-[56px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all border ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>CLEAR</span>
            </button>

            {/* SAVE PHRASE */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Save phrase to favourites"
              onClick={handleSavePhrase}
              disabled={!activeMessage.trim()}
              className={`h-14 min-h-[56px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all border ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              <BookmarkPlus className="w-4 h-4 text-blue-500" />
              <span>SAVE</span>
            </button>

            {/* EMERGENCY MODE */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Open emergency communication panel"
              onClick={() => setActiveTab("emergency")}
              className="col-span-2 sm:col-span-1 h-14 min-h-[56px] rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-600/30 border border-rose-500 animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>EMERGENCY</span>
            </button>
          </div>
        </section>

        {/* AI Sentence Assistance Bar */}
        <PredictionBar
          activeText={activeMessage}
          activeLanguage={activeLanguage}
          onUseSentence={(sentence) => setActiveMessage(sentence)}
          onAppendSentence={(sentence) =>
            setActiveMessage((prev) =>
              prev ? `${prev} ${sentence}` : sentence
            )
          }
          isHighContrast={isHighContrast}
        />

        {/* Workspace Mode Navigation Tabs */}
        <nav
          className="flex items-center gap-2 border-b pb-2 overflow-x-auto border-slate-200 dark:border-slate-800"
          role="tablist"
          aria-label="Workspace Tabs"
        >
          {[
            { id: "keyboard", label: "Virtual Keyboard", icon: Keyboard },
            { id: "phrases", label: "Quick Phrases", icon: Grid },
            { id: "emergency", label: "Emergency", icon: HeartPulse },
            { id: "facetoface", label: "Face-to-Face Mode", icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isTabEmergency = tab.id === "emergency";
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={`Switch to ${tab.label} tab`}
                data-dwell="true"
                onClick={() =>
                  setActiveTab(
                    tab.id as "keyboard" | "phrases" | "emergency" | "facetoface"
                  )
                }
                className={`flex items-center gap-2 px-5 py-2.5 min-h-[52px] rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? isTabEmergency
                      ? "bg-rose-600 text-white shadow"
                      : "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                    : isTabEmergency
                    ? isHighContrast
                      ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                      : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                    : isHighContrast
                    ? "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content Panes */}
        <section className="flex-1 flex flex-col">
          {activeTab === "keyboard" && (
            <VirtualKeyboard
              activeText={activeMessage}
              onTextChange={(newText) => setActiveMessage(newText)}
              onSpeakRequested={() => handleSpeak()}
              isHighContrast={isHighContrast}
            />
          )}

          {activeTab !== "keyboard" && (
            <QuickPanels
              activeTab={activeTab as "phrases" | "emergency" | "facetoface"}
              activeMessage={activeMessage}
              onSelectPhrase={(phrase) => setActiveMessage(phrase)}
              isHighContrast={isHighContrast}
            />
          )}
        </section>
      </main>

      {/* 9-Point Calibration Modal */}
      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        latestFeatures={latestEyeFeatures}
        onCalibrationComplete={(model) => {
          setCalibrationModel(model);
          setCalibrationScore(model.report.stabilityScore);
        }}
      />
    </div>
  );
}
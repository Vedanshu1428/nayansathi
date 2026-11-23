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
    isDwellCoolingDown,
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
    // The dwell engine inside GazeProvider fires click events; we just display
    // the aria-label of whatever element is under the gaze cursor via DOM hit-test.
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

  // Suppress unused-variable warnings for blinkProgress / isBlinkHolding
  // (they are available from context for child components that may need them)
  void blinkProgress;
  void isBlinkHolding;

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast
          ? "bg-black text-yellow-400"
          : "bg-ice-50 text-navy-900"
      }`}
    >
      <Navbar
        interactionMode={interactionMode}
        onToggleInteractionMode={(mode) => setInteractionMode(mode)}
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col gap-4">
        {/* Top Camera & Calibration Status Strip */}
        <section
          className={`px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
            isHighContrast
              ? "bg-neutral-900 border-yellow-400 text-yellow-300"
              : "bg-white border-slate-200 shadow-sm text-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-bold">
              <Camera className="w-4 h-4 text-teal-600" />
              <span>Camera Status:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold ${
                  cameraStatus === "ready"
                    ? "bg-emerald-100 text-emerald-800"
                    : cameraStatus === "blink_ignored"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
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
              <span className="hidden sm:inline text-slate-500">
                Calibration:{" "}
                <strong className="text-teal-600">
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
              className="px-3 py-1.5 rounded-lg font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-all min-h-[36px]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Calibrate Gaze (9-Point)</span>
            </button>

            <button
              type="button"
              data-dwell="true"
              aria-label={showCameraPreview ? "Hide Camera Preview" : "Show Camera Preview"}
              onClick={() => setShowCameraPreview(!showCameraPreview)}
              className="px-2.5 py-1.5 rounded-lg font-semibold text-xs border border-slate-300 hover:bg-slate-100 transition-all min-h-[36px]"
            >
              {showCameraPreview ? "Hide Camera" : "Show Camera"}
            </button>

            <button
              type="button"
              data-dwell="true"
              aria-label={showLandmarksDebug ? "Hide Iris Debug Mesh" : "Show Iris Debug Mesh"}
              onClick={() => setShowLandmarksDebug(!showLandmarksDebug)}
              className="px-2.5 py-1.5 rounded-lg font-semibold text-xs border border-slate-300 hover:bg-slate-100 transition-all hidden md:inline min-h-[36px]"
            >
              {showLandmarksDebug ? "Hide Iris Mesh" : "Debug Mesh"}
            </button>

            <button
              type="button"
              data-dwell="true"
              aria-label={showEyeDiagnostics ? "Hide Eye Diagnostics HUD" : "Show Eye Diagnostics HUD"}
              onClick={() => setShowEyeDiagnostics(!showEyeDiagnostics)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-all flex items-center gap-1 min-h-[36px] ${
                showEyeDiagnostics
                  ? "bg-teal-50 border-teal-400 text-teal-800"
                  : "border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {showEyeDiagnostics ? "Hide Eye Diagnostics" : "Eye Diagnostics"}
              </span>
            </button>
          </div>
        </section>

        {/* Live Eye Position Diagnostics HUD */}
        {showEyeDiagnostics && (
          <section
            className={`px-4 py-2.5 rounded-xl border transition-all text-xs flex flex-wrap items-center justify-between gap-3 ${
              isHighContrast
                ? "bg-neutral-900 border-yellow-400 text-yellow-300"
                : "bg-white border-teal-200/90 shadow-sm text-slate-700"
            }`}
          >
            {/* Eye 1: Left Iris */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Left Eye:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                <span className="text-slate-400">H:</span>
                <span className="text-teal-700">
                  {latestEyeFeatures
                    ? `${(latestEyeFeatures.leftIrisRatioX * 100).toFixed(0)}%`
                    : "--"}
                </span>
                <span className="text-slate-400">V:</span>
                <span className="text-teal-700">
                  {latestEyeFeatures
                    ? `${(latestEyeFeatures.leftIrisRatioY * 100).toFixed(0)}%`
                    : "--"}
                </span>
              </div>
            </div>

            {/* Eye 2: Right Iris */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Right Eye:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                <span className="text-slate-400">H:</span>
                <span className="text-teal-700">
                  {latestEyeFeatures
                    ? `${(latestEyeFeatures.rightIrisRatioX * 100).toFixed(0)}%`
                    : "--"}
                </span>
                <span className="text-slate-400">V:</span>
                <span className="text-teal-700">
                  {latestEyeFeatures
                    ? `${(latestEyeFeatures.rightIrisRatioY * 100).toFixed(0)}%`
                    : "--"}
                </span>
              </div>
            </div>

            {/* Gaze Target Coordinates */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Gaze Coord:</span>
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                {gazePoint
                  ? `${Math.round(gazePoint.x)}px, ${Math.round(gazePoint.y)}px`
                  : "Searching..."}
              </span>
            </div>

            {/* Active Hover Target */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Target:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  hoveredDwellLabel
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {hoveredDwellLabel
                  ? `🎯 ${hoveredDwellLabel}`
                  : "Looking at Screen"}
              </span>
              {dwellProgress > 0 && (
                <span className="font-mono text-teal-600 font-bold text-[11px]">
                  {(dwellProgress * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Calibration Mode Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  calibrationScore !== null
                    ? "bg-emerald-500"
                    : "bg-blue-500 animate-pulse"
                }`}
              />
              <span>
                {calibrationScore !== null
                  ? `9-Point (${calibrationScore}%)`
                  : "Instant Geometric Gaze"}
              </span>
            </div>
          </section>
        )}

        {/* Uncalibrated guidance banner */}
        {calibrationScore === null && (
          <div className="px-4 py-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>First time here?</strong> Please run the{" "}
                <strong>9-Point Calibration</strong> so GazeConnect can map
                your eye movements accurately to your screen. Manual mouse and
                keyboard clicks work anytime.
              </span>
            </div>
            <button
              type="button"
              data-dwell="true"
              aria-label="Start 9-Point Gaze Calibration"
              onClick={() => setShowCalibrationModal(true)}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex-shrink-0 transition-all shadow min-h-[36px]"
            >
              Start Calibration
            </button>
          </div>
        )}

        {/* Message Composer & Main Action Bar */}
        <section
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-3 ${
            isHighContrast
              ? "bg-black border-yellow-400"
              : "bg-white border-slate-200 shadow-md"
          }`}
        >
          {/* Active Message Text Display */}
          <div className="relative">
            <div
              className={`w-full min-h-[96px] p-4 rounded-xl border font-bold leading-relaxed flex items-center justify-between ${
                isHighContrast
                  ? "bg-neutral-950 border-yellow-400 text-yellow-300"
                  : "bg-ice-50 border-slate-200 text-slate-900 shadow-inner"
              } ${fontClass}`}
              aria-live="polite"
              aria-label="Active composed message"
            >
              {activeMessage ? (
                <span>{activeMessage}</span>
              ) : (
                <span className="text-slate-400 font-normal italic text-lg sm:text-xl">
                  Gaze at keys below or select quick phrases to start
                  composing...
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
              className="h-16 min-h-[60px] rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:hover:bg-teal-600 transition-all shadow-md active:scale-95"
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
              className="h-16 min-h-[60px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-all border border-slate-300"
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-emerald-600" />
              ) : (
                <Pause className="w-4 h-4 text-amber-600" />
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
              className="h-16 min-h-[60px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-all border border-slate-300"
            >
              <VolumeX className="w-4 h-4 text-red-500" />
              <span>STOP</span>
            </button>

            {/* REPEAT LAST */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Repeat last spoken message"
              onClick={handleRepeatLast}
              disabled={!lastSpokenMessage}
              className="h-16 min-h-[60px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-all border border-slate-300"
            >
              <RotateCcw className="w-4 h-4 text-teal-600" />
              <span>REPEAT</span>
            </button>

            {/* CLEAR */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Clear composed message"
              onClick={handleClear}
              disabled={!activeMessage}
              className="h-16 min-h-[60px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-all border border-slate-300"
            >
              <Trash2 className="w-4 h-4 text-slate-600" />
              <span>CLEAR</span>
            </button>

            {/* SAVE PHRASE */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Save phrase to favourites"
              onClick={handleSavePhrase}
              disabled={!activeMessage.trim()}
              className="h-16 min-h-[60px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-all border border-slate-300"
            >
              <BookmarkPlus className="w-4 h-4 text-blue-600" />
              <span>SAVE</span>
            </button>

            {/* EMERGENCY MODE */}
            <button
              type="button"
              data-dwell="true"
              aria-label="Open emergency communication panel"
              onClick={() => setActiveTab("emergency")}
              className="col-span-2 sm:col-span-1 h-16 min-h-[60px] rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-red-600/30 border border-red-500 animate-pulse"
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
          className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto"
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
                className={`flex items-center gap-2 px-5 py-3 min-h-[60px] rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? isTabEmergency
                      ? "bg-red-600 text-white shadow"
                      : isHighContrast
                      ? "bg-yellow-400 text-black shadow"
                      : "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                    : isTabEmergency
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
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

      {/* 9-Point Ridge Regression Calibration Modal */}
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

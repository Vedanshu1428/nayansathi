"use client";

import React, { useState } from "react";
import Navbar from "@/components/ui/Navbar";
import {
  Eye,
  Volume2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Heart,
  Laptop,
  Users,
  Zap,
  CheckCircle2,
  Activity,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [simulatedText, setSimulatedText] = useState("I would like some water please.");
  const [isSpeakingSimulation, setIsSpeakingSimulation] = useState(false);

  const handleSimulateSpeak = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingSimulation(true);
      const utterance = new SpeechSynthesisUtterance(simulatedText);
      utterance.onend = () => setIsSpeakingSimulation(false);
      utterance.onerror = () => setIsSpeakingSimulation(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isHighContrast ? "bg-slate-950 text-slate-100" : "bg-ice-50 text-slate-900"
    }`}>
      <Navbar
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
      />

      {/* Hero Section — Clean Edge-to-Edge Without Clipping / Overlap */}
      <section className={`relative w-full py-12 lg:py-20 border-b transition-colors ${
        isHighContrast ? "bg-slate-900/60 border-slate-800" : "bg-white/80 border-slate-200"
      }`}>
        <div className="w-full px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                isHighContrast
                  ? "bg-teal-950/60 border-teal-700/60 text-teal-300"
                  : "bg-teal-50 border-teal-200 text-teal-800"
              }`}>
                <Sparkles className="w-4 h-4 text-teal-500" />
                <span>Next-Generation In-Browser AAC Technology</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Your Eyes. <br />
                <span className="text-teal-600 dark:text-teal-400">Your Voice.</span> <br />
                Your Freedom.
              </h1>

              <p className={`text-lg sm:text-xl font-medium leading-relaxed max-w-2xl ${
                isHighContrast ? "text-slate-300" : "text-slate-600"
              }`}>
                Break the barrier of speech and motor paralysis. GazeConnect turns any standard consumer webcam into a clinical-grade, AI-assisted communication system for ALS, cerebral palsy, and spinal cord injury warriors—zero expensive specialized hardware required.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="/communicate"
                  data-dwell="true"
                  className="inline-flex items-center gap-2.5 px-6 py-4 rounded-2xl font-black text-base bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Eye className="w-5 h-5" />
                  <span>Start Communicating Now</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="/auth"
                  data-dwell="true"
                  className={`inline-flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base border shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    isHighContrast
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100"
                      : "bg-white hover:bg-slate-50 border-slate-300 text-slate-800"
                  }`}
                >
                  <Users className="w-5 h-5 text-teal-500" />
                  <span>Patient & Caregiver Portal</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className={`pt-4 flex flex-wrap items-center gap-6 text-xs font-semibold ${
                isHighContrast ? "text-slate-400" : "text-slate-500"
              }`}>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                  <span>100% Local In-Browser Camera Privacy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Works 100% Offline When Needed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-blue-500" />
                  <span>Standard USB or Built-in Webcam</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive UI Preview Simulation */}
            <div className="lg:col-span-5">
              <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
                isHighContrast
                  ? "bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80"
                  : "bg-white border-slate-200 text-slate-900 shadow-slate-200/50"
              }`}>
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isHighContrast ? "border-slate-800" : "border-slate-100"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold ml-2">Interactive Simulation Card</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    isHighContrast ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                  }`}>
                    Preview
                  </span>
                </div>

                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${
                    isHighContrast ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Message Composer Simulation
                  </label>
                  <div className={`p-4 rounded-2xl border min-h-[72px] text-lg font-bold flex items-center ${
                    isHighContrast
                      ? "bg-slate-950 border-slate-800 text-slate-100"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}>
                    {simulatedText}
                  </div>
                </div>

                {/* AI Sentence Suggestions Simulation */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gemini AI Sentence Completions
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "I would like some water please.",
                      "Could you please adjust my position?",
                      "Thank you, I am doing fine.",
                    ].map((phrase, i) => (
                      <button
                        key={i}
                        type="button"
                        data-dwell="true"
                        onClick={() => setSimulatedText(phrase)}
                        className={`text-left p-3 rounded-xl text-xs font-semibold border transition-all ${
                          simulatedText === phrase
                            ? isHighContrast
                              ? "bg-teal-950/70 border-teal-500 text-teal-300"
                              : "bg-teal-50 border-teal-500 text-teal-900"
                            : isHighContrast
                            ? "bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    data-dwell="true"
                    onClick={handleSimulateSpeak}
                    disabled={isSpeakingSimulation}
                    className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeakingSimulation ? "animate-pulse" : ""}`} />
                    <span>{isSpeakingSimulation ? "Speaking..." : "Speak Text (TTS)"}</span>
                  </button>
                  <button
                    type="button"
                    data-dwell="true"
                    onClick={() => setSimulatedText("")}
                    className={`px-4 py-3.5 rounded-xl font-semibold text-sm border ${
                      isHighContrast
                        ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                        : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Props Section */}
      <section className={`w-full py-16 border-b transition-colors ${
        isHighContrast ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
      }`}>
        <div className="w-full px-4 md:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${
              isHighContrast ? "text-slate-100" : "text-slate-900"
            }`}>
              Eliminating the Hardware Barrier for ALS & Motor Disabilities
            </h2>
            <p className={`text-base leading-relaxed font-medium ${
              isHighContrast ? "text-slate-400" : "text-slate-600"
            }`}>
              Traditional dedicated eye-tracking devices cost between $5,000 and $15,000, requiring specialized infrared bars and proprietary software. GazeConnect brings clinical-grade communication to any laptop, desktop, or tablet using standard consumer webcams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-3xl border space-y-3 ${
              isHighContrast ? "bg-slate-900 border-slate-800" : "bg-ice-50 border-slate-200"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold ${isHighContrast ? "text-slate-100" : "text-slate-900"}`}>
                Built for Severe Motor Impairments
              </h3>
              <p className={`text-sm leading-relaxed ${isHighContrast ? "text-slate-400" : "text-slate-600"}`}>
                Specifically optimized for individuals living with ALS, locked-in syndrome, cerebral palsy, and high-level spinal cord injuries who retain voluntary eye movements.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-3 ${
              isHighContrast ? "bg-slate-900 border-slate-800" : "bg-ice-50 border-slate-200"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold ${isHighContrast ? "text-slate-100" : "text-slate-900"}`}>
                Zero Proprietary Hardware
              </h3>
              <p className={`text-sm leading-relaxed ${isHighContrast ? "text-slate-400" : "text-slate-600"}`}>
                Uses your laptop&apos;s standard webcam. Advanced machine learning detects 478 3D facial landmarks and 3D eye blendshapes locally in browser WebAssembly.
              </p>
            </div>

            <div className={`p-6 rounded-3xl border space-y-3 ${
              isHighContrast ? "bg-slate-900 border-slate-800" : "bg-ice-50 border-slate-200"
            }`}>
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className={`text-lg font-bold ${isHighContrast ? "text-slate-100" : "text-slate-900"}`}>
                Gemini AI Accelerated Typing
              </h3>
              <p className={`text-sm leading-relaxed ${isHighContrast ? "text-slate-400" : "text-slate-600"}`}>
                Typing letter-by-letter with gaze can cause eye fatigue. With offline lexicon and Gemini Flash completions, gaze users select full natural sentences in one dwell.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Gaze Launch Card */}
      <section className={`w-full py-14 text-center ${
        isHighContrast ? "bg-slate-900 border-b border-slate-800" : "bg-slate-100/70 border-b border-slate-200"
      }`}>
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl font-black">Ready to Start Speaking with Your Eyes?</h2>
          <p className={isHighContrast ? "text-slate-300" : "text-slate-600"}>
            No download or registration required to test. Calibrate your webcam in 10 seconds and communicate hands-free.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/communicate"
              data-dwell="true"
              className="px-8 py-4 rounded-2xl font-black text-base bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-600/30 transition-all hover:scale-105"
            >
              Open Communication Board
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
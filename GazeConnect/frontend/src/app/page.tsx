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
  CheckCircle2,
  Laptop,
  Users,
  Lock,
  Zap,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function LandingPage() {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [simulatedText, setSimulatedText] = useState("I would like some water please.");
  const [isSpeakingSimulation, setIsSpeakingSimulation] = useState(false);

  const handleSimulateSpeak = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Clear any hung Chromium audio queues
      setIsSpeakingSimulation(true);
      const utterance = new SpeechSynthesisUtterance(simulatedText);
      utterance.onend = () => setIsSpeakingSimulation(false);
      utterance.onerror = () => setIsSpeakingSimulation(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isHighContrast ? "bg-black text-yellow-400" : "bg-ice-50 text-navy-900"}`}>
      <Navbar
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Next-Generation In-Browser AAC Technology</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Your Eyes. <br />
                <span className="text-teal-600">Your Voice.</span> <br />
                Your Freedom.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl">
                Break the barrier of speech and motor paralysis. GazeConnect turns any standard consumer webcam into a clinical-grade, AI-assisted communication system for ALS, cerebral palsy, and spinal cord injury warriors—zero expensive specialized hardware required.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href="/communicate"
                  data-dwell="true"
                  className="inline-flex items-center gap-2.5 px-6 py-4 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Eye className="w-5 h-5" />
                  <span>Start Communicating Now</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href="/auth"
                  data-dwell="true"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-base bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Patient & Caregiver Portal</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
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
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs font-bold text-slate-600 ml-2">Interactive Simulation Card</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                    Preview Only
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Message Composer Simulation
                  </label>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[72px] text-lg font-bold text-slate-800 flex items-center">
                    {simulatedText}
                  </div>
                </div>

                {/* AI Sentence Suggestions Simulation */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
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
                        className={`text-left p-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          simulatedText === phrase
                            ? "bg-teal-50 border-teal-500 text-teal-900"
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
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Volume2 className={`w-4 h-4 ${isSpeakingSimulation ? "animate-pulse" : ""}`} />
                    <span>{isSpeakingSimulation ? "Speaking Voice..." : "Speak Text (TTS)"}</span>
                  </button>
                  <button
                    type="button"
                    data-dwell="true"
                    onClick={() => setSimulatedText("")}
                    className="px-4 py-3 rounded-xl font-semibold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why GazeConnect: Overcoming the AAC Barrier */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Eliminating the Hardware Barrier for ALS & Motor Disabilities
            </h2>
            <p className="text-base text-slate-600 leading-relaxed font-medium">
              Traditional dedicated eye-tracking devices cost between $5,000 and $15,000, requiring specialized infrared bars and proprietary software. GazeConnect brings clinical-grade communication to any laptop, desktop, or tablet using standard consumer webcams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-ice-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Built for Severe Motor Impairments</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Specifically optimized for individuals living with ALS, locked-in syndrome, cerebral palsy, and high-level spinal cord injuries who retain voluntary eye movements.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-ice-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero Proprietary Hardware</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Uses your laptop&apos;s standard 720p or 1080p webcam. Advanced machine learning detects 478 3D facial landmarks and sub-millimeter iris shifts locally in browser WebAssembly.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-ice-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Gemini AI Accelerated Typing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Typing letter-by-letter with gaze can cause eye strain. With Gemini 2.5 Flash sentence assistance, gaze users type 2-3 keywords and select full, polite natural sentences in one dwell.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Workflow Breakdown */}
      <section className="py-16 bg-ice-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
              How It Works
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              From Eye Movement to Spoken Voice in 4 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Look & Calibrate",
                desc: "Follow 9 on-screen dots for 10 seconds. Polynomial Ridge Regression maps your unique iris physiology to screen coordinates with validation scoring.",
                icon: Eye,
              },
              {
                step: "2",
                title: "Gaze Typing & Dwell",
                desc: "Look steadily at any key or phrase card. An adaptive 1-Euro filter eliminates micro-tremors, triggering selection via visual radial progress ring.",
                icon: Activity,
              },
              {
                step: "3",
                title: "Gemini AI Completion",
                desc: "Type a couple of keywords (e.g., 'water hungry'). Gemini 2.5 Flash instantly suggests full natural phrases to minimize eye fatigue.",
                icon: Sparkles,
              },
              {
                step: "4",
                title: "Instant Voice Output",
                desc: "One dwell on SPEAK sends natural vocal audio through the device speakers via Web SpeechSynthesis, supporting English, Hindi, Spanish, and Chinese.",
                icon: Volume2,
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-extrabold text-sm">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-3xl font-black text-slate-200">0{card.step}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">{card.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dedicated Privacy-First Architecture Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="p-8 rounded-3xl bg-teal-900 text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-800 text-teal-200 border border-teal-700">
              <Lock className="w-3.5 h-3.5" />
              <span>100% Client-Side Privacy Guarantee</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              Your Camera Never Leaves Your Computer.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-teal-100 text-sm">
              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  Zero Video Recording
                </h4>
                <p>
                  Camera frames are captured directly in volatile browser memory and processed frame-by-frame. No video is ever saved or recorded.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  100% In-Browser ML
                </h4>
                <p>
                  All 478 face landmarks and iris coordinates are extracted locally using Google MediaPipe WebAssembly. No biometrics are transmitted.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  Consent-Gated History
                </h4>
                <p>
                  Communication history is saved strictly when you opt in. Caregivers can only access logs when granted explicit patient permission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-200">GazeConnect</span>
            <span>— Your Eyes. Your Voice. Your Freedom.</span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-500">
            Open-source Assistive Technology. Not a certified clinical life-support or diagnostic device.
          </div>
        </div>
      </footer>
    </div>
  );
}

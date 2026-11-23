"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Eye,
  MousePointer,
  Wifi,
  WifiOff,
  AlertTriangle,
  SunMoon,
  Menu,
  X,
  Volume2,
} from "lucide-react";

interface NavbarProps {
  interactionMode?: "gaze" | "mouse";
  onToggleInteractionMode?: (mode: "gaze" | "mouse") => void;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
}

export default function Navbar({
  interactionMode = "gaze",
  onToggleInteractionMode,
  isHighContrast = false,
  onToggleHighContrast,
}: NavbarProps) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<"gaze" | "mouse">(interactionMode);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      const savedMode = localStorage.getItem("gazeconnect_interaction_mode");
      if (savedMode === "gaze" || savedMode === "mouse") {
        setCurrentMode(savedMode);
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleModeSwitch = (mode: "gaze" | "mouse") => {
    setCurrentMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_interaction_mode", mode);
      window.dispatchEvent(new CustomEvent("gazeconnect_mode_changed", { detail: { mode } }));
    }
    if (onToggleInteractionMode) {
      onToggleInteractionMode(mode);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Communicate", href: "/communicate" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Caregiver", href: "/caregiver" },
    { label: "Sign In", href: "/auth" },
  ];

  return (
    <header className={`w-full sticky top-0 z-40 transition-colors border-b ${
      isHighContrast
        ? "bg-black border-yellow-400 text-yellow-400"
        : "bg-white/95 backdrop-blur border-slate-200 text-slate-800 shadow-sm"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              data-dwell="true"
              className="flex items-center gap-2.5 font-bold text-xl tracking-tight focus:outline-none"
            >
              <div className={`p-2 rounded-xl flex items-center justify-center ${
                isHighContrast ? "bg-yellow-400 text-black" : "bg-teal-600 text-white shadow-md shadow-teal-600/20"
              }`}>
                <Eye className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="leading-none text-lg font-black tracking-tight">
                  GazeConnect
                </span>
                <span className={`text-[10px] tracking-wide font-medium ${
                  isHighContrast ? "text-yellow-300" : "text-slate-500"
                }`}>
                  Your Eyes. Your Voice.
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  data-dwell="true"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? isHighContrast
                        ? "bg-yellow-400 text-black"
                        : "bg-teal-50 text-teal-700 font-bold border border-teal-200"
                      : isHighContrast
                      ? "hover:bg-neutral-800 text-yellow-400"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Controls: Mode Toggle, Online Pill, High Contrast, Emergency */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Gaze vs Mouse Toggle */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isHighContrast ? "border-yellow-400 bg-neutral-900" : "border-slate-200 bg-slate-100"
              }`}
              role="group"
              aria-label="Interaction Mode Toggle"
            >
              <button
                type="button"
                data-dwell="true"
                onClick={() => handleModeSwitch("gaze")}
                aria-pressed={currentMode === "gaze"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentMode === "gaze"
                    ? isHighContrast
                      ? "bg-yellow-400 text-black shadow"
                      : "bg-teal-600 text-white shadow-sm"
                    : isHighContrast
                    ? "text-yellow-300 hover:text-yellow-100"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Gaze Tracking Mode (Webcam eye-tracking + dwell selection)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gaze Mode</span>
              </button>
              <button
                type="button"
                data-dwell="true"
                onClick={() => handleModeSwitch("mouse")}
                aria-pressed={currentMode === "mouse"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentMode === "mouse"
                    ? isHighContrast
                      ? "bg-yellow-400 text-black shadow"
                      : "bg-slate-800 text-white shadow-sm"
                    : isHighContrast
                    ? "text-yellow-300 hover:text-yellow-100"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Manual Mode (Mouse clicks & touch taps fallback)"
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Manual Mode</span>
              </button>
            </div>

            {/* Online / Offline Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border ${
                isOnline
                  ? isHighContrast
                    ? "border-green-400 bg-green-950/40 text-green-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : isHighContrast
                  ? "border-amber-400 bg-amber-950/40 text-amber-300"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
              title={
                isOnline
                  ? "Connected: Cloud Gemini AI & Supabase Sync Active"
                  : "Offline: Webcam Tracking, Virtual Keyboard, Saved Phrases, Emergency & Speech remain active locally."
              }
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  <span className="hidden lg:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold">Offline Active</span>
                </>
              )}
            </div>

            {/* High Contrast Toggle Button */}
            {onToggleHighContrast && (
              <button
                type="button"
                data-dwell="true"
                onClick={onToggleHighContrast}
                className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                  isHighContrast
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
                title="Toggle High Contrast Mode"
                aria-label="Toggle High Contrast Mode"
              >
                <SunMoon className="w-4 h-4" />
              </button>
            )}

            {/* Emergency Button */}
            <a
              href="/communicate?tab=emergency"
              data-dwell="true"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/30 border border-red-500"
              title="Emergency Mode — Immediate Assistance"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>EMERGENCY</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-dwell="true"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  pathname === link.href
                    ? isHighContrast
                      ? "bg-yellow-400 text-black font-bold"
                      : "bg-teal-50 text-teal-700 font-bold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

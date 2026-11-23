"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGaze } from "@/components/gaze/GazeProvider";
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
  interactionMode: propInteractionMode,
  onToggleInteractionMode,
  isHighContrast = false,
  onToggleHighContrast,
}: NavbarProps) {
  const pathname = usePathname();
  let gazeCtx: ReturnType<typeof useGaze> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gazeCtx = useGaze();
  } catch {
    gazeCtx = null;
  }

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const effectiveMode = gazeCtx?.interactionMode ?? propInteractionMode ?? "gaze";
  const [currentMode, setCurrentMode] = useState<"gaze" | "mouse">(effectiveMode);

  useEffect(() => {
    if (gazeCtx?.interactionMode) {
      setCurrentMode(gazeCtx.interactionMode);
    }
  }, [gazeCtx?.interactionMode]);

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
        if (gazeCtx?.setInteractionMode) {
          gazeCtx.setInteractionMode(savedMode);
        }
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [gazeCtx]);

  const handleModeSwitch = (mode: "gaze" | "mouse") => {
    setCurrentMode(mode);
    if (gazeCtx?.setInteractionMode) {
      gazeCtx.setInteractionMode(mode);
    }
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
        ? "bg-slate-900/95 backdrop-blur border-slate-800 text-slate-100 shadow-lg"
        : "bg-white/95 backdrop-blur border-slate-200 text-slate-800 shadow-sm"
    }`}>
      {/* Edge-to-edge full width with px-4 md:px-6 */}
      <div className="w-full px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              data-dwell="true"
              className="flex items-center gap-2.5 font-bold text-xl tracking-tight focus:outline-none"
            >
              <div className="p-2 rounded-xl flex items-center justify-center bg-teal-600 text-white shadow-md shadow-teal-600/20">
                <Eye className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className={`leading-none text-lg font-black tracking-tight ${
                  isHighContrast ? "text-slate-100" : "text-slate-900"
                }`}>
                  GazeConnect
                </span>
                <span className={`text-[10px] tracking-wide font-medium ${
                  isHighContrast ? "text-slate-400" : "text-slate-500"
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
                        ? "bg-teal-900/50 text-teal-300 font-bold border border-teal-700/60"
                        : "bg-teal-50 text-teal-700 font-bold border border-teal-200"
                      : isHighContrast
                      ? "hover:bg-slate-800 text-slate-300 hover:text-slate-100"
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
                isHighContrast ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-100"
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
                    ? "bg-teal-600 text-white shadow-sm"
                    : isHighContrast
                    ? "text-slate-400 hover:text-slate-200"
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
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-slate-800 text-white shadow-sm"
                    : isHighContrast
                    ? "text-slate-400 hover:text-slate-200"
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
                    ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : isHighContrast
                  ? "border-amber-800 bg-amber-950/40 text-amber-300"
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
                  <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span className="hidden lg:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-bold">Offline</span>
                </>
              )}
            </div>

            {/* Dark Theme / Night Mode Toggle Button */}
            {onToggleHighContrast && (
              <button
                type="button"
                data-dwell="true"
                onClick={onToggleHighContrast}
                className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                  isHighContrast
                    ? "bg-slate-800 text-teal-400 border-slate-700 hover:bg-slate-700"
                    : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                }`}
                title="Toggle Slate Dark Theme"
                aria-label="Toggle Slate Dark Theme"
              >
                <SunMoon className="w-4 h-4" />
              </button>
            )}

            {/* Quick Emergency Button */}
            <a
              href="/communicate?tab=emergency"
              data-dwell="true"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
              title="Quick SOS Emergency Alert"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS</span>
            </a>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                data-dwell="true"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-bold ${
                  pathname === link.href
                    ? "bg-teal-50 text-teal-700"
                    : isHighContrast
                    ? "text-slate-200 hover:bg-slate-800"
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
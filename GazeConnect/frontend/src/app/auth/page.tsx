"use client";

import React, { useState } from "react";
import Navbar from "@/components/ui/Navbar";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [role, setRole] = useState<"patient" | "caregiver">("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const supabase = getSupabase();

    if (supabase && isSupabaseConfigured()) {
      try {
        if (mode === "signup") {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name: fullName, role },
            },
          });
          if (error) throw error;
          setMessage("Account created! Check your email to confirm registration.");
        } else if (mode === "login") {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          setMessage("Logged in successfully. Redirecting...");
          setTimeout(() => {
            window.location.href = role === "patient" ? "/communicate" : "/caregiver";
          }, 800);
        } else {
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) throw error;
          setMessage("Password reset instructions sent to your email.");
        }
      } catch (err: any) {
        setMessage(err.message || "Authentication failed. Please check your credentials.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local development fallback
      setTimeout(() => {
        setIsLoading(false);
        if (mode === "signup") {
          setMessage("Demo Account created! (Supabase credentials not configured in .env.local)");
        } else if (mode === "login") {
          setMessage("Logged in successfully. Redirecting to workspace...");
          setTimeout(() => {
            window.location.href = role === "patient" ? "/communicate" : "/caregiver";
          }, 800);
        } else {
          setMessage("Password reset instructions sent to your email.");
        }
      }, 600);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ice-50 text-navy-900">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              {mode === "login" && "Welcome to GazeConnect"}
              {mode === "signup" && "Create Your Account"}
              {mode === "recovery" && "Reset Your Password"}
            </h1>
            <p className="text-xs text-slate-500">
              {mode === "login" && "Sign in to access your customized phrases and gaze calibration profile."}
              {mode === "signup" && "Empowering your voice with private, in-browser AAC technology."}
              {mode === "recovery" && "Enter your email to receive a secure password reset link."}
            </p>
          </div>

          {message && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {mode !== "recovery" && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                data-dwell="true"
                onClick={() => setRole("patient")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  role === "patient"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient</span>
              </button>
              <button
                type="button"
                data-dwell="true"
                onClick={() => setRole("caregiver")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  role === "caregiver"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Caregiver</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-teal-600"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-teal-600"
                />
              </div>
            </div>

            {mode !== "recovery" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-teal-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              data-dwell="true"
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Processing..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="pt-2 text-center text-xs space-y-2 border-t border-slate-100">
            {mode === "login" ? (
              <>
                <p className="text-slate-600">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-bold text-teal-600 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
                <p>
                  <button
                    type="button"
                    onClick={() => setMode("recovery")}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Forgot password?
                  </button>
                </p>
              </>
            ) : (
              <p className="text-slate-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-bold text-teal-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

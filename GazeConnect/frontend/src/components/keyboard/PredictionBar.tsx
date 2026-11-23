"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, Plus, X, RefreshCw, Cpu } from "lucide-react";

interface PredictionBarProps {
  activeText: string;
  activeLanguage?: string;
  onUseSentence: (sentence: string) => void;
  onAppendSentence: (sentence: string) => void;
  isHighContrast?: boolean;
}

export default function PredictionBar({
  activeText,
  activeLanguage = "en",
  onUseSentence,
  onAppendSentence,
  isHighContrast = false,
}: PredictionBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [source, setSource] = useState<"gemini" | "fallback">("fallback");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Local rule-based fallback when offline or API is unavailable
  const getLocalFallback = (text: string, lang: string): string[] => {
    const t = text.toLowerCase().trim();
    if (t.includes("water") || t.includes("पानी") || t.includes("agua")) {
      return [
        "I would like some water, please.",
        "Could you bring me a glass of water?",
        "I am thirsty, please help me drink.",
      ];
    }
    if (t.includes("hungry") || t.includes("food") || t.includes("खाना") || t.includes("hambre")) {
      return [
        "I am hungry, I would like something to eat.",
        "Could I please have my meal now?",
        "I need some food, please.",
      ];
    }
    if (t.includes("pain") || t.includes("दर्द") || t.includes("dolor")) {
      return [
        "I am in pain, please help me.",
        "I feel uncomfortable, could you adjust my position?",
        "Please call the nurse or doctor.",
      ];
    }
    if (text.trim().length > 0) {
      const base = text.trim();
      return [
        `${base}, please.`,
        `Could you help me with ${base}?`,
        `I need ${base} right now.`,
      ];
    }
    return [
      "I would like some assistance, please.",
      "Could you please come here for a moment?",
      "Thank you, I am doing fine.",
    ];
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!activeText || activeText.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // If browser is offline, skip network call directly
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSuggestions(getLocalFallback(activeText, activeLanguage));
        setSource("fallback");
        setIsLoading(false);
        return;
      }

      try {
        const words = activeText.trim().split(/\s+/);
        const res = await fetch(`${apiUrl}/api/ai/predict-sentences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords: words,
            partial_text: activeText,
            language: activeLanguage,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setSource(data.source || "gemini");
        } else {
          setSuggestions(getLocalFallback(activeText, activeLanguage));
          setSource("fallback");
        }
      } catch (err) {
        // Network error or backend offline -> local fallback
        setSuggestions(getLocalFallback(activeText, activeLanguage));
        setSource("fallback");
      } finally {
        setIsLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [activeText, activeLanguage]);

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={`p-3 rounded-2xl border transition-all ${
      isHighContrast
        ? "bg-black border-yellow-400 text-yellow-300"
        : "bg-teal-900 text-white border-teal-700 shadow-md"
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs font-bold mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-teal-300" />
          <span className="font-black tracking-wide">AI SENTENCE ASSISTANT</span>
          {isLoading && <RefreshCw className="w-3.5 h-3.5 text-teal-300 animate-spin ml-1" />}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
            source === "gemini" ? "bg-teal-700 text-teal-100" : "bg-slate-700 text-slate-200"
          }`}>
            <Cpu className="w-3 h-3" />
            <span>{source === "gemini" ? "Gemini 2.5 Flash" : "Local Predictor"}</span>
          </span>
          <button
            type="button"
            data-dwell="true"
            onClick={() => setSuggestions([])}
            className="text-teal-300 hover:text-white p-1"
            title="Dismiss suggestions"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Suggestion Cards Grid (up to 3 large data-dwell="true" cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {suggestions.slice(0, 3).map((sentence, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
              isHighContrast
                ? "bg-neutral-900 border-yellow-400 text-yellow-300"
                : "bg-teal-800/80 border-teal-600/60 text-white"
            }`}
          >
            <p className="font-bold text-sm sm:text-base leading-snug">
              &ldquo;{sentence}&rdquo;
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                data-dwell="true"
                onClick={() => onUseSentence(sentence)}
                className="flex-1 py-2 px-2.5 rounded-lg font-bold text-xs bg-teal-500 hover:bg-teal-400 text-teal-950 flex items-center justify-center gap-1 shadow-sm transition-all"
                title="Replace current text with this sentence"
              >
                <span>Use Sentence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                data-dwell="true"
                onClick={() => onAppendSentence(sentence)}
                className="py-2 px-2.5 rounded-lg font-bold text-xs bg-teal-700 hover:bg-teal-600 text-white flex items-center justify-center gap-1 border border-teal-600 transition-all"
                title="Append to current text"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Append</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

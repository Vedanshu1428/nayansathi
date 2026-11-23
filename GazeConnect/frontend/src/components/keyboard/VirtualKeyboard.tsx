"use client";

import React, { useState } from "react";
import { getLocalPredictions } from "@/lib/prediction/localPredictor";
import {
  Delete,
  RotateCcw,
  Trash2,
  Space,
  Globe,
  SlidersHorizontal,
  Hash,
  Sparkles,
  Volume2,
} from "lucide-react";

interface VirtualKeyboardProps {
  activeText: string;
  onTextChange: (newText: string) => void;
  onSpeakRequested?: () => void;
  isHighContrast?: boolean;
}

type LayoutType = "QWERTY" | "4x3-Grid" | "Simplified";
type ScriptType = "EN" | "HI" | "ES" | "ZH";

// 4x3 Ultra-Accessible Grid Blocks (Optional Mode)
const GRID_4X3_BLOCKS = [
  { id: "A-D", label: "A B C D", letters: ["A", "B", "C", "D"] },
  { id: "E-H", label: "E F G H", letters: ["E", "F", "G", "H"] },
  { id: "I-L", label: "I J K L", letters: ["I", "J", "K", "L"] },
  { id: "M-P", label: "M N O P", letters: ["M", "N", "O", "P"] },
  { id: "Q-T", label: "Q R S T", letters: ["Q", "R", "S", "T"] },
  { id: "U-W", label: "U V W", letters: ["U", "V", "W"] },
  { id: "X-Z", label: "X Y Z", letters: ["X", "Y", "Z"] },
  { id: "SPACE", label: "SPACE", action: "space" },
  { id: "BKSP", label: "BKSP", action: "backspace" },
  { id: "PREDICT", label: "AI WORD", action: "predict" },
  { id: "SPEAK", label: "SPEAK", action: "speak" },
  { id: "CLEAR", label: "CLEAR", action: "clear" },
];

export default function VirtualKeyboard({
  activeText,
  onTextChange,
  onSpeakRequested,
  isHighContrast = false,
}: VirtualKeyboardProps) {
  // Default directly to Large-Key QWERTY as required!
  const [layout, setLayout] = useState<LayoutType>("QWERTY");
  const [script, setScript] = useState<ScriptType>("EN");
  const [showNumbers, setShowNumbers] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Active sub-block state for 4x3 grid
  const [activeSubBlock, setActiveSubBlock] = useState<{
    id: string;
    label: string;
    letters: string[];
  } | null>(null);

  // Top 5 word predictions
  const predictions = getLocalPredictions(activeText, script);

  const pushUndo = (text: string) => {
    setUndoStack((prev) => [...prev.slice(-15), text]);
  };

  const handleKeyPress = (char: string) => {
    pushUndo(activeText);
    onTextChange(activeText + char);
    if (activeSubBlock) {
      setActiveSubBlock(null);
    }
  };

  const handleSpace = () => {
    pushUndo(activeText);
    onTextChange(activeText + " ");
  };

  const handleBackspace = () => {
    if (activeText.length > 0) {
      pushUndo(activeText);
      onTextChange(activeText.slice(0, -1));
    }
  };

  const handleDeleteWord = () => {
    if (!activeText) return;
    pushUndo(activeText);
    const words = activeText.trimEnd().split(/\s+/);
    if (words.length <= 1) {
      onTextChange("");
    } else {
      words.pop();
      onTextChange(words.join(" ") + " ");
    }
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const prev = undoStack[undoStack.length - 1];
      setUndoStack((s) => s.slice(0, -1));
      onTextChange(prev);
    }
  };

  const handleClear = () => {
    if (!activeText) return;
    pushUndo(activeText);
    onTextChange("");
  };

  const handleSelectPrediction = (suggestion: string) => {
    pushUndo(activeText);
    const words = activeText.split(/\s+/);

    if (activeText.endsWith(" ") || words.length === 0 || !activeText) {
      onTextChange(activeText ? `${activeText}${suggestion} ` : `${suggestion} `);
    } else {
      words[words.length - 1] = suggestion;
      onTextChange(words.join(" ") + " ");
    }
  };

  // Keyboard Layout Matrices
  const qwertyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  const simplifiedRows = [
    ["A", "E", "I", "O", "U", "Y"],
    ["T", "N", "S", "R", "H", "L", "D", "C"],
    ["M", "F", "P", "G", "W", "B", "V", "K", "J", "X", "Q", "Z"],
  ];

  const spanishRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
    ["Z", "X", "C", "V", "B", "N", "M", "Á", "É", "Í", "Ó", "Ú"],
  ];

  const numberRow = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const punctKeys = [".", ",", "?", "!", "'"];

  return (
    <div
      className={`w-full p-3 sm:p-4 rounded-3xl border transition-colors flex flex-col justify-between ${
        isHighContrast
          ? "bg-slate-900 border-slate-700 text-slate-100 shadow-2xl"
          : "bg-white border-slate-200 shadow-xl text-slate-900"
      }`}
    >
      {/* 1. TOP STRIP: 5 OFFLINE WORD PREDICTIONS */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 px-1">
          <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Word Suggestions (1-Dwell Complete)</span>
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
            isHighContrast ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
          }`}>
            Offline Lexicon
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {predictions.map((word, i) => (
            <button
              key={i}
              type="button"
              data-dwell="true"
              onClick={() => handleSelectPrediction(word)}
              className={`h-11 sm:h-12 rounded-xl font-bold text-sm sm:text-base border transition-all flex items-center justify-center px-2 text-center truncate ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-teal-900/60 border-slate-700 text-teal-300 hover:border-teal-500 shadow-sm"
                  : "bg-teal-50/70 hover:bg-teal-100 border-teal-200 text-teal-900 hover:border-teal-500 shadow-sm"
              }`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CONTROLS STRIP: LAYOUT & SCRIPT SWITCHERS */}
      <div className={`flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b text-xs font-semibold ${
        isHighContrast ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600"
      }`}>
        <div className="flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-slate-400 hidden sm:inline mr-1">Layout:</span>
          {(["QWERTY", "4x3-Grid", "Simplified"] as LayoutType[]).map((l) => (
            <button
              key={l}
              type="button"
              data-dwell="true"
              onClick={() => {
                setLayout(l);
                setActiveSubBlock(null);
              }}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                layout === l
                  ? "bg-teal-600 text-white shadow-sm"
                  : isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {l === "QWERTY" ? "Large QWERTY" : l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-slate-400 hidden sm:inline mr-1">Lang:</span>
          {(["EN", "ES"] as ScriptType[]).map((s) => (
            <button
              key={s}
              type="button"
              data-dwell="true"
              onClick={() => setScript(s)}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                script === s
                  ? "bg-slate-700 text-white shadow-sm"
                  : isHighContrast
                  ? "bg-slate-800 text-slate-400 hover:text-slate-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 3. KEYBOARD MATRIX */}
      <div className="space-y-2">
        {/* Number row (when toggled) */}
        {showNumbers && (
          <div className="grid grid-cols-10 gap-2">
            {numberRow.map((num) => (
              <button
                key={num}
                type="button"
                data-dwell="true"
                onClick={() => handleKeyPress(num)}
                className={`min-h-[58px] sm:min-h-[64px] rounded-2xl font-black text-xl sm:text-2xl border flex items-center justify-center shadow-sm transition-all active:scale-95 ${
                  isHighContrast
                    ? "bg-slate-800 hover:bg-teal-900/60 border-slate-700 text-slate-100"
                    : "bg-slate-50 hover:bg-teal-50 border-slate-300 text-slate-800"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {/* ── DEFAULT LARGE-KEY QWERTY WITH GENEROUS SPACING ── */}
        {layout === "QWERTY" && (
          <div className="space-y-2.5">
            {(script === "ES" ? spanishRows : qwertyRows).map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-2 sm:gap-2.5">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    data-dwell="true"
                    onClick={() => handleKeyPress(letter)}
                    className={`flex-1 min-h-[58px] sm:min-h-[64px] max-w-[96px] rounded-2xl font-black text-xl sm:text-2xl border flex items-center justify-center shadow-md transition-all active:scale-95 ${
                      isHighContrast
                        ? "bg-slate-800 hover:bg-teal-900/60 border-slate-700 text-slate-100 hover:border-teal-500"
                        : "bg-slate-50 hover:bg-teal-50 hover:border-teal-500 border-slate-300 text-slate-900"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── 4X3 ULTRA-ACCESSIBLE OVERSIZED GRID (OPTIONAL TOGGLE) ── */}
        {layout === "4x3-Grid" && (
          <div className="relative">
            {activeSubBlock ? (
              <div className={`p-4 rounded-2xl border-2 space-y-3 ${
                isHighContrast
                  ? "bg-slate-800 border-teal-500"
                  : "bg-teal-50 border-teal-500 shadow-xl"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase ${
                    isHighContrast ? "text-teal-300" : "text-teal-950"
                  }`}>
                    Group: {activeSubBlock.label}
                  </span>
                  <button
                    type="button"
                    data-dwell="true"
                    onClick={() => setActiveSubBlock(null)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      isHighContrast
                        ? "bg-slate-700 border-slate-600 text-slate-200"
                        : "bg-white text-slate-700 border-slate-300 shadow-sm"
                    }`}
                  >
                    ← Back to Grid
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeSubBlock.letters.map((char) => (
                    <button
                      key={char}
                      type="button"
                      data-dwell="true"
                      onClick={() => handleKeyPress(char)}
                      className={`min-h-[72px] sm:min-h-[84px] rounded-2xl font-black text-3xl sm:text-4xl border-2 flex items-center justify-center shadow-lg transition-all ${
                        isHighContrast
                          ? "bg-slate-700 hover:bg-teal-600 border-slate-600 text-slate-100 hover:text-white"
                          : "bg-white hover:bg-teal-600 hover:text-white border-teal-300 text-teal-950"
                      }`}
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {GRID_4X3_BLOCKS.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    data-dwell="true"
                    onClick={() => {
                      if (block.letters) {
                        setActiveSubBlock(block as { id: string; label: string; letters: string[] });
                      } else if (block.action === "space") {
                        handleSpace();
                      } else if (block.action === "backspace") {
                        handleBackspace();
                      } else if (block.action === "predict") {
                        if (predictions.length > 0) handleSelectPrediction(predictions[0]);
                      } else if (block.action === "speak") {
                        onSpeakRequested?.();
                      } else if (block.action === "clear") {
                        handleClear();
                      }
                    }}
                    className={`min-h-[64px] sm:min-h-[72px] rounded-2xl font-black text-base sm:text-lg border-2 flex flex-col items-center justify-center gap-0.5 shadow-md transition-all active:scale-95 ${
                      block.action === "speak"
                        ? "bg-teal-600 text-white border-teal-700 shadow-teal-600/30"
                        : block.action === "space"
                        ? isHighContrast ? "bg-slate-700 text-white border-slate-600" : "bg-slate-800 text-white border-slate-900"
                        : block.action === "backspace" || block.action === "clear"
                        ? isHighContrast ? "bg-rose-950/60 text-rose-300 border-rose-800" : "bg-rose-50 text-rose-800 border-rose-300"
                        : block.action === "predict"
                        ? isHighContrast ? "bg-indigo-950/60 text-indigo-300 border-indigo-800" : "bg-indigo-50 text-indigo-900 border-indigo-300"
                        : isHighContrast
                        ? "bg-slate-800 border-slate-700 text-slate-100 hover:border-teal-500"
                        : "bg-slate-50 hover:bg-teal-50 border-slate-300 hover:border-teal-500 text-slate-900"
                    }`}
                  >
                    {block.action === "speak" && <Volume2 className="w-4 h-4 text-white" />}
                    {block.action === "space" && <Space className="w-4 h-4 text-white" />}
                    {block.action === "backspace" && <Delete className="w-4 h-4 text-rose-400" />}
                    {block.action === "predict" && <Sparkles className="w-4 h-4 text-indigo-400" />}
                    <span>{block.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SIMPLIFIED VOWEL-FIRST LAYOUT ── */}
        {layout === "Simplified" && (
          <div className="space-y-2">
            {simplifiedRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-2">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    data-dwell="true"
                    onClick={() => handleKeyPress(letter)}
                    className={`flex-1 min-h-[58px] sm:min-h-[64px] max-w-[84px] rounded-2xl font-black text-xl border flex items-center justify-center shadow-sm ${
                      isHighContrast
                        ? "bg-slate-800 hover:bg-teal-900/60 border-slate-700 text-slate-100"
                        : "bg-slate-50 hover:bg-teal-50 border-slate-300 text-slate-800"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 4. INTEGRATED ACTIONS & PUNCTUATION ROW (FOR QWERTY & SIMPLIFIED) */}
        {layout !== "4x3-Grid" && (
          <div className="pt-2 grid grid-cols-4 sm:grid-cols-12 gap-2">
            {/* Numbers Toggle */}
            <button
              type="button"
              data-dwell="true"
              onClick={() => setShowNumbers(!showNumbers)}
              className={`min-h-[58px] sm:min-h-[62px] rounded-2xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-1 shadow-sm ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>{showNumbers ? "ABC" : "123"}</span>
            </button>

            {/* Quick Punctuation Keys */}
            {punctKeys.map((p) => (
              <button
                key={p}
                type="button"
                data-dwell="true"
                onClick={() => handleKeyPress(p)}
                className={`min-h-[58px] sm:min-h-[62px] rounded-2xl font-black text-xl border flex items-center justify-center shadow-sm ${
                  isHighContrast
                    ? "bg-slate-800 hover:bg-teal-900/60 text-slate-100 border-slate-700"
                    : "bg-slate-100 hover:bg-teal-50 text-slate-800 border-slate-300"
                }`}
              >
                {p}
              </button>
            ))}

            {/* SPACE (Wide Key) */}
            <button
              type="button"
              data-dwell="true"
              onClick={handleSpace}
              className={`col-span-2 sm:col-span-3 min-h-[58px] sm:min-h-[62px] rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                isHighContrast
                  ? "bg-teal-600 hover:bg-teal-700 text-white border border-teal-500"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              }`}
            >
              <Space className="w-5 h-5" />
              <span>SPACE</span>
            </button>

            {/* BACKSPACE */}
            <button
              type="button"
              data-dwell="true"
              onClick={handleBackspace}
              disabled={!activeText}
              className={`min-h-[58px] sm:min-h-[62px] rounded-2xl font-bold text-xs sm:text-sm border disabled:opacity-30 flex items-center justify-center gap-1 shadow-sm ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-rose-950/60 text-rose-300 border-slate-700"
                  : "bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border-slate-300 text-slate-800"
              }`}
            >
              <Delete className="w-4 h-4" />
              <span>BKSP</span>
            </button>

            {/* UNDO */}
            <button
              type="button"
              data-dwell="true"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`min-h-[58px] sm:min-h-[62px] rounded-2xl font-bold text-xs border disabled:opacity-30 flex items-center justify-center gap-1 shadow-sm ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>UNDO</span>
            </button>

            {/* CLEAR */}
            <button
              type="button"
              data-dwell="true"
              onClick={handleClear}
              disabled={!activeText}
              className={`min-h-[58px] sm:min-h-[62px] rounded-2xl font-bold text-xs border disabled:opacity-30 flex items-center justify-center gap-1 shadow-sm ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-rose-950/60 text-rose-300 border-slate-700"
                  : "bg-slate-100 hover:bg-rose-100 hover:text-rose-700 border-slate-300 text-slate-800"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
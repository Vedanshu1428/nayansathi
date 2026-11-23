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
  ChevronLeft,
  ChevronRight,
  Hash,
  Sparkles,
  Volume2,
  LayoutGrid,
} from "lucide-react";

interface VirtualKeyboardProps {
  activeText: string;
  onTextChange: (newText: string) => void;
  onSpeakRequested?: () => void;
  isHighContrast?: boolean;
}

type LayoutType = "4x3-Grid" | "QWERTY" | "Simplified" | "Large-Key" | "High-Contrast";
type ScriptType = "EN" | "HI" | "ES" | "ZH";

// 4x3 Ultra-Accessible Grid Blocks
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
  const [layout, setLayout] = useState<LayoutType>("4x3-Grid"); // Default to 4x3-Grid in Gaze Mode!
  const [script, setScript] = useState<ScriptType>("EN");
  const [showNumbers, setShowNumbers] = useState<boolean>(false);
  const [largeKeyPage, setLargeKeyPage] = useState<number>(0);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Active sub-block modal for 4x3 grid letter expansion
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
      setActiveSubBlock(null); // Return to main 12-block grid upon selection
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

  const hindiVowels = ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ", "ा", "ि", "ी", "ु", "ू", "े", "ै", "ो", "ौ", "्"];
  const hindiConsonants = [
    "क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ",
    "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श", "ष", "स", "ह"
  ];

  const numberRow = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const punctRow = [".", ",", "?", "!", "-", "'"];

  const largeKeyAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const largeKeyPageSize = 12;
  const totalLargePages = Math.ceil(largeKeyAlphabet.length / largeKeyPageSize);
  const largeKeySlice = largeKeyAlphabet.slice(
    largeKeyPagePageSafe(largeKeyPage) * largeKeyPageSize,
    (largeKeyPagePageSafe(largeKeyPage) + 1) * largeKeyPageSize
  );

  function largeKeyPagePageSafe(p: number) {
    return Math.max(0, Math.min(p, totalLargePages - 1));
  }

  const isCurrentHighContrast = isHighContrast || layout === "High-Contrast";

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border transition-colors ${
      isCurrentHighContrast
        ? "bg-black border-yellow-400 text-yellow-300"
        : "bg-white border-slate-200 shadow-xl"
    }`}>
      {/* 1. TOP STRIP: 5 OFFLINE WORD PREDICTIONS */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5 px-1">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Word Suggestions (1-Dwell Complete)</span>
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
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
              className={`h-14 sm:h-16 rounded-xl font-bold text-sm sm:text-base border transition-all flex items-center justify-center px-2 text-center truncate ${
                isCurrentHighContrast
                  ? "bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                  : "bg-teal-50/70 hover:bg-teal-100/80 border-teal-200 text-teal-900 hover:border-teal-500 shadow-sm"
              }`}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CONTROLS STRIP: LAYOUT & SCRIPT SWITCHERS */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs font-semibold">
        {/* Layout Switcher */}
        <div className="flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-slate-500 hidden sm:inline mr-1">Layout:</span>
          {(["4x3-Grid", "QWERTY", "Simplified", "Large-Key", "High-Contrast"] as LayoutType[]).map((l) => (
            <button
              key={l}
              type="button"
              data-dwell="true"
              onClick={() => {
                setLayout(l);
                setActiveSubBlock(null);
              }}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                layout === l
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {l === "4x3-Grid" ? "4x3 Grid (Gaze)" : l}
            </button>
          ))}
        </div>

        {/* Script / Language Switcher */}
        <div className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <span className="text-slate-500 hidden sm:inline mr-1">Language:</span>
          {(["EN", "HI", "ES", "ZH"] as ScriptType[]).map((s) => (
            <button
              key={s}
              type="button"
              data-dwell="true"
              onClick={() => setScript(s)}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                script === s
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
            {numberRow.map((num) => (
              <button
                key={num}
                type="button"
                data-dwell="true"
                onClick={() => handleKeyPress(num)}
                className="h-16 sm:h-20 rounded-xl font-black text-lg sm:text-xl bg-slate-100 hover:bg-teal-50 border border-slate-300 text-slate-800 flex items-center justify-center shadow-sm"
              >
                {num}
              </button>
            ))}
          </div>
        )}

        {/* ── 4X3 ULTRA-ACCESSIBLE OVERSIZED GRID (MAX 12 HUGE TARGETS) ── */}
        {layout === "4x3-Grid" ? (
          <div className="relative">
            {/* Expanded 4-letter sub-block selector */}
            {activeSubBlock ? (
              <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-500 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-teal-900 uppercase">
                    Select Letter from Group: {activeSubBlock.label}
                  </span>
                  <button
                    type="button"
                    data-dwell="true"
                    onClick={() => setActiveSubBlock(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50"
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
                      className="h-28 sm:h-36 rounded-2xl font-black text-4xl sm:text-5xl bg-white hover:bg-teal-600 hover:text-white border-2 border-teal-300 text-teal-950 flex items-center justify-center shadow-lg transition-all"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Main 4x3 Grid (12 Giant Buttons) */
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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
                    className={`h-24 sm:h-28 rounded-2xl font-black text-lg sm:text-xl border-2 flex flex-col items-center justify-center gap-1 shadow-md transition-all active:scale-95 ${
                      block.action === "speak"
                        ? "bg-teal-600 text-white border-teal-700 shadow-teal-600/30"
                        : block.action === "space"
                        ? "bg-slate-800 text-white border-slate-900"
                        : block.action === "backspace" || block.action === "clear"
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300"
                        : block.action === "predict"
                        ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300"
                        : isCurrentHighContrast
                        ? "bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                        : "bg-slate-50 hover:bg-teal-50 border-slate-300 hover:border-teal-500 text-slate-900"
                    }`}
                  >
                    {block.action === "speak" && <Volume2 className="w-5 h-5 text-white" />}
                    {block.action === "space" && <Space className="w-5 h-5 text-white" />}
                    {block.action === "backspace" && <Delete className="w-5 h-5 text-rose-700" />}
                    {block.action === "predict" && <Sparkles className="w-5 h-5 text-indigo-700" />}
                    <span>{block.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : layout === "Large-Key" ? (
          // Large-Key paginated
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {largeKeySlice.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  data-dwell="true"
                  onClick={() => handleKeyPress(letter)}
                  className={`h-20 sm:h-24 rounded-2xl font-black text-2xl sm:text-3xl border flex items-center justify-center shadow-md transition-all ${
                    isCurrentHighContrast
                      ? "bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                      : "bg-slate-50 hover:bg-teal-50 hover:border-teal-500 border-slate-300 text-slate-800"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                data-dwell="true"
                onClick={() => setLargeKeyPage((p) => Math.max(0, p - 1))}
                disabled={largeKeyPage === 0}
                className="py-3 px-6 rounded-xl font-bold text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Page</span>
              </button>
              <span className="font-bold text-sm text-slate-600">
                Page {largeKeyPage + 1} of {totalLargePages}
              </span>
              <button
                type="button"
                data-dwell="true"
                onClick={() => setLargeKeyPage((p) => Math.min(totalLargePages - 1, p + 1))}
                disabled={largeKeyPage >= totalLargePages - 1}
                className="py-3 px-6 rounded-xl font-bold text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                <span>Next Page</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : layout === "Simplified" ? (
          // Simplified layout
          <div className="space-y-2">
            {simplifiedRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    data-dwell="true"
                    onClick={() => handleKeyPress(letter)}
                    className="flex-1 max-w-[72px] h-16 sm:h-20 rounded-xl font-black text-lg sm:text-xl border flex items-center justify-center shadow-sm bg-slate-100 hover:bg-teal-50 border-slate-300 text-slate-800"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Standard QWERTY / Spanish Rows
          <div className="space-y-2">
            {(script === "ES" ? spanishRows : qwertyRows).map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    data-dwell="true"
                    onClick={() => handleKeyPress(letter)}
                    className={`flex-1 max-w-[72px] h-16 sm:h-20 rounded-xl font-black text-lg sm:text-xl border flex items-center justify-center shadow-sm transition-all ${
                      isCurrentHighContrast
                        ? "bg-black border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                        : "bg-slate-100 hover:bg-teal-50 hover:border-teal-500 border-slate-300 text-slate-800"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 4. ACTIONS & PUNCTUATION ROW (FOR STANDARD/QWERTY LAYOUTS) */}
        {layout !== "4x3-Grid" && (
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-8 gap-2">
            <button
              type="button"
              data-dwell="true"
              onClick={() => setShowNumbers(!showNumbers)}
              className="h-16 sm:h-18 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center gap-1 shadow-sm border border-slate-300"
            >
              <Hash className="w-4 h-4" />
              <span>{showNumbers ? "ABC" : "123"}</span>
            </button>

            <button
              type="button"
              data-dwell="true"
              onClick={handleSpace}
              className="col-span-2 sm:col-span-3 h-16 sm:h-18 rounded-xl font-black text-sm sm:text-base bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <Space className="w-5 h-5" />
              <span>SPACE</span>
            </button>

            <button
              type="button"
              data-dwell="true"
              onClick={handleBackspace}
              disabled={!activeText}
              className="h-16 sm:h-18 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-300 text-slate-800 disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
            >
              <Delete className="w-4 h-4" />
              <span>BKSP</span>
            </button>

            <button
              type="button"
              data-dwell="true"
              onClick={handleDeleteWord}
              disabled={!activeText}
              className="h-16 sm:h-18 rounded-xl font-bold text-xs bg-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-300 text-slate-800 disabled:opacity-40 flex items-center justify-center shadow-sm"
            >
              DEL WORD
            </button>

            <button
              type="button"
              data-dwell="true"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="h-16 sm:h-18 rounded-xl font-bold text-xs bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800 disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>UNDO</span>
            </button>

            <button
              type="button"
              data-dwell="true"
              onClick={handleClear}
              disabled={!activeText}
              className="h-16 sm:h-18 rounded-xl font-bold text-xs bg-slate-200 hover:bg-red-100 hover:text-red-700 border border-slate-300 text-slate-800 disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR</span>
            </button>
          </div>
        )}

        {/* Quick Punctuation row */}
        <div className="flex justify-center gap-2 pt-1">
          {punctRow.map((p) => (
            <button
              key={p}
              type="button"
              data-dwell="true"
              onClick={() => handleKeyPress(p)}
              className="w-12 h-14 rounded-xl font-black text-lg bg-slate-100 hover:bg-teal-50 border border-slate-300 text-slate-800 flex items-center justify-center shadow-sm"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

interface VirtualKeyboardProps {
  activeText: string;
  onTextChange: (newText: string) => void;
  onSpeakRequested?: () => void;
  isHighContrast?: boolean;
}

type LayoutType = "QWERTY" | "Simplified" | "Large-Key" | "High-Contrast";
type ScriptType = "EN" | "HI" | "ES" | "ZH";

export default function VirtualKeyboard({
  activeText,
  onTextChange,
  onSpeakRequested,
  isHighContrast = false,
}: VirtualKeyboardProps) {
  const [layout, setLayout] = useState<LayoutType>("QWERTY");
  const [script, setScript] = useState<ScriptType>("EN");
  const [showNumbers, setShowNumbers] = useState<boolean>(false);
  const [largeKeyPage, setLargeKeyPage] = useState<number>(0);
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Top 5 word predictions
  const predictions = getLocalPredictions(activeText, script);

  const pushUndo = (text: string) => {
    setUndoStack((prev) => [...prev.slice(-15), text]);
  };

  const handleKeyPress = (char: string) => {
    pushUndo(activeText);
    onTextChange(activeText + char);
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
      // Replace last partial word
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
    // Vowels centrally grouped in row 1
    ["A", "E", "I", "O", "U", "Y"],
    // Most common consonants in row 2
    ["T", "N", "S", "R", "H", "L", "D", "C"],
    // Remaining consonants in row 3
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

  const chinesePinyinQuick = [
    "你好", "谢谢", "请", "喝水", "吃药", "医生", "洗手间", "我需要", "帮助", "疼痛", "休息", "冷", "热"
  ];

  const numberRow = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const punctRow = [".", ",", "?", "!", "-", "'"];

  // Large-Key 6-Column Paginated
  const largeKeyAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const largeKeyPageSize = 12; // 2 rows of 6
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
          {(["QWERTY", "Simplified", "Large-Key", "High-Contrast"] as LayoutType[]).map((l) => (
            <button
              key={l}
              type="button"
              data-dwell="true"
              onClick={() => setLayout(l)}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all ${
                layout === l
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {l}
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
        {/* Number row (when toggled or in script) */}
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

        {/* Script / Layout Specific Keys */}
        {script === "HI" ? (
          // Hindi Devanagari Key Grid
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {hindiVowels.map((char) => (
                <button
                  key={char}
                  type="button"
                  data-dwell="true"
                  onClick={() => handleKeyPress(char)}
                  className="w-12 h-16 rounded-xl font-bold text-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 flex items-center justify-center shadow-sm"
                >
                  {char}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hindiConsonants.map((char) => (
                <button
                  key={char}
                  type="button"
                  data-dwell="true"
                  onClick={() => handleKeyPress(char)}
                  className="w-12 h-16 rounded-xl font-bold text-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 flex items-center justify-center shadow-sm"
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        ) : script === "ZH" ? (
          // Chinese Pinyin & Quick Vocab Grid
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {chinesePinyinQuick.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  data-dwell="true"
                  onClick={() => handleKeyPress(phrase + " ")}
                  className="h-16 rounded-xl font-black text-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 flex items-center justify-center shadow-sm"
                >
                  {phrase}
                </button>
              ))}
            </div>
            {/* Standard QWERTY below for typing pinyin */}
            {qwertyRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2">
                {row.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    data-dwell="true"
                    onClick={() => handleKeyPress(letter.toLowerCase())}
                    className="flex-1 max-w-[72px] h-16 sm:h-20 rounded-xl font-bold text-base sm:text-lg bg-slate-100 hover:bg-teal-50 border border-slate-300 text-slate-800 flex items-center justify-center shadow-sm"
                  >
                    {letter.toLowerCase()}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : layout === "Large-Key" ? (
          // Large-Key 6-Column Oversized Paginated Grid
          <div className="space-y-3">
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {largeKeySlice.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  data-dwell="true"
                  aria-label={`Letter ${letter}`}
                  onClick={() => handleKeyPress(letter)}
                  className="min-h-[84px] h-20 sm:h-24 rounded-2xl font-black text-2xl sm:text-3xl bg-slate-100 hover:bg-teal-50 border-2 border-slate-300 hover:border-teal-600 text-slate-900 flex items-center justify-center shadow-md transition-all"
                >
                  {letter}
                </button>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center px-2 pt-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                data-dwell="true"
                disabled={largeKeyPage === 0}
                onClick={() => setLargeKeyPage((p) => Math.max(0, p - 1))}
                className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Keys</span>
              </button>

              <span>
                Page {largeKeyPage + 1} of {totalLargePages}
              </span>

              <button
                type="button"
                data-dwell="true"
                disabled={largeKeyPage >= totalLargePages - 1}
                onClick={() => setLargeKeyPage((p) => Math.min(totalLargePages - 1, p + 1))}
                className="px-4 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 disabled:opacity-30 flex items-center gap-1"
              >
                <span>Next Keys</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : layout === "Simplified" ? (
          // Simplified Layout (Vowels Centrally Positioned)
          <div className="space-y-2">
            {simplifiedRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5 sm:gap-2">
                {row.map((letter) => {
                  const isVowel = "AEIOU".includes(letter);
                  return (
                    <button
                      key={letter}
                      type="button"
                      data-dwell="true"
                      onClick={() => handleKeyPress(letter)}
                      className={`flex-1 max-w-[72px] h-16 sm:h-20 rounded-xl font-black text-lg sm:text-xl border flex items-center justify-center shadow-sm transition-all ${
                        isVowel
                          ? "bg-teal-100 border-teal-400 text-teal-950 font-black"
                          : "bg-slate-100 hover:bg-teal-50 border-slate-300 text-slate-800"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
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

        {/* 4. ACTIONS & PUNCTUATION ROW */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-8 gap-2">
          {/* Numbers / ABC Toggle */}
          <button
            type="button"
            data-dwell="true"
            onClick={() => setShowNumbers(!showNumbers)}
            className="h-16 sm:h-18 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center gap-1 shadow-sm border border-slate-300"
          >
            <Hash className="w-4 h-4" />
            <span>{showNumbers ? "ABC" : "123"}</span>
          </button>

          {/* SPACE (Wide Key) */}
          <button
            type="button"
            data-dwell="true"
            onClick={handleSpace}
            className="col-span-2 sm:col-span-3 h-16 sm:h-18 rounded-xl font-black text-sm sm:text-base bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-md active:scale-95"
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
            className="h-16 sm:h-18 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-300 text-slate-800 disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
          >
            <Delete className="w-4 h-4" />
            <span>BKSP</span>
          </button>

          {/* DELETE WORD */}
          <button
            type="button"
            data-dwell="true"
            onClick={handleDeleteWord}
            disabled={!activeText}
            className="h-16 sm:h-18 rounded-xl font-bold text-xs bg-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-slate-300 text-slate-800 disabled:opacity-40 flex items-center justify-center shadow-sm"
          >
            DEL WORD
          </button>

          {/* UNDO */}
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

          {/* CLEAR */}
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

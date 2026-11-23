"use client";

import React, { useState, useEffect } from "react";
import { tts } from "@/lib/speech/ttsEngine";
import { LocalStore } from "@/lib/storage/localStore";
import {
  Volume2,
  AlertTriangle,
  HeartPulse,
  PhoneCall,
  Star,
  Users,
  CheckCircle2,
  X,
  ShieldAlert,
  RotateCcw,
  Mic,
  MicOff,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface QuickPanelsProps {
  activeTab: "phrases" | "emergency" | "facetoface";
  activeMessage: string;
  onSelectPhrase: (phrase: string) => void;
  isHighContrast?: boolean;
}

interface SavedPhraseItem {
  id: string;
  phrase: string;
  category: string;
  is_favorite: boolean;
}

interface EmergencyContactItem {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export default function QuickPanels({
  activeTab,
  activeMessage,
  onSelectPhrase,
  isHighContrast = false,
}: QuickPanelsProps) {
  // Phrases Tab Category state
  const [phraseCategory, setPhraseCategory] = useState<"Daily Needs" | "Medical" | "Social" | "Favourites">("Daily Needs");
  const [favouritePhrases, setFavouritePhrases] = useState<SavedPhraseItem[]>([]);

  // Emergency Tab State
  const [lastSpokenEmergency, setLastSpokenEmergency] = useState<string | null>(null);
  const [confirmExternalContact, setConfirmExternalContact] = useState<EmergencyContactItem | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactItem[]>([
    { id: "1", name: "Dr. Evans (Physician)", relationship: "Doctor", phone: "+15559876543" },
    { id: "2", name: "Sarah (Primary Caregiver)", relationship: "Daughter", phone: "+15551234567" },
  ]);

  // Caregiver Speech & Two-Way Replies State (Tab 4)
  const [isListening, setIsListening] = useState(false);
  const [caregiverSpeech, setCaregiverSpeech] = useState<string>("");
  const [manualInput, setManualInput] = useState<string>("");
  const [caregiverReplies, setCaregiverReplies] = useState<string[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const fetchCaregiverReplies = async (question: string) => {
    if (!question.trim()) return;
    setIsLoadingReplies(true);
    setSpeechError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/ai/reply-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spoken_question: question.trim(),
          language: "en",
        }),
      });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.replies) && data.replies.length > 0) {
        setCaregiverReplies(data.replies);
      } else {
        setCaregiverReplies(["Yes, definitely.", "No, not right now.", "I need a minute."]);
      }
    } catch (err) {
      console.warn("Caregiver replies fallback triggered:", err);
      const lower = question.toLowerCase();
      if (lower.includes("water") || lower.includes("drink") || lower.includes("thirsty")) {
        setCaregiverReplies(["Yes, please give me water.", "No, I am not thirsty.", "Just a small sip."]);
      } else if (lower.includes("pain") || lower.includes("hurt")) {
        setCaregiverReplies(["Yes, I am in pain.", "A little uncomfortable.", "No, I feel fine."]);
      } else if (lower.includes("eat") || lower.includes("food") || lower.includes("hungry")) {
        setCaregiverReplies(["Yes, I am hungry.", "Not right now, thank you.", "Maybe later."]);
      } else {
        setCaregiverReplies(["Yes, please.", "No, thank you.", "Please give me a moment."]);
      }
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please type the question below.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || "";
        if (transcript) {
          setCaregiverSpeech(transcript);
          fetchCaregiverReplies(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          setSpeechError(`Microphone notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechError("Microphone access could not be started.");
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("gazeconnect_saved_phrases");
        if (stored) {
          const parsed = JSON.parse(stored) as SavedPhraseItem[];
          setFavouritePhrases(parsed.filter((p) => p.is_favorite));
        }
        const storedContacts = localStorage.getItem("gazeconnect_emergency_contacts");
        if (storedContacts) {
          setEmergencyContacts(JSON.parse(storedContacts));
        }
      } catch (e) {
        console.error("Error reading storage in QuickPanels:", e);
      }
    }
  }, [activeTab]);

  const defaultPhrases = {
    "Daily Needs": [
      "I need water.",
      "I am hungry.",
      "I need food.",
      "I am tired.",
      "I need rest.",
      "I need the bathroom.",
    ],
    Medical: [
      "I am in pain.",
      "I feel uncomfortable.",
      "Please call my doctor.",
      "I need medical assistance.",
      "My head hurts.",
      "Please adjust my position.",
    ],
    Social: [
      "Hello.",
      "Thank you.",
      "Yes.",
      "No.",
      "Please wait.",
      "I want to talk.",
      "Good morning.",
      "Good night.",
    ],
  };

  const emergencyPhrases = [
    "I need help right now!",
    "I am in severe pain.",
    "Call my caregiver immediately.",
    "Call emergency services.",
    "I need medical assistance urgently.",
    "I cannot communicate, please check on me.",
    "I need someone with me right now.",
  ];

  const handlePhraseClick = (phrase: string) => {
    onSelectPhrase(phrase);
    tts.speak(phrase);
    LocalStore.appendHistory(phrase);
  };

  const handleEmergencyClick = (phrase: string) => {
    onSelectPhrase(phrase);
    tts.speak(phrase);
    LocalStore.appendHistory(phrase);
    setLastSpokenEmergency(phrase);
    setTimeout(() => setLastSpokenEmergency(null), 4000);
  };

  const handleExecuteExternalCall = (contact: EmergencyContactItem) => {
    window.open(`tel:${contact.phone}`, "_self");
    setConfirmExternalContact(null);
  };

  /* -------------------------------------------------------------
   * TAB 2: CATEGORIZED QUICK PHRASES
   * ------------------------------------------------------------- */
  if (activeTab === "phrases") {
    const categories: Array<"Daily Needs" | "Medical" | "Social" | "Favourites"> = [
      "Daily Needs",
      "Medical",
      "Social",
      "Favourites",
    ];

    const currentPhraseList =
      phraseCategory === "Favourites"
        ? favouritePhrases.map((p) => p.phrase)
        : defaultPhrases[phraseCategory];

    return (
      <div className={`p-5 rounded-3xl border transition-colors ${
        isHighContrast
          ? "bg-slate-900 border-slate-800 text-slate-100 shadow-2xl"
          : "bg-white border-slate-200 shadow-xl text-slate-900"
      }`}>
        {/* Category Filter Strip */}
        <div className={`flex flex-wrap gap-2 pb-4 mb-4 border-b ${
          isHighContrast ? "border-slate-800" : "border-slate-100"
        }`}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              data-dwell="true"
              aria-label={`Select category: ${cat}`}
              onClick={() => setPhraseCategory(cat)}
              className={`px-4 py-2.5 min-h-[48px] rounded-2xl font-bold text-sm transition-all flex items-center gap-1.5 ${
                phraseCategory === cat
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : isHighContrast
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {cat === "Favourites" && <Star className="w-4 h-4 fill-current text-amber-400" />}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Phrases Grid (76px min-h) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {currentPhraseList.map((phrase, i) => (
            <button
              key={i}
              type="button"
              data-dwell="true"
              onClick={() => handlePhraseClick(phrase)}
              className={`p-5 min-h-[76px] rounded-2xl font-bold text-base sm:text-lg border transition-all text-left flex items-center justify-between shadow-sm active:scale-95 ${
                isHighContrast
                  ? "bg-slate-800 hover:bg-teal-900/60 border-slate-700 text-slate-100 hover:border-teal-500"
                  : "bg-slate-50 hover:bg-teal-50 border-slate-200 hover:border-teal-500 text-slate-900"
              }`}
            >
              <span>{phrase}</span>
              <Volume2 className="w-5 h-5 text-teal-500 flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>

        {currentPhraseList.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No favourite phrases starred yet. Star phrases in Dashboard to see them here!
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------
   * TAB 3: EMERGENCY COMMUNICATION
   * ------------------------------------------------------------- */
  if (activeTab === "emergency") {
    return (
      <div className={`p-6 rounded-3xl border-4 shadow-2xl space-y-6 ${
        isHighContrast
          ? "bg-slate-900 border-rose-600 text-slate-100"
          : "bg-rose-50 border-rose-600 text-slate-900"
      }`}>
        {/* Header Alert Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-rose-200 dark:border-rose-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-2xl animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${
                isHighContrast ? "text-rose-400" : "text-rose-900"
              }`}>
                EMERGENCY COMMUNICATION PANEL
              </h2>
              <p className={`text-xs font-bold ${
                isHighContrast ? "text-rose-300" : "text-rose-700"
              }`}>
                1-Dwell Instant Vocal Broadcast • External Dispatch Requires Confirmation
              </p>
            </div>
          </div>

          {lastSpokenEmergency && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-2 shadow animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              <span>Spoken Aloud Locally!</span>
            </div>
          )}
        </div>

        {/* Emergency Phrases Grid */}
        <div className="space-y-2">
          <label className={`text-xs font-black uppercase tracking-wider ${
            isHighContrast ? "text-rose-400" : "text-rose-800"
          }`}>
            Immediate Distress Statements (Speaks Instantly on Dwell)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {emergencyPhrases.map((phrase, i) => (
              <button
                key={i}
                type="button"
                data-dwell="true"
                onClick={() => handleEmergencyClick(phrase)}
                className="p-5 min-h-[84px] rounded-2xl font-black text-lg bg-rose-600 hover:bg-rose-700 text-white border-2 border-rose-400 text-left shadow-lg shadow-rose-600/30 flex items-center justify-between active:scale-95 transition-all"
              >
                <span>{phrase}</span>
                <Volume2 className="w-5 h-5 ml-2 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* External Emergency Contacts Section */}
        <div className="pt-4 border-t-2 border-rose-200 dark:border-rose-900 space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              isHighContrast ? "text-rose-400" : "text-rose-800"
            }`}>
              <PhoneCall className="w-4 h-4" />
              <span>Designated Emergency Contacts (Requires Explicit Confirmation)</span>
            </label>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isHighContrast ? "bg-rose-950 text-rose-300 border border-rose-800" : "bg-rose-200 text-rose-900"
            }`}>
              Anti-Accidental Call Guard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emergencyContacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                data-dwell="true"
                onClick={() => setConfirmExternalContact(contact)}
                className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between shadow transition-all ${
                  isHighContrast
                    ? "bg-slate-800 hover:bg-slate-700 border-rose-700 text-slate-100"
                    : "bg-white hover:bg-rose-100 border-rose-400 text-rose-950"
                }`}
              >
                <div>
                  <h4 className="font-black text-base">{contact.name}</h4>
                  <span className={`text-xs font-medium ${
                    isHighContrast ? "text-rose-400" : "text-rose-700"
                  }`}>
                    {contact.relationship} • {contact.phone}
                  </span>
                </div>
                <div className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dual Confirmation Modal for External Calls */}
        {confirmExternalContact && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={`max-w-md w-full rounded-3xl p-6 border-4 border-rose-600 shadow-2xl text-center space-y-4 ${
              isHighContrast ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
            }`}>
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black">
                Confirm External Emergency Call?
              </h3>
              <p className={`text-sm ${isHighContrast ? "text-slate-300" : "text-slate-600"}`}>
                You are about to launch an external phone alert to{" "}
                <strong className="text-rose-500">{confirmExternalContact.name}</strong> (
                {confirmExternalContact.phone}).
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  data-dwell="true"
                  onClick={() => setConfirmExternalContact(null)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border transition-all ${
                    isHighContrast
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-dwell="true"
                  onClick={() => handleExecuteExternalCall(confirmExternalContact)}
                  className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Confirm & Call</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* -------------------------------------------------------------
   * TAB 4: FACE-TO-FACE CONVERSATION & CAREGIVER SPEECH-TO-GAZE MODE
   * ------------------------------------------------------------- */
  return (
    <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl flex flex-col justify-between min-h-[500px] space-y-6 ${
      isHighContrast
        ? "bg-slate-900 border-slate-800 text-slate-100"
        : "bg-slate-950 text-white border-slate-800"
    }`}>
      {/* Top Bar: Listener Display Title & Caregiver Mic Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest">
          <Users className="w-4 h-4" />
          <span>Face-to-Face & Two-Way Caregiver Assistant</span>
        </div>

        {/* Mic Listen Toggle & Text Fallback */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-dwell="true"
            onClick={toggleListening}
            className={`px-4 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all ${
              isListening
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                : "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/30"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Listening... (Tap to Stop)</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Listen to Caregiver (Mic)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prominent Listener Message Display (Across-the-Room readability) */}
      <div className="text-center py-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Patient Message to Room
        </span>
        <div className="font-black text-2xl sm:text-4xl lg:text-5xl text-teal-300 leading-tight max-w-4xl mx-auto break-words min-h-[48px] flex items-center justify-center">
          {activeMessage || "WAITING FOR MESSAGE..."}
        </div>
      </div>

      {/* Speech Recognition Error Notice if any */}
      {speechError && (
        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Caregiver Input & Speech Bubble */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-teal-400">
            <MessageSquare className="w-4 h-4" />
            <span>Caregiver Question / Topic:</span>
          </span>
          <span className="text-[11px] text-slate-500">Auto-generates 3 fast 1-dwell replies</span>
        </div>

        {/* Display recognized question or placeholder */}
        {caregiverSpeech ? (
          <div className="p-3.5 rounded-xl bg-teal-950/60 border border-teal-500/30 text-teal-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-300 flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">Caregiver Said:</span>
              <p className="text-base sm:text-lg font-bold">&ldquo;{caregiverSpeech}&rdquo;</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualInput.trim()) {
                  setCaregiverSpeech(manualInput.trim());
                  fetchCaregiverReplies(manualInput.trim());
                  setManualInput("");
                }
              }}
              placeholder="Caregiver: Click 'Listen' above or type question here..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => {
                if (manualInput.trim()) {
                  setCaregiverSpeech(manualInput.trim());
                  fetchCaregiverReplies(manualInput.trim());
                  setManualInput("");
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-400 font-bold text-sm"
            >
              Ask
            </button>
          </div>
        )}

        {/* Tailored 1-Dwell Replies generated by Gemini / Fallback */}
        {isLoadingReplies && (
          <div className="py-4 flex items-center justify-center gap-2 text-teal-400 text-sm font-bold">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing caregiver question & generating quick responses...</span>
          </div>
        )}

        {!isLoadingReplies && caregiverReplies.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Suggested Patient Answers (1-Dwell to Speak)</span>
              </label>
              <button
                type="button"
                onClick={() => setCaregiverReplies([])}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {caregiverReplies.map((reply, i) => (
                <button
                  key={i}
                  type="button"
                  data-dwell="true"
                  onClick={() => {
                    onSelectPhrase(reply);
                    tts.speak(reply);
                    LocalStore.appendHistory(reply);
                  }}
                  className="p-4 min-h-[68px] rounded-2xl bg-teal-950/70 hover:bg-teal-600 border border-teal-500/40 hover:border-teal-400 text-white font-bold text-base text-left shadow-lg transition-all flex items-center justify-between active:scale-95 group"
                >
                  <span className="line-clamp-2">{reply}</span>
                  <Volume2 className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Oversized High-Visibility Quick Reaction Buttons */}
      <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
          Instant Core Responses
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {[
            { label: "YES", color: "hover:bg-emerald-600 bg-emerald-950/50 border-emerald-600/50 text-emerald-200 hover:text-white" },
            { label: "NO", color: "hover:bg-rose-600 bg-rose-950/50 border-rose-600/50 text-rose-200 hover:text-white" },
            { label: "WAIT", color: "hover:bg-amber-600 bg-amber-950/50 border-amber-600/50 text-amber-200 hover:text-white" },
            { label: "REPEAT", color: "hover:bg-teal-600 bg-teal-950/50 border-teal-600/50 text-teal-200 hover:text-white" },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              data-dwell="true"
              onClick={() => {
                if (btn.label === "REPEAT") {
                  tts.repeatLast();
                } else {
                  onSelectPhrase(btn.label);
                  tts.speak(btn.label);
                  LocalStore.appendHistory(btn.label);
                }
              }}
              className={`h-20 sm:h-24 rounded-2xl font-black text-2xl sm:text-3xl border shadow-xl transition-all flex items-center justify-center active:scale-95 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
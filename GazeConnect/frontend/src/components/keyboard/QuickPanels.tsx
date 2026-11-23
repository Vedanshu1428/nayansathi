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
    // Launch tel link
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
      <div className={`p-5 rounded-3xl border ${
        isHighContrast ? "bg-black border-yellow-400 text-yellow-300" : "bg-white border-slate-200 shadow-xl"
      }`}>
        {/* Category Filter Strip */}
        <div className="flex flex-wrap gap-2 pb-4 mb-4 border-b border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              data-dwell="true"
              aria-label={`Select category: ${cat}`}
              onClick={() => setPhraseCategory(cat)}
              className={`px-4 py-2.5 min-h-[48px] rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 ${
                phraseCategory === cat
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {cat === "Favourites" && <Star className="w-4 h-4 fill-current text-amber-400" />}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Phrases Grid (68px-84px min-h) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {currentPhraseList.map((phrase, i) => (
            <button
              key={i}
              type="button"
              data-dwell="true"
              onClick={() => handlePhraseClick(phrase)}
              className={`p-5 min-h-[76px] rounded-2xl font-bold text-base sm:text-lg border transition-all text-left flex items-center justify-between shadow-sm active:scale-95 ${
                isHighContrast
                  ? "bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                  : "bg-slate-50 hover:bg-teal-50 border-slate-200 hover:border-teal-500 text-slate-900"
              }`}
            >
              <span>{phrase}</span>
              <Volume2 className="w-5 h-5 text-teal-600 flex-shrink-0 ml-2" />
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
      <div className="p-6 rounded-3xl bg-red-50 border-4 border-red-600 shadow-2xl space-y-6">
        {/* Header Alert Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-red-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600 text-white rounded-2xl animate-pulse">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-red-900 tracking-tight">
                EMERGENCY COMMUNICATION PANEL
              </h2>
              <p className="text-xs text-red-700 font-bold">
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
          <label className="text-xs font-black uppercase tracking-wider text-red-800">
            Immediate Distress Statements (Speaks Instantly on Dwell)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {emergencyPhrases.map((phrase, i) => (
              <button
                key={i}
                type="button"
                data-dwell="true"
                onClick={() => handleEmergencyClick(phrase)}
                className="p-5 min-h-[84px] rounded-2xl font-black text-lg bg-red-600 hover:bg-red-700 text-white border-2 border-red-400 text-left shadow-lg shadow-red-600/30 flex items-center justify-between active:scale-95 transition-all"
              >
                <span>{phrase}</span>
                <Volume2 className="w-5 h-5 ml-2 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* External Emergency Contacts Section */}
        <div className="pt-4 border-t-2 border-red-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4" />
              <span>Designated Emergency Contacts (Requires Explicit Confirmation)</span>
            </label>
            <span className="text-[10px] bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded">
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
                className="p-4 rounded-xl bg-white hover:bg-red-100 border-2 border-red-400 text-red-950 font-bold text-left flex items-center justify-between shadow transition-all"
              >
                <div>
                  <h4 className="font-black text-base">{contact.name}</h4>
                  <span className="text-xs text-red-700 font-medium">
                    {contact.relationship} • {contact.phone}
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-extrabold flex items-center gap-1">
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
            <div className="max-w-md w-full bg-white rounded-3xl p-6 border-4 border-red-600 shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Confirm External Emergency Call?
              </h3>
              <p className="text-sm text-slate-600">
                You are about to launch an external phone alert to{" "}
                <strong className="text-red-600">{confirmExternalContact.name}</strong> (
                {confirmExternalContact.phone}).
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  data-dwell="true"
                  onClick={() => setConfirmExternalContact(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-dwell="true"
                  onClick={() => handleExecuteExternalCall(confirmExternalContact)}
                  className="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5"
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
   * TAB 4: FACE-TO-FACE CONVERSATION MODE
   * ------------------------------------------------------------- */
  return (
    <div className="p-8 sm:p-12 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl flex flex-col items-center justify-between min-h-[440px] space-y-8">
      <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-widest">
        <Users className="w-4 h-4" />
        <span>Face-to-Face Listener Display (High-Visibility Across Room)</span>
      </div>

      {/* Ultra-Large Message Display */}
      <div className="text-center font-black text-4xl sm:text-6xl lg:text-7xl text-teal-300 leading-tight max-w-4xl break-words">
        {activeMessage || "WAITING FOR MESSAGE..."}
      </div>

      {/* 4 Oversized Dwell Response Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl">
        {[
          { label: "YES", color: "hover:bg-emerald-600" },
          { label: "NO", color: "hover:bg-red-600" },
          { label: "WAIT", color: "hover:bg-amber-600" },
          { label: "REPEAT", color: "hover:bg-teal-600" },
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
              }
            }}
            className={`h-24 sm:h-28 rounded-2xl font-black text-2xl sm:text-3xl bg-slate-800 ${btn.color} text-white border border-slate-700 shadow-xl transition-all flex items-center justify-center active:scale-95`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

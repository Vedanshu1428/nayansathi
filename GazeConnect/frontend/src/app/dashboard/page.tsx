"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/ui/Navbar";
import { useGaze } from "@/components/gaze/GazeProvider";
import {
  Eye,
  Sliders,
  BookmarkPlus,
  History,
  PhoneCall,
  UserCheck,
  ArrowRight,
  Trash2,
  Plus,
  Star,
  CheckCircle2,
  Shield,
  Search,
  Volume2,
  Lock,
} from "lucide-react";

interface SavedPhrase {
  id: string;
  phrase: string;
  category: string;
  is_favorite: boolean;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  confirmation_required: boolean;
}

interface HistoryItem {
  id: string;
  message: string;
  timestamp: string;
}

export default function DashboardPage() {
  const { interactionMode } = useGaze();
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [activeTab, setActiveTab] = useState<"phrases" | "history" | "contacts" | "caregivers" | "settings">("phrases");

  // Phrases state
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [newPhraseText, setNewPhraseText] = useState("");
  const [newPhraseCategory, setNewPhraseCategory] = useState("Daily Needs");

  // History state
  const [consentHistory, setConsentHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  // Emergency contacts state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRel, setNewContactRel] = useState("");

  // Accessibility presets
  const [dwellTime, setDwellTime] = useState(1200);
  const [keyboardLayout, setKeyboardLayout] = useState("QWERTY");
  const [speechRate, setSpeechRate] = useState(1.0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load saved phrases
      const storedPhrases = localStorage.getItem("gazeconnect_saved_phrases");
      if (storedPhrases) {
        try {
          setPhrases(JSON.parse(storedPhrases));
        } catch (e) {}
      } else {
        const defaultPhrases: SavedPhrase[] = [
          { id: "1", phrase: "I need some water please.", category: "Daily Needs", is_favorite: true },
          { id: "2", phrase: "Could you adjust my pillows?", category: "Daily Needs", is_favorite: true },
          { id: "3", phrase: "I am feeling tired.", category: "Daily Needs", is_favorite: false },
          { id: "4", phrase: "Please call the nurse.", category: "Medical", is_favorite: true },
          { id: "5", phrase: "Hello! It is great to see you.", category: "Social", is_favorite: true },
        ];
        setPhrases(defaultPhrases);
        localStorage.setItem("gazeconnect_saved_phrases", JSON.stringify(defaultPhrases));
      }

      // Load history settings
      const storedConsent = localStorage.getItem("gazeconnect_history_consent");
      setConsentHistory(storedConsent === "true");

      const storedHistory = localStorage.getItem("gazeconnect_history");
      if (storedHistory) {
        try {
          setHistoryItems(JSON.parse(storedHistory));
        } catch (e) {}
      }

      // Load contacts
      const storedContacts = localStorage.getItem("gazeconnect_emergency_contacts");
      if (storedContacts) {
        try {
          setContacts(JSON.parse(storedContacts));
        } catch (e) {}
      } else {
        const defaultContacts: EmergencyContact[] = [
          { id: "1", name: "Sarah (Primary Caregiver)", relationship: "Daughter", phone: "+15551234567", confirmation_required: true },
          { id: "2", name: "Dr. Evans (Physician)", relationship: "Neurologist", phone: "+15559876543", confirmation_required: true },
        ];
        setContacts(defaultContacts);
        localStorage.setItem("gazeconnect_emergency_contacts", JSON.stringify(defaultContacts));
      }

      // Load settings
      const savedDwell = localStorage.getItem("gazeconnect_dwell_time");
      if (savedDwell) setDwellTime(Number(savedDwell));
      const savedLayout = localStorage.getItem("gazeconnect_layout");
      if (savedLayout) setKeyboardLayout(savedLayout);
    }
  }, []);

  const handleAddPhrase = () => {
    if (!newPhraseText.trim()) return;
    const newP: SavedPhrase = {
      id: "phrase_" + Date.now(),
      phrase: newPhraseText.trim(),
      category: newPhraseCategory,
      is_favorite: false,
    };
    const updated = [newP, ...phrases];
    setPhrases(updated);
    setNewPhraseText("");
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_saved_phrases", JSON.stringify(updated));
    }
  };

  const handleDeletePhrase = (id: string) => {
    const updated = phrases.filter((p) => p.id !== id);
    setPhrases(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_saved_phrases", JSON.stringify(updated));
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = phrases.map((p) => (p.id === id ? { ...p, is_favorite: !p.is_favorite } : p));
    setPhrases(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_saved_phrases", JSON.stringify(updated));
    }
  };

  const handleToggleConsent = (val: boolean) => {
    setConsentHistory(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_history_consent", String(val));
      if (!val) {
        localStorage.removeItem("gazeconnect_history");
        setHistoryItems([]);
      }
    }
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("gazeconnect_history");
    }
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    const newC: EmergencyContact = {
      id: "contact_" + Date.now(),
      name: newContactName.trim(),
      relationship: newContactRel.trim() || "Family",
      phone: newContactPhone.trim(),
      confirmation_required: true,
    };
    const updated = [...contacts, newC];
    setContacts(updated);
    setNewContactName("");
    setNewContactPhone("");
    setNewContactRel("");
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_emergency_contacts", JSON.stringify(updated));
    }
  };

  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_emergency_contacts", JSON.stringify(updated));
    }
  };

  const handleSaveSettings = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gazeconnect_dwell_time", String(dwellTime));
      localStorage.setItem("gazeconnect_layout", keyboardLayout);
      localStorage.setItem("gazeconnect_speech_rate", String(speechRate));
      alert("Accessibility preferences updated successfully!");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isHighContrast ? "bg-slate-950 text-slate-100" : "bg-ice-50 text-slate-900"
    }`}>
      <Navbar
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
      />

      <main className="flex-1 w-full max-w-none px-4 md:px-6 py-6 space-y-6">
        {/* Top Header Card */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm ${
          isHighContrast ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Patient Control Dashboard
            </h1>
            <p className={`text-sm mt-1 ${isHighContrast ? "text-slate-400" : "text-slate-600"}`}>
              Customize your communication phrases, privacy preferences, emergency network, and calibration settings.
            </p>
          </div>

          <a
            href="/communicate"
            data-dwell="true"
            aria-label="Launch Communication Mode"
            className="inline-flex items-center gap-2 px-5 py-3 min-h-[52px] rounded-2xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 transition-all self-start sm:self-auto"
          >
            <Eye className="w-4 h-4" />
            <span>Launch Communication Mode</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className={`flex gap-2 border-b pb-2 overflow-x-auto ${
          isHighContrast ? "border-slate-800" : "border-slate-200"
        }`} role="tablist">
          {[
            { id: "phrases", label: "Saved Phrases", icon: BookmarkPlus },
            { id: "history", label: "Communication History", icon: History },
            { id: "contacts", label: "Emergency Network", icon: PhoneCall },
            { id: "caregivers", label: "Caregiver Access", icon: UserCheck },
            { id: "settings", label: "Accessibility Settings", icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={`Switch to ${tab.label} tab`}
                data-dwell="true"
                onClick={() => setActiveTab(tab.id as "phrases" | "history" | "contacts" | "caregivers" | "settings")}
                className={`flex items-center gap-2 px-4 py-2.5 min-h-[60px] rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Saved Phrases Manager */}
        {activeTab === "phrases" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Saved Phrases Manager</h2>
                <p className="text-xs text-slate-500">Quickly add or edit phrases accessible during 1-dwell selection.</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type new phrase..."
                  value={newPhraseText}
                  onChange={(e) => setNewPhraseText(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-teal-600 w-64"
                />
                <select
                  value={newPhraseCategory}
                  onChange={(e) => setNewPhraseCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Daily Needs">Daily Needs</option>
                  <option value="Medical">Medical</option>
                  <option value="Social">Social</option>
                </select>
                <button
                  type="button"
                  data-dwell="true"
                  aria-label="Add new phrase"
                  onClick={handleAddPhrase}
                  className="px-4 py-2 min-h-[60px] rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {phrases.map((phrase) => (
                <div
                  key={phrase.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {phrase.category}
                    </span>
                    <p className="font-semibold text-slate-900 text-sm mt-1">{phrase.phrase}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-dwell="true"
                      aria-label={`${phrase.is_favorite ? "Remove from" : "Add to"} favourites: ${phrase.phrase}`}
                      onClick={() => handleToggleFavorite(phrase.id)}
                      className={`p-2 min-h-[60px] rounded-lg ${phrase.is_favorite ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
                      title="Toggle Favourite"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      type="button"
                      data-dwell="true"
                      aria-label={`Delete phrase: ${phrase.phrase}`}
                      onClick={() => handleDeletePhrase(phrase.id)}
                      className="p-2 min-h-[60px] rounded-lg text-slate-400 hover:text-red-600"
                      title="Delete Phrase"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Consent-Gated History */}
        {activeTab === "history" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-teal-700 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-teal-900 text-sm">Save History Only With My Consent</h3>
                  <p className="text-xs text-teal-800">
                    When disabled, no spoken sentences or typed logs are persisted on disk or in cloud storage.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentHistory}
                  onChange={(e) => handleToggleConsent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
              </label>
            </div>

            {consentHistory ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search spoken history..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    data-dwell="true"
                    aria-label="Delete all communication history"
                    onClick={handleClearHistory}
                    className="px-3.5 py-2 min-h-[60px] rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All History</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {historyItems
                    .filter((item) => item.message.toLowerCase().includes(historySearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-sm"
                      >
                        <span className="font-semibold text-slate-800">{item.message}</span>
                        <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  {historyItems.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">No spoken communication history recorded yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-700">Communication History Recording is Disabled</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your privacy is fully protected. Enable the consent toggle above if you wish to maintain a local archive of your spoken messages.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Emergency Contacts Manager */}
        {activeTab === "contacts" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Emergency Contacts Network</h2>
              <p className="text-xs text-slate-500">
                Designated contacts to notify when Emergency Mode is triggered. All external calls require explicit confirmation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="text"
                placeholder="Contact Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Relationship (e.g., Nurse)"
                value={newContactRel}
                onChange={(e) => setNewContactRel(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <button
                type="button"
                data-dwell="true"
                aria-label="Add emergency contact"
                onClick={handleAddContact}
                className="px-4 py-2 min-h-[60px] rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                    <span className="text-xs text-slate-500">{c.relationship} • {c.phone}</span>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                      <span>Requires confirmation before calling</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-dwell="true"
                    aria-label={`Remove contact: ${c.name}`}
                    onClick={() => handleDeleteContact(c.id)}
                    className="p-2 min-h-[60px] text-slate-400 hover:text-red-600"
                    title="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Caregiver Access Management */}
        {activeTab === "caregivers" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Caregiver Access Management</h2>
              <p className="text-xs text-slate-500">
                Grant or revoke permission for caregivers to configure your vocabulary, emergency contacts, or view consented logs.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Active Caregiver: Primary Family Caregiver</h4>
                <p className="text-xs text-slate-500">Granted: Phrase Management &amp; Emergency Contact Configuration</p>
                <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Status: Active Connection
                </span>
              </div>
              <button
                type="button"
                data-dwell="true"
                aria-label="Revoke caregiver access"
                onClick={() => alert("Caregiver connection revoked.")}
                className="px-3 py-1.5 min-h-[60px] rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200"
              >
                Revoke Access
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Accessibility Settings */}
        {activeTab === "settings" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Accessibility &amp; Gaze Presets</h2>
              <p className="text-xs text-slate-500">Tune dwell timings, layouts, and speech synthesis rates.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Dwell Time Duration: <span className="text-teal-600">{dwellTime} ms</span>
                </label>
                <input
                  type="range"
                  min="600"
                  max="2500"
                  step="100"
                  value={dwellTime}
                  onChange={(e) => setDwellTime(Number(e.target.value))}
                  className="w-full mt-2 accent-teal-600"
                />
                <span className="text-[11px] text-slate-500">Fast (600ms) to Relaxed (2500ms)</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">Virtual Keyboard Layout</label>
                <select
                  value={keyboardLayout}
                  onChange={(e) => setKeyboardLayout(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="QWERTY">Standard QWERTY</option>
                  <option value="Simplified">Simplified (Vowels &amp; High Frequency Grouped)</option>
                  <option value="Large-Key">Large-Key (Oversized 6-Column Grid)</option>
                  <option value="High-Contrast">High-Contrast (Pure Black &amp; Bright Yellow)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Speech Synthesis Rate: <span className="text-teal-600">{speechRate.toFixed(1)}x</span>
                </label>
                <input
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(Number(e.target.value))}
                  className="w-full mt-2 accent-teal-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  data-dwell="true"
                  aria-label="Save accessibility preferences"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 min-h-[60px] rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow"
                >
                  Save Accessibility Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

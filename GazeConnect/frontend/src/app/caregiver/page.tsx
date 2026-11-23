"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/ui/Navbar";
import {
  Users,
  UserCheck,
  Shield,
  Sliders,
  BookmarkPlus,
  PhoneCall,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";

interface PatientConnection {
  patientId: string;
  patientName: string;
  status: "active" | "pending" | "revoked";
  permissionLevel: "full" | "read_phrases" | "settings_only";
  lastActive: string;
}

export default function CaregiverPortal() {
  const [patients, setPatients] = useState<PatientConnection[]>([
    {
      patientId: "patient_001",
      patientName: "Arthur Pendelton",
      status: "active",
      permissionLevel: "full",
      lastActive: "Today, 10:45 AM",
    },
    {
      patientId: "patient_002",
      patientName: "Elena Rostova",
      status: "pending",
      permissionLevel: "settings_only",
      lastActive: "Never (Pending Consent)",
    },
  ]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>("patient_001");
  const [activeTab, setActiveTab] = useState<"phrases" | "settings" | "contacts" | "history">("phrases");

  // Sample phrases for selected active patient
  const [patientPhrases, setPatientPhrases] = useState<string[]>([
    "I need water.",
    "Could you raise the backrest 15 degrees?",
    "My feet feel cold.",
    "Please bring my medication.",
  ]);
  const [newPhrase, setNewPhrase] = useState("");

  const activePatient = patients.find((p) => p.patientId === selectedPatientId && p.status === "active");

  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;
    setPatientPhrases([...patientPhrases, newPhrase.trim()]);
    setNewPhrase("");
  };

  const handleDeletePhrase = (index: number) => {
    setPatientPhrases(patientPhrases.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen flex flex-col bg-ice-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="flex-1 w-full max-w-none px-4 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-2">
              <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Consent-Gated Caregiver Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Caregiver Assistant & Remote Config
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Configure communication presets, update quick phrases, and support your connected patients.
            </p>
          </div>
        </div>

        {/* Patient Selection Strip */}
        <section className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Connected Patients Network
          </label>
          <div className="flex flex-wrap gap-3">
            {patients.map((pat) => {
              const isSelected = selectedPatientId === pat.patientId;
              const isActive = pat.status === "active";
              return (
                <button
                  key={pat.patientId}
                  type="button"
                  data-dwell="true"
                  onClick={() => setSelectedPatientId(pat.patientId)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? "border-teal-600 bg-teal-50 dark:bg-teal-950/60 ring-2 ring-teal-600/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className={`p-2 rounded-xl font-bold text-sm ${
                    isActive ? "bg-teal-600 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{pat.patientName}</h4>
                    <span className={`text-[11px] font-semibold ${
                      isActive ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                    }`}>
                      {isActive ? "Active Connection" : "Consent Pending"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {activePatient ? (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: "phrases", label: "Patient Phrases", icon: BookmarkPlus },
                { id: "settings", label: "Gaze Timings & Layout", icon: Sliders },
                { id: "contacts", label: "Emergency Contacts", icon: PhoneCall },
                { id: "history", label: "Consented History", icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-dwell="true"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                      isCurrent
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

            {/* Phrases Config */}
            {activeTab === "phrases" && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">Custom Quick Phrases for {activePatient.patientName}</h3>
                    <p className="text-xs text-slate-500">Phrases added here appear immediately on the patient&apos;s screen.</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add new phrase..."
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm w-72"
                    />
                    <button
                      type="button"
                      data-dwell="true"
                      onClick={handleAddPhrase}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {patientPhrases.map((phrase, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold text-slate-800">{phrase}</span>
                      <button
                        type="button"
                        data-dwell="true"
                        onClick={() => handleDeletePhrase(idx)}
                        className="text-slate-400 hover:text-red-600 p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Config */}
            {activeTab === "settings" && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 max-w-xl">
                <h3 className="font-bold text-slate-900">Adjust Gaze Thresholds</h3>
                <div>
                  <label className="text-xs font-bold text-slate-600 block">Dwell Time</label>
                  <select className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white">
                    <option value="800">800 ms (Fast)</option>
                    <option value="1200" selected>1200 ms (Balanced / Recommended)</option>
                    <option value="1800">1800 ms (Relaxed / Reduced Fatigue)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block">Keyboard Layout Preference</label>
                  <select className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white">
                    <option value="QWERTY">Standard QWERTY</option>
                    <option value="Simplified">Simplified (Vowels Centered)</option>
                    <option value="Large-Key">Large-Key 6-Column</option>
                  </select>
                </div>
                <button
                  type="button"
                  data-dwell="true"
                  onClick={() => alert("Settings saved for patient.")}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm"
                >
                  Save Settings to Patient Profile
                </button>
              </div>
            )}

            {/* Emergency Contacts Config */}
            {activeTab === "contacts" && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">Designated Emergency Contacts</h3>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold">
                  Note: All external calls or SMS dispatch actions require explicit patient screen confirmation.
                </div>
                <p className="text-xs text-slate-500">2 verified emergency contacts on file.</p>
              </div>
            )}

            {/* Consented History */}
            {activeTab === "history" && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900">Consented Communication Logs</h3>
                <p className="text-xs text-slate-500">
                  Logs are strictly displayed only when the patient has turned on their explicit history consent toggle.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Recent message: &ldquo;Could you raise the backrest 15 degrees?&rdquo; (Today, 10:45 AM)
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
            <Lock className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">Connection Consent Pending</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              This patient has not yet approved your caregiver connection request. Once approved from their dashboard, their communication presets will appear here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

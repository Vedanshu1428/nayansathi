/**
 * GazeConnect Local Storage & Cache Manager
 * Robust offline persistence for calibration, preferences, phrases, history, and emergency settings.
 */

import { CalibrationModelData, DwellSettings } from "../gaze/types";

export interface StoredPreferences {
  interactionMode: "gaze" | "mouse";
  dwellTimeMs: number;
  smoothingBeta: number;
  keyboardLayout: string;
  speechRate: number;
  preferredLanguage: string;
  isHighContrast: boolean;
  historyConsent: boolean;
}

const DEFAULT_PREFERENCES: StoredPreferences = {
  interactionMode: "gaze",
  dwellTimeMs: 1200,
  smoothingBeta: 0.05,
  keyboardLayout: "QWERTY",
  speechRate: 1.0,
  preferredLanguage: "en-US",
  isHighContrast: false,
  historyConsent: false,
};

const KEYS = {
  PREFERENCES: "gazeconnect_preferences_v1",
  CALIBRATION: "gazeconnect_calibration_v1",
  SAVED_PHRASES: "gazeconnect_saved_phrases",
  HISTORY: "gazeconnect_history",
  EMERGENCY_CONTACTS: "gazeconnect_emergency_contacts",
  MODE: "gazeconnect_interaction_mode",
};

export class LocalStore {
  public static getPreferences(): StoredPreferences {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
      const data = localStorage.getItem(KEYS.PREFERENCES);
      if (data) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn("Failed to read preferences from localStorage:", e);
    }
    return DEFAULT_PREFERENCES;
  }

  public static savePreferences(prefs: Partial<StoredPreferences>): void {
    if (typeof window === "undefined") return;
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...prefs };
      localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save preferences to localStorage:", e);
    }
  }

  public static getCalibration(): CalibrationModelData | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(KEYS.CALIBRATION);
      if (data) {
        return JSON.parse(data) as CalibrationModelData;
      }
    } catch (e) {
      console.warn("Failed to read calibration from localStorage:", e);
    }
    return null;
  }

  public static saveCalibration(model: CalibrationModelData): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEYS.CALIBRATION, JSON.stringify(model));
    } catch (e) {
      console.error("Failed to save calibration to localStorage:", e);
    }
  }

  public static appendHistory(message: string): void {
    if (typeof window === "undefined") return;
    const prefs = this.getPreferences();
    if (!prefs.historyConsent) return; // Strict consent gate

    try {
      const data = localStorage.getItem(KEYS.HISTORY);
      const list = data ? JSON.parse(data) : [];
      list.unshift({
        id: "msg_" + Date.now(),
        message,
        timestamp: new Date().toISOString(),
      });
      // Retain maximum 200 items locally
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(list.slice(0, 200)));
    } catch (e) {
      console.error("Failed to append history to localStorage:", e);
    }
  }

  public static clearAllData(): void {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => {
      localStorage.removeItem(k);
    });
  }
}

/**
 * GazeConnect Dwell Engine
 * Manages visual dwell-time selection for elements with data-dwell="true".
 * Features:
 * - 90px discrete cell-snap capture radius with hysteresis locking
 * - 12px/24px magnetic snap padding
 * - 150ms micro-jitter exit grace buffer
 * - Radial dwell progress calculation (0.0 to 1.0)
 * - 600ms post-selection cooldown
 * - Mandatory gaze exit before re-selection of the same element
 * - Hold-Blink selection mode (hold eyes closed >= blinkHoldMs to click)
 * - Freeze cursor to last open-eye position during eye closure
 */

import { DwellSettings, DwellState, SelectionMode } from "./types";

export class DwellEngine {
  private settings: DwellSettings;
  private currentTarget: HTMLElement | null = null;
  private dwellStartTime: number | null = null;
  private lastExitTime: number | null = null;
  private exitCandidate: HTMLElement | null = null;

  private isCoolingDown: boolean = false;
  private cooldownEndTime: number = 0;
  private lastSelectedElement: HTMLElement | null = null;

  // Blink-hold state
  private blinkStartTime: number | null = null;
  private isBlinkHolding: boolean = false;

  // Frozen gaze: last known position while eyes were open
  private lastOpenGazeX: number = 0;
  private lastOpenGazeY: number = 0;

  // Cell snap state
  private snappedElement: HTMLElement | null = null;
  private snappedCenterX: number = 0;
  private snappedCenterY: number = 0;

  constructor(settings: Partial<DwellSettings> = {}) {
    this.settings = {
      dwellTimeMs: settings.dwellTimeMs ?? 1200,
      exitGraceMs: settings.exitGraceMs ?? 150,
      cooldownMs: settings.cooldownMs ?? 600,
      hitPaddingPx: settings.hitPaddingPx ?? 24,
      selectionMode: settings.selectionMode ?? "hold_blink",
      blinkHoldMs: settings.blinkHoldMs ?? 450,
      blinkCooldownMs: settings.blinkCooldownMs ?? 900,
      snapRadiusPx: settings.snapRadiusPx ?? 90,
      enableCellSnap: settings.enableCellSnap ?? true,
    };
  }

  public setSettings(newSettings: Partial<DwellSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): DwellSettings {
    return { ...this.settings };
  }

  /**
   * Finds the nearest [data-dwell="true"] element within snapRadius (default 90px)
   * with hysteresis to lock onto the current button until gaze clearly moves toward another button.
   */
  private findSnapTarget(
    x: number,
    y: number
  ): { element: HTMLElement; centerX: number; centerY: number } | null {
    if (typeof document === "undefined") return null;

    const snapRadius = this.settings.snapRadiusPx ?? 90;
    const candidates = document.querySelectorAll('[data-dwell="true"]');
    if (candidates.length === 0) return null;

    let nearestEl: HTMLElement | null = null;
    let minDistance = Infinity;
    let bestCenterX = 0;
    let bestCenterY = 0;

    // Hysteresis bias: if already snapped to an element, give it a 35px sticky buffer
    const STICKY_BUFFER_PX = 35;

    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (!(el instanceof HTMLElement)) continue;

      const rect = el.getBoundingClientRect();
      // Skip invisible / zero-sized elements
      if (rect.width === 0 || rect.height === 0) continue;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dist = Math.hypot(x - cx, y - cy);

      if (el === this.snappedElement) {
        dist = Math.max(0, dist - STICKY_BUFFER_PX);
      }

      if (dist < minDistance && dist <= snapRadius) {
        minDistance = dist;
        nearestEl = el;
        bestCenterX = cx;
        bestCenterY = cy;
      }
    }

    if (nearestEl) {
      return { element: nearestEl, centerX: bestCenterX, centerY: bestCenterY };
    }

    return null;
  }

  /**
   * Hit tests DOM for elements with data-dwell="true" at (x, y) with fallback magnetic search.
   */
  private findDwellElement(x: number, y: number): HTMLElement | null {
    if (typeof document === "undefined") return null;

    // Direct hit test
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (el instanceof HTMLElement) {
        if (el.getAttribute("data-dwell") === "true") {
          return el;
        }
        const closest = el.closest('[data-dwell="true"]');
        if (closest instanceof HTMLElement) {
          return closest;
        }
      }
    }

    // Radial search
    const pad = this.settings.hitPaddingPx;
    const diag = Math.round(pad * 0.707);
    const offsets: [number, number][] = [
      [0, -pad],
      [0, pad],
      [-pad, 0],
      [pad, 0],
      [-diag, -diag],
      [diag, -diag],
      [-diag, diag],
      [diag, diag],
    ];

    for (const [ox, oy] of offsets) {
      const paddedElements = document.elementsFromPoint(x + ox, y + oy);
      for (const el of paddedElements) {
        if (el instanceof HTMLElement) {
          if (el.getAttribute("data-dwell") === "true") {
            return el;
          }
          const closest = el.closest('[data-dwell="true"]');
          if (closest instanceof HTMLElement) {
            return closest;
          }
        }
      }
    }

    return null;
  }

  /**
   * Updates dwell state given current filtered gaze coordinates and timestamp.
   * Returns current DwellState with snapped coordinates if cell snap is active.
   */
  public update(
    x: number,
    y: number,
    timestamp: number,
    eyeFeatures?: { isEyesClosed: boolean; closedDurationMs: number; avgEAR: number }
  ): DwellState {
    const isEyesClosed = eyeFeatures?.isEyesClosed ?? false;
    const closedDurationMs = eyeFeatures?.closedDurationMs ?? 0;

    if (!isEyesClosed) {
      this.lastOpenGazeX = x;
      this.lastOpenGazeY = y;
    }

    const effectiveX = isEyesClosed ? this.lastOpenGazeX : x;
    const effectiveY = isEyesClosed ? this.lastOpenGazeY : y;

    // Discrete Cell Snapping check
    let snappedX: number | undefined;
    let snappedY: number | undefined;
    let isSnapped = false;
    let detectedElement: HTMLElement | null = null;

    if (this.settings.enableCellSnap) {
      const snapResult = this.findSnapTarget(effectiveX, effectiveY);
      if (snapResult) {
        this.snappedElement = snapResult.element;
        this.snappedCenterX = snapResult.centerX;
        this.snappedCenterY = snapResult.centerY;
        snappedX = snapResult.centerX;
        snappedY = snapResult.centerY;
        isSnapped = true;
        detectedElement = snapResult.element;
      } else {
        this.snappedElement = null;
        detectedElement = this.findDwellElement(effectiveX, effectiveY);
      }
    } else {
      detectedElement = this.findDwellElement(effectiveX, effectiveY);
    }

    // 1. Check cooldown period
    if (this.isCoolingDown) {
      if (timestamp < this.cooldownEndTime) {
        return {
          targetElement: this.currentTarget,
          dwellProgress: 0,
          isCoolingDown: true,
          lastSelectedElement: this.lastSelectedElement,
          blinkProgress: 0,
          isBlinkHolding: this.isBlinkHolding,
          snappedX,
          snappedY,
          isSnapped,
        };
      } else {
        this.isCoolingDown = false;
      }
    }

    // 2. Hold-Blink / Hybrid mode selection logic
    const mode: SelectionMode = this.settings.selectionMode ?? "hold_blink";
    let blinkProgress = 0;

    if (mode === "hold_blink" || mode === "hybrid") {
      if (isEyesClosed) {
        if (this.blinkStartTime === null) {
          this.blinkStartTime = timestamp;
        }
        blinkProgress = Math.min(1.0, closedDurationMs / (this.settings.blinkHoldMs ?? 450));
        this.isBlinkHolding = true;

        if (closedDurationMs >= (this.settings.blinkHoldMs ?? 450)) {
          const blinkTarget = detectedElement || this.findDwellElement(this.lastOpenGazeX, this.lastOpenGazeY);
          if (blinkTarget && blinkTarget !== this.lastSelectedElement) {
            blinkTarget.click();
            this.isCoolingDown = true;
            this.cooldownEndTime = timestamp + (this.settings.blinkCooldownMs ?? 900);
            this.lastSelectedElement = blinkTarget;
            this.blinkStartTime = null;
            this.isBlinkHolding = false;
            return {
              targetElement: blinkTarget,
              dwellProgress: 1.0,
              isCoolingDown: true,
              lastSelectedElement: blinkTarget,
              blinkProgress: 1.0,
              isBlinkHolding: false,
              snappedX,
              snappedY,
              isSnapped,
            };
          }
        }
      } else {
        if (this.blinkStartTime !== null) {
          this.blinkStartTime = null;
        }
        this.isBlinkHolding = false;
        blinkProgress = 0;
      }
    }

    if (mode === "hold_blink" && isEyesClosed) {
      return {
        targetElement: this.currentTarget,
        dwellProgress: 0,
        isCoolingDown: false,
        lastSelectedElement: this.lastSelectedElement,
        blinkProgress,
        isBlinkHolding: this.isBlinkHolding,
        snappedX,
        snappedY,
        isSnapped,
      };
    }

    // 4. Handle Gaze Exit & 150ms Grace Buffer
    if (detectedElement !== this.currentTarget) {
      if (this.currentTarget !== null) {
        if (this.lastExitTime === null) {
          this.lastExitTime = timestamp;
          this.exitCandidate = this.currentTarget;
        }

        const elapsedExit = timestamp - this.lastExitTime;
        if (elapsedExit > this.settings.exitGraceMs) {
          if (this.currentTarget.classList.contains("dwell-hover")) {
            this.currentTarget.classList.remove("dwell-hover");
          }
          this.currentTarget = detectedElement;
          this.dwellStartTime = detectedElement ? timestamp : null;
          this.lastExitTime = null;
          this.exitCandidate = null;

          if (detectedElement !== this.lastSelectedElement) {
            this.lastSelectedElement = null;
          }
        }
      } else {
        this.currentTarget = detectedElement;
        this.dwellStartTime = detectedElement ? timestamp : null;
        this.lastExitTime = null;
        this.exitCandidate = null;
      }
    } else {
      this.lastExitTime = null;
      this.exitCandidate = null;
    }

    // 5. If no target or still hovering over last selected element without exit
    if (!this.currentTarget || this.currentTarget === this.lastSelectedElement) {
      return {
        targetElement: null,
        dwellProgress: 0,
        isCoolingDown: false,
        lastSelectedElement: this.lastSelectedElement,
        blinkProgress,
        isBlinkHolding: this.isBlinkHolding,
        snappedX,
        snappedY,
        isSnapped,
      };
    }

    // Visual hover outline class
    this.currentTarget.classList.add("dwell-hover");

    // 6. Compute dwell progress
    if (this.dwellStartTime === null) {
      this.dwellStartTime = timestamp;
    }

    const elapsed = timestamp - this.dwellStartTime;
    const progress = Math.min(1.0, elapsed / this.settings.dwellTimeMs);

    // 7. Trigger Selection at 100% Progress
    if (progress >= 1.0) {
      const selectedEl = this.currentTarget;
      selectedEl.click();

      this.isCoolingDown = true;
      this.cooldownEndTime = timestamp + this.settings.cooldownMs;
      this.lastSelectedElement = selectedEl;
      this.currentTarget = null;
      this.dwellStartTime = null;

      if (selectedEl.classList.contains("dwell-hover")) {
        selectedEl.classList.remove("dwell-hover");
      }

      return {
        targetElement: selectedEl,
        dwellProgress: 1.0,
        isCoolingDown: true,
        lastSelectedElement: selectedEl,
        blinkProgress,
        isBlinkHolding: this.isBlinkHolding,
        snappedX,
        snappedY,
        isSnapped,
      };
    }

    return {
      targetElement: this.currentTarget,
      dwellProgress: progress,
      isCoolingDown: false,
      lastSelectedElement: this.lastSelectedElement,
      blinkProgress,
      isBlinkHolding: this.isBlinkHolding,
      snappedX,
      snappedY,
      isSnapped,
    };
  }

  public reset(): void {
    if (this.currentTarget && this.currentTarget.classList.contains("dwell-hover")) {
      this.currentTarget.classList.remove("dwell-hover");
    }
    this.currentTarget = null;
    this.dwellStartTime = null;
    this.lastExitTime = null;
    this.exitCandidate = null;
    this.isCoolingDown = false;
    this.lastSelectedElement = null;
    this.blinkStartTime = null;
    this.isBlinkHolding = false;
    this.snappedElement = null;
  }
}
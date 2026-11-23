/**
 * GazeConnect Dwell Engine
 * Manages visual dwell-time selection for elements with data-dwell="true".
 * Features:
 * - 12px accessibility hit padding
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
  private frozenGazeX: number = 0;
  private frozenGazeY: number = 0;
  private lastOpenGazeX: number = 0;
  private lastOpenGazeY: number = 0;

  constructor(settings: Partial<DwellSettings> = {}) {
    this.settings = {
      dwellTimeMs: settings.dwellTimeMs ?? 1200,
      exitGraceMs: settings.exitGraceMs ?? 150,
      cooldownMs: settings.cooldownMs ?? 600,
      hitPaddingPx: settings.hitPaddingPx ?? 24,
      selectionMode: settings.selectionMode ?? "hold_blink",
      blinkHoldMs: settings.blinkHoldMs ?? 450,
      blinkCooldownMs: settings.blinkCooldownMs ?? 900,
    };
  }

  public setSettings(newSettings: Partial<DwellSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): DwellSettings {
    return { ...this.settings };
  }

  /**
   * Hit tests DOM for elements with data-dwell="true" at (x, y) with 24px magnetic snap padding.
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
        // Check closest ancestor with data-dwell="true"
        const closest = el.closest('[data-dwell="true"]');
        if (closest instanceof HTMLElement) {
          return closest;
        }
      }
    }

    // 24px magnetic snap radius check: 8 radial directions
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
   * Returns current DwellState for UI rendering.
   */
  public update(
    x: number,
    y: number,
    timestamp: number,
    eyeFeatures?: { isEyesClosed: boolean; closedDurationMs: number; avgEAR: number }
  ): DwellState {
    // Track last open-eye gaze position for frozen cursor
    const isEyesClosed = eyeFeatures?.isEyesClosed ?? false;
    const closedDurationMs = eyeFeatures?.closedDurationMs ?? 0;

    if (!isEyesClosed) {
      this.lastOpenGazeX = x;
      this.lastOpenGazeY = y;
    }

    // When eyes close, use the frozen last-open position for hit testing
    const effectiveX = isEyesClosed ? this.lastOpenGazeX : x;
    const effectiveY = isEyesClosed ? this.lastOpenGazeY : y;

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

        // Natural blink guard: only fire if closed >= blinkHoldMs
        if (closedDurationMs >= (this.settings.blinkHoldMs ?? 450)) {
          // Find element at frozen gaze position
          const blinkTarget = this.findDwellElement(this.lastOpenGazeX, this.lastOpenGazeY);
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
            };
          }
        }
      } else {
        // Eyes open: reset blink tracking
        if (this.blinkStartTime !== null) {
          this.blinkStartTime = null;
        }
        this.isBlinkHolding = false;
        blinkProgress = 0;
      }
    }

    // If hold_blink mode and eyes are currently closed, skip dwell advancement
    if (mode === "hold_blink" && isEyesClosed) {
      return {
        targetElement: this.currentTarget,
        dwellProgress: 0,
        isCoolingDown: false,
        lastSelectedElement: this.lastSelectedElement,
        blinkProgress,
        isBlinkHolding: this.isBlinkHolding,
      };
    }

    // 3. Locate target element under effective gaze point
    const detectedElement = this.findDwellElement(effectiveX, effectiveY);

    // 4. Handle Gaze Exit & 150ms Grace Buffer
    if (detectedElement !== this.currentTarget) {
      if (this.currentTarget !== null) {
        // Gaze just moved off the current target
        if (this.lastExitTime === null) {
          this.lastExitTime = timestamp;
          this.exitCandidate = this.currentTarget;
        }

        const elapsedExit = timestamp - this.lastExitTime;
        if (elapsedExit > this.settings.exitGraceMs) {
          // Grace period expired: confirm exit!
          if (this.currentTarget.classList.contains("dwell-hover")) {
            this.currentTarget.classList.remove("dwell-hover");
          }
          this.currentTarget = detectedElement;
          this.dwellStartTime = detectedElement ? timestamp : null;
          this.lastExitTime = null;
          this.exitCandidate = null;

          // If gaze exited the previously selected element, clear re-arm block
          if (detectedElement !== this.lastSelectedElement) {
            this.lastSelectedElement = null;
          }
        }
        // Within grace window: preserve current target & progress
      } else {
        // Moved from empty space onto a new element
        this.currentTarget = detectedElement;
        this.dwellStartTime = detectedElement ? timestamp : null;
        this.lastExitTime = null;
        this.exitCandidate = null;
      }
    } else {
      // Gaze remains on current target (or came back before grace expired)
      this.lastExitTime = null;
      this.exitCandidate = null;
    }

    // 5. If no target or still hovering over last selected element without exit, dwell is idle
    if (!this.currentTarget || this.currentTarget === this.lastSelectedElement) {
      return {
        targetElement: null,
        dwellProgress: 0,
        isCoolingDown: false,
        lastSelectedElement: this.lastSelectedElement,
        blinkProgress,
        isBlinkHolding: this.isBlinkHolding,
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

      // Dispatch real DOM click
      selectedEl.click();

      // Trigger cooldown and require exit before re-selection
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
      };
    }

    return {
      targetElement: this.currentTarget,
      dwellProgress: progress,
      isCoolingDown: false,
      lastSelectedElement: this.lastSelectedElement,
      blinkProgress,
      isBlinkHolding: this.isBlinkHolding,
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
  }
}

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

import {
  DwellSettings,
  DwellState,
  SelectionMode,
  GazeSensitivity,
  GAZE_SENSITIVITY_THRESHOLDS,
  DiscreteDirection,
} from "./types";

// Helper to clear any existing focus highlight
  private clearFocus(): void {
    const prev = document.querySelector('[data-gaze-focused="true"]');
    if (prev) {
      prev.removeAttribute('data-gaze-focused');
      prev.classList.remove('gazeconnect-discrete-focus');
    }
  }

  // Return‑to‑Center lock helpers
  private isInDeadZone(deltaX: number, deltaY: number): boolean {
    const thr = GAZE_SENSITIVITY_THRESHOLDS[this.getSensitivity()];
    return Math.abs(deltaX) < thr.x * 0.5 && Math.abs(deltaY) < thr.y * 0.5;
  }

  /**
   * Moves focus one step in the given direction, then locks until the user returns to the centre.
   * Called from GazeProvider when a discrete direction is detected.
   */
  public stepDirection(dir: DiscreteDirection, timestamp: number, deltaX: number, deltaY: number): void {
    // If we are in lock mode, only release when both cooldown passed and gaze is back to centre
    if (this.mustReturnToCenter) {
      if (timestamp >= this.stepCooldownEnd && this.isInDeadZone(deltaX, deltaY)) {
        this.mustReturnToCenter = false;
      } else {
        // Still locked – ignore any new direction
        return;
      }
    }

    if (dir === "CENTER") return; // no movement needed

    // Find all dwellable elements
    const candidates = Array.from(document.querySelectorAll('[data-dwell="true"]')) as HTMLElement[];
    if (candidates.length === 0) return;

    // Determine the currently focused element (if any)
    const current = document.querySelector('[data-gaze-focused="true"]') as HTMLElement | null;
    let target: HTMLElement | null = null;
    if (current) {
      const idx = candidates.indexOf(current);
      if (idx !== -1) {
        // Simple linear ordering: RIGHT/DOWN -> next, LEFT/UP -> previous
        if (dir === "RIGHT" || dir === "DOWN") {
          target = candidates[(idx + 1) % candidates.length];
        } else if (dir === "LEFT" || dir === "UP") {
          target = candidates[(idx - 1 + candidates.length) % candidates.length];
        }
      }
    }
    // If no current focus, just pick the first candidate
    if (!target) target = candidates[0];

    if (target) {
      this.clearFocus();
      target.setAttribute('data-gaze-focused', 'true');
      target.classList.add('gazeconnect-discrete-focus');
      // Engage lock
      this.mustReturnToCenter = true;
      this.stepCooldownEnd = timestamp + 1500; // 1.5 s lock
    }
  }

  // ---------------------------------------------------------------------
  // Updated blink‑hold handling – fire a single click after 600 ms closed
  // ---------------------------------------------------------------------
  private blinkClickLocked: boolean = false;

  public update(
    x: number,
    y: number,
    timestamp: number,
    eyeFeatures?: { isEyesClosed: boolean; closedDurationMs: number; avgEAR: number }
  ): DwellState {
    const isEyesClosed = eyeFeatures?.isEyesClosed ?? false;
    const closedDurationMs = eyeFeatures?.closedDurationMs ?? 0;

    // Track last open‑eye gaze for fallback clicks
    if (!isEyesClosed) {
      this.lastOpenGazeX = x;
      this.lastOpenGazeY = y;
      // Reset blink‑click lock when eyes open
      this.blinkClickLocked = false;
    }

    const effectiveX = isEyesClosed ? this.lastOpenGazeX : x;
    const effectiveY = isEyesClosed ? this.lastOpenGazeY : y;

    // ---------- Cell‑snap (unchanged) ----------
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

    // ---------- Cool‑down handling (blink click) ----------
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

    // ---------- Blink‑hold click ----------
    if (isEyesClosed) {
      // Show visual blink progress but do not move focus
      const blinkProgress = Math.min(1, closedDurationMs / (this.settings.blinkHoldMs ?? 450));
      this.isBlinkHolding = true;

      if (closedDurationMs >= (this.settings.blinkHoldMs ?? 450) && !this.blinkClickLocked) {
        const clickTarget = detectedElement || this.findDwellElement(this.lastOpenGazeX, this.lastOpenGazeY);
        if (clickTarget) {
          clickTarget.click();
        }
        this.blinkClickLocked = true;
        // After a successful click we lock further actions for 1 second
        this.isCoolingDown = true;
        this.cooldownEndTime = timestamp + 1000;
        this.lastSelectedElement = clickTarget;
      }

      return {
        targetElement: this.currentTarget,
        dwellProgress: 0,
        isCoolingDown: this.isCoolingDown,
        lastSelectedElement: this.lastSelectedElement,
        blinkProgress,
        isBlinkHolding: this.isBlinkHolding,
        snappedX,
        snappedY,
        isSnapped,
      };
    }

    // When eyes are open, reset blink‑holding flag
    this.isBlinkHolding = false;

    // ---------- No auto‑scan or dwell‑selection in this simplified mode ----------
    // We simply keep the current focus (if any) and return basic state.
    return {
      targetElement: this.currentTarget,
      dwellProgress: 0,
      isCoolingDown: false,
      lastSelectedElement: this.lastSelectedElement,
      blinkProgress: 0,
      isBlinkHolding: false,
      snappedX,
      snappedY,
      isSnapped,
    };
  }

  private mustReturnToCenter: boolean = false;
  private stepCooldownEnd: number = 0; // timestamp when lock expires

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

  // ── 4-Directional Discrete Spatial Step Navigation ──
  private spatialRows: HTMLElement[][] = [];
  private currentFocusedEl: HTMLElement | null = null;
  private lastStepTimestamp: number = 0;
  private lastClickTimestamp: number = 0;
  private isAutoScanning: boolean = false;
  private lastAutoScanTime: number = 0;
  private sensitivity: GazeSensitivity = "medium";

  public updateSpatialGrid(): HTMLElement[][] {
    if (typeof document === "undefined") return [];

    const rawElements = Array.from(document.querySelectorAll('[data-dwell="true"]'));
    const visibleElements: HTMLElement[] = [];

    for (const el of rawElements) {
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
      visibleElements.push(el);
    }

    if (visibleElements.length === 0) {
      this.spatialRows = [];
      return [];
    }

    // Sort by vertical position (top)
    visibleElements.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      return rectA.top - rectB.top;
    });

    // Group into rows with vertical tolerance (36px)
    const rows: HTMLElement[][] = [];
    const ROW_TOLERANCE_PX = 36;

    for (const el of visibleElements) {
      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;

      let placed = false;
      for (const row of rows) {
        const firstRect = row[0].getBoundingClientRect();
        const firstCenterY = firstRect.top + firstRect.height / 2;
        if (Math.abs(centerY - firstCenterY) < ROW_TOLERANCE_PX) {
          row.push(el);
          placed = true;
          break;
        }
      }

      if (!placed) {
        rows.push([el]);
      }
    }

    // Sort elements in each row left-to-right
    for (const row of rows) {
      row.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    }

    this.spatialRows = rows;

    // Default to first element if none focused
    if (!this.currentFocusedEl || !document.body.contains(this.currentFocusedEl)) {
      if (rows.length > 0 && rows[0].length > 0) {
        this.setFocusedElement(rows[0][0]);
      }
    }

    return rows;
  }

  public setFocusedElement(el: HTMLElement | null): void {
    if (this.currentFocusedEl && this.currentFocusedEl !== el) {
      this.currentFocusedEl.removeAttribute("data-gaze-focused");
      this.currentFocusedEl.classList.remove("gaze-focused-button");
    }
    this.currentFocusedEl = el;
    if (el) {
      el.setAttribute("data-gaze-focused", "true");
      el.classList.add("gaze-focused-button");
    }
  }

  public getFocusedElement(): HTMLElement | null {
    return this.currentFocusedEl;
  }

  public stepDirection(direction: "LEFT" | "RIGHT" | "UP" | "DOWN", timestamp: number): boolean {
    const STEP_COOLDOWN_MS = 450;
    if (timestamp - this.lastStepTimestamp < STEP_COOLDOWN_MS) {
      return false;
    }

    this.updateSpatialGrid();
    if (this.spatialRows.length === 0) return false;

    // Find current row and col index
    let curRowIdx = -1;
    let curColIdx = -1;

    for (let r = 0; r < this.spatialRows.length; r++) {
      const c = this.spatialRows[r].indexOf(this.currentFocusedEl!);
      if (c !== -1) {
        curRowIdx = r;
        curColIdx = c;
        break;
      }
    }

    if (curRowIdx === -1) {
      this.setFocusedElement(this.spatialRows[0][0]);
      this.lastStepTimestamp = timestamp;
      return true;
    }

    const currentRow = this.spatialRows[curRowIdx];
    let nextTarget: HTMLElement | null = null;

    if (direction === "RIGHT") {
      if (curColIdx + 1 < currentRow.length) {
        nextTarget = currentRow[curColIdx + 1];
      } else if (curRowIdx + 1 < this.spatialRows.length) {
        nextTarget = this.spatialRows[curRowIdx + 1][0];
      } else {
        nextTarget = this.spatialRows[0][0];
      }
    } else if (direction === "LEFT") {
      if (curColIdx - 1 >= 0) {
        nextTarget = currentRow[curColIdx - 1];
      } else if (curRowIdx - 1 >= 0) {
        const prevRow = this.spatialRows[curRowIdx - 1];
        nextTarget = prevRow[prevRow.length - 1];
      } else {
        const lastRow = this.spatialRows[this.spatialRows.length - 1];
        nextTarget = lastRow[lastRow.length - 1];
      }
    } else if (direction === "DOWN") {
      if (curRowIdx + 1 < this.spatialRows.length) {
        const nextRow = this.spatialRows[curRowIdx + 1];
        const currentRect = this.currentFocusedEl!.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        let closestEl = nextRow[0];
        let minDist = Infinity;
        for (const candidate of nextRow) {
          const candRect = candidate.getBoundingClientRect();
          const dist = Math.abs(candRect.left + candRect.width / 2 - currentCenterX);
          if (dist < minDist) {
            minDist = dist;
            closestEl = candidate;
          }
        }
        nextTarget = closestEl;
      } else {
        nextTarget = this.spatialRows[0][curColIdx] || this.spatialRows[0][0];
      }
    } else if (direction === "UP") {
      if (curRowIdx - 1 >= 0) {
        const prevRow = this.spatialRows[curRowIdx - 1];
        const currentRect = this.currentFocusedEl!.getBoundingClientRect();
        const currentCenterX = currentRect.left + currentRect.width / 2;
        let closestEl = prevRow[0];
        let minDist = Infinity;
        for (const candidate of prevRow) {
          const candRect = candidate.getBoundingClientRect();
          const dist = Math.abs(candRect.left + candRect.width / 2 - currentCenterX);
          if (dist < minDist) {
            minDist = dist;
            closestEl = candidate;
          }
        }
        nextTarget = closestEl;
      } else {
        const lastRow = this.spatialRows[this.spatialRows.length - 1];
        nextTarget = lastRow[curColIdx] || lastRow[0];
      }
    }

    if (nextTarget && nextTarget !== this.currentFocusedEl) {
      this.setFocusedElement(nextTarget);
      this.lastStepTimestamp = timestamp;
      return true;
    }

    return false;
  }

  public processHoldBlinkClick(
    isEyesClosed: boolean,
    closedDurationMs: number,
    timestamp: number
  ): { isClicked: boolean; blinkProgress: number; isBlinkHolding: boolean } {
    const BLINK_HOLD_MS = this.settings.blinkHoldMs ?? 450;
    const BLINK_COOLDOWN_MS = this.settings.blinkCooldownMs ?? 900;

    if (!isEyesClosed) {
      return { isClicked: false, blinkProgress: 0, isBlinkHolding: false };
    }

    const isBlinkHolding = closedDurationMs >= 120;
    const blinkProgress = Math.min(1.0, closedDurationMs / BLINK_HOLD_MS);

    if (closedDurationMs >= BLINK_HOLD_MS) {
      if (timestamp - this.lastClickTimestamp >= BLINK_COOLDOWN_MS) {
        this.lastClickTimestamp = timestamp;
        if (this.currentFocusedEl) {
          this.currentFocusedEl.click();
          return { isClicked: true, blinkProgress: 1.0, isBlinkHolding: false };
        }
      }
    }

    return { isClicked: false, blinkProgress, isBlinkHolding };
  }

  public stepAutoScan(timestamp: number): void {
    if (!this.isAutoScanning) return;
    const AUTO_SCAN_INTERVAL_MS = 1800;
    if (timestamp - this.lastAutoScanTime >= AUTO_SCAN_INTERVAL_MS) {
      this.lastAutoScanTime = timestamp;
      this.stepDirection("RIGHT", timestamp);
    }
  }

  public setAutoScan(enabled: boolean): void {
    this.isAutoScanning = enabled;
    this.lastAutoScanTime = performance.now();
  }

  public getAutoScan(): boolean {
    return this.isAutoScanning;
  }

  public setSensitivity(s: GazeSensitivity): void {
    this.sensitivity = s;
  }

  public getSensitivity(): GazeSensitivity {
    return this.sensitivity;
  }
}
/**
 * GazeConnect 1€ (One-Euro) Adaptive Low-Pass Filter
 * Eliminates micro-tremors and eye jitter during fixation while maintaining
 * zero-lag responsiveness during rapid saccades.
 * Includes intelligent saccade detection: instantaneous jump adaptation without dragging delay.
 */

import { CursorSpeedPreset } from "./types";

class LowPassFilter {
  private alpha: number = 1.0;
  private s: number | null = null;

  public filter(val: number, alpha: number): number {
    this.alpha = alpha;
    if (this.s === null) {
      this.s = val;
    } else {
      this.s = alpha * val + (1.0 - alpha) * this.s;
    }
    return this.s;
  }

  public filterWithAlpha(val: number): number {
    return this.filter(val, this.alpha);
  }

  public hasLast(): boolean {
    return this.s !== null;
  }

  public last(): number {
    return this.s ?? 0;
  }

  public set(val: number): void {
    this.s = val;
  }

  public reset(): void {
    this.s = null;
  }
}

export interface OneEuroConfig {
  minCutoff: number; // Hz (typical: 1.0 - 1.5)
  beta: number;      // Speed coefficient (typical: 0.01 - 0.1)
  dCutoff: number;   // Derivative cutoff Hz (typical: 1.0)
}

export class OneEuroFilter2D {
  private xFilter: LowPassFilter;
  private yFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private dyFilter: LowPassFilter;

  private lastTime: number | null = null;
  private config: OneEuroConfig;

  // Saccade tracking
  private lastAcceptedX: number = 0;
  private lastAcceptedY: number = 0;

  // Speed & deadzone controls (overridable via applyPreset)
  private maxSpeedPxPerSec: number = 900;
  private deadzoneRadius: number = 22;

  // Last output position for deadzone & velocity clamping
  private lastOutputX: number = 0;
  private lastOutputY: number = 0;

  constructor(config: Partial<OneEuroConfig> = {}) {
    this.config = {
      minCutoff: config.minCutoff ?? 0.22,
      beta: config.beta ?? 0.004,
      dCutoff: config.dCutoff ?? 1.0,
    };

    this.xFilter = new LowPassFilter();
    this.yFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
    this.dyFilter = new LowPassFilter();
  }

  public setConfig(newConfig: Partial<OneEuroConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Apply a CursorSpeedPreset: sets filter config + deadzone + max speed.
   */
  public applyPreset(preset: CursorSpeedPreset): void {
    this.config.minCutoff = preset.minCutoff;
    this.config.beta = preset.beta;
    this.config.dCutoff = preset.dCutoff;
    this.maxSpeedPxPerSec = preset.maxSpeedPxPerSec;
    this.deadzoneRadius = preset.deadzoneRadius;
  }

  private computeAlpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  /**
   * Filters raw (x, y) coordinates at timestamp (ms).
   * Intelligently detects eye saccades: during fast jumps across screen,
   * snaps immediately without lagging delay.
   */
  public filter(
    x: number,
    y: number,
    timestamp: number,
    viewportWidth: number = 1920
  ): { x: number; y: number } {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      this.lastAcceptedX = x;
      this.lastAcceptedY = y;
      this.lastOutputX = x;
      this.lastOutputY = y;
      this.xFilter.filter(x, 1.0);
      this.yFilter.filter(y, 1.0);
      return { x, y };
    }

    const dt = Math.max(1e-3, (timestamp - this.lastTime) / 1000.0);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    // Deadzone check: if gaze hasn't moved far enough from last output, return frozen position
    const distFromOutput = Math.hypot(x - this.lastOutputX, y - this.lastOutputY);
    if (distFromOutput < this.deadzoneRadius && this.lastTime !== null) {
      return { x: this.lastOutputX, y: this.lastOutputY };
    }

    // Detect rapid eye saccade (> 20% viewport distance)
    const saccadeThreshold = viewportWidth * 0.20;
    const distFromLast = Math.hypot(x - this.lastAcceptedX, y - this.lastAcceptedY);

    if (distFromLast > saccadeThreshold) {
      // Rapid saccade: snap to new position with minimal lag (alpha = 0.85)
      const snapX = this.xFilter.filter(x, 0.85);
      const snapY = this.yFilter.filter(y, 0.85);
      this.lastAcceptedX = snapX;
      this.lastAcceptedY = snapY;
      this.lastOutputX = snapX;
      this.lastOutputY = snapY;
      return { x: snapX, y: snapY };
    }

    // 1. Filter derivatives (velocity)
    const prevX = this.xFilter.hasLast() ? this.xFilter.last() : x;
    const prevY = this.yFilter.hasLast() ? this.yFilter.last() : y;

    const dx = (x - prevX) * rate;
    const dy = (y - prevY) * rate;

    const alphaD = this.computeAlpha(rate, this.config.dCutoff);
    const edx = this.dxFilter.filter(dx, alphaD);
    const edy = this.dyFilter.filter(dy, alphaD);

    const speed = Math.hypot(edx, edy);

    // 2. Compute adaptive position cutoff based on movement speed
    const cutoff = this.config.minCutoff + this.config.beta * speed;
    const alpha = this.computeAlpha(rate, cutoff);

    // 3. Filter position
    const filteredX = this.xFilter.filter(x, alpha);
    const filteredY = this.yFilter.filter(y, alpha);

    this.lastAcceptedX = filteredX;
    this.lastAcceptedY = filteredY;

    // Velocity clamping: prevent cursor warping faster than maxSpeedPxPerSec
    if (this.lastTime !== null && dt > 0) {
      const maxDelta = this.maxSpeedPxPerSec * dt;
      const deltaX = filteredX - this.lastOutputX;
      const deltaY = filteredY - this.lastOutputY;
      const dist = Math.hypot(deltaX, deltaY);
      if (dist > maxDelta && maxDelta > 0) {
        const scale = maxDelta / dist;
        this.lastOutputX = this.lastOutputX + deltaX * scale;
        this.lastOutputY = this.lastOutputY + deltaY * scale;
      } else {
        this.lastOutputX = filteredX;
        this.lastOutputY = filteredY;
      }
    } else {
      this.lastOutputX = filteredX;
      this.lastOutputY = filteredY;
    }

    return { x: this.lastOutputX, y: this.lastOutputY };
  }

  public reset(): void {
    this.lastTime = null;
    this.lastOutputX = 0;
    this.lastOutputY = 0;
    this.xFilter.reset();
    this.yFilter.reset();
    this.dxFilter.reset();
    this.dyFilter.reset();
  }
}

/**
 * GazeConnect Text-to-Speech (TTS) Engine
 * Browser window.speechSynthesis wrapper with multi-language voice detection,
 * honest voice availability reporting, playback controls, and rate modulation.
 */

export interface TTSVoiceInfo {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
}

export class TTSEngine {
  private static instance: TTSEngine | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private lastSpokenText: string = "";
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechRate: number = 1.0;
  private isLoaded: boolean = false;
  private onVoicesChangedCallbacks: Array<() => void> = [];

  private constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
        this.onVoicesChangedCallbacks.forEach((cb) => cb());
      };
    }
  }

  public static getInstance(): TTSEngine {
    if (!TTSEngine.instance) {
      TTSEngine.instance = new TTSEngine();
    }
    return TTSEngine.instance;
  }

  private loadVoices(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.voices = window.speechSynthesis.getVoices();
      if (this.voices.length > 0) {
        this.isLoaded = true;
      }
    }
  }

  public onVoicesChanged(cb: () => void): () => void {
    this.onVoicesChangedCallbacks.push(cb);
    if (this.isLoaded) {
      cb();
    }
    return () => {
      this.onVoicesChangedCallbacks = this.onVoicesChangedCallbacks.filter((c) => c !== cb);
    };
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return [...this.voices];
  }

  /**
   * Returns whether a voice matching the given language code (e.g. 'en', 'hi', 'es', 'zh') is installed.
   */
  public hasVoiceForLanguage(langPrefix: string): boolean {
    const prefix = langPrefix.toLowerCase().slice(0, 2);
    return this.voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
  }

  public findVoice(langPrefix: string): SpeechSynthesisVoice | null {
    const prefix = langPrefix.toLowerCase().slice(0, 2);
    const found = this.voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    return found ?? null;
  }

  public setRate(rate: number): void {
    this.speechRate = Math.max(0.6, Math.min(1.5, rate));
  }

  public getRate(): number {
    return this.speechRate;
  }

  public speak(
    text: string,
    options: {
      lang?: string;
      rate?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    } = {}
  ): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis API not supported in this browser.");
      return false;
    }

    if (!text || !text.trim()) return false;

    // Cancel any active speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    const lang = options.lang ?? "en-US";
    utterance.lang = lang;
    utterance.rate = options.rate ?? this.speechRate;

    const matchedVoice = this.findVoice(lang);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      if (options.onError) options.onError();
    };

    this.lastSpokenText = text.trim();
    this.currentUtterance = utterance;

    window.speechSynthesis.speak(utterance);
    return true;
  }

  public pause(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
      }
    }
  }

  public resume(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  }

  public stop(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public repeatLast(): boolean {
    if (this.lastSpokenText) {
      return this.speak(this.lastSpokenText);
    }
    return false;
  }

  public getLastSpoken(): string {
    return this.lastSpokenText;
  }

  public isSpeaking(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.speaking
      : false;
  }

  public isPaused(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.paused
      : false;
  }
}

export const tts = TTSEngine.getInstance();

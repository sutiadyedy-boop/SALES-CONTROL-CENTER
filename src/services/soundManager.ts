/**
 * SoundManager Service
 * 
 * Centralized, lightweight sound synthesis engine powered by the native Web Audio API.
 * Synthesizes crisp, modern, subtle, professional UI click, navigation, success, and error sounds
 * without external audio assets or heavy third-party libraries.
 * 
 * Complies with browser autoplay policies:
 * - Lazy initialization of AudioContext on user interaction.
 * - Safely resumes suspended context.
 * - Audio state persistence in localStorage ('dashboard_sound_enabled').
 * - Built-in debounce/throttle to prevent spamming sounds on rapid clicks.
 */

const STORAGE_KEY = 'dashboard_sound_enabled';

type SoundStateListener = (enabled: boolean) => void;

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private listeners: Set<SoundStateListener> = new Set();
  private lastSoundTime: number = 0;
  private readonly THROTTLE_MS: number = 45;

  constructor() {
    this.soundEnabled = this.loadInitialState();
  }

  private loadInitialState(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      // Ignore localStorage security/sandbox errors
    }
    return true; // Default Sound ON
  }

  /**
   * Lazily obtain or create the AudioContext.
   */
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Check if sound is currently enabled.
   */
  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Toggle sound enabled/disabled state.
   */
  public toggleSound(): boolean {
    const nextState = !this.soundEnabled;
    this.setSoundEnabled(nextState);
    if (nextState) {
      this.playToggle(true);
    }
    return nextState;
  }

  /**
   * Explicitly set sound enabled/disabled.
   */
  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // Ignore localStorage errors
    }
    this.notifyListeners();
  }

  /**
   * Subscribe to sound toggle state changes.
   */
  public subscribe(listener: SoundStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn(this.soundEnabled));
  }

  /**
   * Check debounce throttle.
   */
  private canPlay(): boolean {
    if (!this.soundEnabled) return false;
    const now = Date.now();
    if (now - this.lastSoundTime < this.THROTTLE_MS) {
      return false;
    }
    this.lastSoundTime = now;
    return true;
  }

  /**
   * 1. Soft modern digital UI Click sound (±45-55ms)
   * Subtle, professional, non-intrusive.
   */
  public playClick(): void {
    if (!this.canPlay()) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Filter to keep sound warm and rounded (no sharp piercing clicks)
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);

      // Pitch sweep: 880Hz down to 320Hz for a crisp physical tactile sensation
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);

      // Volume envelope: soft attack, quick exponential decay
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Silent catch
    }
  }

  /**
   * 2. Navigation / Page Switch sound (±70ms)
   * Slightly rounder tone indicating transition.
   */
  public playNavigation(): void {
    if (!this.canPlay()) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.065);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.068);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // Silent catch
    }
  }

  /**
   * 3. Soft Success Chime (±150ms)
   * Pleasant ascending harmonic double-chime.
   */
  public playSuccess(): void {
    if (!this.soundEnabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: E5 (659 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.08, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.095);

      // Note 2: A5 (880 Hz) - slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.05);

      gain2.gain.setValueAtTime(0.001, now + 0.05);
      gain2.gain.linearRampToValueAtTime(0.09, now + 0.058);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.165);
    } catch {
      // Silent catch
    }
  }

  /**
   * 4. Subtle Warning/Error tone (±130ms)
   * Non-jarring, low double-tap alert.
   */
  public playError(): void {
    if (!this.soundEnabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: ~240 Hz triangle
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(240, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.07, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Note 2: ~180 Hz triangle
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(180, now + 0.055);

      gain2.gain.setValueAtTime(0.001, now + 0.055);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.063);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.055);
      osc2.stop(now + 0.135);
    } catch {
      // Silent catch
    }
  }

  /**
   * 5. Quick pip on toggling sound ON
   */
  private playToggle(enabled: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (enabled) {
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.05);
      } else {
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.05);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Silent catch
    }
  }

  /**
   * General notification sound.
   */
  public playNotification(): void {
    this.playSuccess();
  }
}

// Centralized Singleton Instance
export const soundManager = new SoundManager();

/**
 * Global click listener that attaches to document
 * Captures user interactions with interactive elements (buttons, links, tabs, selects, etc.)
 * and triggers soundManager.playClick() safely.
 */
let isListenerInitialized = false;

export function initGlobalSoundListener(): void {
  if (typeof window === 'undefined' || isListenerInitialized) return;
  isListenerInitialized = true;

  const handleClick = (e: MouseEvent) => {
    // Only genuine user-triggered events
    if (!e.isTrusted) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or its closest ancestor is an interactive element
    const interactiveEl = target.closest(
      'button, a, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], select, [role="button"], [role="tab"], [role="menuitem"], summary, [data-clickable="true"]'
    );

    if (interactiveEl) {
      if (interactiveEl.getAttribute('data-no-sound') === 'true') {
        return;
      }
      soundManager.playClick();
    }
  };

  document.addEventListener('click', handleClick, { capture: true, passive: true });
}

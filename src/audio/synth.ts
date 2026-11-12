/**
 * Pure Web Audio API Sound Synthesizer for TypeFlow
 * Generates tactile mechanical switch clicks, vintage typewriter strikes,
 * deep linear thock switches, and celebratory carriage-return chimes with zero external audio assets.
 * All operations are strictly error-isolated to prevent any audio failure from impacting UI execution.
 */

import { SoundProfile } from '../shared/types.ts';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private profile: SoundProfile = 'mechanical';

  private initContext(): AudioContext | null {
    try {
      if (typeof window === 'undefined') return null;
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setConfig(profile: SoundProfile, volume: number): void {
    this.profile = profile;
    this.volume = Math.max(0, Math.min(1, volume));
    this.isMuted = profile === 'muted' || volume <= 0;
  }

  public playKeyClick(isSpace: boolean = false, isError: boolean = false): void {
    try {
      if (this.isMuted || this.profile === 'muted' || this.volume <= 0) return;
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (isError) {
        this.playErrorSound(ctx, now);
        return;
      }

      switch (this.profile) {
        case 'mechanical':
          this.playMechanicalClick(ctx, now, isSpace);
          break;
        case 'typewriter':
          this.playTypewriterClick(ctx, now, isSpace);
          break;
        case 'linear_thock':
          this.playLinearThock(ctx, now, isSpace);
          break;
        case 'soft':
          this.playSoftClick(ctx, now, isSpace);
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('TypeFlow Audio warning:', err);
    }
  }

  /**
   * Synthesizes mechanical keyboard switch click (Cherry MX Blue style)
   */
  private playMechanicalClick(ctx: AudioContext, now: number, isSpace: boolean): void {
    try {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      const clickFilter = ctx.createBiquadFilter();

      clickFilter.type = 'highpass';
      clickFilter.frequency.setValueAtTime(isSpace ? 1800 : 2800, now);

      clickOsc.type = 'triangle';
      const clickFreq = isSpace ? 320 : 440 + Math.random() * 80;
      clickOsc.frequency.setValueAtTime(clickFreq * 4, now);
      clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

      clickGain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.45), now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(ctx.destination);

      clickOsc.start(now);
      clickOsc.stop(now + 0.03);

      // Bottom-out plate thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();

      thudOsc.type = 'sine';
      const thudFreq = isSpace ? 140 : 180 + Math.random() * 20;
      thudOsc.frequency.setValueAtTime(thudFreq, now);
      thudOsc.frequency.exponentialRampToValueAtTime(50, now + 0.04);

      thudGain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.5), now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);

      thudOsc.start(now);
      thudOsc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  /**
   * Synthesizes vintage mechanical typewriter strike (metallic clatter & spring)
   */
  private playTypewriterClick(ctx: AudioContext, now: number, isSpace: boolean): void {
    try {
      // Metallic slug impact
      const metalOsc = ctx.createOscillator();
      const metalGain = ctx.createGain();
      const bandpass = ctx.createBiquadFilter();

      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(isSpace ? 1400 : 2200 + Math.random() * 200, now);
      bandpass.Q.setValueAtTime(3, now);

      metalOsc.type = 'square';
      metalOsc.frequency.setValueAtTime(isSpace ? 480 : 750 + Math.random() * 60, now);
      metalOsc.frequency.exponentialRampToValueAtTime(120, now + 0.03);

      metalGain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.4), now);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      metalOsc.connect(bandpass);
      bandpass.connect(metalGain);
      metalGain.connect(ctx.destination);

      metalOsc.start(now);
      metalOsc.stop(now + 0.04);

      // Heavy carriage resonance
      const bodyOsc = ctx.createOscillator();
      const bodyGain = ctx.createGain();

      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(isSpace ? 110 : 160 + Math.random() * 30, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      bodyGain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.6), now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);

      bodyOsc.start(now);
      bodyOsc.stop(now + 0.07);
    } catch {
      // Ignore
    }
  }

  /**
   * Synthesizes creamy lubed linear switch body ("Thock")
   */
  private playLinearThock(ctx: AudioContext, now: number, isSpace: boolean): void {
    try {
      const thockOsc = ctx.createOscillator();
      const thockGain = ctx.createGain();
      const lowpass = ctx.createBiquadFilter();

      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(isSpace ? 650 : 850, now);

      thockOsc.type = 'sine';
      const baseFreq = isSpace ? 110 : 145 + Math.random() * 15;
      thockOsc.frequency.setValueAtTime(baseFreq, now);
      thockOsc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

      thockGain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.65), now);
      thockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      thockOsc.connect(lowpass);
      lowpass.connect(thockGain);
      thockGain.connect(ctx.destination);

      thockOsc.start(now);
      thockOsc.stop(now + 0.06);
    } catch {
      // Ignore
    }
  }

  /**
   * Synthesizes a soft, minimal switch click
   */
  private playSoftClick(ctx: AudioContext, now: number, isSpace: boolean): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isSpace ? 800 : 1200, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isSpace ? 200 : 300 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.03);

      gain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.35), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Ignore
    }
  }

  /**
   * Synthesizes an unobtrusive error alert tone
   */
  private playErrorSound(ctx: AudioContext, now: number): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

      gain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.3), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  /**
   * Celebratory chime / typewriter carriage return bell
   */
  public playCompletionChime(): void {
    try {
      if (this.isMuted || this.profile === 'muted' || this.volume <= 0) return;
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (this.profile === 'typewriter') {
        // Classic metallic desk bell ding (Ding!)
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(2093, now); // C7 bell ring

        bellGain.gain.setValueAtTime(0.001, now);
        bellGain.gain.linearRampToValueAtTime(Math.max(0.001, this.volume * 0.6), now + 0.01);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);

        bellOsc.start(now);
        bellOsc.stop(now + 1.25);
        return;
      }

      // Harmonic chords
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(Math.max(0.001, this.volume * 0.25), now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } catch (err) {
      console.warn('TypeFlow completion chime warning:', err);
    }
  }
}

export const soundSynth = new SoundSynthesizer();

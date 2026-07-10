"use client";

class AudioUXSystem {
  private context: AudioContext | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  public get isReady() {
    return this.isInitialized && this.context && this.context.state === "running";
  }

  public resume() {
    if (this.context && this.context.state === "suspended") {
      this.context.resume();
    }
  }

  // A soft pentatonic chime for clicking buttons
  public playClickSound() {
    if (!this.context) return;
    const now = this.context.currentTime;
    
    // Main oscillator (soft sine wave)
    const osc = this.context.createOscillator();
    osc.type = "sine";
    // Pentatonic note (e.g., C6)
    osc.frequency.setValueAtTime(1046.50, now); 

    // Gain node for envelope (Attack, Decay, Sustain, Release)
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01); // Quick attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // Soft decay

    // Filter to make it warmer
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // A subtle low thud/sweep for opening menus/modals
  public playMenuSound() {
    if (!this.context) return;
    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15); // Drop in pitch

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}

export const audioUX = new AudioUXSystem();

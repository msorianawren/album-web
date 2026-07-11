"use client";

import type { ClickSoundType, AmbientSoundType } from "@/hooks/useUIPreferences";

class AudioUXSystem {
  private context: AudioContext | null = null;
  private isInitialized = false;

  private ambientNodes: {
    oscillators: OscillatorNode[];
    noiseBuffers: AudioBufferSourceNode[];
    gain: GainNode;
  } | null = null;

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

  // Generate an impulse response for reverb (optional, but good for space/chime)
  private getReverbBuffer(duration = 2, decay = 2): AudioBuffer | null {
    if (!this.context) return null;
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const channel = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    return impulse;
  }

  // A soft pentatonic chime for clicking buttons
  public playClickSound(type: ClickSoundType = "water") {
    if (!this.context) return;
    const now = this.context.currentTime;
    
    const gain = this.context.createGain();
    gain.connect(this.context.destination);

    if (type === "water") {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.50, now); 
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2000, now);
      
      osc.connect(filter);
      filter.connect(gain);
      osc.start(now);
      osc.stop(now + 0.25);
    } 
    else if (type === "crystal") {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2093.00, now); // C7
      osc.frequency.exponentialRampToValueAtTime(3135.96, now + 0.1); // Glide up to G7
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.2);
    }
    else if (type === "wood") {
      const osc = this.context.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400, now); 
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05); // Quick drop
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
    else if (type === "chime") {
      // 3 overlapping sines
      const freqs = [1046.50, 1318.51, 1567.98]; // C6, E6, G6
      freqs.forEach(f => {
        const osc = this.context!.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const subGain = this.context!.createGain();
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.03, now + 0.02);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(subGain);
        subGain.connect(gain);
        osc.start(now);
        osc.stop(now + 0.5);
      });
    }
    else if (type === "thud") {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now); 
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  public playMenuSound() {
    if (!this.context) return;
    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

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

  public stopAmbient() {
    if (typeof window !== "undefined" && (window as any).__albumBgAudio) {
      const audio = (window as any).__albumBgAudio as HTMLAudioElement;
      audio.pause();
      audio.src = "";
      (window as any).__albumBgAudio = null;
    }

    if (!this.ambientNodes) return;
    const now = this.context?.currentTime || 0;
    
    // Fade out smoothly
    this.ambientNodes.gain.gain.linearRampToValueAtTime(0, now + 1);
    
    setTimeout(() => {
      this.ambientNodes?.oscillators.forEach(o => o.stop());
      this.ambientNodes?.noiseBuffers.forEach(n => n.stop());
      this.ambientNodes?.gain.disconnect();
      this.ambientNodes = null;
    }, 1100);
  }

  public playAmbient(type: AmbientSoundType) {
    if (type === "auto" || type === "silence") {
      this.stopAmbient();
      return;
    }
    
    // Always stop existing before starting new
    this.stopAmbient();

    const minecraftUrls: Record<string, string> = {
      "piano": "https://archive.org/download/minecraft-volume-alpha/01%20-%20C418%20-%20Key.mp3",
      "pad": "https://archive.org/download/minecraft-volume-alpha/03%20-%20C418%20-%20Subwoofer%20Lullaby.mp3",
      "cave": "https://archive.org/download/minecraft-volume-alpha/05%20-%20C418%20-%20Living%20Mice.mp3",
      "harp": "https://archive.org/download/minecraft-volume-alpha/07%20-%20C418%20-%20Haggstrom.mp3",
      "rain": "https://archive.org/download/minecraft-volume-alpha/08%20-%20C418%20-%20Minecraft.mp3",
      "drone": "https://archive.org/download/minecraft-volume-alpha/09%20-%20C418%20-%20Oxyg%C3%A8ne.mp3"
    };

    if (minecraftUrls[type]) {
      const audio = new Audio(minecraftUrls[type]);
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(e => console.warn("Background audio play blocked", e));
      
      if (typeof window !== "undefined") {
        (window as any).__albumBgAudio = audio;
      }
    }
  }
}

export const audioUX = new AudioUXSystem();

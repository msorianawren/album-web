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

  private audioCache = new Map<string, Promise<AudioBuffer>>();
  private currentPlayingType: string | null = null;
  private ambientVolume = 0.5;

  public setAmbientVolume(vol: number) {
    this.ambientVolume = vol;
    if (this.ambientNodes && this.ambientNodes.gain && this.context) {
      const now = this.context.currentTime;
      this.ambientNodes.gain.gain.linearRampToValueAtTime(vol, now + 0.1);
    }
  }

  public preloadAmbient() {
    if (!this.context) return;
    const minecraftUrls: Record<string, string> = {
      "piano": "/audio/piano.mp3",
      "pad": "/audio/pad.mp3",
      "cave": "/audio/cave.mp3",
      "harp": "/audio/harp.mp3",
      "rain": "/audio/rain.mp3",
      "drone": "/audio/drone.mp3",
      "sweden": "/audio/sweden.mp3",
      "wethands": "/audio/wethands.mp3",
      "miceonvenus": "/audio/miceonvenus.mp3"
    };
    // Preload them in background so switching is instant
    Object.values(minecraftUrls).forEach(url => {
      if (!this.audioCache.has(url)) {
        const promise = fetch(url)
          .then(res => res.arrayBuffer())
          .then(buf => this.context!.decodeAudioData(buf))
          .catch(e => {
            console.warn("Failed to preload", url, e);
            this.audioCache.delete(url);
            throw e;
          });
        this.audioCache.set(url, promise);
      }
    });
  }

  public stopAmbient() {
    if (typeof window !== "undefined" && (window as any).__albumBgAudio) {
      const audio = (window as any).__albumBgAudio as HTMLAudioElement;
      audio.pause();
      audio.src = "";
      (window as any).__albumBgAudio = null;
    }

    this.currentPlayingType = null;

    if (!this.ambientNodes) return;
    const now = this.context?.currentTime || 0;
    
    // Fade out much faster (0.5s instead of 1s)
    this.ambientNodes.gain.gain.linearRampToValueAtTime(0, now + 0.5);
    
    setTimeout(() => {
      this.ambientNodes?.oscillators.forEach(o => o.stop());
      this.ambientNodes?.noiseBuffers.forEach(n => n.stop());
      this.ambientNodes?.gain.disconnect();
      this.ambientNodes = null;
    }, 600);
  }

  public async playAmbient(type: AmbientSoundType) {
    if (type === "auto" || type === "silence" || !this.context) {
      this.stopAmbient();
      return;
    }
    
    if (this.currentPlayingType === type && this.ambientNodes) {
      return; // Already playing this track, don't interrupt
    }

    // Always stop existing before starting new
    this.stopAmbient();
    this.currentPlayingType = type;

    const minecraftUrls: Record<string, string> = {
      "piano": "/audio/piano.mp3",
      "pad": "/audio/pad.mp3",
      "cave": "/audio/cave.mp3",
      "harp": "/audio/harp.mp3",
      "rain": "/audio/rain.mp3",
      "drone": "/audio/drone.mp3",
      "sweden": "/audio/sweden.mp3",
      "wethands": "/audio/wethands.mp3",
      "miceonvenus": "/audio/miceonvenus.mp3"
    };
    
    // Minecraft tracks have long empty intros/outros. Trim them.
    const trackOffsets: Record<string, { start: number, end: number }> = {
      "piano": { start: 2, end: 4 }, // Key
      "pad": { start: 1, end: 4 }, // Subwoofer Lullaby
      "cave": { start: 2, end: 4 }, // Living Mice
      "harp": { start: 1, end: 4 }, // Haggstrom
      "rain": { start: 2, end: 4 }, // Minecraft Theme
      "drone": { start: 6, end: 4 }, // Oxygene (takes very long to start)
      "sweden": { start: 2, end: 4 }, // Sweden
      "wethands": { start: 1, end: 4 }, // Wet Hands
      "miceonvenus": { start: 2, end: 4 } // Mice on Venus
    };

    const url = minecraftUrls[type];
    if (url) {
      // Pre-fetch the rest in background since they are clearly interacting with audio
      this.preloadAmbient();

      const now = this.context.currentTime;
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(0, now);
      // Fade in fast (0.5s instead of 2s) so user hears it immediately
      gain.gain.linearRampToValueAtTime(this.ambientVolume, now + 0.5); 
      gain.connect(this.context.destination);

      this.ambientNodes = { oscillators: [], noiseBuffers: [], gain };
      const currentGain = gain;

      try {
        let bufferPromise = this.audioCache.get(url);
        if (!bufferPromise) {
          bufferPromise = fetch(url)
            .then(res => res.arrayBuffer())
            .then(buf => this.context!.decodeAudioData(buf))
            .catch(e => {
              this.audioCache.delete(url);
              throw e;
            });
          this.audioCache.set(url, bufferPromise);
        }
        
        const buffer = await bufferPromise;

        if (!this.ambientNodes || this.ambientNodes.gain !== currentGain) return;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        const offsets = trackOffsets[type] || { start: 0, end: 0 };
        source.loopStart = offsets.start;
        
        if (buffer.duration > 10) {
          source.loopEnd = buffer.duration - offsets.end;
        }
        
        source.connect(currentGain);
        source.start(this.context.currentTime, offsets.start);

        this.ambientNodes.noiseBuffers.push(source);
      } catch (e) {
        console.warn("Failed to decode/play background audio", e);
        this.currentPlayingType = null;
      }
    }
  }
}

export const audioUX = new AudioUXSystem();

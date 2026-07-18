"use client";

import type { ClickSoundType, AmbientSoundType } from "@/hooks/useUIPreferences";
import { CHIME_MATERIALS, type EnvironmentChimeMaterial } from "@/lib/environment/chime-materials";

type WindowWithAudioFallback = Window & {
  webkitAudioContext?: typeof AudioContext;
  __albumBgAudio?: HTMLAudioElement | null;
};

class AudioUXSystem {
  private context: AudioContext | null = null;
  private isInitialized = false;
  private windChimeBuffers = new Map<string, AudioBuffer>();
  private windChimeVoices = new Map<number, { source: AudioBufferSourceNode; gain: GainNode; startedAt: number }>();
  private windChimeCooldowns = new Map<string, number>();
  private windChimeBus: { dry: GainNode; reverb: GainNode; master: GainNode; compressor: DynamicsCompressorNode } | null = null;

  private ambientNodes: {
    oscillators: OscillatorNode[];
    noiseBuffers: AudioBufferSourceNode[];
    gain: GainNode;
  } | null = null;

  public init() {
    if (this.isInitialized || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as WindowWithAudioFallback).webkitAudioContext;
      if (!AudioContextClass) return;
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
      void this.context.resume().catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Audio resume was blocked by the browser.", error);
        }
      });
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

  public playWindChimeImpact({
    tubeId,
    frequency,
    velocity,
    pan,
    material = "silver",
    volume = 1,
  }: {
    tubeId: string;
    frequency: number;
    velocity: number;
    pan: number;
    material?: EnvironmentChimeMaterial;
    volume?: number;
  }) {
    if (!this.context || this.context.state !== "running" || velocity < 0.08) return;
    const now = this.context.currentTime;
    const lastImpact = this.windChimeCooldowns.get(tubeId) ?? -Infinity;
    if (now - lastImpact < 0.075) return;
    this.windChimeCooldowns.set(tubeId, now);

    const bus = this.ensureWindChimeBus();
    if (!bus) return;
    if (this.windChimeVoices.size >= 10) {
      const oldest = [...this.windChimeVoices.entries()].sort((a, b) => a[1].startedAt - b[1].startedAt)[0];
      if (oldest) {
        oldest[1].source.stop();
        oldest[1].gain.disconnect();
        this.windChimeVoices.delete(oldest[0]);
      }
    }

    const source = this.context.createBufferSource();
    source.buffer = this.getWindChimeBuffer(frequency, material);
    source.detune.value = (Math.random() - .5) * 9;
    const gain = this.context.createGain();
    const voiceId = Date.now() + Math.random();
    const level = Math.min(.28, Math.max(.018, velocity * .22 * Math.max(0, Math.min(1, volume))));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
    source.connect(gain);
    if ("createStereoPanner" in this.context) {
      const panner = this.context.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), now);
      gain.connect(panner);
      panner.connect(bus.dry);
      panner.connect(bus.reverb);
    } else {
      gain.connect(bus.dry);
      gain.connect(bus.reverb);
    }
    this.windChimeVoices.set(voiceId, { source, gain, startedAt: now });
    source.onended = () => {
      gain.disconnect();
      this.windChimeVoices.delete(voiceId);
    };
    source.start(now);
    source.stop(now + 3.5);
  }

  /** An explicit chime control is an intentional request for sound, independent of global UI clicks. */
  public playWindChimePreview({ frequency, pan = 0, material = "silver", volume = 1 }: { frequency: number; pan?: number; material?: EnvironmentChimeMaterial; volume?: number }) {
    this.init();
    if (!this.context) return;

    const play = () => this.playWindChimeImpact({
      tubeId: `preview-${Math.round(frequency)}`,
      frequency,
      velocity: 0.96,
      pan,
      material,
      volume,
    });

    if (this.context.state === "running") {
      play();
      return;
    }

    void this.context.resume().then(play).catch(() => {
      // The browser may still block audio until a later explicit interaction.
    });
  }

  public playWindChimeHarmony({ frequency, pan = 0, material = "silver", volume = 1 }: { frequency: number; pan?: number; material?: EnvironmentChimeMaterial; volume?: number }) {
    this.init();
    if (!this.context) return;

    const play = () => {
      this.playWindChimeImpact({ tubeId: `harmony-${Math.round(frequency)}`, frequency, velocity: 1, pan, material, volume });
      window.setTimeout(() => {
        this.playWindChimeImpact({ tubeId: `harmony-${Math.round(frequency)}-fifth`, frequency: frequency * 1.498, velocity: 0.64, pan: pan * 0.62, material, volume });
      }, 92);
    };

    if (this.context.state === "running") {
      play();
      return;
    }

    void this.context.resume().then(play).catch(() => {
      // The browser may still block audio until a later explicit interaction.
    });
  }

  private ensureWindChimeBus() {
    if (!this.context) return null;
    if (this.windChimeBus) return this.windChimeBus;
    const dry = this.context.createGain();
    const reverb = this.context.createGain();
    const convolver = this.context.createConvolver();
    const master = this.context.createGain();
    const compressor = this.context.createDynamicsCompressor();
    dry.gain.value = 0.86;
    reverb.gain.value = 0.28;
    master.gain.value = 0.88;
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    convolver.buffer = this.getReverbBuffer(2.4, 2.7);
    dry.connect(master);
    reverb.connect(convolver);
    convolver.connect(master);
    master.connect(compressor);
    compressor.connect(this.context.destination);
    this.windChimeBus = { dry, reverb, master, compressor };
    return this.windChimeBus;
  }

  private getWindChimeBuffer(frequency: number, material: EnvironmentChimeMaterial) {
    if (!this.context) throw new Error("Audio context unavailable");
    const key = `${material}-${Math.round(frequency)}`;
    const cached = this.windChimeBuffers.get(key);
    if (cached) return cached;
    const profile = CHIME_MATERIALS[material];
    const duration = profile.decay + .25;
    const length = Math.floor(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    const partials = profile.partials.map((ratio, index) => ({
      ratio,
      decay: profile.decay / (1 + index * .27),
      gain: (index === 0 ? .5 : .32 / index) * profile.brightness,
    }));
    for (let index = 0; index < length; index += 1) {
      const time = index / this.context.sampleRate;
      const envelope = Math.min(1, time / 0.006);
      const shimmer = 1 + Math.sin(Math.PI * 2 * 0.72 * time) * 0.025;
      const transientDuration = material === "bamboo" ? .055 : .035;
      const transient = time < transientDuration ? (Math.random() * 2 - 1) * (1 - time / transientDuration) * (material === "bamboo" ? .11 : .045) : 0;
      samples[index] = (partials.reduce(
        (sum, partial) => sum + Math.sin(Math.PI * 2 * frequency * partial.ratio * time) * Math.exp(-time / partial.decay) * partial.gain,
        0,
      ) * shimmer + transient) * envelope * 0.58;
    }
    this.windChimeBuffers.set(key, buffer);
    return buffer;
  }

  public playBirdChirp({ pan = 0, brightness = 1 }: { pan?: number; brightness?: number } = {}) {
    if (!this.context || this.context.state !== "running") return;
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1750 * brightness, now);
    oscillator.frequency.exponentialRampToValueAtTime(2450 * brightness, now + .055);
    oscillator.frequency.exponentialRampToValueAtTime(1900 * brightness, now + .14);
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    filter.Q.value = 3.2;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.028, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
    oscillator.connect(filter);
    filter.connect(gain);
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.max(-.8, Math.min(.8, pan));
    gain.connect(panner);
    panner.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + .2);
  }

  private audioCache = new Map<string, Promise<AudioBuffer | null>>();
  private currentPlayingType: string | null = null;
  private ambientVolume = 0.5;

  private getAmbientUrl(type: AmbientSoundType) {
    const urls: Partial<Record<AmbientSoundType, string>> = {
      piano: "/audio/piano.mp3",
      pad: "/audio/pad.mp3",
      cave: "/audio/cave.mp3",
      harp: "/audio/harp.mp3",
      rain: "/audio/rain.mp3",
      drone: "/audio/drone.mp3",
      sweden: "/audio/sweden.mp3",
      wethands: "/audio/wethands.mp3",
      miceonvenus: "/audio/miceonvenus.mp3",
    };
    return urls[type] ?? null;
  }

  private loadAmbientBuffer(url: string) {
    if (this.audioCache.has(url)) return this.audioCache.get(url)!;

    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Audio asset returned ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((buffer) => this.context!.decodeAudioData(buffer))
      .catch((error) => {
        this.audioCache.delete(url);
        if (process.env.NODE_ENV !== "production") {
          console.warn("Optional ambient audio could not be loaded.", { url, error });
        }
        return null;
      });

    this.audioCache.set(url, promise);
    return promise;
  }

  public setAmbientVolume(vol: number) {
    this.ambientVolume = vol;
    if (this.ambientNodes && this.ambientNodes.gain && this.context) {
      const now = this.context.currentTime;
      this.ambientNodes.gain.gain.linearRampToValueAtTime(vol, now + 0.1);
    }
  }

  public preloadAmbient() {
    if (!this.context) return;
    const ambientTypes: AmbientSoundType[] = [
      "piano",
      "pad",
      "cave",
      "harp",
      "rain",
      "drone",
      "sweden",
      "wethands",
      "miceonvenus",
    ];
    ambientTypes.forEach((type) => {
      const url = this.getAmbientUrl(type);
      if (url) void this.loadAmbientBuffer(url);
    });
  }

  public stopAmbient() {
    const audioWindow = typeof window !== "undefined" ? (window as WindowWithAudioFallback) : null;
    if (audioWindow?.__albumBgAudio) {
      const audio = audioWindow.__albumBgAudio;
      audio.pause();
      audio.src = "";
      audioWindow.__albumBgAudio = null;
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

    const url = this.getAmbientUrl(type);
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
        const buffer = await this.loadAmbientBuffer(url);

        if (!buffer) {
          this.stopAmbient();
          return;
        }

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
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to play optional background audio", e);
        }
        this.currentPlayingType = null;
      }
    }
  }
}

export const audioUX = new AudioUXSystem();

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { gameSfxBank, type GameSfxKey } from "./sfx-bank";

export type WaveType = "sine" | "square" | "sawtooth" | "triangle";

interface GameAudioValue {
  volume: number;
  reverbAmount: number;
  roomSize: number;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  started: boolean;
  setVolume(value: number): void;
  setReverb(value: number): void;
  setRoomSize(seconds: number): void;
  setMusicEnabled(value: boolean): void;
  setEffectsEnabled(value: boolean): void;
  start(): Promise<void>;
  /** Simple frequency beep */
  playEffect(frequency: number, duration?: number, wave?: WaveType, gainScale?: number): void;
  /** Play a chord (multiple frequencies simultaneously) */
  playChord(frequencies: number[], duration?: number, wave?: WaveType): void;
  /** Play a melodic sequence with delays */
  playSequence(notes: Array<{ freq: number; delay: number; duration?: number; wave?: WaveType }>): void;
  /** Synthesized drum hit: kick | snare | hihat | tom */
  playDrum(type: "kick" | "snare" | "hihat" | "tom", gainScale?: number): void;
  /** Synthesized impact whoosh (death, collision) */
  playImpact(intensity?: number): void;
  /** Rising arpeggio fanfare */
  playFanfare(root?: number): void;
  /** Descending sad sequence */
  playFail(): void;
  /** Satisfying "power-up collected" sweep */
  playPowerUp(): void;
  /** Bell / chime sound */
  playBell(frequency: number, decay?: number): void;
  /** Stone thud with reverb tail */
  playThud(gainScale?: number): void;
  playSfx(key: GameSfxKey): void;
}

const GameAudioContext = createContext<GameAudioValue | null>(null);

interface StoredAudioPreferences {
  volume?: number;
  reverbAmount?: number;
  roomSize?: number;
  musicEnabled?: boolean;
  effectsEnabled?: boolean;
}

function loadAudioPreferences(): StoredAudioPreferences {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem("game:audio:prefs");
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    return typeof parsed === "object" && parsed !== null ? parsed as StoredAudioPreferences : {};
  } catch {
    return {};
  }
}

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const musicNodeRef = useRef<{ osc: OscillatorNode; gain: GainNode }[] | null>(null);
  const [preferences] = useState(loadAudioPreferences);
  const [volume, setVolumeState] = useState(() =>
    typeof preferences.volume === "number" ? preferences.volume : 0.55,
  );
  const [reverbAmount, setReverbAmount] = useState(() =>
    typeof preferences.reverbAmount === "number" ? preferences.reverbAmount : 0.16,
  );
  const [roomSize, setRoomSizeState] = useState(() =>
    typeof preferences.roomSize === "number" ? preferences.roomSize : 1.2,
  );
  const [musicEnabled, setMusicEnabledState] = useState(() => preferences.musicEnabled ?? false);
  const [effectsEnabled, setEffectsEnabled] = useState(() => preferences.effectsEnabled ?? true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "game:audio:prefs",
        JSON.stringify({ volume, reverbAmount, roomSize, musicEnabled, effectsEnabled }),
      );
    } catch {
      return;
    }
  }, [effectsEnabled, musicEnabled, reverbAmount, roomSize, volume]);

  // Build simple convolver reverb from noise impulse
  const buildReverb = useCallback((context: AudioContext, seconds: number): ConvolverNode => {
    const convolver = context.createConvolver();
    const rate = context.sampleRate;
    const length = Math.max(1, Math.floor(rate * seconds));
    const impulse = context.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const noise = Math.sin((i + 1) * (c + 1) * 12.9898) * 43758.5453;
        ch[i] = ((noise - Math.floor(noise)) * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }, []);

  const getCtx = useCallback(() => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!effectsEnabled || !context || !master || context.state !== "running") return null;
    return { context, master, reverb: reverbRef.current };
  }, [effectsEnabled]);

  // Helper: create oscillator + envelope
  const makeOsc = useCallback((
    context: AudioContext,
    dest: AudioNode,
    freq: number,
    wave: WaveType,
    peakGain: number,
    duration: number,
    attackTime = 0.005,
    delayStart = 0,
  ) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, context.currentTime + delayStart);
    gain.gain.setValueAtTime(0.001, context.currentTime + delayStart);
    gain.gain.linearRampToValueAtTime(peakGain, context.currentTime + delayStart + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + delayStart + duration);
    osc.connect(gain).connect(dest);
    osc.start(context.currentTime + delayStart);
    osc.stop(context.currentTime + delayStart + duration + 0.01);
  }, []);

  // ── Public API ────────────────────────────────────────────────────

  const playEffect = useCallback((frequency: number, duration = 0.1, wave: WaveType = "sine", gainScale = 1) => {
    const r = getCtx(); if (!r) return;
    makeOsc(r.context, r.master, frequency, wave, 0.06 * gainScale, duration);
  }, [getCtx, makeOsc]);

  const playChord = useCallback((frequencies: number[], duration = 0.25, wave: WaveType = "sine") => {
    const r = getCtx(); if (!r) return;
    const perGain = 0.055 / Math.sqrt(frequencies.length);
    for (const freq of frequencies) makeOsc(r.context, r.master, freq, wave, perGain, duration);
  }, [getCtx, makeOsc]);

  const playSequence = useCallback((notes: Array<{ freq: number; delay: number; duration?: number; wave?: WaveType }>) => {
    const r = getCtx(); if (!r) return;
    for (const note of notes) {
      makeOsc(r.context, r.master, note.freq, note.wave ?? "sine", 0.065, note.duration ?? 0.12, 0.005, note.delay);
    }
  }, [getCtx, makeOsc]);

  const playDrum = useCallback((type: "kick" | "snare" | "hihat" | "tom", gainScale = 1) => {
    const r = getCtx(); if (!r) return;
    const { context, master } = r;
    const t = context.currentTime;

    if (type === "kick") {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      gain.gain.setValueAtTime(0.9 * gainScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(master);
      osc.start(t); osc.stop(t + 0.32);
    } else if (type === "snare") {
      // tone layer
      const osc = context.createOscillator();
      const gOsc = context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, t);
      gOsc.gain.setValueAtTime(0.3 * gainScale, t);
      gOsc.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gOsc).connect(master);
      osc.start(t); osc.stop(t + 0.14);
      // noise layer
      const buf = context.createBuffer(1, context.sampleRate * 0.15, context.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = context.createBufferSource();
      src.buffer = buf;
      const gNoise = context.createGain();
      gNoise.gain.setValueAtTime(0.4 * gainScale, t);
      gNoise.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      src.connect(gNoise).connect(master);
      src.start(t);
    } else if (type === "hihat") {
      const buf = context.createBuffer(1, context.sampleRate * 0.05, context.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = context.createBufferSource();
      src.buffer = buf;
      const hpf = context.createBiquadFilter();
      hpf.type = "highpass"; hpf.frequency.value = 7000;
      const g = context.createGain();
      g.gain.setValueAtTime(0.25 * gainScale, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(hpf).connect(g).connect(master);
      src.start(t);
    } else if (type === "tom") {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      gain.gain.setValueAtTime(0.5 * gainScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(master);
      osc.start(t); osc.stop(t + 0.27);
    }
  }, [getCtx]);

  const playImpact = useCallback((intensity = 1.0) => {
    const r = getCtx(); if (!r) return;
    const { context, master } = r;
    const t = context.currentTime;
    // Low boom sweep
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    g.gain.setValueAtTime(0.5 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g).connect(master);
    osc.start(t); osc.stop(t + 0.52);
    // Noise burst
    const buf = context.createBuffer(1, context.sampleRate * 0.15, context.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = context.createBufferSource(); src.buffer = buf;
    const lpf = context.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 800;
    const gn = context.createGain();
    gn.gain.setValueAtTime(0.6 * intensity, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(lpf).connect(gn).connect(master);
    src.start(t);
    if (r.reverb) gn.connect(r.reverb);
  }, [getCtx]);

  const playFanfare = useCallback((root = 440) => {
    const r = getCtx(); if (!r) return;
    const notes = [root, root * 1.25, root * 1.5, root * 2, root * 2.5];
    notes.forEach((freq, i) => {
      makeOsc(r.context, r.master, freq, "triangle", 0.07, 0.18, 0.01, i * 0.08);
    });
    // final chord
    [root * 2, root * 2.5, root * 3].forEach(freq => {
      makeOsc(r.context, r.master, freq, "sine", 0.04, 0.5, 0.01, notes.length * 0.08);
    });
  }, [getCtx, makeOsc]);

  const playFail = useCallback(() => {
    const r = getCtx(); if (!r) return;
    const notes = [280, 240, 200, 160];
    notes.forEach((freq, i) => {
      makeOsc(r.context, r.master, freq, "sawtooth", 0.055, 0.22, 0.01, i * 0.1);
    });
  }, [getCtx, makeOsc]);

  const playPowerUp = useCallback(() => {
    const r = getCtx(); if (!r) return;
    const notes = [330, 415, 523, 659, 831];
    notes.forEach((freq, i) => {
      makeOsc(r.context, r.master, freq, "sine", 0.06, 0.1, 0.005, i * 0.055);
    });
  }, [getCtx, makeOsc]);

  const playBell = useCallback((frequency: number, decay = 0.8) => {
    const r = getCtx(); if (!r) return;
    // Fundamental
    makeOsc(r.context, r.master, frequency, "sine", 0.08, decay, 0.005);
    // Partial 2 (slightly detuned for realism)
    makeOsc(r.context, r.master, frequency * 2.756, "sine", 0.04, decay * 0.7, 0.005);
    // Partial 3
    makeOsc(r.context, r.master, frequency * 5.404, "sine", 0.02, decay * 0.4, 0.005);
  }, [getCtx, makeOsc]);

  const playThud = useCallback((gainScale = 1) => {
    const r = getCtx(); if (!r) return;
    const { context, master, reverb } = r;
    const t = context.currentTime;
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    g.gain.setValueAtTime(0.65 * gainScale, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g); g.connect(master);
    if (reverb) g.connect(reverb);
    osc.start(t); osc.stop(t + 0.52);
  }, [getCtx]);

  // ── Music ─────────────────────────────────────────────────────────

  const stopMusic = useCallback(() => {
    const nodes = musicNodeRef.current;
    if (!nodes) return;
    const ctx = contextRef.current;
    nodes.forEach(({ osc, gain }) => {
      if (ctx) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 200);
    });
    musicNodeRef.current = null;
  }, []);

  const startMusic = useCallback(() => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!context || !master || musicNodeRef.current) return;
    // Gentle ambient drone: root + fifth
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    [[174, 0.012], [261, 0.008], [130, 0.01]].forEach(([freq, gain]) => {
      const osc = context.createOscillator();
      const g = context.createGain();
      osc.type = "sine";
      osc.frequency.value = freq as number;
      g.gain.value = gain as number;
      osc.connect(g).connect(master);
      osc.start();
      nodes.push({ osc, gain: g });
    });
    musicNodeRef.current = nodes;
  }, []);

  const start = useCallback(async () => {
    if (!contextRef.current) {
      const AudioContextConstructor = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = new AudioContextConstructor();
      const master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
      const reverb = buildReverb(context, roomSize);
      const reverbGain = context.createGain();
      reverbGain.gain.value = reverbAmount;
      reverb.connect(reverbGain).connect(master);
      reverbRef.current = reverb;
      reverbGainRef.current = reverbGain;
    }
    await contextRef.current.resume();
    setStarted(true);
    if (musicEnabled) startMusic();
  }, [buildReverb, musicEnabled, reverbAmount, roomSize, startMusic, volume]);

  const setVolume = useCallback((next: number) => {
    const bounded = Math.min(1, Math.max(0, next));
    setVolumeState(bounded);
    const context = contextRef.current;
    const master = masterRef.current;
    if (context && master) master.gain.setTargetAtTime(bounded, context.currentTime, 0.025);
  }, []);

  const setReverb = useCallback((next: number) => {
    const bounded = Math.min(0.6, Math.max(0, next));
    setReverbAmount(bounded);
    const context = contextRef.current;
    if (context && reverbGainRef.current) {
      reverbGainRef.current.gain.setTargetAtTime(bounded, context.currentTime, 0.04);
    }
  }, []);

  const setRoomSize = useCallback((next: number) => {
    const bounded = Math.min(3, Math.max(0.25, next));
    setRoomSizeState(bounded);
    const context = contextRef.current;
    const reverb = reverbRef.current;
    if (!context || !reverb) return;
    reverb.buffer = buildReverb(context, bounded).buffer;
  }, [buildReverb]);

  const playSfx = useCallback((key: GameSfxKey) => {
    const cue = gameSfxBank[key];
    const r = getCtx();
    if (!r) return;
    for (const note of cue.notes) {
      makeOsc(r.context, r.master, note.frequency, note.wave, 0.06 * (note.gain ?? 1), note.duration, 0.005, note.delay);
    }
    if (cue.chord && cue.chord.length > 0) {
      const gain = 0.035 / Math.sqrt(cue.chord.length);
      for (const frequency of cue.chord) {
        makeOsc(r.context, r.master, frequency, cue.chordWave ?? "sine", gain, cue.chordDuration ?? 0.2, 0.008, 0.08);
      }
    }
  }, [getCtx, makeOsc]);

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledState(enabled);
    if (!enabled) stopMusic();
    else if (contextRef.current?.state === "running") startMusic();
  }, [startMusic, stopMusic]);

  useEffect(() => () => {
    stopMusic();
    const context = contextRef.current;
    contextRef.current = null;
    masterRef.current = null;
    reverbRef.current = null;
    reverbGainRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, [stopMusic]);

  const value = useMemo<GameAudioValue>(() => ({
    volume, reverbAmount, roomSize, musicEnabled, effectsEnabled, started,
    setVolume, setReverb, setRoomSize, setMusicEnabled, setEffectsEnabled,
    start, playEffect, playChord, playSequence,
    playDrum, playImpact, playFanfare, playFail,
    playPowerUp, playBell, playThud, playSfx,
  }), [
    effectsEnabled, musicEnabled, roomSize, reverbAmount, volume, started,
    setVolume, setReverb, setRoomSize, setMusicEnabled,
    start, playEffect, playChord, playSequence,
    playDrum, playImpact, playFanfare, playFail,
    playPowerUp, playBell, playThud, playSfx,
  ]);

  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useGameAudio() {
  const value = useContext(GameAudioContext);
  if (!value) throw new Error("useGameAudio must be used inside GameAudioProvider.");
  return value;
}

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

interface GameAudioValue {
  volume: number;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  started: boolean;
  setVolume(value: number): void;
  setMusicEnabled(value: boolean): void;
  setEffectsEnabled(value: boolean): void;
  start(): Promise<void>;
  playEffect(frequency: number, duration?: number): void;
}

const GameAudioContext = createContext<GameAudioValue | null>(null);

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const musicRef = useRef<{ oscillator: OscillatorNode; gain: GainNode } | null>(null);
  const [volume, setVolumeState] = useState(0.55);
  const [musicEnabled, setMusicEnabledState] = useState(false);
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [started, setStarted] = useState(false);

  const stopMusic = useCallback(() => {
    const music = musicRef.current;
    if (!music) return;
    music.gain.gain.setTargetAtTime(0, music.oscillator.context.currentTime, 0.05);
    window.setTimeout(() => music.oscillator.stop(), 180);
    musicRef.current = null;
  }, []);

  const startMusic = useCallback(() => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!context || !master || musicRef.current) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 174;
    gain.gain.value = 0.018;
    oscillator.connect(gain).connect(master);
    oscillator.start();
    musicRef.current = { oscillator, gain };
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
    }
    await contextRef.current.resume();
    setStarted(true);
    if (musicEnabled) startMusic();
  }, [musicEnabled, startMusic, volume]);

  const setVolume = useCallback((next: number) => {
    const bounded = Math.min(1, Math.max(0, next));
    setVolumeState(bounded);
    const context = contextRef.current;
    const master = masterRef.current;
    if (context && master) master.gain.setTargetAtTime(bounded, context.currentTime, 0.025);
  }, []);

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledState(enabled);
    if (!enabled) stopMusic();
    else if (contextRef.current?.state === "running") startMusic();
  }, [startMusic, stopMusic]);

  const playEffect = useCallback((frequency: number, duration = 0.09) => {
    const context = contextRef.current;
    const master = masterRef.current;
    if (!effectsEnabled || !context || !master || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(80, frequency * 0.72),
      context.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.055, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [effectsEnabled]);

  useEffect(() => () => {
    stopMusic();
    const context = contextRef.current;
    contextRef.current = null;
    masterRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, [stopMusic]);

  const value = useMemo<GameAudioValue>(() => ({
    volume,
    musicEnabled,
    effectsEnabled,
    started,
    setVolume,
    setMusicEnabled,
    setEffectsEnabled,
    start,
    playEffect,
  }), [
    effectsEnabled,
    musicEnabled,
    playEffect,
    setMusicEnabled,
    setVolume,
    start,
    started,
    volume,
  ]);

  return <GameAudioContext.Provider value={value}>{children}</GameAudioContext.Provider>;
}

export function useGameAudio() {
  const value = useContext(GameAudioContext);
  if (!value) throw new Error("useGameAudio must be used inside GameAudioProvider.");
  return value;
}

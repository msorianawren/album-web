import type { WaveType } from "./audio-context.client";

export type GameSfxKey =
  | "snake-food"
  | "snake-power"
  | "snake-crash"
  | "merge-move"
  | "merge-match"
  | "merge-win"
  | "memory-flip"
  | "memory-match"
  | "memory-miss"
  | "memory-win"
  | "chime-correct"
  | "chime-wrong"
  | "flight-flap"
  | "cairn-drop";

export interface SfxNote {
  frequency: number;
  delay: number;
  duration: number;
  wave: WaveType;
  gain?: number;
}

export interface SfxPreset {
  notes: readonly SfxNote[];
  chord?: readonly number[];
  chordDuration?: number;
  chordWave?: WaveType;
}

export const gameSfxBank: Readonly<Record<GameSfxKey, SfxPreset>> = {
  "snake-food": {
    notes: [
      { frequency: 659.25, delay: 0, duration: 0.09, wave: "sine" },
      { frequency: 783.99, delay: 0.055, duration: 0.14, wave: "triangle" },
    ],
  },
  "snake-power": {
    notes: [
      { frequency: 440, delay: 0, duration: 0.08, wave: "sine" },
      { frequency: 659.25, delay: 0.06, duration: 0.1, wave: "sine" },
      { frequency: 880, delay: 0.12, duration: 0.18, wave: "triangle" },
    ],
  },
  "snake-crash": {
    notes: [
      { frequency: 220, delay: 0, duration: 0.22, wave: "sawtooth", gain: 0.7 },
      { frequency: 164.81, delay: 0.1, duration: 0.28, wave: "triangle", gain: 0.55 },
    ],
  },
  "merge-move": {
    notes: [{ frequency: 246.94, delay: 0, duration: 0.055, wave: "triangle", gain: 0.45 }],
  },
  "merge-match": {
    notes: [
      { frequency: 523.25, delay: 0, duration: 0.08, wave: "sine" },
      { frequency: 659.25, delay: 0.045, duration: 0.14, wave: "sine" },
    ],
    chord: [523.25, 659.25, 783.99],
    chordDuration: 0.18,
  },
  "merge-win": {
    notes: [
      { frequency: 523.25, delay: 0, duration: 0.12, wave: "triangle" },
      { frequency: 659.25, delay: 0.08, duration: 0.12, wave: "triangle" },
      { frequency: 783.99, delay: 0.16, duration: 0.32, wave: "sine" },
    ],
    chord: [523.25, 659.25, 783.99, 1046.5],
    chordDuration: 0.5,
  },
  "memory-flip": {
    notes: [{ frequency: 392, delay: 0, duration: 0.07, wave: "triangle", gain: 0.4 }],
  },
  "memory-match": {
    notes: [
      { frequency: 587.33, delay: 0, duration: 0.1, wave: "sine" },
      { frequency: 739.99, delay: 0.06, duration: 0.16, wave: "sine" },
    ],
  },
  "memory-miss": {
    notes: [{ frequency: 207.65, delay: 0, duration: 0.11, wave: "triangle", gain: 0.35 }],
  },
  "memory-win": {
    notes: [
      { frequency: 523.25, delay: 0, duration: 0.1, wave: "sine" },
      { frequency: 659.25, delay: 0.07, duration: 0.12, wave: "sine" },
      { frequency: 783.99, delay: 0.14, duration: 0.36, wave: "triangle" },
    ],
  },
  "chime-correct": {
    notes: [{ frequency: 880, delay: 0, duration: 0.36, wave: "sine", gain: 0.55 }],
  },
  "chime-wrong": {
    notes: [{ frequency: 196, delay: 0, duration: 0.14, wave: "square", gain: 0.22 }],
  },
  "flight-flap": {
    notes: [{ frequency: 329.63, delay: 0, duration: 0.055, wave: "triangle", gain: 0.35 }],
  },
  "cairn-drop": {
    notes: [{ frequency: 110, delay: 0, duration: 0.24, wave: "sine", gain: 0.7 }],
  },
};

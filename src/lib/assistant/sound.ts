"use client";

let companionAudioContext: AudioContext | null = null;

/** A brief, optional feedback tone. Call only from a deliberate user gesture. */
export function playCompanionChime() {
  if (typeof window === "undefined") return;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;

  companionAudioContext ??= new AudioContextConstructor();
  const context = companionAudioContext;
  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(523.25, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(659.25, startAt + 0.11);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.028, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.19);
}

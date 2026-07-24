export interface GameAudioBus {
  play(cue: string, options?: Readonly<Record<string, number | string | boolean>>): void;
  stopAll(): void;
  setMuted(muted: boolean): void;
}

export function createSilentGameAudioBus(): GameAudioBus {
  return {
    play() {},
    stopAll() {},
    setMuted() {},
  };
}

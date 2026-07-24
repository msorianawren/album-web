export type GameId = string;
export type GameVersionId = string;
export type GameDifficultyId = string;
export type GameSessionId = string;

export interface GameDifficulty {
  id: GameDifficultyId;
  key: string;
  label: string;
  ordinal: number;
  config: Readonly<Record<string, unknown>>;
}

export interface GameRewardPolicy {
  baseReward: number;
  maximumReward: number;
  repeatMultiplierBps: number;
  dailyCap: number;
}

export interface GamePublishedVersion {
  id: GameVersionId;
  gameId: GameId;
  version: number;
  schemaVersion: number;
  engineVersion: string;
  contentDigest: string;
  config: Readonly<Record<string, unknown>>;
}

export interface GameInputAction<TPayload = unknown> {
  tick: number;
  type: string;
  payload?: TPayload;
}

export interface GameReplayTrace {
  formatVersion: 1;
  engineVersion: string;
  seed: string;
  fixedStepMs: number;
  actions: readonly GameInputAction[];
}

export interface GameVerificationResult {
  valid: boolean;
  versionId: GameVersionId;
  replayDigest: string;
  score: number;
  durationTicks: number;
  reason?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface GameServices {
  readonly seed: string;
  readonly fixedStepMs: number;
  readonly reducedMotion: boolean;
  readonly audio: {
    play(cue: string, options?: Readonly<Record<string, number | string | boolean>>): void;
    stopAll(): void;
  };
  readonly emit: (event: string, payload?: Readonly<Record<string, unknown>>) => void;
}

export interface GameInstance<TSnapshot = unknown> {
  start(): void;
  step(tick: number, actions: readonly GameInputAction[]): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  snapshot(): TSnapshot;
}

export interface GameEngine<TConfig = Readonly<Record<string, unknown>>, TSnapshot = unknown> {
  readonly engineKey: string;
  readonly engineVersion: string;
  create(config: TConfig, services: GameServices): GameInstance<TSnapshot>;
  verify(
    version: GamePublishedVersion,
    difficulty: GameDifficulty,
    trace: GameReplayTrace,
  ): GameVerificationResult;
}

export interface GameCatalogEntry {
  id: GameId;
  slug: string;
  title: string;
  description: string;
  engineKey: string;
  legacy: boolean;
  enabled: boolean;
}

export interface StartGameSessionRequest {
  gameSlug: string;
  versionId: GameVersionId;
  difficultyId: GameDifficultyId;
}

export interface StartGameSessionResponse {
  sessionId: GameSessionId;
  seed: string;
  nonce: string;
  expiresAt: string;
  version: GamePublishedVersion;
  difficulty: GameDifficulty;
}

export interface FinalizeGameSessionRequest {
  sessionId: GameSessionId;
  nonce: string;
  replay: GameReplayTrace;
}

export interface FinalizeGameSessionResponse {
  resultId: string;
  rewardGranted: number;
  balanceAfter: number;
  duplicate: boolean;
}

import type { GameReplayTrace, GameRewardPolicy, GameVerificationResult } from "./types.ts";

export function validateReplayContract({
  trace,
  versionId,
  expectedEngineVersion,
  replayDigest,
  score,
  durationTicks,
}: {
  trace: GameReplayTrace;
  versionId: string;
  expectedEngineVersion: string;
  replayDigest: string;
  score: number;
  durationTicks: number;
}): GameVerificationResult {
  if (trace.engineVersion !== expectedEngineVersion) {
    return { valid: false, versionId, replayDigest, score: 0, durationTicks: 0, reason: "ENGINE_VERSION_MISMATCH" };
  }
  if (!Number.isSafeInteger(durationTicks) || durationTicks < 1) {
    return { valid: false, versionId, replayDigest, score: 0, durationTicks: 0, reason: "INVALID_DURATION" };
  }
  if (!Number.isSafeInteger(score) || score < 0) {
    return { valid: false, versionId, replayDigest, score: 0, durationTicks, reason: "INVALID_SCORE" };
  }
  return { valid: true, versionId, replayDigest, score, durationTicks };
}

export function calculateGrantedReward({
  policy,
  completionCount,
  dailyGranted,
}: {
  policy: GameRewardPolicy;
  completionCount: number;
  dailyGranted: number;
}) {
  const repeatMultiplier = completionCount > 0 ? policy.repeatMultiplierBps : 10_000;
  const calculated = Math.floor(policy.baseReward * repeatMultiplier / 10_000);
  const bounded = Math.min(policy.maximumReward, Math.max(0, calculated));
  return Math.min(bounded, Math.max(0, policy.dailyCap - dailyGranted));
}

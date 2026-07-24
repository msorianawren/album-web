export interface GuestBestScore {
  score: number;
  durationTicks: number;
  updatedAt: string;
}

interface GuestScoreEnvelope {
  version: 1;
  scores: Record<string, GuestBestScore>;
}

const STORAGE_KEY = "oriana:game-best-scores:v1";

export function createGuestScoreStorage(storage: Pick<Storage, "getItem" | "setItem">) {
  function read(): GuestScoreEnvelope {
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "") as GuestScoreEnvelope;
      if (parsed.version === 1 && parsed.scores && typeof parsed.scores === "object") return parsed;
    } catch {
      // Invalid local data is replaced on the next write.
    }
    return { version: 1, scores: {} };
  }

  return {
    get(key: string) {
      return read().scores[key] ?? null;
    },
    save(key: string, score: GuestBestScore) {
      const envelope = read();
      const current = envelope.scores[key];
      if (!current || score.score > current.score || (score.score === current.score && score.durationTicks < current.durationTicks)) {
        envelope.scores[key] = score;
        storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
      }
      return envelope.scores[key];
    },
  };
}

export interface SeededRng {
  next(): number;
  integer(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
  fork(label: string): SeededRng;
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seed: string): SeededRng {
  if (!seed) throw new Error("A deterministic seed is required.");
  let state = hashSeed(seed);

  const api: SeededRng = {
    next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    integer(min, max) {
      if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
        throw new RangeError("RNG integer bounds must be safe integers in ascending order.");
      }
      return min + Math.floor(api.next() * (max - min + 1));
    },
    pick(values) {
      if (values.length === 0) throw new RangeError("Cannot pick from an empty collection.");
      return values[api.integer(0, values.length - 1)];
    },
    fork(label) {
      return createSeededRng(`${seed}:${label}`);
    },
  };

  return api;
}

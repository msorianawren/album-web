export function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function createSeededRandom(seed: number | string) {
  let hash = 0;
  if (typeof seed === "string") {
    for (let i = 0; i < seed.length; i++) {
      hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
    }
  } else {
    hash = seed;
  }
  const prng = mulberry32(hash);
  return {
    value: () => prng(),
    range: (min: number, max: number) => min + prng() * (max - min),
    boolean: (chance = 0.5) => prng() < chance,
    item: <T>(array: T[]): T => array[Math.floor(prng() * array.length)],
  };
}

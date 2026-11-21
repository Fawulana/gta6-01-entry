// Deterministic randomness for Solmar Bay. The city, traffic and staged
// screenshots all draw from a seeded generator so a seed replays the same
// world. mulberry32 is small, fast and good enough for placement.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A tiny string hash so a seed word also works.
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  const s = typeof seed === 'number' ? seed : hashSeed(String(seed));
  return mulberry32(s);
}

// Helpers over a rng function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
export function chance(rng, p) {
  return rng() < p;
}
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

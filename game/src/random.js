// A small seeded random number generator (mulberry32): the same seed gives the
// same city, the same traffic and the same screenshot scenes.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max). */
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min));
}

/** Pick one element of an array. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** Fisher-Yates shuffle, in place, driven by the seeded random. */
export function shuffle(random, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

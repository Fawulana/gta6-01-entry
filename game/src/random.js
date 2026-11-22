// Palmetto Bay — seeded random numbers. The city layout, traffic colours
// and pedestrian looks all come from one seed, so the same seed always
// builds the same Palmetto Bay. Gameplay randomness (traffic spawns, ped
// chatter) uses Math.random and is not part of the layout.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randomInt(rng, min, max) {
  return Math.floor(randomRange(rng, min, max + 1));
}

export function randomPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function randomChance(rng, p) {
  return rng() < p;
}

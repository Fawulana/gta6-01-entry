// Seeded random numbers (mulberry32) so the city and the staged screenshot
// scenes are identical on every run for the same seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(lo, hi) { return lo + this.next() * (hi - lo); },
    int(lo, hi) { return Math.floor(this.range(lo, hi + 1)); },
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
    chance(p) { return this.next() < p; },
    /** Fisher-Yates shuffle; returns a new array, the input is untouched. */
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
    /** Pick a value from [[value, weight], ...] with probability by weight. */
    weightedPick(pairs) {
      let total = 0;
      for (const [, w] of pairs) total += w;
      let roll = this.next() * total;
      for (const [value, w] of pairs) {
        roll -= w;
        if (roll <= 0) return value;
      }
      return pairs[pairs.length - 1][0];
    },
  };
}

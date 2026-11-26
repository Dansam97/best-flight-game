// A small seeded random generator (mulberry32). The world draws every
// placement from one of these, so a seed always builds the same valley —
// which is what makes the screenshot scenes reproducible.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [lo, hi) drawn from rng. */
export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

/** An integer in [lo, hi] drawn from rng. */
export function rangeInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// Hidden stash chests: ten fixed spots around Solmar Bay — parks, plazas and
// quiet sidewalk corners. Finding one pays $150 and lights a gold blip on
// the minimap until it is collected. The spots are fixed so every seed
// agrees; the seeded shuffle only varies the order they are checked in.
import { dist } from './config.js';
import { playStash } from './audio.js';

export const STASH_COUNT = 10;
export const STASH_REWARD = 150;

const STASH_SPOTS = [
  { x: 640, y: 240 }, { x: 1040, y: 640 }, { x: 1440, y: 240 },
  { x: 2240, y: 640 }, { x: 2640, y: 1040 }, { x: 640, y: 1440 },
  { x: 1040, y: 2240 }, { x: 1840, y: 1790 }, { x: 2640, y: 2640 },
  { x: 1440, y: 1840 },
];

/** Place the ten chests; call once when a fresh game is created. */
export function seedStashes(G) {
  const spots = G.rng.shuffle(STASH_SPOTS.slice());
  G.stashes = spots.map((s) => ({ x: s.x, y: s.y, found: false }));
  G.stashesFound = 0;
}

/** Collect any chest the player (on foot or in a car) is standing on. */
export function updateStashes(G) {
  if (!G.stashes) return;
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  for (const s of G.stashes) {
    if (s.found) continue;
    if (dist(px, py, s.x, s.y) < 36) {
      s.found = true;
      G.stashesFound += 1;
      p.cash += STASH_REWARD;
      playStash();
      G.toast(`Stash found! +$${STASH_REWARD}  (${G.stashesFound}/${STASH_COUNT})`);
    }
  }
}

/** Draw every chest still waiting to be found, with a gold glow ring. */
export function drawStashes(ctx, G) {
  if (!G.stashes) return;
  for (const s of G.stashes) {
    if (s.found) continue;
    const bob = Math.sin(G.time * 3 + s.x) * 2;
    ctx.fillStyle = 'rgba(255,214,10,0.25)';
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(s.x - 11, s.y - 9 + bob, 22, 18);
    ctx.fillStyle = '#ffd60a';
    ctx.fillRect(s.x - 11, s.y - 9 + bob, 22, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x - 2, s.y - 5 + bob, 4, 6);
  }
}

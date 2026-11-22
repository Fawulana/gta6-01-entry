// Palmetto Bay — the city itself.
//
// generateWorld builds the same city from the same seed every time: the
// road grid, the blocks, downtown towers, parks, palms and the beach.
// Everything else asks this file where things are and what blocks movement;
// no other file invents layout.

import { BEACH_Y, ROADS_X, ROADS_Y, ROAD_W, WATER_Y, WORLD_H, WORLD_W } from './config.js';
import { mulberry32, randomChance, randomInt, randomPick, randomRange } from './random.js';

const WALL_COLORS = ['#c98f6b', '#b5654a', '#d9a05b', '#a9715c', '#e0b184', '#8f6b8a', '#6b8fa3'];
const ROOF_COLORS = ['#7a4a3a', '#5d4037', '#6d4c41', '#4e342e'];
const PARK_SPOTS = [
  { x: 800, y: 800, w: 160, h: 160 },
  { x: 2000, y: 400, w: 160, h: 160 },
  { x: 1200, y: 2000, w: 160, h: 160 },
  { x: 2800, y: 1600, w: 160, h: 160 },
];

export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];

  // One or two buildings per block, kept off the roads and the beach.
  for (let ix = 0; ix < ROADS_X.length - 1; ix++) {
    for (let iy = 0; iy < ROADS_Y.length - 1; iy++) {
      const bx0 = ROADS_X[ix] + ROAD_W / 2 + 24;
      const by0 = ROADS_Y[iy] + ROAD_W / 2 + 24;
      const bx1 = ROADS_X[ix + 1] - ROAD_W / 2 - 24;
      const by1 = iy + 1 < ROADS_Y.length ? ROADS_Y[iy + 1] - ROAD_W / 2 - 24 : 0;
      if (by0 >= BEACH_Y - 40) continue;
      const cx = (ROADS_X[ix] + ROADS_X[ix + 1]) / 2;
      const cy = (ROADS_Y[iy] + ROADS_Y[iy + 1]) / 2;
      const downtown = Math.abs(cx - 1800) < 500 && Math.abs(cy - 1200) < 500;
      const isPark = PARK_SPOTS.some((p) => Math.abs(cx - (p.x + p.w / 2)) < 220 && Math.abs(cy - (p.y + p.h / 2)) < 220);
      if (isPark) continue;
      const count = downtown ? 1 : randomInt(rng, 1, 2);
      for (let b = 0; b < count; b++) {
        const w = downtown ? randomRange(rng, 150, 210) : randomRange(rng, 90, 170);
        const h = downtown ? randomRange(rng, 150, 210) : randomRange(rng, 80, 150);
        const x = bx0 + randomRange(rng, 0, Math.max(0, bx1 - bx0 - w));
        const y = by0 + randomRange(rng, 0, Math.max(0, by1 - by0 - h));
        buildings.push({
          x, y, w, h,
          tall: downtown,
          floors: downtown ? randomInt(rng, 8, 18) : randomInt(rng, 1, 3),
          color: downtown ? '#7fb3d5' : randomPick(rng, WALL_COLORS),
          roof: randomPick(rng, ROOF_COLORS),
        });
      }
      // Palms along the block's sidewalk.
      if (randomChance(rng, 0.7)) {
        palms.push({ x: bx0 + randomRange(rng, 0, 40), y: by0 + randomRange(rng, 0, by1 - by0) });
        palms.push({ x: bx1 - randomRange(rng, 0, 40), y: by0 + randomRange(rng, 0, by1 - by0) });
      }
    }
  }

  // Street lamps along every road, every 200 units, alternating sides.
  for (const x of ROADS_X) {
    for (let y = 120; y < BEACH_Y; y += 200) lamps.push({ x: x + ROAD_W / 2 + 8, y });
  }
  for (const y of ROADS_Y) {
    for (let x = 120; x < WORLD_W - 100; x += 200) lamps.push({ x, y: y + ROAD_W / 2 + 8 });
  }

  // A palm row down the boardwalk.
  for (let x = 160; x < WORLD_W - 100; x += 140) {
    palms.push({ x, y: BEACH_Y + 18 });
  }

  return { buildings, palms, lamps, parks: PARK_SPOTS };
}

export function pointInBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps; true when it moved.
export function resolveCircleVsBuildings(world, body, r) {
  let pushed = false;
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 < 0.0001) {
        body.y = b.y - r;
      } else {
        const d = Math.sqrt(d2);
        body.x = cx + (dx / d) * r;
        body.y = cy + (dy / d) * r;
      }
      pushed = true;
    }
  }
  return pushed;
}

export function isWater(x, y) {
  return y >= WATER_Y;
}

export function isSand(x, y) {
  return y >= BEACH_Y && y < WATER_Y;
}

export function clampToWorld(body, r) {
  body.x = Math.max(r, Math.min(WORLD_W - r, body.x));
  body.y = Math.max(r, Math.min(WORLD_H - r, body.y));
}

export function isOnRoad(x, y) {
  const onV = ROADS_X.some((rx) => Math.abs(x - rx) <= ROAD_W / 2);
  const onH = ROADS_Y.some((ry) => Math.abs(y - ry) <= ROAD_W / 2);
  return onV || onH;
}

// Nearest point on any road centreline, and whether that road is vertical.
// Traffic and the GPS route both steer by this.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}

// A drivable spot near a point: the nearest road point, nudged off the
// centreline so cars do not all stack on one line.
export function roadSpawnNear(x, y, side) {
  const p = nearestRoadPoint(x, y);
  if (p.vertical) return { x: p.x + side * 14, y: p.y };
  return { x: p.x, y: p.y + side * 14 };
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

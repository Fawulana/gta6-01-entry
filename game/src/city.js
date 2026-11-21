// Solmar Bay city layout: a 3200x3200 grid city with a downtown tower
// core, palm beach and water to the south, a marina and pier to the east,
// docks to the north-west and Auto Row to the north-east. Generation is
// deterministic from a seed: the same seed builds the same city.
// Everything here is placement data; render.js draws it.
import { WORLD, ROAD_LINES, ROAD_W, DISTRICTS, PARKS, BEACH, MARINA, PIER } from './config.js';
import { makeRng as rngFactory, range as rngRange, pick as rngPick, chance as rngChance, intRange as rngInt } from './random.js';

const BUILDING_COLORS = ['#b9a98c', '#a8b0b8', '#c2b49a', '#9fb2c0', '#b5a48f', '#8f9aa5', '#cbb98d'];
const TOWER_COLORS = ['#6f7d8c', '#7d8a99', '#5d6b7a', '#8a7f6d', '#74808e'];
const PALETTE_GROUND = '#7e7a6e';

export function isOnRoad(x, y) {
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) <= ROAD_W / 2) return true;
    if (Math.abs(y - line) <= ROAD_W / 2) return true;
  }
  return false;
}

// True when the point is on a road centre line's lane (for traffic paths).
export function nearestRoadLine(v) {
  let best = ROAD_LINES[0];
  let bestD = Infinity;
  for (const line of ROAD_LINES) {
    const d = Math.abs(v - line);
    if (d < bestD) {
      bestD = d;
      best = line;
    }
  }
  return best;
}

export function inBeach(x, y) {
  return y >= BEACH.y0 && y < 3080 && x < 3052;
}
export function inWater(x, y) {
  return (y >= 3080) || (x >= MARINA.x0 && y >= MARINA.y0 && y <= MARINA.y1);
}
export function inPark(x, y) {
  return PARKS.some((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
}
export function districtAt(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.x;
    const dy = y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return bestD <= best.r ? best : null;
}

export function buildCity(seed) {
  const rng = rngFactory(seed);
  const buildings = [];
  const palms = [];
  const trees = [];
  const umbrellas = [];
  const crates = [];
  const lamps = [];

  // One block = the square between four road lines. Skip blocks that are
  // beach, water, marina or park; fill the rest with buildings.
  for (let ix = 0; ix < ROAD_LINES.length - 1; ix += 1) {
    for (let iy = 0; iy < ROAD_LINES.length - 1; iy += 1) {
      const x0 = ROAD_LINES[ix] + ROAD_W / 2 + 12;
      const y0 = ROAD_LINES[iy] + ROAD_W / 2 + 12;
      const x1 = ROAD_LINES[ix + 1] - ROAD_W / 2 - 12;
      const y1 = ROAD_LINES[iy + 1] - ROAD_W / 2 - 12;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      if (cy > BEACH.y0 - 40) continue; // beach band
      if (cx > MARINA.x0 - 40 && cy > MARINA.y0 - 40 && cy < MARINA.y1 + 40) continue; // marina
      if (PARKS.some((p) => cx > p.x && cx < p.x + p.w && cy > p.y && cy < p.y + p.h)) {
        for (let t = 0; t < 9; t += 1) {
          trees.push({ x: rngRange(rng, x0 + 20, x1 - 20), y: rngRange(rng, y0 + 20, y1 - 20), r: rngRange(rng, 12, 20) });
        }
        continue;
      }
      const downtown = Math.abs(cx - 1600) < 700 && Math.abs(cy - 1600) < 700;
      const docks = cx < 900 && cy < 700;
      const count = downtown ? rngInt(rng, 1, 2) : rngInt(rng, 2, 4);
      for (let b = 0; b < count; b += 1) {
        const w = downtown ? rngRange(rng, 90, 170) : rngRange(rng, 60, 130);
        const h = downtown ? rngRange(rng, 90, 170) : rngRange(rng, 50, 110);
        const bx = rngRange(rng, x0, Math.max(x0 + 1, x1 - w));
        const by = rngRange(rng, y0, Math.max(y0 + 1, y1 - h));
        const hgt = downtown ? rngRange(rng, 55, 150) : rngRange(rng, 14, 42);
        buildings.push({
          x: bx, y: by, w, h, hgt,
          color: downtown ? rngPick(rng, TOWER_COLORS) : rngPick(rng, BUILDING_COLORS),
          roof: rngChance(rng, 0.4),
          downtown,
        });
      }
      if (docks) {
        for (let c = 0; c < 4; c += 1) {
          crates.push({ x: rngRange(rng, x0 + 10, x1 - 30), y: rngRange(rng, y0 + 10, y1 - 30), s: rngRange(rng, 18, 30), color: rngPick(rng, ['#a5672e', '#7a8a3a', '#5d7a8a', '#96603a']) });
        }
      }
    }
  }

  // Palm-lined beach: two rows of palms along the sand + umbrellas.
  for (let x = 160; x < WORLD - 160; x += 130) {
    palms.push({ x: x + rngRange(rng, -20, 20), y: 2940 + rngRange(rng, -8, 8) });
    if (rngChance(rng, 0.55)) palms.push({ x: x + 60 + rngRange(rng, -15, 15), y: 3010 + rngRange(rng, -8, 8) });
    if (rngChance(rng, 0.5)) {
      umbrellas.push({ x: x + rngRange(rng, -30, 30), y: 2990 + rngRange(rng, -20, 20), color: rngPick(rng, ['#e2574c', '#f2c230', '#4a90c2', '#e88bb0']) });
    }
  }
  // Palms along the marina front and downtown boulevard.
  for (let y = 700; y < 2500; y += 160) {
    palms.push({ x: 2980 + rngRange(rng, -10, 10), y });
  }
  for (let x = 700; x < 2500; x += 200) {
    palms.push({ x, y: 1380 + rngRange(rng, -8, 8) });
  }

  // Street lamps at every intersection corner.
  for (const lx of ROAD_LINES) {
    for (const ly of ROAD_LINES) {
      lamps.push({ x: lx + ROAD_W / 2 + 6, y: ly + ROAD_W / 2 + 6 });
    }
  }

  // Crosswalks: zebra stripes at every intersection, on both axes.
  const crosswalks = [];
  for (const lx of ROAD_LINES) {
    for (const ly of ROAD_LINES) {
      crosswalks.push({ x: lx, y: ly });
    }
  }

  return {
    buildings, palms, trees, umbrellas, crates, lamps, crosswalks,
    ground: PALETTE_GROUND,
    seed,
  };
}

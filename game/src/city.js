// Solmar Bay itself: the road grid, the blocks between the roads, the
// buildings, parks, trees and the beach, plus the named places the story
// uses. Everything is generated from one seed, so the city never changes.
import {
  BUILDING_COLORS, ROAD_COUNT, ROAD_FIRST, ROAD_SPACING, ROAD_WIDTH,
  ROOF_COLORS, WORLD_H, WORLD_W,
} from './config.js';
import { makeRng } from './random.js';

export const BEACH_TOP = 2960; // south strip: sand, then water at the edge
export const WATER_TOP = 3120;

export function roadLines() {
  const lines = [];
  for (let i = 0; i < ROAD_COUNT; i += 1) lines.push(ROAD_FIRST + i * ROAD_SPACING);
  return lines;
}

export function generateCity(seed) {
  const rng = makeRng(seed);
  const roadsX = roadLines();
  const roadsY = roadLines();
  const buildings = [];
  const trees = [];
  const palms = [];
  const parks = [];
  const half = ROAD_WIDTH / 2;

  // Palm-lined beach: a row of palms along the sand above the water.
  for (let x = 140; x < WORLD_W - 60; x += 170) {
    palms.push({ x: x + rng.range(-30, 30), y: rng.range(2970, 3050), r: rng.range(10, 14) });
  }

  // One block per cell between neighbouring roads.
  for (let ix = 0; ix < ROAD_COUNT - 1; ix += 1) {
    for (let iy = 0; iy < ROAD_COUNT - 1; iy += 1) {
      const x0 = roadsX[ix] + half + 10;
      const x1 = roadsX[ix + 1] - half - 10;
      const y0 = roadsY[iy] + half + 10;
      const y1 = roadsY[iy + 1] - half - 10;
      if (y0 > BEACH_TOP - 40) continue; // the beach strip holds no buildings
      const roll = rng.next();
      if (roll < 0.13) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        const n = rng.int(4, 8);
        for (let t = 0; t < n; t += 1) {
          trees.push({ x: rng.range(x0 + 14, x1 - 14), y: rng.range(y0 + 14, y1 - 14), r: rng.range(9, 15) });
        }
        continue;
      }
      if (roll < 0.2) {
        // Open plaza with a few trees and benches (drawn as small rects).
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, plaza: true });
        trees.push({ x: x0 + 30, y: y0 + 30, r: 12 });
        trees.push({ x: x1 - 30, y: y1 - 30, r: 12 });
        continue;
      }
      const count = rng.int(1, 3);
      for (let b = 0; b < count; b += 1) {
        const bw = rng.range(90, 180);
        const bh = rng.range(90, 180);
        const bx = rng.range(x0, Math.max(x0 + 1, x1 - bw));
        const by = rng.range(y0, Math.max(y0 + 1, y1 - bh));
        // Downtown blocks grow towers far more often than the suburbs.
        const downtown = bx >= 1400 && bx <= 2200 && by >= 1400 && by <= 2200;
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(ROOF_COLORS),
          tall: rng.chance(downtown ? 0.6 : 0.25),
        });
      }
      if (rng.chance(0.5)) {
        trees.push({ x: rng.range(x0 + 12, x1 - 12), y: rng.range(y0 + 12, y1 - 12), r: rng.range(8, 13) });
      }
    }
  }

  // Named story places, all on roads so the player can always reach them.
  const markers = {
    safehouse: { x: 600, y: 600, label: 'Safehouse' },
    lenas: { x: 1400, y: 1000, label: "Lena's Bar" },
    docks: { x: 2600, y: 2800, label: 'Marina Docks' },
    warehouse: { x: 2600, y: 1400, label: 'Old Warehouse' },
    hospital: { x: 1000, y: 2600, label: 'Solmar General' },
    dealership: { x: 1800, y: 2200, label: 'Auto Row' },
    oceanDrive: { x: 1400, y: 3000, label: 'Ocean Drive' },
    pier: { x: 2200, y: 3080, label: 'Solmar Pier' },
  };
  return { roadsX, roadsY, buildings, trees, palms, parks, markers, seed };
}

/** True when the point is on asphalt (a road, either axis). */
export function isOnRoad(city, x, y) {
  const half = ROAD_WIDTH / 2;
  for (const rx of city.roadsX) if (Math.abs(x - rx) <= half) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) <= half) return true;
  return false;
}

/** The nearest road centre line to a point, as {axis, line, along}. */
export function nearestRoad(city, x, y) {
  let best = null;
  for (const rx of city.roadsX) {
    const d = Math.abs(x - rx);
    if (!best || d < best.d) best = { d, axis: 'x', line: rx, along: y };
  }
  for (const ry of city.roadsY) {
    const d = Math.abs(y - ry);
    if (!best || d < best.d) best = { d, axis: 'y', line: ry, along: x };
  }
  return best;
}

/** Push a circle out of every building it overlaps; returns the fixed position. */
export function resolveBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 === 0) { x = b.x + b.w + r; continue; }
    const d = Math.sqrt(d2);
    x = cx + (dx / d) * r;
    y = cy + (dy / d) * r;
  }
  return { x, y };
}

/** True when the circle overlaps any building. */
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

/** District name for a map position, for the HUD's location line. */
export function districtAt(x, y) {
  if (y > BEACH_TOP) return 'Marina Beach';
  if (x >= 2200 && y >= 2200) return 'Harbor District';
  if (x >= 1400 && x <= 2200 && y >= 1400 && y <= 2200) return 'Downtown';
  if (x < 1200 && y < 1200) return 'Old Town';
  if (y < 800) return 'North Hills';
  if (x < 800) return 'University Quarter';
  if (x > 2400) return 'East Side';
  return 'Midtown';
}

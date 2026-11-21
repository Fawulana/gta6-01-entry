// The city itself: a procedural Palmetto Bay, built once from the seeded random.
// A road grid of avenues and streets, Ocean Drive along the beach, a marina with
// docks and boats, a park, a stadium, a downtown tower and a neon hotel row.
// Buildings are axis-aligned rects; the renderer extrudes them with a dusk shadow.

import { DISTRICTS, PALETTE, ROADS, WORLD } from './config.js';
import { pick, rangeInt } from './random.js';

export function buildCity(random) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const boats = [];
  const parkTrees = [];
  const signs = [];
  const benches = [];

  const avenues = ROADS.avenues;
  const streets = ROADS.streets;
  const hw = ROADS.halfWidth;

  /** True when a point sits on a road (with a small margin for sidewalks). */
  function onRoad(x, y, margin) {
    const m = margin || 0;
    for (const ax of avenues) if (Math.abs(x - ax) <= hw + m) return true;
    for (const sy of streets) if (Math.abs(y - sy) <= hw + m) return true;
    if (Math.abs(x - ROADS.oceanDrive) <= hw + m) return true;
    return false;
  }

  // Reserved ground: the tower, and the strip west of Ocean Drive — no random
  // building may sit there, so cars can turn off the Strip without clipping a
  // corner.
  const reserved = [
    { x: 1660, y: 960, w: 230, h: 230 },
    { x: 3484, y: 300, w: 160, h: 2450 },
  ];
  function overlapsReserved(x, y, w, h) {
    for (const r of reserved) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return true;
    }
    return false;
  }

  // Buildings fill every block between neighbouring roads, clear of the beach.
  const xs = [80, ...avenues, WORLD.beachX - 40];
  const ys = [80, ...streets, WORLD.height - 80];
  for (let bi = 0; bi < xs.length - 1; bi += 1) {
    for (let bj = 0; bj < ys.length - 1; bj += 1) {
      const x0 = xs[bi] + hw + 26;
      const x1 = xs[bi + 1] - hw - 26;
      const y0 = ys[bj] + hw + 26;
      const y1 = ys[bj + 1] - hw - 26;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      if (x0 > WORLD.beachX - 200) continue;
      // The park block stays green.
      if (bi === 5 && bj === 2) continue;
      // The stadium block stays open.
      if (bi === 1 && bj === 5) continue;
      const downtown = bi >= 3 && bi <= 5 && bj >= 1 && bj <= 3;
      const count = downtown ? rangeInt(random, 2, 4) : rangeInt(random, 1, 3);
      for (let k = 0; k < count; k += 1) {
        const w = rangeInt(random, 110, Math.min(240, x1 - x0 - 20));
        const h = rangeInt(random, 100, Math.min(220, y1 - y0 - 20));
        const x = rangeInt(random, x0, Math.max(x0 + 1, x1 - w));
        const y = rangeInt(random, y0, Math.max(y0 + 1, y1 - h));
        if (overlapsReserved(x, y, w, h)) continue;
        const tall = downtown && random() < 0.45;
        buildings.push({
          x, y, w, h,
          height: tall ? rangeInt(random, 90, 170) : rangeInt(random, 14, 46),
          roof: pick(random, PALETTE.buildingRoof),
          wall: pick(random, PALETTE.buildingWall),
          seed: Math.floor(random() * 100000),
          neon: random() < 0.12,
        });
      }
    }
  }

  // The Palmetto Tower, the downtown landmark: the tallest block in the city.
  buildings.push({
    x: 1680, y: 980, w: 190, h: 190, height: 260,
    roof: '#2e3a55', wall: '#4a5a7a', seed: 777001, neon: true, landmark: 'Palmetto Tower',
  });

  // Ocean Drive hotel row: low, bright, neon-signed, on the sand facing the
  // water — Miami Beach style — so the Strip's west side stays open for turns.
  for (let i = 0; i < 6; i += 1) {
    const y = 320 + i * 430;
    buildings.push({
      x: 3800, y, w: 90, h: 240, height: rangeInt(random, 30, 60),
      roof: pick(random, ['#ff5e78', '#00b8c9', '#ffb400', '#7CFC00']),
      wall: pick(random, PALETTE.buildingWall), seed: 9000 + i, neon: true,
    });
    signs.push({ x: 3845, y: y + 120, text: ['NEON', 'FLAMINGO', 'DEL MAR', 'PALMS', 'TROPICANA', 'BAYVIEW'][i], color: pick(random, PALETTE.neon) });
  }

  // Marina docks and boats, north-east.
  for (let i = 0; i < 5; i += 1) {
    boats.push({ x: 4150 + (i % 2) * 130, y: 320 + i * 110, angle: (random() - 0.5) * 0.5, len: 70 + random() * 40, color: pick(random, ['#f5f5f5', '#c94f4f', '#4f7ec9', '#f2c94c']) });
  }

  // Park trees and benches in the Parkside block.
  for (let i = 0; i < 26; i += 1) {
    parkTrees.push({ x: 2500 + random() * 380, y: 1300 + random() * 260, r: 16 + random() * 14 });
  }
  for (let i = 0; i < 6; i += 1) benches.push({ x: 2560 + i * 60, y: 1560, angle: 0 });

  // Palms down the beach, east of the hotels, and around the park.
  for (let y = 240; y < WORLD.height - 200; y += 190) {
    palms.push({ x: 3930 + random() * 20, y, lean: (random() - 0.5) * 0.3 });
    if (random() < 0.6) palms.push({ x: 3985 + random() * 20, y: y + 90, lean: (random() - 0.5) * 0.3 });
  }
  for (let i = 0; i < 10; i += 1) palms.push({ x: 2520 + random() * 340, y: 1300 + random() * 260, lean: (random() - 0.5) * 0.3 });

  // Street lamps at road corners, every other intersection.
  for (const ax of [...avenues, ROADS.oceanDrive]) {
    for (const sy of streets) {
      if (((ax + sy) / 10) % 2 === 0) lamps.push({ x: ax + hw + 14, y: sy + hw + 14 });
    }
  }

  // All intersections, for traffic routing and GPS.
  const intersections = [];
  for (const ax of [...avenues, ROADS.oceanDrive]) {
    for (const sy of streets) intersections.push({ x: ax, y: sy });
  }

  return {
    buildings, palms, lamps, boats, parkTrees, signs, benches, intersections,
    onRoad,
    /** The district name at a point, for the HUD toast. */
    districtAt(x, y) {
      for (const d of DISTRICTS) {
        if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
      }
      return x > WORLD.beachX ? 'The Beach' : 'Palmetto Bay';
    },
    /** Closest point on any road centreline, with the road's direction. */
    nearestRoad(x, y) {
      let best = null;
      let bestD = Infinity;
      const consider = (px, py, angle) => {
        const d = (x - px) * (x - px) + (y - py) * (y - py);
        if (d < bestD) {
          bestD = d;
          best = { x: px, y: py, angle };
        }
      };
      for (const ax of avenues) consider(ax, Math.max(0, Math.min(WORLD.height, y)), 0);
      for (const sy of streets) consider(Math.max(0, Math.min(WORLD.width, x)), sy, Math.PI / 2);
      consider(ROADS.oceanDrive, Math.max(0, Math.min(WORLD.height, y)), 0);
      return best;
    },
    /** Manhattan route between two points, as waypoints through intersections. */
    route(fromX, fromY, toX, toY) {
      const start = this.nearestRoad(fromX, fromY);
      const end = this.nearestRoad(toX, toY);
      const waypoints = [{ x: start.x, y: start.y }];
      // Drive along the start road to the target's street, then along it.
      if (Math.abs(start.angle) < 0.1) waypoints.push({ x: start.x, y: end.y });
      else waypoints.push({ x: end.x, y: start.y });
      waypoints.push({ x: end.x, y: end.y });
      waypoints.push({ x: toX, y: toY });
      return waypoints;
    },
    /** Circle-vs-building test; returns the building hit, or null. */
    hitBuilding(x, y, r) {
      for (const b of buildings) {
        if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
      }
      return null;
    },
  };
}

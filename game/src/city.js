// Port Azura city layout: road grid, buildings, beach and water, marina, park,
// and every named place missions and side activities point at. Built once from
// a seed; the world never changes shape during a session.
import { ROADS, ROAD_W, WORLD, DISTRICTS, COLORS } from './config.js';
import { makeRng } from './random.js';

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const umbrellas = [];
  const palette = ['#7a6a58', '#5d6b7d', '#8a7a5a', '#6b5a6b', '#4f6b5d', '#9a8a72', '#5a5a6b', '#a08a6a'];
  const towerPalette = ['#3d4a63', '#4a3d5e', '#2f4a4a', '#5e4632'];
  // Buildings fill each block between roads.
  for (let i = 0; i < ROADS.length - 1; i++) {
    for (let j = 0; j < ROADS.length - 1; j++) {
      const x0 = ROADS[i] + ROAD_W / 2 + 14, y0 = ROADS[j] + ROAD_W / 2 + 14;
      const x1 = ROADS[i + 1] - ROAD_W / 2 - 14, y1 = ROADS[j + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // Beach strip: no buildings east of the last road.
      if (x0 > 3160) continue;
      // Central park block.
      if (i === 4 && j === 4) {
        for (let t = 0; t < 26; t++) trees.push({ x: rng.range(x0, x1), y: rng.range(y0, y1), r: rng.range(9, 16) });
        continue;
      }
      const downtown = i >= 3 && i <= 5 && j >= 2 && j <= 4;
      const n = downtown ? rng.int(1, 2) : rng.int(2, 4);
      for (let k = 0; k < n; k++) {
        const w = rng.range(70, Math.min(200, x1 - x0 - 20));
        const h = rng.range(70, Math.min(200, y1 - y0 - 20));
        const x = rng.range(x0, x1 - w), y = rng.range(y0, y1 - h);
        const tall = downtown && rng.chance(0.55);
        buildings.push({
          x, y, w, h, tall,
          color: tall ? rng.pick(towerPalette) : rng.pick(palette),
          hgt: tall ? rng.range(90, 170) : rng.range(18, 46),
          roof: rng.pick(['#3a3a3a', '#54423a', '#2f3a2f', '#4a4a4a']),
        });
      }
      if (rng.chance(0.6)) trees.push({ x: rng.range(x0, x1), y: rng.range(y0, y1), r: rng.range(8, 14) });
    }
  }
  // Palm-lined beach east of the last road, umbrellas and a pier.
  for (let y = 420; y < 3200; y += 130) {
    trees.push({ x: rng.range(3220, 3300), y: y + rng.range(-30, 30), r: 13, palm: true });
    if (rng.chance(0.7)) umbrellas.push({ x: rng.range(3240, 3380), y: y + rng.range(0, 90), color: rng.pick(['#e86a5a', '#f2d24b', '#4ba3e8', '#e84ba3']) });
  }
  const places = {
    safehouse: { x: 1180, y: 1560, label: 'SAFEHOUSE' },
    fixer: { x: 860, y: 860, label: 'SALVO\'S BAR' },
    dealership: { x: 2360, y: 1180, label: 'AZURA MOTORS' },
    gunstore: { x: 1560, y: 640, label: 'IRONWORKS GUNS' },
    diner: { x: 1180, y: 2360, label: 'NEON DINER' },
    casino: { x: 2360, y: 1060, label: 'CASINO SOL' },
    docks: { x: 560, y: 2680, label: 'THE DOCKS' },
    pier: { x: 3360, y: 1500, label: 'PIER 9' },
    market: { x: 1720, y: 560, label: 'MARKET ROW' },
    park: { x: 1900, y: 1900, label: 'AZURA PARK' },
    airport: { x: 2620, y: 2820, label: 'AZURA AIRFIELD' },
    hospital: { x: 2080, y: 2080, label: 'ST. MARA HOSPITAL' },
  };
  // Props: boats in the marina, benches in the park, neon signs on the Strip,
  // crates stacked at the Docks, fuel pumps at the gas station on Airport Rd.
  const boats = [];
  for (let i = 0; i < 6; i++) {
    boats.push({ x: 320 + i * 130, y: 3360 + (i % 2) * 90, len: 90 + rng.range(0, 40), color: rng.pick(['#ddd', '#c22e2e', '#2e6bc2', '#e8b400']) });
  }
  const benches = [];
  for (let i = 0; i < 8; i++) benches.push({ x: rng.range(1780, 2020), y: rng.range(1780, 2020) });
  const neons = [
    { x: 2360, y: 1000, text: 'CASINO SOL', color: '#ff4dd2' },
    { x: 1180, y: 2300, text: 'NEON DINER', color: '#4dd2ff' },
    { x: 860, y: 800, text: 'RUSTY ANCHOR', color: '#ffd24b' },
    { x: 2360, y: 1120, text: 'AZURA MOTORS', color: '#7dff8a' },
  ];
  const crates = [];
  for (let i = 0; i < 14; i++) crates.push({ x: 380 + rng.range(0, 340), y: 2520 + rng.range(0, 300), s: rng.range(18, 30) });
  const pumps = [{ x: 2620, y: 2700 }, { x: 2660, y: 2700 }, { x: 2700, y: 2700 }];
  // Bus stops on the downtown loop: the Azura City Bus runs this circuit.
  const busStops = [
    { x: 1000, y: 1000, name: 'DOWNTOWN' },
    { x: 2800, y: 1000, name: 'CASINO STRIP' },
    { x: 2800, y: 2440, name: 'AIRPORT RD' },
    { x: 1000, y: 2440, name: 'HILLCREST' },
  ];
  return { buildings, trees, umbrellas, places, boats, benches, neons, crates, pumps, busStops, rng };
}

export function nearestRoad(x, y) {
  let best = ROADS[0], bd = 1e9;
  for (const r of ROADS) { const d = Math.min(Math.abs(x - r), Math.abs(y - r)); if (d < bd) { bd = d; best = r; } }
  return { road: best, dist: bd, vertical: Math.abs(x - best) <= Math.abs(y - best) };
}
export function onRoad(x, y) {
  for (const r of ROADS) {
    if (Math.abs(x - r) < ROAD_W / 2 + 8 && y > 180 && y < WORLD - 120) return true;
    if (Math.abs(y - r) < ROAD_W / 2 + 8 && x > 180 && x < WORLD - 120) return true;
  }
  return false;
}
export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'PORT AZURA';
}
export function randomRoadPoint(rng) {
  const vertical = rng.chance(0.5);
  const road = rng.pick(ROADS);
  const along = rng.range(260, WORLD - 260);
  return vertical ? { x: road, y: along } : { x: along, y: road };
}

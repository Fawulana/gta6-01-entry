// The city of Palmetto Bay: a seeded grid of roads and blocks, buildings with
// windows, parks, water at the marina, shops, stash chests and mission spots.
// Everything is derived from one seed, so the map never changes between runs.
import { WORLD, DISTRICTS, CAR_CLASSES } from './config.js';
import { makeRng, hashString } from './rng.js';

export const SEED = 20261122;

export function isRoad(x, y) {
  const m = WORLD.block;
  const off = WORLD.road / 2;
  const rx = ((x % m) + m) % m;
  const ry = ((y % m) + m) % m;
  return rx < off || rx > m - off || ry < off || ry > m - off;
}

export function roadCentre(x) {
  const m = WORLD.block;
  return Math.floor(x / m) * m;
}

export function nearestRoadPoint(x, y) {
  // Snap a point to the centre line of the nearest road.
  const m = WORLD.block;
  const rx = ((x % m) + m) % m;
  const ry = ((y % m) + m) % m;
  const dx = Math.min(rx, m - rx);
  const dy = Math.min(ry, m - ry);
  if (dx <= dy) return { x: rx < m / 2 ? roadCentre(x) : roadCentre(x) + m, y };
  return { x, y: ry < m / 2 ? roadCentre(y) : roadCentre(y) + m };
}

export class City {
  constructor(seed) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.buildings = [];
    this.parks = [];
    this.water = [];
    this.chests = [];
    this.shops = [];
    this.spawns = {};
    this.build();
  }

  build() {
    const rng = this.rng;
    const m = WORLD.block;
    const half = WORLD.road / 2 + 14;
    // Buildings fill every block interior, one to four per block.
    for (let bx = 0; bx < WORLD.blocks; bx += 1) {
      for (let by = 0; by < WORLD.blocks; by += 1) {
        const x0 = bx * m + half;
        const y0 = by * m + half;
        const w = m - half * 2;
        const h = m - half * 2;
        const district = this.districtAt(x0 + w / 2, y0 + h / 2);
        // Marina blocks on the west edge are water, not buildings.
        if (district.name === 'Marina' && bx <= 1 && rng.chance(0.55)) {
          this.water.push({ x: x0, y: y0, w, h });
          continue;
        }
        if (district.name === 'North Park' && rng.chance(0.5)) {
          this.parks.push({ x: x0, y: y0, w, h, trees: rng.int(4, 9) });
          continue;
        }
        const count = district.tall ? rng.int(2, 4) : rng.int(1, 3);
        const cols = count > 2 ? 2 : 1;
        const rows = Math.ceil(count / cols);
        const cw = w / cols;
        const ch = h / rows;
        for (let i = 0; i < count; i += 1) {
          const cx = x0 + (i % cols) * cw;
          const cy = y0 + Math.floor(i / cols) * ch;
          const bw = cw - rng.range(18, 46);
          const bh = ch - rng.range(18, 46);
          const tall = district.tall && rng.chance(0.6);
          this.buildings.push({
            x: cx + (cw - bw) / 2,
            y: cy + (ch - bh) / 2,
            w: bw,
            h: bh,
            tall,
            color: this.buildingColor(district, rng),
            roof: rng.pick(['#5a4a3a', '#3a3a3a', '#6b5a4a', '#2f3a2f']),
            seed: hashString(`${bx},${by},${i}`),
          });
        }
      }
    }
    // Shops: two Pay 'n Spray garages and two Gun Rack stores, on road corners.
    this.shops = [
      { kind: 'spray', name: "Ray's Pay 'n Spray", x: 800, y: 400, w: 150, h: 110 },
      { kind: 'spray', name: "Ray's Pay 'n Spray", x: 3600, y: 2800, w: 150, h: 110 },
      { kind: 'guns', name: 'Gun Rack', x: 2000, y: 1200, w: 140, h: 100 },
      { kind: 'guns', name: 'Gun Rack', x: 3200, y: 4000, w: 140, h: 100 },
    ];
    // Eight stash chests tucked onto sidewalks, just off the road edge.
    const chestSpots = [
      [444, 940], [1556, 444], [2444, 1556], [3156, 844],
      [844, 2756], [1956, 3556], [3556, 2356], [4356, 3956],
    ];
    chestSpots.forEach(([x, y], i) => {
      this.chests.push({ id: i, x, y, looted: false, cash: 150 + i * 35 });
    });
    // Key mission spots. Every one sits on a road centre line, so a car can
    // always reach it: a marker inside a block would be walled off by
    // buildings.
    this.spawns = {
      player: { x: 400, y: 620 },
      hideout: { x: 400, y: 620 },
      marlin: { x: 400, y: 2100 },
      bank: { x: 1200, y: 1200 },
      docks: { x: 400, y: 3200 },
      warehouse: { x: 4000, y: 3600 },
      stadium: { x: 2800, y: 800 },
      airport: { x: 4400, y: 1600 },
    };
  }

  districtAt(x, y) {
    for (const d of DISTRICTS) {
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    }
    return DISTRICTS[0];
  }

  buildingColor(district, rng) {
    const base = [
      '#8a7a6a', '#7a6a5a', '#9a8a7a', '#6a7a8a', '#8a6a6a',
      '#a08a6a', '#5a6a7a', '#7a5a6a',
    ];
    const pick = rng.pick(base);
    return district.tall ? rng.pick(['#4a5a7a', '#5a6a8a', '#6a5a6a', '#3a4a5a']) : pick;
  }

  // Circle vs buildings: returns the building hit, or null. Shops are open
  // lots, not walls, so they never block movement.
  collideCircle(x, y, r) {
    for (const b of this.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }

  // Resolve a circle out of a building by pushing it along the smallest axis.
  pushOut(x, y, r) {
    const b = this.collideCircle(x, y, r);
    if (!b) return { x, y, hit: false };
    const left = x + r - b.x;
    const right = b.x + b.w - (x - r);
    const top = y + r - b.y;
    const bottom = b.y + b.h - (y - r);
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: b.x - r, y, hit: true };
    if (min === right) return { x: b.x + b.w + r, y, hit: true };
    if (min === top) return { x, y: b.y - r, hit: true };
    return { x, y: b.y + b.h + r, hit: true };
  }

  inBounds(x, y) {
    return x > 20 && y > 20 && x < WORLD.size - 20 && y < WORLD.size - 20;
  }

  // Parked cars for stealing: fixed spots plus a few seeded ones, all parked
  // on road centre lines so the player can always walk up to them.
  parkedCars() {
    const spots = [
      { cls: 'sedan', x: 680, y: 400, angle: 0 },
      { cls: 'coupe', x: 1200, y: 680, angle: Math.PI / 2 },
      { cls: 'van', x: 2040, y: 1600, angle: 0 },
      { cls: 'truck', x: 3200, y: 2040, angle: Math.PI / 2 },
      { cls: 'sports', x: 2800, y: 1240, angle: Math.PI / 2 },
      { cls: 'sedan', x: 4000, y: 840, angle: Math.PI / 2 },
      { cls: 'coupe', x: 840, y: 4000, angle: 0 },
      { cls: 'marlin', x: this.spawns.marlin.x, y: this.spawns.marlin.y, angle: Math.PI / 2 },
    ];
    const rng = makeRng(this.seed + 77);
    const classes = Object.keys(CAR_CLASSES).filter((c) => c !== 'police' && c !== 'marlin');
    for (let i = 0; i < 10; i += 1) {
      if (rng.chance(0.5)) {
        spots.push({ cls: rng.pick(classes), x: rng.range(200, 4600), y: rng.int(0, 11) * WORLD.block, angle: 0 });
      } else {
        spots.push({ cls: rng.pick(classes), x: rng.int(0, 11) * WORLD.block, y: rng.range(200, 4600), angle: Math.PI / 2 });
      }
    }
    return spots;
  }
}

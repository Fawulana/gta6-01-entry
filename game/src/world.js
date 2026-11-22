// Palmetto Bay — the seeded city.
// A 4800x4800 grid of 400px blocks separated by 64px roads. Buildings,
// parks, water, chests, shop fronts, mission spawns and parked cars are
// all placed by the seed, so the same seed always builds the same city.
import { makeRng, SEED } from './rng.js';
import { WORLD, DISTRICTS } from './config.js';

export { SEED };

function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

export function isRoad(x, y) {
  if (x < 0 || y < 0 || x >= WORLD.size || y >= WORLD.size) return false;
  const bx = ((x % WORLD.block) + WORLD.block) % WORLD.block;
  const by = ((y % WORLD.block) + WORLD.block) % WORLD.block;
  return bx < WORLD.road || by < WORLD.road;
}

export function roadCenter(v) {
  return Math.round(v / WORLD.block) * WORLD.block + WORLD.road / 2;
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
    this.parkedSpots = [];
    this.build();
  }

  build() {
    const rng = this.rng;
    const { size, block, road } = WORLD;
    // Marina water: a bay along the south-west shore.
    this.water.push({ x: 0, y: 2400, w: 700, h: 2400 });
    this.water.push({ x: 0, y: 4400, w: 1600, h: 400 });
    // Harbor water: a basin on the east edge.
    this.water.push({ x: 4200, y: 1600, w: 600, h: 900 });

    for (let bx = 0; bx < WORLD.blocks; bx += 1) {
      for (let by = 0; by < WORLD.blocks; by += 1) {
        const x0 = bx * block + road;
        const y0 = by * block + road;
        const cx = x0 + (block - road) / 2;
        const cy = y0 + (block - road) / 2;
        const district = districtAt(cx, cy);
        // Skip blocks that fall in the water.
        if (this.inWater(cx, cy, 10)) continue;
        const roll = rng.next();
        if (district.name === 'North Park' && roll < 0.55) {
          this.parks.push({ x: x0, y: y0, w: block - road, h: block - road, trees: rng.int(6, 14) });
          continue;
        }
        if (roll < 0.12) {
          this.parks.push({ x: x0, y: y0, w: block - road, h: block - road, trees: rng.int(3, 8) });
          continue;
        }
        // One or two buildings per block, with a courtyard gap.
        const tall = district.tall && rng.chance(0.6);
        const bw = rng.range(90, 150);
        const bh = rng.range(90, 150);
        this.buildings.push({
          x: x0 + rng.range(8, 60), y: y0 + rng.range(8, 60),
          w: bw, h: bh, tall, tint: district.tint,
          floors: tall ? rng.int(6, 14) : rng.int(1, 3),
          district: district.name,
        });
        if (rng.chance(0.45)) {
          this.buildings.push({
            x: x0 + 180 + rng.range(0, 40), y: y0 + 170 + rng.range(0, 40),
            w: rng.range(70, 110), h: rng.range(70, 110), tall: false,
            tint: district.tint, floors: rng.int(1, 2), district: district.name,
          });
        }
      }
    }

    // Mission and story spawns, all on roads or open ground.
    this.spawns = {
      player: { x: 832, y: 832 },
      hideout: { x: 832, y: 2400 },
      marla: { x: 1200, y: 832 },
      marina: { x: 400, y: 2000 },
      warehouse: { x: 3600, y: 3600 },
      bank: { x: 2000, y: 1200 },
      airport: { x: 4000, y: 4000 },
      dock: { x: 3800, y: 2000 },
      casino: { x: 2800, y: 400 },
      park: { x: 800, y: 3600 },
    };

    // Shops: Pay 'n Spray garages and the Gun Rack.
    this.shops = [
      { kind: 'spray', x: 1600, y: 832, name: "Ray's Pay 'n Spray" },
      { kind: 'spray', x: 3600, y: 2400, name: "Ray's Pay 'n Spray" },
      { kind: 'gun', x: 2400, y: 1600, name: 'The Gun Rack' },
      { kind: 'gun', x: 1200, y: 4000, name: 'The Gun Rack' },
    ];

    // Eight hidden stash chests, spread across districts so exploring pays.
    const chestSpots = [
      [432, 432], [2832, 432], [432, 2832], [4432, 432],
      [1232, 3632], [3632, 1232], [4432, 4432], [2032, 3232],
    ];
    for (const [x, y] of chestSpots) {
      this.chests.push({ x, y, cash: rng.int(150, 400), looted: false });
    }

    // Parked cars along road edges.
    const classes = ['sedan', 'coupe', 'truck', 'van', 'sports', 'sedan', 'coupe', 'van'];
    for (let i = 0; i < 26; i += 1) {
      const gx = rng.int(1, 11);
      const gy = rng.int(1, 11);
      const alongX = rng.chance(0.5);
      const x = alongX ? gx * block + road / 2 + rng.range(-8, 8) : gx * block + rng.range(90, 300);
      const y = alongX ? gy * block + rng.range(90, 300) : gy * block + road / 2 + rng.range(-8, 8);
      if (this.inWater(x, y, 20)) continue;
      this.parkedSpots.push({
        cls: classes[i % classes.length],
        x, y, angle: alongX ? 0 : Math.PI / 2,
      });
    }
    // The Golden Marlin waits in the Marina, parked by the water.
    this.parkedSpots.push({ cls: 'marlin', x: 400, y: 2080, angle: Math.PI / 2 });
  }

  inWater(x, y, pad) {
    for (const w of this.water) {
      if (x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) return true;
    }
    return false;
  }

  parkedCars() {
    return this.parkedSpots;
  }

  // True when the point is inside a solid building (roads and parks are open).
  solidAt(x, y) {
    for (const b of this.buildings) {
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
    }
    return null;
  }

  // Push a moving circle out of buildings and water; returns true on hit.
  collideCircle(x, y, radius) {
    const b = this.solidAt(x, y);
    if (b) return b;
    if (this.inWater(x, y, 0)) return { water: true };
    return null;
  }

  districtName(x, y) {
    return districtAt(x, y).name;
  }
}

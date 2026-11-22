// Pedestrians: folk walking the sidewalks, who flee when a shot is fired or
// a car comes at them, and who panic-call the police when they see a crime.
import { WORLD } from './config.js';
import { makeRng } from './rng.js';
import { isRoad } from './world.js';

const NAMES = ['Maya', 'Dario', 'Sofia', 'Ken', 'Priya', 'Leo', 'Nadia', 'Tom', 'Iris', 'Marco', 'Lena', 'Omar'];
const SHIRTS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];

export class Pedestrian {
  constructor(x, y, rng) {
    this.x = x;
    this.y = y;
    this.name = rng.pick(NAMES);
    this.shirt = rng.pick(SHIRTS);
    this.speed = rng.range(28, 52);
    this.angle = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    this.fleeing = 0;
    this.dead = false;
    this.panic = 0;
    this.walkPhase = rng.range(0, Math.PI * 2);
  }

  step(dt, city, danger) {
    if (this.dead) return;
    this.walkPhase += dt * 6;
    if (danger) {
      const d = Math.hypot(danger.x - this.x, danger.y - this.y);
      if (d < 260) {
        this.fleeing = 2.5;
        this.panic = Math.max(this.panic, 3);
        this.angle = Math.atan2(this.y - danger.y, this.x - danger.x);
      }
    }
    const speed = this.fleeing > 0 ? this.speed * 2.6 : this.speed;
    if (this.fleeing > 0) this.fleeing -= dt;
    if (this.panic > 0) this.panic -= dt;
    let nx = this.x + Math.cos(this.angle) * speed * dt;
    let ny = this.y + Math.sin(this.angle) * speed * dt;
    // Stay on sidewalks: if the next step leaves the road area into a
    // building, turn around instead.
    if (city.collideCircle(nx, ny, 8) || !city.inBounds(nx, ny)) {
      this.angle += Math.PI / 2;
      nx = this.x;
      ny = this.y;
    }
    // At intersections, sometimes turn onto the cross street.
    if (isRoad(this.x, this.y) && Math.random() < dt * 0.25) {
      this.angle += Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
    }
    this.x = nx;
    this.y = ny;
  }
}

export class Crowd {
  constructor(city, seed) {
    const rng = makeRng(seed + 17);
    this.peds = [];
    for (let i = 0; i < 26; i += 1) {
      const bx = rng.int(0, 11) * WORLD.block;
      const by = rng.int(0, 11) * WORLD.block;
      this.peds.push(new Pedestrian(
        bx + rng.range(50, 350),
        by + rng.range(50, 350),
        rng,
      ));
    }
  }

  step(dt, city, danger) {
    for (const ped of this.peds) ped.step(dt, city, danger);
    this.peds = this.peds.filter((p) => !p.dead);
  }

  nearest(x, y, maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const ped of this.peds) {
      const d = Math.hypot(ped.x - x, ped.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = ped;
      }
    }
    return best;
  }

  countPanicking() {
    return this.peds.filter((p) => p.panic > 0).length;
  }
}

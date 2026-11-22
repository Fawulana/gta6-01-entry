// Palmetto Bay — pedestrians.
// They stroll the sidewalks, cross roads, and scatter when danger (a
// speeding car, gunfire) comes near. A panicked ped runs from the threat.
import { makeRng } from './rng.js';
import { WORLD } from './config.js';

const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#ecf0f1', '#1abc9c'];

export class Crowd {
  constructor(city, seed) {
    this.rng = makeRng(seed + 31);
    this.peds = [];
    for (let i = 0; i < 26; i += 1) {
      this.peds.push(this.spawnPed(city));
    }
  }

  spawnPed(city) {
    const rng = this.rng;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 40; tries += 1) {
      x = rng.range(200, WORLD.size - 200);
      y = rng.range(200, WORLD.size - 200);
      if (!city.collideCircle(x, y, 8) && !city.inWater(x, y, 10)) break;
    }
    return {
      x, y,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(28, 52),
      shirt: rng.pick(SHIRTS),
      dead: false,
      panic: 0,
      wanderTimer: rng.range(1, 4),
    };
  }

  nearest(x, y, maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const p of this.peds) {
      if (p.dead) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  step(dt, city, danger) {
    for (const p of this.peds) {
      if (p.dead) continue;
      if (danger) {
        const d = Math.hypot(p.x - danger.x, p.y - danger.y);
        if (d < 260) {
          p.panic = 2.5;
          // Flee directly away from the threat, not toward it.
          p.angle = Math.atan2(p.y - danger.y, p.x - danger.x);
        }
      }
      p.panic = Math.max(0, p.panic - dt);
      const speed = p.panic > 0 ? 150 : p.speed;
      if (p.panic <= 0) {
        p.wanderTimer -= dt;
        if (p.wanderTimer <= 0) {
          p.wanderTimer = this.rng.range(2, 5);
          p.angle = this.rng.range(0, Math.PI * 2);
        }
      }
      const nx = p.x + Math.cos(p.angle) * speed * dt;
      const ny = p.y + Math.sin(p.angle) * speed * dt;
      if (!city.collideCircle(nx, p.y, 8) && !city.inWater(nx, p.y, 6)) p.x = nx;
      else p.angle += Math.PI / 2;
      if (!city.collideCircle(p.x, ny, 8) && !city.inWater(p.x, ny, 6)) p.y = ny;
      else p.angle += Math.PI / 2;
      p.x = Math.max(12, Math.min(WORLD.size - 12, p.x));
      p.y = Math.max(12, Math.min(WORLD.size - 12, p.y));
    }
  }
}

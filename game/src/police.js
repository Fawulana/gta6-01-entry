// The wanted system: 0 to 5 stars. Crimes raise it, police cars spawn and
// chase, and it cools down when the player stays out of trouble — or drops
// instantly at a Pay 'n Spray.
import { WANTED } from './config.js';
import { Car } from './vehicles.js';
import { WORLD } from './config.js';

export class Wanted {
  constructor() {
    this.stars = 0;
    this.heat = 0; // 0..1 within the current star level
    this.quietTimer = 0;
    this.sirenTimer = 0;
  }

  addCrime(level, reason) {
    if (level <= 0) return;
    this.stars = Math.min(WANTED.maxStars, this.stars + level);
    this.heat = 1;
    this.quietTimer = 0;
    this.lastReason = reason;
  }

  clear() {
    this.stars = 0;
    this.heat = 0;
    this.quietTimer = 0;
  }

  step(dt, policeVisible) {
    if (this.stars === 0) return;
    if (policeVisible) {
      this.quietTimer = 0;
      this.heat = Math.min(1, this.heat + dt * 0.05);
      return;
    }
    this.quietTimer += dt;
    if (this.quietTimer > WANTED.decaySeconds) {
      this.stars -= 1;
      this.heat = 0.5;
      this.quietTimer = 0;
    }
  }
}

export class Police {
  constructor(seed) {
    this.cars = [];
    this.spawnTimer = 0;
    this.seed = seed;
  }

  wantedCount(stars) {
    return WANTED.policePerStar[Math.min(stars, WANTED.maxStars)];
  }

  step(dt, player, wanted, city) {
    const want = this.wantedCount(wanted.stars);
    this.spawnTimer -= dt;
    if (this.cars.length < want && this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      const angle = Math.random() * Math.PI * 2;
      const r = WANTED.copSpawnRadius;
      const x = player.x + Math.cos(angle) * r;
      const y = player.y + Math.sin(angle) * r;
      const car = new Car('police', x, y, Math.atan2(player.y - y, player.x - x), { color: '#1a1a2e' });
      car.speed = 200;
      this.cars.push(car);
    }
    let visible = false;
    for (const car of this.cars) {
      if (car.dead) continue;
      car.chaseStep(dt, player.x, player.y);
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < 700) visible = true;
      // A cop that rams the player hard deals damage.
      if (d < 44 && Math.abs(car.speed) > 120) {
        player.damage(8 * dt * 4, 'rammed by PBPD');
      }
      const hit = city.collideCircle(car.x, car.y, 14);
      if (hit) {
        car.angle += Math.PI / 3;
        car.speed *= 0.5;
      }
      if (car.x < 40 || car.x > WORLD.size - 40 || car.y < 40 || car.y > WORLD.size - 40) {
        car.angle += Math.PI;
      }
    }
    this.cars = this.cars.filter((c) => !c.dead);
    if (wanted.stars === 0) this.cars = [];
    return visible;
  }

  nearest(x, y, maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const car of this.cars) {
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    return best;
  }
}

// Palmetto Bay — the wanted system and the PBPD.
// Crimes add stars; stars decide how many interceptors chase you. Cops
// ram, and at high heat they shoot. Break line of sight and the heat
// slowly cools off.
import { makeRng } from './rng.js';
import { Car } from './vehicles.js';
import { WANTED, WORLD } from './config.js';

export class Wanted {
  constructor() {
    this.stars = 0;
    this.heat = 0;
    this.coolTimer = 0;
    this.lastCrime = '';
  }

  addCrime(level, reason) {
    this.stars = Math.min(WANTED.maxStars, this.stars + level);
    this.heat = Math.min(100, this.heat + level * 22);
    this.coolTimer = WANTED.decaySeconds;
    if (reason) this.lastCrime = reason;
  }

  clear() {
    this.stars = 0;
    this.heat = 0;
    this.coolTimer = 0;
  }

  step(dt, policeVisible) {
    if (this.stars === 0) return;
    if (policeVisible) {
      this.coolTimer = WANTED.decaySeconds;
      return;
    }
    this.coolTimer -= dt;
    if (this.coolTimer <= 0) {
      this.stars = Math.max(0, this.stars - 1);
      this.coolTimer = WANTED.decaySeconds;
      this.heat = Math.max(0, this.heat - 20);
    }
  }
}

export class Police {
  constructor(seed) {
    this.rng = makeRng(seed + 55);
    this.cars = [];
    this.spawnTimer = 0;
    this.shootTimer = 0;
  }

  wantedCount() {
    return WANTED.policePerStar;
  }

  step(dt, player, wanted, city) {
    this.spawnTimer -= dt;
    const target = WANTED.policePerStar[wanted.stars] || 0;
    if (this.cars.length < target && this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      const a = this.rng.range(0, Math.PI * 2);
      const x = player.px + Math.cos(a) * WANTED.copSpawnRadius;
      const y = player.py + Math.sin(a) * WANTED.copSpawnRadius;
      const car = new Car('police', Math.max(40, Math.min(WORLD.size - 40, x)), Math.max(40, Math.min(WORLD.size - 40, y)), a, {
        police: true, color: '#141428',
      });
      car.speed = 260;
      this.cars.push(car);
    }
    let visible = false;
    for (const car of this.cars) {
      if (car.dead) continue;
      const d = Math.hypot(car.x - player.px, car.y - player.py);
      if (d < 900) visible = true;
      // Chase: steer toward the player, faster than traffic.
      const want = Math.atan2(player.py - car.y, player.px - car.x);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const cruise = d > 260 ? car.spec.top : 320;
      car.speed += Math.sign(cruise - car.speed) * 300 * dt;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      // Ram the player: a hard hit on foot hurts, a hit on the car damages it.
      if (d < 52 && car.hitCooldown <= 0) {
        car.hitCooldown = 1.1;
        if (player.car) {
          player.car.damage(14);
          car.damage(8);
        } else {
          player.damage(18, 'rammed by police');
        }
      }
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
    }
    // At 3+ stars, cops take pot-shots when close — on foot you get hurt,
    // in a car your car takes the damage instead.
    this.shootTimer -= dt;
    if (wanted.stars >= 3 && this.shootTimer <= 0 && this.cars.some((c) => !c.dead && Math.hypot(c.x - player.px, c.y - player.py) < 420)) {
      this.shootTimer = 1.6;
      if (!player.car) player.damage(9, 'police gunfire');
      else player.car.damage(6);
    }
    // Remove wrecks and extras once the heat is gone.
    this.cars = this.cars.filter((c) => !c.dead && (wanted.stars > 0 || Math.hypot(c.x - player.px, c.y - player.py) < 1400));
    return visible;
  }
}

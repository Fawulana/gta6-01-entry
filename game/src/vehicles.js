// Palmetto Bay — cars and traffic.
// A car is a simple arcade body: accelerate, steer by speed, drift a
// little at low grip, brake, and take damage. Traffic cars follow the
// road grid, stop for nothing, and honk when the player blocks them.
import { makeRng } from './rng.js';
import { CAR_CLASSES, WORLD } from './config.js';
import { isRoad, roadCenter } from './world.js';

export class Car {
  constructor(cls, x, y, angle, opts = {}) {
    this.cls = cls;
    this.spec = CAR_CLASSES[cls];
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.health = 100;
    this.color = opts.color || this.spec.colors[0];
    this.parked = !!opts.parked;
    this.traffic = !!opts.traffic;
    this.police = !!opts.police;
    this.dead = false;
    this.hitCooldown = 0;
    this.honkTimer = 0;
    this.smokeTimer = 0;
  }

  drive(fwd, steer, dt, brake) {
    if (this.dead) return;
    const spec = this.spec;
    if (fwd > 0) this.speed += spec.accel * dt;
    else if (fwd < 0) this.speed -= spec.accel * 0.7 * dt;
    else this.speed -= Math.sign(this.speed) * 60 * dt;
    if (brake) this.speed -= Math.sign(this.speed) * 420 * dt;
    if (Math.abs(this.speed) < 8 && fwd === 0) this.speed = 0;
    this.speed = Math.max(-spec.top * 0.45, Math.min(spec.top, this.speed));
    const dir = this.speed >= 0 ? 1 : -1;
    const steerRate = 2.6 * spec.grip * Math.min(1, Math.abs(this.speed) / 120 + 0.25);
    this.angle += steer * steerRate * dir * dt;
    const drift = 1 - spec.grip;
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    // A touch of drift: low-grip cars slide sideways when turning hard.
    const slide = steer !== 0 && Math.abs(this.speed) > 200 ? drift * 26 * dt : 0;
    this.x += vx * dt - Math.sin(this.angle) * slide * Math.sign(steer);
    this.y += vy * dt + Math.cos(this.angle) * slide * Math.sign(steer);
    this.x = Math.max(20, Math.min(WORLD.size - 20, this.x));
    this.y = Math.max(20, Math.min(WORLD.size - 20, this.y));
  }

  damage(amount) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.speed = 0;
    }
  }
}

export function collideCars(a, b) {
  if (a.dead || b.dead) return false;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = (a.spec.length + b.spec.length) / 2 - 6;
  if (dist >= minDist || dist === 0) return false;
  const push = (minDist - dist) / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  // Lateral shove: two cars meeting head-on on a narrow road would grind
  // to a halt if they only ever pushed each other fore and aft. A sideways
  // nudge lets them slide past each other instead of deadlocking.
  const overlap = minDist - dist;
  const lat = overlap * 0.4;
  const px = -ny;
  const py = nx;
  const side = Math.sign((b.x - a.x) * py - (b.y - a.y) * px) || 1;
  a.x -= px * lat * side;
  a.y -= py * lat * side;
  b.x += px * lat * side;
  b.y += py * lat * side;
  const impact = Math.abs(a.speed - b.speed);
  if (impact > 60) {
    const aSpeed = a.speed;
    const bSpeed = b.speed;
    a.damage(impact * 0.03);
    b.damage(impact * 0.03);
    // Keep most of the momentum: a hard stop every frame while the cars
    // overlap would pin both of them in place forever.
    a.speed = aSpeed * 0.55 + bSpeed * 0.2;
    b.speed = bSpeed * 0.55 + aSpeed * 0.2;
    return true;
  }
  return false;
}

export class Traffic {
  constructor(city, seed) {
    this.rng = makeRng(seed + 77);
    this.cars = [];
    const classes = ['sedan', 'coupe', 'truck', 'van', 'sedan', 'coupe'];
    for (let i = 0; i < 16; i += 1) {
      const gx = this.rng.int(1, 11);
      const gy = this.rng.int(1, 11);
      const horizontal = this.rng.chance(0.5);
      const x = horizontal ? gx * WORLD.block + this.rng.range(100, 300) : roadCenter(gx * WORLD.block);
      const y = horizontal ? roadCenter(gy * WORLD.block) : gy * WORLD.block + this.rng.range(100, 300);
      const angle = horizontal ? (this.rng.chance(0.5) ? 0 : Math.PI) : (this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
      const car = new Car(classes[i % classes.length], x, y, angle, {
        traffic: true,
        color: this.rng.pick(CAR_CLASSES[classes[i % classes.length]].colors),
      });
      car.speed = this.rng.range(90, 170);
      car.cruise = car.speed;
      this.cars.push(car);
    }
  }

  step(dt, city, playerCar) {
    for (const car of this.cars) {
      if (car.dead) continue;
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
      // Ease back to cruising speed.
      const target = car.cruise || 130;
      car.speed += Math.sign(target - car.speed) * 40 * dt;
      // Stay on the road: if the car drifted off the grid, steer back.
      const aheadX = car.x + Math.cos(car.angle) * 60;
      const aheadY = car.y + Math.sin(car.angle) * 60;
      if (!isRoad(aheadX, aheadY)) {
        // Nudge toward the nearest road centre line.
        const cx = roadCenter(car.x);
        const cy = roadCenter(car.y);
        const want = Math.abs(car.x - cx) < Math.abs(car.y - cy)
          ? Math.atan2(cy - car.y, 0)
          : Math.atan2(0, cx - car.x);
        let diff = want - car.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
      }
    // Don't rear-end the player: slow down when close ahead, and never
    // push through the player's car.
    if (playerCar && playerCar !== car) {
        const d = Math.hypot(playerCar.x - car.x, playerCar.y - car.y);
        if (d < 90) car.speed = Math.min(car.speed, 40);
      }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      // Wrap around the city edge so traffic never runs out.
      if (car.x < 0) car.x += WORLD.size;
      if (car.x >= WORLD.size) car.x -= WORLD.size;
      if (car.y < 0) car.y += WORLD.size;
      if (car.y >= WORLD.size) car.y -= WORLD.size;
      for (const other of this.cars) {
        if (other !== car) collideCars(car, other);
      }
    }
  }
}

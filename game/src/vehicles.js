// Cars: arcade physics (accelerate, steer, drift, collide), traffic that
// follows the road grid, and the parked cars the player can steal.
import { WORLD, CAR_CLASSES } from './config.js';
import { makeRng } from './rng.js';
import { isRoad, roadCentre } from './world.js';

let nextId = 1;

export class Car {
  constructor(cls, x, y, angle, opts = {}) {
    this.id = nextId;
    nextId += 1;
    this.cls = cls;
    this.spec = CAR_CLASSES[cls];
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.color = opts.color || this.spec.colors[0];
    this.traffic = !!opts.traffic;
    this.police = cls === 'police';
    this.parked = !!opts.parked;
    this.stolen = false;
    this.dead = false;
    this.smoke = 0;
    this.health = 100;
    this.hitCooldown = 0;
    this.targetAngle = angle;
    this.laneOffset = opts.laneOffset || 0;
    this.wait = 0;
  }

  get length() { return this.spec.length; }
  get width() { return this.spec.width; }

  // Drive with throttle (-1..1) and steering (-1..1) for dt seconds.
  drive(throttle, steer, dt) {
    const s = this.spec;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    const maxSpeed = s.top * (throttle < 0 ? 0.45 : 1);
    this.speed += throttle * s.accel * dt;
    if (throttle === 0) this.speed *= Math.max(0, 1 - 0.8 * dt);
    if (this.speed > maxSpeed) this.speed = maxSpeed;
    if (this.speed < -s.top * 0.45) this.speed = -s.top * 0.45;
    const turnRate = 2.6 * s.grip * Math.min(1, Math.abs(this.speed) / 140);
    this.angle += steer * turnRate * Math.sign(this.speed) * dt;
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    this.x = nx;
    this.y = ny;
    if (Math.abs(this.speed) > s.top * 0.75) this.smoke = Math.min(1, this.smoke + dt);
    else this.smoke = Math.max(0, this.smoke - dt * 2);
  }

  // Simple traffic brain: follow the road grid, turn at intersections.
  trafficStep(dt, city, rng) {
    if (this.wait > 0) {
      this.wait -= dt;
      this.speed *= Math.max(0, 1 - 4 * dt);
      return;
    }
    const ahead = 46;
    const ax = this.x + Math.cos(this.angle) * ahead;
    const ay = this.y + Math.sin(this.angle) * ahead;
    const onRoad = isRoad(this.x, this.y);
    let steer = 0;
    let throttle = 0.55;
    if (!onRoad) {
      // Steer back toward the nearest road centre line.
      const m = WORLD.block;
      const rx = ((this.x % m) + m) % m;
      const ry = ((this.y % m) + m) % m;
      const toRoadX = rx < m / 2 ? -rx : m - rx;
      const toRoadY = ry < m / 2 ? -ry : m - ry;
      const want = Math.abs(toRoadX) < Math.abs(toRoadY)
        ? Math.atan2(0, Math.sign(toRoadX))
        : Math.atan2(Math.sign(toRoadY), 0);
      steer = this.steerToward(want);
      throttle = 0.4;
    } else if (!isRoad(ax, ay)) {
      // About to leave the road: pick a turn at the intersection.
      const options = [0, Math.PI / 2, -Math.PI / 2];
      const turn = rng.pick(options);
      this.targetAngle = this.angle + turn;
      this.wait = 0.12;
    }
    steer = this.steerToward(this.targetAngle);
    // Slow for the car ahead.
    const slow = this.speed > 200;
    this.drive(throttle, steer, dt);
    if (slow) this.speed = Math.min(this.speed, 210);
    // Keep inside the city.
    if (this.x < 60 || this.x > WORLD.size - 60 || this.y < 60 || this.y > WORLD.size - 60) {
      this.targetAngle = this.angle + Math.PI;
    }
  }

  steerToward(want) {
    let diff = want - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.max(-1, Math.min(1, diff * 2.2));
  }

  // Chase a point (police behaviour): full throttle, steer hard.
  chaseStep(dt, tx, ty) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    const steer = this.steerToward(want);
    const dist = Math.hypot(tx - this.x, ty - this.y);
    const throttle = dist > 90 ? 1 : 0.4;
    this.drive(throttle, steer, dt);
  }
}

export function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const min = (a.length + b.length) / 2 - 6;
  if (dist >= min) return false;
  const push = (min - dist) / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const exchange = (a.speed + b.speed) / 2;
  a.speed = exchange * 0.4;
  b.speed = exchange * 0.4;
  // Damage only once per half second of contact: without the cooldown two
  // cars resting against each other would grind each other to scrap.
  if (a.hitCooldown <= 0 && b.hitCooldown <= 0) {
    a.health -= 4;
    b.health -= 4;
    a.hitCooldown = 0.5;
    b.hitCooldown = 0.5;
  }
  return true;
}

export class Traffic {
  constructor(city, seed) {
    this.rng = makeRng(seed + 31);
    this.cars = [];
    const classes = ['sedan', 'coupe', 'truck', 'van', 'sports'];
    for (let i = 0; i < 16; i += 1) {
      const bx = this.rng.int(0, 11) * WORLD.block;
      const by = this.rng.int(0, 11) * WORLD.block;
      const horizontal = this.rng.chance(0.5);
      const cls = this.rng.pick(classes);
      const car = new Car(cls, bx + (horizontal ? this.rng.range(80, 320) : 0), by + (horizontal ? 0 : this.rng.range(80, 320)), horizontal ? 0 : Math.PI / 2, {
        traffic: true,
        color: this.rng.pick(CAR_CLASSES[cls].colors),
        laneOffset: this.rng.range(-8, 8),
      });
      car.speed = this.rng.range(120, 200);
      this.cars.push(car);
    }
  }

  step(dt, city, playerCar) {
    for (const car of this.cars) {
      if (car.dead) continue;
      // Don't let traffic pile onto the player's car: slow when close ahead.
      car.trafficStep(dt, city, this.rng);
      const hit = city.collideCircle(car.x, car.y, 14);
      if (hit) {
        car.angle += Math.PI / 2;
        car.x -= Math.cos(car.angle) * 20;
        car.y -= Math.sin(car.angle) * 20;
      }
    }
    for (let i = 0; i < this.cars.length; i += 1) {
      for (let j = i + 1; j < this.cars.length; j += 1) {
        collideCars(this.cars[i], this.cars[j]);
      }
      if (playerCar) collideCars(this.cars[i], playerCar);
    }
  }

  nearest(x, y, maxDist) {
    let best = null;
    let bestDist = maxDist;
    for (const car of this.cars) {
      if (car.dead) continue;
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    return best;
  }
}

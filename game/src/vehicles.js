// Cars: the player's ride, the traffic that fills the roads, the parked cars
// waiting to be stolen, and the police Interceptors. Arcade physics — a bicycle
// model with speed-sensitive steering, a handbrake drift, and slide-along
// building collisions — with a distinct handling model per car class.

import { CAR_MODELS, ROADS, WORLD } from './config.js';
import { pick, rangeInt } from './random.js';

const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function makeCar(modelKey, x, y, angle, color) {
  const model = CAR_MODELS[modelKey];
  return {
    modelKey, model, color: color || model.colors[0],
    x, y, angle, speed: 0,
    steer: 0, health: 100, smoke: 0, damageCooldown: 0,
    isPlayer: false, isCop: false, isTraffic: false, parked: false,
    route: null, waypoint: 0, cruise: 0, stuck: 0, dead: false,
    brakeLight: false, horn: 0,
  };
}

/** Parked cars along curbs, ready to be stolen. */
export function spawnParkedCars(random, city) {
  const cars = [];
  const spots = [];
  for (const ax of ROADS.avenues) {
    for (const sy of ROADS.streets) {
      spots.push({ x: ax + ROADS.halfWidth - 22, y: sy + 120, angle: Math.PI / 2 });
      spots.push({ x: ax - ROADS.halfWidth + 22, y: sy - 120, angle: -Math.PI / 2 });
    }
  }
  for (let i = 0; i < 26; i += 1) {
    const spot = spots[rangeInt(random, 0, spots.length)];
    const key = pick(random, ['sedan', 'sedan', 'sports', 'taxi', 'truck']);
    const car = makeCar(key, spot.x, spot.y, spot.angle, pick(random, CAR_MODELS[key].colors));
    car.parked = true;
    cars.push(car);
  }
  // The gold Aurum GT waits at the marina for the finale, parked on the sand
  // east of the hotels where nothing can hide it.
  const gold = makeCar('gold', 3950, 700, Math.PI / 2, '#ffd700');
  gold.parked = true;
  gold.gold = true;
  cars.push(gold);
  return cars;
}

/** Traffic cars that drive the road grid, following waypoint routes. */
export function spawnTraffic(random, city, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const inter = city.intersections[rangeInt(random, 0, city.intersections.length)];
    const key = pick(random, ['sedan', 'sedan', 'taxi', 'truck', 'sports']);
    const car = makeCar(key, inter.x, inter.y, pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]), pick(random, CAR_MODELS[key].colors));
    car.isTraffic = true;
    car.cruise = rangeInt(random, 180, 320);
    car.route = randomRoute(random, city, car.x, car.y);
    car.waypoint = 0;
    cars.push(car);
  }
  return cars;
}

function randomRoute(random, city, x, y) {
  const target = city.intersections[rangeInt(random, 0, city.intersections.length)];
  return city.route(x, y, target.x, target.y);
}

/**
 * One physics step for a driven car. input: { up, down, left, right, handbrake }.
 * Returns a crash strength (0 when nothing hit) for sound and sparks.
 */
export function stepCar(car, input, dt, city) {
  const m = car.model;
  let crash = 0;
  if (car.damageCooldown > 0) car.damageCooldown -= dt;
  const forward = input.up ? 1 : input.down ? -0.6 : 0;
  if (forward !== 0) {
    const accel = forward > 0 ? m.accel : m.accel * 0.7;
    car.speed += forward * accel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 260 * dt;
    if (Math.abs(car.speed) < 12) car.speed = 0;
  }
  const maxSpeed = car.speed >= 0 ? m.top : m.reverse;
  car.speed = Math.max(-m.reverse, Math.min(m.top, car.speed));
  if (Math.abs(car.speed) > maxSpeed) car.speed = Math.sign(car.speed) * maxSpeed;

  const steerInput = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const speedFactor = Math.min(1, Math.abs(car.speed) / 260);
  const grip = input.handbrake ? m.grip * 0.45 : m.grip;
  const targetSteer = steerInput * m.turn * speedFactor * (input.handbrake ? 1.35 : 1);
  car.steer += (targetSteer - car.steer) * Math.min(1, grip * dt * 2.2);
  car.angle += car.steer * dt * Math.sign(car.speed || 1);

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const half = m.length / 2 - 4;
  const fx = nx + Math.cos(car.angle) * half;
  const fy = ny + Math.sin(car.angle) * half;
  const bx = nx - Math.cos(car.angle) * half;
  const by = ny - Math.sin(car.angle) * half;
  const r = m.width / 2;
  // Buildings, the world edge and the water all stop a car.
  const hitFront = city.hitBuilding(fx, fy, r) || fx < 20 || fx > WORLD.waterX - 20 || fy < 20 || fy > WORLD.height - 20;
  const hitBack = city.hitBuilding(bx, by, r) || bx < 20 || bx > WORLD.waterX - 20 || by < 20 || by > WORLD.height - 20;
  if (hitFront || hitBack) {
    crash = Math.abs(car.speed) / m.top;
    car.speed *= -0.25;
    // Damage is per impact, not per step: a car pushed against a wall takes
    // one hit, then a breather, instead of dying in under a second.
    if (crash > 0.15 && car.damageCooldown <= 0) {
      car.health -= crash * 22;
      car.damageCooldown = 0.5;
    }
    car.x = Math.max(24, Math.min(WORLD.waterX - 24, car.x));
    car.y = Math.max(24, Math.min(WORLD.height - 24, car.y));
  } else {
    car.x = nx;
    car.y = ny;
  }
  car.brakeLight = !!input.down;
  if (car.health < 40) car.smoke = 1;
  if (car.health <= 0) car.dead = true;
  return crash;
}

/** Traffic AI: follow the route, keep a lane offset, slow for the car ahead. */
export function stepTraffic(car, dt, city, cars, playerPos, random) {
  const rng = random || Math.random;
  if (car.dead) return;
  const target = car.route ? car.route[car.waypoint] : null;
  if (!target) {
    car.route = randomRoute(rng, city, car.x, car.y);
    car.waypoint = 0;
    return;
  }
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 46) {
    car.waypoint += 1;
    if (car.waypoint >= car.route.length) {
      car.route = randomRoute(rng, city, car.x, car.y);
      car.waypoint = 0;
    }
    return;
  }
  const wantAngle = Math.atan2(dy, dx);
  const diff = angleDiff(wantAngle, car.angle);
  // Slow down for a car directly ahead.
  let ahead = false;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const along = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
    const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
    if (along > 0 && along < 90 && side < 40) {
      ahead = true;
      break;
    }
  }
  const input = {
    up: !ahead && Math.abs(diff) < 1.2,
    down: false,
    left: diff < -0.06,
    right: diff > 0.06,
    handbrake: false,
  };
  if (!input.up) car.speed -= Math.sign(car.speed) * 300 * dt;
  stepCar(car, input, dt, city);
  if (Math.abs(car.speed) < 30 && Math.abs(diff) > 0.8) car.stuck += dt;
  else car.stuck = 0;
  if (car.stuck > 2.5) {
    car.angle = wantAngle;
    car.stuck = 0;
  }
  // Keep traffic near the action: respawn far cars on a road by the player.
  if (playerPos && Math.hypot(car.x - playerPos.x, car.y - playerPos.y) > 2400) {
    const near = city.nearestRoad(playerPos.x + (rng() - 0.5) * 1400, playerPos.y + (rng() - 0.5) * 1000);
    car.x = near.x;
    car.y = near.y;
    car.angle = near.angle;
    car.speed = 0;
    car.route = randomRoute(rng, city, car.x, car.y);
    car.waypoint = 0;
  }
}

/** Push overlapping cars apart; returns pairs that hit hard, for sparks and sound. */
export function resolveCarCollisions(cars) {
  const hits = [];
  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (b.dead || b.parked) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = (a.model.length + b.model.length) / 2 - 14;
      if (dist > 0 && dist < min) {
        const push = (min - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const impact = Math.abs(a.speed - b.speed);
        if (impact > 140) hits.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, strength: impact / 800 });
        a.speed *= 0.92;
        b.speed *= 0.92;
        if (impact > 260 && a.damageCooldown <= 0 && b.damageCooldown <= 0) {
          a.health -= 4;
          b.health -= 4;
          a.damageCooldown = 0.5;
          b.damageCooldown = 0.5;
        }
      }
    }
  }
  return hits;
}

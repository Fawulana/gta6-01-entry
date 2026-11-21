// Vehicles for Solmar Bay: kinds, spawning and arcade driving physics.
// A car is a plain object; the physics here are deliberately simple and
// forgiving — accelerate, steer harder at low speed, drift on the handbrake
// — so driving feels good with a keyboard.
import { VEHICLE_KINDS, WORLD, ROAD_LINES, LANE } from './config.js';
import { makeRng, range, pick, intRange } from './random.js';

let nextCarId = 1;

export function makeCar(kindName, x, y, angle, opts = {}) {
  const kind = VEHICLE_KINDS[kindName];
  return {
    id: nextCarId,
    kind: kindName,
    label: kind.label,
    color: opts.color || kind.color,
    dark: kind.dark,
    len: kind.len,
    wid: kind.wid,
    x, y,
    angle, // radians, 0 = east
    speed: 0,
    maxSpeed: kind.maxSpeed,
    accel: kind.accel,
    grip: kind.grip,
    hp: opts.hp ?? kind.hp,
    maxHp: opts.hp ?? kind.hp,
    cruise: kind.cruise,
    traffic: opts.traffic ?? false, // true = AI traffic car
    parked: opts.parked ?? false,
    roadAxis: opts.roadAxis || 'h', // 'h' drives along x, 'v' along y
    roadLine: opts.roadLine ?? 0,
    dir: opts.dir ?? 1, // +1 or -1 along the road
    turnCooldown: 0,
    wanted: false, // police car on duty
    gold: kindName === 'comet' && opts.gold === true,
    dead: false,
  };
}

// A random traffic kind, weighted so sedans and taxis dominate the streets.
export function randomTrafficKind(rng) {
  const r = rng();
  if (r < 0.34) return 'sedan';
  if (r < 0.52) return 'taxi';
  if (r < 0.68) return 'van';
  if (r < 0.84) return 'sports';
  return 'truck';
}

export function randomCarColor(rng, kindName) {
  const palette = {
    sedan: ['#4a7fb5', '#7a4a8a', '#3f8a5f', '#b5b0a8', '#c25a3a'],
    sports: ['#d23b2e', '#e8b73a', '#2e6fd2', '#e8e8e8', '#222831'],
    truck: ['#c98a2e', '#7d8a99', '#8a5c2e'],
    van: ['#7d8a99', '#b5b0a8', '#4a6b8a'],
    taxi: ['#f2c230'],
    police: ['#1e2a38'],
    comet: ['#e8b73a'],
  };
  const list = palette[kindName] || ['#888888'];
  return list[Math.floor(rng() * list.length)];
}

// Spawn a traffic car on a random road, in a lane, moving with the flow.
export function spawnTrafficCar(rng, margin = 0) {
  const axis = rng() < 0.5 ? 'h' : 'v';
  const line = pick(rng, ROAD_LINES);
  const dir = rng() < 0.5 ? 1 : -1;
  const laneOff = LANE * (axis === 'h' ? dir : dir);
  let x;
  let y;
  let angle;
  if (axis === 'h') {
    x = range(rng, 100, WORLD - 100);
    y = line + (dir > 0 ? LANE : -LANE);
    angle = dir > 0 ? 0 : Math.PI;
  } else {
    x = line + (dir > 0 ? -LANE : LANE);
    y = range(rng, 100, WORLD - 100);
    angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  const kindName = randomTrafficKind(rng);
  const car = makeCar(kindName, x, y, angle, {
    traffic: true,
    roadAxis: axis,
    roadLine: line,
    dir,
    color: randomCarColor(rng, kindName),
  });
  car.speed = car.cruise * range(rng, 0.8, 1.1);
  return car;
}

// --- Driving physics -------------------------------------------------------
// dt seconds, throttle -1..1, steer -1..1, handbrake bool. Returns events
// the caller may react to: { skidding, bumped }.
export function driveCar(car, dt, throttle, steer, handbrake, state) {
  const events = { skidding: false, bumped: false };
  const speed = car.speed;
  if (throttle > 0) {
    car.speed += car.accel * throttle * dt;
  } else if (throttle < 0) {
    // Brake, then reverse slowly.
    if (speed > 10) car.speed += car.accel * 1.6 * throttle * dt;
    else car.speed += car.accel * 0.45 * throttle * dt;
  } else {
    car.speed -= Math.sign(speed) * 60 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  // Rolling drag.
  car.speed -= car.speed * 0.25 * dt;
  const maxFwd = car.maxSpeed;
  const maxRev = 140;
  if (car.speed > maxFwd) car.speed = maxFwd;
  if (car.speed < -maxRev) car.speed = -maxRev;

  const speedFactor = Math.min(1, Math.abs(speed) / 220);
  const steerRate = car.grip * (handbrake ? 1.7 : 1) * (0.55 + 0.45 * speedFactor);
  if (speed !== 0) {
    car.angle += steer * steerRate * dt * Math.sign(speed);
  }
  events.skidding = handbrake && Math.abs(speed) > 120;
  if (events.skidding) {
    // Drift: the car slides sideways a touch and loses grip.
    car.speed -= car.speed * 0.5 * dt;
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // World bounds: bounce softly off the edge.
  if (nx < 30 || nx > WORLD - 30 || ny < 30 || ny > WORLD - 30) {
    car.speed *= -0.3;
    events.bumped = true;
  } else {
    car.x = nx;
    car.y = ny;
  }
  return events;
}

// Simple circle-ish collision between two cars (using their length as the
// radius). Returns true when they overlap.
export function carsOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = (a.len + b.len) / 2 - 6;
  return dx * dx + dy * dy < r * r;
}

// Push two overlapping cars apart and trade a little speed (a soft bump).
export function resolveCarCollision(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const overlap = (a.len + b.len) / 2 - 6 - dist;
  if (overlap <= 0) return false;
  const push = overlap / 2;
  const ux = dx / dist;
  const uy = dy / dist;
  a.x -= ux * push;
  a.y -= uy * push;
  b.x += ux * push;
  b.y += uy * push;
  const tmp = a.speed;
  a.speed = b.speed * 0.4;
  b.speed = tmp * 0.4;
  return true;
}

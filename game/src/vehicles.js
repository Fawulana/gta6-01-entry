// Palmetto Bay — cars. Car classes and traffic come from here, and so does
// the driving model: arcade steering where the car turns in proportion to
// its speed, with a little drift, and traffic that follows the road grid
// and brakes for what is ahead of it.

import { CAR_CLASSES, ROADS_X, ROADS_Y, ROAD_W } from './config.js';
import { distance, isOnRoad, isSand, isWater, nearestRoadPoint, resolveCircleVsBuildings } from './world.js';

let nextCarId = 1;

export function makeCar(kind, x, y, angle, color) {
  const cls = CAR_CLASSES[kind];
  return {
    id: nextCarId++,
    kind, x, y, angle,
    speed: 0,
    color: color ?? cls.colors[0],
    topSpeed: cls.topSpeed,
    accel: cls.accel,
    grip: cls.grip,
    hp: cls.hp,
    maxHp: cls.hp,
    w: cls.w, h: cls.h,
    traffic: false,
    driver: null,
    smoke: 0,
  };
}

export function spawnTrafficCar(rng, world, player) {
  const vertical = rng() < 0.5;
  const kinds = ['sedan', 'sedan', 'coupe', 'suv', 'truck', 'sports'];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  let x; let y; let angle;
  if (vertical) {
    x = ROADS_X[Math.floor(rng() * ROADS_X.length)] + (rng() < 0.5 ? -14 : 14);
    y = 100 + rng() * 2100;
    angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = 100 + rng() * 3300;
    y = ROADS_Y[Math.floor(rng() * ROADS_Y.length)] + (rng() < 0.5 ? -14 : 14);
    angle = rng() < 0.5 ? 0 : Math.PI;
  }
  // Never spawn on top of the player.
  if (distance(x, y, player.x, player.y) < 500) return null;
  const car = makeCar(kind, x, y, angle);
  car.traffic = true;
  car.speed = car.topSpeed * (0.45 + rng() * 0.2);
  return car;
}

// Arcade driving: throttle accelerates toward the class top speed, steering
// turns harder the faster the car goes, and the car slides a little.
export function updateDrivenCar(car, input, world, dt) {
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  if (input.up) car.speed += car.accel * dt;
  else if (input.down) car.speed -= car.accel * 0.7 * dt;
  else car.speed -= Math.sign(car.speed) * 60 * dt;
  if (Math.abs(car.speed) < 4 && !input.up && !input.down) car.speed = 0;
  const sand = isSand(car.x, car.y);
  const max = car.topSpeed * (sand ? 0.55 : 1);
  car.speed = Math.max(-max * 0.4, Math.min(max, car.speed));
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const turnRate = 2.6 * car.grip * Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * turnRate * Math.sign(car.speed) * dt;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!isWater(nx, ny)) {
    car.x = nx;
    car.y = ny;
  } else {
    car.speed *= 0.4;
  }
  const body = { x: car.x, y: car.y };
  if (resolveCircleVsBuildings(world, body, car.w / 2)) {
    car.x = body.x;
    car.y = body.y;
    car.speed *= 0.55;
    car.hp -= 2;
  }
  car.x = Math.max(30, Math.min(3570, car.x));
  car.y = Math.max(30, Math.min(2570, car.y));
  if (car.hp < car.maxHp * 0.35) car.smoke = 1;
  else if (car.hp <= 0) car.smoke = 2;
  return forward;
}

// Traffic follows the grid: pick the road it is on, drive along it, slow
// for cars ahead, and turn at intersections now and then.
export function updateTrafficCar(car, world, cars, rng, dt) {
  const road = nearestRoadPoint(car.x, car.y);
  const aheadX = car.x + Math.cos(car.angle) * 60;
  const aheadY = car.y + Math.sin(car.angle) * 60;
  let blocked = false;
  for (const other of cars) {
    if (other === car) continue;
    if (distance(aheadX, aheadY, other.x, other.y) < 46) { blocked = true; break; }
  }
  const targetSpeed = blocked ? 0 : car.topSpeed * 0.55;
  car.speed += Math.sign(targetSpeed - car.speed) * 140 * dt;
  if (Math.abs(car.speed) < 2) car.speed = 0;
  // Steer back along the road it is on.
  const desired = road.vertical
    ? (Math.sin(car.angle) >= 0 ? Math.PI / 2 : -Math.PI / 2)
    : (Math.cos(car.angle) >= 0 ? 0 : Math.PI);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // At an intersection, sometimes turn onto the crossing road.
  const nearIntersection = isOnRoad(car.x, car.y) && ROADS_X.some((rx) => Math.abs(car.x - rx) < 40) && ROADS_Y.some((ry) => Math.abs(car.y - ry) < 40);
  if (nearIntersection && rng() < 0.002) {
    car.angle += (rng() < 0.5 ? 1 : -1) * Math.PI / 2;
  } else {
    car.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff * 2 * dt));
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const body = { x: car.x, y: car.y };
  if (resolveCircleVsBuildings(world, body, car.w / 2)) {
    car.x = body.x;
    car.y = body.y;
    car.angle += Math.PI / 2;
  }
  car.x = Math.max(30, Math.min(3570, car.x));
  car.y = Math.max(30, Math.min(2570, car.y));
}

// The nearest stealable car to a point, within reach.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (car.traffic && car.driver) continue;
    const d = distance(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function carOverlaps(car, x, y, r) {
  const dx = Math.abs(x - car.x);
  const dy = Math.abs(y - car.y);
  return dx < car.w / 2 + r && dy < car.h / 2 + r;
}

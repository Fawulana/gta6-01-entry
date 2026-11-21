// Traffic and pedestrians for Solmar Bay. Traffic cars follow the road
// grid in lanes, turn at intersections, and slow for the car ahead.
// Pedestrians stroll the sidewalks and run from gunfire.
import { WORLD, ROAD_LINES, ROAD_W, LANE, BEACH } from './config.js';
import { makeRng, range, pick, chance } from './random.js';
import { spawnTrafficCar, carsOverlap } from './vehicles.js';

export function makePed(rng, x, y) {
  const shirts = ['#c25a3a', '#4a7fb5', '#3f8a5f', '#e8b73a', '#8a4a7a', '#e8e8e8', '#2e6fd2'];
  return {
    x, y,
    angle: rng() * Math.PI * 2,
    speed: range(rng, 42, 72),
    walkPhase: rng() * Math.PI * 2,
    shirt: pick(rng, shirts),
    skin: pick(rng, ['#e8b89a', '#c98d64', '#8a5c3a', '#f0c8a0']),
    fleeing: 0, // seconds left of fleeing
    fleeX: 0,
    fleeY: 0,
    roadAxis: rng() < 0.5 ? 'h' : 'v',
    roadLine: pick(rng, ROAD_LINES),
    dir: rng() < 0.5 ? 1 : -1,
    pause: 0,
  };
}

// Spawn a pedestrian on a sidewalk beside a road.
export function spawnPed(rng) {
  const axis = rng() < 0.5 ? 'h' : 'v';
  const line = pick(rng, ROAD_LINES);
  const side = rng() < 0.5 ? 1 : -1;
  const off = ROAD_W / 2 + 10 + rng() * 8;
  let x;
  let y;
  if (axis === 'h') {
    x = range(rng, 120, WORLD - 120);
    y = line + off * side;
  } else {
    x = line + off * side;
    y = range(rng, 120, WORLD - 120);
  }
  // Keep peds off the beach water and the marina.
  if (y > BEACH.y0) y = BEACH.y0 - 30;
  if (x > 3040) x = 3000;
  return makePed(rng, x, y);
}

export function spawnPeds(rng, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) peds.push(spawnPed(rng));
  return peds;
}

// A gunshot at (x, y) makes nearby peds flee from it.
export function scarePeds(peds, x, y, radius = 320) {
  for (const p of peds) {
    const dx = p.x - x;
    const dy = p.y - y;
    const d = Math.hypot(dx, dy);
    if (d < radius) {
      p.fleeing = 3 + Math.random() * 2;
      p.fleeX = dx / (d || 1);
      p.fleeY = dy / (d || 1);
    }
  }
}

export function updatePeds(peds, dt, rng) {
  for (const p of peds) {
    p.walkPhase += dt * p.speed * 0.12;
    if (p.fleeing > 0) {
      p.fleeing -= dt;
      const sp = 240;
      p.x += p.fleeX * sp * dt;
      p.y += p.fleeY * sp * dt;
      p.angle = Math.atan2(p.fleeY, p.fleeX);
    } else {
      if (p.pause > 0) {
        p.pause -= dt;
        continue;
      }
      if (chance(rng, dt * 0.02)) p.pause = range(rng, 0.5, 2.5); // window-shop
      const sp = p.speed;
      if (p.roadAxis === 'h') {
        p.x += p.dir * sp * dt;
        p.angle = p.dir > 0 ? 0 : Math.PI;
        if (p.x < 120 || p.x > WORLD - 120) p.dir *= -1;
      } else {
        p.y += p.dir * sp * dt;
        p.angle = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (p.y < 120 || p.y > WORLD - 120) p.dir *= -1;
      }
      // At an intersection, sometimes turn onto the crossing road.
      const line = nearestLine(p.roadAxis === 'h' ? p.x : p.y);
      if (line !== null && chance(rng, dt * 0.06)) {
        const other = p.roadAxis === 'h' ? 'v' : 'h';
        p.roadAxis = other;
        p.roadLine = line;
        p.dir = rng() < 0.5 ? 1 : -1;
      }
    }
    p.x = Math.max(60, Math.min(WORLD - 60, p.x));
    p.y = Math.max(60, Math.min(WORLD - 60, p.y));
  }
}

function nearestLine(v) {
  for (const line of ROAD_LINES) {
    if (Math.abs(v - line) < 26) return line;
  }
  return null;
}

// --- Traffic ---------------------------------------------------------------
export function updateTraffic(cars, dt, rng, playerCar) {
  for (const car of cars) {
    if (!car.traffic || car.dead) continue;
    car.turnCooldown -= dt;
    const cruise = car.cruise;
    // Slow down for the car ahead on the same road.
    let target = cruise;
    for (const other of cars) {
      if (other === car || other.dead) continue;
      if (other.roadAxis !== car.roadAxis || other.roadLine !== car.roadLine) continue;
      if (other.dir !== car.dir) continue;
      const along = car.roadAxis === 'h' ? (other.x - car.x) * car.dir : (other.y - car.y) * car.dir;
      const across = car.roadAxis === 'h' ? Math.abs(other.y - car.y) : Math.abs(other.x - car.x);
      if (along > 0 && along < 90 && across < 40) {
        target = Math.min(target, Math.max(0, other.speed - 20));
      }
    }
    // The player's car counts as traffic ahead too.
    if (playerCar && playerCar !== car) {
      const along = car.roadAxis === 'h' ? (playerCar.x - car.x) * car.dir : (playerCar.y - car.y) * car.dir;
      const across = car.roadAxis === 'h' ? Math.abs(playerCar.y - car.y) : Math.abs(playerCar.x - car.x);
      if (along > 0 && along < 110 && across < 42) target = 0;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 1.4);
    const step = car.speed * dt;
    if (car.roadAxis === 'h') car.x += car.dir * step;
    else car.y += car.dir * step;
    // Turn at an intersection, or wrap around the far edge.
    const pos = car.roadAxis === 'h' ? car.x : car.y;
    const cross = nearestLine(pos);
    if (cross !== null && car.turnCooldown <= 0 && chance(rng, dt * 0.5)) {
      const otherLine = cross;
      const newDir = rng() < 0.5 ? 1 : -1;
      if (car.roadAxis === 'h') {
        car.roadAxis = 'v';
        car.roadLine = otherLine;
        car.y = otherLine + (newDir > 0 ? -LANE : LANE);
        car.angle = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        car.roadAxis = 'h';
        car.roadLine = otherLine;
        car.x = otherLine + (newDir > 0 ? LANE : -LANE);
        car.angle = newDir > 0 ? 0 : Math.PI;
      }
      car.dir = newDir;
      car.turnCooldown = 4;
    }
    if (pos < 80 || pos > WORLD - 80) {
      // Wrap to the opposite edge of the same road.
      if (car.roadAxis === 'h') car.x = pos < 80 ? WORLD - 90 : 90;
      else car.y = pos < 80 ? WORLD - 90 : 90;
    }
  }
  // Soft separation so traffic does not stack inside itself.
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      if (carsOverlap(a, b)) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const push = 4;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
}

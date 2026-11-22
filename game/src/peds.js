// Palmetto Bay — pedestrians.
//
// They stroll the sidewalks, cross at intersections, and run when shots
// ring out or a car bears down on them. A pedestrian hit by a car at speed
// is a crime the wanted system notices.

import { WORLD_H, WORLD_W } from './config.js';
import { distance, isWater, nearestRoadPoint, resolveCircleVsBuildings } from './world.js';

const PED_COLORS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#2ecc71'];
const PED_NAMES = ['Maya', 'Luis', 'Tasha', 'Omar', 'Priya', 'Diego', 'Sofia', 'Marcus', 'Elena', 'Jay'];

let nextPedId = 1;

export function spawnPed(rng, world, player) {
  const road = nearestRoadPoint(100 + rng() * 3400, 100 + rng() * 2100);
  const x = road.x + (rng() - 0.5) * 80;
  const y = road.y + (rng() - 0.5) * 80;
  if (distance(x, y, player.x, player.y) < 420) return null;
  if (isWater(x, y)) return null;
  return {
    id: nextPedId++,
    name: PED_NAMES[Math.floor(rng() * PED_NAMES.length)],
    x, y,
    angle: rng() * Math.PI * 2,
    speed: 28 + rng() * 30,
    color: PED_COLORS[Math.floor(rng() * PED_COLORS.length)],
    state: 'walk',
    panic: 0,
    targetAngle: rng() * Math.PI * 2,
    retarget: 2 + rng() * 4,
  };
}

export function updatePeds(peds, world, danger, dt) {
  for (const ped of peds) {
    // A gunshot or a speeding car nearby sends pedestrians running.
    if (danger) {
      const d = distance(ped.x, ped.y, danger.x, danger.y);
      if (d < 320) {
        ped.state = 'flee';
        ped.panic = 2.5;
        ped.targetAngle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
      }
    }
    if (ped.panic > 0) {
      ped.panic -= dt;
      if (ped.panic <= 0) ped.state = 'walk';
    }
    if (ped.state === 'walk') {
      ped.retarget -= dt;
      if (ped.retarget <= 0) {
        ped.targetAngle = Math.random() * Math.PI * 2;
        ped.retarget = 2 + Math.random() * 4;
      }
    }
    let turn = ped.targetAngle - ped.angle;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    ped.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn));
    const speed = ped.state === 'flee' ? 150 : ped.speed;
    const nx = ped.x + Math.cos(ped.angle) * speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * speed * dt;
    if (!isWater(nx, ny)) {
      ped.x = nx;
      ped.y = ny;
    } else {
      ped.targetAngle += Math.PI;
    }
    resolveCircleVsBuildings(world, ped, 10);
    ped.x = Math.max(16, Math.min(WORLD_W - 16, ped.x));
    ped.y = Math.max(16, Math.min(WORLD_H - 16, ped.y));
  }
}

// A pedestrian a car just ran over: returns the ped, or null.
export function pedHitByCar(peds, car) {
  for (const ped of peds) {
    if (Math.abs(car.speed) < 60) continue;
    if (distance(ped.x, ped.y, car.x, car.y) < 30) return ped;
  }
  return null;
}

export function removePed(peds, ped) {
  const i = peds.indexOf(ped);
  if (i >= 0) peds.splice(i, 1);
}

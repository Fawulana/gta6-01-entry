// Palmetto Bay — the wanted system and the police.
//
// Stars rise on crime and fall when Rico lays low; each star fields more
// police, who chase in cars, ram, and bust Rico when they catch him slow
// or on foot. Pay 'n Spray wipes the slate for cash.

import { WANTED } from './config.js';
import { angleTo, distance, roadSpawnNear } from './world.js';

let nextCopId = 1;

export function createWanted() {
  return { stars: 0, heat: 0, bustTimer: 0 };
}

export function addHeat(wanted, amount) {
  wanted.heat = Math.min(5, wanted.heat + amount);
  wanted.stars = Math.ceil(wanted.heat);
}

export function clearWanted(wanted) {
  wanted.heat = 0;
  wanted.stars = 0;
  wanted.bustTimer = 0;
}

export function updateWanted(wanted, dt) {
  if (wanted.heat > 0) {
    wanted.heat = Math.max(0, wanted.heat - WANTED.decayPerSec * dt);
    wanted.stars = Math.ceil(wanted.heat);
  }
}

// How many cop cars the current heat fields.
export function wantedCopCount(wanted) {
  return WANTED.starsForCops[Math.min(5, wanted.stars)] ?? 0;
}

export function spawnCopCar(wanted, player, rng) {
  const spot = roadSpawnNear(player.x + (rng() < 0.5 ? -700 : 700), player.y + (rng() < 0.5 ? -500 : 500), rng() < 0.5 ? -1 : 1);
  return {
    id: nextCopId++,
    kind: 'cop',
    x: spot.x, y: spot.y,
    angle: angleTo(spot.x, spot.y, player.x, player.y),
    speed: 0,
    topSpeed: WANTED.copCarSpeed,
    accel: 320,
    grip: 0.72,
    hp: 160, maxHp: 160,
    w: 46, h: 22,
    color: '#2f6fd0',
    traffic: false,
    smoke: 0,
    siren: rng() * 2,
  };
}

export function spawnFootCop(wanted, player, rng) {
  const a = rng() * Math.PI * 2;
  return {
    id: nextCopId++,
    kind: 'footcop',
    x: player.x + Math.cos(a) * 320,
    y: player.y + Math.sin(a) * 320,
    angle: angleTo(player.x + Math.cos(a) * 320, player.y + Math.sin(a) * 320, player.x, player.y),
    speed: 0,
    hp: 50,
    color: '#1d4ed8',
    state: 'chase',
  };
}

// A cop car steers at the player and rams; returns true when it touches.
export function updateCopCar(cop, player, playerCar, world, dt) {
  const tx = playerCar ? playerCar.x : player.x;
  const ty = playerCar ? playerCar.y : player.y;
  const want = angleTo(cop.x, cop.y, tx, ty);
  let diff = want - cop.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cop.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff * 3 * dt));
  cop.speed += cop.accel * dt;
  if (cop.speed > cop.topSpeed) cop.speed = cop.topSpeed;
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;
  cop.siren += dt;
  const d = distance(cop.x, cop.y, tx, ty);
  return d < 40;
}

export function updateFootCop(cop, player, dt) {
  const want = angleTo(cop.x, cop.y, player.x, player.y);
  cop.angle = want;
  const speed = 150;
  cop.x += Math.cos(want) * speed * dt;
  cop.y += Math.sin(want) * speed * dt;
  return distance(cop.x, cop.y, player.x, player.y) < WANTED.bustRadius;
}

// The bust rule: a cop touching Rico while he is slow or on foot starts
// the bust timer; three seconds of contact and he is busted.
export function updateBust(wanted, touching, dt) {
  if (!touching) {
    wanted.bustTimer = 0;
    return false;
  }
  wanted.bustTimer += dt;
  return wanted.bustTimer >= 3;
}

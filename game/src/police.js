// The law: a wanted level from 0 to 5 stars, police Interceptors that hunt the
// player by road and by ramming, foot cops who chase and shoot, roadblocks at
// three stars and up, and the two ways out — break line of sight until the heat
// cools, or pay for a new paint job.

import { WANTED } from './config.js';
import { makeCar, stepCar } from './vehicles.js';
import { pick, rangeInt } from './random.js';

const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function createPolice(random) {
  return {
    stars: 0,
    heat: 0,
    seenTimer: 0,
    bustTimer: 0,
    copCars: [],
    footCops: [],
    roadblocks: [],
    spawnTimer: 0,
    roadblockTimer: 0,
    random,
  };
}

export function addHeat(police, stars) {
  police.stars = Math.min(WANTED.maxStars, police.stars + stars);
  police.heat = 1;
  police.seenTimer = 0;
}

export function clearWanted(police) {
  police.stars = 0;
  police.heat = 0;
  police.bustTimer = 0;
  for (const car of police.copCars) car.dead = true;
  for (const cop of police.footCops) cop.dead = true;
  police.copCars = [];
  police.footCops = [];
  police.roadblocks = [];
}

function spawnCopCar(police, city, nearX, nearY) {
  const road = city.nearestRoad(nearX + (police.random() - 0.5) * 1600, nearY + (police.random() - 0.5) * 1200);
  const car = makeCar('cop', road.x, road.y, road.angle, '#14181f');
  car.isCop = true;
  car.isTraffic = false;
  car.siren = true;
  police.copCars.push(car);
  return car;
}

function spawnFootCop(police, x, y) {
  police.footCops.push({
    x, y, angle: 0, health: 40, speed: 0,
    shootCooldown: rangeInt(police.random, 1, 2), dead: false, punchCooldown: 0,
  });
}

/**
 * One police step. Returns events: { busted } when the player is caught.
 * `player` is the player object, `playerCar` the car they drive (or null).
 */
export function stepPolice(police, dt, city, player, playerCar, cars) {
  const events = { busted: false };
  const px = playerCar ? playerCar.x : player.x;
  const py = playerCar ? playerCar.y : player.y;
  const playerSpeed = playerCar ? Math.abs(playerCar.speed) : player.moving ? (player.sprinting ? 300 : 175) : 0;

  // Heat cools only while no cop can see the player.
  const anyNear = police.copCars.some((c) => !c.dead && Math.hypot(c.x - px, c.y - py) < 900)
    || police.footCops.some((c) => !c.dead && Math.hypot(c.x - px, c.y - py) < 500);
  if (police.stars > 0) {
    if (anyNear) {
      police.seenTimer = 0;
      police.heat = Math.min(1, police.heat + dt * 0.2);
    } else {
      police.seenTimer += dt;
      if (police.seenTimer > WANTED.decaySeconds) {
        police.stars -= 1;
        police.seenTimer = 0;
        if (police.stars === 0) clearWanted(police);
      }
    }
  }

  // Spawn up to the cap for the current stars.
  police.spawnTimer -= dt;
  const carCap = WANTED.copCarCap[police.stars] || 0;
  const footCap = WANTED.footCopCap[police.stars] || 0;
  const liveCars = police.copCars.filter((c) => !c.dead).length;
  const liveFoot = police.footCops.filter((c) => !c.dead).length;
  if (police.stars > 0 && police.spawnTimer <= 0) {
    police.spawnTimer = 1.4;
    if (liveCars < carCap) spawnCopCar(police, city, px, py);
    else if (liveFoot < footCap) spawnFootCop(police, px + (police.random() - 0.5) * 500, py + (police.random() - 0.5) * 500);
  }
  police.copCars = police.copCars.filter((c) => !c.dead || Math.hypot(c.x - px, c.y - py) < 3000);
  police.footCops = police.footCops.filter((c) => !c.dead);

  // Cop cars hunt: steer at the player, ram the player's car, nudge it.
  for (const cop of police.copCars) {
    if (cop.dead) continue;
    const dx = px - cop.x;
    const dy = py - cop.y;
    const dist = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    const diff = angleDiff(want, cop.angle);
    const blocked = Math.abs(cop.speed) < 40 && Math.abs(diff) > 0.9;
    stepCar(cop, {
      up: dist > 70 && !blocked,
      down: blocked,
      left: diff < -0.08,
      right: diff > 0.08,
      handbrake: false,
    }, dt, city);
    if (playerCar && dist < 70) {
      playerCar.speed *= 0.985;
      if (Math.abs(playerCar.speed) > 200) playerCar.health -= dt * 6;
    }
    if (dist > 3200) {
      const road = city.nearestRoad(px + (police.random() - 0.5) * 1200, py + (police.random() - 0.5) * 900);
      cop.x = road.x;
      cop.y = road.y;
      cop.speed = 0;
    }
  }

  // Foot cops chase on foot, shoot at range, punch up close.
  for (const cop of police.footCops) {
    if (cop.dead) continue;
    const dx = player.x - cop.x;
    const dy = player.y - cop.y;
    const dist = Math.hypot(dx, dy);
    cop.angle = Math.atan2(dy, dx);
    if (player.inCar) {
      // Cops give up on a speeding car and head for the nearest road.
      const road = city.nearestRoad(cop.x, cop.y);
      const rx = road.x - cop.x;
      const ry = road.y - cop.y;
      const rl = Math.hypot(rx, ry) || 1;
      cop.x += (rx / rl) * 200 * dt;
      cop.y += (ry / rl) * 200 * dt;
      continue;
    }
    if (dist > 34) {
      const speed = dist < 500 ? 265 : 200;
      const nx = cop.x + Math.cos(cop.angle) * speed * dt;
      const ny = cop.y + Math.sin(cop.angle) * speed * dt;
      if (!city.hitBuilding(nx, cop.y, 13)) cop.x = nx;
      if (!city.hitBuilding(cop.x, ny, 13)) cop.y = ny;
    }
    cop.shootCooldown -= dt;
    cop.punchCooldown -= dt;
  }

  // Roadblocks at three stars and up: two parked Interceptors across the road
  // ahead of the player, refreshed as the player moves on.
  police.roadblockTimer -= dt;
  if (police.stars >= WANTED.roadblockStars && police.roadblockTimer <= 0) {
    police.roadblockTimer = 9;
    police.roadblocks = [];
    const road = city.nearestRoad(px, py);
    const ahead = 620;
    // Place the block on the player's current road, ahead along its direction.
    const dirX = Math.abs(road.angle) < 0.1 ? Math.sign(px - road.x) || 1 : 0;
    const dirY = Math.abs(road.angle - Math.PI / 2) < 0.1 ? Math.sign(py - road.y) || 1 : 0;
    const blockX = road.x + dirX * ahead;
    const blockY = road.y + dirY * ahead;
    const perp = road.angle + Math.PI / 2;
    for (const offset of [-34, 34]) {
      const car = makeCar('cop', blockX + Math.cos(perp) * offset, blockY + Math.sin(perp) * offset, perp, '#14181f');
      car.isCop = true;
      car.parked = true;
      car.roadblock = true;
      police.roadblocks.push(car);
    }
    const footX = blockX + Math.cos(perp) * 0;
    const footY = blockY + Math.sin(perp) * 0;
    spawnFootCop(police, footX + 60, footY);
    spawnFootCop(police, footX - 60, footY);
  }

  // Busted: a foot cop stands on the player, or the car is boxed in and stopped.
  if (police.stars > 0 && !player.inCar && !player.dead) {
    const touching = police.footCops.some((c) => !c.dead && Math.hypot(c.x - player.x, c.y - player.y) < WANTED.bustRadius);
    if (touching) police.bustTimer += dt;
    else police.bustTimer = 0;
    if (police.bustTimer > 1.1) events.busted = true;
  } else if (police.stars > 0 && playerCar && playerSpeed < 40) {
    const near = police.copCars.filter((c) => !c.dead && Math.hypot(c.x - px, c.y - py) < 150).length;
    if (near >= 2) police.bustTimer += dt;
    else police.bustTimer = 0;
    if (police.bustTimer > 2.2) events.busted = true;
  } else {
    police.bustTimer = 0;
  }

  return events;
}

/** Foot-cop shots fired this step (the world resolves the hits). */
export function copShots(police, player) {
  const shots = [];
  for (const cop of police.footCops) {
    if (cop.dead || player.inCar || player.dead) continue;
    const dist = Math.hypot(player.x - cop.x, player.y - cop.y);
    if (dist < 340 && cop.shootCooldown <= 0) {
      cop.shootCooldown = 0.9 + police.random() * 0.7;
      shots.push({ x: cop.x, y: cop.y, angle: cop.angle, damage: 7, range: 340, fromCop: true });
    }
  }
  return shots;
}

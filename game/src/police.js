// The wanted system: stars rise with crime and fall when the player stays
// out of sight; police cars spawn to match the level, chase, ram, and bust
// a player on foot who lets them get close.
import { MAX_WANTED, POLICE_SPEED, WORLD_H, WORLD_W, angleDiff, clamp, dist } from './config.js';
import { makeCar, moveCar } from './vehicles.js';
import { isOnRoad, nearestRoad } from './city.js';

export function addWanted(G, n) {
  G.wanted = clamp(G.wanted + n, 0, MAX_WANTED);
  if (n > 0) G.lastCrimeT = G.time;
}

export function wantedCount(G) {
  return G.cars.filter((c) => c.police && !c.dead).length;
}

/** Two cruisers park sideways across the road ahead of the player and hold
 * the line for a few seconds, then join the chase. */
export function deployRoadblock(G) {
  const p = G.player;
  const ahead = 430;
  const ax = p.x + Math.cos(p.angle) * ahead;
  const ay = p.y + Math.sin(p.angle) * ahead;
  const road = nearestRoad(G.city, ax, ay);
  if (!road) return;
  // Sideways across the road: perpendicular to the road's direction.
  const sideAngle = road.axis === 'x' ? Math.PI / 2 : 0;
  const offs = [-26, 26];
  for (const off of offs) {
    const x = road.axis === 'x' ? ax + off : road.line + off;
    const y = road.axis === 'y' ? ay + off : road.line + off;
    if (!isOnRoad(G.city, x, y)) continue;
    const car = makeCar(x, y, sideAngle, '#1a1a1a', 'police');
    car.police = true;
    car.traffic = false;
    car.cruise = POLICE_SPEED;
    car.blockT = 3; // hold the line before joining the chase
    G.cars.push(car);
  }
  G.toast('Roadblock ahead!');
}

/** Spawn one police car on a road just out of view of the player. */
function spawnPolice(G) {
  const rng = G.rng;
  const p = G.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const ang = rng.range(0, Math.PI * 2);
    const d = rng.range(650, 850);
    const x = clamp(p.x + Math.cos(ang) * d, 80, WORLD_W - 80);
    const y = clamp(p.y + Math.sin(ang) * d, 80, WORLD_H - 80);
    const road = nearestRoad(G.city, x, y);
    const sx = road.axis === 'x' ? x : road.line + 19;
    const sy = road.axis === 'y' ? y : road.line + 19;
    if (!isOnRoad(G.city, sx, sy)) continue;
    const car = makeCar(sx, sy, 0, '#1a1a1a', 'police');
    car.police = true;
    car.traffic = false;
    car.cruise = POLICE_SPEED;
    G.cars.push(car);
    return car;
  }
  return null;
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Wanted decays after 12 s with no crime and no cop in sight.
  if (G.wanted > 0) {
    const copNear = G.cars.some((c) => c.police && !c.dead && dist(c.x, c.y, p.x, p.y) < 520);
    if (!copNear && G.time - G.lastCrimeT > 12 && G.missionHeat !== true) {
      G.wantedT += dt;
      if (G.wantedT > 4) { G.wanted -= 1; G.wantedT = 0; G.lastCrimeT = G.time; }
    } else {
      G.wantedT = 0;
    }
  }
  // Keep the number of pursuit cars matched to the wanted level: up to 7.
  const want = G.wanted === 0 ? 0 : Math.min(G.wanted + 2, 7);
  const have = wantedCount(G);
  if (have < want) spawnPolice(G);
  if (have > want) {
    // Retire the farthest cop when the heat drops.
    let far = null;
    let farD = -1;
    for (const c of G.cars) {
      if (!c.police || c.dead) continue;
      const d = dist(c.x, c.y, p.x, p.y);
      if (d > farD) { farD = d; far = c; }
    }
    if (far) far.dead = true;
  }
  // Roadblocks at 3+ stars, at most one every 25 seconds.
  if (G.wanted >= 3) {
    G.roadblockCd -= dt;
    if (G.roadblockCd <= 0) {
      G.roadblockCd = 25;
      deployRoadblock(G);
    }
  }

  // Chase: steer toward the player, ram on contact. Pursuit speed scales
  // with the wanted level, so five stars is a much faster chase than one.
  for (const cop of G.cars) {
    if (!cop.police || cop.dead) continue;
    // A roadblock car holds its line until its timer runs out.
    if (cop.blockT > 0) {
      cop.blockT -= dt;
      cop.speed = 0;
      continue;
    }
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const d = Math.hypot(dx, dy) || 1;
    const target = Math.atan2(dy, dx);
    cop.angle += clamp(angleDiff(cop.angle, target), -3.2 * dt, 3.2 * dt);
    const chaseSpeed = POLICE_SPEED * (0.88 + 0.09 * G.wanted);
    const speedWant = d > 700 ? chaseSpeed : chaseSpeed * 0.92;
    cop.speed += clamp(speedWant - cop.speed, -420 * dt, 380 * dt);
    moveCar(G, cop, dt);
    if (d < 60) {
      if (p.inCar) {
        // Ram: damage the player's car and shove it (only a fast hit hurts).
        if (cop.speed > 150) p.inCar.health -= 8 * dt;
        p.inCar.speed *= 0.985;
        cop.speed *= 0.9;
        if (p.inCar.health <= 0) {
          G.events.push({ type: 'carWrecked', x: p.inCar.x, y: p.inCar.y });
          p.inCar.dead = true;
          p.inCar = null;
          G.toast('Your car is wrecked!');
        }
      } else {
        // On foot: a cop that stays on you busts you.
        G.bustedT += dt;
        if (G.bustedT > 1.4) G.events.push({ type: 'busted' });
      }
    } else if (p.inCar) {
      G.bustedT = Math.max(0, G.bustedT - dt);
    }
  }
  // Sirens while any cop is actively chasing.
  G.sirenOn = G.wanted > 0 && wantedCount(G) > 0;
}

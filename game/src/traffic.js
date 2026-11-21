// Traffic and pedestrians: cars cruise the road grid in lanes and turn at
// intersections; pedestrians stroll sidewalks, cross at zebras, and run from
// gunfire and speeding cars. Both keep the city feeling alive.
import { ROADS, ROAD_W, WORLD } from './config.js';
import { clamp, dist, angleDiff, wrapAngle } from './random.js';
import { makeCar } from './vehicles.js';
import { collideBuildings } from './city.js';

const PED_COLORS = ['#e8c9a0', '#c98a5a', '#8a5a3a', '#f2d8b0', '#6b4a2a'];
const SHIRTS = ['#c22e2e', '#2e6bc2', '#2ea86a', '#e8b400', '#8a4bc2', '#e86a8a', '#ddd', '#333'];

export function spawnTraffic(G, rng, n) {
  for (let i = 0; i < n; i++) {
    const vertical = rng.chance(0.5);
    const road = rng.pick(ROADS);
    const along = rng.range(300, WORLD - 300);
    const kind = rng.pick(['sedan', 'sedan', 'taxi', 'van', 'truck', 'sports', 'bike', 'bus']);
    const dir = rng.chance(0.5) ? 1 : -1;
    const lane = 24;
    const x = vertical ? road + lane * dir : along;
    const y = vertical ? along : road + lane * dir;
    const car = makeCar(kind, x, y, vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI), { traffic: true, cruise: rng.range(120, 210), lane });
    car.vertical = vertical; car.dir = dir;
    if (kind === 'bus') {
      // City buses run the downtown loop and dwell at each bus stop.
      car.route = G.city.busStops.map((s) => ({ x: s.x, y: s.y }));
      car.stopIdx = rng.int(0, 3);
      car.wait = 0;
      car.cruise = 170;
    }
    G.cars.push(car);
  }
}
export function spawnPeds(G, rng, n) {
  for (let i = 0; i < n; i++) {
    const x = rng.range(260, WORLD - 260), y = rng.range(260, WORLD - 260);
    // Pedestrian types: strollers, joggers (fast), beachgoers near the sand,
    // and the occasional dog-walker with a dog trotting behind.
    const beach = x > 3100;
    const kind = beach ? 'beach' : rng.pick(['walk', 'walk', 'walk', 'jog', 'dog']);
    G.peds.push({
      x, y, angle: rng.range(0, Math.PI * 2),
      speed: kind === 'jog' ? rng.range(80, 110) : kind === 'beach' ? rng.range(18, 30) : rng.range(28, 55),
      skin: rng.pick(PED_COLORS), shirt: beach ? rng.pick(['#ff8c5a', '#4ba3e8', '#f2d24b']) : rng.pick(SHIRTS),
      flee: 0, kind,
      tx: x + rng.range(-200, 200), ty: y + rng.range(-200, 200), pause: rng.range(0, 3),
    });
  }
}
export function updateTraffic(G, dt) {
  const p = G.player;
  for (const c of G.cars) {
    if (!c.traffic || c.dead) continue;
    if (c.kind === 'bus' && c.route) { updateBus(G, c, dt); continue; }
    // Slow down if a car is ahead in the same lane.
    let blocked = false;
    for (const o of G.cars) {
      if (o === c || o.dead) continue;
      const dx = o.x - c.x, dy = o.y - c.y;
      const ahead = dx * Math.cos(c.angle) + dy * Math.sin(c.angle);
      const side = Math.abs(-dx * Math.sin(c.angle) + dy * Math.cos(c.angle));
      if (ahead > 0 && ahead < 110 && side < 40) { blocked = true; break; }
    }
    // Player car ahead blocks traffic too.
    if (p.car) {
      const dx = p.car.x - c.x, dy = p.car.y - c.y;
      const ahead = dx * Math.cos(c.angle) + dy * Math.sin(c.angle);
      const side = Math.abs(-dx * Math.sin(c.angle) + dy * Math.cos(c.angle));
      if (ahead > 0 && ahead < 120 && side < 44) blocked = true;
    }
    const target = blocked ? 0 : c.cruise;
    if (blocked && !c.honked && Math.random() < dt * 0.5) { c.honked = true; G.audio.horn(); setTimeout(() => { c.honked = false; }, 3000); }
    c.speed += clamp(target - c.speed, -300 * dt, 200 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    // At an intersection, sometimes turn onto the cross road.
    const nearCross = ROADS.some((r) => Math.abs((c.vertical ? ny : nx) - r) < 8);
    if (nearCross && Math.random() < dt * 0.25 && !c.justTurned) {
      c.justTurned = true;
      const turn = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      c.angle = wrapAngle(c.angle + turn);
      c.vertical = !c.vertical;
      c.dir = Math.cos(c.angle) > 0.5 ? 1 : Math.sin(c.angle) > 0.5 ? 1 : -1;
      // Snap onto the cross road centre lane.
      const road = ROADS.reduce((a, b) => Math.abs((c.vertical ? c.x : c.y) - b) < Math.abs((c.vertical ? c.x : c.y) - a) ? b : a);
      if (c.vertical) c.x = road + 24 * (Math.sin(c.angle) > 0 ? 1 : -1); else c.y = road + 24 * (Math.cos(c.angle) > 0 ? -1 : 1);
      setTimeout(() => { c.justTurned = false; }, 1500);
    }
    if (!collideBuildings(G.city, nx, ny, 24)) { c.x = nx; c.y = ny; }
    else { c.angle = wrapAngle(c.angle + Math.PI); c.vertical = !c.vertical; }
    // Despawn far traffic, respawn near the player to keep streets busy.
    if (dist(c.x, c.y, p.x, p.y) > 1500) {
      const a = Math.random() * Math.PI * 2;
      const vertical = Math.random() < 0.5;
      const road = ROADS[Math.floor(Math.random() * ROADS.length)];
      const along = clamp((vertical ? p.y : p.x) + (Math.random() - 0.5) * 900, 300, WORLD - 300);
      c.x = vertical ? road + 24 : along;
      c.y = vertical ? along : road + 24;
      c.angle = vertical ? Math.PI / 2 : 0;
    }
  }
}
// City bus: follows the downtown loop, dwells 4 seconds at each stop with
// its doors open (a passenger or two gets on), then rolls to the next stop.
// Steering is simple pursuit with a capped turn rate so it looks like a bus.
function updateBus(G, c, dt) {
  if (c.wait > 0) {
    c.wait -= dt;
    c.speed = Math.max(0, c.speed - 300 * dt);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    return;
  }
  const stop = c.route[c.stopIdx];
  const d = dist(c.x, c.y, stop.x, stop.y);
  if (d < 46) {
    c.wait = 4;
    c.stopIdx = (c.stopIdx + 1) % c.route.length;
    G.feed.push('Azura City Bus stopped at ' + G.city.busStops[(c.stopIdx + 3) % 4].name);
    return;
  }
  const want = Math.atan2(stop.y - c.y, stop.x - c.x);
  c.angle += clamp(angleDiff(c.angle, want), -1.1 * dt, 1.1 * dt);
  c.speed += clamp(c.cruise - c.speed, -260 * dt, 170 * dt);
  const nx = c.x + Math.cos(c.angle) * c.speed * dt;
  const ny = c.y + Math.sin(c.angle) * c.speed * dt;
  if (!collideBuildings(G.city, nx, ny, 26)) { c.x = nx; c.y = ny; }
  else { c.angle += Math.PI / 2; }
}
export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    // Flee gunfire, speeding cars and the player on foot with a weapon out.
    const danger = G.gunfireTimer > 0 || (p.car && Math.abs(p.car.speed) > 260);
    const dPlayer = dist(ped.x, ped.y, p.x, p.y);
    if (danger && dPlayer < 420) ped.flee = 2.5;
    if (ped.flee > 0) {
      ped.flee -= dt;
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.x += Math.cos(a) * 150 * dt; ped.y += Math.sin(a) * 150 * dt; ped.angle = a;
      continue;
    }
    if (ped.pause > 0) { ped.pause -= dt; continue; }
    const d = dist(ped.x, ped.y, ped.tx, ped.ty);
    if (d < 12) {
      ped.tx = clamp(ped.x + (Math.random() - 0.5) * 500, 240, WORLD - 240);
      ped.ty = clamp(ped.y + (Math.random() - 0.5) * 500, 240, WORLD - 240);
      ped.pause = Math.random() * 4;
      continue;
    }
    ped.angle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    if (!collideBuildings(G.city, nx, ny, 10)) { ped.x = nx; ped.y = ny; }
    else { ped.tx = ped.x; ped.ty = ped.y; }
  }
}

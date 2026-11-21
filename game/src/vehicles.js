// Vehicles: spawning, driving physics, entering/exiting, damage, skid marks
// and smoke. Eight kinds with distinct top speed, acceleration and grip —
// the Wasp bike is fastest and loosest, the Bison truck slowest and toughest.
import { VEHICLES, WORLD } from './config.js';
import { clamp, dist, wrapAngle, angleDiff } from './random.js';
import { collideBuildings, onRoad } from './city.js';

let nextId = 1;
export function makeCar(kind, x, y, angle, opts = {}) {
  const spec = VEHICLES[kind];
  return {
    id: nextId++, kind, x, y, angle: angle ?? 0, speed: 0,
    color: opts.color || spec.color, hp: spec.hp, maxHp: spec.hp,
    traffic: !!opts.traffic, parked: !!opts.parked, police: kind === 'police',
    driver: opts.driver || null, brakeLight: false, dead: false,
    turnTarget: null, lane: opts.lane || 0, cruise: opts.cruise || 0,
  };
}
export function spawnParkedCars(G, rng) {
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const p = { x: 0, y: 0 };
    const vertical = rng.chance(0.5);
    const road = rng.pick([280, 640, 1000, 1360, 1720, 2080, 2440, 2800]);
    const along = rng.range(300, 3200);
    if (vertical) { p.x = road + (rng.chance(0.5) ? 62 : -62); p.y = along; }
    else { p.y = road + (rng.chance(0.5) ? 62 : -62); p.x = along; }
    if (dist(p.x, p.y, G.player.x, G.player.y) < 500) continue;
    const kind = rng.pick(['sedan', 'sedan', 'sports', 'truck', 'van', 'taxi', 'bike']);
    G.cars.push(makeCar(kind, p.x, p.y, vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI), { parked: true }));
    spots.push(p);
  }
  return spots;
}
export function nearestCar(G, x, y, maxD) {
  let best = null, bd = maxD;
  for (const c of G.cars) {
    if (c.dead || c.traffic) continue;
    const d = dist(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
export function enterCar(G, car) {
  const p = G.player;
  p.car = car; p.onFoot = false; car.parked = false; car.driver = 'player';
  G.audio.unlock(); G.audio.radio();
  G.feed.push('Stole the ' + VEHICLES[car.kind].name);
  if (car.kind !== 'police' && G.wanted < 1 && Math.random() < 0.55) addWanted(G, 1, 'car theft');
}
export function exitCar(G) {
  const p = G.player, car = p.car;
  if (!car) return;
  const nx = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
  const ny = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
  p.x = nx; p.y = ny; p.angle = car.angle; p.onFoot = true; p.car = null;
  car.driver = null; car.speed *= 0.3;
}
export function addWanted(G, stars, why) {
  if (G.mission.index === 3 && G.mission.stage === 'escape') return; // getaway mission sets its own heat
  G.wanted = clamp(G.wanted + stars, 0, 5);
  G.heatTimer = 0;
  if (stars > 0 && why) G.feed.push('WANTED: ' + why + '  +' + stars + ' star' + (stars > 1 ? 's' : ''));
}
export function driveCar(G, car, input, dt) {
  const spec = VEHICLES[car.kind];
  const ax = input.axis();
  const wet = G.weather.rain > 0.4 ? 0.82 : 1;
  const grip = spec.grip * wet;
  if (ax.y < 0) car.speed += spec.accel * dt; // W = forward (axis y is -1 up)
  else if (ax.y > 0) car.speed -= spec.accel * 1.4 * dt;
  else car.speed -= Math.sign(car.speed) * 90 * dt;
  if (input.down('Space')) { car.speed -= Math.sign(car.speed) * 420 * dt; car.handbrake = true; } else car.handbrake = false;
  car.speed = clamp(car.speed, -spec.top * 0.45, spec.top);
  if (Math.abs(car.speed) < 4 && ax.y === 0) car.speed = 0;
  const steer = ax.x * (car.speed >= 0 ? 1 : -1);
  const turnRate = grip * (car.handbrake ? 1.7 : 1) * clamp(Math.abs(car.speed) / 120, 0.25, 1);
  car.angle += steer * turnRate * dt * (car.handbrake ? 1.15 : 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = collideBuildings(G.city, nx, ny, 26);
  if (hit) {
    if (Math.abs(car.speed) > 180) { damageCar(G, car, 12); G.audio.crash(); spawnCrash(G, car.x, car.y); }
    car.speed *= -0.25; car.x += Math.cos(car.angle) * -8; car.y += Math.sin(car.angle) * -8;
  } else {
    car.x = clamp(nx, 40, WORLD - 40); car.y = clamp(ny, 40, WORLD - 40);
  }
  // Skid marks on hard turns / handbrake.
  if ((car.handbrake && Math.abs(car.speed) > 120) || (Math.abs(steer) > 0 && Math.abs(car.speed) > 300)) {
    G.skids.push({ x: car.x - Math.cos(car.angle) * 20, y: car.y - Math.sin(car.angle) * 20, a: car.angle, life: 6 });
    if (G.skids.length > 400) G.skids.shift();
  }
  // Damage smoke.
  if (car.hp < car.maxHp * 0.5 && Math.random() < dt * 12) {
    G.particles.push({ x: car.x, y: car.y - 10, vx: (Math.random() - 0.5) * 20, vy: -30, life: 0.9, max: 0.9, size: 9, color: '#888', kind: 'smoke' });
  }
  car.brakeLight = ax.y > 0 || input.down('Space');
}
export function damageCar(G, car, dmg) {
  car.hp -= dmg;
  if (car.hp <= 0 && !car.dead) {
    car.dead = true; car.speed = 0;
    spawnCrash(G, car.x, car.y);
    G.audio.crash();
    if (car.driver === 'player') { G.feed.push('Your car is wrecked!'); }
  }
}
export function spawnCrash(G, x, y) {
  for (let i = 0; i < 14; i++) {
    G.particles.push({ x, y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.7, max: 0.7, size: 4 + Math.random() * 5, color: ['#ffcf4d', '#ff7a2e', '#666'][i % 3], kind: 'spark' });
  }
}
export function updateSkids(G, dt) {
  for (const s of G.skids) s.life -= dt;
  G.skids = G.skids.filter((s) => s.life > 0);
}

// Wanted system and the Azura PD: cruisers spawn, chase and ram, roadblocks
// of two cruisers sit across the road at 3+ stars, spike strips slow you at
// 4+, and a police helicopter with a searchlight circles at 4+ stars. Heat
// cools one star at a time when you break line of sight; get cornered on
// foot and you are Busted.
import { WANTED, WORLD } from './config.js';
import { clamp, dist, angleDiff, wrapAngle } from './random.js';
import { makeCar, damageCar } from './vehicles.js';
import { onRoad } from './city.js';

export function updateWanted(G, dt) {
  const p = G.player;
  // Decay: hide from every cop for a while and a star drops off.
  const anyNear = G.cops.some((c) => dist(c.x, c.y, p.x, p.y) < 420);
  const heliNear = G.heli && dist(G.heli.x, G.heli.y, p.x, p.y) < 520;
  if (G.wanted > 0 && !anyNear && !heliNear) {
    G.heatTimer += dt;
    if (G.heatTimer > WANTED.decayStep) { G.wanted--; G.heatTimer = 0; G.feed.push('Heat cooling… ' + G.wanted + ' star' + (G.wanted === 1 ? '' : 's') + ' left'); }
  } else G.heatTimer = Math.max(0, G.heatTimer - dt * 0.5);
  // Spawn cops up to the wanted cap.
  const want = WANTED.maxCops[G.wanted];
  while (G.cops.length < want) spawnCop(G);
  while (G.cops.length > want) { const c = G.cops.pop(); if (c) { c.dead = true; } }
  // Helicopter at 4+ stars.
  if (G.wanted >= WANTED.heliAt && !G.heli) {
    G.heli = { x: p.x - 300, y: p.y - 300, angle: 0, t: 0 };
    G.feed.push('APD helicopter overhead!');
  }
  if (G.wanted < WANTED.heliAt) G.heli = null;
  if (G.heli) {
    G.heli.t += dt;
    const a = Math.atan2(p.y - G.heli.y, p.x - G.heli.x);
    G.heli.x += Math.cos(a) * 200 * dt; G.heli.y += Math.sin(a) * 200 * dt;
    G.heli.angle = a;
    if (Math.random() < dt * 0.4) G.audio.siren();
  }
  // Roadblocks at 3+ stars: two cruisers sideways across the road ahead.
  if (G.wanted >= WANTED.roadblockAt && G.roadblocks.length < 2 && Math.random() < dt * 0.08) {
    const a = p.car ? p.car.angle : p.angle;
    const bx = p.x + Math.cos(a) * 620, by = p.y + Math.sin(a) * 620;
    if (onRoad(bx, by)) {
      const c1 = makeCar('police', bx, by, a + Math.PI / 2, { parked: true });
      const c2 = makeCar('police', bx + Math.cos(a + Math.PI / 2) * 90, by + Math.sin(a + Math.PI / 2) * 90, a + Math.PI / 2, { parked: true });
      G.cars.push(c1, c2);
      G.roadblocks.push({ x: bx, y: by, cars: [c1, c2], life: 40 });
      G.feed.push('Roadblock ahead!');
    }
  }
  for (const rb of G.roadblocks) rb.life -= dt;
  G.roadblocks = G.roadblocks.filter((rb) => rb.life > 0);
  // Spike strips at 4+ stars.
  if (G.wanted >= WANTED.spikesAt && G.spikes.length < 1 && Math.random() < dt * 0.05) {
    const a = p.car ? p.car.angle : p.angle;
    G.spikes.push({ x: p.x + Math.cos(a) * 480, y: p.y + Math.sin(a) * 480, a: a + Math.PI / 2, life: 25 });
  }
  for (const s of G.spikes) s.life -= dt;
  G.spikes = G.spikes.filter((s) => s.life > 0);
  if (p.car) {
    for (const s of G.spikes) {
      if (dist(p.car.x, p.car.y, s.x, s.y) < 60 && Math.abs(angleDiff(s.a, p.car.angle)) < 0.6) {
        p.car.speed *= 0.35; G.audio.crash(); G.feed.push('Spike strip! Tires shredded.');
        s.life = 0;
      }
    }
  }
}
function spawnCop(G) {
  const p = G.player;
  const a = Math.random() * Math.PI * 2;
  const x = clamp(p.x + Math.cos(a) * 700, 200, WORLD - 200);
  const y = clamp(p.y + Math.sin(a) * 700, 200, WORLD - 200);
  const car = makeCar('police', x, y, Math.atan2(p.y - y, p.x - x), { driver: 'cop' });
  G.cars.push(car);
  G.cops.push(car);
}
export function updateCops(G, dt) {
  const p = G.player;
  for (const cop of G.cops) {
    if (cop.dead) continue;
    const d = dist(cop.x, cop.y, p.x, p.y);
    const targetAngle = Math.atan2(p.y - cop.y, p.x - cop.x);
    cop.angle += clamp(angleDiff(cop.angle, targetAngle), -2.4 * dt, 2.4 * dt);
    const want = d > 90 ? WANTED.copTop : 0;
    cop.speed += clamp(want - cop.speed, -500 * dt, 320 * dt);
    const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
    const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
    cop.x = clamp(nx, 40, WORLD - 40); cop.y = clamp(ny, 40, WORLD - 40);
    // Ram the player's car.
    if (p.car && d < 70) {
      damageCar(G, p.car, 6 * dt * 10);
      p.car.speed *= 0.94;
      if (Math.random() < dt * 2) G.audio.crash();
    }
    // On foot: a cop that reaches the player busts them.
    if (p.onFoot && d < WANTED.bustRadius && G.wanted > 0) {
      busted(G);
      return;
    }
    if (Math.random() < dt * 0.25) G.audio.siren();
  }
  G.cops = G.cops.filter((c) => !c.dead && dist(c.x, c.y, p.x, p.y) < 1600);
  updateFootCops(G, dt);
}
// Foot cops: at 1–2 stars, officers leave their cruisers and chase the
// player on foot. They are slower than a sprinting player but they corner
// you — and a touch is a bust.
export function updateFootCops(G, dt) {
  const p = G.player;
  if (!G.footCops) G.footCops = [];
  const want = p.onFoot && G.wanted > 0 && G.wanted <= 2 ? 2 : 0;
  while (G.footCops.length < want) {
    const a = Math.random() * Math.PI * 2;
    G.footCops.push({
      x: clamp(p.x + Math.cos(a) * 380, 100, WORLD - 100),
      y: clamp(p.y + Math.sin(a) * 380, 100, WORLD - 100),
      angle: 0, speed: 195, baton: 0,
    });
    G.feed.push('APD officers on foot!');
  }
  while (G.footCops.length > want) G.footCops.pop();
  for (const fc of G.footCops) {
    const d = dist(fc.x, fc.y, p.x, p.y);
    fc.angle = Math.atan2(p.y - fc.y, p.x - fc.x);
    fc.x += Math.cos(fc.angle) * fc.speed * dt;
    fc.y += Math.sin(fc.angle) * fc.speed * dt;
    fc.baton = Math.max(0, fc.baton - dt);
    if (d < 40) { busted(G); return; }
    if (d < 60 && fc.baton <= 0) {
      fc.baton = 1.2;
      hurtPlayerLocal(G, 6);
      G.audio.punch();
    }
  }
}
function hurtPlayerLocal(G, dmg) {
  // Small local copy of the damage path (combat.js owns the full one) so the
  // police module never imports combat and no cycle forms.
  const p = G.player;
  if (G.screen !== 'play') return;
  if (p.armor > 0) { const soak = Math.min(p.armor, dmg); p.armor -= soak; dmg -= soak; }
  p.hp -= dmg;
  p.hurtFlash = 0.25;
  if (p.hp <= 0) {
    p.hp = 0;
    G.screen = 'wasted';
    G.audio.fail();
    p.cash = Math.max(0, p.cash - 250);
    p.hp = 100; p.armor = 0;
    G.wanted = 0; G.cops = []; G.heli = null; G.footCops = [];
    G.feed.push('WASTED — $250 hospital bill');
  }
}
export function busted(G) {
  const p = G.player;
  G.screen = 'busted';
  G.audio.busted();
  p.cash = Math.max(0, p.cash - 250);
  G.wanted = 0; G.cops = []; G.heli = null; G.footCops = [];
  G.feed.push('BUSTED — $250 fine');
}
export function wasted(G) {
  const p = G.player;
  G.screen = 'wasted';
  G.audio.fail();
  p.cash = Math.max(0, p.cash - 250);
  p.hp = 100; p.armor = 0;
  G.wanted = 0; G.cops = []; G.heli = null; G.footCops = [];
  G.feed.push('WASTED — $250 hospital bill');
}
export function respawnAtSafehouse(G) {
  const p = G.player;
  const s = G.city.places.safehouse;
  p.x = s.x; p.y = s.y + 60; p.angle = -Math.PI / 2; p.hp = 100; p.armor = 0;
  p.onFoot = true;
  if (p.car) { p.car.driver = null; p.car = null; }
  G.screen = 'play';
  G.mission.stage = G.mission.index >= 0 ? 'failed' : G.mission.stage;
}

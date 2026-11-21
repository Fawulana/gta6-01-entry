// Combat: fists, pistol and shotgun, bullets with tracers and muzzle flash,
// rival gang members (the Tide Kings) who hold turf and shoot back, health
// and armor pickups, and the player getting shot. Aiming follows the mouse.
import { dist, clamp, angleTo } from './random.js';
import { addWanted } from './vehicles.js';

export function fireWeapon(G) {
  const p = G.player;
  if (p.onFoot === false && p.car) return; // no drive-by in this build; use the car
  if (p.weapon === 'pistol' && p.ammo <= 0) { G.feed.push('Out of ammo — buy more at Ironworks Guns (B)'); return; }
  const now = performance.now();
  if (now - p.lastShot < (p.weapon === 'shotgun' ? 650 : 220)) return;
  p.lastShot = now;
  const aim = Math.atan2(G.input.mouse.wy - p.y, G.input.mouse.wx - p.x);
  const shots = p.weapon === 'shotgun' ? 5 : 1;
  for (let i = 0; i < shots; i++) {
    const spread = (Math.random() - 0.5) * (p.weapon === 'shotgun' ? 0.35 : 0.06);
    G.bullets.push({
      x: p.x + Math.cos(aim) * 26, y: p.y + Math.sin(aim) * 26,
      vx: Math.cos(aim + spread) * 900, vy: Math.sin(aim + spread) * 900,
      life: 0.6, from: 'player', dmg: p.weapon === 'shotgun' ? 2 : 1,
    });
  }
  p.muzzle = 0.07;
  if (p.weapon === 'shotgun') { p.ammo -= 1; G.audio.shotgun(); } else { p.ammo -= 1; G.audio.shot(); }
  G.gunfireTimer = 1.2;
  addWanted(G, 1, 'shots fired');
}
export function punch(G) {
  const p = G.player;
  const now = performance.now();
  if (now - p.lastPunch < 350) return;
  p.lastPunch = now;
  const aim = Math.atan2(G.input.mouse.wy - p.y, G.input.mouse.wx - p.x);
  p.punchAnim = 0.18;
  G.audio.punch();
  for (const r of G.rivals) {
    if (!r.dead && dist(p.x, p.y, r.x, r.y) < 52 && Math.abs(((Math.atan2(r.y - p.y, r.x - p.x) - aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.1) {
      hurtRival(G, r, 1);
    }
  }
  for (const ped of G.peds) {
    if (dist(p.x, p.y, ped.x, ped.y) < 46) { ped.flee = 3; addWanted(G, 1, 'assault'); }
  }
}
export function hurtRival(G, r, dmg) {
  r.hp -= dmg;
  r.flash = 0.12;
  G.particles.push({ x: r.x, y: r.y, vx: 0, vy: -20, life: 0.4, max: 0.4, size: 7, color: '#ff3b30', kind: 'blood' });
  if (r.hp <= 0 && !r.dead) {
    r.dead = true;
    G.player.respect += 10;
    G.player.cash += 40;
    G.feed.push('Tide King down  +$40  +10 respect');
    G.audio.pickup();
  }
}
export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    // Hit rivals.
    for (const r of G.rivals) {
      if (!r.dead && dist(b.x, b.y, r.x, r.y) < 20) { hurtRival(G, r, b.dmg); b.life = 0; break; }
    }
    if (b.life <= 0) continue;
    // Hit the player (enemy bullets only).
    if (b.from !== 'player' && dist(b.x, b.y, G.player.x, G.player.y) < 18) {
      hurtPlayer(G, b.dmg * 8);
      b.life = 0; continue;
    }
    // Hit cars.
    for (const c of G.cars) {
      if (!c.dead && dist(b.x, b.y, c.x, c.y) < 34) {
        c.hp -= b.dmg * 6;
        if (c.hp <= 0) { c.dead = true; c.speed = 0; }
        b.life = 0; break;
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
}
export function hurtPlayer(G, dmg) {
  const p = G.player;
  if (G.screen !== 'play') return;
  if (p.armor > 0) { const soak = Math.min(p.armor, dmg); p.armor -= soak; dmg -= soak; }
  p.hp -= dmg;
  p.hurtFlash = 0.25;
  if (p.hp <= 0) { p.hp = 0; wasted(G); }
}
function wasted(G) {
  // Same outcome as police.wasted (kept inline here to avoid an import cycle).
  const p = G.player;
  G.screen = 'wasted';
  G.audio.fail();
  p.cash = Math.max(0, p.cash - 250);
  p.hp = 100; p.armor = 0;
  G.wanted = 0; G.cops = []; G.heli = null; G.footCops = [];
  G.feed.push('WASTED — $250 hospital bill');
}
export function spawnRivals(G, x, y, n, boss) {
  for (let i = 0; i < n; i++) {
    G.rivals.push({
      x: x + (Math.random() - 0.5) * 260, y: y + (Math.random() - 0.5) * 260,
      hp: boss && i === 0 ? 8 : (boss && i < 3 ? 5 : 3), maxHp: boss && i === 0 ? 8 : 5,
      boss: boss && i === 0, lt: boss && i > 0 && i < 3,
      angle: 0, shootCd: 1 + Math.random() * 2, flash: 0, dead: false, homeX: x, homeY: y,
    });
  }
}
export function updateRivals(G, dt) {
  const p = G.player;
  for (const r of G.rivals) {
    if (r.dead) continue;
    r.flash = Math.max(0, r.flash - dt);
    const d = dist(r.x, r.y, p.x, p.y);
    if (d < 520) {
      // Chase and shoot at the player.
      r.angle = Math.atan2(p.y - r.y, p.x - r.x);
      if (d > 130) { r.x += Math.cos(r.angle) * 95 * dt; r.y += Math.sin(r.angle) * 95 * dt; }
      r.shootCd -= dt;
      if (r.shootCd <= 0 && d < 460) {
        r.shootCd = r.boss ? 1.1 : 1.8;
        const a = Math.atan2(p.y - r.y, p.x - r.x) + (Math.random() - 0.5) * 0.22;
        G.bullets.push({ x: r.x, y: r.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.8, from: 'rival', dmg: 1 });
        G.audio.shot();
      }
    } else {
      // Idle patrol around home turf.
      r.angle += dt * 0.4;
      r.x += Math.cos(r.angle) * 12 * dt; r.y += Math.sin(r.angle) * 12 * dt;
    }
  }
  G.rivals = G.rivals.filter((r) => !r.dead || dist(r.x, r.y, p.x, p.y) < 900);
}
export function spawnPickups(G) {
  const spots = [
    { kind: 'health', x: 2080, y: 2020 }, { kind: 'health', x: 1180, y: 2300 },
    { kind: 'armor', x: 1560, y: 700 }, { kind: 'health', x: 3360, y: 1200 },
    { kind: 'armor', x: 560, y: 2600 }, { kind: 'ammo', x: 1720, y: 620 },
  ];
  for (const s of spots) G.pickups.push({ ...s, taken: false, bob: Math.random() * 6 });
}
export function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    pk.bob += dt;
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) < 40) {
      pk.taken = true;
      if (pk.kind === 'health') { p.hp = Math.min(100, p.hp + 40); G.feed.push('First aid  +40 HP'); }
      if (pk.kind === 'armor') { p.armor = Math.min(100, p.armor + 50); G.feed.push('Body armor  +50'); }
      if (pk.kind === 'ammo') { p.ammo += 24; G.feed.push('Ammo box  +24 rounds'); }
      G.audio.pickup();
    }
  }
}

// Combat: the player's gun, bullets, rival gang members who shoot back,
// and the cash they drop. Shooting civilians and cops raises the heat;
// shooting rivals during a mission does not.
import { PLAYER_RADIUS, clamp, dist } from './config.js';
import { hitsBuilding } from './city.js';
import { scarePeds } from './traffic.js';

const BULLET_SPEED = 920;
const BULLET_RANGE = 620;

export function playerShoot(G) {
  const p = G.player;
  if (p.shootCd > 0 || p.inCar) return;
  const dx = G.input.mouse.worldX - p.x;
  const dy = G.input.mouse.worldY - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);
  p.angle = angle;
  p.shootCd = 0.18;
  G.bullets.push({
    x: p.x + Math.cos(angle) * 20, y: p.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED,
    fromPlayer: true, travelled: 0, dead: false,
  });
  // Muzzle flash: a short-lived bright burst at the gun tip.
  G.particles.push({
    x: p.x + Math.cos(angle) * 24, y: p.y + Math.sin(angle) * 24,
    vx: 0, vy: 0, life: 0.07, maxLife: 0.07, color: '#fff3a0', size: 11,
  });
  G.events.push({ type: 'shot', x: p.x, y: p.y });
  scarePeds(G, p.x, p.y);
  G.lastCrimeT = G.time;
}

/** Spawn a rival gang member. opts: { health, lieutenant, hold } — a
 * lieutenant has 5 HP and a gold ring; a holding rival shoots from cover
 * and only closes in once the player gets near. */
export function spawnRival(G, x, y, opts = {}) {
  const health = opts.health || 3;
  G.enemies.push({
    x, y, angle: 0, health, maxHealth: health,
    shootCd: 1 + G.rng.range(0, 1),
    speed: 120, dead: false,
    shirt: opts.lieutenant ? '#8a6d1f' : '#7a1f1f',
    lieutenant: !!opts.lieutenant, hold: !!opts.hold,
  });
}

export function updateCombat(G, dt) {
  const p = G.player;
  if (p.shootCd > 0) p.shootCd -= dt;
  // Bullets fly and hit the first thing in their path.
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.travelled += BULLET_SPEED * dt;
    if (b.travelled > BULLET_RANGE || hitsBuilding(G.city, b.x, b.y, 2)) {
      b.dead = true;
      G.events.push({ type: 'spark', x: b.x, y: b.y });
      continue;
    }
    if (b.fromPlayer) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist(b.x, b.y, e.x, e.y) < 16) {
          b.dead = true;
          e.health -= 1;
          if (e.health <= 0) {
            e.dead = true;
            G.events.push({ type: 'enemyDown', x: e.x, y: e.y });
            G.pickups.push({ x: e.x, y: e.y, kind: 'cash', value: 150, t: 0 });
            if (G.mission) G.mission.kills += 1;
          }
          break;
        }
      }
      if (b.dead) continue;
      for (const ped of G.peds) {
        if (ped.down) continue;
        if (dist(b.x, b.y, ped.x, ped.y) < 12) {
          b.dead = true;
          ped.down = true;
          ped.downT = 6;
          G.addWanted(1);
          break;
        }
      }
      if (b.dead) continue;
      for (const cop of G.cars) {
        if (!cop.police || cop.dead) continue;
        if (dist(b.x, b.y, cop.x, cop.y) < 24) {
          b.dead = true;
          cop.health -= 34;
          G.addWanted(1);
          if (cop.health <= 0) { cop.dead = true; G.events.push({ type: 'explosion', x: cop.x, y: cop.y }); }
          break;
        }
      }
    } else {
      // Enemy bullets only hurt the player (on foot or in a car).
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      if (dist(b.x, b.y, px, py) < (p.inCar ? 26 : PLAYER_RADIUS + 4)) {
        b.dead = true;
        hurtPlayer(G, 9);
      }
    }
  }
  G.bullets = G.bullets.filter((b) => !b.dead);

  // Rivals close in and shoot when they have line of sight.
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.angle = Math.atan2(dy, dx);
    // A holding rival stays on its turf and shoots from cover until the
    // player closes in; only then does it advance.
    const holding = e.hold && d > 300;
    if (!holding && d > 260) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (!holding && d > 60) {
      e.x += Math.cos(e.angle) * e.speed * 0.4 * dt;
      e.y += Math.sin(e.angle) * e.speed * 0.4 * dt;
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 520) {
      e.shootCd = 1.3 + G.rng.range(0, 0.7);
      const spread = G.rng.range(-0.14, 0.14);
      G.bullets.push({
        x: e.x + Math.cos(e.angle) * 18, y: e.y + Math.sin(e.angle) * 18,
        vx: Math.cos(e.angle + spread) * BULLET_SPEED * 0.8,
        vy: Math.sin(e.angle + spread) * BULLET_SPEED * 0.8,
        fromPlayer: false, travelled: 0, dead: false,
      });
      G.particles.push({
        x: e.x + Math.cos(e.angle) * 22, y: e.y + Math.sin(e.angle) * 22,
        vx: 0, vy: 0, life: 0.07, maxLife: 0.07, color: '#ffb347', size: 9,
      });
      G.events.push({ type: 'shot', x: e.x, y: e.y });
    }
  }
  G.enemies = G.enemies.filter((e) => !e.dead);
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  if (p.invuln > 0) return;
  p.health -= amount;
  p.invuln = 0.5;
  if (p.health <= 0) {
    p.health = 0;
    G.events.push({ type: 'wasted' });
  }
}

export function drawBullet(ctx, b) {
  ctx.fillStyle = '#ffe66d';
  ctx.beginPath();
  ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  // Lieutenants wear a gold ring so the player can spot the 5-HP threat.
  if (e.lieutenant) {
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.rotate(e.angle);
  ctx.fillStyle = e.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(6, -3, 14, 5); // gun
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(8, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  // Health bar, scaled to the rival's own max (lieutenants have 5 HP).
  ctx.rotate(-e.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-12, -20, 24, 4);
  ctx.fillStyle = e.lieutenant ? '#ffd60a' : '#ff4757';
  ctx.fillRect(-12, -20, 24 * clamp(e.health / (e.maxHealth || 3), 0, 1), 4);
  ctx.restore();
}

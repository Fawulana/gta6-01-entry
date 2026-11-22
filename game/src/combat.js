// Palmetto Bay — combat.
//
// Mouse-aimed shooting with bullets, enemy gang members who shoot back,
// and explosions when a car dies. Bullets are simple: a fast point that
// checks what it crosses each frame.

import { WEAPONS } from './config.js';
import { distance, pointInBuilding } from './world.js';

export function createCombat() {
  return { bullets: [], enemies: [], explosions: [], cooldown: 0, enemiesDown: 0 };
}

export function spawnEnemies(combat, x, y, count, rng) {
  for (let i = 0; i < count; i++) {
    combat.enemies.push({
      x: x + (rng() - 0.5) * 220,
      y: y + (rng() - 0.5) * 220,
      angle: rng() * Math.PI * 2,
      hp: 100,
      speed: 110,
      fireTimer: 1 + rng() * 2,
      state: 'hunt',
    });
  }
}

export function fireBullet(combat, player, aimAngle, world) {
  if (combat.cooldown > 0) return false;
  if (!player.hasPistol || player.ammo <= 0) return false;
  combat.cooldown = WEAPONS.pistol.fireRate;
  player.ammo--;
  const gx = player.x + Math.cos(aimAngle) * 20;
  const gy = player.y + Math.sin(aimAngle) * 20;
  combat.bullets.push({
    x: gx, y: gy,
    vx: Math.cos(aimAngle) * 780,
    vy: Math.sin(aimAngle) * 780,
    range: WEAPONS.pistol.range,
    fromPlayer: true,
  });
  return true;
}

export function enemyFire(combat, enemy, player) {
  const a = Math.atan2(player.y - enemy.y, player.x - enemy.x) + (Math.random() - 0.5) * 0.24;
  combat.bullets.push({
    x: enemy.x + Math.cos(a) * 18,
    y: enemy.y + Math.sin(a) * 18,
    vx: Math.cos(a) * 620,
    vy: Math.sin(a) * 620,
    range: 380,
    fromPlayer: false,
  });
}

export function updateCombat(combat, player, playerCar, world, dt, onPlayerHit) {
  combat.cooldown = Math.max(0, combat.cooldown - dt);
  // Bullets fly, die on walls and range, and hit what they cross.
  for (let i = combat.bullets.length - 1; i >= 0; i--) {
    const b = combat.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.range -= Math.hypot(b.vx, b.vy) * dt;
    let dead = b.range <= 0 || pointInBuilding(world, b.x, b.y) !== null;
    if (!dead && b.fromPlayer) {
      for (let j = combat.enemies.length - 1; j >= 0; j--) {
        const e = combat.enemies[j];
        if (distance(b.x, b.y, e.x, e.y) < 18) {
          e.hp -= WEAPONS.pistol.damage;
          dead = true;
          if (e.hp <= 0) {
            combat.enemies.splice(j, 1);
            combat.enemiesDown++;
          }
          break;
        }
      }
    }
    if (!dead && !b.fromPlayer) {
      const tx = playerCar ? playerCar.x : player.x;
      const ty = playerCar ? playerCar.y : player.y;
      if (distance(b.x, b.y, tx, ty) < 24) {
        dead = true;
        onPlayerHit(WEAPONS.pistol.damage * 0.5);
      }
    }
    if (dead) combat.bullets.splice(i, 1);
  }
  // Enemies hunt the player and fire when close enough.
  for (const e of combat.enemies) {
    const d = distance(e.x, e.y, player.x, player.y);
    const want = Math.atan2(player.y - e.y, player.x - e.x);
    let diff = want - e.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    e.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
    if (d > 160) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    }
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && d < 420) {
      enemyFire(combat, e, player);
      e.fireTimer = 1.2 + Math.random() * 1.6;
    }
  }
  for (let i = combat.explosions.length - 1; i >= 0; i--) {
    combat.explosions[i].ttl -= dt;
    combat.explosions[i].r += 260 * dt;
    if (combat.explosions[i].ttl <= 0) combat.explosions.splice(i, 1);
  }
}

export function explodeCar(combat, car) {
  combat.explosions.push({ x: car.x, y: car.y, r: 12, ttl: 0.7 });
}

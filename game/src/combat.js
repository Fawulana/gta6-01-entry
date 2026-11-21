// Combat for Solmar Bay: the player's pistol and fists, rival gang members
// who hold turf and shoot back, muzzle flashes, tracers and damage.
// Rivals are plain objects; missions spawn them, this module fights them.
import { BULLET_SPEED, BULLET_DAMAGE, PUNCH_DAMAGE } from './config.js';

export function makeRival(x, y, opts = {}) {
  return {
    x, y,
    hp: opts.hp ?? 3,
    maxHp: opts.hp ?? 3,
    lieutenant: opts.lieutenant ?? false,
    angle: opts.angle ?? 0,
    shootCooldown: 1 + Math.random(),
    speed: 120,
    dead: false,
    flash: 0, // hit flash timer
    name: opts.name || 'Vulture',
  };
}

export function makeBullet(x, y, angle, from, damage = BULLET_DAMAGE) {
  return {
    x, y,
    vx: Math.cos(angle) * BULLET_SPEED,
    vy: Math.sin(angle) * BULLET_SPEED,
    life: 0.9,
    from, // 'player' | 'rival'
    damage,
  };
}

// Player fires toward a world point. Returns true when a shot went out.
export function playerShoot(state, worldX, worldY) {
  const p = state.player;
  if (p.shootCooldown > 0 || state.screen !== 'playing') return false;
  p.shootCooldown = 0.28;
  const angle = Math.atan2(worldY - p.y, worldX - p.x);
  const mx = p.x + Math.cos(angle) * 26;
  const my = p.y + Math.sin(angle) * 26;
  state.bullets.push(makeBullet(mx, my, angle, 'player'));
  state.muzzle = { x: mx, y: my, t: 0.06, angle };
  state.spawnSparks(mx, my, 3, '#ffd76a');
  if (state.sound) state.sound.gunshot();
  if (state.onGunshot) state.onGunshot(p.x, p.y);
  return true;
}

// Player punches in the facing direction; hits the nearest rival or ped.
export function playerPunch(state) {
  const p = state.player;
  if (p.punchCooldown > 0 || state.screen !== 'playing') return false;
  p.punchCooldown = 0.45;
  const reach = 46;
  const px = p.x + Math.cos(p.angle) * reach;
  const py = p.y + Math.sin(p.angle) * reach;
  let hit = false;
  for (const r of state.rivals) {
    if (r.dead) continue;
    if (Math.hypot(r.x - px, r.y - py) < 34) {
      damageRival(state, r, PUNCH_DAMAGE);
      hit = true;
    }
  }
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - px, ped.y - py) < 30) {
      ped.fleeing = 4;
      ped.fleeX = (ped.x - p.x) / 40;
      ped.fleeY = (ped.y - p.y) / 40;
      hit = true;
    }
  }
  if (state.sound) state.sound.punch();
  state.spawnSparks(px, py, 4, '#ffffff');
  return hit;
}

export function damageRival(state, rival, dmg) {
  rival.hp -= dmg / 34; // damage is in hit-points of 34
  rival.flash = 0.15;
  state.spawnSparks(rival.x, rival.y, 5, '#ff5a4a');
  if (rival.hp <= 0 && !rival.dead) {
    rival.dead = true;
    state.spawnSparks(rival.x, rival.y, 16, '#ff5a4a');
    if (state.onRivalKilled) state.onRivalKilled(rival);
  }
}

export function damagePlayer(state, dmg) {
  const p = state.player;
  if (p.invuln > 0 || state.screen !== 'playing') return;
  p.hp -= dmg;
  p.invuln = 0.35;
  state.shake = Math.min(12, state.shake + 4);
  state.redFlash = 0.25;
  if (p.hp <= 0) {
    p.hp = 0;
    state.wasted();
  }
}

// Rivals: hold position, shoot the player when in range and line of sight.
export function updateRivals(state, dt) {
  const p = state.player;
  for (const r of state.rivals) {
    if (r.dead) continue;
    r.flash = Math.max(0, r.flash - dt);
    const dx = p.x - r.x;
    const dy = p.y - r.y;
    const dist = Math.hypot(dx, dy);
    r.angle = Math.atan2(dy, dx);
    r.shootCooldown -= dt;
    if (dist < 460 && r.shootCooldown <= 0) {
      // A little inaccuracy so the player can dodge.
      const spread = (Math.random() - 0.5) * 0.24;
      const angle = r.angle + spread;
      state.bullets.push(makeBullet(r.x + Math.cos(angle) * 24, r.y + Math.sin(angle) * 24, angle, 'rival', 8));
      state.muzzle = { x: r.x, y: r.y, t: 0.05, angle };
      r.shootCooldown = 0.9 + Math.random() * 0.9;
      if (state.sound) state.sound.gunshot();
    } else if (dist > 200 && dist < 700) {
      // Close the distance slowly when the player is near but out of range.
      r.x += Math.cos(r.angle) * r.speed * dt * 0.5;
      r.y += Math.sin(r.angle) * r.speed * dt * 0.5;
    }
  }
  state.rivals = state.rivals.filter((r) => !r.dead || r.deadTimer > 0);
}

// Bullets fly, hit rivals / the player / cars, and die on walls.
export function updateBullets(state, dt) {
  const p = state.player;
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (b.from === 'player') {
      for (const r of state.rivals) {
        if (r.dead) continue;
        if (Math.hypot(r.x - b.x, r.y - b.y) < 22) {
          damageRival(state, r, b.damage);
          b.life = 0;
          break;
        }
      }
      if (b.life <= 0) continue;
      for (const car of state.cars) {
        if (car.dead) continue;
        if (p.inCar === car) continue;
        const dx = car.x - b.x;
        const dy = car.y - b.y;
        if (dx * dx + dy * dy < 26 * 26) {
          car.hp -= b.damage;
          state.spawnSparks(b.x, b.y, 4, '#ffd76a');
          if (car.hp <= 0) state.explodeCar(car);
          b.life = 0;
          break;
        }
      }
    } else {
      // Rival bullet vs the player.
      const target = p.inCar || p;
      const rr = p.inCar ? 30 : 16;
      if (Math.hypot(target.x - b.x, target.y - b.y) < rr) {
        if (p.inCar) {
          p.inCar.hp -= b.damage;
          if (p.inCar.hp <= 0) state.explodeCar(p.inCar);
        } else {
          damagePlayer(state, b.damage);
        }
        b.life = 0;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

// The player on foot: walking and sprinting, punching, shooting with mouse aim,
// and getting in and out of cars. Foot combat is close and personal — a pistol
// is a tool for losing a tail, not for winning a war.

import { PLAYER, WEAPONS, WORLD } from './config.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: PLAYER.health, armor: 0,
    weapon: 'pistol', ammo: { pistol: 24 },
    punchCooldown: 0, shootCooldown: 0, hurt: 0,
    inCar: null, dead: false, moving: false, sprinting: false,
  };
}

/** One foot step: move, collide with buildings, stay in the world. */
export function stepPlayer(player, input, dt, city) {
  if (player.inCar || player.dead) return;
  const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  player.moving = moving;
  player.sprinting = moving && !!input.run;
  const speed = player.sprinting ? PLAYER.run : PLAYER.walk;
  if (moving) {
    const len = Math.hypot(mx, my);
    const vx = (mx / len) * speed;
    const vy = (my / len) * speed;
    const nx = player.x + vx * dt;
    const ny = player.y + vy * dt;
    if (!city.hitBuilding(nx, player.y, PLAYER.radius)) player.x = nx;
    if (!city.hitBuilding(player.x, ny, PLAYER.radius)) player.y = ny;
    player.angle = Math.atan2(vy, vx);
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  player.x = Math.max(24, Math.min(WORLD.waterX - 24, player.x));
  player.y = Math.max(24, Math.min(WORLD.height - 24, player.y));
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.hurt > 0) player.hurt -= dt;
}

/** Aim at the mouse (world coords) or, without a mouse, at the facing. */
export function aimAngle(player, mouseWorld) {
  if (mouseWorld) return Math.atan2(mouseWorld.y - player.y, mouseWorld.x - player.x);
  return player.angle;
}

/**
 * Fire the current weapon. Returns a shot description (for tracers, sound and
 * hit resolution) or null when on cooldown, out of ammo, or unarmed.
 */
export function fireWeapon(player, targetAngle) {
  const def = WEAPONS[player.weapon];
  if (!def || player.shootCooldown > 0) return null;
  if (player.weapon !== 'fists') {
    const ammo = player.ammo[player.weapon] || 0;
    if (ammo <= 0) return { empty: true };
    player.ammo[player.weapon] = ammo - 1;
  }
  player.shootCooldown = def.rate;
  player.angle = targetAngle;
  const pellets = def.pellets || 1;
  const shots = [];
  for (let i = 0; i < pellets; i += 1) {
    const spread = pellets > 1 ? (i / (pellets - 1) - 0.5) * def.spread * 2 : 0;
    shots.push({ angle: targetAngle + spread, range: def.range, damage: def.damage });
  }
  return { weapon: player.weapon, shots, muzzle: { x: player.x + Math.cos(targetAngle) * 22, y: player.y + Math.sin(targetAngle) * 22 } };
}

/** A punch: short range, no ammo, always available. */
export function punch(player) {
  if (player.punchCooldown > 0 || player.inCar) return null;
  player.punchCooldown = PLAYER.punchCooldown;
  return {
    x: player.x + Math.cos(player.angle) * PLAYER.punchRange,
    y: player.y + Math.sin(player.angle) * PLAYER.punchRange,
    range: PLAYER.punchRange,
    damage: PLAYER.punchDamage,
  };
}

/** Damage first eats armor, then health. Returns true when the player dies. */
export function hurtPlayer(player, damage) {
  if (player.dead) return false;
  let left = damage;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, left);
    player.armor -= absorbed;
    left -= absorbed;
  }
  player.health -= left;
  player.hurt = 0.5;
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
    return true;
  }
  return false;
}

export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.health, player.health + amount);
}

export function armPlayer(player, amount) {
  player.armor = Math.min(PLAYER.armor, player.armor + amount);
}

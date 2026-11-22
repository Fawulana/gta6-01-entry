// Palmetto Bay — Rico Vega on foot. Movement, sprint, health, cash and
// the enter/exit-car handoff. Driving physics lives in vehicles.js; this
// file is only the man himself.

import { PLAYER } from './config.js';
import { clampToWorld, isWater, resolveCircleVsBuildings } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    health: PLAYER.maxHealth,
    cash: PLAYER.startCash,
    inCar: null,
    ammo: 12,
    hasPistol: true,
    moving: false,
  };
}

export function updatePlayerOnFoot(player, input, world, dt) {
  let dx = 0;
  let dy = 0;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  const moving = dx !== 0 || dy !== 0;
  player.moving = moving;
  if (!moving) {
    player.speed = 0;
    return;
  }
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  const speed = input.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  player.angle = Math.atan2(dy, dx);
  player.speed = speed;
  const nx = player.x + dx * speed * dt;
  const ny = player.y + dy * speed * dt;
  // Water stops Rico; buildings push him out; the world edge holds him.
  if (!isWater(nx, ny)) {
    player.x = nx;
    player.y = ny;
  }
  resolveCircleVsBuildings(world, player, PLAYER.radius);
  clampToWorld(player, PLAYER.radius);
}

export function damagePlayer(player, amount) {
  player.health = Math.max(0, player.health - amount);
  return player.health <= 0;
}

export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.maxHealth, player.health + amount);
}

export function addCash(player, amount) {
  player.cash += amount;
}

export function spendCash(player, amount) {
  if (player.cash < amount) return false;
  player.cash -= amount;
  return true;
}

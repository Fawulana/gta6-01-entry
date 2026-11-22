// Palmetto Bay — stash chests and pickups. Eight chests hide around the
// city (positions in config.js); each pays cash once. Health and ammo
// pickups drop from defeated enemies and respawn at fixed spots.

import { STASH_CHESTS } from './config.js';
import { distance } from './world.js';

export function createChests() {
  return STASH_CHESTS.map((c, i) => ({ id: i, x: c.x, y: c.y, cash: c.cash, taken: false }));
}

export function createPickups() {
  return [];
}

export function dropPickup(pickups, kind, x, y) {
  pickups.push({ kind, x, y, ttl: 25 });
}

export function updatePickups(pickups, dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    pickups[i].ttl -= dt;
    if (pickups[i].ttl <= 0) pickups.splice(i, 1);
  }
}

// A chest the player is standing on: returns it, or null.
export function chestAt(chests, x, y) {
  for (const chest of chests) {
    if (!chest.taken && distance(x, y, chest.x, chest.y) < 46) return chest;
  }
  return null;
}

// A pickup the player is standing on: removes and returns it, or null.
export function pickupAt(pickups, x, y) {
  for (let i = 0; i < pickups.length; i++) {
    if (distance(x, y, pickups[i].x, pickups[i].y) < 40) return pickups.splice(i, 1)[0];
  }
  return null;
}

export function chestsTaken(chests) {
  return chests.filter((c) => c.taken).length;
}

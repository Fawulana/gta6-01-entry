// Pickups: stash chests hidden around the city, cash drops, health kits, body
// armor and weapon crates. Chests pay the best — finding all eight is a night's
// work on its own. Mission chests appear only while the Stash Run is active.

import { rangeInt } from './random.js';

const FREE_CHESTS = [
  { x: 502, y: 540 }, { x: 1100, y: 2100 }, { x: 2002, y: 700 }, { x: 2620, y: 2502 },
  { x: 3002, y: 1500 }, { x: 3900, y: 2650 }, { x: 700, y: 2738 }, { x: 1500, y: 250 },
];

const MISSION_CHESTS = [
  { x: 2920, y: 600 }, { x: 1000, y: 2600 }, { x: 2000, y: 2500 },
];

const CASH_SPOTS = [
  { x: 800, y: 900 }, { x: 1800, y: 1500 }, { x: 2900, y: 900 }, { x: 3400, y: 2200 },
  { x: 500, y: 1500 }, { x: 2300, y: 2700 }, { x: 1300, y: 1900 }, { x: 3750, y: 1200 },
];

export function createPickups(random) {
  const items = [];
  for (const spot of FREE_CHESTS) {
    items.push({ kind: 'chest', x: spot.x, y: spot.y, value: rangeInt(random, 150, 400), taken: false, mission: false, phase: random() * 6 });
  }
  for (const spot of CASH_SPOTS) {
    items.push({ kind: 'cash', x: spot.x, y: spot.y, value: 50, taken: false, mission: false, phase: random() * 6 });
  }
  items.push({ kind: 'health', x: 1420, y: 2020, value: 50, taken: false, mission: false, phase: 0 });
  items.push({ kind: 'health', x: 2420, y: 820, value: 50, taken: false, mission: false, phase: 1 });
  items.push({ kind: 'armor', x: 920, y: 1620, value: 50, taken: false, mission: false, phase: 2 });
  items.push({ kind: 'weapon', x: 920, y: 1700, value: 0, weapon: 'smg', taken: false, mission: false, phase: 3 });
  return { items, missionChests: [] };
}

/** Spawn the three Stash Run chests; returns them so missions can point at them. */
export function spawnMissionChests(pickups) {
  pickups.missionChests = MISSION_CHESTS.map((spot) => {
    const chest = { kind: 'chest', x: spot.x, y: spot.y, value: 250, taken: false, mission: true, phase: 0 };
    pickups.items.push(chest);
    return chest;
  });
  return pickups.missionChests;
}

export function clearMissionChests(pickups) {
  pickups.items = pickups.items.filter((item) => !item.mission);
  pickups.missionChests = [];
}

/**
 * Collect anything the player (or their car) touches. Returns the events that
 * fired, so the world can pay out, heal, arm and count them.
 */
export function collectPickups(pickups, x, y, radius) {
  const events = [];
  for (const item of pickups.items) {
    if (item.taken) continue;
    if (Math.hypot(item.x - x, item.y - y) < radius + 26) {
      item.taken = true;
      events.push({ kind: item.kind, value: item.value, weapon: item.weapon, mission: item.mission, x: item.x, y: item.y });
    }
  }
  return events;
}

/** The nearest untaken mission chest, for the mission marker. */
export function nearestMissionChest(pickups, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const chest of pickups.missionChests) {
    if (chest.taken) continue;
    const d = Math.hypot(chest.x - x, chest.y - y);
    if (d < bestD) {
      bestD = d;
      best = chest;
    }
  }
  return best;
}

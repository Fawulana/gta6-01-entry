// Palmetto Bay — save / load through localStorage.
// Only plain numbers, booleans and strings are stored; nothing else.
// The version field lets a future build refuse a stale save instead of
// loading numbers it does not understand.
import { SAVE_SLOT } from './config.js';

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_SLOT);
  } catch {
    return false;
  }
}

export function saveGame(game) {
  const data = {
    version: 9,
    player: {
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
      health: game.player.health,
      armor: game.player.armor,
      cash: game.player.cash,
      ammo: game.player.ammo,
    },
    wanted: { stars: game.wanted.stars },
    missions: {
      completed: game.missions.completed,
      index: game.missions.index,
    },
    chests: game.city.chests.map((c) => !!c.looted),
    fares: game.faresDone || 0,
    playSeconds: Math.round(game.playSeconds),
  };
  try {
    localStorage.setItem(SAVE_SLOT, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_SLOT);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || data.version !== 9) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_SLOT);
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

// Save and load: one slot in localStorage, named from the first write.
// SAVE_SLOT is 'palmetto-bay-save-v8' — the slot name is part of the entry.
import { SAVE_SLOT } from './config.js';

export { SAVE_SLOT };

export function saveGame(game) {
  try {
    const data = {
      version: 8,
      savedAt: Date.now(),
      player: {
        x: game.player.x,
        y: game.player.y,
        health: game.player.health,
        armor: game.player.armor,
        cash: game.player.cash,
        ammo: game.player.ammo,
      },
      wanted: { stars: game.wanted.stars },
      missions: game.missions.toSave(),
      chests: game.city.chests.map((c) => c.looted),
      playSeconds: game.playSeconds,
    };
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
    if (!data || data.version !== 8) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_SLOT);
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_SLOT);
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

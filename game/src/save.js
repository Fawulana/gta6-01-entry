// Save and load: cash, story progress, owned weapons and lifetime stats, kept in
// this browser only. A corrupt or missing save starts a fresh story.

import { SAVE_SLOT } from './config.js';

export function defaultSave() {
  return {
    cash: 250,
    mission: 0,
    completed: [],
    weapons: ['fists', 'pistol'],
    ammo: { pistol: 24 },
    stats: { carsStolen: 0, chests: 0, missionsDone: 0, busts: 0, wasted: 0, distanceDriven: 0 },
    best: 0,
  };
}

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_SLOT);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const fresh = defaultSave();
    return {
      cash: typeof parsed.cash === 'number' ? parsed.cash : fresh.cash,
      mission: typeof parsed.mission === 'number' ? parsed.mission : fresh.mission,
      completed: Array.isArray(parsed.completed) ? parsed.completed : fresh.completed,
      weapons: Array.isArray(parsed.weapons) ? parsed.weapons : fresh.weapons,
      ammo: typeof parsed.ammo === 'object' && parsed.ammo !== null ? parsed.ammo : fresh.ammo,
      stats: { ...fresh.stats, ...(parsed.stats || {}) },
      best: typeof parsed.best === 'number' ? parsed.best : fresh.best,
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_SLOT, JSON.stringify(save));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

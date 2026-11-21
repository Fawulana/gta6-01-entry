// localStorage save for Solmar Bay. Small and versioned: missions done,
// cash, stashes found and best race time. Loading never throws — a corrupt
// or missing save just means a fresh start.
import { SAVE_KEY } from './config.js';

export function blankSave() {
  return {
    version: 1,
    missionsDone: 0,
    cash: 0,
    stashes: [], // indices into STASH_SPOTS
    bestRace: null, // seconds, lower is better
    storyDone: false,
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return blankSave();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return blankSave();
    const save = blankSave();
    if (Number.isFinite(data.missionsDone)) save.missionsDone = Math.max(0, Math.min(6, Math.floor(data.missionsDone)));
    if (Number.isFinite(data.cash)) save.cash = Math.max(0, Math.floor(data.cash));
    if (Array.isArray(data.stashes)) save.stashes = data.stashes.filter((i) => Number.isInteger(i) && i >= 0 && i < 10);
    if (Number.isFinite(data.bestRace)) save.bestRace = data.bestRace;
    save.storyDone = data.storyDone === true;
    return save;
  } catch {
    return blankSave();
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

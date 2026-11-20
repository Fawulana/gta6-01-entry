// Save and load through localStorage: cash, story progress, health and the
// player's position. Saving happens at the safehouse and after each mission.
export const SAVE_KEY = 'solmar-bay.save.v1';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      cash: p.cash,
      health: p.health,
      missionsDone: G.missionsDone,
      storyDone: G.storyDone,
      stashesFound: G.stashesFound || 0,
      x: p.x,
      y: p.y,
      time: G.time,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.x !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() { return loadSave() !== null; }

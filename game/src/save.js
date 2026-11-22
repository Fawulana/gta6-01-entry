// Palmetto Bay — persistence. Progress auto-saves to localStorage: cash,
// missions completed, chests taken, and best stats. A save is a small JSON
// object under one key; a corrupt or missing save starts fresh.

const SAVE_KEY = 'palmetto-bay-save-v6';

export function saveGame(state) {
  try {
    const data = {
      cash: state.player.cash,
      missionsDone: state.missionsDone,
      chestsTaken: state.chests.filter((c) => c.taken).map((c) => c.id),
      bestCash: state.bestCash,
      totalEarned: state.totalEarned,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 150,
      missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [],
      chestsTaken: Array.isArray(data.chestsTaken) ? data.chestsTaken : [],
      bestCash: typeof data.bestCash === 'number' ? data.bestCash : 0,
      totalEarned: typeof data.totalEarned === 'number' ? data.totalEarned : 0,
    };
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // A browser that refuses storage just plays without a save.
  }
}

// Palmetto Bay — persistence.
//
// Progress auto-saves to localStorage: cash, missions completed, chests
// taken, and best stats. A save is a small JSON object under one slot; a
// corrupt or missing save starts fresh.

const SAVE_SLOT = 'palmetto-bay-save-v6r';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      cash: state.player.cash,
      missionsDone: state.missionsDone,
      chestsTaken: state.chests.filter((c) => c.taken).map((c) => c.id),
      bestCash: state.bestCash,
      totalEarned: state.totalEarned,
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
    localStorage.removeItem(SAVE_SLOT);
  } catch {
    // A browser that refuses storage just plays without a save.
  }
}

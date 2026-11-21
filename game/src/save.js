// Save / load: progress (missions, cash, respect, stashes, best race time,
// weapon, ammo) persists in localStorage. Loading is best-effort — a bad or
// missing save just starts a fresh game.
const KEY = 'port-azura-save-v1';
export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      missionIndex: Math.min(G.mission.index, 8),
      cash: Math.floor(p.cash), respect: p.respect, ammo: p.ammo,
      weapon: p.weapon, hasShotgun: !!p.hasShotgun, bestRace: p.bestRace || null,
      stashes: G.chests.map((c) => c.found),
      time: G.weather.time,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    G.saveDirty = false;
  } catch { /* storage unavailable — play on without saving */ }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return null;
    return d;
  } catch { return null; }
}
export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Missions and story: eight linked jobs for fixer Salvo Kane, told through
// Dana Reyes, a wheelwoman back in Port Azura. Each mission is a small state
// machine — go somewhere, do something, get out — with pay, respect and a
// next job unlocked. Fail a race or a robbery and you can retry it.
import { MISSION_PAY, MISSION_NAMES, ECONOMY } from './config.js';
import { dist, fmtMoney } from './random.js';
import { makeCar, addWanted } from './vehicles.js';
import { spawnRivals } from './combat.js';
import { missionBriefing, missionOutro } from './story.js';

const RACE_POINTS = [
  { x: 1360, y: 640 }, { x: 2800, y: 1000 }, { x: 2800, y: 2440 },
  { x: 1000, y: 2800 }, { x: 640, y: 1360 },
];
const SHAKEDOWN_STOPS = [
  { x: 1720, y: 560, label: 'Market Row stall' },
  { x: 1180, y: 2360, label: 'Neon Diner' },
  { x: 2360, y: 1060, label: 'Casino Sol' },
];

export function startMission(G, index) {
  const m = G.mission;
  m.index = index; m.failed = false; m.timer = 0; m.holdT = 0; m.cp = 0; m.stop = 0;
  const P = G.city.places;
  if (index === 0) { m.stage = 'go'; m.target = { x: 1500, y: 1180, label: 'Pick up the package — Downtown' }; }
  if (index === 1) {
    m.stage = 'steal';
    const car = makeCar('sports', 2440, 1240, Math.PI / 2, { parked: true, color: '#c22e2e' });
    G.cars.push(car); m.carId = car.id;
    m.target = { x: 2440, y: 1240, label: 'Steal the Falco GT — Azura Motors' };
  }
  if (index === 2) { m.stage = 'collect'; m.target = { ...SHAKEDOWN_STOPS[0] }; }
  if (index === 3) {
    m.stage = 'escape';
    G.wanted = 3; G.heatTimer = 0;
    m.target = { x: P.safehouse.x, y: P.safehouse.y, label: 'Lose the heat, then reach the Safehouse' };
    G.feed.push('The drop went loud — 3 stars! Lose them and get home.');
  }
  if (index === 4) { m.stage = 'race'; m.timer = 100; m.cp = 0; m.target = { ...RACE_POINTS[0], label: 'Checkpoint 1/5 — 100s' }; }
  if (index === 5) { m.stage = 'go'; m.target = { x: P.casino.x, y: P.casino.y, label: 'Walk into Casino Sol' }; }
  if (index === 6) {
    m.stage = 'steal';
    const car = makeCar('aurora', 2360, 1240, -Math.PI / 2, { parked: true });
    G.cars.push(car); m.carId = car.id;
    m.target = { x: 2360, y: 1240, label: 'Steal the gold Aurora GT — Azura Motors' };
  }
  if (index === 7) {
    m.stage = 'clear';
    spawnRivals(G, P.docks.x, P.docks.y, 10, true);
    m.target = { x: P.docks.x, y: P.docks.y, label: 'Clear the Docks — Tide Kings left: 10' };
    G.feed.push('The Takeover: ten Tide Kings hold the Docks. Their boss wears gold.');
  }
  G.audio.mission();
  G.feed.push('MISSION ' + (index + 1) + '/8 — ' + MISSION_NAMES[index]);
  missionBriefing(G, index);
}
export function missionObjective(G) {
  const m = G.mission;
  if (m.index >= 8) return 'Story complete — free roam. Fares, races and stashes still pay.';
  if (m.failed) return 'Mission failed — press ENTER to retry ' + MISSION_NAMES[m.index];
  return 'M' + (m.index + 1) + '/8 ' + MISSION_NAMES[m.index] + ' — ' + (m.target ? m.target.label : '');
}
function payOut(G) {
  const m = G.mission;
  const pay = MISSION_PAY[m.index];
  G.player.cash += pay;
  G.player.respect += 120;
  G.audio.cash();
  G.feed.push('MISSION COMPLETE  +' + fmtMoney(pay) + '  +120 respect');
  missionOutro(G, m.index);
  G.saveDirty = true;
  if (m.index + 1 < 8) startMission(G, m.index + 1);
  else { m.index = 8; m.stage = 'done'; m.target = null; G.feed.push('STORY COMPLETE — Port Azura is yours, Dana.'); }
}
function failMission(G, why) {
  G.mission.failed = true;
  G.audio.fail();
  G.feed.push('MISSION FAILED — ' + why + ' (ENTER to retry)');
}
export function updateMission(G, dt) {
  const m = G.mission, p = G.player, P = G.city.places;
  if (m.index >= 8 || m.failed) return;
  const near = (t, r) => t && dist(p.x, p.y, t.x, t.y) < (r || 70);
  if (m.index === 0) {
    if (m.stage === 'go' && near(m.target)) { m.stage = 'deliver'; m.target = { x: P.safehouse.x, y: P.safehouse.y, label: 'Deliver the package to the Safehouse' }; G.audio.pickup(); }
    else if (m.stage === 'deliver' && near(m.target)) payOut(G);
  }
  if (m.index === 1 || m.index === 6) {
    if (m.stage === 'steal' && p.car && p.car.id === m.carId) {
      m.stage = 'deliver'; addWanted(G, 2, 'car theft');
      m.target = { x: P.safehouse.x, y: P.safehouse.y, label: 'Deliver it to the Safehouse — don\'t wreck it' };
      G.audio.horn();
    } else if (m.stage === 'deliver' && p.car && p.car.id === m.carId && near(m.target, 90)) payOut(G);
  }
  if (m.index === 2) {
    if (near(m.target, 80)) {
      m.stop++;
      G.player.cash += 150; G.audio.cash();
      G.feed.push('Debt collected  +$150  (' + m.stop + '/3)');
      if (m.stop >= 3) { payOut(G); return; }
      m.target = { ...SHAKEDOWN_STOPS[m.stop] };
    }
  }
  if (m.index === 3) {
    if (G.wanted === 0 && near(m.target, 90)) payOut(G);
    else if (G.wanted === 0) m.target.label = 'Heat is off — reach the Safehouse';
  }
  if (m.index === 4) {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(G, 'out of time on the Azura 500'); return; }
    if (near(m.target, 95)) {
      m.cp++;
      G.audio.pickup();
      if (m.cp >= 5) { G.player.bestRace = Math.min(G.player.bestRace || 999, 100 - m.timer); payOut(G); return; }
      m.target = { ...RACE_POINTS[m.cp], label: 'Checkpoint ' + (m.cp + 1) + '/5 — ' + Math.ceil(m.timer) + 's left' };
    } else if (m.target) m.target.label = 'Checkpoint ' + (m.cp + 1) + '/5 — ' + Math.ceil(m.timer) + 's left';
  }
  if (m.index === 5) {
    if (m.stage === 'go' && near(m.target, 80) && p.onFoot) {
      m.stage = 'grab'; m.holdT = 0;
      m.target = { x: P.casino.x, y: P.casino.y, label: 'Hold E — empty the till…' };
    } else if (m.stage === 'grab') {
      if (!near(m.target, 110) || !p.onFoot) { m.stage = 'go'; m.target = { x: P.casino.x, y: P.casino.y, label: 'Walk into Casino Sol' }; return; }
      if (G.input.down('KeyE')) {
        m.holdT += dt;
        m.target.label = 'Emptying the till… ' + Math.ceil(3 - m.holdT) + 's';
        if (m.holdT >= 3) {
          m.stage = 'run'; addWanted(G, 3, 'casino robbery');
          m.target = { x: P.safehouse.x, y: P.safehouse.y, label: 'Run! Get the cash to the Safehouse' };
          G.audio.cash();
        }
      }
    } else if (m.stage === 'run' && near(m.target, 90)) payOut(G);
  }
  if (m.index === 7) {
    const left = G.rivals.filter((r) => !r.dead && dist(r.x, r.y, P.docks.x, P.docks.y) < 480).length;
    if (m.target) m.target.label = 'Clear the Docks — Tide Kings left: ' + left;
    if (left === 0) payOut(G);
  }
}
export const MISSION_TIPS = [
  'Tip: the package is on foot — park close, grab it, walk it home.',
  'Tip: the Falco is fast but fragile. Brake early, cut corners late.',
  'Tip: debts pay $150 on the spot. The till is the real money.',
  'Tip: hide in alleys and behind buildings — cops lose you without line of sight.',
  'Tip: checkpoints are forgiving; the clock is not. Keep the throttle down.',
  'Tip: hold E at the till for 3 seconds. Bring a fast car for the run out.',
  'Tip: the Aurora alarm brings 2 stars the moment you touch the door.',
  'Tip: the boss takes 8 hits and his lieutenants 5. Use cover, use the shotgun.',
];
export function missionTip(index) { return MISSION_TIPS[index] || ''; }
export function retryMission(G) {
  if (G.mission.failed) startMission(G, G.mission.index);
}
export { RACE_POINTS };

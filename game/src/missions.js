// The story: three linked missions from Lena Cruz, then free roam.
// Each mission is a small state machine of steps — go somewhere, collect
// something, lose the cops, eliminate the rivals — with a marker on the map
// and an objective line on the HUD.
import { playMissionDone } from './audio.js';
import { spawnRival } from './combat.js';
import { dist } from './config.js';

export const MISSIONS = [
  {
    id: 'pickup',
    title: 'The Pickup',
    giver: 'Lena Cruz',
    brief: 'Lena needs a package from the Marina Docks. Drive down, grab it, bring it back to her bar.',
    reward: 500,
  },
  {
    id: 'getaway',
    title: 'The Getaway',
    giver: 'Lena Cruz',
    brief: 'The package was hot. The whole Solmar PD is on you — lose the heat, then get to the safehouse.',
    reward: 800,
  },
  {
    id: 'score',
    title: 'The Score',
    giver: 'Lena Cruz',
    brief: 'The Vultures took our cut and hid it in the Old Warehouse. Clear them out, take the cash, come home.',
    reward: 1500,
  },
];

export function startMission(G, index) {
  const def = MISSIONS[index];
  const m = G.city.markers;
  G.mission = {
    index, def, step: 'goto', kills: 0, done: false,
    target: index === 0 ? { x: m.docks.x, y: m.docks.y, label: 'Marina Docks' }
      : index === 1 ? { x: m.safehouse.x, y: m.safehouse.y, label: 'Safehouse' }
      : { x: m.warehouse.x, y: m.warehouse.y, label: 'Old Warehouse' },
  };
  if (index === 1) {
    G.addWanted(3);
    G.missionHeat = true;
    G.toast('3 stars! Lose the cops, then reach the safehouse.');
  } else if (index === 2) {
    // Five Vultures guard the warehouse.
    const w = m.warehouse;
    const spots = [[-90, -60], [80, -70], [0, 60], [-120, 80], [110, 90]];
    for (const [dx, dy] of spots) spawnRival(G, w.x + dx, w.y + dy);
    G.toast('The Vultures are waiting. Clear them out.');
  } else {
    G.toast('New mission: The Pickup — reach the Marina Docks.');
  }
}

function completeMission(G) {
  const m = G.mission;
  const reward = m.def.reward;
  G.player.cash += reward;
  G.missionHeat = false;
  playMissionDone();
  G.events.push({ type: 'missionDone', title: m.def.title, reward });
  G.toast(`Mission complete: ${m.def.title}  +$${reward}`);
  G.mission = null;
  G.missionsDone += 1;
  if (G.missionsDone < MISSIONS.length) {
    startMission(G, G.missionsDone);
  } else {
    G.storyDone = true;
    G.toast('Story complete — Solmar Bay is yours. Free roam!');
  }
}

export function updateMissions(G, dt) {
  const m = G.mission;
  if (!m) return;
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  const t = m.target;
  if (m.index === 0) {
    if (m.step === 'goto' && dist(px, py, t.x, t.y) < 90) {
      m.step = 'collect';
      G.pickups.push({ x: t.x + 40, y: t.y + 20, kind: 'package', value: 0, t: 0 });
      G.toast('The package is here — walk over it to grab it.');
    } else if (m.step === 'collect' && G.packageGot) {
      m.step = 'return';
      m.target = { x: G.city.markers.lenas.x, y: G.city.markers.lenas.y, label: "Lena's Bar" };
      G.toast('Package secured. Bring it back to Lena.');
    } else if (m.step === 'return' && dist(px, py, t.x, t.y) < 90) {
      completeMission(G);
    }
  } else if (m.index === 1) {
    if (m.step === 'goto' && G.wanted === 0) {
      m.step = 'return';
      G.toast('Heat is off. Now get to the safehouse.');
    } else if (m.step === 'return' && dist(px, py, t.x, t.y) < 100) {
      completeMission(G);
    }
  } else if (m.index === 2) {
    if (m.step === 'goto' && dist(px, py, t.x, t.y) < 200) {
      m.step = 'eliminate';
      G.toast('Take out all five Vultures.');
    } else if (m.step === 'eliminate' && m.kills >= 5) {
      m.step = 'collect';
      G.pickups.push({ x: t.x, y: t.y, kind: 'cash', value: 1200, t: 0 });
      G.toast('The cut is yours — grab the cash.');
    } else if (m.step === 'collect' && G.scoreGot) {
      m.step = 'return';
      m.target = { x: G.city.markers.safehouse.x, y: G.city.markers.safehouse.y, label: 'Safehouse' };
      G.toast('Cash in hand. Back to the safehouse.');
    } else if (m.step === 'return' && dist(px, py, t.x, t.y) < 100) {
      completeMission(G);
    }
  }
}

/** The objective line the HUD shows. */
export function missionObjective(G) {
  const m = G.mission;
  if (!m) {
    return G.storyDone
      ? 'Free roam — explore Solmar Bay, grab cash, stay out of trouble.'
      : 'Talk to Lena at her bar to start the story.';
  }
  const steps = {
    goto: `Go to ${m.target.label}`,
    collect: m.index === 0 ? 'Grab the package' : 'Grab the cash',
    return: `Return to ${m.target.label}`,
    eliminate: `Take out the Vultures (${m.kills}/5)`,
  };
  return `${m.def.title}: ${steps[m.step] || m.def.title}`;
}

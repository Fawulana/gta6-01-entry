// The story: six linked missions from Lena Cruz, then free roam.
// Each mission is a small state machine of steps — go somewhere, collect
// something, lose the cops, eliminate the rivals — with a marker on the map
// and an objective line on the HUD.
import { playMissionDone, playRaceBeep } from './audio.js';
import { spawnRival } from './combat.js';
import { dist, RACE_TIME_LIMIT } from './config.js';
import { makeCar } from './vehicles.js';

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
  {
    id: 'race',
    title: 'The Street Race',
    giver: 'Lena Cruz',
    brief: 'The Vultures run a street race through Solmar Bay and the purse is fat. Four checkpoints, 90 seconds — beat the clock.',
    reward: 1200,
  },
  {
    id: 'heist',
    title: 'The Heist',
    giver: 'Lena Cruz',
    brief: 'A gold Comet GT sits at Auto Row, keys in it. Steal it, lose the heat, and deliver it to the safehouse.',
    reward: 1800,
  },
  {
    id: 'takeover',
    title: 'The Takeover',
    giver: 'Lena Cruz',
    brief: 'Finish it: eight Vultures hold the Marina Docks, two lieutenants among them. Take the pier and the take is yours.',
    reward: 2500,
  },
];

export function startMission(G, index) {
  const def = MISSIONS[index];
  const m = G.city.markers;
  // A fresh attempt clears the previous mission's pickup flags.
  G.scoreGot = false;
  G.packageGot = false;
  G.mission = {
    index, def, step: 'goto', kills: 0, killTarget: 5, done: false,
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
    G.mission.killTarget = 5;
    G.toast('The Vultures are waiting. Clear them out.');
  } else if (index === 3) {
    // The Street Race: four checkpoints on the road grid, 90 seconds.
    G.mission.checkpoints = [[600, 600], [1800, 1000], [2600, 1800], [1400, 2600]];
    G.mission.raceCp = 0;
    G.mission.raceT = RACE_TIME_LIMIT;
    G.mission.lastBeep = 4;
    G.mission.target = { x: 600, y: 600, label: 'Checkpoint 1/4' };
    playRaceBeep();
    G.toast('Street Race: 4 checkpoints, 90 seconds. Go!');
  } else if (index === 4) {
    // The Heist: a gold Comet GT sports car waits at Auto Row.
    const d = m.dealership;
    const heistCar = makeCar(d.x + 40, d.y, 0, '#d4af37', 'sports');
    heistCar.health = 220;
    heistCar.maxHealth = 220;
    G.cars.push(heistCar);
    G.mission.heistCar = heistCar;
    G.mission.step = 'steal';
    G.mission.target = { x: d.x, y: d.y, label: 'Auto Row' };
    G.toast('Steal the gold Comet GT at Auto Row.');
  } else if (index === 5) {
    // The Takeover: eight Vultures hold the docks, two lieutenants among them.
    const d = m.docks;
    const spots = [[-140, -80], [140, -90], [-60, 40], [120, 60], [-160, 90], [160, 110], [0, -140], [40, 140]];
    spawnRival(G, d.x + spots[0][0], d.y + spots[0][1], { health: 5, lieutenant: true, hold: true });
    spawnRival(G, d.x + spots[1][0], d.y + spots[1][1], { health: 5, lieutenant: true, hold: true });
    for (let i = 2; i < spots.length; i += 1) {
      spawnRival(G, d.x + spots[i][0], d.y + spots[i][1], { hold: true });
    }
    G.mission.killTarget = 8;
    G.mission.target = { x: d.x, y: d.y, label: 'Marina Docks' };
    G.toast('The Takeover: 8 Vultures hold the docks. Take the pier.');
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
  } else if (m.index === 3) {
    // The Street Race: beat the clock through the checkpoints.
    m.raceT -= dt;
    const sec = Math.ceil(m.raceT);
    if (sec <= 3 && sec >= 1 && sec < m.lastBeep) {
      m.lastBeep = sec;
      playRaceBeep();
    }
    if (m.raceT <= 0) {
      G.toast('Out of time — the race restarts.');
      startMission(G, 3);
      return;
    }
    const cp = m.checkpoints[m.raceCp];
    if (dist(px, py, cp[0], cp[1]) < 95) {
      m.raceCp += 1;
      if (m.raceCp >= m.checkpoints.length) {
        completeMission(G);
        return;
      }
      m.target = {
        x: m.checkpoints[m.raceCp][0],
        y: m.checkpoints[m.raceCp][1],
        label: `Checkpoint ${m.raceCp + 1}/4`,
      };
      G.toast(`Checkpoint ${m.raceCp}/4 — next one marked.`);
    }
  } else if (m.index === 4) {
    // The Heist: take the gold Comet GT, then deliver it to the safehouse.
    if (m.step === 'steal' && p.inCar === m.heistCar) {
      m.step = 'deliver';
      m.target = { x: G.city.markers.safehouse.x, y: G.city.markers.safehouse.y, label: 'Safehouse' };
      G.addWanted(2);
      G.toast('+2 stars! Deliver the Comet GT to the safehouse.');
    } else if (m.step === 'deliver' && m.heistCar && dist(m.heistCar.x, m.heistCar.y, t.x, t.y) < 100) {
      completeMission(G);
    }
  } else if (m.index === 5) {
    // The Takeover: clear all eight Vultures at the docks, take the cash.
    if (m.step === 'goto' && dist(px, py, t.x, t.y) < 260) {
      m.step = 'eliminate';
      G.toast('Take the pier — all eight Vultures, lieutenants first.');
    } else if (m.step === 'eliminate' && m.kills >= 8) {
      m.step = 'collect';
      G.pickups.push({ x: t.x, y: t.y, kind: 'cash', value: 1500, t: 0 });
      G.toast('The docks are yours — grab the take.');
    } else if (m.step === 'collect' && G.scoreGot) {
      m.step = 'return';
      m.target = { x: G.city.markers.safehouse.x, y: G.city.markers.safehouse.y, label: 'Safehouse' };
      G.toast('Take in hand. Back to the safehouse.');
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
    eliminate: `Take out the Vultures (${m.kills}/${m.killTarget || 5})`,
    steal: 'Steal the gold Comet GT',
    deliver: `Deliver the Comet GT to ${m.target.label}`,
  };
  if (m.index === 3) {
    return `M4/6 ${m.def.title}: Checkpoint ${m.raceCp + 1}/4 — ${Math.max(0, Math.ceil(m.raceT))}s left`;
  }
  return `M${m.index + 1}/6 ${m.def.title}: ${steps[m.step] || m.def.title}`;
}

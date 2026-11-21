// Missions for Solmar Bay: six linked jobs for fixer Lena Cruz, each a
// small state machine with steps, a map marker and a HUD objective line.
// The module owns the current mission and reports completion back to the
// main state, which pays out and saves.
import { MISSIONS, SAFEHOUSE, PICKUP_POINT, STORE_POINT, AUTO_ROW_GT, DOCKS, RACE_CHECKPOINTS, RACE_TIME, STASH_SPOTS, STASH_REWARD } from './config.js';
import { makeCar } from './vehicles.js';
import { makeRival } from './combat.js';
import { addWanted, setWanted } from './police.js';

export function startMission(state, index) {
  const def = MISSIONS[index];
  if (!def) return null;
  const mission = {
    def,
    index,
    step: 0,
    timer: 0,
    robProgress: 0,
    raceCheckpoint: 0,
    raceTimeLeft: RACE_TIME,
    rivalsTotal: 0,
    rivalsLeft: 0,
    target: null,
    done: false,
  };
  state.mission = mission;
  state.missionMarkers = [];
  switch (def.id) {
    case 'M1':
      mission.target = { x: PICKUP_POINT.x, y: PICKUP_POINT.y };
      mission.stepText = 'Pick up the package at the blue marker';
      break;
    case 'M2':
      mission.target = { x: SAFEHOUSE.x, y: SAFEHOUSE.y };
      mission.stepText = 'Lose the cops, then reach the safehouse';
      setWanted(state, 2);
      break;
    case 'M3':
      mission.target = { x: STORE_POINT.x, y: STORE_POINT.y };
      mission.stepText = 'Get to the corner store on Palm Row';
      break;
    case 'M4':
      mission.target = { x: RACE_CHECKPOINTS[0].x, y: RACE_CHECKPOINTS[0].y };
      mission.stepText = 'Reach checkpoint 1 of 4 — 90 seconds';
      mission.raceTimeLeft = RACE_TIME;
      mission.racePoints = RACE_CHECKPOINTS;
      break;
    case 'M5': {
      mission.target = { x: AUTO_ROW_GT.x, y: AUTO_ROW_GT.y };
      mission.stepText = 'Steal the gold Comet GT at Auto Row';
      const gt = makeCar('comet', AUTO_ROW_GT.x, AUTO_ROW_GT.y, -Math.PI / 2, { parked: true, gold: true });
      gt.isHeistCar = true;
      state.cars.push(gt);
      mission.heistCar = gt;
      break;
    }
    case 'M6': {
      mission.target = { x: DOCKS.x, y: DOCKS.y };
      mission.stepText = 'Clear the docks — 8 Vultures, 2 lieutenants';
      const spots = [
        [420, 330, true], [620, 330, false], [480, 520, false], [700, 480, true],
        [380, 620, false], [760, 620, false], [560, 420, false], [660, 700, false],
      ];
      mission.rivalsTotal = spots.length;
      mission.rivalsLeft = spots.length;
      for (const [x, y, lt] of spots) {
        const r = makeRival(x, y, { hp: lt ? 5 : 3, lieutenant: lt, name: lt ? 'Vulture Lieutenant' : 'Vulture' });
        state.rivals.push(r);
      }
      break;
    }
    default:
      break;
  }
  state.flashMessage(`${def.id}/6 ${def.name.toUpperCase()} — $${def.reward} REWARD`, 4);
  return mission;
}

export function completeMission(state) {
  const m = state.mission;
  if (!m || m.done) return;
  m.done = true;
  state.cash += m.def.reward;
  state.save.missionsDone = Math.max(state.save.missionsDone, m.index + 1);
  state.save.cash = state.cash;
  if (state.persistSave) state.persistSave();
  if (state.sound) state.sound.missionDone();
  state.flashMessage(`MISSION COMPLETE — ${m.def.name.toUpperCase()}  +$${m.def.reward}`, 4);
  state.spawnConfetti(state.player.x, state.player.y);
  if (m.index === 3 && state.save.bestRace !== null) {
    // best race time was recorded by the race step itself
  }
  if (m.index >= MISSIONS.length - 1) {
    state.save.storyDone = true;
    if (state.persistSave) state.persistSave();
    state.flashMessage('STORY COMPLETE — SOLMAR BAY IS YOURS', 6);
    return;
  }
  startMission(state, m.index + 1);
}

// Distance from the player (or their car) to a point.
function playerDist(state, x, y) {
  const p = state.player;
  const t = p.inCar || p;
  return Math.hypot(t.x - x, t.y - y);
}

export function updateMission(state, dt) {
  const m = state.mission;
  if (!m || m.done) return;
  const p = state.player;

  switch (m.def.id) {
    case 'M1': {
      if (m.step === 0) {
        if (playerDist(state, m.target.x, m.target.y) < 60) {
          m.step = 1;
          m.target = { x: SAFEHOUSE.x, y: SAFEHOUSE.y };
          m.stepText = 'Deliver the package to the safehouse';
          if (state.sound) state.sound.chime();
          state.flashMessage('PACKAGE SECURED — TAKE IT TO THE SAFEHOUSE', 3);
        }
      } else if (playerDist(state, SAFEHOUSE.x, SAFEHOUSE.y) < 70) {
        completeMission(state);
      }
      break;
    }
    case 'M2': {
      if (state.wanted === 0 && playerDist(state, SAFEHOUSE.x, SAFEHOUSE.y) < 70) {
        completeMission(state);
      } else if (state.wanted === 0) {
        m.stepText = 'Clean — now reach the safehouse';
      } else {
        m.stepText = `Lose the cops (${state.wanted}★), then reach the safehouse`;
      }
      break;
    }
    case 'M3': {
      if (m.step === 0) {
        if (playerDist(state, STORE_POINT.x, STORE_POINT.y) < 70) {
          m.step = 1;
          m.stepText = 'Hold E at the till — keep the till filling';
          state.flashMessage('HOLD E TO EMPTY THE TILL', 2.5);
        }
      } else if (m.step === 1) {
        if (playerDist(state, STORE_POINT.x, STORE_POINT.y) < 80 && state.input.down('KeyE')) {
          m.robProgress += dt / 6; // six seconds at the till
          if (m.robProgress >= 1) {
            m.step = 2;
            m.target = { x: SAFEHOUSE.x, y: SAFEHOUSE.y };
            m.stepText = 'The till is empty — run to the safehouse';
            addWanted(state, 2);
            state.flashMessage('CLEAN GETAWAY — LOSE THE HEAT', 3);
          }
        } else {
          m.robProgress = Math.max(0, m.robProgress - dt * 0.1);
        }
      } else if (playerDist(state, SAFEHOUSE.x, SAFEHOUSE.y) < 70) {
        completeMission(state);
      }
      break;
    }
    case 'M4': {
      m.raceTimeLeft -= dt;
      if (m.raceTimeLeft <= 0) {
        m.stepText = 'Out of time — the race restarts';
        state.flashMessage('TIME UP — RACE RESTARTED', 3);
        startMission(state, 3); // restart the race
        return;
      }
      const cp = RACE_CHECKPOINTS[m.raceCheckpoint];
      if (cp && playerDist(state, cp.x, cp.y) < 70) {
        m.raceCheckpoint += 1;
        if (state.sound) state.sound.checkpoint();
        if (m.raceCheckpoint >= RACE_CHECKPOINTS.length) {
          const used = RACE_TIME - m.raceTimeLeft;
          if (state.save.bestRace === null || used < state.save.bestRace) {
            state.save.bestRace = Math.round(used * 10) / 10;
            if (state.persistSave) state.persistSave();
          }
          completeMission(state);
        } else {
          m.target = { x: RACE_CHECKPOINTS[m.raceCheckpoint].x, y: RACE_CHECKPOINTS[m.raceCheckpoint].y };
          m.stepText = `Checkpoint ${m.raceCheckpoint + 1} of 4 — ${Math.ceil(m.raceTimeLeft)}s left`;
        }
      } else {
        m.stepText = `Checkpoint ${m.raceCheckpoint + 1} of 4 — ${Math.ceil(m.raceTimeLeft)}s left`;
      }
      break;
    }
    case 'M5': {
      if (m.step === 0) {
        if (p.inCar && p.inCar.isHeistCar) {
          m.step = 1;
          m.target = { x: SAFEHOUSE.x, y: SAFEHOUSE.y };
          m.stepText = 'The Comet is yours — deliver it to the safehouse';
          addWanted(state, 2);
          state.flashMessage('ALARM TRIPPED — 2 STARS — RUN IT TO THE SAFEHOUSE', 3.5);
        }
      } else if (p.inCar && p.inCar.isHeistCar && playerDist(state, SAFEHOUSE.x, SAFEHOUSE.y) < 80) {
        completeMission(state);
      } else if (!p.inCar || !p.inCar.isHeistCar) {
        m.stepText = 'Get back in the gold Comet GT';
        m.target = { x: m.heistCar.x, y: m.heistCar.y };
      }
      break;
    }
    case 'M6': {
      const alive = state.rivals.filter((r) => !r.dead).length;
      m.rivalsLeft = alive;
      m.stepText = `Clear the docks — ${alive} Vultures left`;
      if (alive === 0) completeMission(state);
      break;
    }
    default:
      break;
  }
}

// --- Stashes ----------------------------------------------------------------
export function tryCollectStash(state) {
  const p = state.player;
  const t = p.inCar || p;
  for (let i = 0; i < STASH_SPOTS.length; i += 1) {
    if (state.save.stashes.includes(i)) continue;
    const s = STASH_SPOTS[i];
    if (Math.hypot(t.x - s.x, t.y - s.y) < 55) {
      state.save.stashes.push(i);
      state.cash += STASH_REWARD;
      state.save.cash = state.cash;
      if (state.persistSave) state.persistSave();
      if (state.sound) state.sound.chime();
      state.flashMessage(`STASH FOUND — +$${STASH_REWARD}  (${state.save.stashes.length}/10)`, 3);
      state.spawnConfetti(s.x, s.y);
      return true;
    }
  }
  return false;
}

export function stashCount(state) {
  return state.save.stashes.length;
}

// Palmetto Bay — the story.
//
// Six missions from config.js, each a chain of steps the player works
// through. This file owns the mission runtime: what the current step asks,
// when a step completes, what a mission pays, and what failing one costs.
// The game loop asks it every frame.

import { MISSIONS } from './config.js';
import { distance } from './world.js';

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: false,
    done: false,
    timer: 0,
    count: 0,
    message: '',
    messageTimer: 0,
    packages: [],
  };
}

export function currentMission(state) {
  return MISSIONS[state.index] ?? null;
}

export function currentStep(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  return mission.steps[state.step] ?? null;
}

export function startMission(state, index) {
  const mission = MISSIONS[index];
  if (!mission) return false;
  state.index = index;
  state.step = 0;
  state.active = true;
  state.done = false;
  state.timer = mission.failTimer ?? 0;
  state.count = 0;
  state.packages = [];
  state.message = mission.title;
  state.messageTimer = 3;
  return true;
}

export function showMessage(state, text, seconds) {
  state.message = text;
  state.messageTimer = seconds ?? 2.5;
}

export function updateMissionTimer(state, dt) {
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (!state.active) return 'none';
  if (state.timer > 0) {
    state.timer -= dt;
    if (state.timer <= 0) return 'failed';
  }
  return 'none';
}

function advanceStep(state) {
  const mission = currentMission(state);
  state.step++;
  state.count = 0;
  if (state.step >= mission.steps.length) {
    state.active = false;
    state.done = true;
    return 'complete';
  }
  return 'advanced';
}

// The per-frame mission check. The game passes what happened this frame:
// where the player is, what they drive, what they shot, what they picked
// up. Returns 'complete', 'failed', 'advanced' or 'none'.
export function updateMission(state, ctx) {
  if (!state.active) return 'none';
  const step = currentStep(state);
  if (!step) return 'none';
  const { player, playerCar } = ctx;

  if (step.type === 'goto') {
    if (distance(player.x, player.y, step.x, step.y) < 70) {
      showMessage(state, 'Objective reached', 2);
      return advanceStep(state);
    }
  }
  if (step.type === 'deliver') {
    if (!playerCar) return 'none';
    if (distance(playerCar.x, playerCar.y, step.x, step.y) < 80) {
      showMessage(state, 'Delivered', 2);
      return advanceStep(state);
    }
  }
  if (step.type === 'steal') {
    if (playerCar && playerCar.kind === 'aurum') {
      showMessage(state, 'Aurum GT stolen — lose the cops and deliver it', 3);
      return advanceStep(state);
    }
  }
  if (step.type === 'shoot') {
    if (ctx.enemiesDown >= step.count) {
      showMessage(state, 'They got the message', 2);
      return advanceStep(state);
    }
  }
  if (step.type === 'collect') {
    if (state.count >= step.count) {
      showMessage(state, 'Package secured', 2);
      return advanceStep(state);
    }
  }
  if (step.type === 'escape') {
    if (ctx.wantedStars === 0) {
      showMessage(state, 'Heat is off', 2);
      return advanceStep(state);
    }
  }
  return 'none';
}

export function missionObjectiveText(state) {
  const mission = currentMission(state);
  if (!mission) return 'Palmetto Bay is yours — free roam';
  if (!state.active && !state.done) return `Next: ${mission.title} — head to the marker`;
  if (state.done) return `${mission.title} complete — $${mission.reward} earned`;
  const step = currentStep(state);
  if (!step) return mission.title;
  if (step.type === 'shoot') return `${step.label} (${Math.max(0, step.count - (state.count || 0))} left)`;
  if (step.type === 'collect') return `${step.label} (${state.count}/${step.count})`;
  return step.label;
}

export function missionMarker(state) {
  const step = currentStep(state);
  if (!step || step.x === undefined) return null;
  return { x: step.x, y: step.y, label: step.label };
}

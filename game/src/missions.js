// The story: six missions, one arc — a newcomer lands in Palmetto Bay, runs
// errands for Rico, earns heat, cools off, and ends the night stealing the gold
// Aurum GT from the marina. Each mission is a short list of stages; a stage is
// a place to reach, a thing to grab, a level to lose, or a car to steal.

import { MISSION_REWARDS } from './config.js';

export const MISSIONS = [
  {
    id: 'm1', title: 'First Day in Palmetto',
    briefing: 'Rico is waiting at the marina. Get there — on foot or in a car, your call.',
    stages: [
      { kind: 'goto', text: 'Meet Rico at the marina', x: 3700, y: 300, radius: 90 },
    ],
  },
  {
    id: 'm2', title: 'The Pickup',
    briefing: 'A package is stashed in the Barrio. Grab it and drop it off — and expect company.',
    stages: [
      { kind: 'interact', text: 'Grab the package in the Barrio', x: 920, y: 1000, radius: 70 },
      { kind: 'goto', text: 'Deliver the package to the drop-off', x: 920, y: 1800, radius: 90 },
    ],
  },
  {
    id: 'm3', title: 'Getaway',
    briefing: 'The cops are onto the crew. Drive to the Palmetto Tower in 100 seconds — roadblocks ahead.',
    stages: [
      { kind: 'timed-goto', text: 'Reach the Palmetto Tower before the clock runs out', x: 1775, y: 1250, radius: 110, time: 100 },
    ],
  },
  {
    id: 'm4', title: 'Cooling Off',
    briefing: 'Lay low until the heat dies down, then meet Rico in the park.',
    stages: [
      { kind: 'lose', text: 'Lose the wanted level', x: 0, y: 0, radius: 0 },
      { kind: 'goto', text: 'Meet Rico in the park', x: 2650, y: 1450, radius: 90 },
    ],
  },
  {
    id: 'm5', title: 'Stash Run',
    briefing: 'Three stash chests are hidden around the city. Find them all.',
    stages: [
      { kind: 'collect', text: 'Collect the stash chests (0/3)', x: 2920, y: 600, radius: 80, count: 3 },
    ],
  },
  {
    id: 'm6', title: 'King of the Bay',
    briefing: 'The gold Aurum GT is parked at the marina. Steal it, lose the cops, bring it home.',
    stages: [
      { kind: 'steal', text: 'Steal the gold Aurum GT at the marina', x: 3950, y: 700, radius: 80 },
      { kind: 'deliver', text: 'Deliver the Aurum to the downtown garage', x: 1500, y: 1300, radius: 110 },
    ],
  },
];

export function createMissions(save) {
  return {
    index: Math.min(save.mission || 0, MISSIONS.length),
    stage: 0,
    timer: 0,
    collected: 0,
    interacted: false,
    allDone: (save.mission || 0) >= MISSIONS.length,
    justFinished: null,
    failed: false,
  };
}

export function currentMission(missions) {
  if (missions.index >= MISSIONS.length) return null;
  return MISSIONS[missions.index];
}

export function currentStage(missions) {
  const mission = currentMission(missions);
  if (!mission) return null;
  return mission.stages[missions.stage];
}

export function objectiveText(missions) {
  const mission = currentMission(missions);
  const stage = currentStage(missions);
  if (!mission || !stage) return '';
  if (stage.kind === 'collect') return `Collect the stash chests (${missions.collected}/${stage.count})`;
  if (stage.kind === 'timed-goto') return `${stage.text} — ${Math.ceil(missions.timer)}s`;
  return stage.text;
}

export function objectiveTarget(missions) {
  const stage = currentStage(missions);
  if (!stage || stage.kind === 'lose') return null;
  if (stage.kind === 'collect') return { x: stage.x, y: stage.y };
  return { x: stage.x, y: stage.y };
}

/** Begin a mission's stage side-effects (heat, timers, chest spawns). */
export function enterStage(missions, stage) {
  if (!stage) return {};
  missions.timer = stage.time || 0;
  missions.collected = 0;
  missions.interacted = false;
  const effects = {};
  if (stage.kind === 'timed-goto') effects.heat = 2;
  if (stage.kind === 'steal') effects.spawnChests = false;
  return effects;
}

/**
 * Advance the mission state. ctx: { player, playerCar, police, interacted }.
 * Returns { done, failed, message, reward } — done when the whole mission ends.
 */
export function updateMissions(missions, ctx) {
  const mission = currentMission(missions);
  if (!mission) return {};
  const stage = mission.stages[missions.stage];
  if (!stage) return {};
  const px = ctx.playerCar ? ctx.playerCar.x : ctx.player.x;
  const py = ctx.playerCar ? ctx.playerCar.y : ctx.player.y;
  let advance = false;
  let failed = false;

  if (stage.kind === 'goto' || stage.kind === 'deliver') {
    if (Math.hypot(px - stage.x, py - stage.y) < stage.radius) advance = true;
  } else if (stage.kind === 'timed-goto') {
    missions.timer -= ctx.dt;
    if (Math.hypot(px - stage.x, py - stage.y) < stage.radius) advance = true;
    else if (missions.timer <= 0) failed = true;
  } else if (stage.kind === 'interact') {
    if (ctx.interacted && Math.hypot(px - stage.x, py - stage.y) < stage.radius) advance = true;
  } else if (stage.kind === 'lose') {
    if (ctx.police.stars === 0) advance = true;
  } else if (stage.kind === 'collect') {
    if (missions.collected >= stage.count) advance = true;
  } else if (stage.kind === 'steal') {
    if (ctx.playerCar && ctx.playerCar.gold) advance = true;
  }

  if (failed) {
    missions.failed = true;
    return { failed: true, message: `Mission failed: ${mission.title} — try again` };
  }
  if (!advance) return {};

  missions.stage += 1;
  missions.failed = false;
  if (missions.stage >= mission.stages.length) {
    const reward = MISSION_REWARDS[missions.index] || 0;
    missions.index += 1;
    missions.stage = 0;
    missions.justFinished = mission.id;
    if (missions.index >= MISSIONS.length) missions.allDone = true;
    return { done: true, reward, message: `Mission complete: ${mission.title} — +$${reward}` };
  }
  const next = mission.stages[missions.stage];
  const effects = enterStage(missions, next);
  return { advanced: true, message: next.text, effects };
}

export function resetMission(missions) {
  missions.stage = 0;
  const stage = currentStage(missions);
  if (stage) enterStage(missions, stage);
  missions.failed = false;
}

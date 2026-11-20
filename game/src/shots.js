// The screenshot scenes behind ?shot=chase|street|mission|title. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { startMission } from './missions.js';
import { makeCar, spawnTrafficCar } from './vehicles.js';
import { seedPeds } from './traffic.js';
import { addWanted } from './police.js';

const CHASE_SECONDS = 3;
const STREET_SECONDS = 3;
const MISSION_SECONDS = 4;
const TITLE_SECONDS = 10;

/** Hold W and steer the car toward the road heading (east, angle 0). */
function driveEast(G) {
  const keys = G.input.keys;
  keys.add('KeyW');
  const car = G.player.inCar;
  if (!car) return;
  const diff = car.angle; // desired heading is 0
  keys.delete('KeyA');
  keys.delete('KeyD');
  if (diff > 0.06) keys.add('KeyA');
  else if (diff < -0.06) keys.add('KeyD');
}

/** Walk east along the sidewalk, facing the way we walk. */
function walkEast(G) {
  const keys = G.input.keys;
  keys.add('KeyD');
  G.input.mouse.worldX = G.player.x + 120;
  G.input.mouse.worldY = G.player.y;
}

/** Aim at the nearest living rival and hold the trigger. */
function fightRivals(G) {
  const p = G.player;
  let best = null;
  let bestD = Infinity;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (best) {
    G.input.mouse.worldX = best.x;
    G.input.mouse.worldY = best.y;
    G.input.mouse.down = true;
  }
}

function runSteps(G, stepFn, seconds, steer) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (steer) steer(G);
    stepFn(G, STEP);
  }
}

/**
 * Set `G` to the named scene and return the screen to draw over it.
 * `stepFn` is the game's own fixed step, so the scenes run the real rules.
 */
export function stageShot(name, G, stepFn) {
  if (name === 'chase') {
    // Cover: a 4-star dusk chase down a downtown avenue in a red sports car,
    // police in line behind and a roadblock holding the road ahead.
    startMission(G, 0);
    G.dusk = true;
    const car = makeCar(600, 1000, 0, '#c0392b', 'sports');
    car.health = 400; // the staged chase runs the full scene without a wreck
    car.maxHealth = 400;
    G.cars.push(car);
    G.player.inCar = car;
    G.player.x = car.x;
    G.player.y = car.y;
    G.camera.x = car.x;
    G.camera.y = car.y;
    addWanted(G, 4);
    const cops = [[-360, 0], [-500, 0], [-640, 0]];
    for (const [dx, dy] of cops) {
      const cop = makeCar(car.x + dx, car.y + dy, 0, '#1a1a1a', 'police');
      cop.police = true;
      cop.speed = 430;
      G.cars.push(cop);
    }
    // Roadblock: two cruisers sideways across the road ahead, holding.
    // Placed a full drive ahead so the chase reaches them in frame.
    for (const off of [-30, 30]) {
      const block = makeCar(car.x + 1700, 1000 + off, Math.PI / 2, '#1a1a1a', 'police');
      block.police = true;
      block.blockT = 2.5;
      G.cars.push(block);
    }
    spawnTrafficCar(G, 2000, 1000);
    spawnTrafficCar(G, 2300, 1000);
    // Pedestrians a block south, off the chase line, so the cover stays clean.
    seedPeds(G, 1800, 1400, 14);
    // Keep the chase corridor itself clear of pedestrians.
    G.peds = G.peds.filter((pd) => Math.abs(pd.y - 1000) > 80);
    runSteps(G, stepFn, CHASE_SECONDS, driveEast);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'street') {
    // On foot downtown: a red sports car and a taxi parked nearby, peds on
    // the sidewalk, and a gold stash chest waiting at the corner.
    startMission(G, 0);
    G.player.x = 1750;
    G.player.y = 1790;
    G.player.angle = 0;
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    const sports = makeCar(2120, 1768, 0, '#c0392b', 'sports');
    G.cars.push(sports);
    const taxi = makeCar(2000, 1815, Math.PI, '#f5d76e', 'taxi');
    G.cars.push(taxi);
    seedPeds(G, 1800, 1800, 30);
    spawnTrafficCar(G, 1800, 1800);
    spawnTrafficCar(G, 1800, 1400);
    spawnTrafficCar(G, 1800, 2200);
    runSteps(G, stepFn, STREET_SECONDS, walkEast);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // The Takeover (finale, &finale=1): eight Vultures hold the docks, the
    // lieutenants gold-ringed, cash drops from every rival that falls.
    const finale = new URLSearchParams(window.location.search).get('finale') === '1';
    startMission(G, finale ? 5 : 2);
    G.player.x = 2450;
    G.player.y = 1400;
    G.player.angle = 0;
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    G.player.cash = 2400;
    if (finale) {
      G.player.x = 2400;
      G.player.y = 2620;
      G.camera.x = G.player.x;
      G.camera.y = G.player.y;
    }
    runSteps(G, stepFn, MISSION_SECONDS, fightRivals);
    return { screen: SCREEN_PLAY };
  }
  // Title: dusk over downtown with the traffic rolling.
  G.dusk = true;
  G.camera.x = 1800;
  G.camera.y = 1800;
  seedPeds(G, 1800, 1800, 18);
  spawnTrafficCar(G, 1800, 1800);
  spawnTrafficCar(G, 1800, 1400);
  runSteps(G, stepFn, TITLE_SECONDS, null);
  return { screen: SCREEN_TITLE };
}

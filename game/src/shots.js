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

const CHASE_SECONDS = 4;
const STREET_SECONDS = 6;
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
    // Cover: a 3-star chase down a downtown avenue, police closing in.
    startMission(G, 0);
    const car = makeCar(600, 1000, 0, '#c0392b', 'sedan');
    car.health = 400; // the staged chase runs the full scene without a wreck
    G.cars.push(car);
    G.player.inCar = car;
    G.player.x = car.x;
    G.player.y = car.y;
    G.camera.x = car.x;
    G.camera.y = car.y;
    addWanted(G, 3);
    const cops = [[-380, -40], [-520, 50], [-450, -80]];
    for (const [dx, dy] of cops) {
      const cop = makeCar(car.x + dx, car.y + dy, 0, '#1a1a1a', 'police');
      cop.police = true;
      cop.speed = 430;
      G.cars.push(cop);
    }
    spawnTrafficCar(G, 2000, 1000);
    spawnTrafficCar(G, 2300, 1000);
    seedPeds(G, 1800, 1000, 14);
    runSteps(G, stepFn, CHASE_SECONDS, driveEast);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'street') {
    // On foot downtown, traffic and pedestrians all around.
    startMission(G, 0);
    G.player.x = 1750;
    G.player.y = 1790;
    G.player.angle = 0;
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    seedPeds(G, 1800, 1800, 30);
    spawnTrafficCar(G, 1800, 1800);
    spawnTrafficCar(G, 1800, 1400);
    spawnTrafficCar(G, 1800, 2200);
    runSteps(G, stepFn, STREET_SECONDS, walkEast);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // The Score: clearing the Vultures at the Old Warehouse.
    startMission(G, 2);
    G.player.x = 2450;
    G.player.y = 1400;
    G.player.angle = 0;
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    G.player.cash = 2400;
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

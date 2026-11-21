// Staged screenshots for Solmar Bay. ?shot=chase|street|mission|title with
// an optional ?seed=N builds a deterministic scene, lets it settle for a
// few frames, then sets window.__shotReady so the capture driver knows the
// frame is composed. Nothing here changes normal play: without ?shot the
// game just starts on the title screen.
import { WORLD } from './config.js';
import { makeCar } from './vehicles.js';
import { makeRival } from './combat.js';
import { startMission } from './missions.js';
import { spawnRoadblock, setWanted } from './police.js';

export function parseShotQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    shot: params.get('shot'),
    seed: Number(params.get('seed') || 7),
  };
}

// Place the player in a car at a position, facing an angle.
function putPlayerInCar(state, kind, x, y, angle) {
  const car = makeCar(kind, x, y, angle, { parked: false });
  car.speed = 0;
  state.cars.push(car);
  const p = state.player;
  p.x = x;
  p.y = y;
  p.angle = angle;
  p.inCar = car;
  p.hp = 100;
  state.camera.x = x;
  state.camera.y = y;
  return car;
}

export function setupShot(state, shot, seed) {
  const rng = state.rng;
  const p = state.player;
  state.screen = 'playing';
  state.shotMode = shot;
  state.shotFrames = 0;
  if (shot === 'title') {
    state.screen = 'title';
    return;
  }
  if (shot === 'chase') {
    // 4-star dusk chase: red sports car at speed, cops behind, roadblock ahead.
    const car = putPlayerInCar(state, 'sports', 1400, 1400, 0);
    car.speed = 520;
    car.color = '#d23b2e';
    setWanted(state, 4);
    // Two cops closing in behind.
    for (const [dx, dy] of [[-260, 40], [-330, -30]]) {
      const cop = makeCar('police', 1400 + dx, 1400 + dy, 0, { traffic: false });
      cop.wanted = true;
      cop.speed = 480;
      state.cops.push(cop);
      state.cars.push(cop);
    }
    // Roadblock ahead on the same road.
    spawnRoadblock(state, rng);
    // A couple of traffic cars to dodge.
    const t1 = makeCar('sedan', 1750, 1384, 0, { traffic: true, roadAxis: 'h', roadLine: 1400, dir: 1 });
    t1.speed = 150;
    const t2 = makeCar('taxi', 1900, 1416, Math.PI, { traffic: true, roadAxis: 'h', roadLine: 1400, dir: -1 });
    t2.speed = 160;
    state.cars.push(t1, t2);
    state.camera.x = 1500;
    state.camera.y = 1400;
    state.mission.stepText = 'Lose the cops — 4 stars';
    return;
  }
  if (shot === 'street') {
    // Player on foot by the downtown parking-garage stash (spot 9): a blue
    // sports car, a taxi on the road, peds on the sidewalk, chest in view.
    p.x = 1080;
    p.y = 1160;
    p.angle = -Math.PI / 2;
    p.inCar = null;
    const car = makeCar('sports', 1140, 1180, Math.PI / 2, { parked: true });
    car.color = '#2e6fd2';
    state.cars.push(car);
    const taxi = makeCar('taxi', 1300, 1016, 0, { traffic: true, roadAxis: 'h', roadLine: 1000, dir: 1 });
    taxi.speed = 120;
    state.cars.push(taxi);
    // A few peds strolling the sidewalk.
    for (const ped of state.peds.slice(0, 6)) {
      ped.x = 1020 + Math.random() * 160;
      ped.y = 1100 + Math.random() * 90;
    }
    state.camera.x = 1080;
    state.camera.y = 1120;
    state.mission.stepText = 'Pick up the package at the blue marker';
    return;
  }
  if (shot === 'mission') {
    // The finale at the docks: rivals, lieutenants gold-ringed, player
    // on foot with the objective live.
    startMission(state, 5);
    p.x = 520;
    p.y = 760;
    p.angle = -Math.PI / 2;
    p.inCar = null;
    // Muzzle flash + a couple of sparks for action.
    state.muzzle = { x: 560, y: 700, t: 0.09, angle: -Math.PI / 2 };
    state.spawnSparks(560, 700, 8, '#ffd76a');
    state.camera.x = 560;
    state.camera.y = 520;
    return;
  }
  // Unknown shot: fall back to the title screen.
  state.screen = 'title';
}

// Called once per frame while a shot is staged. After the scene has had a
// few frames to settle (particles, sirens, camera), flag readiness.
export function updateShot(state) {
  if (!state.shotMode) return;
  state.shotFrames += 1;
  if (state.shotMode === 'chase' && state.shotFrames === 2) {
    // Keep the chase moving so skid/speed reads in the frame.
    if (state.player.inCar) state.player.inCar.speed = 520;
  }
  if (state.shotFrames >= 12 && !window.__shotReady) {
    window.__shotReady = true;
  }
}

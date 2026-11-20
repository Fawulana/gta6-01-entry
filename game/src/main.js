// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens:
// title, play, paused, help, busted, wasted and mission-complete. The whole
// game state lives in one object `G`, passed to every system.
//
// ?seed=N fixes the city. ?shot=chase|street|mission|title (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import {
  PLAYER_HEALTH, PLAYER_RADIUS, PLAYER_RUN, PLAYER_WALK, STEP, WORLD_H, WORLD_W,
  clamp, dist,
} from './config.js';
import { makeRng } from './random.js';
import { generateCity, isOnRoad, resolveBuildings } from './city.js';
import { createInput } from './input.js';
import {
  ensureAudio, playBusted, playCrash, playMissionDone, playPickup,
  playShot, setEngine, setMuted, setSiren, startMusic,
} from './audio.js';
import {
  drivePlayerCar, makeCar, nearestCar, spawnTrafficCar, stealCar,
  updateTrafficCar,
} from './vehicles.js';
import { seedPeds, updatePeds } from './traffic.js';
import { addWanted, updatePolice } from './police.js';
import { playerShoot, updateCombat } from './combat.js';
import { missionObjective, startMission, updateMissions } from './missions.js';
import {
  SCREEN_BUSTED, SCREEN_HELP, SCREEN_MISSION, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_TITLE, SCREEN_WASTED, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';
import { hasSave, loadSave, saveGame } from './save.js';

const MAX_FRAME = 0.25;
const SAVE_COOLDOWN = 10;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

/** Build a fresh game state for a seed. */
export function createGame(gameSeed) {
  const rng = makeRng(gameSeed);
  const city = generateCity(gameSeed);
  const safe = city.markers.safehouse;
  const G = {
    city, rng, seed: gameSeed,
    input: createInput(canvas),
    time: 0, screen: SCREEN_TITLE,
    player: {
      x: safe.x, y: safe.y + 60, angle: 0, health: PLAYER_HEALTH,
      cash: 250, inCar: null, shootCd: 0, invuln: 0,
    },
    cars: [], peds: [], enemies: [], bullets: [], pickups: [], particles: [],
    toasts: [], events: [],
    wanted: 0, wantedT: 0, lastCrimeT: -100, bustedT: 0, missionHeat: false,
    mission: null, missionsDone: 0, storyDone: false,
    camera: { x: safe.x, y: safe.y },
    view: { vx: 0, vy: 0, cw: 1280, ch: 720 },
    sirenOn: false, dusk: false, hasSave: hasSave(),
    lastMissionTitle: '', lastMissionReward: 0,
    packageGot: false, scoreGot: false, lastSaveT: -100,
    trafficTimer: 0, pedTimer: 0, pickupTimer: 0,
  };
  // A parked car outside the safehouse and life on the streets from the start.
  const starter = makeCar(safe.x + 90, safe.y, Math.PI / 2, '#2980b9', 'sedan');
  G.cars.push(starter);
  // Systems call these as methods on G; bind them here.
  G.toast = (text) => toast(G, text);
  G.addWanted = (n) => addWanted(G, n);
  for (let i = 0; i < 10; i += 1) spawnTrafficCar(G, 1800, 1800);
  seedPeds(G, 1800, 1800, 24);
  scatterCash(G, 5);
  return G;
}

export function toast(G, text) {
  G.toasts.push({ text, t: 0 });
  if (G.toasts.length > 3) G.toasts.shift();
}

function spawnParticles(G, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = G.rng.range(0, Math.PI * 2);
    const s = G.rng.range(speed * 0.3, speed);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: G.rng.range(0.3, 0.8), maxLife: 0.8, color,
      size: G.rng.range(2, 5),
    });
  }
}

function scatterCash(G, count) {
  for (let i = 0; i < count; i += 1) {
    const road = G.rng.pick(G.city.roadsX);
    const along = G.rng.range(300, WORLD_H - 300);
    const side = G.rng.chance(0.5) ? 1 : -1;
    G.pickups.push({
      x: road + side * 60, y: along, kind: 'cash',
      value: G.rng.pick([50, 50, 100, 100, 250]), t: 0,
    });
  }
}

function updatePlayerOnFoot(G, dt) {
  const p = G.player;
  const input = G.input;
  const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
  const speed = run ? PLAYER_RUN : PLAYER_WALK;
  let dx = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0)
    - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
  let dy = (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0)
    - (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const nx = p.x + dx * speed * dt;
    const ny = p.y + dy * speed * dt;
    const fixed = resolveBuildings(G.city, nx, ny, PLAYER_RADIUS);
    p.x = clamp(fixed.x, 20, WORLD_W - 20);
    p.y = clamp(fixed.y, 20, WORLD_H - 20);
  }
  // Face the mouse; click or Space fires.
  p.angle = Math.atan2(G.input.mouse.worldY - p.y, G.input.mouse.worldX - p.x);
  if (G.input.mouse.down || input.isDown('Space')) playerShoot(G);
  // E: get in the nearest car. F: steal it.
  if (input.wasPressed('KeyE')) {
    const car = nearestCar(G, p.x, p.y, 70);
    if (car && !car.police) {
      car.traffic = false;
      p.inCar = car;
      p.x = car.x;
      p.y = car.y;
      toast(G, 'Driving. Follow the yellow diamond.');
    } else if (car && car.police) {
      toast(G, "That's a cop car — bad idea.");
    }
  }
  if (input.wasPressed('KeyF')) {
    const car = nearestCar(G, p.x, p.y, 70);
    if (car && car.traffic) stealCar(G, car);
    else if (car && car.police) toast(G, "That's a cop car — bad idea.");
  }
}

function updatePlayerInCar(G, dt) {
  const p = G.player;
  const car = p.inCar;
  if (!car || car.dead) { p.inCar = null; return; }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  if (G.input.isDown('Space')) car.speed -= car.speed * 3.2 * dt; // handbrake
  drivePlayerCar(G, car, dt);
  if (G.input.wasPressed('KeyE')) {
    // Step out beside the car.
    p.inCar = null;
    car.speed = 0;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    const fixed = resolveBuildings(G.city, p.x, p.y, PLAYER_RADIUS);
    p.x = fixed.x;
    p.y = fixed.y;
  }
}

function collectPickups(G) {
  const p = G.player;
  for (const pk of G.pickups) {
    if (dist(p.x, p.y, pk.x, pk.y) > 30) continue;
    pk.taken = true;
    if (pk.kind === 'cash') {
      p.cash += pk.value;
      playPickup();
      toast(G, `+$${pk.value} cash`);
      if (G.mission && G.mission.index === 2 && G.mission.step === 'collect') G.scoreGot = true;
    } else if (pk.kind === 'package') {
      G.packageGot = true;
      playPickup();
      toast(G, 'Package grabbed.');
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
}

function handleEvents(G) {
  for (const ev of G.events) {
    if (ev.type === 'shot') {
      playShot();
      spawnParticles(G, ev.x, ev.y, '#ffe66d', 3, 120);
    } else if (ev.type === 'crash') {
      playCrash();
    } else if (ev.type === 'spark') {
      spawnParticles(G, ev.x, ev.y, '#ffb347', 4, 160);
    } else if (ev.type === 'explosion') {
      playCrash();
      spawnParticles(G, ev.x, ev.y, '#ff6b35', 22, 320);
      spawnParticles(G, ev.x, ev.y, '#555', 10, 120);
    } else if (ev.type === 'enemyDown') {
      spawnParticles(G, ev.x, ev.y, '#ff4757', 10, 200);
    } else if (ev.type === 'pedDown') {
      spawnParticles(G, ev.x, ev.y, '#ff4757', 6, 160);
    } else if (ev.type === 'carWrecked') {
      spawnParticles(G, ev.x, ev.y, '#ff6b35', 20, 300);
      playCrash();
    } else if (ev.type === 'steal') {
      playCrash();
    } else if (ev.type === 'busted') {
      playBusted();
      bustPlayer(G);
    } else if (ev.type === 'wasted') {
      playBusted();
      wastePlayer(G);
    } else if (ev.type === 'missionDone') {
      G.lastMissionTitle = ev.title;
      G.lastMissionReward = ev.reward;
      playMissionDone();
      saveGame(G);
      G.screen = SCREEN_MISSION;
    }
  }
  G.events.length = 0;
}

function clearCops(G) {
  for (const car of G.cars) if (car.police) car.dead = true;
  G.cars = G.cars.filter((c) => !c.dead || c === G.player.inCar);
  G.wanted = 0;
  G.bustedT = 0;
}

function bustPlayer(G) {
  const p = G.player;
  p.cash = Math.floor(p.cash * 0.8);
  p.health = PLAYER_HEALTH;
  p.inCar = null;
  const safe = G.city.markers.safehouse;
  p.x = safe.x;
  p.y = safe.y + 60;
  clearCops(G);
  G.screen = SCREEN_BUSTED;
}

function wastePlayer(G) {
  const p = G.player;
  p.health = PLAYER_HEALTH;
  p.inCar = null;
  const hosp = G.city.markers.hospital;
  p.x = hosp.x;
  p.y = hosp.y + 60;
  clearCops(G);
  G.screen = SCREEN_WASTED;
}

/** Ambient life only: the title screen's living backdrop. */
function stepAmbient(G, dt) {
  G.time += dt;
  for (const car of G.cars) if (car.traffic && !car.dead) updateTrafficCar(G, car, dt);
  updatePeds(G, dt);
  updateParticlesOnly(G, dt);
  G.camera.x = 1800 + Math.sin(G.time * 0.05) * 260;
  G.camera.y = 1800 + Math.cos(G.time * 0.04) * 200;
}

function updateParticlesOnly(G, dt) {
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
}

/** One fixed step of the full game. Exported so shots.js can drive it. */
export function stepGame(G, dt) {
  if (G.screen === SCREEN_TITLE || G.screen === SCREEN_HELP) {
    stepAmbient(G, dt);
    return;
  }
  G.time += dt;
  const p = G.player;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;
  // Toasts age out.
  for (const t of G.toasts) t.t += dt;
  G.toasts = G.toasts.filter((t) => t.t < 4.5);
  updateParticlesOnly(G, dt);
  if (p.inCar) updatePlayerInCar(G, dt);
  else updatePlayerOnFoot(G, dt);
  // Traffic: keep the streets busy near the player, retire far cars.
  G.trafficTimer -= dt;
  if (G.trafficTimer <= 0) {
    G.trafficTimer = 1;
    const near = G.cars.filter((c) => c.traffic && !c.dead && dist(c.x, c.y, p.x, p.y) < 1100).length;
    if (near < 12) spawnTrafficCar(G, p.x, p.y);
    G.cars = G.cars.filter((c) => !c.dead || c === p.inCar);
    for (const c of G.cars) {
      if (c.traffic && dist(c.x, c.y, p.x, p.y) > 1500) c.dead = true;
    }
  }
  for (const car of G.cars) {
    if (car.traffic && !car.dead) updateTrafficCar(G, car, dt);
  }
  // Pedestrians near the player.
  G.pedTimer -= dt;
  if (G.pedTimer <= 0) {
    G.pedTimer = 1.5;
    const near = G.peds.filter((pd) => dist(pd.x, pd.y, p.x, p.y) < 900).length;
    if (near < 20) seedPeds(G, p.x, p.y, 6);
    G.peds = G.peds.filter((pd) => dist(pd.x, pd.y, p.x, p.y) < 1600);
  }
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateCombat(G, dt);
  updateMissions(G, dt);
  collectPickups(G);
  // Cash pickups respawn over time.
  G.pickupTimer -= dt;
  if (G.pickupTimer <= 0) {
    G.pickupTimer = 14;
    if (G.pickups.filter((pk) => pk.kind === 'cash').length < 5) scatterCash(G, 1);
  }
  // Health creeps back when the heat is off.
  if (G.wanted === 0 && p.health < PLAYER_HEALTH) p.health = Math.min(PLAYER_HEALTH, p.health + 2 * dt);
  // Save at the safehouse.
  const safe = G.city.markers.safehouse;
  if (dist(p.x, p.y, safe.x, safe.y) < 110 && G.time - G.lastSaveT > SAVE_COOLDOWN) {
    G.lastSaveT = G.time;
    if (saveGame(G)) toast(G, 'Progress saved at the safehouse.');
  }
  // Camera eases onto the player.
  G.camera.x += (p.x - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (p.y - G.camera.y) * Math.min(1, dt * 5);
  // Sound follows the chase and the speed.
  setSiren(G.sirenOn);
  setEngine(p.inCar ? Math.abs(p.inCar.speed) / 560 : 0, !!p.inCar);
  handleEvents(G);
}

function runShot(name) {
  const G = createGame(seed);
  G.screen = name === 'title' ? SCREEN_TITLE : SCREEN_PLAY;
  const scene = stageShot(name, G, stepGame);
  G.screen = scene.screen;
  const renderer = createRenderer(canvas);
  // Mouse world coordinates for the staged frame.
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  G.view.cw = cw;
  G.view.ch = ch;
  G.view.vx = clamp(G.camera.x - cw / 2, 0, Math.max(0, WORLD_W - cw));
  G.view.vy = clamp(G.camera.y - ch / 2, 0, Math.max(0, WORLD_H - ch));
  let painted = 0;
  function paint() {
    renderer.draw(G, G.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const G = createGame(seed);
  window.__game = G; // for playtesting from the console
  const renderer = createRenderer(canvas);
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function rebind(G) {
    G.toast = (text) => toast(G, text);
    G.addWanted = (n) => addWanted(G, n);
  }

  function startNewGame() {
    const fresh = createGame(seed);
    Object.assign(G, fresh);
    rebind(G);
    G.screen = SCREEN_PLAY;
    ensureAudio();
    startMusic();
    startMission(G, 0);
    announce('Playing. Follow the yellow diamond.');
  }

  function continueGame() {
    const data = loadSave();
    if (!data) { startNewGame(); return; }
    const fresh = createGame(seed);
    Object.assign(G, fresh);
    rebind(G);
    G.player.cash = data.cash;
    G.player.health = data.health;
    G.player.x = data.x;
    G.player.y = data.y;
    G.missionsDone = data.missionsDone || 0;
    G.storyDone = !!data.storyDone;
    G.camera.x = data.x;
    G.camera.y = data.y;
    G.screen = SCREEN_PLAY;
    ensureAudio();
    startMusic();
    if (!G.storyDone) startMission(G, G.missionsDone);
    else toast(G, 'Welcome back — free roam.');
    announce('Playing. Save loaded.');
  }

  // Audio starts on the first gesture, as browsers require.
  const unlock = () => { ensureAudio(); startMusic(); };
  window.addEventListener('keydown', unlock, { once: true });
  canvas.addEventListener('mousedown', unlock, { once: true });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    // Mouse position in world coordinates, for aiming.
    // NOTE: read G.input fresh every frame — startNewGame replaces it, and a
    // captured reference would go stale (keys would never be consumed).
    G.view.cw = cw;
    G.view.ch = ch;
    G.view.vx = clamp(G.camera.x - cw / 2, 0, Math.max(0, WORLD_W - cw));
    G.view.vy = clamp(G.camera.y - ch / 2, 0, Math.max(0, WORLD_H - ch));
    G.input.mouse.worldX = G.input.mouse.x + G.view.vx;
    G.input.mouse.worldY = G.input.mouse.y + G.view.vy;

    const screen = G.screen;
    if (screen === SCREEN_TITLE) {
      if (G.input.wasPressed('Enter') || G.input.mouse.clicked) startNewGame();
      else if (G.input.wasPressed('KeyC') && G.hasSave) continueGame();
      else if (G.input.wasPressed('KeyH')) G.screen = SCREEN_HELP;
    } else if (screen === SCREEN_HELP) {
      if (G.input.wasPressed('KeyH') || G.input.wasPressed('Escape')) G.screen = SCREEN_TITLE;
    } else if (screen === SCREEN_PLAY) {
      if (G.input.wasPressed('KeyP') || G.input.wasPressed('Escape')) {
        G.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (G.input.wasPressed('KeyM')) {
        muted = !muted;
        setMuted(muted);
        toast(G, muted ? 'Sound off.' : 'Sound on.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (G.input.wasPressed('KeyP') || G.input.wasPressed('Escape') || G.input.wasPressed('Enter')) {
        G.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED || screen === SCREEN_MISSION) {
      if (G.input.wasPressed('Enter') || G.input.mouse.clicked) {
        G.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }

    if (G.screen === SCREEN_TITLE || G.screen === SCREEN_HELP || G.screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (G.screen === SCREEN_TITLE || G.screen === SCREEN_HELP || G.screen === SCREEN_PLAY)) {
        stepGame(G, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    G.input.consumePressed();
    G.input.consumeClick();
    renderer.draw(G, G.screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === SCREEN_PLAY) {
      G.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

let muted = false;

if (shot) runShot(shot);
else runGame();

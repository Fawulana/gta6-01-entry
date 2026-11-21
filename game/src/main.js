// Solmar Bay — main loop and game state. Owns the world, the player, the
// camera and the frame: every other module is called from here. Exposes
// window.__game so a playtest driver can read live state.
import { WORLD, VIEW_W, VIEW_H, PLAYER_WALK, PLAYER_SPRINT, PLAYER_HP, ROAD_LINES, ROAD_W, SAFEHOUSE, STASH_SPOTS } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { buildCity, isOnRoad } from './city.js';
import { makeCar, randomTrafficKind, randomCarColor, driveCar, carsOverlap, resolveCarCollision, spawnTrafficCar } from './vehicles.js';
import { spawnPeds, spawnPed, updatePeds, scarePeds, updateTraffic } from './traffic.js';
import { updatePolice, addWanted, sirensActive } from './police.js';
import { playerShoot, playerPunch, updateRivals, updateBullets } from './combat.js';
import { startMission, updateMission, tryCollectStash } from './missions.js';
import { renderWorld } from './render.js';
import { drawHud, drawTitle, drawPaused, drawEndScreen } from './hud.js';
import { parseShotQuery, setupShot, updateShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function resize() {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
}
resize();

const query = parseShotQuery();
const seed = Number.isFinite(query.seed) ? query.seed : 7;

export function createState() {
  const rng = makeRng(seed);
  const save = loadSave();
  const state = {
    viewW: VIEW_W,
    viewH: VIEW_H,
    time: 0,
    screen: 'title', // title | playing | paused | busted | wasted
    seed,
    rng,
    city: buildCity(seed),
    save,
    cash: save.cash,
    player: {
      x: 1500, y: 1560, angle: -Math.PI / 2, hp: PLAYER_HP,
      inCar: null, moving: false, shootCooldown: 0, punchCooldown: 0, invuln: 0,
    },
    cars: [],
    peds: [],
    cops: [],
    roadblocks: [],
    rivals: [],
    bullets: [],
    particles: [],
    skids: [],
    camera: { x: 1500, y: 1560 },
    wanted: 0,
    hiddenTimer: 0,
    copSpawnTimer: 0,
    roadblockTimer: 12,
    bustedTimer: 0,
    crimeCooldown: 0,
    mission: null,
    shake: 0,
    redFlash: 0,
    muzzle: null,
    flashMsg: null,
    input: null,
    sound: null,
    shotMode: query.shot || null,
    shotFrames: 0,
    endKind: null,
  };

  // --- State helpers (missions / police / combat call these) ---------------
  state.flashMessage = (text, seconds) => {
    state.flashMsg = { text, t: seconds };
  };
  state.spawnSparks = (x, y, n, color = '#ffd76a') => {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 220;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.4, maxLife: 0.7,
        size: 2 + Math.random() * 3, color,
      });
    }
  };
  state.spawnConfetti = (x, y) => {
    const colors = ['#ffd21f', '#7dff8a', '#4a90e2', '#ff6a5a'];
    for (let i = 0; i < 40; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 260;
      state.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.8 + Math.random() * 0.8, maxLife: 1.6,
        size: 2 + Math.random() * 3,
        color: colors[i % colors.length],
      });
    }
  };
  state.spawnSmoke = (x, y) => {
    state.particles.push({
      x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30,
      life: 0.9, maxLife: 0.9, size: 5 + Math.random() * 5, color: '#555555',
    });
  };
  state.explodeCar = (car) => {
    if (car.dead) return;
    car.dead = true;
    state.spawnSparks(car.x, car.y, 30, '#ff8a3a');
    state.spawnSparks(car.x, car.y, 20, '#ffd76a');
    state.shake = 18;
    if (state.sound) state.sound.crash();
    if (state.player.inCar === car) {
      state.player.inCar = null;
      state.player.hp -= 25;
      state.player.x = car.x + 40;
      state.player.y = car.y + 40;
      if (state.player.hp <= 0) state.wasted();
    }
    if (car.isHeistCar && state.mission && state.mission.def.id === 'M5' && !state.mission.done) {
      state.flashMessage('THE COMET IS WRECKED — THE HEIST RESTARTS', 3);
      setTimeout(() => startMission(state, 4), 1500);
    }
  };
  state.busted = () => {
    if (state.screen !== 'playing') return;
    state.screen = 'busted';
    state.endKind = 'busted';
    state.wanted = 0;
    state.cash = Math.max(0, state.cash - 200);
    state.save.cash = state.cash;
    state.persistSave();
    if (state.sound) state.sound.busted();
  };
  state.wasted = () => {
    if (state.screen !== 'playing') return;
    state.screen = 'wasted';
    state.endKind = 'wasted';
    state.wanted = 0;
    state.cash = Math.max(0, state.cash - 200);
    state.save.cash = state.cash;
    state.persistSave();
    if (state.sound) state.sound.wasted();
  };
  state.persistSave = () => writeSave(state.save);
  state.onGunshot = (x, y) => {
    scarePeds(state.peds, x, y, 340);
    if (state.crimeCooldown <= 0) {
      addWanted(state, 1);
      state.crimeCooldown = 4;
    }
  };
  state.onRivalKilled = () => {
    // Mission M6 counts the living in its own update.
  };

  // --- Populate the world ----------------------------------------------------
  const trafficRng = makeRng(seed + 101);
  importTraffic(state, trafficRng);
  state.peds = spawnPeds(makeRng(seed + 202), 26);
  // Parked cars to steal, sitting in road lanes around the spawn and across
  // the city, facing along the road so driving away is a clear run.
  const parked = [
    ['sedan', 1416, 1480, -Math.PI / 2, 'v', 1400, -1],
    ['sports', 1416, 1360, -Math.PI / 2, 'v', 1400, -1],
    ['van', 1416, 1240, -Math.PI / 2, 'v', 1400, -1],
    ['sedan', 1416, 1120, -Math.PI / 2, 'v', 1400, -1],
    ['taxi', 1620, 1016, 0, 'h', 1000, 1],
    ['sedan', 1080, 1016, 0, 'h', 1000, 1],
    ['truck', 2216, 2200, Math.PI / 2, 'v', 2200, 1],
    ['sports', 2616, 1800, -Math.PI / 2, 'v', 2600, -1],
    ['sedan', 600, 2616, 0, 'h', 2600, 1],
    ['van', 1800, 616, 0, 'h', 600, 1],
  ];
  for (const [kind, x, y, angle, axis, line, dir] of parked) {
    const car = makeCar(kind, x, y, angle, {
      parked: true, color: randomCarColor(makeRng(seed + x + y), kind),
      roadAxis: axis, roadLine: line, dir,
    });
    state.cars.push(car);
  }
  // Start the story where the save left off.
  if (state.save.storyDone) {
    state.mission = null;
  } else {
    startMission(state, Math.min(state.save.missionsDone, 5));
  }
  return state;
}

// Traffic spawner kept separate so createState stays readable.
function importTraffic(state, rng) {
  for (let i = 0; i < 18; i += 1) {
    state.cars.push(spawnTrafficCar(rng));
  }
}

// --- Player ------------------------------------------------------------------
function nearestCar(state, maxDist) {
  const p = state.player;
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterCar(state, car) {
  const p = state.player;
  p.inCar = car;
  car.parked = false;
  p.x = car.x;
  p.y = car.y;
  if (car.traffic) {
    car.traffic = false;
    addWanted(state, 1);
    state.flashMessage('CAR STOLEN — 1 STAR', 2.5);
  }
  if (state.sound) state.sound.chime();
}

function exitCar(state) {
  const p = state.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  p.x = car.x - Math.sin(car.angle) * 34;
  p.y = car.y + Math.cos(car.angle) * 34;
  p.angle = car.angle;
  car.speed = 0;
}

function collideBuildings(state, obj, radius) {
  for (const b of state.city.buildings) {
    if (obj.x > b.x - radius && obj.x < b.x + b.w + radius
      && obj.y > b.y - radius && obj.y < b.y + b.h + radius) {
      const dxl = obj.x - (b.x - radius);
      const dxr = (b.x + b.w + radius) - obj.x;
      const dyt = obj.y - (b.y - radius);
      const dyb = (b.y + b.h + radius) - obj.y;
      const m = Math.min(dxl, dxr, dyt, dyb);
      if (m === dxl) obj.x = b.x - radius;
      else if (m === dxr) obj.x = b.x + b.w + radius;
      else if (m === dyt) obj.y = b.y - radius;
      else obj.y = b.y + b.h + radius;
      return true;
    }
  }
  return false;
}

function updatePlayer(state, dt) {
  const p = state.player;
  const input = state.input;
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  state.crimeCooldown = Math.max(0, state.crimeCooldown - dt);

  // Aim at the mouse.
  const worldMouseX = state.camera.x + (input.mouseX - state.viewW / 2);
  const worldMouseY = state.camera.y + (input.mouseY - state.viewH / 2);

  if (p.inCar) {
    const car = p.inCar;
    const axis = input.moveAxis();
    const throttle = -axis.y; // W = forward
    const steer = axis.x;
    const handbrake = input.down('Space');
    const prevX = car.x;
    const prevY = car.y;
    const ev = driveCar(car, dt, throttle, steer, handbrake, state);
    if (ev.skidding) {
      const bx = car.x - Math.cos(car.angle) * car.len * 0.4;
      const by = car.y - Math.sin(car.angle) * car.len * 0.4;
      state.skids.push({ x1: bx, y1: by, x2: bx + (car.x - prevX) * 0.4, y2: by + (car.y - prevY) * 0.4, life: 8 });
      if (state.skids.length > 220) state.skids.splice(0, state.skids.length - 220);
      if (state.sound && Math.random() < 0.3) state.sound.skid();
    }
    if (collideBuildings(state, car, car.len / 2)) {
      if (Math.abs(car.speed) > 150) {
        car.hp -= 8;
        state.shake = Math.min(14, state.shake + 5);
        state.spawnSparks(car.x, car.y, 6);
        if (state.sound) state.sound.crash();
      }
      car.speed *= 0.35;
    }
    // Bump traffic.
    for (const other of state.cars) {
      if (other === car || other.dead) continue;
      if (carsOverlap(car, other)) {
        resolveCarCollision(car, other);
        car.hp -= 2;
        other.hp -= 2;
        state.shake = Math.min(12, state.shake + 4);
        state.spawnSparks((car.x + other.x) / 2, (car.y + other.y) / 2, 5);
        if (state.sound) state.sound.crash();
        if (other.hp <= 0) state.explodeCar(other);
      }
    }
    // Running over pedestrians is a crime.
    for (const ped of state.peds) {
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26) {
        ped.fleeing = 4;
        ped.fleeX = (ped.x - car.x) / 26;
        ped.fleeY = (ped.y - car.y) / 26;
        if (state.crimeCooldown <= 0) {
          addWanted(state, 1);
          state.crimeCooldown = 4;
        }
        car.speed *= 0.85;
      }
    }
    if (car.hp <= 0) {
      state.explodeCar(car);
    } else if (car.hp < 50 && Math.random() < dt * 6) {
      state.spawnSmoke(car.x - Math.cos(car.angle) * car.len * 0.4, car.y - Math.sin(car.angle) * car.len * 0.4);
    }
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.moving = Math.abs(car.speed) > 20;
    if (input.wasPressed('KeyE')) exitCar(state);
    if (state.sound) state.sound.setEngine(Math.abs(car.speed) / car.maxSpeed, true);
  } else {
    const axis = input.moveAxis();
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = sprint ? PLAYER_SPRINT : PLAYER_WALK;
    p.moving = axis.x !== 0 || axis.y !== 0;
    p.x += axis.x * speed * dt;
    p.y += axis.y * speed * dt;
    p.x = Math.max(40, Math.min(WORLD - 40, p.x));
    p.y = Math.max(40, Math.min(WORLD - 40, p.y));
    collideBuildings(state, p, 12);
    p.angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
    if (input.wasPressed('KeyE')) {
      const car = nearestCar(state, 110);
      if (car) enterCar(state, car);
      else tryCollectStash(state);
    }
    if (input.clicked() || input.mouseDown) {
      playerShoot(state, worldMouseX, worldMouseY);
    }
    if (input.wasPressed('KeyF')) playerPunch(state);
    if (state.sound) state.sound.setEngine(0, false);
  }
}

// --- Frame update ---------------------------------------------------------------
function update(state, dt) {
  state.time += dt;
  const rng = state.rng;
  if (state.flashMsg) {
    state.flashMsg.t -= dt;
    if (state.flashMsg.t <= 0) state.flashMsg = null;
  }
  state.shake = Math.max(0, state.shake - dt * 26);
  state.redFlash = Math.max(0, state.redFlash - dt);
  if (state.muzzle) {
    state.muzzle.t -= dt;
    if (state.muzzle.t <= 0) state.muzzle = null;
  }
  updatePlayer(state, dt);
  updateTraffic(state.cars, dt, rng, state.player.inCar);
  updatePeds(state.peds, dt, rng);
  updatePolice(state, dt, rng);
  updateRivals(state, dt);
  updateBullets(state, dt);
  updateMission(state, dt);
  // Particles.
  for (const pt of state.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 60 * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((pt) => pt.life > 0);
  // Skid marks fade.
  for (const s of state.skids) s.life -= dt;
  state.skids = state.skids.filter((s) => s.life > 0);
  // Camera follows the player with a soft lag.
  const p = state.player;
  state.camera.x += (p.x - state.camera.x) * Math.min(1, dt * 5);
  state.camera.y += (p.y - state.camera.y) * Math.min(1, dt * 5);
  // Sirens follow the heat.
  if (state.sound) state.sound.setSiren(sirensActive(state));
  updateShot(state);
}

// --- Boot -----------------------------------------------------------------------
const state = createState();
state.input = new Input(canvas);
state.sound = new SoundBank();
window.__game = state;
window.__shotReady = false;

if (query.shot) {
  setupShot(state, query.shot, query.seed);
  // Staged shots skip the title screen entirely.
  statusLine.textContent = `Solmar Bay — staged shot: ${query.shot}`;
} else {
  statusLine.textContent = 'Solmar Bay — press Enter to play. WASD move, E enter car, click to shoot.';
}

let last = performance.now();
let titleBlink = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  titleBlink += dt;
  const input = state.input;

  if (state.screen === 'title') {
    if (input.wasPressed('Enter')) {
      state.screen = 'playing';
      state.sound.ensure();
      state.sound.resume();
    }
    renderWorld(ctx, state);
    drawTitle(ctx, state, state.viewW, state.viewH);
  } else if (state.screen === 'playing') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      state.screen = 'paused';
    } else if (input.wasPressed('KeyM')) {
      state.sound.setMuted(!state.sound.muted);
    } else if (input.wasPressed('KeyR')) {
      // Fresh start from the save: a reload rebuilds the world cleanly
      // (the save already holds cash, missions and stashes).
      window.location.reload();
    }
    update(state, dt);
    renderWorld(ctx, state);
    drawHud(ctx, state, state.viewW, state.viewH);
  } else if (state.screen === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      state.screen = 'playing';
    }
    renderWorld(ctx, state);
    drawHud(ctx, state, state.viewW, state.viewH);
    drawPaused(ctx, state.viewW, state.viewH);
  } else if (state.screen === 'busted' || state.screen === 'wasted') {
    if (input.wasPressed('Enter')) {
      // Back on the street: patched up at the safehouse, car gone.
      state.player.hp = PLAYER_HP;
      state.player.x = SAFEHOUSE.x;
      state.player.y = SAFEHOUSE.y;
      state.player.inCar = null;
      state.player.angle = 0;
      state.camera.x = SAFEHOUSE.x;
      state.camera.y = SAFEHOUSE.y;
      state.wanted = 0;
      state.cops = [];
      state.cars = state.cars.filter((c) => !c.wanted);
      state.screen = 'playing';
    }
    renderWorld(ctx, state);
    drawHud(ctx, state, state.viewW, state.viewH);
    drawEndScreen(ctx, state, state.viewW, state.viewH, state.endKind);
  }
  // Staged screenshots settle even on the title screen, where update()
  // never runs — the shot driver waits on window.__shotReady.
  updateShot(state);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Palmetto Bay — bootstrap and screen state machine.
// Title -> play -> pause / game over / win. The world itself lives in game.js.
import { createGame, stepGame, newGameFromSave } from './game.js';
import { Input } from './input.js';
import { Renderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN } from './render.js';
import { hasSave, saveGame } from './save.js';
import { VIEW } from './config.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const autotest = params.get('autotest');

const input = new Input(canvas);
const renderer = new Renderer(canvas);
renderer.resize(VIEW.width, VIEW.height);

let game = createGame();
game.rendererCamera = renderer.camera;
game.hasSaveFlag = hasSave();

let screen = SCREEN_TITLE;
let lastTime = performance.now();
let pausedFrom = null;
let auto = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startFresh() {
  game = createGame();
  game.rendererCamera = renderer.camera;
  game.hasSaveFlag = hasSave();
  renderer.camera.snap(game.player.px, game.player.py);
  screen = SCREEN_PLAY;
  game.sound.ensure();
  setStatus('Palmetto Bay: free roam. Press M to start the next mission.');
}

function startFromSave() {
  game = newGameFromSave();
  game.rendererCamera = renderer.camera;
  game.hasSaveFlag = hasSave();
  renderer.camera.snap(game.player.px, game.player.py);
  screen = SCREEN_PLAY;
  game.sound.ensure();
  setStatus('Palmetto Bay: save loaded.');
}

function startAutotest() {
  startFresh();
  auto = {
    mode: autotest,
    startedAt: performance.now(),
    simTime: 0,
    done: false,
  };
  game.missions.startNext();
  game.sound.muted = true;
}

// Autopilot for the ?autotest= harness: steer the car (or the player on
// foot) toward the current mission marker, following the road grid so it
// never tries to drive through a building. It drives through the same input
// the player uses, so a passing autotest means the mission is really
// playable. Waypoints snap to road centre lines; the target marker itself
// is only approached once the car is on the right road.
function snapRoad(v) {
  return Math.round(v / 400) * 400;
}

function onRoadLine(v) {
  const r = ((v % 400) + 400) % 400;
  return Math.min(r, 400 - r) < 34;
}

// One waypoint on the road grid toward (tx, ty): along the player's current
// road to the target's row or column, then straight to the target.
function roadWaypoint(px, py, tx, ty) {
  const onV = onRoadLine(px);
  const onH = onRoadLine(py);
  if (onV && Math.abs(py - snapRoad(ty)) > 20) return { x: snapRoad(px), y: snapRoad(ty) };
  if (onH && Math.abs(px - snapRoad(tx)) > 20) return { x: snapRoad(tx), y: snapRoad(py) };
  if (!onV && !onH) {
    const rx = ((px % 400) + 400) % 400;
    const ry = ((py % 400) + 400) % 400;
    if (Math.min(rx, 400 - rx) < Math.min(ry, 400 - ry)) return { x: snapRoad(px), y: py };
    return { x: px, y: snapRoad(py) };
  }
  return { x: tx, y: ty };
}

function autopilot(game, dt, input) {
  // Fresh keys every frame: stale injected keys would keep steering forever.
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) input.inject(code, false);
  const m = game.missions.active;
  const player = game.player;
  const target = m && m.marker ? m.marker : { x: 400, y: 620 };
  const px = player.px;
  const py = player.py;
  if (!player.car) {
    // Walk to the nearest stealable car first. On foot the controls are
    // directional (WASD moves in screen directions), so steer by pressing
    // the keys for the waypoint's direction, not by turning like a car.
    let car = null;
    let best = 1e9;
    for (const c of game.parkedCars) {
      if (c.dead) continue;
      const d = Math.hypot(c.x - px, c.y - py);
      if (d < best) {
        best = d;
        car = c;
      }
    }
    if (car && best < 56) {
      input.inject('KeyE', true);
      return;
    }
    // Close to the car: walk straight at it — the road-grid waypoints
    // only help over long distances and can ping-pong near a corner.
    // Far away: follow the road grid so the player never cuts through
    // a building.
    const wp = best < 260 && car
      ? { x: car.x, y: car.y }
      : roadWaypoint(px, py, car ? car.x : target.x, car ? car.y : target.y);
    const dx = wp.x - px;
    const dy = wp.y - py;
    if (dy < -12) input.inject('KeyW', true);
    else if (dy > 12) input.inject('KeyS', true);
    if (dx < -12) input.inject('KeyA', true);
    else if (dx > 12) input.inject('KeyD', true);
    return;
  }
  const car = player.car;
  const wp = roadWaypoint(px, py, target.x, target.y);
  const dx = wp.x - px;
  const dy = wp.y - py;
  const targetDist = Math.hypot(target.x - px, target.y - py);
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Reverse only for a genuine U-turn, with hysteresis: once reversing,
  // keep going until the car is mostly lined up, or it flip-flops
  // between forward and reverse while wedged against another car.
  if (Math.abs(diff) > 2.8) auto.reversing = true;
  else if (Math.abs(diff) < 1.9) auto.reversing = false;
  const reversing = !!auto.reversing;
  if (targetDist > 90) {
    input.inject('KeyW', !reversing);
    input.inject('KeyS', reversing);
  }
  if (diff > 0.15) input.inject('KeyD', true);
  else if (diff < -0.15) input.inject('KeyA', true);
  if (targetDist < 130 && Math.abs(car.speed) > 150) input.inject('KeyS', true);
}

// Synchronous autotest: run the game forward in fixed steps without waiting
// on requestAnimationFrame, so a headless run finishes in seconds. The
// result lands in document.title and window.__testResult.
function runAutotestSync() {
  const step = 1 / 60;
  const maxSteps = 60 * 150;
  for (let i = 0; i < maxSteps && !auto.done; i += 1) {
    auto.simTime += step;
    autopilot(game, step, input);
    stepGame(game, step, input, canvas);
    renderer.camera.follow(game.player.px, game.player.py, step);
    input.endFrame();
    if (game.missions.completed >= 1) {
      auto.done = true;
      window.__testResult = {
        ok: true,
        mission: 'mission1-complete',
        cash: game.player.cash,
        simSeconds: Math.round(auto.simTime * 10) / 10,
        wanted: game.wanted.stars,
      };
      document.title = 'AUTOTEST PASS';
    } else if (auto.simTime > 120) {
      auto.done = true;
      window.__testResult = {
        ok: false,
        mission: 'mission1-timeout',
        stage: game.missions.active ? game.missions.active.stage : -1,
        playerInCar: !!game.player.car,
        pos: [Math.round(game.player.px), Math.round(game.player.py)],
        simSeconds: Math.round(auto.simTime),
      };
      document.title = 'AUTOTEST FAIL';
    }
  }
  setStatus(`autotest ${auto.mode} ${auto.done ? (window.__testResult.ok ? 'PASS' : 'FAIL') : 'incomplete'} sim=${auto.simTime.toFixed(1)} completed=${game.missions.completed}`);
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  const time = now / 1000;

  if (screen === SCREEN_TITLE) {
    if (input.hit('Enter', 'NumpadEnter') || input.mouseClicked) {
      game.sound.ensure();
      startFresh();
    } else if (input.hit('KeyL') && hasSave()) {
      startFromSave();
    }
    renderer.draw(game, SCREEN_TITLE, time);
  } else if (screen === SCREEN_PLAY) {
    if (auto) {
      auto.simTime += dt;
      autopilot(game, dt, input);
      if (!auto.done) {
        setStatus(`autotest ${auto.mode} sim=${auto.simTime.toFixed(1)} stage=${game.missions.active ? game.missions.active.stage : 'none'} completed=${game.missions.completed} inCar=${!!game.player.car} pos=${Math.round(game.player.px)},${Math.round(game.player.py)}`);
      }
      if (game.missions.completed >= 1) {
        auto.done = true;
        window.__testResult = {
          ok: true,
          mission: 'mission1-complete',
          cash: game.player.cash,
          simSeconds: Math.round(auto.simTime * 10) / 10,
          wanted: game.wanted.stars,
        };
        document.title = 'AUTOTEST PASS';
      } else if (auto.simTime > 120) {
        auto.done = true;
        window.__testResult = {
          ok: false,
          mission: 'mission1-timeout',
          stage: game.missions.active ? game.missions.active.stage : -1,
          playerInCar: !!game.player.car,
          simSeconds: Math.round(auto.simTime),
        };
        document.title = 'AUTOTEST FAIL';
      }
    }
    if (!game.shops.open) {
      if (input.hit('KeyP', 'Escape')) {
        screen = SCREEN_PAUSE;
        pausedFrom = SCREEN_PLAY;
      }
    }
    if (screen === SCREEN_PLAY) {
      stepGame(game, dt, input, canvas);
      renderer.camera.follow(game.player.px, game.player.py, dt);
      if (game.player.dead) {
        screen = SCREEN_OVER;
        game.sound.fail();
      } else if (game.missions.finishedAll && !game.winShownHandled) {
        game.winShownHandled = true;
        screen = SCREEN_WIN;
        game.sound.missionDone();
      }
      renderer.draw(game, SCREEN_PLAY, time);
    } else {
      renderer.draw(game, SCREEN_PAUSE, time);
    }
  } else if (screen === SCREEN_PAUSE) {
    if (input.hit('KeyP', 'Escape', 'Enter')) screen = SCREEN_PLAY;
    if (input.hit('KeyH')) {
      if (saveGame(game)) {
        game.savedFlash = 'Game saved';
        game.savedFlashTimer = 2;
      }
    }
    if (input.hit('KeyR') && hasSave()) startFromSave();
    if (input.hit('KeyQ')) screen = SCREEN_TITLE;
    renderer.draw(game, SCREEN_PAUSE, time);
  } else if (screen === SCREEN_OVER) {
    if (input.hit('KeyR') && hasSave()) startFromSave();
    else if (input.hit('Enter')) startFresh();
    renderer.draw(game, SCREEN_OVER, time);
  } else if (screen === SCREEN_WIN) {
    if (input.hit('Enter')) {
      screen = SCREEN_PLAY;
      game.winShownHandled = true;
    }
    renderer.draw(game, SCREEN_WIN, time);
  }

  if (game.savedFlashTimer > 0) {
    const ctx = renderer.ctx;
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.savedFlash, VIEW.width / 2, 110);
    ctx.textAlign = 'left';
  }

  input.endFrame();
  if (!shotName) requestAnimationFrame(frame);
}

function boot() {
  if (shotName) {
    // Deterministic screenshot mode: stage one scene, draw one frame, stop.
    const staged = stageShot(shotName, renderer);
    game = staged.game;
    renderer.draw(game, staged.screen, 12.5);
    window.__shotReady = true;
    document.title = `shot:${shotName}`;
    return;
  }
  if (autotest) {
    startAutotest();
    runAutotestSync();
  }
  requestAnimationFrame(frame);
}

window.addEventListener('error', (event) => {
  window.__lastError = String(event.message || event.error);
});

boot();

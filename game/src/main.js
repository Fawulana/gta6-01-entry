// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between screens: title, play, paused,
// busted, wasted, win and game over.
//
// ?seed=N fixes the city and the traffic. ?shot=start|drive|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { writeSave } from './save.js';
import { GUN_MENU } from './shops.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261121;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
let world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function runShot(name) {
  const staged = stageShot(name, seed);
  world = staged.world;
  window.__world = world;
  // The camera lerps, and a staged shot paints twice: snap it onto the player
  // (the title shot snaps to its Ocean Drive vista instead).
  if (staged.screen !== SCREEN_TITLE) renderer.snap(world.state);
  else renderer.snapTo(3650, 1250, 0.62);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, { screen: staged.screen, best: world.state.save.best, gps: world.gpsTarget() });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let state = world.state;
  let save = state.save;
  let screen = SCREEN_TITLE;
  let winShown = false;
  let accumulator = 0;
  let last = performance.now();
  let muted = false;

  const keys = new Set();
  let actions = 0;
  let mouseWorld = null;
  let mouseDown = false;
  let mouseClicked = false;
  let buyKey = null;

  const ACTION_CONFIRM = 1;
  const ACTION_PAUSE = 2;
  const ACTION_INTERACT = 4;
  const ACTION_CYCLE = 8;
  const ACTION_PUNCH = 16;
  const ACTION_ESCAPE = 32;

  function announce(message) {
    status.textContent = message;
  }

  window.addEventListener('keydown', (event) => {
    audio.unlock();
    if (event.code === 'KeyM') {
      muted = !muted;
      audio.setMuted(muted);
      return;
    }
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP') actions |= ACTION_PAUSE;
    if (event.code === 'Escape') actions |= ACTION_PAUSE | ACTION_ESCAPE;
    if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    if (event.code === 'KeyQ') actions |= ACTION_CYCLE;
    if (event.code === 'KeyF') actions |= ACTION_PUNCH;
    if (state.shopOpen === 'guns') {
      const item = GUN_MENU.find((entry) => event.code === `Digit${entry.key}` || event.code === `Numpad${entry.key}`);
      if (item) buyKey = item.id;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouseWorld = renderer.screenToWorld(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    mouseWorld = renderer.screenToWorld(event.clientX, event.clientY);
    mouseDown = true;
    mouseClicked = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      writeSave(save);
    }
  });

  function readInput() {
    const up = keys.has('KeyW') || keys.has('ArrowUp');
    const down = keys.has('KeyS') || keys.has('ArrowDown');
    const left = keys.has('KeyA') || keys.has('ArrowLeft');
    const right = keys.has('KeyD') || keys.has('ArrowRight');
    const taken = actions;
    actions = 0;
    const buy = buyKey;
    buyKey = null;
    const clicked = mouseClicked;
    mouseClicked = false;
    return {
      up, down, left, right,
      run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      handbrake: keys.has('Space'),
      shoot: mouseDown || clicked || keys.has('Space'),
      punch: !!(taken & ACTION_PUNCH),
      interact: !!(taken & ACTION_INTERACT),
      cycleWeapon: !!(taken & ACTION_CYCLE),
      escape: !!(taken & ACTION_ESCAPE),
      confirm: !!(taken & ACTION_CONFIRM),
      pause: !!(taken & ACTION_PAUSE),
      buy, mouseWorld,
    };
  }

  function playEvents(events) {
    for (const event of events) {
      if (event.type === 'shoot' || event.type === 'copShoot') audio.shoot();
      else if (event.type === 'crash') audio.crash(event.strength || 0.3);
      else if (event.type === 'explosion') audio.explosion();
      else if (event.type === 'pickup') audio.pickup();
      else if (event.type === 'cash') audio.cash();
      else if (event.type === 'mission') audio.missionDone();
      else if (event.type === 'busted' || event.type === 'wasted') audio.busted();
      else if (event.type === 'denied') audio.denied();
      else if (event.type === 'punch') audio.punch();
    }
  }

  function startGame() {
    // A fresh world per game, so the simulation's closures and the rendered
    // state are always the same objects.
    world = createWorld(seed);
    window.__world = world;
    state = world.state;
    save = state.save;
    winShown = false;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing Palmetto Bay. Follow the gold marker.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const input = readInput();

    if (screen === SCREEN_TITLE) {
      if (input.confirm) {
        startGame();
      } else {
        // Attract mode: traffic rolls while the title sits over the city.
        while (accumulator >= STEP) {
          world.step(STEP, { up: false, down: false, left: false, right: false, run: false, handbrake: false, shoot: false, punch: false, interact: false, cycleWeapon: false, escape: false, buy: null, mouseWorld: null });
          accumulator -= STEP;
        }
      }
    } else if (screen === SCREEN_PLAY) {
      if (input.pause && !state.shopOpen) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        while (accumulator >= STEP) {
          const events = world.step(STEP, input);
          playEvents(events);
          accumulator -= STEP;
          if (state.ended === 'busted') screen = SCREEN_BUSTED;
          else if (state.ended === 'wasted') screen = SCREEN_WASTED;
          else if (state.missions.allDone && !winShown) {
            winShown = true;
            screen = SCREEN_WIN;
          }
          if (screen !== SCREEN_PLAY) break;
        }
        const car = state.player.inCar;
        audio.engine(car ? Math.min(1, Math.abs(car.speed) / 900) : 0, !!car);
        audio.siren(state.sirenNear && screen === SCREEN_PLAY);
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.pause || input.confirm) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      accumulator = 0;
    } else if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (!state.ended) screen = SCREEN_PLAY;
      accumulator = 0;
    } else if (screen === SCREEN_WIN) {
      if (input.confirm) screen = SCREEN_PLAY;
      accumulator = 0;
    } else if (screen === SCREEN_OVER) {
      if (input.confirm) startGame();
      accumulator = 0;
    }

    if (save.cash > save.best) save.best = save.cash;
    renderer.draw(state, { screen, best: save.best, gps: world.gpsTarget() });
  }

  announce('Palmetto Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

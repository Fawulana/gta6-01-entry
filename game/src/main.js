// Palmetto Bay — the game loop and state machine. This file creates the
// game, runs it, and owns the moments where systems meet: entering a car,
// stealing, getting busted, finishing a mission. Each system lives in its
// own file; this one only conducts them.

import { LANDMARKS, MISSIONS, WANTED } from './config.js';
import { createAudio, playBusted, playCrash, playMissionComplete, playPickup, playShot, resumeAudio, setMuted, updateEngineSound, updateMusic, updateSiren } from './audio.js';
import { createCombat, explodeCar, fireBullet, spawnEnemies, updateCombat } from './combat.js';
import { createInput } from './input.js';
import { drawBustedScreen, drawHud, drawMissionCompleteScreen, drawPauseScreen, drawTitleScreen, drawWastedScreen } from './hud.js';
import { createMissionState, currentMission, currentStep, missionMarker, missionObjectiveText, showMessage, startMission, updateMission, updateMissionTimer } from './missions.js';
import { chestAt, chestsTaken, createChests, createPickups, dropPickup, pickupAt, updatePickups } from './pickups.js';
import { removePed, pedHitByCar, spawnPed, updatePeds } from './peds.js';
import { addCash, createPlayer, damagePlayer, healPlayer, spendCash, updatePlayerOnFoot } from './player.js';
import { addHeat, clearWanted, createWanted, spawnCopCar, spawnFootCop, updateBust, updateCopCar, updateFootCop, updateWanted, wantedCopCount } from './police.js';
import { mulberry32 } from './random.js';
import { createRenderer, renderWorld } from './render.js';
import { loadGame, saveGame } from './save.js';
import { parseShotParams, stageShot } from './shots.js';
import { ammoShopLabel, shopAt, sprayShopLabel, useAmmoShop, useSprayShop } from './shops.js';
import { carOverlaps, makeCar, nearestCar, spawnTrafficCar, updateDrivenCar, updateTrafficCar } from './vehicles.js';
import { distance, generateWorld } from './world.js';

const SAVE_INTERVAL = 10;
const TRAFFIC_TARGET = 14;
const PED_TARGET = 22;

function createGame(seed) {
  const saved = loadGame();
  const world = generateWorld(seed);
  const player = createPlayer(LANDMARKS.safehouse.x, LANDMARKS.safehouse.y + 40);
  if (saved) player.cash = saved.cash;
  const game = {
    seed,
    world,
    landmarks: LANDMARKS,
    player,
    cars: [],
    peds: [],
    cops: [],
    footCops: [],
    wanted: createWanted(),
    combat: createCombat(),
    mission: createMissionState(),
    chests: createChests(),
    pickups: createPickups(),
    missionPackages: [],
    missionsDone: saved ? saved.missionsDone : [],
    bestCash: saved ? saved.bestCash : 0,
    totalEarned: saved ? saved.totalEarned : 0,
    state: 'title',
    completedMission: null,
    objectiveText: '',
    prompt: '',
    missionMarker: null,
    saveTimer: SAVE_INTERVAL,
    time: 0,
    cam: null,
    killBase: 0,
  };
  if (saved) {
    for (const id of saved.chestsTaken) {
      const chest = game.chests.find((c) => c.id === id);
      if (chest) chest.taken = true;
    }
  }
  // Parked cars around the city, including the gold Aurum GT at the marina.
  const parked = [
    { kind: 'sedan', x: 620, y: 640 },
    { kind: 'coupe', x: 1420, y: 240 },
    { kind: 'suv', x: 2220, y: 1040 },
    { kind: 'truck', x: 1040, y: 1840 },
    { kind: 'sports', x: 2620, y: 640 },
    { kind: 'sedan', x: 1820, y: 2240 },
    { kind: 'aurum', x: LANDMARKS.marina.x, y: LANDMARKS.marina.y - 60 },
  ];
  for (const p of parked) {
    const car = makeCar(p.kind, p.x, p.y, 0, p.kind === 'aurum' ? '#ffd700' : undefined);
    car.traffic = false;
    game.cars.push(car);
  }
  return game;
}

function spawnMissionPackages(game) {
  const spots = [
    { x: 420, y: 420 },
    { x: 3180, y: 420 },
    { x: 1620, y: 2200 },
  ];
  game.missionPackages = spots.map((s) => ({ x: s.x, y: s.y }));
}

function beginMission(game, index) {
  const mission = MISSIONS[index];
  if (!mission) return;
  startMission(game.mission, index);
  game.killBase = game.combat.enemiesDown;
  if (mission.id === 3) spawnEnemies(game.combat, LANDMARKS.docks.x, LANDMARKS.docks.y, 4, Math.random);
  if (mission.id === 4) spawnMissionPackages(game);
  if (mission.id === 5) addHeat(game.wanted, 3);
  if (mission.id === 6) game.missionPackages = [{ x: LANDMARKS.bank.x + 120, y: LANDMARKS.bank.y + 60 }];
  game.missionMarker = missionMarker(game.mission);
}

function finishMission(game) {
  const mission = currentMission(game.mission);
  addCash(game.player, mission.reward);
  game.totalEarned += mission.reward;
  game.bestCash = Math.max(game.bestCash, game.player.cash);
  if (!game.missionsDone.includes(mission.id)) game.missionsDone.push(mission.id);
  game.completedMission = mission;
  game.state = 'missionComplete';
  playMissionComplete(game.audio);
  saveGame(game);
}

function respawnAtSafehouse(game) {
  game.player.x = LANDMARKS.safehouse.x;
  game.player.y = LANDMARKS.safehouse.y + 40;
  game.player.health = 100;
  if (game.player.inCar) {
    game.player.inCar.speed = 0;
    game.player.inCar = null;
  }
  game.cops = [];
  game.footCops = [];
  game.combat.enemies = [];
  clearWanted(game.wanted);
}

function updatePlaying(game, input, edges, dt) {
  const p = game.player;
  const world = game.world;
  // Pause and mute.
  if (edges.pause) {
    game.state = 'paused';
    return;
  }
  if (edges.mute) setMuted(game.audio, !game.audio.muted);

  // Mission timer and messages.
  const timerResult = updateMissionTimer(game.mission, dt);
  if (timerResult === 'failed') {
    showMessage(game.mission, 'Mission failed — try again', 3);
    beginMission(game, game.mission.index);
  }

  // Interact: enter/exit a car, chest, shop, package.
  if (edges.interact) {
    if (p.inCar) {
      const car = p.inCar;
      p.inCar = null;
      p.x = car.x - Math.sin(car.angle) * 30;
      p.y = car.y + Math.cos(car.angle) * 30;
      p.angle = car.angle;
    } else {
      const chest = chestAt(game.chests, p.x, p.y);
      if (chest) {
        chest.taken = true;
        addCash(p, chest.cash);
        game.bestCash = Math.max(game.bestCash, p.cash);
        playPickup(game.audio);
        showMessage(game.mission, `Stash chest: +$${chest.cash}`, 2);
        saveGame(game);
      } else {
        const shop = shopAt(p);
        if (shop === 'spray') {
          const result = useSprayShop(p, null, game.wanted);
          showMessage(game.mission, result === 'ok' ? "Pay 'n Spray — clean and clear" : 'Not enough cash', 2);
        } else if (shop === 'ammo') {
          const result = useAmmoShop(p, p.hasPistol ? 'ammo' : 'pistol');
          showMessage(game.mission, result === 'ok' ? 'Ammu-Nation — pleasure doing business' : result === 'owned' ? 'Already armed' : 'Not enough cash', 2);
        } else {
          const car = nearestCar(game.cars, p.x, p.y, 70);
          if (car) {
            const wasTraffic = car.traffic;
            car.traffic = false;
            p.inCar = car;
            p.x = car.x;
            p.y = car.y;
            if (wasTraffic) addHeat(game.wanted, WANTED.stealHeat);
          }
        }
      }
    }
  }

  // Move Rico, on foot or driving.
  if (p.inCar) {
    updateDrivenCar(p.inCar, input, world, dt);
    p.x = p.inCar.x;
    p.y = p.inCar.y;
    p.angle = p.inCar.angle;
    if (p.inCar.hp <= 0) {
      explodeCar(game.combat, p.inCar);
      game.cars.splice(game.cars.indexOf(p.inCar), 1);
      p.inCar = null;
      damagePlayer(p, 20);
      playCrash(game.audio);
    }
  } else {
    updatePlayerOnFoot(p, input, world, dt);
  }

  // Shooting: mouse aim, click to fire.
  if (!p.inCar && p.hasPistol && input.mouseDown && game.cam) {
    const aimX = input.mouseX + game.cam.x;
    const aimY = input.mouseY + game.cam.y;
    const aim = Math.atan2(aimY - p.y, aimX - p.x);
    p.angle = aim;
    if (fireBullet(game.combat, p, aim, world)) playShot(game.audio);
  }

  // Traffic: keep the streets full, cull the far away.
  const rng = Math.random;
  if (game.cars.filter((c) => c.traffic).length < TRAFFIC_TARGET) {
    const car = spawnTrafficCar(rng, world, p);
    if (car) game.cars.push(car);
  }
  for (let i = game.cars.length - 1; i >= 0; i--) {
    const car = game.cars[i];
    if (car.traffic) {
      updateTrafficCar(car, world, game.cars, rng, dt);
      if (distance(car.x, car.y, p.x, p.y) > 1400) game.cars.splice(i, 1);
    }
  }
  // Car-to-car bumps.
  for (let i = 0; i < game.cars.length; i++) {
    for (let j = i + 1; j < game.cars.length; j++) {
      const a = game.cars[i];
      const b = game.cars[j];
      const d = distance(a.x, a.y, b.x, b.y);
      if (d < 44 && d > 0.01) {
        const push = (44 - d) / 2;
        const nx = (b.x - a.x) / d;
        const ny = (b.y - a.y) / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.speed *= 0.7;
        b.speed *= 0.7;
        if (Math.abs(a.speed) > 150 || Math.abs(b.speed) > 150) playCrash(game.audio);
      }
    }
  }
  // Pedestrians: keep the sidewalks alive, cull the far away.
  if (game.peds.length < PED_TARGET) {
    const ped = spawnPed(rng, world, p);
    if (ped) game.peds.push(ped);
  }
  const danger = game.combat.bullets.length > 0
    ? { x: game.combat.bullets[0].x, y: game.combat.bullets[0].y }
    : (p.inCar && Math.abs(p.inCar.speed) > 200 ? { x: p.x, y: p.y } : null);
  updatePeds(game.peds, world, danger, dt);
  for (let i = game.peds.length - 1; i >= 0; i--) {
    if (distance(game.peds[i].x, game.peds[i].y, p.x, p.y) > 1300) game.peds.splice(i, 1);
  }
  // Running a pedestrian over is a crime.
  if (p.inCar) {
    const hit = pedHitByCar(game.peds, p.inCar);
    if (hit) {
      removePed(game.peds, hit);
      addHeat(game.wanted, WANTED.hitPedHeat);
      playCrash(game.audio);
      showMessage(game.mission, 'Pedestrian down — the heat is on', 2);
    }
  }

  // Wanted: decay, then field the cops the heat calls for.
  updateWanted(game.wanted, dt);
  const want = wantedCopCount(game.wanted);
  while (game.cops.length < want) game.cops.push(spawnCopCar(game.wanted, p, rng));
  while (game.cops.length > want) game.cops.pop();
  let touchingCop = false;
  for (let i = game.cops.length - 1; i >= 0; i--) {
    const cop = game.cops[i];
    if (updateCopCar(cop, p, p.inCar, world, dt)) touchingCop = true;
    if (cop.hp <= 0) {
      explodeCar(game.combat, cop);
      game.cops.splice(i, 1);
    }
    // Ramming a cop car damages it.
    if (p.inCar && carOverlaps(p.inCar, cop.x, cop.y, 10)) {
      cop.hp -= 1;
      p.inCar.hp -= 1;
    }
  }
  // Foot cops when Rico is on foot and wanted.
  if (!p.inCar && game.wanted.stars >= 1 && game.footCops.length < 2) {
    game.footCops.push(spawnFootCop(game.wanted, p, rng));
  }
  if (game.wanted.stars === 0) game.footCops = [];
  for (const cop of game.footCops) {
    if (updateFootCop(cop, p, dt)) touchingCop = true;
  }
  if (updateBust(game.wanted, touchingCop && (!p.inCar || Math.abs(p.inCar.speed) < 40), dt)) {
    spendCash(p, 200);
    respawnAtSafehouse(game);
    game.state = 'busted';
    playBusted(game.audio);
    return;
  }

  // Combat: bullets, enemies, explosions.
  updateCombat(game.combat, p, p.inCar, world, dt, (dmg) => {
    if (p.inCar) {
      p.inCar.hp -= dmg;
    } else if (damagePlayer(p, dmg)) {
      spendCash(p, 100);
      respawnAtSafehouse(game);
      game.state = 'wasted';
    }
  });
  // Mission kill tracking.
  const step = currentStep(game.mission);
  if (step && step.type === 'shoot') {
    game.mission.count = game.combat.enemiesDown - game.killBase;
  }

  // Mission packages: walk over one to collect it.
  for (let i = game.missionPackages.length - 1; i >= 0; i--) {
    const pkg = game.missionPackages[i];
    if (distance(p.x, p.y, pkg.x, pkg.y) < 50) {
      game.missionPackages.splice(i, 1);
      game.mission.count++;
      playPickup(game.audio);
      showMessage(game.mission, 'Package secured', 2);
    }
  }

  // Pickups: walk over one to use it.
  const got = pickupAt(game.pickups, p.x, p.y);
  if (got) {
    if (got.kind === 'health') healPlayer(p, 30);
    else p.ammo += 12;
    playPickup(game.audio);
  }
  updatePickups(game.pickups, dt);
  // Enemies drop pickups when they fall.
  if (game.combat.enemiesDown > (game.lastDrops ?? 0)) {
    game.lastDrops = game.combat.enemiesDown;
    dropPickup(game.pickups, Math.random() < 0.5 ? 'health' : 'ammo', p.x + (Math.random() - 0.5) * 120, p.y + (Math.random() - 0.5) * 120);
  }

  // The mission itself: advance steps, pay out, fail the timer.
  const missionResult = updateMission(game.mission, {
    player: p,
    playerCar: p.inCar,
    enemiesDown: game.combat.enemiesDown - game.killBase,
    wantedStars: game.wanted.stars,
  });
  if (missionResult === 'complete') {
    finishMission(game);
    return;
  }
  game.missionMarker = missionMarker(game.mission);
  game.objectiveText = missionObjectiveText(game.mission);

  // Context prompt for E.
  game.prompt = '';
  if (!p.inCar) {
    if (chestAt(game.chests, p.x, p.y)) game.prompt = 'Stash chest [E]';
    else if (shopAt(p) === 'spray') game.prompt = sprayShopLabel();
    else if (shopAt(p) === 'ammo') game.prompt = ammoShopLabel(p);
    else if (nearestCar(game.cars, p.x, p.y, 70)) game.prompt = 'Enter car [E]';
    else if (game.missionPackages.some((pkg) => distance(p.x, p.y, pkg.x, pkg.y) < 50)) game.prompt = 'Grab package [E]';
  } else {
    game.prompt = 'Exit car [E]';
  }

  // Sound follows the action.
  updateEngineSound(game.audio, p.inCar ? p.inCar.speed : 0, p.inCar ? p.inCar.topSpeed : 1, !!p.inCar);
  updateSiren(game.audio, game.wanted.stars, dt);
  updateMusic(game.audio, dt);

  // Autosave.
  game.chestsTakenCount = chestsTaken(game.chests);
  game.saveTimer -= dt;
  if (game.saveTimer <= 0) {
    game.saveTimer = SAVE_INTERVAL;
    saveGame(game);
  }
}

// Imports used only inside updatePlaying, hoisted by the module system.
function boot() {
  const canvas = document.getElementById('game');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const renderer = createRenderer(canvas);
  const input = createInput(canvas);
  const shot = parseShotParams(window.location.search);
  const seed = shot ? shot.seed : 20261121;
  const game = createGame(seed);
  game.audio = createAudio();
  game.renderer = renderer;
  game.input = input;
  // Read-only handle for play-testing and debugging (never used by the game).
  window.__palmetto = game;

  if (shot) {
    stageShot(game, shot.shot);
    if (shot.shot === 'mission') {
      game.killBase = game.combat.enemiesDown;
      game.missionMarker = missionMarker(game.mission);
    }
  } else {
    beginMission(game, 0);
  }
  game.objectiveText = missionObjectiveText(game.mission);

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    game.time += dt;
    const edges = input.consumeEdges();
    const ctx = renderer.ctx;

    if (game.state === 'title') {
      game.cam = renderWorld(renderer, game, game.time);
      drawTitleScreen(ctx, canvas, game);
      if (edges.confirm || edges.click) {
        game.state = 'playing';
        resumeAudio(game.audio);
      }
    } else if (game.state === 'paused') {
      game.cam = renderWorld(renderer, game, game.time);
      drawHud(ctx, canvas, game);
      drawPauseScreen(ctx, canvas, game);
      if (edges.pause || edges.confirm || edges.click) game.state = 'playing';
    } else if (game.state === 'busted') {
      game.cam = renderWorld(renderer, game, game.time);
      drawBustedScreen(ctx, canvas, game);
      if (edges.confirm || edges.click) game.state = 'playing';
    } else if (game.state === 'wasted') {
      game.cam = renderWorld(renderer, game, game.time);
      drawWastedScreen(ctx, canvas, game);
      if (edges.confirm || edges.click) game.state = 'playing';
    } else if (game.state === 'missionComplete') {
      game.cam = renderWorld(renderer, game, game.time);
      drawHud(ctx, canvas, game);
      drawMissionCompleteScreen(ctx, canvas, game);
      if (edges.confirm || edges.click) {
        const next = game.mission.index + 1;
        if (next < MISSIONS.length) {
          beginMission(game, next);
          game.state = 'playing';
        } else {
          game.state = 'playing';
        }
      }
    } else {
      updatePlaying(game, input, edges, dt);
      if (game.state === 'playing') {
        game.cam = renderWorld(renderer, game, game.time);
        drawHud(ctx, canvas, game);
      } else {
        // updatePlaying moved us to another state mid-frame.
        game.cam = renderWorld(renderer, game, game.time);
        if (game.state === 'busted') drawBustedScreen(ctx, canvas, game);
        else if (game.state === 'wasted') drawWastedScreen(ctx, canvas, game);
        else if (game.state === 'missionComplete') drawMissionCompleteScreen(ctx, canvas, game);
        else if (game.state === 'paused') {
          drawHud(ctx, canvas, game);
          drawPauseScreen(ctx, canvas, game);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();

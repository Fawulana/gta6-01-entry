// The Game: all live state and one step() that moves the world. Screens,
// menus and the render loop live in main.js; this module is pure game logic.
import { SEED, City } from './world.js';
import { Player } from './player.js';
import { Traffic, Car, collideCars } from './vehicles.js';
import { Crowd } from './pedestrians.js';
import { Wanted, Police } from './police.js';
import { Combat } from './combat.js';
import { Missions } from './missions.js';
import { Shops } from './shops.js';
import { SoundBank } from './audio.js';
import { loadGame, saveGame } from './save.js';
import { CAR_CLASSES } from './config.js';

export function createGame() {
  const city = new City(SEED);
  const game = {
    seed: SEED,
    city,
    player: new Player(city.spawns.player.x, city.spawns.player.y),
    traffic: new Traffic(city, SEED),
    crowd: new Crowd(city, SEED),
    police: new Police(SEED),
    wanted: new Wanted(),
    combat: new Combat(),
    missions: new Missions(city),
    shops: new Shops(city),
    sound: new SoundBank(),
    parkedCars: [],
    time: 0,
    playSeconds: 0,
    aiming: false,
    aimAngle: 0,
    hasSaveFlag: false,
    savedFlash: '',
    savedFlashTimer: 0,
  };
  game.combat.traffic = game.traffic;
  for (const spot of city.parkedCars()) {
    const car = new Car(spot.cls, spot.x, spot.y, spot.angle, {
      parked: true,
      color: CAR_CLASSES[spot.cls].colors[0],
    });
    game.parkedCars.push(car);
  }
  return game;
}

export function applySave(game, data) {
  const p = game.player;
  p.x = data.player.x;
  p.y = data.player.y;
  p.health = data.player.health;
  p.armor = data.player.armor;
  p.cash = data.player.cash;
  p.ammo = data.player.ammo;
  p.car = null;
  p.onFoot = true;
  p.dead = false;
  game.wanted.stars = data.wanted ? data.wanted.stars : 0;
  game.wanted.heat = 0;
  game.missions.fromSave(data.missions);
  if (Array.isArray(data.chests)) {
    data.chests.forEach((looted, i) => {
      if (game.city.chests[i]) game.city.chests[i].looted = !!looted;
    });
  }
  game.playSeconds = data.playSeconds || 0;
  game.police.cars = [];
}

export function newGameFromSave() {
  const game = createGame();
  const data = loadGame();
  if (data) applySave(game, data);
  return game;
}

function nearestStealableCar(game, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of game.parkedCars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  for (const car of game.traffic.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  for (const car of game.police.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

function onCrime(game, level, reason) {
  game.wanted.addCrime(level, reason);
  if (level >= 1 && Math.random() < 0.5) game.sound.sirenBlip();
}

// One fixed step of the world. Input is read here for play actions; the
// screen state machine in main.js decides when this runs.
export function stepGame(game, dt, input, canvas) {
  const player = game.player;
  game.time += dt;
  game.playSeconds += dt;
  if (game.savedFlashTimer > 0) game.savedFlashTimer -= dt;

  // Mouse aim.
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = input.mouseX * scaleX;
  const my = input.mouseY * scaleY;
  const cam = game.rendererCamera;
  if (cam) {
    const wx = mx + cam.x;
    const wy = my + cam.y;
    player.aimAngle = Math.atan2(wy - player.py, wx - player.px);
    game.aiming = !player.car;
  }

  // Enter / exit car.
  if (input.hit('KeyE')) {
    if (player.car) {
      player.exitCar(false);
      game.sound.door();
    } else {
      const car = nearestStealableCar(game, player.x, player.y, 56);
      if (car) {
        const wasTraffic = car.traffic || car.police;
        const wasParked = car.parked;
        player.enterCar(car);
        game.sound.engineStart();
        if (wasTraffic) {
          onCrime(game, 1, 'carjacked a driver');
        } else if (wasParked) {
          // A parked theft is only noticed when someone sees it.
          const witness = game.crowd.nearest(player.x, player.y, 320);
          if (witness) onCrime(game, 1, 'seen stealing a parked car');
        }
        if (car.cls === 'marlin') game.missions.message = 'The Golden Marlin is yours — get it to the warehouse';
      }
    }
  }

  // Punch.
  if (input.hit('KeyF') && !player.car && player.punchTimer <= 0) {
    player.punchTimer = 0.35;
    game.sound.punch();
    const ped = game.crowd.nearest(player.x + Math.cos(player.angle) * 26, player.y + Math.sin(player.angle) * 26, 30);
    if (ped) {
      ped.dead = true;
      game.combat.blood(ped.x, ped.y);
      onCrime(game, 1, 'assaulted a pedestrian');
    } else {
      game.combat.punchHit(player.x + Math.cos(player.angle) * 24, player.y + Math.sin(player.angle) * 24, player.angle);
    }
  }

  // Shoot with the mouse.
  if (input.mouseClicked && !player.car && player.ammo > 0 && player.shootCooldown <= 0) {
    player.ammo -= 1;
    player.shootCooldown = 0.28;
    game.sound.shoot();
    game.combat.shoot(player.x, player.y, player.aimAngle, true);
    onCrime(game, 1, 'fired a weapon in public');
  }

  // Start the next mission.
  if (input.hit('KeyM') && !game.missions.active) {
    if (game.missions.startNext()) {
      game.sound.missionStart();
      const heat = game.missions.heatFor(game.missions.active.def.id);
      if (heat > 0) onCrime(game, heat, 'the job went loud');
    }
  }

  // Save.
  if (input.hit('KeyH')) {
    if (saveGame(game)) {
      game.savedFlash = 'Game saved';
      game.savedFlashTimer = 2;
      game.sound.pickup();
    }
  }

  // Shop menu.
  if (game.shops.near && input.hit('KeyE') && !player.car) {
    // E already handled entering a car; shops open with E only when no car
    // is in reach, which the enter-car branch above leaves alone.
  }
  if (game.shops.near && input.hit('KeyQ')) {
    game.shops.open = game.shops.near;
    game.shops.selected = 0;
  }
  if (game.shops.open) {
    if (input.hit('ArrowUp', 'KeyW')) game.shops.selected = Math.max(0, game.shops.selected - 1);
    if (input.hit('ArrowDown', 'KeyS')) {
      const items = game.shops.open.kind === 'spray' ? 1 : 3;
      game.shops.selected = Math.min(items - 1, game.shops.selected + 1);
    }
    if (input.hit('Enter')) game.shops.buy(game);
    if (input.hit('Escape')) game.shops.open = null;
  }

  // Move the player.
  player.update(dt, input, game.city);

  // Traffic and crowd.
  game.traffic.step(dt, game.city, player.car);
  const danger = player.car && Math.abs(player.car.speed) > 120
    ? { x: player.car.x, y: player.car.y }
    : (game.combat.bullets.length ? { x: player.px, y: player.py } : null);
  game.crowd.step(dt, game.city, danger);

  // Traffic cars hitting the player on foot.
  if (!player.car && !player.dead) {
    for (const car of game.traffic.cars) {
      if (car.dead) continue;
      if (Math.hypot(car.x - player.x, car.y - player.y) < 26 && Math.abs(car.speed) > 90) {
        player.damage(22, 'hit by traffic');
        game.combat.blood(player.x, player.y);
        game.sound.crash();
        car.speed *= 0.3;
      }
    }
  }

  // Police.
  const policeVisible = game.police.step(dt, player, game.wanted, game.city);
  game.wanted.step(dt, policeVisible);
  if (game.wanted.stars > 0) {
    game.sound.sirenTimer = (game.sound.sirenTimer || 0) - dt;
    if (game.sound.sirenTimer <= 0) {
      game.sound.sirenTimer = 2.2;
      game.sound.sirenBlip();
    }
  }

  // Combat.
  game.combat.step(dt, game.city, player, game.crowd, game.police, game.wanted, (level, reason) => onCrime(game, level, reason));

  // Parked-car collisions with the player's car.
  if (player.car) {
    for (const car of game.parkedCars) {
      car.hitCooldown = Math.max(0, car.hitCooldown - dt);
      if (car.dead || car === player.car) continue;
      if (collideCars(player.car, car)) game.sound.crash();
    }
  }

  // Stash chests.
  for (const chest of game.city.chests) {
    if (chest.looted) continue;
    if (Math.hypot(player.px - chest.x, player.py - chest.y) < 30) {
      chest.looted = true;
      player.cash += chest.cash;
      game.missions.message = `Stash found: +$${chest.cash}`;
      game.missions.messageTimer = 3;
      game.sound.cash();
    }
  }

  // Missions.
  const wasActive = game.missions.active;
  const wasStage = wasActive ? wasActive.stage : -1;
  game.missions.step(dt, game);
  if (wasActive && game.missions.active === null && game.missions.completed > 0) {
    // A mission just completed: pay out.
    const def = wasActive.def;
    player.cash += def.reward;
    game.sound.missionDone();
  }
  if (wasActive && game.missions.active && game.missions.active.stage !== wasStage) {
    // Bank alarm: grabbing the cash brings the heat.
    if (wasActive.def.id === 5 && wasStage === 1) {
      onCrime(game, 2, 'bank alarm tripped');
    }
    game.sound.pickup();
  }
  if (game.missions.finishedAll && !game.winShown) {
    game.winShown = true;
  }

  // Shops.
  game.shops.step(dt, player);

  // Engine and music.
  const speedRatio = player.car ? Math.abs(player.car.speed) / player.car.spec.top : 0;
  game.sound.engine(speedRatio);
  game.sound.musicTick(dt, !!player.car && speedRatio > 0.1);

  // Car smoke.
  if (player.car && player.car.health < 40 && Math.random() < dt * 6) {
    game.combat.smoke(player.car.x, player.car.y);
  }
}

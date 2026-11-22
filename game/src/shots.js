// Deterministic screenshot scenes behind ?shot=start|play|chase|mission.
// Each one builds a fresh world from the fixed seed, places the player and
// the systems the scene shows, and steps the world a short fixed amount, so
// the same URL always renders the same frame.
import { createGame } from './game.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

function placeInCar(game, cls, x, y, angle, speed) {
  const car = game.parkedCars.find((c) => c.cls === cls) || game.parkedCars[0];
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed;
  car.parked = false;
  game.player.enterCar(car);
  return car;
}

import { Car } from './vehicles.js';

function spawnCops(game, spots) {
  for (const [x, y] of spots) {
    const car = new Car('police', x, y, Math.atan2(game.player.py - y, game.player.px - x), { color: '#1a1a2e' });
    car.speed = 220;
    game.police.cars.push(car);
  }
}

export function stageShot(name, renderer) {
  const game = createGame();
  game.rendererCamera = renderer.camera;
  game.sound.muted = true;
  const step = 1 / 60;

  if (name === 'play') {
    // Mid-drive downtown: mission 1 active, traffic on the roads.
    game.missions.startNext();
    placeInCar(game, 'coupe', 1200, 1200, 0, 230);
    for (let i = 0; i < 150; i += 1) {
      game.traffic.step(step, game.city, game.player.car);
      game.crowd.step(step, game.city, null);
    }
    renderer.camera.snap(game.player.px - 160, game.player.py);
    return { game, screen: SCREEN_PLAY };
  }

  if (name === 'chase') {
    // Three-star chase: police closing in on a sports car, mission 4 active.
    game.missions.index = 3;
    game.missions.startNext();
    game.wanted.addCrime(3, 'chase scene');
    placeInCar(game, 'sports', 2000, 2000, 0, 300);
    spawnCops(game, [[1640, 2000], [2360, 2000], [2000, 2360]]);
    for (let i = 0; i < 90; i += 1) {
      game.police.step(step, game.player, game.wanted, game.city);
      game.traffic.step(step, game.city, game.player.car);
      game.player.car.drive(1, 0, step);
    }
    renderer.camera.snap(game.player.px - 200, game.player.py - 60);
    return { game, screen: SCREEN_PLAY };
  }

  if (name === 'mission') {
    // The bank job: on foot at the Bayfront Bank, two stars, cops closing.
    game.missions.index = 4;
    game.missions.startNext();
    game.wanted.addCrime(2, 'bank alarm');
    const bank = game.city.spawns.bank;
    game.player.x = bank.x + 40;
    game.player.y = bank.y + 40;
    game.player.angle = Math.PI / 4;
    spawnCops(game, [[bank.x + 420, bank.y - 120], [bank.x - 380, bank.y + 200]]);
    for (let i = 0; i < 90; i += 1) {
      game.police.step(step, game.player, game.wanted, game.city);
      game.crowd.step(step, game.city, { x: game.player.x, y: game.player.y });
    }
    // The Golden Marlin parked nearby, waiting for the getaway.
    const marlin = game.parkedCars.find((c) => c.cls === 'marlin');
    if (marlin) {
      marlin.x = bank.x;
      marlin.y = bank.y + 160;
      marlin.angle = Math.PI / 2;
    }
    renderer.camera.snap(game.player.px - 320, game.player.py - 200);
    return { game, screen: SCREEN_PLAY };
  }

  // 'start' and anything else: the title screen.
  return { game, screen: SCREEN_TITLE };
}

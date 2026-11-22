// Palmetto Bay — screenshot staging.
//
// The screenshots are real renders of the game, staged deterministically:
// ?shot=start shows the title over the city, ?shot=drive puts Rico in the
// gold Aurum GT on the boulevard, ?shot=chase stages a three-star police
// chase, and ?shot=mission stages a mission in progress with the GPS
// route. The seed fixes the city.

import { LANDMARKS } from './config.js';
import { addHeat } from './police.js';
import { makeCar } from './vehicles.js';

export function parseShotParams(search) {
  const q = new URLSearchParams(search);
  const shot = q.get('shot');
  if (!shot) return null;
  const seed = Number(q.get('seed') ?? '1');
  return { shot, seed: Number.isFinite(seed) ? seed : 1 };
}

// Stage a scene into the live game state. Called once, right after the
// game is created and before the first frame.
export function stageShot(game, shot) {
  const p = game.player;
  if (shot === 'start') {
    // Title screen over downtown: Rico on foot by the marina road.
    p.x = 1800;
    p.y = 1150;
    p.angle = Math.PI / 2;
    game.state = 'title';
    return;
  }
  if (shot === 'drive') {
    // Rico driving the gold Aurum GT down the main boulevard, traffic around.
    const gt = makeCar('aurum', 1800, 1000, 0, '#ffd700');
    gt.speed = 380;
    game.cars.push(gt);
    p.inCar = gt;
    p.x = gt.x;
    p.y = gt.y;
    game.state = 'playing';
    return;
  }
  if (shot === 'chase') {
    // Three stars: Rico in a sports car, two cop cars closing in.
    const car = makeCar('sports', 1400, 1400, 0, '#e74c3c');
    car.speed = 360;
    game.cars.push(car);
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    addHeat(game.wanted, 3);
    game.state = 'playing';
    return;
  }
  if (shot === 'mission') {
    // Mission 6, the bank job: Rico on foot at the bank, vault cash marker
    // and GPS route to the safehouse on the HUD and minimap.
    p.x = LANDMARKS.bank.x + 40;
    p.y = LANDMARKS.bank.y + 90;
    p.angle = -Math.PI / 2;
    game.mission.index = 5;
    game.mission.step = 1;
    game.mission.active = true;
    game.mission.timer = 0;
    game.mission.count = 0;
    game.mission.message = 'The Big Score — grab the vault cash';
    game.mission.messageTimer = 3;
    game.missionPackages = [{ x: LANDMARKS.bank.x + 120, y: LANDMARKS.bank.y + 60 }];
    game.state = 'playing';
  }
}

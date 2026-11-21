// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by a simple driving autopilot (follow the road route to a target, brake for
// nothing — it is dusk and the streets are empty enough), so the frame is what
// the game really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { addHeat } from './police.js';
import { createWorld } from './world.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 20;
const CHASE_SECONDS = 10;
const MISSION_SECONDS = 4;
const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Steering input that drives `car` toward the next waypoint of its route. */
function driveInput(car, route, index) {
  const target = route[Math.min(index, route.length - 1)];
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  const diff = angleDiff(want, car.angle);
  return {
    diff,
    input: {
      // Throttle when roughly aligned — or when nearly stopped, since a car
      // that never moves can never steer into line.
      up: Math.abs(diff) < 1.4 || Math.abs(car.speed) < 60,
      down: false,
      left: diff < -0.07,
      right: diff > 0.07,
      handbrake: false,
    },
    arrived: dist < 70,
  };
}

/**
 * Cruise a car along a route for `seconds`, with stuck recovery: if the car
 * crawls for over a second (wedged on a corner or boxed in by traffic), it
 * reverses out and re-aims. The cruise caps speed and brakes for the car ahead,
 * so the car survives the tour.
 */
function cruise(world, car, route, seconds) {
  let waypoint = 0;
  let stuckTimer = 0;
  let reversing = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const { input, arrived, diff } = driveInput(car, route, waypoint);
    if (arrived && waypoint < route.length - 1) waypoint += 1;
    let stepInput = input;
    // Cap the cruise speed: a tour at full throttle ends in a wall.
    if (Math.abs(car.speed) > 430) stepInput.up = false;
    // Slow for turns: a tight radius keeps the car inside the intersection.
    // Handbrake turns are tighter still — the car pivots instead of swinging
    // wide into the corner building.
    if (Math.abs(diff) > 0.5) {
      if (Math.abs(car.speed) > 160) stepInput.up = false;
      stepInput.handbrake = true;
    }
    // Brake for the car directly ahead.
    for (const other of world.state.cars) {
      if (other === car || other.dead || other.parked) continue;
      const ox = other.x - car.x;
      const oy = other.y - car.y;
      const along = ox * Math.cos(car.angle) + oy * Math.sin(car.angle);
      const side = Math.abs(-ox * Math.sin(car.angle) + oy * Math.cos(car.angle));
      if (along > 0 && along < 130 && side < 42) {
        stepInput.up = false;
        break;
      }
    }
    if (Math.abs(car.speed) < 40) stuckTimer += STEP;
    else stuckTimer = 0;
    if (stuckTimer > 1.2) {
      reversing = 0.9;
      stuckTimer = 0;
    }
    if (reversing > 0) {
      reversing -= STEP;
      stepInput = { up: false, down: true, left: input.right, right: input.left, handbrake: false };
    }
    world.step(STEP, { ...emptyInput(), ...stepInput });
  }
}

function emptyInput() {
  return {
    up: false, down: false, left: false, right: false,
    run: false, handbrake: false, shoot: false, punch: false,
    interact: false, cycleWeapon: false, escape: false, buy: null, mouseWorld: null,
  };
}

/**
 * Build a fresh world and set it to the named scene; return the world and the
 * screen to draw over it. start: title over Ocean Drive at dusk. drive: a
 * sports car cruising downtown. chase: a three-star pursuit with a roadblock
 * ahead. mission: on foot at the marina, the gold Aurum GT in reach and the
 * finale mission live. A fresh world per scene keeps the simulation's closures
 * and the rendered state the same object.
 */
export function stageShot(name, seed) {
  const world = createWorld(seed, { fresh: true });
  const state = world.state;
  if (name !== 'drive' && name !== 'chase' && name !== 'mission') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, emptyInput());
    return { world, screen: SCREEN_TITLE };
  }

  if (name === 'drive') {
    // Put the player in a blue sports car on Ocean Drive and cruise a loop of
    // the city: south down the Strip, west through the Barrio, north downtown,
    // and back east — mostly right turns, so the car is moving when the frame
    // is taken, and it never strays up to the marina.
    const car = state.cars.find((c) => c.modelKey === 'sports' && c.parked);
    const sports = car || state.cars[0];
    sports.x = 3700;
    sports.y = 2400;
    sports.angle = Math.PI / 2;
    sports.parked = false;
    state.player.inCar = sports;
    sports.isPlayer = true;
    state.player.x = sports.x;
    state.player.y = sports.y;
    const tour = [
      { x: 3700, y: 2820 }, { x: 1920, y: 2820 }, { x: 1920, y: 820 },
      { x: 3420, y: 820 }, { x: 3420, y: 2420 },
    ];
    cruise(world, sports, tour, DRIVE_SECONDS);
    // A clean car for the frame: the tour's bumps are not the story.
    sports.health = 100;
    sports.smoke = 0;
    return { world, screen: SCREEN_PLAY };
  }

  if (name === 'chase') {
    const car = state.cars.find((c) => c.modelKey === 'sports' && c.parked);
    const sports = car || state.cars[0];
    sports.x = 2420;
    sports.y = 2000;
    sports.angle = -Math.PI / 2;
    sports.parked = false;
    state.player.inCar = sports;
    sports.isPlayer = true;
    state.player.x = sports.x;
    state.player.y = sports.y;
    addHeat(state.police, 3);
    state.police.roadblockTimer = 0;
    const route = state.city.route(sports.x, sports.y, 2420, 420);
    cruise(world, sports, route, CHASE_SECONDS);
    // Battered, not dead: the chase is still on in the frame.
    sports.health = Math.max(sports.health, 55);
    sports.smoke = 0;
    return { world, screen: SCREEN_PLAY };
  }

  // mission: on foot at the marina, finale live, gold car gleaming.
  world.beginMission(5);
  state.player.x = 3880;
  state.player.y = 620;
  state.player.angle = Math.PI / 4;
  state.player.weapon = 'pistol';
  addHeat(state.police, 1);
  for (let i = 0; i < MISSION_SECONDS / STEP; i += 1) world.step(STEP, emptyInput());
  return { world, screen: SCREEN_PLAY };
}

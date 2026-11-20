// Cars: the player's driving physics, the traffic that follows the road
// grid, stealing, and drawing. Traffic cars drive on the right-hand lane of
// a road and pick a new direction at each intersection.
import {
  CAR_ACCEL, CAR_BRAKE, CAR_COLORS, CAR_LENGTH, CAR_MAX_REVERSE,
  CAR_MAX_SPEED, CAR_TURN_RATE, CAR_WIDTH, ROAD_WIDTH, WORLD_H, WORLD_W,
  angleDiff, clamp, dist,
} from './config.js';
import { isOnRoad, nearestRoad, resolveBuildings } from './city.js';

let nextId = 1;

export function makeCar(x, y, angle, color, kind) {
  return {
    id: nextId, x, y, angle, speed: 0, color, kind: kind || 'sedan',
    traffic: false, police: false, health: 100, dead: false,
    // traffic AI state
    axis: 'x', dir: 1, lane: 0, cruise: 150, stuck: 0,
  };
}

export function carColor(rng) { return rng.pick(CAR_COLORS); }

/** Player driving: W/Up accelerates, S/Down brakes and reverses, A/D steer. */
export function drivePlayerCar(G, car, dt) {
  const input = G.input;
  const up = input.isDown('KeyW') || input.isDown('ArrowUp');
  const down = input.isDown('KeyS') || input.isDown('ArrowDown');
  const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
  const right = input.isDown('KeyD') || input.isDown('ArrowRight');
  if (up) car.speed += CAR_ACCEL * dt;
  if (down) car.speed -= (car.speed > 0 ? CAR_BRAKE : CAR_ACCEL * 0.6) * dt;
  if (!up && !down) car.speed -= car.speed * 1.4 * dt;
  car.speed = clamp(car.speed, -CAR_MAX_REVERSE, CAR_MAX_SPEED);
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const moving = Math.abs(car.speed) > 12;
  if (steer !== 0 && moving) {
    car.angle += steer * CAR_TURN_RATE * dt * clamp(Math.abs(car.speed) / 220, 0.35, 1) * (car.speed < 0 ? -1 : 1);
  }
  moveCar(G, car, dt);
}

/** Advance a car along its heading and resolve building / car collisions. */
export function moveCar(G, car, dt) {
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const fixed = resolveBuildings(G.city, nx, ny, CAR_LENGTH * 0.55);
  const hitWall = fixed.x !== nx || fixed.y !== ny;
  if (hitWall && Math.abs(car.speed) > 260) {
    car.speed *= 0.45;
    G.events.push({ type: 'crash' });
  } else if (hitWall) {
    car.speed *= 0.7;
  }
  car.x = clamp(fixed.x, 30, WORLD_W - 30);
  car.y = clamp(fixed.y, 30, WORLD_H - 30);
  // Soft car-to-car push so traffic never stacks into one spot.
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d > 0.01 && d < CAR_LENGTH) {
      const push = (CAR_LENGTH - d) / 2;
      const ux = (car.x - other.x) / d;
      const uy = (car.y - other.y) / d;
      car.x += ux * push;
      car.y += uy * push;
      if (car.traffic) car.speed = Math.min(car.speed, other.speed);
    }
  }
}

/** Traffic: follow the current road; at an intersection pick a new heading. */
export function updateTrafficCar(G, car, dt) {
  const rng = G.rng;
  const half = ROAD_WIDTH / 2;
  // Where the car is along its current axis, and how close the next crossing is.
  const along = car.axis === 'x' ? car.x : car.y;
  const cross = car.axis === 'x' ? G.city.roadsY : G.city.roadsX;
  let nextCross = null;
  for (const c of cross) {
    if (car.dir > 0 && c > along + 10) { nextCross = c; break; }
    if (car.dir < 0 && c < along - 10) { nextCross = c; break; }
  }
  if (nextCross !== null && Math.abs(along - nextCross) < 26) {
    // At the intersection: mostly straight on, sometimes turn.
    const roll = rng.next();
    if (roll < 0.16) {
      // Turn left or right onto the crossing road.
      const newAxis = car.axis === 'x' ? 'y' : 'x';
      const turn = rng.chance(0.5) ? 1 : -1;
      car.axis = newAxis;
      car.dir = turn;
      car.lane = turn * 19;
      car.angle = newAxis === 'x' ? (turn > 0 ? 0 : Math.PI) : (turn > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (newAxis === 'x') car.y = nextCross + car.lane;
      else car.x = nextCross + car.lane;
    }
    // else: carry straight on.
  }
  // Ease toward the lane centre and cruise speed; slow for a car ahead.
  const laneTarget = car.axis === 'x' ? (car.dir > 0 ? 19 : -19) : (car.dir > 0 ? 19 : -19);
  car.lane += (laneTarget - car.lane) * Math.min(1, dt * 3);
  const ahead = carAhead(G, car);
  const want = ahead !== null ? Math.min(car.cruise, ahead * 0.8) : car.cruise;
  car.speed += clamp(want - car.speed, -260 * dt, 200 * dt);
  if (car.axis === 'x') {
    car.y = nearestRoad(G.city, car.x, car.y).line + car.lane;
    car.x += car.dir * car.speed * dt;
  } else {
    car.x = nearestRoad(G.city, car.x, car.y).line + car.lane;
    car.y += car.dir * car.speed * dt;
  }
  car.angle = car.axis === 'x' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  car.x = clamp(car.x, 40, WORLD_W - 40);
  car.y = clamp(car.y, 40, WORLD_H - 40);
}

/** Distance to the nearest car ahead on the same road, or null. */
function carAhead(G, car) {
  let best = null;
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    if (car.axis === 'x' && Math.abs(other.y - car.y) < 30) {
      const gap = (other.x - car.x) * car.dir;
      if (gap > 0 && gap < 90 && (best === null || gap < best)) best = gap;
    }
    if (car.axis === 'y' && Math.abs(other.x - car.x) < 30) {
      const gap = (other.y - car.y) * car.dir;
      if (gap > 0 && gap < 90 && (best === null || gap < best)) best = gap;
    }
  }
  return best;
}

/** Spawn a traffic car on a road near (but not on top of) the given point. */
export function spawnTrafficCar(G, nearX, nearY) {
  const rng = G.rng;
  const road = nearestRoad(G.city, nearX + rng.range(-500, 500), nearY + rng.range(-500, 500));
  const axis = road.axis;
  const dir = rng.chance(0.5) ? 1 : -1;
  const lane = dir * 19;
  const x = axis === 'x' ? rng.range(120, WORLD_W - 120) : road.line + lane;
  const y = axis === 'y' ? rng.range(120, WORLD_H - 120) : road.line + lane;
  const car = makeCar(x, y, axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), carColor(rng));
  car.traffic = true;
  car.axis = axis;
  car.dir = dir;
  car.lane = lane;
  car.cruise = rng.range(110, 185);
  car.speed = car.cruise;
  if (!isOnRoad(G.city, car.x, car.y)) return null;
  G.cars.push(car);
  return car;
}

/** The nearest driveable car within maxDist of a point. */
export function nearestCar(G, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.dead) continue;
    const d = dist(x, y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

/** Steal the nearest car: its driver (if any) flees on foot, the player gets in. */
export function stealCar(G, car) {
  car.traffic = false;
  car.police = false;
  G.player.inCar = car;
  G.player.x = car.x;
  G.player.y = car.y;
  G.addWanted(1);
  G.toast('Car stolen — the cops noticed.');
  G.events.push({ type: 'steal' });
  // A fleeing driver appears beside the car.
  G.peds.push({
    x: car.x + 40, y: car.y + 30, angle: 0, speed: 190, shirt: '#f5f5f5',
    state: 'flee', fleeX: car.x + 400, fleeY: car.y + 400, down: false, downT: 0,
  });
}

export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-CAR_LENGTH / 2 + 3, -CAR_WIDTH / 2 + 4, CAR_LENGTH, CAR_WIDTH);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 7);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  roundRect(ctx, -8, -CAR_WIDTH / 2 + 4, 16, CAR_WIDTH - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(200,220,235,0.75)';
  ctx.fillRect(8, -CAR_WIDTH / 2 + 5, 4, CAR_WIDTH - 10);
  // Headlights and taillights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 + 2, 2, 5);
  ctx.fillRect(CAR_LENGTH / 2 - 2, CAR_WIDTH / 2 - 7, 2, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2 + 2, 2, 5);
  ctx.fillRect(-CAR_LENGTH / 2, CAR_WIDTH / 2 - 7, 2, 5);
  if (car.police) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-CAR_LENGTH / 2 + 4, -CAR_WIDTH / 2 + 2, CAR_LENGTH - 8, 4);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, -CAR_WIDTH / 2 + 12);
    // Light bar, flashing with time.
    const flash = Math.floor(performance.now() / 180) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d55' : '#0a84ff';
    ctx.fillRect(-4, -CAR_WIDTH / 2 - 2, 8, 4);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

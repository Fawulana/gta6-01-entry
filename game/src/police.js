// Wanted system and police for Solmar Bay. Stars 0-5. Cops spawn on roads
// near the player, chase and ram; at 3+ stars they set roadblocks across
// the road ahead. Heat fades when no cop can see the player. Busted (on
// foot, cornered) and Wasted (0 HP) end the run with a respawn.
import { WORLD, ROAD_LINES, ROAD_W, LANE, MAX_COPS, WANTED_DECAY_SECONDS, ROADBLOCK_STARS } from './config.js';
import { makeCar, carsOverlap, resolveCarCollision } from './vehicles.js';
import { makeRng, range, pick } from './random.js';

export function addWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + stars));
  if (state.wanted > 0) state.hiddenTimer = 0;
}

export function setWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(5, stars));
  state.hiddenTimer = 0;
}

// Spawn one police cruiser on a road near (but not on top of) the player.
export function spawnCop(state, rng) {
  const p = state.player;
  const axis = rng() < 0.5 ? 'h' : 'v';
  const line = pick(rng, ROAD_LINES);
  const dir = rng() < 0.5 ? 1 : -1;
  let x;
  let y;
  let angle;
  // Place it on a road 500-800 units away, roughly in the player's direction.
  if (axis === 'h') {
    x = p.x + (rng() < 0.5 ? -1 : 1) * range(rng, 500, 800);
    y = line + (dir > 0 ? LANE : -LANE);
    angle = dir > 0 ? 0 : Math.PI;
  } else {
    x = line + (dir > 0 ? -LANE : LANE);
    y = p.y + (rng() < 0.5 ? -1 : 1) * range(rng, 500, 800);
    angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  x = Math.max(90, Math.min(WORLD - 90, x));
  y = Math.max(90, Math.min(WORLD - 90, y));
  const cop = makeCar('police', x, y, angle, { traffic: false, roadAxis: axis, roadLine: line, dir });
  cop.wanted = true;
  cop.speed = 200;
  cop.sirenPhase = rng() * Math.PI * 2;
  state.cops.push(cop);
  state.cars.push(cop);
}

export function desiredCopCount(wanted) {
  if (wanted <= 0) return 0;
  return Math.min(MAX_COPS, 1 + wanted);
}

// A roadblock: two cruisers parked sideways across the road ahead of the
// player, with a gap a good driver can thread at speed.
export function spawnRoadblock(state, rng) {
  const p = state.player;
  const car = p.inCar;
  const angle = car ? car.angle : p.angle;
  const ahead = 420;
  const cx = p.x + Math.cos(angle) * ahead;
  const cy = p.y + Math.sin(angle) * ahead;
  const side = angle + Math.PI / 2;
  const gap = 46;
  for (const s of [-1, 1]) {
    const bx = cx + Math.cos(side) * s * (gap + 30);
    const by = cy + Math.sin(side) * s * (gap + 30);
    const block = makeCar('police', bx, by, side, { traffic: false });
    block.speed = 0;
    block.roadblock = true;
    block.wanted = true;
    state.cops.push(block);
    state.cars.push(block);
    state.roadblocks.push(block);
  }
  state.roadblockTimer = 25; // seconds before the next one can be set
  state.flashMessage('ROADBLOCK AHEAD', 2.5);
}

export function updatePolice(state, dt, rng) {
  const p = state.player;
  if (state.wanted > 0) {
    // Keep the right number of cops on the street.
    const want = desiredCopCount(state.wanted);
    const active = state.cops.filter((c) => !c.roadblock && !c.dead).length;
    if (active < want && state.copSpawnTimer <= 0) {
      spawnCop(state, rng);
      state.copSpawnTimer = 2.2;
    }
    state.copSpawnTimer -= dt;
    // Roadblocks at 3+ stars.
    if (state.wanted >= ROADBLOCK_STARS && state.roadblockTimer <= 0 && p.inCar) {
      spawnRoadblock(state, rng);
    }
    state.roadblockTimer -= dt;
    // Hidden? A cop within 520 units can see the player.
    let seen = false;
    for (const cop of state.cops) {
      if (cop.dead) continue;
      const d = Math.hypot(cop.x - p.x, cop.y - p.y);
      if (d < 520) seen = true;
    }
    if (seen) state.hiddenTimer = 0;
    else {
      state.hiddenTimer += dt;
      if (state.hiddenTimer >= WANTED_DECAY_SECONDS) {
        state.wanted -= 1;
        state.hiddenTimer = 0;
        if (state.wanted === 0) state.flashMessage('YOU LOST THE COPS', 2.5);
      }
    }
  } else {
    state.copSpawnTimer = 0;
    // Stragglers drive off and despawn.
    for (const cop of state.cops) {
      if (!cop.dead) cop.dead = true;
    }
  }

  // Chase AI: steer toward the player, ram when close.
  for (const cop of state.cops) {
    if (cop.dead || cop.roadblock) continue;
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1400) {
      // Too far: despawn and respawn closer next time.
      cop.dead = true;
      continue;
    }
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - cop.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.2));
    const wantSpeed = Math.min(cop.maxSpeed, 380 + state.wanted * 30);
    const throttle = cop.speed < wantSpeed ? 1 : 0;
    cop.speed += cop.accel * throttle * dt;
    cop.speed -= cop.speed * 0.2 * dt;
    cop.angle += steer * cop.grip * dt * 0.9 * Math.sign(cop.speed || 1);
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    cop.sirenPhase += dt * 6;
    // Ram the player's car.
    if (p.inCar && carsOverlap(cop, p.inCar)) {
      resolveCarCollision(cop, p.inCar);
      p.inCar.hp -= 6 * dt * 10;
      state.shake = Math.min(14, state.shake + 6);
      if (state.sound) state.sound.crash();
      state.spawnSparks(p.inCar.x, p.inCar.y, 6);
      if (p.inCar.hp <= 0) {
        p.inCar.hp = 0;
        state.explodeCar(p.inCar);
      }
    }
    // Busted: on foot and a cop sits on the player.
    if (!p.inCar && dist < 34) {
      state.bustedTimer += dt;
      if (state.bustedTimer > 1.4) {
        state.busted();
        return;
      }
    } else {
      state.bustedTimer = Math.max(0, state.bustedTimer - dt * 2);
    }
  }
  // Remove dead cops from the live lists.
  if (state.cops.some((c) => c.dead)) {
    state.cops = state.cops.filter((c) => !c.dead);
    state.cars = state.cars.filter((c) => !(c.wanted && c.dead));
    state.roadblocks = state.roadblocks.filter((c) => !c.dead);
  }
}

// Sirens wail while any cop is active.
export function sirensActive(state) {
  return state.wanted > 0 && state.cops.some((c) => !c.dead);
}

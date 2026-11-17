// Pedestrians: they stroll the sidewalks, cross at intersections, flee from
// gunfire and police, and get knocked down when a car hits them.
import { PED_SHIRTS, PLAYER_RADIUS, ROAD_WIDTH, WORLD_H, WORLD_W, clamp, dist } from './config.js';
import { isOnRoad, nearestRoad, resolveBuildings } from './city.js';

export function spawnPed(G, x, y) {
  const rng = G.rng;
  G.peds.push({
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(38, 68),
    shirt: rng.pick(PED_SHIRTS),
    state: 'walk',
    fleeX: 0, fleeY: 0,
    down: false, downT: 0,
    turnT: rng.range(2, 6),
    axis: rng.chance(0.5) ? 'x' : 'y',
    dir: rng.chance(0.5) ? 1 : -1,
  });
}

/** Scatter pedestrians on sidewalks around a point. */
export function seedPeds(G, cx, cy, count) {
  const rng = G.rng;
  for (let i = 0; i < count; i += 1) {
    const road = nearestRoad(G.city, cx + rng.range(-700, 700), cy + rng.range(-700, 700));
    const off = ROAD_WIDTH / 2 + 16;
    const x = road.axis === 'x' ? rng.range(120, WORLD_W - 120) : road.line + (rng.chance(0.5) ? off : -off);
    const y = road.axis === 'y' ? rng.range(120, WORLD_H - 120) : road.line + (rng.chance(0.5) ? off : -off);
    if (!isOnRoad(G.city, x, y)) spawnPed(G, x, y);
  }
}

export function updatePeds(G, dt) {
  const rng = G.rng;
  for (const ped of G.peds) {
    if (ped.down) {
      ped.downT -= dt;
      if (ped.downT <= 0) { ped.down = false; ped.state = 'flee'; ped.fleeX = ped.x + 500; ped.fleeY = ped.y; }
      continue;
    }
    if (ped.state === 'flee') {
      const dx = ped.x - ped.fleeX;
      const dy = ped.y - ped.fleeY;
      const d = Math.hypot(dx, dy) || 1;
      ped.angle = Math.atan2(-dy, -dx);
      ped.x += Math.cos(ped.angle) * ped.speed * 2.4 * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * 2.4 * dt;
      if (d > 600) ped.state = 'walk';
    } else {
      ped.turnT -= dt;
      if (ped.turnT <= 0) {
        ped.turnT = rng.range(3, 8);
        if (rng.chance(0.35)) { ped.axis = ped.axis === 'x' ? 'y' : 'x'; ped.dir = rng.chance(0.5) ? 1 : -1; }
        else if (rng.chance(0.3)) ped.dir *= -1;
      }
      const step = ped.speed * dt;
      if (ped.axis === 'x') ped.x += ped.dir * step;
      else ped.y += ped.dir * step;
      ped.angle = ped.axis === 'x' ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      // Stay on the sidewalk: snap back to the road edge if drifted onto asphalt.
      if (isOnRoad(G.city, ped.x, ped.y)) {
        const road = nearestRoad(G.city, ped.x, ped.y);
        if (road.axis === 'x') ped.y = road.line + (ped.y > road.line ? ROAD_WIDTH / 2 + 14 : -ROAD_WIDTH / 2 - 14);
        else ped.x = road.line + (ped.x > road.line ? ROAD_WIDTH / 2 + 14 : -ROAD_WIDTH / 2 - 14);
      }
    }
    const fixed = resolveBuildings(G.city, ped.x, ped.y, 10);
    ped.x = clamp(fixed.x, 20, WORLD_W - 20);
    ped.y = clamp(fixed.y, 20, WORLD_H - 20);
  }
  // A car hitting a pedestrian knocks them down and raises the heat.
  for (const car of G.cars) {
    if (car.dead || Math.abs(car.speed) < 60) continue;
    for (const ped of G.peds) {
      if (ped.down) continue;
      if (dist(car.x, car.y, ped.x, ped.y) < 26) {
        ped.down = true;
        ped.downT = 4;
        if (car === G.player.inCar) {
          G.addWanted(1);
          G.toast('You hit a pedestrian!');
        }
        G.events.push({ type: 'pedDown', x: ped.x, y: ped.y });
      }
    }
  }
}

/** Everyone nearby runs from a gunshot or a siren at (x, y). */
export function scarePeds(G, x, y) {
  for (const ped of G.peds) {
    if (ped.down) continue;
    if (dist(x, y, ped.x, ped.y) < 420) {
      ped.state = 'flee';
      ped.fleeX = x;
      ped.fleeY = y;
    }
  }
}

export function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  if (ped.down) {
    ctx.rotate(0.6);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(ped.angle);
  // Body and head, walking bob.
  const bob = Math.sin(performance.now() / 160 + ped.x) * 1.5;
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(0, bob * 0.3, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(7, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(-2, 6, 3, 0, Math.PI * 2);
  ctx.arc(-2, -6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

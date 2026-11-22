// Palmetto Bay — the renderer.
//
// One job: draw the world on the canvas. The camera follows Rico (or his
// car), the dusk light warms everything, and every system the game has
// shows up here: traffic, peds, police, missions, chests, shops and the
// GPS route. The HUD and minimap live in hud.js; this file only draws the
// world itself.

import { BEACH_Y, PALETTE, ROADS_X, ROADS_Y, ROAD_W, WATER_Y, WORLD_H, WORLD_W } from './config.js';
import { isOnRoad } from './world.js';

export function createRenderer(canvas) {
  return { canvas, ctx: canvas.getContext('2d') };
}

export function computeCamera(renderer, focusX, focusY) {
  const { canvas } = renderer;
  return {
    x: focusX - canvas.width / 2,
    y: focusY - canvas.height / 2,
    w: canvas.width,
    h: canvas.height,
  };
}

function drawGround(ctx, cam, world) {
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(cam.x - 40, cam.y - 40, cam.w + 80, cam.h + 80);
  // Parks.
  ctx.fillStyle = PALETTE.park;
  for (const p of world.parks) ctx.fillRect(p.x, p.y, p.w, p.h);
  // Sidewalk blocks: the pavement between the roads.
  ctx.fillStyle = PALETTE.sidewalk;
  for (let ix = 0; ix < ROADS_X.length - 1; ix++) {
    for (let iy = 0; iy < ROADS_Y.length - 1; iy++) {
      const x0 = ROADS_X[ix] + ROAD_W / 2;
      const y0 = ROADS_Y[iy] + ROAD_W / 2;
      const x1 = ROADS_X[ix + 1] - ROAD_W / 2;
      const y1 = ROADS_Y[iy + 1] - ROAD_W / 2;
      if (y0 >= BEACH_Y) continue;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  // Beach sand and water.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, BEACH_Y, WORLD_W, WATER_Y - BEACH_Y);
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(0, WATER_Y, WORLD_W, WORLD_H - WATER_Y);
  ctx.fillStyle = PALETTE.waterDeep;
  for (let x = 0; x < WORLD_W; x += 90) {
    ctx.fillRect(x + 20, WATER_Y + 40, 50, 4);
    ctx.fillRect(x + 55, WATER_Y + 110, 40, 4);
  }
  // Boardwalk planks.
  ctx.fillStyle = '#a9805a';
  ctx.fillRect(0, BEACH_Y - 14, WORLD_W, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 0; x < WORLD_W; x += 28) ctx.fillRect(x, BEACH_Y - 14, 2, 14);
}

function drawRoads(ctx) {
  ctx.fillStyle = PALETTE.road;
  for (const x of ROADS_X) ctx.fillRect(x - ROAD_W / 2, 0, ROAD_W, BEACH_Y);
  for (const y of ROADS_Y) ctx.fillRect(0, y - ROAD_W / 2, WORLD_W, ROAD_W);
  // Dashed centre lines.
  ctx.fillStyle = PALETTE.roadLine;
  for (const x of ROADS_X) {
    for (let y = 0; y < BEACH_Y; y += 44) ctx.fillRect(x - 2, y, 4, 22);
  }
  for (const y of ROADS_Y) {
    for (let x = 0; x < WORLD_W; x += 44) ctx.fillRect(x, y - 2, 22, 4);
  }
  // Crosswalk stripes at every intersection.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const x of ROADS_X) {
    for (const y of ROADS_Y) {
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(x + i * 9 - 3, y - ROAD_W / 2 + 4, 6, 12);
        ctx.fillRect(x + i * 9 - 3, y + ROAD_W / 2 - 16, 6, 12);
      }
    }
  }
}

function drawBuildings(ctx, world, time) {
  for (const b of world.buildings) {
    // Long dusk shadow to the east.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 10, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Rooftop: inset panel with a parapet edge.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    if (b.tall) {
      // Downtown towers: glass face and lit windows.
      ctx.fillStyle = PALETTE.towerGlass;
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      ctx.fillStyle = 'rgba(255, 214, 130, 0.85)';
      const cols = Math.floor((b.w - 20) / 22);
      const rows = Math.floor((b.h - 20) / 22);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if ((c * 7 + r * 13 + b.floors) % 3 === 0) {
            ctx.fillRect(b.x + 14 + c * 22, b.y + 14 + r * 22, 10, 12);
          }
        }
      }
    } else {
      // Rooftop clutter: vents and AC boxes.
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w / 2 - 12, b.y + b.h / 2 - 8, 24, 16);
    }
  }
  // Palms: trunk and fronds.
  for (const p of world.palms) {
    ctx.strokeStyle = '#6b4a2f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 4, p.y - 18);
    ctx.stroke();
    ctx.fillStyle = '#2f7d3a';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time * 0.05;
      ctx.beginPath();
      ctx.ellipse(p.x + 4 + Math.cos(a) * 9, p.y - 18 + Math.sin(a) * 6, 11, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Street lamps with a warm dusk glow.
  for (const l of world.lamps) {
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(l.x - 2, l.y - 14, 4, 14);
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.arc(l.x, l.y - 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 217, 122, 0.12)';
    ctx.beginPath();
    ctx.arc(l.x, l.y - 15, 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCarShape(ctx, car, isPlayerCar) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const w = car.w;
  const h = car.h;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  // Body.
  ctx.fillStyle = car.color;
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 7);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20, 24, 40, 0.85)';
  roundRectPath(ctx, -w * 0.12, -h / 2 + 3, w * 0.3, h - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(140, 200, 235, 0.9)';
  ctx.fillRect(w * 0.18, -h / 2 + 4, 3, h - 8);
  // Wheels.
  ctx.fillStyle = '#14141a';
  ctx.fillRect(-w / 2 + 4, -h / 2 - 3, 10, 5);
  ctx.fillRect(-w / 2 + 4, h / 2 - 2, 10, 5);
  ctx.fillRect(w / 2 - 14, -h / 2 - 3, 10, 5);
  ctx.fillRect(w / 2 - 14, h / 2 - 2, 10, 5);
  // Headlight beams at dusk.
  ctx.fillStyle = 'rgba(255, 244, 190, 0.35)';
  ctx.beginPath();
  ctx.moveTo(w / 2, -h / 2 + 4);
  ctx.lineTo(w / 2 + 70, -h / 2 - 8);
  ctx.lineTo(w / 2 + 70, h / 2 + 8);
  ctx.lineTo(w / 2, h / 2 - 4);
  ctx.closePath();
  ctx.fill();
  if (car.kind === 'cop') {
    // Flashing light bar.
    const phase = Math.floor(Date.now() / 280) % 2 === 0;
    ctx.fillStyle = phase ? '#ff3b30' : '#2f6fd0';
    ctx.fillRect(-4, -h / 2 - 2, 8, h / 2 - 2);
    ctx.fillStyle = phase ? '#2f6fd0' : '#ff3b30';
    ctx.fillRect(-4, 2, 8, h / 2 - 2);
  }
  if (car.kind === 'aurum') {
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GT', 0, 4);
  }
  if (car.smoke === 1) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-w / 2 + 4, 0, 8 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (isPlayerCar) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    roundRectPath(ctx, -w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 9);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export function drawPedFigure(ctx, x, y, angle, color, radius, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, radius, radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#14141a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (radius + 5), Math.sin(angle) * (radius + 5));
  ctx.stroke();
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -radius - 6);
  }
  ctx.restore();
}

function drawMarker(ctx, x, y, label, pulse) {
  const s = 16 + Math.sin(pulse * 4) * 3;
  ctx.save();
  ctx.translate(x, y);
  // Light beam.
  const grad = ctx.createLinearGradient(0, -140, 0, 0);
  grad.addColorStop(0, 'rgba(255, 225, 77, 0)');
  grad.addColorStop(1, 'rgba(255, 225, 77, 0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(-8, -140, 16, 140);
  // Diamond.
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = PALETTE.marker;
  ctx.strokeStyle = '#7a5b00';
  ctx.lineWidth = 2;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  ctx.restore();
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(label, x, y - 150);
    ctx.fillText(label, x, y - 150);
  }
}

// A GPS route along the road grid: from the player to the target, turning
// at intersections (Manhattan path through the nearest roads).
export function drawGpsRoute(ctx, fromX, fromY, toX, toY) {
  const points = [{ x: fromX, y: fromY }];
  if (Math.abs(fromX - toX) > 30 && Math.abs(fromY - toY) > 30) {
    points.push({ x: toX, y: fromY });
  }
  points.push({ x: toX, y: toY });
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 225, 77, 0.9)';
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -Date.now() / 40;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

function drawShopSign(ctx, x, y, text) {
  ctx.fillStyle = '#20202c';
  ctx.fillRect(x - 70, y - 46, 140, 22);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 31);
}

export function renderWorld(renderer, game, time) {
  const { ctx, canvas } = renderer;
  const focus = game.player.inCar ?? game.player;
  const cam = computeCamera(renderer, focus.x, focus.y);
  ctx.save();
  // Dusk sky beyond the world edge.
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(-cam.x, -cam.y);
  // Only draw what the camera sees.
  ctx.beginPath();
  ctx.rect(cam.x - 20, cam.y - 20, cam.w + 40, cam.h + 40);
  ctx.clip();
  drawGround(ctx, cam, game.world);
  drawRoads(ctx);
  drawBuildings(ctx, game.world, time);
  // Shops: marked buildings with signs.
  drawShopSign(ctx, game.landmarks.sprayShop.x, game.landmarks.sprayShop.y, "PAY 'N SPRAY");
  drawShopSign(ctx, game.landmarks.ammoShop.x, game.landmarks.ammoShop.y, 'AMMU-NATION');
  drawShopSign(ctx, game.landmarks.bank.x, game.landmarks.bank.y, 'PALMETTO BANK');
  // Stash chests.
  for (const chest of game.chests) {
    if (chest.taken) continue;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(chest.x - 10, chest.y - 8, 20, 16);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(chest.x - 10, chest.y - 8, 20, 4);
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', chest.x, chest.y + 4);
  }
  // Mission packages.
  for (const p of game.missionPackages) {
    drawMarker(ctx, p.x, p.y, null, time);
  }
  // GPS route to the active objective.
  const marker = game.missionMarker;
  if (marker) drawGpsRoute(ctx, focus.x, focus.y, marker.x, marker.y);
  if (marker) drawMarker(ctx, marker.x, marker.y, marker.label, time);
  // Pickups.
  for (const p of game.pickups) {
    ctx.fillStyle = p.kind === 'health' ? '#2ecc71' : '#f39c12';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'health' ? '+' : 'A', p.x, p.y + 4);
  }
  // Traffic and parked cars.
  for (const car of game.cars) {
    if (car === game.player.inCar) continue;
    drawCarShape(ctx, car, false);
  }
  // Police.
  for (const cop of game.cops) drawCarShape(ctx, cop, false);
  for (const cop of game.footCops) {
    drawPedFigure(ctx, cop.x, cop.y, cop.angle, cop.color, 11, null);
  }
  // Enemies.
  for (const e of game.combat.enemies) {
    drawPedFigure(ctx, e.x, e.y, e.angle, '#c0392b', 12, null);
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(e.x - 8, e.y - 18, 16, 3);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(e.x - 8, e.y - 18, 16 * Math.max(0, e.hp / 100), 3);
  }
  // Pedestrians.
  for (const ped of game.peds) {
    drawPedFigure(ctx, ped.x, ped.y, ped.angle, ped.color, 9, null);
  }
  // Bullets.
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 3;
  for (const b of game.combat.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Explosions.
  for (const ex of game.combat.explosions) {
    ctx.fillStyle = `rgba(255, ${Math.floor(120 + 100 * ex.ttl)}, 0, ${ex.ttl})`;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player's car, then Rico on foot.
  if (game.player.inCar) drawCarShape(ctx, game.player.inCar, true);
  else drawPedFigure(ctx, game.player.x, game.player.y, game.player.angle, PALETTE.player, 13, 'RICO');
  ctx.restore();
  // Warm dusk grade over everything.
  const grade = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grade.addColorStop(0, 'rgba(255, 120, 60, 0.05)');
  grade.addColorStop(1, 'rgba(255, 170, 80, 0.12)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Vignette.
  const vg = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.45,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.95,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10, 5, 25, 0.4)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return cam;
}

export function worldToScreen(cam, x, y) {
  return { x: x - cam.x, y: y - cam.y };
}

export function screenToWorld(cam, x, y) {
  return { x: x + cam.x, y: y + cam.y };
}

export function isOnRoadAt(x, y) {
  return isOnRoad(x, y);
}

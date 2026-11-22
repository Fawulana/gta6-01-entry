// Palmetto Bay — rendering: camera, city, cars, people, HUD, minimap,
// and the title / pause / game-over / win screens. All canvas 2D.
import { WORLD, DISTRICTS, CAR_CLASSES, VIEW } from './config.js';
import { isRoad } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
  }

  snap(px, py) {
    this.x = px - VIEW.width / 2;
    this.y = py - VIEW.height / 2;
  }

  follow(px, py, dt) {
    const tx = px - VIEW.width / 2;
    const ty = py - VIEW.height / 2;
    const k = Math.min(1, dt * 5);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    this.x = Math.max(-80, Math.min(WORLD.size - VIEW.width + 80, this.x));
    this.y = Math.max(-80, Math.min(WORLD.size - VIEW.height + 80, this.y));
  }
}

function drawCarShape(ctx, car) {
  const spec = car.spec;
  const l = spec.length;
  const w = spec.width;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w);
  // Body.
  ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
  roundRect(ctx, -l / 2, -w / 2, l, w, 6);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = car.dead ? '#222' : 'rgba(20,30,45,0.9)';
  roundRect(ctx, -l / 6, -w / 2 + 3, l / 3, w - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.5)';
  ctx.fillRect(l / 6, -w / 2 + 4, 3, w - 8);
  // Headlights and tail lights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(l / 2 - 2, -w / 2 + 2, 2, 5);
  ctx.fillRect(l / 2 - 2, w / 2 - 7, 2, 5);
  ctx.fillStyle = '#ff2d2d';
  ctx.fillRect(-l / 2, -w / 2 + 2, 2, 5);
  ctx.fillRect(-l / 2, w / 2 - 7, 2, 5);
  // Police livery.
  if (car.cls === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-l / 6, -w / 2, l / 3, 4);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-4, -w / 2 - 2, 8, 4);
    ctx.fillStyle = '#2f7bff';
    ctx.fillRect(-4, w / 2 - 2, 8, 4);
  }
  // Golden Marlin: gold trim.
  if (car.cls === 'marlin') {
    ctx.strokeStyle = '#fff3a0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -l / 2 + 2, -w / 2 + 2, l - 4, w - 4, 5);
    ctx.stroke();
  }
  // Damage smoke is drawn by the particle system; a wreck gets a dark hood.
  if (car.health < 40) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(l / 4, -w / 2 + 3, l / 4, w - 6);
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

function dayTint(phase) {
  // 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = night.
  if (phase < 0.15) return 'rgba(255,180,110,0.10)';
  if (phase < 0.45) return 'rgba(255,255,255,0)';
  if (phase < 0.6) return 'rgba(255,140,60,0.12)';
  if (phase < 0.85) return 'rgba(10,10,50,0.22)';
  return 'rgba(255,180,110,0.08)';
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  draw(game, screen, time) {
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (screen === SCREEN_TITLE) {
      this.drawTitle(game, time);
      ctx.restore();
      return;
    }
    // World view.
    ctx.translate(-cam.x, -cam.y);
    this.drawWorld(ctx, game, time);
    this.drawMissionMarkers(ctx, game, time);
    this.drawShops(ctx, game);
    this.drawChests(ctx, game);
    this.drawCrowd(ctx, game);
    this.drawCars(ctx, game);
    this.drawPlayer(ctx, game, time);
    this.drawCombat(ctx, game);
    ctx.restore();
    // Day/night tint over the world only.
    const tint = dayTint(game.dayPhase || 0.32);
    if (tint !== 'rgba(255,255,255,0)') {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (screen === SCREEN_PLAY) {
      this.drawHud(ctx, game, time);
      this.drawMinimap(ctx, game);
    } else if (screen === SCREEN_PAUSE) {
      this.drawHud(ctx, game, time);
      this.drawOverlay(ctx, 'PAUSED', 'P / Esc — resume    H — save    R — load save    Q — title', time);
    } else if (screen === SCREEN_OVER) {
      this.drawHud(ctx, game, time);
      this.drawOverlay(ctx, 'BUSTED — FLATLINED', 'R — load save    Enter — new game', time);
    } else if (screen === SCREEN_WIN) {
      this.drawHud(ctx, game, time);
      this.drawOverlay(ctx, 'PALMETTO BAY IS YOURS', 'All six missions complete. Enter — keep roaming', time);
    }
  }

  drawWorld(ctx, game, time) {
    const city = game.city;
    const cam = this.camera;
    const x0 = Math.max(0, cam.x - 100);
    const y0 = Math.max(0, cam.y - 100);
    const x1 = Math.min(WORLD.size, cam.x + VIEW.width + 100);
    const y1 = Math.min(WORLD.size, cam.y + VIEW.height + 100);
    // Ground: grass base.
    ctx.fillStyle = '#3f7a44';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // District tint washes.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.tint;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.globalAlpha = 1;
    }
    // Water.
    ctx.fillStyle = '#1e6f8e';
    for (const w of city.water) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      const wave = Math.sin(time * 1.4 + w.x) * 3;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y + w.h / 2 + wave);
      ctx.lineTo(w.x + w.w, w.y + w.h / 2 - wave);
      ctx.stroke();
    }
    // Parks.
    for (const p of city.parks) {
      ctx.fillStyle = '#2e6b34';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#1e4d24';
      for (let i = 0; i < p.trees; i += 1) {
        const tx = p.x + ((i * 53) % p.w);
        const ty = p.y + ((i * 97) % p.h);
        ctx.beginPath();
        ctx.arc(tx, ty, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Roads: asphalt strips on every grid line.
    ctx.fillStyle = '#2b2b31';
    for (let g = 0; g <= WORLD.blocks; g += 1) {
      const c = g * WORLD.block;
      ctx.fillRect(c, 0, WORLD.road, WORLD.size);
      ctx.fillRect(0, c, WORLD.size, WORLD.road);
    }
    // Road centre dashes.
    ctx.strokeStyle = 'rgba(255,220,90,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    for (let g = 0; g <= WORLD.blocks; g += 1) {
      const c = g * WORLD.block + WORLD.road / 2;
      ctx.beginPath();
      ctx.moveTo(c, 0);
      ctx.lineTo(c, WORLD.size);
      ctx.moveTo(0, c);
      ctx.lineTo(WORLD.size, c);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Buildings with roof detail and height shading.
    for (const b of city.buildings) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.tall ? '#4a5568' : '#6b5a4a';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.tint;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.globalAlpha = 1;
      // Windows.
      ctx.fillStyle = 'rgba(255,230,150,0.75)';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 26));
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i * 7 + j * 3 + b.floors) % 3 === 0) continue;
          ctx.fillRect(b.x + 8 + i * 24, b.y + 8 + j * 24, 10, 12);
        }
      }
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`${b.floors}F`, b.x + 6, b.y + 16);
      }
    }
  // District labels on the ground, drawn faint so they read as street
  // paint rather than UI.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
    }
    ctx.textAlign = 'left';
  }

  drawMissionMarkers(ctx, game, time) {
    const bob = Math.sin(time * 3) * 4;
    // Active mission marker.
    if (game.missions.active && game.missions.active.marker) {
      const m = game.missions.active.marker;
      ctx.save();
      ctx.translate(m.x, m.y + bob);
      ctx.fillStyle = '#ffcf3f';
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(12, -14);
      ctx.lineTo(-12, -14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffcf3f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Taxi fare marker.
    if (game.fare) {
      const target = game.fare.stage === 'pickup' ? game.fare.pickup : game.fare.dropoff;
      ctx.save();
      ctx.translate(target.x, target.y + bob);
      ctx.fillStyle = game.fare.stage === 'pickup' ? '#ffe14d' : '#37d67a';
      ctx.beginPath();
      ctx.arc(0, -20, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, -16);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  drawShops(ctx, game) {
    for (const shop of game.shops.defs) {
      ctx.fillStyle = shop.kind === 'spray' ? '#2f9e44' : '#8e44ad';
      ctx.fillRect(shop.x - 46, shop.y - 26, 92, 52);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shop.kind === 'spray' ? 'PAY \'N SPRAY' : 'GUN RACK', shop.x, shop.y - 32);
      ctx.fillText('Q — shop', shop.x, shop.y + 4);
      ctx.textAlign = 'left';
    }
  }

  drawChests(ctx, game) {
    for (const chest of game.city.chests) {
      if (chest.looted) continue;
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(chest.x - 9, chest.y - 7, 18, 14);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(chest.x - 9, chest.y - 2, 18, 3);
    }
  }

  drawCrowd(ctx, game) {
    for (const p of game.crowd.peds) {
      if (p.dead) {
        ctx.fillStyle = '#7a1f1f';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = p.panic > 0 ? '#ff6b6b' : '#222';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.shirt;
      ctx.fillRect(p.x - 5, p.y + 1, 10, 12);
      ctx.fillStyle = '#222';
      ctx.fillRect(p.x - 5, p.y + 12, 4, 6);
      ctx.fillRect(p.x + 1, p.y + 12, 4, 6);
    }
  }

  drawCars(ctx, game) {
    for (const car of game.parkedCars) drawCarShape(ctx, car);
    for (const car of game.traffic.cars) drawCarShape(ctx, car);
    for (const car of game.police.cars) drawCarShape(ctx, car);
  }

  drawPlayer(ctx, game, time) {
    const player = game.player;
    if (player.car) {
      drawCarShape(ctx, player.car);
      // Speed lines when fast.
      if (Math.abs(player.car.speed) > 300) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i += 1) {
          const off = (i - 1) * 14;
          ctx.beginPath();
          ctx.moveTo(player.car.x - Math.cos(player.car.angle) * 60, player.car.y - Math.sin(player.car.angle) * 60 + off);
          ctx.lineTo(player.car.x - Math.cos(player.car.angle) * 90, player.car.y - Math.sin(player.car.angle) * 90 + off);
          ctx.stroke();
        }
      }
      return;
    }
    if (player.dead) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    // Rook: teal jacket, dark jeans.
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e7c86';
    ctx.fillRect(-6, -7, 14, 14);
    ctx.fillStyle = '#1f2a44';
    ctx.fillRect(-6, 7, 5, 8);
    ctx.fillRect(1, 7, 5, 8);
    // Punch arc.
    if (player.punchTimer > 0.2) {
      ctx.fillStyle = '#f5d0a9';
      ctx.beginPath();
      ctx.arc(14, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Aim line.
    if (game.aiming && player.ammo > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(player.aimAngle) * 90, player.y + Math.sin(player.aimAngle) * 90);
      ctx.stroke();
    }
    if (player.hurtTimer > 0) {
      ctx.fillStyle = 'rgba(255,0,0,0.12)';
      ctx.fillRect(this.camera.x, this.camera.y, VIEW.width, VIEW.height);
    }
  }

  drawCombat(ctx, game) {
    for (const p of game.combat.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe14d';
    for (const b of game.combat.bullets) {
      ctx.fillRect(b.x - 3, b.y - 2, 6, 4);
    }
  }

  drawHud(ctx, game, time) {
    const player = game.player;
    ctx.save();
    // Top-left: cash, health, armor, ammo.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, 12, 12, 240, 86, 8);
    ctx.fill();
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`$${player.cash}`, 24, 42);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`HP ${Math.round(player.health)}  ARMOR ${Math.round(player.armor)}  AMMO ${player.ammo}`, 24, 64);
    ctx.fillText(`Fares ${game.faresDone}  •  ${game.sound.stations[game.sound.station]}`, 24, 84);
    // Wanted stars, top-right.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, VIEW.width - 220, 12, 208, 44, 8);
    ctx.fill();
    ctx.font = 'bold 26px sans-serif';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < game.wanted.stars ? '#ffd700' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', VIEW.width - 206 + i * 38, 44);
    }
    // District + clock, top centre.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(VIEW.width / 2 - 130, 12, 260, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const district = game.city.districtName(player.px, player.py);
    const hour = Math.floor(((game.dayPhase || 0.32) * 24 + 6) % 24);
    ctx.fillText(`${district}  •  ${String(hour).padStart(2, '0')}:00`, VIEW.width / 2, 32);
    ctx.textAlign = 'left';
    // Mission objective, bottom-left.
    const stage = game.missions.currentStage();
    const objective = game.missions.active
      ? `${game.missions.active.def.name} — ${stage ? stage.text : ''}`
      : (game.missions.finishedAll ? 'All missions complete — free roam' : 'Press M to start the next mission');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, 12, VIEW.height - 64, Math.min(760, 24 + objective.length * 7.4), 52, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(objective, 24, VIEW.height - 32);
    // Message banner.
    if (game.missions.messageTimer > 0 && game.missions.message) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const msg = game.missions.message;
      ctx.fillRect(VIEW.width / 2 - 260, 56, 520, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(msg, VIEW.width / 2, 76);
      ctx.textAlign = 'left';
    }
    // Speedometer when driving.
    if (player.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, VIEW.width - 150, VIEW.height - 64, 138, 52, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(Math.abs(player.car.speed) * 0.36)} km/h`, VIEW.width - 24, VIEW.height - 30);
      ctx.textAlign = 'left';
      // Car health bar.
      ctx.fillStyle = '#333';
      ctx.fillRect(VIEW.width - 138, VIEW.height - 20, 114, 6);
      ctx.fillStyle = player.car.health > 40 ? '#37d67a' : '#ff3b30';
      ctx.fillRect(VIEW.width - 138, VIEW.height - 20, 114 * (player.car.health / 100), 6);
    }
    // Shop prompt / menu.
    if (game.shops.near && !game.shops.open) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(VIEW.width / 2 - 130, VIEW.height - 110, 260, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${game.shops.near.name} — press Q`, VIEW.width / 2, VIEW.height - 91);
      ctx.textAlign = 'left';
    }
    if (game.shops.open) {
      const items = game.shops.items();
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(VIEW.width / 2 - 230, VIEW.height / 2 - 90, 460, 60 + items.length * 34);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.shops.open.name, VIEW.width / 2, VIEW.height / 2 - 58);
      ctx.font = '15px sans-serif';
      items.forEach((item, i) => {
        ctx.fillStyle = i === game.shops.selected ? '#ffd34d' : '#ffffff';
        ctx.fillText(`${i === game.shops.selected ? '▶ ' : ''}${item.label}`, VIEW.width / 2, VIEW.height / 2 - 22 + i * 34);
      });
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '13px sans-serif';
      ctx.fillText('↑↓ select • Enter buy • Esc close', VIEW.width / 2, VIEW.height / 2 - 22 + items.length * 34);
      ctx.textAlign = 'left';
    }
    // GPS arrow to the marker, screen edge.
    const marker = game.missions.active ? game.missions.active.marker : (game.fare ? (game.fare.stage === 'pickup' ? game.fare.pickup : game.fare.dropoff) : null);
    if (marker) {
      const dx = marker.x - player.px;
      const dy = marker.y - player.py;
      const dist = Math.hypot(dx, dy);
      if (dist > 420) {
        const a = Math.atan2(dy, dx);
        const ex = VIEW.width / 2 + Math.cos(a) * 260;
        const ey = VIEW.height / 2 + Math.sin(a) * 200;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -9);
        ctx.lineTo(-8, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(dist)}m`, ex, ey + 26);
        ctx.textAlign = 'left';
      }
    }
    ctx.restore();
  }

  drawMinimap(ctx, game) {
    const size = 168;
    const x = VIEW.width - size - 14;
    const y = 66;
    const scale = size / WORLD.size;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, x - 6, y - 6, size + 12, size + 12, 8);
    ctx.fill();
    ctx.fillStyle = '#22442a';
    ctx.fillRect(x, y, size, size);
    // Water and roads, mini.
    ctx.fillStyle = '#1e6f8e';
    for (const w of game.city.water) ctx.fillRect(x + w.x * scale, y + w.y * scale, w.w * scale, w.h * scale);
    ctx.fillStyle = '#555';
    for (let g = 0; g <= WORLD.blocks; g += 1) {
      const c = g * WORLD.block * scale;
      ctx.fillRect(x + c, y, 2, size);
      ctx.fillRect(x, y + c, size, 2);
    }
    // Mission marker.
    const marker = game.missions.active ? game.missions.active.marker : null;
    if (marker) {
      ctx.fillStyle = '#ffd34d';
      ctx.beginPath();
      ctx.arc(x + marker.x * scale, y + marker.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cops.
    ctx.fillStyle = '#2f7bff';
    for (const car of game.police.cars) {
      if (car.dead) continue;
      ctx.fillRect(x + car.x * scale - 2, y + car.y * scale - 2, 4, 4);
    }
    // Player.
    const player = game.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + player.px * scale, y + player.py * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + player.px * scale, y + player.py * scale, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawTitle(game, time) {
    const ctx = this.ctx;
    // Sunset gradient sky over a drawn skyline.
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    grad.addColorStop(0, '#1b2a52');
    grad.addColorStop(0.55, '#c65a7a');
    grad.addColorStop(1, '#f2a35e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Sun, high on the left so it never sits on the title text.
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.arc(170, 120, 48, 0, Math.PI * 2);
    ctx.fill();
    // Skyline silhouettes, kept short so they frame the title instead of
    // covering the menu lines.
    ctx.fillStyle = '#141428';
    const heights = [90, 140, 110, 170, 120, 190, 100, 150, 120, 165, 95, 145];
    let bx = 0;
    for (const h of heights) {
      ctx.fillRect(bx, VIEW.height - 150 - h, 104, h + 150);
      bx += 108;
    }
    ctx.fillStyle = 'rgba(255,220,120,0.8)';
    for (let i = 0; i < 40; i += 1) {
      const wx = (i * 97) % VIEW.width;
      const wy = VIEW.height - 140 - ((i * 61) % 120);
      ctx.fillRect(wx, wy, 7, 9);
    }
    // Title.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText('PALMETTO BAY', VIEW.width / 2, 210);
    ctx.shadowBlur = 0;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText('An open-world crime story in the sun-soaked city of Palmetto Bay', VIEW.width / 2, 252);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#ffffff';
    // A dark band behind the menu lines so they read over the skyline.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 536, VIEW.width, 152);
    ctx.fillStyle = '#ffffff';
    const blink = Math.sin(time * 3) > -0.2;
    if (blink) ctx.fillText('ENTER — new game', VIEW.width / 2, 560);
    if (game.hasSaveFlag) ctx.fillText('L — continue from save', VIEW.width / 2, 592);
    ctx.fillText('WASD drive & walk • E steal car • F punch • Mouse shoot • M mission • H save • R radio', VIEW.width / 2, 640);
    ctx.fillText('Six missions for Marla Vane • 0–5 star wanted • Pay \'n Spray • Gun Rack • Taxi fares • 8 stashes', VIEW.width / 2, 668);
    ctx.textAlign = 'left';
  }

  drawOverlay(ctx, title, hint, time) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW.width / 2, VIEW.height / 2 - 20);
    ctx.font = '17px sans-serif';
    ctx.fillStyle = '#dddddd';
    ctx.fillText(hint, VIEW.width / 2, VIEW.height / 2 + 24);
    ctx.textAlign = 'left';
  }
}

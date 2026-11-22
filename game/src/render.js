// Rendering: the camera, the city, cars, people, effects, and every screen
// the player sees — title, HUD with minimap and GPS, shops, pause, death.
// All drawing is plain canvas 2D, no images.
import { WORLD, VIEW, CAR_CLASSES, DISTRICTS } from './config.js';
import { MISSION_DEFS } from './missions.js';
import { SHOP_MENU } from './shops.js';

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

  follow(tx, ty, dt) {
    const wantX = tx - VIEW.width / 2;
    const wantY = ty - VIEW.height / 2;
    const k = 1 - Math.pow(0.001, dt);
    this.x += (wantX - this.x) * k;
    this.y += (wantY - this.y) * k;
    this.x = Math.max(-80, Math.min(WORLD.size - VIEW.width + 80, this.x));
    this.y = Math.max(-80, Math.min(WORLD.size - VIEW.height + 80, this.y));
  }

  snap(tx, ty) {
    this.x = tx - VIEW.width / 2;
    this.y = ty - VIEW.height / 2;
  }
}

function drawCar(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const s = car.spec;
  const l = s.length;
  const w = s.width;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -l / 2, -w / 2, l, w, 6);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20,30,45,0.9)';
  roundRect(ctx, -l / 6, -w / 2 + 4, l / 3, w - 8, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.55)';
  ctx.fillRect(l / 6, -w / 2 + 4, 4, w - 8);
  // Headlights and taillights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(l / 2 - 2, -w / 2 + 2, 3, 5);
  ctx.fillRect(l / 2 - 2, w / 2 - 7, 3, 5);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-l / 2 - 1, -w / 2 + 2, 3, 5);
  ctx.fillRect(-l / 2 - 1, w / 2 - 7, 3, 5);
  if (car.police) {
    // Light bar, flashing.
    const on = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = on ? '#ff2d2d' : '#2d7bff';
    ctx.fillRect(-4, -w / 2 + 2, 8, 6);
    ctx.fillStyle = on ? '#2d7bff' : '#ff2d2d';
    ctx.fillRect(-4, w / 2 - 8, 8, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PBPD', 0, 3);
  }
  if (car.cls === 'marlin') {
    ctx.strokeStyle = '#fff3a0';
    ctx.lineWidth = 1.5;
    roundRect(ctx, -l / 2 + 2, -w / 2 + 2, l - 4, w - 4, 5);
    ctx.stroke();
  }
  ctx.restore();
  if (car.smoke > 0.2) {
    ctx.fillStyle = `rgba(120,120,120,${car.smoke * 0.5})`;
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * car.length / 2, car.y - Math.sin(car.angle) * car.length / 2, 6 + car.smoke * 6, 0, Math.PI * 2);
    ctx.fill();
  }
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
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (screen === SCREEN_TITLE) {
      this.drawTitle(game, time);
      return;
    }
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    this.drawWorld(ctx, game, time);
    this.drawMissionMarker(ctx, game, time);
    this.drawChests(ctx, game);
    this.drawShops(ctx, game);
    for (const car of game.traffic.cars) if (!car.dead) drawCar(ctx, car, time);
    for (const car of game.parkedCars) if (!car.dead) drawCar(ctx, car, time);
    for (const car of game.police.cars) if (!car.dead) drawCar(ctx, car, time);
    if (game.player.car && !game.player.car.dead) drawCar(ctx, game.player.car, time);
    this.drawCrowd(ctx, game, time);
    this.drawPlayer(ctx, game, time);
    this.drawCombat(ctx, game);
    ctx.restore();
    this.drawHud(ctx, game, time);
    if (screen === SCREEN_PAUSE) this.drawPause(ctx, game);
    if (screen === SCREEN_OVER) this.drawGameOver(ctx, game);
    if (screen === SCREEN_WIN) this.drawWin(ctx, game);
    if (game.shops.open) this.drawShopMenu(ctx, game);
  }

  drawWorld(ctx, game, time) {
    const city = game.city;
    const cam = this.camera;
    const x0 = Math.max(0, Math.floor(cam.x / WORLD.block) - 1);
    const y0 = Math.max(0, Math.floor(cam.y / WORLD.block) - 1);
    const x1 = Math.min(WORLD.blocks - 1, Math.ceil((cam.x + VIEW.width) / WORLD.block) + 1);
    const y1 = Math.min(WORLD.blocks - 1, Math.ceil((cam.y + VIEW.height) / WORLD.block) + 1);
    // Ground: grass base, then roads.
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(cam.x - 20, cam.y - 20, VIEW.width + 40, VIEW.height + 40);
    for (let bx = x0; bx <= x1; bx += 1) {
      for (let by = y0; by <= y1; by += 1) {
        const district = city.districtAt(bx * WORLD.block + 200, by * WORLD.block + 200);
        ctx.fillStyle = district.tint;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(bx * WORLD.block, by * WORLD.block, WORLD.block, WORLD.block);
        ctx.globalAlpha = 1;
      }
    }
    // Water at the marina.
    ctx.fillStyle = '#1e6f8e';
    for (const w of city.water) ctx.fillRect(w.x, w.y, w.w, w.h);
    // Roads.
    ctx.fillStyle = '#2b2b30';
    for (let i = 0; i <= WORLD.blocks; i += 1) {
      ctx.fillRect(i * WORLD.block - WORLD.road / 2, 0, WORLD.road, WORLD.size);
      ctx.fillRect(0, i * WORLD.block - WORLD.road / 2, WORLD.size, WORLD.road);
    }
    // Road markings.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    for (let i = 0; i <= WORLD.blocks; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * WORLD.block, 0);
      ctx.lineTo(i * WORLD.block, WORLD.size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * WORLD.block);
      ctx.lineTo(WORLD.size, i * WORLD.block);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Parks with trees.
    for (const p of city.parks) {
      ctx.fillStyle = '#3a8a3a';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#2a6a2a';
      const rngSeed = p.x * 7 + p.y * 13;
      for (let i = 0; i < p.trees; i += 1) {
        const tx = p.x + 30 + ((rngSeed + i * 97) % (p.w - 60));
        const ty = p.y + 30 + ((rngSeed + i * 61) % (p.h - 60));
        ctx.beginPath();
        ctx.arc(tx, ty, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Buildings with windows.
    for (const b of city.buildings) {
      if (b.x + b.w < cam.x - 40 || b.x > cam.x + VIEW.width + 40) continue;
      if (b.y + b.h < cam.y - 40 || b.y > cam.y + VIEW.height + 40) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      // Windows on the roof face (top-down): a grid of lit panes.
      const cols = Math.max(2, Math.floor(b.w / 26));
      const rows = Math.max(2, Math.floor(b.h / 26));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const lit = ((b.seed + cx * 31 + cy * 17) % 5) < 2;
          ctx.fillStyle = lit ? '#ffe9a0' : 'rgba(20,30,45,0.85)';
          ctx.fillRect(b.x + 8 + cx * ((b.w - 16) / cols), b.y + 8 + cy * ((b.h - 16) / rows), 9, 9);
        }
      }
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(b.x + b.w / 2 - 2, b.y, 4, b.h);
      }
    }
    // District labels on the map, faint.
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
    }
    ctx.textAlign = 'left';
  }

  drawMissionMarker(ctx, game, time) {
    const m = game.missions.active;
    if (!m || !m.marker) return;
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    ctx.save();
    ctx.translate(m.marker.x, m.marker.y);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // Bouncing arrow above the marker.
    const bob = Math.sin(time * 5) * 6;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, -52 + bob);
    ctx.lineTo(-10, -68 + bob);
    ctx.lineTo(10, -68 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawChests(ctx, game) {
    for (const c of game.city.chests) {
      if (c.looted) continue;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = '#6b4a1f';
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
  }

  drawShops(ctx, game) {
    for (const shop of game.city.shops) {
      ctx.fillStyle = shop.kind === 'spray' ? '#2a6a8a' : '#8a2a2a';
      ctx.fillRect(shop.x, shop.y, shop.w, shop.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shop.name, shop.x + shop.w / 2, shop.y + shop.h / 2 + 4);
      ctx.textAlign = 'left';
      // Garage door for the spray shop.
      if (shop.kind === 'spray') {
        ctx.fillStyle = '#d8d8d8';
        ctx.fillRect(shop.x + 10, shop.y + shop.h - 14, shop.w - 20, 10);
      }
    }
  }

  drawCrowd(ctx, game, time) {
    for (const ped of game.crowd.peds) {
      const bob = Math.sin(ped.walkPhase) * 2;
      ctx.save();
      ctx.translate(ped.x, ped.y + bob * 0.3);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0c8a0';
      ctx.beginPath();
      ctx.arc(Math.cos(ped.angle) * 2, Math.sin(ped.angle) * 2 - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      if (ped.panic > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('!', -2, -14);
      }
      ctx.restore();
    }
  }

  drawPlayer(ctx, game, time) {
    const p = game.player;
    if (p.dead) return;
    if (p.car) return; // The car is drawn; the driver is inside.
    const bob = p.moving ? Math.sin(p.walkPhase) * 2 : 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(p.angle);
    // Rook: teal jacket, dark jeans.
    ctx.fillStyle = '#0e7a6a';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(7, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(-4, -8, 8, 4);
    if (p.punchTimer > 0) {
      ctx.fillStyle = '#f0c8a0';
      ctx.beginPath();
      ctx.arc(18, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Aim line when shooting with the mouse.
    if (game.aiming) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.aimAngle) * 90, p.y + Math.sin(p.aimAngle) * 90);
      ctx.stroke();
    }
  }

  drawCombat(ctx, game) {
    for (const b of game.combat.bullets) {
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(b.angle) * 10, b.y - Math.sin(b.angle) * 10);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of game.combat.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (game.combat.muzzle > 0) {
      const p = game.player;
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath();
      ctx.arc(p.px + Math.cos(p.aimAngle) * 24, p.py + Math.sin(p.aimAngle) * 24, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHud(ctx, game, time) {
    const p = game.player;
    const W = this.canvas.width;
    const H = this.canvas.height;
    // Top-left: wanted stars.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, 12, 12, 190, 44, 8);
    ctx.fill();
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < game.wanted.stars ? '#ffd700' : 'rgba(255,255,255,0.25)';
      drawStar(ctx, 30 + i * 34, 34, 13);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(game.wanted.stars > 0 ? 'WANTED' : 'CLEAN', 12, 74);
    // Top-right: cash, health, armor.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, W - 232, 12, 220, 100, 8);
    ctx.fill();
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`$${p.cash}`, W - 24, 38);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.fillText('HEALTH', W - 220, 54);
    bar(ctx, W - 220, 58, 196, 9, p.health / 100, '#e74c3c', '#333');
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ARMOR', W - 220, 76);
    bar(ctx, W - 220, 80, 196, 8, p.armor / 100, '#3498db', '#333');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Ammo ${p.ammo}`, W - 220, 104);
    // Mission objective bar, top centre.
    const obj = game.missions.active
      ? `MISSION ${game.missions.active.def.id}: ${game.missions.stageText()}`
      : (game.missions.finishedAll
        ? 'All missions complete — Palmetto Bay is yours'
        : 'No active mission — press M to start the next job');
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const tw = ctx.measureText(obj).width;
    roundRect(ctx, W / 2 - tw / 2 - 14, 12, tw + 28, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj, W / 2, 32);
    ctx.textAlign = 'left';
    // Message toast.
    if (game.missions.messageTimer > 0) {
      const msg = game.missions.message.length > 130
        ? game.missions.message.slice(0, 127) + '…'
        : game.missions.message;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      roundRect(ctx, W / 2 - 450, 52, 900, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(msg, W / 2, 73);
      ctx.textAlign = 'left';
    }
    if (game.shops.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.shops.flash, W / 2, H - 210);
      ctx.textAlign = 'left';
    }
    // Speed and car name, bottom-left above the controls hint.
    if (p.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(ctx, 14, H - 64, 220, 52, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(p.car.spec.name, 26, H - 42);
      ctx.font = '13px sans-serif';
      ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.36)} km/h   •   Car ${Math.max(0, Math.round(p.car.health))}%`, 26, H - 22);
    }
    // Controls hint, bottom-left beside the speed box.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#dddddd';
    ctx.fillText('WASD move/drive • E enter car • F punch • Mouse aim + click shoot • M mission • P pause • H save', p.car ? 250 : 14, H - 14);
    this.drawMinimap(ctx, game);
    this.drawGps(ctx, game);
  }

  drawMinimap(ctx, game) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const size = 190;
    const mx = W - size - 14;
    const my = H - size - 14;
    const scale = size / WORLD.size;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, mx - 6, my - 6, size + 12, size + 12, 8);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, size, size);
    ctx.clip();
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(mx, my, size, size);
    ctx.fillStyle = '#2b2b30';
    for (let i = 0; i <= WORLD.blocks; i += 1) {
      ctx.fillRect(mx + i * WORLD.block * scale - 1, my, 2, size);
      ctx.fillRect(mx, my + i * WORLD.block * scale - 1, size, 2);
    }
    ctx.fillStyle = '#1e6f8e';
    for (const w of game.city.water) ctx.fillRect(mx + w.x * scale, my + w.y * scale, w.w * scale, w.h * scale);
    // Shops.
    for (const shop of game.city.shops) {
      ctx.fillStyle = shop.kind === 'spray' ? '#4db2e8' : '#e84d4d';
      ctx.fillRect(mx + shop.x * scale - 2, my + shop.y * scale - 2, 5, 5);
    }
    // Mission marker.
    const m = game.missions.active;
    if (m && m.marker) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(mx + m.marker.x * scale, my + m.marker.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Police blips.
    ctx.fillStyle = '#2d7bff';
    for (const car of game.police.cars) {
      ctx.beginPath();
      ctx.arc(mx + car.x * scale, my + car.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player blip.
    const p = game.player;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + p.px * scale, my + p.py * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e7a6a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('PALMETTO BAY', mx, my - 10);
  }

  drawGps(ctx, game) {
    const m = game.missions.active;
    if (!m || !m.marker) return;
    const p = game.player;
    const dx = m.marker.x - p.px;
    const dy = m.marker.y - p.py;
    const dist = Math.hypot(dx, dy);
    if (dist < 120) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const angle = Math.atan2(dy, dx);
    const rx = cx + Math.cos(angle) * 150;
    const ry = cy + Math.sin(angle) * 150;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(dist)}m`, rx, ry + 24);
    ctx.textAlign = 'left';
  }

  drawTitle(game, time) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    // Sunset gradient sky over a drawn skyline.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a2a5a');
    grad.addColorStop(0.45, '#c65a3a');
    grad.addColorStop(0.7, '#f2a65a');
    grad.addColorStop(1, '#2a1a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Sun.
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(W * 0.88, H * 0.3, 56, 0, Math.PI * 2);
    ctx.fill();
    // Skyline.
    ctx.fillStyle = '#1a1420';
    const skyline = [0.42, 0.55, 0.38, 0.62, 0.5, 0.68, 0.44, 0.58, 0.36, 0.6];
    skyline.forEach((h, i) => {
      const bw = W / skyline.length;
      ctx.fillRect(i * bw + 6, H * 0.62 - H * h * 0.5, bw - 12, H * h * 0.5 + H * 0.38);
    });
    ctx.fillStyle = '#ffe9a0';
    for (let i = 0; i < 60; i += 1) {
      const wx = ((i * 173) % W);
      const wy = H * 0.62 + ((i * 97) % 180);
      ctx.fillRect(wx, wy, 5, 7);
    }
    // The gold car on the street.
    ctx.save();
    ctx.translate(W * 0.5, H * 0.86);
    ctx.fillStyle = '#ffd700';
    roundRect(ctx, -90, -18, 180, 36, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,0.9)';
    roundRect(ctx, -40, -14, 80, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-55, 18, 14, 0, Math.PI * 2);
    ctx.arc(55, 18, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px sans-serif';
    ctx.fillText('PALMETTO BAY', W / 2, H * 0.24);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('An open-world crime story in the sun-soaked city of Palmetto Bay', W / 2, H * 0.24 + 36);
    const blink = Math.floor(time * 1.6) % 2 === 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    if (blink) ctx.fillText('Press ENTER to start  •  Click to start', W / 2, H * 0.58);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#dddddd';
    ctx.fillText('6 missions • 6 car classes • 0–5 star wanted system • 8 stash chests • shops • save', W / 2, H * 0.58 + 30);
    ctx.fillText('WASD move / drive   •   E steal & enter cars   •   F punch   •   Mouse aim, click to shoot', W / 2, H * 0.58 + 56);
    if (game.hasSaveFlag) {
      ctx.fillStyle = '#7dff8a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('A saved game is waiting — press L to continue', W / 2, H * 0.58 + 86);
    }
    ctx.textAlign = 'left';
  }

  drawPause(ctx, game) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2 - 60);
    ctx.font = '18px sans-serif';
    ctx.fillText('P resume • H save game • R restart from save • Q quit to title', W / 2, H / 2 - 10);
    ctx.fillText(`Missions done: ${game.missions.completed} / 6   •   Cash earned: $${game.missions.totalEarned}`, W / 2, H / 2 + 30);
    ctx.textAlign = 'left';
  }

  drawGameOver(ctx, game) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.fillStyle = 'rgba(20,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff5a4d';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASTED', W / 2, H / 2 - 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(game.player.lastDamageCause ? `Taken down — ${game.player.lastDamageCause}` : 'Taken down on the streets of Palmetto Bay', W / 2, H / 2 + 6);
    ctx.fillText('Press R to restart from your save, or ENTER for a fresh start', W / 2, H / 2 + 40);
    ctx.textAlign = 'left';
  }

  drawWin(ctx, game) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,20,10,0.75)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PALMETTO BAY IS YOURS', W / 2, H / 2 - 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText(`All 6 missions complete • $${game.missions.totalEarned} earned • ${Math.round(game.playSeconds / 60)} minutes on the streets`, W / 2, H / 2 + 6);
    ctx.fillText('Press ENTER to keep playing in free roam', W / 2, H / 2 + 40);
    ctx.textAlign = 'left';
  }

  drawShopMenu(ctx, game) {
    const shop = game.shops.open;
    const items = SHOP_MENU[shop.kind];
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1a1a22';
    roundRect(ctx, W / 2 - 260, H / 2 - 150, 520, 300, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    roundRect(ctx, W / 2 - 260, H / 2 - 150, 520, 300, 12);
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(shop.name, W / 2, H / 2 - 108);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px sans-serif';
    ctx.fillText(`Your cash: $${game.player.cash}`, W / 2, H / 2 - 78);
    items.forEach((item, i) => {
      const y = H / 2 - 44 + i * 46;
      if (i === game.shops.selected) {
        ctx.fillStyle = 'rgba(255,215,0,0.2)';
        roundRect(ctx, W / 2 - 230, y - 20, 460, 38, 6);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, W / 2 - 220, y + 5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7dff8a';
      ctx.fillText(`$${item.price}`, W / 2 + 220, y + 5);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '13px sans-serif';
      ctx.fillText(item.desc, W / 2, y + 22);
    });
    ctx.fillStyle = '#dddddd';
    ctx.font = '14px sans-serif';
    ctx.fillText('Up/Down choose • Enter buy • Esc close', W / 2, H / 2 + 128);
    ctx.textAlign = 'left';
  }
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(angle) * rad;
    const py = y + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// Drawing only: the world state and the current screen in, pixels out. A fixed
// 1280x720 logical view scales to the window. Dusk is the look: a warm western
// glow, long eastern shadows, lit windows, lamp pools, headlight cones and neon.

import { FONT, PALETTE, ROADS, WEAPONS, WORLD } from './config.js';
import { currentMission, currentStage, objectiveText } from './missions.js';
import { GUN_MENU } from './shops.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_WIN = 'win';

const VIEW = { width: 1280, height: 720 };
const TAU = Math.PI * 2;

/** Deterministic 0..1 hash from integers, for windows and details. */
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  let camX = 3560;
  let camY = 700;
  let camZoom = 0.85;
  let titlePan = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function font(size, bold) {
    const key = `${bold ? '700 ' : ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    return fonts.get(key);
  }

  function text(value, x, y, size, color, align, bold) {
    context.font = font(size, bold);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  // ---------- world drawing ----------

  function drawGround(state) {
    context.fillStyle = PALETTE.ground;
    context.fillRect(-400, -400, WORLD.width + 800, WORLD.height + 800);
    // Park.
    context.fillStyle = PALETTE.grass;
    context.fillRect(2480, 1280, 420, 300);
    context.fillStyle = '#2a4a6b';
    context.beginPath();
    context.arc(2690, 1430, 46, 0, TAU);
    context.fill();
    // Beach and water.
    context.fillStyle = PALETTE.sand;
    context.fillRect(WORLD.beachX, 0, WORLD.waterX - WORLD.beachX, WORLD.height);
    const water = context.createLinearGradient(WORLD.waterX, 0, WORLD.width, 0);
    water.addColorStop(0, PALETTE.waterShallow);
    water.addColorStop(1, PALETTE.waterDeep);
    context.fillStyle = water;
    context.fillRect(WORLD.waterX, 0, WORLD.width - WORLD.waterX, WORLD.height);
    // Water shimmer.
    context.strokeStyle = 'rgba(255, 220, 160, 0.18)';
    context.lineWidth = 2;
    const t = state.time;
    for (let i = 0; i < 10; i += 1) {
      const y = ((i * 331 + t * 12) % WORLD.height);
      const x = WORLD.waterX + 40 + ((i * 137) % 380);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + 60 + Math.sin(t + i) * 14, y);
      context.stroke();
    }
    // Stadium field.
    context.fillStyle = '#2e5a33';
    context.fillRect(620, 2500, 300, 380);
    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.lineWidth = 3;
    context.strokeRect(660, 2540, 220, 300);
    context.beginPath();
    context.moveTo(660, 2690);
    context.lineTo(880, 2690);
    context.stroke();
  }

  function drawRoads() {
    context.fillStyle = PALETTE.road;
    for (const ax of ROADS.avenues) context.fillRect(ax - ROADS.halfWidth, 0, ROADS.halfWidth * 2, WORLD.height);
    for (const sy of ROADS.streets) context.fillRect(0, sy - ROADS.halfWidth, WORLD.width, ROADS.halfWidth * 2);
    context.fillRect(ROADS.oceanDrive - ROADS.halfWidth, 0, ROADS.halfWidth * 2, WORLD.height);
    // Centre dashes.
    context.strokeStyle = PALETTE.line;
    context.lineWidth = 4;
    context.setLineDash([26, 30]);
    for (const ax of ROADS.avenues) {
      context.beginPath();
      context.moveTo(ax, 0);
      context.lineTo(ax, WORLD.height);
      context.stroke();
    }
    for (const sy of ROADS.streets) {
      context.beginPath();
      context.moveTo(0, sy);
      context.lineTo(WORLD.width, sy);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(ROADS.oceanDrive, 0);
    context.lineTo(ROADS.oceanDrive, WORLD.height);
    context.stroke();
    context.setLineDash([]);
    // Sidewalk edges.
    context.strokeStyle = PALETTE.sidewalk;
    context.lineWidth = 10;
    for (const ax of [...ROADS.avenues, ROADS.oceanDrive]) {
      context.beginPath();
      context.moveTo(ax - ROADS.halfWidth - 5, 0);
      context.lineTo(ax - ROADS.halfWidth - 5, WORLD.height);
      context.moveTo(ax + ROADS.halfWidth + 5, 0);
      context.lineTo(ax + ROADS.halfWidth + 5, WORLD.height);
      context.stroke();
    }
    for (const sy of ROADS.streets) {
      context.beginPath();
      context.moveTo(0, sy - ROADS.halfWidth - 5);
      context.lineTo(WORLD.width, sy - ROADS.halfWidth - 5);
      context.moveTo(0, sy + ROADS.halfWidth + 5);
      context.lineTo(WORLD.width, sy + ROADS.halfWidth + 5);
      context.stroke();
    }
  }

  function drawBuilding(b) {
    const sx = b.height * 0.42;
    const sy = b.height * 0.22;
    // Long dusk shadow to the east.
    context.fillStyle = 'rgba(10, 8, 20, 0.45)';
    context.fillRect(b.x + sx * 0.7, b.y + sy * 0.7, b.w, b.h);
    // Extruded walls (south and east faces).
    context.fillStyle = b.wall;
    context.beginPath();
    context.moveTo(b.x, b.y + b.h);
    context.lineTo(b.x + sx, b.y + b.h + sy);
    context.lineTo(b.x + b.w + sx, b.y + b.h + sy);
    context.lineTo(b.x + b.w, b.y + b.h);
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(0,0,0,0.18)';
    context.beginPath();
    context.moveTo(b.x + b.w, b.y);
    context.lineTo(b.x + b.w + sx, b.y + sy);
    context.lineTo(b.x + b.w + sx, b.y + b.h + sy);
    context.lineTo(b.x + b.w, b.y + b.h);
    context.closePath();
    context.fill();
    // Roof.
    context.fillStyle = b.roof;
    context.fillRect(b.x, b.y, b.w, b.h);
    context.strokeStyle = 'rgba(255,255,255,0.14)';
    context.lineWidth = 2;
    context.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    // Lit windows on the roof edge, deterministic per building.
    const cols = Math.max(2, Math.floor(b.w / 34));
    const rows = Math.max(2, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        if (hash2(b.seed, i * 31 + j) < 0.42) {
          context.fillStyle = hash2(b.seed + 7, i * 17 + j) < 0.7 ? PALETTE.windowLit : PALETTE.windowDark;
          context.fillRect(b.x + 8 + i * ((b.w - 16) / cols), b.y + 8 + j * ((b.h - 16) / rows), 12, 9);
        }
      }
    }
    // Rooftop plant.
    if (b.height > 60) {
      context.fillStyle = '#3a3a48';
      context.fillRect(b.x + b.w / 2 - 14, b.y + b.h / 2 - 10, 28, 20);
    }
    if (b.landmark) {
      text(b.landmark, b.x + b.w / 2, b.y + b.h / 2, 15, 'rgba(255,255,255,0.85)', 'center', true);
    }
  }

  function drawProps(state) {
    const city = state.city;
    // Marina docks.
    context.fillStyle = '#6b543a';
    for (let i = 0; i < 5; i += 1) context.fillRect(4060, 300 + i * 110, 130, 14);
    for (const boat of city.boats) {
      context.save();
      context.translate(boat.x, boat.y);
      context.rotate(boat.angle);
      context.fillStyle = boat.color;
      roundRect(-boat.len / 2, -12, boat.len, 24, 10);
      context.fill();
      context.fillStyle = '#22303e';
      context.fillRect(-10, -7, 22, 14);
      context.restore();
    }
    // Palms: shadow, trunk, fronds.
    for (const palm of city.palms) {
      context.strokeStyle = '#5a3a28';
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(palm.x, palm.y);
      context.lineTo(palm.x + palm.lean * 30, palm.y - 34);
      context.stroke();
      context.strokeStyle = '#2e5a33';
      context.lineWidth = 4;
      for (let f = 0; f < 5; f += 1) {
        const a = -Math.PI / 2 + (f - 2) * 0.55;
        context.beginPath();
        context.moveTo(palm.x + palm.lean * 30, palm.y - 34);
        context.quadraticCurveTo(
          palm.x + palm.lean * 30 + Math.cos(a) * 16, palm.y - 34 + Math.sin(a) * 16,
          palm.x + palm.lean * 30 + Math.cos(a) * 26, palm.y - 34 + Math.sin(a) * 26 + 8,
        );
        context.stroke();
      }
    }
    for (const tree of city.parkTrees) {
      context.fillStyle = '#24452a';
      context.beginPath();
      context.arc(tree.x + 6, tree.y + 5, tree.r, 0, TAU);
      context.fill();
      context.fillStyle = '#356b3d';
      context.beginPath();
      context.arc(tree.x, tree.y, tree.r, 0, TAU);
      context.fill();
    }
    for (const bench of city.benches) {
      context.fillStyle = '#7a5a3a';
      context.fillRect(bench.x, bench.y, 34, 10);
    }
    // Neon signs on the hotel row.
    for (const sign of city.signs) {
      context.save();
      context.shadowColor = sign.color;
      context.shadowBlur = 16;
      context.fillStyle = sign.color;
      context.font = font(20, true);
      context.textAlign = 'center';
      context.fillText(sign.text, sign.x, sign.y);
      context.restore();
    }
  }

  function drawPickups(state) {
    const t = state.time;
    for (const item of state.pickups.items) {
      if (item.taken) continue;
      const bob = Math.sin(t * 3 + item.phase) * 3;
      const x = item.x;
      const y = item.y + bob;
      if (item.kind === 'chest') {
        context.save();
        context.shadowColor = '#ffd700';
        context.shadowBlur = 14;
        context.fillStyle = '#6b4a2a';
        roundRect(x - 16, y - 12, 32, 24, 4);
        context.fill();
        context.restore();
        context.fillStyle = '#ffd700';
        context.fillRect(x - 16, y - 3, 32, 5);
        context.fillStyle = '#fff2b0';
        context.fillRect(x - 3, y - 8, 6, 10);
      } else if (item.kind === 'cash') {
        context.save();
        context.translate(x, y);
        context.rotate(Math.sin(t * 2 + item.phase) * 0.3);
        context.fillStyle = '#3f9e4d';
        context.fillRect(-11, -7, 22, 14);
        context.fillStyle = '#e8f5e9';
        context.font = font(11, true);
        context.textAlign = 'center';
        context.fillText('$', 0, 4);
        context.restore();
      } else if (item.kind === 'health') {
        context.fillStyle = '#f5f5f5';
        roundRect(x - 13, y - 13, 26, 26, 4);
        context.fill();
        context.fillStyle = '#e5534b';
        context.fillRect(x - 3, y - 9, 6, 18);
        context.fillRect(x - 9, y - 3, 18, 6);
      } else if (item.kind === 'armor') {
        context.fillStyle = '#3b82f6';
        roundRect(x - 13, y - 13, 26, 26, 4);
        context.fill();
        context.fillStyle = '#dbeafe';
        context.fillRect(x - 7, y - 5, 14, 10);
      } else if (item.kind === 'weapon') {
        context.fillStyle = '#2a2a33';
        roundRect(x - 15, y - 11, 30, 22, 3);
        context.fill();
        context.fillStyle = '#f2c94c';
        context.fillRect(x - 9, y - 2, 18, 4);
      }
    }
  }

  function drawCar(car, t) {
    if (car.dead) return;
    const m = car.model;
    context.save();
    context.translate(car.x, car.y);
    // Ground shadow.
    context.fillStyle = 'rgba(8, 6, 16, 0.5)';
    context.beginPath();
    context.ellipse(4, 6, m.length / 2, m.width / 2 + 2, 0, 0, TAU);
    context.fill();
    context.rotate(car.angle);
    const L = m.length;
    const W = m.width;
    // Body.
    context.fillStyle = car.color;
    roundRect(-L / 2, -W / 2, L, W, 9);
    context.fill();
    if (car.isCop) {
      context.fillStyle = '#f5f5f5';
      context.fillRect(-L / 2 + 6, -W / 2, L - 12, 7);
      context.fillRect(-L / 2 + 6, W / 2 - 7, L - 12, 7);
      context.fillStyle = '#14181f';
      context.font = font(10, true);
      context.textAlign = 'center';
      context.fillText('LCPD', 0, 4);
      // Flashing light bar.
      const phase = Math.floor(t * 4) % 2 === 0;
      context.fillStyle = phase ? '#ef4444' : '#3b82f6';
      context.fillRect(-6, -W / 2 - 2, 12, 5);
      context.fillStyle = phase ? '#3b82f6' : '#ef4444';
      context.fillRect(-6, W / 2 - 3, 12, 5);
    }
    if (car.modelKey === 'taxi') {
      context.fillStyle = '#14181f';
      for (let i = 0; i < 6; i += 1) context.fillRect(-L / 2 + 8 + i * 8, -2, 4, 4);
    }
    if (car.gold) {
      context.save();
      context.shadowColor = '#ffd700';
      context.shadowBlur = 18;
      context.strokeStyle = 'rgba(255, 215, 0, 0.9)';
      context.lineWidth = 2;
      roundRect(-L / 2, -W / 2, L, W, 9);
      context.stroke();
      context.restore();
    }
    // Windshield and roof.
    context.fillStyle = 'rgba(20, 26, 38, 0.9)';
    roundRect(L / 2 - 20, -W / 2 + 5, 12, W - 10, 3);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(-8, -W / 2 + 4, 18, W - 8, 4);
    context.fill();
    // Headlights.
    context.fillStyle = '#fff6c9';
    context.beginPath();
    context.arc(L / 2 - 2, -W / 2 + 7, 3, 0, TAU);
    context.arc(L / 2 - 2, W / 2 - 7, 3, 0, TAU);
    context.fill();
    // Brake lights.
    context.fillStyle = car.brakeLight ? '#ff2e2e' : '#7a1f1f';
    context.beginPath();
    context.arc(-L / 2 + 2, -W / 2 + 7, 3, 0, TAU);
    context.arc(-L / 2 + 2, W / 2 - 7, 3, 0, TAU);
    context.fill();
    context.restore();
    // Headlight cones at dusk.
    if (Math.abs(car.speed) > 20 || car.isPlayer) {
      context.save();
      context.translate(car.x, car.y);
      context.rotate(car.angle);
      const grad = context.createLinearGradient(L / 2, 0, L / 2 + 150, 0);
      grad.addColorStop(0, 'rgba(255, 240, 180, 0.20)');
      grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
      context.fillStyle = grad;
      context.beginPath();
      context.moveTo(L / 2, -8);
      context.lineTo(L / 2 + 150, -44);
      context.lineTo(L / 2 + 150, 44);
      context.lineTo(L / 2, 8);
      context.closePath();
      context.fill();
      context.restore();
    }
    // Damage smoke.
    if (car.smoke) {
      context.fillStyle = 'rgba(90, 90, 90, 0.55)';
      context.beginPath();
      context.arc(car.x - Math.cos(car.angle) * 10 + (hash2(Math.floor(t * 9), 3) - 0.5) * 14, car.y - Math.sin(car.angle) * 10 - 8, 7 + hash2(Math.floor(t * 9), 5) * 6, 0, TAU);
      context.fill();
    }
  }

  function drawPlayerFigure(state) {
    const p = state.player;
    if (p.inCar || p.dead) return;
    context.fillStyle = 'rgba(8, 6, 16, 0.5)';
    context.beginPath();
    context.ellipse(p.x + 3, p.y + 4, 13, 10, 0, 0, TAU);
    context.fill();
    if (p.hurt > 0.25) {
      context.fillStyle = 'rgba(229, 83, 75, 0.8)';
    } else {
      context.fillStyle = '#ff8c42';
    }
    context.beginPath();
    context.arc(p.x, p.y, 12, 0, TAU);
    context.fill();
    context.fillStyle = '#1f2937';
    context.beginPath();
    context.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, TAU);
    context.fill();
    // Facing tick and weapon.
    context.strokeStyle = '#f5efe6';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(p.x + Math.cos(p.angle) * 12, p.y + Math.sin(p.angle) * 12);
    context.lineTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
    context.stroke();
    if (p.weapon !== 'fists') {
      context.strokeStyle = '#2a2a33';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(p.x + Math.cos(p.angle) * 10, p.y + Math.sin(p.angle) * 10);
      context.lineTo(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24);
      context.stroke();
    }
  }

  function drawFootCop(cop, t) {
    if (cop.dead) return;
    context.fillStyle = 'rgba(8, 6, 16, 0.5)';
    context.beginPath();
    context.ellipse(cop.x + 3, cop.y + 4, 12, 9, 0, 0, TAU);
    context.fill();
    context.fillStyle = '#1e3a5f';
    context.beginPath();
    context.arc(cop.x, cop.y, 11, 0, TAU);
    context.fill();
    context.fillStyle = '#dbeafe';
    context.beginPath();
    context.arc(cop.x, cop.y - 2, 5, 0, TAU);
    context.fill();
    context.strokeStyle = '#f5efe6';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(cop.x + Math.cos(cop.angle) * 10, cop.y + Math.sin(cop.angle) * 10);
    context.lineTo(cop.x + Math.cos(cop.angle) * 18, cop.y + Math.sin(cop.angle) * 18);
    context.stroke();
    void t;
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      context.globalAlpha = Math.max(0, 1 - p.t / p.life);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
    for (const tr of state.tracers) {
      context.globalAlpha = Math.max(0, 1 - tr.t / 0.12);
      context.strokeStyle = '#ffe9a8';
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(tr.x1, tr.y1);
      context.lineTo(tr.x2, tr.y2);
      context.stroke();
    }
    context.globalAlpha = 1;
    for (const f of state.floats) {
      context.globalAlpha = Math.max(0, 1 - f.t / 1.4);
      text(f.text, f.x, f.y, 20, f.color, 'center', true);
    }
    context.globalAlpha = 1;
  }

  function drawGps(state, gps) {
    if (!gps) return;
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    const dist = Math.hypot(gps.x - px, gps.y - py);
    if (dist < 60) return;
    context.save();
    context.strokeStyle = 'rgba(242, 201, 76, 0.85)';
    context.lineWidth = 5;
    context.setLineDash([18, 14]);
    context.beginPath();
    context.moveTo(px, py);
    context.lineTo(gps.x, gps.y);
    context.stroke();
    context.setLineDash([]);
    const pulse = 1 + Math.sin(state.time * 4) * 0.12;
    context.strokeStyle = '#f2c94c';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(gps.x, gps.y, 34 * pulse, 0, TAU);
    context.stroke();
    context.fillStyle = '#f2c94c';
    context.beginPath();
    context.moveTo(gps.x, gps.y - 12);
    context.lineTo(gps.x + 10, gps.y + 8);
    context.lineTo(gps.x - 10, gps.y + 8);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawDusk() {
    // Warm western glow, cool eastern shade, then a vignette.
    const glow = context.createLinearGradient(0, 0, VIEW.width, 0);
    glow.addColorStop(0, 'rgba(255, 122, 26, 0.10)');
    glow.addColorStop(0.55, 'rgba(255, 122, 26, 0.02)');
    glow.addColorStop(1, 'rgba(88, 60, 160, 0.12)');
    context.fillStyle = glow;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    const vig = context.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.42, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95);
    vig.addColorStop(0, 'rgba(10, 6, 20, 0)');
    vig.addColorStop(1, 'rgba(10, 6, 20, 0.42)');
    context.fillStyle = vig;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  function drawLampGlows(state) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    for (const lamp of state.city.lamps) {
      const g = context.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, 90);
      g.addColorStop(0, 'rgba(255, 214, 130, 0.20)');
      g.addColorStop(1, 'rgba(255, 214, 130, 0)');
      context.fillStyle = g;
      context.beginPath();
      context.arc(lamp.x, lamp.y, 90, 0, TAU);
      context.fill();
    }
    context.restore();
  }

  // ---------- HUD ----------

  function drawStars(stars) {
    const x0 = VIEW.width - 210;
    const y = 34;
    text('WANTED', x0 - 8, y + 5, 13, PALETTE.muted, 'right', true);
    for (let i = 0; i < 5; i += 1) {
      context.font = font(26, true);
      context.fillStyle = i < stars ? '#f2c94c' : 'rgba(255,255,255,0.22)';
      context.textAlign = 'left';
      context.fillText('★', x0 + i * 30, y + 8);
    }
  }

  function drawHud(state, gps) {
    const p = state.player;
    const save = state.save;
    const mission = currentMission(state.missions);
    // Cash and district.
    text(`$${save.cash.toLocaleString('en-US')}`, 24, 40, 30, '#7CFC00', 'left', true);
    text(state.district, 24, 66, 15, PALETTE.muted, 'left', true);
    // Clock.
    const hour = Math.floor(state.clock / 60) % 24;
    const minute = Math.floor(state.clock % 60);
    const clock = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    text(clock, VIEW.width - 24, 40, 22, PALETTE.text, 'right', true);
    drawStars(state.police.stars);
    // Mission banner.
    if (mission) {
      const stage = currentStage(state.missions);
      const obj = objectiveText(state.missions);
      context.fillStyle = PALETTE.panel;
      const w = 560;
      roundRect((VIEW.width - w) / 2, 14, w, 58, 10);
      context.fill();
      context.strokeStyle = 'rgba(242, 201, 76, 0.5)';
      context.lineWidth = 1.5;
      roundRect((VIEW.width - w) / 2, 14, w, 58, 10);
      context.stroke();
      text(`${mission.title}`, VIEW.width / 2, 38, 17, '#f2c94c', 'center', true);
      text(stage && stage.kind === 'timed-goto' ? `${obj}` : obj, VIEW.width / 2, 60, 15, PALETTE.text, 'center');
    }
    // Health and armor above the minimap.
    const barX = 24;
    const barY = VIEW.height - 268;
    text('HEALTH', barX, barY, 12, PALETTE.muted, 'left', true);
    context.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(barX, barY + 6, 190, 12, 6);
    context.fill();
    context.fillStyle = p.health > 30 ? '#4ade80' : '#e5534b';
    roundRect(barX, barY + 6, 190 * (p.health / 100), 12, 6);
    context.fill();
    if (p.armor > 0) {
      text('ARMOR', barX, barY + 34, 12, PALETTE.muted, 'left', true);
      context.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(barX, barY + 40, 190, 12, 6);
      context.fill();
      context.fillStyle = '#4fc3f7';
      roundRect(barX, barY + 40, 190 * (p.armor / 100), 12, 6);
      context.fill();
    }
    // Speed and weapon, bottom right.
    const car = p.inCar;
    if (car) {
      const mph = Math.round(Math.abs(car.speed) * 0.12);
      text(`${mph}`, VIEW.width - 24, VIEW.height - 30, 44, PALETTE.text, 'right', true);
      text('MPH', VIEW.width - 24, VIEW.height - 8, 13, PALETTE.muted, 'right', true);
      text(car.model.name, VIEW.width - 110, VIEW.height - 30, 15, PALETTE.muted, 'right');
      const hp = Math.max(0, Math.round(car.health));
      context.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(VIEW.width - 214, VIEW.height - 62, 190, 8, 4);
      context.fill();
      context.fillStyle = hp > 30 ? '#f2c94c' : '#e5534b';
      roundRect(VIEW.width - 214, VIEW.height - 62, 190 * (hp / 100), 8, 4);
      context.fill();
    } else {
      const def = WEAPONS[p.weapon];
      const ammo = p.weapon === 'fists' ? '∞' : String(p.ammo[p.weapon] || 0);
      text(def.name, VIEW.width - 24, VIEW.height - 34, 20, PALETTE.text, 'right', true);
      text(`AMMO ${ammo}`, VIEW.width - 24, VIEW.height - 12, 13, PALETTE.muted, 'right', true);
    }
    // Message feed.
    let my = VIEW.height - 96;
    const recent = state.messages.slice(-3);
    for (let i = recent.length - 1; i >= 0; i -= 1) {
      const msg = recent[i];
      context.globalAlpha = Math.max(0.35, 1 - msg.t / 6);
      text(msg.text, VIEW.width / 2, my, 16, PALETTE.text, 'center');
      my -= 24;
    }
    context.globalAlpha = 1;
    // Controls hint.
    text('WASD drive / walk · E enter car · Click shoot · Q weapon · M mute · P pause', VIEW.width / 2, VIEW.height - 4, 12, 'rgba(184, 174, 191, 0.75)', 'center');
    void gps;
  }

  function drawMinimap(state, gps) {
    const cx = 134;
    const cy = VIEW.height - 134;
    const r = 106;
    const scale = (r * 2) / WORLD.width;
    const mx = (x) => cx + (x - WORLD.width / 2) * scale;
    const my = (y) => cy + (y - WORLD.height / 2) * scale;
    context.save();
    context.beginPath();
    context.arc(cx, cy, r, 0, TAU);
    context.clip();
    context.fillStyle = 'rgba(16, 12, 24, 0.85)';
    context.fillRect(cx - r, cy - r, r * 2, r * 2);
    // Water and beach.
    context.fillStyle = '#1d4a5e';
    context.fillRect(mx(WORLD.waterX), cy - r, r * 2, r * 2);
    context.fillStyle = '#b98d5e';
    context.fillRect(mx(WORLD.beachX), cy - r, (WORLD.waterX - WORLD.beachX) * scale, r * 2);
    // Roads.
    context.strokeStyle = '#5a5a72';
    context.lineWidth = 3;
    for (const ax of ROADS.avenues) {
      context.beginPath();
      context.moveTo(mx(ax), cy - r);
      context.lineTo(mx(ax), cy + r);
      context.stroke();
    }
    for (const sy of ROADS.streets) {
      context.beginPath();
      context.moveTo(cx - r, my(sy));
      context.lineTo(cx + r, my(sy));
      context.stroke();
    }
    context.beginPath();
    context.moveTo(mx(ROADS.oceanDrive), cy - r);
    context.lineTo(mx(ROADS.oceanDrive), cy + r);
    context.stroke();
    // Mission marker.
    if (gps) {
      context.save();
      context.translate(mx(gps.x), my(gps.y));
      context.rotate(Math.PI / 4);
      context.fillStyle = '#f2c94c';
      const s = 7 + Math.sin(state.time * 5) * 1.5;
      context.fillRect(-s / 2, -s / 2, s, s);
      context.restore();
    }
    // Cop blips.
    for (const cop of state.police.copCars) {
      if (cop.dead) continue;
      context.fillStyle = Math.floor(state.time * 4) % 2 === 0 ? '#ef4444' : '#3b82f6';
      context.beginPath();
      context.arc(mx(cop.x), my(cop.y), 4, 0, TAU);
      context.fill();
    }
    // Player arrow.
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    context.save();
    context.translate(mx(px), my(py));
    context.rotate(p.inCar ? p.inCar.angle : p.angle);
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(9, 0);
    context.lineTo(-6, -6);
    context.lineTo(-6, 6);
    context.closePath();
    context.fill();
    context.restore();
    // View cone.
    context.restore();
    context.strokeStyle = 'rgba(245, 239, 230, 0.8)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(cx, cy, r, 0, TAU);
    context.stroke();
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 32;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 14);
    context.fill();
    context.strokeStyle = accent || 'rgba(242, 201, 76, 0.6)';
    context.lineWidth = 2;
    roundRect(x, y, width, height, 14);
    context.stroke();
    text(title, VIEW.width / 2, y + 64, 44, PALETTE.text, 'center', true);
    lines.forEach((line, i) => {
      text(line, VIEW.width / 2, y + 108 + i * 32, 19, PALETTE.muted, 'center');
    });
    text(prompt, VIEW.width / 2, y + height - 30, 20, '#f2c94c', 'center', true);
  }

  function drawShopMenu(state) {
    const width = 560;
    const height = 120 + GUN_MENU.length * 36;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 14);
    context.fill();
    context.strokeStyle = 'rgba(242, 201, 76, 0.6)';
    context.lineWidth = 2;
    roundRect(x, y, width, height, 14);
    context.stroke();
    text('AMMU-NATION', VIEW.width / 2, y + 52, 32, PALETTE.text, 'center', true);
    text(`Cash $${state.save.cash.toLocaleString('en-US')}`, VIEW.width / 2, y + 82, 16, '#7CFC00', 'center', true);
    GUN_MENU.forEach((item, i) => {
      const owned = item.id !== 'ammo' && state.player.weapons.includes(item.id);
      text(`[${item.key}] ${item.label}${owned ? ' — OWNED' : ''}`, VIEW.width / 2, y + 118 + i * 36, 18, owned ? PALETTE.muted : PALETTE.text, 'center');
      text(`$${item.price}`, x + width - 40, y + 118 + i * 36, 18, '#f2c94c', 'right', true);
    });
    text('Press E to leave', VIEW.width / 2, y + height - 24, 16, PALETTE.muted, 'center');
  }

  function drawTitle(state, best) {
    const grad = context.createLinearGradient(0, 0, 0, VIEW.height);
    grad.addColorStop(0, 'rgba(20, 10, 34, 0.25)');
    grad.addColorStop(1, 'rgba(20, 10, 34, 0.62)');
    context.fillStyle = grad;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    context.save();
    context.shadowColor = '#ff2e88';
    context.shadowBlur = 34;
    text('PALMETTO BAY', VIEW.width / 2, 210, 84, '#f5efe6', 'center', true);
    context.restore();
    text('A LEONIDA STORY · AN OPEN-WORLD CRIME GAME', VIEW.width / 2, 252, 20, '#f2c94c', 'center', true);
    const lines = [
      'Steal cars. Run missions for Rico. Outrun the LCPD.',
      'Six missions, eight stash chests, two shops — one long dusk.',
      'WASD move & drive · E enter car / interact · Mouse + Click shoot · Q weapon · Shift sprint',
    ];
    lines.forEach((line, i) => {
      text(line, VIEW.width / 2, 330 + i * 32, 19, PALETTE.text, 'center');
    });
    if (Math.floor(state.time * 1.4) % 2 === 0) {
      text('PRESS ENTER TO START', VIEW.width / 2, 480, 26, '#7CFC00', 'center', true);
    }
    if (best > 0) text(`Best cash: $${best.toLocaleString('en-US')}`, VIEW.width / 2, 530, 16, PALETTE.muted, 'center');
    text('Missions saved between visits · Sound on for the full dusk groove', VIEW.width / 2, VIEW.height - 24, 14, PALETTE.muted, 'center');
  }

  /** Paint one frame. `ui` carries the screen, the best cash and the GPS target. */
  function draw(state, ui) {
    const screen = ui.screen;
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;

    // Camera: follow the player, pull back with speed, shake on impacts.
    let targetZoom = p.inCar ? 0.8 - Math.min(0.16, Math.abs(p.inCar.speed) / 6000) : 0.95;
    if (screen === SCREEN_TITLE) targetZoom = 0.62;
    camZoom += (targetZoom - camZoom) * 0.06;
    let tx = px;
    let ty = py;
    if (screen === SCREEN_TITLE) {
      titlePan += 0.0016;
      tx = 3550 + Math.sin(titlePan) * 350;
      ty = 1300 + Math.cos(titlePan * 0.7) * 400;
    } else if (p.inCar) {
      tx = px + Math.cos(p.inCar.angle) * 90;
      ty = py + Math.sin(p.inCar.angle) * 90;
    }
    camX += (tx - camX) * 0.08;
    camY += (ty - camY) * 0.08;
    const shakeX = state.shake > 0 ? (hash2(Math.floor(state.time * 60), 1) - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (hash2(Math.floor(state.time * 60), 2) - 0.5) * state.shake : 0;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0d0a16';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // World-space transform: centre the camera in the logical view.
    context.translate(VIEW.width / 2, VIEW.height / 2);
    context.scale(camZoom, camZoom);
    context.translate(-camX + shakeX, -camY + shakeY);

    drawGround(state);
    drawRoads();
    const visible = { x0: camX - VIEW.width / camZoom, x1: camX + VIEW.width / camZoom, y0: camY - VIEW.height / camZoom, y1: camY + VIEW.height / camZoom };
    for (const b of state.city.buildings) {
      if (b.x + b.w < visible.x0 || b.x > visible.x1 || b.y + b.h < visible.y0 || b.y > visible.y1) continue;
      drawBuilding(b);
    }
    drawProps(state);
    drawPickups(state);
    drawGps(state, ui.gps);
    for (const car of state.cars) drawCar(car, state.time);
    for (const cop of state.police.copCars) drawCar(cop, state.time);
    for (const block of state.police.roadblocks) drawCar(block, state.time);
    for (const cop of state.police.footCops) drawFootCop(cop, state.time);
    drawPlayerFigure(state);
    drawParticles(state);
    drawLampGlows(state);

    // Back to screen space for the dusk grade and the HUD.
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawDusk();

    if (screen === SCREEN_TITLE) {
      drawTitle(state, ui.best);
      return;
    }
    drawHud(state, ui.gps);
    drawMinimap(state, ui.gps);
    if (state.shopOpen === 'guns') drawShopMenu(state);
    if (state.missionFlash > 0) {
      context.globalAlpha = Math.min(0.5, state.missionFlash);
      context.fillStyle = '#f2c94c';
      context.fillRect(0, 0, VIEW.width, VIEW.height);
      context.globalAlpha = 1;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The city waits. Your wanted level does not cool while paused.'], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      drawPanel('BUSTED', ['The LCPD caught up with you.', 'Bail paid. Your record is clean — for now.'], 'Press Enter to get back out there', '#3b82f6');
    } else if (screen === SCREEN_WASTED) {
      drawPanel('WASTED', ['Palmetto Bay is not done with you yet.', 'The hospital patched you up.'], 'Press Enter to get back out there', '#e5534b');
    } else if (screen === SCREEN_WIN) {
      drawPanel('KING OF THE BAY', ['All six missions complete. The gold Aurum is yours.', `Cash: $${state.save.cash.toLocaleString('en-US')} · Cars stolen: ${state.save.stats.carsStolen}`], 'Press Enter to keep roaming free');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Game over', [`Cash: $${state.save.cash.toLocaleString('en-US')}`], 'Press Enter to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Put the camera on the player at once (staged screenshots paint twice). */
    snap(state) {
      const p = state.player;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      camX = px;
      camY = py;
      camZoom = p.inCar ? 0.8 : 0.95;
    },
    /** Put the camera on a fixed point at once (the title shot's vista). */
    snapTo(x, y, zoom) {
      camX = x;
      camY = y;
      camZoom = zoom;
    },
    /** Convert a mouse position (CSS pixels) to world coordinates. */
    screenToWorld(clientX, clientY) {
      const ratio = window.devicePixelRatio || 1;
      const lx = (clientX * ratio - view.x) / view.scale;
      const ly = (clientY * ratio - view.y) / view.scale;
      return {
        x: (lx - VIEW.width / 2) / camZoom + camX,
        y: (ly - VIEW.height / 2) / camZoom + camY,
      };
    },
  };
}

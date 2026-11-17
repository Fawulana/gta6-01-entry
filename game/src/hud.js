// The HUD: cash, health, wanted stars, the mission objective, the location
// line, toasts, speed, the crosshair, and the minimap with live blips.
import { MAX_WANTED, ROAD_COUNT, ROAD_FIRST, ROAD_SPACING, WORLD_H, WORLD_W, clamp } from './config.js';
import { districtAt } from './city.js';
import { missionObjective } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MAP_SIZE = 190;
const MAP_PAD = 14;

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || ''} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, x, y);
}

function drawStars(ctx, G, x, y) {
  for (let i = 0; i < MAX_WANTED; i += 1) {
    ctx.font = '26px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = i < G.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 28, y);
  }
}

function drawMinimap(ctx, G, cw) {
  const x0 = cw - MAP_SIZE - MAP_PAD;
  const y0 = MAP_PAD;
  const s = MAP_SIZE / WORLD_W;
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,20,0.82)';
  ctx.fillRect(x0 - 4, y0 - 4, MAP_SIZE + 8, MAP_SIZE + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, MAP_SIZE + 8, MAP_SIZE + 8);
  // Water and beach.
  ctx.fillStyle = '#2f6f8f';
  ctx.fillRect(x0, y0 + 2960 * s, MAP_SIZE, (WORLD_H - 2960) * s);
  ctx.fillStyle = '#3a3f4a';
  for (const rx of G.city.roadsX) ctx.fillRect(x0 + rx * s - 1, y0, 2, MAP_SIZE);
  for (const ry of G.city.roadsY) ctx.fillRect(x0, y0 + ry * s - 1, MAP_SIZE, 2);
  // Parks.
  ctx.fillStyle = '#4a7a3a';
  for (const park of G.city.parks) ctx.fillRect(x0 + park.x * s, y0 + park.y * s, park.w * s, park.h * s);
  // Story markers.
  const marks = G.city.markers;
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(x0 + marks.safehouse.x * s - 3, y0 + marks.safehouse.y * s - 3, 6, 6);
  // Mission target: pulsing yellow diamond.
  const m = G.mission;
  if (m) {
    const pulse = 4 + Math.sin(performance.now() / 200) * 2;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(x0 + m.target.x * s, y0 + m.target.y * s - pulse);
    ctx.lineTo(x0 + m.target.x * s + pulse, y0 + m.target.y * s);
    ctx.lineTo(x0 + m.target.x * s, y0 + m.target.y * s + pulse);
    ctx.lineTo(x0 + m.target.x * s - pulse, y0 + m.target.y * s);
    ctx.closePath();
    ctx.fill();
  }
  // Police blips, then the player arrow.
  ctx.fillStyle = '#ff3b30';
  for (const car of G.cars) {
    if (!car.police || car.dead) continue;
    ctx.beginPath();
    ctx.arc(x0 + car.x * s, y0 + car.y * s, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = G.player;
  ctx.save();
  ctx.translate(x0 + p.x * s, y0 + p.y * s);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  text(ctx, districtAt(p.x, p.y).toUpperCase(), x0 + MAP_SIZE, y0 + MAP_SIZE + 10, 12, 'rgba(255,255,255,0.85)', 'right', 'bold');
}

export function drawHUD(ctx, G, cw, ch) {
  const p = G.player;
  // Cash and health, top left.
  ctx.fillStyle = 'rgba(10,14,20,0.6)';
  ctx.fillRect(12, 12, 210, 64);
  text(ctx, `$${p.cash.toLocaleString('en-US')}`, 22, 18, 26, '#7dff8a', 'left', 'bold');
  text(ctx, 'SOLMAR BAY', 22, 48, 12, 'rgba(255,255,255,0.7)');
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(130, 52, 80, 12);
  ctx.fillStyle = p.health > 40 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(130, 52, 80 * clamp(p.health / 100, 0, 1), 12);
  // Wanted stars under the cash.
  drawStars(ctx, G, 22, 84);
  // Mission objective, top centre.
  const obj = missionObjective(G);
  ctx.font = 'bold 17px ' + FONT;
  const w = ctx.measureText(obj).width;
  ctx.fillStyle = 'rgba(10,14,20,0.6)';
  ctx.fillRect(cw / 2 - w / 2 - 14, 12, w + 28, 34);
  ctx.fillStyle = '#ffd60a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(obj, cw / 2, 20);
  // Minimap, top right.
  drawMinimap(ctx, G, cw);
  // Toasts, centre top under the objective.
  let ty = 56;
  for (const toast of G.toasts) {
    ctx.font = '16px ' + FONT;
    const tw = ctx.measureText(toast.text).width;
    ctx.fillStyle = 'rgba(10,14,20,0.72)';
    ctx.fillRect(cw / 2 - tw / 2 - 12, ty, tw + 24, 28);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(toast.text, cw / 2, ty + 5);
    ty += 34;
  }
  // Controls hint, bottom left.
  text(ctx, p.inCar ? 'WASD drive · Space handbrake · E exit · M mute' : 'WASD move · Shift run · E enter car · F steal · Click shoot · P pause', 14, ch - 26, 13, 'rgba(255,255,255,0.75)');
  // Speed, bottom right.
  if (p.inCar) {
    const kmh = Math.round(Math.abs(p.inCar.speed) * 0.24);
    text(ctx, `${kmh} km/h`, cw - 16, ch - 52, 26, '#fff', 'right', 'bold');
    // Car health.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cw - 136, ch - 24, 120, 10);
    ctx.fillStyle = p.inCar.health > 40 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(cw - 136, ch - 24, 120 * clamp(p.inCar.health / 100, 0, 1), 10);
  }
  // Crosshair when on foot.
  if (!p.inCar) {
    const mx = G.input.mouse.x;
    const my = G.input.mouse.y;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.moveTo(mx - 13, my);
    ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my);
    ctx.lineTo(mx + 13, my);
    ctx.moveTo(mx, my - 13);
    ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx, my + 13);
    ctx.stroke();
  }
}

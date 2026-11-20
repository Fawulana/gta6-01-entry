// Drawing only: the city, its people and cars, the markers and effects, and
// the menu screens. The camera follows the player; the HUD is drawn in
// screen space by hud.js.
import {
  BEACH_TOP, WATER_TOP,
} from './city.js';
import {
  CAR_LENGTH, CAR_WIDTH, ROAD_COUNT, ROAD_FIRST, ROAD_SPACING, ROAD_WIDTH,
  WORLD_H, WORLD_W, clamp, hash2,
} from './config.js';
import { drawCar } from './vehicles.js';
import { drawPed } from './traffic.js';
import { drawBullet, drawEnemy } from './combat.js';
import { drawHUD } from './hud.js';
import { drawStashes } from './activities.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_HELP = 'help';
export const SCREEN_MISSION = 'mission';

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || ''} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, x, y);
}

function drawGround(ctx, G) {
  const city = G.city;
  // Grass base.
  ctx.fillStyle = '#5d8a4a';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Sidewalk blocks between the roads.
  ctx.fillStyle = '#8f8f7d';
  const half = ROAD_WIDTH / 2;
  for (let ix = 0; ix < ROAD_COUNT - 1; ix += 1) {
    for (let iy = 0; iy < ROAD_COUNT - 1; iy += 1) {
      ctx.fillRect(
        city.roadsX[ix] + half, city.roadsY[iy] + half,
        ROAD_SPACING - ROAD_WIDTH, ROAD_SPACING - ROAD_WIDTH,
      );
    }
  }
  // Beach sand and water along the south edge.
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(0, BEACH_TOP, WORLD_W, WORLD_H - BEACH_TOP);
  ctx.fillStyle = '#2f7fa8';
  ctx.fillRect(0, WATER_TOP, WORLD_W, WORLD_H - WATER_TOP);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let x = 0; x < WORLD_W; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, WATER_TOP + 14 + Math.sin((x + G.time * 40) / 90) * 4);
    ctx.lineTo(x + 40, WATER_TOP + 14 + Math.sin((x + 40 + G.time * 40) / 90) * 4);
    ctx.stroke();
  }
  // Parks.
  for (const park of city.parks) {
    ctx.fillStyle = park.plaza ? '#a8a894' : '#4a7a3a';
    ctx.fillRect(park.x, park.y, park.w, park.h);
  }
  // Roads: asphalt strips, then centre dashes.
  ctx.fillStyle = '#33363d';
  for (const rx of city.roadsX) ctx.fillRect(rx - half, 0, ROAD_WIDTH, WORLD_H);
  for (const ry of city.roadsY) ctx.fillRect(0, ry - half, WORLD_W, ROAD_WIDTH);
  ctx.fillStyle = '#33363d';
  ctx.fillRect(0, BEACH_TOP, WORLD_W, WORLD_H - BEACH_TOP); // boardwalk road
  ctx.strokeStyle = '#e8c33a';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const rx of city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, WORLD_H);
    ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(WORLD_W, ry);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Edge lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (const rx of city.roadsX) {
    ctx.beginPath(); ctx.moveTo(rx - half + 3, 0); ctx.lineTo(rx - half + 3, WORLD_H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx + half - 3, 0); ctx.lineTo(rx + half - 3, WORLD_H); ctx.stroke();
  }
  for (const ry of city.roadsY) {
    ctx.beginPath(); ctx.moveTo(0, ry - half + 3); ctx.lineTo(WORLD_W, ry - half + 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ry + half - 3); ctx.lineTo(WORLD_W, ry + half - 3); ctx.stroke();
  }
  // Zebra crosswalks at every intersection, on both axes.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of city.roadsX) {
    for (const ry of city.roadsY) {
      for (let s = -30; s <= 30; s += 15) {
        ctx.fillRect(rx - half + 6, ry + s - 4, 12, 8);
        ctx.fillRect(rx + s - 4, ry - half + 6, 8, 12);
      }
    }
  }
  // Palm-lined beach: palms and striped umbrellas on the sand.
  for (const pl of city.palms) {
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + 6, pl.y - 22); ctx.stroke();
    ctx.fillStyle = '#2f7a3a';
    for (let f = 0; f < 5; f += 1) {
      const a = (f / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(pl.x + 6 + Math.cos(a) * 10, pl.y - 22 + Math.sin(a) * 5, 12, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // A striped umbrella beside every third palm.
    if (Math.floor(pl.x / 170) % 3 === 0) {
      ctx.strokeStyle = '#8a6a4a';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pl.x + 34, pl.y + 4); ctx.lineTo(pl.x + 34, pl.y - 12); ctx.stroke();
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); ctx.arc(pl.x + 34, pl.y - 12, 14, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(pl.x + 34, pl.y - 12, 14, Math.PI, Math.PI * 1.5); ctx.fill();
      ctx.beginPath(); ctx.arc(pl.x + 34, pl.y - 12, 14, Math.PI * 1.5, Math.PI * 2); ctx.fill();
    }
  }
  // Buildings: roof, inner court, windows. Towers throw long sun shadows
  // to the south-east, and downtown towers carry a helipad ring.
  for (const b of city.buildings) {
    const shadow = b.tall ? 18 : 5;
    ctx.fillStyle = b.tall ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + shadow, b.y + shadow + 2, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const cols = Math.max(1, Math.floor(b.w / 26));
    const rows = Math.max(1, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        if (hash2(Math.floor(b.x) + cx * 7, Math.floor(b.y) + cy * 7) > 0.45) {
          ctx.fillRect(b.x + 12 + cx * 26, b.y + 12 + cy * 26, 10, 8);
        }
      }
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 8, 16, 16);
      // Helipad ring on downtown towers.
      if (b.x >= 1400 && b.x <= 2200 && b.y >= 1400 && b.y <= 2200) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 16px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('H', b.x + b.w / 2, b.y + b.h / 2 - 7);
      }
    }
  }
  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f6b2f';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a8a3a';
    ctx.beginPath(); ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // Named places: a small signpost dot and label.
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'center';
  for (const key of Object.keys(city.markers)) {
    const mk = city.markers[key];
    ctx.fillStyle = 'rgba(10,14,20,0.75)';
    const w = ctx.measureText(mk.label).width + 16;
    ctx.fillRect(mk.x - w / 2, mk.y - 34, w, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(mk.label, mk.x, mk.y - 30);
  }
}

function drawMarker(ctx, G) {
  const m = G.mission;
  if (!m) return;
  const t = m.target;
  const bob = Math.sin(G.time * 3) * 6;
  // Light column.
  const grad = ctx.createLinearGradient(t.x, t.y - 180, t.x, t.y);
  grad.addColorStop(0, 'rgba(255,214,10,0)');
  grad.addColorStop(1, 'rgba(255,214,10,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(t.x - 14, t.y - 180, 28, 180);
  // Floating diamond.
  ctx.save();
  ctx.translate(t.x, t.y - 46 + bob);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(-11, -11, 22, 22);
  ctx.fillStyle = '#111';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
}

function drawPickups(ctx, G) {
  for (const pk of G.pickups) {
    const bob = Math.sin(G.time * 4 + pk.x) * 3;
    if (pk.kind === 'cash') {
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', pk.x, pk.y + bob + 1);
      ctx.textBaseline = 'top';
    } else {
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(pk.x - 12, pk.y - 12 + bob, 24, 24);
      ctx.strokeStyle = '#e8d8a0';
      ctx.lineWidth = 2;
      ctx.strokeRect(pk.x - 12, pk.y - 12 + bob, 24, 24);
    }
  }
}

function drawParticles(ctx, G) {
  for (const pt of G.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (p.inCar) return; // the car drawing carries the player
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0) ctx.globalAlpha = 0.4;
  ctx.rotate(p.angle);
  // Jacket, head, gun toward the mouse.
  ctx.fillStyle = '#2f8f7a';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(8, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -3, 18, 4);
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath(); ctx.arc(-6, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Skid marks left by handbraking, fading over a few seconds. */
function drawSkids(ctx, G) {
  if (!G.skidMarks) return;
  for (const s of G.skidMarks) {
    ctx.globalAlpha = clamp(s.life / 6, 0, 0.55);
    ctx.fillStyle = '#1a1a1a';
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillRect(-9, -2, 18, 4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawWorld(ctx, G) {
  drawGround(ctx, G);
  drawMarker(ctx, G);
  drawPickups(ctx, G);
  drawStashes(ctx, G);
  drawSkids(ctx, G);
  for (const ped of G.peds) drawPed(ctx, ped);
  for (const e of G.enemies) drawEnemy(ctx, e);
  for (const car of G.cars) if (!car.dead) drawCar(ctx, car);
  drawPlayer(ctx, G);
  for (const b of G.bullets) drawBullet(ctx, b);
  drawParticles(ctx, G);
}

function drawPanel(ctx, cw, ch, title, lines, prompt, accent) {
  const width = 640;
  const height = 150 + lines.length * 32 + 70;
  const x = (cw - width) / 2;
  const y = (ch - height) / 2;
  ctx.fillStyle = 'rgba(8,12,18,0.88)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = accent || '#ffd60a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  text(ctx, title, cw / 2, y + 34, 44, '#fff', 'center', 'bold');
  for (let i = 0; i < lines.length; i += 1) {
    text(ctx, lines[i], cw / 2, y + 104 + i * 32, 18, 'rgba(255,255,255,0.85)', 'center');
  }
  text(ctx, prompt, cw / 2, y + height - 44, 20, accent || '#ffd60a', 'center', 'bold');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  /** Paint one frame for the screen the game is on. */
  function draw(G, screen) {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0c1016';
    ctx.fillRect(0, 0, cw, ch);
    // Camera follows the player, clamped to the city.
    const cam = G.camera;
    const vx = clamp(cam.x - cw / 2, 0, Math.max(0, WORLD_W - cw));
    const vy = clamp(cam.y - ch / 2, 0, Math.max(0, WORLD_H - ch));
    ctx.save();
    ctx.translate(-vx, -vy);
    drawWorld(ctx, G);
    ctx.restore();
    // Strong dusk grade for the title and chase screenshots.
    if (G.dusk) {
      const grad = ctx.createLinearGradient(0, 0, 0, ch);
      grad.addColorStop(0, 'rgba(255,120,40,0.20)');
      grad.addColorStop(1, 'rgba(40,20,90,0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);
    }
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(8,12,18,0.55)';
      ctx.fillRect(0, 0, cw, ch);
      const lines = [
        'An open-world crime story in Solmar Bay — six jobs for Lena Cruz.',
        'Steal cars, outrun the Solmar PD, race the streets, steal the gold Comet GT.',
        'WASD move & drive · E enter car · F steal · Click shoot · R restart',
        'Missions: The Pickup → The Getaway → The Score',
        'The Street Race → The Heist → The Takeover',
        'Plus 10 hidden stash chests ($150 each) and five kinds of car to steal.',
      ];
      if (G.hasSave) lines.push('Press C to continue your saved game.');
      drawPanel(ctx, cw, ch, 'SOLMAR BAY', lines, 'Press Enter to start a new game', '#ffd60a');
      return;
    }
    if (screen === SCREEN_HELP) {
      drawPanel(ctx, cw, ch, 'How to play', [
        'WASD / arrows — walk and drive. Shift — sprint on foot.',
        'E — get in a car. F — steal the nearest car (the cops notice).',
        'Mouse — aim. Click — shoot. Space — handbrake while driving.',
        'Follow the yellow diamond: missions pay cash. Green $ pickups too.',
        'Stars mean the police are coming. Hide until they fade.',
        'P / Esc — pause. M — mute. The game saves at the safehouse.',
      ], 'Press H or Esc to go back', '#7dff8a');
      return;
    }
    drawHUD(ctx, G, cw, ch);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8,12,18,0.55)';
      ctx.fillRect(0, 0, cw, ch);
      drawPanel(ctx, cw, ch, 'Paused', ['The city waits for you.'], 'Press P to resume', '#7dff8a');
    } else if (screen === SCREEN_BUSTED) {
      ctx.fillStyle = 'rgba(8,12,18,0.6)';
      ctx.fillRect(0, 0, cw, ch);
      drawPanel(ctx, cw, ch, 'BUSTED', ['The Solmar PD caught up with you.', 'You lost some cash and the heat is off.'], 'Press Enter to get back out there', '#ff6b6b');
    } else if (screen === SCREEN_WASTED) {
      ctx.fillStyle = 'rgba(8,12,18,0.6)';
      ctx.fillRect(0, 0, cw, ch);
      drawPanel(ctx, cw, ch, 'WASTED', ['Solmar Bay is not done with you yet.'], 'Press Enter to wake up at Solmar General', '#ff6b6b');
    } else if (screen === SCREEN_MISSION) {
      drawPanel(ctx, cw, ch, G.lastMissionTitle || 'Mission complete', [`+$${G.lastMissionReward || 0} — nice work.`], 'Press Enter to keep playing', '#7dff8a');
    }
  }

  return { draw };
}

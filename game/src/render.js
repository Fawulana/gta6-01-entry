// World renderer for Solmar Bay: ground, roads, crosswalks, beach and
// water, marina and pier, buildings with long dusk shadows, palms, parks,
// cars, pedestrians, rivals, the player, bullets and particles — then a
// warm dusk lighting grade over the whole frame. Canvas 2D, no assets.
import { WORLD, ROAD_LINES, ROAD_W, DISTRICTS, BEACH, MARINA, PIER, PARKS, STASH_SPOTS } from './config.js';

const SUN_DIR = { x: 0.55, y: 0.35 }; // low western sun: long shadows

function drawGround(ctx, state, cam) {
  const { x: cx, y: cy } = cam;
  const vw = state.viewW;
  const vh = state.viewH;
  // Base ground.
  ctx.fillStyle = '#8a8578';
  ctx.fillRect(cx - vw / 2, cy - vh / 2, vw, vh);
  // District tints.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.tint;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Beach sand.
  ctx.fillStyle = '#d9c48f';
  ctx.fillRect(cx - vw / 2, BEACH.y0, vw, 180);
  // Water: south sea + marina basin, animated shimmer.
  ctx.fillStyle = '#2e6f8e';
  ctx.fillRect(cx - vw / 2, 3080, vw, 140);
  ctx.fillRect(MARINA.x0, MARINA.y0, WORLD - MARINA.x0, MARINA.y1 - MARINA.y0);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  const t = state.time;
  for (let i = 0; i < 8; i += 1) {
    const wy = 3100 + i * 14 + Math.sin(t * 0.8 + i * 1.7) * 3;
    ctx.beginPath();
    ctx.moveTo(cx - vw / 2 + 40, wy);
    ctx.lineTo(cx + vw / 2 - 40, wy + Math.sin(t + i) * 4);
    ctx.stroke();
  }
  // Parks.
  for (const p of PARKS) {
    ctx.fillStyle = '#5d8a4a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#6fa055';
    ctx.fillRect(p.x + 14, p.y + 14, p.w - 28, p.h - 28);
  }
}

function drawRoads(ctx, state) {
  // Asphalt bands.
  ctx.fillStyle = '#3a3f46';
  for (const line of ROAD_LINES) {
    ctx.fillRect(0, line - ROAD_W / 2, WORLD, ROAD_W);
    ctx.fillRect(line - ROAD_W / 2, 0, ROAD_W, WORLD);
  }
  // Edge lines.
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 2;
  for (const line of ROAD_LINES) {
    ctx.beginPath();
    ctx.moveTo(0, line - ROAD_W / 2 + 4);
    ctx.lineTo(WORLD, line - ROAD_W / 2 + 4);
    ctx.moveTo(0, line + ROAD_W / 2 - 4);
    ctx.lineTo(WORLD, line + ROAD_W / 2 - 4);
    ctx.moveTo(line - ROAD_W / 2 + 4, 0);
    ctx.lineTo(line - ROAD_W / 2 + 4, WORLD);
    ctx.moveTo(line + ROAD_W / 2 - 4, 0);
    ctx.lineTo(line + ROAD_W / 2 + 4, WORLD);
    ctx.stroke();
  }
  // Centre dashes.
  ctx.fillStyle = '#e8c832';
  for (const line of ROAD_LINES) {
    for (let d = 40; d < WORLD; d += 80) {
      ctx.fillRect(d, line - 2, 36, 4);
      ctx.fillRect(line - 2, d, 4, 36);
    }
  }
  // Zebra crosswalks at every intersection.
  ctx.fillStyle = 'rgba(240,240,240,0.9)';
  for (const lx of ROAD_LINES) {
    for (const ly of ROAD_LINES) {
      for (let s = -3; s <= 3; s += 1) {
        ctx.fillRect(lx + s * 9 - 3, ly - ROAD_W / 2 + 6, 6, 14);
        ctx.fillRect(lx + s * 9 - 3, ly + ROAD_W / 2 - 20, 6, 14);
        ctx.fillRect(lx - ROAD_W / 2 + 6, ly + s * 9 - 3, 14, 6);
        ctx.fillRect(lx + ROAD_W / 2 - 20, ly + s * 9 - 3, 14, 6);
      }
    }
  }
}

function drawCityProps(ctx, state) {
  const city = state.city;
  // Pier.
  ctx.fillStyle = '#8a6f4d';
  ctx.fillRect(PIER.x, PIER.y, PIER.w, PIER.h);
  ctx.fillStyle = '#6d5639';
  for (let x = PIER.x + 10; x < PIER.x + PIER.w; x += 22) ctx.fillRect(x, PIER.y, 3, PIER.h);
  // Crates at the docks.
  for (const c of city.crates) {
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.s, c.s);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.s, c.s);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.s, c.y + c.s);
    ctx.stroke();
  }
  // Trees in parks.
  for (const t of city.trees) {
    ctx.fillStyle = '#3f6b2f';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d8a4a';
    ctx.beginPath();
    ctx.arc(t.x - 4, t.y - 4, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Palms: trunk + fronds.
  for (const palm of city.palms) {
    ctx.strokeStyle = '#7a5c38';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(palm.x, palm.y);
    ctx.lineTo(palm.x + 4, palm.y - 26);
    ctx.stroke();
    ctx.strokeStyle = '#3f7a3a';
    ctx.lineWidth = 3;
    for (let f = 0; f < 6; f += 1) {
      const a = (f / 6) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(palm.x + 4, palm.y - 26);
      ctx.quadraticCurveTo(
        palm.x + 4 + Math.cos(a) * 12, palm.y - 26 + Math.sin(a) * 12 - 6,
        palm.x + 4 + Math.cos(a) * 20, palm.y - 26 + Math.sin(a) * 20 + 4,
      );
      ctx.stroke();
    }
  }
  // Beach umbrellas.
  for (const u of city.umbrellas) {
    ctx.strokeStyle = '#8a6f4d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(u.x, u.y - 18);
    ctx.stroke();
    ctx.fillStyle = u.color;
    ctx.beginPath();
    ctx.arc(u.x, u.y - 18, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(u.x, u.y - 18, 16, Math.PI * 1.25, Math.PI * 1.5);
    ctx.fill();
  }
  // Street lamps.
  for (const lamp of city.lamps) {
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    ctx.fillStyle = 'rgba(255,220,120,0.85)';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // District labels on the ground.
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px monospace';
  for (const d of DISTRICTS) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(d.name, d.x, d.y - d.r * 0.55);
  }
  ctx.textAlign = 'left';
}

function drawBuildings(ctx, state) {
  const city = state.city;
  // Long dusk shadows first, then the buildings themselves.
  ctx.fillStyle = 'rgba(20,16,30,0.35)';
  for (const b of city.buildings) {
    const sh = b.hgt * 0.9;
    ctx.fillRect(b.x + SUN_DIR.x * sh, b.y + SUN_DIR.y * sh, b.w, b.h);
  }
  for (const b of city.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Rooftop: lighter slab + a darker rim, so towers read as 3D.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    if (b.roof) {
      ctx.fillStyle = '#3a3f46';
      ctx.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.3, b.w * 0.25, b.h * 0.25);
    }
    if (b.downtown) {
      // Lit windows on the tower faces.
      ctx.fillStyle = 'rgba(255,214,110,0.75)';
      const cols = Math.floor(b.w / 22);
      const rows = Math.floor(b.h / 22);
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          if ((i * 7 + j * 13 + Math.floor(b.x)) % 5 === 0) {
            ctx.fillRect(b.x + 8 + i * 22, b.y + 8 + j * 22, 8, 10);
          }
        }
      }
    }
  }
}

function drawSkids(ctx, state) {
  ctx.strokeStyle = 'rgba(15,15,15,0.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const s of state.skids) {
    ctx.globalAlpha = Math.max(0, Math.min(0.55, s.life / 6));
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const l = car.len;
  const w = car.wid;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-l / 2 + 4, -w / 2 + 4, l, w);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -l / 2, -w / 2, l, w, 7);
  ctx.fill();
  // Cabin.
  ctx.fillStyle = car.dark;
  roundRect(ctx, -l * 0.18, -w * 0.36, l * 0.42, w * 0.72, 4);
  ctx.fill();
  // Windshield + rear window.
  ctx.fillStyle = 'rgba(180,220,240,0.8)';
  ctx.fillRect(l * 0.24, -w * 0.3, 4, w * 0.6);
  ctx.fillRect(-l * 0.22, -w * 0.3, 4, w * 0.6);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(l / 2 - 3, -w / 2 + 2, 3, 5);
  ctx.fillRect(l / 2 - 3, w / 2 - 7, 3, 5);
  // Taxi checker strip + roof sign.
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#111';
    for (let i = 0; i < 6; i += 1) {
      if (i % 2 === 0) ctx.fillRect(-l / 2 + 4 + i * 6, -2, 6, 4);
    }
    ctx.fillStyle = '#ffd21f';
    ctx.fillRect(-6, -w / 2 - 5, 12, 5);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 5px monospace';
    ctx.fillText('TAXI', -6, -w / 2 - 1);
  }
  // Police livery.
  if (car.kind === 'police') {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-l * 0.1, -w / 2, l * 0.2, w);
    ctx.fillStyle = '#e23b2e';
    ctx.fillRect(-l / 2 + 6, -w / 2 - 4, 5, 4);
    ctx.fillStyle = '#2e6fd2';
    ctx.fillRect(-l / 2 + 12, -w / 2 - 4, 5, 4);
  }
  // Gold Comet GT: gold ring + star.
  if (car.gold) {
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-l / 2 - 3, -w / 2 - 3, l + 6, w + 6);
  }
  // Damage smoke anchor: drawn by the particle system in main.
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

function drawPed(ctx, ped) {
  const bob = Math.sin(ped.walkPhase) * 2;
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.rotate(ped.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 2, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs (two dots that swing with the walk phase).
  ctx.fillStyle = '#2c2f33';
  ctx.beginPath();
  ctx.arc(-3 + bob, -4, 2.5, 0, Math.PI * 2);
  ctx.arc(-3 - bob, 4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(6, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRival(ctx, r) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 2, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.flash > 0 ? '#ffffff' : r.lieutenant ? '#7a1f1f' : '#3a2a4a';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  // Gold ring for lieutenants.
  if (r.lieutenant) {
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Gun barrel.
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();
  ctx.fillStyle = '#e8b89a';
  ctx.beginPath();
  ctx.arc(7, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // HP pips above.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(r.x - 14, r.y - 26, 28, 5);
  ctx.fillStyle = '#ff5a4a';
  ctx.fillRect(r.x - 14, r.y - 26, 28 * (r.hp / r.maxHp), 5);
}

function drawPlayer(ctx, p, state) {
  if (p.inCar) return; // the car is drawn instead
  const bob = p.moving ? Math.sin(state.time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.fillStyle = '#1e2a38';
  ctx.beginPath();
  ctx.arc(-4 + bob, -5, 3, 0, Math.PI * 2);
  ctx.arc(-4 - bob, 5, 3, 0, Math.PI * 2);
  ctx.fill();
  // Jacket (Lena's crew: teal).
  ctx.fillStyle = '#0f8a7a';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  // Head + cap.
  ctx.fillStyle = '#e8b89a';
  ctx.beginPath();
  ctx.arc(7, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f8a7a';
  ctx.fillRect(4, -6, 7, 3);
  // Pistol.
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(9, 3);
  ctx.lineTo(22, 3);
  ctx.stroke();
  ctx.restore();
  // Aim line, faint.
  if (state.screen === 'playing') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 60, p.y + Math.sin(p.angle) * 60);
    ctx.stroke();
  }
}

function drawMarkers(ctx, state) {
  const p = state.player;
  const pulse = 1 + 0.18 * Math.sin(state.time * 5);
  const marker = (x, y, color, r) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r - 8);
    ctx.lineTo(r * 0.7, -r * 0.2);
    ctx.lineTo(-r * 0.7, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  // Mission target.
  if (state.mission && !state.mission.done && state.mission.target) {
    marker(state.mission.target.x, state.mission.target.y, '#4a90e2', 14);
  }
  // Safehouse.
  ctx.fillStyle = '#57d95e';
  ctx.fillRect(SAFEHOUSE_SAFE.x - 18, SAFEHOUSE_SAFE.y - 18, 36, 36);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(SAFEHOUSE_SAFE.x - 18, SAFEHOUSE_SAFE.y - 18, 36, 36);
  ctx.fillStyle = '#0b3d12';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SAFE', SAFEHOUSE_SAFE.x, SAFEHOUSE_SAFE.y + 4);
  ctx.textAlign = 'left';
  // Race checkpoints.
  if (state.mission && state.mission.def.id === 'M4') {
    const idx = state.mission.raceCheckpoint;
    state.mission.racePoints.forEach((cp, i) => {
      if (i < idx) return;
      ctx.strokeStyle = i === idx ? '#ff8a3a' : 'rgba(255,138,58,0.4)';
      ctx.lineWidth = i === idx ? 4 : 2;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = i === idx ? '#ff8a3a' : 'rgba(255,138,58,0.6)';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), cp.x, cp.y + 8);
      ctx.textAlign = 'left';
    });
  }
  // Stash chests (gold, bobbing).
  for (let i = 0; i < STASH_SPOTS.length; i += 1) {
    if (state.save.stashes.includes(i)) continue;
    const s = STASH_SPOTS[i];
    const bob = Math.sin(state.time * 3 + i) * 2;
    ctx.fillStyle = '#8a5c17';
    ctx.fillRect(s.x - 11, s.y - 8 + bob, 22, 16);
    ctx.fillStyle = '#ffd21f';
    ctx.fillRect(s.x - 11, s.y - 8 + bob, 22, 5);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(s.x - 2, s.y - 5 + bob, 4, 6);
  }
  // Player position ring when on foot near a car (enter prompt handled in HUD text).
  void p;
}

const SAFEHOUSE_SAFE = { x: 1450, y: 2350 };

function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (state.muzzle && state.muzzle.t > 0) {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(state.muzzle.x, state.muzzle.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(state.muzzle.x, state.muzzle.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- Main entry -----------------------------------------------------------------
export function renderWorld(ctx, state) {
  const vw = state.viewW;
  const vh = state.viewH;
  const camX = Math.max(vw / 2, Math.min(WORLD - vw / 2, state.camera.x));
  const camY = Math.max(vh / 2, Math.min(WORLD - vh / 2, state.camera.y));
  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
  ctx.save();
  ctx.translate(Math.round(vw / 2 - camX + shakeX), Math.round(vh / 2 - camY + shakeY));
  drawGround(ctx, state, { x: camX, y: camY });
  drawRoads(ctx, state);
  drawCityProps(ctx, state);
  drawBuildings(ctx, state);
  drawSkids(ctx, state);
  drawMarkers(ctx, state);
  // Cars sorted by y so nearer cars overlap farther ones.
  const cars = [...state.cars].sort((a, b) => a.y - b.y);
  for (const car of cars) {
    if (car.dead) continue;
    drawCarShape(ctx, car);
    if (car.wanted && !car.roadblock) {
      // Siren light bar flash.
      const on = Math.sin(state.time * 10 + (car.sirenPhase || 0)) > 0;
      ctx.fillStyle = on ? '#ff3b2e' : '#2e6fd2';
      ctx.beginPath();
      ctx.arc(car.x - Math.sin(car.angle) * 0, car.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (car.hp < 50 && car.hp > 0) {
      // Damage smoke anchor is handled by particles in main; draw a wisp here.
      ctx.fillStyle = 'rgba(60,60,60,0.5)';
      ctx.beginPath();
      ctx.arc(car.x - Math.cos(car.angle) * car.len * 0.4, car.y - Math.sin(car.angle) * car.len * 0.4, 8 + Math.sin(state.time * 8) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const ped of state.peds) drawPed(ctx, ped);
  for (const r of state.rivals) {
    if (!r.dead) drawRival(ctx, r);
  }
  drawPlayer(ctx, state.player, state);
  drawBullets(ctx, state);
  drawParticles(ctx, state);
  ctx.restore();

  // Dusk lighting grade: warm wash + vignette.
  const grade = ctx.createLinearGradient(0, 0, 0, vh);
  grade.addColorStop(0, 'rgba(255,150,80,0.06)');
  grade.addColorStop(0.6, 'rgba(255,120,60,0.10)');
  grade.addColorStop(1, 'rgba(40,20,60,0.16)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, vw, vh);
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.45, vw / 2, vh / 2, vh * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,6,20,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
}

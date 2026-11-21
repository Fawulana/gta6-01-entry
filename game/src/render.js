// World rendering: the whole city drawn in Canvas 2D — roads with lane
// dashes and crosswalks, buildings with long dusk shadows and lit windows,
// beach and animated water, park trees, cars with headlights, pedestrians,
// skid marks, smoke, sparks, rain and the day/night grade.
import { ROADS, ROAD_W, WORLD, COLORS, VEHICLES } from './config.js';
import { dist } from './random.js';
import { skyState } from './weather.js';

export function drawWorld(G, ctx, vw, vh) {
  const cam = G.cam, sky = skyState(G.weather);
  ctx.fillStyle = sky.sky;
  ctx.fillRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(vw / 2 - cam.x, vh / 2 - cam.y);
  // Ground.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, WORLD, WORLD);
  // Park.
  ctx.fillStyle = COLORS.park;
  ctx.fillRect(1720 + 48, 1720 + 48, 360 - 96, 360 - 96);
  // Beach sand east edge, water beyond.
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(3160 + ROAD_W / 2, 200, WORLD - 3160 - ROAD_W / 2, WORLD - 400);
  const wave = Math.sin(G.time * 1.4) * 6;
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(3420 + wave, 200, WORLD - 3420 - wave, WORLD - 400);
  ctx.fillStyle = COLORS.waterDeep;
  for (let y = 260; y < WORLD - 300; y += 90) {
    ctx.fillRect(3440 + wave, y, 120, 6);
  }
  // Sun glints dancing on the water.
  ctx.fillStyle = 'rgba(255,255,220,0.5)';
  for (let i = 0; i < 12; i++) {
    const gx = 3450 + ((i * 53 + Math.floor(G.time * 2) * 7) % 130);
    const gy = 300 + ((i * 197) % 2800);
    ctx.fillRect(gx, gy, 14, 3);
  }
  // Marina south-west water.
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(200, 3300, 900, 300);
  // Roads.
  for (const r of ROADS) {
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(200, r - ROAD_W / 2, WORLD - 400, ROAD_W);
    ctx.fillRect(r - ROAD_W / 2, 200, ROAD_W, WORLD - 400);
  }
  // Sidewalks.
  ctx.fillStyle = COLORS.sidewalk;
  for (const r of ROADS) {
    ctx.fillRect(200, r - ROAD_W / 2 - 14, WORLD - 400, 10);
    ctx.fillRect(200, r + ROAD_W / 2 + 4, WORLD - 400, 10);
    ctx.fillRect(r - ROAD_W / 2 - 14, 200, 10, WORLD - 400);
    ctx.fillRect(r + ROAD_W / 2 + 4, 200, 10, WORLD - 400);
  }
  // Lane dashes + crosswalks.
  ctx.fillStyle = '#e8d24b';
  for (const r of ROADS) {
    for (let d = 240; d < WORLD - 240; d += 64) {
      ctx.fillRect(d, r - 2, 30, 4);
      ctx.fillRect(r - 2, d, 4, 30);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const a of ROADS) for (const b of ROADS) {
    for (let k = -2; k <= 2; k++) {
      ctx.fillRect(a - 34 + k * 16, b - ROAD_W / 2 - 12, 8, 10);
      ctx.fillRect(a - 34 + k * 16, b + ROAD_W / 2 + 2, 8, 10);
    }
  }
  // District labels painted on the ground.
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillText('DOWNTOWN', 1550, 1250);
  ctx.fillText('OLD PORT', 550, 550);
  ctx.fillText('THE DOCKS', 700, 2700);
  ctx.fillText('BEACHFRONT', 3300, 2200);
  ctx.fillText('CASINO STRIP', 2550, 1250);
  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.55)';
  ctx.lineWidth = 5;
  for (const s of G.skids) {
    ctx.globalAlpha = Math.min(1, s.life / 3);
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.a) * 14, s.y - Math.sin(s.a) * 14);
    ctx.lineTo(s.x + Math.cos(s.a) * 14, s.y + Math.sin(s.a) * 14);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Trees and umbrellas.
  for (const t of G.city.trees) {
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(t.x - 3, t.y - 3, 6, 8);
    ctx.fillStyle = t.palm ? '#3f8f3f' : '#2f6b2f';
    ctx.beginPath(); ctx.arc(t.x, t.y - 6, t.r, 0, Math.PI * 2); ctx.fill();
  }
  for (const u of G.city.umbrellas) {
    ctx.fillStyle = u.color;
    ctx.beginPath(); ctx.arc(u.x, u.y, 18, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.fillRect(u.x - 1, u.y, 2, 14);
  }
  // Buildings with shadows and windows.
  const sunA = sky.sun > 0 ? 0.6 : -0.6;
  for (const b of G.city.buildings) {
    const shx = b.hgt * 0.35 * sunA, shy = b.hgt * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + shx, b.y + shy, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    if (b.tall) {
      ctx.fillStyle = sky.isNight ? 'rgba(255,220,120,0.85)' : 'rgba(200,230,255,0.7)';
      for (let wy = b.y + 12; wy < b.y + b.h - 10; wy += 22) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 26) {
          if ((wx * 7 + wy * 13) % 5 < 2) ctx.fillRect(wx, wy, 10, 12);
        }
      }
      // Rooftop details: AC units and, on the tallest tower, a helipad.
      ctx.fillStyle = '#999';
      ctx.fillRect(b.x + 8, b.y + 8, 14, 10);
      ctx.fillRect(b.x + b.w - 22, b.y + b.h - 18, 14, 10);
      if (b.hgt > 140) {
        ctx.fillStyle = '#2f2f2f';
        ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd24b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd24b';
        ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('H', b.x + b.w / 2, b.y + b.h / 2 + 5);
      }
    }
  }
  // Place markers (signs on the ground).
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const key of Object.keys(G.city.places)) {
    const pl = G.city.places[key];
    ctx.fillStyle = 'rgba(20,20,40,0.75)';
    ctx.fillRect(pl.x - 62, pl.y - 12, 124, 22);
    ctx.fillStyle = '#ffd24b';
    ctx.fillText(pl.label, pl.x, pl.y + 4);
  }
  drawProps(G, ctx);
  drawChests(G, ctx);
  drawPickups(G, ctx);
  drawSpikes(G, ctx);
  for (const c of G.cars) drawCar(G, ctx, c);
  for (const ped of G.peds) drawPed(ctx, ped);
  for (const r of G.rivals) drawRival(G, ctx, r);
  for (const fc of (G.footCops || [])) drawFootCop(ctx, fc);
  drawPlayer(G, ctx);
  drawBullets(G, ctx);
  drawParticles(G, ctx);
  drawMissionMarker(G, ctx);
  drawHeli(G, ctx);
  // Night headlights.
  if (sky.isNight) {
    for (const c of G.cars) {
      if (c.dead) continue;
      const fx = c.x + Math.cos(c.angle) * 40, fy = c.y + Math.sin(c.angle) * 40;
      const grad = ctx.createRadialGradient(fx, fy, 10, fx, fy, 190);
      grad.addColorStop(0, 'rgba(255,240,180,0.20)');
      grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(fx + Math.cos(c.angle) * 80, fy + Math.sin(c.angle) * 80, 190, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Rain streaks.
  if (G.weather.rain > 0.05) {
    ctx.strokeStyle = 'rgba(180,200,230,' + (0.35 * G.weather.rain) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const d of G.weather.drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + 8, d.y + 26);
    }
    ctx.stroke();
    // Wet sheen on roads.
    ctx.fillStyle = 'rgba(150,180,220,0.06)';
    for (const r of ROADS) {
      ctx.fillRect(200, r - ROAD_W / 2, WORLD - 400, ROAD_W);
      ctx.fillRect(r - ROAD_W / 2, 200, ROAD_W, WORLD - 400);
    }
  }
  // Day/night grade over everything.
  ctx.fillStyle = sky.tint;
  ctx.fillRect(cam.x - 700, cam.y - 500, 1400 + 1400, 1000 + 1000);
  // Drifting cloud shadows — big soft dark patches sliding over the city.
  ctx.fillStyle = 'rgba(20,30,60,0.08)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 900 + G.time * 22) % (WORLD + 800)) - 400;
    const cy = 500 + i * 620;
    ctx.beginPath(); ctx.ellipse(cx, cy, 340, 180, 0.2, 0, Math.PI * 2); ctx.fill();
  }
  // Birds over the beach at day.
  if (!sky.isNight) {
    ctx.strokeStyle = 'rgba(30,30,30,0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const bx = 3300 + ((G.time * 30 + i * 130) % 300);
      const by = 500 + i * 90 + Math.sin(G.time * 2 + i) * 12;
      const flap = Math.sin(G.time * 9 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + flap); ctx.quadraticCurveTo(bx - 2, by - 4, bx, by);
      ctx.quadraticCurveTo(bx + 2, by - 4, bx + 10, by + flap);
      ctx.stroke();
    }
  }
  // Lightning flash.
  if (G.weather.flash > 0) {
    ctx.fillStyle = 'rgba(220,230,255,' + (G.weather.flash * 0.35) + ')';
    ctx.fillRect(cam.x - 700, cam.y - 500, 2800, 2000);
  }
  ctx.restore();
}
function drawCar(G, ctx, c) {
  if (c.dead) {
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(c.angle);
    ctx.fillStyle = '#222';
    ctx.fillRect(-26, -22, 52, 44);
    ctx.fillStyle = '#555';
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('WRECK', 0, 4);
    ctx.restore();
    return;
  }
  const spec = VEHICLES[c.kind];
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-spec.l / 2 + 4, -spec.w / 2 + 5, spec.l, spec.w);
  // Body.
  ctx.fillStyle = c.color;
  roundRect(ctx, -spec.l / 2, -spec.w / 2, spec.l, spec.w, c.kind === 'bike' ? 12 : 10);
  ctx.fill();
  // Cabin / windshield.
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  if (c.kind === 'bike') {
    ctx.fillRect(-6, -8, 22, 16);
  } else {
    roundRect(ctx, -spec.l / 2 + 14, -spec.w / 2 + 7, spec.l - 34, spec.w - 14, 6);
    ctx.fill();
  }
  // Taxi checker + roof sign.
  if (c.kind === 'taxi') {
    ctx.fillStyle = '#111';
    for (let i = 0; i < 6; i++) ctx.fillRect(-spec.l / 2 + 6 + i * 12, -spec.w / 2 + 2, 6, 6);
    ctx.fillStyle = '#ffd24b';
    ctx.fillRect(-8, -spec.w / 2 - 6, 16, 8);
  }
  // Police livery.
  if (c.kind === 'police') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-spec.l / 2 + 8, -spec.w / 2 + 4, spec.l - 16, 8);
    ctx.fillStyle = '#e33';
    ctx.fillRect(-10, -spec.w / 2 - 5, 8, 6);
    ctx.fillStyle = '#36c';
    ctx.fillRect(2, -spec.w / 2 - 5, 8, 6);
    if (Math.floor(G.time * 3) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,60,60,0.28)';
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(60,120,255,0.28)';
      ctx.beginPath(); ctx.arc(0, 0, 42, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (c.kind === 'aurora') {
    ctx.fillStyle = '#fff8d0';
    ctx.fillRect(-spec.l / 2 + 4, -4, spec.l - 8, 8);
  }
  if (c.kind === 'bus') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-spec.l / 2 + 6, -spec.w / 2 + 3, spec.l - 12, 6);
    ctx.fillStyle = '#ffd24b';
    ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('AZURA BUS', 0, 4);
  }
  // Brake lights.
  if (c.brakeLight) {
    ctx.fillStyle = '#ff2a2a';
    ctx.fillRect(-spec.l / 2 - 2, -spec.w / 2 + 4, 4, 8);
    ctx.fillRect(-spec.l / 2 - 2, spec.w / 2 - 12, 4, 8);
  }
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(spec.l / 2 - 2, -spec.w / 2 + 5, 4, 7);
  ctx.fillRect(spec.l / 2 - 2, spec.w / 2 - 12, 4, 7);
  // Damage smoke handled by particles; cracked look when hurt.
  if (c.hp < c.maxHp * 0.5) {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(4, 2); ctx.lineTo(-4, 12); ctx.stroke();
  }
  ctx.restore();
}
function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(ped.angle);
  ctx.fillStyle = ped.shirt;
  ctx.fillRect(-7, -6, 14, 12);
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (ped.kind === 'dog') {
    // A small dog trotting a few steps behind its walker.
    const dx = ped.x - Math.cos(ped.angle) * 22, dy = ped.y - Math.sin(ped.angle) * 22;
    ctx.fillStyle = '#8a5a2a';
    ctx.beginPath(); ctx.ellipse(dx, dy, 7, 4, ped.angle, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(dx + Math.cos(ped.angle) * 7, dy + Math.sin(ped.angle) * 7, 3, 0, Math.PI * 2); ctx.fill();
  }
  if (ped.kind === 'beach') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ped.x, ped.y - 4, 7, 0, Math.PI * 2); ctx.fill(); // sun hat
  }
}
function drawFootCop(ctx, fc) {
  ctx.save();
  ctx.translate(fc.x, fc.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(fc.angle);
  ctx.fillStyle = '#1c2f55'; // APD navy
  ctx.fillRect(-8, -7, 16, 14);
  ctx.fillStyle = '#f2d8b0';
  ctx.beginPath(); ctx.arc(9, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1c2f55';
  ctx.beginPath(); ctx.arc(9, -2, 6, Math.PI, 0); ctx.fill(); // cap
  ctx.fillStyle = '#888';
  ctx.fillRect(12, -2, 12, 3); // baton
  ctx.restore();
  ctx.fillStyle = '#9db8ff';
  ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('APD', fc.x, fc.y - 18);
}
function drawRival(G, ctx, r) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(r.angle);
  ctx.fillStyle = r.boss ? '#e8c33a' : '#7a2a8a';
  ctx.fillRect(-9, -8, 18, 16);
  ctx.fillStyle = '#f2d8b0';
  ctx.beginPath(); ctx.arc(10, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(12, -2, 12, 4); // gun
  ctx.restore();
  if (r.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(r.x, r.y, 16, 0, Math.PI * 2); ctx.fill();
  }
  // HP bar.
  const w = r.boss ? 44 : 30;
  ctx.fillStyle = '#111';
  ctx.fillRect(r.x - w / 2, r.y - 26, w, 5);
  ctx.fillStyle = r.boss ? '#ffd24b' : '#e33';
  ctx.fillRect(r.x - w / 2, r.y - 26, w * (r.hp / r.maxHp), 5);
  if (r.boss) {
    ctx.fillStyle = '#ffd24b';
    ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BOSS — RICO "TIDE" MARSH', r.x, r.y - 32);
  }
}
function drawPlayer(G, ctx) {
  const p = G.player;
  if (p.car) return; // drawn as the car
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(p.angle);
  const bob = Math.abs(Math.sin(G.time * 10)) * (p.moving ? 2 : 0);
  ctx.translate(0, -bob);
  ctx.fillStyle = '#e33'; // Dana's red jacket
  ctx.fillRect(-9, -8, 18, 16);
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(10, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(8, -7, 4, 14);
  if (p.weapon !== 'fists') {
    ctx.fillStyle = '#333';
    ctx.fillRect(12, -2, p.weapon === 'shotgun' ? 20 : 14, 4);
  }
  if (p.punchAnim > 0) {
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(22, 0, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (p.muzzle > 0) {
    ctx.fillStyle = '#ffdf4d';
    ctx.beginPath(); ctx.arc(26, 0, 9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (p.hurtFlash > 0) {
    ctx.fillStyle = 'rgba(255,0,0,' + p.hurtFlash * 0.8 + ')';
    ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, Math.PI * 2); ctx.fill();
  }
}
function drawBullets(G, ctx) {
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}
function drawParticles(G, ctx) {
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.max + 0.3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawProps(G, ctx) {
  // Marina boats, bobbing gently.
  for (const b of G.city.boats) {
    const bob = Math.sin(G.time * 1.2 + b.x) * 3;
    ctx.save();
    ctx.translate(b.x, b.y + bob);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(-b.len / 2, -12); ctx.lineTo(b.len / 2, -12);
    ctx.lineTo(b.len / 2 - 14, 12); ctx.lineTo(-b.len / 2 + 14, 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -26, 20, 14);
    ctx.restore();
  }
  // Park benches.
  ctx.fillStyle = '#7a5a3a';
  for (const bn of G.city.benches) ctx.fillRect(bn.x - 14, bn.y - 5, 28, 10);
  // Neon signs on the Strip — they glow at night.
  const sky = skyState(G.weather);
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui, sans-serif';
  for (const n of G.city.neons) {
    const glow = sky.isNight ? 0.9 : 0.45;
    ctx.globalAlpha = glow;
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, n.x, n.y);
    ctx.globalAlpha = glow * 0.4;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(n.text, n.x, n.y);
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.globalAlpha = 1;
  }
  // Dock crates.
  for (const c of G.city.crates) {
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(c.x, c.y, c.s, c.s);
    ctx.strokeStyle = '#5a4222';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.s, c.s);
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.s, c.y + c.s); ctx.stroke();
  }
  // Fuel pumps.
  for (const pm of G.city.pumps) {
    ctx.fillStyle = '#c22e2e';
    ctx.fillRect(pm.x - 8, pm.y - 14, 16, 28);
    ctx.fillStyle = '#fff';
    ctx.fillRect(pm.x - 5, pm.y - 8, 10, 8);
  }
  // Bus stops: sign post, shelter roof and a bench.
  for (const bs of G.city.busStops) {
    ctx.fillStyle = '#1c2f55';
    ctx.fillRect(bs.x - 3, bs.y - 26, 6, 26);
    ctx.fillStyle = '#2e8a5a';
    ctx.beginPath(); ctx.arc(bs.x, bs.y - 30, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BUS', bs.x, bs.y - 27);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(bs.x + 8, bs.y - 4, 22, 6);
  }
  // Pier planks jutting into the water.
  ctx.fillStyle = '#8a6a4a';
  for (let i = 0; i < 10; i++) ctx.fillRect(3400 + i * 8, 1440, 5, 120);
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(3400, 1440, 90, 10);
}
function drawChests(G, ctx) {
  for (const c of G.chests) {
    if (c.found) continue;
    const bob = Math.sin(G.time * 3 + c.x) * 3;
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(c.x - 12, c.y - 8 + bob, 24, 16);
    ctx.fillStyle = '#ffd24b';
    ctx.fillRect(c.x - 12, c.y - 8 + bob, 24, 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('$', c.x, c.y + 4 + bob);
  }
}
function drawPickups(G, ctx) {
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    const bob = Math.sin(G.time * 3 + pk.bob) * 3;
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    if (pk.kind === 'health') { ctx.fillStyle = '#fff'; ctx.fillRect(-11, -11, 22, 22); ctx.fillStyle = '#e33'; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6); }
    if (pk.kind === 'armor') { ctx.fillStyle = '#36c'; ctx.fillRect(-11, -9, 22, 18); ctx.fillStyle = '#fff'; ctx.fillText('A', 0, 5); }
    if (pk.kind === 'ammo') { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-10, -7, 20, 14); ctx.fillStyle = '#ffd24b'; ctx.fillRect(-6, -3, 12, 6); }
    ctx.restore();
  }
}
function drawSpikes(G, ctx) {
  for (const s of G.spikes) {
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.a);
    ctx.fillStyle = '#888';
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 12, -8); ctx.lineTo(i * 12 + 5, 0); ctx.lineTo(i * 12, 8); ctx.fill();
    }
    ctx.restore();
  }
}
function drawMissionMarker(G, ctx) {
  const t = G.mission.target || (G.race.active ? G.race.target : null) || (G.fare.active ? G.fare.active : null) || (G.fare.offer ? G.fare.offer : null) || (G.takedown.active ? { x: G.takedown.x, y: G.takedown.y } : null);
  if (!t || G.screen !== 'play') return;
  const pulse = 1 + Math.sin(G.time * 5) * 0.15;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.strokeStyle = G.race.active ? '#ff8c00' : '#ffd24b';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,75,0.15)';
  ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2); ctx.fill();
  // Beacon beam.
  ctx.fillStyle = 'rgba(255,210,75,0.10)';
  ctx.fillRect(-4, -300, 8, 300);
  ctx.fillStyle = G.race.active ? '#ff8c00' : '#ffd24b';
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, -34); ctx.lineTo(-10, -34); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawHeli(G, ctx) {
  const h = G.heli;
  if (!h) return;
  ctx.save();
  ctx.translate(h.x, h.y);
  // Searchlight cone on the ground.
  const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 150);
  grad.addColorStop(0, 'rgba(255,250,200,0.30)');
  grad.addColorStop(1, 'rgba(255,250,200,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(h.angle);
  ctx.fillStyle = '#1c2f55';
  ctx.fillRect(-26, -10, 52, 20);
  ctx.fillStyle = '#888';
  ctx.fillRect(-34, -2, 68, 4);
  ctx.restore();
  ctx.fillStyle = '#ffd24b';
  ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('APD HELICOPTER', h.x, h.y - 40);
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

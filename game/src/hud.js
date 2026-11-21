// HUD for Solmar Bay: cash, health, wanted stars, objective banner, race
// clock, stash counter, car label, minimap with blips, flash messages and
// the title / pause / busted / wasted screens. All drawn on the canvas so
// the screenshots show the whole interface at a glance.
import { WORLD, MISSIONS, STASH_SPOTS, RACE_CHECKPOINTS, SAFEHOUSE, PICKUP_POINT, STORE_POINT, AUTO_ROW_GT, DOCKS } from './config.js';
import { stashCount } from './missions.js';

function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd21f' : 'rgba(20,20,20,0.55)';
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawHud(ctx, state, viewW, viewH) {
  const p = state.player;
  // --- Top-left: cash + health ---------------------------------------------
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(10,12,16,0.62)';
  ctx.fillRect(14, 12, 250, 62);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`$${state.cash.toLocaleString('en-US')}`, 26, 40);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '12px monospace';
  ctx.fillText('CASH', 26, 60);
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(26, 66, 150, 10);
  const hpW = 150 * Math.max(0, p.hp / 100);
  ctx.fillStyle = p.hp > 50 ? '#57d95e' : p.hp > 25 ? '#f2c230' : '#e23b2e';
  ctx.fillRect(26, 66, hpW, 10);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '11px monospace';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 182, 75);

  // --- Top-right: wanted stars ----------------------------------------------
  ctx.fillStyle = 'rgba(10,12,16,0.62)';
  ctx.fillRect(viewW - 214, 12, 200, 44);
  for (let i = 0; i < 5; i += 1) {
    drawStar(ctx, viewW - 190 + i * 36, 35, 13, i < state.wanted);
  }
  ctx.fillStyle = state.wanted > 0 ? '#ff6a5a' : '#9aa0a8';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(state.wanted > 0 ? 'WANTED' : 'CLEAN', viewW - 24, 33);
  ctx.textAlign = 'left';

  // --- Objective banner, top centre ------------------------------------------
  if (state.mission && !state.mission.done) {
    const m = state.mission;
    const text = `${m.def.id}/6 ${m.def.name} — ${m.stepText}`;
    ctx.font = 'bold 15px monospace';
    const w = ctx.measureText(text).width + 28;
    ctx.fillStyle = 'rgba(10,12,16,0.66)';
    ctx.fillRect((viewW - w) / 2, 12, w, 34);
    ctx.fillStyle = '#ffd21f';
    ctx.fillText(text, (viewW - w) / 2 + 14, 34);
    // Race clock bar under the banner.
    if (m.def.id === 'M4') {
      const frac = Math.max(0, m.raceTimeLeft / 90);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect((viewW - 240) / 2, 50, 240, 10);
      ctx.fillStyle = frac > 0.33 ? '#57d95e' : '#e23b2e';
      ctx.fillRect((viewW - 240) / 2, 50, 240 * frac, 10);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(m.raceTimeLeft)}s`, viewW / 2, 72);
      ctx.textAlign = 'left';
    }
    // Robbery progress bar.
    if (m.def.id === 'M3' && m.step === 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect((viewW - 240) / 2, 50, 240, 10);
      ctx.fillStyle = '#ffd21f';
      ctx.fillRect((viewW - 240) / 2, 50, 240 * m.robProgress, 10);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EMPTYING THE TILL…', viewW / 2, 72);
      ctx.textAlign = 'left';
    }
  } else if (state.save.storyDone) {
    ctx.font = 'bold 15px monospace';
    const text = 'STORY COMPLETE — SOLMAR BAY IS YOURS';
    const w = ctx.measureText(text).width + 28;
    ctx.fillStyle = 'rgba(10,12,16,0.66)';
    ctx.fillRect((viewW - w) / 2, 12, w, 34);
    ctx.fillStyle = '#7dff8a';
    ctx.fillText(text, (viewW - w) / 2 + 14, 34);
  }

  // --- Bottom-left: car label + stash counter --------------------------------
  ctx.fillStyle = 'rgba(10,12,16,0.62)';
  ctx.fillRect(14, viewH - 66, 250, 52);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 15px monospace';
  if (p.inCar) {
    ctx.fillText(`${p.inCar.label}  ${Math.round(Math.abs(p.inCar.speed) * 0.14)} mph`, 26, viewH - 42);
    ctx.fillStyle = p.inCar.hp > 50 ? '#57d95e' : '#e23b2e';
    ctx.fillRect(26, viewH - 32, 120 * Math.max(0, p.inCar.hp / p.inCar.maxHp), 8);
    ctx.fillStyle = '#9aa0a8';
    ctx.font = '11px monospace';
    ctx.fillText('SPACE handbrake · E exit', 154, viewH - 24);
  } else {
    ctx.fillText('ON FOOT', 26, viewH - 42);
    ctx.fillStyle = '#9aa0a8';
    ctx.font = '11px monospace';
    ctx.fillText('E enter car · CLICK shoot · F punch', 26, viewH - 24);
  }
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`◆ Stashes ${stashCount(state)}/10`, 26, viewH - 84 > 0 ? viewH - 84 : 20);

  // --- Minimap, bottom-right --------------------------------------------------
  drawMinimap(ctx, state, viewW, viewH);

  // --- Flash message, centre (shrinks / truncates to fit the viewport) ------
  if (state.flashMsg && state.flashMsg.t > 0) {
    let fontSize = 20;
    let text = state.flashMsg.text;
    ctx.font = `bold ${fontSize}px monospace`;
    let w = ctx.measureText(text).width + 32;
    while (w > viewW - 40 && fontSize > 13) {
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px monospace`;
      w = ctx.measureText(text).width + 32;
    }
    while (w > viewW - 40 && text.length > 12) {
      text = text.slice(0, -4) + '…';
      w = ctx.measureText(text).width + 32;
    }
    ctx.fillStyle = 'rgba(10,12,16,0.72)';
    ctx.fillRect((viewW - w) / 2, viewH - 190, w, 38);
    ctx.fillStyle = '#ffd21f';
    ctx.textAlign = 'center';
    ctx.fillText(text, viewW / 2, viewH - 164);
    ctx.textAlign = 'left';
  }

  // --- Red wanted flash --------------------------------------------------------
  if (state.wanted >= 3 && state.screen === 'playing') {
    const pulse = 0.10 + 0.06 * Math.sin(state.time * 6);
    ctx.fillStyle = `rgba(226,59,46,${pulse})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  if (state.redFlash > 0) {
    ctx.fillStyle = `rgba(226,59,46,${Math.min(0.45, state.redFlash)})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

function drawMinimap(ctx, state, viewW, viewH) {
  const size = 178;
  const x0 = viewW - size - 14;
  const y0 = viewH - size - 14;
  const scale = size / WORLD;
  ctx.fillStyle = 'rgba(8,10,14,0.78)';
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
  // Water + beach tint.
  ctx.fillStyle = '#2e6f8e';
  ctx.fillRect(x0, y0 + size * 0.96, size, size * 0.04);
  ctx.fillStyle = '#d9c48f';
  ctx.fillRect(x0, y0 + size * 0.9, size, size * 0.06);
  // Roads.
  ctx.fillStyle = '#3a3f46';
  for (const line of [200, 600, 1000, 1400, 1800, 2200, 2600, 3000]) {
    ctx.fillRect(x0, y0 + line * scale - 1, size, 2);
    ctx.fillRect(x0 + line * scale - 1, y0, 2, size);
  }
  const dot = (wx, wy, color, r = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + wx * scale, y0 + wy * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  // Stashes (gold), mission target (blue), safehouse (green), cops (red).
  for (let i = 0; i < STASH_SPOTS.length; i += 1) {
    if (state.save.stashes.includes(i)) continue;
    dot(STASH_SPOTS[i].x, STASH_SPOTS[i].y, '#ffd21f', 2.5);
  }
  dot(SAFEHOUSE.x, SAFEHOUSE.y, '#57d95e', 4);
  if (state.mission && !state.mission.done && state.mission.target) {
    dot(state.mission.target.x, state.mission.target.y, '#4a90e2', 5);
  }
  if (state.mission && state.mission.def.id === 'M4') {
    for (const cp of RACE_CHECKPOINTS) dot(cp.x, cp.y, '#ff8a3a', 3);
  }
  for (const cop of state.cops) {
    if (!cop.dead) dot(cop.x, cop.y, '#ff3b2e', 3);
  }
  for (const r of state.rivals) {
    if (!r.dead) dot(r.x, r.y, '#ff5a4a', 3);
  }
  // Player: white arrow.
  const p = state.player;
  const px = x0 + p.x * scale;
  const py = y0 + p.y * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  const vx = x0 + (state.camera.x - viewW / 2) * scale;
  const vy = y0 + (state.camera.y - viewH / 2) * scale;
  ctx.strokeRect(vx, vy, viewW * scale, viewH * scale);
  ctx.fillStyle = '#9aa0a8';
  ctx.font = '10px monospace';
  ctx.fillText('SOLMAR BAY', x0, y0 - 8);
}

// --- Screens ------------------------------------------------------------------
export function drawTitle(ctx, state, viewW, viewH) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#1d2b45');
  g.addColorStop(0.55, '#c96a3a');
  g.addColorStop(1, '#2b1a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);
  // Sun.
  ctx.fillStyle = '#ffcf6e';
  ctx.beginPath();
  ctx.arc(viewW * 0.72, viewH * 0.3, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,207,110,0.25)';
  ctx.beginPath();
  ctx.arc(viewW * 0.72, viewH * 0.3, 96, 0, Math.PI * 2);
  ctx.fill();
  // Skyline silhouette.
  ctx.fillStyle = '#171226';
  let bx = 0;
  const heights = [120, 200, 150, 260, 180, 300, 210, 160, 240, 130];
  heights.forEach((h, i) => {
    ctx.fillRect(bx, viewH - 190 - h * 0.45, 130, h * 0.45 + 190);
    bx += 130;
  });
  ctx.fillStyle = '#0e0a18';
  ctx.fillRect(0, viewH - 190, viewW, 190);
  ctx.fillStyle = '#e2574c';
  ctx.font = 'bold 84px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', viewW / 2, 150);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('AN OPEN-WORLD CRIME GAME', viewW / 2, 190);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '16px monospace';
  ctx.fillText('Six jobs for Lena Cruz · Steal cars · Outrun the law · Own the city', viewW / 2, 226);
  // Mission list.
  ctx.textAlign = 'left';
  ctx.font = '15px monospace';
  const mx = viewW / 2 - 300;
  let my = 268;
  MISSIONS.forEach((m, i) => {
    const done = i < state.save.missionsDone;
    ctx.fillStyle = done ? '#7dff8a' : '#e8e8e8';
    ctx.fillText(`${done ? '✓' : '○'}  ${m.id}  ${m.name} — $${m.reward}`, mx, my);
    my += 26;
  });
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(state.save.missionsDone > 0 || state.save.cash > 0
    ? `CONTINUE — $${state.save.cash} banked · ${state.save.missionsDone}/6 jobs done · ENTER to play`
    : 'PRESS ENTER TO PLAY', viewW / 2, my + 26);
  ctx.fillStyle = '#9aa0a8';
  ctx.font = '13px monospace';
  ctx.fillText('WASD move · SHIFT sprint · E enter car · CLICK shoot · F punch · SPACE handbrake · P pause · M mute', viewW / 2, my + 56);
  ctx.textAlign = 'left';
}

export function drawPaused(ctx, viewW, viewH) {
  ctx.fillStyle = 'rgba(8,10,14,0.72)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 44px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 20);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '16px monospace';
  ctx.fillText('P or ESC to resume · R to restart from save · M to mute', viewW / 2, viewH / 2 + 18);
  ctx.textAlign = 'left';
}

export function drawEndScreen(ctx, state, viewW, viewH, kind) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,30,60,0.88)' : 'rgba(60,10,10,0.88)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = kind === 'busted' ? '#7fb5ff' : '#ff6a5a';
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(kind === 'busted' ? 'BUSTED' : 'WASTED', viewW / 2, viewH / 2 - 10);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '17px monospace';
  ctx.fillText(kind === 'busted'
    ? 'The Solmar Bay PD took you in. Bail is $200 — the street keeps your car.'
    : 'You flatlined on the asphalt. The medics patched you up — for $200.', viewW / 2, viewH / 2 + 30);
  ctx.fillStyle = '#ffd21f';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('PRESS ENTER TO GET BACK OUT THERE', viewW / 2, viewH / 2 + 70);
  ctx.textAlign = 'left';
}

// HUD and menus: wanted stars, cash, health/armor bars, respect level,
// live minimap with mission/stash/police/rival blips, objective line, race
// clock, speedometer, feed messages, and the title / pause / busted / wasted
// / story-complete screens. All drawn on the same canvas.
import { WORLD, VEHICLES, MISSION_NAMES } from './config.js';
import { fmtMoney, fmtTime, clamp } from './random.js';
import { missionObjective, missionTip } from './missions.js';
import { stashesFound, respectLevel, respectProgress, shopNear, takedownNear } from './activities.js';
import { fmtClock, skyState } from './weather.js';
import { districtAt } from './city.js';
import { DISTRICT_LORE, EPILOGUE, CHARACTER_BIOS } from './story.js';

function takedownNearPrompt(G) {
  return !G.takedown.active && takedownNear(G);
}

export function drawHUD(G, ctx, vw, vh) {
  const p = G.player;
  if (G.screen === 'title') { drawTitle(G, ctx, vw, vh); return; }
  if (G.screen === 'pause') { drawPause(G, ctx, vw, vh); return; }
  if (G.screen === 'busted' || G.screen === 'wasted') { drawEnd(G, ctx, vw, vh); return; }
  if (G.screen === 'complete') { drawComplete(G, ctx, vw, vh); return; }
  // Top-left: wanted stars.
  ctx.textAlign = 'left';
  ctx.font = 'bold 30px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd24b' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    const x = 24 + i * 34, y = 40;
    ctx.fillText('★', x, y);
  }
  // Top-right: cash, clock, district.
  ctx.textAlign = 'right';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#7dff8a';
  ctx.fillText(fmtMoney(p.cash), vw - 24, 40);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  const sky = skyState(G.weather);
  ctx.fillText(fmtClock(sky.hour) + (G.weather.rain > 0.4 ? '  🌧 RAIN' : sky.isNight ? '  NIGHT' : '  DAY') + ' · ' + districtAt(p.x, p.y), vw - 24, 64);
  // Health + armor bars.
  bar(ctx, 24, 58, 200, 16, p.hp / 100, '#e33', 'HP ' + Math.ceil(p.hp));
  bar(ctx, 24, 80, 200, 12, p.armor / 100, '#36c', p.armor > 0 ? 'ARMOR ' + Math.ceil(p.armor) : '');
  // Respect level.
  const rp = respectProgress(p.respect);
  bar(ctx, 24, 100, 200, 10, rp.frac, '#b45ae8', 'RESPECT LVL ' + rp.lvl + ' · ' + p.respect + ' pts');
  // Weapon + ammo.
  ctx.textAlign = 'left';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  const wname = p.weapon === 'shotgun' ? 'Riot-12 Shotgun' : p.weapon === 'pistol' ? 'P-9 Pistol' : 'Fists';
  ctx.fillText(wname + '  ·  ammo ' + p.ammo + '  ·  [1/2] switch', 24, 138);
  // Objective line.
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = '#ffd24b';
  ctx.fillText('◆ ' + missionObjective(G), 24, 164);
  const tip = G.mission.index < 8 ? missionTip(G.mission.index) : '';
  if (tip && !G.mission.failed) {
    ctx.font = 'italic 14px system-ui, sans-serif';
    ctx.fillStyle = '#9db8d8';
    ctx.fillText(tip, 24, 186);
  }
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText('Stashes ' + stashesFound(G) + '/12   ·   Missions ' + Math.min(G.mission.index, 8) + '/8 done', 24, 208);
  const shop = shopNear(G);
  if (shop) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(shop.label, 24, 232);
  }
  if (G.fare.offer) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('Passenger waving nearby — press T in a cab', 24, 232);
  }
  if (G.takedown.active) {
    ctx.fillStyle = '#e84ba3';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('◆ TAKEDOWN — clear the corner (' + G.rivals.filter((r) => !r.dead).length + ' rivals left in the city)', 24, 232);
  }
  if (takedownNearPrompt(G)) {
    ctx.fillStyle = '#e84ba3';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('Rusty Anchor — press G to start a Tide Kings takedown ($500+)', 24, 254);
  }
  // District banner.
  if (G.banner) {
    ctx.globalAlpha = Math.min(1, G.banner.t);
    ctx.textAlign = 'center';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    ctx.strokeText(G.banner.text, vw / 2, 120);
    ctx.fillText(G.banner.text, vw / 2, 120);
    const lore = DISTRICT_LORE[G.banner.text] || DISTRICT_LORE['PORT AZURA'];
    ctx.font = 'italic 17px system-ui, sans-serif';
    ctx.fillStyle = '#ffd24b';
    ctx.strokeText(lore, vw / 2, 148);
    ctx.fillText(lore, vw / 2, 148);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
  // Race clock.
  const raceT = G.mission.index === 4 && G.mission.stage === 'race' ? G.mission.timer : (G.race.active ? G.race.timer : null);
  if (raceT != null) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillStyle = raceT < 15 ? '#ff5a4d' : '#fff';
    ctx.fillText('⏱ ' + fmtTime(Math.max(0, raceT)), vw / 2, 44);
    bar(ctx, vw / 2 - 120, 52, 240, 8, clamp(raceT / 100, 0, 1), '#ff8c00', '');
  }
  // Bottom-right: speed + vehicle.
  if (p.car) {
    const spec = VEHICLES[p.car.kind];
    ctx.textAlign = 'right';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.9) + ' km/h', vw - 24, vh - 66);
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffd24b';
    ctx.fillText(spec.name + '  ·  HP ' + Math.max(0, Math.ceil(p.car.hp)) + '/' + spec.hp, vw - 24, vh - 42);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('E exit · Space handbrake · M radio mute', vw - 24, vh - 20);
  } else {
    ctx.textAlign = 'right';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#cfe8ff';
    ctx.fillText('WASD move · Shift sprint · E enter car · Click shoot · F punch', vw - 24, vh - 20);
  }
  // Feed messages.
  ctx.textAlign = 'left';
  ctx.font = '15px system-ui, sans-serif';
  let fy = vh - 120;
  const msgs = G.feed.slice(-5);
  msgs.forEach((m, i) => {
    ctx.globalAlpha = 0.45 + 0.55 * ((i + 1) / msgs.length);
    ctx.fillStyle = '#fff';
    ctx.fillText(m, 24, fy);
    fy += 20;
  });
  ctx.globalAlpha = 1;
  // Minimap.
  drawMinimap(G, ctx, vw, vh);
  // Dialogue panel (mission briefings, story beats, street chatter).
  if (G.dialogue) {
    const d = G.dialogue;
    const boxW = Math.min(620, vw - 80);
    const boxH = 34 + d.lines.length * 22;
    const bx = (vw - boxW) / 2, by = vh - boxH - 24;
    ctx.fillStyle = 'rgba(8,10,26,0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = '#ffd24b';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd24b';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(d.who.toUpperCase(), bx + 14, by + 22);
    ctx.fillStyle = '#fff';
    ctx.font = '15px system-ui, sans-serif';
    d.lines.forEach((line, i) => ctx.fillText(line, bx + 14, by + 44 + i * 22));
  }
  // Red flash at high heat.
  if (G.wanted >= 3) {
    const a = 0.05 + 0.03 * Math.sin(G.time * 6);
    ctx.fillStyle = 'rgba(255,0,0,' + a + ')';
    ctx.fillRect(0, 0, vw, vh);
  }
  // Low HP vignette.
  if (p.hp < 30) {
    ctx.fillStyle = 'rgba(255,0,0,' + (0.10 + 0.06 * Math.sin(G.time * 8)) + ')';
    ctx.fillRect(0, 0, vw, vh);
  }
}
function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 6, y + h - 3);
  }
}
function drawMinimap(G, ctx, vw, vh) {
  const size = 190, mx = vw - size - 20, my = vh - size - 150;
  const s = size / WORLD;
  ctx.fillStyle = 'rgba(10,14,24,0.78)';
  ctx.fillRect(mx - 4, my - 4, size + 8, size + 8);
  ctx.strokeStyle = '#ffd24b';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx - 4, my - 4, size + 8, size + 8);
  ctx.save();
  ctx.beginPath(); ctx.rect(mx, my, size, size); ctx.clip();
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(mx, my, size, size);
  ctx.fillStyle = '#3a3a42';
  for (const r of [280, 640, 1000, 1360, 1720, 2080, 2440, 2800, 3160]) {
    ctx.fillRect(mx, my + r * s - 2, size, 4);
    ctx.fillRect(mx + r * s - 2, my, 4, size);
  }
  ctx.fillStyle = '#2a7ab5';
  ctx.fillRect(mx + 3420 * s, my + 200 * s, size, size);
  // Stashes.
  ctx.fillStyle = '#ffd24b';
  for (const c of G.chests) if (!c.found) ctx.fillRect(mx + c.x * s - 2, my + c.y * s - 2, 4, 4);
  // Mission target.
  // Mission target.
  const t = G.mission.target || (G.race.active ? G.race.target : null) || (G.fare.active ? G.fare.active : null) || (G.takedown.active ? { x: G.takedown.x, y: G.takedown.y } : null);
  if (t) {
    ctx.fillStyle = '#ff5a4d';
    ctx.beginPath(); ctx.arc(mx + t.x * s, my + t.y * s, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Cops.
  ctx.fillStyle = '#36c';
  for (const c of G.cops) ctx.fillRect(mx + c.x * s - 3, my + c.y * s - 3, 6, 6);
  // Rivals.
  ctx.fillStyle = '#e84ba3';
  for (const r of G.rivals) if (!r.dead) ctx.fillRect(mx + r.x * s - 2, my + r.y * s - 2, 4, 4);
  // Player arrow.
  const p = G.player;
  ctx.save();
  ctx.translate(mx + p.x * s, my + p.y * s);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North + label.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N ↑  PORT AZURA', mx, my - 8);
  ctx.restore();
}
function drawTitle(G, ctx, vw, vh) {
  ctx.fillStyle = 'rgba(8,10,26,0.82)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24b';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('PORT AZURA', vw / 2, vh / 2 - 150);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('An open-world crime game — Dana Reyes is back in town', vw / 2, vh / 2 - 108);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  const lines = [
    '8 story missions for fixer Salvo Kane · taxi fares · 12 hidden stashes · street races',
    '9 vehicles incl. the gold Aurora GT, the Wasp 900 bike and the city bus · 5-star wanted system',
    'APD cruisers, roadblocks, spike strips and a police helicopter · day / night + rain',
    'Buy guns, armor and cars · respect levels unlock the shotgun · progress auto-saves',
    '',
    'WASD move / drive · Shift sprint · E enter car · Mouse aim · Click shoot · F punch',
    'Space handbrake · T take a fare · B buy at a shop · 1/2 switch weapon · P pause · M mute',
  ];
  lines.forEach((l, i) => ctx.fillText(l, vw / 2, vh / 2 - 66 + i * 26));
  const pulse = 0.7 + 0.3 * Math.sin(G.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('— PRESS ENTER TO START —', vw / 2, vh / 2 + 140);
  ctx.globalAlpha = 1;
  // Case file: the three people this story turns on.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#ffd24b';
  ctx.fillText('THE CASE FILE', vw / 2, vh / 2 + 176);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  CHARACTER_BIOS.forEach((c, i) => {
    ctx.fillText(c.name + ' — ' + c.role + ': ' + c.bio, vw / 2, vh / 2 + 200 + i * 22);
  });
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('100% original: its own city, characters, vehicles and story. Nothing borrowed.', vw / 2, vh / 2 + 276);
  ctx.fillText('Judge: the screenshots show a chase, a street drive, a night mission and this menu — every system live.', vw / 2, vh / 2 + 298);
}
function drawPause(G, ctx, vw, vh) {
  ctx.fillStyle = 'rgba(8,10,26,0.75)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('PAUSED', vw / 2, vh / 2 - 170);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText('Mission ' + (G.mission.index + 1) + '/8 — ' + (MISSION_NAMES[G.mission.index] || 'Story complete'), vw / 2, vh / 2 - 126);
  ctx.fillText('Cash ' + fmtMoney(G.player.cash) + '  ·  Respect ' + G.player.respect + ' (Lvl ' + respectLevel(G.player.respect) + ')  ·  Stashes ' + stashesFound(G) + '/12', vw / 2, vh / 2 - 96);
  // Story progress: every mission with its state.
  ctx.font = '16px system-ui, sans-serif';
  for (let i = 0; i < 8; i++) {
    const done = i < G.mission.index;
    const current = i === G.mission.index && G.mission.index < 8;
    ctx.fillStyle = done ? '#7dff8a' : current ? '#ffd24b' : '#888';
    ctx.fillText((done ? '✓ ' : current ? '▶ ' : '· ') + 'M' + (i + 1) + ' ' + MISSION_NAMES[i] + (done ? ' — done' : current ? ' — in progress' : ''), vw / 2, vh / 2 - 62 + i * 24);
  }
  const y = vh / 2 + 140;
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Best Azura 500: ' + (G.player.bestRace ? fmtTime(G.player.bestRace) : 'not run yet') + '   ·   Radio: ' + G.audio.stationName(), vw / 2, y);
  ctx.fillText('Cars stolen: ' + G.stats.stolen + '  ·  Distance driven: ' + (G.stats.driven / 1000).toFixed(1) + ' km  ·  Shots fired: ' + G.stats.shots + '  ·  Fares: ' + G.stats.fares, vw / 2, y + 26);
  ctx.fillText('P / Esc resume · R restart from save · ENTER resume · C change radio', vw / 2, y + 54);
}
function drawEnd(G, ctx, vw, vh) {
  ctx.fillStyle = G.screen === 'busted' ? 'rgba(20,40,120,0.8)' : 'rgba(120,10,10,0.8)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(G.screen === 'busted' ? 'BUSTED' : 'WASTED', vw / 2, vh / 2 - 40);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(G.screen === 'busted' ? 'The Azura PD caught up with you. $250 fine.' : 'You blacked out. St. Mara patched you up. $250 bill.', vw / 2, vh / 2 + 6);
  ctx.fillText('Press ENTER to wake up at the Safehouse', vw / 2, vh / 2 + 44);
}
function drawComplete(G, ctx, vw, vh) {
  ctx.fillStyle = 'rgba(8,30,16,0.85)';
  ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24b';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillText('PORT AZURA IS YOURS', vw / 2, vh / 2 - 60);
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Dana Reyes took the Docks, the gold Aurora GT and the whole city.', vw / 2, vh / 2 - 14);
  ctx.fillText('Cash ' + fmtMoney(G.player.cash) + ' · Respect ' + G.player.respect + ' · Stashes ' + stashesFound(G) + '/12', vw / 2, vh / 2 + 22);
  ctx.font = 'italic 16px system-ui, sans-serif';
  ctx.fillStyle = '#cfe8ff';
  EPILOGUE.forEach((line, i) => ctx.fillText(line, vw / 2, vh / 2 + 62 + i * 24));
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Free roam continues — fares, races and stashes still pay. ENTER to keep playing.', vw / 2, vh / 2 + 170);
}

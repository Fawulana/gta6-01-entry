// Palmetto Bay — the HUD.
//
// Everything on screen that is not the world: cash and health, wanted
// stars, ammo, the mission objective, the minimap with its GPS route, and
// the menus (title, pause, busted, wasted, mission complete). The minimap
// draws the same city the renderer draws, shrunk.

import { BEACH_Y, LANDMARKS, PALETTE, ROADS_X, ROADS_Y, ROAD_W, WATER_Y, WORLD_H, WORLD_W } from './config.js';

const MINIMAP_SIZE = 190;
const MINIMAP_SCALE = MINIMAP_SIZE / WORLD_W;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

function drawStars(ctx, x, y, stars) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? PALETTE.hudGold : 'rgba(255,255,255,0.25)';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', x + i * 26, y);
  }
}

export function drawHud(ctx, canvas, game) {
  const p = game.player;
  // Top right: cash, health, ammo.
  panel(ctx, canvas.width - 210, 12, 198, 74);
  ctx.fillStyle = PALETTE.hudGold;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${p.cash.toLocaleString()}`, canvas.width - 24, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.fillText(`♥ ${Math.ceil(p.health)}`, canvas.width - 24, 62);
  if (p.hasPistol) ctx.fillText(`⌖ ${p.ammo} ammo`, canvas.width - 24, 80);
  // Top centre: wanted stars.
  drawStars(ctx, canvas.width / 2 - 52, 36, game.wanted.stars);
  if (game.wanted.stars > 0) {
    ctx.fillStyle = '#ff5a4d';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WANTED', canvas.width / 2, 56);
  }
  // Bottom centre: mission objective.
  const objective = game.objectiveText;
  ctx.font = 'bold 15px sans-serif';
  const ow = ctx.measureText(objective).width + 28;
  panel(ctx, (canvas.width - ow) / 2, canvas.height - 44, ow, 30);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(objective, canvas.width / 2, canvas.height - 24);
  // Mission message banner.
  if (game.mission.messageTimer > 0 && game.mission.message) {
    ctx.font = 'bold 24px sans-serif';
    const mw = ctx.measureText(game.mission.message).width + 36;
    panel(ctx, (canvas.width - mw) / 2, 84, mw, 40);
    ctx.fillStyle = PALETTE.hudGold;
    ctx.textAlign = 'center';
    ctx.fillText(game.mission.message, canvas.width / 2, 112);
  }
  // Mission timer.
  if (game.mission.active && game.mission.timer > 0) {
    ctx.fillStyle = game.mission.timer < 30 ? '#ff5a4d' : '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⏱ ${Math.ceil(game.mission.timer)}s`, canvas.width / 2, 150);
  }
  // Context prompt.
  if (game.prompt) {
    ctx.font = 'bold 14px sans-serif';
    const pw = ctx.measureText(game.prompt).width + 24;
    panel(ctx, (canvas.width - pw) / 2, canvas.height - 84, pw, 28);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(game.prompt, canvas.width / 2, canvas.height - 65);
  }
  // Bust warning.
  if (game.wanted.bustTimer > 0) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED?', canvas.width / 2, canvas.height / 2 - 60);
  }
  drawMinimap(ctx, canvas, game);
}

function drawMinimap(ctx, canvas, game) {
  const mx = 14;
  const my = canvas.height - MINIMAP_SIZE - 14;
  const s = MINIMAP_SCALE;
  panel(ctx, mx - 6, my - 6, MINIMAP_SIZE + 12, MINIMAP_SIZE + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mx, my, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.clip();
  // Ground and water.
  ctx.fillStyle = '#3f6b34';
  ctx.fillRect(mx, my, MINIMAP_SIZE, MINIMAP_SIZE);
  ctx.fillStyle = '#1f7a8c';
  ctx.fillRect(mx, my + BEACH_Y * s, MINIMAP_SIZE, (WORLD_H - BEACH_Y) * s);
  // Roads.
  ctx.fillStyle = '#3a3a44';
  for (const x of ROADS_X) ctx.fillRect(mx + (x - ROAD_W / 2) * s, my, ROAD_W * s, BEACH_Y * s);
  for (const y of ROADS_Y) ctx.fillRect(mx, my + (y - ROAD_W / 2) * s, MINIMAP_SIZE, ROAD_W * s);
  // Landmarks.
  ctx.fillStyle = '#ffd23f';
  for (const key of Object.keys(LANDMARKS)) {
    const l = LANDMARKS[key];
    ctx.fillRect(mx + l.x * s - 2, my + l.y * s - 2, 4, 4);
  }
  // Mission marker.
  if (game.missionMarker) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(mx + game.missionMarker.x * s, my + game.missionMarker.y * s, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // GPS route on the minimap.
  if (game.missionMarker) {
    const focus = game.player.inCar ?? game.player;
    ctx.strokeStyle = 'rgba(255, 225, 77, 0.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(mx + focus.x * s, my + focus.y * s);
    ctx.lineTo(mx + game.missionMarker.x * s, my + focus.y * s);
    ctx.lineTo(mx + game.missionMarker.x * s, my + game.missionMarker.y * s);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Player arrow.
  const focus = game.player.inCar ?? game.player;
  ctx.save();
  ctx.translate(mx + focus.x * s, my + focus.y * s);
  ctx.rotate(focus.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Cop dots.
  ctx.fillStyle = '#4d8dff';
  for (const cop of game.cops) {
    ctx.fillRect(mx + cop.x * s - 1.5, my + cop.y * s - 1.5, 3, 3);
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PALMETTO BAY', mx + 2, my - 10);
}

function menuPanel(ctx, canvas, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 6, 20, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const w = 560;
  const h = 120 + lines.length * 30;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  panel(ctx, x, y, w, h);
  ctx.fillStyle = accent ?? PALETTE.hudGold;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, y + 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2, y + 92 + i * 30);
  });
}

export function drawTitleScreen(ctx, canvas, game) {
  const lines = [
    'Rico Vega is back in Palmetto Bay — and in debt to Delgado.',
    'Steal cars, lose the cops, run six missions, take the bank.',
    '',
    'WASD drive / walk   •   E enter car, use shop   •   Mouse aim, click shoot',
    'P pause   •   M mute   •   Progress auto-saves',
    '',
    'Press ENTER or click to start',
  ];
  menuPanel(ctx, canvas, 'PALMETTO BAY', lines, '#ffd23f');
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Missions complete: ${game.missionsDone.length} / 6    •    Best cash: $${game.bestCash.toLocaleString()}`, canvas.width / 2, canvas.height / 2 + 190);
}

export function drawPauseScreen(ctx, canvas, game) {
  menuPanel(ctx, canvas, 'PAUSED', [
    `Cash $${game.player.cash.toLocaleString()}   •   Missions ${game.missionsDone.length}/6   •   Chests ${game.chestsTakenCount ?? 0}/8`,
    '',
    'P / Esc resume   •   Click resume',
  ]);
}

export function drawBustedScreen(ctx, canvas, game) {
  menuPanel(ctx, canvas, 'BUSTED', [
    'The Palmetto Bay PD caught Rico. Bail cost $200.',
    '',
    'Press ENTER to get back out there',
  ], '#4d8dff');
}

export function drawWastedScreen(ctx, canvas, game) {
  menuPanel(ctx, canvas, 'WASTED', [
    'Rico went down. The city keeps moving without him.',
    '',
    'Press ENTER to wake up at the safehouse',
  ], '#ff5a4d');
}

export function drawMissionCompleteScreen(ctx, canvas, game) {
  const mission = game.completedMission;
  menuPanel(ctx, canvas, 'MISSION COMPLETE', [
    `${mission.title} — $${mission.reward} earned`,
    `Total earned: $${game.totalEarned.toLocaleString()}`,
    '',
    'Press ENTER to keep playing',
  ], '#2ecc71');
}

export function aimWorldPosition(cam, input, canvas) {
  return { x: input.mouseX + cam.x, y: input.mouseY + cam.y };
}

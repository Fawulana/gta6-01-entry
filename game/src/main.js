// Port Azura — main loop and game state. Wires every system together:
// city, vehicles, traffic, police, combat, missions, side activities,
// weather, audio, HUD and saves. One canvas, one requestAnimationFrame loop,
// no libraries, no network.
import { WORLD, PLAYER, VEHICLES } from './config.js';
import { clamp, dist, makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildCity, collideBuildings, onRoad, districtAt } from './city.js';
import { makeCar, spawnParkedCars, nearestCar, enterCar, exitCar, driveCar, damageCar, updateSkids, addWanted } from './vehicles.js';
import { spawnTraffic, spawnPeds, updateTraffic, updatePeds } from './traffic.js';
import { updateWanted, updateCops, respawnAtSafehouse } from './police.js';
import { fireWeapon, punch, updateBullets, updateRivals, spawnPickups, updatePickups, hurtPlayer, spawnRivals } from './combat.js';
import { startMission, updateMission, retryMission } from './missions.js';
import { spawnStashes, updateStashes, updateTaxi, takeFare, shopNear, buyAtShop, startStreetRace, updateStreetRace, startTakedown, updateTakedown, takedownNear } from './activities.js';
import { createWeather, updateWeather } from './weather.js';
import { drawWorld } from './render.js';
import { drawHUD } from './hud.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { applyShot } from './shots.js';
import { updateDialogue, ambientLine } from './story.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = Number(params.get('seed') || 7);

let vw = 0, vh = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = window.innerWidth; vh = window.innerHeight;
  canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const audio = createAudio();
const rng = makeRng(SEED);
const city = buildCity(SEED);

const G = {
  time: 0, rng, city, input, audio,
  screen: 'title',
  player: {
    x: city.places.safehouse.x, y: city.places.safehouse.y + 60, angle: -Math.PI / 2,
    hp: 100, armor: 0, cash: 250, respect: 0, ammo: 48, weapon: 'pistol',
    onFoot: true, car: null, moving: false, muzzle: 0, punchAnim: 0,
    lastShot: 0, lastPunch: 0, hurtFlash: 0, bestRace: null,
  },
  cars: [], peds: [], cops: [], rivals: [], bullets: [], particles: [], skids: [],
  chests: [], pickups: [], roadblocks: [], spikes: [],
  wanted: 0, heatTimer: 0, heli: null, gunfireTimer: 0,
  mission: { index: 0, stage: 'go', target: null, failed: false, timer: 0, holdT: 0, cp: 0, stop: 0, carId: null },
  fare: { offer: null, active: null },
  race: { active: false, cp: 0, timer: 0, target: null },
  takedown: { active: false, x: 0, y: 0, total: 0, started: false },
  stats: { stolen: 0, driven: 0, shots: 0, fares: 0, busted: 0 },
  district: '', banner: null,
  weather: createWeather(),
  cam: { x: city.places.safehouse.x, y: city.places.safehouse.y },
  feed: ['Welcome to Port Azura, Dana.', 'Salvo Kane has work for you — follow the gold marker.'],
  dialogue: null, ambientTimer: 45,
  saveDirty: false, saveTimer: 0,
};

// Restore a save, if one exists.
const saved = loadGame();
if (saved) {
  const p = G.player;
  p.cash = saved.cash ?? 250; p.respect = saved.respect ?? 0;
  p.ammo = saved.ammo ?? 48; p.weapon = saved.weapon ?? 'pistol'; p.hasShotgun = !!saved.hasShotgun;
  p.bestRace = saved.bestRace ?? null;
  if (saved.time) G.weather.time = saved.time;
  G._savedMission = Math.min(saved.missionIndex ?? 0, 8);
  G._savedStashes = saved.stashes;
}

spawnParkedCars(G, rng);
spawnTraffic(G, rng, 16);
spawnPeds(G, rng, 42);
spawnPickups(G);
spawnStashes(G, rng);
if (G._savedStashes) G.chests.forEach((c, i) => { if (G._savedStashes[i]) c.found = true; });

// A few ambient rivals hold turf near the Docks even outside the finale.
spawnRivals(G, city.places.docks.x - 140, city.places.docks.y - 500, 3, false);

function startGame() {
  G.screen = 'play';
  audio.unlock();
  if (G._savedMission != null && G._savedMission < 8) startMission(G, G._savedMission);
  else if (G._savedMission === 8) { G.mission.index = 8; G.mission.stage = 'done'; G.mission.target = null; G._showedComplete = true; }
  else startMission(G, 0);
  G._savedMission = null;
}
if (SHOT) {
  // Staged screenshot scene: skip the title, play immediately.
  G.screen = 'play';
  startMission(G, 0);
  applyShot(G, SHOT);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.time += dt;
  update(dt);
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

function update(dt) {
  const p = G.player;
  // Mouse position in world coordinates.
  input.mouse.wx = G.cam.x + (input.mouse.x - vw / 2);
  input.mouse.wy = G.cam.y + (input.mouse.y - vh / 2);
  p.muzzle = Math.max(0, p.muzzle - dt);
  p.punchAnim = Math.max(0, p.punchAnim - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  G.gunfireTimer = Math.max(0, G.gunfireTimer - dt);

  if (input.hit('KeyM')) { const m = audio.toggleMute(); G.feed.push(m ? 'Sound muted' : 'Sound on'); }
  if (input.hit('KeyC') && G.screen === 'play') { G.feed.push('Radio: ' + audio.cycleStation()); }
  if (G.screen === 'title') {
    if (input.hit('Enter')) startGame();
    updateAmbient(dt);
    return;
  }
  if (G.screen === 'pause') {
    if (input.hit('KeyP') || input.hit('Escape') || input.hit('Enter')) G.screen = 'play';
    if (input.hit('KeyR')) { clearSave(); location.reload(); }
    return;
  }
  if (G.screen === 'busted' || G.screen === 'wasted') {
    if (input.hit('Enter')) respawnAtSafehouse(G);
    return;
  }
  if (G.screen === 'complete') {
    if (input.hit('Enter')) G.screen = 'play';
    updateAmbient(dt);
    return;
  }
  // ---- Playing ----
  if (input.hit('KeyP') || input.hit('Escape')) { G.screen = 'pause'; return; }
  if (input.hit('KeyR')) { clearSave(); location.reload(); return; }
  if (G.mission.failed && input.hit('Enter')) retryMission(G);
  if (input.hit('Digit1')) { p.weapon = 'pistol'; G.feed.push('P-9 Pistol equipped'); }
  if (input.hit('Digit2')) {
    if (p.hasShotgun || p.weapon === 'shotgun') { p.weapon = 'shotgun'; G.feed.push('Riot-12 Shotgun equipped'); }
    else G.feed.push('No shotgun yet — buy one at Ironworks Guns (Respect Lvl 2)');
  }
  if (input.hit('KeyT')) takeFare(G);
  if (takedownNear(G) && input.hit('KeyG')) startTakedown(G);
  const shop = shopNear(G);
  if (shop && input.hit('KeyB')) buyAtShop(G, shop);

  if (p.onFoot) updateOnFoot(dt);
  else if (p.car) {
    driveCar(G, p.car, input, dt);
    audio.setEngine(Math.abs(p.car.speed) / VEHICLES[p.car.kind].top, true);
    if (input.hit('KeyE')) { exitCar(G); audio.setEngine(0, false); }
    // Running over pedestrians.
    for (const ped of G.peds) {
      if (Math.abs(p.car.speed) > 150 && dist(p.car.x, p.car.y, ped.x, ped.y) < 40) {
        G.peds.splice(G.peds.indexOf(ped), 1);
        addWanted(G, 1, 'hit and run');
        G.feed.push('Pedestrian down — the PD saw that');
        break;
      }
    }
    // Bumping traffic.
    for (const c of G.cars) {
      if (c === p.car || c.dead || !c.traffic) continue;
      if (dist(p.car.x, p.car.y, c.x, c.y) < 52 && Math.abs(p.car.speed) > 120) {
        damageCar(G, c, 8); damageCar(G, p.car, 4);
        p.car.speed *= 0.6; audio.crash();
      }
    }
  }
  // Enter a car.
  if (p.onFoot && input.hit('KeyE')) {
    const car = nearestCar(G, p.x, p.y, 70);
    if (car) { enterCar(G, car); G.stats.stolen++; }
  }
  // Combat on foot.
  if (p.onFoot) {
    p.angle = Math.atan2(input.mouse.wy - p.y, input.mouse.wx - p.x);
    if (input.mouse.clicked || input.mouse.down) { fireWeapon(G); G.stats.shots++; }
    if (input.hit('KeyF')) punch(G);
  }
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateWanted(G, dt);
  updateCops(G, dt);
  updateRivals(G, dt);
  updateBullets(G, dt);
  updatePickups(G, dt);
  updateStashes(G);
  updateTaxi(G, dt);
  updateStreetRace(G, dt);
  updateTakedown(G);
  updateMission(G, dt);
  updateWeather(G, dt);
  updateSkids(G, dt);
  updateDialogue(G, dt);
  G.ambientTimer -= dt;
  if (G.ambientTimer <= 0) { ambientLine(G); G.ambientTimer = 40 + Math.random() * 40; }
  for (const pt of G.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  // Story complete screen once, when the finale pays out.
  if (G.mission.index === 8 && G.mission.stage === 'done' && G.screen === 'play' && !G._showedComplete) {
    G._showedComplete = true;
    G.screen = 'complete';
  }
  // Camera follows the player, leaning ahead in the direction of travel.
  let tx = p.car ? p.car.x : p.x, ty = p.car ? p.car.y : p.y;
  const leadA = p.car ? p.car.angle : p.angle;
  const leadV = p.car ? Math.abs(p.car.speed) : (p.moving ? 120 : 0);
  tx += Math.cos(leadA) * leadV * 0.35;
  ty += Math.sin(leadA) * leadV * 0.35;
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);
  G.cam.x = clamp(G.cam.x, vw / 2 - 200, WORLD - vw / 2 + 200);
  G.cam.y = clamp(G.cam.y, vh / 2 - 200, WORLD - vh / 2 + 200);
  // Distance driven + district banner.
  if (p.car) G.stats.driven += Math.abs(p.car.speed) * dt;
  const here = districtAt(p.x, p.y);
  if (here !== G.district) {
    G.district = here;
    if (G.screen === 'play') G.banner = { text: here, t: 2.5 };
  }
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  G.saveTimer += dt;
  if (G.saveDirty && G.saveTimer > 2) { saveGame(G); G.saveTimer = 0; }
  if (G.saveTimer > 20) { saveGame(G); G.saveTimer = 0; }
}
function updateAmbient(dt) {
  // Title / complete screens: the city keeps moving behind the menu.
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateWeather(G, dt);
  G.cam.x += (1550 - G.cam.x) * dt * 0.2;
  G.cam.y += (1250 - G.cam.y) * dt * 0.2;
}
function updateOnFoot(dt) {
  const p = G.player;
  const ax = input.axis();
  const speed = input.sprint() ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  p.moving = ax.x !== 0 || ax.y !== 0;
  const len = Math.hypot(ax.x, ax.y) || 1;
  const nx = p.x + (ax.x / len) * speed * dt * (p.moving ? 1 : 0);
  const ny = p.y + (ax.y / len) * speed * dt * (p.moving ? 1 : 0);
  if (!collideBuildings(G.city, nx, p.y, 12)) p.x = clamp(nx, 30, WORLD - 30);
  if (!collideBuildings(G.city, p.x, ny, 12)) p.y = clamp(ny, 30, WORLD - 30);
  audio.setEngine(0, false);
}
function render() {
  ctx.clearRect(0, 0, vw, vh);
  if (G.screen === 'title' || G.screen === 'pause') {
    // Keep the world visible behind menus.
    drawWorld(G, ctx, vw, vh);
  } else {
    drawWorld(G, ctx, vw, vh);
  }
  drawHUD(G, ctx, vw, vh);
}
requestAnimationFrame(frame);

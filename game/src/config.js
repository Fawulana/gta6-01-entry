// Palmetto Bay — every tuning number and colour in one place.
// The world is 4600 x 3400 units; the camera zooms it to the window, so no rule
// below depends on the screen size. All money is in dollars.

export const STEP = 1 / 60;

export const WORLD = { width: 4600, height: 3400, beachX: 3840, waterX: 4040 };

/** Road centrelines: avenues run north-south, streets east-west, plus Ocean Drive. */
export const ROADS = {
  avenues: [420, 920, 1420, 1920, 2420, 2920, 3420],
  streets: [420, 820, 1220, 1620, 2020, 2420, 2820],
  oceanDrive: 3700,
  halfWidth: 64,
  lane: 30,
};

export const DISTRICTS = [
  { name: 'Downtown', x: 1200, y: 700, w: 1500, h: 1100 },
  { name: 'Ocean Strip', x: 3500, y: 300, w: 700, h: 2800 },
  { name: 'Marina', x: 3300, y: 200, w: 700, h: 500 },
  { name: 'Barrio', x: 200, y: 700, w: 1000, h: 1600 },
  { name: 'Parkside', x: 2200, y: 1100, w: 800, h: 600 },
  { name: 'Industrial', x: 1200, y: 2500, w: 2200, h: 800 },
  { name: 'Old Town', x: 200, y: 2300, w: 1000, h: 900 },
];

export const PLAYER = {
  radius: 13,
  walk: 175,
  run: 300,
  health: 100,
  armor: 100,
  punchDamage: 12,
  punchRange: 42,
  punchCooldown: 0.38,
};

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.38, range: 46, ammo: Infinity, price: 0, auto: false },
  pistol: { name: 'Pistol', damage: 26, rate: 0.28, range: 420, ammo: 24, price: 250, auto: false },
  smg: { name: 'SMG', damage: 14, rate: 0.09, range: 360, ammo: 90, price: 800, auto: true },
  shotgun: { name: 'Shotgun', damage: 60, rate: 0.85, range: 260, ammo: 12, price: 1200, auto: false, pellets: 5, spread: 0.22 },
};

/** Car classes: distinct handling is the point — a sports car is not a truck. */
export const CAR_MODELS = {
  sedan: { name: 'Sedan', accel: 420, top: 620, reverse: 220, grip: 5.2, turn: 2.6, length: 64, width: 30, colors: ['#c94f4f', '#4f7ec9', '#c9c9c9', '#3f8f5f'] },
  sports: { name: 'Comet GT', accel: 640, top: 880, reverse: 260, grip: 6.4, turn: 3.1, length: 62, width: 29, colors: ['#f2b705', '#e83e8c', '#1f6feb', '#f5f5f5'] },
  taxi: { name: 'Taxi', accel: 430, top: 640, reverse: 220, grip: 5.2, turn: 2.6, length: 64, width: 30, colors: ['#f2c200'] },
  truck: { name: 'Truck', accel: 300, top: 480, reverse: 180, grip: 4.2, turn: 2.0, length: 84, width: 34, colors: ['#8a6d4b', '#5b7a8c', '#6b6b6b'] },
  cop: { name: 'Interceptor', accel: 560, top: 780, reverse: 240, grip: 6.0, turn: 3.0, length: 64, width: 30, colors: ['#14181f'] },
  gold: { name: 'Aurum GT', accel: 700, top: 940, reverse: 280, grip: 6.8, turn: 3.3, length: 62, width: 29, colors: ['#ffd700'] },
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 14,
  copCarCap: [0, 1, 2, 3, 4, 5],
  footCopCap: [0, 1, 2, 3, 4, 6],
  roadblockStars: 3,
  bustRadius: 46,
  stealHeat: 1,
  shootHeat: 2,
  killCopHeat: 2,
};

export const SHOPS = {
  spray: { name: "Pay 'n Spray", price: 150, x: 2920, y: 2420 },
  guns: { name: 'Ammu-Nation', price: 0, x: 920, y: 1620 },
};

export const MISSION_REWARDS = [300, 600, 900, 500, 1200, 2500];

export const PALETTE = {
  ground: '#3d3348',
  grass: '#2e4a33',
  sand: '#b98d5e',
  waterDeep: '#12283e',
  waterShallow: '#1d4a5e',
  road: '#262633',
  roadEdge: '#3a3a4a',
  sidewalk: '#4b4258',
  line: '#c9a227',
  buildingRoof: ['#6b4a5e', '#7a5a3a', '#4a5a6b', '#5e4a6b', '#8a6a4a', '#3f4a5e'],
  buildingWall: ['#8a6a7a', '#a08a6a', '#6a7a8a', '#7a5a7a', '#b08a5a', '#5a6a7a'],
  windowLit: '#ffd27a',
  windowDark: '#2a2438',
  neon: ['#ff2e88', '#00e5ff', '#ffd700', '#7CFC00', '#ff7b00'],
  text: '#f5efe6',
  muted: '#b8aebf',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  copBlue: '#3b82f6',
  copRed: '#ef4444',
  panel: 'rgba(16, 12, 24, 0.88)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_SLOT = 'palmetto-bay-save-v1';
export const DUSK_HOUR = 19;
export const DUSK_MINUTE = 42;

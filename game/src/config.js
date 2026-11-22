// Palmetto Bay — shared constants, car classes, districts and tuning.
// The whole city, its cars and its economy are described by these numbers.
export const WORLD = {
  size: 4800,
  block: 400,
  road: 64,
  blocks: 12,
};

export const VIEW = { width: 1280, height: 720 };

// Seven car classes. top is px/s, accel px/s^2, grip 0..1 (higher = tighter).
export const CAR_CLASSES = {
  sedan:   { name: 'Coastal Sedan',   top: 335, accel: 265, grip: 0.83, length: 46, width: 22, colors: ['#c0392b', '#2e86c1', '#7d3c98', '#b7950b'] },
  coupe:   { name: 'Veloce Coupe',    top: 385, accel: 305, grip: 0.78, length: 44, width: 21, colors: ['#e74c3c', '#f39c12', '#1abc9c'] },
  truck:   { name: 'Hauler Truck',    top: 285, accel: 205, grip: 0.90, length: 58, width: 26, colors: ['#5d6d7e', '#935116', '#1e8449'] },
  van:     { name: 'Mover Van',       top: 305, accel: 215, grip: 0.88, length: 54, width: 25, colors: ['#aeb6bf', '#2c3e50', '#7b241c'] },
  sports:  { name: 'Falcon GT',       top: 465, accel: 385, grip: 0.72, length: 46, width: 22, colors: ['#f1c40f', '#e67e22', '#8e44ad'] },
  marlin:  { name: 'Golden Marlin',   top: 505, accel: 425, grip: 0.70, length: 48, width: 22, colors: ['#ffd700'] },
  police:  { name: 'PBPD Interceptor', top: 435, accel: 365, grip: 0.75, length: 47, width: 22, colors: ['#141428'] },
};

export const DISTRICTS = [
  { name: 'Downtown',   x: 0,    y: 0,    w: 2400, h: 1600, tint: '#3a4a6b', tall: true },
  { name: 'Old Town',   x: 2400, y: 0,    w: 2400, h: 1600, tint: '#6b4a3a', tall: false },
  { name: 'Marina',     x: 0,    y: 1600, w: 1600, h: 1600, tint: '#2a6b7a', tall: false },
  { name: 'Harbor',     x: 1600, y: 1600, w: 1600, h: 1600, tint: '#4a4a4a', tall: false },
  { name: 'Suburbs',    x: 3200, y: 1600, w: 1600, h: 1600, tint: '#3a6b3a', tall: false },
  { name: 'North Park', x: 0,    y: 3200, w: 2400, h: 1600, tint: '#2a5a3a', tall: false },
  { name: 'Industrial', x: 2400, y: 3200, w: 2400, h: 1600, tint: '#5a4a2a', tall: false },
];

export const PLAYER_TUNE = {
  walkSpeed: 180,
  runSpeed: 265,
  health: 100,
  armor: 0,
  punchDamage: 14,
  bulletDamage: 34,
  startCash: 120,
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 14,
  policePerStar: [0, 1, 2, 3, 4, 6],
  copSpawnRadius: 620,
};

export const PRICES = {
  spray: 100,
  ammo: 50,
  armor: 150,
  health: 80,
  ammoPack: 24,
};

// Taxi side job: a fare pays between these two amounts, scaled by distance.
export const FARE = { minPay: 120, maxPay: 240, pickupSeconds: 90 };

export const SAVE_SLOT = 'palmetto-bay-save-v9';
export const GAME_TITLE = 'Palmetto Bay';
export const GAME_SUBTITLE = 'An open-world crime story in the sun-soaked city of Palmetto Bay';

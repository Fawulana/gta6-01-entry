// Palmetto Bay — every tunable number in one place.
//
// The rest of the game reads its balance from here: world size, the road
// grid, the dusk palette, the car classes, wanted behaviour, shops and the
// six story missions. Change the feel of the game by editing this file.

export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_W = 64;
export const BEACH_Y = 2320;
export const WATER_Y = 2480;
// Default city seed (the ?shot= staging overrides it with seed=1).
export const START_SEED = 20261121;

// Golden-hour palette: a sun-soaked coastal city at dusk.
export const PALETTE = {
  skyTop: '#2b1d4e',
  skyMid: '#e2603f',
  skyLow: '#f7b267',
  grass: '#5d8a4a',
  sidewalk: '#b8a88f',
  road: '#33333d',
  roadLine: '#e8d44d',
  sand: '#e8cf9a',
  water: '#1f7a8c',
  waterDeep: '#155e75',
  buildingWall: '#c98f6b',
  buildingRoof: '#8a5a44',
  towerGlass: '#7fb3d5',
  park: '#4a7c3f',
  player: '#ffd23f',
  police: '#2f6fd0',
  policeLight: '#ff3b30',
  enemy: '#c0392b',
  marker: '#ffe14d',
  hudBg: 'rgba(12, 10, 24, 0.72)',
  hudText: '#ffffff',
  hudGold: '#ffd23f',
};

// The road grid: nine vertical avenues, six horizontal streets.
export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];

// Five stealable classes plus the gold Aurum GT. topSpeed is world units
// per second at full throttle; grip 0..1 (higher turns tighter); hp is how
// much damage the car takes before it smokes and dies.
export const CAR_CLASSES = {
  sedan: { name: 'Palmetto Sedan', topSpeed: 340, accel: 210, grip: 0.62, hp: 100, w: 46, h: 22, colors: ['#c0392b', '#7f8c8d', '#2e86c1', '#e67e22'] },
  coupe: { name: 'Bayside Coupe', topSpeed: 380, accel: 240, grip: 0.7, hp: 80, w: 44, h: 20, colors: ['#8e44ad', '#16a085', '#d35400', '#f1c40f'] },
  suv: { name: 'Dune SUV', topSpeed: 320, accel: 190, grip: 0.58, hp: 140, w: 50, h: 24, colors: ['#1a5276', '#5d6d7e', '#6c3483', '#935116'] },
  truck: { name: 'Hauler Truck', topSpeed: 280, accel: 150, grip: 0.5, hp: 200, w: 56, h: 26, colors: ['#7b241c', '#1e8449', '#2c3e50', '#b7950b'] },
  sports: { name: 'Comet Sports', topSpeed: 460, accel: 300, grip: 0.78, hp: 70, w: 44, h: 20, colors: ['#e74c3c', '#f39c12', '#00bcd4', '#ecf0f1'] },
  aurum: { name: 'Aurum GT', topSpeed: 500, accel: 330, grip: 0.82, hp: 120, w: 46, h: 21, colors: ['#ffd700'] },
};

// Rico on foot.
export const PLAYER = {
  walkSpeed: 170,
  sprintSpeed: 260,
  radius: 13,
  maxHealth: 100,
  startCash: 150,
};

// Wanted: heat builds on crime and bleeds off when Rico lays low.
export const WANTED = {
  stealHeat: 1,
  shootHeat: 1,
  hitPedHeat: 1,
  decayPerSec: 0.05,
  starsForCops: [0, 1, 2, 3, 4, 5],
  copCarSpeed: 420,
  bustRadius: 26,
};

// Weapons and shop prices.
export const WEAPONS = {
  pistol: { name: 'Pistol', damage: 34, fireRate: 0.28, range: 420, price: 250, ammoPrice: 50, ammoPack: 12 },
};
export const SHOP_PRICES = { spray: 150, repair: 100 };

// Eight stash chests hidden around the city.
export const STASH_CHESTS = [
  { x: 420, y: 420, cash: 250 },
  { x: 3180, y: 420, cash: 300 },
  { x: 420, y: 1980, cash: 250 },
  { x: 2380, y: 820, cash: 400 },
  { x: 820, y: 1620, cash: 300 },
  { x: 3180, y: 1980, cash: 350 },
  { x: 1620, y: 2200, cash: 500 },
  { x: 2820, y: 2380, cash: 450 },
];

// Named places: what the HUD, the minimap and the missions call them.
export const LANDMARKS = {
  delgadoOffice: { name: "Delgado's Office", x: 1000, y: 600 },
  safehouse: { name: 'Rico Safehouse', x: 600, y: 1800 },
  marina: { name: 'Palmetto Marina', x: 3000, y: 2350 },
  chopShop: { name: 'Chop Shop', x: 3000, y: 1000 },
  docks: { name: 'The Docks', x: 3400, y: 2200 },
  bank: { name: 'Palmetto Bank', x: 1800, y: 1000 },
  sprayShop: { name: "Pay 'n Spray", x: 2600, y: 1400 },
  ammoShop: { name: 'Ammu-Nation', x: 1400, y: 1800 },
  boardwalk: { name: 'Boardwalk', x: 1800, y: 2380 },
  downtown: { name: 'Downtown', x: 1800, y: 1200 },
};

// Six story missions. Step kinds: goto (reach a marker), steal (take the
// named car), shoot (drop N enemies), collect (grab N packages), escape
// (drop the wanted level), deliver (reach a marker while driving).
// failTimer ends the mission when it runs out.
export const MISSIONS = [
  {
    id: 1, title: 'Welcome Back', reward: 200,
    briefing: 'Rico is back in Palmetto Bay. Delgado wants a word at his office — drive over and hear him out.',
    steps: [{ type: 'goto', x: 1000, y: 600, label: "Reach Delgado's Office" }],
  },
  {
    id: 2, title: 'Hot Wheels', reward: 500,
    briefing: 'A gold Aurum GT is parked at the marina. Steal it and bring it to the chop shop — no questions asked.',
    steps: [
      { type: 'steal', x: 3000, y: 2350, label: 'Steal the gold Aurum GT' },
      { type: 'deliver', x: 3000, y: 1000, label: 'Deliver it to the Chop Shop' },
    ],
  },
  {
    id: 3, title: 'Payback', reward: 600,
    briefing: 'The Dock Rats jumped Rico last night. Settle it at the docks — drop four of them and get out.',
    steps: [{ type: 'shoot', count: 4, x: 3400, y: 2200, label: 'Drop 4 Dock Rats at the docks' }],
  },
  {
    id: 4, title: 'The Drop', reward: 700,
    briefing: 'Three packages are stashed around the city. Collect them all before the timer runs out.',
    steps: [
      { type: 'collect', count: 3, label: 'Collect 3 packages' },
      { type: 'goto', x: 600, y: 1800, label: 'Bring them to the Safehouse' },
    ],
    failTimer: 150,
  },
  {
    id: 5, title: 'Heat Wave', reward: 800,
    briefing: 'The cops are all over Rico after the drop. Lose the heat, then get the car to Pay \'n Spray.',
    steps: [
      { type: 'escape', label: 'Lose the wanted level' },
      { type: 'goto', x: 2600, y: 1400, label: "Reach Pay 'n Spray" },
    ],
  },
  {
    id: 6, title: 'The Big Score', reward: 2000,
    briefing: 'The Palmetto Bank vault. Grab the cash, dodge the law, and bring it home to the safehouse.',
    steps: [
      { type: 'goto', x: 1800, y: 1000, label: 'Reach Palmetto Bank' },
      { type: 'collect', count: 1, label: 'Grab the vault cash' },
      { type: 'deliver', x: 600, y: 1800, label: 'Escape to the Safehouse' },
    ],
  },
];

// Solmar Bay — shared constants: world size, roads, districts, vehicles,
// missions, stash spots and tuning. Every other module imports from here,
// so a balance tweak lands in one place.
export const WORLD = 3200; // city is WORLD x WORLD world units
export const ROAD_W = 64; // asphalt width of every road
export const LANE = 16; // right-hand lane offset from a road centre line
export const ROAD_LINES = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const SIDEWALK = 20; // sidewalk band outside the asphalt
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const SAVE_KEY = 'solmarbay-save-v1';

// Districts: name, centre, radius (for the map label + ground tint).
export const DISTRICTS = [
  { name: 'DOWNTOWN', x: 1600, y: 1600, r: 620, tint: '#8a8f98' },
  { name: 'OLD TOWN', x: 500, y: 1600, r: 480, tint: '#9a8f7a' },
  { name: 'AUTO ROW', x: 2500, y: 500, r: 420, tint: '#7d838d' },
  { name: 'THE DOCKS', x: 500, y: 450, r: 430, tint: '#6f7a80' },
  { name: 'MARINA BAY', x: 2900, y: 1500, r: 420, tint: '#7fa3a8' },
  { name: 'PALM BEACH', x: 1600, y: 3020, r: 700, tint: '#d9c48f' },
];

// Parks: blocks kept green with trees instead of buildings.
export const PARKS = [
  { x: 652, y: 652, w: 296, h: 296 },
  { x: 1852, y: 652, w: 296, h: 296 },
  { x: 1052, y: 2252, w: 296, h: 296 },
];
// Beach: sand band along the south edge; water below it.
export const BEACH = { y0: 2900, y1: 3080 };
export const WATER = { y0: 3080 };
// Marina water + pier on the east edge.
export const MARINA = { x0: 3052, y0: 1150, y1: 1900 };
export const PIER = { x: 3060, y: 1450, w: 140, h: 26 };

// Vehicle kinds: handling, looks and durability. Numbers are world units
// per second (speeds) and hit points.
export const VEHICLE_KINDS = {
  sedan: { label: 'Sedan', color: '#4a7fb5', dark: '#2f5578', len: 46, wid: 22, accel: 260, maxSpeed: 430, grip: 3.4, hp: 100, cruise: 150 },
  sports: { label: 'Sports Car', color: '#d23b2e', dark: '#8e241c', len: 46, wid: 21, accel: 420, maxSpeed: 640, grip: 4.2, hp: 80, cruise: 210 },
  truck: { label: 'Truck', color: '#c98a2e', dark: '#8a5c17', len: 62, wid: 26, accel: 170, maxSpeed: 300, grip: 2.6, hp: 220, cruise: 110 },
  van: { label: 'Van', color: '#7d8a99', dark: '#525d68', len: 52, wid: 24, accel: 210, maxSpeed: 360, grip: 3.0, hp: 130, cruise: 130 },
  taxi: { label: 'Taxi', color: '#f2c230', dark: '#a8841a', len: 46, wid: 22, accel: 280, maxSpeed: 450, grip: 3.5, hp: 100, cruise: 160 },
  police: { label: 'Police Cruiser', color: '#1e2a38', dark: '#0d141d', len: 48, wid: 23, accel: 380, maxSpeed: 560, grip: 4.0, hp: 150, cruise: 0 },
  comet: { label: 'Comet GT', color: '#e8b73a', dark: '#9a7414', len: 46, wid: 21, accel: 460, maxSpeed: 680, grip: 4.4, hp: 90, cruise: 0 },
};

// Mission chain for fixer Lena Cruz. reward in dollars, blip colour gold.
export const MISSIONS = [
  { id: 'M1', name: 'The Pickup', reward: 500, brief: 'Lena needs a package moved. Pick it up at the blue marker, then drop it at the safehouse.' },
  { id: 'M2', name: 'The Getaway', reward: 800, brief: 'The drop went loud. Cops are on you — lose them and reach the safehouse in one piece.' },
  { id: 'M3', name: 'The Score', reward: 1500, brief: 'Hold up the corner store on Palm Row. Stay by the till until the till is empty, then run.' },
  { id: 'M4', name: 'The Street Race', reward: 1200, brief: 'Four checkpoints, ninety seconds, no excuses. Beat the clock and the street is yours.' },
  { id: 'M5', name: 'The Heist', reward: 1800, brief: 'A gold Comet GT is sitting at Auto Row. Take it — the alarm will bring heat — and deliver it to the safehouse.' },
  { id: 'M6', name: 'The Takeover', reward: 2500, brief: 'The Vultures hold the docks. Eight of them, two lieutenants. Clear the docks and Solmar Bay is yours.' },
];

// Ten hidden stash chests, $150 each. Fixed spots so a player can learn them.
export const STASH_SPOTS = [
  { x: 320, y: 320, note: 'behind the dock crates' },
  { x: 2680, y: 320, note: 'Auto Row back lot' },
  { x: 320, y: 2680, note: 'Old Town alley' },
  { x: 2680, y: 2680, note: 'Palm Beach lifeguard hut' },
  { x: 1600, y: 320, note: 'north plaza planter' },
  { x: 320, y: 1600, note: 'Old Town park bench' },
  { x: 2880, y: 1600, note: 'marina pier end' },
  { x: 1600, y: 2680, note: 'beach umbrella row' },
  { x: 1080, y: 1080, note: 'downtown parking garage' },
  { x: 2120, y: 2120, note: 'downtown south plaza' },
];

export const STASH_REWARD = 150;
export const SAFEHOUSE = { x: 1450, y: 2350 }; // Lena's safehouse, south downtown
export const PICKUP_POINT = { x: 1150, y: 1150 }; // M1 package
export const STORE_POINT = { x: 1950, y: 2850 }; // M3 corner store, Palm Row
export const AUTO_ROW_GT = { x: 2450, y: 420 }; // M5 gold Comet GT
export const DOCKS = { x: 520, y: 420 }; // M6 finale arena
export const RACE_CHECKPOINTS = [
  { x: 600, y: 600 },
  { x: 2600, y: 600 },
  { x: 2600, y: 2600 },
  { x: 600, y: 2600 },
];
export const RACE_TIME = 90;

// Wanted tuning.
export const WANTED_MAX = 5;
export const MAX_COPS = 7;
export const WANTED_DECAY_SECONDS = 9; // hidden this long -> lose a star
export const ROADBLOCK_STARS = 3; // roadblocks appear at 3+ stars

// Player tuning.
export const PLAYER_WALK = 230;
export const PLAYER_SPRINT = 350;
export const PLAYER_HP = 100;
export const PUNCH_DAMAGE = 34;
export const BULLET_DAMAGE = 34;
export const BULLET_SPEED = 900;

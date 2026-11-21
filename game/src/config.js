// Port Azura tuning: every number that shapes how the city feels lives here.
// World is a 3600x3600 coastal city. One world unit is about one metre.
export const WORLD = 3600;
export const ROAD_W = 96;
export const ROADS = [280, 640, 1000, 1360, 1720, 2080, 2440, 2800, 3160];
export const DISTRICTS = [
  { name: 'DOWNTOWN', x: 1000, y: 1000, w: 1100, h: 900, tint: '#3a4a6b' },
  { name: 'OLD PORT', x: 200, y: 200, w: 700, h: 700, tint: '#6b5a3a' },
  { name: 'CASINO STRIP', x: 2100, y: 900, w: 900, h: 500, tint: '#6b3a5e' },
  { name: 'BEACHFRONT', x: 3160, y: 400, w: 440, h: 2400, tint: '#c9a86a' },
  { name: 'INDUSTRIAL YARDS', x: 200, y: 2100, w: 1100, h: 900, tint: '#4a4a44' },
  { name: 'HILLCREST', x: 1500, y: 2200, w: 900, h: 800, tint: '#3a5e3a' },
  { name: 'MARKET ROW', x: 1400, y: 300, w: 900, h: 600, tint: '#7a5a2a' },
  { name: 'AIRPORT RD', x: 2300, y: 2500, w: 800, h: 700, tint: '#555a6b' },
];
export const MISSION_PAY = [600, 900, 1200, 1500, 1800, 2200, 3000, 4000];
export const MISSION_NAMES = [
  'The Pickup', 'Hot Wheels', 'The Shakedown', 'The Getaway',
  'The Azura 500', 'The Cashier Job', 'The Aurora Heist', 'The Takeover',
];
export const VEHICLES = {
  sedan:   { name: 'Vireo Sedan',   top: 330, accel: 240, grip: 2.6, color: '#4a7fb5', w: 46, l: 84, hp: 100 },
  sports:  { name: 'Falco GT',      top: 470, accel: 330, grip: 3.4, color: '#c22e2e', w: 44, l: 82, hp: 90 },
  truck:   { name: 'Bison Hauler',  top: 260, accel: 170, grip: 2.0, color: '#7a6a3a', w: 52, l: 110, hp: 160 },
  van:     { name: 'Mule Van',      top: 290, accel: 200, grip: 2.2, color: '#8a8f96', w: 50, l: 96, hp: 130 },
  taxi:    { name: 'Azura Cab',     top: 340, accel: 250, grip: 2.7, color: '#e8b400', w: 46, l: 84, hp: 100 },
  bike:    { name: 'Wasp 900',      top: 500, accel: 380, grip: 4.2, color: '#22b8a0', w: 26, l: 72, hp: 60 },
  police:  { name: 'APD Cruiser',   top: 420, accel: 310, grip: 3.2, color: '#1c2f55', w: 46, l: 86, hp: 140 },
  aurora:  { name: 'Aurora GT Gold',top: 540, accel: 400, grip: 3.8, color: '#e8c33a', w: 44, l: 84, hp: 110 },
  bus:     { name: 'Azura City Bus', top: 240, accel: 150, grip: 1.8, color: '#2e8a5a', w: 54, l: 130, hp: 200 },
};
export const VEHICLE_KEYS = ['sedan', 'sports', 'truck', 'van', 'taxi', 'bike'];
export const PLAYER = { walkSpeed: 210, sprintSpeed: 330, hp: 100, punchDmg: 1, pistolDmg: 1 };
export const WANTED = {
  decayDelay: 9, decayStep: 14, maxCops: [0, 2, 3, 4, 6, 8],
  bustRadius: 46, copTop: 430, heliAt: 4, roadblockAt: 3, spikesAt: 4,
};
export const ECONOMY = {
  stashValue: 200, fareBase: 120, farePerMetre: 0.35, ammoPrice: 120, ammoAmount: 30,
  shotgunPrice: 900, armorPrice: 350, sportsPrice: 2600, bustFine: 250, wastedFine: 250,
  racePrize: 1800, healPrice: 60,
};
export const RESPECT = { perMission: 120, perFare: 25, perStash: 15, perRival: 10, levels: [0, 150, 400, 800, 1400, 2200] };
export const DAY_LENGTH = 480; // seconds for a full day/night cycle
export const COLORS = {
  grass: '#5e8f4e', grass2: '#548549', road: '#33363d', roadEdge: '#4a4e57',
  sidewalk: '#9a938a', sand: '#d9bd7f', water: '#2a7ab5', waterDeep: '#1d5f94',
  park: '#4c7a3e', plaza: '#b0a894', block: '#6f6a60',
};

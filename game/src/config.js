// Solmar Bay: shared constants for the open-world crime game.
// The city is a 3200 x 3200 grid of roads and blocks; every system reads these.
export const WORLD_W = 3200;
export const WORLD_H = 3200;
export const ROAD_FIRST = 200;
export const ROAD_SPACING = 400;
export const ROAD_COUNT = 8; // roads at 200, 600, 1000, ..., 3000 on both axes
export const ROAD_WIDTH = 76;
export const STEP = 1 / 60; // fixed simulation step

export const PLAYER_WALK = 175;
export const PLAYER_RUN = 265;
export const PLAYER_RADIUS = 14;
export const PLAYER_HEALTH = 100;

export const CAR_ACCEL = 470;
export const CAR_BRAKE = 750;
export const CAR_MAX_SPEED = 560;
export const CAR_MAX_REVERSE = 210;
export const CAR_TURN_RATE = 2.7;
export const CAR_LENGTH = 46;
export const CAR_WIDTH = 22;

export const TRAFFIC_SPEED_MIN = 110;
export const TRAFFIC_SPEED_MAX = 185;
export const POLICE_SPEED = 595;
export const MAX_WANTED = 5;

// Vehicle kinds, each with its own handling: sports cars are quick but
// fragile, trucks are slow with 220 HP, vans sit in the middle, taxis drive
// like sedans with a checker strip and a roof sign.
export const CAR_KINDS = {
  sedan: { accel: 470, maxSpeed: 560, hp: 100, len: 46, wid: 22 },
  sports: { accel: 640, maxSpeed: 720, hp: 80, len: 44, wid: 21 },
  truck: { accel: 320, maxSpeed: 420, hp: 220, len: 56, wid: 26 },
  van: { accel: 380, maxSpeed: 470, hp: 140, len: 52, wid: 24 },
  taxi: { accel: 500, maxSpeed: 590, hp: 100, len: 46, wid: 22 },
};

// The street race: four checkpoints against a 90-second clock.
export const RACE_TIME_LIMIT = 90;
export const RACE_CHECKPOINTS = 4;

export const CAR_COLORS = [
  '#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad',
  '#e8e8e8', '#2c3e50', '#e67e22', '#16a085', '#d35400', '#f5d76e',
];
export const PED_SHIRTS = [
  '#e74c3c', '#3498db', '#f1c40f', '#2ecc71',
  '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8', '#f5f5f5',
];
export const BUILDING_COLORS = [
  '#f5e6c8', '#e8b4a0', '#c8d8e8', '#e8d8a0', '#d8c8b8',
  '#f0c8d8', '#c8e0c8', '#e0d0f0', '#f8f0e0', '#d8b8a8',
];
export const ROOF_COLORS = ['#b5654a', '#7a6a5a', '#5a7a8a', '#8a5a4a', '#6a5a7a', '#a05a3a'];

/** Clamp a value into [lo, hi]. */
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
/** Shortest signed angle difference from a to b, in radians. */
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
/** Distance between two points. */
export function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
/** Deterministic 0..1 hash of two integers, for stable per-building detail. */
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

// Weather and time of day: a full 24-hour cycle over eight minutes, with
// golden-hour dusk, night headlights and random rain showers that make the
// roads slick and the city shine. The sky tint drives the whole render.
import { DAY_LENGTH } from './config.js';
import { clamp, lerp } from './random.js';

export function createWeather() {
  return {
    time: 17.2, // start at golden hour — the city looks its best at dusk
    rain: 0, rainTarget: 0, rainTimer: 40,
    drops: [], flash: 0, flashTimer: 8,
  };
}
export function skyState(w) {
  // Returns { sky, tint, dark, sun } for the current hour (0-24).
  const h = w.time % 24;
  const stops = [
    { h: 0, sky: '#0b1026', tint: 'rgba(8,10,30,0.55)', dark: 0.55 },
    { h: 5, sky: '#0b1026', tint: 'rgba(8,10,30,0.55)', dark: 0.55 },
    { h: 7, sky: '#e8a06a', tint: 'rgba(232,140,80,0.16)', dark: 0.08 },
    { h: 10, sky: '#7ec8ee', tint: 'rgba(120,190,255,0.05)', dark: 0 },
    { h: 16, sky: '#8ec8ee', tint: 'rgba(120,190,255,0.05)', dark: 0 },
    { h: 18, sky: '#f28c4a', tint: 'rgba(242,140,60,0.13)', dark: 0.08 },
    { h: 19.5, sky: '#5a3a6e', tint: 'rgba(90,50,110,0.20)', dark: 0.22 },
    { h: 21, sky: '#0b1026', tint: 'rgba(8,10,30,0.55)', dark: 0.55 },
    { h: 24, sky: '#0b1026', tint: 'rgba(8,10,30,0.55)', dark: 0.55 },
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (h >= stops[i].h && h <= stops[i + 1].h) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const t = (h - a.h) / Math.max(0.01, b.h - a.h);
  return {
    sky: a.sky, tint: a.tint, dark: lerp(a.dark, b.dark, t),
    isNight: h < 6 || h >= 19.5, hour: h,
    sun: h < 12 ? (h - 6) / 6 : (18 - h) / 6,
  };
}
export function updateWeather(G, dt) {
  const w = G.weather;
  w.time = (w.time + (dt / DAY_LENGTH) * 24) % 24;
  w.rainTimer -= dt;
  if (w.rainTimer <= 0) {
    w.rainTarget = w.rainTarget > 0 ? 0 : (Math.random() < 0.5 ? 0.7 : 0);
    w.rainTimer = 30 + Math.random() * 50;
    if (w.rainTarget > 0) G.feed.push('Rain moving in over Port Azura — roads are slick');
  }
  w.rain += clamp(w.rainTarget - w.rain, -dt * 0.2, dt * 0.2);
  // Rain streaks around the camera.
  if (w.rain > 0.05) {
    for (let i = 0; i < 3; i++) {
      w.drops.push({
        x: G.cam.x + (Math.random() - 0.5) * 1400, y: G.cam.y + (Math.random() - 0.5) * 900,
        v: 900 + Math.random() * 300, life: 0.5,
      });
    }
  }
  for (const d of w.drops) { d.y += d.v * dt; d.x -= d.v * 0.25 * dt; d.life -= dt; }
  w.drops = w.drops.filter((d) => d.life > 0);
  if (w.drops.length > 220) w.drops.length = 220;
  // Lightning: a storm flash every few seconds while it rains.
  w.flash = Math.max(0, w.flash - dt * 3);
  w.flashTimer -= dt;
  if (w.rain > 0.4 && w.flashTimer <= 0) {
    w.flash = 1;
    w.flashTimer = 6 + Math.random() * 10;
  }
}
export function fmtClock(hour) {
  const h = Math.floor(hour) % 24, m = Math.floor((hour % 1) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

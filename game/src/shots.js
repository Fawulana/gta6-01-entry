// Staged screenshot scenes (?shot=chase|street|mission|title). Each one puts
// the live game into a real playable state — a chase, a street drive, a night
// mission, the title — so every screenshot is a genuine render of the game
// with several systems visible at once. Nothing here is a mock or an image.
import { makeCar } from './vehicles.js';
import { spawnRivals } from './combat.js';
import { startMission } from './missions.js';

export function applyShot(G, shot) {
  const p = G.player;
  G.feed = [];
  G.dialogue = null;
  if (shot === 'chase') {
    // Dusk rain chase: 4 stars, helicopter, roadblock, sports car at speed.
    G.weather.time = 18.1;
    G.weather.rain = 0.7; G.weather.rainTarget = 0.7;
    G.screen = 'play';
    const car = makeCar('sports', 1720, 1360, 0, { color: '#c22e2e' });
    car.speed = 380;
    G.cars.push(car);
    p.car = car; p.onFoot = false; car.driver = 'player';
    p.x = car.x; p.y = car.y; p.angle = 0;
    G.wanted = 4;
    for (let i = 0; i < 3; i++) {
      const cop = makeCar('police', 1720 - 180 - i * 120, 1360 + (i % 2 ? 30 : -30), 0, { driver: 'cop' });
      cop.speed = 360;
      G.cars.push(cop); G.cops.push(cop);
    }
    G.heli = { x: 1900, y: 1200, angle: 0.4, t: 0 };
    const b1 = makeCar('police', 2200, 1360, Math.PI / 2, { parked: true });
    const b2 = makeCar('police', 2290, 1360, Math.PI / 2, { parked: true });
    G.cars.push(b1, b2);
    G.roadblocks.push({ x: 2245, y: 1360, cars: [b1, b2], life: 40 });
    // Traffic ahead to dodge.
    const t1 = makeCar('taxi', 2100, 1336, 0, { traffic: true, cruise: 150 });
    const t2 = makeCar('sedan', 1950, 1384, 0, { traffic: true, cruise: 140 });
    G.cars.push(t1, t2);
    G.mission.index = 5; G.mission.stage = 'go';
    G.mission.target = { x: 2360, y: 1060, label: 'Reach Casino Sol' };
    G.feed.push('WANTED: car theft  +2 stars', 'Roadblock ahead!', 'APD helicopter overhead!');
    G.dialogue = { who: 'Dana Reyes', lines: ['Four stars, a chopper, and a roadblock ahead. Hold on tight.'], t: 6 };
    G.cam.x = p.x; G.cam.y = p.y;
  }
  if (shot === 'street') {
    // Bright day street drive: taxi through downtown traffic, pedestrians,
    // a fare offer and a stash blip on the minimap.
    G.weather.time = 11.0;
    G.weather.rain = 0; G.weather.rainTarget = 0;
    G.screen = 'play';
    const car = makeCar('taxi', 1360, 1000, 0, { color: '#e8b400' });
    car.speed = 200;
    G.cars.push(car);
    p.car = car; p.onFoot = false; car.driver = 'player';
    p.x = car.x; p.y = car.y; p.angle = 0;
    G.wanted = 0;
    G.fare.offer = { x: 1520, y: 1020 };
    G.mission.index = 1; G.mission.stage = 'steal';
    G.mission.target = { x: 2440, y: 1240, label: 'Steal the Falco GT' };
    G.feed.push('Passenger waving — press T to take the fare', 'Stole the Azura Cab');
    G.dialogue = { who: 'Salvo Kane', lines: ['Azura Motors has a red Falco GT out front. The owner owes me. Take it.'], t: 6 };
    G.cam.x = p.x; G.cam.y = p.y;
  }
  if (shot === 'mission') {
    // Night at the Docks: the Takeover in progress, rivals and their boss,
    // muzzle flash, health/armor pickups, 2 stars.
    G.weather.time = 21.5;
    G.weather.rain = 0; G.weather.rainTarget = 0;
    G.screen = 'play';
    p.x = 700; p.y = 2600; p.angle = 0.3; p.onFoot = true; p.car = null;
    p.hp = 78; p.armor = 40; p.ammo = 48; p.weapon = 'pistol';
    G.wanted = 2;
    startMission(G, 7);
    // Rival gunfire mid-flight for the action read.
    G.bullets.push({ x: 760, y: 2580, vx: 500, vy: 200, life: 0.5, from: 'rival', dmg: 1 });
    G.bullets.push({ x: 740, y: 2620, vx: 520, vy: -160, life: 0.5, from: 'rival', dmg: 1 });
    p.muzzle = 0.2;
    const cop = makeCar('police', 900, 2500, Math.PI, { driver: 'cop' });
    cop.speed = 200;
    G.cars.push(cop); G.cops.push(cop);
    G.feed.push('MISSION 8/8 — The Takeover', 'Tide King down  +$40  +10 respect', 'WANTED: shots fired  +1 star');
    G.cam.x = 760; G.cam.y = 2600;
  }
  if (shot === 'title') {
    G.weather.time = 18.4;
    G.screen = 'title';
    // A lively city behind the title: traffic + a parked sports car.
    const car = makeCar('sports', 1500, 1180, 0.4, { parked: true, color: '#c22e2e' });
    G.cars.push(car);
    p.x = 1500; p.y = 1200; p.angle = 0;
    G.cam.x = 1550; G.cam.y = 1250;
  }
}

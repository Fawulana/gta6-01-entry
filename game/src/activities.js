// Side activities and the economy: taxi fares, hidden stash chests, shops
// (guns, armor, cars, food), and a replayable street race. This is how a
// player who finishes the story keeps earning — and how respect grows.
import { ECONOMY, RESPECT, ROADS } from './config.js';
import { dist, clamp, fmtMoney } from './random.js';
import { makeCar } from './vehicles.js';
import { RACE_POINTS } from './missions.js';
import { spawnRivals } from './combat.js';

export function spawnStashes(G, rng) {
  const spots = [
    { x: 420, y: 2620 }, { x: 3360, y: 1500 }, { x: 3300, y: 900 }, { x: 1900, y: 1900 },
    { x: 640, y: 640 }, { x: 2800, y: 2800 }, { x: 1000, y: 2400 }, { x: 2440, y: 640 },
    { x: 1720, y: 2800 }, { x: 640, y: 2800 }, { x: 3100, y: 1800 }, { x: 1360, y: 300 },
  ];
  for (const s of spots) G.chests.push({ x: s.x, y: s.y, found: false });
}
export function updateStashes(G) {
  const p = G.player;
  for (const c of G.chests) {
    if (!c.found && dist(p.x, p.y, c.x, c.y) < 46) {
      c.found = true;
      p.cash += ECONOMY.stashValue; p.respect += RESPECT.perStash;
      G.audio.cash();
      G.feed.push('Stash found!  +' + fmtMoney(ECONOMY.stashValue) + '  (' + G.chests.filter((x) => x.found).length + '/12)');
      G.saveDirty = true;
    }
  }
}
export function stashesFound(G) { return G.chests.filter((c) => c.found).length; }
// ---- Taxi fares: drive a cab, press T near a waving pedestrian, deliver. ----
export function updateTaxi(G, dt) {
  const p = G.player;
  if (!G.fare.active && p.car && p.car.kind === 'taxi' && Math.random() < dt * 0.05) {
    // A pedestrian nearby waves for a cab.
    const near = G.peds.find((pd) => dist(pd.x, pd.y, p.x, p.y) < 260);
    if (near) { G.fare.offer = { x: near.x, y: near.y }; G.feed.push('Passenger waving — press T to take the fare'); }
  }
  if (G.fare.offer && (!p.car || p.car.kind !== 'taxi' || dist(p.x, p.y, G.fare.offer.x, G.fare.offer.y) > 500)) G.fare.offer = null;
  if (G.fare.active) {
    G.fare.timer -= dt;
    if (G.fare.timer <= 0) { G.feed.push('Fare cancelled — too slow'); G.fare.active = null; return; }
    if (dist(p.x, p.y, G.fare.active.x, G.fare.active.y) < 80) {
      const pay = Math.round(ECONOMY.fareBase + G.fare.active.dist * ECONOMY.farePerMetre);
      p.cash += pay; p.respect += RESPECT.perFare;
      G.audio.cash();
      G.feed.push('Fare complete  +' + fmtMoney(pay) + '  +25 respect');
      G.fare.active = null; G.saveDirty = true;
    }
  }
}
export function takeFare(G) {
  const p = G.player;
  if (!p.car || p.car.kind !== 'taxi' || !G.fare.offer) return;
  const rng = Math.random;
  const road = ROADS[Math.floor(rng() * ROADS.length)];
  const vertical = rng() < 0.5;
  const along = 300 + rng() * 3000;
  const dest = vertical ? { x: road, y: along } : { x: along, y: road };
  const d = dist(p.x, p.y, dest.x, dest.y);
  G.fare.active = { ...dest, dist: d, timer: 45 + d / 40 };
  G.fare.offer = null;
  G.stats.fares++;
  G.feed.push('Fare: take them to the marker — ' + Math.round(G.fare.active.timer) + 's on the clock');
  G.audio.horn();
}
// ---- Shops: stand at the marker and press B. ----
export function shopNear(G) {
  const p = G.player, P = G.city.places;
  const spots = [
    { key: 'gun', x: P.gunstore.x, y: P.gunstore.y, label: 'Ironworks Guns — B: ammo $120 · shotgun $900 (Lvl 2)' },
    { key: 'dealer', x: P.dealership.x, y: P.dealership.y, label: 'Azura Motors — B: buy Falco GT $2,600' },
    { key: 'diner', x: P.diner.x, y: P.diner.y, label: 'Neon Diner — B: eat $60, heal +50 HP' },
    { key: 'hospital', x: P.hospital.x, y: P.hospital.y, label: 'St. Mara — B: armor $350' },
  ];
  for (const s of spots) if (dist(p.x, p.y, s.x, s.y) < 90) return s;
  return null;
}
export function buyAtShop(G, shop) {
  const p = G.player;
  const level = respectLevel(p.respect);
  if (shop.key === 'gun') {
    if (level >= 2 && p.weapon !== 'shotgun' && p.cash >= ECONOMY.shotgunPrice) {
      p.cash -= ECONOMY.shotgunPrice; p.weapon = 'shotgun'; p.hasShotgun = true; p.ammo += 12;
      G.feed.push('Bought the Riot-12 shotgun! Press 2 to use it.');
    } else if (p.cash >= ECONOMY.ammoPrice) {
      p.cash -= ECONOMY.ammoPrice; p.ammo += ECONOMY.ammoAmount;
      G.feed.push('Bought ammo  +30 rounds');
    } else G.feed.push('Not enough cash for ammo ($120)');
    G.audio.cash();
  }
  if (shop.key === 'dealer') {
    if (p.cash >= ECONOMY.sportsPrice) {
      p.cash -= ECONOMY.sportsPrice;
      const car = makeCar('sports', G.city.places.dealership.x + 60, G.city.places.dealership.y + 40, 0, { parked: true, color: '#2e6bc2' });
      G.cars.push(car);
      G.feed.push('You own a Falco GT now — it is parked at Azura Motors');
    } else G.feed.push('Falco GT costs $2,600 — you have ' + fmtMoney(p.cash));
    G.audio.cash();
  }
  if (shop.key === 'diner') {
    if (p.cash >= ECONOMY.healPrice && p.hp < 100) {
      p.cash -= ECONOMY.healPrice; p.hp = Math.min(100, p.hp + 50);
      G.feed.push('Ate at the Neon Diner  +50 HP');
    } else if (p.hp >= 100) G.feed.push('Already at full health');
    else G.feed.push('A meal costs $60');
  }
  if (shop.key === 'hospital') {
    if (p.cash >= ECONOMY.armorPrice && p.armor < 100) {
      p.cash -= ECONOMY.armorPrice; p.armor = Math.min(100, p.armor + 50);
      G.feed.push('Body armor fitted  +50');
    } else if (p.armor >= 100) G.feed.push('Armor already full');
    else G.feed.push('Armor costs $350');
  }
  G.saveDirty = true;
}
export function respectLevel(respect) {
  let lvl = 1;
  for (let i = 0; i < RESPECT.levels.length; i++) if (respect >= RESPECT.levels[i]) lvl = i + 1;
  return Math.min(lvl, 6);
}
export function respectProgress(respect) {
  const lvl = respectLevel(respect);
  const lo = RESPECT.levels[lvl - 1] || 0;
  const hi = RESPECT.levels[lvl] ?? lo + 800;
  return { lvl, frac: clamp((respect - lo) / (hi - lo), 0, 1), next: hi };
}
// ---- Replayable street race (after mission 4, or anytime from the park). ----
export function startStreetRace(G) {
  if (G.race.active) return;
  G.race = { active: true, cp: 0, timer: 100, target: { ...RACE_POINTS[0] } };
  G.feed.push('Street race! 5 checkpoints, 100 seconds — $1,800 to the winner');
  G.audio.mission();
}
// ---- Rival takedowns: a repeatable street fight. Clear the marked corner
// of Tide Kings and the street pays you. The more heat you carry, the more
// it pays — the PD does not like witnesses either. ----
export function startTakedown(G) {
  if (G.takedown.active) return;
  const spots = [
    { x: 760, y: 2880 }, { x: 2620, y: 1400 }, { x: 1180, y: 640 }, { x: 2080, y: 2440 },
  ];
  const spot = spots[Math.floor(Math.random() * spots.length)];
  G.takedown = { active: true, x: spot.x, y: spot.y, total: 4, started: true };
  spawnRivals(G, spot.x, spot.y, 4, false);
  G.feed.push('Takedown: clear the Tide Kings off this corner — $500 + $100 per star of heat');
  G.audio.mission();
}
export function updateTakedown(G) {
  const t = G.takedown;
  if (!t.active || !t.started) return;
  const near = G.rivals.filter((r) => !r.dead && dist(r.x, r.y, t.x, t.y) < 400).length;
  if (near === 0) {
    const pay = 500 + G.wanted * 100;
    G.player.cash += pay; G.player.respect += 40;
    G.audio.cash();
    G.feed.push('Corner cleared  +' + fmtMoney(pay) + '  +40 respect');
    t.active = false;
    G.saveDirty = true;
  }
}
export function takedownNear(G) {
  // The takedown starts at the Rusty Anchor bar in Old Port.
  return dist(G.player.x, G.player.y, G.city.places.fixer.x, G.city.places.fixer.y) < 90;
}
export function updateStreetRace(G, dt) {
  const r = G.race, p = G.player;
  if (!r.active) return;
  r.timer -= dt;
  if (r.timer <= 0) { r.active = false; G.feed.push('Race over — out of time'); return; }
  if (dist(p.x, p.y, r.target.x, r.target.y) < 95) {
    r.cp++;
    G.audio.pickup();
    if (r.cp >= 5) {
      r.active = false;
      p.cash += ECONOMY.racePrize; p.respect += 60;
      G.audio.cash();
      G.feed.push('RACE WON  +$1,800  +60 respect');
      G.saveDirty = true;
      return;
    }
    r.target = { ...RACE_POINTS[r.cp] };
  }
}

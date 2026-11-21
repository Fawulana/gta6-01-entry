// The world: everything that happens, in one fixed step. The player drives or
// walks, steals cars, shoots, runs missions, dodges the police and shops — and
// this module wires the pieces together and reports what happened as events, so
// the loop can play sounds and the renderer can paint it. No drawing here.

import { PLAYER, WEAPONS, WORLD } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './city.js';
import { resolveCarCollisions, spawnParkedCars, spawnTraffic, stepCar, stepTraffic } from './vehicles.js';
import { armPlayer, createPlayer, fireWeapon, healPlayer, hurtPlayer, punch, stepPlayer } from './player.js';
import { addHeat, clearWanted, copShots, createPolice, stepPolice } from './police.js';
import { clearMissionChests, collectPickups, createPickups, nearestMissionChest, spawnMissionChests } from './pickups.js';
import { buyGunItem, shopNear, useSprayShop } from './shops.js';
import { createMissions, currentMission, currentStage, enterStage, objectiveTarget, resetMission, updateMissions } from './missions.js';
import { defaultSave, readSave, writeSave } from './save.js';

export const EVENT_NONE = 0;

/** options.fresh: start from a clean save (staged screenshot scenes). */
export function createWorld(seed, options) {
  const random = createRandom(seed);
  const city = buildCity(random);
  const save = options && options.fresh ? defaultSave() : readSave();
  const player = createPlayer(3700, 700);
  player.weapons = [...save.weapons];
  player.ammo = { ...save.ammo };
  if (!player.weapons.includes('fists')) player.weapons.unshift('fists');
  const police = createPolice(random);
  const missions = createMissions(save);
  const pickups = createPickups(random);
  const parked = spawnParkedCars(random, city);
  const traffic = spawnTraffic(random, city, 14);

  const state = {
    seed, city, save, player, police, missions, pickups,
    cars: [...parked, ...traffic],
    time: 0, clock: 19 * 60 + 42,
    particles: [], tracers: [], floats: [], messages: [],
    shopOpen: null, ended: null, endedTimer: 0,
    district: city.districtAt(player.x, player.y),
    shake: 0, interactPulse: 0, missionFlash: 0,
    sirenNear: false, lastShotHeat: -10,
    startedMission5: false,
  };

  function message(text) {
    state.messages.push({ text, t: 0 });
    if (state.messages.length > 5) state.messages.shift();
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color: color || '#f2c94c', t: 0 });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = random() * Math.PI * 2;
      const s = (0.3 + random() * 0.7) * (speed || 220);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + random() * 0.5, t: 0, color, size: 2 + random() * 3 });
    }
  }

  function explosion(x, y) {
    burst(x, y, '#ff7b00', 26, 320);
    burst(x, y, '#ffd700', 18, 220);
    burst(x, y, '#5a5a5a', 14, 120);
    state.shake = Math.max(state.shake, 10);
  }

  function payOut(amount, x, y, text) {
    save.cash += amount;
    floatText(x, y, text || `+$${amount}`, '#7CFC00');
  }

  function saveGame() {
    save.mission = missions.index;
    save.completed = missions.index > 0 ? Array.from({ length: missions.index }, (_, i) => i) : [];
    save.weapons = [...player.weapons];
    save.ammo = { ...player.ammo };
    writeSave(save);
  }

  function respawn(kind) {
    const hospital = { x: 1420, y: 2020 };
    const station = { x: 1500, y: 900 };
    const spot = kind === 'wasted' ? hospital : station;
    player.x = spot.x;
    player.y = spot.y;
    player.health = PLAYER.health;
    player.armor = 0;
    player.dead = false;
    player.inCar = null;
    clearWanted(police);
    const fine = kind === 'wasted' ? 150 : 100;
    save.cash = Math.max(0, save.cash - fine);
    save.stats[kind === 'wasted' ? 'wasted' : 'busts'] += 1;
    state.ended = null;
    state.endedTimer = 0;
    message(kind === 'wasted' ? `Wasted. The hospital patched you up — $${fine} gone.` : `Busted. Bail cost $${fine}.`);
    saveGame();
  }

  function enterCar(car) {
    const wasParked = car.parked;
    player.inCar = car;
    car.isPlayer = true;
    car.parked = false;
    if (wasParked && !car.stolen) {
      car.stolen = true;
      save.stats.carsStolen += 1;
      addHeat(police, 1);
      message(`Stole the ${car.model.name} — the cops noticed`);
    }
  }

  function exitCar() {
    const car = player.inCar;
    if (!car) return;
    car.isPlayer = false;
    car.parked = true;
    player.inCar = null;
    player.x = car.x - Math.cos(car.angle) * 44;
    player.y = car.y - Math.sin(car.angle) * 44;
    player.angle = car.angle;
  }

  function nearestEnterableCar() {
    let best = null;
    let bestD = 70;
    for (const car of state.cars) {
      if (car.dead || car.isCop || car.roadblock) continue;
      if (!car.parked) continue;
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  /** Apply a mission stage's side-effects when a stage begins. */
  function applyStageEffects(effects) {
    if (!effects) return;
    if (effects.heat) addHeat(police, effects.heat);
  }

  function beginMission(index) {
    missions.index = index;
    missions.stage = 0;
    const stage = currentStage(missions);
    if (stage) applyStageEffects(enterStage(missions, stage));
    if (index === 4) {
      spawnMissionChests(pickups);
      state.startedMission5 = true;
    }
    const mission = currentMission(missions);
    if (mission) message(`${mission.title}: ${mission.briefing}`);
  }

  function completeMission(reward) {
    save.stats.missionsDone += 1;
    payOut(reward, player.x, player.y - 40, `+$${reward}`);
    message(`Mission complete — +$${reward}`);
    // The Stash Run just ended (index already advanced past it): clear its chests.
    if (missions.index === 5) clearMissionChests(pickups);
    saveGame();
  }

  function step(dt, input) {
    const events = [];
    state.time += dt;
    state.clock = 19 * 60 + 42 + Math.floor(state.time / 12);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    for (const m of state.messages) m.t += dt;
    state.messages = state.messages.filter((m) => m.t < 6);
    for (const f of state.floats) {
      f.t += dt;
      f.y -= 26 * dt;
    }
    state.floats = state.floats.filter((f) => f.t < 1.4);
    for (const p of state.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    state.particles = state.particles.filter((p) => p.t < p.life);
    for (const t of state.tracers) t.t += dt;
    state.tracers = state.tracers.filter((t) => t.t < 0.12);

    if (state.ended) {
      state.endedTimer += dt;
      if (state.endedTimer > 2.4) respawn(state.ended);
      return events;
    }

    // Shop menu input.
    if (state.shopOpen === 'guns') {
      if (input.interact || input.escape) {
        state.shopOpen = null;
      } else if (input.buy) {
        const result = buyGunItem(save, player, input.buy);
        message(result.message);
        if (!result.ok) events.push({ type: 'denied' });
        else events.push({ type: 'cash' });
        saveGame();
      }
      return events;
    }

    const playerCar = player.inCar;
    const px = playerCar ? playerCar.x : player.x;
    const py = playerCar ? playerCar.y : player.y;

    // Enter / exit cars, interact with missions and shops.
    if (input.interact) {
      if (playerCar) {
        const spray = shopNear(playerCar.x, playerCar.y, true);
        if (spray === 'spray') {
          const result = useSprayShop(save, playerCar, police);
          message(result.message);
          if (result.ok) {
            clearWanted(police);
            events.push({ type: 'cash' });
            saveGame();
          } else events.push({ type: 'denied' });
        } else {
          exitCar();
        }
      } else {
        const car = nearestEnterableCar();
        const stage = currentStage(missions);
        const shop = shopNear(player.x, player.y, false);
        if (shop === 'guns') {
          state.shopOpen = 'guns';
          message("Ammu-Nation — press 1-4 to buy, E to leave");
        } else if (car) {
          enterCar(car);
          events.push({ type: 'enterCar' });
        } else if (stage && stage.kind === 'interact' && Math.hypot(player.x - stage.x, player.y - stage.y) < stage.radius) {
          state.interactedFlag = true;
          addHeat(police, 1);
          message('Package grabbed — get it to the drop-off');
          events.push({ type: 'pickup' });
        } else {
          state.interactPulse = 0.4;
        }
      }
    }
    // Weapon switching.
    if (input.cycleWeapon) {
      const idx = player.weapons.indexOf(player.weapon);
      player.weapon = player.weapons[(idx + 1) % player.weapons.length];
      message(`Weapon: ${WEAPONS[player.weapon].name}`);
    }

    // Driving or walking.
    if (playerCar) {
      const crash = stepCar(playerCar, {
        up: input.up, down: input.down, left: input.left, right: input.right, handbrake: input.handbrake,
      }, dt, city);
      if (crash > 0.12) {
        events.push({ type: 'crash', strength: crash });
        burst(playerCar.x + Math.cos(playerCar.angle) * 30, playerCar.y + Math.sin(playerCar.angle) * 30, '#ffd27a', 8, 180);
        state.shake = Math.max(state.shake, crash * 6);
      }
      if (Math.abs(playerCar.speed) > 60) save.stats.distanceDriven += Math.abs(playerCar.speed) * dt;
      // Skid marks and exhaust while driving hard.
      if (input.handbrake && Math.abs(playerCar.speed) > 200 && random() < 0.5) {
        state.particles.push({
          x: playerCar.x - Math.cos(playerCar.angle) * 26, y: playerCar.y - Math.sin(playerCar.angle) * 26,
          vx: 0, vy: 0, life: 0.9, t: 0, color: '#1a1a22', size: 5,
        });
      }
      if (playerCar.dead) {
        explosion(playerCar.x, playerCar.y);
        events.push({ type: 'explosion' });
        hurtPlayer(player, 55);
        player.inCar = null;
        player.x = playerCar.x + 60;
        player.y = playerCar.y + 60;
        state.cars = state.cars.filter((c) => c !== playerCar);
        if (player.dead) {
          state.ended = 'wasted';
          events.push({ type: 'wasted' });
        }
      }
    } else {
      stepPlayer(player, input, dt, city);
      // Shooting and punching on foot.
      if (input.shoot) {
        const targetAngle = input.mouseWorld
          ? Math.atan2(input.mouseWorld.y - player.y, input.mouseWorld.x - player.x)
          : player.angle;
        const shot = fireWeapon(player, targetAngle);
        if (shot && shot.empty) {
          message('Out of ammo — visit Ammu-Nation');
          events.push({ type: 'denied' });
        } else if (shot) {
          events.push({ type: 'shoot' });
          state.tracers.push({ x1: shot.muzzle.x, y1: shot.muzzle.y, x2: shot.muzzle.x + Math.cos(targetAngle) * 60, y2: shot.muzzle.y + Math.sin(targetAngle) * 60, t: 0 });
          burst(shot.muzzle.x, shot.muzzle.y, '#ffd27a', 4, 120);
          if (state.time - state.lastShotHeat > 3 && police.stars < 2) {
            addHeat(police, 1);
            state.lastShotHeat = state.time;
          }
          resolveShots(shot.shots, player.x, player.y, events);
        }
      } else if (input.punch) {
        const hit = punch(player);
        if (hit) {
          events.push({ type: 'punch' });
          for (const cop of police.footCops) {
            if (!cop.dead && Math.hypot(cop.x - hit.x, cop.y - hit.y) < hit.range) {
              cop.health -= hit.damage;
              burst(cop.x, cop.y, '#ffffff', 5, 120);
              if (cop.health <= 0) {
                cop.dead = true;
                addHeat(police, 1);
                payOut(25, cop.x, cop.y - 20, '+$25');
              }
            }
          }
        }
      }
    }

    // Traffic.
    for (const car of state.cars) {
      if (car.isTraffic && !car.dead) stepTraffic(car, dt, city, state.cars, { x: px, y: py }, random);
    }
    const hits = resolveCarCollisions([...state.cars, ...police.copCars, ...police.roadblocks]);
    for (const hit of hits) {
      events.push({ type: 'crash', strength: hit.strength });
      burst(hit.x, hit.y, '#ffd27a', 6, 150);
    }
    // Dead traffic cars explode and leave the road.
    for (const car of state.cars) {
      if (car.dead && !car.exploded) {
        car.exploded = true;
        explosion(car.x, car.y);
        events.push({ type: 'explosion' });
      }
    }
    state.cars = state.cars.filter((c) => !c.dead || c.isPlayer);

    // Police.
    const policeEvents = stepPolice(police, dt, city, player, playerCar, state.cars);
    if (policeEvents.busted) {
      state.ended = 'busted';
      events.push({ type: 'busted' });
    }
    const shots = copShots(police, player);
    for (const shot of shots) {
      events.push({ type: 'copShoot' });
      state.tracers.push({ x1: shot.x, y1: shot.y, x2: shot.x + Math.cos(shot.angle) * 50, y2: shot.y + Math.sin(shot.angle) * 50, t: 0 });
      const dist = Math.hypot(player.x - shot.x, player.y - shot.y);
      if (dist < shot.range && random() < 0.45) {
        if (hurtPlayer(player, shot.damage)) {
          state.ended = 'wasted';
          events.push({ type: 'wasted' });
        }
      }
    }
    state.sirenNear = police.copCars.some((c) => !c.dead && Math.hypot(c.x - px, c.y - py) < 800);

    // Pickups.
    const collected = collectPickups(pickups, px, py, playerCar ? 46 : 30);
    for (const item of collected) {
      if (item.kind === 'chest') {
        payOut(item.value, item.x, item.y - 20, `+$${item.value}`);
        save.stats.chests += 1;
        events.push({ type: 'cash' });
        if (item.mission) missions.collected += 1;
      } else if (item.kind === 'cash') {
        payOut(item.value, item.x, item.y - 20, `+$${item.value}`);
        events.push({ type: 'cash' });
      } else if (item.kind === 'health') {
        healPlayer(player, item.value);
        message('Health +50');
        events.push({ type: 'pickup' });
      } else if (item.kind === 'armor') {
        armPlayer(player, item.value);
        message('Body armor +50');
        events.push({ type: 'pickup' });
      } else if (item.kind === 'weapon') {
        if (!player.weapons.includes(item.weapon)) player.weapons.push(item.weapon);
        player.ammo[item.weapon] = (player.ammo[item.weapon] || 0) + WEAPONS[item.weapon].ammo;
        player.weapon = item.weapon;
        message(`Picked up the ${WEAPONS[item.weapon].name}`);
        events.push({ type: 'pickup' });
      }
    }

    // Missions.
    if (!missions.allDone) {
      if (missions.index === 4 && !state.startedMission5) {
        spawnMissionChests(pickups);
        state.startedMission5 = true;
      }
      const result = updateMissions(missions, {
        dt, player, playerCar, police, interacted: !!state.interactedFlag,
      });
      state.interactedFlag = false;
      if (result.effects) applyStageEffects(result.effects);
      if (result.advanced) message(result.message);
      if (result.done) {
        events.push({ type: 'mission' });
        completeMission(result.reward);
        state.missionFlash = 1.2;
        if (!missions.allDone) {
          const next = currentMission(missions);
          if (next) message(`${next.title}: ${next.briefing}`);
          const stage = currentStage(missions);
          if (stage) applyStageEffects(enterStage(missions, stage));
        } else {
          message('KING OF THE BAY — you own this city now');
        }
      }
      if (result.failed) {
        events.push({ type: 'denied' });
        message(result.message);
        resetMission(missions);
      }
    }

    // District toast.
    const district = city.districtAt(px, py);
    if (district !== state.district) {
      state.district = district;
      message(district);
    }

    if (state.interactPulse > 0) state.interactPulse -= dt;
    if (state.missionFlash > 0) state.missionFlash -= dt;
    return events;
  }

  /** Resolve the player's shots against foot cops (and roadblock cops). */
  function resolveShots(shots, ox, oy, events) {
    for (const shot of shots) {
      for (const cop of police.footCops) {
        if (cop.dead) continue;
        const dx = cop.x - ox;
        const dy = cop.y - oy;
        const along = dx * Math.cos(shot.angle) + dy * Math.sin(shot.angle);
        const side = Math.abs(-dx * Math.sin(shot.angle) + dy * Math.cos(shot.angle));
        if (along > 0 && along < shot.range && side < 26) {
          cop.health -= shot.damage;
          burst(cop.x, cop.y, '#ff5e5e', 6, 140);
          if (cop.health <= 0) {
            cop.dead = true;
            addHeat(police, 1);
            payOut(25, cop.x, cop.y - 20, '+$25');
            events.push({ type: 'cash' });
          }
          break;
        }
      }
    }
  }

  // Start the saved mission's first stage (its heat, its timer, its chests).
  if (missions.index < 6) beginMission(missions.index);
  else message('KING OF THE BAY — free roam. The city is yours.');

  return {
    state, step, message, saveGame, beginMission,
    /** The current GPS target: mission objective, else null. */
    gpsTarget() {
      const mission = currentMission(missions);
      if (!mission) return null;
      const stage = currentStage(missions);
      if (!stage) return null;
      if (stage.kind === 'collect') {
        const chest = nearestMissionChest(pickups, player.x, player.y);
        if (chest) return { x: chest.x, y: chest.y };
      }
      const target = objectiveTarget(missions);
      return target;
    },
  };
}

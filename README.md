[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/c/gta6-01)

# Palmetto Bay — An Open-World Crime Game

A complete open-world crime game in the browser, built for the
[make.fun gta6-01 bounty](https://make.fun/c/gta6-01): a sun-soaked coastal
city to explore on foot and by car, with traffic and pedestrians, cars to
steal, a wanted level with police who respond, six story missions, stash
chests, two shops, combat, and a save that persists between visits.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network: `game/` is plain static files
(`index.html` plus ES modules under `game/src/`), and all sound is
synthesized with WebAudio.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive or walk (Shift to sprint) |
| E | Enter / exit a car, grab a package, use a shop |
| Mouse + click | Aim and shoot |
| P / Esc | Pause |
| M | Mute |

## The city

Palmetto Bay is a dusk-lit coastal city: downtown towers, the marina, the
boardwalk beach, and the suburbs, all connected by a road grid with traffic.
Rico Vega is back in town and in debt to fixer Delgado — six missions take
him from a stolen sedan to the Palmetto Bank vault.

## Systems

- **Driving** — five car classes (sedan, coupe, SUV, truck, sports) plus the
  gold Aurum GT, each with its own speed, grip and toughness. Steal any
  traffic car with E.
- **Wanted** — 0–5 stars. Stealing, shooting and hitting pedestrians raise
  the heat; police cars and foot cops chase, ram and bust. Pay 'n Spray
  clears the heat for cash.
- **Missions** — six story missions with GPS routing, objectives, timers and
  payouts, tracked on the HUD.
- **Combat** — mouse-aimed pistol with ammo; Ammu-Nation sells guns and ammo.
- **Stash chests** — eight hidden chests around the city pay cash.
- **Save** — progress (money, missions, chests, best stats) auto-saves to
  localStorage.

## Layout

```
main.ts            hands game/ + screenshots/ to /output with a dossier
serve.ts           tiny static server for local play
vendor/            make.fun's dossier library, unchanged
game/index.html    page shell (canvas + HUD drawn in canvas)
game/src/          one clear job per file:
  config.js        tuning constants and palettes
  random.js        seeded RNG
  world.js         city layout: roads, blocks, buildings, beach
  vehicles.js      car classes, traffic, driving physics
  player.js        on-foot movement, health, money
  peds.js          pedestrians
  police.js        wanted stars, pursuit, bust
  missions.js      six story missions
  pickups.js       stash chests and pickups
  shops.js         Pay 'n Spray and Ammu-Nation
  combat.js        shooting, bullets, explosions
  audio.js         WebAudio synth: engine, sirens, shots, music
  input.js         keyboard and mouse
  render.js        camera and canvas drawing
  hud.js           HUD, minimap, GPS route, menus
  save.js          localStorage persistence
  shots.js         deterministic scene staging (?shot=) for screenshots
  main.js          game loop and state machine
screenshots/      real renders of the game (1-start, 2-drive, 3-chase, 4-mission)
```

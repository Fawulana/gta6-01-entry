[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/c/gta6-01)

# Palmetto Bay

An open-world crime game in the spirit of GTA 6, built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Play it in a desktop browser — no build step, no network, no external assets.

You are **Rook**, a driver new to the sun-soaked city of Palmetto Bay, working for fixer **Marla Vane**. Steal cars, outrun the PBPD, and run six story missions across seven districts, from Downtown to the Marina.

## What's in the game

- **Open world** — a seeded 4800×4800 city: Downtown, Old Town, Marina, Harbor, Suburbs, North Park and Industrial, with roads, buildings, parks, water and a day/night cycle
- **6 missions** — Keys to the City, Delivery Run, The Golden Marlin, Heat Wave, Bank Job, Last Ride, with cash rewards and a story arc
- **7 car classes** — Coastal Sedan, Veloce Coupe, Hauler Truck, Mover Van, Falcon GT, PBPD Interceptor, plus the one-of-one gold **Golden Marlin**
- **0–5 star wanted system** — crimes raise your heat, PBPD Interceptors spawn and chase, cops ram and shoot at high heat, wanted decays when you stay out of sight
- **Traffic and pedestrians** — 16 traffic cars following the road grid, 26 pedestrians who flee and panic
- **Combat** — punch, shoot with mouse aim, car damage and wrecks, police ramming
- **8 stash chests** hidden around the city, each with cash
- **Taxi fares** — a side job that pays while you drive between missions
- **Shops** — Ray's Pay 'n Spray (repair + clear wanted) and the Gun Rack (ammo, armor, health)
- **HUD + minimap + GPS** — wanted stars, health/armor, cash, mission objective, a live minimap, a clock, a district readout and an arrow to your next marker
- **Sound** — fully synthesized WebAudio: engine hum, sirens, gunshots, pickups, mission jingles, a driving bassline and three radio stations (press R)
- **Save / load** — press H; progress survives in localStorage

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive |
| Shift | Run |
| E | Enter / exit a car (steal it) |
| F | Punch |
| Mouse aim + click | Shoot |
| Space | Handbrake |
| M | Start the next mission |
| Q | Open a shop menu when inside a shop |
| R | Change radio station |
| H | Save game |
| P / Esc | Pause |
| L | Continue from save (title screen) |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## How it's built

Plain static files under `game/` — `index.html` plus ES modules in `game/src/`, one module per system (`world.js`, `vehicles.js`, `police.js`, `missions.js`, `render.js`, …). Deterministic: one seed builds the same city every time. `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).

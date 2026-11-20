# Solmar Bay — an open-world crime game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An original top-down open-world crime game in the spirit of GTA 6, built for
the [gta6-01 bounty](https://make.fun/bounty/gta6-01). Explore the sun-soaked
city of **Solmar Bay** on foot and by car, steal cars, outrun the Solmar PD,
and run six jobs for Lena Cruz — plus a street race, a gold-car heist, and a
final takeover of the docks.

Everything is original: the city, characters, vehicles, names, story, art and
sounds. Nothing from Rockstar Games or any other commercial game.

## The game

- **Open world** — a 3200×3200 city of roads, blocks, parks, downtown towers with helipads, and a palm-lined marina beach
- **On foot and by car** — walk, sprint, drive; steal any traffic car (E to enter, F to steal). Five kinds: sedan, sports (fast), truck (slow, 220 HP), van, taxi
- **Traffic and pedestrians** — cars follow the road grid at kind-specific speeds; pedestrians stroll the sidewalks, pause to check their phones, and flee gunfire
- **Wanted level** — 5 stars; up to 7 police cars spawn, chase faster as the heat rises, and set roadblocks at 3+ stars; hide until the heat fades, or get busted
- **Missions and a story** — six linked jobs for Lena Cruz: *The Pickup* ($500), *The Getaway* ($800), *The Score* ($1,500), *The Street Race* ($1,200, 4 checkpoints in 90 seconds), *The Heist* ($1,800, steal the gold Comet GT), *The Takeover* ($2,500, clear 8 Vultures incl. 2 lieutenants), then free roam. R restarts the current mission
- **Side activity** — 10 hidden stash chests ($150 each) in parks and sidewalk corners, gold blips on the minimap, progress saved
- **Combat** — aim with the mouse, shoot rivals who hold their turf and shoot back from cover; muzzle flashes, gold-ringed lieutenants with 5 HP; cash pickups scattered around the city
- **HUD with minimap** — cash, health, wanted stars (red flash at 4–5 stars), mission objective (M1/6 … M6/6), race clock bar, stash counter, car-kind label, live police, stash and race blips
- **Start screen and save** — progress saves at the safehouse (localStorage); continue from the title screen
- **Sound** — synthesized WebAudio: engine hum, police sirens, gunshots and a bass music loop (M to mute)

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Sprint on foot |
| Mouse + click | Aim and shoot |
| E | Enter / exit a car |
| F | Steal the nearest car |
| Space | Handbrake (driving, leaves skid marks) |
| R | Restart the current mission |
| P / Esc | Pause |
| H | How to play |
| M | Mute |

## Run it

No build step, no network — the game is static files under `game/`:

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome and play.

## Layout

- `game/` — the playable game (`index.html` + ES modules under `game/src/`, one file per system: `city.js`, `vehicles.js`, `traffic.js`, `police.js`, `combat.js`, `missions.js`, `activities.js`, `hud.js`, `render.js`, `audio.js`, `input.js`, `save.js`, `shots.js`)
- `screenshots/` — four real renders of the game, taken in headless Chromium
- `shots.json` — the staged scenes behind the screenshots
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play

## License

MIT — see [LICENSE](LICENSE).

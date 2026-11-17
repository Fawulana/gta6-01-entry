# Solmar Bay — an open-world crime game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

An original top-down open-world crime game in the spirit of GTA 6, built for
the [gta6-01 bounty](https://make.fun/bounty/gta6-01). Explore the sun-soaked
city of **Solmar Bay** on foot and by car, steal cars, outrun the Solmar PD,
and run jobs for Lena Cruz.

Everything is original: the city, characters, vehicles, names, story, art and
sounds. Nothing from Rockstar Games or any other commercial game.

## The game

- **Open world** — a 3200×3200 city of roads, blocks, parks and a marina beach
- **On foot and by car** — walk, sprint, drive; steal any traffic car (E to enter, F to steal)
- **Traffic and pedestrians** — cars follow the road grid; pedestrians stroll the sidewalks and flee gunfire
- **Wanted level** — 5 stars; police cars spawn, chase and ram; hide until the heat fades, or get busted
- **Missions and a story** — three linked jobs for Lena Cruz: *The Pickup*, *The Getaway*, *The Score*, then free roam
- **Combat** — aim with the mouse, shoot rivals who shoot back; cash pickups scattered around the city
- **HUD with minimap** — cash, health, wanted stars, mission objective, live police and mission blips
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
| Space | Handbrake (driving) |
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

- `game/` — the playable game (`index.html` + ES modules under `game/src/`, one file per system: `city.js`, `vehicles.js`, `traffic.js`, `police.js`, `combat.js`, `missions.js`, `hud.js`, `render.js`, `audio.js`, `input.js`, `save.js`, `shots.js`)
- `screenshots/` — four real renders of the game, taken in headless Chromium
- `shots.json` — the staged scenes behind the screenshots
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny static server for local play

## License

MIT — see [LICENSE](LICENSE).

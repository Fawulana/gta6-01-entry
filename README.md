[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/c/gta6-01)

# Palmetto Bay — An Open-World Crime Game

A complete open-world crime game in the browser, built for the
[make.fun gta6-01 bounty](https://make.fun/c/gta6-01): a dusk-lit Leonida city
to explore on foot and by car, with traffic and pedestrians' streets to steal
on, a wanted level with police who respond, six story missions, stash chests,
two shops, and a save that persists between visits.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network: `game/` is plain static files
(`index.html` plus ES modules under `game/src/`), and all sound is synthesized
with WebAudio.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive or walk (Shift to sprint) |
| E | Enter / exit a car, grab a package, use a shop |
| Mouse + click | Aim and shoot |
| Space | Handbrake while driving, shoot on foot |
| F | Punch |
| Q | Switch weapon |
| P / Esc | Pause |
| M | Mute |

## The game

- **The city** — a procedural Palmetto Bay: downtown with the Palmetto Tower,
  the neon hotel row on Ocean Drive, a marina with boats, a park, a stadium,
  and the Barrio. Dusk grade throughout: long shadows, lit windows, lamp
  pools, headlight cones.
- **Driving** — five car classes with distinct handling (sedan, sports, taxi,
  truck, police Interceptor, plus the gold Aurum GT), traffic that follows the
  road grid, and parked cars waiting to be stolen.
- **The law** — a 0–5 star wanted level. Steal a car, shoot, or kill a cop and
  the LCPD sends Interceptors and foot cops; at three stars they set up
  roadblocks. Break line of sight to cool off, or pay for a respray.
- **Missions** — six in one arc, from meeting Rico at the marina to stealing
  the gold Aurum GT and bringing it home. Timed getaways, stash runs, and a
  wanted level to lose.
- **Collectibles & shops** — eight stash chests, cash drops, health and armor,
  a gun shop (Ammu-Nation) and a Pay 'n Spray that repairs your car and wipes
  your record.
- **Save** — cash, story progress, weapons and stats persist in localStorage.

## Layout

```
main.ts            entrypoint: copies game/ + screenshots/ to /output, writes dossier.json
serve.ts           tiny static server for local play
shots.json         the four staged screenshot scenes
game/
  index.html       canvas + module boot
  src/
    config.js      tuning numbers, palette, car models, weapons
    random.js      seeded RNG
    city.js        procedural city: roads, buildings, beach, marina, park
    vehicles.js    car physics, traffic AI, parked cars
    player.js      on-foot movement and combat
    police.js      wanted level, cop cars, foot cops, roadblocks
    missions.js    the six-mission story arc
    pickups.js     stash chests, cash, health, armor, weapons
    shops.js       Pay 'n Spray and Ammu-Nation
    audio.js       synthesized WebAudio: engine, sirens, effects, dusk groove
    world.js       the fixed-step simulation that wires it all together
    render.js      camera, dusk lighting, HUD, minimap, screens
    shots.js       staged screenshot scenes (?shot=start|drive|chase|mission)
    main.js        boot, input, screens, the game loop
    save.js        localStorage persistence
screenshots/      four 1280x720 frames captured from the running game
```

## License

MIT — see [LICENSE](LICENSE).

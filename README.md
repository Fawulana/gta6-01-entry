[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

# Port Azura — an open-world crime game

A complete top-down 2D open-world crime game in the spirit of GTA 6, built
from scratch in plain Canvas 2D and vanilla JavaScript. No libraries, no
assets, no network: every pixel is drawn in code and every sound is
synthesized live with WebAudio. Serve `game/` from any static server and
open `index.html` to play.

## The city

Port Azura is a 3600×3600 sun-soaked coastal city: a road grid with lane
dashes and crosswalks, downtown towers with long dusk shadows and lit
windows at night, a palm-lined beach with umbrellas, a pier, a marina,
a central park and eight named districts — Downtown, Old Port, Casino
Strip, Beachfront, Industrial Yards, Hillcrest, Market Row and Airport Rd.
Traffic cruises in lanes and turns at intersections; pedestrians stroll
the sidewalks and run from gunfire.

## Day, night and weather

A full 24-hour cycle runs over eight minutes: bright midday, golden-hour
dusk, and night with headlight cones and lit windows. Rain showers roll
in at random, streak the screen, make the roads shine and loosen the
handling. The clock, weather and district name sit in the HUD.

## On foot and by car

Walk and sprint, or press E to enter — and steal — any car on the street.
Nine vehicle kinds handle differently: the Vireo Sedan, the fast Falco
GT, the slow Bison Hauler truck, the Mule Van, the Azura Cab, the Wasp
900 motorcycle (fastest, loosest), APD Cruisers, the gold Aurora GT, and
the slow, tough Azura City Bus lumbering through downtown.
Handbrake turns leave skid marks; a car under half health trails smoke
and a wrecked car stays wrecked.

## Wanted

Five stars. Steal a car, fire a shot or run someone over and the Azura PD
responds: cruisers spawn, chase and ram, roadblocks of two cruisers
sideways across the road appear at 3+ stars, spike strips at 4+, and a
police helicopter with a searchlight circles at 4+ stars. Break line of
sight and stay hidden to cool the heat down, a star at a time. Get
cornered on foot and you are Busted; drop to 0 HP and you are Wasted —
either way it costs $250 and you wake up at the safehouse.

## Missions and story

Eight linked jobs for fixer Salvo Kane, played as wheelwoman Dana Reyes,
paying $600 / $900 / $1,200 / $1,500 / $1,800 / $2,200 / $3,000 / $4,000:

1. **The Pickup** — collect a package downtown, deliver it to the safehouse.
2. **Hot Wheels** — steal the Falco GT from Azura Motors and deliver it.
3. **The Shakedown** — collect three debts around Market Row, the Neon Diner and Casino Sol.
4. **The Getaway** — the drop went loud; lose a 3-star heat, then reach safety.
5. **The Azura 500** — five checkpoints, one hundred seconds on the clock.
6. **The Cashier Job** — walk into Casino Sol, hold E to empty the till, run with 3 stars.
7. **The Aurora Heist** — steal the gold Aurora GT (the alarm brings 2 stars) and deliver it.
8. **The Takeover** — clear the Docks of ten Tide Kings, including their boss Rico "Tide" Marsh.

Failed a race or a robbery? Press ENTER to retry it.

## Side activities and progression

- **Taxi fares** — drive a cab, press T when a passenger waves, beat the clock.
- **12 hidden stash chests** — behind dock crates, on the pier, under beach umbrellas — $200 each.
- **Street races** — replayable 5-checkpoint sprint for $1,800.
- **Takedowns** — at the Rusty Anchor bar, press G to start a repeatable
  Tide Kings corner-clearing fight: $500 plus $100 per star of heat.
- **Shops** — Ironworks Guns (ammo $120, Riot-12 shotgun $900 at Respect Lvl 2),
  Azura Motors (buy your own Falco GT, $2,600), Neon Diner (heal $60),
  St. Mara Hospital (body armor $350).
- **Respect levels** — missions, fares, stashes and rivals all build respect;
  level 2 unlocks the shotgun. Health and armor pickups are scattered
  around the city.

## Combat

Punch (F) or shoot (mouse) with muzzle flashes and tracers — P-9 pistol
or the 5-pellet Riot-12 shotgun. Tide Kings hold turf near the Docks and
shoot back; their lieutenants take five hits and their boss eight.

## HUD, sound, save

Wanted stars, cash, clock, health and armor bars, a respect bar, weapon
and ammo, the current objective, a race clock, a speedometer with the
vehicle name, a live minimap with mission / stash / police / rival blips,
and a feed of what just happened. All sound is synthesized: an engine hum
that follows your speed, two-tone sirens, gunshots, pickup chimes and a
looping bass line (M to mute). Progress — missions, cash, respect,
stashes, best race time — saves to localStorage.

## Controls

- **WASD / arrows** — move / drive · **Shift** — sprint
- **E** — enter or exit a car · **Space** — handbrake
- **Mouse** — aim · **Click** — shoot · **F** — punch
- **1 / 2** — pistol / shotgun · **T** — take a taxi fare · **B** — buy at a shop
- **C** — change radio station (3 synthesized stations) · **P / Esc** — pause
- **R** — restart from save · **M** — mute · **Enter** — start / retry

## Files

- `game/index.html` — the page; `game/src/main.js` — loop and state
- `game/src/city.js` — city layout · `game/src/render.js` — world drawing
- `game/src/vehicles.js` — cars and driving physics
- `game/src/traffic.js` — traffic and pedestrians
- `game/src/police.js` — wanted system, chases, roadblocks, helicopter
- `game/src/missions.js` — the eight jobs
- `game/src/activities.js` — taxi fares, stashes, shops, races, respect
- `game/src/combat.js` — shooting, punching, rivals, pickups
- `game/src/weather.js` — day/night cycle and rain
- `game/src/hud.js` — HUD, minimap, title / pause / end screens
- `game/src/audio.js` — synthesized WebAudio sound
- `game/src/input.js` — keyboard and mouse · `game/src/save.js` — save
- `game/src/random.js` — seeded RNG · `game/src/config.js` — tuning
- `game/src/shots.js` — staged screenshot scenes (`?shot=…`)
- `main.ts` — the hand-in program · `serve.ts` — local static server

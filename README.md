[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Fawulana/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01)

# Solmar Bay — an open-world crime game

A complete top-down 2D open-world crime game in the spirit of GTA 6, built
from scratch in plain Canvas 2D and vanilla JavaScript. No libraries, no
assets, no network: every pixel is drawn in code and every sound is
synthesized live with WebAudio. Open `game/index.html` from any static
server and play.

## The city

Solmar Bay is a 3200×3200 sun-soaked coastal city with a road grid,
downtown towers that throw long dusk shadows, a palm-lined beach with
umbrellas, a marina and pier, parks, zebra crosswalks and six named
districts: Downtown, Old Town, Auto Row, The Docks, Marina Bay and Palm
Beach. Traffic flows in lanes and turns at intersections; pedestrians
stroll the sidewalks and run from gunfire.

## On foot and by car

Walk and sprint, or press E to enter — and steal — any car on the street.
Five vehicle kinds handle differently and look different: the Sedan, the
fast Sports Car, the slow 220 HP Truck, the Van, and the Taxi with its
checker strip and roof sign, plus Police Cruisers and the gold Comet GT.
Handbrake turns leave skid marks; a car under 50 HP trails damage smoke.

## Wanted

Five stars. Steal a car, fire a shot or run someone over and the Solmar
Bay PD responds: cruisers spawn, chase and ram, roadblocks of two cruisers
sideways across the road appear at 3+ stars, up to 7 cops at once. Break
line of sight and stay hidden to cool the heat down, a star at a time.
Get cornered on foot and you are Busted; drop to 0 HP and you are Wasted —
either way it costs $200 and you wake up at the safehouse.

## Missions and story

Six linked jobs for fixer Lena Cruz, paying $500 / $800 / $1,500 / $1,200 /
$1,800 / $2,500:

1. **The Pickup** — collect a package downtown, deliver it to the safehouse.
2. **The Getaway** — the drop went loud; lose a 2-star heat and reach safety.
3. **The Score** — hold up the corner store on Palm Row, empty the till, run.
4. **The Street Race** — four checkpoints, ninety seconds on the clock.
5. **The Heist** — steal the gold Comet GT at Auto Row (the alarm brings
   2 stars) and deliver it to the safehouse.
6. **The Takeover** — clear the docks of eight Vultures, including two
   lieutenants with 5 HP and gold rings.

## Side activity

Ten hidden stash chests are scattered across the city — behind dock
crates, on the pier, under the beach umbrellas — worth $150 each. Gold
blips on the minimap mark the ones you have not found yet, and the HUD
tracks `Stashes n/10`.

## Combat

Punch (F) or shoot (mouse) with muzzle flashes and tracers. Rival gang
members hold turf and shoot back from cover; lieutenants take five hits.

## HUD, sound, save

Wanted stars, cash, health, a live minimap with mission / stash / police /
rival blips, the current objective (`M4/6 …`), a race clock bar, a car-kind
label with speed, and a red flash at high heat. All sound is synthesized:
engine hum that follows your speed, two-tone sirens, gunshots, pickup
chimes and a looping dusk-drive bass line (M to mute). Progress — missions,
cash, stashes, best race time — saves to localStorage.

## Controls

- **WASD / arrows** — move / drive · **Shift** — sprint
- **E** — enter or exit a car · **Space** — handbrake
- **Mouse** — aim · **Click** — shoot · **F** — punch
- **P / Esc** — pause · **R** — restart from save · **M** — mute

## Files

- `game/index.html` — the page; `game/src/main.js` — loop and state
- `game/src/city.js` — city layout · `game/src/render.js` — world drawing
- `game/src/vehicles.js` — cars and driving physics
- `game/src/traffic.js` — traffic and pedestrians
- `game/src/police.js` — wanted system, chases, roadblocks
- `game/src/missions.js` — the six jobs and the stash hunt
- `game/src/combat.js` — shooting, punching, rivals
- `game/src/hud.js` — HUD, minimap, title / pause / end screens
- `game/src/audio.js` — synthesized WebAudio sound
- `game/src/input.js` — keyboard and mouse · `game/src/save.js` — save
- `game/src/random.js` — seeded RNG · `game/src/config.js` — tuning
- `game/src/shots.js` — staged screenshot scenes (`?shot=…`)
- `main.ts` — the hand-in program · `serve.ts` — local static server

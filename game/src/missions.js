// The story: six missions for Rook, a driver new to Palmetto Bay, working for
// fixer Marla Vane. Each mission is a small state machine of stages: reach a
// marker, do the thing, reach the next marker. Rewards are cash.
export const MISSION_DEFS = [
  {
    id: 1,
    title: 'Keys to the City',
    giver: 'Marla Vane',
    brief: 'Marla needs a driver. Steal any car (walk up and press E) and bring it to the hideout on Coral Row.',
    reward: 250,
    stages: [
      { kind: 'steal', text: 'Steal a car — press E next to one' },
      { kind: 'goto', at: 'hideout', text: 'Drive the car to the hideout' },
    ],
  },
  {
    id: 2,
    title: 'Delivery Run',
    giver: 'Marla Vane',
    brief: 'A package is waiting at the docks. Pick it up on foot, then deliver it to the stadium. Keep it quiet — a wanted level slows the job down.',
    reward: 400,
    stages: [
      { kind: 'goto', at: 'docks', text: 'Pick up the package at the docks' },
      { kind: 'goto', at: 'stadium', text: 'Deliver the package to the stadium' },
    ],
  },
  {
    id: 3,
    title: 'The Golden Marlin',
    giver: 'Marla Vane',
    brief: "The Golden Marlin — a one-of-one gold Falcon GT — is parked at the marina. Take it. The owner will not be pleased.",
    reward: 600,
    stages: [
      { kind: 'stealMarlin', text: 'Steal the Golden Marlin at the marina' },
      { kind: 'goto', at: 'warehouse', text: 'Drive the Marlin to the warehouse' },
    ],
  },
  {
    id: 4,
    title: 'Heat Wave',
    giver: 'Marla Vane',
    brief: 'The PBPD is all over you. Lose the heat: get your wanted level to zero, then check in at the hideout.',
    reward: 350,
    stages: [
      { kind: 'loseWanted', text: 'Lose the wanted level (hide, or visit Pay \'n Spray)' },
      { kind: 'goto', at: 'hideout', text: 'Return to the hideout' },
    ],
  },
  {
    id: 5,
    title: 'Bank Job',
    giver: 'Marla Vane',
    brief: 'The Bayfront Bank keeps its cash in a back room. Get in, grab the bag, and get out — the alarm will bring the whole department.',
    reward: 900,
    stages: [
      { kind: 'goto', at: 'bank', text: 'Reach the Bayfront Bank' },
      { kind: 'grab', text: 'Grab the cash (stand in the marker)' },
      { kind: 'goto', at: 'warehouse', text: 'Escape to the warehouse' },
    ],
  },
  {
    id: 6,
    title: 'Last Ride',
    giver: 'Marla Vane',
    brief: 'One last run: take the Marlin to the old airport, shake every cop on your tail, and disappear. Palmetto Bay is yours after this.',
    reward: 1500,
    stages: [
      { kind: 'goto', at: 'airport', text: 'Drive to the old airport' },
      { kind: 'loseWanted', text: 'Shake the police — wanted level to zero' },
      { kind: 'goto', at: 'hideout', text: 'Come home to the hideout' },
    ],
  },
];

export class Missions {
  constructor(city) {
    this.city = city;
    this.index = 0; // next mission to start
    this.active = null; // { def, stage, timer, marker }
    this.completed = 0;
    this.totalEarned = 0;
    this.message = '';
    this.messageTimer = 0;
    this.finishedAll = false;
  }

  get currentDef() {
    return this.index < MISSION_DEFS.length ? MISSION_DEFS[this.index] : null;
  }

  startNext() {
    const def = this.currentDef;
    if (!def) return false;
    this.active = { def, stage: 0, timer: 0, marker: this.markerFor(def.stages[0]) };
    this.message = `Mission ${def.id}: ${def.title} — ${def.brief}`;
    this.messageTimer = 6;
    return true;
  }

  markerFor(stage) {
    if (!stage) return null;
    if (stage.kind === 'goto' || stage.kind === 'grab') {
      const spot = this.city.spawns[stage.at];
      return spot ? { x: spot.x, y: spot.y } : null;
    }
    if (stage.kind === 'stealMarlin') {
      const spot = this.city.spawns.marlin;
      return { x: spot.x, y: spot.y };
    }
    return null;
  }

  stageText() {
    if (!this.active) return '';
    return this.active.def.stages[this.active.stage].text;
  }

  advance() {
    const m = this.active;
    m.stage += 1;
    if (m.stage >= m.def.stages.length) {
      this.complete();
      return;
    }
    m.marker = this.markerFor(m.def.stages[m.stage]);
    this.message = m.def.stages[m.stage].text;
    this.messageTimer = 4;
  }

  complete() {
    const m = this.active;
    this.completed += 1;
    this.totalEarned += m.def.reward;
    this.message = `Mission complete: ${m.def.title} — +$${m.def.reward}`;
    this.messageTimer = 5;
    this.active = null;
    this.index += 1;
    if (this.index >= MISSION_DEFS.length) this.finishedAll = true;
  }

  fail(reason) {
    this.message = `Mission failed: ${reason}`;
    this.messageTimer = 5;
    this.active = null;
  }

  // Called every frame with the live game state; returns events for the game.
  step(dt, game) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (!this.active) return;
    const m = this.active;
    const stage = m.def.stages[m.stage];
    const player = game.player;
    const px = player.px;
    const py = player.py;
    m.timer += dt;
    if (stage.kind === 'goto' || stage.kind === 'grab') {
      const spot = m.marker;
      if (!spot) return;
      const d = Math.hypot(px - spot.x, py - spot.y);
      if (d < 70) {
        if (stage.kind === 'grab') {
          m.timer = 0;
          if (m.timer === 0 && stage.kind === 'grab') {
            // Stand in the marker briefly to grab the bag.
            m.grabTime = (m.grabTime || 0) + dt;
            if (m.grabTime > 1.5) this.advance();
            return;
          }
        }
        this.advance();
      }
    } else if (stage.kind === 'steal') {
      if (player.car) this.advance();
    } else if (stage.kind === 'stealMarlin') {
      if (player.car && player.car.cls === 'marlin') this.advance();
    } else if (stage.kind === 'loseWanted') {
      if (game.wanted.stars === 0) this.advance();
    }
  }

  // Mission 4 and 6 need heat: raise the wanted level when they start.
  heatFor(missionId) {
    if (missionId === 4) return 3;
    if (missionId === 6) return 2;
    return 0;
  }

  toSave() {
    return {
      index: this.index,
      completed: this.completed,
      totalEarned: this.totalEarned,
      finishedAll: this.finishedAll,
      active: this.active
        ? { id: this.active.def.id, stage: this.active.stage }
        : null,
    };
  }

  fromSave(data) {
    if (!data) return;
    this.index = data.index || 0;
    this.completed = data.completed || 0;
    this.totalEarned = data.totalEarned || 0;
    this.finishedAll = !!data.finishedAll;
    if (data.active) {
      const def = MISSION_DEFS.find((d) => d.id === data.active.id);
      if (def) {
        this.active = { def, stage: data.active.stage || 0, timer: 0, marker: this.markerFor(def.stages[data.active.stage || 0]) };
      }
    }
  }
}

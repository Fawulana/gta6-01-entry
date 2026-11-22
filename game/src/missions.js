// Palmetto Bay — the story: six linked missions for fixer Marla Vane.
// Each mission is a small state machine of stages; every stage has a
// marker, a short objective line, and a completion check. Rewards pay
// cash on completion; some stages raise the wanted level. The last
// mission ends the story and the win screen follows.
const DEFS = [
  {
    id: 1, name: 'Keys to the City', reward: 250, heat: 0,
    brief: 'Marla needs a driver. Steal any car and bring it to the hideout.',
    stages: [
      { text: 'Steal a car (walk up to one and press E)', marker: null, kind: 'car' },
      { text: 'Drive to the hideout in Old Town', marker: 'hideout', kind: 'reach', radius: 90 },
    ],
  },
  {
    id: 2, name: 'Delivery Run', reward: 400, heat: 0,
    brief: 'A package for the Marina. Take it there fast — Marla pays for speed.',
    stages: [
      { text: 'Pick up the package from Marla', marker: 'marla', kind: 'reach', radius: 70 },
      { text: 'Deliver it to the Marina docks', marker: 'marina', kind: 'reach', radius: 80 },
    ],
  },
  {
    id: 3, name: 'The Golden Marlin', reward: 800, heat: 1,
    brief: 'One of one. The gold Falcon — sorry, the Golden Marlin — is parked at the Marina. Steal it and stash it at the warehouse.',
    stages: [
      { text: 'Steal the Golden Marlin at the Marina', marker: 'marina', kind: 'marlin' },
      { text: 'Drive the Marlin to the warehouse in Industrial', marker: 'warehouse', kind: 'reachCar', radius: 100 },
    ],
  },
  {
    id: 4, name: 'Heat Wave', reward: 600, heat: 2,
    brief: 'The PBPD is cracking down. Lose a 3-star wanted level, then meet Marla at the park.',
    stages: [
      { text: 'Lose the cops — break line of sight until the stars drop', marker: null, kind: 'loseHeat' },
      { text: 'Meet Marla at North Park', marker: 'park', kind: 'reach', radius: 80 },
    ],
  },
  {
    id: 5, name: 'Bank Job', reward: 1500, heat: 2,
    brief: 'The Bayfront Bank, Downtown. Grab the cash, trip the alarm, and get out clean.',
    stages: [
      { text: 'Reach the Bayfront Bank', marker: 'bank', kind: 'reach', radius: 70 },
      { text: 'Grab the cash from the vault', marker: 'bank', kind: 'wait', seconds: 3 },
      { text: 'Escape to the casino in Old Town', marker: 'casino', kind: 'reach', radius: 90 },
    ],
  },
  {
    id: 6, name: 'Last Ride', reward: 2000, heat: 1,
    brief: 'One last job: drive the package to the airport while the whole city watches. Finish it and Palmetto Bay is yours.',
    stages: [
      { text: 'Pick up the package at the docks', marker: 'dock', kind: 'reach', radius: 70 },
      { text: 'Drive it to the airport — do not lose the car', marker: 'airport', kind: 'reachCar', radius: 100 },
    ],
  },
];

export class Missions {
  constructor(city) {
    this.city = city;
    this.index = 0;
    this.completed = 0;
    this.active = null;
    this.finishedAll = false;
    this.message = '';
    this.messageTimer = 0;
    this.waitTimer = 0;
  }

  heatFor(id) {
    const def = DEFS.find((d) => d.id === id);
    return def ? def.heat : 0;
  }

  startNext() {
    if (this.active || this.finishedAll) return false;
    if (this.index >= DEFS.length) return false;
    const def = DEFS[this.index];
    this.active = { def, stage: 0, marker: null, waitLeft: 0 };
    this.message = `${def.name}: ${def.brief}`;
    this.messageTimer = 5;
    this.waitTimer = 0;
    return true;
  }

  fromSave(data) {
    if (!data) return;
    this.completed = data.completed || 0;
    this.index = data.index || 0;
    if (this.completed >= DEFS.length) this.finishedAll = true;
  }

  currentStage() {
    if (!this.active) return null;
    return this.active.def.stages[this.active.stage];
  }

  markerFor(stage) {
    if (!stage || !stage.marker) return null;
    const s = this.city.spawns[stage.marker];
    return s ? { x: s.x, y: s.y } : null;
  }

  step(dt, game) {
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    if (!this.active) return;
    const stage = this.currentStage();
    if (!stage) return;
    const player = game.player;
    this.active.marker = this.markerFor(stage);
    const px = player.px;
    const py = player.py;
    let done = false;
    if (stage.kind === 'car') {
      done = !!player.car;
    } else if (stage.kind === 'marlin') {
      done = !!player.car && player.car.cls === 'marlin';
    } else if (stage.kind === 'reach' || stage.kind === 'reachCar') {
      const m = this.active.marker;
      if (m && Math.hypot(px - m.x, py - m.y) < (stage.radius || 80)) done = true;
    } else if (stage.kind === 'loseHeat') {
      done = game.wanted.stars === 0;
    } else if (stage.kind === 'wait') {
      const m = this.active.marker;
      if (m && Math.hypot(px - m.x, py - m.y) < 80) {
        this.waitTimer += dt;
        if (this.waitTimer >= (stage.seconds || 3)) done = true;
      } else {
        this.waitTimer = 0;
      }
    }
    if (!done) return;
    this.active.stage += 1;
    this.waitTimer = 0;
    if (this.active.stage >= this.active.def.stages.length) {
      const def = this.active.def;
      this.completed += 1;
      this.index += 1;
      this.active = null;
      this.message = `${def.name} complete — +$${def.reward}`;
      this.messageTimer = 4;
      if (this.completed >= DEFS.length) this.finishedAll = true;
    } else {
      const next = this.currentStage();
      this.message = next ? next.text : '';
      this.messageTimer = 4;
    }
  }
}

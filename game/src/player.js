// Palmetto Bay — the player on foot and behind the wheel.
// On foot: WASD walk/run, mouse aim. In a car: the car drives instead.
// The player position always tracks the car while driving, so the HUD,
// the camera and the mission markers need only read px/py.
import { PLAYER_TUNE } from './config.js';
import { WORLD } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.aimAngle = 0;
    this.health = PLAYER_TUNE.health;
    this.armor = PLAYER_TUNE.armor;
    this.cash = PLAYER_TUNE.startCash;
    this.ammo = 30;
    this.car = null;
    this.onFoot = true;
    this.dead = false;
    this.punchTimer = 0;
    this.shootCooldown = 0;
    this.hurtTimer = 0;
  }

  get px() {
    return this.car ? this.car.x : this.x;
  }

  get py() {
    return this.car ? this.car.y : this.y;
  }

  enterCar(car) {
    car.parked = false;
    car.traffic = false;
    car.police = false;
    this.car = car;
    this.onFoot = false;
    this.x = car.x;
    this.y = car.y;
  }

  exitCar(keepSpeed) {
    if (!this.car) return;
    const car = this.car;
    const side = Math.PI / 2;
    this.x = car.x + Math.cos(car.angle + side) * 34;
    this.y = car.y + Math.sin(car.angle + side) * 34;
    this.angle = car.angle;
    if (!keepSpeed) car.speed = 0;
    this.car = null;
    this.onFoot = true;
  }

  damage(amount, _source) {
    if (this.dead) return;
    let left = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, left);
      this.armor -= absorbed;
      left -= absorbed;
    }
    this.health -= left;
    this.hurtTimer = 0.4;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      if (this.car) this.exitCar(true);
    }
  }

  heal(amount) {
    this.health = Math.min(PLAYER_TUNE.health, this.health + amount);
  }

  update(dt, input, city) {
    if (this.dead) return;
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    if (this.car) {
      const fwd = input.held('KeyW', 'ArrowUp') ? 1 : input.held('KeyS', 'ArrowDown') ? -1 : 0;
      const steer = input.held('KeyA', 'ArrowLeft') ? -1 : input.held('KeyD', 'ArrowRight') ? 1 : 0;
      const brake = input.held('Space');
      this.car.drive(fwd, steer, dt, brake);
      this.x = this.car.x;
      this.y = this.car.y;
      this.angle = this.car.angle;
      return;
    }
    let mx = 0;
    let my = 0;
    if (input.held('KeyW', 'ArrowUp')) my -= 1;
    if (input.held('KeyS', 'ArrowDown')) my += 1;
    if (input.held('KeyA', 'ArrowLeft')) mx -= 1;
    if (input.held('KeyD', 'ArrowRight')) mx += 1;
    const running = input.held('ShiftLeft', 'ShiftRight');
    const speed = running ? PLAYER_TUNE.runSpeed : PLAYER_TUNE.walkSpeed;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      const nx = this.x + (mx / len) * speed * dt;
      const ny = this.y + (my / len) * speed * dt;
      // Slide along walls: try each axis separately.
      if (!city.collideCircle(nx, this.y, 12)) this.x = nx;
      if (!city.collideCircle(this.x, ny, 12)) this.y = ny;
      this.angle = Math.atan2(my, mx);
    }
    this.x = Math.max(16, Math.min(WORLD.size - 16, this.x));
    this.y = Math.max(16, Math.min(WORLD.size - 16, this.y));
  }
}

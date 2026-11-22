// The player: Rook, on foot and behind the wheel. Walking, running, entering
// and leaving cars, punching, shooting, taking damage and dying.
import { PLAYER_TUNE } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = -Math.PI / 2;
    this.speed = 0;
    this.health = PLAYER_TUNE.health;
    this.armor = 0;
    this.cash = PLAYER_TUNE.startCash;
    this.ammo = 12;
    this.car = null;
    this.dead = false;
    this.onFoot = true;
    this.punchTimer = 0;
    this.shootCooldown = 0;
    this.aimAngle = 0;
    this.moving = false;
    this.walkPhase = 0;
    this.lastDamageCause = '';
  }

  get px() { return this.car ? this.car.x : this.x; }
  get py() { return this.car ? this.car.y : this.y; }

  damage(amount, cause) {
    if (this.dead) return;
    let rest = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, rest * 0.6);
      this.armor -= absorbed;
      rest -= absorbed;
    }
    this.health -= rest;
    this.lastDamageCause = cause || '';
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(PLAYER_TUNE.health, this.health + amount);
  }

  // On-foot movement. Returns true when the player moved this frame.
  walkStep(dt, input, city) {
    let dx = 0;
    let dy = 0;
    if (input.down('KeyW', 'ArrowUp')) dy -= 1;
    if (input.down('KeyS', 'ArrowDown')) dy += 1;
    if (input.down('KeyA', 'ArrowLeft')) dx -= 1;
    if (input.down('KeyD', 'ArrowRight')) dx += 1;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (!len) {
      this.speed = 0;
      return false;
    }
    const run = input.down('ShiftLeft', 'ShiftRight');
    const speed = run ? PLAYER_TUNE.runSpeed : PLAYER_TUNE.walkSpeed;
    this.speed = speed;
    const nx = this.x + (dx / len) * speed * dt;
    const ny = this.y + (dy / len) * speed * dt;
    this.angle = Math.atan2(dy, dx);
    this.walkPhase += dt * (run ? 11 : 7);
    // Slide along walls: try each axis separately.
    if (!city.collideCircle(nx, this.y, 12)) this.x = nx;
    if (!city.collideCircle(this.x, ny, 12)) this.y = ny;
    if (!city.inBounds(this.x, this.y)) {
      this.x = Math.max(24, Math.min(4800 - 24, this.x));
      this.y = Math.max(24, Math.min(4800 - 24, this.y));
    }
    return true;
  }

  // Driving: W/S throttle, A/D steer, Space handbrake.
  driveStep(dt, input, city) {
    const car = this.car;
    if (!car) return;
    let throttle = 0;
    if (input.down('KeyW', 'ArrowUp')) throttle += 1;
    if (input.down('KeyS', 'ArrowDown')) throttle -= 1;
    let steer = 0;
    if (input.down('KeyA', 'ArrowLeft')) steer -= 1;
    if (input.down('KeyD', 'ArrowRight')) steer += 1;
    if (input.down('Space')) {
      car.speed *= Math.max(0, 1 - 3.5 * dt);
      steer *= 1.4;
    }
    car.drive(throttle, steer, dt);
    const hit = city.collideCircle(car.x, car.y, 15);
    if (hit) {
      const out = city.pushOut(car.x, car.y, 15);
      car.x = out.x;
      car.y = out.y;
      if (Math.abs(car.speed) > 180) {
        car.health -= 8;
        car.speed *= -0.25;
      } else {
        car.speed *= 0.4;
      }
    }
    if (!city.inBounds(car.x, car.y)) {
      car.x = Math.max(40, Math.min(4800 - 40, car.x));
      car.y = Math.max(40, Math.min(4800 - 40, car.y));
      car.speed *= 0.5;
    }
    if (car.health <= 0) {
      car.dead = true;
      this.exitCar(true);
    }
  }

  enterCar(car) {
    this.car = car;
    this.onFoot = false;
    car.parked = false;
    car.stolen = true;
    car.traffic = false;
  }

  exitCar(wrecked) {
    if (!this.car) return;
    const car = this.car;
    const side = car.angle + Math.PI / 2;
    this.x = car.x + Math.cos(side) * 34;
    this.y = car.y + Math.sin(side) * 34;
    this.angle = car.angle;
    this.car = null;
    this.onFoot = true;
    if (!wrecked) car.speed = 0;
  }

  update(dt, input, city) {
    if (this.punchTimer > 0) this.punchTimer -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.dead) return;
    if (this.car) this.driveStep(dt, input, city);
    else this.walkStep(dt, input, city);
  }
}

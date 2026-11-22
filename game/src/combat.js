// Combat: bullets, punches, muzzle flashes and the little explosion of
// sparks when a shot lands. Nothing here knows about missions or the HUD.
import { PLAYER_TUNE } from './config.js';

export class Bullet {
  constructor(x, y, angle, fromPlayer) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.fromPlayer = fromPlayer;
    this.speed = 900;
    this.life = 0.9;
    this.dead = false;
  }

  step(dt, city) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.life -= dt;
    if (this.life <= 0 || !city.inBounds(this.x, this.y)) this.dead = true;
    if (city.collideCircle(this.x, this.y, 2)) this.dead = true;
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size || 3;
  }

  step(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.max(0, 1 - 2 * dt);
    this.vy *= Math.max(0, 1 - 2 * dt);
    this.life -= dt;
  }
}

export class Combat {
  constructor() {
    this.bullets = [];
    this.particles = [];
    this.muzzle = 0;
  }

  shoot(x, y, angle, fromPlayer) {
    this.bullets.push(new Bullet(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18, angle, fromPlayer));
    this.muzzle = 0.06;
    for (let i = 0; i < 4; i += 1) {
      const a = angle + (Math.random() - 0.5) * 0.9;
      const s = 120 + Math.random() * 160;
      this.particles.push(new Particle(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, Math.cos(a) * s, Math.sin(a) * s, 0.25, '#ffd34d', 2));
    }
  }

  punchHit(x, y, angle) {
    for (let i = 0; i < 6; i += 1) {
      const a = angle + (Math.random() - 0.5) * 1.4;
      const s = 60 + Math.random() * 120;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3, '#ffffff', 3));
    }
  }

  blood(x, y) {
    for (let i = 0; i < 8; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 140;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5, '#c0392b', 3));
    }
  }

  sparks(x, y) {
    for (let i = 0; i < 10; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 220;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4, '#f39c12', 2));
    }
  }

  smoke(x, y) {
    this.particles.push(new Particle(x, y, (Math.random() - 0.5) * 20, -30 - Math.random() * 20, 1.1, 'rgba(120,120,120,0.5)', 6));
  }

  step(dt, city, player, crowd, police, wanted, onCrime) {
    if (this.muzzle > 0) this.muzzle -= dt;
    for (const b of this.bullets) {
      b.step(dt, city);
      if (b.dead) continue;
      if (b.fromPlayer) {
        // Hit a pedestrian?
        const ped = crowd.nearest(b.x, b.y, 16);
        if (ped) {
          ped.dead = true;
          this.blood(b.x, b.y);
          b.dead = true;
          onCrime(1, 'shot a pedestrian');
          continue;
        }
        // Hit a police car?
        const cop = police.nearest(b.x, b.y, 24);
        if (cop) {
          cop.health -= PLAYER_TUNE.bulletDamage;
          this.sparks(b.x, b.y);
          b.dead = true;
          if (cop.health <= 0) {
            cop.dead = true;
            onCrime(2, 'destroyed a PBPD cruiser');
          } else {
            onCrime(1, 'shot at police');
          }
          continue;
        }
        // Hit a traffic car?
        const car = this.nearestCar(b.x, b.y, 24, player);
        if (car) {
          car.health -= PLAYER_TUNE.bulletDamage;
          this.sparks(b.x, b.y);
          b.dead = true;
          if (car.health <= 0) car.dead = true;
        }
      } else if (Math.hypot(b.x - player.px, b.y - player.py) < 16) {
        player.damage(PLAYER_TUNE.bulletDamage * 0.6, 'shot');
        this.blood(b.x, b.y);
        b.dead = true;
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
    for (const p of this.particles) p.step(dt);
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  nearestCar(x, y, maxDist, player) {
    // Traffic cars are found through the game object, set by the caller.
    if (!this.traffic) return null;
    let best = null;
    let bestDist = maxDist;
    for (const car of this.traffic.cars) {
      if (car.dead) continue;
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    if (player.car) {
      const d = Math.hypot(player.car.x - x, player.car.y - y);
      if (d < bestDist) best = player.car;
    }
    return best;
  }
}

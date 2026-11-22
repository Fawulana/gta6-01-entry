// Palmetto Bay — combat: bullets, blood, smoke, sparks and muzzle flash.
// Bullets are short-lived; the renderer draws them from this list.
export class Combat {
  constructor() {
    this.bullets = [];
    this.particles = [];
    this.traffic = null;
  }

  shoot(x, y, angle, byPlayer) {
    this.bullets.push({
      x: x + Math.cos(angle) * 22,
      y: y + Math.sin(angle) * 22,
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      life: 0.9,
      byPlayer,
    });
    this.spark(x + Math.cos(angle) * 26, y + Math.sin(angle) * 26, '#ffd34d', 5);
  }

  punchHit(x, y, angle) {
    this.spark(x, y, '#ffffff', 4);
  }

  blood(x, y) {
    this.spark(x, y, '#c0392b', 10);
  }

  smoke(x, y) {
    this.particles.push({ x, y, vx: 0, vy: -24, life: 0.9, max: 0.9, size: 9, color: '#555', kind: 'smoke' });
  }

  spark(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 140;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.35, max: 0.35, size: 3, color, kind: 'spark',
      });
    }
  }

  explosion(x, y) {
    this.spark(x, y, '#ff9f1a', 22);
    this.spark(x, y, '#ff3b30', 14);
    this.particles.push({ x, y, vx: 0, vy: -30, life: 1.2, max: 1.2, size: 16, color: '#333', kind: 'smoke' });
  }

  // Bullets fly, hit buildings, cars, peds and the player. A bullet that
  // hits anything stops there; one that misses simply expires in the air.
  step(dt, city, player, crowd, police, wanted, onCrime) {
    for (const b of this.bullets) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (city.collideCircle(b.x, b.y, 2)) {
        b.life = 0;
        this.spark(b.x, b.y, '#cccccc', 3);
        continue;
      }
      if (b.byPlayer) {
        // Hit a pedestrian.
        const ped = crowd.nearest(b.x, b.y, 14);
        if (ped) {
          ped.dead = true;
          this.blood(ped.x, ped.y);
          onCrime(1, 'shot a pedestrian');
          b.life = 0;
          continue;
        }
        // Hit a police car.
        for (const car of police.cars) {
          if (car.dead) continue;
          if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
            car.damage(34);
            this.spark(b.x, b.y, '#ffd34d', 4);
            if (car.dead) this.explosion(car.x, car.y);
            b.life = 0;
            break;
          }
        }
        if (b.life <= 0) continue;
        // Hit a traffic car.
        if (this.traffic) {
          for (const car of this.traffic.cars) {
            if (car.dead) continue;
            if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
              car.damage(34);
              this.spark(b.x, b.y, '#ffd34d', 4);
              b.life = 0;
              break;
            }
          }
        }
      } else if (!player.car && !player.dead) {
        if (Math.hypot(player.x - b.x, player.y - b.y) < 14) {
          player.damage(10, 'shot');
          b.life = 0;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}

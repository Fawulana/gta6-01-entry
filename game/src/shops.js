// Palmetto Bay — shops: Ray's Pay 'n Spray and The Gun Rack.
// Walk into the marked zone and press Q. Spray repairs the car and
// clears the wanted level; the Gun Rack sells ammo, armor and health.
// Buying is the only way to clear a 5-star wanted level besides
// outrunning the PBPD until the heat cools off.
import { PRICES } from './config.js';

export class Shops {
  constructor(city) {
    this.defs = city.shops;
    this.near = null;
    this.open = null;
    this.selected = 0;
  }

  step(dt, player) {
    if (this.open) return;
    this.near = null;
    for (const shop of this.defs) {
      if (Math.hypot(player.px - shop.x, player.py - shop.y) < 90) {
        this.near = shop;
        break;
      }
    }
  }

  items() {
    if (!this.open) return [];
    if (this.open.kind === 'spray') {
      return [{ label: `Full repair + clear wanted — $${PRICES.spray}`, price: PRICES.spray, kind: 'spray' }];
    }
    return [
      { label: `Ammo +${PRICES.ammoPack} — $${PRICES.ammo}`, price: PRICES.ammo, kind: 'ammo' },
      { label: `Body armor — $${PRICES.armor}`, price: PRICES.armor, kind: 'armor' },
      { label: `Health pack — $${PRICES.health}`, price: PRICES.health, kind: 'health' },
    ];
  }

  buy(game) {
    const items = this.items();
    const item = items[this.selected];
    if (!item) return;
    const player = game.player;
    if (player.cash < item.price) {
      game.missions.message = 'Not enough cash';
      game.missions.messageTimer = 2;
      return;
    }
    player.cash -= item.price;
    if (item.kind === 'spray') {
      if (player.car) player.car.health = 100;
      game.wanted.clear();
      game.police.cars = [];
      game.missions.message = 'Sprayed and clean — wanted cleared';
    } else if (item.kind === 'ammo') {
      player.ammo += PRICES.ammoPack;
      game.missions.message = `Ammo +${PRICES.ammoPack}`;
    } else if (item.kind === 'armor') {
      player.armor = 100;
      game.missions.message = 'Armor fitted';
    } else if (item.kind === 'health') {
      player.heal(100);
      game.missions.message = 'Patched up';
    }
    game.missions.messageTimer = 2.5;
    game.sound.pickup();
  }
}

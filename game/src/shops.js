// Shops: Ray's Pay 'n Spray (repair + clear wanted) and the Gun Rack
// (ammo, armor, health). Each shop is a zone; standing or parking inside it
// with the right key opens its menu.
import { PRICES } from './config.js';

export const SHOP_MENU = {
  spray: [
    { id: 'repair', label: 'Full repair + respray', price: PRICES.spray, desc: 'Fixes your car and clears your wanted level' },
  ],
  guns: [
    { id: 'ammo', label: 'Ammo pack (+24 rounds)', price: PRICES.ammo, desc: 'A box of pistol rounds' },
    { id: 'armor', label: 'Body armor (+50)', price: PRICES.armor, desc: 'Stops the first few hits' },
    { id: 'health', label: 'First aid (+40 health)', price: PRICES.health, desc: 'Bandages and a cold drink' },
  ],
};

export class Shops {
  constructor(city) {
    this.city = city;
    this.near = null; // shop the player is inside right now
    this.open = null; // shop whose menu is open
    this.selected = 0;
    this.flash = '';
    this.flashTimer = 0;
  }

  // Which shop zone contains (x, y), if any.
  shopAt(x, y) {
    for (const shop of this.city.shops) {
      if (x > shop.x && x < shop.x + shop.w && y > shop.y && y < shop.y + shop.h) return shop;
    }
    return null;
  }

  step(dt, player) {
    if (this.flashTimer > 0) this.flashTimer -= dt;
    this.near = this.shopAt(player.px, player.py);
    if (!this.near) this.open = null;
  }

  buy(game) {
    const shop = this.open;
    if (!shop) return;
    const item = SHOP_MENU[shop.kind][this.selected];
    if (!item) return;
    const player = game.player;
    if (player.cash < item.price) {
      this.flash = 'Not enough cash';
      this.flashTimer = 2;
      return;
    }
    if (item.id === 'repair' && !player.car) {
      this.flash = 'You need a car for a respray';
      this.flashTimer = 2;
      return;
    }
    player.cash -= item.price;
    if (item.id === 'repair') {
      player.car.health = 100;
      game.wanted.clear();
      game.police.cars = [];
      this.flash = 'Resprayed — the heat is off';
    } else if (item.id === 'ammo') {
      player.ammo += PRICES.ammoPack;
      this.flash = 'Ammo restocked';
    } else if (item.id === 'armor') {
      player.armor = Math.min(100, player.armor + 50);
      this.flash = 'Armor fitted';
    } else if (item.id === 'health') {
      player.heal(40);
      this.flash = 'Patched up';
    }
    this.flashTimer = 2.5;
    game.sound.cash();
  }
}

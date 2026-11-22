// Palmetto Bay — the shops. Pay 'n Spray repairs the car, repaints it and
// wipes the wanted level; Ammu-Nation sells the pistol and ammo. Both are
// used with E when Rico is close, and both need cash in hand.

import { LANDMARKS, SHOP_PRICES, WEAPONS } from './config.js';
import { distance } from './world.js';
import { spendCash } from './player.js';

export function shopAt(player) {
  if (distance(player.x, player.y, LANDMARKS.sprayShop.x, LANDMARKS.sprayShop.y) < 90) return 'spray';
  if (distance(player.x, player.y, LANDMARKS.ammoShop.x, LANDMARKS.ammoShop.y) < 90) return 'ammo';
  return null;
}

// Use Pay 'n Spray: repairs and repaints the car Rico is driving (or his
// own health of mind — it clears the wanted level either way).
export function useSprayShop(player, car, wanted) {
  if (!spendCash(player, SHOP_PRICES.spray)) return 'broke';
  if (car) {
    car.hp = car.maxHp;
    car.smoke = 0;
    car.color = ['#e74c3c', '#2e86c1', '#16a085', '#f1c40f'][Math.floor(Math.random() * 4)];
  }
  wanted.heat = 0;
  wanted.stars = 0;
  wanted.bustTimer = 0;
  return 'ok';
}

export function useAmmoShop(player, choice) {
  if (choice === 'pistol') {
    if (player.hasPistol) return 'owned';
    if (!spendCash(player, WEAPONS.pistol.price)) return 'broke';
    player.hasPistol = true;
    player.ammo = 12;
    return 'ok';
  }
  if (!spendCash(player, WEAPONS.pistol.ammoPrice)) return 'broke';
  player.ammo += WEAPONS.pistol.ammoPack;
  return 'ok';
}

export function sprayShopLabel() {
  return `Pay 'n Spray — $${SHOP_PRICES.spray} (repair + repaint + lose the heat)`;
}

export function ammoShopLabel(player) {
  if (!player.hasPistol) return `Ammu-Nation — Pistol $${WEAPONS.pistol.price} [E]`;
  return `Ammu-Nation — Ammo x${WEAPONS.pistol.ammoPack} $${WEAPONS.pistol.ammoPrice} [E]`;
}

// Shops: Pay 'n Spray (new paint, full repair, clean record) and Ammu-Nation
// (guns and ammo). Both are walk-up or drive-up: stand in the zone and press E.
// The gun shop opens a small buy menu; number keys buy, E or Escape closes it.

import { SHOPS, WEAPONS } from './config.js';

export const GUN_MENU = [
  { key: '1', id: 'pistol', label: 'Pistol + 24 rounds', price: 250 },
  { key: '2', id: 'smg', label: 'SMG + 90 rounds', price: 800 },
  { key: '3', id: 'shotgun', label: 'Shotgun + 12 shells', price: 1200 },
  { key: '4', id: 'ammo', label: 'Ammo for current weapon', price: 100 },
];

export function shopNear(x, y, inCar) {
  const spray = SHOPS.spray;
  const guns = SHOPS.guns;
  if (Math.hypot(x - spray.x, y - spray.y) < 130) return inCar ? 'spray' : null;
  if (Math.hypot(x - guns.x, y - guns.y) < 110) return inCar ? null : 'guns';
  return null;
}

/** Run the spray shop: repair the car and wipe the wanted level for $150. */
export function useSprayShop(save, playerCar, police) {
  if (!playerCar) return { ok: false, message: 'Drive into the spray shop to use it' };
  if (save.cash < SHOPS.spray.price) return { ok: false, message: `Need $${SHOPS.spray.price} for a respray` };
  save.cash -= SHOPS.spray.price;
  playerCar.health = 100;
  playerCar.smoke = 0;
  return { ok: true, message: 'Fresh paint, clean record — wanted level cleared', cleared: true };
}

/** Buy one gun-menu item. Returns { ok, message }. */
export function buyGunItem(save, player, itemId) {
  const item = GUN_MENU.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, message: 'No such item' };
  if (save.cash < item.price) return { ok: false, message: `Need $${item.price}` };
  if (itemId === 'ammo') {
    const def = WEAPONS[player.weapon];
    if (!def || player.weapon === 'fists') return { ok: false, message: 'No weapon to load' };
    save.cash -= item.price;
    player.ammo[player.weapon] = (player.ammo[player.weapon] || 0) + def.ammo;
    return { ok: true, message: `+${def.ammo} rounds for the ${def.name}` };
  }
  const def = WEAPONS[itemId];
  save.cash -= item.price;
  if (!player.weapons.includes(itemId)) player.weapons.push(itemId);
  if (!save.weapons.includes(itemId)) save.weapons.push(itemId);
  player.ammo[itemId] = (player.ammo[itemId] || 0) + def.ammo;
  save.ammo[itemId] = player.ammo[itemId];
  player.weapon = itemId;
  return { ok: true, message: `Bought the ${def.name}` };
}

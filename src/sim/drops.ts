/**
 * Items lying in the world: enemy loot, tree and chest overflow, items the player drops. They fall, rest on
 * the ground, drift to the player when close and are picked up if the pack has room. Pure and deterministic.
 */
import type { ItemId } from './tiles';
import type { World } from './world';

export interface Drop {
  item: ItemId;
  n: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  /** Seconds before the player can pick it up again (after dropping it on purpose). */
  noPick: number;
}

export const MAGNET_R = 3;
export const PICK_R = 0.8;
export const DROP_LIFE = 300;
export const MAX_DROPS = 150;
const G = 30;

export function makeDrop(item: ItemId, n: number, x: number, y: number, vx = 0, vy = -4, noPick = 0): Drop {
  return { item, n, x, y, vx, vy, age: 0, noPick };
}

/** Add a drop, merging with a nearby stack of the same item and capping the total count. */
export function addDrop(list: Drop[], d: Drop): void {
  for (const o of list) {
    if (o.item === d.item && Math.abs(o.x - d.x) < 1 && Math.abs(o.y - d.y) < 1 && o.noPick <= 0 && d.noPick <= 0) {
      o.n += d.n;
      o.age = Math.min(o.age, d.age);
      return;
    }
  }
  list.push(d);
  if (list.length > MAX_DROPS) list.splice(0, list.length - MAX_DROPS);
}

/**
 * Step all drops. `room` returns how many of an item the pack can take; `take` gives it to the player.
 * Returns the picked-up stacks (for pickup feedback).
 */
export function stepDrops(
  world: World,
  list: Drop[],
  dt: number,
  px: number,
  py: number,
  room: (item: ItemId) => number,
  take: (item: ItemId, n: number) => void,
  magnet = MAGNET_R,
): { item: ItemId; n: number }[] {
  const got: { item: ItemId; n: number }[] = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.age += dt;
    d.noPick = Math.max(0, d.noPick - dt);
    if (d.age > DROP_LIFE || d.y > world.h) {
      list.splice(i, 1);
      continue;
    }
    const dx = px - d.x;
    const dy = py - 0.8 - d.y;
    const dist = Math.hypot(dx, dy);
    const canTake = d.noPick <= 0 && room(d.item) > 0;
    if (canTake && dist < magnet) {
      // Drift toward the player, faster when close.
      const k = 14 / Math.max(0.4, dist);
      d.vx += (dx * k - d.vx) * Math.min(1, 8 * dt);
      d.vy += (dy * k - d.vy) * Math.min(1, 8 * dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (dist < PICK_R) {
        const n = Math.min(d.n, room(d.item));
        take(d.item, n);
        got.push({ item: d.item, n });
        d.n -= n;
        if (d.n <= 0) list.splice(i, 1);
      }
      continue;
    }
    // Simple ballistic fall onto solid ground with friction.
    d.vy = Math.min(20, d.vy + G * dt);
    const nx = d.x + d.vx * dt;
    if (!world.isSolid(Math.floor(nx), Math.floor(d.y - 0.1))) d.x = nx;
    else d.vx = 0;
    const ny = d.y + d.vy * dt;
    if (d.vy > 0 && world.isSolid(Math.floor(d.x), Math.floor(ny))) {
      d.y = Math.floor(ny) - 0.001;
      d.vy = 0;
      d.vx *= 0.8;
    } else if (d.vy < 0 && world.isSolid(Math.floor(d.x), Math.floor(ny - 0.3))) d.vy = 0;
    else d.y = ny;
    if (world.isSolid(Math.floor(d.x), Math.floor(d.y - 0.01))) d.y -= 1; // pushed out if a block was placed on it
  }
  return got;
}

/** The dropped item whose icon is under world point (wx, wy) (icons float about half a tile up), or null. */
export function dropAt(drops: readonly Drop[], wx: number, wy: number, r = 0.6): Drop | null {
  let best: Drop | null = null;
  let bd = r * r;
  for (const d of drops) {
    const dd = (d.x - wx) ** 2 + (d.y - 0.47 - wy) ** 2;
    if (dd <= bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}

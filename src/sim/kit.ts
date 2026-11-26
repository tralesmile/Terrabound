/**
 * Kit (torches, medkits, building pieces) lives in the pack: banking skips it and nothing in the
 * workshop takes it out of the stash. Gifts, quest rewards and what a death keeps land in the stash, so
 * hand them back to the pack. Kit may fill at most half the pack this way, so rewards never block a
 * dive's loot; the rest waits and follows once there is room. Pure.
 */
import { ITEMS, ITEM_IDS, invAdd, invTotal, type Inventory } from './tiles';

export const KIT_SHARE = 0.5;

/** Move kit from stash to pack. Returns how many pieces moved. */
export function restockKit(stash: Inventory, carried: Inventory, packCap: number): number {
  let moved = 0;
  let room = -1;
  for (const id of ITEM_IDS) {
    const have = stash[id] ?? 0;
    if (have <= 0 || !ITEMS[id].kit) continue;
    if (room < 0) room = Math.max(0, Math.floor(packCap * KIT_SHARE) - invTotal(carried));
    const n = Math.min(have, room);
    if (n <= 0) break;
    invAdd(carried, id, n);
    if (have === n) delete stash[id];
    else stash[id] = have - n;
    room -= n;
    moved += n;
  }
  return moved;
}

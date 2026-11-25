/**
 * Placed charges (P12-A explosives part 2): a craftable block that sits inert until a blast or a bolt
 * touches it, then burns a short fuse and goes off, which lights its neighbours in turn (a chain). Pure.
 */
import { T } from './tiles';

export const CHARGE = {
  /** Fuse seconds between a charge being lit and going off. */
  fuse: 0.18,
  /** Blast radius and damage of one charge. */
  radius: 2.0,
  dmg: 14,
  /** Hard cap on live fuses so a huge field cannot stall a frame. */
  maxFuses: 64,
  /** Detonator (G): reach in tiles and the battery it costs; only away from the base. */
  detonateReach: 24,
  detonateCost: 2,
  /** Pressure plate: tiles around the plate in which stepping on it lights charges. */
  plateReach: 6,
};

export interface Fuse {
  x: number;
  y: number;
  t: number;
}

interface TileReader {
  get(x: number, y: number): number;
  set(x: number, y: number, t: number): void;
}

/** Light every charge whose tile centre is within `r` of (x, y): removes the tile and queues a fuse. Returns how many. */
export function igniteWithin(world: TileReader, fuses: Fuse[], x: number, y: number, r: number): number {
  let n = 0;
  for (let ty = Math.floor(y - r); ty <= Math.ceil(y + r); ty++) {
    for (let tx = Math.floor(x - r); tx <= Math.ceil(x + r); tx++) {
      if (world.get(tx, ty) !== T.CHARGE) continue;
      if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) > r) continue;
      if (fuses.length >= CHARGE.maxFuses) return n;
      world.set(tx, ty, T.AIR);
      fuses.push({ x: tx + 0.5, y: ty + 0.5, t: CHARGE.fuse });
      n++;
    }
  }
  return n;
}

/** Burn the fuses down; returns the ones that go off this step (removed from the list). */
export function stepFuses(fuses: Fuse[], dt: number): Fuse[] {
  const fired: Fuse[] = [];
  for (let i = fuses.length - 1; i >= 0; i--) {
    fuses[i].t -= dt;
    if (fuses[i].t <= 0) fired.push(...fuses.splice(i, 1));
  }
  return fired.reverse();
}

/** Plates under a body box (feet row and the row above); lights charges near each one pressed. Returns charges lit. */
export function pressPlates(world: TileReader, fuses: Fuse[], x: number, y: number, halfW: number, h: number): number {
  let n = 0;
  for (let ty = Math.floor(y - h); ty <= Math.floor(y); ty++) {
    for (let tx = Math.floor(x - halfW); tx <= Math.floor(x + halfW); tx++) {
      if (world.get(tx, ty) === T.PLATE) n += igniteWithin(world, fuses, tx + 0.5, ty + 0.5, CHARGE.plateReach);
    }
  }
  return n;
}

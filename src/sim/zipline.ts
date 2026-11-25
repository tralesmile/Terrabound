/**
 * Ziplines (P12-A traversal): place two anchors with a clear run between them and a cable strings
 * itself. Each anchor links to its nearest anchor it can reach, so a row of anchors makes a chain.
 * Riding is free of extra battery: you pay in materials and planning, then climb home fast. Pure.
 */
import { BODY_H, HALF_W } from './physics';
import { T } from './tiles';

export const ZIP = {
  /** Longest cable, in tiles between anchor centres. */
  reach: 32,
  /** Anchors closer than this do not link (a double-placed anchor is not a cable). */
  minLen: 3,
  /** Riding speed, tiles per second. */
  speed: 15,
  /** Grab box: how far sideways the body centre may be from an anchor centre. */
  grabX: 1.1,
  /** Rider's feet hang this far below the cable. */
  hang: 0.5,
  /** Seconds between checks that a ridden cable is still whole. */
  recheck: 0.1,
};

export interface Anchor {
  x: number;
  y: number;
}

export interface Cable {
  a: Anchor;
  b: Anchor;
}

interface ZipWorld {
  get(x: number, y: number): number;
  isSolid(x: number, y: number): boolean;
}

const len = (a: Anchor, b: Anchor): number => Math.hypot(a.x - b.x, a.y - b.y);

/** True when a rider fits along the whole straight run between two anchors. */
export function runClear(world: ZipWorld, a: Anchor, b: Anchor): boolean {
  const steps = Math.max(1, Math.ceil(len(a, b) / 0.25));
  for (let i = 0; i <= steps; i++) {
    const x = a.x + 0.5 + ((b.x - a.x) * i) / steps;
    const feet = a.y + 0.5 + ((b.y - a.y) * i) / steps + ZIP.hang;
    for (let ty = Math.floor(feet - BODY_H + 0.02); ty <= Math.floor(feet - 0.02); ty++) {
      for (let tx = Math.floor(x - HALF_W + 0.02); tx <= Math.floor(x + HALF_W - 0.02); tx++) {
        if (world.isSolid(tx, ty)) return false;
      }
    }
  }
  return true;
}

export function anchorsIn(world: ZipWorld, x0: number, y0: number, x1: number, y1: number): Anchor[] {
  const out: Anchor[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (world.get(x, y) === T.ZIP) out.push({ x, y });
  return out;
}

/** The anchor `a` strings itself to: the nearest one in range with a clear run (ties: scan order). */
function nearestPartner(world: ZipWorld, a: Anchor, all: Anchor[]): Anchor | null {
  const near = all
    .map((o, i) => ({ o, i, d: len(a, o) }))
    .filter((c) => c.d >= ZIP.minLen && c.d <= ZIP.reach)
    .sort((p, q) => p.d - q.d || p.i - q.i);
  return near.find((c) => runClear(world, a, c.o))?.o ?? null;
}

/** All cables among a set of anchors, each listed once. */
export function cablesOf(world: ZipWorld, anchors: Anchor[]): Cable[] {
  const seen = new Set<string>();
  const out: Cable[] = [];
  for (const a of anchors) {
    const b = nearestPartner(world, a, anchors);
    if (!b) continue;
    const [p, q] = a.y < b.y || (a.y === b.y && a.x < b.x) ? [a, b] : [b, a];
    const k = `${p.x},${p.y},${q.x},${q.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ a: p, b: q });
  }
  return out;
}

/** Cables touching a view rectangle (inclusive tiles). Scans two reaches out so edge cables are right. */
export function cablesNear(world: ZipWorld, x0: number, y0: number, x1: number, y1: number): Cable[] {
  const r = ZIP.reach;
  return cablesOf(world, anchorsIn(world, x0 - 2 * r, y0 - 2 * r, x1 + 2 * r, y1 + 2 * r)).filter(
    (c) => Math.max(c.a.x, c.b.x) >= x0 && Math.min(c.a.x, c.b.x) <= x1 && Math.max(c.a.y, c.b.y) >= y0 && Math.min(c.a.y, c.b.y) <= y1,
  );
}

/**
 * The ride on offer to a body standing at (x, feet y): from the anchor it overlaps to a linked one.
 * With two or more cables it goes up (the way home), or down while `down` is held.
 */
export function zipOffer(world: ZipWorld, x: number, y: number, down = false): { from: Anchor; to: Anchor } | null {
  const grab = anchorsIn(world, Math.floor(x - ZIP.grabX - 0.5), Math.floor(y - BODY_H - 0.5), Math.floor(x + ZIP.grabX + 0.5), Math.floor(y + 0.4))
    .filter((a) => Math.abs(a.x + 0.5 - x) <= ZIP.grabX)
    .sort((p, q) => Math.abs(p.x + 0.5 - x) - Math.abs(q.x + 0.5 - x));
  for (const from of grab) {
    const r = ZIP.reach;
    const cables = cablesOf(world, anchorsIn(world, from.x - 2 * r, from.y - 2 * r, from.x + 2 * r, from.y + 2 * r));
    const ends = cables.flatMap((c) => (c.a.x === from.x && c.a.y === from.y ? [c.b] : c.b.x === from.x && c.b.y === from.y ? [c.a] : []));
    if (!ends.length) continue;
    ends.sort((p, q) => (down ? q.y - p.y : p.y - q.y));
    return { from, to: ends[0] };
  }
  return null;
}

export interface Ride {
  from: Anchor;
  to: Anchor;
  /** Tiles travelled along the cable. */
  s: number;
  check: number;
}

export interface RideStep {
  x: number;
  /** Feet height. */
  y: number;
  vx: number;
  vy: number;
  done: boolean;
}

/** Advance a ride; null when the cable broke (an anchor mined or the run blocked). */
export function stepRide(world: ZipWorld, ride: Ride, dt: number): RideStep | null {
  const { from, to } = ride;
  ride.check -= dt;
  if (ride.check <= 0) {
    ride.check = ZIP.recheck;
    if (world.get(from.x, from.y) !== T.ZIP || world.get(to.x, to.y) !== T.ZIP || !runClear(world, from, to)) return null;
  }
  const total = len(from, to);
  ride.s = Math.min(total, ride.s + ZIP.speed * dt);
  const k = ride.s / total;
  return {
    x: from.x + 0.5 + (to.x - from.x) * k,
    y: from.y + 0.5 + (to.y - from.y) * k + ZIP.hang,
    vx: ((to.x - from.x) / total) * ZIP.speed,
    vy: ((to.y - from.y) / total) * ZIP.speed,
    done: ride.s >= total,
  };
}

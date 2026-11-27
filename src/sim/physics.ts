import type { World } from './world';

/** Player collision box in tile units. (x, y) is bottom-centre (feet). */
export const HALF_W = 0.35;
export const BODY_H = 1.8;
const EPS = 1e-9;

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export function boxCollides(world: World, x: number, y: number): boolean {
  const x0 = Math.floor(x - HALF_W);
  const x1 = Math.floor(x + HALF_W - EPS);
  const y0 = Math.floor(y - BODY_H);
  const y1 = Math.floor(y - EPS);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (world.isSolid(tx, ty)) return true;
    }
  }
  return false;
}

/** Move along X, snapping flush against the wall. Returns true if blocked. */
export function moveX(world: World, b: Body, dx: number): boolean {
  const sign = Math.sign(dx);
  let remaining = Math.abs(dx);
  while (remaining > EPS) {
    const step = Math.min(remaining, 0.25);
    remaining -= step;
    b.x += sign * step;
    if (boxCollides(world, b.x, b.y)) {
      b.x = sign > 0 ? Math.floor(b.x + HALF_W) - HALF_W : Math.floor(b.x - HALF_W) + 1 + HALF_W;
      b.vx = 0;
      return true;
    }
  }
  return false;
}

/** Move along Y. Sets onGround when landing. Returns true if blocked. */
export function moveY(world: World, b: Body, dy: number, drop = false): boolean {
  const sign = Math.sign(dy);
  let remaining = Math.abs(dy);
  while (remaining > EPS) {
    const step = Math.min(remaining, 0.25);
    remaining -= step;
    const prev = b.y;
    b.y += sign * step;
    if (sign > 0 && !drop && landsOnPlatform(world, b, prev)) {
      b.y = Math.floor(b.y - EPS);
      b.onGround = true;
      b.vy = 0;
      return true;
    }
    if (boxCollides(world, b.x, b.y)) {
      if (sign > 0) {
        b.y = Math.floor(b.y - EPS);
        b.onGround = true;
      } else {
        b.y = Math.floor(b.y - BODY_H) + 1 + BODY_H;
      }
      b.vy = 0;
      return true;
    }
  }
  return false;
}

/** One-way platforms: land only if the feet were at or above the tile top before this step. */
function landsOnPlatform(world: World, b: Body, prevY: number): boolean {
  const ty = Math.floor(b.y - EPS);
  if (prevY > ty + EPS || b.y <= ty) return false;
  const x0 = Math.floor(b.x - HALF_W);
  const x1 = Math.floor(b.x + HALF_W - EPS);
  for (let tx = x0; tx <= x1; tx++) if (world.isOneWay(tx, ty)) return true;
  return false;
}

/** True if the body's torso overlaps a climbable tile (ladder). */
export function onLadder(world: World, b: Body): boolean {
  const mid = Math.floor(b.y - BODY_H / 2);
  return world.isClimb(Math.floor(b.x), mid) || world.isClimb(Math.floor(b.x), Math.floor(b.y - 0.1));
}

export function probeGround(world: World, b: Body, drop = false): boolean {
  if (boxCollides(world, b.x, b.y + 0.02)) return true;
  return !drop && landsOnPlatform(world, b, b.y);
}

/** Push the body up out of any solid it was spawned or teleported into (edge case: placed block under feet). */
export function unstick(world: World, b: Body, maxRows = 6): boolean {
  for (let i = 0; i <= maxRows * 4; i++) {
    if (!boxCollides(world, b.x, b.y)) return true;
    b.y -= 0.25;
  }
  return !boxCollides(world, b.x, b.y);
}

/** Render ease for an auto-step: smoothstep of the lift left (1 = just stepped, drawn a full tile lower). */
export function stepEase(lift: number): number {
  const l = Math.max(0, Math.min(1, lift));
  return l * l * (3 - 2 * l);
}

/** How far past the wall face an auto-step moves the body (tiles), so it ends up over the ledge. */
export const STEP_NUDGE = 0.06;

/**
 * Auto-step (Starbound-style): a grounded body pressed against a one-tile ledge with headroom climbs
 * onto it instead of stopping dead. Taller walls, low ceilings and ledges with no room above refuse.
 * Returns true when the body moved up one tile.
 */
export function stepUp(world: World, b: Body, dir: number): boolean {
  if (dir === 0) return false;
  const nx = b.x + Math.sign(dir) * STEP_NUDGE;
  if (!boxCollides(world, nx, b.y)) return false;
  const ny = b.y - 1;
  if (boxCollides(world, b.x, ny) || boxCollides(world, nx, ny)) return false;
  b.x = nx;
  b.y = ny;
  b.onGround = true;
  return true;
}

/**
 * Movement forgiveness (Celeste-style). Both helpers only ever move the body a fraction of a tile into
 * space that is already free, so nothing passes through a block.
 */
export const FORGIVE = {
  /** A rising head clipping a corner by up to this much (tiles) slides round it. */
  corner: 0.3,
  /** Sideways speed of the hold-down slide into a one-wide hole (tiles per second). */
  dropSlide: 6,
  /** An airborne body whose feet miss a ledge top by up to this much (tiles) pops up onto it. */
  ledge: 0.25,
  /** No ledge pop when falling faster than this (tiles per second), so it never cancels fall damage. */
  ledgeMaxFall: 12,
} as const;

/**
 * Ledge pop-up: a jump that comes up a hair short of a ledge (or drifts into its lip on the way
 * down) puts the feet on top instead of dropping. `dir` is the held direction. Rising speed is
 * kept; falling speed is cleared. Returns true when the body moved onto the ledge.
 */
export function ledgePop(world: World, b: Body, dir: number): boolean {
  if (dir === 0 || b.vy > FORGIVE.ledgeMaxFall) return false;
  const nx = b.x + Math.sign(dir) * STEP_NUDGE;
  if (!boxCollides(world, nx, b.y)) return false;
  const top = Math.floor(b.y);
  const short = b.y - top;
  if (short <= EPS || short > FORGIVE.ledge) return false;
  if (boxCollides(world, b.x, top) || boxCollides(world, nx, top)) return false;
  b.x = nx;
  b.y = top;
  b.vy = Math.min(0, b.vy);
  return true;
}

/**
 * Corner correction: when this frame's upward move would clip a block by a little, shift sideways so
 * the jump carries on (digging up a one-wide shaft no longer needs pixel aim). `push` is the held
 * direction: the shift never goes against it. Returns true when the body moved.
 */
export function cornerNudge(world: World, b: Body, dy: number, push = 0): boolean {
  if (!(dy < 0)) return false;
  const ny = b.y + Math.max(dy, -0.25);
  if (!boxCollides(world, b.x, ny)) return false;
  for (let off = 0.05; off <= FORGIVE.corner + EPS; off += 0.05) {
    for (const side of [1, -1]) {
      if (push * side < 0) continue;
      const nx = b.x + side * off;
      if (boxCollides(world, nx, b.y) || boxCollides(world, nx, ny)) continue;
      b.x = nx;
      return true;
    }
  }
  return false;
}

/**
 * Drop-in: standing with the body's middle over a one-wide hole but caught on its rim, holding down
 * slides the body over the hole so it falls in. Returns true while it is sliding.
 */
export function dropIn(world: World, b: Body, dt: number): boolean {
  const col = Math.floor(b.x);
  const below = Math.floor(b.y + 0.02);
  if (world.isSolid(col, below) || world.isOneWay(col, below)) return false;
  const target = Math.max(col + HALF_W, Math.min(col + 1 - HALF_W, b.x));
  const dx = target - b.x;
  if (Math.abs(dx) < EPS) return false;
  const nx = b.x + Math.sign(dx) * Math.min(Math.abs(dx), FORGIVE.dropSlide * dt);
  if (boxCollides(world, nx, b.y)) return false;
  b.x = nx;
  return true;
}

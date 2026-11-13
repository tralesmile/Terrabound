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

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
export function moveY(world: World, b: Body, dy: number): boolean {
  const sign = Math.sign(dy);
  let remaining = Math.abs(dy);
  while (remaining > EPS) {
    const step = Math.min(remaining, 0.25);
    remaining -= step;
    b.y += sign * step;
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

export function probeGround(world: World, b: Body): boolean {
  return boxCollides(world, b.x, b.y + 0.02);
}

/** Push the body up out of any solid it was spawned or teleported into (edge case: placed block under feet). */
export function unstick(world: World, b: Body, maxRows = 6): boolean {
  for (let i = 0; i <= maxRows * 4; i++) {
    if (!boxCollides(world, b.x, b.y)) return true;
    b.y -= 0.25;
  }
  return !boxCollides(world, b.x, b.y);
}

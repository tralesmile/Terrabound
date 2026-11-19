/** Horizontal movement model v2: linear acceleration and friction, weaker in the air. Pure. */
export const MOVE = {
  groundAccel: 75, // units/s^2 while pressing toward the target speed on the ground
  groundFriction: 85, // deceleration when no input (or input slower than current speed)
  airAccel: 42,
  airDrag: 7, // exponential-ish drag (1/s) with no input in the air: momentum carries
  turnBoost: 1.5, // accel multiplier when input opposes velocity
} as const;

/** Next horizontal velocity given the input direction mx (-1..1) and the speed cap. */
export function stepVx(vx: number, mx: number, speed: number, grounded: boolean, dt: number): number {
  const target = mx * speed;
  if (Math.abs(mx) < 0.1) {
    if (grounded) {
      const f = MOVE.groundFriction * dt;
      return Math.abs(vx) <= f ? 0 : vx - Math.sign(vx) * f;
    }
    return vx * (1 - Math.min(1, MOVE.airDrag * dt));
  }
  const accel = (grounded ? MOVE.groundAccel : MOVE.airAccel) * (vx * mx < 0 ? MOVE.turnBoost : 1);
  const dv = target - vx;
  // Over the cap (dash, launch): bleed off with friction instead of snapping.
  if (Math.sign(dv) !== Math.sign(mx) && Math.abs(vx) > Math.abs(target)) {
    const f = (grounded ? MOVE.groundFriction : MOVE.airDrag * 2) * dt;
    return vx - Math.sign(vx) * Math.min(f, Math.abs(vx) - Math.abs(target));
  }
  const step = accel * dt;
  return Math.abs(dv) <= step ? target : vx + Math.sign(dv) * step;
}

/** Vertical feel: slightly lighter gravity near the apex while jump is held, heavier when diving. */
export const JUMPFEEL = {
  hangBand: 3, // |vy| below this (units/s) counts as the apex
  hangMul: 0.55, // gravity multiplier in the apex band while jump is held
  fastFallMul: 1.6, // gravity multiplier when holding down while falling
} as const;

/** Gravity multiplier for this frame (1 = normal). */
export function gravityMul(vy: number, jumpHeld: boolean, down: boolean): number {
  if (vy > 0 && down) return JUMPFEEL.fastFallMul;
  if (jumpHeld && Math.abs(vy) < JUMPFEEL.hangBand) return JUMPFEEL.hangMul;
  return 1;
}

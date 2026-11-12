/**
 * Pickup flyers (Core Keeper / Stardew style): a picked-up item's icon arcs from where it was
 * collected into its hotbar slot (or the bag), and the slot pulses when it lands. Screen space,
 * cosmetic only; the pure maths is here so it can be unit tested without a canvas.
 */

/** Seconds a flyer takes to reach its slot. */
export const FLY_TIME = 0.5;
/** Seconds a slot pulses after an icon lands in it. */
export const PULSE_TIME = 0.25;
/** At most this many icons in flight; older ones land early when a burst exceeds it. */
export const MAX_FLYERS = 14;
/** Extra start delay per icon of the same item already in flight, so bursts trail like a stream. */
export const STAGGER = 0.06;

export interface Flyer {
  item: string;
  /** Start point in CSS px. */
  x0: number;
  y0: number;
  /** Time since spawn (negative while waiting out its stagger delay). */
  t: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Position and scale at progress p (0..1) from (x0, y0) to (x1, y1). It pops up first, then
 * accelerates into the slot along an arc whose height grows with the distance.
 */
export function flyerPos(p: number, x0: number, y0: number, x1: number, y1: number): { x: number; y: number; s: number } {
  const q = Math.max(0, Math.min(1, p));
  const e = q * q * (3 - 2 * q) * 0.35 + q * q * q * 0.65; // slow start, fast finish
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const lift = Math.sin(q * Math.PI) * Math.max(30, dist * 0.35);
  return { x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e - lift, s: 1.25 - 0.55 * q };
}

/** Slot pulse scale-up for the time left on its pulse (0 when idle). */
export function pulseAmount(left: number): number {
  if (left <= 0) return 0;
  const k = Math.min(1, left / PULSE_TIME);
  return Math.sin(k * Math.PI) * 0.18;
}

export class Flyers {
  list: Flyer[] = [];
  /** Pulse time left per slot key (item id or 'inv'). */
  pulse = new Map<string, number>();
  /** Total icons ever launched (e2e reads this). */
  spawned = 0;

  add(item: string, x: number, y: number): void {
    const queued = this.list.filter((f) => f.item === item && f.t < FLY_TIME * 0.5).length;
    if (this.list.length >= MAX_FLYERS) this.list.shift();
    this.list.push({ item, x0: x, y0: y, t: queued > 0 ? -Math.min(0.3, queued * STAGGER) : 0 });
    this.spawned++;
  }

  /** Advance; returns the items that landed this step. `slotOf` maps an item to its pulse key. */
  update(dt: number, slotOf: (item: string) => string = (i) => i): string[] {
    const landed: string[] = [];
    for (const [k, v] of this.pulse) {
      if (v - dt <= 0) this.pulse.delete(k);
      else this.pulse.set(k, v - dt);
    }
    for (const f of this.list) f.t += dt;
    this.list = this.list.filter((f) => {
      if (f.t < FLY_TIME) return true;
      landed.push(f.item);
      this.pulse.set(slotOf(f.item), PULSE_TIME);
      return false;
    });
    return landed;
  }
}

/**
 * Boss health bar juice (UI only): a pale "damage chip" lags behind the health fill, holds briefly after a hit,
 * then drains down to it, so every hit shows how much it took. Pure step so the timing is unit-tested.
 */

/** Seconds the chip holds still after a hit before draining. */
export const CHIP_HOLD = 0.4;
/** How fast the chip drains (fraction of max health per second). */
export const CHIP_DRAIN = 0.6;
/** Health fraction where the boss turns enraged (phase 2); the bar draws a notch there. */
export const PHASE_NOTCH = 0.5;

export interface ChipState {
  /** Where the chip ends (0..1 of max). */
  chip: number;
  /** Health last frame (0..1). */
  last: number;
  /** Seconds left to hold before draining. */
  hold: number;
}

export function newChip(hp: number): ChipState {
  return { chip: hp, last: hp, hold: 0 };
}

/** Advance the chip toward `hp` (0..1). A heal or a new fight snaps it up; a hit holds, then drains. Pure. */
export function stepChip(s: ChipState, hp: number, dt: number): ChipState {
  const h = Math.max(0, Math.min(1, hp));
  if (h >= s.chip) return { chip: h, last: h, hold: 0 };
  let hold = h < s.last - 1e-9 ? CHIP_HOLD : Math.max(0, s.hold - dt);
  let chip = s.chip;
  if (hold <= 0) chip = Math.max(h, chip - CHIP_DRAIN * dt);
  if (chip <= h) hold = 0;
  return { chip, last: h, hold };
}

/** Where the boss bar goes this frame: x, bar top y, width, bar height; `below` when it sits under the HUD stack. */
export interface BossSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  below: boolean;
}

/**
 * Boss bar placement. Wide screens keep the centred bar across the top; when the centre would run into
 * the status block (bars, heal slot, depth line) or the button column, the bar centres in the free gap
 * between them; on phones too narrow for that it drops under the HUD stack (`lowL`..`lowR`, title on
 * top) and the toast column starts below it. Pure so tests can pin every case.
 */
export function bossBarSlot(o: { w: number; u: number; gapL: number; gapR: number; hudLow: number; lowL: number; lowR: number }): BossSlot {
  const { w, u } = o;
  const h = u * 1.2;
  const top = u * 4.2;
  const bw = Math.min(w - u * 14, u * 26);
  const cx = (w - bw) / 2;
  if (bw > 0 && cx >= o.gapL + u * 0.5 && cx + bw <= o.gapR - u * 0.5) return { x: cx, y: top, w: bw, h, below: false };
  const gap = o.gapR - o.gapL - u;
  if (gap >= u * 10) {
    const gw = Math.min(u * 26, gap);
    return { x: o.gapL + u * 0.5 + (gap - gw) / 2, y: top, w: gw, h, below: false };
  }
  return { x: o.lowL, y: o.hudLow + u * 1.45, w: Math.max(u * 6, o.lowR - o.lowL), h, below: true };
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(c: [number, number, number]): string {
  return '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

/** Mix two #rrggbb colours (k = 0 gives a, 1 gives b). Pure. */
export function mixHex(a: string, b: string, k: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k]);
}

/** Relative luminance (0..1) of a #rrggbb colour. Pure. */
export function luma(c: string): number {
  const [r, g, b] = rgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Boss bar colours in the boss's own accent, so each fight reads as its own (green Warden, pink Hollow AI).
 * A near-white accent would vanish against the pale damage chip, so those bosses use their eye colour;
 * phase 2 pushes the fill toward angry red. Pure.
 */
export function barColors(accent: string, eye: string, enraged: boolean): { fill: string; back: string } {
  const base = luma(accent) > 0.85 ? eye : accent;
  const fill = enraged ? mixHex(base, '#ff3a3a', 0.45) : base;
  return { fill, back: mixHex(base, '#000000', 0.72) };
}

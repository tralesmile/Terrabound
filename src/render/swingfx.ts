/**
 * Melee swing trail styling (pure). The arc used to be the same cyan for every weapon; now it is drawn
 * in the weapon's own colour, and a rare or epic prefix adds a wider outer glow in the rarity colour
 * plus sparkles along the arc, so a good roll is visible on every swing.
 */
import type { Rarity } from '../sim/rarity';

export interface SwingLayer {
  /** CSS colour (hex). */
  color: string;
  /** Line width in art pixels. */
  width: number;
  /** Peak alpha at the start of the swing (fades with progress). */
  alpha: number;
  /** Radius multiplier around the base arc radius. */
  r: number;
}

export interface SwingStyle {
  layers: SwingLayer[];
  /** Sparkles drawn along the arc (0 for common). */
  sparkles: number;
}

/** Layers are drawn back to front: rarity glow (if any), weapon colour, bright accent core. */
export function swingStyle(color: string, accent: string, rarity: Rarity, rarityColor: string): SwingStyle {
  const layers: SwingLayer[] = [];
  if (rarity !== 'common') layers.push({ color: rarityColor, width: rarity === 'epic' ? 6 : 4.5, alpha: rarity === 'epic' ? 0.55 : 0.4, r: 1.02 });
  layers.push({ color, width: 2.5, alpha: 0.9, r: 1 });
  layers.push({ color: accent, width: 1, alpha: 1, r: 0.99 });
  return { layers, sparkles: rarity === 'epic' ? 5 : rarity === 'rare' ? 3 : 0 };
}

/**
 * Halo colour and size for a player bolt: the bolt's own colour for a plain gun, the rarity colour and a
 * wider glow for a rare or epic ranged prefix (the shot shows the roll, like the swing trail does).
 */
export function boltHalo(boltColor: string, rarity: Rarity, rarityColor: string): { color: string; radius: number } {
  if (rarity === 'common') return { color: boltColor, radius: 1.1 };
  return { color: rarityColor, radius: rarity === 'epic' ? 1.6 : 1.35 };
}

/** Angles (radians, canvas convention: +y down) of the swept crescent at swing progress k in 0..1. */
export interface SwingSweep {
  /** Leading edge of the blade. */
  head: number;
  /** End of the fading tail (never behind where the swing started). */
  tail: number;
}

/** Total sweep of a swing: from up-forward over the head to down-forward (about 140 degrees). */
export const SWING_SPAN = 2.4;
/** Longest tail the crescent keeps behind the blade. */
export const SWING_TAIL = 1.7;

/**
 * Where the swing smear sits at progress k. Facing right it sweeps clockwise from -1.3 rad (up and
 * ahead) to +1.1 rad (down and ahead); facing left it is mirrored. The tail grows from the start
 * angle so the smear reads as one slash, not a short dash floating in front of the suit.
 */
export function swingSweep(k: number, facing: number): SwingSweep {
  const t = Math.min(1, Math.max(0, k));
  const start = -1.3;
  const headR = start + t * SWING_SPAN;
  const tailR = Math.max(start, headR - SWING_TAIL);
  if (facing >= 0) return { head: headR, tail: tailR };
  return { head: Math.PI - headR, tail: Math.PI - tailR };
}

/**
 * Crescent outline for a slash smear: the outer edge at rOut from tail to head, then the inner edge
 * back. The smear is `thick` deep at the head and tapers to a hairline at the tail.
 * Returns flat [x0, y0, x1, y1, ...] around centre (cx, cy).
 */
export function crescent(cx: number, cy: number, sw: SwingSweep, rOut: number, thick: number, n = 12): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = sw.tail + ((sw.head - sw.tail) * i) / n;
    pts.push(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
  }
  for (let i = n; i >= 0; i--) {
    const f = i / n;
    const a = sw.tail + (sw.head - sw.tail) * f;
    const r = rOut - thick * f * f;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

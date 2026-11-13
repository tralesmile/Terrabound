/**
 * Living water and acid (per-frame, cosmetic). Pure helpers so tests can pin the motion:
 * the surface crest rolls in a travelling wave, glints drift along it, deeper cells shade
 * darker, light ripples (caustics) sway under the surface and acid bubbles rise and pop.
 * Positions are in art px (0-15) inside a 16 px tile.
 */
import { FULL, levelAt } from '../sim/liquids';
import { T } from '../sim/tiles';
import type { World } from '../sim/world';

/** Crest offset (0, 1 or 2 art px below the tile top) for each of the 4 four-px columns of a surface cell. */
export function waveOffsets(time: number, tx: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < 4; c++) {
    const x = tx * 4 + c;
    // Two travelling sines: a long swell and a short chop, so it never looks like a metronome.
    const v = Math.sin(time * 2.1 - x * 0.55) * 0.65 + Math.sin(time * 3.7 + x * 1.3) * 0.35;
    out.push(v > 0.45 ? 0 : v > -0.35 ? 1 : 2);
  }
  return out;
}

/** A glint drifting right along the surface: one per few cells, visible part of the time. */
export function surfaceGlint(time: number, tx: number): { x: number; a: number } | null {
  const phase = (time * 0.35 + tx * 0.61) % 3;
  if (phase > 1) return null;
  return { x: Math.floor(phase * 14), a: Math.sin(phase * Math.PI) };
}

/** A rising acid bubble in this cell (null most of the time); `r` 1 or 2 art px, pops at the top. */
export function acidBubble(time: number, tx: number, ty: number): { x: number; y: number; r: number } | null {
  const period = 2.6 + ((tx * 13 + ty * 7) % 5) * 0.4;
  const phase = ((time + tx * 0.37 + ty * 0.91) % period) / period;
  if (phase > 0.55) return null;
  const y = Math.round(15 - phase / 0.55 * 15);
  return { x: 3 + ((tx * 5 + ty * 3) % 10), y, r: phase > 0.45 ? 2 : 1 };
}

/** n rgba() colours from `a` to `b` ([r, g, b, alpha]), for a smooth depth gradient. */
export function depthRamp(a: [number, number, number, number], b: [number, number, number, number], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1);
    const c = a.map((v, j) => v + (b[j] - v) * k);
    out.push(`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(2)})`);
  }
  return out;
}

/** True when the liquid in (x, y) is still falling (nothing full or solid under it): draw it as a stream. */
export function liquidFalling(world: World, x: number, y: number, t: number): boolean {
  const below = world.get(x, y + 1);
  if (below === T.AIR) return true;
  return below === t && levelAt(world, x, y + 1) < FULL;
}

/** Width in art px of a falling stream carrying `level` sixteenths (always at least a visible trickle). */
export function streamWidth(level: number): number {
  return Math.max(4, Math.min(16, Math.round(4 + level * 0.75)));
}

/** Soft light dapples under a surface: two short dashes per cell that drift and breathe. */
export function causticDapples(time: number, tx: number, ty: number): { x: number; y: number; w: number; a: number }[] {
  const out: { x: number; y: number; w: number; a: number }[] = [];
  for (let k = 0; k < 2; k++) {
    const s = Math.sin(time * 1.3 + tx * 1.7 + ty * 0.6 + k * 2.1);
    out.push({
      x: Math.round((s * 0.5 + 0.5) * 12),
      y: 3 + ((tx * 5 + ty * 3 + k * 7) % 11),
      w: 3 + k,
      a: Number((0.1 + 0.07 * Math.sin(time * 2 + k + tx)).toFixed(3)),
    });
  }
  return out;
}

/**
 * Air cells (0-3) between a falling cell and the next liquid of its kind below: a pour moves in packets,
 * so the stream is drawn across the gap and reads as one rope instead of dashes.
 */
export function streamGap(world: World, x: number, y: number, t: number): number {
  for (let k = 1; k <= 4; k++) {
    const c = world.get(x, y + k);
    if (c === t) return k - 1;
    if (c !== T.AIR) return 0;
  }
  return 0;
}

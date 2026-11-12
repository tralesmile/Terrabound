/**
 * Living water and acid (per-frame, cosmetic). Pure helpers so tests can pin the motion:
 * the surface crest rolls in a travelling wave, glints drift along it, deeper cells shade
 * darker, light ripples (caustics) sway under the surface and acid bubbles rise and pop.
 * Positions are in art px (0-15) inside a 16 px tile.
 */

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

/** Darkening alpha for a liquid cell `depth` cells below the surface (0 = surface). */
export function depthShade(depth: number): number {
  return Math.min(0.42, Math.max(0, depth) * 0.11);
}

/** Faint light ripple under the surface: an x-offset band that sways, or null below 3 cells. */
export function causticBand(time: number, tx: number, depth: number): { x: number; w: number; a: number } | null {
  if (depth < 1 || depth > 3) return null;
  const s = Math.sin(time * 1.6 + tx * 0.9 + depth * 1.7);
  return { x: Math.round(5 + 5 * s), w: 3 + (depth === 1 ? 2 : 0), a: 0.16 / depth };
}

/** A rising acid bubble in this cell (null most of the time); `r` 1 or 2 art px, pops at the top. */
export function acidBubble(time: number, tx: number, ty: number): { x: number; y: number; r: number } | null {
  const period = 2.6 + ((tx * 13 + ty * 7) % 5) * 0.4;
  const phase = ((time + tx * 0.37 + ty * 0.91) % period) / period;
  if (phase > 0.55) return null;
  const y = Math.round(15 - phase / 0.55 * 15);
  return { x: 3 + ((tx * 5 + ty * 3) % 10), y, r: phase > 0.45 ? 2 : 1 };
}

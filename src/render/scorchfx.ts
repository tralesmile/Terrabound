// Charred suit after lava contact: colours darken toward soot and a few embers glow on the sprite.
// Pure helpers (no DOM) so the look is unit-tested; the renderer passes `scorch` in the player pose.

/** Soot the suit fades toward. */
export const SOOT = [34, 24, 20] as const;
/** Ember speckle colours (hot, cooler). */
export const EMBERS = ['#ffb347', '#ff6a2a'] as const;

/** Char strength 0..1 from seconds of scorch left: full for most of it, fading out over the last 0.4 s. */
export function scorchK(left: number): number {
  if (left <= 0) return 0;
  return Math.min(1, left / 0.4);
}

/** Mixes a #rrggbb colour toward soot by k (0..1), keeping at most 30% of its own colour at full char. */
export function charColor(hex: string, k: number): string {
  if (k <= 0 || hex[0] !== '#' || hex.length !== 7) return hex;
  const m = Math.min(1, k) * 0.7;
  const out = [1, 3, 5].map((i, j) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (SOOT[j] - v) * m);
  });
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Integer hash for stable per-pixel ember flicker. */
function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ember colour for art pixel (r, c) at flicker tick `tick`, or null. About 1 in 9 pixels glows at full char. */
export function emberAt(r: number, c: number, tick: number, k: number): string | null {
  if (k <= 0) return null;
  const h = hash(r, c, tick);
  if (h >= 0.11 * k) return null;
  return h < 0.04 * k ? EMBERS[0] : EMBERS[1];
}

/** Builds a charred copy of a palette remap over every colour key the sprite can use. */
export function charRemap(pal: Record<string, string>, remap: Record<string, string>, k: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ch of Object.keys(pal)) out[ch] = charColor(remap[ch] ?? pal[ch], k);
  for (const ch of Object.keys(remap)) out[ch] = charColor(remap[ch], k);
  return out;
}

/**
 * Layer ambient on character sprites: in the deep layers the suit picks up the cave's light colour
 * (circuit green, plasma pink, core violet) so the player sits in the scene instead of reading as a
 * flat warm cut-out. Pure helpers (no DOM) so the tint is unit-tested; the renderer passes it in the pose.
 */

export interface Ambient {
  rgb: readonly [number, number, number];
  /** Mix strength 0..1. */
  k: number;
}

/** Ambient light colour and strength per layer (0 Scrap = none: the surface light stays neutral). */
export const LAYER_AMBIENT: readonly (Ambient | null)[] = [
  null,
  { rgb: [70, 210, 150], k: 0.24 },
  { rgb: [230, 80, 170], k: 0.24 },
  { rgb: [140, 100, 255], k: 0.28 },
];

/** Ambient for a layer index (clamped), or null in the Scrap layer and above. */
export function layerAmbient(layer: number): Ambient | null {
  if (!(layer >= 1)) return null;
  return LAYER_AMBIENT[Math.min(LAYER_AMBIENT.length - 1, Math.floor(layer))];
}

/**
 * Lights a #rrggbb colour with the ambient: mixes toward the colour multiplied by the light (so darks stay
 * dark and shading keeps its order) plus a little of the light itself (so the suit visibly takes its hue).
 */
const memo = new WeakMap<Ambient, Map<string, string>>();

export function ambientColor(hex: string, a: Ambient | null): string {
  if (!a || a.k <= 0 || hex[0] !== '#' || hex.length !== 7) return hex;
  let m = memo.get(a);
  if (!m) memo.set(a, (m = new Map()));
  const hit = m.get(hex);
  if (hit) return hit;
  const lit = mixAmbient(hex, a);
  if (m.size < 4096) m.set(hex, lit);
  return lit;
}

function mixAmbient(hex: string, a: Ambient): string {
  const k = Math.min(1, a.k);
  const out = [1, 3, 5].map((i, j) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    const lit = Math.min(255, (v * a.rgb[j]) / 255 * 1.25 + a.rgb[j] * 0.08);
    return Math.max(0, Math.min(255, Math.round(v + (lit - v) * k * 1.6)));
  });
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Ambient-lit copy of a palette remap over every colour key the sprite can use. */
export function ambientRemap(pal: Record<string, string>, remap: Record<string, string>, a: Ambient | null): Record<string, string> {
  if (!a) return remap;
  const out: Record<string, string> = {};
  for (const ch of Object.keys(pal)) out[ch] = ambientColor(remap[ch] ?? pal[ch], a);
  for (const ch of Object.keys(remap)) out[ch] = ambientColor(remap[ch], a);
  return out;
}

/** Palette keys that glow (eyes, cyan lights): they keep their own colour under the ambient. */
export const GLOW_KEYS = ['e', 'E', 'b'] as const;

/** Ambient-lit remap for creatures and robots: like ambientRemap, but glowing keys stay unlit. */
export function litRemap(pal: Record<string, string>, remap: Record<string, string>, a: Ambient | null): Record<string, string> {
  if (!a) return remap;
  const out = ambientRemap(pal, remap, a);
  for (const k of GLOW_KEYS) if (remap[k] ?? pal[k]) out[k] = remap[k] ?? pal[k];
  return out;
}

/**
 * First-minute controls as keycap chips on a dark strip, instead of one long line of text over the
 * terrain. Layout is pure so it can be tested; ui.ts only draws it.
 */
export interface Hint {
  key: string;
  label: string;
}

/** Seconds of play the strip stays up, and how long it takes to fade at the end. */
export const HINT_TIME = 40;
export const HINT_FADE = 4;

export function hintAlpha(playTime: number): number {
  return Math.max(0, Math.min(1, (HINT_TIME - playTime) / HINT_FADE));
}

/** Keyboard and mouse hints, most important first (narrow screens drop from the end). */
export function deskHints(k: { left: string; right: string; jump: string; inventory: string; interact: string }): Hint[] {
  return [
    { key: `${k.left} ${k.right}`, label: 'move' },
    { key: k.jump, label: 'jump' },
    { key: 'CLICK', label: 'dig' },
    { key: 'R-CLICK', label: 'build' },
    { key: '1-5', label: 'tools' },
    { key: '6-0', label: 'blocks' },
    { key: k.inventory, label: 'pack' },
    { key: k.interact, label: 'use' },
  ];
}

export interface HintChip extends Hint {
  x: number;
  keyW: number;
}

/**
 * Lay the hints out in one centred row no wider than `maxW`. `measure` is text width at the chip font,
 * `u` the HUD unit. Trailing hints that do not fit are dropped.
 */
export function layoutHints(hints: Hint[], measure: (s: string) => number, centre: number, maxW: number, u: number): { x: number; w: number; chips: HintChip[] } {
  const pad = u * 0.35;
  const gap = u * 0.8;
  const sized = hints.map((h) => {
    const keyW = measure(h.key) + pad * 2;
    return { ...h, keyW, w: keyW + pad + measure(h.label) };
  });
  const total = (n: number): number => sized.slice(0, n).reduce((a, c) => a + c.w, 0) + gap * Math.max(0, n - 1) + pad * 2;
  let n = sized.length;
  while (n > 0 && total(n) > maxW) n--;
  const w = n ? total(n) : 0;
  let x = centre - w / 2 + pad;
  const chips = sized.slice(0, n).map((c) => {
    const chip = { key: c.key, label: c.label, keyW: c.keyW, x };
    x += c.w + gap;
    return chip;
  });
  return { x: centre - w / 2, w, chips };
}

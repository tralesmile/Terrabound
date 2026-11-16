/**
 * Trip banked card: a light, non-modal card above the hotbar when loot is banked at the pad.
 * It pairs with the beam-home arrival: the trip gets a payoff without the full death report.
 * Pure layout and timing so they can be unit tested; drawing lives in ui.ts.
 */

/** Seconds the card stays up. */
export const BANK_CARD_LIFE = 4.2;
const IN = 0.28;
const OUT = 0.6;

/** Slide-in (0..1) and opacity (0..1) at a card age; opacity 0 once the card is done. */
export function bankCardFade(age: number): { slide: number; alpha: number } {
  if (age < 0 || age >= BANK_CARD_LIFE) return { slide: 1, alpha: 0 };
  const t = Math.min(1, age / IN);
  const slide = 1 - (1 - t) * (1 - t) * (1 - t);
  const alpha = Math.min(t * 1.5, (BANK_CARD_LIFE - age) / OUT, 1);
  return { slide, alpha: Math.max(0, alpha) };
}

export interface BankCardLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Head line baseline. */
  headY: number;
  /** Chip boxes (top-left, size). */
  chips: { x: number; y: number; w: number; h: number }[];
}

/**
 * Centre the card above the bar (barTop = top of the held-item label), wrapping chips into rows
 * that fit the screen with a u gutter. headW and chipWs are measured text widths.
 */
export function bankCardLayout(w: number, u: number, barTop: number, headW: number, chipWs: number[], slide = 1): BankCardLayout {
  const pad = u * 0.7;
  const gap = u * 0.45;
  const chipH = u * 1.35;
  const maxInner = Math.max(u * 4, w - u * 2 - pad * 2);
  const rows: number[][] = [];
  let row: number[] = [];
  let rowW = 0;
  const widths = chipWs.map((cw) => Math.min(maxInner, cw + u * 0.9));
  widths.forEach((cw, i) => {
    if (row.length > 0 && rowW + gap + cw > maxInner) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    rowW += (row.length > 0 ? gap : 0) + cw;
    row.push(i);
  });
  if (row.length) rows.push(row);
  const rowWidth = (r: number[]): number => r.reduce((a, i) => a + widths[i], 0) + gap * Math.max(0, r.length - 1);
  const inner = Math.min(maxInner, Math.max(headW, ...rows.map(rowWidth), u * 8));
  const cw = inner + pad * 2;
  const headH = u * 1.5;
  const ch = pad + headH + (rows.length ? rows.length * chipH + (rows.length - 1) * gap * 0.6 + gap : 0) + pad * 0.8;
  const x = (w - cw) / 2;
  const rest = barTop - u * 0.5 - ch;
  const y = rest + (1 - slide) * u * 1.5;
  const chips: BankCardLayout['chips'] = [];
  rows.forEach((r, ri) => {
    let cx = x + (cw - rowWidth(r)) / 2;
    const cy = y + pad + headH + gap * 0.6 + ri * (chipH + gap * 0.6);
    for (const i of r) {
      chips[i] = { x: cx, y: cy, w: widths[i], h: chipH };
      cx += widths[i] + gap;
    }
  });
  return { x, y, w: cw, h: ch, headY: y + pad + headH * 0.72, chips };
}

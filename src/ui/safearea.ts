/** Safe-area insets (notch, rounded corners, home bar) and the frame the UI draws in. Pure for tests. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** No inset may eat more than this share of its axis (a bad report must not squash the UI). */
export const MAX_INSET_SHARE = 0.2;

function clean(v: number, axis: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(Math.round(v), Math.floor(axis * MAX_INSET_SHARE));
}

/** The rectangle inside the insets, in CSS px. */
export function safeFrame(w: number, h: number, ins: Insets): { x: number; y: number; w: number; h: number } {
  const top = clean(ins.top, h);
  const bottom = clean(ins.bottom, h);
  const left = clean(ins.left, w);
  const right = clean(ins.right, w);
  return { x: left, y: top, w: Math.max(1, w - left - right), h: Math.max(1, h - top - bottom) };
}

/** Parses "12px" style computed values; anything else is 0. */
export function px(v: string | null | undefined): number {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : 0;
}

/**
 * Suit paints: cosmetic suit colours, one per gold award (Terraria-style vanity for long goals).
 * Pure data. Nothing is sold here and nothing expires; a paint is earned once and kept.
 * Saved as SaveData.paint (v25): a paint id, or null for the default look (colour follows armour tier).
 */
import type { Awards } from './achievements';

export interface PaintDef {
  id: string;
  name: string;
  /** Gold award that unlocks it. */
  award: string;
  /** Suit main and shade colours. */
  c1: string;
  c2: string;
}

export const PAINTS: readonly PaintDef[] = [
  { id: 'bedrock', name: 'Bedrock', award: 'dig3', c1: '#6a7080', c2: '#40444f' },
  { id: 'magma', name: 'Magma', award: 'deep3', c1: '#ff6a2a', c2: '#b8341a' },
  { id: 'warpaint', name: 'Warpaint', award: 'kill3', c1: '#d8403f', c2: '#8a2224' },
  { id: 'scholar', name: 'Scholar', award: 'sci2', c1: '#36d0d8', c2: '#1f8a90' },
  { id: 'gilded', name: 'Gilded', award: 'up2', c1: '#ffd23a', c2: '#c9961a' },
  { id: 'hollow', name: 'Hollow', award: 'win', c1: '#f2eeff', c2: '#b88cff' },
];

/** What a paint can be applied to: the suit, the helmet shell, or every vehicle hull. */
export type PaintSlot = 'suit' | 'helm' | 'ride';
export const PAINT_SLOTS: readonly PaintSlot[] = ['suit', 'helm', 'ride'];
export const PAINT_SLOT_NAMES: Record<PaintSlot, string> = { suit: 'Suit', helm: 'Helmet', ride: 'Vehicle' };

export const PAINT_IDS: readonly string[] = PAINTS.map((p) => p.id);

export function paintDef(id: string | null | undefined): PaintDef | undefined {
  return id ? PAINTS.find((p) => p.id === id) : undefined;
}

/** Paints the player has earned, in list order. */
export function unlockedPaints(aw: Readonly<Awards>): PaintDef[] {
  return PAINTS.filter((p) => aw.done.includes(p.award));
}

/** The paint to wear: the chosen one if earned, else null (default look). */
export function activePaint(aw: Readonly<Awards>, chosen: string | null): PaintDef | null {
  const p = paintDef(chosen);
  return p && aw.done.includes(p.award) ? p : null;
}

/** Next choice in the cycle default -> each earned paint -> default. */
export function nextPaint(aw: Readonly<Awards>, chosen: string | null): string | null {
  const list = unlockedPaints(aw).map((p) => p.id);
  if (list.length === 0) return null;
  const i = chosen ? list.indexOf(chosen) : -1;
  return i + 1 < list.length ? list[i + 1] : null;
}

/** Sanitise a saved paint: a known id or null. */
export function sanitizePaint(v: unknown): string | null {
  return typeof v === 'string' && PAINT_IDS.includes(v) ? v : null;
}

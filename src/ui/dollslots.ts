/**
 * Equipment sockets under the character in the inventory: the five worn slots, a gap, then the
 * accessory sockets. Pure layout so the UI and tests agree on where each socket is.
 */
import { ACC_SLOTS, type GearSlot } from '../sim/gear';

export type DollKey = { slot: Exclude<GearSlot, 'melee' | 'ranged' | 'vehicle' | 'acc'> } | { acc: number };

export interface DollRect {
  key: DollKey;
  x: number;
  y: number;
  size: number;
  /** Short label drawn in an empty socket. */
  label: string;
}

export const DOLL_SLOTS = ['head', 'body', 'feet', 'back', 'pet'] as const;
const LABEL: Record<(typeof DOLL_SLOTS)[number], string> = { head: 'HEAD', body: 'BODY', feet: 'FEET', back: 'BACK', pet: 'PET' };

/** Sockets in one row across `w` px starting at (x, y); the accessory group sits after a wider gap. */
export function dollLayout(x: number, y: number, w: number, maxSize: number): DollRect[] {
  const n = DOLL_SLOTS.length + ACC_SLOTS;
  const gap = Math.max(3, Math.round(w * 0.012));
  const groupGap = gap * 3;
  const size = Math.max(16, Math.min(maxSize, Math.floor((w - gap * (n - 2) - groupGap) / n)));
  const out: DollRect[] = [];
  let cx = x;
  DOLL_SLOTS.forEach((slot) => {
    out.push({ key: { slot }, x: cx, y, size, label: LABEL[slot] });
    cx += size + gap;
  });
  cx += groupGap - gap;
  for (let i = 0; i < ACC_SLOTS; i++) {
    out.push({ key: { acc: i }, x: cx, y, size, label: `ACC${i + 1}` });
    cx += size + gap;
  }
  return out;
}

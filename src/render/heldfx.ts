/**
 * The tool drawn in the suit's hand (pure). The blade and pistol used to be the same cyan blade and
 * yellow pistol whatever was equipped; now the hand shows the equipped weapon in its own colours, and a
 * rare or epic prefix rims it in the rarity colour (epic pulses), so a good roll shows while walking.
 */
import { GEAR, type GearId } from '../sim/gear';
import { RARITY, rarityOf, type PrefixId } from '../sim/rarity';

export interface HeldArt {
  /** Icon id to draw (a gear id for weapons, else the tool). */
  icon: string;
  /** Rarity rim colour (none for common or non-weapons). */
  rim?: string;
  /** Rim alpha at time t (epic pulses, rare is steady). */
  rimAlpha: number;
}

export function heldArt(tool: string, melee: GearId | undefined, ranged: GearId | undefined, prefixOf: (id: GearId) => PrefixId | undefined, t: number): HeldArt {
  const id = tool === 'blade' ? melee : tool === 'pistol' ? ranged : undefined;
  if (!id || !GEAR[id]) return { icon: tool, rimAlpha: 0 };
  const rar = rarityOf(prefixOf(id));
  if (rar === 'common') return { icon: id, rimAlpha: 0 };
  const rimAlpha = rar === 'epic' ? 0.55 + 0.35 * Math.sin(t * 5) : 0.6;
  return { icon: id, rim: RARITY[rar].color, rimAlpha };
}

/** Pixels just outside an icon's drawn shape (4-neighbour), the 1 px rim a rarity glow is drawn on. */
export function outlinePixels(rows: readonly string[], size: number): { c: number; r: number }[] {
  const on = (c: number, r: number): boolean => r >= 0 && r < rows.length && c >= 0 && c < (rows[r]?.length ?? 0) && rows[r][c] !== ' ';
  const out: { c: number; r: number }[] = [];
  for (let r = -1; r <= size; r++)
    for (let c = -1; c <= size; c++) {
      if (on(c, r)) continue;
      if (on(c - 1, r) || on(c + 1, r) || on(c, r - 1) || on(c, r + 1)) out.push({ c, r });
    }
  return out;
}

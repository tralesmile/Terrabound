/**
 * Melee swing trail styling (pure). The arc used to be the same cyan for every weapon; now it is drawn
 * in the weapon's own colour, and a rare or epic prefix adds a wider outer glow in the rarity colour
 * plus sparkles along the arc, so a good roll is visible on every swing.
 */
import type { Rarity } from '../sim/rarity';

export interface SwingLayer {
  /** CSS colour (hex). */
  color: string;
  /** Line width in art pixels. */
  width: number;
  /** Peak alpha at the start of the swing (fades with progress). */
  alpha: number;
  /** Radius multiplier around the base arc radius. */
  r: number;
}

export interface SwingStyle {
  layers: SwingLayer[];
  /** Sparkles drawn along the arc (0 for common). */
  sparkles: number;
}

/** Layers are drawn back to front: rarity glow (if any), weapon colour, bright accent core. */
export function swingStyle(color: string, accent: string, rarity: Rarity, rarityColor: string): SwingStyle {
  const layers: SwingLayer[] = [];
  if (rarity !== 'common') layers.push({ color: rarityColor, width: rarity === 'epic' ? 6 : 4.5, alpha: rarity === 'epic' ? 0.55 : 0.4, r: 1.02 });
  layers.push({ color, width: 2.5, alpha: 0.9, r: 1 });
  layers.push({ color: accent, width: 1, alpha: 1, r: 0.99 });
  return { layers, sparkles: rarity === 'epic' ? 5 : rarity === 'rare' ? 3 : 0 };
}

/**
 * Halo colour and size for a player bolt: the bolt's own colour for a plain gun, the rarity colour and a
 * wider glow for a rare or epic ranged prefix (the shot shows the roll, like the swing trail does).
 */
export function boltHalo(boltColor: string, rarity: Rarity, rarityColor: string): { color: string; radius: number } {
  if (rarity === 'common') return { color: boltColor, radius: 1.1 };
  return { color: rarityColor, radius: rarity === 'epic' ? 1.6 : 1.35 };
}

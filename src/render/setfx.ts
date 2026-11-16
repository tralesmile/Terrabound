/**
 * Full-set aura (pure). When every piece of an armour set is worn, the suit gets a faint breathing glow
 * in the set colour and a few motes rising from the boots, so a completed set reads at a glance
 * (Terraria set bonuses have a visual tell; before this a full set looked like any loadout).
 */
import { SETS, type SetState } from '../sim/sets';

export interface AuraMote {
  /** Offset from the feet in art pixels (x across, y up). */
  dx: number;
  dy: number;
  /** 0..1 opacity. */
  a: number;
}

export interface SetAura {
  color: string;
  /** Glow opacity, breathing between about 0.12 and 0.28. */
  alpha: number;
  motes: AuraMote[];
}

/** Seconds for a mote to rise from the boots to above the helm. */
export const MOTE_RISE = 1.6;
export const MOTE_COUNT = 4;
/** How high a mote rises (art px). */
const RISE = 26;

/** The aura for the first fully worn set, or null when no set is complete. */
export function setAura(states: SetState[], time: number): SetAura | null {
  const full = states.find((s) => s.worn >= SETS[s.id].pieces.length);
  if (!full) return null;
  const motes: AuraMote[] = [];
  for (let i = 0; i < MOTE_COUNT; i++) {
    const p = (((time / MOTE_RISE + i / MOTE_COUNT) % 1) + 1) % 1;
    motes.push({
      dx: [-6, 5, -3, 7][i] + Math.sin(time * 3 + i * 1.7) * 1.5,
      dy: p * RISE,
      // fade in over the first fifth, out over the last half
      a: Math.min(1, p * 5) * Math.min(1, (1 - p) * 2),
    });
  }
  return { color: SETS[full.id].color, alpha: 0.2 + 0.08 * Math.sin(time * 2.5), motes };
}

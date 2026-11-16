/**
 * Beam-home effects (cosmetic). Recall used to be a HUD fill and a particle puff: nothing in the
 * world showed the player was being beamed, and arriving at the pad was a teleport pop. Now a
 * thin column of light gathers over the player while the beam charges, and on arrival a tall
 * pillar slams down onto the landing ring and fades, so coming home feels like an arrival.
 * Pure helpers (all sizes in tiles) so tests can pin the timing; the renderer draws them.
 */

/** How long the arrival pillar lasts (s). */
export const ARRIVE_T = 0.75;

export interface BeamShape {
  /** 0..1 overall opacity. */
  alpha: number;
  /** Half width of the bright core in tiles. */
  half: number;
  /** Height above the feet in tiles. */
  height: number;
  /** Radius of the ground ring in tiles (0 = none). */
  ring: number;
}

const NONE: BeamShape = { alpha: 0, half: 0, height: 0, ring: 0 };

/**
 * Charging column over the player for recall progress p (0..1): starts as a faint hair-thin line,
 * widens and brightens, and the ground ring tightens toward the feet as the beam locks on.
 */
export function chargeBeam(p: number): BeamShape {
  if (!(p > 0)) return NONE;
  const k = Math.min(1, p);
  return {
    alpha: 0.18 + 0.5 * k,
    half: 0.08 + 0.42 * k * k,
    height: 6 + 10 * k,
    ring: 1.6 - 1.1 * k,
  };
}

/**
 * Arrival pillar t seconds after landing: full width for the first ~0.1 s (the slam), then it
 * narrows to a thread and fades by ARRIVE_T while a ground ring rolls outward along the deck.
 */
export function arrivalBeam(t: number): BeamShape {
  if (t < 0 || t >= ARRIVE_T) return NONE;
  const u = t / ARRIVE_T;
  const slam = t < 0.1 ? 1 : 1 - (t - 0.1) / (ARRIVE_T - 0.1);
  return {
    alpha: 0.9 * slam,
    half: 0.12 + 0.68 * slam * slam,
    height: 18,
    ring: 0.6 + 3.4 * Math.sqrt(u),
  };
}

/** Vertical positions (tiles above the feet, 0..height) of motes rising inside a beam at time `time`. */
export function beamMotes(time: number, height: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const phase = (time * 0.9 + i / n) % 1;
    out.push(phase * height);
  }
  return out;
}

/** How long a boss-drop loot beam stands (s). */
export const LOOT_T = 3.2;

/**
 * Loot beam over a boss-dropped accessory, t seconds after the drop (Diablo/Terraria rarity beam):
 * shoots up over the first 0.25 s, holds with a slow breathing pulse, then fades over the last 0.8 s.
 * The ring is the gem's halo at the base.
 */
export function lootBeam(t: number): BeamShape {
  if (t < 0 || t >= LOOT_T) return NONE;
  const rise = Math.min(1, t / 0.25);
  const fade = t > LOOT_T - 0.8 ? (LOOT_T - t) / 0.8 : 1;
  const pulse = 0.85 + 0.15 * Math.sin(t * 6);
  return {
    alpha: 0.85 * fade * pulse,
    half: 0.28 + 0.1 * pulse,
    height: 14 * rise,
    ring: 0.9 + 0.3 * pulse,
  };
}

/** Parse '#rrggbb' to [r, g, b] (falls back to gold). */
export function hexRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [255, 210, 58];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

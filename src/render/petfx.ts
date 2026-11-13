/**
 * Pet swimming (cosmetic, render only). A pet that trails the player into a pool paddles instead of
 * hovering: it bobs slowly, leans head-first toward the way it faces, kicks or spins a rear prop,
 * and leaks an air bubble now and then; at the surface it paddles faster and leaves a little wake.
 * Pure so tests can pin the pose.
 */

export type PetWater = 'dry' | 'surface' | 'under';

export interface PetSwimPose {
  /** Vertical offset in whole art px. */
  bob: number;
  /** Body lean in radians (positive tips the nose down toward the facing side). */
  tilt: number;
  /** Paddle frame (legs or prop blades), 0 or 1. */
  paddle: 0 | 1;
  /** A rising air bubble (art px offset from the pet centre), or null. */
  bubble: { dx: number; dy: number; alpha: number } | null;
  /** Draw a wake on the surface line. */
  wake: boolean;
}

/** Seconds between air bubbles while under. */
export const PET_BUBBLE_PERIOD = 1.3;
/** Art px a bubble rises before it pops. */
export const PET_BUBBLE_RISE = 12;

/** Where the pet is: 'under' when its centre and the cell just above are liquid, 'surface' when only its centre is. */
export function petWater(centreLiquid: boolean, aboveLiquid: boolean): PetWater {
  if (!centreLiquid) return 'dry';
  return aboveLiquid ? 'under' : 'surface';
}

export function petSwimPose(time: number, water: PetWater, facing: 1 | -1): PetSwimPose {
  if (water === 'dry') return { bob: 0, tilt: 0, paddle: 0, bubble: null, wake: false };
  if (water === 'surface') {
    return { bob: Math.round(Math.sin(time * 3.2)), tilt: 0, paddle: Math.floor(time * 8) % 2 === 0 ? 0 : 1, bubble: null, wake: true };
  }
  const ph = (time / PET_BUBBLE_PERIOD) % 1;
  return {
    bob: Math.round(Math.sin(time * 2.2) * 1.5),
    tilt: facing * 0.3,
    paddle: Math.floor(time * 6) % 2 === 0 ? 0 : 1,
    bubble: ph < 0.8 ? { dx: facing * 2 + Math.round(Math.sin(time * 7) * 0.8), dy: -3 - Math.round((ph / 0.8) * PET_BUBBLE_RISE), alpha: 1 - ph / 0.8 } : null,
    wake: false,
  };
}

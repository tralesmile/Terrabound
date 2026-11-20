/**
 * Enemy pattern teaching (P12-A): the first wild enemy of each kind a save ever meets is a "teacher".
 * When it first comes into view the HUD names its pattern in one line, and its first touch is harmless
 * (a soft shove, no damage), so the player learns the move before it can hurt. Pure, no DOM, no randomness.
 */
import { ENEMIES, type Enemy, type EnemyKind } from './enemies';

/** One short line per kind: what it does and how to beat it (max two lines on a phone). */
export const TEACH: Record<EnemyKind, string> = {
  crawler: 'Scrap crawler: patrols, charges when level with you. Jump it or strike first.',
  flyer: 'Drone wisp: floats straight at you. Shoot it or swing as it closes in.',
  vine: 'Vine stalker: fast jungle runner. Hit it, step back, hit again.',
  mite: 'Shard mite: crouches, then leaps. Step away when it crouches.',
  ember: 'Ember wisp: quick and fiery. Keep moving and shoot it down.',
  hulk: 'Frost hulk: rears up, then slams the ground. Jump or back off when it rears.',
};

/** Tiles from the player at which a teacher counts as met (inside the usual camera view). */
export const TEACH_RANGE = 9;

/** Horizontal shove (tiles/s) from a teacher's harmless first touch; a real hit uses 8. */
export const TEACH_SHOVE = 5;

const KINDS = Object.keys(ENEMIES) as EnemyKind[];

/** Kinds already met, deduplicated, unknown ids dropped. Never throws. */
export function sanitizeMet(v: unknown): EnemyKind[] {
  if (!Array.isArray(v)) return [];
  const out: EnemyKind[] = [];
  for (const k of v.slice(0, 64)) if (typeof k === 'string' && (KINDS as string[]).includes(k) && !out.includes(k as EnemyKind)) out.push(k as EnemyKind);
  return out;
}

/** True when a freshly spawned wild enemy of `kind` should teach (the save has never met one). */
export function shouldTeach(met: readonly EnemyKind[], kind: EnemyKind): boolean {
  return !met.includes(kind);
}

/** The nearest teacher of a kind not met yet within TEACH_RANGE of the player's feet, or null. */
export function firstMeet(met: readonly EnemyKind[], enemies: readonly Enemy[], px: number, py: number): Enemy | null {
  let best: Enemy | null = null;
  let bestD = TEACH_RANGE;
  for (const e of enemies) {
    if (!e.teach || e.raid || e.hp <= 0 || met.includes(e.kind)) continue;
    const d = Math.hypot(e.x - px, e.y - py);
    if (d <= bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

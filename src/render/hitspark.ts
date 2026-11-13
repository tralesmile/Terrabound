/** Boss hit sparks (render only): a spray in the boss's own colours from where the hit landed. */
import { BOSSES, type BossId } from '../sim/bosses';

export interface SparkSpec {
  /** Spark count; bigger hits throw more (capped). */
  n: number;
  /** Palette: accent first (most sparks), then white hot, then the eye colour. */
  colors: string[];
  /** Launch speed in tiles/s. */
  speed: number;
}

/** Sparks for a hit of `dmg` on boss `id`. */
export function hitSparkSpec(id: BossId, dmg: number): SparkSpec {
  const d = BOSSES[id];
  const n = Math.max(5, Math.min(14, Math.round(4 + dmg / 4)));
  return { n, colors: [d.accent, d.accent, '#ffffff', d.eye], speed: 5 + Math.min(4, dmg / 12) };
}

export interface SparkVel {
  vx: number;
  vy: number;
}

/**
 * Velocities for `n` sparks fanning out of the hit face toward `dir` (+1 right, -1 left):
 * a 100-degree cone centred a little above horizontal, so sparks fly back at the attacker.
 * `rand` returns 0..1 (Math.random in the game, a seeded RNG in tests).
 */
export function sparkVelocities(dir: number, n: number, speed: number, rand: () => number): SparkVel[] {
  const out: SparkVel[] = [];
  const side = dir >= 0 ? 1 : -1;
  const half = (50 * Math.PI) / 180;
  for (let i = 0; i < n; i++) {
    const a = -0.25 + (rand() * 2 - 1) * half;
    const v = speed * (0.55 + rand() * 0.7);
    out.push({ vx: side * Math.cos(a) * v, vy: Math.sin(a) * v - 1.5 });
  }
  return out;
}

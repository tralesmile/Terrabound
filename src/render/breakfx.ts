/**
 * Per-material block-break debris (cosmetic). Breaking dirt throws heavy clods, metal and ore throw
 * hot sparks plus a few chunks, crystal and ice throw bright glinting shards, wood throws splinters,
 * leaves and plants flutter down. Pure: the random source is passed in, so tests can pin it.
 */
import { T } from '../sim/tiles';
import type { Particle } from './fx';
import { lighten } from './fx';

export type BreakStyle = 'dirt' | 'stone' | 'metal' | 'crystal' | 'wood' | 'leaf' | 'tech';

const STYLE_OF: Partial<Record<number, BreakStyle>> = {
  [T.RUST]: 'dirt',
  [T.SOIL]: 'dirt',
  [T.ASH]: 'dirt',
  [T.SAND]: 'dirt',
  [T.FROST]: 'crystal',
  [T.ICE]: 'crystal',
  [T.CRYSTAL]: 'crystal',
  [T.WINDOW]: 'crystal',
  [T.PANEL]: 'metal',
  [T.HAZARD]: 'metal',
  [T.GRATE]: 'metal',
  [T.BRICK]: 'dirt',
  [T.NEON_CYAN]: 'crystal',
  [T.NEON_PINK]: 'crystal',
  [T.METAL]: 'metal',
  [T.IRON]: 'metal',
  [T.COPPER]: 'metal',
  [T.WRECK]: 'metal',
  [T.REINFORCED]: 'metal',
  [T.CIRCUIT_ORE]: 'metal',
  [T.PLASMA_ORE]: 'metal',
  [T.CORE_ORE]: 'metal',
  [T.TRUNK]: 'wood',
  [T.LADDER]: 'wood',
  [T.SCAFFOLD]: 'wood',
  [T.PLATFORM]: 'wood',
  [T.DOOR]: 'wood',
  [T.TABLE]: 'wood',
  [T.TABLE_END]: 'wood',
  [T.CHAIR]: 'wood',
  [T.BED]: 'wood',
  [T.BED_FOOT]: 'wood',
  [T.CHEST]: 'wood',
  [T.LEAVES]: 'leaf',
  [T.PLANT]: 'leaf',
  [T.SAPLING]: 'leaf',
  [T.POT_PLANT]: 'leaf',
  [T.TERMINAL]: 'tech',
  [T.SOLAR]: 'tech',
  [T.SMELTER]: 'tech',
  [T.BATTERY]: 'tech',
  [T.MINER]: 'tech',
  [T.DRONE]: 'tech',
  [T.TURRET]: 'tech',
  [T.SCREEN]: 'tech',
  [T.LAMP]: 'tech',
};

/** Mix a #rrggbb colour toward black by k (0..1). */
export function darken(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  if (hex.length < 7 || Number.isNaN(n)) return '#40382c';
  const ch = (v: number): string => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export function breakStyle(tile: number): BreakStyle {
  return STYLE_OF[tile] ?? 'stone';
}

/** Spark colours for metal: white-hot core fading to orange. */
export const SPARK_COLORS = ['#fff6c8', '#ffd24a', '#ff9a3c'];

/**
 * Debris particles for one broken tile at tile-centre (x, y). Each style gets its own count,
 * size, gravity and spread; metal and tech add sparks, crystal adds light glints. Pure.
 */
export function breakDebris(x: number, y: number, tile: number, color: string, rnd: () => number): Particle[] {
  const st = breakStyle(tile);
  const out: Particle[] = [];
  const add = (n: number, o: { speed: number; up: number; life: number; size: [number, number]; g: number; colors: string[]; drag?: number; spread?: number }): void => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const v = o.speed * (0.4 + rnd() * 0.8);
      const life = o.life * (0.6 + rnd() * 0.6);
      const sz = o.size[0] + Math.floor(rnd() * (o.size[1] - o.size[0] + 1));
      out.push({
        x: x + (rnd() - 0.5) * (o.spread ?? 0.6),
        y: y + (rnd() - 0.5) * (o.spread ?? 0.6),
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - o.up,
        life,
        max: life,
        color: o.colors[i % o.colors.length],
        size: sz,
        g: o.g,
        drag: o.drag,
      });
    }
  };
  const dark = darken(color, 0.3);
  const lit = lighten(color, 0.35);
  switch (st) {
    case 'dirt':
      // Heavy clods that thud down, plus a puff of fine dust.
      add(7, { speed: 3, up: 3, life: 0.7, size: [2, 3], g: 30, colors: [color, dark, color] });
      add(4, { speed: 1.5, up: 0.5, life: 0.5, size: [1, 1], g: -1, colors: [lit], drag: 3, spread: 0.9 });
      break;
    case 'metal':
      add(5, { speed: 3.5, up: 2, life: 0.6, size: [2, 2], g: 22, colors: [color, dark] });
      add(8, { speed: 9, up: 3, life: 0.3, size: [1, 1], g: 14, colors: SPARK_COLORS, spread: 0.3 });
      break;
    case 'tech':
      add(5, { speed: 3.5, up: 2, life: 0.6, size: [2, 2], g: 22, colors: [color, dark] });
      add(6, { speed: 7, up: 2, life: 0.3, size: [1, 1], g: 8, colors: ['#c8ffff', '#36e0e8'], spread: 0.3 });
      break;
    case 'crystal':
      // Bright shards that fly further and fall slower, with white glints.
      add(8, { speed: 6, up: 3, life: 0.75, size: [1, 2], g: 14, colors: [lit, color, '#ffffff'] });
      add(3, { speed: 2, up: 1, life: 0.45, size: [1, 1], g: 2, colors: ['#ffffff'], drag: 2 });
      break;
    case 'wood':
      add(7, { speed: 4.5, up: 3, life: 0.6, size: [1, 2], g: 24, colors: [color, lit, dark] });
      break;
    case 'leaf':
      // Leaves flutter: low gravity, strong drag, long life.
      add(7, { speed: 3, up: 1.5, life: 1.1, size: [1, 2], g: 3, colors: [color, lit, dark], drag: 2.5, spread: 0.9 });
      break;
    default:
      add(10, { speed: 5, up: 2, life: 0.6, size: [1, 2], g: 18, colors: [color, dark] });
  }
  return out;
}

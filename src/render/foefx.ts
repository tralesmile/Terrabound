/**
 * Readable danger (P12-B): everything about an enemy that must be seen even in the dark, drawn over
 * the darkness: glowing eyes, the borer's dust mound, the sentry's aim line and the tick's blast ring.
 * Screen-space helpers only; the sim decides what happens.
 */
import { ENEMIES, type Enemy, type EnemyKind } from '../sim/enemies';
import { ENEMY_LOOKS, ENEMY_W, PAL, enemyFrame } from './sprites';

/** Brightness (0..1) below which an enemy's eyes glow on their own. */
export const EYE_DARK = 0.45;

/** Art-pixel offset of the first eye pixel from the sprite's bottom-centre, or null for no eye. Pure. */
export function eyeOffset(kind: EnemyKind, t: number, dir: number): { x: number; y: number } | null {
  const rows = enemyFrame(ENEMY_LOOKS[kind].sprite, t);
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf('e');
    if (x < 0) continue;
    const wide = rows[y][x + 1] === 'e' ? 1 : 0;
    const col = x + (1 + wide) / 2;
    return { x: (dir < 0 ? ENEMY_W - col : col) - ENEMY_W / 2, y: y + 0.5 - rows.length };
  }
  return null;
}

export function eyeColor(kind: EnemyKind): string {
  return ENEMY_LOOKS[kind].remap?.e ?? PAL.e;
}

/** Two glowing pixels with a soft halo, so a hostile is never invisible in a dim cave. */
export function drawEyeGlow(ctx: CanvasRenderingContext2D, e: Enemy, fx: number, fy: number, s: number, t: number, alpha: number): boolean {
  if (ENEMIES[e.kind].passive || alpha <= 0) return false;
  const o = eyeOffset(e.kind, t, e.dir);
  if (!o) return false;
  const sz = s * ENEMY_LOOKS[e.kind].size;
  const x = fx + o.x * sz;
  const y = fy + o.y * sz;
  ctx.fillStyle = eyeColor(e.kind);
  ctx.globalAlpha = 0.18 * alpha;
  ctx.fillRect(x - 2 * sz, y - 1.5 * sz, 4 * sz, 3 * sz);
  ctx.globalAlpha = alpha;
  ctx.fillRect(x - sz, y - sz / 2, 2 * sz, sz);
  ctx.globalAlpha = 1;
  return true;
}

/** Dust and grit over a buried borer: the only warning that it is coming, so it ignores the darkness. */
export function drawBurrowMound(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, id: number): void {
  for (let i = 0; i < 9; i++) {
    const k = (t * 2.2 + i * 0.37 + id * 0.13) % 1;
    const ox = Math.sin(i * 2.4 + id) * 7 * s;
    ctx.globalAlpha = 0.85 * (1 - k);
    ctx.fillStyle = i % 3 === 0 ? '#ffd27a' : '#c9a37a';
    const p = (i % 2 === 0 ? 2 : 1) * s;
    ctx.fillRect(Math.round(x + ox), Math.round(y - k * 9 * s), p, p);
  }
  // A jagged crack line over the spot.
  ctx.globalAlpha = 0.5 + 0.25 * Math.sin(t * 14 + id);
  ctx.fillStyle = '#ffd27a';
  for (let i = -4; i <= 4; i++) ctx.fillRect(x + i * 2 * s, y + ((i + Math.floor(t * 10)) % 2) * s, 2 * s, s);
  ctx.globalAlpha = 1;
}

/** Sentry aim: a thin dashed line while it tracks, a solid bright one once locked (time to move). */
export function drawAimLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, s: number, locked: boolean, t: number): void {
  ctx.save();
  if (!locked) {
    ctx.setLineDash([3 * s, 3 * s]);
    ctx.lineDashOffset = -t * 24 * s;
  }
  ctx.lineCap = 'round';
  if (locked) {
    ctx.strokeStyle = 'rgba(255,58,90,0.35)';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.strokeStyle = locked ? '#ffe0e6' : 'rgba(255,90,110,0.75)';
  ctx.lineWidth = locked ? 1.5 * s : s;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** The tick's blast reach, filling up as the fuse burns, so "back off" has a clear edge. */
export function drawFuseRing(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, k: number, s: number): void {
  ctx.fillStyle = `rgba(255,140,40,${(0.06 + 0.12 * k).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y, radius * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,176,42,0.85)';
  ctx.lineWidth = s;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

/** Fuse blink: faster as it nears the end. Pure. */
export function fuseFlash(fuseT: number | undefined, fuse: number): boolean {
  if (fuseT === undefined) return false;
  const k = Math.min(1, fuseT / fuse);
  return Math.floor(fuseT * (8 + 14 * k)) % 2 === 1;
}

/** The first solid row below a hanging creature (its landing line), at most `look` tiles down. Pure. */
export function floorUnder(world: { isSolid(x: number, y: number): boolean }, x: number, y: number, look = 12): number {
  for (let ty = Math.floor(y); ty < Math.floor(y) + look; ty++) if (world.isSolid(Math.floor(x), ty)) return ty;
  return Math.floor(y) + look;
}

/** About to drop: grit pours off the roof and a shadow tightens on the floor where it will land. */
export function drawDropWarning(ctx: CanvasRenderingContext2D, x: number, roofY: number, floorY: number, s: number, t: number, k: number, id: number): void {
  for (let i = 0; i < 10; i++) {
    const f = (t * 1.8 + i * 0.29 + id * 0.17) % 1;
    ctx.globalAlpha = 0.9 * (1 - f);
    ctx.fillStyle = i % 3 === 0 ? '#ffd27a' : '#c9b49a';
    const p = (i % 3 === 0 ? 2 : 1) * s;
    ctx.fillRect(Math.round(x + Math.sin(i * 2.7 + id) * 8 * s), Math.round(roofY + f * f * 26 * s), p, p);
  }
  const half = (11 - 5 * k) * s;
  ctx.globalAlpha = 0.45 + 0.4 * k;
  ctx.fillStyle = '#ffb02a';
  ctx.fillRect(Math.round(x - half), Math.round(floorY - s), Math.round(half * 2), Math.max(1, Math.round(s)));
  ctx.fillRect(Math.round(x - half), Math.round(floorY - 3 * s), Math.round(s * 1.5), Math.round(2 * s));
  ctx.fillRect(Math.round(x + half - s * 1.5), Math.round(floorY - 3 * s), Math.round(s * 1.5), Math.round(2 * s));
  ctx.globalAlpha = 1;
}

/** Dazed after a drop: little stars circling overhead say "hit me now". */
export function drawDaze(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  ctx.fillStyle = '#ffe14a';
  for (let i = 0; i < 3; i++) {
    const a = t * 6 + (i * Math.PI * 2) / 3;
    const px = Math.round(x + Math.cos(a) * 6 * s);
    const py = Math.round(y + Math.sin(a) * 2 * s);
    ctx.fillRect(px - s, py, 3 * s, s);
    ctx.fillRect(px, py - s, s, 3 * s);
  }
}

/**
 * World map overlay: one pixel per fog cell, only explored cells drawn, with pins for the pad, the player,
 * seen chests and discovered points of interest, and biome names along the top.
 */
import type { Game } from '../sim/game';
import { CELL } from '../sim/explore';
import { BIOMES, type BiomeId } from '../sim/biomes';
import { T, TILES } from '../sim/tiles';
import { TILE_COLORS } from '../render/sprites';
import { SKY } from '../render/decor';

const AIR_DEEP = '#241e2e';

/** Colour of one map cell: the dominant solid tile, or sky / cave air. */
export function cellColor(game: Game, cx: number, cy: number): string {
  const w = game.world;
  const x = cx * CELL + (CELL >> 1);
  const y = cy * CELL + (CELL >> 1);
  const t = w.get(x, y);
  if (t === T.CHEST) return '#ffcf4a';
  if (t === T.WATER) return '#2a82dc';
  if (t === T.ACID_POOL) return '#7fff4a';
  if (!TILES[t].solid) {
    if (y < w.surface[Math.min(w.w - 1, Math.max(0, x))]) return SKY[w.biome[Math.min(w.w - 1, Math.max(0, x))]]?.[1] ?? '#2a1f4d';
    return AIR_DEEP;
  }
  return TILE_COLORS[t] ?? '#555';
}

export class MapView {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';

  /** Rebuild the cell image when the fog or the world changed (cheap: ~37k cells, only on change). */
  private image(game: Game): HTMLCanvasElement | null {
    const fog = game.fog;
    const key = `${game.world.seed}:${fog.version}:${game.world.version >> 6}`;
    if (this.canvas && key === this.key) return this.canvas;
    if (typeof document === 'undefined') return null;
    if (!this.canvas || this.canvas.width !== fog.cw || this.canvas.height !== fog.ch) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = fog.cw;
      this.canvas.height = fog.ch;
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return this.canvas;
    ctx.clearRect(0, 0, fog.cw, fog.ch);
    for (let cy = 0; cy < fog.ch; cy++) {
      for (let cx = 0; cx < fog.cw; cx++) {
        if (!fog.seen[cy * fog.cw + cx]) continue;
        ctx.fillStyle = cellColor(game, cx, cy);
        ctx.fillRect(cx, cy, 1, 1);
      }
    }
    this.key = key;
    return this.canvas;
  }

  /** Draw into the rect (x, y, w, h). Returns nothing; pins scale with u. */
  draw(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, h: number, u: number, time: number): void {
    const fog = game.fog;
    const img = this.image(game);
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(x, y, w, h);
    // Zoomed view centred on the player: ~350 tiles across on desktop, ~120 on a phone.
    const viewCols = Math.max(30, Math.min(fog.cw, Math.round(w / 14)));
    const sCell = w / viewCols;
    const viewRows = Math.max(1, Math.min(fog.ch, Math.floor(h / sCell)));
    const pcx = game.body.x / CELL;
    const pcy = (game.body.y - 1) / CELL;
    const c0 = Math.max(0, Math.min(fog.cw - viewCols, Math.round(pcx - viewCols / 2)));
    const r0 = Math.max(0, Math.min(fog.ch - viewRows, Math.round(pcy - viewRows / 2)));
    const s = sCell;
    const ox = x - c0 * s;
    const oy = y + (h - viewRows * s) / 2 - r0 * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, c0, r0, viewCols, viewRows, x, oy + r0 * s, viewCols * s, viewRows * s);
    }
    const toX = (tx: number): number => ox + (tx / CELL) * s;
    const toY = (ty: number): number => oy + (ty / CELL) * s;
    const world = game.world;
    // Biome labels at band centres.
    ctx.font = `bold ${Math.round(u * 0.7)}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    let start = 0;
    for (let bx = 1; bx <= world.w; bx++) {
      if (bx === world.w || world.biome[bx] !== world.biome[start]) {
        const mid = (start + bx) / 2;
        if (toX(bx) < x || toX(start) > x + w) {
          start = bx;
          continue;
        }
        const known = game.codex.includes(`biome:${world.biome[start]}`);
        ctx.fillStyle = known ? '#c9d0e4' : '#5a6078';
        ctx.fillText(known ? BIOMES[world.biome[start] as BiomeId].name : '???', Math.min(x + w - u * 4, Math.max(x + u * 4, toX(mid))), y + u * 1.1);
        start = bx;
      }
    }
    // Discovered points of interest.
    for (const st of world.structures) {
      const cx = (st.x0 + st.x1) / 2;
      const cy = (st.y0 + st.y1) / 2;
      if (!fog.isSeen(Math.floor(cx), Math.floor(cy))) continue;
      ctx.strokeStyle = st.kind === 'vault' || st.kind === 'geode' ? '#c08cff' : '#ffcf4a';
      ctx.lineWidth = Math.max(1, u * 0.12);
      ctx.strokeRect(toX(st.x0), toY(st.y0), Math.max(3, ((st.x1 - st.x0) / CELL) * s), Math.max(3, ((st.y1 - st.y0) / CELL) * s));
    }
    // Pad and player.
    const r = Math.max(3, u * 0.35);
    ctx.fillStyle = '#36e0e8';
    ctx.fillRect(toX(world.padX) - r * 1.5, toY(world.padY) - r * 0.5, r * 3, r);
    ctx.fillText('PAD', toX(world.padX), toY(world.padY) - r * 1.2);
    if (Math.floor(time * 3) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(toX(game.body.x), toY(game.body.y - 1), r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ff9a3c';
    ctx.lineWidth = Math.max(1, u * 0.1);
    ctx.beginPath();
    ctx.arc(toX(game.body.x), toY(game.body.y - 1), r * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Overview strip: where this view sits in the whole world.
    const sw = w * 0.5;
    const sx = x + (w - sw) / 2;
    const sy = y + h - u * 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(sx, sy, sw, u * 0.35);
    ctx.fillStyle = '#36e0e8';
    ctx.fillRect(sx + (c0 / fog.cw) * sw, sy, Math.max(2, (viewCols / fog.cw) * sw), u * 0.35);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + (world.padX / world.w) * sw - 1, sy - u * 0.15, 2, u * 0.65);
  }
}

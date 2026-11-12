/**
 * World map: tile-resolution image of explored ground, zoomable (wheel or +/-) and draggable, with pins for
 * the pad, the player, chests, structures and biome names, plus a legend and an overview strip.
 */
import type { Game } from '../sim/game';
import { CELL } from '../sim/explore';
import { BASE_HALF } from '../sim/base';
import { RAID_ENTRY } from '../sim/raids';
import { BIOMES, type BiomeId } from '../sim/biomes';
import { T, TILES } from '../sim/tiles';
import { TILE_COLORS } from '../render/sprites';
import { SKY } from '../render/decor';

const AIR_DEEP: [number, number, number] = [36, 30, 46];
export const MAP_ZOOMS = [1, 2, 3, 5, 8, 12];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colour of one map cell (coarse sample at the cell centre). */
export function cellColor(game: Game, cx: number, cy: number): string {
  const w = game.world;
  const x = cx * CELL + (CELL >> 1);
  const y = cy * CELL + (CELL >> 1);
  const t = w.get(x, y);
  if (t === T.CHEST) return '#ffcf4a';
  if (t === T.WATER) return '#2a82dc';
  if (t === T.ACID_POOL) return '#7fff4a';
  if (t === T.MAGMA) return '#ff6028';
  if (!TILES[t].solid) {
    if (y < w.surface[Math.min(w.w - 1, Math.max(0, x))]) return SKY[w.biome[Math.min(w.w - 1, Math.max(0, x))]]?.[1] ?? '#2a1f4d';
    return '#241e2e';
  }
  return TILE_COLORS[t] ?? '#555';
}

const LEGEND: [string, string][] = [
  ['You', '#ffffff'],
  ['Pad', '#36e0e8'],
  ['Chest', '#ffcf4a'],
  ['Ruins / ships', '#ffcf4a'],
  ['Vaults / geodes', '#c08cff'],
  ['Sky island', '#7dffb0'],
  ['Pond / water', '#2a82dc'],
  ['Acid', '#7fff4a'],
  ['Iron', TILE_COLORS[T.IRON] ?? '#d6c7b8'],
  ['Copper', TILE_COLORS[T.COPPER] ?? '#e08a3c'],
];

export class MapView {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private chests: { x: number; y: number }[] = [];
  /** Zoom level index into MAP_ZOOMS. */
  zoom = 2;
  /** Pan offset in tiles from the player (0,0 = centred on the player). */
  panX = 0;
  panY = 0;

  zoomBy(d: number): void {
    this.zoom = Math.max(0, Math.min(MAP_ZOOMS.length - 1, this.zoom + d));
  }

  /** Drag by screen pixels. */
  dragBy(dxPx: number, dyPx: number): void {
    const z = MAP_ZOOMS[this.zoom];
    this.panX -= dxPx / z;
    this.panY -= dyPx / z;
  }

  center(): void {
    this.panX = 0;
    this.panY = 0;
  }

  /** Rebuild the tile image when the fog or the world changed. */
  private image(game: Game): HTMLCanvasElement | null {
    const fog = game.fog;
    const w = game.world;
    const key = `${w.seed}:${fog.version}:${w.version >> 7}`;
    if (this.canvas && key === this.key) return this.canvas;
    if (typeof document === 'undefined') return null;
    if (!this.canvas || this.canvas.width !== w.w || this.canvas.height !== w.h) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = w.w;
      this.canvas.height = w.h;
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return this.canvas;
    const img = ctx.createImageData(w.w, w.h);
    const px = img.data;
    const cache = new Map<number, [number, number, number]>();
    const skyCol = new Map<number, [number, number, number]>();
    this.chests = [];
    for (let y = 0; y < w.h; y++) {
      for (let x = 0; x < w.w; x++) {
        if (!fog.isSeen(x, y)) continue;
        const t = w.tiles[y * w.w + x];
        let c: [number, number, number];
        if (t === T.CHEST) {
          c = [255, 207, 74];
          this.chests.push({ x, y });
        } else if (t === T.WATER) c = [42, 130, 220];
        else if (t === T.ACID_POOL) c = [127, 255, 74];
        else if (t === T.MAGMA) c = [255, 96, 40];
        else if (!TILES[t].solid && t !== T.LEAVES && t !== T.TRUNK) {
          if (y < w.surface[x]) {
            const b = w.biome[x];
            c = skyCol.get(b) ?? rgb(SKY[b]?.[1] ?? '#2a1f4d');
            skyCol.set(b, c);
          } else c = AIR_DEEP;
        } else {
          c = cache.get(t) ?? rgb(TILE_COLORS[t] ?? '#555555');
          cache.set(t, c);
        }
        const i = (y * w.w + x) * 4;
        // Slight checker shading so tiles read at high zoom.
        const sh = (x + y) & 1 ? 0 : 10;
        px[i] = Math.max(0, c[0] - sh);
        px[i + 1] = Math.max(0, c[1] - sh);
        px[i + 2] = Math.max(0, c[2] - sh);
        px[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.key = key;
    return this.canvas;
  }

  /** Draw into the rect (x, y, w, h); u is the UI unit. */
  draw(ctx: CanvasRenderingContext2D, game: Game, x: number, y: number, w: number, h: number, u: number, time: number): void {
    const world = game.world;
    const img = this.image(game);
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(x, y, w, h);
    const z = MAP_ZOOMS[this.zoom];
    const viewW = w / z;
    const viewH = h / z;
    // View centre in tiles, clamped to the world.
    const cx = viewW >= world.w ? world.w / 2 : Math.max(viewW / 2, Math.min(world.w - viewW / 2, game.body.x + this.panX));
    const cy = viewH >= world.h ? world.h / 2 : Math.max(viewH / 2, Math.min(world.h - viewH / 2, game.body.y - 1 + this.panY));
    const x0 = cx - viewW / 2;
    const y0 = cy - viewH / 2;
    const toX = (tx: number): number => x + (tx - x0) * z;
    const toY = (ty: number): number => y + (ty - y0) * z;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, world.w, world.h, toX(0), toY(0), world.w * z, world.h * z);
    }
    // Structures you have seen.
    ctx.lineWidth = Math.max(1, u * 0.12);
    for (const st of world.structures) {
      if (!game.fog.isSeen(Math.floor((st.x0 + st.x1) / 2), Math.floor((st.y0 + st.y1) / 2))) continue;
      const col = st.kind === 'vault' || st.kind === 'geode' ? '#c08cff' : st.kind === 'pond' ? '#9fd8ff' : st.kind === 'island' ? '#7dffb0' : '#ffcf4a';
      ctx.strokeStyle = col;
      ctx.strokeRect(toX(st.x0) - 1, toY(st.y0) - 1, Math.max(4, (st.x1 - st.x0 + 1) * z) + 2, Math.max(4, (st.y1 - st.y0 + 1) * z) + 2);
      if (z >= 3) {
        ctx.font = `${Math.round(u * 0.6)}px ui-monospace, monospace`;
        ctx.fillStyle = col;
        ctx.textAlign = 'left';
        ctx.fillText(st.kind, toX(st.x0), toY(st.y0) - 3);
      }
    }
    // Chest pins.
    const pr = Math.max(2.5, u * 0.28);
    ctx.fillStyle = '#ffcf4a';
    for (const c of this.chests) {
      ctx.beginPath();
      ctx.arc(toX(c.x + 0.5), toY(c.y + 0.5), pr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Biome names along the top.
    ctx.font = `bold ${Math.round(u * 0.7)}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    let start = 0;
    for (let bx = 1; bx <= world.w; bx++) {
      if (bx === world.w || world.biome[bx] !== world.biome[start]) {
        if (toX(bx) > x && toX(start) < x + w) {
          const known = game.codex.includes(`biome:${world.biome[start]}`);
          ctx.fillStyle = known ? '#c9d0e4' : '#5a6078';
          ctx.fillText(known ? BIOMES[world.biome[start] as BiomeId].name : '???', Math.min(x + w - u * 4, Math.max(x + u * 9, toX((start + bx) / 2))), y + u * 1.1);
        }
        start = bx;
      }
    }
    // Raid preview: red chevrons where tonight's (or the current) wave enters.
    const rs = game.raid ? [...new Set(game.raid.plan.map((p) => p.side))] : game.raidWarn ? [game.raidWarn.side] : [];
    for (const side of rs) {
      const ex = Math.max(2, Math.min(world.w - 3, world.padX + side * (BASE_HALF + RAID_ENTRY)));
      const ey = toY(world.surface[ex] - 2);
      const k = Math.max(4, u * 0.5);
      ctx.fillStyle = Math.floor(time * 4) % 2 ? '#ff4a3a' : '#ff9a3c';
      for (let i = 0; i < 2; i++) {
        const cx = toX(ex + 0.5) + side * i * k * 1.1;
        ctx.beginPath();
        ctx.moveTo(cx - side * k, ey);
        ctx.lineTo(cx + side * k * 0.2, ey - k);
        ctx.lineTo(cx + side * k * 0.2, ey + k);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Pad and player.
    const r = Math.max(3, u * 0.35);
    ctx.fillStyle = '#36e0e8';
    ctx.fillRect(toX(world.padX - 4), toY(world.padY) - r * 0.5, Math.max(r * 3, 9 * z), Math.max(r, z));
    ctx.fillText('PAD', toX(world.padX + 0.5), toY(world.padY) - r * 1.2);
    const pxp = toX(game.body.x);
    const pyp = toY(game.body.y - 1);
    if (Math.floor(time * 3) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pxp, pyp, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ff9a3c';
    ctx.lineWidth = Math.max(1, u * 0.1);
    ctx.beginPath();
    ctx.arc(pxp, pyp, r * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Legend and overview strip.
    ctx.font = `${Math.round(u * 0.62)}px ui-monospace, monospace`;
    ctx.textAlign = 'left';
    let ly = y + u * 2.2;
    ctx.fillStyle = 'rgba(8,10,18,0.78)';
    ctx.fillRect(x + u * 0.4, ly - u * 0.8, u * 7.6, LEGEND.length * u * 0.85 + u * 0.4);
    for (const [name, col] of LEGEND) {
      ctx.fillStyle = col;
      ctx.fillRect(x + u * 0.7, ly - u * 0.45, u * 0.5, u * 0.5);
      ctx.fillStyle = '#c9d0e4';
      ctx.fillText(name, x + u * 1.5, ly);
      ly += u * 0.85;
    }
    const sw = w * 0.5;
    const sx = x + (w - sw) / 2;
    const sy = y + h - u * 0.8;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(sx, sy, sw, u * 0.35);
    ctx.fillStyle = '#36e0e8';
    ctx.fillRect(sx + Math.max(0, x0 / world.w) * sw, sy, Math.max(2, Math.min(1, viewW / world.w) * sw), u * 0.35);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + (world.padX / world.w) * sw - 1, sy - u * 0.15, 2, u * 0.65);
  }
}

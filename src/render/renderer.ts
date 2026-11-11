import type { Game } from '../sim/game';
import { REACH } from '../sim/game';
import { onLadder } from '../sim/physics';
import { ENEMIES } from '../sim/enemies';
import { hash2 } from '../sim/rng';
import { T } from '../sim/tiles';
import { BODY_H } from '../sim/physics';
import type { Fx } from './fx';
import { EDGE_N, MASKS, edgeMask, growsMoss, growsSnow, isBlock, leafMask } from './autotile';
import { CAVE_ROW, LEAF_VARIANTS, NIGHT_SKY, PLANT_VARIANTS, SNOW_H, blendSky, buildDecor, mixHex } from './decor';
import { daylight, sunHeight, dayPhase } from '../sim/daynight';
import { B, BIOME_IDS } from '../sim/biomes';
import { ENEMY_SCALE, MOSS_H, TILE_COLORS, TS, VARIANTS, atlasCol, buildAtlas, buildMoss, buildWallAtlas, drawEnemySprite, drawPlayer, makeCanvas } from './sprites';
import { AIR_COST, DARK_MAX, LEVEL_CAP, SKY_LEVEL, brightness, computeLight, frameSources, levelAt, type LightGrid } from './lightmap';

/** Chunk size in tiles for the render cache. */
export const CHUNK = 32;
/** Cache size before far chunks are evicted. */
export const MAX_CHUNKS = 48;
const chunkKey = (cx: number, cy: number): number => cy * 4096 + cx;

export interface Aim {
  tx: number;
  ty: number;
}

export class Renderer {
  private atlas = buildAtlas();
  private moss = buildMoss();
  private wallAtlas = buildWallAtlas();
  private decor = buildDecor();
  /** Blended sky palette for the camera position (updated each frame). */
  private sky: [string, string, string, string] = ['#0b1026', '#2a1f4d', '#e87f5b', '#1a1536'];
  /** Daylight 0..1 of the current frame. */
  private day = 1;
  /** Device pixels. */
  w = 1;
  h = 1;
  scale = 3;
  camX = 0;
  camY = 0;
  private snapped = false;

  constructor(private ctx: CanvasRenderingContext2D) {}

  resize(w: number, h: number): void {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    // Integer pixel scaling keeps pixel art crisp: roughly 16 tiles across the short side.
    this.scale = Math.max(2, Math.round(Math.min(this.w, this.h) / (TS * 16)));
  }

  /** Smooth camera, clamped to the world so we never show the void. */
  follow(game: Game, dt: number): void {
    const tx = game.body.x;
    const ty = game.body.y - BODY_H / 2;
    const k = this.snapped ? Math.min(1, 9 * dt) : 1;
    this.snapped = true;
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    const halfW = this.w / (2 * TS * this.scale);
    const halfH = this.h / (2 * TS * this.scale);
    const { w, h } = game.world;
    this.camX = w <= halfW * 2 ? w / 2 : Math.min(w - halfW, Math.max(halfW, this.camX));
    this.camY = h <= halfH * 2 ? h / 2 : Math.min(h - halfH + 2, Math.max(-6 + halfH, this.camY));
  }

  /** Back-wall layer: cave walls underground, player-built plates; nothing (sky) otherwise. */
  private drawBack(ctx: CanvasRenderingContext2D, world: Game['world'], tx: number, ty: number, dx: number, dy: number, ts: number): void {
    const wl = world.wall(tx, ty);
    if (wl === 0) return;
    const v = Math.floor(hash2(tx, ty, 11) * VARIANTS);
    ctx.drawImage(this.wallAtlas, v * TS, wl * TS, TS, TS, dx, dy, ts, ts);
  }

  screenToTile(sx: number, sy: number): Aim {
    const ts = TS * this.scale;
    return {
      tx: Math.floor(this.camX + (sx - this.w / 2) / ts),
      ty: Math.floor(this.camY + (sy - this.h / 2) / ts),
    };
  }

  private sx(wx: number, shakeX: number): number {
    return Math.round(this.w / 2 + (wx - this.camX) * TS * this.scale + shakeX);
  }

  private sy(wy: number, shakeY: number): number {
    return Math.round(this.h / 2 + (wy - this.camY) * TS * this.scale + shakeY);
  }

  draw(game: Game, fx: Fx, aim: Aim | null, time: number): void {
    const ctx = this.ctx;
    const { w, h, scale } = this;
    const ts = TS * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const shakeX = (Math.random() - 0.5) * fx.shake * 6 * scale;
    const shakeY = (Math.random() - 0.5) * fx.shake * 6 * scale;
    const world = game.world;

    // Underground base colour, then the sky above the surface.
    ctx.fillStyle = '#17141f';
    ctx.fillRect(0, 0, w, h);
    const skyBottom = this.sy(world.padY + 12, shakeY);
    if (skyBottom > 0) {
      const horizon = this.sy(world.padY, shakeY);
      const g = ctx.createLinearGradient(0, Math.min(0, horizon - ts * 22), 0, horizon);
      const dl = daylight(game.time);
      this.day = dl;
      const base = this.skyAt(world);
      this.sky = [0, 1, 2, 3].map((k) => mixHex(base[k], NIGHT_SKY[k], 1 - dl)) as [string, string, string, string];
      g.addColorStop(0, this.sky[0]);
      g.addColorStop(0.55, this.sky[1]);
      g.addColorStop(1, this.sky[2]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, Math.min(h, skyBottom));
      this.drawSkyDecor(ctx, horizon, time, world, game.time);
    }

    // Tiles: cached chunks, then per-frame animated tiles.
    const x0 = Math.floor(this.camX - w / 2 / ts) - 1;
    const x1 = Math.ceil(this.camX + w / 2 / ts) + 1;
    const y0 = Math.floor(this.camY - h / 2 / ts) - 1;
    const y1 = Math.ceil(this.camY + h / 2 / ts) + 1;
    this.syncChunks(world);
    const cx0 = Math.floor(Math.max(0, x0) / CHUNK);
    const cx1 = Math.floor(Math.min(world.w - 1, x1) / CHUNK);
    const cy0 = Math.floor(Math.max(0, y0) / CHUNK);
    const cy1 = Math.floor(Math.min(world.h - 1, y1) / CHUNK);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        ctx.drawImage(this.chunk(world, cx, cy), this.sx(cx * CHUNK, shakeX), this.sy(cy * CHUNK, shakeY), CHUNK * ts, CHUNK * ts);
      }
    }
    this.prefetchChunk(world, cx0, cy0, cx1, cy1);
    this.machinesOn = game.power.working;
    this.minersOn = game.power.miners > 0 && game.power.ratio > 0;
    this.machinesSun = game.power.supply > 0;
    this.batteryFill = game.power.cap > 0 ? game.power.charge / game.power.cap : 0;
    this.drawDynamic(ctx, world, x0, y0, x1, y1, shakeX, shakeY, time);

    // Aim highlight and crack overlay.
    if (aim) {
      const near = this.reachable(game, aim);
      ctx.strokeStyle = near ? 'rgba(54,224,232,0.9)' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = Math.max(1, scale / 2);
      ctx.strokeRect(this.sx(aim.tx, shakeX) + 0.5, this.sy(aim.ty, shakeY) + 0.5, ts - 1, ts - 1);
    }
    if (game.mining) {
      const m = game.mining;
      const dx = this.sx(m.tx, shakeX);
      const dy = this.sy(m.ty, shakeY);
      ctx.fillStyle = `rgba(0,0,0,${(m.progress * 0.55).toFixed(3)})`;
      ctx.fillRect(dx, dy, ts, ts);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = Math.max(1, scale / 2);
      ctx.beginPath();
      const n = Math.floor(m.progress * 4) + 1;
      for (let i = 0; i < n; i++) {
        const a = hash2(i, m.tx, m.ty);
        const b = hash2(m.ty, i, m.tx);
        ctx.moveTo(dx + a * ts, dy);
        ctx.lineTo(dx + b * ts, dy + ts);
      }
      ctx.stroke();
    }

    // Player and mining beam.
    const b = game.body;
    const px = this.sx(b.x, shakeX);
    const py = this.sy(b.y, shakeY);
    if (game.mining) {
      const hx = px + game.facing * 5 * scale;
      const hy = py - 14 * scale;
      const ex = this.sx(game.mining.tx + 0.5, shakeX);
      const ey = this.sy(game.mining.ty + 0.5, shakeY);
      ctx.strokeStyle = `rgba(54,224,232,${0.55 + 0.35 * Math.sin(time * 40)})`;
      ctx.lineWidth = scale * 1.5;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,255,255,0.9)';
      ctx.lineWidth = scale * 0.6;
      ctx.stroke();
    }
    for (const g of game.hazards.gas) {
      const gx = this.sx(g.x, shakeX);
      const gy = this.sy(g.y, shakeY);
      if (gx < -g.r * ts || gx > this.w + g.r * ts) continue;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, g.r * ts);
      grad.addColorStop(0, 'rgba(120,255,90,0.38)');
      grad.addColorStop(1, 'rgba(120,255,90,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx - g.r * ts, gy - g.r * ts, g.r * 2 * ts, g.r * 2 * ts);
    }
    for (const f of game.fallers) {
      const fx = this.sx(f.x, shakeX);
      const fy = this.sy(f.y, shakeY);
      const acid = f.kind === 'acid';
      if (f.warn > 0) {
        // Telegraph: pulsing marker and a faint line down to the floor.
        const pulse = 0.5 + 0.5 * Math.sin(f.warn * 24);
        ctx.fillStyle = acid ? `rgba(140,255,70,${0.4 + 0.5 * pulse})` : `rgba(255,200,80,${0.4 + 0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(fx, fy, ts * (acid ? 0.18 : 0.35) * (1 + 0.3 * pulse), 0, Math.PI * 2);
        ctx.fill();
        if (!acid) {
          ctx.fillStyle = `rgba(255,200,80,${0.15 * pulse})`;
          ctx.fillRect(fx - ts * 0.35, fy, ts * 0.7, ts * 6);
        }
      } else {
        ctx.fillStyle = acid ? '#8aff4a' : '#8b7f72';
        const r = ts * (acid ? 0.14 : 0.32);
        ctx.fillRect(fx - r, fy - r * (acid ? 2.2 : 1), r * 2, r * (acid ? 2.2 : 2));
      }
    }
    for (const e of game.enemies) {
      const d = ENEMIES[e.kind];
      const ex = this.sx(e.x, shakeX);
      const ey = this.sy(e.y, shakeY);
      const w = d.halfW * 2 * ts;
      const h = d.h * ts;
      drawEnemySprite(ctx, e.kind, ex, ey, scale * ENEMY_SCALE, e.dir, time, e.iframes > 0);
      if (e.hp < d.hp) {
        ctx.fillStyle = '#300';
        ctx.fillRect(ex - w / 2, ey - h - 4 * scale, w, 2 * scale);
        ctx.fillStyle = '#6f6';
        ctx.fillRect(ex - w / 2, ey - h - 4 * scale, (w * Math.max(0, e.hp)) / d.hp, 2 * scale);
      }
    }
    for (const sh of game.shots) {
      const sxp = this.sx(sh.x, shakeX);
      const syp = this.sy(sh.y, shakeY);
      const len = Math.hypot(sh.vx, sh.vy) || 1;
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = scale * 1.6;
      ctx.beginPath();
      ctx.moveTo(sxp - (sh.vx / len) * ts * 0.7, syp - (sh.vy / len) * ts * 0.7);
      ctx.lineTo(sxp, syp);
      ctx.stroke();
    }
    if (game.swing > 0) {
      const k = 1 - game.swing / 0.18;
      ctx.strokeStyle = `rgba(120,255,255,${1 - k})`;
      ctx.lineWidth = scale * 2;
      ctx.beginPath();
      const a0 = game.facing > 0 ? -1.2 + k * 2.2 : Math.PI + 1.2 - k * 2.2;
      ctx.arc(px, py - 12 * scale, 2 * ts * 0.9, a0 - 0.5, a0 + 0.1);
      ctx.stroke();
    }
    drawPlayer(ctx, px, py, scale, {
      facing: game.facing,
      walking: Math.abs(b.vx) > 1,
      t: time,
      airborne: !b.onGround,
      vy: b.vy,
      climbing: onLadder(game.world, b) && !b.onGround,
      hurt: game.iframes > 0 && Math.floor(time * 20) % 2 === 0,
      swing: game.swing > 0,
      tier: game.upgrades.armor ?? 0,
    });

    // Particles and floating text.
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max + 0.2));
      ctx.fillStyle = p.color;
      ctx.fillRect(this.sx(p.x, shakeX), this.sy(p.y, shakeY), p.size * scale, p.size * scale);
    }
    ctx.globalAlpha = 1;
    for (const r of fx.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = scale * (2.5 - 1.5 * k);
      ctx.beginPath();
      ctx.arc(this.sx(r.x, shakeX), this.sy(r.y, shakeY), Math.max(1, r.r * ts * (0.2 + 0.8 * k)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = `bold ${Math.round(scale * 5)}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    for (const t of fx.texts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 0.5));
      ctx.fillStyle = '#000';
      ctx.fillText(t.text, this.sx(t.x, shakeX) + scale, this.sy(t.y, shakeY) + scale);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, this.sx(t.x, shakeX), this.sy(t.y, shakeY));
    }
    ctx.globalAlpha = 1;

    this.drawDarkness(ctx, game, px, py - 14 * scale, time);
  }

  /** Static art of one tile (cached in chunks): back wall, block, decor, lichen. */
  private drawTile(ctx: CanvasRenderingContext2D, world: Game['world'], tx: number, ty: number, dx: number, dy: number, ts: number, scale: number): void {
    const t = world.tiles[ty * world.w + tx];
    const get = (x: number, y: number): number => world.get(x, y);
    if (t === T.AIR) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      return;
    }
    if (t === T.TORCH) {
      // Flame flickers: drawn each frame by drawDynamic, only the wall is cached.
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      return;
    }
    if (t === T.LADDER) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      this.drawLadder(ctx, dx, dy, ts);
      return;
    }
    if (t === T.PLATFORM) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      ctx.fillStyle = '#9fb0c8';
      ctx.fillRect(dx, dy, ts, Math.max(2, ts * 0.22));
      ctx.fillStyle = '#55627a';
      ctx.fillRect(dx, dy + Math.max(2, ts * 0.22), ts, Math.max(1, ts * 0.08));
      return;
    }
    if (t === T.SOLAR || t === T.SMELTER || t === T.BATTERY || t === T.MINER) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      this.drawMachine(ctx, t, dx, dy, ts);
      return;
    }
    if (t === T.WATER || t === T.ACID_POOL) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const acid = t === T.ACID_POOL;
      ctx.fillStyle = acid ? 'rgba(120,255,80,0.55)' : 'rgba(40,130,220,0.6)';
      ctx.fillRect(dx, dy, ts, ts);
      const above = world.get(tx, ty - 1);
      if (above !== T.WATER && above !== T.ACID_POOL) {
        // Surface: bright line and a little sparkle.
        ctx.fillStyle = acid ? '#c8ff8a' : '#9fd8ff';
        ctx.fillRect(dx, dy, ts, Math.max(1, ts / 8));
        if ((tx * 7) % 5 === 0) ctx.fillRect(dx + ts / 4, dy + ts / 4, ts / 8, ts / 16);
      }
      return;
    }
    if (t === T.TERMINAL) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const u = ts / 16;
      ctx.fillStyle = '#14181f';
      ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 14 * u);
      ctx.fillStyle = '#3d4152';
      ctx.fillRect(dx + 3 * u, dy + 3 * u, 10 * u, 12 * u);
      ctx.fillStyle = '#0b2a2c';
      ctx.fillRect(dx + 4 * u, dy + 4 * u, 8 * u, 6 * u);
      ctx.fillStyle = '#36e0e8';
      for (let r = 0; r < 3; r++) ctx.fillRect(dx + 5 * u, dy + (5 + r * 2) * u, (3 + ((tx + r) % 4)) * u, u);
      ctx.fillStyle = '#ffcf4a';
      ctx.fillRect(dx + 5 * u, dy + 12 * u, 2 * u, u);
      return;
    }
    if (t === T.TRUNK || t === T.LEAVES || t === T.PLANT || t === T.CHEST) {
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      const bio = world.biome[tx] ?? 0;
      const v2 = Math.floor(hash2(tx, ty, 7) * 4);
      if (t === T.TRUNK) {
        // Inside a canopy, foliage continues behind the trunk so crowns never split in two.
        if (get(tx - 1, ty) === T.LEAVES && get(tx + 1, ty) === T.LEAVES) {
          const m = leafMask(get, tx, ty) & ~(2 | 8);
          ctx.drawImage(this.decor.leaves, (m * LEAF_VARIANTS + (v2 % LEAF_VARIANTS)) * TS, bio * TS, TS, TS, dx, dy, ts, ts);
        }
        ctx.drawImage(this.decor.trunks, (v2 % 2) * TS, bio * TS, TS, TS, dx, dy, ts, ts);
      }
      else if (t === T.LEAVES) {
        const m = leafMask(get, tx, ty);
        ctx.drawImage(this.decor.leaves, (m * LEAF_VARIANTS + (v2 % LEAF_VARIANTS)) * TS, bio * TS, TS, TS, dx, dy, ts, ts);
      } else if (t === T.PLANT) {
        const row = ty > world.surface[tx] + 1 ? CAVE_ROW : bio;
        ctx.drawImage(this.decor.plants, (v2 % PLANT_VARIANTS) * TS, row * TS, TS, TS, dx, dy, ts, ts);
      }
      // Chests bob: drawn each frame by drawDynamic.
      return;
    }
    if (t === T.WALL || t === T.DOOR) {
      // T.WALL is legacy (pre-v3 saves migrate it to the wall layer); still drawn if ever present.
      this.drawBack(ctx, world, tx, ty, dx, dy, ts);
      ctx.fillStyle = t === T.WALL ? '#3a4356' : '#6fa8c9';
      const inset = t === T.WALL ? 0 : ts * 0.25;
      ctx.fillRect(dx + inset, dy, ts - inset * 2, ts);
      ctx.fillStyle = t === T.WALL ? '#2f3748' : '#3d6e8a';
      ctx.fillRect(dx + inset, dy, Math.max(1, ts * 0.08), ts);
      if (t === T.DOOR) {
        ctx.fillStyle = '#ffd36b';
        ctx.fillRect(dx + ts * 0.58, dy + ts * 0.5, Math.max(2, ts * 0.1), Math.max(2, ts * 0.1));
      }
      return;
    }
    const v = Math.floor(hash2(tx, ty, 7) * VARIANTS);
    const mask = isBlock(t) ? edgeMask(get, tx, ty) : MASKS - 1;
    // Rounded corners are transparent: show the cave wall behind them underground.
    if (mask !== 0) this.drawBack(ctx, world, tx, ty, dx, dy, ts);
    ctx.drawImage(this.atlas, atlasCol(v, mask) * TS, t * TS, TS, TS, dx, dy, ts, ts);
    if (mask & EDGE_N && ty <= world.surface[tx]) {
      if (growsMoss(t) && world.biome[tx] !== B.ASH) ctx.drawImage(this.moss, v * TS, 0, TS, MOSS_H, dx, dy, ts, MOSS_H * scale);
      else if (growsSnow(t)) ctx.drawImage(this.decor.snow, v * TS, 0, TS, SNOW_H, dx, dy, ts, SNOW_H * scale);
    }
  }

  /** Machines: a solar panel on a post, and a smelter with a furnace mouth (glow is added per frame). */
  private drawMachine(ctx: CanvasRenderingContext2D, t: number, dx: number, dy: number, ts: number): void {
    const u = ts / 16;
    if (t === T.SOLAR) {
      ctx.fillStyle = '#2b3447';
      ctx.fillRect(dx + 7 * u, dy + 9 * u, 2 * u, 7 * u);
      ctx.fillStyle = '#1b2438';
      ctx.fillRect(dx + 1 * u, dy + 3 * u, 14 * u, 7 * u);
      ctx.fillStyle = '#3a8fe0';
      for (let i = 0; i < 3; i++) ctx.fillRect(dx + (2 + i * 4.3) * u, dy + 4 * u, 3.5 * u, 5 * u);
      ctx.fillStyle = '#9fd8ff';
      ctx.fillRect(dx + 2 * u, dy + 4 * u, 3.5 * u, 1 * u);
      return;
    }
    if (t === T.MINER) {
      ctx.fillStyle = '#3d4458';
      ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 6 * u);
      ctx.fillStyle = '#ffd23a';
      ctx.fillRect(dx + 2 * u, dy + 2 * u, 12 * u, 1.5 * u);
      ctx.fillStyle = '#566078';
      ctx.fillRect(dx + 7 * u, dy + 8 * u, 2 * u, 6 * u);
      ctx.fillStyle = '#c9d4e8';
      ctx.fillRect(dx + 6 * u, dy + 14 * u, 4 * u, 2 * u);
      return;
    }
    if (t === T.BATTERY) {
      ctx.fillStyle = '#2b3447';
      ctx.fillRect(dx + 3 * u, dy + 3 * u, 10 * u, 13 * u);
      ctx.fillStyle = '#566078';
      ctx.fillRect(dx + 6 * u, dy + 1 * u, 4 * u, 2 * u);
      ctx.fillStyle = '#14171f';
      ctx.fillRect(dx + 5 * u, dy + 5 * u, 6 * u, 9 * u);
      return;
    }
    ctx.fillStyle = '#3d4458';
    ctx.fillRect(dx + 1 * u, dy + 3 * u, 14 * u, 13 * u);
    ctx.fillStyle = '#566078';
    ctx.fillRect(dx + 1 * u, dy + 3 * u, 14 * u, 2 * u);
    ctx.fillStyle = '#2b3140';
    ctx.fillRect(dx + 11 * u, dy + 0 * u, 3 * u, 4 * u);
    ctx.fillStyle = '#14171f';
    ctx.fillRect(dx + 4 * u, dy + 8 * u, 8 * u, 6 * u);
  }

  private machinesOn = false;
  private minersOn = false;
  private machinesSun = false;
  private batteryFill = 0;

  /** Per-frame tile art: torch flames and bobbing chests over the cached chunks. */
  private drawDynamic(ctx: CanvasRenderingContext2D, world: Game['world'], x0: number, y0: number, x1: number, y1: number, shakeX: number, shakeY: number, time: number): void {
    const ts = TS * this.scale;
    for (let ty = Math.max(0, y0); ty <= Math.min(world.h - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(world.w - 1, x1); tx++) {
        const t = world.tiles[ty * world.w + tx];
        if (t === T.TORCH) this.drawTorch(ctx, this.sx(tx, shakeX), this.sy(ty, shakeY), ts, time + tx);
        else if (t === T.BATTERY) {
          const n = Math.round(this.batteryFill * 4);
          const bx = this.sx(tx, shakeX);
          const by = this.sy(ty, shakeY);
          const u = ts / 16;
          ctx.fillStyle = '#7dff9a';
          for (let i = 0; i < n; i++) ctx.fillRect(bx + 6 * u, by + (12 - i * 2) * u, 4 * u, 1.4 * u);
        } else if (t === T.SMELTER && this.machinesOn) {
          const f = 0.6 + 0.4 * Math.sin(time * 9 + tx);
          ctx.fillStyle = `rgba(255,${120 + 80 * f | 0},40,${0.7 + 0.3 * f})`;
          ctx.fillRect(this.sx(tx, shakeX) + ts * 0.3, this.sy(ty, shakeY) + ts * 0.55, ts * 0.4, ts * 0.3);
        } else if (t === T.MINER && this.minersOn) {
          const bob = Math.abs(Math.sin(time * 8 + tx)) * ts * 0.12;
          ctx.fillStyle = '#c9d4e8';
          ctx.fillRect(this.sx(tx, shakeX) + ts * 0.4, this.sy(ty, shakeY) + ts * 0.62 + bob, ts * 0.2, ts * 0.2);
        } else if (t === T.SOLAR && this.machinesSun) {
          ctx.fillStyle = 'rgba(159,216,255,0.35)';
          const gx = this.sx(tx, shakeX) + ts * (0.1 + 0.8 * ((time * 0.4 + tx * 0.37) % 1));
          ctx.fillRect(gx, this.sy(ty, shakeY) + ts * 0.2, ts * 0.12, ts * 0.45);
        } else if (t === T.CHEST) {
          const bob = Math.sin(time * 3 + tx) > 0.6 ? this.scale : 0;
          ctx.drawImage(this.decor.chest, 0, 0, TS, TS, this.sx(tx, shakeX), this.sy(ty, shakeY) - bob, ts, ts);
        }
      }
    }
  }

  /** Chunk cache: CHUNK x CHUNK tiles pre-drawn at 1x; redrawn only when a tile in or next to it changes. */
  private chunks = new Map<number, HTMLCanvasElement>();
  private chunkWorld: Game['world'] | null = null;
  private chunkSeen = 0;

  private syncChunks(world: Game['world']): void {
    if (this.chunkWorld !== world) {
      this.chunks.clear();
      this.chunkWorld = world;
      this.chunkSeen = world.changes.length;
      return;
    }
    if (world.changesOverflow) {
      world.changesOverflow = false;
      world.changes.length = 0;
      this.chunks.clear();
      return;
    }
    const ch = world.changes;
    for (let k = this.chunkSeen; k < ch.length; k++) {
      const i = ch[k];
      const x = i % world.w;
      const y = Math.floor(i / world.w);
      // Neighbours change autotile edges and leaf masks, so touch adjacent chunks too.
      for (const [ox, oy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
        this.chunks.delete(chunkKey(Math.floor((x + ox) / CHUNK), Math.floor((y + oy) / CHUNK)));
      }
    }
    world.changes.length = 0;
    this.chunkSeen = 0;
    // Bound memory (each chunk is 512x512, ~1 MB): evict chunks far from the camera.
    if (this.chunks.size > MAX_CHUNKS) {
      const ccx = this.camX / CHUNK;
      const ccy = this.camY / CHUNK;
      for (const key of this.chunks.keys()) {
        const kx = key % 4096;
        const ky = Math.floor(key / 4096);
        if (Math.abs(kx + 0.5 - ccx) > 3 || Math.abs(ky + 0.5 - ccy) > 3) this.chunks.delete(key);
      }
    }
  }

  /** Build at most one missing chunk per frame in a one-chunk ring around the view, so walking never stalls. */
  private prefetchChunk(world: Game['world'], cx0: number, cy0: number, cx1: number, cy1: number): void {
    const maxCx = Math.floor((world.w - 1) / CHUNK);
    const maxCy = Math.floor((world.h - 1) / CHUNK);
    for (let cy = Math.max(0, cy0 - 1); cy <= Math.min(maxCy, cy1 + 1); cy++) {
      for (let cx = Math.max(0, cx0 - 1); cx <= Math.min(maxCx, cx1 + 1); cx++) {
        if (!this.chunks.has(chunkKey(cx, cy))) {
          this.chunk(world, cx, cy);
          return;
        }
      }
    }
  }

  private chunk(world: Game['world'], cx: number, cy: number): HTMLCanvasElement {
    const key = chunkKey(cx, cy);
    let c = this.chunks.get(key);
    if (c) return c;
    c = makeCanvas(CHUNK * TS, CHUNK * TS);
    const cctx = c.getContext('2d');
    if (cctx) {
      cctx.imageSmoothingEnabled = false;
      for (let y = 0; y < CHUNK; y++) {
        const ty = cy * CHUNK + y;
        if (ty < 0 || ty >= world.h) continue;
        for (let x = 0; x < CHUNK; x++) {
          const tx = cx * CHUNK + x;
          if (tx < 0 || tx >= world.w) continue;
          this.drawTile(cctx, world, tx, ty, x * TS, y * TS, TS, 1);
        }
      }
    }
    this.chunks.set(key, c);
    return c;
  }

  /** Number of cached chunks (debug/e2e). */
  chunkCount(): number {
    return this.chunks.size;
  }

  private reachable(game: Game, aim: Aim): boolean {
    const dx = aim.tx + 0.5 - game.body.x;
    const dy = aim.ty + 0.5 - (game.body.y - BODY_H / 2);
    return dx * dx + dy * dy <= REACH * REACH;
  }

  /** Sky palette blended from the biomes around the camera, so walking between biomes fades the sky. */
  private skyAt(world: Game['world']): [string, string, string, string] {
    const weights = BIOME_IDS.map(() => 0);
    const cx = Math.floor(this.camX);
    for (let dx = -60; dx <= 60; dx += 6) {
      const x = Math.min(world.w - 1, Math.max(0, cx + dx));
      weights[world.biome[x] ?? 0] += 1 - Math.abs(dx) / 66;
    }
    return blendSky(weights);
  }

  private drawSkyDecor(ctx: CanvasRenderingContext2D, horizon: number, time: number, world: Game['world'], gameTime: number): void {
    const ts = TS * this.scale;
    // Sun by day, moon by night, arcing across the sky with the day phase.
    const ph = dayPhase(gameTime);
    const sh = sunHeight(gameTime);
    const arc = (p: number): number => this.w * (0.1 + 0.8 * ((p % 0.5) / 0.5));
    const body = (x: number, hgt: number, core: string, glow: string, r: number): void => {
      const y = horizon - ts * 2 - hgt * ts * 12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ts * r * 2.5);
      g.addColorStop(0, glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - ts * r * 2.5, y - ts * r * 2.5, ts * r * 5, ts * r * 5);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, ts * r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    };
    if (sh > -0.2) body(arc(ph), sh, 'rgba(255,214,150,0.95)', 'rgba(255,184,107,0.5)', 2);
    else body(arc(ph - 0.5), -sh, 'rgba(220,230,255,0.9)', 'rgba(160,180,255,0.25)', 1.2);
    // Stars: faint by day, bright at night.
    ctx.fillStyle = `rgba(255,255,255,${(0.15 + 0.75 * (1 - this.day)).toFixed(3)})`;
    for (let i = 0; i < 90; i++) {
      const sx = hash2(i, 1, 9) * this.w;
      const sy = hash2(i, 2, 9) * Math.max(1, horizon - ts * 6);
      if (sy < horizon - ts * 4) ctx.fillRect(sx, sy, this.scale, this.scale);
    }
    // Parallax skyline; each silhouette takes the shape of the biome it stands over.
    const par = 0.55;
    const left = Math.floor(this.camX * par - this.w / 2 / ts) - 3;
    const right = Math.ceil(this.camX * par + this.w / 2 / ts) + 3;
    const base = horizon + ts * 2;
    for (let i = Math.floor(left / 4); i <= Math.ceil(right / 4); i++) {
      const wx = i * 4 + hash2(i, 3, 5) * 3;
      const col = Math.min(world.w - 1, Math.max(0, Math.round(this.camX + (wx - this.camX * par))));
      const bio = world.biome[col] ?? 0;
      const th = 3 + Math.floor(hash2(i, 4, 5) * 11);
      const tw = 1.4 + hash2(i, 5, 5) * 1.8;
      const x = Math.round(this.w / 2 + (wx - this.camX * par) * ts);
      ctx.fillStyle = this.sky[3];
      if (bio === B.JUNGLE) {
        // Giant alien trees.
        ctx.fillRect(x + ts * 0.5, base - th * ts, Math.max(2, ts * 0.5), th * ts);
        ctx.beginPath();
        ctx.ellipse(x + ts * 0.75, base - th * ts, ts * (1.6 + tw), ts * (1 + tw * 0.4), 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (bio === B.CRYSTAL || bio === B.FROST || bio === B.ASH) {
        // Spires, mountains or ash cones.
        const half = bio === B.CRYSTAL ? tw * ts * 0.5 : tw * ts * (bio === B.FROST ? 2.4 : 2);
        const peak = bio === B.ASH ? th * 0.6 : th;
        ctx.beginPath();
        ctx.moveTo(x - half, base);
        ctx.lineTo(x + (bio === B.ASH ? -half * 0.25 : 0), base - peak * ts);
        if (bio === B.ASH) ctx.lineTo(x + half * 0.25, base - peak * ts);
        ctx.lineTo(x + half, base);
        ctx.fill();
        if (bio === B.FROST) {
          ctx.fillStyle = 'rgba(230,246,255,0.55)';
          ctx.beginPath();
          ctx.moveTo(x - half * 0.25, base - peak * ts * 0.75);
          ctx.lineTo(x, base - peak * ts);
          ctx.lineTo(x + half * 0.25, base - peak * ts * 0.75);
          ctx.fill();
        } else if (bio === B.ASH && Math.floor(time * 2 + i) % 3 !== 0) {
          ctx.fillStyle = 'rgba(255,120,50,0.7)';
          ctx.fillRect(x - half * 0.2, base - peak * ts, half * 0.4, this.scale * 2);
        } else if (bio === B.CRYSTAL) {
          ctx.fillStyle = 'rgba(200,170,255,0.6)';
          ctx.fillRect(x - this.scale, base - peak * ts * 0.7, this.scale * 2, this.scale * 2);
        }
      } else {
        // Ruined towers with blinking windows.
        ctx.fillRect(x, base - th * ts, Math.round(tw * ts), th * ts);
        ctx.fillStyle = hash2(i, 6, 5) > 0.5 ? 'rgba(232,127,91,0.8)' : 'rgba(54,224,232,0.7)';
        const win = Math.floor(hash2(i, 7, 5) * th);
        if (Math.floor(time * 0.7 + i) % 5 !== 0) ctx.fillRect(x + ts * 0.4, base - (win + 1) * ts + ts * 0.3, this.scale * 2, this.scale * 2);
      }
    }
  }

  private drawLadder(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number): void {
    const u = ts / 16;
    ctx.fillStyle = '#8a6a36';
    ctx.fillRect(dx + 3 * u, dy, 2 * u, ts);
    ctx.fillRect(dx + 11 * u, dy, 2 * u, ts);
    ctx.fillStyle = '#c9a35a';
    for (let r = 2; r < 16; r += 5) ctx.fillRect(dx + 3 * u, dy + r * u, 10 * u, 2 * u);
  }

  private drawTorch(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number, t: number): void {
    const u = ts / 16;
    ctx.fillStyle = '#5a4630';
    ctx.fillRect(dx + 7 * u, dy + 7 * u, 2 * u, 8 * u);
    ctx.fillStyle = Math.floor(t * 8) % 2 === 0 ? '#ffd24a' : '#ff9a3c';
    ctx.fillRect(dx + 6 * u, dy + 3 * u, 4 * u, 5 * u);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(dx + 7 * u, dy + 5 * u, 2 * u, 2 * u);
  }

  /** Flood-fill light map for the visible region (plus a margin so off-screen torches still reach in). */
  private lightKey = '';
  private light: LightGrid | null = null;
  private lightCanvas: HTMLCanvasElement | null = null;

  /** Current light level at a tile (debug/e2e). */
  lightLevel(tx: number, ty: number): number {
    return this.light ? levelAt(this.light, tx, ty) : -1;
  }

  private drawDarkness(ctx: CanvasRenderingContext2D, game: Game, _cx: number, _cy: number, time: number): void {
    const world = game.world;
    const ts = TS * this.scale;
    const margin = Math.ceil(LEVEL_CAP / AIR_COST / 2);
    const x0 = Math.floor(this.camX - this.w / 2 / ts) - margin;
    const y0 = Math.floor(this.camY - this.h / 2 / ts) - margin;
    const lw = Math.ceil(this.w / ts) + margin * 2 + 2;
    const lh = Math.ceil(this.h / ts) + margin * 2 + 2;
    const b = game.body;
    const ptx = Math.floor(b.x);
    const pty = Math.floor(b.y - BODY_H / 2);
    const lampR = game.derived.lampRadius;
    // Night dims the open sky (but keeps it readable); steps of 4 levels so the cache is not rebuilt every frame.
    const skyLevel = Math.round((SKY_LEVEL * (0.45 + 0.55 * daylight(game.time))) / 4) * 4;
    const key = `${x0},${y0},${lw},${lh},${ptx},${pty},${lampR},${world.version},${world.torches.size},${skyLevel}`;
    if (key !== this.lightKey || !this.light) {
      this.lightKey = key;
      const sources = frameSources(world.torches, world.w, { x: ptx, y: pty, radius: lampR }, { x: world.padX, y: world.padY });
      // Crystals and cave mushrooms glow faintly, so deep caves have landmarks.
      for (let yy = Math.max(0, y0); yy < Math.min(world.h, y0 + lh); yy++) {
        for (let xx = Math.max(0, x0); xx < Math.min(world.w, x0 + lw); xx++) {
          const tt = world.tiles[yy * world.w + xx];
          if (tt === T.TERMINAL) sources.push({ x: xx, y: yy, level: 22 });
          else if (tt === T.ACID_POOL && world.get(xx, yy - 1) !== T.ACID_POOL) sources.push({ x: xx, y: yy, level: 14 });
          else if (tt === T.CRYSTAL && !world.isSolid(xx, yy - 1) || tt === T.CRYSTAL && !world.isSolid(xx, yy + 1)) sources.push({ x: xx, y: yy, level: 18 });
          else if (tt === T.PLANT && yy > world.surface[xx] + 1) sources.push({ x: xx, y: yy, level: 14 });
        }
      }
      this.light = computeLight(world, x0, y0, lw, lh, sources, skyLevel);
      if (!this.lightCanvas || this.lightCanvas.width !== lw || this.lightCanvas.height !== lh) this.lightCanvas = makeCanvas(lw, lh);
      const lctx = this.lightCanvas.getContext('2d');
      if (lctx) {
        const img = lctx.createImageData(lw, lh);
        const lv = this.light.levels;
        for (let k = 0; k < lv.length; k++) {
          img.data[k * 4] = 5;
          img.data[k * 4 + 1] = 4;
          img.data[k * 4 + 2] = 10;
          img.data[k * 4 + 3] = Math.round(255 * DARK_MAX * (1 - brightness(lv[k])));
        }
        lctx.putImageData(img, 0, 0);
      }
    }
    if (this.lightCanvas) {
      // One pixel per tile, scaled with smoothing: per-tile light with soft interpolation between tiles.
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.lightCanvas, 0, 0, lw, lh, this.sx(x0, 0), this.sy(y0, 0), lw * ts, lh * ts);
      ctx.imageSmoothingEnabled = false;
    }
    const low = game.battery / game.derived.maxBattery;
    if (low < 0.2 && !game.isAtBase()) {
      const pulse = 0.12 + 0.1 * Math.sin(time * 6);
      const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.7);
      g.addColorStop(0, 'rgba(255,40,40,0)');
      g.addColorStop(1, `rgba(255,40,40,${pulse + (low === 0 ? 0.2 : 0)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

export { TILE_COLORS };

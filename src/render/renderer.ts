import type { Game } from '../sim/game';
import { REACH } from '../sim/game';
import { onLadder } from '../sim/physics';
import { ENEMIES } from '../sim/enemies';
import { hash2 } from '../sim/rng';
import { T } from '../sim/tiles';
import { BODY_H } from '../sim/physics';
import type { Fx } from './fx';
import { EDGE_N, MASKS, edgeMask, growsMoss, isBlock } from './autotile';
import { ENEMY_SCALE, MOSS_H, TILE_COLORS, TS, VARIANTS, atlasCol, buildAtlas, buildMoss, buildWallAtlas, drawEnemySprite, drawPlayer, makeCanvas } from './sprites';
import { AIR_COST, DARK_MAX, LEVEL_CAP, SKY_LEVEL, brightness, computeLight, frameSources, levelAt, type LightGrid } from './lightmap';

export interface Aim {
  tx: number;
  ty: number;
}

export class Renderer {
  private atlas = buildAtlas();
  private moss = buildMoss();
  private wallAtlas = buildWallAtlas();
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
      g.addColorStop(0, '#0b1026');
      g.addColorStop(0.55, '#2a1f4d');
      g.addColorStop(1, '#e87f5b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, Math.min(h, skyBottom));
      this.drawSkyDecor(ctx, horizon, time);
    }

    // Tiles.
    const x0 = Math.floor(this.camX - w / 2 / ts) - 1;
    const x1 = Math.ceil(this.camX + w / 2 / ts) + 1;
    const y0 = Math.floor(this.camY - h / 2 / ts) - 1;
    const y1 = Math.ceil(this.camY + h / 2 / ts) + 1;
    const get = (x: number, y: number): number => world.get(x, y);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || tx >= world.w || ty < 0 || ty >= world.h) continue;
        const t = world.tiles[ty * world.w + tx];
        const dx = this.sx(tx, shakeX);
        const dy = this.sy(ty, shakeY);
        if (t === T.AIR) {
          this.drawBack(ctx, world, tx, ty, dx, dy, ts);
          continue;
        }
        if (t === T.TORCH) {
          this.drawBack(ctx, world, tx, ty, dx, dy, ts);
          this.drawTorch(ctx, dx, dy, ts, time + tx);
          continue;
        }
        if (t === T.LADDER) {
          this.drawBack(ctx, world, tx, ty, dx, dy, ts);
          this.drawLadder(ctx, dx, dy, ts);
          continue;
        }
        if (t === T.PLATFORM) {
          this.drawBack(ctx, world, tx, ty, dx, dy, ts);
          ctx.fillStyle = '#9fb0c8';
          ctx.fillRect(dx, dy, ts, Math.max(2, ts * 0.22));
          ctx.fillStyle = '#55627a';
          ctx.fillRect(dx, dy + Math.max(2, ts * 0.22), ts, Math.max(1, ts * 0.08));
          continue;
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
          continue;
        }
        const v = Math.floor(hash2(tx, ty, 7) * VARIANTS);
        const mask = isBlock(t) ? edgeMask(get, tx, ty) : MASKS - 1;
        // Rounded corners are transparent: show the cave wall behind them underground.
        if (mask !== 0) this.drawBack(ctx, world, tx, ty, dx, dy, ts);
        ctx.drawImage(this.atlas, atlasCol(v, mask) * TS, t * TS, TS, TS, dx, dy, ts, ts);
        if (mask & EDGE_N && growsMoss(t) && ty <= world.surface[tx]) {
          ctx.drawImage(this.moss, v * TS, 0, TS, MOSS_H, dx, dy, ts, MOSS_H * scale);
        }
      }
    }

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

  private reachable(game: Game, aim: Aim): boolean {
    const dx = aim.tx + 0.5 - game.body.x;
    const dy = aim.ty + 0.5 - (game.body.y - BODY_H / 2);
    return dx * dx + dy * dy <= REACH * REACH;
  }

  private drawSkyDecor(ctx: CanvasRenderingContext2D, horizon: number, time: number): void {
    const ts = TS * this.scale;
    // Dead sun.
    const sunX = this.w * 0.78 - (this.camX % 200) * 0.2;
    const sunY = horizon - ts * 9;
    const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, ts * 5);
    sg.addColorStop(0, 'rgba(255,184,107,0.55)');
    sg.addColorStop(1, 'rgba(255,184,107,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sunX - ts * 5, sunY - ts * 5, ts * 10, ts * 10);
    // Stars.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 60; i++) {
      const sx = hash2(i, 1, 9) * this.w;
      const sy = hash2(i, 2, 9) * Math.max(1, horizon - ts * 6);
      if (sy < horizon - ts * 4) ctx.fillRect(sx, sy, this.scale, this.scale);
    }
    // Ruined towers on a parallax layer.
    const par = 0.55;
    const left = Math.floor(this.camX * par - this.w / 2 / ts) - 3;
    const right = Math.ceil(this.camX * par + this.w / 2 / ts) + 3;
    for (let i = Math.floor(left / 4); i <= Math.ceil(right / 4); i++) {
      const wx = i * 4 + hash2(i, 3, 5) * 3;
      const th = 3 + Math.floor(hash2(i, 4, 5) * 11);
      const tw = 1.4 + hash2(i, 5, 5) * 1.8;
      const x = Math.round(this.w / 2 + (wx - this.camX * par) * ts);
      const base = horizon + ts * 2;
      ctx.fillStyle = '#1a1536';
      ctx.fillRect(x, base - th * ts, Math.round(tw * ts), th * ts);
      ctx.fillStyle = hash2(i, 6, 5) > 0.5 ? 'rgba(232,127,91,0.8)' : 'rgba(54,224,232,0.7)';
      const win = Math.floor(hash2(i, 7, 5) * th);
      if (Math.floor(time * 0.7 + i) % 5 !== 0) ctx.fillRect(x + ts * 0.4, base - (win + 1) * ts + ts * 0.3, this.scale * 2, this.scale * 2);
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
    const key = `${x0},${y0},${lw},${lh},${ptx},${pty},${lampR},${world.version},${world.torches.size}`;
    if (key !== this.lightKey || !this.light) {
      this.lightKey = key;
      const sources = frameSources(world.torches, world.w, { x: ptx, y: pty, radius: lampR }, { x: world.padX, y: world.padY });
      this.light = computeLight(world, x0, y0, lw, lh, sources, SKY_LEVEL);
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

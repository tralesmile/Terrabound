import type { Game } from '../sim/game';
import { REACH } from '../sim/game';
import { ENEMIES } from '../sim/enemies';
import { hash2 } from '../sim/rng';
import { T } from '../sim/tiles';
import { BODY_H } from '../sim/physics';
import type { Fx } from './fx';
import { TILE_COLORS, TS, VARIANTS, buildAtlas, buildBackdrop, drawPlayer } from './sprites';

export interface Aim {
  tx: number;
  ty: number;
}

export class Renderer {
  private atlas = buildAtlas();
  private backdrop = buildBackdrop();
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
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || tx >= world.w || ty < 0 || ty >= world.h) continue;
        const t = world.tiles[ty * world.w + tx];
        const dx = this.sx(tx, shakeX);
        const dy = this.sy(ty, shakeY);
        if (t === T.AIR) {
          if (ty >= world.surface[tx]) ctx.drawImage(this.backdrop, 0, 0, TS, TS, dx, dy, ts, ts);
          continue;
        }
        const v = Math.floor(hash2(tx, ty, 7) * VARIANTS);
        ctx.drawImage(this.atlas, v * TS, t * TS, TS, TS, dx, dy, ts, ts);
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
    for (const e of game.enemies) {
      const d = ENEMIES[e.kind];
      const ex = this.sx(e.x, shakeX);
      const ey = this.sy(e.y, shakeY);
      const w = d.halfW * 2 * ts;
      const h = d.h * ts;
      ctx.fillStyle = e.iframes > 0 ? '#ffffff' : d.flying ? '#b04aff' : '#d9663a';
      ctx.fillRect(ex - w / 2, ey - h, w, h);
      ctx.fillStyle = '#1a0f10';
      ctx.fillRect(ex + e.dir * w * 0.15 - w * 0.12, ey - h * 0.7, w * 0.24, h * 0.22);
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
    });

    // Particles and floating text.
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max + 0.2));
      ctx.fillStyle = p.color;
      ctx.fillRect(this.sx(p.x, shakeX), this.sy(p.y, shakeY), p.size * scale, p.size * scale);
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

  private drawDarkness(ctx: CanvasRenderingContext2D, game: Game, cx: number, cy: number, time: number): void {
    const depth = game.depth;
    const strength = Math.min(0.94, Math.max(0, (depth - 1) / 9) * 0.94);
    if (strength > 0.01) {
      const radius = (6.5 + Math.max(0, 2.5 - depth / 40)) * TS * this.scale;
      const g = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
      g.addColorStop(0, 'rgba(5,4,10,0)');
      g.addColorStop(1, `rgba(5,4,10,${strength})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
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

import type { Game, Tool } from '../sim/game';
import { ITEM_IDS, ITEMS, PLACEABLE, visiblePlaceables, invCount, invTotal, type Inventory } from '../sim/tiles';
import { UPGRADES } from '../sim/upgrades';
import { RECIPES } from '../sim/recipes';

export type UiAction =
  | { k: 'start' }
  | { k: 'shop' }
  | { k: 'close' }
  | { k: 'mode' }
  | { k: 'mute' }
  | { k: 'buy'; id: string }
  | { k: 'craft'; id: string }
  | { k: 'dive' }
  | { k: 'sel'; i: number }
  | { k: 'tool' }
  | { k: 'settool'; t: Tool };

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  a: UiAction;
}

interface Toast {
  text: string;
  color: string;
  life: number;
}

const TOOL_SLOTS: { tool: Tool; label: string; color: string }[] = [
  { tool: 'drill', label: 'DRL', color: '#9aa3b8' },
  { tool: 'blade', label: 'BLD', color: '#36e0e8' },
  { tool: 'pistol', label: 'GUN', color: '#ffd24a' },
];

const FONT = 'ui-monospace, Menlo, Consolas, "Courier New", monospace';
const SHORT: Record<string, string> = { rust: 'rust', metal: 'metal', iron_scrap: 'iron', copper_wire: 'copper' };

export function costText(cost: Inventory): string {
  const parts: string[] = [];
  for (const id of ITEM_IDS) {
    const n = cost[id] ?? 0;
    if (n > 0) parts.push(`${n} ${SHORT[id]}`);
  }
  return parts.join(', ');
}

/** Canvas-drawn HUD and menus. All coordinates are CSS pixels. */
export class UI {
  screen: 'title' | 'play' = 'title';
  shopOpen = false;
  placeMode = false;
  touch = false;
  toasts: Toast[] = [];
  private rects: Rect[] = [];

  toast(text: string, color = '#ffffff'): void {
    if (this.toasts.length >= 4) this.toasts.shift();
    this.toasts.push({ text, color, life: 2.4 });
  }

  update(dt: number): void {
    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter((t) => t.life > 0);
  }

  hit(x: number, y: number): UiAction | null {
    for (let i = this.rects.length - 1; i >= 0; i--) {
      const r = this.rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.a;
    }
    return null;
  }

  /** True when the pointer is over interactive UI (so the world should not dig underneath). */
  blocks(x: number, y: number): boolean {
    return this.hit(x, y) !== null || this.screen === 'title' || this.shopOpen;
  }

  private text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = '#fff', align: CanvasTextAlign = 'left', maxW = 0): void {
    ctx.font = `bold ${size}px ${FONT}`;
    if (maxW > 0) {
      // Shrink long lines so they never run off small screens.
      const wide = ctx.measureText(s).width;
      if (wide > maxW) ctx.font = `bold ${Math.max(8, Math.floor((size * maxW) / wide))}px ${FONT}`;
    }
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(s, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  private button(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, a: UiAction, u: number, opts: { enabled?: boolean; color?: string; pulse?: boolean } = {}): void {
    const enabled = opts.enabled !== false;
    ctx.fillStyle = enabled ? (opts.color ?? '#1f6f78') : '#2a2d38';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = enabled ? '#36e0e8' : '#454a5c';
    ctx.lineWidth = opts.pulse ? 3 : 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    this.text(ctx, label, x + w / 2, y + h / 2, Math.round(u * 0.95), enabled ? '#ffffff' : '#8a90a2', 'center');
    if (enabled) this.rects.push({ x, y, w, h, a });
  }

  private bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string, label: string, u: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, Math.max(0, frac))), h - 4);
    this.text(ctx, label, x + 6, y + h / 2, Math.round(u * 0.8), '#fff');
  }

  draw(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, time: number): void {
    this.rects = [];
    const u = Math.max(11, Math.min(20, Math.round(Math.min(w, h) / 26)));
    if (this.screen === 'title') {
      this.drawTitle(ctx, game, w, h, u, time);
      return;
    }
    if (this.shopOpen) {
      this.drawShop(ctx, game, w, h, u);
      return;
    }
    this.drawHud(ctx, game, w, h, u, time);
  }

  private drawTitle(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    ctx.fillStyle = 'rgba(8,6,16,0.72)';
    ctx.fillRect(0, 0, w, h);
    const big = Math.round(Math.min(u * 3.2, w / 9));
    this.text(ctx, 'TERRABOUND', w / 2, h * 0.3, big, '#36e0e8', 'center', w - u * 2);
    this.text(ctx, 'Dig. Automate. Survive the Hollow.', w / 2, h * 0.3 + big * 0.95, Math.round(u * 1.05), '#ffcf4a', 'center', w - u * 2);
    const bw = Math.min(w * 0.7, u * 16);
    const bh = u * 3;
    this.button(ctx, w / 2 - bw / 2, h * 0.55, bw, bh, this.touch ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', { k: 'start' }, u, { pulse: Math.floor(time * 2) % 2 === 0 });
    const best = game.stats.deepest;
    if (best > 0) this.text(ctx, `Best depth ${best}m   Deaths ${game.stats.deaths}`, w / 2, h * 0.55 + bh + u * 1.6, Math.round(u * 0.9), '#c9d0e4', 'center');
    if (!this.touch) this.text(ctx, 'A/D move  W/Space jump  Hold click: dig  Right click: build  B: workshop', w / 2, h - u * 1.6, Math.round(u * 0.7), '#8a90a2', 'center', w - u * 2);
  }

  private drawHud(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    const d = game.derived;
    const bw = Math.min(w * 0.45, u * 14);
    const bh = u * 1.25;
    const x = u;
    let y = u;
    this.bar(ctx, x, y, bw, bh, game.hp / d.maxHp, '#ff5a5a', `HP ${Math.ceil(game.hp)}`, u);
    y += bh + u * 0.4;
    const low = game.battery / d.maxBattery < 0.2;
    this.bar(ctx, x, y, bw, bh, game.battery / d.maxBattery, low ? '#ff9a3c' : '#36e0e8', `BAT ${Math.ceil(game.battery)}`, u);
    y += bh + u * 0.9;
    const carried = invTotal(game.carried);
    this.text(ctx, `Depth ${Math.floor(game.depth)}m   Pack ${carried}/${d.packCap}`, x, y, Math.round(u * 0.95), carried >= d.packCap ? '#ff9a3c' : '#ffffff');

    // Right-side buttons.
    const bwid = u * 5.2;
    const bhgt = u * 2.4;
    let by = u;
    const bx = w - bwid - u;
    this.button(ctx, bx, by, bwid, bhgt, game.muted ? 'SOUND OFF' : 'SOUND ON', { k: 'mute' }, u * 0.8);
    by += bhgt + u * 0.5;
    if (game.isAtBase()) {
      const can = game.affordableUpgrades().length > 0;
      this.button(ctx, bx, by, bwid, bhgt, can ? 'SHOP !' : 'SHOP', { k: 'shop' }, u, { pulse: can && Math.floor(time * 2) % 2 === 0 });
      by += bhgt + u * 0.5;
    }
    if (this.touch) this.button(ctx, bx, by, bwid, bhgt, this.placeMode ? 'MODE BUILD' : 'MODE DIG', { k: 'mode' }, u * 0.8, { color: this.placeMode ? '#7a5a1f' : '#1f6f78' });

    // Hotbar: tools first, then placeable blocks.
    const gap = u * 0.4;
    const shown = visiblePlaceables(game.carried, game.selected);
    const count = TOOL_SLOTS.length + shown.length;
    const slot = Math.min(u * 3.4, (w - u * 2 - (count + 1) * gap) / count);
    const total = count * slot + (count - 1) * gap + gap * 2;
    let sx = (w - total) / 2;
    const sy = h - slot - u * 2.2;
    TOOL_SLOTS.forEach((ts, i) => {
      const sel = game.tool === ts.tool;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx, sy, slot, slot);
      ctx.strokeStyle = sel ? '#36e0e8' : '#454a5c';
      ctx.lineWidth = sel ? 3 : 2;
      ctx.strokeRect(sx + 1, sy + 1, slot - 2, slot - 2);
      ctx.fillStyle = ts.color;
      ctx.fillRect(sx + slot * 0.22, sy + slot * 0.18, slot * 0.56, slot * 0.4);
      this.text(ctx, ts.label, sx + slot / 2, sy + slot * 0.8, Math.round(u * 0.8), '#fff', 'center');
      this.rects.push({ x: sx, y: sy, w: slot, h: slot, a: { k: 'settool', t: ts.tool } });
      sx += slot + gap + (i === TOOL_SLOTS.length - 1 ? gap * 2 : 0);
    });
    shown.forEach((id) => {
      const i = PLACEABLE.indexOf(id);
      const sel = game.selected === id;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(sx, sy, slot, slot);
      ctx.strokeStyle = sel ? '#ffcf4a' : '#454a5c';
      ctx.lineWidth = sel ? 3 : 2;
      ctx.strokeRect(sx + 1, sy + 1, slot - 2, slot - 2);
      ctx.fillStyle = ITEMS[id].color;
      ctx.fillRect(sx + slot * 0.22, sy + slot * 0.18, slot * 0.56, slot * 0.4);
      this.text(ctx, `${invCount(game.carried, id)}`, sx + slot / 2, sy + slot * 0.8, Math.round(u * 0.95), '#fff', 'center');
      this.rects.push({ x: sx, y: sy, w: slot, h: slot, a: { k: 'sel', i } });
      sx += slot + gap;
    });

    // Toasts.
    let ty = y + u * 2.2;
    for (const t of this.toasts) {
      ctx.globalAlpha = Math.min(1, t.life / 0.6);
      this.text(ctx, t.text, w / 2, ty, Math.round(u * 1.1), t.color, 'center', w - u * 2);
      ctx.globalAlpha = 1;
      ty += u * 1.5;
    }

    // Contextual warnings and first-minute hints.
    if (low && !game.isAtBase() && Math.floor(time * 2.5) % 2 === 0) this.text(ctx, 'BATTERY LOW - RETURN TO THE PAD', w / 2, h * 0.2, Math.round(u * 1.2), '#ff9a3c', 'center', w - u * 2);
    if (game.stats.playTime < 40) {
      const hint = this.touch ? 'Left thumb: move, drag up to jump. Right side: dig.' : 'A/D move, W jump. Hold click to dig, right click to build, 1-3 or Q switch tool. Return to the pad to bank loot.';
      this.text(ctx, hint, w / 2, h - u * 0.7, Math.round(u * 0.75), '#c9d0e4', 'center', w - u * 2);
    }
  }

  private drawShop(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    ctx.fillStyle = 'rgba(8,6,16,0.82)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(w - u * 2, u * 40);
    const rowH = u * 2.9;
    const ph = Math.min(h - u * 2, u * 2.4 + u * 2 + (UPGRADES.length + RECIPES.length) * rowH + u * 5.6);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    ctx.fillStyle = '#12121c';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#36e0e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    this.text(ctx, 'BASE WORKSHOP', px + u, py + u * 1.4, Math.round(u * 1.4), '#36e0e8');

    // Stash line.
    let sx = px + u;
    const sy = py + u * 3.3;
    for (const id of ITEM_IDS) {
      ctx.fillStyle = ITEMS[id].color;
      ctx.fillRect(sx, sy - u * 0.4, u * 0.8, u * 0.8);
      const label = `${game.stash[id] ?? 0}`;
      this.text(ctx, label, sx + u * 1.1, sy, Math.round(u * 0.95));
      sx += (pw - u * 2) / ITEM_IDS.length;
    }

    // Rows.
    let ry = py + u * 4.6;
    for (const up of UPGRADES) {
      const lv = game.upgrades[up.id] ?? 0;
      const maxed = lv >= up.maxLevel;
      const cost = maxed ? null : up.cost(lv);
      const afford = !!cost && ITEM_IDS.every((id) => (game.stash[id] ?? 0) >= (cost[id] ?? 0));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      this.text(ctx, `${up.name}  Lv ${lv}/${up.maxLevel}`, px + u, ry + rowH * 0.3, Math.round(u * 0.95));
      this.text(ctx, maxed ? up.desc : `${up.desc}   Cost: ${costText(cost ?? {})}`, px + u, ry + rowH * 0.68, Math.round(u * 0.72), maxed ? '#8a90a2' : afford ? '#9ff6a0' : '#ff8a8a', 'left', pw - u * 8);
      const bw = u * 5.5;
      this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, maxed ? 'MAX' : 'BUY', { k: 'buy', id: up.id }, u * 0.9, { enabled: afford && !maxed });
      ry += rowH;
    }
    for (const r of RECIPES) {
      const afford = ITEM_IDS.every((id) => (game.stash[id] ?? 0) >= (r.cost[id] ?? 0));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      this.text(ctx, `Fabricator: ${r.name}`, px + u, ry + rowH * 0.3, Math.round(u * 0.95));
      this.text(ctx, `Cost: ${costText(r.cost)}`, px + u, ry + rowH * 0.68, Math.round(u * 0.72), afford ? '#9ff6a0' : '#ff8a8a');
      const bw = u * 5.5;
      this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, 'MAKE', { k: 'craft', id: r.id }, u * 0.9, { enabled: afford });
      ry += rowH;
    }

    const fy = py + ph - u * 4.4;
    const bw = (pw - u * 3) / 2;
    this.button(ctx, px + u, fy, bw, u * 2.4, 'NEW DIVE', { k: 'dive' }, u, { color: '#7a5a1f' });
    this.button(ctx, px + u * 2 + bw, fy, bw, u * 2.4, 'CLOSE', { k: 'close' }, u);
    this.text(ctx, `Best depth ${game.stats.deepest}m   Dives ${game.runs}   Deaths ${game.stats.deaths}`, px + pw / 2, py + ph - u * 0.9, Math.round(u * 0.65), '#8a90a2', 'center', pw - u);
  }
}

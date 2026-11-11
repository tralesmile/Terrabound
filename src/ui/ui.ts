import type { Game, Tool } from '../sim/game';
import { MapView } from './map';
import { CODEX, RECALL_TIME } from '../sim/explore';
import { ITEM_IDS, ITEMS, PLACEABLE, visiblePlaceables, invCount, invTotal, type Inventory, type ItemId } from '../sim/tiles';
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
  | { k: 'tab'; t: ShopTab }
  | { k: 'scroll'; d: number }
  | { k: 'copyseed' }
  | { k: 'enterseed' }
  | { k: 'dive' }
  | { k: 'sel'; i: number }
  | { k: 'tool' }
  | { k: 'settool'; t: Tool }
  | { k: 'map' }
  | { k: 'recall' };

export type ShopTab = 'upgrades' | 'fab';

/** Most shop rows drawn at once; longer lists scroll so the panel always fits a 360 px phone. */
export const SHOP_VISIBLE = 9;

/** Clamp a scroll offset so a window of `visible` rows stays inside `total` rows. */
export function clampScroll(offset: number, total: number, visible = SHOP_VISIBLE): number {
  return Math.max(0, Math.min(Math.floor(offset) || 0, Math.max(0, total - visible)));
}

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
/** Short cost labels; any item without one falls back to its lower-cased display name. */
const SHORT: Partial<Record<ItemId, string>> = { rust: 'rust', metal: 'metal', iron_scrap: 'iron', copper_wire: 'copper' };

export function costText(cost: Inventory): string {
  const parts: string[] = [];
  for (const id of ITEM_IDS) {
    const n = cost[id] ?? 0;
    if (n > 0) parts.push(`${n} ${SHORT[id] ?? ITEMS[id].name.toLowerCase()}`);
  }
  return parts.join(', ');
}

/** Canvas-drawn HUD and menus. All coordinates are CSS pixels. */
/** Stash items worth listing: owned ones, base materials first, at most 8. */
export function stashLine(stash: Inventory): ItemId[] {
  return ITEM_IDS.filter((id) => (stash[id] ?? 0) > 0).slice(0, 8);
}

export class UI {
  mapOpen = false;
  /** Seconds left to confirm abandoning the world (NEW WORLD needs two taps). */
  newWorldArmed = 0;
  private mapView = new MapView();
  screen: 'title' | 'play' = 'title';
  shopOpen = false;
  /** Workshop tab: upgrades or Fabricator recipes (keeps the panel on screen however many rows exist). */
  shopTab: ShopTab = 'upgrades';
  /** First visible row of the current shop tab. */
  shopScroll = 0;

  /** Row count of the current shop tab. */
  shopRows(): number {
    return this.shopTab === 'upgrades' ? UPGRADES.length : RECIPES.length;
  }

  scrollShop(d: number): void {
    this.shopScroll = clampScroll(this.shopScroll + d, this.shopRows());
  }

  setShopTab(t: ShopTab): void {
    this.shopTab = t;
    this.shopScroll = 0;
  }
  placeMode = false;
  touch = false;
  toasts: Toast[] = [];
  private rects: Rect[] = [];

  toast(text: string, color = '#ffffff', life = 2.4): void {
    if (this.toasts.length >= 4) this.toasts.shift();
    this.toasts.push({ text, color, life });
  }

  update(dt: number): void {
    this.newWorldArmed = Math.max(0, this.newWorldArmed - dt);
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
    if (this.mapOpen) {
      this.drawMapScreen(ctx, game, w, h, u, time);
      return;
    }
    this.drawHud(ctx, game, w, h, u, time);
  }

  private drawMapScreen(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    ctx.fillStyle = 'rgba(6,5,12,0.92)';
    ctx.fillRect(0, 0, w, h);
    this.text(ctx, 'MAP', u, u * 1.4, Math.round(u * 1.4), '#36e0e8');
    const found = game.codex.length;
    this.text(ctx, `Codex ${found}/${CODEX.length}`, u * 5, u * 1.4, Math.round(u * 0.9), '#ffcf4a', 'left', w - u * 12);
    const bw = u * 6;
    this.button(ctx, w - bw - u, u * 0.4, bw, u * 2.2, 'CLOSE', { k: 'map' }, u * 0.9);
    this.mapView.draw(ctx, game, u, u * 3.2, w - u * 2, h - u * 6.4, u, time);
    const hint = game.canRecall() ? (this.touch ? 'Surface: tap HOME to beam to the pad' : 'Surface: hold still and press R to beam to the pad') : 'Reach the surface to beam home';
    this.text(ctx, hint, w / 2, h - u * 1.6, Math.round(u * 0.8), '#8a90a2', 'center', w - u * 2);
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
    if (!this.touch) this.text(ctx, 'A/D move  W/Space jump  Hold click: dig  Right click: build  B: workshop  M: map  R: beam home', w / 2, h - u * 1.6, Math.round(u * 0.7), '#8a90a2', 'center', w - u * 2);
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

    if (game.isAtBase() && (game.power.solars > 0 || game.power.smelters > 0 || game.power.batteries > 0 || game.power.miners > 0 || game.power.drones > 0)) {
      const pw = game.power;
      const bat = pw.cap > 0 ? `  Batt ${Math.round((pw.charge / pw.cap) * 100)}%` : '';
      this.text(ctx, `Power ${pw.supply.toFixed(0)}/${pw.demand.toFixed(0)}${bat}`, x, y + u * 1.3, Math.round(u * 0.85), pw.working || pw.supply > 0 ? '#7dff9a' : '#ff9a3c');
    }

    // Right-side buttons.
    const bwid = u * 5.2;
    const bhgt = u * 2.4;
    let by = u;
    const bx = w - bwid - u;
    this.button(ctx, bx, by, bwid, bhgt, game.muted ? 'SOUND OFF' : 'SOUND ON', { k: 'mute' }, u * 0.8);
    by += bhgt + u * 0.5;
    this.button(ctx, bx, by, bwid, bhgt, 'MAP', { k: 'map' }, u * 0.9);
    by += bhgt + u * 0.5;
    if (game.recallT > 0) {
      const pct = Math.min(99, Math.floor((game.recallT / RECALL_TIME) * 100));
      this.button(ctx, bx, by, bwid, bhgt, `BEAM ${pct}%`, { k: 'recall' }, u * 0.8, { color: '#1f6f78', pulse: true });
      by += bhgt + u * 0.5;
    } else if (game.canRecall()) {
      this.button(ctx, bx, by, bwid, bhgt, 'HOME', { k: 'recall' }, u * 0.9);
      by += bhgt + u * 0.5;
    }
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
    const auto = game.stats.playTime >= 40 ? game.hintAutomation(this.touch) : null;
    if (auto) this.text(ctx, auto, w / 2, h - u * 0.7, Math.round(u * 0.75), '#7dffb0', 'center', w - u * 2);
    if (game.stats.playTime < 40) {
      const hint = this.touch ? 'Left thumb: move, drag up to jump. Right side: dig.' : 'A/D move, W jump. Hold click to dig, right click to build, 1-3 or Q switch tool. Return to the pad to bank loot.';
      this.text(ctx, hint, w / 2, h - u * 0.7, Math.round(u * 0.75), '#c9d0e4', 'center', w - u * 2);
    }
  }

  private drawShop(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    ctx.fillStyle = 'rgba(8,6,16,0.82)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(w - u * 2, u * 40);
    const rows = SHOP_VISIBLE;
    const rowH = Math.min(u * 2.9, Math.max(u * 2.3, (h - u * 2 - u * 10) / rows));
    const ph = Math.min(h - u * 2, u * 2.4 + u * 2 + rows * rowH + u * 2.4 + u * 5.6 + u * 2.8);
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
    // Only what you own, so the line stays readable however many item types exist; at most 8 slots.
    const owned = stashLine(game.stash);
    const slot = (pw - u * 2) / Math.max(4, owned.length);
    for (const id of owned) {
      ctx.fillStyle = ITEMS[id].color;
      ctx.fillRect(sx, sy - u * 0.4, u * 0.8, u * 0.8);
      const n = game.stash[id] ?? 0;
      const label = n >= 1000 ? `${Math.floor(n / 1000)}k` : `${n}`;
      this.text(ctx, label, sx + u * 1.1, sy, Math.round(u * 0.95), '#fff', 'left', slot - u * 1.3);
      sx += slot;
    }
    if (owned.length === 0) this.text(ctx, 'Stash empty: dive and bank loot', px + u, sy, Math.round(u * 0.9), '#8a93a8');

    // Rows.
    const total = this.shopRows();
    this.shopScroll = clampScroll(this.shopScroll, total);
    const scrolls = total > SHOP_VISIBLE;
    const arrow = scrolls ? u * 2.4 : 0;
    const tw = (pw - u * 2.4 - arrow * 2 - (scrolls ? u * 0.8 : 0)) / 2;
    const ty = py + u * 4.3;
    for (const [i, t] of (['upgrades', 'fab'] as const).entries()) {
      this.button(ctx, px + u + i * (tw + u * 0.4), ty, tw, u * 1.9, t === 'upgrades' ? 'UPGRADES' : 'FABRICATOR', { k: 'tab', t }, u * 0.9, { color: this.shopTab === t ? '#1f6f78' : '#23262f' });
    }
    if (scrolls) {
      const ax = px + pw - u - arrow * 2 - u * 0.2;
      this.button(ctx, ax, ty, arrow, u * 1.9, '^', { k: 'scroll', d: -1 }, u * 0.9, { enabled: this.shopScroll > 0 });
      this.button(ctx, ax + arrow + u * 0.2, ty, arrow, u * 1.9, 'v', { k: 'scroll', d: 1 }, u * 0.9, { enabled: this.shopScroll < total - SHOP_VISIBLE });
    }
    let ry = py + u * 6.6;
    for (const up of this.shopTab === 'upgrades' ? UPGRADES.slice(this.shopScroll, this.shopScroll + SHOP_VISIBLE) : []) {
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
    for (const r of this.shopTab === 'fab' ? RECIPES.slice(this.shopScroll, this.shopScroll + SHOP_VISIBLE) : []) {
      const locked = (game.upgrades.fab ?? 0) < (r.fab ?? 0);
      const afford = !locked && ITEM_IDS.every((id) => (game.stash[id] ?? 0) >= (r.cost[id] ?? 0));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      this.text(ctx, `Fabricator: ${r.name}`, px + u, ry + rowH * 0.3, Math.round(u * 0.95));
      this.text(ctx, locked ? `Needs Fabricator Lv ${r.fab}` : `Cost: ${costText(r.cost)}`, px + u, ry + rowH * 0.68, Math.round(u * 0.72), afford ? '#9ff6a0' : '#ff8a8a');
      const bw = u * 5.5;
      this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, 'MAKE', { k: 'craft', id: r.id }, u * 0.9, { enabled: afford });
      ry += rowH;
    }

    const fy = py + ph - u * 4.4;
    const bw = (pw - u * 3) / 2;
    this.button(ctx, px + u, fy - u * 2.8, bw, u * 2.2, `COPY ${game.seedCode}`, { k: 'copyseed' }, u * 0.8);
    this.button(ctx, px + u * 2 + bw, fy - u * 2.8, bw, u * 2.2, 'PLAY A CODE', { k: 'enterseed' }, u * 0.8);
    this.button(ctx, px + u, fy, bw, u * 2.4, this.newWorldArmed > 0 ? 'CONFIRM?' : 'NEW WORLD', { k: 'dive' }, u, { color: this.newWorldArmed > 0 ? '#a33a2a' : '#7a5a1f', pulse: this.newWorldArmed > 0 });
    this.button(ctx, px + u * 2 + bw, fy, bw, u * 2.4, 'CLOSE', { k: 'close' }, u);
    this.text(ctx, `Best depth ${game.stats.deepest}m   Dives ${game.runs}   Deaths ${game.stats.deaths}`, px + pw / 2, py + ph - u * 0.9, Math.round(u * 0.65), '#8a90a2', 'center', pw - u);
  }
}

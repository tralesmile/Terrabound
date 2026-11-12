import type { Game, Tool } from '../sim/game';
import { MAP_ZOOMS, MapView } from './map';
import { ICON, drawIcon } from '../render/icons';
import { drawPlayer } from '../render/sprites';
import { playerGear } from '../render/renderer';
import { FOOD, bestHeal, healCount } from '../sim/fishing';
import { GEAR, GEAR_IDS, GEAR_SLOTS, type GearId } from '../sim/gear';
import { BOSSES, bossForBeacon } from '../sim/bosses';
import { BIOMES, type BiomeId } from '../sim/biomes';
import { LAYERS } from '../sim/layers';
import { WEATHER } from '../sim/weather';
import { CODEX, RECALL_TIME } from '../sim/explore';
import { ITEM_IDS, ITEMS, PLACEABLE, visiblePlaceables, invCount, invTotal, type Inventory, type ItemId } from '../sim/tiles';
import { UPGRADES } from '../sim/upgrades';
import { RECIPES } from '../sim/recipes';
import { ACT_INFO, COND_INFO, RULE_MAX, ROLE_INFO } from '../sim/drones';
import { NPC_INFO, TRADES, tradeOpen } from '../sim/npcs';
import { MERCHANT_STOCK } from '../sim/merchant';
import { MODS, MOD_IDS, type ModId } from '../sim/mods';
import type { Trade } from '../sim/npcs';

export type UiAction =
  | { k: 'start' }
  | { k: 'shop' }
  | { k: 'close' }
  | { k: 'mode' }
  | { k: 'mute' }
  | { k: 'buy'; id: string }
  | { k: 'craft'; id: string }
  | { k: 'trade'; id: string }
  | { k: 'modbuy'; id: ModId }
  | { k: 'modfit'; id: ModId }
  | { k: 'tab'; t: ShopTab }
  | { k: 'scroll'; d: number }
  | { k: 'copyseed' }
  | { k: 'enterseed' }
  | { k: 'daily' }
  | { k: 'dive' }
  | { k: 'sel'; i: number }
  | { k: 'tool' }
  | { k: 'settool'; t: Tool }
  | { k: 'map' }
  | { k: 'recall' }
  | { k: 'inv' }
  | { k: 'interact' }
  | { k: 'invsel'; id: ItemId }
  | { k: 'use'; id: ItemId }
  | { k: 'drop'; id: ItemId }
  | { k: 'take'; id: ItemId | 'all' }
  | { k: 'put'; id: ItemId }
  | { k: 'breakchest' }
  | { k: 'ride' }
  | { k: 'heal' }
  | { k: 'dash' }
  | { k: 'craftgear'; id: GearId }
  | { k: 'equip'; id: GearId }
  | { k: 'mapzoom'; d: number }
  | { k: 'mapcenter' }
  | { k: 'victoryclose' }
  | { k: 'share' }
  | { k: 'drones' }
  | { k: 'raids' }
  | { k: 'baynext'; d: number }
  | { k: 'bayrole' }
  | { k: 'rulecond'; i: number }
  | { k: 'ruleact'; i: number }
  | { k: 'ruledel'; i: number }
  | { k: 'ruleadd' };

export type ShopTab = 'upgrades' | 'fab' | 'gear' | 'trade';

export const SHOP_TABS: readonly ShopTab[] = ['upgrades', 'fab', 'gear', 'trade'];
const TAB_LABEL: Record<ShopTab, string> = { upgrades: 'UPGRADES', fab: 'FABRICATE', gear: 'GEAR', trade: 'TRADE' };

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
  /** Toasts in the same group replace each other (a raid shows one line, not a stale stack). */
  group?: string;
}

/** Most toast lines on screen at once; older lines drop first. */
export const TOAST_MAX = 3;

const TOOL_SLOTS: { tool: Tool; label: string; key: string }[] = [
  { tool: 'drill', label: 'Drill', key: '1' },
  { tool: 'blade', label: 'Blade', key: '2' },
  { tool: 'pistol', label: 'Pistol', key: '3' },
  { tool: 'rod', label: 'Fishing rod', key: '4' },
  { tool: 'hook', label: 'Grappling hook', key: '5' },
];

const FONT = 'ui-monospace, Menlo, Consolas, "Courier New", monospace';
/** Short cost labels; any item without one falls back to its lower-cased display name. */
const SHORT: Partial<Record<ItemId, string>> = { rust: 'rust', metal: 'metal', iron_scrap: 'iron', copper_wire: 'copper' };

/**
 * Where toasts go: centred under the HUD bars when the gap left of the right-hand
 * button column is wide enough, otherwise below the button column at full width
 * (phones), so a toast never draws over a button.
 */
export function toastLayout(w: number, u: number, buttonsX: number, buttonsBottom: number, top: number): { y: number; maxW: number } {
  const free = 2 * (buttonsX - u * 0.5 - w / 2);
  if (free >= u * 24) return { y: top, maxW: free };
  return { y: Math.max(top, buttonsBottom + u * 1.2), maxW: w - u * 2 };
}

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
  invOpen = false;
  /** Item highlighted in the inventory. */
  invSel: ItemId | null = null;
  /** Seconds left to confirm abandoning the world (NEW WORLD needs two taps). */
  newWorldArmed = 0;
  readonly mapView = new MapView();
  /** Where the map was last drawn (drag-to-pan hit area). */
  mapRect = { x: 0, y: 0, w: 0, h: 0 };
  screen: 'title' | 'play' = 'title';
  shopOpen = false;
  /** Drone panel (roles and IF/THEN rules per bay) and which bay it shows. */
  dronesOpen = false;
  bayIdx = 0;
  /** Workshop tab: upgrades or Fabricator recipes (keeps the panel on screen however many rows exist). */
  shopTab: ShopTab = 'upgrades';
  /** Rows that fit on screen (set each frame by drawShop). */
  shopVisible = SHOP_VISIBLE;
  /** First visible row of the current shop tab. */
  shopScroll = 0;

  /** Row count of the current shop tab. */
  shopRows(): number {
    return this.shopTab === 'upgrades' ? UPGRADES.length : this.shopTab === 'gear' ? GEAR_IDS.length : this.shopTab === 'trade' ? TRADES.length + MOD_IDS.length + MERCHANT_STOCK : RECIPES.length;
  }

  scrollShop(d: number): void {
    this.shopScroll = clampScroll(this.shopScroll + d, this.shopRows(), this.shopVisible);
  }

  setShopTab(t: ShopTab): void {
    this.shopTab = t;
    this.shopScroll = 0;
  }
  placeMode = false;
  touch = false;
  toasts: Toast[] = [];
  private rects: Rect[] = [];

  toast(text: string, color = '#ffffff', life = 2.4, group?: string): void {
    // The same message twice in a row refreshes the existing line instead of stacking.
    const same = this.toasts.find((t) => t.text === text);
    if (same) {
      same.life = Math.max(same.life, life);
      return;
    }
    if (group) this.toasts = this.toasts.filter((t) => t.group !== group);
    while (this.toasts.length >= TOAST_MAX) this.toasts.shift();
    this.toasts.push({ text, color, life, group });
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
    return this.hit(x, y) !== null || this.screen === 'title' || this.shopOpen || this.dronesOpen;
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
    this.text(ctx, label, x + w / 2, y + h / 2, Math.round(u * 0.95), enabled ? '#ffffff' : '#8a90a2', 'center', w - 6);
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
    if (this.invOpen) {
      this.drawInventory(ctx, game, w, h, u, time);
      return;
    }
    if (this.victory) {
      this.drawVictory(ctx, game, w, h, u, time);
      return;
    }
    this.drawHud(ctx, game, w, h, u, time);
    if (game.boss) this.drawBossBar(ctx, game, w, u);
    else if (game.raid) {
      const left = game.raid.ids.length + game.raid.plan.length - game.raid.next;
      this.text(ctx, `RAID: ${left} RAIDER${left === 1 ? '' : 'S'} LEFT`, w / 2, u * 4.6, Math.round(u * 0.85), Math.floor(time * 2) % 2 ? '#ff5a5a' : '#ff9a7a', 'center');
    }
    else if (game.raidWarn) this.drawRaidWarn(ctx, game, w, h, u, time);
    else if (game.weather !== 'clear') this.text(ctx, WEATHER[game.weather].name.toUpperCase(), w / 2, u * 4.6, Math.round(u * 0.8), game.weather === 'eclipse' ? '#ff5aff' : '#ffcf4a', 'center');
    if (game.chestOpen) this.drawChest(ctx, game, w, h, u);
    if (this.dronesOpen) this.drawDrones(ctx, game, w, h, u);
  }

  /** Raid warning: a countdown under the HUD and a pulsing arrow on the screen edge the wave comes from. */
  private drawRaidWarn(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    const rw = game.raidWarn;
    if (!rw) return;
    const secs = Math.max(0, Math.ceil(rw.at - game.time));
    const from = rw.side < 0 ? 'WEST' : 'EAST';
    const hot = Math.floor(time * 3) % 2 === 0;
    this.text(ctx, `RAID IN ${secs}s: ${rw.n} FROM THE ${from}`, w / 2, u * 4.6, Math.round(u * 0.85), hot ? '#ff9a3c' : '#ffcf4a', 'center');
    const ax = rw.side < 0 ? u * 1.2 : w - u * 1.2;
    const ay = h * 0.5;
    const k = u * (1.1 + 0.25 * Math.sin(time * 8));
    const d = rw.side < 0 ? -1 : 1;
    ctx.fillStyle = hot ? 'rgba(255,90,60,0.9)' : 'rgba(255,154,60,0.75)';
    for (let i = 0; i < 2; i++) {
      const ox = ax - d * i * k * 0.9;
      ctx.beginPath();
      ctx.moveTo(ox + d * k * 0.6, ay);
      ctx.lineTo(ox - d * k * 0.4, ay - k);
      ctx.lineTo(ox - d * k * 0.4, ay + k);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Drone panel: one bay at a time; role button, then up to RULE_MAX "IF x THEN y" rows (tap to cycle). */
  private drawDrones(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    const bays = game.bays();
    if (bays.length === 0) {
      this.dronesOpen = false;
      return;
    }
    this.bayIdx = ((this.bayIdx % bays.length) + bays.length) % bays.length;
    const bay = bays[this.bayIdx];
    const role = game.droneRole(bay.key);
    const rules = game.droneRules(bay.key);
    const pw = Math.min(w - u * 2, u * 32);
    const rowH = u * 2.4;
    const ph = u * 11.5 + rowH * RULE_MAX;
    const px = (w - pw) / 2;
    const py = Math.max(u * 4, (h - ph) / 2 - u * 2);
    this.panel(ctx, px, py, pw, ph);
    this.text(ctx, `DRONE BAY ${this.bayIdx + 1}/${bays.length}`, px + u, py + u * 1.5, Math.round(u * 1.1), '#ffcf4a');
    this.button(ctx, px + pw - u * 5.5, py + u * 0.4, u * 5, u * 2.1, 'CLOSE', { k: 'drones' }, u * 0.8);
    if (bays.length > 1) {
      this.button(ctx, px + pw - u * 11, py + u * 0.4, u * 2.4, u * 2.1, '<', { k: 'baynext', d: -1 }, u);
      this.button(ctx, px + pw - u * 8.3, py + u * 0.4, u * 2.4, u * 2.1, '>', { k: 'baynext', d: 1 }, u);
    }
    let y = py + u * 3.2;
    const ri = ROLE_INFO[role];
    this.button(ctx, px + u, y, pw * 0.42, rowH, `ROLE: ${ri.name.toUpperCase()}`, { k: 'bayrole' }, u * 0.8, { color: '#2a3550' });
    ctx.fillStyle = ri.color;
    ctx.fillRect(px + u + 4, y + 4, u * 0.5, rowH - 8);
    this.text(ctx, ri.desc, px + u * 2 + pw * 0.42, y + rowH / 2, Math.round(u * 0.7), '#c9d0e4', 'left', pw * 0.58 - u * 3);
    y += rowH + u * 1.2;
    if (role === 'survey') {
      this.text(ctx, 'Survey drones work off-map. Pick another role to use rules.', px + u, y + u * 0.6, Math.round(u * 0.72), '#8a90a2', 'left', pw - u * 2);
      return;
    }
    this.text(ctx, 'RULES (top to bottom, first true one wins)', px + u, y, Math.round(u * 0.72), '#8a90a2', 'left', pw - u * 2);
    y += u * 0.9;
    const condW = pw * 0.42;
    const actW = pw * 0.26;
    for (let i = 0; i < RULE_MAX; i++) {
      const r = rules[i];
      const ry = y + i * (rowH + u * 0.4);
      if (!r) {
        if (i === rules.length) this.button(ctx, px + u, ry, pw - u * 2, rowH, '+ ADD RULE', { k: 'ruleadd' }, u * 0.8, { color: '#1f4a3a' });
        continue;
      }
      let x = px + u;
      this.text(ctx, 'IF', x, ry + rowH / 2, Math.round(u * 0.8), '#ffcf4a');
      x += u * 1.6;
      this.button(ctx, x, ry, condW, rowH, COND_INFO[r.when], { k: 'rulecond', i }, u * 0.68, { color: '#2a3550' });
      x += condW + u * 0.4;
      this.text(ctx, 'THEN', x, ry + rowH / 2, Math.round(u * 0.7), '#ffcf4a');
      x += u * 2.6;
      this.button(ctx, x, ry, actW, rowH, ACT_INFO[r.then].name.toUpperCase(), { k: 'ruleact', i }, u * 0.72, { color: '#2a3550' });
      ctx.fillStyle = ACT_INFO[r.then].color;
      ctx.fillRect(x + 3, ry + rowH - 6, actW - 6, 3);
      this.button(ctx, px + pw - u * 3.2, ry, u * 2.2, rowH, 'X', { k: 'ruledel', i }, u * 0.8, { color: '#7a2a2a' });
    }
    y += RULE_MAX * (rowH + u * 0.4) + u * 0.6;
    const d = game.drones.find((f) => f.key === bay.key);
    const now = d ? `Now: ${ACT_INFO[d.act].name}${d.mode === 'dock' ? ' (docked)' : ''}` : 'Now: docked';
    this.text(ctx, `${now}. Otherwise it does its role.`, px + u, y + u * 0.4, Math.round(u * 0.72), '#7dff9a', 'left', pw - u * 2);
  }

  /** Shown once after beating the Hollow AI. */
  victory = false;

  private drawVictory(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    ctx.fillStyle = 'rgba(4,2,10,0.9)';
    ctx.fillRect(0, 0, w, h);
    const glow = 0.6 + Math.sin(time * 2) * 0.4;
    this.text(ctx, 'THE HOLLOW IS FREE', w / 2, h * 0.24, Math.round(u * 2), `rgba(255,90,255,${glow.toFixed(2)})`, 'center', w - u * 2);
    const lines = [
      'The Hollow AI is silent. The machine-planet breathes again.',
      `Bosses beaten: ${game.biomeBossesBeaten()}/5 + the Hollow AI`,
      `Deepest dive: ${game.stats.deepest}m   Deaths: ${game.stats.deaths}   Codex: ${game.codex.length}/${CODEX.length}`,
      'Made by the Terrabound team. Thank you for playing!',
      'Your world, base and gear stay: keep exploring, building and fishing.',
    ];
    lines.forEach((l, i) => this.text(ctx, l, w / 2, h * 0.36 + i * u * 1.8, Math.round(u * 0.9), i === 3 ? '#ffcf4a' : '#c9d0e4', 'center', w - u * 2));
    const bw = Math.min(w - u * 2, u * 14);
    this.button(ctx, (w - bw) / 2, h * 0.76, bw, u * 2.6, 'KEEP PLAYING', { k: 'victoryclose' }, u);
    this.button(ctx, (w - bw) / 2, h * 0.76 + u * 3.2, bw, u * 2.2, 'SHARE MY WIN', { k: 'share' }, u * 0.85, { color: '#7a5a1f' });
  }

  private drawBossBar(ctx: CanvasRenderingContext2D, game: Game, w: number, u: number): void {
    const bs = game.boss;
    if (!bs) return;
    const d = BOSSES[bs.id];
    const bw = Math.min(w - u * 14, u * 26);
    const x = (w - bw) / 2;
    const y = u * 4.2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 2, y - 2, bw + 4, u * 1.2 + 4);
    ctx.fillStyle = '#5a1a1a';
    ctx.fillRect(x, y, bw, u * 1.2);
    ctx.fillStyle = bs.hp <= d.hp / 2 ? '#ff5a2a' : '#ff9a3c';
    ctx.fillRect(x, y, bw * Math.max(0, bs.hp / d.hp), u * 1.2);
    this.text(ctx, `${d.name}${bs.hp <= d.hp / 2 ? '  (enraged)' : ''}`, w / 2, y - u * 0.9, Math.round(u * 0.95), '#ffd8a8', 'center', bw);
  }

  /** One item cell: dark slot, pixel icon, count in the corner, highlight when selected. */
  private cell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, id: ItemId | Tool | GearId, count: number | null, sel: boolean, a: UiAction | null, dim = false): void {
    ctx.fillStyle = sel ? 'rgba(54,224,232,0.18)' : 'rgba(10,12,20,0.75)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = sel ? '#36e0e8' : '#3a4052';
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    // Inner bevel so slots read as physical sockets.
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 3, y + 3, size - 6, 2);
    const s = Math.max(1, Math.floor((size * 0.72) / ICON));
    ctx.globalAlpha = dim ? 0.35 : 1;
    drawIcon(ctx, id, x + (size - ICON * s) / 2, y + (size - ICON * s) / 2 - size * 0.04, s);
    ctx.globalAlpha = 1;
    if (count !== null) {
      const label = count >= 1000 ? `${Math.floor(count / 1000)}k` : `${count}`;
      ctx.font = `bold ${Math.round(size * 0.3)}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000';
      ctx.fillText(label, x + size - 3, y + size - 3);
      ctx.fillStyle = count > 0 ? '#fff' : '#ff8a8a';
      ctx.fillText(label, x + size - 4, y + size - 4);
    }
    if (a) this.rects.push({ x, y, w: size, h: size, a });
  }

  /** Grid of item cells; returns the height used. */
  private grid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ids: ItemId[], counts: Inventory, cellSize: number, sel: ItemId | null, act: (id: ItemId) => UiAction): number {
    const gap = Math.max(3, cellSize * 0.1);
    const cols = Math.max(1, Math.floor((w + gap) / (cellSize + gap)));
    ids.forEach((id, i) => this.cell(ctx, x + (i % cols) * (cellSize + gap), y + Math.floor(i / cols) * (cellSize + gap), cellSize, id, counts[id] ?? 0, sel === id, act(id)));
    return Math.ceil(ids.length / cols) * (cellSize + gap);
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = 'rgba(8,10,18,0.97)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#36e0e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = 'rgba(54,224,232,0.25)';
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  }

  /** Inventory: the character in their gear, tool slots, pack contents and actions for the selected item. */
  private drawInventory(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    const pw = Math.min(w - u, u * 46);
    const ph = Math.min(h - u, u * 32);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    this.panel(ctx, px, py, pw, ph);
    this.text(ctx, 'INVENTORY', px + u, py + u * 1.6, Math.round(u * 1.3), '#36e0e8');
    this.button(ctx, px + pw - u * 6.5, py + u * 0.5, u * 6, u * 2.1, 'CLOSE', { k: 'inv' }, u * 0.9);
    const narrow = pw < u * 30;
    // Character preview with gear.
    const cw = narrow ? pw - u * 2 : pw * 0.36;
    const ch = narrow ? u * 9.5 : ph - u * 4.5;
    const cx = px + u;
    const cy = py + u * 3;
    ctx.fillStyle = 'rgba(20,26,40,0.9)';
    ctx.fillRect(cx, cy, cw, ch);
    const scale = Math.max(2, Math.floor(Math.min((ch * (narrow ? 0.9 : 0.55)) / 24, (cw * 0.45) / 16)));
    const fx = narrow ? cx + cw * 0.22 : cx + cw / 2;
    const fy = narrow ? cy + ch - u * 0.6 : cy + 24 * scale + u * 1.2;
    ctx.fillStyle = 'rgba(54,224,232,0.15)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 9 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    const wearOf = (slot: 'head' | 'body' | 'feet'): [string, string] | undefined => {
      const id = game.equipped(slot);
      return id ? [GEAR[id].color, GEAR[id].accent] : undefined;
    };
    drawPlayer(ctx, fx, fy, scale, { facing: 1, walking: false, t: time, airborne: false, tier: game.upgrades.armor ?? 0, gear: playerGear(game), held: game.tool, wear: { head: wearOf('head'), body: wearOf('body'), feet: wearOf('feet') } });
    const up = game.upgrades;
    const gearLines: [string, number][] = [
      ['Helmet lamp', up.lamp ?? 0],
      ['Drill visor', up.pick ?? 0],
      ['Plated suit', up.armor ?? 0],
      ['Cargo pack', up.pack ?? 0],
      ['Battery cell', up.battery ?? 0],
      ['Servo boots', up.boots ?? 0],
    ];
    let gy = narrow ? cy + u * 1.2 : fy + u * 2;
    const gx = narrow ? cx + cw * 0.45 : cx + u * 0.8;
    for (const [name, lv] of gearLines) {
      this.text(ctx, `${name}`, gx, gy, Math.round(u * 0.75), '#c9d0e4', 'left', cw * 0.4);
      this.text(ctx, `Lv ${lv}`, gx + (narrow ? cw * 0.38 : cw - u * 4.2), gy, Math.round(u * 0.75), lv > 0 ? '#9ff6a0' : '#5a6078');
      gy += u * (narrow ? 1.25 : 1.35);
    }
    // Tools and pack.
    const rx = narrow ? px + u : cx + cw + u;
    const rw = narrow ? pw - u * 2 : pw - cw - u * 3;
    let ry = narrow ? cy + ch + u * 0.8 : cy;
    this.text(ctx, 'TOOLS  (1-4, Q, mouse wheel)', rx, ry + u * 0.6, Math.round(u * 0.75), '#8a90a2', 'left', rw);
    ry += u * 1.2;
    const cs = Math.min(u * 3.4, (rw - u * 1.5) / 6);
    TOOL_SLOTS.forEach((t, i) => this.cell(ctx, rx + i * (cs + u * 0.4), ry, cs, t.tool, null, game.tool === t.tool, { k: 'settool', t: t.tool }));
    this.text(ctx, TOOL_SLOTS.find((t) => t.tool === game.tool)?.label ?? '', rx + 4 * (cs + u * 0.4) + u * 0.3, ry + cs * 0.6, Math.round(u * 0.8), '#36e0e8', 'left', rw - 4 * (cs + u * 0.4));
    ry += cs + u * 1.2;
    const total = invTotal(game.carried);
    this.text(ctx, `PACK  ${total}/${game.derived.packCap}`, rx, ry, Math.round(u * 0.8), total >= game.derived.packCap ? '#ff9a3c' : '#8a90a2');
    ry += u * 0.6;
    const ids = ITEM_IDS.filter((id) => (game.carried[id] ?? 0) > 0);
    if (ids.length === 0) this.text(ctx, 'Empty. Dig, chop, fish and open chests.', rx, ry + u * 1.4, Math.round(u * 0.8), '#5a6078', 'left', rw);
    const gh = this.grid(ctx, rx, ry, rw, ids, game.carried, cs, this.invSel, (id) => ({ k: 'invsel', id }));
    ry += Math.max(gh, u * 2) + u * 0.6;
    // Gear: everything crafted, tap to equip; worn items highlighted.
    const owned = GEAR_IDS.filter((id) => game.ownsGear(id));
    this.text(ctx, 'GEAR  (build more in the workshop GEAR tab)', rx, ry + u * 0.2, Math.round(u * 0.72), '#8a90a2', 'left', rw);
    ry += u * 0.6;
    const gs = cs * 0.8;
    const gcols = Math.max(1, Math.floor((rw + 4) / (gs + 4)));
    owned.forEach((id, i) => this.cell(ctx, rx + (i % gcols) * (gs + 4), ry + Math.floor(i / gcols) * (gs + 4), gs, id, null, game.equipped(GEAR[id].slot) === id, { k: 'equip', id }));
    ry += Math.ceil(owned.length / gcols) * (gs + 4) + u * 0.6;
    const worn = GEAR_SLOTS.map((sl) => game.equipped(sl)).filter((x): x is GearId => !!x).map((x) => GEAR[x].name);
    this.text(ctx, `Wearing: ${worn.join(', ')}`, rx, ry, Math.round(u * 0.66), '#9ff6a0', 'left', rw);
    ry += u * 1.1;
    // Selected item: name, what it does, actions.
    const sel = this.invSel && (game.carried[this.invSel] ?? 0) > 0 ? this.invSel : null;
    if (sel) {
      const def = ITEMS[sel];
      const food = FOOD[sel];
      const bossFor = bossForBeacon(sel);
      const what = bossFor ? `Summons the ${BOSSES[bossFor].name}. Use it in the ${BIOMES[BOSSES[bossFor].biome as BiomeId].name}, away from the pad.` : food ? `Eat: +${food.hp} HP${food.battery ? `, +${food.battery} battery` : ''}` : def.places !== null || def.placesWall !== undefined ? 'Build with it (right click / BUILD mode)' : 'Material: spend it at the workshop';
      this.text(ctx, def.name, rx, ry + u * 0.4, Math.round(u * 0.95), '#fff', 'left', rw);
      this.text(ctx, what, rx, ry + u * 1.6, Math.round(u * 0.72), '#9aa3b8', 'left', rw);
      ry += u * 2.4;
      const bw2 = Math.min(u * 7, (rw - u) / 3);
      let bx2 = rx;
      if (food) {
        this.button(ctx, bx2, ry, bw2, u * 2.2, 'EAT', { k: 'use', id: sel }, u * 0.85, { color: '#1f7a3a' });
        bx2 += bw2 + u * 0.5;
      }
      const boss = bossForBeacon(sel);
      if (boss) {
        this.button(ctx, bx2, ry, bw2, u * 2.2, 'SUMMON', { k: 'use', id: sel }, u * 0.85, { color: '#8a2a1a' });
        bx2 += bw2 + u * 0.5;
      }
      if (PLACEABLE.includes(sel)) {
        this.button(ctx, bx2, ry, bw2, u * 2.2, 'HOLD', { k: 'sel', i: PLACEABLE.indexOf(sel) }, u * 0.85);
        bx2 += bw2 + u * 0.5;
      }
      this.button(ctx, bx2, ry, bw2, u * 2.2, 'DROP', { k: 'drop', id: sel }, u * 0.85, { color: '#7a3a2a' });
    }
  }

  /** Chest window: contents (tap to take), TAKE ALL, your pack (tap to store), BREAK to pick the chest up. */
  private drawChest(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    const at = game.chestOpen;
    if (!at) return;
    const inv = game.chestContents(at.x, at.y);
    const pw = Math.min(w - u * 2, u * 30);
    const cs = Math.min(u * 3.2, (pw - u * 2) / 6);
    const ph = Math.min(h - u * 8, u * 4 + cs * 5);
    const px = (w - pw) / 2;
    const py = Math.max(u * 5, (h - ph) / 2 - u * 2);
    this.panel(ctx, px, py, pw, ph);
    this.text(ctx, 'CHEST', px + u, py + u * 1.5, Math.round(u * 1.2), '#ffcf4a');
    this.button(ctx, px + pw - u * 5.5, py + u * 0.5, u * 5, u * 2, 'CLOSE', { k: 'interact' }, u * 0.8);
    const ids = ITEM_IDS.filter((id) => (inv[id] ?? 0) > 0);
    let y = py + u * 3;
    if (ids.length === 0) this.text(ctx, 'Empty. Tap pack items below to store them.', px + u, y + u * 0.8, Math.round(u * 0.8), '#8a90a2', 'left', pw - u * 2);
    y += Math.max(u * 1.6, this.grid(ctx, px + u, y, pw - u * 2, ids, inv, cs, null, (id) => ({ k: 'take', id })));
    const bw = (pw - u * 3) / 2;
    this.button(ctx, px + u, y, bw, u * 2.2, 'TAKE ALL', { k: 'take', id: 'all' }, u * 0.85, { enabled: ids.length > 0 });
    this.button(ctx, px + u * 2 + bw, y, bw, u * 2.2, 'PICK UP CHEST', { k: 'breakchest' }, u * 0.8, { color: '#7a5a1f' });
    y += u * 3;
    this.text(ctx, 'YOUR PACK (tap to store)', px + u, y, Math.round(u * 0.75), '#8a90a2');
    const mine = ITEM_IDS.filter((id) => (game.carried[id] ?? 0) > 0);
    this.grid(ctx, px + u, y + u * 0.5, pw - u * 2, mine, game.carried, cs * 0.8, null, (id) => ({ k: 'put', id }));
  }

  private drawMapScreen(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    ctx.fillStyle = 'rgba(6,5,12,0.92)';
    ctx.fillRect(0, 0, w, h);
    this.text(ctx, 'MAP', u, u * 1.4, Math.round(u * 1.4), '#36e0e8');
    const found = game.codex.length;
    this.text(ctx, `Codex ${found}/${CODEX.length}`, u * 5, u * 1.4, Math.round(u * 0.9), '#ffcf4a', 'left', w - u * 12);
    const bw = u * 6;
    this.button(ctx, w - bw - u, u * 0.4, bw, u * 2.2, 'CLOSE', { k: 'map' }, u * 0.9);
    // Zoom and centre controls (wheel zooms, drag pans).
    const zb = u * 2.6;
    let zx = w - bw - u * 2 - zb * 2 - zb * 1.6 - u * 0.8;
    this.button(ctx, zx, u * 0.4, zb, u * 2.2, '-', { k: 'mapzoom', d: -1 }, u, { enabled: this.mapView.zoom > 0 });
    zx += zb + u * 0.4;
    this.button(ctx, zx, u * 0.4, zb, u * 2.2, '+', { k: 'mapzoom', d: 1 }, u, { enabled: this.mapView.zoom < MAP_ZOOMS.length - 1 });
    zx += zb + u * 0.4;
    this.button(ctx, zx, u * 0.4, zb * 1.6, u * 2.2, 'YOU', { k: 'mapcenter' }, u * 0.8);
    this.button(ctx, w - bw - u * 2 - zb * 2 - zb * 1.6 - u * 1.2 - zb * 2.4, u * 0.4, zb * 2.2, u * 2.2, 'SHARE', { k: 'share' }, u * 0.75, { color: '#7a5a1f' });
    this.mapRect = { x: u, y: u * 3.2, w: w - u * 2, h: h - u * 6.4 };
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
    if (!this.touch) this.text(ctx, 'A/D move  W/Space jump  Hold click: dig  Right click: build  B: workshop  M: map  R: beam home  H: heal', w / 2, h - u * 1.6, Math.round(u * 0.7), '#8a90a2', 'center', w - u * 2);
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
    // Quick-heal button beside the bars (H): best healing item in the pack, pulses red when HP is low.
    const heals = healCount(game.carried);
    if (heals > 0) {
      const hs = bh * 2 + u * 0.4;
      const hx = x + bw + u * 0.5;
      const pick = bestHeal(game.carried, d.maxHp - game.hp) ?? bestHeal(game.carried, d.maxHp) ?? 'medkit';
      const lowHp = game.hp / d.maxHp < 0.35;
      if (lowHp && Math.floor(time * 3) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,60,60,0.45)';
        ctx.fillRect(hx - 3, u - 3, hs + 6, hs + 6);
      }
      this.cell(ctx, hx, u, hs, pick, heals, false, { k: 'heal' });
      this.text(ctx, this.touch ? 'HEAL' : 'H', hx + 4, u + hs * 0.3, Math.round(hs * 0.24), lowHp ? '#ff8a8a' : '#9ff6a0');
    }
    const carried = invTotal(game.carried);
    this.text(ctx, `Depth ${Math.floor(game.depth)}m ${game.depth > 2 ? `(${LAYERS[game.layer].name})` : ''}  Pack ${carried}/${d.packCap}`, x, y, Math.round(u * 0.95), carried >= d.packCap ? '#ff9a3c' : '#ffffff');

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
    this.button(ctx, bx, by, bwid, bhgt, game.muted ? 'SOUND OFF' : game.musicOn ? 'SOUND ON' : 'MUSIC OFF', { k: 'mute' }, u * 0.8);
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
    if (game.isAtBase() && game.bays().length > 0) {
      this.button(ctx, bx, by, bwid, bhgt, 'DRONES', { k: 'drones' }, u * 0.85, { color: '#2a3550' });
      by += bhgt + u * 0.5;
    }
    if (game.isAtBase()) {
      const can = game.affordableUpgrades().length > 0;
      this.button(ctx, bx, by, bwid, bhgt, can ? 'SHOP !' : 'SHOP', { k: 'shop' }, u, { pulse: can && Math.floor(time * 2) % 2 === 0 });
      by += bhgt + u * 0.5;
    }
    if (this.touch) this.button(ctx, bx, by, bwid, bhgt, this.placeMode ? 'MODE BUILD' : 'MODE DIG', { k: 'mode' }, u * 0.8, { color: this.placeMode ? '#7a5a1f' : '#1f6f78' });
    if (this.touch) by += bhgt + u * 0.5;
    if (game.equipped('vehicle')) {
      this.button(ctx, bx, by, bwid, bhgt, game.riding ? 'GET OFF' : 'RIDE', { k: 'ride' }, u * 0.85, { color: game.riding ? '#7a5a1f' : '#1f6f78' });
      by += bhgt + u * 0.5;
    }
    if (this.touch && game.gear.dash) {
      this.button(ctx, bx, by, bwid, bhgt, 'DASH', { k: 'dash' }, u * 0.9);
      by += bhgt + u * 0.5;
    }

    // Hotbar: tools first, then placeable blocks.
    const gap = u * 0.4;
    const shown = visiblePlaceables(game.carried, game.selected);
    const count = TOOL_SLOTS.length + shown.length + 1;
    const slot = Math.min(u * 3.4, (w - u * 2 - (count + 1) * gap) / count);
    const total = count * slot + (count - 1) * gap + gap * 2;
    let sx = (w - total) / 2;
    const sy = h - slot - u * 2.2;
    TOOL_SLOTS.forEach((ts, i) => {
      this.cell(ctx, sx, sy, slot, ts.tool, null, game.tool === ts.tool, { k: 'settool', t: ts.tool });
      if (!this.touch) this.text(ctx, ts.key, sx + 4, sy + slot * 0.28, Math.round(slot * 0.22), '#8a90a2');
      // A fitted mod chip shows as a small glowing chip in the weapon slot's corner.
      const chip = ts.tool === 'blade' ? game.fittedMod('melee') : ts.tool === 'pistol' ? game.fittedMod('ranged') : undefined;
      if (chip) {
        const cz = Math.round(slot * 0.28);
        const cx = sx + slot - cz - 3;
        const cy = sy + 3;
        ctx.fillStyle = '#14181f';
        ctx.fillRect(cx - 1, cy - 1, cz + 2, cz + 2);
        ctx.fillStyle = MODS[chip].color;
        ctx.fillRect(cx, cy, cz, cz);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + cz * 0.35, cy + cz * 0.35, Math.max(2, cz * 0.3), Math.max(2, cz * 0.3));
      }
      sx += slot + gap + (i === TOOL_SLOTS.length - 1 ? gap * 2 : 0);
    });
    shown.forEach((id) => {
      const i = PLACEABLE.indexOf(id);
      const n = invCount(game.carried, id);
      this.cell(ctx, sx, sy, slot, id, n > 0 ? n : null, game.selected === id, { k: 'sel', i }, n <= 0);
      if (game.selected === id) {
        ctx.strokeStyle = '#ffcf4a';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx + 1, sy + 1, slot - 2, slot - 2);
      }
      sx += slot + gap;
    });
    // Bag button (inventory) at the end of the bar.
    this.cell(ctx, sx + gap, sy, slot, 'chest', null, false, { k: 'inv' });
    this.text(ctx, this.touch ? 'BAG' : 'I', sx + gap + slot / 2, sy - u * 0.3, Math.round(u * 0.7), '#c9d0e4', 'center');
    // What is held, above the bar.
    const heldName = TOOL_SLOTS.find((t) => t.tool === game.tool)?.label ?? '';
    this.text(ctx, game.tool === 'rod' && game.fishing ? (game.fishing.bite > 0 ? 'BITE! Click now!' : 'Waiting for a bite...') : heldName, w / 2, sy - u * 0.5, Math.round(u * 0.85), game.fishing && game.fishing.bite > 0 ? '#ffcf4a' : '#c9d0e4', 'center');

    // Toasts.
    const tl = toastLayout(w, u, bx, by, y + u * 2.2);
    let ty = tl.y;
    for (const t of this.toasts) {
      ctx.globalAlpha = Math.min(1, t.life / 0.6);
      this.text(ctx, t.text, w / 2, ty, Math.round(u * 1.1), t.color, 'center', tl.maxW);
      ctx.globalAlpha = 1;
      ty += u * 1.5;
    }

    // Contextual warnings and first-minute hints.
    if (low && !game.isAtBase() && Math.floor(time * 2.5) % 2 === 0) this.text(ctx, 'BATTERY LOW - RETURN TO THE PAD', w / 2, h * 0.2, Math.round(u * 1.2), '#ff9a3c', 'center', w - u * 2);
    const auto = game.stats.playTime >= 40 ? game.hintAutomation(this.touch) : null;
    if (auto) this.text(ctx, auto, w / 2, h - u * 0.7, Math.round(u * 0.75), '#7dffb0', 'center', w - u * 2);
    if (game.stats.playTime < 40) {
      const hint = this.touch ? 'Left thumb: move, drag up to jump. Right side: dig.' : 'A/D move, W jump. Click: dig / open chests. Right click: build. 1-4 or wheel: tools. I: inventory. E: open chest.';
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
    // Rows that fit between the tabs and the footer buttons on this screen (short screens scroll more).
    this.shopVisible = Math.max(3, Math.min(SHOP_VISIBLE, Math.floor((ph - u * 6.6 - u * 7.6) / rowH)));
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    ctx.fillStyle = '#12121c';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#36e0e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    this.text(ctx, 'BASE WORKSHOP', px + u, py + u * 1.4, Math.round(u * 1.4), '#36e0e8', 'left', pw - u * 10);
    // Night raids are opt-out, right here where the base is built.
    this.button(ctx, px + pw - u * 8.6, py + u * 0.35, u * 7.8, u * 1.9, game.raidsOn ? 'RAIDS: ON' : 'RAIDS: OFF', { k: 'raids' }, u * 0.75, { color: game.raidsOn ? '#6a2a2a' : '#23262f' });

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
    const vis = this.shopVisible;
    this.shopScroll = clampScroll(this.shopScroll, total, vis);
    const scrolls = total > vis;
    const arrow = scrolls ? u * 2.4 : 0;
    const nt = SHOP_TABS.length;
    const tw = (pw - u * 2 - u * 0.4 * (nt - 1) - arrow * 2 - (scrolls ? u * 0.8 : 0)) / nt;
    const ty = py + u * 4.3;
    for (const [i, t] of SHOP_TABS.entries()) {
      this.button(ctx, px + u + i * (tw + u * 0.4), ty, tw, u * 1.9, TAB_LABEL[t], { k: 'tab', t }, u * 0.8, { color: this.shopTab === t ? '#1f6f78' : '#23262f' });
    }
    if (scrolls) {
      const ax = px + pw - u - arrow * 2 - u * 0.2;
      this.button(ctx, ax, ty, arrow, u * 1.9, '^', { k: 'scroll', d: -1 }, u * 0.9, { enabled: this.shopScroll > 0 });
      this.button(ctx, ax + arrow + u * 0.2, ty, arrow, u * 1.9, 'v', { k: 'scroll', d: 1 }, u * 0.9, { enabled: this.shopScroll < total - vis });
    }
    let ry = py + u * 6.6;
    for (const up of this.shopTab === 'upgrades' ? UPGRADES.slice(this.shopScroll, this.shopScroll + vis) : []) {
      const lv = game.upgrades[up.id] ?? 0;
      const maxed = lv >= up.maxLevel;
      const needR = maxed ? 0 : (up.needRaids?.(lv) ?? 0);
      const bpLocked = game.stats.raids < needR;
      const cost = maxed ? null : up.cost(lv);
      const afford = !!cost && !bpLocked && ITEM_IDS.every((id) => (game.stash[id] ?? 0) >= (cost[id] ?? 0));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      this.text(ctx, `${up.name}  Lv ${lv}/${up.maxLevel}`, px + u, ry + rowH * 0.3, Math.round(u * 0.95));
      this.text(ctx, maxed ? up.desc : bpLocked ? `Raid blueprint: clear ${needR} raids (${game.stats.raids}/${needR})` : `${up.desc}   Cost: ${costText(cost ?? {})}`, px + u, ry + rowH * 0.68, Math.round(u * 0.72), maxed ? '#8a90a2' : afford ? '#9ff6a0' : '#ff8a8a', 'left', pw - u * 8);
      const bw = u * 5.5;
      this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, maxed ? 'MAX' : 'BUY', { k: 'buy', id: up.id }, u * 0.9, { enabled: afford && !maxed });
      ry += rowH;
    }
    for (const r of this.shopTab === 'fab' ? RECIPES.slice(this.shopScroll, this.shopScroll + vis) : []) {
      const fabLocked = (game.upgrades.fab ?? 0) < (r.fab ?? 0);
      const bpLock = game.stats.raids < (r.raids ?? 0);
      const locked = fabLocked || bpLock;
      const afford = !locked && ITEM_IDS.every((id) => (game.stash[id] ?? 0) >= (r.cost[id] ?? 0));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      this.text(ctx, `Fabricator: ${r.name}`, px + u, ry + rowH * 0.3, Math.round(u * 0.95));
      this.text(ctx, fabLocked ? `Needs Fabricator Lv ${r.fab}` : bpLock ? `Raid blueprint: clear ${r.raids} raids (${game.stats.raids}/${r.raids})` : `Cost: ${costText(r.cost)}`, px + u, ry + rowH * 0.68, Math.round(u * 0.72), afford ? '#9ff6a0' : '#ff8a8a');
      const bw = u * 5.5;
      this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, 'MAKE', { k: 'craft', id: r.id }, u * 0.9, { enabled: afford });
      ry += rowH;
    }
    for (const id of this.shopTab === 'gear' ? GEAR_IDS.slice(this.shopScroll, this.shopScroll + vis) : []) {
      const gd = GEAR[id];
      const owned = game.ownsGear(id);
      const worn = game.equipped(gd.slot) === id;
      const afford = !owned && !gd.bossOnly && ITEM_IDS.every((k) => (game.stash[k] ?? 0) >= (gd.cost[k] ?? 0));
      ctx.fillStyle = worn ? 'rgba(54,224,232,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      const isz = rowH - u * 0.8;
      this.cell(ctx, px + u * 0.8, ry + u * 0.25, isz, id, null, worn, null);
      const tx2 = px + u * 1.4 + isz;
      this.text(ctx, `${gd.name}  [${gd.slot}]`, tx2, ry + rowH * 0.3, Math.round(u * 0.9), '#fff', 'left', pw - isz - u * 9);
      this.text(ctx, owned || gd.bossOnly ? gd.desc : `${gd.desc}  Cost: ${costText(gd.cost)}`, tx2, ry + rowH * 0.68, Math.round(u * 0.66), owned ? '#9aa3b8' : afford ? '#9ff6a0' : '#ff8a8a', 'left', pw - isz - u * 9);
      const bw = u * 5.5;
      if (owned) this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, worn ? 'WORN' : 'EQUIP', { k: 'equip', id }, u * 0.85, { color: worn ? '#2a6a3a' : '#1f6f78' });
      else if (gd.bossOnly) this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, 'BOSS', { k: 'craftgear', id }, u * 0.85, { enabled: false });
      else this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, 'BUILD', { k: 'craftgear', id }, u * 0.85, { enabled: afford });
      ry += rowH;
    }

    for (const tr of this.shopTab === 'trade' ? tradeEntries(game).slice(this.shopScroll, this.shopScroll + vis) : []) {
      if (typeof tr === 'string') {
        this.modRow(ctx, game, tr, px, ry, pw, rowH, u);
        ry += rowH;
        continue;
      }
      const comfort = game.npcComfort(tr.npc);
      const home = tradeOpen(tr, game.hasNpc(tr.npc), comfort);
      const afford = home && ITEM_IDS.every((k) => (game.stash[k] ?? 0) >= (tr.give[k] ?? 0));
      ctx.fillStyle = tr.cozy ? 'rgba(255,196,110,0.09)' : tr.npc === 'medic' ? 'rgba(255,90,90,0.07)' : tr.npc === 'merchant' ? 'rgba(90,220,255,0.08)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      // Icons read at a glance: what you give (count), an arrow, what you get.
      const isz = rowH - u * 0.8;
      let ix = px + u * 0.8;
      const iy = ry + u * 0.25;
      for (const [k, n] of tradeParts(tr.give)) {
        this.cell(ctx, ix, iy, isz, k, n, false, null, !home);
        ix += isz + u * 0.3;
      }
      this.text(ctx, '>', ix + u * 0.6, iy + isz * 0.55, Math.round(u * 1.1), afford ? '#ffd23a' : '#5a6078', 'center');
      ix += u * 1.4;
      for (const [k, n] of tradeParts(tr.get)) {
        this.cell(ctx, ix, iy, isz, k, n, afford, null, !home);
        ix += isz + u * 0.3;
      }
      const tx2 = ix + u * 0.5;
      const tw2 = px + pw - u * 7 - tx2;
      const info = NPC_INFO[tr.npc];
      this.text(ctx, `${costText(tr.give)}  ->  ${costText(tr.get)}`, tx2, ry + rowH * 0.3, Math.round(u * 0.8), '#fff', 'left', tw2);
      const have = tradeParts(tr.give).map(([k]) => `${game.stash[k] ?? 0} ${ITEMS[k].name.toLowerCase()}`).join(', ');
      const cozy = tr.cozy ? 'Cozy rate. ' : '';
      const sub = home
        ? `${cozy}${info.name}${tr.npc === 'merchant' ? ' (today only)' : ''}${tr.toPack ? ' (into your pack)' : ''}: you have ${have}`
        : tr.npc === 'merchant'
          ? `${info.name} the ${info.title.toLowerCase()} brings this to the pad next morning`
          : !game.hasNpc(tr.npc)
          ? `No ${info.title.toLowerCase()} yet: furnish ${tr.npc === 'medic' ? 'a second' : 'a'} room (light, table, bed)`
          : `Cozy rate: ${info.name}'s room needs comfort ${tr.cozy}/4 (now ${comfort}): decor, back wall, window`;
      this.text(ctx, sub, tx2, ry + rowH * 0.68, Math.round(u * 0.64), afford ? '#9ff6a0' : '#ff8a8a', 'left', tw2);
      const bw = u * 5.5;
      this.button(ctx, px + pw - bw - u * 0.8, ry + u * 0.3, bw, rowH - u * 0.9, 'TRADE', { k: 'trade', id: tr.id }, u * 0.85, { enabled: afford });
      ry += rowH;
    }

    const fy = py + ph - u * 4.4;
    const bw = (pw - u * 3) / 2;
    const tbw = (pw - u * 4) / 3;
    this.button(ctx, px + u, fy - u * 2.8, tbw, u * 2.2, 'COPY CODE', { k: 'copyseed' }, u * 0.7);
    this.button(ctx, px + u * 2 + tbw, fy - u * 2.8, tbw, u * 2.2, 'PLAY CODE', { k: 'enterseed' }, u * 0.7);
    this.button(ctx, px + u * 3 + tbw * 2, fy - u * 2.8, tbw, u * 2.2, 'DAILY', { k: 'daily' }, u * 0.7, { color: '#2a6a7a' });
    this.button(ctx, px + u, fy, bw, u * 2.4, this.newWorldArmed > 0 ? 'CONFIRM?' : 'NEW WORLD', { k: 'dive' }, u, { color: this.newWorldArmed > 0 ? '#a33a2a' : '#7a5a1f', pulse: this.newWorldArmed > 0 });
    this.button(ctx, px + u * 2 + bw, fy, bw, u * 2.4, 'CLOSE', { k: 'close' }, u);
    this.text(ctx, `World ${game.seedCode}   Best ${game.stats.deepest}m   Dives ${game.runs}   Deaths ${game.stats.deaths}`, px + pw / 2, py + ph - u * 0.9, Math.round(u * 0.65), '#8a90a2', 'center', pw - u);
  }
  /** One Gunsmith chip row: chip icon, what it does, then BUILD (not owned), FIT or FITTED. */
  private modRow(ctx: CanvasRenderingContext2D, game: Game, id: ModId, px: number, ry: number, pw: number, rowH: number, u: number): void {
    const m = MODS[id];
    const owned = game.ownsMod(id);
    const fitted = game.fittedMod(m.slot) === id;
    const home = game.hasNpc('gunsmith');
    const afford = !owned && game.canBuyMod(id);
    ctx.fillStyle = fitted ? 'rgba(255,178,58,0.14)' : 'rgba(255,154,60,0.06)';
    ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
    const isz = rowH - u * 0.8;
    this.cell(ctx, px + u * 0.8, ry + u * 0.25, isz, `mod_${id}` as ItemId, null, fitted, null, !owned && !home);
    const tx2 = px + u * 1.4 + isz;
    const tw2 = pw - isz - u * 9;
    const weapon = GEAR[game.equipped(m.slot) ?? (m.slot === 'melee' ? 'energy_blade' : 'pulse_pistol')].name;
    this.text(ctx, `${m.name}  [${m.slot} chip]`, tx2, ry + rowH * 0.3, Math.round(u * 0.85), '#fff', 'left', tw2);
    const sub = owned
      ? fitted
        ? `${m.desc}. Fitted to your ${weapon.toLowerCase()} (tap to take out)`
        : `${m.desc}. Owned: fit it to your ${weapon.toLowerCase()} for free`
      : home
        ? `${m.desc}. Rook builds it for ${costText(m.cost)}`
        : `${m.desc}. No gunsmith yet: furnish a third room (light, table, bed)`;
    this.text(ctx, sub, tx2, ry + rowH * 0.68, Math.round(u * 0.64), owned ? (fitted ? '#ffd8a8' : '#9aa3b8') : afford ? '#9ff6a0' : '#ff8a8a', 'left', tw2);
    const bw = u * 5.5;
    const bx = px + pw - bw - u * 0.8;
    if (owned) this.button(ctx, bx, ry + u * 0.3, bw, rowH - u * 0.9, fitted ? 'FITTED' : 'FIT', { k: 'modfit', id }, u * 0.85, { color: fitted ? '#8a5a1f' : '#1f6f78' });
    else this.button(ctx, bx, ry + u * 0.3, bw, rowH - u * 0.9, 'BUILD', { k: 'modbuy', id }, u * 0.85, { enabled: afford });
  }
}

/** TRADE tab rows in order: the room robots' rates, the Gunsmith's chips, then the merchant's stock. */
export function tradeEntries(game: Game): (Trade | ModId)[] {
  const list = game.tradeList();
  return [...list.slice(0, TRADES.length), ...MOD_IDS, ...list.slice(TRADES.length)];
}

/** The non-zero entries of a trade side, in ITEM_IDS order. */
function tradeParts(inv: Partial<Record<ItemId, number>>): [ItemId, number][] {
  return ITEM_IDS.filter((k) => (inv[k] ?? 0) > 0).map((k) => [k, inv[k] ?? 0]);
}

import { diveTitle, reportRows, type DiveReport } from '../sim/divereport';
import { PAINTS, PAINT_SLOTS, unlockedPaints, type PaintSlot } from '../sim/paints';
import { codexCounts, logParts, readLogs, stepLog, type CodexSection } from '../sim/codex';
import { AWARDS, awardGift, awardProgress } from '../sim/achievements';
import { FTUE_STEPS } from '../sim/ftue';
import { PREFS, prefValueLabel, type PrefKey } from '../sim/settings';
import { BINDS, keyLabel, type BindId } from '../sim/keys';
import { recordLine } from '../sim/records';
import type { Game, Tool } from '../sim/game';
import { MAP_ZOOMS, MapView } from './map';
import { FLY_TIME, Flyers, flyerPos, pulseAmount } from './flyers';
import { safeFrame, type Insets } from './safearea';
import { itemTip, itemUse, type ItemTip } from './itemtip';
import { hudButtons, hudGridPos, type HudButton, hoverLabel, type LabelRect } from './hudbuttons';
import { drawHudGlyph } from './hudglyphs';
import { ICON, drawIcon } from '../render/icons';
import { TRADER_W, drawPlayer, drawRows, robotRows, type RobotKind } from '../render/sprites';
import { ROBOT_LOOK, playerGear } from '../render/renderer';
import { FOOD, bestHeal, healCount } from '../sim/fishing';
import { GEAR, GEAR_IDS, GEAR_SLOTS, type GearId } from '../sim/gear';
import { BOSSES, bossForBeacon } from '../sim/bosses';
import { PHASE_NOTCH, newChip, stepChip, type ChipState } from './bossbar';
import { LAYERS } from '../sim/layers';
import { MAX_PART, PART_IDS, VEHICLES, VEHICLE_IDS, partCost, vehicleStats, type PartId, type VehicleId } from '../sim/garage';
import { WEATHER } from '../sim/weather';
import { CODEX, LORE, RECALL_TIME } from '../sim/explore';
import { ITEM_IDS, ITEMS, PLACEABLE, visiblePlaceables, BAR_SLOT_KEYS, invCount, invTotal, type Inventory, type ItemId } from '../sim/tiles';
import { UPGRADES } from '../sim/upgrades';
import { RECIPES } from '../sim/recipes';
import { ACT_INFO, COND_INFO, RULE_MAX, ROLE_INFO } from '../sim/drones';
import { BUFFS, BUFF_IDS, BUFF_TIME, MEAL_BUFF } from '../sim/farming';
import { MOOD_DISCOUNT, MOOD_LABEL, NPC_INFO, NPC_ORDER, TRADES, tradeOpen, type NpcKind } from '../sim/npcs';
import { MERCHANT_STOCK } from '../sim/merchant';
import { MODS, MOD_IDS, type ModId } from '../sim/mods';
import { RESEARCH, RESEARCH_IDS, type ResearchId } from '../sim/research';
import type { Trade } from '../sim/npcs';
import { goalCardHeight, goalCardLayout, hudAnchors } from './hudlayout';
import { GHOST_AFTER, GHOST_FADE, extraLine, ghostText, mergeTarget, toastColumn, toastGhost, toastParts, toastSlide, wrapText, type ToastKind } from './toastfx';

/** Base UI unit in canvas px for a screen size, times the settings-screen UI scale. */
export function uiUnit(w: number, h: number, scale = 1): number {
  const base = Math.max(11, Math.min(20, Math.round(Math.min(w, h) / 26)));
  return Math.round(base * scale);
}

export type UiAction =
  | { k: 'start' }
  | { k: 'shop' }
  | { k: 'close' }
  | { k: 'mode' }
  | { k: 'mute' }
  | { k: 'settings' }
  | { k: 'pref'; key: PrefKey; d: number }
  | { k: 'keyspage'; open: boolean }
  | { k: 'bindarm'; id: BindId }
  | { k: 'bindkey'; id: BindId; code: string }
  | { k: 'resetkeys' }
  | { k: 'buy'; id: string }
  | { k: 'craft'; id: string }
  | { k: 'trade'; id: string }
  | { k: 'modbuy'; id: ModId }
  | { k: 'modfit'; id: ModId }
  | { k: 'research'; id: ResearchId }
  | { k: 'tab'; t: ShopTab }
  | { k: 'scroll'; d: number }
  | { k: 'copyseed' }
  | { k: 'enterseed' }
  | { k: 'daily' }
  | { k: 'dive' }
  | { k: 'sel'; i: number }
  /** Select visible build-bar slot n (keys 6-0 and -). */
  | { k: 'barslot'; n: number }
  /** Touch long-press on a bar slot: open the inventory with that item's actions. */
  | { k: 'barhold'; id: ItemId }
  /** Move a placeable one slot left/right on the build bar (inventory). */
  | { k: 'barmove'; id: ItemId; d: -1 | 1 }
  | { k: 'tool' }
  | { k: 'settool'; t: Tool }
  | { k: 'map' }
  | { k: 'recall' }
  | { k: 'inv' }
  | { k: 'awards'; open: boolean }
  | { k: 'awardpage'; d: number }
  | { k: 'codex'; open: boolean }
  | { k: 'codexsec'; sec: CodexSection }
  | { k: 'codexpage'; d: number }
  | { k: 'logread'; i: number | null }
  | { k: 'paint'; slot: PaintSlot }
  | { k: 'interact' }
  | { k: 'invsel'; id: ItemId }
  | { k: 'use'; id: ItemId }
  | { k: 'drop'; id: ItemId }
  | { k: 'take'; id: ItemId | 'all' }
  | { k: 'put'; id: ItemId }
  | { k: 'breakchest' }
  | { k: 'ride' }
  | { k: 'buildveh'; id: VehicleId }
  | { k: 'deploy'; id: VehicleId }
  | { k: 'part'; id: VehicleId; part: PartId }
  | { k: 'heal' }
  | { k: 'dash' }
  /** Touch hold button: reel the grappling rope in while held (handled by Input as a held pointer). */
  | { k: 'reel' }
  | { k: 'craftgear'; id: GearId }
  | { k: 'equip'; id: GearId }
  | { k: 'mapzoom'; d: number }
  | { k: 'mapcenter' }
  | { k: 'victoryclose' }
  | { k: 'diveclose' }
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
  /** Seconds since it appeared (drives the slide-in). */
  age: number;
  /** Follow-up lines folded into this pill (codex gift, award), drawn small under the body. */
  extras?: { text: string; color: string }[];
}

/** Most toasts on screen at once; older ones drop first. */
export const TOAST_MAX = 2;

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
  /** Inventory screen page: items or the AWARDS list. */
  invPage: 'items' | 'awards' | 'codex' = 'items';
  /** CODEX page: which section is listed and its first row (paged like AWARDS). */
  codexSec: CodexSection = 'places';
  /** LORE index open in the log reader, or null for the card list. */
  logOpen: number | null = null;
  codexFirst = 0;
  /** Rows drawn on the CODEX page last frame (e2e). */
  codexShown = 0;
  private codexPer = 8;
  private codexTotal = 0;
  /** First award row on the AWARDS page (paged by the PREV / NEXT buttons). */
  awardFirst = 0;
  /** Award cards shown on the current page (set each frame; e2e). */
  awardsShown = 0;
  /** Most recent unlock: its card glows on the AWARDS page. */
  lastAward = '';
  /** Seconds left to confirm abandoning the world (NEW WORLD needs two taps). */
  newWorldArmed = 0;
  /** Seconds left to confirm DAILY (second tap starts the Daily Dive). */
  dailyArmed = 0;
  readonly mapView = new MapView();
  /** Where the map was last drawn (drag-to-pan hit area). */
  mapRect = { x: 0, y: 0, w: 0, h: 0 };
  screen: 'title' | 'play' = 'title';
  shopOpen = false;
  /** Drone panel (roles and IF/THEN rules per bay) and which bay it shows. */
  dronesOpen = false;
  bayIdx = 0;
  /** Settings screen (pauses the game like the map). */
  settingsOpen = false;
  /** Settings sub-page: the option rows, or the desktop CONTROLS (key bindings) list. */
  settingsPage: 'main' | 'keys' = 'main';
  /** CONTROLS: the action waiting for its new key, if any. */
  rebinding: BindId | null = null;
  /** True when the play HUD was last drawn mirrored (left-handed touch). */
  hudMirrored = false;
  /** UI size multiplier from the settings screen (uiScale in sim/settings.ts). */
  uiScale = 1;
  /** Workshop tab: upgrades or Fabricator recipes (keeps the panel on screen however many rows exist). */
  shopTab: ShopTab = 'upgrades';
  /** Rows that fit on screen (set each frame by drawShop). */
  shopVisible = SHOP_VISIBLE;
  /** First visible row of the current shop tab. */
  shopScroll = 0;
  /** TRADE tab length (headers + unfolded rows), refreshed each draw since robots come and go. */
  tradeRows = TRADES.length + MOD_IDS.length + RESEARCH_IDS.length + MERCHANT_STOCK + 5;

  /** Row count of the current shop tab. */
  shopRows(): number {
    return this.shopTab === 'upgrades' ? UPGRADES.length : this.shopTab === 'gear' ? GEAR_IDS.length : this.shopTab === 'trade' ? this.tradeRows : RECIPES.length;
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
  /** Settings: touch move stick on the left (0) or right (1); the hint follows it. */
  stickSide = 0;
  toasts: Toast[] = [];
  /** Where each toast pill was drawn last frame (e2e layout checks). */
  toastRects: { x: number; y: number; w: number; h: number }[] = [];
  private rects: Rect[] = [];
  /** Pickup icons arcing into the hotbar or bag. */
  flyers = new Flyers();
  /** Hotbar slot rects by key (placeable item id, or 'inv' for the bag), refreshed each HUD frame. */
  private slotPos = new Map<string, { x: number; y: number; s: number }>();

  toast(text: string, color = '#ffffff', life = 2.4, group?: string): void {
    // The same message twice in a row refreshes the existing line instead of stacking.
    const same = this.toasts.find((t) => t.text === text);
    if (same) {
      same.life = Math.max(same.life, life);
      return;
    }
    // A new place, its codex gift and the award it unlocks arrive together: fold them into one pill.
    const host = mergeTarget(this.toasts, text);
    if (host >= 0) {
      const h = this.toasts[host];
      (h.extras ??= []).push({ text: extraLine(text), color });
      h.life = Math.max(h.life, life);
      return;
    }
    if (group) this.toasts = this.toasts.filter((t) => t.group !== group);
    while (this.toasts.length >= TOAST_MAX) this.toasts.shift();
    this.toasts.push({ text, color, life, group, age: 0 });
  }

  update(dt: number): void {
    this.newWorldArmed = Math.max(0, this.newWorldArmed - dt);
    this.dailyArmed = Math.max(0, this.dailyArmed - dt);
    for (const t of this.toasts) {
      t.life -= dt;
      t.age += dt;
    }
    this.toasts = this.toasts.filter((t) => t.life > 0);
    this.flyers.update(dt, (i) => (this.slotPos.has(i) ? i : 'inv'));
  }

  /** A picked-up item's icon arcs from (x, y) in CSS px into its hotbar slot or the bag. */
  flyPickup(item: string, x: number, y: number): void {
    if (this.screen !== 'play') return;
    this.flyers.add(item, x - this.frame.x, y - this.frame.y);
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
    return this.hit(x, y) !== null || this.screen === 'title' || this.shopOpen || this.dronesOpen || this.settingsOpen;
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

  /** Labels of the glyph buttons drawn last frame (tests, accessibility). */
  hudButtonsShown: string[] = [];
  /** Item cells drawn this frame (frame coords) and the panels drawn over them, for hover tooltips. */
  private itemRects: { x: number; y: number; w: number; h: number; id: ItemId | Tool | GearId; count: number | null }[] = [];
  private tipCovers: { x: number; y: number; w: number; h: number; at: number }[] = [];
  /** Tooltip for the world thing under the mouse (an item lying on the ground; set by main each frame). */
  worldTip: ItemTip | null = null;
  /** Title of the item tooltip shown last frame (e2e). */
  tipShown = '';

  /** Desktop: name and explain the item under the mouse (UI cell first, else the item on the ground). */
  private drawItemTip(ctx: CanvasRenderingContext2D, w: number, h: number, ox: number, oy: number): void {
    this.tipShown = '';
    if (!this.hover || this.touch) return;
    const mx = this.hover.x - ox;
    const my = this.hover.y - oy;
    const inside = (r: { x: number; y: number; w: number; h: number }): boolean => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    let tip: ItemTip | null = null;
    for (let i = this.itemRects.length - 1; i >= 0; i--) {
      const r = this.itemRects[i];
      if (!inside(r)) continue;
      // A panel drawn after this cell, over the mouse, hides it.
      if (this.tipCovers.some((c) => c.at > i && inside(c))) break;
      tip = itemTip(r.id, r.count);
      break;
    }
    if (!tip && this.worldTip && !this.blocks(this.hover.x, this.hover.y)) tip = this.worldTip;
    if (!tip) return;
    this.tipShown = tip.title;
    const u = uiUnit(w, h, this.uiScale);
    const fs = Math.round(u * 0.85);
    const ls = Math.round(u * 0.7);
    ctx.font = `bold ${fs}px ${FONT}`;
    let tw = ctx.measureText(tip.title).width;
    ctx.font = `${ls}px ${FONT}`;
    for (const l of tip.lines) tw = Math.max(tw, ctx.measureText(l).width);
    tw = Math.min(tw + u * 1.4, w * 0.6);
    const th = fs + u * 1.1 + tip.lines.length * (ls + u * 0.35);
    // Beside the cursor, flipped to stay on screen.
    let tx = mx + u * 1.2;
    let ty = my + u * 1.2;
    if (tx + tw > w - 4) tx = mx - tw - u * 0.6;
    if (ty + th > h - 4) ty = my - th - u * 0.6;
    tx = Math.max(4, tx);
    ty = Math.max(4, ty);
    ctx.fillStyle = 'rgba(8,10,18,0.95)';
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = tip.color === '#ffffff' ? '#36e0e8' : tip.color;
    ctx.fillRect(tx, ty, 2, th);
    this.text(ctx, tip.title, tx + u * 0.7, ty + u * 0.45 + fs * 0.85, fs, tip.color, 'left', tw - u);
    tip.lines.forEach((l, i) => this.text(ctx, l, tx + u * 0.7, ty + u * 0.9 + fs + (i + 0.8) * (ls + u * 0.35), ls, '#b8c0d4', 'left', tw - u));
  }

  /** Mouse position in CSS px (desktop only, set by main each frame) for HUD hover labels. */
  hover: { x: number; y: number } | null = null;
  /** Label of the HUD button the mouse is over ('' when none); for tests. */
  hoverShown = '';

  /** Square HUD button with a code-drawn glyph, an optional charge fill, "!" badge and key hint. */
  private glyphButton(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, b: HudButton, game: Game, time: number): void {
    this.button(ctx, x, y, s, s, '', { k: b.action } as UiAction, 1, { color: b.color, pulse: b.pulse || (b.badge && Math.floor(time * 2) % 2 === 0) });
    if (b.fill) {
      ctx.fillStyle = 'rgba(159,246,255,0.35)';
      const fh = (s - 4) * b.fill;
      ctx.fillRect(x + 2, y + s - 2 - fh, s - 4, fh);
    }
    drawHudGlyph(ctx, b.glyph, x + s / 2, y + s / 2, s * 0.62, b.color);
    if (b.badge) {
      const r = s * 0.17;
      ctx.fillStyle = '#ffcf4a';
      ctx.beginPath();
      ctx.arc(x + s - r * 0.9, y + r * 0.9, r, 0, Math.PI * 2);
      ctx.fill();
      this.text(ctx, '!', x + s - r * 0.9, y + r * 0.95, Math.round(r * 1.6), '#2a1a00', 'center');
    }
    if (!this.touch && b.bind) {
      const kl = keyLabel(game.keys[b.bind]);
      if (kl.length <= 2) this.text(ctx, kl, x + s - 4, y + s - s * 0.16, Math.round(s * 0.24), '#9fb4c8', 'right');
    }
  }

  /** Square settings button with a drawn cog (no icon font needed). */
  private gearButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    this.button(ctx, x, y, w, h, '', { k: 'settings' }, 1);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) * 0.26;
    ctx.fillStyle = '#e6ecf8';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.rotate(a);
      ctx.fillRect(-r * 0.28, -r * 0.24, r * 0.56, r * 0.48);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f6f78';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  private bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string, label: string, u: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, Math.max(0, frac))), h - 4);
    this.text(ctx, label, x + 6, y + h / 2, Math.round(u * 0.8), '#fff');
  }

  /** Device safe-area insets in CSS px (notch, home bar); the UI draws inside them. */
  /** Set by Input while a finger holds the REEL button (drawn pressed). */
  reeling = false;
  /** Touch long-press in progress on a build-bar slot (item id, 0..1 fill), drawn as a ring on the slot. */
  barPress: { id: string; k: number } | null = null;
  /** Boss bar damage chip (null when no fight) and the time it was last stepped. */
  bossChip: ChipState | null = null;
  private bossChipT = 0;
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  /** The safe frame used by the last draw (rects are stored in full-canvas CSS px). */
  frame = { x: 0, y: 0, w: 0, h: 0 };

  /** Draws the whole UI inside the safe frame, then moves the hit rects back to canvas CSS px. */
  draw(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, time: number): void {
    const f = safeFrame(w, h, this.insets);
    this.frame = f;
    this.itemRects.length = 0;
    this.tipCovers.length = 0;
    ctx.save();
    ctx.translate(f.x, f.y);
    this.drawFrame(ctx, game, f.w, f.h, time);
    this.drawItemTip(ctx, f.w, f.h, f.x, f.y);
    ctx.restore();
    if (f.x !== 0 || f.y !== 0) for (const r of this.rects) {
      r.x += f.x;
      r.y += f.y;
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, time: number): void {
    this.rects = [];
    const u = uiUnit(w, h, this.uiScale);
    if (this.settingsOpen) {
      if (this.screen === 'title') this.drawTitle(ctx, game, w, h, u, time);
      this.rects = [];
      if (this.settingsPage === 'keys' && !this.touch) this.drawKeys(ctx, game, w, h, u);
      else this.drawSettings(ctx, game, w, h, u);
      return;
    }
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
    if (this.dive) {
      this.drawDiveReport(ctx, this.dive, w, h, u, time);
      return;
    }
    this.drawHud(ctx, game, w, h, u, time);
    if (!game.boss) this.bossChip = null;
    if (game.boss) this.drawBossBar(ctx, game, w, u, time);
    else if (game.raid) {
      const left = game.raid.ids.length + game.raid.plan.length - game.raid.next;
      this.text(ctx, `RAID: ${left} RAIDER${left === 1 ? '' : 'S'} LEFT`, w / 2, u * 4.6, Math.round(u * 0.85), Math.floor(time * 2) % 2 ? '#ff5a5a' : '#ff9a7a', 'center');
    }
    else if (game.raidWarn) this.drawRaidWarn(ctx, game, w, h, u, time);
    else if (game.weather !== 'clear') this.text(ctx, WEATHER[game.weather].name.toUpperCase(), w / 2, u * 4.6, Math.round(u * 0.8), game.weather === 'eclipse' ? '#ff5aff' : '#ffcf4a', 'center');
    if (game.chestOpen) this.drawChest(ctx, game, w, h, u);
    if (game.garageOpen) this.drawGarage(ctx, game, w, h, u);
    if (this.dronesOpen) this.drawDrones(ctx, game, w, h, u);
  }

  /** Settings screen: one row per option with - and + steppers, plus the sound toggle. */
  private drawSettings(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    ctx.fillStyle = 'rgba(4,4,10,0.6)';
    ctx.fillRect(0, 0, w, h);
    const prefs = game.prefs;
    const pw = Math.min(w - u * 2, u * 30);
    // Narrow screens (phones, big UI): label on its own line above the steppers.
    const stacked = pw < u * 26;
    // Rows shrink (down to 70%) when every option would not fit the screen height.
    const fixed = u * 6;
    const perRow = u * (2.4 + 0.5 + (stacked ? 1.5 : 0));
    // Rows: every option, SOUND, and CONTROLS on desktop.
    const rows = PREFS.length + (this.touch ? 1 : 2);
    const fit = Math.max(0.7, Math.min(1, (h - u - fixed) / (rows * perRow)));
    const rowH = u * 2.4 * fit;
    const gap = u * 0.5 * fit;
    const labelH = stacked ? u * 1.5 * fit : 0;
    const ph = u * 4.4 + rows * (rowH + gap + labelH) + u * 1.6;
    const px = (w - pw) / 2;
    const py = Math.max(u * 0.5, (h - ph) / 2);
    this.panel(ctx, px, py, pw, ph);
    this.text(ctx, 'SETTINGS', px + u, py + u * 1.5, Math.round(u * 1.1), '#ffcf4a');
    this.button(ctx, px + pw - u * 5.5, py + u * 0.4, u * 5, u * 2.1, 'CLOSE', { k: 'settings' }, u * 0.8);
    let y = py + u * 3.4;
    const stepW = u * 2.6;
    const valW = u * 6;
    const xPlus = px + pw - u - stepW;
    const xVal = xPlus - gap - valW;
    const xMinus = stacked ? px + u : xVal - gap - stepW;
    const xValS = stacked ? xMinus + stepW + gap : xVal;
    const valWS = stacked ? xPlus - gap - xValS : valW;
    for (const p of PREFS) {
      const v = prefs[p.key];
      if (stacked) {
        this.text(ctx, p.label, px + u, y + labelH * 0.45, Math.round(u * 0.8), '#c9d0e4', 'left', pw - u * 2);
        y += labelH;
      } else this.text(ctx, p.label, px + u, y + rowH / 2, Math.round(u * 0.8), '#c9d0e4', 'left', xMinus - px - u * 1.5);
      this.button(ctx, xMinus, y, stepW, rowH, '-', { k: 'pref', key: p.key, d: -1 }, u, { enabled: v > 0, color: '#2a3550' });
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(xValS, y, valWS, rowH);
      if (!p.names) {
        ctx.fillStyle = '#1f6f78';
        ctx.fillRect(xValS + 2, y + rowH - 6, ((valWS - 4) * v) / p.max, 4);
      }
      this.text(ctx, prefValueLabel(prefs, p.key), xValS + valWS / 2, y + rowH / 2 - 1, Math.round(u * 0.8), '#ffffff', 'center', valWS - 4);
      this.button(ctx, xPlus, y, stepW, rowH, '+', { k: 'pref', key: p.key, d: 1 }, u, { enabled: v < p.max, color: '#2a3550' });
      y += rowH + gap;
    }
    if (stacked) {
      this.text(ctx, 'SOUND', px + u, y + labelH * 0.45, Math.round(u * 0.8), '#c9d0e4');
      y += labelH;
    } else this.text(ctx, 'SOUND', px + u, y + rowH / 2, Math.round(u * 0.8), '#c9d0e4');
    this.button(ctx, xMinus, y, xPlus + stepW - xMinus, rowH, game.muted ? 'ALL OFF' : game.musicOn ? 'MUSIC + EFFECTS' : 'EFFECTS ONLY', { k: 'mute' }, u * 0.8, { color: '#2a3550' });
    y += rowH + gap;
    if (!this.touch) {
      this.text(ctx, 'KEYBOARD', px + u, y + rowH / 2, Math.round(u * 0.8), '#c9d0e4');
      this.button(ctx, xMinus, y, xPlus + stepW - xMinus, rowH, 'CONTROLS >', { k: 'keyspage', open: true }, u * 0.8, { color: '#2a3550' });
      y += rowH + gap;
    }
    this.text(ctx, this.touch ? 'Settings save on this device.' : `${keyLabel(game.keys.settings)} or Esc closes. Settings save on this device.`, px + u, y + u * 0.6, Math.round(u * 0.68), '#8a90a2', 'left', pw - u * 2);
  }

  /** CONTROLS: one row per bindable action (two columns when wide); click a key, then press the new one. */
  private drawKeys(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    ctx.fillStyle = 'rgba(4,4,10,0.6)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(w - u * 2, u * 40);
    const cols = pw >= u * 34 ? 2 : 1;
    const per = Math.ceil(BINDS.length / cols);
    const fixed = u * 8.6;
    const fit = Math.max(0.6, Math.min(1, (h - u - fixed) / (per * u * 2.3)));
    const rowH = u * 1.9 * fit;
    const gap = u * 0.4 * fit;
    const ph = fixed + per * (rowH + gap);
    const px = (w - pw) / 2;
    const py = Math.max(u * 0.5, (h - ph) / 2);
    this.panel(ctx, px, py, pw, ph);
    this.text(ctx, 'CONTROLS', px + u, py + u * 1.5, Math.round(u * 1.1), '#ffcf4a');
    this.button(ctx, px + pw - u * 5.5, py + u * 0.4, u * 5, u * 2.1, 'BACK', { k: 'keyspage', open: false }, u * 0.8);
    const colW = (pw - u * (cols + 1)) / cols;
    const keyW = Math.min(u * 7, colW * 0.45);
    const top = py + u * 3.4;
    BINDS.forEach((b, i) => {
      const cx = px + u + Math.floor(i / per) * (colW + u);
      const y = top + (i % per) * (rowH + gap);
      const armed = this.rebinding === b.id;
      this.text(ctx, b.label, cx, y + rowH / 2, Math.round(u * 0.75), armed ? '#ffcf4a' : '#c9d0e4', 'left', colW - keyW - u * 0.5);
      const pulse = armed && Math.floor(performance.now() / 300) % 2 === 0;
      this.button(ctx, cx + colW - keyW, y, keyW, rowH, armed ? 'PRESS A KEY' : keyLabel(game.keys[b.id]), { k: 'bindarm', id: b.id }, u * 0.75, { color: armed ? (pulse ? '#6b5a1a' : '#4a3f14') : '#2a3550' });
    });
    const by = top + per * (rowH + gap) + u * 0.4;
    this.button(ctx, px + u, by, u * 8, u * 2, 'RESET KEYS', { k: 'resetkeys' }, u * 0.75, { color: '#4a2a30' });
    this.text(ctx, this.rebinding ? 'Press the new key. Esc cancels.' : 'Click a key to change it. A key already in use swaps over. Arrows and Space always move.', px + u * 9.6, by + u, Math.round(u * 0.65), '#8a90a2', 'left', pw - u * 10.6);
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

  /** The dive report card shown after the signal is lost (null when closed). */
  dive: DiveReport | null = null;

  private drawDiveReport(ctx: CanvasRenderingContext2D, r: DiveReport, w: number, h: number, u: number, time: number): void {
    ctx.fillStyle = 'rgba(6,4,14,0.86)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(w - u * 2, u * 26);
    const rows = reportRows(r);
    const rowH = u * 1.45;
    const ph = u * 9.6 + Math.ceil(rows.length / 2) * rowH;
    const px = (w - pw) / 2;
    const py = Math.max(u * 0.5, (h - ph) / 2);
    ctx.fillStyle = '#121a30';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(px, py, pw, Math.max(2, u * 0.25));
    this.text(ctx, 'SIGNAL LOST', w / 2, py + u * 1.6, Math.round(u * 1.5), '#ff6a6a', 'center', pw - u);
    this.text(ctx, `Dive report: ${diveTitle(r)}`, w / 2, py + u * 3.1, Math.round(u * 0.95), '#ffcf4a', 'center', pw - u);
    if (r.best) {
      const glow = 0.65 + Math.sin(time * 4) * 0.35;
      this.text(ctx, 'NEW DEPTH RECORD!', w / 2, py + u * 4.4, Math.round(u * 0.85), `rgba(127,255,154,${glow.toFixed(2)})`, 'center', pw - u);
    }
    const colW = (pw - u * 2) / 2;
    const top = py + u * 5.6;
    rows.forEach(([k, v], i) => {
      const cx = px + u + (i % 2) * colW;
      const cy = top + Math.floor(i / 2) * rowH;
      this.text(ctx, k, cx, cy, Math.round(u * 0.75), '#8a90a2', 'left', colW * 0.62);
      this.text(ctx, v, cx + colW - u * 0.6, cy, Math.round(u * 0.85), k === 'Items lost' ? '#ff9a7a' : '#ffffff', 'right', colW * 0.4);
    });
    const by = top + Math.ceil(rows.length / 2) * rowH + u * 0.2;
    this.text(ctx, 'Your base, stash and gear are safe. A new world awaits.', w / 2, by, Math.round(u * 0.7), '#c9d0e4', 'center', pw - u);
    const bw = (pw - u * 3) / 2;
    this.button(ctx, px + u, by + u * 0.9, bw, u * 2.2, 'NEW DIVE', { k: 'diveclose' }, u * 0.85);
    this.button(ctx, px + u * 2 + bw, by + u * 0.9, bw, u * 2.2, 'SHARE', { k: 'share' }, u * 0.85, { color: '#7a5a1f' });
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

  /** Boss bar: health fill, a pale damage chip that lags behind each hit, and a notch where phase 2 starts. */
  private drawBossBar(ctx: CanvasRenderingContext2D, game: Game, w: number, u: number, time: number): void {
    const bs = game.boss;
    if (!bs) return;
    const d = BOSSES[bs.id];
    const hp = Math.max(0, bs.hp / d.hp);
    const dt = Math.max(0, Math.min(0.1, time - this.bossChipT));
    this.bossChipT = time;
    this.bossChip = this.bossChip ? stepChip(this.bossChip, hp, dt) : newChip(hp);
    const bw = Math.min(w - u * 14, u * 26);
    const x = (w - bw) / 2;
    const y = u * 4.2;
    const bh = u * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x - 2, y - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#5a1a1a';
    ctx.fillRect(x, y, bw, bh);
    const chip = this.bossChip.chip;
    if (chip > hp) {
      ctx.fillStyle = '#ffe9c8';
      ctx.fillRect(x + bw * hp, y, bw * (chip - hp), bh);
    }
    const enraged = hp <= PHASE_NOTCH;
    ctx.fillStyle = enraged ? '#ff5a2a' : '#ff9a3c';
    ctx.fillRect(x, y, bw * hp, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, bw * hp, Math.max(1, bh * 0.25));
    // Phase notch: a dark cut through the bar and a small tick above it.
    const nx = Math.round(x + bw * PHASE_NOTCH);
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(nx - 1, y - 2, 2, bh + 4);
    ctx.fillStyle = enraged ? '#ff5a2a' : '#ffd8a8';
    ctx.fillRect(nx - Math.round(u * 0.25), y - Math.round(u * 0.45), Math.round(u * 0.5), Math.round(u * 0.3));
    this.text(ctx, `${d.name}${enraged ? '  (enraged)' : ''}`, w / 2, y - u * 0.9, Math.round(u * 0.95), '#ffd8a8', 'center', bw);
  }

  /** Long-press feedback: a ring fills clockwise around the held slot until its actions open. */
  private drawBarPress(ctx: CanvasRenderingContext2D): void {
    const bp = this.barPress;
    const at = bp ? this.slotPos.get(bp.id) : undefined;
    if (!bp || !at || bp.k <= 0.08) return;
    const cx = at.x + at.s / 2;
    const cy = at.y + at.s / 2;
    const r = at.s * 0.62;
    ctx.save();
    ctx.lineWidth = Math.max(3, at.s * 0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffcf4a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bp.k);
    ctx.stroke();
    ctx.restore();
    this.lastBarPressDrawn = bp.k;
  }
  /** Last long-press fill drawn (e2e). */
  lastBarPressDrawn = 0;

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
    this.itemRects.push({ x, y, w: size, h: size, id, count });
  }

  /** Grid of item cells; returns the height used. */
  private grid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ids: ItemId[], counts: Inventory, cellSize: number, sel: ItemId | null, act: (id: ItemId) => UiAction): number {
    const gap = Math.max(3, cellSize * 0.1);
    const cols = Math.max(1, Math.floor((w + gap) / (cellSize + gap)));
    ids.forEach((id, i) => this.cell(ctx, x + (i % cols) * (cellSize + gap), y + Math.floor(i / cols) * (cellSize + gap), cellSize, id, counts[id] ?? 0, sel === id, act(id)));
    return Math.ceil(ids.length / cols) * (cellSize + gap);
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    this.tipCovers.push({ x, y, w, h, at: this.itemRects.length });
    ctx.fillStyle = 'rgba(8,10,18,0.97)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#36e0e8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = 'rgba(54,224,232,0.25)';
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  }

  /** Inventory: the character in their gear, tool slots, pack contents and actions for the selected item. */
  awardFlash(id: string): void {
    this.lastAward = id;
  }

  /** Change the AWARDS page by `d` pages (clamped). */
  awardPage(d: number): void {
    const per = Math.max(1, this.awardsPer);
    this.awardFirst = Math.max(0, Math.min(this.awardFirst + d * per, Math.floor((AWARDS.length - 1) / per) * per));
  }

  private awardsPer = 12;

  /** Change the CODEX page by `d` pages (clamped to the current section). */
  codexPage(d: number): void {
    const per = Math.max(1, this.codexPer);
    const last = Math.max(0, Math.floor((this.codexTotal - 1) / per) * per);
    this.codexFirst = Math.max(0, Math.min(this.codexFirst + d * per, last));
  }

  /** Word-wrap `s` into at most `max` lines that fit `w` at the current font. */
  private wrapLines(ctx: CanvasRenderingContext2D, s: string, w: number, size: number, max: number): string[] {
    ctx.font = `bold ${size}px ${FONT}`;
    const out: string[] = [];
    let line = '';
    for (const word of s.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > w) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    // Overflow joins the last line (text() then shrinks it to fit).
    if (out.length > max) out.splice(max - 1, out.length, out.slice(max - 1).join(' '));
    return out;
  }

  /** CODEX page: section tabs (places, creatures, logs), a card per row, paged to fit. */
  private drawCodex(ctx: CanvasRenderingContext2D, game: Game, px: number, py: number, pw: number, ph: number, u: number): void {
    const all = game.codexRows;
    const secs: { id: CodexSection; label: string; color: string }[] = [
      { id: 'places', label: 'PLACES', color: '#36e0e8' },
      { id: 'crew', label: 'CREW', color: '#7ee08a' },
      { id: 'creatures', label: 'CREATURES', color: '#ff7a6a' },
      { id: 'logs', label: 'LOGS', color: '#b48cff' },
    ];
    const tabW = (pw - u * 2 - u * 0.4 * (secs.length - 1)) / secs.length;
    secs.forEach((sc, i) => {
      const c = codexCounts(all.filter((r) => r.section === sc.id));
      const on = this.codexSec === sc.id;
      this.button(ctx, px + u + i * (tabW + u * 0.4), py + u * 3, tabW, u * 1.9, `${sc.label} ${c.found}/${c.total}`, { k: 'codexsec', sec: sc.id }, u * 0.68, { color: on ? '#2f5a78' : '#1c2436' });
    });
    const rows = all.filter((r) => r.section === this.codexSec);
    const color = secs.find((sc) => sc.id === this.codexSec)?.color ?? '#36e0e8';
    const top = py + u * 5.4;
    if (this.codexSec === 'logs' && this.logOpen !== null && readLogs(game.awards).includes(this.logOpen)) {
      this.drawLogReader(ctx, game, px, top, pw, py + ph - top, u, color);
      return;
    }
    this.logOpen = null;
    const foot = u * 2.8;
    const cols = pw < u * 30 ? 1 : 2;
    const cardH = u * 3.2;
    const gap = u * 0.4;
    const fit = Math.max(1, Math.floor((ph - (top - py) - foot) / (cardH + gap)));
    this.codexPer = fit * cols;
    this.codexTotal = rows.length;
    this.codexFirst = Math.min(this.codexFirst, Math.max(0, Math.floor((rows.length - 1) / this.codexPer) * this.codexPer));
    const cw = (pw - u * 2 - gap * (cols - 1)) / cols;
    const page = rows.slice(this.codexFirst, this.codexFirst + this.codexPer);
    page.forEach((r, i) => {
      const x = px + u + (i % cols) * (cw + gap);
      const y = top + Math.floor(i / cols) * (cardH + gap);
      ctx.fillStyle = r.found ? 'rgba(26,38,58,0.95)' : 'rgba(18,22,34,0.9)';
      ctx.fillRect(x, y, cw, cardH);
      // Section mark: a filled diamond once found, a hollow grey one before.
      const mx = x + u * 1.1;
      const my = y + u * 1.05;
      const mr = u * 0.5;
      ctx.beginPath();
      ctx.moveTo(mx, my - mr);
      ctx.lineTo(mx + mr, my);
      ctx.lineTo(mx, my + mr);
      ctx.lineTo(mx - mr, my);
      ctx.closePath();
      if (r.found) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = '#3a4056';
        ctx.lineWidth = Math.max(1, u * 0.12);
        ctx.stroke();
      }
      this.text(ctx, r.title, x + u * 2.1, y + u * 1.05, Math.round(u * 0.8), r.found ? '#fff' : '#6c7388', 'left', cw - u * 2.8);
      // Read logs open in the reader.
      if (r.found && r.section === 'logs') {
        this.text(ctx, 'READ >', x + cw - u * 0.6, y + u * 1.05, Math.round(u * 0.6), color, 'right', u * 4);
        this.rects.push({ x, y, w: cw, h: cardH, a: { k: 'logread', i: Number(r.id.slice(5)) } });
      }
      const size = Math.round(u * 0.62);
      this.wrapLines(ctx, r.detail, cw - u * 2.8, size, 2).forEach((ln, j) => {
        this.text(ctx, ln, x + u * 2.1, y + u * (2.0 + j * 0.85), size, r.found ? '#b8c4dc' : '#5a6276', 'left', cw - u * 2.8);
      });
    });
    this.codexShown = page.length;
    const fy = py + ph - foot + u * 0.4;
    const pages = Math.max(1, Math.ceil(rows.length / this.codexPer));
    const cur = Math.floor(this.codexFirst / this.codexPer) + 1;
    const tot = codexCounts(all);
    this.button(ctx, px + u, fy, u * 5, u * 2, '< PREV', { k: 'codexpage', d: -1 }, u * 0.75, { enabled: cur > 1, color: '#2a3550' });
    this.button(ctx, px + pw - u * 6, fy, u * 5, u * 2, 'NEXT >', { k: 'codexpage', d: 1 }, u * 0.75, { enabled: cur < pages, color: '#2a3550' });
    this.text(ctx, `Page ${cur}/${pages}  -  ${tot.found} of ${tot.total} known`, px + pw / 2, fy + u * 1.3, Math.round(u * 0.7), '#8a90a2', 'center', pw - u * 14);
  }

  /** Wrapped lines the log reader drew last frame (e2e). */
  logLinesShown = 0;

  /** Log reader: one recovered log in full, paged through the read logs in story order. */
  private drawLogReader(ctx: CanvasRenderingContext2D, game: Game, px: number, top: number, pw: number, h: number, u: number, color: string): void {
    const i = this.logOpen ?? 0;
    const aw = game.awards;
    const read = readLogs(aw);
    const { head, body, more } = logParts(i);
    const x = px + u;
    const w = pw - u * 2;
    const foot = u * 2.8;
    ctx.fillStyle = 'rgba(20,16,36,0.96)';
    ctx.fillRect(x, top, w, h - foot);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, u * 0.1);
    ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - foot - 1);
    // Terminal scanlines, so the page reads as a recovered screen.
    ctx.fillStyle = 'rgba(180,140,255,0.05)';
    for (let yy = top + u * 0.5; yy < top + h - foot; yy += u * 0.5) ctx.fillRect(x, yy, w, Math.max(1, u * 0.12));
    this.text(ctx, head, x + u * 1.2, top + u * 1.6, Math.round(u * 1.1), color, 'left', w - u * 10);
    this.text(ctx, `${read.indexOf(i) + 1} of ${read.length} recovered`, x + w - u * 1.2, top + u * 1.6, Math.round(u * 0.65), '#8a90a2', 'right', u * 12);
    // The headline, then the rest of the log as paragraphs, as many lines as fit above the story strip.
    const size = Math.round(u * (w < u * 28 ? 0.85 : 1));
    const lh = size * 1.45;
    const bottom = top + h - foot - u * 4;
    let ly = top + u * 3.6;
    this.logLinesShown = 0;
    [body, ...more].forEach((para, pi) => {
      for (const ln of this.wrapLines(ctx, para, w - u * 2.4, size, 8)) {
        if (ly > bottom) return;
        this.text(ctx, ln, x + u * 1.2, ly, size, pi === 0 ? '#e8e0ff' : '#b8b0d8', 'left', w - u * 2.4);
        ly += lh;
        this.logLinesShown++;
      }
      ly += lh * 0.45;
    });
    // Story strip: one cell per log in order; read ones lit, this one ringed, gaps stay dark.
    const n = LORE.length;
    const cell = Math.min(u * 2.2, (w - u * 2.4) / n);
    const sx0 = x + w / 2 - (cell * n) / 2;
    const sy0 = top + h - foot - u * 2.6;
    this.text(ctx, 'STORY', x + w / 2, sy0 - u * 0.9, Math.round(u * 0.6), '#6c7388', 'center', w);
    for (let j = 0; j < n; j++) {
      const cx = sx0 + j * cell + cell * 0.12;
      const cw2 = cell * 0.76;
      ctx.fillStyle = read.includes(j) ? color : '#262a3c';
      ctx.fillRect(cx, sy0, cw2, u * 0.9);
      if (j === i) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, u * 0.14);
        ctx.strokeRect(cx - u * 0.15, sy0 - u * 0.15, cw2 + u * 0.3, u * 1.2);
      }
    }
    const fy = top + h - foot + u * 0.4;
    const prev = stepLog(aw, i, -1);
    const next = stepLog(aw, i, 1);
    this.button(ctx, px + u, fy, u * 5, u * 2, '< PREV', { k: 'logread', i: prev }, u * 0.75, { enabled: prev !== null, color: '#2a3550' });
    this.button(ctx, px + pw / 2 - u * 3.5, fy, u * 7, u * 2, 'ALL LOGS', { k: 'logread', i: null }, u * 0.75, { color: '#3a2a5a' });
    this.button(ctx, px + pw - u * 6, fy, u * 5, u * 2, 'NEXT >', { k: 'logread', i: next }, u * 0.75, { enabled: next !== null, color: '#2a3550' });
  }

  /** AWARDS page: a card per award with a tier star, progress bar and count; paged to fit. */
  private drawAwards(ctx: CanvasRenderingContext2D, game: Game, px: number, py: number, pw: number, ph: number, u: number, time: number): void {
    const aw = game.awards;
    const top = py + u * 3.2;
    const foot = u * 2.8;
    const cols = pw < u * 30 ? 1 : 2;
    const cardH = u * 2.6;
    const gap = u * 0.4;
    const rows = Math.max(1, Math.floor((ph - (top - py) - foot) / (cardH + gap)));
    this.awardsPer = rows * cols;
    this.awardFirst = Math.min(this.awardFirst, Math.floor((AWARDS.length - 1) / this.awardsPer) * this.awardsPer);
    const cw = (pw - u * 2 - gap * (cols - 1)) / cols;
    const page = AWARDS.slice(this.awardFirst, this.awardFirst + this.awardsPer);
    this.giftsShown = 0;
    const tierCol = ['#e0a060', '#d8e4f0', '#ffd23a'];
    page.forEach((d, i) => {
      const x = px + u + (i % cols) * (cw + gap);
      const y = top + Math.floor(i / cols) * (cardH + gap);
      const done = aw.done.includes(d.id);
      const have = awardProgress(aw, d);
      const glow = done && d.id === this.lastAward ? 0.5 + 0.5 * Math.sin(time * 5) : 0;
      ctx.fillStyle = done ? `rgba(70,58,22,${0.85 + 0.15 * glow})` : 'rgba(20,26,40,0.9)';
      ctx.fillRect(x, y, cw, cardH);
      if (done) {
        ctx.strokeStyle = tierCol[d.tier - 1] ?? '#ffd23a';
        ctx.lineWidth = Math.max(1, u * 0.12);
        ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, cardH - 1);
      }
      this.awardStar(ctx, x + u * 1.3, y + cardH / 2, u * 0.9, done ? tierCol[d.tier - 1] ?? '#ffd23a' : '#3a4056');
      this.text(ctx, d.name, x + u * 2.6, y + u * 1.05, Math.round(u * 0.8), done ? '#fff' : '#c9d0e4', 'left', cw - u * 8);
      this.text(ctx, d.desc, x + u * 2.6, y + u * 2.05, Math.round(u * 0.62), done ? '#e8d8a0' : '#8a90a2', 'left', cw - u * 8);
      const bw = u * 4.4;
      const bx = x + cw - bw - u * 0.6;
      this.text(ctx, done ? 'DONE' : `${have.toLocaleString('en-US')}/${d.goal.toLocaleString('en-US')}`, bx + bw, y + u * 0.85, Math.round(u * 0.62), done ? '#ffd23a' : '#8a90a2', 'right', bw + u);
      ctx.fillStyle = '#2a3046';
      ctx.fillRect(bx, y + u * 1.1, bw, u * 0.4);
      ctx.fillStyle = done ? '#ffd23a' : '#36e0e8';
      ctx.fillRect(bx, y + u * 1.1, bw * (have / d.goal), u * 0.4);
      // The one-time gift: item icons with counts, right-aligned under the bar (dimmed once paid).
      this.drawGift(ctx, awardGift(d), bx + bw, y + u * 1.65, u * 0.75, done);
    });
    this.awardsShown = page.length;
    const fy = py + ph - foot + u * 0.4;
    const pages = Math.ceil(AWARDS.length / this.awardsPer);
    const cur = Math.floor(this.awardFirst / this.awardsPer) + 1;
    this.button(ctx, px + u, fy, u * 5, u * 2, '< PREV', { k: 'awardpage', d: -1 }, u * 0.75, { enabled: cur > 1, color: '#2a3550' });
    this.button(ctx, px + pw - u * 6, fy, u * 5, u * 2, 'NEXT >', { k: 'awardpage', d: 1 }, u * 0.75, { enabled: cur < pages, color: '#2a3550' });
    this.text(ctx, `Page ${cur}/${pages}  -  ${aw.done.length} of ${AWARDS.length} earned`, px + pw / 2, fy + u * 1.3, Math.round(u * 0.7), '#8a90a2', 'center', pw - u * 14);
  }

  /** Gift row ending at `right`: icon then "xN" per item, `size` tall; returns nothing (counts giftsShown). */
  private drawGift(ctx: CanvasRenderingContext2D, gift: Partial<Record<ItemId, number>>, right: number, y: number, size: number, paid: boolean): void {
    let x = right;
    const s = size / ICON;
    ctx.globalAlpha = paid ? 0.55 : 1;
    for (const k of (Object.keys(gift) as ItemId[]).reverse()) {
      const label = `x${gift[k] ?? 0}`;
      ctx.font = `bold ${Math.round(size * 0.8)}px ${FONT}`;
      const tw = ctx.measureText(label).width;
      this.text(ctx, label, x, y + size * 0.82, Math.round(size * 0.8), paid ? '#e8d8a0' : '#c9d0e4', 'right');
      x -= tw + size * 0.15;
      drawIcon(ctx, k, x - size, y, s);
      x -= size + size * 0.4;
    }
    ctx.globalAlpha = 1;
    this.giftsShown++;
  }

  /** Award cards that drew a gift row last frame (e2e). */
  giftsShown = 0;

  private awardStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawInventory(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    const pw = Math.min(w - u, u * 46);
    // Phones stack the character above the pack, so the item details (and the build-bar row) need a taller panel.
    const ph = Math.min(h - u, pw < u * 30 ? u * 50 : u * 32);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    this.panel(ctx, px, py, pw, ph);
    const pg = this.invPage;
    const titles = { items: ['INVENTORY', '#36e0e8'], awards: ['AWARDS', '#ffd23a'], codex: ['CODEX', '#b48cff'] } as const;
    const narrowHead = pw < u * 34;
    // Phones: the page buttons need the room, so the title is dropped there (the open tab names the page).
    if (!narrowHead || pg !== 'items') this.text(ctx, titles[pg][0], px + u, py + u * 1.6, Math.round(u * 1.3), titles[pg][1], 'left', narrowHead ? pw - u * 15.5 : 0);
    this.button(ctx, px + pw - u * 6.5, py + u * 0.5, u * 6, u * 2.1, 'CLOSE', { k: 'inv' }, u * 0.9);
    if (pg !== 'items') {
      this.button(ctx, px + pw - u * 15, py + u * 0.5, u * 8, u * 2.1, '< ITEMS', pg === 'awards' ? { k: 'awards', open: false } : { k: 'codex', open: false }, u * 0.75, { color: pg === 'awards' ? '#5a4a1a' : '#3a2a5a' });
      if (pg === 'awards') this.drawAwards(ctx, game, px, py, pw, ph, u, time);
      else this.drawCodex(ctx, game, px, py, pw, ph, u);
      return;
    }
    const got = game.awards.done.length;
    const bw = narrowHead ? u * 7.6 : u * 8;
    this.button(ctx, px + pw - u * 7 - bw, py + u * 0.5, bw, u * 2.1, `AWARDS ${got}/${AWARDS.length}`, { k: 'awards', open: true }, u * 0.72, { color: '#5a4a1a' });
    const known = codexCounts(game.codexRows);
    this.button(ctx, px + pw - u * 7.5 - bw * 2, py + u * 0.5, bw, u * 2.1, `CODEX ${known.found}/${known.total}`, { k: 'codex', open: true }, u * 0.72, { color: '#3a2a5a' });
    const narrow = pw < u * 30;
    // Character preview with gear.
    const cw = narrow ? pw - u * 2 : pw * 0.36;
    // Phones: a little taller so the PAINT button fits under the gear lines, clear of the helmet.
    const ch = narrow ? u * 11.6 : ph - u * 4.5;
    const cx = px + u;
    const cy = py + u * 3;
    ctx.fillStyle = 'rgba(20,26,40,0.9)';
    ctx.fillRect(cx, cy, cw, ch);
    const scale = Math.max(2, Math.floor(Math.min((ch * (narrow ? 0.9 : 0.55)) / 24, (cw * 0.45) / 16)));
    const fx = narrow ? cx + cw * 0.22 : cx + cw / 2;
    const fy = narrow ? cy + ch - u * 0.6 : cy + 24 * scale + u * 2.8;
    ctx.fillStyle = 'rgba(54,224,232,0.15)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 9 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    const wearOf = (slot: 'head' | 'body' | 'feet'): [string, string] | undefined => {
      const id = game.equipped(slot);
      return id ? [GEAR[id].color, GEAR[id].accent] : undefined;
    };
    const paint = game.paint;
    drawPlayer(ctx, fx, fy, scale, { facing: 1, walking: false, t: time, airborne: false, tier: game.upgrades.armor ?? 0, gear: playerGear(game), held: game.tool, wear: { head: wearOf('head'), body: wearOf('body'), feet: wearOf('feet') }, paint: paint ? [paint.c1, paint.c2] : undefined, helm: game.helmPaint ? [game.helmPaint.c1, game.helmPaint.c2] : undefined });
    // Paints: earned from gold awards; SUIT / HELM / RIDE each cycle default -> each earned paint.
    const earned = unlockedPaints(game.awards).length;
    const pbw = narrow ? cw * 0.5 : Math.min(cw - u * 1.6, u * 11);
    const pbx = narrow ? cx + cw * 0.45 : cx + (cw - pbw) / 2;
    const pby = narrow ? cy + ch - u * 2.2 : cy + u * 0.5;
    const short: Record<PaintSlot, string> = { suit: 'SUIT', helm: 'HELM', ride: 'RIDE' };
    const gap = u * 0.3;
    const sbw = (pbw - gap * (PAINT_SLOTS.length - 1)) / PAINT_SLOTS.length;
    PAINT_SLOTS.forEach((slot, k) => {
      const p = game.paintIn(slot);
      const bx = pbx + k * (sbw + gap);
      const label = earned === 0 ? (k === 0 ? `0/${PAINTS.length}` : short[slot]) : short[slot];
      this.button(ctx, bx, pby, sbw, u * 1.7, label, { k: 'paint', slot }, u * 0.55, { enabled: earned > 0, color: p ? '#4a3a6a' : '#2a3550' });
      if (p) {
        // Swatch strip along the bottom edge: main over shade.
        ctx.fillStyle = p.c1;
        ctx.fillRect(bx + u * 0.25, pby + u * 1.3, sbw - u * 0.5, u * 0.18);
        ctx.fillStyle = p.c2;
        ctx.fillRect(bx + u * 0.25, pby + u * 1.48, sbw - u * 0.5, u * 0.1);
      }
    });
    if (earned === 0 && !narrow) this.text(ctx, 'Earn gold awards to unlock paints', cx + cw / 2, pby + u * 2.4, Math.round(u * 0.55), '#6c7388', 'center', cw - u);
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
    // Header names the held tool on the right (it used to sit in the 5th slot and overprint the hook).
    this.text(ctx, `TOOLS  (1-${TOOL_SLOTS.length}, Q, wheel)`, rx, ry + u * 0.6, Math.round(u * 0.75), '#8a90a2', 'left', rw * 0.62);
    this.text(ctx, TOOL_SLOTS.find((t) => t.tool === game.tool)?.label ?? '', rx + rw, ry + u * 0.6, Math.round(u * 0.75), '#36e0e8', 'right', rw * 0.36);
    ry += u * 1.2;
    const cs = Math.min(u * 3.4, (rw - u * 1.5) / 6);
    TOOL_SLOTS.forEach((t, i) => this.cell(ctx, rx + i * (cs + u * 0.4), ry, cs, t.tool, null, game.tool === t.tool, { k: 'settool', t: t.tool }));
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
      const what = itemUse(sel);
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
      // Arrange the build bar: move the selected placeable one slot left / right (shown on the bar below).
      const shownBar = visiblePlaceables(game.carried, game.selected, game.hotbar);
      const at = shownBar.indexOf(sel);
      if (at >= 0) {
        const by = ry + u * 3;
        const mw = Math.max(u * 2.6, this.touch ? 44 : 0);
        this.text(ctx, `Build bar slot ${at + 1}/${shownBar.length}`, rx, by + u * 1.1, Math.round(u * 0.72), '#9aa3b8', 'left', rw);
        const lx = rx + Math.min(rw - mw * 2 - u * 0.5, u * 11);
        this.button(ctx, lx, by, mw, u * 2.2, '<', { k: 'barmove', id: sel, d: -1 }, u * 0.85, { enabled: at > 0 });
        this.button(ctx, lx + mw + u * 0.5, by, mw, u * 2.2, '>', { k: 'barmove', id: sel, d: 1 }, u * 0.85, { enabled: at < shownBar.length - 1 });
        // Preview of the build bar in its arranged order (tap a slot to select that item here).
        const cs = Math.round(u * 1.9);
        const fit = Math.max(1, Math.floor(rw / (cs + 3)));
        const first = Math.max(0, Math.min(at - Math.floor(fit / 2), shownBar.length - fit));
        shownBar.slice(first, first + fit).forEach((id, k) => {
          this.cell(ctx, rx + k * (cs + 3), by + u * 2.8, cs, id, null, id === sel, { k: 'invsel', id });
        });
      }
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

  /** Garage: build vehicles from base storage, deploy one beside the bay, fit engine / armor / battery parts. */
  private drawGarage(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number): void {
    const pw = Math.min(w - u * 2, u * 40);
    const rowH = u * 5.2;
    const ph = Math.min(h - u * 6, u * 4.2 + rowH * VEHICLE_IDS.length);
    const px = (w - pw) / 2;
    const py = Math.max(u * 4, (h - ph) / 2);
    this.panel(ctx, px, py, pw, ph);
    this.text(ctx, 'GARAGE', px + u, py + u * 1.5, Math.round(u * 1.2), '#ffcf4a');
    this.text(ctx, 'Paid from base storage', px + u * 8, py + u * 1.5, Math.round(u * 0.7), '#8a90a2', 'left', pw - u * 15);
    this.button(ctx, px + pw - u * 5.5, py + u * 0.5, u * 5, u * 2, 'CLOSE', { k: 'interact' }, u * 0.8);
    const deployed = game.riding ? game.equipped('vehicle') : game.parkedVehicle()?.id;
    let ry = py + u * 3;
    for (const id of VEHICLE_IDS) {
      if (ry + rowH > py + ph + 1) break;
      const v = VEHICLES[id];
      const owned = game.ownsGear(id);
      const here = deployed === id;
      ctx.fillStyle = here ? 'rgba(54,224,232,0.12)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      const isz = u * 3;
      this.cell(ctx, px + u * 0.8, ry + u * 0.4, isz, id, null, here, null);
      const tx = px + u * 1.4 + isz;
      const tw = pw - isz - u * 9;
      this.text(ctx, v.name, tx, ry + u * 1.1, Math.round(u * 0.95), '#fff', 'left', tw);
      const st = vehicleStats(id, game.vehicleParts(id));
      const line = `${v.desc}  Speed x${st.speed.toFixed(1)}${st.flying ? `  Drain ${st.drain.toFixed(1)}/s` : ''}${st.armor > 0 ? `  Armor ${Math.round(st.armor * 100)}%` : ''}`;
      const bw = u * 5.5;
      const bxr = px + pw - bw - u * 0.8;
      if (!owned) {
        const can = game.canBuildVehicle(id);
        this.text(ctx, `${line}`, tx, ry + u * 2.2, Math.round(u * 0.66), '#9aa3b8', 'left', tw);
        this.text(ctx, `Cost: ${costText(v.cost)}`, tx, ry + u * 3.3, Math.round(u * 0.66), can ? '#9ff6a0' : '#ff8a8a', 'left', tw);
        this.button(ctx, bxr, ry + u * 0.4, bw, u * 2.2, 'BUILD', { k: 'buildveh', id }, u * 0.85, { enabled: can });
      } else {
        this.text(ctx, line, tx, ry + u * 2.2, Math.round(u * 0.66), '#9aa3b8', 'left', tw);
        this.button(ctx, bxr, ry + u * 0.4, bw, u * 2.2, here ? 'PARKED' : 'DEPLOY', { k: 'deploy', id }, u * 0.85, { color: here ? '#2a6a3a' : '#1f6f78', enabled: !here });
        const lv = game.vehicleParts(id);
        const pbw = Math.min(u * 7.5, (pw - isz - u * 3) / 3 - u * 0.4);
        let bx = tx;
        for (const part of PART_IDS) {
          const max = lv[part] >= MAX_PART;
          const label = `${part.toUpperCase()} ${lv[part]}/${MAX_PART}`;
          this.button(ctx, bx, ry + u * 2.9, pbw, u * 1.8, label, { k: 'part', id, part }, u * 0.62, { enabled: !max && game.canUpgradePart(id, part), color: max ? '#2a6a3a' : '#2a3550' });
          bx += pbw + u * 0.4;
        }
        const next = PART_IDS.map((part) => (lv[part] < MAX_PART ? `${part}: ${costText(partCost(part, lv[part]))}` : '')).filter(Boolean)[0];
        if (next && bx + u * 2 < px + pw) this.text(ctx, next, bx + u * 0.2, ry + u * 3.9, Math.round(u * 0.55), '#8a90a2', 'left', px + pw - bx - u);
      }
      ry += rowH;
    }
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
    this.gearButton(ctx, w - u * 3.6, u, u * 2.6, u * 2.6);
    const best = game.stats.deepest;
    if (best > 0) this.text(ctx, `Best depth ${best}m   Deaths ${game.stats.deaths}`, w / 2, h * 0.55 + bh + u * 1.6, Math.round(u * 0.9), '#c9d0e4', 'center');
    if (!this.touch) this.text(ctx, 'A/D move  W/Space jump  Hold click: dig  Right click: build  B: workshop  M: map  R: beam home  H: heal', w / 2, h - u * 1.6, Math.round(u * 0.7), '#8a90a2', 'center', w - u * 2);
  }

  private drawHud(ctx: CanvasRenderingContext2D, game: Game, w: number, h: number, u: number, time: number): void {
    const d = game.derived;
    const bw0 = Math.min(w * 0.45, u * 14);
    const bh = u * 1.25;
    // Left-handed touch (move stick on the right) mirrors the status block and the button column.
    // Square glyph buttons; at least 44 px on touch (finger-sized targets).
    const bhgt = this.touch ? Math.max(u * 2.4, 44) : u * 2.4;
    const bgap = u * 0.5;
    const bwid = bhgt * 2 + bgap;
    const hs = bh * 2 + u * 0.4;
    const anc = hudAnchors(w, u, bw0, hs, bwid, 0, this.touch && this.stickSide === 1);
    const bw = anc.barW;
    this.hudMirrored = this.touch && this.stickSide === 1;
    const x = anc.x;
    let y = u;
    this.bar(ctx, x, y, bw, bh, game.hp / d.maxHp, '#ff5a5a', `HP ${Math.ceil(game.hp)}`, u);
    y += bh + u * 0.4;
    const low = game.battery / d.maxBattery < 0.2;
    this.bar(ctx, x, y, bw, bh, game.battery / d.maxBattery, low ? '#ff9a3c' : '#36e0e8', `BAT ${Math.ceil(game.battery)}`, u);
    y += bh + u * 0.9;
    // Quick-heal button beside the bars (H): best healing item in the pack, pulses red when HP is low.
    const heals = healCount(game.carried);
    if (heals > 0) {
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
    this.text(ctx, `Depth ${Math.floor(game.depth)}m ${game.depth > 2 ? `(${LAYERS[game.layer].name})` : ''}  Pack ${carried}/${d.packCap}`, x, y, Math.round(u * 0.95), carried >= d.packCap ? '#ff9a3c' : '#ffffff', 'left', anc.rightLimit - x - u * 0.5);

    // The toast column starts below whatever HUD text is showing.
    let hudLow = y + u * 0.9;
    // Meal buffs: a chip per active buff with its time left.
    let bxp = x;
    for (const id of BUFF_IDS) {
      const left = game.buffs[id];
      if (!left) continue;
      const label = `${BUFFS[id].name.toUpperCase()} ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      const fs = Math.round(u * 0.75);
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`;
      const tw = ctx.measureText(label).width + u * 0.8;
      const cy = y + u * (game.isAtBase() ? 2.4 : 1.1);
      ctx.fillStyle = 'rgba(10,12,20,0.7)';
      ctx.fillRect(bxp, cy, tw, u * 1.2);
      ctx.fillStyle = BUFFS[id].color;
      ctx.fillRect(bxp, cy, u * 0.2, u * 1.2);
      this.text(ctx, label, bxp + u * 0.45, cy + u * 0.62, fs, left < 15 && Math.floor(time * 4) % 2 === 0 ? '#ffffff' : BUFFS[id].color);
      bxp += tw + u * 0.4;
      hudLow = Math.max(hudLow, cy + u * 1.6);
    }

    if (game.isAtBase() && (game.power.solars > 0 || game.power.smelters > 0 || game.power.batteries > 0 || game.power.miners > 0 || game.power.drones > 0)) {
      const pw = game.power;
      const bat = pw.cap > 0 ? `  Batt ${Math.round((pw.charge / pw.cap) * 100)}%` : '';
      this.text(ctx, `Power ${pw.supply.toFixed(0)}/${pw.demand.toFixed(0)}${bat}`, x, y + u * 1.3, Math.round(u * 0.85), pw.working || pw.supply > 0 ? '#7dff9a' : '#ff9a3c');
      hudLow = Math.max(hudLow, y + u * 2.1);
    }

    // Right-side buttons: a two-wide grid of square glyph buttons (cog first).
    const btns = hudButtons({
      muted: game.muted,
      musicOn: game.musicOn,
      recall: game.recallT > 0 ? game.recallT / RECALL_TIME : 0,
      canRecall: game.canRecall(),
      atBase: game.isAtBase(),
      hasBays: game.isAtBase() && game.bays().length > 0,
      canAfford: game.isAtBase() && game.affordableUpgrades().length > 0,
      touch: this.touch,
      placeMode: this.placeMode,
      canMount: game.canMount(),
      riding: !!game.riding,
      hooked: !!game.hook,
      reeling: this.reeling,
      dash: !!game.gear.dash,
    });
    this.gearButton(ctx, anc.bx, u, bhgt, bhgt);
    const labelRects: LabelRect[] = [{ x: anc.bx, y: u, w: bhgt, h: bhgt, label: 'Settings' }];
    btns.forEach((b, i) => {
      const p = hudGridPos(i + 1, bhgt, bgap);
      this.glyphButton(ctx, anc.bx + p.dx, u + p.dy, bhgt, b, game, time);
      labelRects.push({ x: anc.bx + p.dx, y: u + p.dy, w: bhgt, h: bhgt, label: b.bind && !this.touch ? `${b.label} (${keyLabel(game.keys[b.bind])})` : b.label });
    });
    this.hudButtonsShown = btns.map((b) => b.label);
    // Desktop hover label: glyphs carry no words, so name the button under the mouse.
    const fsz = Math.round(u * 0.85);
    ctx.font = `bold ${fsz}px ${FONT}`;
    const hovered = labelRects.find((r) => this.hover && this.hover.x >= r.x && this.hover.x <= r.x + r.w && this.hover.y >= r.y && this.hover.y <= r.y + r.h);
    const tip = hoverLabel(labelRects, this.hover, this.touch, hovered ? ctx.measureText(hovered.label).width + u : 0);
    this.hoverShown = tip ? tip.label : '';
    if (tip) {
      const tw = ctx.measureText(tip.label).width + u;
      const th = fsz + u * 0.7;
      ctx.fillStyle = 'rgba(10,14,22,0.88)';
      ctx.fillRect(tip.right - tw, tip.cy - th / 2, tw, th);
      ctx.fillStyle = '#1f6f78';
      ctx.fillRect(tip.right - 2, tip.cy - th / 2, 2, th);
      this.text(ctx, tip.label, tip.right - u * 0.5, tip.cy + fsz * 0.35, fsz, '#e6f4ff', 'right');
    }

    // Hotbar: tools first, then placeable blocks.
    const gap = u * 0.4;
    const shown = visiblePlaceables(game.carried, game.selected, game.hotbar);
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
    this.slotPos.clear();
    shown.forEach((id, slotN) => {
      const i = PLACEABLE.indexOf(id);
      const n = invCount(game.carried, id);
      this.slotPos.set(id, { x: sx, y: sy, s: slot });
      this.cell(ctx, sx, sy, slot, id, n > 0 ? n : null, game.selected === id, { k: 'sel', i }, n <= 0);
      if (game.selected === id) {
        ctx.strokeStyle = '#ffcf4a';
        ctx.lineWidth = 3;
        ctx.strokeRect(sx + 1, sy + 1, slot - 2, slot - 2);
      }
      // Desktop: keys 6-0 and - pick the first six bar slots, labelled like the tool slots.
      if (!this.touch && slotN < BAR_SLOT_KEYS.length) this.text(ctx, BAR_SLOT_KEYS[slotN], sx + 4, sy + slot * 0.28, Math.round(slot * 0.22), '#8a90a2');
      sx += slot + gap;
    });
    // Bag button (inventory) at the end of the bar.
    this.cell(ctx, sx + gap, sy, slot, 'chest', null, false, { k: 'inv' });
    this.slotPos.set('inv', { x: sx + gap, y: sy, s: slot });
    this.text(ctx, this.touch ? 'BAG' : 'I', sx + gap + slot / 2, sy - u * 0.3, Math.round(u * 0.7), '#c9d0e4', 'center');
    this.drawBarPress(ctx);
    this.drawFlyers(ctx, slot);
    // What is held, above the bar.
    const heldName = TOOL_SLOTS.find((t) => t.tool === game.tool)?.label ?? '';
    this.text(ctx, game.tool === 'rod' && game.fishing ? (game.fishing.bite > 0 ? 'BITE! Click now!' : 'Waiting for a bite...') : heldName, w / 2, sy - u * 0.5, Math.round(u * 0.85), game.fishing && game.fishing.bite > 0 ? '#ffcf4a' : '#c9d0e4', 'center');

    // Toasts: newest on top, left-aligned under the HUD text.
    const tl = toastColumn(u, x, anc.rightLimit, hudLow);
    this.toastRects = [];
    let ty = tl.y;
    const goal = game.goal;
    this.goalRect = null;
    if (goal && !game.boss && !this.mapOpen && !this.invOpen) ty += this.drawGoal(ctx, game, goal, tl.x, ty, tl.maxW, u, time) + u * 0.35;
    for (let i = this.toasts.length - 1; i >= 0; i--) ty += this.drawToast(ctx, this.toasts[i], tl.x, ty, tl.maxW, u) + u * 0.35;

    // Contextual warnings and first-minute hints.
    if (low && !game.isAtBase() && Math.floor(time * 2.5) % 2 === 0) this.text(ctx, 'BATTERY LOW - RETURN TO THE PAD', w / 2, h * 0.2, Math.round(u * 1.2), '#ff9a3c', 'center', w - u * 2);
    const auto = game.stats.playTime >= 40 ? game.hintAutomation(this.touch) : null;
    if (auto) this.text(ctx, auto, w / 2, h - u * 0.7, Math.round(u * 0.75), '#7dffb0', 'center', w - u * 2);
    if (game.stats.playTime < 40) {
      const hint = this.touch ? (this.stickSide === 1 ? 'Right thumb: move, drag up to jump. Left side: dig.' : 'Left thumb: move, drag up to jump. Right side: dig.') : `${keyLabel(game.keys.left)}/${keyLabel(game.keys.right)} move, ${keyLabel(game.keys.jump)} jump. Click: dig / open chests. Right click: build. 1-5 or wheel: tools, 6-0: blocks. ${keyLabel(game.keys.inventory)}: inventory. ${keyLabel(game.keys.interact)}: open chest.`;
      this.text(ctx, hint, w / 2, h - u * 0.7, Math.round(u * 0.75), '#c9d0e4', 'center', w - u * 2);
    }
  }

  /** Guided-goal card on screen this frame (e2e), or null. */
  goalRect: { x: number; y: number; w: number; h: number; id: string; lines: number } | null = null;

  /** Slim GOAL card: a "2/7" step badge, the step text (keys filled in) and count on one row, a hairline progress bar. */
  private drawGoal(ctx: CanvasRenderingContext2D, game: Game, g: NonNullable<Game['goal']>, x: number, y: number, maxW: number, u: number, time: number): number {
    const bodyFs = Math.round(u * 0.76);
    const badgeFs = Math.round(u * 0.56);
    const raw = this.touch ? g.step.touch : g.step.text;
    const body = raw.replace('{shop}', keyLabel(game.keys.shop));
    const badge = `${g.index + 1}/${FTUE_STEPS.length}`;
    const counted = g.step.goal > 1;
    const count = `${g.have}/${g.step.goal}`;
    ctx.font = `bold ${badgeFs}px ${FONT}`;
    const badgeTextW = ctx.measureText(badge).width;
    const countTextW = counted ? ctx.measureText(count).width : 0;
    const L = goalCardLayout(maxW, u, bodyFs, badgeTextW, countTextW, counted);
    ctx.font = `bold ${bodyFs}px ${FONT}`;
    const lines = wrapText(body, L.textW, (s) => ctx.measureText(s).width);
    let wide = 0;
    for (const l of lines) wide = Math.max(wide, Math.min(L.textW, ctx.measureText(l).width));
    const ph = goalCardHeight(L, lines.length);
    const pw = L.textX + wide + L.countW + L.pad;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.fillStyle = 'rgba(8,10,18,0.66)';
    ctx.fillRect(x, y, pw, ph);
    ctx.fillStyle = `rgba(54,224,232,${0.7 + 0.3 * pulse})`;
    ctx.fillRect(x, y, Math.max(2, u * 0.18), ph);
    // Step badge: a small cyan chip, vertically centred on the first text line.
    const rowMid = y + L.pad * 0.65 + L.lineH * 0.5;
    const bh = badgeFs * 1.35;
    const bx = x + u * 0.18 + L.pad;
    ctx.fillStyle = 'rgba(54,224,232,0.2)';
    ctx.fillRect(bx, rowMid - bh / 2, L.badgeW, bh);
    this.text(ctx, badge, bx + L.badgeW / 2, rowMid, badgeFs, '#36e0e8', 'center', L.badgeW);
    let ly = y + L.pad * 0.65;
    for (const l of lines) {
      this.text(ctx, l, x + L.textX, ly + L.lineH * 0.5, bodyFs, '#eef1f8', 'left', L.textW);
      ly += L.lineH;
    }
    if (counted) {
      this.text(ctx, count, x + pw - L.pad, rowMid, badgeFs, '#8a90a2', 'right', L.countW);
      const by = y + ph - L.barH;
      const bx0 = x + Math.max(2, u * 0.18);
      ctx.fillStyle = '#2a3046';
      ctx.fillRect(bx0, by, pw - (bx0 - x), L.barH);
      ctx.fillStyle = '#36e0e8';
      ctx.fillRect(bx0, by, (pw - (bx0 - x)) * Math.min(1, g.have / g.step.goal), L.barH);
    }
    this.goalRect = { x, y, w: pw, h: ph, id: g.step.id, lines: lines.length };
    return ph;
  }

  /** One toast pill: accent bar, kind icon, optional small head label, body wrapped to 2 lines. Returns its height. */
  private drawToast(ctx: CanvasRenderingContext2D, t: Toast, x: number, y: number, maxW: number, u: number): number {
    // Older long-lived toasts fold to a faint one-line ghost so the column stops covering the world.
    const g = toastGhost(t.age);
    if (g >= 1) return this.drawGhostToast(ctx, t, x, y, maxW, u);
    const p = toastParts(t.text);
    const icon = u * 1.5;
    const pad = u * 0.45;
    const bodyFs = Math.round(u * 0.82);
    const headFs = Math.round(u * 0.58);
    const textW = maxW - icon - pad * 3;
    ctx.font = `bold ${bodyFs}px ${FONT}`;
    const lines = wrapText(p.body, textW, (s) => ctx.measureText(s).width);
    let wide = 0;
    for (const l of lines) wide = Math.max(wide, Math.min(textW, ctx.measureText(l).width));
    if (p.head) {
      ctx.font = `bold ${headFs}px ${FONT}`;
      wide = Math.max(wide, Math.min(textW, ctx.measureText(p.head).width));
    }
    const extraFs = Math.round(u * 0.64);
    const extras = (t.extras ?? []).map((e) => {
      ctx.font = `bold ${extraFs}px ${FONT}`;
      const ls = wrapText(e.text, textW, (s) => ctx.measureText(s).width);
      for (const l of ls) wide = Math.max(wide, Math.min(textW, ctx.measureText(l).width));
      return { lines: ls, color: e.color };
    });
    const extraH = extras.reduce((a, e) => a + e.lines.length * extraFs * 1.2, 0) + (extras.length ? u * 0.2 : 0);
    const textH = lines.length * bodyFs * 1.2 + (p.head ? headFs * 1.25 : 0) + extraH;
    const ph = Math.max(icon + pad * 2 - u * 0.3, textH + pad * 1.4);
    const pw = icon + pad * 3 + wide;
    const sx = x - toastSlide(t.age) * (pw + x);
    ctx.globalAlpha = Math.min(1, t.life / 0.5) * (1 - g);
    ctx.fillStyle = 'rgba(8,10,18,0.72)';
    ctx.fillRect(sx, y, pw, ph);
    ctx.fillStyle = t.color;
    ctx.fillRect(sx, y, Math.max(2, u * 0.18), ph);
    this.toastIcon(ctx, p.kind, sx + pad, y + (ph - icon) / 2, icon, t.color);
    let ly = y + pad * 0.7;
    const tx = sx + icon + pad * 2;
    if (p.head) {
      this.text(ctx, p.head, tx, ly + headFs * 0.6, headFs, t.color, 'left', textW);
      ly += headFs * 1.25;
    }
    for (const l of lines) {
      this.text(ctx, l, tx, ly + bodyFs * 0.6, bodyFs, p.head ? '#eef1f8' : t.color, 'left', textW);
      ly += bodyFs * 1.2;
    }
    if (extras.length) {
      ly += u * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(tx, ly, Math.min(wide, u * 6), Math.max(1, u * 0.06));
      ly += u * 0.1;
    }
    for (const e of extras) {
      for (const l of e.lines) {
        this.text(ctx, l, tx, ly + extraFs * 0.6, extraFs, e.color, 'left', textW);
        ly += extraFs * 1.2;
      }
    }
    ctx.globalAlpha = 1;
    this.toastRects.push({ x: sx, y, w: pw, h: ph });
    return ph;
  }

  /** A folded toast: a small dot in its colour and one short line on a faint strip. Returns its height. */
  private drawGhostToast(ctx: CanvasRenderingContext2D, t: Toast, x: number, y: number, maxW: number, u: number): number {
    const fs = Math.round(u * 0.62);
    const ph = fs * 1.5;
    const dot = Math.max(2, u * 0.32);
    ctx.font = `bold ${fs}px ${FONT}`;
    const line = ghostText(t.text);
    const tw = Math.min(maxW - dot - u * 1.2, ctx.measureText(line).width);
    const pw = dot + u * 1.2 + tw;
    const fade = (t.age - GHOST_AFTER - GHOST_FADE) / 0.2 + 0.4;
    ctx.globalAlpha = Math.min(1, t.life / 0.5) * Math.max(0, Math.min(1, fade));
    ctx.fillStyle = 'rgba(8,10,18,0.38)';
    ctx.fillRect(x, y, pw, ph);
    ctx.fillStyle = t.color;
    ctx.fillRect(x + u * 0.35, y + (ph - dot) / 2, dot, dot);
    ctx.globalAlpha *= 0.8;
    this.text(ctx, line, x + dot + u * 0.75, y + ph / 2 + fs * 0.05, fs, '#c9d0e4', 'left', maxW - dot - u * 1.2);
    ctx.globalAlpha = 1;
    this.toastRects.push({ x, y, w: pw, h: ph });
    return ph;
  }

  /** Small vector icon per toast kind (no font glyphs: they differ per platform). */
  private toastIcon(ctx: CanvasRenderingContext2D, kind: ToastKind, x: number, y: number, s: number, color: string): void {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, s, s);
    const c = s / 2;
    const k = s / 10;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, k * 1.1);
    ctx.beginPath();
    switch (kind) {
      case 'discover': // map pin
        ctx.arc(x + c, y + k * 4, k * 2.6, Math.PI * 0.85, Math.PI * 2.15);
        ctx.lineTo(x + c, y + k * 8.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#14181f';
        ctx.fillRect(x + c - k, y + k * 3, k * 2, k * 2);
        return;
      case 'reward': // plus
        ctx.fillRect(x + k * 4, y + k * 2, k * 2, k * 6);
        ctx.fillRect(x + k * 2, y + k * 4, k * 6, k * 2);
        return;
      case 'record': // star
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? k * 3.8 : k * 1.6;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(x + c + Math.cos(a) * r, y + c + 0.3 * k + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        return;
      case 'warn': // triangle with a bang
      case 'danger':
        ctx.moveTo(x + c, y + k * 1.5);
        ctx.lineTo(x + k * 8.6, y + k * 8.4);
        ctx.lineTo(x + k * 1.4, y + k * 8.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#14181f';
        ctx.fillRect(x + c - k * 0.6, y + k * 4, k * 1.2, k * 2.2);
        ctx.fillRect(x + c - k * 0.6, y + k * 6.8, k * 1.2, k * 1);
        return;
      case 'home': // house
        ctx.moveTo(x + c, y + k * 1.8);
        ctx.lineTo(x + k * 8.4, y + k * 5);
        ctx.lineTo(x + k * 1.6, y + k * 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x + k * 2.6, y + k * 5, k * 4.8, k * 3.4);
        return;
      default: // info dot
        ctx.arc(x + c, y + c, k * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillRect(x + c - k * 0.6, y + k * 4.4, k * 1.2, k * 2.6);
        ctx.fillRect(x + c - k * 0.6, y + k * 3, k * 1.2, k * 0.9);
    }
  }

  /** Slot pulses (a bright ring that swells as an icon lands) and the icons in flight. */
  private drawFlyers(ctx: CanvasRenderingContext2D, slot: number): void {
    for (const [k, left] of this.flyers.pulse) {
      const r = this.slotPos.get(k);
      if (!r) continue;
      const a = pulseAmount(left);
      const g = r.s * a;
      ctx.strokeStyle = `rgba(255,236,140,${Math.min(1, a * 5).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x - g, r.y - g, r.s + g * 2, r.s + g * 2);
    }
    const s = Math.max(1, Math.floor((slot * 0.6) / ICON));
    for (const f of this.flyers.list) {
      if (f.t < 0) continue;
      const r = this.slotPos.get(f.item) ?? this.slotPos.get('inv');
      if (!r) continue;
      const p = flyerPos(f.t / FLY_TIME, f.x0, f.y0, r.x + r.s / 2, r.y + r.s / 2);
      const z = Math.max(1, Math.round(s * p.s));
      const half = (ICON * z) / 2;
      // Soft glow under the icon so it reads over dark caves.
      ctx.fillStyle = 'rgba(255,230,140,0.22)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, half * 1.15, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, f.item, Math.round(p.x - half), Math.round(p.y - half), z);
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
    if (this.shopTab === 'trade') this.tradeRows = tradeEntries(game).length;
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
      const potLock = !!r.pot && !game.hasPot();
      const locked = fabLocked || bpLock || potLock;
      const afford = !locked && ITEM_IDS.every((id) => (game.stash[id] ?? 0) >= (r.cost[id] ?? 0));
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
      this.text(ctx, `${r.pot ? 'Cooking pot' : 'Fabricator'}: ${r.name}`, px + u, ry + rowH * 0.3, Math.round(u * 0.95));
      const meal = MEAL_BUFF[r.out];
      const mealNote = meal ? `  ${BUFFS[meal].desc} for ${BUFF_TIME / 60} min` : '';
      this.text(ctx, fabLocked ? `Needs Fabricator Lv ${r.fab}` : bpLock ? `Raid blueprint: clear ${r.raids} raids (${game.stats.raids}/${r.raids})` : potLock ? `Place a cooking pot in the base first.${mealNote}` : `Cost: ${costText(r.cost)}${mealNote}`, px + u, ry + rowH * 0.68, Math.round(u * 0.72), afford ? '#9ff6a0' : '#ff8a8a');
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

    for (const entry of this.shopTab === 'trade' ? tradeEntries(game).slice(this.shopScroll, this.shopScroll + vis) : []) {
      const tr = typeof entry === 'object' && 'id' in entry ? game.tradeNow(entry) : entry;
      if (typeof tr === 'string') {
        this.modRow(ctx, game, tr, px, ry, pw, rowH, u);
        ry += rowH;
        continue;
      }
      if ('research' in tr) {
        this.researchRow(ctx, game, tr.research, px, ry, pw, rowH, u);
        ry += rowH;
        continue;
      }
      if ('header' in tr) {
        this.npcHeader(ctx, game, tr, px, ry, pw, rowH, u);
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
      const cozy = (tr.cozy ? 'Cozy rate. ' : '') + (typeof entry === 'object' && 'id' in entry && tr.give !== entry.give ? `${MOOD_LABEL[game.npcMood(tr.npc)]} price (was ${costText(entry.give)}). ` : '');
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
    this.button(ctx, px + u * 3 + tbw * 2, fy - u * 2.8, tbw, u * 2.2, this.dailyArmed > 0 ? 'CONFIRM?' : 'DAILY', { k: 'daily' }, u * 0.7, { color: this.dailyArmed > 0 ? '#a33a2a' : '#2a6a7a', pulse: this.dailyArmed > 0 });
    this.button(ctx, px + u, fy, bw, u * 2.4, this.newWorldArmed > 0 ? 'CONFIRM?' : 'NEW WORLD', { k: 'dive' }, u, { color: this.newWorldArmed > 0 ? '#a33a2a' : '#7a5a1f', pulse: this.newWorldArmed > 0 });
    this.button(ctx, px + u * 2 + bw, fy, bw, u * 2.4, 'CLOSE', { k: 'close' }, u);
    // Footer: on a shared world (Daily Dive, a friend's code) your local record sits under the world line.
    const rec = game.worldRecord();
    const footY = rec ? py + ph - u * 1.45 : py + ph - u * 0.9;
    this.text(ctx, `World ${game.seedCode}   Best ${game.stats.deepest}m   Dives ${game.runs}   Deaths ${game.stats.deaths}`, px + pw / 2, footY, Math.round(u * (rec ? 0.6 : 0.65)), '#8a90a2', 'center', pw - u);
    if (rec) this.text(ctx, recordLine(rec), px + pw / 2, py + ph - u * 0.6, Math.round(u * 0.6), '#ffd23a', 'center', pw - u);
  }
  /** A robot's group header: its portrait, name and title, and whether it lives here (or what it needs). */
  private npcHeader(ctx: CanvasRenderingContext2D, game: Game, h: HeaderEntry, px: number, ry: number, pw: number, rowH: number, u: number): void {
    const info = NPC_INFO[h.header];
    const home = game.hasNpc(h.header);
    const tag = h.header === 'merchant' ? '#5ad8ff' : ROBOT_LOOK[h.header as RobotKind].tag;
    ctx.fillStyle = home ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.25)';
    ctx.fillRect(px + u * 0.5, ry + rowH * 0.12, pw - u, rowH - u * 0.5);
    ctx.fillStyle = tag;
    ctx.fillRect(px + u * 0.5, ry + rowH * 0.12, u * 0.25, rowH - u * 0.5);
    // Portrait: the robot's own sprite (head and chest), dimmed while it has no home.
    const isz = rowH - u * 0.8;
    if (h.header === 'merchant') drawIcon(ctx, 'drone', px + u * 1.1, ry + u * 0.4, Math.max(1, Math.floor(isz / 12)));
    else {
      const s = Math.max(1, Math.floor(isz / 15));
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + u * 0.9, ry + u * 0.2, isz, isz);
      ctx.clip();
      if (!home) ctx.globalAlpha = 0.35;
      drawRows(ctx, robotRows(h.header as RobotKind, 0, false), px + u * 0.9 + (isz - TRADER_W * s) / 2, ry + u * 0.35, s, false, TRADER_W, undefined, ROBOT_LOOK[h.header as RobotKind].remap);
      ctx.restore();
    }
    const tx2 = px + u * 1.6 + isz;
    const tw2 = pw - isz - u * 3;
    this.text(ctx, `${info.name.toUpperCase()} THE ${info.title.toUpperCase()}`, tx2, ry + rowH * 0.36, Math.round(u * 0.85), tag, 'left', tw2);
    const nth = ['first', 'second', 'third', 'fourth'][NPC_ORDER.indexOf(h.header)] ?? 'another';
    const sub =
      h.header === 'merchant'
        ? game.hasNpc('merchant')
          ? `On the pad now: ${h.rows} offers today only`
          : `Away: lands at sunrise with these ${h.rows} offers`
        : home
          ? `Lives in your base: ${h.rows} ${h.header === 'gunsmith' ? 'chips' : h.header === 'scientist' ? 'perks' : 'rates'}.  ${moodText(game, h.header)}`
          : `Not here yet: furnish a ${nth} room (light, table, bed) to unlock ${h.rows} ${h.header === 'gunsmith' ? 'chips' : h.header === 'scientist' ? 'perks' : 'rates'}`;
    this.text(ctx, sub, tx2, ry + rowH * 0.72, Math.round(u * 0.64), home || h.header === 'merchant' ? '#c8d0e0' : '#ff8a8a', 'left', tw2);
  }

  /** One Scientist research row: perk icon, what it does, then STUDY, LOCKED (needs a perk first) or DONE. */
  private researchRow(ctx: CanvasRenderingContext2D, game: Game, id: ResearchId, px: number, ry: number, pw: number, rowH: number, u: number): void {
    const r = RESEARCH[id];
    const done = game.hasResearch(id);
    const home = game.hasNpc('scientist');
    const missing = game.researchNeeds(id);
    const afford = game.canResearch(id);
    ctx.fillStyle = done ? 'rgba(192,138,255,0.16)' : 'rgba(192,138,255,0.06)';
    ctx.fillRect(px + u * 0.5, ry, pw - u, rowH - u * 0.3);
    const isz = rowH - u * 0.8;
    this.cell(ctx, px + u * 0.8, ry + u * 0.25, isz, `res_${id}` as ItemId, null, done, null, !done && (!home || missing.length > 0));
    const tx2 = px + u * 1.4 + isz;
    const tw2 = pw - isz - u * 9;
    this.text(ctx, `${r.name}  [research]`, tx2, ry + rowH * 0.3, Math.round(u * 0.85), '#fff', 'left', tw2);
    const sub = done
      ? `${r.desc}. Researched: yours for good`
      : !home
        ? `${r.desc}. No scientist yet: furnish a fourth room (light, table, bed)`
        : missing.length > 0
          ? `${r.desc}. Needs ${missing.map((m) => RESEARCH[m].name).join(' + ')} first`
          : `${r.desc}. Nova studies it for ${priceText(r.cost, game.npcPrice('scientist', r.cost))}`;
    this.text(ctx, sub, tx2, ry + rowH * 0.68, Math.round(u * 0.64), done ? '#d8c8ff' : afford ? '#9ff6a0' : '#ff8a8a', 'left', tw2);
    const bw = u * 5.5;
    const bx = px + pw - bw - u * 0.8;
    if (done) this.button(ctx, bx, ry + u * 0.3, bw, rowH - u * 0.9, 'DONE', { k: 'research', id }, u * 0.85, { enabled: false });
    else this.button(ctx, bx, ry + u * 0.3, bw, rowH - u * 0.9, missing.length > 0 ? 'LOCKED' : 'STUDY', { k: 'research', id }, u * 0.85, { enabled: afford, color: '#5a3e9a' });
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
        ? `${m.desc}. Rook builds it for ${priceText(m.cost, game.npcPrice('gunsmith', m.cost))}`
        : `${m.desc}. No gunsmith yet: furnish a third room (light, table, bed)`;
    this.text(ctx, sub, tx2, ry + rowH * 0.68, Math.round(u * 0.64), owned ? (fitted ? '#ffd8a8' : '#9aa3b8') : afford ? '#9ff6a0' : '#ff8a8a', 'left', tw2);
    const bw = u * 5.5;
    const bx = px + pw - bw - u * 0.8;
    if (owned) this.button(ctx, bx, ry + u * 0.3, bw, rowH - u * 0.9, fitted ? 'FITTED' : 'FIT', { k: 'modfit', id }, u * 0.85, { color: fitted ? '#8a5a1f' : '#1f6f78' });
    else this.button(ctx, bx, ry + u * 0.3, bw, rowH - u * 0.9, 'BUILD', { k: 'modbuy', id }, u * 0.85, { enabled: afford });
  }
}

/** A Scientist research row in the TRADE tab. */
export interface ResearchEntry {
  research: ResearchId;
}
/** A robot's group header in the TRADE tab; `hidden` rows are folded away while it is not home. */
export interface HeaderEntry {
  header: NpcKind;
  rows: number;
  hidden: number;
}
export type TradeEntry = Trade | ModId | ResearchEntry | HeaderEntry;

/** Rows each room robot posts, in NPC_ORDER (the merchant's stock comes last). Pure. */
function robotRowsFor(kind: NpcKind, list: readonly Trade[]): TradeEntry[] {
  if (kind === 'gunsmith') return [...MOD_IDS];
  if (kind === 'scientist') return RESEARCH_IDS.map((research) => ({ research }));
  return list.filter((t) => t.npc === kind);
}

/**
 * TRADE tab rows: one header per robot (portrait, name, status) followed by its rows; a robot that
 * has not moved in yet folds to its header so the tab stays short. The merchant's stock is never
 * folded (its rows show what it brings next morning).
 */
export function tradeEntries(game: Game): TradeEntry[] {
  const list = game.tradeList();
  const out: TradeEntry[] = [];
  for (const kind of NPC_ORDER) {
    const rows = robotRowsFor(kind, list);
    const home = game.hasNpc(kind);
    out.push({ header: kind, rows: rows.length, hidden: home ? 0 : rows.length });
    if (home) out.push(...rows);
  }
  const stock = list.filter((t) => t.npc === 'merchant');
  out.push({ header: 'merchant', rows: stock.length, hidden: 0 }, ...stock);
  return out;
}

/** Which robot a TRADE entry belongs to (for jumping to its rows). Pure. */
export function entryNpc(e: TradeEntry): string {
  return typeof e === 'string' ? 'gunsmith' : 'research' in e ? 'scientist' : 'header' in e ? e.header : e.npc;
}

/** A price that shows the posted one too when a happy robot asks less. */
function priceText(posted: Partial<Record<ItemId, number>>, now: Partial<Record<ItemId, number>>): string {
  return now === posted ? costText(posted) : `${costText(now)} (was ${costText(posted)})`;
}

/** Header mood note: how the robot feels and what would cheer it up or what it gives back. */
export function moodText(game: Game, kind: NpcKind): string {
  const mood = game.npcMood(kind);
  const off = MOOD_DISCOUNT[mood];
  if (off > 0) return `${MOOD_LABEL[mood]}: ${off} off the biggest cost`;
  return `${MOOD_LABEL[mood]}: more comfort or neighbours make it happy (cheaper)`;
}

/** The non-zero entries of a trade side, in ITEM_IDS order. */
function tradeParts(inv: Partial<Record<ItemId, number>>): [ItemId, number][] {
  return ITEM_IDS.filter((k) => (inv[k] ?? 0) > 0).map((k) => [k, inv[k] ?? 0]);
}

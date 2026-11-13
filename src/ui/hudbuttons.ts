/**
 * The HUD's right-hand button column as data: which square glyph buttons show, in what order,
 * with what action, tint and badge. Pure (no DOM) so tests can pin the rules; ui.ts draws them
 * with drawHudGlyph.
 */
import type { BindId } from '../sim/keys';

export type HudGlyph = 'sound' | 'music' | 'mute' | 'map' | 'home' | 'beam' | 'drones' | 'shop' | 'dig' | 'build' | 'ride' | 'getoff' | 'reel' | 'dash';

export interface HudButton {
  glyph: HudGlyph;
  /** UI action kind (the action object is `{ k: action }`). */
  action: 'mute' | 'map' | 'recall' | 'drones' | 'shop' | 'mode' | 'ride' | 'reel' | 'dash';
  /** Fill colour of the button. */
  color: string;
  /** Short word for screen readers, tooltips and tests. */
  label: string;
  /** Bound key shown small in the corner on desktop. */
  bind?: BindId;
  /** 0-1 fill rising from the bottom (beam charge). */
  fill?: number;
  /** A small "!" badge (something affordable in the shop). */
  badge?: boolean;
  pulse?: boolean;
}

export interface HudButtonState {
  muted: boolean;
  musicOn: boolean;
  /** 0-1 beam charge while recalling, 0 otherwise. */
  recall: number;
  canRecall: boolean;
  atBase: boolean;
  hasBays: boolean;
  canAfford: boolean;
  touch: boolean;
  placeMode: boolean;
  canMount: boolean;
  riding: boolean;
  hooked: boolean;
  reeling: boolean;
  dash: boolean;
}

const TEAL = '#1f6f78';
const AMBER = '#7a5a1f';

export function hudButtons(s: HudButtonState): HudButton[] {
  const out: HudButton[] = [];
  out.push(s.muted ? { glyph: 'mute', action: 'mute', color: '#4a2a32', label: 'Sound off', bind: 'mute' } : s.musicOn ? { glyph: 'music', action: 'mute', color: TEAL, label: 'Sound on', bind: 'mute' } : { glyph: 'sound', action: 'mute', color: TEAL, label: 'Music off', bind: 'mute' });
  out.push({ glyph: 'map', action: 'map', color: TEAL, label: 'Map', bind: 'map' });
  if (s.recall > 0) out.push({ glyph: 'beam', action: 'recall', color: TEAL, label: `Beam ${Math.min(99, Math.floor(s.recall * 100))}%`, bind: 'recall', fill: Math.min(1, s.recall), pulse: true });
  else if (s.canRecall) out.push({ glyph: 'home', action: 'recall', color: TEAL, label: 'Home', bind: 'recall' });
  if (s.atBase && s.hasBays) out.push({ glyph: 'drones', action: 'drones', color: '#2a3550', label: 'Drones' });
  if (s.atBase) out.push({ glyph: 'shop', action: 'shop', color: TEAL, label: s.canAfford ? 'Shop (upgrade ready)' : 'Shop', bind: 'shop', badge: s.canAfford });
  if (s.touch) out.push(s.placeMode ? { glyph: 'build', action: 'mode', color: AMBER, label: 'Mode: build' } : { glyph: 'dig', action: 'mode', color: TEAL, label: 'Mode: dig' });
  if (s.canMount) out.push(s.riding ? { glyph: 'getoff', action: 'ride', color: AMBER, label: 'Get off', bind: 'ride' } : { glyph: 'ride', action: 'ride', color: TEAL, label: 'Ride', bind: 'ride' });
  if (s.touch && s.hooked) out.push({ glyph: 'reel', action: 'reel', color: s.reeling ? AMBER : TEAL, label: s.reeling ? 'Reeling' : 'Hold reel' });
  if (s.touch && s.dash) out.push({ glyph: 'dash', action: 'dash', color: TEAL, label: 'Dash' });
  return out;
}

export interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/**
 * Desktop hover label for the glyph buttons: the label of the button under the mouse and where to
 * draw it (right-aligned just left of the button, vertically centred on it, kept on screen).
 * Null on touch, without a mouse, or when the mouse is over no button.
 */
export function hoverLabel(rects: LabelRect[], mouse: { x: number; y: number } | null, touch: boolean, labelW: number, margin = 4): { label: string; right: number; cy: number } | null {
  if (touch || !mouse) return null;
  for (const r of rects) {
    if (mouse.x < r.x || mouse.x > r.x + r.w || mouse.y < r.y || mouse.y > r.y + r.h) continue;
    const right = Math.max(margin + labelW, r.x - 6);
    return { label: r.label, right, cy: r.y + r.h / 2 };
  }
  return null;
}

/** Offset of HUD grid slot i (slot 0 is the cog): two wide, row by row, so the column is half as tall as a list. */
export function hudGridPos(i: number, size: number, gap: number): { dx: number; dy: number } {
  return { dx: (i % 2) * (size + gap), dy: Math.floor(i / 2) * (size + gap) };
}

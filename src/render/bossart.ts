/**
 * Boss pixel art, generated in code (no assets). Each boss is a rig of shaded, outlined pixel parts
 * (legs, torso, head, arms, ornaments, or segments for flyers) built once per boss and cached as
 * canvases. Pixel generation is pure (hash2 only) so it is unit-tested without a DOM.
 */
import { hash2 } from '../sim/rng';
import { BOSSES, type BossId } from '../sim/bosses';

export type BossStyle = 'scrap' | 'vine' | 'crystal' | 'ice' | 'ember' | 'core';
export type PartShape = 'box' | 'disc' | 'diamond' | 'spike' | 'wedge' | 'drip';

export const BOSS_OUTLINE = '#161a24';

export interface PartSpec {
  w: number;
  h: number;
  shape: PartShape;
  base: string;
  accent: string;
  style: BossStyle;
  seed: number;
}

/** Mixes a #rrggbb colour toward white (k > 0) or black (k < 0). Pure. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = k >= 0 ? c + (255 - c) * k : c * (1 + k);
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

function inside(shape: PartShape, w: number, h: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const nx = (x + 0.5) / w - 0.5;
  const ny = (y + 0.5) / h - 0.5;
  switch (shape) {
    case 'disc':
      return nx * nx + ny * ny <= 0.25;
    case 'diamond':
      return Math.abs(nx) + Math.abs(ny) <= 0.5;
    case 'spike':
      // Point at the top, full width at the bottom.
      return Math.abs(nx) <= (y + 1) / h / 2;
    case 'drip':
      // Icicle: full width at the top, point at the bottom.
      return Math.abs(nx) <= (h - y) / h / 2;
    case 'wedge':
      // Broad shoulders tapering to a 72% waist; 2 px rounded top corners.
      if (y < 2 && (x < 2 - y || x > w - 3 + y)) return false;
      return Math.abs(nx) <= 0.5 - 0.14 * ((y + 0.5) / h);
    default: {
      // Rounded box: cut 2 px corners (1 px on tiny parts).
      const r = Math.min(w, h) >= 8 ? 2 : 1;
      const cx = x < r ? r - x : x >= w - r ? x - (w - r - 1) : 0;
      const cy = y < r ? r - y : y >= h - r ? y - (h - r - 1) : 0;
      return cx + cy <= r;
    }
  }
}

/** Shaded, outlined pixels for one rig part, row-major (null = transparent). Top-left light. Pure. */
export function partPixels(p: PartSpec): (string | null)[] {
  const { w, h } = p;
  const px: (string | null)[] = new Array(w * h).fill(null);
  const light = shade(p.base, 0.28);
  const lighter = shade(p.base, 0.5);
  const dark = shade(p.base, -0.3);
  const darker = shade(p.base, -0.5);
  const acc = p.accent;
  const accLight = shade(p.accent, 0.45);
  const at = (x: number, y: number): boolean => inside(p.shape, w, h, x, y);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      if (edge) {
        px[y * w + x] = BOSS_OUTLINE;
        continue;
      }
      let c = p.base;
      // Rim light on the top-left inner edge, shadow on the bottom-right.
      if (!at(x - 2, y) || !at(x, y - 2)) c = light;
      if (!at(x + 2, y) || !at(x, y + 2)) c = dark;
      // Soft vertical ramp + sparse dither.
      const hr = hash2(x, y, p.seed);
      if (y > h * 0.7 && hr < 0.5) c = c === light ? p.base : dark;
      if (hr > 0.95) c = light;
      else if (hr < 0.04) c = darker;
      px[y * w + x] = c;
    }
  }
  const put = (x: number, y: number, c: string): void => {
    if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && px[y * w + x] && px[y * w + x] !== BOSS_OUTLINE) px[y * w + x] = c;
  };
  switch (p.style) {
    case 'scrap': {
      // Riveted plate seams and rust patches.
      for (let y = 5; y < h - 3; y += 6) {
        for (let x = 1; x < w - 1; x++) {
          put(x, y, darker);
          put(x, y + 1, light);
        }
        for (let x = 3; x < w - 3; x += 5) put(x, y - 2, lighter);
      }
      for (let i = 0; i < (w * h) / 60; i++) {
        const rx = Math.floor(hash2(i, 1, p.seed) * w);
        const ry = Math.floor(hash2(i, 2, p.seed) * h);
        put(rx, ry, acc);
        put(rx + 1, ry, acc);
        put(rx, ry + 1, shade(acc, -0.25));
      }
      break;
    }
    case 'vine': {
      // Twisting vines with leaf pairs and a few blossoms.
      for (let vx = 3; vx < w - 2; vx += 7) {
        for (let y = 1; y < h - 1; y++) {
          const x = vx + Math.round(Math.sin(y * 0.5 + vx) * 1.5);
          put(x, y, darker);
          if (y % 4 === 0) {
            put(x - 1, y, acc);
            put(x + 1, y - 1, acc);
            put(x - 2, y - 1, accLight);
          }
        }
      }
      for (let i = 0; i < (w * h) / 120; i++) {
        const rx = Math.floor(hash2(i, 5, p.seed) * w);
        const ry = Math.floor(hash2(i, 6, p.seed) * h);
        put(rx, ry, '#ff7ab8');
        put(rx, ry - 1, '#ffd0e8');
      }
      break;
    }
    case 'crystal': {
      // Diagonal facet lines with bright glints.
      for (let d = -h; d < w; d += 6) {
        for (let y = 1; y < h - 1; y++) put(d + y, y, light);
      }
      for (let i = 0; i < (w * h) / 50; i++) {
        const rx = Math.floor(hash2(i, 7, p.seed) * w);
        const ry = Math.floor(hash2(i, 8, p.seed) * h);
        put(rx, ry, accLight);
        if (i % 3 === 0) put(rx, ry, '#ffffff');
      }
      break;
    }
    case 'ice': {
      // Frost cap and cracks.
      for (let x = 1; x < w - 1; x++) {
        put(x, 1, '#ffffff');
        if (hash2(x, 3, p.seed) > 0.4) put(x, 2, accLight);
      }
      for (let i = 0; i < 3; i++) {
        let x = Math.floor(hash2(i, 9, p.seed) * w);
        for (let y = 3; y < h - 1; y++) {
          put(x, y, acc);
          x += hash2(i, y, p.seed) > 0.5 ? 1 : -1;
          if (hash2(y, i, p.seed) > 0.7) break;
        }
      }
      break;
    }
    case 'ember': {
      // Glowing magma cracks between dark scales.
      for (let x = 2; x < w - 2; x += 4) {
        for (let y = 2; y < h - 2; y++) if ((x + y) % 7 === 0) put(x, y, shade(acc, -0.2));
      }
      for (let i = 0; i < (w * h) / 160; i++) put(Math.floor(hash2(i, 11, p.seed) * w), Math.floor(hash2(i, 12, p.seed) * h), accLight);
      break;
    }
    case 'core': {
      // Circuit traces with glowing nodes.
      for (let i = 0; i < 6; i++) {
        let x = Math.floor(hash2(i, 13, p.seed) * w);
        let y = Math.floor(hash2(i, 14, p.seed) * h);
        for (let s = 0; s < w; s++) {
          put(x, y, acc);
          if (hash2(i, s, p.seed) > 0.75) y += 1;
          else x += 1;
        }
        put(x, y, '#ffffff');
      }
      break;
    }
  }
  return px;
}

/** Where a part sits in the rig, in art px relative to the boss's bottom-centre (facing right). */
export interface RigPart {
  key: string;
  spec: PartSpec;
  x: number;
  y: number;
  /** Which animation channel moves it. */
  anim: 'legL' | 'legR' | 'body' | 'head' | 'armBack' | 'armFront' | 'none';
  /** Drawn darker (far side). */
  back?: boolean;
  /** Rides on an arm (fists): drawn in that arm's swing transform. */
  arm?: 'armB' | 'armF';
  /** Swings freely from its top corner (loose scrap plate). */
  dangle?: boolean;
  /** Fixed lean (radians, facing right) about the part's bottom centre: crystal clusters, horns. */
  tilt?: number;
  /** Glints: a twinkling highlight is drawn on the part (crystal). */
  glint?: boolean;
}

interface ArtDef {
  style: BossStyle;
  /** Head shape. */
  head: PartShape;
  ornament: 'stack' | 'petals' | 'shards' | 'horns' | 'none';
  /** Torso outline: broad-shouldered wedge for the heavy walkers. */
  torso?: PartShape;
  /** Fists riding the arm ends: shape and colour. */
  fist?: { shape: PartShape; base: string; scale: number };
  /** Glowing heart in the chest: scrap furnace grate, crystal geode, frost rune. */
  heart?: 'furnace' | 'geode' | 'rune';
}

export const BOSS_ART: Record<BossId, ArtDef> = {
  colossus: { style: 'scrap', head: 'box', ornament: 'stack', fist: { shape: 'box', base: '#4a5568', scale: 1.3 }, heart: 'furnace' },
  vine_queen: { style: 'vine', head: 'disc', ornament: 'petals' },
  golem: { style: 'crystal', head: 'box', ornament: 'shards', torso: 'wedge', fist: { shape: 'diamond', base: '#8a6ad8', scale: 1.6 }, heart: 'geode' },
  titan: { style: 'ice', head: 'box', ornament: 'horns', torso: 'wedge', fist: { shape: 'box', base: '#a8cce4', scale: 1.45 }, heart: 'rune' },
  wyrm: { style: 'ember', head: 'box', ornament: 'none' },
  hollow_ai: { style: 'core', head: 'disc', ornament: 'none' },
};

/** Extra glittering shards a slam throws up (crystal and ice bosses): how many and in which colours. Pure. */
export function slamShards(id: BossId): { n: number; colors: string[] } | null {
  const style = BOSS_ART[id].style;
  if (style === 'crystal') return { n: 14, colors: [BOSSES[id].accent, '#ffffff', BOSSES[id].eye] };
  if (style === 'ice') return { n: 14, colors: [BOSSES[id].accent, '#ffffff', '#9cd8f0'] };
  return null;
}

/** Art size of a boss in art px (1 art px = 1 logical px of a 16 px tile). */
export function bossArtSize(id: BossId): { w: number; h: number } {
  const d = BOSSES[id];
  return { w: Math.round(d.halfW * 2 * 16), h: Math.round(d.h * 16) };
}

/** Rig for a walking boss: legs, torso, head, two arms and an ornament. Pure. */
export function walkerRig(id: BossId): RigPart[] {
  const d = BOSSES[id];
  const a = BOSS_ART[id];
  const { w: W, h: H } = bossArtSize(id);
  const spec = (w: number, h: number, shape: PartShape, base: string, seed: number): PartSpec => ({
    w: Math.max(4, Math.round(w)),
    h: Math.max(4, Math.round(h)),
    shape,
    base,
    accent: d.accent,
    style: a.style,
    seed,
  });
  const legH = Math.round(H * 0.32);
  const torsoH = Math.round(H * 0.5);
  const headH = Math.round(H * 0.24);
  const legW = Math.round(W * 0.3);
  const torsoW = W;
  const headW = Math.round(W * (a.head === 'box' ? 0.5 : 0.56));
  const armW = Math.round(W * 0.28);
  const armH = Math.round(H * 0.5);
  const torsoTop = -(legH + torsoH) + 3;
  const headTop = torsoTop - headH + 3;
  const legBase = shade(d.color, -0.15);
  const parts: RigPart[] = [
    { key: 'armB', spec: spec(armW, armH, 'box', d.color, 5), x: -W / 2 - armW / 2 + 2, y: torsoTop + 2, anim: 'armBack', back: true },
    { key: 'legL', spec: spec(legW, legH, 'box', legBase, 1), x: -W * 0.32, y: -legH, anim: 'legL' },
    { key: 'legR', spec: spec(legW, legH, 'box', legBase, 2), x: W * 0.02, y: -legH, anim: 'legR' },
    { key: 'torso', spec: spec(torsoW, torsoH, a.torso ?? 'box', d.color, 3), x: -W / 2, y: torsoTop, anim: 'body' },
    { key: 'head', spec: spec(headW, headH, a.head, shade(d.color, 0.1), 4), x: -headW / 2 + W * 0.06, y: headTop, anim: 'head' },
    { key: 'armF', spec: spec(armW, armH, 'box', shade(d.color, 0.08), 6), x: W / 2 - armW / 2 - 2, y: torsoTop + 2, anim: 'armFront' },
  ];
  const orn = (key: string, w: number, h: number, shape: PartShape, base: string, x: number, y: number, anim: RigPart['anim']): void => {
    parts.push({ key, spec: spec(w, h, shape, base, 7 + parts.length), x, y, anim });
  };
  if (a.fist) {
    // Fists on each arm end (junk blocks, crystal gems, ice blocks); they ride the arm's swing.
    const fw = Math.round(armW * a.fist.scale);
    const fh = Math.max(6, Math.round(armH * (a.fist.shape === 'diamond' ? 0.55 : 0.3)));
    const armB = parts[0];
    const armF = parts[parts.length - 1];
    parts.splice(1, 0, { key: 'fistB', spec: spec(fw, fh, a.fist.shape, a.fist.base, 11), x: armB.x + armW / 2 - fw / 2, y: armB.y + armH - 3, anim: 'armBack', back: true, arm: 'armB' });
    parts.push({ key: 'fistF', spec: spec(fw, fh, a.fist.shape, shade(a.fist.base, 0.1), 12), x: armF.x + armW / 2 - fw / 2, y: armF.y + armH - 3, anim: 'armFront', arm: 'armF', glint: a.style === 'crystal' });
  }
  if (a.style === 'scrap') {
    // A loose plate hanging off the hip.
    parts.splice(parts.length - 2, 0, { key: 'plate', spec: spec(Math.round(W * 0.26), Math.round(H * 0.13), 'box', d.accent, 13), x: W * 0.08, y: torsoTop + torsoH - 6, anim: 'body', dangle: true });
  }
  if (a.ornament === 'stack') {
    // Smokestack on the back shoulder.
    orn('stack', 6, 10, 'box', '#4a5568', -W / 2 + 3, torsoTop - 8, 'body');
  } else if (a.ornament === 'petals') {
    for (let i = 0; i < 3; i++) orn('petal' + i, 6, 8, 'spike', d.accent, -headW / 2 + W * 0.06 + i * (headW / 3), headTop - 6, 'head');
  } else if (a.ornament === 'shards') {
    // Crystal clusters growing out of the back and shoulders, leaning outward; drawn behind the head.
    const cluster: [string, number, number, number, number, number][] = [
      // key, w, h, x, y (bottom-left), tilt
      ['shardL', 13, 30, -W / 2 - 1, torsoTop + 6, -0.5],
      ['shardM', 15, 40, -W * 0.3, torsoTop + 6, -0.18],
      ['shardS', 9, 20, -W * 0.08, torsoTop + 5, 0.12],
      ['shardR', 12, 26, W / 2 - 13, torsoTop + 6, 0.55],
    ];
    const at = parts.findIndex((p) => p.key === 'head');
    cluster.forEach(([key, w, h, x, y, tilt], i) => {
      parts.splice(at + i, 0, { key, spec: spec(w, h, 'spike', i % 2 ? shade(d.accent, -0.12) : d.accent, 20 + i), x, y: y - h, anim: 'body', tilt, glint: i === 1 || i === 3 });
    });
    // A small crown of crystal on the head.
    parts.push({ key: 'crown', spec: spec(6, 9, 'spike', d.accent, 26), x: -3 + W * 0.06, y: headTop - 7, anim: 'head', tilt: 0.15, glint: true });
  } else if (a.ornament === 'horns') {
    // Big ram horns leaning outward, an icicle beard under the visor and icicles on the torso hem.
    const hx = W * 0.06;
    parts.push({ key: 'hornL', spec: spec(10, 24, 'spike', '#9cc0dc', 30), x: hx - headW / 2 - 4, y: headTop - 18, anim: 'head', tilt: -0.6 });
    parts.push({ key: 'hornR', spec: spec(10, 24, 'spike', '#b4d4ec', 31), x: hx + headW / 2 - 6, y: headTop - 18, anim: 'head', tilt: 0.6 });
    const at = parts.findIndex((p) => p.key === 'armF');
    const beard: PartSpec[] = [spec(5, 9, 'drip', '#cfeeff', 32), spec(6, 12, 'drip', '#e6f6ff', 33), spec(5, 8, 'drip', '#cfeeff', 34)];
    beard.forEach((b, i) => parts.splice(at + i, 0, { key: 'beard' + i, spec: b, x: hx - 8 + i * 5, y: headTop + headH - 3, anim: 'head' }));
    for (let i = 0; i < 4; i++) {
      const ih = 6 + ((i * 5) % 4);
      parts.splice(at, 0, { key: 'icicle' + i, spec: spec(4, ih, 'drip', '#cfeeff', 36 + i), x: -W / 2 + 6 + i * (W - 14) / 3, y: torsoTop + torsoH - 3, anim: 'body' });
    }
  }
  return parts;
}

/** Animation state the renderer passes in (all derived from the sim boss). */
export interface BossPose {
  facing: number;
  age: number;
  flash: boolean;
  /** Art px the whole body is lifted (slam wind-up). */
  lift: number;
  /** Art px the front arm reaches forward (charge). */
  reach: number;
  enraged: boolean;
  /** Direction to the player (unit-ish), for the AI's eye. */
  lookX: number;
  lookY: number;
  /** Arms raised overhead for a slam, 0 (hanging) to 1 (straight up). */
  raise?: number;
  /** Health left, 0..1 (the Hollow AI sheds shell plates and cracks as it drops). Default 1. */
  hp?: number;
}

/** How far the arms swing up on a slam: 0 at rest, 1 overhead. Smooth over the warning, held while airborne. Pure. */
export function slamRaise(attack: string | null, at: number, warn: number): number {
  if (attack !== 'slam') return 0;
  if (at >= 0) return 1;
  const p = Math.max(0, Math.min(1, 1 + at / warn));
  return p * p * (3 - 2 * p);
}

/** Swing angle (radians, facing right) of an arm: overhead on a slam (back arm a little behind), a slow sway at rest. Pure. */
export function armAngle(which: 'armBack' | 'armFront', pose: BossPose): number {
  const r = pose.raise ?? 0;
  const sway = Math.sin(pose.age * 3 + (which === 'armBack' ? 1.6 : 0)) * 0.08 * (1 - r);
  return -r * (which === 'armFront' ? 2.7 : 2.4) + sway;
}

/** Loose plate swing (radians): a slow pendulum that jolts when the body lifts. Pure. */
export function plateSwing(pose: BossPose): number {
  return Math.sin(pose.age * 3.2) * 0.3 + Math.min(0.5, pose.lift * 0.06) + (pose.raise ?? 0) * 0.25 * Math.sin(pose.age * 14);
}

/** Per-channel offset in art px for a pose. Pure. */
export function animOffset(anim: RigPart['anim'], pose: BossPose): { dx: number; dy: number } {
  const step = Math.round(Math.sin(pose.age * 6) * 2);
  const bob = Math.round(Math.abs(Math.sin(pose.age * 6)) * 1.5);
  switch (anim) {
    case 'legL':
      return { dx: 0, dy: Math.min(0, step) - pose.lift };
    case 'legR':
      return { dx: 0, dy: Math.min(0, -step) - pose.lift };
    case 'body':
      return { dx: 0, dy: -bob - pose.lift };
    case 'head':
      return { dx: 0, dy: -bob - pose.lift + Math.round(Math.sin(pose.age * 3)) };
    case 'armBack':
      return { dx: -Math.round(step / 2), dy: -bob - pose.lift };
    case 'armFront':
      return { dx: pose.reach + Math.round(step / 2), dy: -bob - pose.lift + (pose.reach > 0 ? -3 : 0) };
    default:
      return { dx: 0, dy: 0 };
  }
}

// ---- Canvas side (cached; DOM only) ----

const cache = new Map<string, HTMLCanvasElement>();

function partCanvas(key: string, spec: PartSpec, tint: 'none' | 'white' | 'back'): HTMLCanvasElement {
  const k = `${key}|${spec.w}x${spec.h}|${spec.base}|${spec.style}|${tint}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = spec.w;
  c.height = spec.h;
  const ctx = c.getContext('2d');
  if (ctx) {
    const px = partPixels(spec);
    for (let i = 0; i < px.length; i++) {
      const col = px[i];
      if (!col) continue;
      ctx.fillStyle = tint === 'white' ? (col === BOSS_OUTLINE ? '#c8d0e0' : '#ffffff') : tint === 'back' && col !== BOSS_OUTLINE ? shade(col, -0.35) : col;
      ctx.fillRect(i % spec.w, Math.floor(i / spec.w), 1, 1);
    }
  }
  cache.set(k, c);
  return c;
}

function blit(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, by: number, ax: number, ay: number, u: number, facing: number): void {
  // ax/ay: part top-left in art px relative to bottom-centre, facing right. Mirror for facing left.
  const x = facing >= 0 ? ax : -ax - img.width;
  ctx.drawImage(img, Math.round(cx + x * u), Math.round(by + ay * u), Math.ceil(img.width * u), Math.ceil(img.height * u));
}

function glowEye(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, u: number, pulse: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25 + 0.2 * pulse;
  ctx.fillStyle = color;
  ctx.fillRect(x - 2 * u, y - 2 * u, w + 4 * u, h + 4 * u);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + Math.floor(w / 3), y, Math.max(u, Math.floor(w / 4)), Math.max(u, Math.floor(h / 2)));
}

/** Draws a part rotated by `ang` about a pivot (px, py in art px); (ox, oy) is the part's top-left relative to the pivot. Mirrors for facing left. */
function swung(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, cx: number, by: number, px: number, py: number, ox: number, oy: number, u: number, facing: number, ang: number): void {
  ctx.save();
  ctx.translate(Math.round(cx + (facing >= 0 ? px : -px) * u), Math.round(by + py * u));
  ctx.rotate(facing >= 0 ? ang : -ang);
  const x = facing >= 0 ? ox : -ox - img.width;
  ctx.drawImage(img, Math.round(x * u), Math.round(oy * u), Math.ceil(img.width * u), Math.ceil(img.height * u));
  ctx.restore();
}

/** Furnace grate in the Colossus chest: three glowing slits that breathe, brighter when enraged or winding up. */
function furnace(ctx: CanvasRenderingContext2D, torso: RigPart, o: { dx: number; dy: number }, cx: number, by: number, u: number, f: number, pose: BossPose): void {
  const gw = Math.round(torso.spec.w * 0.36);
  const gh = 9;
  const gxArt = torso.x + Math.round(torso.spec.w * 0.42) + o.dx;
  const gy = torso.y + Math.round(torso.spec.h * 0.3) + o.dy;
  const gx = f > 0 ? gxArt : -gxArt - gw;
  const heat = Math.min(1, 0.45 + 0.25 * Math.sin(pose.age * 2.5) + (pose.enraged ? 0.3 : 0) + (pose.raise ?? 0) * 0.4);
  ctx.fillStyle = BOSS_OUTLINE;
  ctx.fillRect(Math.round(cx + gx * u), Math.round(by + gy * u), Math.ceil(gw * u), Math.ceil(gh * u));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.18 + 0.3 * heat;
  ctx.fillStyle = pose.enraged ? '#ff4a2a' : '#ff8a2a';
  ctx.fillRect(Math.round(cx + (gx - 3) * u), Math.round(by + (gy - 3) * u), Math.ceil((gw + 6) * u), Math.ceil((gh + 6) * u));
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = heat > 0.8 ? '#ffe08a' : '#ff9a3a';
    ctx.fillRect(Math.round(cx + (gx + 1) * u), Math.round(by + (gy + 1 + i * 3) * u), Math.ceil((gw - 2) * u), Math.ceil(2 * u));
  }
}

/** Draws a walking boss with its bottom-centre at (cx, by); u = screen px per art px. */
export function drawWalkerBoss(ctx: CanvasRenderingContext2D, id: BossId, cx: number, by: number, u: number, pose: BossPose): void {
  const d = BOSSES[id];
  const f = pose.facing >= 0 ? 1 : -1;
  let head: RigPart | undefined;
  let torso: RigPart | undefined;
  const rig = walkerRig(id);
  for (const p of rig) {
    const o = animOffset(p.anim, pose);
    const img = partCanvas(id + p.key, p.spec, pose.flash ? 'white' : p.back ? 'back' : 'none');
    const armKey = p.anim === 'armFront' || p.anim === 'armBack' ? (p.arm ?? p.key) : null;
    const arm = armKey ? rig.find((q) => q.key === armKey) : undefined;
    if (arm && (p.anim === 'armFront' || p.anim === 'armBack')) {
      // Swing around the shoulder (top centre of the arm).
      const px = arm.x + arm.spec.w / 2 + o.dx;
      const py = arm.y + 2 + o.dy;
      swung(ctx, img, cx, by, px, py, p.x - arm.x - arm.spec.w / 2, p.y - arm.y - 2, u, f, armAngle(p.anim, pose));
    } else if (p.dangle) {
      swung(ctx, img, cx, by, p.x + o.dx + 1, p.y + o.dy + 1, -1, -1, u, f, plateSwing(pose));
    } else if (p.tilt) {
      swung(ctx, img, cx, by, p.x + p.spec.w / 2 + o.dx, p.y + p.spec.h + o.dy, -p.spec.w / 2, -p.spec.h, u, f, p.tilt);
    } else blit(ctx, img, cx, by, p.x + o.dx, p.y + o.dy, u, f);
    if (p.glint && !pose.flash) glint(ctx, p, o, cx, by, u, f, pose, arm ? armAngle(p.anim as 'armBack' | 'armFront', pose) : 0);
    if (p.key === 'head') head = p;
    if (p.key === 'torso') torso = p;
  }
  const heart = BOSS_ART[id].heart;
  if (torso && heart && !pose.flash) {
    if (heart === 'furnace') furnace(ctx, torso, animOffset('body', pose), cx, by, u, f, pose);
    else coldHeart(ctx, heart, torso, animOffset('body', pose), cx, by, u, f, pose, d.eye);
  }
  if (head && !pose.flash) {
    // Visor slit with a glowing eye on the facing side.
    const o = animOffset('head', pose);
    const hw = head.spec.w;
    const ey = head.y + o.dy + Math.round(head.spec.h * 0.42);
    const eyeW = Math.max(3, Math.round(hw * 0.3));
    const exArt = head.x + Math.round(hw * 0.55);
    const ex = f > 0 ? exArt : -exArt - eyeW;
    ctx.fillStyle = BOSS_OUTLINE;
    const slitArt = head.x + 2;
    const sx = f > 0 ? slitArt : -slitArt - (hw - 4);
    ctx.fillRect(Math.round(cx + sx * u), Math.round(by + (ey - 1) * u), Math.ceil((hw - 4) * u), Math.ceil(4 * u));
    const pulse = 0.5 + 0.5 * Math.sin(pose.age * (pose.enraged ? 10 : 4));
    glowEye(ctx, Math.round(cx + ex * u), Math.round(by + ey * u), Math.ceil(eyeW * u), Math.ceil(2 * u), pose.enraged ? '#ff3a3a' : d.eye, u, pulse);
  }
  if (head && BOSS_ART[id].style === 'ice' && !pose.flash) frostBreath(ctx, head, cx, by, u, f, pose);
  if (BOSS_ART[id].ornament === 'stack' && !pose.flash) {
    // Smoke puffs from the stack.
    const { w: W, h: H } = bossArtSize(id);
    const top = -(Math.round(H * 0.32) + Math.round(H * 0.5)) + 3 - 8;
    for (let i = 0; i < 3; i++) {
      const t = (pose.age * 0.8 + i / 3) % 1;
      const sxArt = -W / 2 + 6 - t * 4;
      const sx = f > 0 ? sxArt : -sxArt;
      ctx.fillStyle = `rgba(90,90,100,${0.5 * (1 - t)})`;
      const r = (2 + t * 4) * u;
      ctx.fillRect(Math.round(cx + sx * u - r / 2), Math.round(by + (top - 2 - t * 14) * u - r / 2), Math.ceil(r), Math.ceil(r));
    }
  }
}

/** Frost breath: pale puffs drift forward and down out of the Titan's visor. */
function frostBreath(ctx: CanvasRenderingContext2D, head: RigPart, cx: number, by: number, u: number, f: number, pose: BossPose): void {
  const o = animOffset('head', pose);
  const mxArt = head.x + head.spec.w - 2 + o.dx;
  const my = head.y + head.spec.h * 0.75 + o.dy;
  const strong = (pose.raise ?? 0) > 0.5 || pose.enraged;
  for (let i = 0; i < 4; i++) {
    const t = (pose.age * 0.7 + i / 4) % 1;
    const xArt = mxArt + t * 18;
    const x = f > 0 ? xArt : -xArt;
    const r = (2 + t * 5) * u;
    ctx.fillStyle = `rgba(220,244,255,${(strong ? 0.55 : 0.35) * (1 - t)})`;
    ctx.fillRect(Math.round(cx + x * u - r / 2), Math.round(by + (my + t * 6) * u - r / 2), Math.ceil(r), Math.ceil(r));
  }
}

/** Twinkle on a crystal part: a 4-point star that blinks on in turn (phase from the part's seed). */
function glint(ctx: CanvasRenderingContext2D, p: RigPart, o: { dx: number; dy: number }, cx: number, by: number, u: number, f: number, pose: BossPose, ang: number): void {
  const k = Math.sin(pose.age * 2.2 + p.spec.seed * 1.7);
  if (k < 0.55 || ang < -0.5) return;
  const a = (k - 0.55) / 0.45;
  // Near the top third of the part (or its centre for fists), leaning with its tilt.
  const lean = p.tilt ?? 0;
  const ly = p.arm ? p.spec.h / 2 : p.spec.h * 0.3;
  const xArt = p.x + p.spec.w / 2 + o.dx + (p.arm ? 0 : Math.sin(lean) * (p.spec.h - ly));
  const yArt = p.y + o.dy + ly + (p.arm ? 0 : (1 - Math.cos(lean)) * (p.spec.h - ly));
  const x = Math.round(cx + (f > 0 ? xArt : -xArt) * u);
  const y = Math.round(by + yArt * u);
  const arm = Math.max(1, Math.round((1 + a * 2) * u));
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * a;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - arm, y, arm * 2 + Math.ceil(u), Math.ceil(u));
  ctx.fillRect(x, y - arm, Math.ceil(u), arm * 2 + Math.ceil(u));
  ctx.restore();
}

/** Cold heart in the chest: the Golem's geode (a pulsing faceted gem) or the Titan's frost rune (a glowing snowflake cross). */
function coldHeart(ctx: CanvasRenderingContext2D, kind: 'geode' | 'rune', torso: RigPart, o: { dx: number; dy: number }, cx: number, by: number, u: number, f: number, pose: BossPose, eye: string): void {
  const s = Math.round(torso.spec.w * 0.22);
  const gxArt = torso.x + Math.round(torso.spec.w * 0.5) + o.dx;
  const gy = torso.y + Math.round(torso.spec.h * 0.42) + o.dy;
  const gx = Math.round(cx + (f > 0 ? gxArt : -gxArt) * u);
  const y = Math.round(by + gy * u);
  const heat = Math.min(1, 0.45 + 0.25 * Math.sin(pose.age * 2.5) + (pose.enraged ? 0.3 : 0) + (pose.raise ?? 0) * 0.4);
  const col = pose.enraged ? '#ff5a8a' : eye;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.1 + 0.22 * heat;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(gx, y, (s * 0.6 + 2) * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const r = (s / 2) * u;
  if (kind === 'geode') {
    // Dark socket, then a diamond gem with a bright upper facet.
    ctx.fillStyle = BOSS_OUTLINE;
    ctx.beginPath();
    ctx.moveTo(gx, y - r - 2 * u);
    ctx.lineTo(gx + r + 2 * u, y);
    ctx.lineTo(gx, y + r + 2 * u);
    ctx.lineTo(gx - r - 2 * u, y);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(gx, y - r);
    ctx.lineTo(gx + r, y);
    ctx.lineTo(gx, y + r);
    ctx.lineTo(gx - r, y);
    ctx.fill();
    ctx.fillStyle = heat > 0.8 ? '#ffffff' : shade(col, 0.55);
    ctx.beginPath();
    ctx.moveTo(gx, y - r);
    ctx.lineTo(gx + r * 0.5, y - r * 0.5);
    ctx.lineTo(gx, y);
    ctx.lineTo(gx - r * 0.5, y - r * 0.5);
    ctx.fill();
  } else {
    // Six-armed frost rune: a cross and two diagonals, bright centre.
    const t = Math.max(1, Math.round(u * 1.5));
    ctx.fillStyle = col;
    ctx.fillRect(gx - Math.round(r), y - Math.floor(t / 2), Math.round(r * 2), t);
    ctx.fillRect(gx - Math.floor(t / 2), y - Math.round(r), t, Math.round(r * 2));
    for (let i = -2; i <= 2; i++) {
      const d = Math.round((i * r) / 3);
      ctx.fillRect(gx + d - Math.floor(t / 2), y + d - Math.floor(t / 2), t, t);
      ctx.fillRect(gx + d - Math.floor(t / 2), y - d - Math.floor(t / 2), t, t);
    }
    ctx.fillStyle = heat > 0.8 ? '#ffffff' : shade(col, 0.6);
    ctx.fillRect(gx - t, y - t, t * 2, t * 2);
  }
}

/** Segment specs for the Ash Wyrm: a jawed head then shrinking scaled discs. Pure. */
export function wyrmSegments(id: BossId): PartSpec[] {
  const d = BOSSES[id];
  const { h: H } = bossArtSize(id);
  const out: PartSpec[] = [{ w: Math.round(H * 1.4), h: H, shape: 'disc', base: shade(d.color, 0.15), accent: d.accent, style: 'ember', seed: 20 }];
  for (let i = 1; i <= 7; i++) {
    const s = Math.max(6, Math.round(H * (1 - i * 0.08)));
    out.push({ w: s, h: s, shape: 'disc', base: i % 2 ? d.color : shade(d.color, 0.12), accent: d.accent, style: 'ember', seed: 20 + i });
  }
  return out;
}

/** Draws the Ash Wyrm; (cx, cy) is the head centre. */
export function drawWyrmBoss(ctx: CanvasRenderingContext2D, id: BossId, cx: number, cy: number, u: number, pose: BossPose): void {
  const d = BOSSES[id];
  const f = pose.facing >= 0 ? 1 : -1;
  const segs = wyrmSegments(id);
  const tint = pose.flash ? 'white' : 'none';
  for (let i = segs.length - 1; i >= 1; i--) {
    const s = segs[i];
    const img = partCanvas(id + 'seg' + i, s, tint);
    const ox = -f * (segs[0].w * 0.45 + i * s.w * 0.7);
    const oy = Math.sin(pose.age * 5 - i * 0.8) * 5;
    ctx.drawImage(img, Math.round(cx + (ox - s.w / 2) * u), Math.round(cy + (oy - s.h / 2) * u), Math.ceil(s.w * u), Math.ceil(s.h * u));
    if (!pose.flash) {
      // Dorsal fin per segment.
      ctx.fillStyle = d.accent;
      ctx.fillRect(Math.round(cx + (ox - 1) * u), Math.round(cy + (oy - s.h / 2 - 2) * u), Math.ceil(2 * u), Math.ceil(3 * u));
    }
  }
  const hd = segs[0];
  const jaw = Math.max(0, Math.sin(pose.age * 4)) * 3 + (pose.reach > 0 ? 4 : 0);
  const himg = partCanvas(id + 'head', hd, tint);
  ctx.drawImage(himg, Math.round(cx - (hd.w / 2) * u), Math.round(cy - (hd.h / 2 + jaw / 2) * u), Math.ceil(hd.w * u), Math.ceil(hd.h * u));
  if (!pose.flash) {
    // Open maw glow and eye.
    ctx.fillStyle = '#2a0a06';
    const mx = f > 0 ? cx + (hd.w * 0.2) * u : cx - (hd.w * 0.5) * u;
    ctx.fillRect(Math.round(mx), Math.round(cy + (hd.h * 0.1) * u), Math.ceil(hd.w * 0.3 * u), Math.ceil((2 + jaw) * u));
    ctx.fillStyle = '#ff8a3c';
    ctx.fillRect(Math.round(mx), Math.round(cy + (hd.h * 0.1 + 1) * u), Math.ceil(hd.w * 0.3 * u), Math.ceil(Math.max(1, jaw - 1) * u));
    const pulse = 0.5 + 0.5 * Math.sin(pose.age * 6);
    const ex = cx + f * hd.w * 0.18 * u - 2 * u;
    glowEye(ctx, Math.round(ex), Math.round(cy - hd.h * 0.25 * u), Math.ceil(4 * u), Math.ceil(2 * u), pose.enraged ? '#ff3a3a' : d.eye, u, pulse);
  }
}

/** Armour plates around the Hollow AI's core; they break off one by one as it loses health. */
export const SHELL_PLATES = 8;
/** Plate shedding order (scattered round the ring so the shell looks battered, not peeled). */
const SHED_ORDER = [0, 4, 2, 6, 1, 5, 3, 7];

/** Which shell plates are still on at `hp` (0..1 of max health): all at full, none at 0. Pure. */
export function shellPlates(hp: number): boolean[] {
  const n = SHELL_PLATES;
  const intact = Math.max(0, Math.min(n, Math.ceil(hp * n - 1e-9)));
  const shed = n - intact;
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) out.push(SHED_ORDER.indexOf(i) >= shed);
  return out;
}

/** Glowing cracks across the exposed core: none at full health, up to 5 near death. Pure. */
export function coreCracks(hp: number): number {
  return Math.max(0, Math.min(5, Math.floor((1 - Math.max(0, Math.min(1, hp))) * 6)));
}

/** Zigzag path of crack `i` as (radius fraction of the core, angle) points from the rim toward the iris. Pure. */
export function crackPath(i: number): { r: number; a: number }[] {
  const a0 = i * 2.4 + 0.5;
  const out: { r: number; a: number }[] = [];
  for (let j = 0; j < 4; j++) out.push({ r: 0.96 - j * 0.15, a: a0 + (j % 2 === 0 ? 0 : (i % 2 === 0 ? 0.14 : -0.14)) });
  return out;
}
/** The Hollow AI's battered shell: armour plates round the core (shed with damage, exposing glowing seams) and cracks. */
function drawCoreShell(ctx: CanvasRenderingContext2D, id: BossId, cx: number, cy: number, H: number, u: number, pose: BossPose): void {
  const d = BOSSES[id];
  const hp = pose.hp ?? 1;
  const R = (H / 2) * u;
  if (!pose.flash) {
    // Cracks across the core, glowing in the accent colour.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = d.accent;
    ctx.lineCap = 'round';
    for (let i = 0; i < coreCracks(hp); i++) {
      const pts = crackPath(i);
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(pose.age * 5 + i);
      ctx.lineWidth = Math.max(1, u * 1.6);
      ctx.beginPath();
      for (const [j, p] of pts.entries()) {
        const x = cx + Math.cos(p.a) * p.r * R;
        const y = cy + Math.sin(p.a) * p.r * R;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  const plates = shellPlates(hp);
  const n = plates.length;
  const rot = -pose.age * 0.25;
  const gap = 0.07;
  const r0 = R * 0.8;
  const r1 = R * 1.12;
  const plate = pose.flash ? '#ffffff' : shade(d.color, 0.32);
  const edge = pose.flash ? '#ffffff' : shade(d.color, 0.55);
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2 + gap;
    const a1 = rot + ((i + 1) / n) * Math.PI * 2 - gap;
    if (!plates[i]) {
      // Shed plate: a raw seam glows where it was bolted on.
      if (pose.flash) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(pose.age * 4 + i * 1.7);
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = Math.max(1, u * 2);
      ctx.beginPath();
      ctx.arc(cx, cy, r0, a0, a1);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.fillStyle = BOSS_OUTLINE;
    ctx.beginPath();
    ctx.arc(cx, cy, r1 + u, a0 - 0.02, a1 + 0.02);
    ctx.arc(cx, cy, r0 - u, a1 + 0.02, a0 - 0.02, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, a0, a1);
    ctx.arc(cx, cy, r0, a1, a0, true);
    ctx.closePath();
    ctx.fill();
    // Lit outer lip and a rivet light in the middle of the plate (red when enraged).
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, u);
    ctx.beginPath();
    ctx.arc(cx, cy, r1 - u * 0.5, a0, a1);
    ctx.stroke();
    if (!pose.flash) {
      const am = (a0 + a1) / 2;
      const rm = (r0 + r1) / 2;
      ctx.fillStyle = pose.enraged ? '#ff3a6a' : d.accent;
      ctx.fillRect(Math.round(cx + Math.cos(am) * rm - u), Math.round(cy + Math.sin(am) * rm - u), Math.ceil(2 * u), Math.ceil(2 * u));
    }
  }
}

/** The Hollow AI: an armoured core disc in a battered plate shell, orbiting shard plates and a tracking eye. (cx, cy) centre. */
export function drawCoreBoss(ctx: CanvasRenderingContext2D, id: BossId, cx: number, cy: number, u: number, pose: BossPose): void {
  const d = BOSSES[id];
  const { h: H } = bossArtSize(id);
  const core: PartSpec = { w: H, h: H, shape: 'disc', base: d.color, accent: d.accent, style: 'core', seed: 40 };
  const shard: PartSpec = { w: 14, h: 22, shape: 'diamond', base: shade(d.color, 0.2), accent: d.accent, style: 'core', seed: 41 };
  const tint = pose.flash ? 'white' : 'none';
  const n = 6;
  const R = H * 0.68;
  const spin = pose.age * (pose.enraged ? 1.6 : 0.8);
  const shardImg = partCanvas(id + 'shard', shard, tint);
  const drawShard = (i: number): void => {
    const a = spin + (i / n) * Math.PI * 2;
    const sx = cx + Math.cos(a) * R * u;
    const sy = cy + Math.sin(a) * R * 0.55 * u;
    ctx.drawImage(shardImg, Math.round(sx - (shard.w / 2) * u), Math.round(sy - (shard.h / 2) * u), Math.ceil(shard.w * u), Math.ceil(shard.h * u));
  };
  // Back half of the ring first, then the core, then the front half.
  for (let i = 0; i < n; i++) if (Math.sin(spin + (i / n) * Math.PI * 2) < 0) drawShard(i);
  if (!pose.flash) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.08 + 0.05 * Math.sin(pose.age * 3);
    ctx.fillStyle = d.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, H * 0.75 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const cimg = partCanvas(id + 'core', core, tint);
  ctx.drawImage(cimg, Math.round(cx - (H / 2) * u), Math.round(cy - (H / 2) * u), Math.ceil(H * u), Math.ceil(H * u));
  drawCoreShell(ctx, id, cx, cy, H, u, pose);
  if (!pose.flash) {
    // Iris ring and a pupil that tracks the player.
    const ir = H * 0.24;
    ctx.fillStyle = BOSS_OUTLINE;
    ctx.beginPath();
    ctx.arc(cx, cy, (ir + 2) * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pose.enraged ? '#ff3a6a' : d.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, ir * u, 0, Math.PI * 2);
    ctx.fill();
    const len = Math.hypot(pose.lookX, pose.lookY) || 1;
    const px = cx + (pose.lookX / len) * ir * 0.45 * u;
    const py = cy + (pose.lookY / len) * ir * 0.45 * u;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, ir * 0.42 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BOSS_OUTLINE;
    ctx.fillRect(Math.round(px - u), Math.round(py - ir * 0.3 * u), Math.ceil(2 * u), Math.ceil(ir * 0.6 * u));
  }
  for (let i = 0; i < n; i++) if (Math.sin(spin + (i / n) * Math.PI * 2) >= 0) drawShard(i);
}

/** Draws any boss. For walkers (x, y) is the bottom-centre; flyers are centred h/2 above y. */
export function drawBossArt(ctx: CanvasRenderingContext2D, id: BossId, x: number, y: number, u: number, pose: BossPose): void {
  const style = BOSS_ART[id].style;
  const { h: H } = bossArtSize(id);
  if (style === 'core') drawCoreBoss(ctx, id, x, y - (H / 2) * u, u, pose);
  else if (BOSSES[id].flying) drawWyrmBoss(ctx, id, x, y - (H / 2) * u, u, pose);
  else drawWalkerBoss(ctx, id, x, y, u, pose);
}

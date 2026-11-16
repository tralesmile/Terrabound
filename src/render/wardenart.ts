/**
 * Logic Warden art (render only): a floating circuit monolith. Chamfered slab with bevelled edges,
 * green circuit traces with data pulses running along them, a visor slot whose eye slides toward the
 * player, a blinking antenna, and four logic nodes riding a square orbit around it. Phase 2 turns
 * the eye red and spins the nodes faster. Geometry helpers are pure and unit-tested.
 */
import { hash2 } from '../sim/rng';
import { BOSSES, type BossId } from '../sim/bosses';
import { BOSS_OUTLINE, shade, type BossPose } from './bossart';

/** Slab size in art px. */
export const SLAB_W = 30;
export const SLAB_H = 38;

/** A point on the perimeter of a square of half size R, s in [0, 1) going clockwise from the top-left. Pure. */
export function squarePath(s: number, R: number): { x: number; y: number } {
  const t = (((s % 1) + 1) % 1) * 4;
  const side = Math.floor(t);
  const k = t - side;
  if (side === 0) return { x: -R + 2 * R * k, y: -R };
  if (side === 1) return { x: R, y: -R + 2 * R * k };
  if (side === 2) return { x: R - 2 * R * k, y: R };
  return { x: -R, y: R - 2 * R * k };
}

/** Orbit positions of the four logic nodes (art px from the slab centre). Pure. */
export function nodePositions(age: number, enraged: boolean): { x: number; y: number }[] {
  const s = age * (enraged ? 0.32 : 0.16);
  return [0, 1, 2, 3].map((i) => squarePath(s + i / 4, SLAB_W * 0.85));
}

/** Circuit traces on the slab: polylines of art px (relative to its top-left), deterministic. Pure. */
export function slabTraces(): { x: number; y: number }[][] {
  const out: { x: number; y: number }[][] = [];
  for (let i = 0; i < 6; i++) {
    let x = 4 + Math.floor(hash2(i, 1, 77) * (SLAB_W - 8));
    let y = 12 + Math.floor(hash2(i, 2, 77) * 6);
    const pts = [{ x, y }];
    for (let s = 0; s < 4; s++) {
      if (s % 2 === 0) y = Math.min(SLAB_H - 4, y + 4 + Math.floor(hash2(i, s + 3, 77) * 7));
      else x = Math.max(3, Math.min(SLAB_W - 4, x + (hash2(i, s + 9, 77) > 0.5 ? 1 : -1) * (3 + Math.floor(hash2(i, s + 5, 77) * 6))));
      pts.push({ x, y });
    }
    out.push(pts);
  }
  return out;
}

/** Where along the visor the eye sits: -1 (far left) .. 1 (far right), following the player. Pure. */
export function visorEye(lookX: number): number {
  return Math.max(-1, Math.min(1, lookX / 8));
}

const TRACES = slabTraces();

export function drawWardenBoss(ctx: CanvasRenderingContext2D, id: BossId, cx: number, cy: number, u: number, pose: BossPose): void {
  const d = BOSSES[id];
  const white = pose.flash;
  const W = SLAB_W;
  const H = SLAB_H;
  const bob = Math.round(Math.sin(pose.age * 2.2) * 1.5);
  const x0 = cx - (W / 2) * u;
  const y0 = cy - (H / 2) * u + bob * u;
  const R = (x: number, y: number, w: number, h: number, col: string): void => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x0 + x * u), Math.round(y0 + y * u), Math.ceil(w * u), Math.ceil(h * u));
  };
  const eyeCol = pose.enraged ? '#ff3a4a' : d.eye;
  // Soft field glow.
  if (!white) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 + 0.05 * Math.sin(pose.age * 3);
    ctx.fillStyle = d.accent;
    ctx.beginPath();
    ctx.arc(cx, cy + bob * u, W * 0.9 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const nodes = nodePositions(pose.age, pose.enraged);
  // Tether lines from the slab to each node (behind the slab).
  if (!white) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = d.accent;
    ctx.lineWidth = Math.max(1, u);
    for (const n of nodes) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + bob * u);
      ctx.lineTo(cx + n.x * u, cy + n.y * u);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Antenna with a blinking tip.
  R(W / 2 - 1, -7, 2, 7, white ? '#ffffff' : shade(d.color, 0.2));
  R(W / 2 - 2, -9, 4, 3, white ? '#ffffff' : Math.floor(pose.age * 3) % 2 ? eyeCol : shade(d.accent, -0.3));
  // Slab: outline, body, bevels, chamfered corners.
  R(-1, -1, W + 2, H + 2, BOSS_OUTLINE);
  R(0, 0, W, H, white ? '#ffffff' : d.color);
  if (!white) {
    R(0, 0, W, 2, shade(d.color, 0.35));
    R(0, 0, 2, H, shade(d.color, 0.22));
    R(0, H - 2, W, 2, shade(d.color, -0.35));
    R(W - 2, 0, 2, H, shade(d.color, -0.25));
    // Shoulder plates.
    R(-4, 6, 4, 12, BOSS_OUTLINE);
    R(-3, 7, 2, 10, shade(d.color, 0.15));
    R(W, 6, 4, 12, BOSS_OUTLINE);
    R(W + 1, 7, 2, 10, shade(d.color, -0.1));
  }
  for (const [x, y] of [[0, 0], [W - 2, 0], [0, H - 2], [W - 2, H - 2]]) R(x, y, 2, 2, BOSS_OUTLINE);
  if (!white) {
    // Circuit traces (dim) with a bright data pulse riding each.
    const dim = shade(d.accent, -0.45);
    TRACES.forEach((pts, i) => {
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k];
        const b = pts[k + 1];
        R(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x) + 1, Math.abs(b.y - a.y) + 1, dim);
      }
      const end = pts[pts.length - 1];
      R(end.x - 1, end.y - 1, 3, 3, shade(d.accent, -0.2));
      // Pulse position along the polyline.
      const lens = pts.slice(1).map((p, k) => Math.abs(p.x - pts[k].x) + Math.abs(p.y - pts[k].y));
      const total = lens.reduce((s, l) => s + l, 0) || 1;
      let at = ((pose.age * (pose.enraged ? 30 : 16) + i * 7) % (total + 10)) - 5;
      if (at < 0 || at > total) return;
      for (let k = 0; k < lens.length; k++) {
        if (at <= lens[k]) {
          const a = pts[k];
          const b = pts[k + 1];
          const f = lens[k] ? at / lens[k] : 0;
          R(Math.round(a.x + (b.x - a.x) * f), Math.round(a.y + (b.y - a.y) * f), 1, 1, d.accent);
          break;
        }
        at -= lens[k];
      }
    });
    // Visor slot with the sliding eye and a scanline glint.
    const vy = 5;
    R(3, vy, W - 6, 6, BOSS_OUTLINE);
    const ex = Math.round(W / 2 - 4 + visorEye(pose.lookX) * (W / 2 - 9));
    R(ex - 2, vy + 1, 12, 4, shade(eyeCol, -0.5));
    R(ex, vy + 1, 8, 4, eyeCol);
    R(ex + 1, vy + 2, 3, 1, '#ffffff');
    // Core grille under the visor.
    for (let k = 0; k < 3; k++) R(W / 2 - 5, 14 + k * 3, 10, 1, shade(d.color, -0.4));
  }
  // Logic nodes on their square orbit.
  for (const [i, n] of nodes.entries()) {
    const nx = cx + n.x * u;
    const ny = cy + n.y * u;
    const s = 7;
    ctx.fillStyle = BOSS_OUTLINE;
    ctx.fillRect(Math.round(nx - (s / 2 + 1) * u), Math.round(ny - (s / 2 + 1) * u), Math.ceil((s + 2) * u), Math.ceil((s + 2) * u));
    ctx.fillStyle = white ? '#ffffff' : shade(d.color, 0.18);
    ctx.fillRect(Math.round(nx - (s / 2) * u), Math.round(ny - (s / 2) * u), Math.ceil(s * u), Math.ceil(s * u));
    if (!white) {
      ctx.fillStyle = Math.floor(pose.age * 4 + i) % 4 === 0 ? '#ffffff' : d.accent;
      ctx.fillRect(Math.round(nx - 1.5 * u), Math.round(ny - 1.5 * u), Math.ceil(3 * u), Math.ceil(3 * u));
    }
  }
}

/** Zipline art (render only): anchor posts, sagging cables with travelling lights, the rider's trolley. */

const LIGHT = '#5ae0d0';

/** How far above an anchor's tile centre its cable is strung, in tiles: just over a rider's head. */
export const ZIP_LIFT = 1.5;

/** The pole from a linked anchor up to its cable, with a lit cap. */
export function drawMast(ctx: CanvasRenderingContext2D, x: number, topY: number, ts: number): void {
  const w = Math.max(2, Math.round(ts * 0.14));
  const h = ts * ZIP_LIFT;
  ctx.fillStyle = '#151b26';
  ctx.fillRect(Math.round(x - w / 2 - 1), topY, w + 2, h);
  ctx.fillStyle = '#6a7a94';
  ctx.fillRect(Math.round(x - w / 2), topY, w, h);
  ctx.fillStyle = LIGHT;
  ctx.fillRect(Math.round(x - w), topY - w, w * 2, w * 2);
}

/** Anchor: a foot plate, a mast and a pulley wheel with a lit hub at the tile centre. */
export function drawAnchor(ctx: CanvasRenderingContext2D, dx: number, dy: number, ts: number): void {
  const r = (x: number, y: number, w: number, h: number, c: string): void => {
    ctx.fillStyle = c;
    ctx.fillRect(dx + ts * x, dy + ts * y, Math.ceil(ts * w), Math.ceil(ts * h));
  };
  r(0.18, 0.86, 0.64, 0.14, '#222a38');
  r(0.22, 0.86, 0.56, 0.05, '#8fa2bc');
  r(0.43, 0.5, 0.14, 0.36, '#3a4658');
  r(0.43, 0.5, 0.05, 0.36, '#8fa2bc');
  r(0.3, 0.3, 0.4, 0.4, '#151b26');
  r(0.34, 0.34, 0.32, 0.32, '#8fa2bc');
  r(0.42, 0.42, 0.16, 0.16, LIGHT);
}

/** Point on a cable at k in [0,1], sagging a little in the middle (less the steeper it runs). */
export function cablePoint(ax: number, ay: number, bx: number, by: number, k: number, ts: number): { x: number; y: number } {
  const flat = Math.abs(bx - ax) / Math.max(1, Math.hypot(bx - ax, by - ay));
  return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k + Math.sin(Math.PI * k) * ts * 0.35 * flat };
}

/** A cable between two screen points, with lights running up it (the way home). `sag` is off while ridden. */
export function drawCable(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, ts: number, time: number, taut: boolean): void {
  // Order the ends so the lights travel from the lower anchor to the higher one.
  const [lx, ly, hx, hy] = ay >= by ? [ax, ay, bx, by] : [bx, by, ax, ay];
  const at = (k: number): { x: number; y: number } => (taut ? { x: lx + (hx - lx) * k, y: ly + (hy - ly) * k } : cablePoint(lx, ly, hx, hy, k, ts));
  const segs = Math.max(8, Math.ceil(Math.hypot(hx - lx, hy - ly) / ts));
  const stroke = (w: number, c: string): void => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const p = at(i / segs);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  };
  stroke(Math.max(2, ts * 0.16), 'rgba(10,14,22,0.85)');
  stroke(Math.max(1, ts * 0.07), '#b8c8e0');
  const total = Math.hypot(hx - lx, hy - ly) / ts;
  const beads = Math.max(1, Math.floor(total / 4));
  const d = Math.max(2, Math.round(ts * 0.18));
  ctx.fillStyle = LIGHT;
  for (let i = 0; i < beads; i++) {
    const p = at(((time * 3) / Math.max(1, total) + i / beads) % 1);
    ctx.fillRect(Math.round(p.x - d / 2), Math.round(p.y - d / 2), d, d);
  }
}

/** The handle the rider hangs from: a wheel on the cable and a strap down to the hands. */
export function drawTrolley(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, time: number): void {
  const u = Math.max(1, ts * 0.1);
  ctx.fillStyle = '#151b26';
  ctx.fillRect(x - u * 2, y - u * 2, u * 4, u * 4);
  ctx.fillStyle = Math.floor(time * 20) % 2 ? '#ffd23a' : LIGHT;
  ctx.fillRect(x - u, y - u, u * 2, u * 2);
  ctx.fillStyle = '#8fa2bc';
  ctx.fillRect(x - u / 2, y + u * 2, u, ts * 0.3);
}

/** A small bobbing key cap over an anchor that offers a ride. */
export function drawZipPrompt(ctx: CanvasRenderingContext2D, x: number, y: number, ts: number, label: string, time: number): void {
  const px = Math.max(10, Math.round(ts * 0.55));
  ctx.font = `bold ${px}px monospace`;
  const w = ctx.measureText(label).width + px;
  const top = y - ts * 2.2 + Math.sin(time * 4) * ts * 0.08;
  ctx.fillStyle = 'rgba(10,14,22,0.85)';
  ctx.fillRect(x - w / 2, top, w, px * 1.5);
  ctx.strokeStyle = LIGHT;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, top, w, px * 1.5);
  ctx.fillStyle = '#e8fffb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, top + px * 0.8);
  ctx.textBaseline = 'alphabetic';
}

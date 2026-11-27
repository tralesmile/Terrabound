/** The aim-assist reticle: four corner brackets that breathe around the locked target. */
export function drawLock(ctx: CanvasRenderingContext2D, cx: number, cy: number, ts: number, px: number, time: number): void {
  const r = ts * (0.52 + 0.05 * Math.sin(time * 14));
  const arm = ts * 0.24;
  const w = Math.max(2, Math.round(px));
  // A dark under-stroke keeps it readable over lit rock and sky alike.
  for (const [colour, off] of [['rgba(8,6,12,0.85)', w / 2], ['#ffb347', 0]] as const) {
    ctx.fillStyle = colour;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = Math.round(cx + sx * r + off);
        const y = Math.round(cy + sy * r + off);
        ctx.fillRect(sx < 0 ? x : x - arm, sy < 0 ? y : y - w, arm, w);
        ctx.fillRect(sx < 0 ? x : x - w, sy < 0 ? y : y - arm, w, arm);
      }
    }
  }
}

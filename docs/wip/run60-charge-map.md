# WIP run 60: field garages on the map (apply, gate, then delete this file and branch)

Run 60 had no working shell (every Bash call got a classifier error), so this slice is drafted but never built or tested.
BACKLOG item: P1.9 follow-up "show the field garage on the map as a charge point". New test: `tests/chargemap.test.ts` (on this branch).

## src/sim/garage.ts: insert before `/** Battery after charging for `dt` seconds in a bay`

```ts
/** Minimal world view for charge-point lookups: placed tiles (index -> tile), width and pad column. */
export interface ChargeWorld {
  readonly w: number;
  readonly padX: number;
  readonly edits: ReadonlyMap<number, number>;
}

/**
 * Field garages (charge points) for the map: every placed garage bay more than `padReach` columns from the pad
 * (bays at the pad add nothing, the pad charges anyway). Sorted by column so the map draws them stably.
 */
export function chargePoints(world: ChargeWorld, garageTile: number, padReach: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const [i, t] of world.edits) {
    if (t !== garageTile) continue;
    const x = i % world.w;
    if (Math.abs(x + 0.5 - (world.padX + 0.5)) <= padReach) continue;
    out.push({ x, y: Math.floor(i / world.w) });
  }
  return out.sort((a, b) => a.x - b.x || a.y - b.y);
}
```

## src/ui/map.ts

1. Imports after `TILE_COLORS`: `import { chargePoints } from '../sim/garage';` and `import { PAD_HALF } from '../sim/world';`
2. Before `const LEGEND`: 

```ts
export const CHARGE_PIN = '#5cff7a';

/** A charge-point pin: dark disc, green ring that breathes, white-green lightning bolt. */
function drawBoltPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number): void {
  ctx.fillStyle = 'rgba(10,24,14,0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CHARGE_PIN;
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(time * 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = CHARGE_PIN; // stem down to the bay
  ctx.fillRect(cx - Math.max(0.5, r * 0.08), cy + r, Math.max(1, r * 0.16), r * 0.6);
  ctx.fillStyle = '#d8ffe0'; // bolt
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.15, cy - r * 0.7);
  ctx.lineTo(cx - r * 0.4, cy + r * 0.1);
  ctx.lineTo(cx - r * 0.02, cy + r * 0.1);
  ctx.lineTo(cx - r * 0.15, cy + r * 0.7);
  ctx.lineTo(cx + r * 0.4, cy - r * 0.1);
  ctx.lineTo(cx + r * 0.02, cy - r * 0.1);
  ctx.closePath();
  ctx.fill();
}
```

3. LEGEND: add `['Charge bay', CHARGE_PIN],` after `['Pad', ...]`.
4. MapView fields after `chests`: `private charge: { x: number; y: number }[] = []; private chargeVer = -1; chargeShown = 0;` (chargeShown is read by e2e).
5. In `draw`, after the chest pins loop, before `// Biome names along the top.`:

```ts
    // Field garages: green bolt pins, so deep trips can be planned around charge points.
    if (this.chargeVer !== world.version) {
      this.charge = chargePoints(world, T.GARAGE, PAD_HALF + 2);
      this.chargeVer = world.version;
    }
    this.chargeShown = 0;
    const br = Math.max(5, u * 0.5);
    for (const c of this.charge) {
      const bx = toX(c.x + 0.5);
      const by = toY(c.y - 1.5) - br;
      if (bx < x - br || bx > x + w + br || by < y - br * 2 || by > y + h + br) continue;
      drawBoltPin(ctx, bx, by, br, time);
      this.chargeShown++;
    }
```

## e2e/smoke.mjs: after the check 'a full battery under the bay shows a steady green lamp instead of the arc'

```js
    // The map marks the field garage as a charge point (green bolt pin over the bay).
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(300);
    const pin = await page.evaluate(() => ({ open: window.__terrabound.ui.mapOpen, shown: window.__terrabound.ui.mapView.chargeShown }));
    await page.screenshot({ path: path.join(out, '13e-map-charge.png') });
    check('the map shows a green bolt pin on the field garage', pin.open && pin.shown >= 1, JSON.stringify(pin));
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(200);
```

Then look at e2e/out/13e-map-charge.png, tick the BACKLOG line (P1.9 follow-ups: map part), and ship.

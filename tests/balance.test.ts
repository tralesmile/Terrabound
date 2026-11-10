import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';

/**
 * Simple simulated player for the Scrap layer: sink a shaft straight down, grab ore within reach,
 * stop when the pack is full or the battery is at 35%, then "return" to the pad and bank.
 * It is deliberately dumb: it is a floor on the economy, not a ceiling.
 */
function botDive(g: Game): { gained: number; died: boolean; depth: number } {
  const runsBefore = g.runs;
  const start = g.derived;
  let t = 0;
  let leftPad = false;
  while (t < 600) {
    t += FIXED_DT;
    const b = g.body;
    const bx = Math.floor(b.x);
    const by = Math.floor(b.y);
    // Step off the unbreakable pad first, then dig down.
    if (!leftPad && Math.abs(b.x - (g.world.padX + 0.5)) < 10.5) {
      g.step(FIXED_DT, { ...NO_CONTROLS, moveX: 1, jump: Math.floor(t * 4) % 2 === 0 });
      continue;
    }
    leftPad = true;
    let aim: { tx: number; ty: number } | null = null;
    // Prefer ore in reach, else the tile under the feet, else the one beside it.
    let best = Infinity;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -4; dy <= 2; dy++) {
        const tile = g.world.get(bx + dx, by + dy);
        if (tile === T.IRON || tile === T.COPPER) {
          const d = Math.hypot(dx, dy);
          if (d < best) {
            best = d;
            aim = { tx: bx + dx, ty: by + dy };
          }
        }
      }
    }
    if (!aim) aim = g.world.isSolid(bx, by) ? { tx: bx, ty: by } : { tx: bx, ty: by + 1 };
    const c: Controls = { ...NO_CONTROLS, dig: true, aim, moveX: Math.max(-1, Math.min(1, (bx + 0.5 - b.x) * 6)) };
    g.step(FIXED_DT, c);
    if (g.runs !== runsBefore) return { gained: 0, died: true, depth: 0 };
    if (g.battery < start.maxBattery * 0.35) break;
    if (Object.values(g.carried).reduce((a, n) => a + (n ?? 0), 0) >= start.packCap) break;
  }
  const depth = g.runDeepest;
  const before = (g.stash.iron_scrap ?? 0) + (g.stash.rust ?? 0) + (g.stash.metal ?? 0) + (g.stash.copper_wire ?? 0);
  // Return trip is abstracted: teleport onto the pad and bank.
  g.body.x = g.world.padX + 0.5;
  g.body.y = g.world.padY;
  g.body.vx = g.body.vy = 0;
  g.step(FIXED_DT, NO_CONTROLS);
  const after = (g.stash.iron_scrap ?? 0) + (g.stash.rust ?? 0) + (g.stash.metal ?? 0) + (g.stash.copper_wire ?? 0);
  return { gained: after - before, died: false, depth };
}

describe('Scrap layer balance (simulated player)', () => {
  it('a dumb bot earns a first upgrade within four dives on most seeds and rarely dies', () => {
    let affordable = 0;
    let deaths = 0;
    let dives = 0;
    let iron = 0;
    let depthSum = 0;
    const seeds = 24;
    for (let seed = 1; seed <= seeds; seed++) {
      const s = defaultSave();
      s.seedBase = seed * 7919;
      const g = new Game(s);
      for (let i = 0; i < 4; i++) {
        const r = botDive(g);
        dives++;
        depthSum += r.depth;
        if (r.died) deaths++;
      }
      iron += g.stash.iron_scrap ?? 0;
      if (g.affordableUpgrades().length > 0) affordable++;
    }
    process.stdout.write(`balance: affordable ${affordable}/${seeds}, deaths ${deaths}/${dives}, mean iron/seed ${(iron / seeds).toFixed(1)}, mean depth ${(depthSum / dives).toFixed(1)}\n`);
    expect(affordable).toBeGreaterThanOrEqual(Math.ceil(seeds * 0.5));
    expect(deaths / dives).toBeLessThan(0.25);
    // Long simulation (~4-5 s alone, slower under the parallel gate); vitest's 5 s default made it flaky.
  }, 30_000);
});

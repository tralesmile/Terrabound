import { describe, expect, it } from 'vitest';
import { DRILL_TIER, canDrill, drillNeeded } from '../src/sim/drilltier';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { LAYERS } from '../src/sim/layers';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { UPGRADES } from '../src/sim/upgrades';
import { tileTip } from '../src/ui/tiletip';

describe('dig-power tiers', () => {
  it('gates only ores, deeper layers need more, and every tier is reachable', () => {
    expect(drillNeeded(T.RUST)).toBe(0);
    expect(drillNeeded(T.IRON)).toBe(0);
    expect(drillNeeded(T.CIRCUIT_ORE)).toBeLessThan(drillNeeded(T.PLASMA_ORE));
    expect(drillNeeded(T.PLASMA_ORE)).toBeLessThan(drillNeeded(T.CORE_ORE));
    const maxPick = UPGRADES.find((u) => u.id === 'pick')!.maxLevel;
    for (const lv of Object.values(DRILL_TIER)) expect(lv!).toBeLessThanOrEqual(maxPick);
  });

  it("never gates a layer's own rock, so every layer can be dug through", () => {
    for (const l of LAYERS) expect(drillNeeded(l.rock)).toBe(0);
  });

  it('canDrill compares the drill level to the tier', () => {
    expect(canDrill(T.CORE_ORE, 2)).toBe(false);
    expect(canDrill(T.CORE_ORE, 3)).toBe(true);
    expect(canDrill(T.RUST, 0)).toBe(true);
  });

  it('a too-weak drill makes no progress and says which level it needs; the right level digs it', () => {
    const run = (pick: number) => {
      const s = defaultSave();
      s.upgrades = pick ? { pick } : {};
      const g = new Game(s);
      g.body.y = g.world.padY + 10;
      const tx = Math.floor(g.body.x) + 1;
      const ty = Math.floor(g.body.y) - 1;
      g.world.set(tx, ty, T.CORE_ORE);
      g.drainEvents();
      for (let i = 0; i < Math.round(8 / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, dig: true, aim: { tx, ty } });
      return { tile: g.world.get(tx, ty), ev: g.drainEvents() };
    };
    const weak = run(0);
    expect(weak.tile).toBe(T.CORE_ORE);
    const asks = weak.ev.filter((e) => e.t === 'toohard');
    expect(asks.length).toBeGreaterThanOrEqual(1);
    expect(asks.length).toBeLessThanOrEqual(9); // rate-limited, about once a second
    expect(asks[0].t === 'toohard' ? asks[0].need : 0).toBe(3);
    const strong = run(3);
    expect(strong.tile).not.toBe(T.CORE_ORE);
  });

  it('the tile tip shows the needed level instead of a dig time when the drill is too weak', () => {
    const weak = tileTip(T.CORE_ORE, 1, 0)!;
    expect(weak.lines.join(' ')).toContain('Needs Drill bit Lv 3');
    expect(weak.lines.join(' ')).not.toContain('Dig ');
    const ok = tileTip(T.CORE_ORE, 1, 3)!;
    expect(ok.lines.join(' ')).toContain('Dig ');
    // Without a level (old callers) the tip still shows the dig time.
    expect(tileTip(T.CORE_ORE, 1)!.lines.join(' ')).toContain('Dig ');
  });
});

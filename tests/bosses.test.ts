import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { ATTACK_TIME, BOSSES, BOSS_IDS, makeBoss, phase, stepBoss } from '../src/sim/bosses';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { GEAR } from '../src/sim/gear';
import { RECIPES } from '../src/sim/recipes';
import { T } from '../src/sim/tiles';
import { mulberry32 } from '../src/sim/rng';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};

/** Put the player on a flat open arena in the boss's biome. */
function arena(g: Game, biome: number): { x: number; y: number } {
  const w = g.world;
  let x0 = -1;
  for (let x = 60; x < w.w - 60 && x0 < 0; x++) if (w.biome[x] === biome && w.biome[x + 40] === biome && Math.abs(x - w.padX) > 80) x0 = x + 20;
  const y = w.surface[x0];
  for (let x = x0 - 40; x <= x0 + 40; x++) {
    for (let yy = y - 14; yy < y; yy++) w.set(x, yy, T.AIR);
    w.set(x, y, T.RUST);
    w.set(x, y + 1, T.RUST);
  }
  g.body.x = x0 + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  return { x: x0, y };
}

describe('boss table', () => {
  it('five bosses, one per biome, each with a beacon recipe and a boss-only trophy', () => {
    expect(BOSS_IDS.length).toBe(5);
    expect(new Set(BOSS_IDS.map((b) => BOSSES[b].biome)).size).toBe(5);
    for (const id of BOSS_IDS) {
      const d = BOSSES[id];
      expect(RECIPES.some((r) => r.out === d.beacon)).toBe(true);
      expect(GEAR[d.gear].bossOnly).toBe(true);
      for (const a of d.attacks) expect(ATTACK_TIME[a].warn).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('boss AI is deterministic and switches to phase 2 at half health', () => {
    const w = new Game(defaultSave()).world;
    const a = makeBoss('colossus', 300, 40);
    const b = makeBoss('colossus', 300, 40);
    const ra = mulberry32(5);
    const rb = mulberry32(5);
    for (let i = 0; i < 600; i++) {
      stepBoss(a, w, FIXED_DT, 310, 40, ra);
      stepBoss(b, w, FIXED_DT, 310, 40, rb);
    }
    expect(a).toEqual(b);
    expect(phase(a)).toBe(1);
    a.hp = BOSSES.colossus.hp / 2;
    expect(phase(a)).toBe(2);
  });
});

describe('boss fights', () => {
  it('a beacon only works in its own biome, away from the pad', () => {
    const g = new Game(defaultSave());
    g.carried = { beacon_colossus: 1 };
    expect(g.useItem('beacon_colossus')).toBe(false); // at the pad
    arena(g, BOSSES.titan.biome);
    expect(g.useItem('beacon_colossus')).toBe(false); // wrong biome
    expect(g.carried.beacon_colossus).toBe(1);
    arena(g, BOSSES.colossus.biome);
    expect(g.useItem('beacon_colossus')).toBe(true);
    expect(g.boss?.id).toBe('colossus');
    expect(g.carried.beacon_colossus ?? 0).toBe(0);
  });

  it('every boss attacks within a few seconds and can hurt the player', () => {
    for (const id of BOSS_IDS) {
      const g = new Game(defaultSave());
      arena(g, BOSSES[id].biome);
      g.carried = { [BOSSES[id].beacon]: 1 };
      g.useItem(BOSSES[id].beacon);
      const warned = new Set<string>();
      let hurt = 0;
      for (let i = 0; i < 60 * 10 && g.boss; i++) {
        g.step(FIXED_DT, NO_CONTROLS);
        for (const e of g.drainEvents()) {
          if (e.t === 'bosswarn') warned.add(e.kind);
          if (e.t === 'hurt') hurt++;
        }
      }
      expect(warned.size, id).toBeGreaterThan(0);
      expect(hurt, id).toBeGreaterThan(0);
    }
  });

  it('defeating a boss drops loot, grants its trophy once and is saved (v10)', () => {
    const g = new Game(defaultSave());
    arena(g, BOSSES.colossus.biome);
    g.carried = { beacon_colossus: 2 };
    g.useItem('beacon_colossus');
    g.damageBoss(9999);
    expect(g.boss).toBeNull();
    expect(g.ownsGear('junk_hammer')).toBe(true);
    expect(g.bossDefeated('colossus')).toBe(true);
    expect(g.drops.some((d) => d.item === 'crystal')).toBe(true);
    const ev = g.drainEvents().find((e) => e.t === 'bossdown');
    expect(ev && ev.t === 'bossdown' && ev.first).toBe(true);
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back.bosses).toEqual(['colossus']);
    const v9 = { ...defaultSave(), v: 9 } as Record<string, unknown>;
    delete v9.bosses;
    expect(parseSave(JSON.stringify(v9)).bosses).toEqual([]);
    expect(parseSave(JSON.stringify({ ...defaultSave(), bosses: ['nope', 'golem', 3] })).bosses).toEqual(['golem']);
  });

  it('player weapons damage the boss; walking away ends the fight', () => {
    const g = new Game(defaultSave());
    const { x, y } = arena(g, BOSSES.colossus.biome);
    g.carried = { beacon_colossus: 1 };
    g.useItem('beacon_colossus');
    const bs = g.boss!;
    bs.x = x + 2.5;
    bs.y = y;
    bs.cd = 99;
    g.facing = 1;
    g.setTool('blade');
    const hp = bs.hp;
    run(g, 0.4, { dig: true });
    expect(g.boss!.hp).toBeLessThan(hp);
    g.setTool('pistol');
    const hp2 = g.boss!.hp;
    g.iframes = 99;
    run(g, 0.6, { dig: true, aim: { tx: Math.floor(g.boss!.x), ty: Math.floor(g.boss!.y - 1.5) } });
    expect(g.boss!.hp).toBeLessThan(hp2);
    g.body.x = g.boss!.ax1 + 30;
    run(g, 0.05);
    expect(g.boss).toBeNull();
  });

  it('trophies cannot be crafted', () => {
    const g = new Game(defaultSave());
    g.stash = { metal: 999, crystal: 999 };
    expect(g.canCraftGear('junk_hammer')).toBe(false);
  });
});

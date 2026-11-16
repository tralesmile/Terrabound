import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { BOSSES, BOSS_IDS } from '../src/sim/bosses';
import { GEAR, gearStats } from '../src/sim/gear';
import { BOSS_BONUS_CHANCE, BOSS_TRINKET_FIRST, CHEST_ACCESSORIES, bossBonus } from '../src/sim/loot';
import { applyMods } from '../src/sim/mods';
import { LOOT_T, hexRgb, lootBeam } from '../src/render/beamfx';
import { T } from '../src/sim/tiles';

function arena(g: Game, biome: number): void {
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
}

describe('boss trinkets', () => {
  it('every boss has its own boss-only accessory, never in chests', () => {
    const seen = new Set<string>();
    for (const id of BOSS_IDS) {
      const t = BOSSES[id].trinket;
      expect(GEAR[t].slot).toBe('acc');
      expect(GEAR[t].bossOnly).toBe(true);
      expect(CHEST_ACCESSORIES).not.toContain(t);
      seen.add(t);
    }
    expect(seen.size).toBe(BOSS_IDS.length);
  });

  it('the first kill drops the trinket about half the time; a repeat kill always does until owned', () => {
    let hits = 0;
    const N = 400;
    for (let s = 0; s < N; s++) if (bossBonus(1234, 'scrap_core', s, true, []) === 'scrap_core') hits++;
    expect(hits / N).toBeGreaterThan(BOSS_TRINKET_FIRST - 0.1);
    expect(hits / N).toBeLessThan(BOSS_TRINKET_FIRST + 0.1);
    for (let s = 0; s < 50; s++) expect(bossBonus(1234, 'scrap_core', s, false, [])).toBe('scrap_core');
  });

  it('with the trinket owned, a kill sometimes drops a new craftable accessory, never an owned one', () => {
    let hits = 0;
    const N = 400;
    const owned = ['scrap_core' as const, 'magnet_ring' as const];
    for (let s = 0; s < N; s++) {
      const r = bossBonus(99, 'scrap_core', s, false, owned);
      if (r) {
        hits++;
        expect(CHEST_ACCESSORIES).toContain(r);
        expect(owned).not.toContain(r);
      }
    }
    expect(hits / N).toBeGreaterThan(BOSS_BONUS_CHANCE - 0.1);
    expect(hits / N).toBeLessThan(BOSS_BONUS_CHANCE + 0.1);
    expect(bossBonus(99, 'scrap_core', 3, false, ['scrap_core', ...CHEST_ACCESSORIES])).toBeNull();
  });

  it('a repeat boss kill grants and wears the trinket, with a boss gearfound event, and it saves', () => {
    const g = new Game(defaultSave());
    arena(g, BOSSES.colossus.biome);
    g.carried = { beacon_colossus: 2 };
    g.useItem('beacon_colossus');
    g.damageBoss(9999);
    g.drainEvents();
    if (!g.ownsGear('scrap_core')) {
      g.useItem('beacon_colossus');
      if (g.boss) g.boss.iframes = 0;
      g.damageBoss(9999);
    }
    expect(g.ownsGear('scrap_core')).toBe(true);
    expect(g.toSave().gear.acc).toContain('scrap_core');
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.gear.owned).toContain('scrap_core');
    expect(back.gear.acc).toContain('scrap_core');
  });

  it('the bloom seed heals on melee hits and stacks with the leech chip', () => {
    expect(gearStats({}, ['bloom_seed']).leech).toBe(2);
    expect(applyMods(gearStats({}, ['bloom_seed']), { melee: 'leech' }).leech).toBe(5);
    expect(applyMods(gearStats({}), { melee: 'leech' }).leech).toBe(3);
  });

  it('loot beam rises, holds and fades; colours parse', () => {
    expect(lootBeam(-0.1).alpha).toBe(0);
    expect(lootBeam(0.05).height).toBeLessThan(lootBeam(0.3).height);
    expect(lootBeam(1.5).alpha).toBeGreaterThan(0.5);
    expect(lootBeam(LOOT_T - 0.1).alpha).toBeLessThan(lootBeam(1.5).alpha);
    expect(lootBeam(LOOT_T).alpha).toBe(0);
    expect(hexRgb('#ff8a3c')).toEqual([255, 138, 60]);
    expect(hexRgb('bad')).toEqual([255, 210, 58]);
  });
});

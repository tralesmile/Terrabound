import { describe, expect, it } from 'vitest';
import { GEAR, gearStats } from '../src/sim/gear';
import { SETS, SET_IDS, activeTierKeys, setLine, setOf, setStates } from '../src/sim/sets';
import { Game } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('armor set bonuses', () => {
  it('every set piece is real non-weapon gear and in exactly one set; tiers ascend', () => {
    const seen = new Set<string>();
    for (const id of SET_IDS) {
      const d = SETS[id];
      for (const p of d.pieces) {
        expect(GEAR[p], p).toBeTruthy();
        expect(['melee', 'ranged', 'acc', 'vehicle', 'pet']).not.toContain(GEAR[p].slot);
        expect(seen.has(p), p).toBe(false);
        seen.add(p);
        expect(setOf(p)).toBe(id);
      }
      // Pieces fill distinct slots, so the whole set can be worn at once.
      expect(new Set(d.pieces.map((p) => GEAR[p].slot)).size).toBe(d.pieces.length);
      const ns = d.tiers.map((t) => t.n);
      expect(ns).toEqual([...ns].sort((a, b) => a - b));
      expect(ns[0]).toBeGreaterThanOrEqual(2);
      expect(ns[ns.length - 1]).toBeLessThanOrEqual(d.pieces.length);
    }
    expect(setOf('energy_blade')).toBeNull();
  });

  it('one piece gives nothing extra; two pieces add the 2-piece bonus on top of the pieces', () => {
    const one = gearStats({ head: 'scout_helm' });
    expect(one.light).toBe(2);
    const two = gearStats({ head: 'scout_helm', feet: 'spring_boots' });
    // scout helm +2 light, Pathfinder 2-piece +1 light and battery x0.9; spring boots one air jump.
    expect(two.light).toBe(3);
    expect(two.drainMul).toBeCloseTo(0.9);
    expect(two.airJumps).toBe(1);
  });

  it('the full Pathfinder set adds the 3-piece air jump on top of the 2-piece bonus', () => {
    const s = gearStats({ head: 'scout_helm', feet: 'spring_boots', back: 'glider' });
    expect(s.airJumps).toBe(2);
    expect(s.light).toBe(3);
    expect(s.glider).toBe(true);
    expect(setStates({ head: 'scout_helm', feet: 'spring_boots', back: 'glider' })[0].active.length).toBe(2);
  });

  it('Vanguard adds armor and health; armor stays capped at 60%', () => {
    const s = gearStats({ body: 'plate_vest', feet: 'dash_boots' });
    expect(s.armor).toBeCloseTo(0.35);
    expect(s.maxHp).toBe(35);
    const capped = gearStats({ head: 'ai_crown', body: 'frost_core' }, ['aegis_charm', 'frost_heart', 'scrap_core']);
    expect(capped.armor).toBe(0.6);
  });

  it('tier keys and the line read what is on and what comes next', () => {
    expect(activeTierKeys({ head: 'miner_helm' })).toEqual([]);
    expect(activeTierKeys({ head: 'miner_helm', body: 'reactor_suit', back: 'jetpack' })).toEqual(['deep_miner:2', 'deep_miner:3']);
    expect(setLine('deep_miner', 1)).toBe('Deep Miner 1/3: 2 pieces: +20% dig speed');
    expect(setLine('vanguard', 2)).toBe('Vanguard 2/2: 10% armor, +15 health');
  });

  it('equipping the piece that completes a tier emits setbonus once, taking it off emits nothing', () => {
    const s = defaultSave();
    s.gear.owned.push('scout_helm', 'spring_boots', 'glider');
    const g = new Game(s);
    const evs = (): { id: string; n: number }[] => g.drainEvents().flatMap((e) => (e.t === 'setbonus' ? [{ id: e.id, n: e.n }] : []));
    evs();
    g.equipGear('scout_helm');
    expect(evs()).toEqual([]);
    g.equipGear('spring_boots');
    expect(evs()).toEqual([{ id: 'pathfinder', n: 2 }]);
    g.equipGear('glider');
    expect(evs()).toEqual([{ id: 'pathfinder', n: 3 }]);
    expect(g.gear.airJumps).toBe(2);
    g.equipGear('glider');
    expect(evs()).toEqual([]);
    expect(g.gear.airJumps).toBe(1);
  });
});

describe('Circuit Core set', () => {
  it('pairs the visor with the core plate; the full set stacks the tiers', () => {
    const two = gearStats({ head: 'circuit_visor', body: 'core_plate' });
    const none = gearStats({ head: 'circuit_visor' });
    expect(two.digMul).toBeGreaterThan(none.digMul);
    const three = gearStats({ head: 'circuit_visor', body: 'core_plate', feet: 'trace_boots' });
    expect(three.maxHp).toBeGreaterThan(two.maxHp + 25);
    expect(setStates({ head: 'circuit_visor', body: 'core_plate', feet: 'trace_boots' })[0].active.length).toBe(2);
  });
});

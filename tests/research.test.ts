import { describe, expect, it } from 'vitest';
import { Game, NO_CONTROLS } from '../src/sim/game';
import { RESEARCH, RESEARCH_IDS, applyResearch, researchMissing, sanitizeResearch } from '../src/sim/research';
import { NPC_INFO, NPC_ORDER, syncNpcs } from '../src/sim/npcs';
import { findRooms } from '../src/sim/rooms';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { ITEM_IDS, T } from '../src/sim/tiles';
import { derive } from '../src/sim/upgrades';
import type { World } from '../src/sim/world';

/** `n` furnished homes side by side on the pad floor (3x4 interiors, shared walls). */
function rowHomes(w: World, n: number): void {
  const px = w.padX;
  const py = w.padY;
  const x0 = px - 9;
  for (let x = x0; x <= x0 + 4 * n; x++) w.set(x, py - 5, T.METAL);
  for (let k = 0; k <= n; k++) for (let y = py - 5; y <= py - 1; y++) w.set(x0 + 4 * k, y, T.METAL);
  for (let k = 0; k < n; k++) {
    const l = x0 + 4 * k + 1;
    for (let y = py - 4; y <= py - 1; y++) for (let x = l; x <= l + 2; x++) w.set(x, y, T.AIR);
    w.set(l, py - 1, T.BED);
    w.set(l + 2, py - 1, T.TABLE);
    w.set(l + 1, py - 3, T.TORCH);
  }
}

describe('research table', () => {
  it('every perk has a real cost, a description and prerequisites listed before it', () => {
    for (const [i, id] of RESEARCH_IDS.entries()) {
      const r = RESEARCH[id];
      expect(r.desc.length).toBeGreaterThan(4);
      const parts = Object.entries(r.cost);
      expect(parts.length).toBeGreaterThan(0);
      for (const [k, n] of parts) {
        expect(ITEM_IDS).toContain(k);
        expect(n).toBeGreaterThan(0);
      }
      for (const need of r.needs) expect(RESEARCH_IDS.indexOf(need)).toBeLessThan(i);
    }
    expect(RESEARCH_IDS.some((id) => RESEARCH[id].needs.length > 0)).toBe(true);
  });

  it('folds perks into the stats', () => {
    const d = derive({});
    expect(applyResearch(d, [])).toEqual(d);
    const all = applyResearch(d, RESEARCH_IDS);
    expect(all.maxBattery).toBe(d.maxBattery + 100);
    expect(all.packCap).toBe(d.packCap + 8);
    expect(all.maxHp).toBe(d.maxHp + 15);
    expect(all.lampRadius).toBe(d.lampRadius + 1);
    expect(all.digPower).toBeCloseTo(d.digPower * 1.15);
    expect(all.speed).toBeCloseTo(d.speed * 1.07);
  });

  it('sanitizes hostile data and drops perks without their prerequisites', () => {
    expect(sanitizeResearch('x')).toEqual([]);
    expect(sanitizeResearch([1, null, 'nope', {}])).toEqual([]);
    expect(sanitizeResearch(['compression', 'compression'])).toEqual(['compression']);
    expect(sanitizeResearch(['core_theory', 'cell_density'])).toEqual(['cell_density']);
    expect(sanitizeResearch(['photonics', 'core_theory', 'cell_density'])).toEqual(['cell_density', 'photonics', 'core_theory']);
    expect(researchMissing([], 'core_theory')).toEqual(['cell_density', 'photonics']);
    expect(researchMissing(['cell_density'], 'nano_weave')).toEqual([]);
  });
});

describe('Nova the Scientist', () => {
  it('moves into the fourth room of a wide base', () => {
    expect(NPC_ORDER[3]).toBe('scientist');
    expect(NPC_INFO.scientist.name).toBe('Nova');
    const g = new Game(defaultSave());
    rowHomes(g.world, 4);
    const rooms = findRooms(g.world);
    expect(rooms.filter((r) => r.valid)).toHaveLength(4);
    const res = syncNpcs(g.world, rooms, []);
    expect(res.arrived).toEqual(['trader', 'medic', 'gunsmith', 'scientist']);
  });

  it('studies a perk only while home, with prerequisites done, and the gain is felt at once', () => {
    const g = new Game(defaultSave());
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.step(1 / 30, NO_CONTROLS);
    Object.assign(g.stash, { metal: 30, crystal: 30, plasma: 5, circuit: 5 });
    expect(g.research('cell_density')).toBe(false);
    rowHomes(g.world, 4);
    g.step(1 / 30, NO_CONTROLS);
    expect(g.hasNpc('scientist')).toBe(true);
    // Locked until its prerequisites are done.
    expect(g.researchNeeds('core_theory')).toEqual(['cell_density', 'photonics']);
    expect(g.research('core_theory')).toBe(false);
    const bat0 = g.derived.maxBattery;
    g.battery = bat0;
    expect(g.research('cell_density')).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'research')).toBe(true);
    expect(g.stash.metal).toBe(30 - (RESEARCH.cell_density.cost.metal ?? 0));
    expect(g.derived.maxBattery).toBe(bat0 + 40);
    expect(g.battery).toBe(bat0 + 40);
    // Owned forever: cannot study twice; saved and reloaded.
    expect(g.research('cell_density')).toBe(false);
    const g2 = new Game(parseSave(serializeSave(g.toSave(0))));
    expect(g2.hasResearch('cell_density')).toBe(true);
    expect(g2.derived.maxBattery).toBe(bat0 + 40);
  });

  it('refuses when it cannot pay and changes nothing', () => {
    const g = new Game(defaultSave());
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    rowHomes(g.world, 4);
    g.step(1 / 30, NO_CONTROLS);
    for (const k of ITEM_IDS) g.stash[k] = 0;
    expect(g.research('compression')).toBe(false);
    expect(g.hasResearch('compression')).toBe(false);
  });
});

describe('save v16 research', () => {
  it('a v15 save without research loads with none', () => {
    const old = { ...defaultSave(), v: 15 } as Record<string, unknown>;
    delete old.research;
    const s = parseSave(JSON.stringify(old));
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(16);
    expect(s.research).toEqual([]);
  });

  it('research round-trips', () => {
    const s = defaultSave();
    s.research = ['cell_density', 'nano_weave'];
    expect(parseSave(serializeSave(s)).research).toEqual(s.research);
  });
});

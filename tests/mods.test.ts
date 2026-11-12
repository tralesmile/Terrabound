import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { ENEMIES, makeEnemy } from '../src/sim/enemies';
import { BASE_STATS, gearStats } from '../src/sim/gear';
import { LEECH_HEAL, MODS, MOD_IDS, RICOCHET_BOUNCES, applyMods, bounce, defaultMods, fitMod, sanitizeMods } from '../src/sim/mods';
import { NPC_INFO, NPC_ORDER, syncNpcs } from '../src/sim/npcs';
import { findRooms } from '../src/sim/rooms';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { ITEM_IDS, T } from '../src/sim/tiles';
import type { World } from '../src/sim/world';
import { boltColor } from '../src/render/renderer';

const run = (g: Game, seconds: number, c: Partial<Controls> = {}) => {
  const ctl = { ...NO_CONTROLS, ...c };
  for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) g.step(FIXED_DT, ctl);
};

/** `n` (1-3) furnished homes side by side on the pad floor (3x4 interiors, shared walls). */
function rowHomes(w: World, n: number): void {
  const px = w.padX;
  const py = w.padY;
  const x0 = px - 7;
  const x1 = x0 + 4 * n;
  for (let x = x0; x <= x1; x++) w.set(x, py - 5, T.METAL);
  for (let k = 0; k <= n; k++) for (let y = py - 5; y <= py - 1; y++) w.set(x0 + 4 * k, y, T.METAL);
  for (let k = 0; k < n; k++) {
    const l = x0 + 4 * k + 1;
    for (let y = py - 4; y <= py - 1; y++) for (let x = l; x <= l + 2; x++) w.set(x, y, T.AIR);
    w.set(l, py - 1, T.BED);
    w.set(l + 2, py - 1, T.TABLE);
    w.set(l + 1, py - 3, T.TORCH);
  }
}

/** A deep game with an open corridor (test worlds are solid rock) and the given chips fitted. */
function deepWith(fit: Partial<Record<'melee' | 'ranged', (typeof MOD_IDS)[number]>>): Game {
  const s = defaultSave();
  s.mods = { owned: Object.values(fit), fit };
  const g = new Game(s);
  g.body.y = Math.floor(g.world.padY + 10);
  const bx = Math.floor(g.body.x);
  for (let dx = -4; dx <= 14; dx++) {
    for (let dy = -4; dy <= -1; dy++) g.world.set(bx + dx, g.body.y + dy, T.AIR);
    g.world.set(bx + dx, g.body.y, T.RUST);
  }
  g.facing = 1;
  return g;
}

describe('mod chip data', () => {
  it('every chip has a name, a weapon slot, a real positive cost and a colour', () => {
    expect(MOD_IDS.length).toBeGreaterThanOrEqual(6);
    for (const id of MOD_IDS) {
      const m = MODS[id];
      expect(m.name.length).toBeGreaterThan(2);
      expect(['melee', 'ranged']).toContain(m.slot);
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/);
      const keys = Object.keys(m.cost);
      expect(keys.length).toBeGreaterThan(0);
      for (const k of keys) {
        expect(ITEM_IDS).toContain(k);
        expect(m.cost[k as keyof typeof m.cost]).toBeGreaterThan(0);
      }
    }
    // Both weapon slots get a choice.
    expect(MOD_IDS.filter((id) => MODS[id].slot === 'melee').length).toBeGreaterThanOrEqual(3);
    expect(MOD_IDS.filter((id) => MODS[id].slot === 'ranged').length).toBeGreaterThanOrEqual(3);
  });

  it('applyMods changes only what each chip says, and never mutates its input', () => {
    const base = gearStats({ melee: 'energy_blade', ranged: 'pulse_pistol' });
    const snap = JSON.stringify(base);
    expect(applyMods(base, {})).toEqual(base);
    expect(applyMods(base, { ranged: 'overcharge' }).rangedDmg).toBeGreaterThan(base.rangedDmg);
    expect(applyMods(base, { ranged: 'hair_trigger' }).rangedCd).toBeLessThan(base.rangedCd);
    expect(applyMods(base, { ranged: 'piercer' }).pierce).toBe(true);
    expect(applyMods(base, { ranged: 'ricochet' }).bounces).toBe(RICOCHET_BOUNCES);
    const keen = applyMods(base, { melee: 'keen_edge' });
    expect(keen.meleeDmg).toBeGreaterThan(base.meleeDmg);
    expect(keen.meleeRange).toBeGreaterThan(base.meleeRange);
    expect(applyMods(base, { melee: 'leech' }).leech).toBe(LEECH_HEAL);
    expect(applyMods(base, { melee: 'quick_grip' }).meleeCd).toBeLessThan(base.meleeCd);
    const both = applyMods(base, { melee: 'leech', ranged: 'piercer' });
    expect(both.leech).toBe(LEECH_HEAL);
    expect(both.pierce).toBe(true);
    expect(both.rangedDmg).toBe(base.rangedDmg);
    expect(JSON.stringify(base)).toBe(snap);
    expect(BASE_STATS.pierce).toBe(false);
  });

  it('fitMod needs the chip, fits one per slot, and fitting it again takes it out', () => {
    const m = defaultMods();
    expect(fitMod(m, 'overcharge')).toBe(false);
    m.owned.push('overcharge', 'piercer', 'leech');
    expect(fitMod(m, 'overcharge')).toBe(true);
    expect(m.fit.ranged).toBe('overcharge');
    expect(fitMod(m, 'piercer')).toBe(true);
    expect(m.fit.ranged).toBe('piercer');
    expect(fitMod(m, 'leech')).toBe(true);
    expect(m.fit).toEqual({ ranged: 'piercer', melee: 'leech' });
    expect(fitMod(m, 'piercer')).toBe(true);
    expect(m.fit).toEqual({ melee: 'leech' });
  });

  it('sanitizeMods never throws and drops unknown, duplicate, unowned and wrong-slot chips', () => {
    for (const v of [undefined, null, 3, 'x', [], { owned: 'no' }, { owned: [1, null], fit: 5 }]) expect(sanitizeMods(v)).toEqual(defaultMods());
    const m = sanitizeMods({ owned: ['leech', 'leech', 'bogus', 'piercer'], fit: { melee: 'piercer', ranged: 'overcharge' } });
    expect(m.owned).toEqual(['leech', 'piercer']);
    expect(m.fit).toEqual({});
    expect(sanitizeMods({ owned: ['leech', 'piercer'], fit: { melee: 'leech', ranged: 'piercer' } }).fit).toEqual({ melee: 'leech', ranged: 'piercer' });
  });

  it('bounce reflects off the face a bolt hit', () => {
    const wallAt = (wx: number, wy: number) => (x: number, y: number) => x === wx && y === wy;
    // Moving right into a wall cell at (5, 2): x flips.
    expect(bounce(10, 1, 4.9, 2.5, 5.1, 2.6, wallAt(5, 2))).toEqual({ vx: -10, vy: 1 });
    // Moving down into a floor at (3, 6): y flips.
    expect(bounce(2, 8, 3.5, 5.9, 3.6, 6.1, wallAt(3, 6))).toEqual({ vx: 2, vy: -8 });
    // Straight into a corner: both flip.
    expect(bounce(5, 5, 4.95, 4.95, 5.05, 5.05, wallAt(5, 5))).toEqual({ vx: -5, vy: -5 });
  });
});

describe('save v15 mods', () => {
  it('a v14 save without mods loads with no chips', () => {
    const old = { ...defaultSave(), v: 14 } as Record<string, unknown>;
    delete old.mods;
    const s = parseSave(JSON.stringify(old));
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(15);
    expect(s.mods).toEqual(defaultMods());
  });

  it('chips round-trip and bad chips are dropped', () => {
    const s = defaultSave();
    s.mods = { owned: ['ricochet', 'leech'], fit: { ranged: 'ricochet' } };
    expect(parseSave(serializeSave(s)).mods).toEqual(s.mods);
    const bad = JSON.parse(serializeSave(s));
    bad.mods = { owned: ['nope'], fit: { ranged: 'ricochet' } };
    expect(parseSave(JSON.stringify(bad)).mods).toEqual(defaultMods());
  });
});

describe('Rook the Gunsmith', () => {
  it('moves into the third valid room', () => {
    expect(NPC_ORDER).toEqual(['trader', 'medic', 'gunsmith']);
    expect(NPC_INFO.gunsmith.name).toBe('Rook');
    const g = new Game(defaultSave());
    rowHomes(g.world, 2);
    expect(findRooms(g.world).filter((r) => r.valid)).toHaveLength(2);
    expect(syncNpcs(g.world, findRooms(g.world), []).npcs.map((n) => n.kind)).toEqual(['trader', 'medic']);
    rowHomes(g.world, 3);
    expect(findRooms(g.world).filter((r) => r.valid)).toHaveLength(3);
    const res = syncNpcs(g.world, findRooms(g.world), []);
    expect(res.arrived).toEqual(['trader', 'medic', 'gunsmith']);
    expect(new Set(res.npcs.map((n) => n.home)).size).toBe(3);
  });

  it('builds a chip only while home, fits it right away, and the weapon changes', () => {
    const g = new Game(defaultSave());
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.step(1 / 30, NO_CONTROLS);
    g.stash.copper_wire = 20;
    g.stash.crystal = 20;
    const dmg = g.gear.rangedDmg;
    expect(g.buyMod('overcharge')).toBe(false);
    rowHomes(g.world, 3);
    g.step(1 / 30, NO_CONTROLS);
    expect(g.hasNpc('gunsmith')).toBe(true);
    expect(g.canBuyMod('overcharge')).toBe(true);
    expect(g.buyMod('overcharge')).toBe(true);
    expect(g.drainEvents().some((e) => e.t === 'modbuy')).toBe(true);
    expect(g.stash.copper_wire).toBe(20 - (MODS.overcharge.cost.copper_wire ?? 0));
    expect(g.ownsMod('overcharge')).toBe(true);
    expect(g.fittedMod('ranged')).toBe('overcharge');
    expect(g.gear.rangedDmg).toBeGreaterThan(dmg);
    // Owned forever: cannot buy twice; taking it out restores the weapon.
    expect(g.buyMod('overcharge')).toBe(false);
    expect(g.fitMod('overcharge')).toBe(true);
    expect(g.fittedMod('ranged')).toBeUndefined();
    expect(g.gear.rangedDmg).toBe(dmg);
    // Chips are saved.
    expect(parseSave(serializeSave(g.toSave(0))).mods.owned).toContain('overcharge');
  });

  it('says its own lines and offers mods in the hint', () => {
    const g = new Game(defaultSave());
    rowHomes(g.world, 3);
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.step(1 / 30, NO_CONTROLS);
    const r = g.npcs.find((n) => n.kind === 'gunsmith');
    expect(r).toBeDefined();
    if (!r) return;
    g.body.x = r.x + 0.3;
    g.body.y = r.y;
    g.step(1 / 30, NO_CONTROLS);
    expect(g.hintAutomation(false)).toContain('Rook the Gunsmith');
    expect(g.hintAutomation(false)).toContain('weapon mods');
  });
});

describe('chips in combat', () => {
  it('ricochet bolts bounce back off a wall instead of fizzling', () => {
    const g = deepWith({ ranged: 'ricochet' });
    g.setTool('pistol');
    const wx = Math.floor(g.body.x) + 3;
    for (let y = g.body.y - 4; y <= g.body.y; y++) g.world.set(wx, y, T.RUST);
    run(g, 0.05, { dig: true, aim: { tx: wx, ty: g.body.y - 2 } });
    expect(g.shots[0]?.bounces).toBe(RICOCHET_BOUNCES);
    run(g, 0.2);
    expect(g.drainEvents().some((e) => e.t === 'ricochet')).toBe(true);
    const back = g.shots.find((s) => s.vx < 0);
    expect(back).toBeDefined();
    expect(back?.bounces).toBeLessThan(RICOCHET_BOUNCES);
  });

  it('a ricochet bolt hits an enemy behind cover', () => {
    const g = deepWith({ ranged: 'ricochet' });
    g.setTool('pistol');
    const x0 = Math.floor(g.body.x);
    // Wall ahead; the crawler waits behind the player, reachable only on the bounce.
    for (let y = g.body.y - 4; y <= g.body.y; y++) g.world.set(x0 + 3, y, T.RUST);
    const e = makeEnemy(5, 'crawler', x0 - 2.5, g.body.y - 0.01);
    g.enemies = [e];
    run(g, 0.6, { dig: true, aim: { tx: x0 + 3, ty: g.body.y - 1 } });
    expect(e.hp).toBeLessThan(ENEMIES.crawler.hp);
  });

  it('piercer bolts pass through the first enemy into the second', () => {
    const hits = (fit: Parameters<typeof deepWith>[0]): number[] => {
      const g = deepWith(fit);
      g.setTool('pistol');
      const x0 = Math.floor(g.body.x);
      const a = makeEnemy(1, 'crawler', x0 + 4, g.body.y - 0.01);
      const b = makeEnemy(2, 'crawler', x0 + 5.5, g.body.y - 0.01);
      g.enemies = [a, b];
      run(g, 0.28, { dig: true, aim: { tx: x0 + 8, ty: g.body.y - 1 } });
      return [ENEMIES.crawler.hp - a.hp, ENEMIES.crawler.hp - b.hp];
    };
    const plain = hits({});
    expect(plain[0]).toBeGreaterThan(0);
    expect(plain[1]).toBe(0);
    const pierced = hits({ ranged: 'piercer' });
    expect(pierced[0]).toBeGreaterThan(0);
    expect(pierced[1]).toBeGreaterThan(0);
  });

  it('leech melee hits heal the player, never past max HP', () => {
    const g = deepWith({ melee: 'leech' });
    g.setTool('blade');
    g.enemies = [makeEnemy(3, 'crawler', g.body.x + 1, g.body.y - 0.01)];
    g.hp = 40;
    run(g, 0.05, { dig: true });
    const ev = g.drainEvents().filter((e) => e.t === 'leech');
    expect(ev.length).toBe(1);
    const plain = deepWith({});
    plain.setTool('blade');
    plain.enemies = [makeEnemy(3, 'crawler', plain.body.x + 1, plain.body.y - 0.01)];
    plain.hp = 40;
    run(plain, 0.05, { dig: true });
    expect(plain.drainEvents().some((e) => e.t === 'leech')).toBe(false);
    // At full health nothing is healed or announced.
    const full = deepWith({ melee: 'leech' });
    full.setTool('blade');
    full.enemies = [makeEnemy(3, 'crawler', full.body.x + 1, full.body.y - 0.01)];
    run(full, 0.05, { dig: true });
    expect(full.hp).toBeLessThanOrEqual(full.derived.maxHp);
    expect(full.drainEvents().some((e) => e.t === 'leech')).toBe(false);
  });
});

describe('bolt tracers', () => {
  it('colour says what a bolt does', () => {
    const base = { x: 0, y: 0, vx: 1, vy: 0, life: 1 };
    const plain = boltColor(base, 'pulse');
    expect(boltColor({ ...base, bounces: 2 }, 'pulse')).not.toBe(plain);
    expect(boltColor({ ...base, pierce: true }, 'pulse')).not.toBe(plain);
    expect(boltColor(base, 'scatter')).not.toBe(plain);
    for (const c of [plain, boltColor({ ...base, pierce: true }, 'rail')]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});

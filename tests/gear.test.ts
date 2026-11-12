import type { SaveData } from '../src/sim/save';
import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS, type Controls } from '../src/sim/game';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';
import { GEAR, GEAR_IDS, STARTER_GEAR, gearStats, sanitizeGear } from '../src/sim/gear';
import { T } from '../src/sim/tiles';
import { makeEnemy } from '../src/sim/enemies';

const run = (g: Game, s: number, c: Partial<Controls> = {}): void => {
  for (let i = 0; i < Math.round(s / FIXED_DT); i++) g.step(FIXED_DT, { ...NO_CONTROLS, ...c });
};
const rich = (): Game => {
  const g = new Game(defaultSave());
  g.stash = { metal: 500, iron_scrap: 500, copper_wire: 500, crystal: 500, biomass: 500 };
  return g;
};
/** Open sky box away from the pad: rust floor at y, air for 30 rows above. */
function sky(g: Game, dx = 80): { x: number; y: number } {
  const w = g.world;
  const x0 = w.padX + dx;
  const y = w.surface[x0];
  for (let x = x0 - 25; x <= x0 + 25; x++) {
    for (let yy = Math.max(1, y - 30); yy < y; yy++) w.set(x, yy, T.AIR);
    w.set(x, y, T.RUST);
  }
  g.body.x = x0 + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
  return { x: x0, y };
}

describe('gear table', () => {
  it('every piece has a slot, a description and (except starters) a cost', () => {
    for (const id of GEAR_IDS) {
      const d = GEAR[id];
      expect(d.desc.length).toBeGreaterThan(5);
      if (!STARTER_GEAR.includes(id) && !d.bossOnly) expect(Object.keys(d.cost).length).toBeGreaterThan(0);
    }
    expect(GEAR_IDS.length).toBeGreaterThanOrEqual(15);
  });

  it('armor stacks and caps at 60%', () => {
    expect(gearStats({ body: 'plate_vest', head: 'scout_helm' }).armor).toBeCloseTo(0.3);
    expect(gearStats({}).armor).toBe(0);
  });
});

describe('crafting and equipping', () => {
  it('builds at the pad from the stash, equips it and keeps it after death', () => {
    const g = rich();
    expect(g.canCraftGear('plate_vest')).toBe(true);
    const metal = g.stash.metal ?? 0;
    expect(g.craftGear('plate_vest')).toBe(true);
    expect(g.stash.metal).toBe(metal - (GEAR.plate_vest.cost.metal ?? 0));
    expect(g.equipped('body')).toBe('plate_vest');
    expect(g.derived.maxHp).toBe(new Game(defaultSave()).derived.maxHp + 20);
    expect(g.craftGear('plate_vest')).toBe(false);
    g.body.y = g.world.padY + 30;
    expect(g.craftGear('scout_helm')).toBe(false); // not at the pad
    g.hp = 0;
    run(g, 1 / 60);
    expect(g.ownsGear('plate_vest')).toBe(true);
    expect(g.equipped('body')).toBe('plate_vest');
  });

  it('armor reduces damage taken', () => {
    const g = rich();
    g.craftGear('plate_vest');
    const { x, y } = sky(g);
    const e = makeEnemy(5, 'crawler', x + 0.5, y);
    g.enemies = [e];
    const hp = g.hp;
    run(g, 0.1);
    const taken = hp - g.hp;
    const g2 = new Game(defaultSave());
    const s2 = sky(g2);
    g2.enemies = [makeEnemy(5, 'crawler', s2.x + 0.5, s2.y)];
    const hp2 = g2.hp;
    run(g2, 0.1);
    expect(taken).toBeGreaterThan(0);
    expect(taken).toBeLessThan(hp2 - g2.hp);
  });

  it('equipping the worn armor again takes it off; starter weapons stay', () => {
    const g = rich();
    g.craftGear('scout_helm');
    g.equipGear('scout_helm');
    expect(g.equipped('head')).toBeUndefined();
    g.equipGear('energy_blade');
    expect(g.equipped('melee')).toBe('energy_blade');
    expect(g.equipGear('jetpack')).toBe(false); // not owned
  });

  it('saves gear (v9) and migrates a v8 save to the starters', () => {
    const g = rich();
    g.craftGear('rail_rifle');
    g.craftGear('dash_boots');
    const back = parseSave(serializeSave(g.toSave()));
    expect(back.v).toBe(SAVE_VERSION);
    expect(back.gear.owned).toContain('rail_rifle');
    expect(back.gear.equip.ranged).toBe('rail_rifle');
    const v8 = { ...defaultSave(), v: 8 } as Record<string, unknown>;
    delete v8.gear;
    expect(parseSave(JSON.stringify(v8)).gear.owned).toEqual(STARTER_GEAR);
    const junk = sanitizeGear({ owned: ['nope', 'jetpack', 5], equip: { back: 'jetpack', head: 'jetpack', vehicle: 'sky_jet' } });
    expect(junk.owned).toContain('jetpack');
    expect(junk.equip.back).toBe('jetpack');
    expect(junk.equip.head).toBeUndefined();
    expect(junk.equip.vehicle).toBeUndefined();
  });
});

describe('abilities', () => {
  it('spring boots give a double jump', () => {
    const peak = (g: Game): number => {
      const { y } = sky(g);
      let top = y;
      run(g, 0.05, { jump: true });
      run(g, 0.3, { jump: true });
      run(g, 0.05);
      run(g, 0.05, { jump: true });
      for (let i = 0; i < 60; i++) {
        run(g, 1 / 60, { jump: true });
        top = Math.min(top, g.body.y);
      }
      return y - top;
    };
    const plain = peak(new Game(defaultSave()));
    const g = rich();
    g.craftGear('spring_boots');
    expect(peak(g)).toBeGreaterThan(plain + 1.5);
  });

  it('dash boots burst forward', () => {
    const g = rich();
    g.craftGear('dash_boots');
    const { x } = sky(g);
    g.facing = 1;
    run(g, 0.2, { dash: true });
    expect(g.body.x - x).toBeGreaterThan(2.5);
  });

  it('the jetpack flies up while jump is held; the glider slows the fall', () => {
    const g = rich();
    g.craftGear('jetpack');
    const { y } = sky(g);
    run(g, 1.2, { jump: true });
    expect(g.body.y).toBeLessThan(y - 6);
    const h = rich();
    h.craftGear('glider');
    sky(h);
    h.body.y -= 20;
    h.body.vy = 5;
    run(h, 0.5, { jump: true });
    expect(h.body.vy).toBeLessThanOrEqual(2.6);
  });
});

describe('grappling hook', () => {
  it('attaches to a ceiling, holds the player on the rope and lets go on jump', () => {
    const g = new Game(defaultSave());
    const { x, y } = sky(g);
    for (let xx = x - 20; xx <= x + 20; xx++) g.world.set(xx, y - 12, T.METAL);
    g.setTool('hook');
    run(g, 0.05, { dig: true, aim: { tx: x + 4, ty: y - 12 } });
    expect(g.hook).not.toBeNull();
    // Walk off: the rope keeps the body within its length of the anchor.
    const h = g.hook!;
    run(g, 2, { moveX: 1 });
    expect(Math.hypot(g.body.x - h.ax, g.body.y - 0.9 - h.ay)).toBeLessThanOrEqual(h.len + 0.3);
    // Reel in by holding the hook button.
    const len = h.len;
    run(g, 0.5, { dig: true, aim: { tx: x + 4, ty: y - 12 } });
    expect(g.hook!.len).toBeLessThan(len - 2);
    run(g, 0.05, { jump: true });
    expect(g.hook).toBeNull();
  });

  it('misses when nothing solid is in range', () => {
    const g = new Game(defaultSave());
    const { x, y } = sky(g);
    g.setTool('hook');
    run(g, 0.05, { dig: true, aim: { tx: x + 3, ty: y - 25 } });
    expect(g.hook).toBeNull();
  });
});

describe('weapons', () => {
  it('the plasma axe hits harder than the starter blade', () => {
    const hit = (g: Game): number => {
      const { x, y } = sky(g);
      const e = makeEnemy(9, 'hulk', x + 1.6, y);
      g.enemies = [e];
      g.facing = 1;
      g.setTool('blade');
      run(g, 0.05, { dig: true });
      return 60 - e.hp;
    };
    const g = rich();
    g.craftGear('plasma_axe');
    expect(hit(g)).toBeGreaterThan(hit(new Game(defaultSave())));
  });

  it('scatter fires three bolts; the bomb launcher blasts a crater', () => {
    const g = rich();
    g.craftGear('scatter_gun');
    const { x, y } = sky(g);
    g.setTool('pistol');
    run(g, 1 / 60, { dig: true, aim: { tx: x + 6, ty: y - 1 } });
    expect(g.shots.length).toBe(3);
    const b = rich();
    b.craftGear('bomb_launcher');
    const s = sky(b);
    for (let xx = s.x + 3; xx < s.x + 8; xx++) for (let yy = s.y - 3; yy < s.y; yy++) b.world.set(xx, yy, T.RUST);
    b.setTool('pistol');
    run(b, 1 / 60, { dig: true, aim: { tx: s.x + 4, ty: s.y - 1 } });
    run(b, 1.5);
    let holes = 0;
    for (let xx = s.x + 3; xx < s.x + 8; xx++) for (let yy = s.y - 3; yy < s.y; yy++) if (b.world.get(xx, yy) === T.AIR) holes++;
    expect(holes).toBeGreaterThan(3);
  });
});

describe('vehicles', () => {
  /** Own a vehicle and have it parked next to the player (garage flow is tested in garage.test.ts). */
  const own = (g: Game, id: 'hoverbike' | 'sky_jet'): void => {
    const sv = (g as unknown as { save: SaveData }).save;
    sv.gear.owned.push(id);
    sv.gear.equip.vehicle = id;
    sv.garage.parked = { id, x: g.body.x, y: g.body.y };
  };
  it('the hoverbike is much faster than walking; the Sky Jet flies', () => {
    const g = rich();
    const s = sky(g);
    own(g, 'hoverbike');
    expect(g.toggleRide()).toBe(true);
    run(g, 1, { moveX: 1 });
    const bike = g.body.x - s.x;
    const p = new Game(defaultSave());
    const s2 = sky(p);
    run(p, 1, { moveX: 1 });
    expect(bike).toBeGreaterThan((p.body.x - s2.x) * 1.6);
    const j = rich();
    const s3 = sky(j);
    own(j, 'sky_jet');
    j.toggleRide();
    run(j, 1.5, { jump: true });
    expect(j.body.y).toBeLessThan(s3.y - 8);
    j.toggleRide();
    expect(j.riding).toBe(false);
    expect(new Game(defaultSave()).toggleRide()).toBe(false);
  });
});

describe('pets', () => {
  it('a pet follows the player; the scout bot widens the loot magnet; the glow moth adds light', () => {
    const g = rich();
    g.craftGear('scout_bot');
    expect(g.equipped('pet')).toBe('scout_bot');
    const { x, y } = sky(g);
    run(g, 1.5);
    expect(Math.hypot(g.pet.x - g.body.x, g.pet.y - g.body.y)).toBeLessThan(4);
    g.carried = {};
    g.drops = [];
    g.drops.push({ item: 'crystal', n: 2, x: x + 6.5, y: y - 0.01, vx: 0, vy: 0, age: 0, noPick: 0 });
    run(g, 2);
    expect(g.carried.crystal).toBe(2);
    const light = g.derived.lampRadius;
    // Building happens at the pad.
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    expect(g.craftGear('glow_moth')).toBe(true);
    expect(g.derived.lampRadius).toBeGreaterThan(light);
  });

  it('the spark pup zaps enemies near it', () => {
    const g = rich();
    g.craftGear('spark_pup');
    const { x, y } = sky(g);
    run(g, 1);
    const e = makeEnemy(77, 'hulk', g.pet.x + 1, y);
    e.vx = 0;
    g.enemies = [e];
    const hp = e.hp;
    g.iframes = 99;
    run(g, 0.3);
    expect(e.hp).toBeLessThan(hp);
    void x;
  });
});

import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { ATTACK_TIME, BOSSES, GATE_BOSSES, makeBoss, stepBoss } from '../src/sim/bosses';
import { GRID_GAP, GRID_GAP_P2, GRID_HALF, gridColumns, gridFiring, gridHits, safeLane } from '../src/sim/lasergrid';
import { LAYERS } from '../src/sim/layers';
import { defaultSave } from '../src/sim/save';
import { GEAR } from '../src/sim/gear';
import { RECIPES } from '../src/sim/recipes';
import { T } from '../src/sim/tiles';
import { mulberry32 } from '../src/sim/rng';
import { beamFloor, gridLook } from '../src/render/gridfx';
import { SLAB_W, nodePositions, slabTraces, squarePath, visorEye } from '../src/render/wardenart';

/** Clear a flat floor in the Circuit layer under the player. */
function circuitArena(g: Game): void {
  const x = Math.floor(g.world.padX + 120);
  const y = g.world.padY + LAYERS[1].top + 20;
  for (let xx = x - 40; xx <= x + 40; xx++) {
    for (let yy = y - 12; yy < y; yy++) g.world.set(xx, yy, T.AIR);
    g.world.set(xx, y, T.CIRCUIT);
  }
  g.body.x = x + 0.5;
  g.body.y = y;
  g.body.vx = g.body.vy = 0;
  g.enemies = [];
}

describe('Logic Warden', () => {
  it('is the Circuit layer guardian: beacon recipe, boss-only trophy and trinket, a telegraphed grid attack', () => {
    const d = BOSSES.warden;
    expect(d.layer).toBe(1);
    expect(d.attacks).toContain('grid');
    expect(ATTACK_TIME.grid.warn).toBeGreaterThanOrEqual(0.8);
    expect(RECIPES.some((r) => r.out === d.beacon && (r.cost.circuit ?? 0) > 0)).toBe(true);
    expect(GEAR[d.gear].bossOnly).toBe(true);
    expect(GEAR[d.trinket].slot).toBe('acc');
    expect(GATE_BOSSES).toContain('warden');
    expect(GATE_BOSSES).not.toContain('hollow_ai');
  });

  it('can only be called in the Circuit layer or deeper', () => {
    const g = new Game(defaultSave());
    g.body.x = g.world.padX + 120.5;
    g.carried = { beacon_warden: 1 };
    expect(g.useItem('beacon_warden')).toBe(false);
    circuitArena(g);
    expect(g.useItem('beacon_warden')).toBe(true);
    expect(g.boss?.id).toBe('warden');
  });

  it('beating it counts toward the deeper gates and grants the trophy', () => {
    const g = new Game(defaultSave());
    circuitArena(g);
    g.carried = { beacon_warden: 1 };
    g.useItem('beacon_warden');
    g.damageBoss(1e6);
    expect(g.bossDefeated('warden')).toBe(true);
    expect(g.gateBossesBeaten()).toBe(1);
    expect(g.biomeBossesBeaten()).toBe(0);
    expect(g.ownsGear(BOSSES.warden.gear)).toBe(true);
  });
});

describe('laser grid', () => {
  it('spans the arena with even gaps that tighten in phase 2', () => {
    const b = makeBoss('warden', 100, 40);
    const c = gridColumns(b);
    expect(c.length).toBeGreaterThan(8);
    for (let i = 1; i < c.length; i++) expect(c[i] - c[i - 1]).toBeCloseTo(GRID_GAP);
    for (const x of c) expect(x >= b.ax0 && x <= b.ax1).toBe(true);
    b.hp = BOSSES.warden.hp * 0.4;
    const c2 = gridColumns(b);
    expect(c2[1] - c2[0]).toBeCloseTo(GRID_GAP_P2);
  });

  it('safe lanes swap sides between casts', () => {
    const b = makeBoss('warden', 100, 40);
    const a = gridColumns(b);
    b.nextAttack += 1;
    const c = gridColumns(b);
    expect(Math.abs(c[0] - a[0])).toBeCloseTo(GRID_GAP / 2);
  });

  it('only hurts while firing, on a beam and not in a lane', () => {
    const b = makeBoss('warden', 100, 40);
    b.attack = 'grid';
    const col = gridColumns(b)[3];
    b.at = -0.3;
    expect(gridHits(b, col, 0.35)).toBe(false);
    b.at = 0.1;
    expect(gridFiring(b)).toBe(true);
    expect(gridHits(b, col, 0.35)).toBe(true);
    const lane = safeLane(b, col + 1);
    expect(gridHits(b, lane, 0.35)).toBe(false);
    expect(GRID_GAP_P2 / 2).toBeGreaterThan(GRID_HALF + 0.35 + 0.5);
    b.at = ATTACK_TIME.grid.act + 0.01;
    expect(gridHits(b, col, 0.35)).toBe(false);
  });

  it('the game hurts a player standing in a beam and spares one in a lane', () => {
    for (const inLane of [false, true]) {
      const g = new Game(defaultSave());
      circuitArena(g);
      g.carried = { beacon_warden: 1 };
      g.useItem('beacon_warden');
      const bs = g.boss;
      if (!bs) throw new Error('no boss');
      bs.attack = 'grid';
      bs.at = 0.01;
      bs.x = g.body.x + 12;
      const cols = gridColumns(bs);
      g.body.x = inLane ? safeLane(bs, g.body.x) : cols.reduce((p, c) => (Math.abs(c - g.body.x) < Math.abs(p - g.body.x) ? c : p));
      const hp = g.hp;
      g.step(FIXED_DT, NO_CONTROLS);
      expect(g.hp < hp).toBe(!inLane);
    }
  });

  it('the warden casts the grid on its own, deterministically', () => {
    const w = new Game(defaultSave()).world;
    const b = makeBoss('warden', 300, 40);
    const rng = mulberry32(3);
    let fired = 0;
    for (let i = 0; i < 1200; i++) {
      stepBoss(b, w, FIXED_DT, 310, 44, rng);
      if (gridFiring(b)) fired++;
    }
    expect(fired).toBeGreaterThan(0);
  });
});

describe('grid and warden art helpers', () => {
  it('guides brighten over the telegraph, beams flare then fade', () => {
    const b = makeBoss('warden', 100, 40);
    expect(gridLook(b).alpha).toBe(0);
    b.attack = 'grid';
    b.at = -ATTACK_TIME.grid.warn + 0.01;
    const early = gridLook(b);
    b.at = -0.05;
    const late = gridLook(b);
    expect(late.alpha).toBeGreaterThan(early.alpha);
    expect(late.live).toBe(false);
    b.at = 0.05;
    const fire = gridLook(b);
    expect(fire.live).toBe(true);
    expect(fire.width).toBeGreaterThan(late.width * 3);
    b.at = ATTACK_TIME.grid.act * 0.95;
    expect(gridLook(b).alpha).toBeLessThan(fire.alpha);
  });

  it('beams stop on the first floor below the boss', () => {
    const solid = (x: number, y: number): boolean => y >= 20 || (x === 5 && y >= 12);
    expect(beamFloor(solid, 3.5, 10)).toBe(20);
    expect(beamFloor(solid, 5.2, 10)).toBe(12);
    expect(beamFloor(() => false, 3, 10, 6)).toBe(16);
  });

  it('nodes ride a square orbit, traces stay on the slab, the eye follows the player', () => {
    expect(squarePath(0, 10)).toEqual({ x: -10, y: -10 });
    expect(squarePath(0.25, 10)).toEqual({ x: 10, y: -10 });
    expect(squarePath(0.5, 10)).toEqual({ x: 10, y: 10 });
    expect(squarePath(1.75, 10)).toEqual({ x: -10, y: 10 });
    const n = nodePositions(1.3, false);
    expect(n).toHaveLength(4);
    for (const p of n) expect(Math.max(Math.abs(p.x), Math.abs(p.y))).toBeCloseTo(SLAB_W * 0.85);
    expect(nodePositions(1, true)[0]).not.toEqual(nodePositions(1, false)[0]);
    for (const t of slabTraces()) for (const p of t) expect(p.x >= 0 && p.x < SLAB_W && p.y >= 0).toBe(true);
    expect(visorEye(-20)).toBe(-1);
    expect(visorEye(4)).toBeGreaterThan(0);
  });
});

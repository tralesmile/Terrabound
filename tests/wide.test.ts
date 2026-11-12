import { describe, expect, it } from 'vitest';
import { World } from '../src/sim/world';
import { T, TILES } from '../src/sim/tiles';
import { WIDE, partner, placement, removeTile, wideSide } from '../src/sim/wide';
import { roomAt, COMFORT_MAX } from '../src/sim/rooms';
import { furnitureArt, WIDE_ART } from '../src/render/furniture';
import { defaultSave } from '../src/sim/save';
import { Game, NO_CONTROLS } from '../src/sim/game';

function flat(): World {
  const w = new World(120, 60, 7);
  Object.assign(w, { padX: 60, padY: 20 });
  for (let y = 20; y < 60; y++) for (let x = 0; x < 120; x++) w.set(x, y, T.RUST);
  return w;
}
const yes = (): boolean => true;

describe('two-tile furniture', () => {
  it('a bed goes down 2 wide: right when free, else left, else 1 tile', () => {
    const w = flat();
    expect(placement(w, 50, 19, T.BED, yes)).toEqual([{ x: 50, y: 19, tile: T.BED }, { x: 51, y: 19, tile: T.BED_FOOT }]);
    w.set(51, 19, T.METAL);
    expect(placement(w, 50, 19, T.BED, yes)).toEqual([{ x: 49, y: 19, tile: T.BED }, { x: 50, y: 19, tile: T.BED_FOOT }]);
    w.set(49, 19, T.METAL);
    expect(placement(w, 50, 19, T.BED, yes)).toEqual([{ x: 50, y: 19, tile: T.BED }]);
    // The player standing in the free cell blocks it.
    const w2 = flat();
    expect(placement(w2, 50, 19, T.TABLE, (x) => x !== 51)[0]).toEqual({ x: 49, y: 19, tile: T.TABLE });
    // Single-tile pieces are unaffected.
    expect(placement(w2, 50, 19, T.LAMP, yes)).toEqual([{ x: 50, y: 19, tile: T.LAMP }]);
  });

  it('halves find each other; breaking either clears both and drops one item', () => {
    for (const [head, foot] of Object.entries(WIDE).map(([a, b]) => [Number(a), b])) {
      for (const hit of [0, 1]) {
        const w = flat();
        w.set(50, 19, head);
        w.set(51, 19, foot);
        expect(partner(w, 50, 19)).toEqual({ x: 51, y: 19 });
        expect(partner(w, 51, 19)).toEqual({ x: 50, y: 19 });
        expect(wideSide(w, 50, 19)).toBe('left');
        expect(wideSide(w, 51, 19)).toBe('right');
        const r = removeTile(w, 50 + hit, 19);
        expect(r.drop).toBe(TILES[head].drop);
        expect(w.get(50, 19)).toBe(T.AIR);
        expect(w.get(51, 19)).toBe(T.AIR);
      }
    }
  });

  it('an old 1-tile bed stays single and two beds side by side do not merge wrongly', () => {
    const w = flat();
    w.set(50, 19, T.BED);
    w.set(51, 19, T.BED);
    expect(wideSide(w, 50, 19)).toBeNull();
    expect(partner(w, 50, 19)).toBeNull();
    removeTile(w, 50, 19);
    expect(w.get(51, 19)).toBe(T.BED);
  });

  it('either half counts toward a home, and a chair adds comfort (capped)', () => {
    const w = flat();
    for (let x = 54; x <= 61; x++) {
      w.set(x, 14, T.METAL);
    }
    for (let y = 14; y <= 19; y++) {
      w.set(54, y, T.METAL);
      w.set(61, y, T.METAL);
    }
    w.set(56, 19, T.BED_FOOT); // orphan foot still reads as a bed for the room
    w.set(58, 19, T.TABLE_END);
    w.set(60, 16, T.LAMP);
    const r = roomAt(w, 57, 17);
    expect(r?.bed).toBe(true);
    expect(r?.table).toBe(true);
    expect(r?.valid).toBe(true);
    w.set(59, 19, T.CHAIR);
    expect(roomAt(w, 57, 17)?.comfort).toBe(1);
    w.set(55, 16, T.SCREEN);
    w.set(55, 17, T.BANNER);
    w.set(55, 18, T.POT_PLANT);
    for (let y = 15; y <= 19; y++) for (let x = 55; x <= 60; x++) w.setWall(x, y, 3);
    expect(roomAt(w, 57, 17)?.comfort).toBe(COMFORT_MAX);
  });

  it('wide art is 32x16 with known colours and splits into two 16-wide halves', () => {
    for (const k of Object.keys(WIDE_ART)) {
      const a = WIDE_ART[Number(k)];
      expect(a.rows.length).toBe(16);
      for (const r of a.rows) {
        expect(r.length, r).toBe(32);
        for (const ch of r) if (ch !== ' ') expect(a.pal[ch], ch).toBeDefined();
      }
    }
    const left = furnitureArt(T.BED, 'left');
    const right = furnitureArt(T.BED_FOOT, 'right');
    expect(left?.rows.every((r) => r.length === 16)).toBe(true);
    expect(left?.rows.join('')).not.toBe(right?.rows.join(''));
    // A lone foot falls back to the single bed art.
    expect(furnitureArt(T.BED_FOOT, null)?.rows).toEqual(furnitureArt(T.BED, null)?.rows);
    expect(furnitureArt(T.CHAIR, null)).not.toBeNull();
    expect(furnitureArt(T.RUST, null)).toBeNull();
  });

  it('in the game: placing a bed uses one item for two cells, digging the foot gives it back', () => {
    const g = new Game(defaultSave());
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    for (let y = py - 4; y <= py - 1; y++) for (let x = px - 4; x <= px + 4; x++) w.set(x, y, T.AIR);
    g.body.x = px - 3 + 0.5;
    g.body.y = py;
    g.step(1 / 30, NO_CONTROLS);
    g.carried.bed = 1;
    g.selected = 'bed';
    g.step(1 / 30, { ...NO_CONTROLS, place: true, aim: { tx: px, ty: py - 1 } } as typeof NO_CONTROLS);
    expect(w.get(px, py - 1)).toBe(T.BED);
    expect(w.get(px + 1, py - 1)).toBe(T.BED_FOOT);
    expect(g.carried.bed ?? 0).toBe(0);
    for (let i = 0; i < 60 && w.get(px + 1, py - 1) !== T.AIR; i++) g.step(1 / 30, { ...NO_CONTROLS, dig: true, aim: { tx: px + 1, ty: py - 1 } });
    expect(w.get(px + 1, py - 1)).toBe(T.AIR);
    expect(w.get(px, py - 1)).toBe(T.AIR);
    expect(g.carried.bed).toBe(1);
  });
});

describe('quick heal', () => {
  it('picks the smallest heal that covers the missing HP, else the biggest', async () => {
    const { bestHeal, healCount } = await import('../src/sim/fishing');
    expect(bestHeal({ fish: 1, medkit: 1 }, 10)).toBe('fish');
    expect(bestHeal({ fish: 1, medkit: 1 }, 40)).toBe('medkit');
    expect(bestHeal({ fish: 2, glowfish: 1 }, 90)).toBe('glowfish');
    expect(bestHeal({ fish: 1 }, 0)).toBeNull();
    expect(bestHeal({ rust: 5 }, 50)).toBeNull();
    expect(healCount({ fish: 2, medkit: 1, rust: 9 })).toBe(3);
  });
  it('game.quickHeal eats one item and reports full / none', () => {
    const g = new Game(defaultSave());
    expect(g.quickHeal()).toBe('full');
    g.hp = g.derived.maxHp - 50;
    expect(g.quickHeal()).toBe('none');
    g.carried.fish = 1;
    g.carried.medkit = 1;
    expect(g.quickHeal()).toBe('medkit');
    expect(g.hp).toBe(g.derived.maxHp);
    expect(g.carried.medkit ?? 0).toBe(0);
    expect(g.carried.fish).toBe(1);
  });
});

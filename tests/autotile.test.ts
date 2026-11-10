import { describe, expect, it } from 'vitest';
import { EDGE_E, EDGE_N, EDGE_S, EDGE_W, MASKS, edgeMask, edgePixel, growsMoss, isBlock } from '../src/render/autotile';
import { MOSS_H, TS, VARIANTS, atlasCol, autotilePixels, mossPixels, tileTexture } from '../src/render/sprites';
import { T, TILES } from '../src/sim/tiles';
import { World } from '../src/sim/world';

const grid = (rows: string[]) => (x: number, y: number): number => (rows[y]?.[x] === '#' ? T.METAL : T.AIR);

describe('edge mask', () => {
  it('isolated block is exposed on all sides; buried block on none', () => {
    expect(edgeMask(grid(['...', '.#.', '...']), 1, 1)).toBe(EDGE_N | EDGE_E | EDGE_S | EDGE_W);
    expect(edgeMask(grid(['###', '###', '###']), 1, 1)).toBe(0);
  });
  it('each side maps to its own bit', () => {
    expect(edgeMask(grid(['#.#', '###', '###']), 1, 1)).toBe(EDGE_N);
    expect(edgeMask(grid(['###', '##.', '###']), 1, 1)).toBe(EDGE_E);
    expect(edgeMask(grid(['###', '###', '#.#']), 1, 1)).toBe(EDGE_S);
    expect(edgeMask(grid(['###', '.##', '###']), 1, 1)).toBe(EDGE_W);
  });
  it('different block materials merge; torches, ladders, doors and walls do not', () => {
    for (const t of [T.RUST, T.METAL, T.IRON, T.COPPER, T.BEDROCK, T.PAD, T.SCAFFOLD]) expect(isBlock(t)).toBe(true);
    for (const t of [T.AIR, T.TORCH, T.LADDER, T.PLATFORM, T.DOOR, T.WALL]) expect(isBlock(t)).toBe(false);
  });
  it('real world: world edges count as rock, the sky above the surface as open', () => {
    const w = new World(20, 20, 1);
    w.tiles.fill(T.METAL);
    expect(edgeMask((x, y) => w.get(x, y), 0, 5)).toBe(0);
    expect(edgeMask((x, y) => w.get(x, y), 5, 19)).toBe(0);
    expect(edgeMask((x, y) => w.get(x, y), 5, 0)).toBe(EDGE_N);
  });
});

describe('edge pixels', () => {
  it('interior mask leaves the texture untouched', () => {
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) expect(edgePixel(0, x, y, TS)).toBe('');
  });
  it('exposed top: outline row, then light row; corners only round where two sides meet', () => {
    expect(edgePixel(EDGE_N, 5, 0, TS)).toBe('o');
    expect(edgePixel(EDGE_N, 5, 1, TS)).toBe('l');
    expect(edgePixel(EDGE_N, 0, 0, TS)).toBe('o');
    expect(edgePixel(EDGE_N | EDGE_W, 0, 0, TS)).toBe('x');
    expect(edgePixel(EDGE_N | EDGE_W, 1, 1, TS)).toBe('o');
  });
  it('exposed bottom and right get shade, not light (light from the top-left)', () => {
    expect(edgePixel(EDGE_S, 5, TS - 2, TS)).toBe('d');
    expect(edgePixel(EDGE_E, TS - 2, 5, TS)).toBe('d');
    expect(edgePixel(EDGE_S | EDGE_E, TS - 1, TS - 1, TS)).toBe('x');
  });
  it('every mask is symmetric under its mirror (W<->E) in shape', () => {
    const mirror = (m: number): number => (m & (EDGE_N | EDGE_S)) | (m & EDGE_E ? EDGE_W : 0) | (m & EDGE_W ? EDGE_E : 0);
    for (let m = 0; m < MASKS; m++) {
      for (let y = 0; y < TS; y++) {
        for (let x = 0; x < TS; x++) {
          const a = edgePixel(m, x, y, TS);
          const b = edgePixel(mirror(m), TS - 1 - x, y, TS);
          // Cut/outline shape mirrors exactly; light/shade swap sides by design.
          expect(a === 'x' || a === 'o').toBe(b === 'x' || b === 'o');
        }
      }
    }
  });
});

describe('atlas cells', () => {
  it('every block tile has opaque textures and distinct cells per mask and variant', () => {
    const cols = new Set<number>();
    for (let m = 0; m < MASKS; m++) for (let v = 0; v < VARIANTS; v++) cols.add(atlasCol(v, m));
    expect(cols.size).toBe(MASKS * VARIANTS);
    for (let id = 1; id < TILES.length; id++) {
      if (!isBlock(id)) continue;
      for (let v = 0; v < VARIANTS; v++) {
        const tex = tileTexture(id, v);
        expect(tex.length).toBe(TS * TS);
        expect(tex.every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
        const full = autotilePixels(id, v, MASKS - 1);
        expect(full.filter((c) => c === null).length).toBe(4); // 4 rounded corners
        expect(full[TS * 5]).toBe('#161a24'); // left outline
      }
    }
  });
  it('ores carry glints and metal has rivets or seams (material detail)', () => {
    expect(tileTexture(T.IRON, 0)).toContain('#fff6e8');
    expect(tileTexture(T.COPPER, 0)).toContain('#ffd0a0');
    expect(tileTexture(T.METAL, 0)).toContain('#8e98b0');
  });
  it('moss grows only on natural surface blocks and its strip fits the tile', () => {
    expect(growsMoss(T.RUST)).toBe(true);
    expect(growsMoss(T.PAD)).toBe(false);
    expect(growsMoss(T.SCAFFOLD)).toBe(false);
    for (let v = 0; v < VARIANTS; v++) {
      const px = mossPixels(v);
      expect(px.length).toBe(TS * MOSS_H);
      for (let x = 0; x < TS; x++) expect(px[x]).not.toBeNull();
    }
  });
});

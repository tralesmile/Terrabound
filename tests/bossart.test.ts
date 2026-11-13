import { describe, expect, it } from 'vitest';
import { BOSSES, type BossId } from '../src/sim/bosses';
import { BOSS_ART, BOSS_OUTLINE, animOffset, armAngle, plateSwing, slamRaise, bossArtSize, partPixels, shade, walkerRig, wyrmSegments, type PartShape } from '../src/render/bossart';

const IDS = Object.keys(BOSSES) as BossId[];

describe('boss art', () => {
  it('shade mixes toward white and black and stays valid hex', () => {
    expect(shade('#808080', 1)).toBe('#ffffff');
    expect(shade('#808080', -1)).toBe('#000000');
    expect(shade('#7a4a3a', 0.3)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('every part shape is outlined, filled and deterministic', () => {
    for (const shape of ['box', 'disc', 'diamond', 'spike'] as PartShape[]) {
      for (const style of ['scrap', 'vine', 'crystal', 'ice', 'ember', 'core'] as const) {
        const spec = { w: 20, h: 18, shape, base: '#5a7390', accent: '#e6f6ff', style, seed: 3 };
        const px = partPixels(spec);
        expect(px).toHaveLength(20 * 18);
        expect(partPixels(spec)).toEqual(px);
        const filled = px.filter(Boolean).length;
        expect(filled).toBeGreaterThan(40);
        // Every opaque pixel touching transparency or the frame edge is outline.
        for (let y = 0; y < 18; y++) {
          for (let x = 0; x < 20; x++) {
            const c = px[y * 20 + x];
            if (!c) continue;
            const open = (xx: number, yy: number): boolean => xx < 0 || yy < 0 || xx >= 20 || yy >= 18 || !px[yy * 20 + xx];
            if (open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1)) expect(c).toBe(BOSS_OUTLINE);
          }
        }
        // Shaded: at least 3 distinct interior colours (not a flat block).
        expect(new Set(px.filter((c) => c && c !== BOSS_OUTLINE)).size).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('every boss has art, and walker rigs stand on the ground inside a sane box', () => {
    for (const id of IDS) {
      expect(BOSS_ART[id]).toBeDefined();
      if (BOSSES[id].flying) continue;
      const { w, h } = bossArtSize(id);
      const rig = walkerRig(id);
      expect(rig.map((p) => p.key)).toEqual(expect.arrayContaining(['legL', 'legR', 'torso', 'head', 'armF', 'armB']));
      const legs = rig.filter((p) => p.key.startsWith('leg'));
      for (const l of legs) expect(l.y + l.spec.h).toBe(0);
      for (const p of rig) {
        expect(p.x).toBeGreaterThanOrEqual(-w);
        expect(p.x + p.spec.w).toBeLessThanOrEqual(w);
        expect(p.y).toBeGreaterThanOrEqual(-h * 1.4);
        expect(p.y + p.spec.h).toBeLessThanOrEqual(0);
      }
    }
  });

  it('walk cycle moves the legs in opposite phase and slam lifts the body', () => {
    const pose = { facing: 1, age: Math.PI / 12, flash: false, lift: 0, reach: 0, enraged: false, lookX: 1, lookY: 0 };
    const l = animOffset('legL', pose).dy;
    const r = animOffset('legR', pose).dy;
    expect(l === 0 || r === 0).toBe(true);
    expect(l + r).toBeLessThan(0);
    expect(animOffset('body', { ...pose, lift: 6 }).dy).toBeLessThan(animOffset('body', pose).dy);
    expect(animOffset('armFront', { ...pose, reach: 8 }).dx).toBeGreaterThan(animOffset('armFront', pose).dx);
  });

  it('wyrm segments shrink toward the tail', () => {
    const segs = wyrmSegments('wyrm');
    expect(segs.length).toBeGreaterThan(4);
    for (let i = 2; i < segs.length; i++) expect(segs[i].w).toBeLessThanOrEqual(segs[i - 1].w);
  });

  it('Colossus art pass: fists ride the arms, a loose plate dangles, other walkers stay plain', () => {
    const rig = walkerRig('colossus');
    const keys = rig.map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(['fistF', 'fistB', 'plate']));
    expect(rig.find((p) => p.key === 'fistF')?.arm).toBe('armF');
    expect(rig.find((p) => p.key === 'fistB')?.arm).toBe('armB');
    expect(rig.find((p) => p.key === 'plate')?.dangle).toBe(true);
    // Draw order: back arm and its fist first, the front fist last (in front of the front arm).
    expect(keys.indexOf('fistB')).toBe(keys.indexOf('armB') + 1);
    expect(keys.indexOf('fistF')).toBe(keys.indexOf('armF') + 1);
    expect(keys.indexOf('fistF')).toBeGreaterThan(keys.indexOf('head'));
    for (const id of ['golem', 'titan'] as BossId[]) expect(walkerRig(id).some((p) => p.arm || p.dangle)).toBe(false);
  });

  it('slam raises both arms overhead over the warning and holds them while airborne', () => {
    expect(slamRaise(null, 0, 0.7)).toBe(0);
    expect(slamRaise('charge', -0.3, 0.7)).toBe(0);
    expect(slamRaise('slam', -0.7, 0.7)).toBe(0);
    const mid = slamRaise('slam', -0.35, 0.7);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(slamRaise('slam', -0.05, 0.7)).toBeGreaterThan(0.9);
    expect(slamRaise('slam', 0.2, 0.7)).toBe(1);
    const pose = { facing: 1, age: 1, flash: false, lift: 0, reach: 0, enraged: false, lookX: 1, lookY: 0 };
    const rest = armAngle('armFront', pose);
    const up = armAngle('armFront', { ...pose, raise: 1 });
    expect(Math.abs(rest)).toBeLessThan(0.1);
    expect(up).toBeLessThan(-2.5);
    expect(armAngle('armBack', { ...pose, raise: 1 })).toBeLessThan(-2.2);
    // The plate keeps swinging and jolts further when the body lifts.
    expect(plateSwing({ ...pose, age: 0 })).toBeCloseTo(0, 5);
    expect(plateSwing({ ...pose, age: 0, lift: 6 })).toBeGreaterThan(0.3);
  });
});

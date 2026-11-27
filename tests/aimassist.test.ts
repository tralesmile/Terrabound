import { describe, expect, it } from 'vitest';
import { AIM_ASSIST, pickTarget, type AimQuery, type AimTarget } from '../src/sim/aimassist';
import { padAssist } from '../src/platform/padmap';

const query = (over: Partial<AimQuery> = {}): AimQuery => ({ ox: 0, oy: 0, dx: 1, dy: 0, finger: null, cone: AIM_ASSIST.cone, sees: () => true, ...over });
const at = (id: number, x: number, y: number): AimTarget => ({ id, x, y });

describe('pistol aim assist', () => {
  it('locks the enemy under or beside a finger, even off the aim line', () => {
    expect(pickTarget(query({ finger: { x: 5, y: -3 } }), [at(1, 8, 0), at(2, 6, -3.5)])?.id).toBe(2);
  });
  it('otherwise takes the smallest angle inside the cone', () => {
    expect(pickTarget(query(), [at(1, 6, 1.5), at(2, 9, 0.5)])?.id).toBe(2);
    expect(pickTarget(query(), [at(1, 6, 4)])).toBeNull();
  });
  it('ignores targets out of range, behind or behind a wall', () => {
    expect(pickTarget(query(), [at(1, AIM_ASSIST.range + 1, 0)])).toBeNull();
    expect(pickTarget(query(), [at(1, -5, 0)])).toBeNull();
    expect(pickTarget(query({ sees: (x) => x < 4 }), [at(1, 6, 0)])).toBeNull();
    expect(pickTarget(query({ sees: (x) => x > 7 }), [at(1, 6, 0), at(2, 9, 0.6)])?.id).toBe(2);
  });
  it('the cone wraps cleanly when aiming left', () => {
    expect(pickTarget(query({ dx: -1 }), [at(1, -6, -0.5)])?.id).toBe(1);
    expect(pickTarget(query({ dx: -1 }), [at(1, -6, 0.5)])?.id).toBe(1);
  });
  it('a controller at rest gets a wide cone and level shots; a tilted stick a narrow one', () => {
    expect(padAssist({ right: { x: 0, y: 0 }, vert: 0 })).toEqual({ cone: AIM_ASSIST.restCone, level: true });
    expect(padAssist({ right: { x: 0, y: 0 }, vert: -1 }).level).toBe(false);
    expect(padAssist({ right: { x: 1, y: 0 }, vert: 0 })).toEqual({ cone: AIM_ASSIST.cone, level: false });
  });
});

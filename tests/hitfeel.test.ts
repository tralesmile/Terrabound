import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, HITSTOP } from '../src/sim/game';
import { HIT_FEEL, type HitClass } from '../src/sim/hitfeel';
import { makeEnemy } from '../src/sim/enemies';
import { defaultSave } from '../src/sim/save';
import { SHAKE_PX, shakeNoise, traumaOffset } from '../src/render/trauma';
import { DEFAULT_PREFS, shakeMul } from '../src/sim/settings';

const deepGame = () => {
  const g = new Game(defaultSave());
  g.body.y = g.world.padY + 10;
  return g;
};

describe('hit feel table', () => {
  it('melee keeps the classic feel; ranged is lighter; blasts are heaviest', () => {
    expect(HIT_FEEL.melee.stop).toBe(HITSTOP);
    expect(HIT_FEEL.ranged.stop).toBeLessThan(HIT_FEEL.melee.stop);
    expect(HIT_FEEL.ranged.knock).toBeLessThan(HIT_FEEL.melee.knock);
    expect(HIT_FEEL.blast.trauma).toBeGreaterThan(HIT_FEEL.melee.trauma);
    for (const k of Object.keys(HIT_FEEL) as HitClass[]) {
      expect(HIT_FEEL[k].stop).toBeLessThanOrEqual(0.1);
      expect(HIT_FEEL[k].trauma).toBeLessThanOrEqual(0.5);
    }
  });

  it('base defences and summons never freeze the game or shake the screen', () => {
    for (const k of ['defence', 'summon'] as HitClass[]) {
      expect(HIT_FEEL[k].stop).toBe(0);
      expect(HIT_FEEL[k].trauma).toBe(0);
    }
  });

  it('damageEnemy applies the class: stop, knock, lift and the class on the event', () => {
    for (const cls of ['melee', 'ranged', 'blast', 'defence'] as HitClass[]) {
      const g = deepGame();
      g.drainEvents();
      const e = makeEnemy(1, 'crawler', g.body.x + 2, g.body.y);
      g.enemies = [e];
      g.damageEnemy(e, 1, 1, cls);
      expect(g.hitStop).toBe(HIT_FEEL[cls].stop);
      expect(e.vx).toBe(HIT_FEEL[cls].knock);
      expect(e.vy).toBe(-HIT_FEEL[cls].lift);
      const ev = g.drainEvents().find((x) => x.t === 'enemyhit');
      expect(ev && ev.t === 'enemyhit' ? ev.cls : null).toBe(cls);
    }
  });

  it('the legacy boolean still works (false = a defence hit with no freeze)', () => {
    const g = deepGame();
    const e = makeEnemy(1, 'crawler', g.body.x + 2, g.body.y);
    g.enemies = [e];
    g.damageEnemy(e, 1, -1, false);
    expect(g.hitStop).toBe(0);
    expect(e.vx).toBe(-HIT_FEEL.defence.knock);
  });

  it('hit-stop freezes attacker and target together (the whole sim)', () => {
    const g = deepGame();
    const e = makeEnemy(1, 'crawler', g.body.x + 3, g.body.y);
    g.enemies = [e];
    g.damageEnemy(e, 1, 1, 'blast');
    const ex = e.x;
    const px = g.body.x;
    g.step(FIXED_DT, { moveX: 1, jump: false, dig: false, place: false, aim: null });
    expect(e.x).toBe(ex);
    expect(g.body.x).toBe(px);
  });
});

describe('trauma shake', () => {
  it('is trauma squared: half trauma gives a quarter of the shake budget', () => {
    expect(traumaOffset(0, 1.3, 1)).toEqual({ x: 0, y: 0 });
    let full = 0;
    let half = 0;
    for (let i = 0; i < 400; i++) {
      full = Math.max(full, Math.abs(traumaOffset(1, i * 0.013, 1).x));
      half = Math.max(half, Math.abs(traumaOffset(0.5, i * 0.013, 1).x));
    }
    expect(full).toBeLessThanOrEqual(SHAKE_PX);
    expect(full).toBeGreaterThan(SHAKE_PX * 0.5);
    expect(half / full).toBeCloseTo(0.25, 1);
  });

  it('the shake setting scales it and "off" (0) removes it', () => {
    expect(traumaOffset(1, 0.7, 0)).toEqual({ x: 0, y: 0 });
    const a = traumaOffset(1, 0.7, 1);
    const b = traumaOffset(1, 0.7, 0.45);
    expect(b.x).toBeCloseTo(a.x * 0.45);
  });

  it('noise is smooth frame to frame (no white-noise jitter) and bounded', () => {
    for (let i = 0; i < 500; i++) {
      const t = i / 240;
      const n = shakeNoise(t, 1);
      expect(Math.abs(n)).toBeLessThanOrEqual(1);
      expect(Math.abs(shakeNoise(t + 1 / 240, 1) - n)).toBeLessThan(0.5);
    }
  });

  it('the OS reduce-motion preference caps shake at low but never raises it', () => {
    const full = { ...DEFAULT_PREFS, shake: 2 };
    expect(shakeMul(full)).toBe(1);
    expect(shakeMul(full, true)).toBe(0.45);
    expect(shakeMul({ ...DEFAULT_PREFS, shake: 0 }, true)).toBe(0);
  });
});

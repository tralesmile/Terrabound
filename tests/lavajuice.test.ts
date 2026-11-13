import { describe, expect, it } from 'vitest';
import { FIXED_DT, Game, LAVA_HOP, NO_CONTROLS, SCORCH_T } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';
import { T } from '../src/sim/tiles';
import { charColor, charRemap, emberAt, scorchK } from '../src/render/scorchfx';
import { lavafallColumn } from '../src/sim/structures';

/** A sealed bedrock tank of magma 4 deep, high in the sky so nothing else interferes. */
function magmaTank(g: Game): { x: number; top: number } {
  const x = g.world.padX + 30;
  const top = 10;
  for (let y = top - 6; y <= top + 5; y++) for (let dx = -3; dx <= 3; dx++) g.world.set(x + dx, y, T.AIR);
  for (let y = top; y <= top + 4; y++) {
    g.world.set(x - 3, y, T.BEDROCK);
    g.world.set(x + 3, y, T.BEDROCK);
  }
  for (let dx = -3; dx <= 3; dx++) g.world.set(x + dx, top + 4, T.BEDROCK);
  for (let y = top; y < top + 4; y++) for (let dx = -2; dx <= 2; dx++) g.world.set(x + dx, y, T.MAGMA);
  return { x, top };
}

describe('lava contact juice', () => {
  it('a magma burn hurts, chars the suit, sizzles and kicks the body up', () => {
    const g = new Game(defaultSave());
    const { x, top } = magmaTank(g);
    g.body.x = x + 0.5;
    g.body.y = top + 3;
    g.body.vx = g.body.vy = 0;
    const hp = g.hp;
    let sizzles = 0;
    let minVy = 0;
    for (let i = 0; i < 4; i++) {
      g.step(FIXED_DT, NO_CONTROLS);
      for (const e of g.drainEvents()) if (e.t === 'sizzle') sizzles++;
      minVy = Math.min(minVy, g.body.vy);
    }
    expect(g.hp).toBeLessThan(hp);
    expect(sizzles).toBeGreaterThanOrEqual(1);
    expect(g.scorch).toBeGreaterThan(SCORCH_T - 0.2);
    expect(minVy).toBeLessThanOrEqual(-LAVA_HOP + 1);
  });

  it('the char fades after leaving the heat', () => {
    const g = new Game(defaultSave());
    const { x, top } = magmaTank(g);
    g.body.x = x + 0.5;
    g.body.y = top + 3;
    g.step(FIXED_DT, NO_CONTROLS);
    expect(g.scorch).toBeGreaterThan(0);
    // Out of the pool onto the pad.
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.surface[g.world.padX] - 0.01;
    g.body.vy = 0;
    for (let t = 0; t < SCORCH_T + 0.2; t += FIXED_DT) g.step(FIXED_DT, NO_CONTROLS);
    expect(g.scorch).toBe(0);
  });

  it('acid still burns but does not char or hop', () => {
    const g = new Game(defaultSave());
    const { x, top } = magmaTank(g);
    for (let y = top; y < top + 4; y++) for (let dx = -2; dx <= 2; dx++) g.world.set(x + dx, y, T.ACID_POOL);
    g.body.x = x + 0.5;
    g.body.y = top + 3;
    g.body.vy = 0;
    const hp = g.hp;
    const ev: string[] = [];
    for (let i = 0; i < 4; i++) {
      g.step(FIXED_DT, NO_CONTROLS);
      for (const e of g.drainEvents()) ev.push(e.t);
    }
    expect(g.hp).toBeLessThan(hp);
    expect(g.scorch).toBe(0);
    expect(ev).not.toContain('sizzle');
  });

  it('a lavafall chars and sizzles without a hop', () => {
    const g = new Game(defaultSave());
    const s = g.world.structures.find((st) => st.kind === 'lavafall')!;
    const col = lavafallColumn(s);
    let sizzle = false;
    for (let i = 0; i < 6; i++) {
      g.body.x = col + 0.5;
      g.body.y = s.y1 - 2;
      g.body.vy = 0;
      g.step(FIXED_DT, NO_CONTROLS);
      for (const e of g.drainEvents()) if (e.t === 'sizzle') sizzle = true;
    }
    expect(sizzle).toBe(true);
    expect(g.scorch).toBeGreaterThan(0);
  });
});

describe('charred suit look', () => {
  it('scorchK is full while burning and fades over the last 0.4 s', () => {
    expect(scorchK(0)).toBe(0);
    expect(scorchK(-1)).toBe(0);
    expect(scorchK(SCORCH_T)).toBe(1);
    expect(scorchK(0.2)).toBeCloseTo(0.5);
  });

  it('charColor darkens toward soot and leaves k = 0 alone', () => {
    expect(charColor('#e8a33d', 0)).toBe('#e8a33d');
    const lum = (h: string): number => [1, 3, 5].reduce((a, i) => a + parseInt(h.slice(i, i + 2), 16), 0);
    expect(lum(charColor('#e8a33d', 1))).toBeLessThan(lum('#e8a33d') * 0.5);
    expect(lum(charColor('#e8a33d', 0.5))).toBeLessThan(lum('#e8a33d'));
    expect(charColor('red', 1)).toBe('red');
  });

  it('charRemap covers every palette key and keeps the gear remap', () => {
    const out = charRemap({ a: '#ffffff', b: '#000000' }, { a: '#ff0000', c: '#00ff00' }, 1);
    expect(Object.keys(out).sort()).toEqual(['a', 'b', 'c']);
    expect(out.a).toBe(charColor('#ff0000', 1));
  });

  it('embers glow on a small, stable, flickering share of pixels', () => {
    let lit = 0;
    let n = 0;
    for (let r = 0; r < 24; r++) {
      for (let c = 0; c < 16; c++) {
        n++;
        if (emberAt(r, c, 3, 1)) lit++;
        expect(emberAt(r, c, 3, 1)).toBe(emberAt(r, c, 3, 1));
        expect(emberAt(r, c, 3, 0)).toBeNull();
      }
    }
    expect(lit / n).toBeGreaterThan(0.04);
    expect(lit / n).toBeLessThan(0.2);
    let changed = 0;
    for (let r = 0; r < 24; r++) for (let c = 0; c < 16; c++) if (emberAt(r, c, 3, 1) !== emberAt(r, c, 4, 1)) changed++;
    expect(changed).toBeGreaterThan(0);
  });
});

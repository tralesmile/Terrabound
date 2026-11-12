import { describe, expect, it } from 'vitest';
import { Fx } from '../src/render/fx';

describe('floating text (render)', () => {
  it('repeat pickups of one item merge into a running count', () => {
    const fx = new Fx();
    fx.pickup(10, 5, 'glowcorn', 'Glowcorn', '#ff0');
    fx.pickup(10.3, 5, 'glowcorn', 'Glowcorn', '#ff0');
    fx.pickup(10.6, 5.2, 'glowcorn', 'Glowcorn', '#ff0');
    expect(fx.texts.length).toBe(1);
    expect(fx.texts[0].text).toBe('+3 Glowcorn');
  });

  it('different items close together stack instead of overprinting', () => {
    const fx = new Fx();
    fx.pickup(10, 5, 'glowcorn', 'Glowcorn', '#ff0');
    fx.pickup(10.2, 5, 'corn_seed', 'Glowcorn seed', '#0f0');
    expect(fx.texts.length).toBe(2);
    expect(Math.abs(fx.texts[0].y - fx.texts[1].y)).toBeGreaterThanOrEqual(0.5);
  });

  it('far apart or old labels do not merge', () => {
    const fx = new Fx();
    fx.pickup(10, 5, 'rust', 'Rust', '#f80');
    fx.pickup(30, 5, 'rust', 'Rust', '#f80');
    expect(fx.texts.length).toBe(2);
    fx.update(0.8);
    fx.pickup(10, 4, 'rust', 'Rust', '#f80');
    expect(fx.texts.filter((t) => t.text === '+1 Rust').length).toBe(3);
  });

  it('plain numbers still stack when they land on the same spot', () => {
    const fx = new Fx();
    fx.text(3, 3, '12', '#fff');
    fx.text(3, 3, '12', '#fff');
    expect(fx.texts[1].y).toBeLessThan(fx.texts[0].y - 0.5);
  });
});

import { describe, it, expect } from 'vitest';
import { toastLayout } from '../src/ui/ui';

describe('toast layout', () => {
  it('keeps toasts centred under the bars on wide screens', () => {
    const u = 20;
    const w = 1280;
    const bx = w - u * 5.2 - u;
    const l = toastLayout(w, u, bx, 300, 120);
    expect(l.y).toBe(120);
    // The centred box stays left of the button column.
    expect(w / 2 + l.maxW / 2).toBeLessThanOrEqual(bx);
  });
  it('moves toasts below the button column on phones', () => {
    const u = 15;
    const w = 390;
    const bx = w - u * 5.2 - u;
    const l = toastLayout(w, u, bx, 180, 90);
    expect(l.y).toBeGreaterThan(180);
    expect(l.maxW).toBe(w - u * 2);
  });
  it('never moves toasts up', () => {
    const l = toastLayout(390, 15, 300, 10, 90);
    expect(l.y).toBe(90);
  });
});

describe('toast stacking', () => {
  it('a repeated message refreshes instead of stacking', async () => {
    const { UI } = await import('../src/ui/ui');
    const ui = new UI();
    ui.toast('Mining drill');
    ui.update(1);
    ui.toast('Mining drill');
    expect(ui.toasts.length).toBe(1);
    expect(ui.toasts[0].life).toBeCloseTo(2.4);
    ui.toast('Other');
    expect(ui.toasts.length).toBe(2);
  });
});

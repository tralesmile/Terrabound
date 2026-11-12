import { describe, it, expect } from 'vitest';
import { toastColumn, toastKind, toastParts, toastSlide, wrapText } from '../src/ui/toastfx';

describe('toast column', () => {
  it('sits left-aligned under the HUD and stops short of the button column on wide screens', () => {
    const u = 20;
    const w = 1280;
    const bx = w - u * 5.2 - u;
    const l = toastColumn(u, u, bx, 120);
    expect(l.x).toBe(u);
    expect(l.y).toBe(120);
    expect(l.x + l.maxW).toBeLessThanOrEqual(bx);
  });
  it('fits left of the button column on a phone', () => {
    const u = 15;
    const w = 390;
    const bx = w - u * 5.2 - u;
    const l = toastColumn(u, u, bx, 90);
    expect(l.x + l.maxW).toBeLessThanOrEqual(bx - u);
    expect(l.maxW).toBeGreaterThan(u * 10);
  });
});

describe('toast parts', () => {
  it('splits a short prefix into a head label', () => {
    expect(toastParts('Discovered: Crystal Flats')).toEqual({ kind: 'discover', head: 'DISCOVERED', body: 'Crystal Flats' });
    expect(toastParts('Codex reward: 2 Crystal').head).toBe('CODEX REWARD');
  });
  it('keeps one-part toasts whole', () => {
    expect(toastParts('Pack full! Return to the pad')).toEqual({ kind: 'warn', head: '', body: 'Pack full! Return to the pad' });
  });
  it('does not split on a late colon', () => {
    expect(toastParts('Your farm grew while you were away: 3 crops').head).toBe('');
  });
  it('picks a kind per message family', () => {
    expect(toastKind('New personal best on 1MVE: depth!')).toBe('record');
    expect(toastKind('RAID! 3 raiders from the west')).toBe('danger');
    expect(toastKind('Banked 12 items')).toBe('reward');
    expect(toastKind('Battery low!')).toBe('warn');
    expect(toastKind('Back at the pad')).toBe('home');
    expect(toastKind('Dawn breaks')).toBe('info');
  });
});

describe('toast wrap and slide', () => {
  const m = (s: string): number => s.length;
  it('wraps greedily into at most two lines', () => {
    expect(wrapText('aa bb cc dd', 5, m)).toEqual(['aa bb', 'cc dd']);
    expect(wrapText('aa bb cc dd ee ff', 5, m)).toEqual(['aa bb', 'cc dd ee ff']);
    expect(wrapText('short', 50, m)).toEqual(['short']);
    expect(wrapText('', 50, m)).toEqual([]);
  });
  it('slides in from the left in under 0.2 s', () => {
    expect(toastSlide(0)).toBe(1);
    expect(toastSlide(0.09)).toBeGreaterThan(0);
    expect(toastSlide(0.2)).toBe(0);
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
  it('a toast in a group replaces the older line of that group', async () => {
    const { UI } = await import('../src/ui/ui');
    const ui = new UI();
    ui.toast('Raid repelled!', '#fff', 4, 'raid');
    ui.toast('Dawn breaks');
    ui.toast('RAID! 3 raiders', '#fff', 4, 'raid');
    expect(ui.toasts.map((t) => t.text)).toEqual(['Dawn breaks', 'RAID! 3 raiders']);
  });
  it('never shows more than TOAST_MAX lines', async () => {
    const { UI, TOAST_MAX } = await import('../src/ui/ui');
    const ui = new UI();
    for (let i = 0; i < 8; i++) ui.toast(`line ${i}`);
    expect(ui.toasts.length).toBe(TOAST_MAX);
    expect(ui.toasts[TOAST_MAX - 1].text).toBe('line 7');
  });
});

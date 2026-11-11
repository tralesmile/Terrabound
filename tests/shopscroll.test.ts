import { describe, it, expect } from 'vitest';
import { clampScroll, SHOP_VISIBLE, UI } from '../src/ui/ui';
import { RECIPES } from '../src/sim/recipes';
import { UPGRADES } from '../src/sim/upgrades';

describe('shop scrolling', () => {
  it('clamps offsets into the valid window', () => {
    expect(clampScroll(-5, 20)).toBe(0);
    expect(clampScroll(99, 20)).toBe(20 - SHOP_VISIBLE);
    expect(clampScroll(3, 5)).toBe(0);
    expect(clampScroll(NaN, 20)).toBe(0);
  });
  it('scrolls the current tab and resets on tab change', () => {
    const ui = new UI();
    ui.setShopTab('fab');
    ui.scrollShop(100);
    expect(ui.shopScroll).toBe(Math.max(0, RECIPES.length - SHOP_VISIBLE));
    ui.setShopTab('upgrades');
    expect(ui.shopScroll).toBe(0);
    ui.scrollShop(100);
    expect(ui.shopScroll).toBe(Math.max(0, UPGRADES.length - SHOP_VISIBLE));
    ui.scrollShop(-100);
    expect(ui.shopScroll).toBe(0);
  });
});

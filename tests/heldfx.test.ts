import { describe, expect, it } from 'vitest';
import { heldArt, outlinePixels } from '../src/render/heldfx';
import { RARITY } from '../src/sim/rarity';
import { iconDef } from '../src/render/icons';

describe('held weapon art', () => {
  it('the blade and pistol slots show the equipped weapon, other tools draw themselves', () => {
    const none = (): undefined => undefined;
    expect(heldArt('blade', 'plasma_axe', 'rail_rifle', none, 0).icon).toBe('plasma_axe');
    expect(heldArt('pistol', 'plasma_axe', 'rail_rifle', none, 0).icon).toBe('rail_rifle');
    expect(heldArt('drill', 'plasma_axe', 'rail_rifle', none, 0).icon).toBe('drill');
    expect(heldArt('blade', undefined, undefined, none, 0).icon).toBe('blade');
    // The weapon icon is the blade shape recoloured in the axe's own colour.
    expect(iconDef('plasma_axe').pal.a).toBe('#ff7a3c');
  });

  it('common weapons have no rim; rare is a steady rim, epic pulses in the epic colour', () => {
    expect(heldArt('blade', 'plasma_axe', undefined, () => 'sharp', 0).rim).toBeUndefined();
    const r = heldArt('blade', 'plasma_axe', undefined, () => 'brutal', 0);
    expect(r.rim).toBe(RARITY.rare.color);
    expect(heldArt('blade', 'plasma_axe', undefined, () => 'brutal', 1).rimAlpha).toBe(r.rimAlpha);
    const e0 = heldArt('pistol', undefined, 'rail_rifle', () => 'piercing', 0);
    const e1 = heldArt('pistol', undefined, 'rail_rifle', () => 'piercing', 0.3);
    expect(e0.rim).toBe(RARITY.epic.color);
    expect(e1.rimAlpha).not.toBeCloseTo(e0.rimAlpha);
    expect(Math.min(e0.rimAlpha, e1.rimAlpha)).toBeGreaterThan(0.15);
  });

  it('the rim hugs the shape: next to a drawn pixel, never on one', () => {
    const rows = ['    ', ' oo ', ' oo ', '    '];
    const px = outlinePixels(rows, 4);
    // A 2x2 block has 8 edge neighbours (no diagonals).
    expect(px.length).toBe(8);
    for (const p of px) expect(rows[p.r]?.[p.c] ?? ' ').toBe(' ');
    expect(outlinePixels(iconDef('blade').rows, 12).length).toBeGreaterThan(10);
  });
});

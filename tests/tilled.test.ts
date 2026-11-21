import { describe, expect, it } from 'vitest';
import { T } from '../src/sim/tiles';
import { World } from '../src/sim/world';
import { TILLED_MUL, WET_MUL, growMul, harvestYield, plantCrop, ripeIn, tillUnder } from '../src/sim/farming';

const dry = (): boolean => false;
function field(below: number): World {
  const w = new World(30, 30, 1);
  w.set(10, 11, below);
  return w;
}

describe('tilled soil', () => {
  it('tills plain soil under a crop once, and leaves built blocks and ore alone', () => {
    const w = field(T.SOIL);
    expect(tillUnder(w, 10, 10)).toBe(true);
    expect(w.get(10, 11)).toBe(T.TILLED);
    expect(tillUnder(w, 10, 10)).toBe(false);
    const m = field(T.METAL);
    expect(tillUnder(m, 10, 10)).toBe(false);
    expect(m.get(10, 11)).toBe(T.METAL);
  });
  it('grows faster than plain soil and stacks with water', () => {
    const plain = field(T.SOIL);
    plantCrop(plain, 10, 10, 'glowcorn');
    const tilled = field(T.SOIL);
    tillUnder(tilled, 10, 10);
    plantCrop(tilled, 10, 10, 'glowcorn');
    expect(growMul(plain, 10, 10, dry)).toBe(1);
    expect(growMul(tilled, 10, 10, dry)).toBe(TILLED_MUL);
    expect(growMul(tilled, 10, 10, () => true)).toBe(TILLED_MUL * WET_MUL);
    expect(ripeIn(tilled, 10, 10, dry)).toBeLessThan(ripeIn(plain, 10, 10, dry));
  });
  it('a ripe crop on tilled soil gives one more produce', () => {
    const a = harvestYield(T.CORN_3, 3, 4, 7, false)[0];
    const b = harvestYield(T.CORN_3, 3, 4, 7, true)[0];
    expect(b.n).toBe(a.n + 1);
  });
});

import { BAIT_BITE_MUL, FOOD, catchFor } from '../src/sim/fishing';
import { recipeById } from '../src/sim/recipes';

describe('bait', () => {
  it('is craftable and a baited cast never brings up junk', () => {
    expect(recipeById('bait')?.out).toBe('bait');
    for (let c = 0; c < 400; c++) {
      const got = catchFor(5, c, 10, false, false, true);
      expect(['lunker', 'glowfish', 'fish', 'crystal']).toContain(got.item);
    }
  });
  it('baited casts land lunkers now and then, and unbaited ones never do', () => {
    let lunkers = 0;
    let plain = 0;
    for (let c = 0; c < 800; c++) {
      if (catchFor(5, c, 10, false, false, true).item === 'lunker') lunkers++;
      if (catchFor(5, c, 10, false, false, false).item === 'lunker') plain++;
    }
    expect(lunkers).toBeGreaterThan(40);
    expect(plain).toBe(0);
    expect(FOOD.lunker?.hp).toBe(80);
    expect(BAIT_BITE_MUL).toBeLessThan(1);
  });
});

import { CROPS, MEAL_BUFF, cropOfSeed, grassSeed } from '../src/sim/farming';
import { B } from '../src/sim/biomes';

describe('ashpepper and ember curry', () => {
  it('Ash Dunes grass gives pepper seeds, and the crop is a full crop', () => {
    expect(CROPS.ashpepper.seed).toBe('pepper_seed');
    expect(cropOfSeed('pepper_seed')).toBe('ashpepper');
    let got = 0;
    for (let x = 0; x < 300; x++) if (grassSeed(B.ASH, x, 9, 3) === 'pepper_seed') got++;
    expect(got).toBeGreaterThan(40);
  });
  it('the curry is a pot meal with a buff, made from farm produce and a fish', () => {
    const r = recipeById('curry');
    expect(r?.pot).toBe(true);
    expect(Object.keys(r?.cost ?? {}).sort()).toEqual(['ashpepper', 'fish', 'rustroot']);
    expect(MEAL_BUFF.curry).toBe('sturdy');
    expect(FOOD.curry?.hp).toBeGreaterThan(FOOD.stew?.hp ?? 99);
  });
});

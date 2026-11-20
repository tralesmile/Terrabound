import { describe, expect, it } from 'vitest';
import { BLAST_JUMP, blastPush } from '../src/sim/blastjump';
import { BOMB_RADIUS, FIXED_DT, Game, NO_CONTROLS } from '../src/sim/game';
import { defaultSave } from '../src/sim/save';

describe('blast jump', () => {
  it('a bomb at your feet launches you higher than a jump; the push fades with distance', () => {
    const feet = blastPush(0, -0.9, BOMB_RADIUS)!;
    expect(-feet.vy).toBeGreaterThan(12);
    const near = blastPush(1, -0.5, BOMB_RADIUS)!;
    const far = blastPush(2.5, -0.5, BOMB_RADIUS)!;
    expect(Math.abs(near.vx)).toBeGreaterThan(Math.abs(far.vx));
    expect(near.vx).toBeGreaterThan(0);
    expect(blastPush(-1, -0.5, BOMB_RADIUS)!.vx).toBeLessThan(0);
    expect(blastPush(BOMB_RADIUS + BLAST_JUMP.margin + 0.1, 0, BOMB_RADIUS)).toBeNull();
  });

  it('a blast above you pushes down, not up', () => {
    expect(blastPush(0, 1.5, BOMB_RADIUS)!.vy).toBeGreaterThan(0);
  });

  it("the player's own bomb launches them and does not hurt them; a meteor crater does not launch", () => {
    const g = new Game(defaultSave());
    g.body.y = g.world.padY + 10;
    g.body.vy = 0;
    const hp = g.hp;
    g.explode(g.body.x, g.body.y, 20, BOMB_RADIUS, true);
    expect(g.body.vy).toBeLessThan(-12);
    expect(g.hp).toBe(hp);
    g.step(FIXED_DT, NO_CONTROLS);
    const m = new Game(defaultSave());
    m.body.y = m.world.padY + 10;
    m.body.vy = 0;
    m.explode(m.body.x, m.body.y, 10, 1.4);
    expect(m.body.vy).toBe(0);
  });
});

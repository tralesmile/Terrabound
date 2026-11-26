import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/game';
import { QUESTS, QUEST_NPCS, activeQuest, deliverQuest, questMemory, questReady, sanitizeQuests, type QuestLog } from '../src/sim/quests';
import { SOURCES } from '../src/sim/sources';
import { trackerFor, validPin } from '../src/sim/tracker';
import { restockKit } from '../src/sim/kit';
import { RECIPES } from '../src/sim/recipes';
import { TRADES, npcLine } from '../src/sim/npcs';
import { ITEMS, invTotal, type Inventory, type ItemId } from '../src/sim/tiles';
import { SAVE_VERSION, defaultSave, parseSave, serializeSave } from '../src/sim/save';

describe('robot quests', () => {
  it('every robot has three quests with a two-line story', () => {
    for (const npc of QUEST_NPCS) {
      expect(QUESTS[npc].length).toBe(3);
      for (const q of QUESTS[npc]) {
        // Two icon columns in the workshop row.
        expect(Object.keys(q.need).length).toBeLessThanOrEqual(2);
        for (const line of [q.ask, q.done]) expect(line.length).toBeLessThanOrEqual(70);
      }
    }
  });

  it('asks only for bankable materials whose source is written down', () => {
    for (const npc of QUEST_NPCS) {
      for (const q of QUESTS[npc]) {
        for (const id of Object.keys(q.need) as ItemId[]) {
          expect(ITEMS[id].kit).toBeFalsy();
          expect(SOURCES[id], id).toBeTruthy();
        }
      }
    }
  });

  it('knows when a delivery is ready and remembers the latest finished one', () => {
    const log: QuestLog = {};
    expect(questReady(log, 'trader', { iron_scrap: 11 })).toBe(false);
    expect(questReady(log, 'trader', { iron_scrap: 12 })).toBe(true);
    expect(questMemory(log, 'trader')).toBeNull();
    deliverQuest(log, 'trader', { iron_scrap: 12 });
    expect(questMemory(log, 'trader')).toBe(QUESTS.trader[0].done);
    log.trader = 3;
    expect(questReady(log, 'trader', { crystal: 999, metal: 999, copper_wire: 999, iron_scrap: 999 })).toBe(false);
    expect(questMemory(log, 'trader')).toBe(QUESTS.trader[2].done);
  });

  it('a robot brings up the memory every third line, and only a robot that lives here is ever ready', () => {
    const said = [0, 6, 12, 18, 24, 30].map((t) => npcLine('trader', t, 'content', 'I remember.'));
    expect(said.filter((s) => s === 'I remember.')).toHaveLength(2);
    expect(npcLine('trader', 6)).not.toBe('I remember.');
    const g = new Game(defaultSave(7));
    g.stash.iron_scrap = 99;
    expect(g.questReady('trader')).toBe(false);
    expect(g.questReady('merchant')).toBe(false);
  });

  it('delivers in order, pays from the stash and stops after three', () => {
    const log: QuestLog = {};
    const stash: Inventory = { iron_scrap: 11 };
    expect(deliverQuest(log, 'trader', stash)).toBeNull();
    expect(stash.iron_scrap).toBe(11);
    stash.iron_scrap = 12;
    expect(deliverQuest(log, 'trader', stash)?.title).toBe('Open for business');
    expect(stash.iron_scrap ?? 0).toBe(0);
    expect(stash.copper_wire).toBe(4);
    stash.copper_wire = 10;
    stash.crystal = 8;
    stash.metal = 16;
    deliverQuest(log, 'trader', stash);
    deliverQuest(log, 'trader', stash);
    expect(log.trader).toBe(3);
    expect(activeQuest(log, 'trader')).toBeNull();
    expect(deliverQuest(log, 'trader', stash)).toBeNull();
  });

  it('needs the robot to live in the base', () => {
    const g = new Game(defaultSave());
    g.stash.iron_scrap = 20;
    expect(g.deliverQuest('trader')).toBe(false);
    expect(g.stash.iron_scrap).toBe(20);
  });

  it('sanitizes tampered logs', () => {
    expect(sanitizeQuests({ trader: 99, medic: -1, gunsmith: 1.7, scientist: 'x', merchant: 2 })).toEqual({ trader: 3, gunsmith: 1 });
    expect(sanitizeQuests(null)).toEqual({});
  });
});

describe('tracked goal', () => {
  it('every recipe and trade ingredient has a source line, or is crafted kit', () => {
    const asked = [...RECIPES.map((r) => r.cost), ...TRADES.map((t) => t.give)];
    for (const cost of asked) for (const id of Object.keys(cost) as ItemId[]) if (!ITEMS[id].kit) expect(SOURCES[id], id).toBeTruthy();
  });

  it('counts pack plus stash, names the first missing source, then asks to bank', () => {
    const t = trackerFor('r:torch', {}, { rust: 1 }, { rust: 1 });
    expect(t?.rows.map((r) => `${r.item}:${r.have}/${r.need}`)).toEqual(['rust:2/2', 'iron_scrap:0/1']);
    expect(t?.ready).toBe(false);
    expect(t?.hint).toContain('iron seams');
    expect(trackerFor('r:torch', {}, { rust: 2 }, { iron_scrap: 1 })?.hint).toContain('bank it');
    const done = trackerFor('r:torch', {}, { rust: 2, iron_scrap: 1 }, {});
    expect(done?.ready).toBe(true);
    expect(done?.hint).toContain('craft it');
  });

  it('rejects unknown pins and finished quest lines', () => {
    expect(validPin('r:nothing', {})).toBe(false);
    expect(validPin('q:merchant', {})).toBe(false);
    expect(validPin('q:trader', { trader: 3 })).toBe(false);
    expect(validPin('q:trader', { trader: 2 })).toBe(true);
    expect(validPin(7, {})).toBe(false);
  });

  it('toggles, clears when the recipe is crafted, and survives a reload', () => {
    const g = new Game(defaultSave());
    expect(g.togglePin('r:torch')).toBe(true);
    expect(g.tracker?.title).toBe('Torch x2');
    const g2 = new Game(parseSave(serializeSave(g.toSave())));
    expect(g2.pin).toBe('r:torch');
    g2.togglePin('r:torch');
    expect(g2.tracker).toBeNull();
    g2.togglePin('r:torch');
    g2.stash.rust = 2;
    g2.stash.iron_scrap = 1;
    g2.body.x = g2.world.padX + 0.5;
    g2.body.y = g2.world.padY;
    expect(g2.craft('torch')).toBe(true);
    expect(g2.pin).toBeNull();
  });

  it('migrates a v32 save: no quests, nothing tracked', () => {
    const old = JSON.stringify({ v: 32, seedBase: 5, stash: { rust: 3 }, met: [] });
    const s = parseSave(old);
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.quests).toEqual({});
    expect(s.pin).toBeNull();
    expect(s.stash.rust).toBe(3);
    expect(parseSave(JSON.stringify({ v: 33, pin: { x: 1 }, quests: 'no' })).pin).toBeNull();
  });
});

describe('kit never gets stuck in the stash', () => {
  it('moves kit to the pack up to half the cap and leaves materials', () => {
    const stash: Inventory = { torch: 30, medkit: 2, rust: 9 };
    const pack: Inventory = {};
    expect(restockKit(stash, pack, 30)).toBe(15);
    expect(invTotal(pack)).toBe(15);
    expect(stash.rust).toBe(9);
    expect((stash.torch ?? 0) + (stash.medkit ?? 0)).toBe(17);
    expect(restockKit(stash, pack, 30)).toBe(0);
  });

  it('a save with medkits stranded in the stash gets them back', () => {
    const s = defaultSave();
    s.stash = { medkit: 3 };
    const g = new Game(s);
    expect(g.carried.medkit).toBe(3);
    expect(g.stash.medkit ?? 0).toBe(0);
  });
});

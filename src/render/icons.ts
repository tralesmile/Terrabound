/**
 * 12x12 pixel-art icons for every item and tool, drawn from string maps (one char per pixel).
 * Used by the hotbar, inventory, workshop and chest screens, and for the item held in the hand.
 */
import type { ItemId } from '../sim/tiles';
import type { Tool } from '../sim/game';

export const ICON = 12;

/** Shared outline and highlight; each icon adds its own colours. */
const BASE: Record<string, string> = { o: '#14181f', w: '#ffffff' };

interface IconDef {
  pal: Record<string, string>;
  rows: string[];
}

const ORE = (a: string, b: string, c: string): IconDef => ({
  pal: { a, b, c },
  rows: [
    '            ',
    '    oooo    ',
    '  oobbaaoo  ',
    ' obbaaaaaao ',
    ' obaacaaaao ',
    'obaaaaacaaao',
    'obaaaaaaaaao',
    'oaaacaaaaaco',
    ' oaaaaaaaao ',
    ' ooaaaaaaoo ',
    '   oooooo   ',
    '            ',
  ],
});

export const ICONS: Record<string, IconDef> = {
  rust: ORE('#9a5a44', '#c77a5e', '#5e3426'),
  iron_scrap: {
    pal: { a: '#d6c7b8', b: '#f4ece2', c: '#8f8274' },
    rows: [
      '            ',
      '    o  o    ',
      '   obooboo  ',
      '  oaabbaaao ',
      ' ooaaccaaoo ',
      ' obaco ocao ',
      ' oaac  caao ',
      ' ooaaccaaoo ',
      '  oaaaaaao  ',
      '   oaooao   ',
      '    o  o    ',
      '            ',
    ],
  },
  copper_wire: {
    pal: { a: '#e08a3c', b: '#ffc07a', c: '#9a5520' },
    rows: [
      '            ',
      '   oooooo   ',
      '  obbbbbao  ',
      ' oaoooooaco ',
      ' obbbbbbbao ',
      ' oaoooooaco ',
      ' obbbbbbbao ',
      ' oaoooooaco ',
      ' obbbbbbbao ',
      '  oaaaaaco  ',
      '   oooooo  b',
      '          b ',
    ],
  },
  metal: {
    pal: { a: '#6b7a90', b: '#9aa8bc', c: '#46526a' },
    rows: [
      '            ',
      ' oooooooooo ',
      ' obbbbbbbbo ',
      ' obwaaaawao ',
      ' obaaaaaaao ',
      ' obaaaaaaao ',
      ' obaaaaaaao ',
      ' obwaaaawao ',
      ' oaccccccco ',
      ' oooooooooo ',
      '            ',
      '            ',
    ],
  },
  crystal: {
    pal: { a: '#8a5fd6', b: '#d8b8ff', c: '#5a3a9a' },
    rows: [
      '     oo     ',
      '    obbo    ',
      '   obwbao   ',
      '   obbaao   ',
      '  obbaaaco  ',
      '  obbaaaco  ',
      '  obaaaaco  ',
      '  obaaaaco  ',
      '   obaaco   ',
      '   obaaco   ',
      '    oaco    ',
      '     oo     ',
    ],
  },
  biomass: {
    pal: { a: '#6b4a2e', b: '#8a6a44', g: '#7fcf5a', G: '#3f8f3a' },
    rows: [
      '       oo   ',
      '      oggo  ',
      '     ogGgo  ',
      '      oGo   ',
      '  oooooooo  ',
      ' obbbbbbbbo ',
      'obaobaaaaaao',
      'obooaaaaaaao',
      'obaobaaaaaao',
      ' oaaaaaaaao ',
      '  oooooooo  ',
      '            ',
    ],
  },
  seed: {
    pal: { a: '#c9a35a', b: '#f0d08a', g: '#7fcf5a' },
    rows: [
      '            ',
      '      g     ',
      '     gg     ',
      '    oooo    ',
      '   obbaao   ',
      '  obbaaaao  ',
      '  obaaaaao  ',
      '  oaaaaaao  ',
      '   oaaaao   ',
      '    oooo    ',
      '            ',
      '            ',
    ],
  },
  fish: {
    pal: { a: '#5aa6ff', b: '#9fd8ff', c: '#2a5a9a' },
    rows: [
      '            ',
      '            ',
      '    ooooo   ',
      '  oobbbbbo o',
      ' obbbwbbbaoo',
      'obbbbbbbaaco',
      ' oaaaaaaacoo',
      '  ooaaaaco o',
      '    ooooo   ',
      '            ',
      '            ',
      '            ',
    ],
  },
  glowfish: {
    pal: { a: '#36e0e8', b: '#c8ffff', c: '#1f7f86' },
    rows: [
      '            ',
      '      b     ',
      '    ooooo   ',
      '  oobbbbbo o',
      ' obbbwbbbaoo',
      'obbbbbbbaaco',
      ' oaaaaaaacoo',
      '  ooaaaaco o',
      '    ooooo   ',
      '     b      ',
      '            ',
      '            ',
    ],
  },
  torch: {
    pal: { a: '#6b4a2e', f: '#ffcf4a', F: '#ff7a3c' },
    rows: [
      '     ff     ',
      '    fFFf    ',
      '    fFFf    ',
      '     ff     ',
      '    oaao    ',
      '    oaao    ',
      '    oaao    ',
      '    oaao    ',
      '    oaao    ',
      '    oaao    ',
      '    oooo    ',
      '            ',
    ],
  },
  ladder: {
    pal: { a: '#8a6a44' },
    rows: [
      ' oo      oo ',
      ' oaooooooao ',
      ' oaaaaaaaao ',
      ' oaooooooao ',
      ' oao    oao ',
      ' oaooooooao ',
      ' oaaaaaaaao ',
      ' oaooooooao ',
      ' oao    oao ',
      ' oaooooooao ',
      ' oaaaaaaaao ',
      ' oo      oo ',
    ],
  },
  scaffold: {
    pal: { a: '#9aa3b8', b: '#5d6a80' },
    rows: [
      'oooooooooooo',
      'oaaaaaaaaaao',
      'oabo    obao',
      'oa bo  ob ao',
      'oa  obbo  ao',
      'oa   bb   ao',
      'oa  obbo  ao',
      'oa bo  ob ao',
      'oabo    obao',
      'oaaaaaaaaaao',
      'oooooooooooo',
      '            ',
    ],
  },
  platform: {
    pal: { a: '#8a6a44', b: '#b08a5a' },
    rows: [
      '            ',
      '            ',
      '            ',
      'oooooooooooo',
      'obbbbbbbbbbo',
      'oaaaaaaaaaao',
      'oooooooooooo',
      ' oao    oao ',
      ' oao    oao ',
      ' ooo    ooo ',
      '            ',
      '            ',
    ],
  },
  door: {
    pal: { a: '#5d6a80', b: '#8e98b0', k: '#ffcf4a' },
    rows: [
      '  oooooooo  ',
      '  obbbbbao  ',
      '  obaaaaao  ',
      '  obaaaaao  ',
      '  obaaaaao  ',
      '  obaaaako  ',
      '  obaaaaao  ',
      '  obaaaaao  ',
      '  obaaaaao  ',
      '  obaaaaao  ',
      '  oooooooo  ',
      '            ',
    ],
  },
  wall: {
    pal: { a: '#3a4356', b: '#525c74' },
    rows: [
      'oooooooooooo',
      'obbbbobbbbbo',
      'oaaaaoaaaaao',
      'oooooooooooo',
      'obboobbbbbbo',
      'oaaoaaaaaaao',
      'oooooooooooo',
      'obbbbbbobbbo',
      'oaaaaaaoaaao',
      'oooooooooooo',
      '            ',
      '            ',
    ],
  },
  solar: {
    pal: { a: '#1f4a8a', b: '#5aa6ff', c: '#9aa3b8' },
    rows: [
      '            ',
      'oooooooooooo',
      'obaobaobaobo',
      'oaaoaaoaaoao',
      'oooooooooooo',
      'obaobaobaobo',
      'oaaoaaoaaoao',
      'oooooooooooo',
      '     oco    ',
      '     oco    ',
      '   ooooooo  ',
      '            ',
    ],
  },
  smelter: {
    pal: { a: '#5d6a80', b: '#8e98b0', f: '#ff9a3c', F: '#ffcf4a' },
    rows: [
      '   oo       ',
      '   oao      ',
      ' oooaoooooo ',
      ' obbbbbbbbo ',
      ' oaaaaaaaao ',
      ' oaooooooao ',
      ' oaofFFfoao ',
      ' oaoFffFoao ',
      ' oaooooooao ',
      ' oaaaaaaaao ',
      ' oooooooooo ',
      '            ',
    ],
  },
  battery: {
    pal: { a: '#2b3a4a', b: '#36e0e8', c: '#5d6a80' },
    rows: [
      '    oooo    ',
      '  oooccooo  ',
      '  oaaaaaao  ',
      '  oabbbbao  ',
      '  oabbbbao  ',
      '  oaaaaaao  ',
      '  oabbbbao  ',
      '  oabbbbao  ',
      '  oaaaaaao  ',
      '  oabbbbao  ',
      '  oooooooo  ',
      '            ',
    ],
  },
  miner: {
    pal: { a: '#e8a33d', b: '#5d6a80', c: '#9aa3b8' },
    rows: [
      '  oooooooo  ',
      '  oaaaaaao  ',
      '  oaboobao  ',
      '  oaaaaaao  ',
      '  oooccooo  ',
      '     cc     ',
      '    occo    ',
      '    occo    ',
      '     oo     ',
      '    o  o    ',
      '   o    o   ',
      '            ',
    ],
  },
  drone: {
    pal: { a: '#5d6a80', b: '#36e0e8', r: '#9aa3b8' },
    rows: [
      '            ',
      'rrrro  orrrr',
      '    o  o    ',
      '  oooooooo  ',
      ' oaaaaaaaao ',
      ' oaabbbbaao ',
      ' oaaaaaaaao ',
      '  oooooooo  ',
      '   o    o   ',
      '  o      o  ',
      '            ',
      '            ',
    ],
  },
  chest: {
    pal: { a: '#6b5028', b: '#8a6a36', c: '#c9a35a', k: '#36e0e8' },
    rows: [
      '            ',
      ' oooooooooo ',
      ' obbbbbbbbo ',
      ' occcccccco ',
      ' obbbkkbbbo ',
      ' oooookoooo ',
      ' oaaaaaaaao ',
      ' ocaaaaaaco ',
      ' oaaaaaaaao ',
      ' ocaaaaaaco ',
      ' oooooooooo ',
      '            ',
    ],
  },
  // Tools.
  drill: {
    pal: { a: '#9aa3b8', b: '#d6dde8', c: '#e8a33d', d: '#5d6a80' },
    rows: [
      '            ',
      '        oo  ',
      '       obbo ',
      '      obbao ',
      '  ooooobao  ',
      ' occcccaoo  ',
      ' occccccdo  ',
      ' oocccccdo  ',
      '   ooddddo  ',
      '    odo oo  ',
      '    oo      ',
      '            ',
    ],
  },
  blade: {
    pal: { a: '#36e0e8', b: '#c8ffff', c: '#5d6a80', h: '#e8a33d' },
    rows: [
      '         oo ',
      '        obo ',
      '       obao ',
      '      obao  ',
      '     obao   ',
      '    obao    ',
      '  oobao     ',
      '  ocaoo     ',
      ' ohcoo      ',
      'ohho        ',
      'ooo         ',
      '            ',
    ],
  },
  pistol: {
    pal: { a: '#ffd24a', b: '#fff0a0', c: '#5d6a80', d: '#2b3a4a' },
    rows: [
      '            ',
      '            ',
      ' oooooooooo ',
      ' ocbbbbbbbao',
      ' ocaaaaaaaao',
      ' oooocdooooo',
      '   ocdo     ',
      '   occo     ',
      '  occo      ',
      '  oooo      ',
      '            ',
      '            ',
    ],
  },
  rod: {
    pal: { a: '#8a6a44', b: '#e6f6ff', r: '#ff5a5a' },
    rows: [
      '          oo',
      '         oao',
      '        oaob',
      '       oao b',
      '      oao  b',
      '     oao   b',
      '    oao    b',
      '   oao     r',
      '  oao       ',
      ' oao        ',
      'ooo         ',
      '            ',
    ],
  },
};

const FALLBACK: IconDef = { pal: { a: '#9aa3b8' }, rows: ['', '  oooooooo', '  oaaaaaao', '  oaaaaaao', '  oaaaaaao', '  oaaaaaao', '  oaaaaaao', '  oooooooo'] };

export function iconDef(id: ItemId | Tool | string): IconDef {
  return ICONS[id] ?? FALLBACK;
}

/** Draw an icon with its top-left at (x, y), each art pixel s screen px. */
export function drawIcon(ctx: CanvasRenderingContext2D, id: ItemId | Tool | string, x: number, y: number, s: number, flip = false): void {
  const d = iconDef(id);
  for (let r = 0; r < d.rows.length; r++) {
    const row = d.rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ' ') continue;
      const col = d.pal[ch] ?? BASE[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      const cx = flip ? ICON - 1 - c : c;
      ctx.fillRect(Math.round(x + cx * s), Math.round(y + r * s), Math.ceil(s), Math.ceil(s));
    }
  }
}

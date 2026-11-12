/**
 * Furniture tile art (rooms.ts): 16x16 string maps with their own palettes, drawn into the cached
 * tile chunks. The lamp halo and screen flicker are added per frame by the renderer (furnitureGlow).
 */
import { T } from '../sim/tiles';

export interface FurnitureArt {
  pal: Record<string, string>;
  rows: string[];
}

const O = '#14181f';

export const FURNITURE_ART: Record<number, FurnitureArt> = {
  [T.TABLE]: {
    pal: { o: O, a: '#a07a4a', b: '#d0a870', c: '#6b5028', m: '#36e0e8', w: '#e6eeff' },
    rows: [
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '         oo     ',
      '        omwo    ',
      '        oomo    ',
      'oooooooooooooooo',
      'obbbbbbbbbbbbbbo',
      'oaaaaaaaaaaaaaao',
      'oooccooooooccooo',
      '  occo    occo  ',
      '  occo    occo  ',
      '  occo    occo  ',
      '  oooo    oooo  ',
    ],
  },
  [T.LAMP]: {
    pal: { o: O, a: '#ffe08a', b: '#fff6d0', c: '#566078', d: '#8e98b0' },
    rows: [
      '                ',
      '     oooooo     ',
      '    oaaaaaao    ',
      '   oaabbbbaao   ',
      '   oabbbbbbao   ',
      '   oaaaaaaaao   ',
      '    oooooooo    ',
      '       oo       ',
      '      odco      ',
      '      odco      ',
      '      odco      ',
      '      odco      ',
      '      odco      ',
      '    oooooooo    ',
      '    occcccco    ',
      '    oooooooo    ',
    ],
  },
  [T.SCREEN]: {
    pal: { o: O, a: '#0e2e38', b: '#36e0e8', c: '#566078', d: '#9ff6a0', e: '#ff9a3c', f: '#3a4458' },
    rows: [
      '                ',
      'oooooooooooooooo',
      'occccccccccccco ',
      'ocaaaaaaaaaaaco ',
      'ocabbbaaaaaaaco ',
      'ocaaaaaaadaaaco ',
      'ocabbbbaaddaaco ',
      'ocaaaaaadaadaco ',
      'ocabbaaaaaaadco ',
      'ocaaaaaaeaaaaco ',
      'occccccccccccco ',
      'oooooooooooooo  ',
      '      offo      ',
      '      offo      ',
      '    oooooooo    ',
      '    offffffo    ',
    ],
  },
  [T.POT_PLANT]: {
    pal: { o: O, a: '#5ac85a', b: '#2f8a3a', c: '#c77a5e', d: '#8a4a32', e: '#ffcf4a' },
    rows: [
      '       oo       ',
      '   oo oeeo  oo  ',
      '  oaao oeo oaao ',
      '  oabao oo oaabo',
      '   oabaooaoabao ',
      '  ooobaoaoabo   ',
      ' oaaoobbabbo    ',
      ' oabbaobbaoo    ',
      '  oooobbbo      ',
      '      obo       ',
      '   oooooooooo   ',
      '   occcccccco   ',
      '    occddcco    ',
      '    ocdddddo    ',
      '    occcccco    ',
      '     oooooo     ',
    ],
  },
  [T.BANNER]: {
    pal: { o: O, a: '#e04a5a', b: '#ff8a8a', c: '#ffcf4a', d: '#566078', e: '#a02a3a' },
    rows: [
      'oooooooooooooooo',
      'oddddddddddddddo',
      ' oaaaaaaaaaaaao ',
      ' oabaaaaaaaaaeo ',
      ' oabaaaccaaaaeo ',
      ' oaaaaccccaaaeo ',
      ' oaaaccaaccaaeo ',
      ' oaaaaccccaaaeo ',
      ' oaaaaaccaaaaeo ',
      ' oaaaaaaaaaaaeo ',
      ' oaaaaaaaaaaaeo ',
      ' oaaaaaaaaaaaeo ',
      ' oaaaaooooaaaeo ',
      ' oaaao    oaaeo ',
      ' oaao      oaeo ',
      ' ooo        ooo ',
    ],
  },
  [T.BED]: {
    pal: { o: O, a: '#4a6ab8', b: '#a8c0ff', c: '#e6eeff', d: '#566078', e: '#6a8ad8' },
    rows: [
      '                ',
      '                ',
      '                ',
      '                ',
      'oo              ',
      'odo             ',
      'odo             ',
      'odoooooooooooooo',
      'odcccccobbbbbbbo',
      'odcccccoeeeeeeeo',
      'odooooooaaaaaaao',
      'oddddddddddddddo',
      'oddddddddddddddo',
      'oooooooooooooooo',
      'odo          odo',
      'ooo          ooo',
    ],
  },
};

/** Lengths (in art pixels, 1..9) of the wall screen's three readout lines at a time; scrolls every 0.4 s. Pure. */
export function screenLines(time: number, salt: number): number[] {
  const step = Math.floor(time / 0.4);
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const h = Math.sin((step + i) * 12.9898 + salt * 78.233) * 43758.5453;
    out.push(1 + Math.floor((h - Math.floor(h)) * 9));
  }
  return out;
}

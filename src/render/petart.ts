/**
 * Pet companions as pixel-art sprites (string rows like the player and vehicles), facing right.
 * Palette keys: o outline, a body, A body shade, c accent, e eye, w highlight, L metal, b fuzz.
 * Colours come from the pet's gear entry (and the layer's ambient tint) through petPalette().
 */

export type PetArtId = 'scout_bot' | 'glow_moth' | 'spark_pup';

/** Scout bot: a round drone with a single visor eye, a mast and a spinning rotor (rotor drawn per frame). */
const SCOUT = [
  '      oo      ',
  '    oooooo    ',
  '   oaawaaaao  ',
  '  oawwaaaaaao ',
  ' oaaaaaaooooAo',
  ' oaaaaaaoceeoAo',
  ' oaaaaaaoccccAo',
  ' oaaaaaaaooooAo',
  '  oAaaaaaaaaAo ',
  '   oAAAAAAAAo  ',
  '    oo    oo   ',
];
const ROTOR = [' LLLLLLLLLLLL ', '    LLLLLL    '];

/** Glow moth: fuzzy body, two pairs of patterned wings (up / down flap) and curled antennae. */
const MOTH_UP = [
  '    o    o    ',
  '     o  o     ',
  ' oooo oo oooo ',
  'oaaaaoeeoaaaao',
  'oacaaobboaacao',
  'oaccaobboaccao',
  ' oaaaobboaaao ',
  '  ooooboooo   ',
  '  oaaobboaao  ',
  '   ooo bb ooo ',
  '      oo      ',
];
const MOTH_DOWN = [
  '    o    o    ',
  '     o  o     ',
  '      oo      ',
  '   ooobeeooo  ',
  '  oaacobboaaco',
  ' oaccaobboacao',
  'oaaaaaobboaaao',
  'oaaaaoobbooaao',
  ' oooo obbo ooo',
  '      obbo    ',
  '       oo     ',
];

/** Spark pup: a little robot dog on hover pads, perky ears, glowing eye and a spark-tipped tail. */
const PUP = [
  '         o   o ',
  '        oao oao',
  '        oaaaaao',
  ' c      oaawaeo',
  ' oo     oaaaaao',
  '  oooooooaaaaAo',
  '  oaaaaaaaaaAo ',
  '  oawaaaaaaaAo ',
  '  oAAAAAAAAAAo ',
  '   oLo    oLo  ',
];
/** Wag frame: the tail flicks up, its spark tip one row higher. */
const PUP_WAG = PUP.map((r, i) => (i === 2 ? 'c' + r.slice(1) : i === 3 ? ' o' + r.slice(2) : i === 4 ? '  o' + r.slice(3) : r));

export const PET_ART: Record<PetArtId, { w: number; frames: string[][] }> = {
  scout_bot: { w: 15, frames: [SCOUT] },
  glow_moth: { w: 14, frames: [MOTH_UP, MOTH_DOWN] },
  spark_pup: { w: 15, frames: [PUP, PUP_WAG] },
};

/** Darken a #rrggbb colour by k (0-1). */
export function shade(hex: string, k: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number): string => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/** Palette for a pet from its body and accent colours. */
export function petPalette(color: string, accent: string): Record<string, string> {
  return {
    o: '#14181f',
    a: color,
    A: shade(color, 0.35),
    c: accent,
    e: '#ffffff',
    w: '#ffffff',
    L: '#c9d0e4',
    b: shade(accent, 0.45),
  };
}

/** Rows of a pet at time t (flap / rotor / tail frames). `paddle` > 0 in water slows the flap. */
export function petRows(id: PetArtId, t: number, swimming: boolean): string[] {
  const art = PET_ART[id];
  const pad = (rows: string[]): string[] => rows.map((r) => r.padEnd(art.w));
  if (id === 'glow_moth') return pad(art.frames[Math.floor(t * (swimming ? 4 : 14)) % 2]);
  if (id === 'scout_bot') {
    const rotor = swimming ? '    LLLLLL    ' : ROTOR[Math.floor(t * 24) % 2];
    return pad([rotor, ...SCOUT]);
  }
  // Pup: the tail wags.
  return pad(art.frames[Math.floor(t * 6) % 2]);
}

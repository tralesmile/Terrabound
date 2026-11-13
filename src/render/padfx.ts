/**
 * Landing pad deck art (cosmetic). The pad used the generic speckled block texture, which read
 * as glitter at the start of every dive. It is now a riveted steel deck: a bright lip, panel
 * seams, yellow/black hazard chevrons on the end tiles, a landing ring across the centre three
 * tiles and runway lights that chase from both ends toward the centre (drawn per frame).
 * Pure helpers so tests can pin the layout; rows are 16 chars of palette keys ('.' = empty).
 */

export const PAD_PAL: Record<string, string> = {
  l: '#cfe8f0', // lip highlight
  c: '#36e0e8', // cyan rim
  s: '#3a4a5c', // steel plate
  d: '#263342', // plate shadow
  k: '#151c26', // seam
  b: '#8a9bb0', // rivet
  y: '#ffcf4a', // hazard yellow
  h: '#1a1a1a', // hazard black
  r: '#5ff2f8', // landing ring
};

/** Where a pad tile sits in its run: index from the left and run length (scans at most 24 tiles each way). */
export function padRun(isPad: (dx: number) => boolean): { i: number; n: number } {
  let left = 0;
  while (left < 24 && isPad(-left - 1)) left++;
  let right = 0;
  while (right < 24 && isPad(right + 1)) right++;
  return { i: left, n: left + right + 1 };
}

/** 16 rows of the deck tile at position i of a run of n. */
export function padDeckRows(i: number, n: number): string[] {
  const grid: string[][] = [];
  for (let y = 0; y < 16; y++) {
    const row: string[] = [];
    for (let x = 0; x < 16; x++) {
      let ch = y < 1 ? 'l' : y < 2 ? 'c' : y < 3 ? 'k' : y > 12 ? 'd' : 's';
      // Plate seams: a vertical seam every two tiles, a horizontal one mid-deck.
      if (y >= 3 && x === 0 && i % 2 === 0) ch = 'k';
      if (y === 8) ch = 'k';
      if (y === 9) ch = 'd';
      row.push(ch);
    }
    grid.push(row);
  }
  // Rivets at the plate corners.
  for (const [x, y] of [[2, 4], [13, 4], [2, 11], [13, 11]]) grid[y][x] = 'b';
  const end = i === 0 ? -1 : i === n - 1 ? 1 : 0;
  if (end !== 0 && n > 2) {
    // Hazard chevrons on the outer half, leaning away from the pad centre.
    for (let y = 3; y < 8; y++) {
      for (let x = 0; x < 16; x++) {
        const k = end < 0 ? x + y : 15 - x + y;
        grid[y][x] = Math.floor(k / 3) % 2 === 0 ? 'y' : 'h';
      }
    }
  }
  // Landing ring: a cyan circle spanning the centre three tiles of an odd run (just a stripe otherwise).
  const mid = (n - 1) / 2;
  const off = i - mid;
  if (n >= 5 && Math.abs(off) <= 1) {
    const cx = 8 - off * 16;
    for (let y = 3; y < 13; y++) {
      for (let x = 0; x < 16; x++) {
        const e = Math.hypot((x + 0.5 - cx) / 21, (y + 0.5 - 8) / 4.6);
        if (e > 0.8 && e <= 1) grid[y][x] = 'r';
      }
    }
    if (off === 0) for (const [x, y] of [[7, 6], [8, 6], [7, 10], [8, 10], [6, 8], [9, 8]]) grid[y][x] = 'r';
  }
  return grid.map((r) => r.join(''));
}

/**
 * Brightness (0.15-1) of the runway light on pad tile i of n at `time`: a pulse runs from both
 * ends toward the centre every 1.6 s, so the pad points at its own middle.
 */
export function padLight(time: number, i: number, n: number): number {
  const half = Math.max(1, Math.floor((n - 1) / 2));
  const fromEnd = Math.min(i, n - 1 - i);
  const head = ((time / 1.6) % 1) * (half + 2);
  const d = head - fromEnd;
  if (d < 0 || d > 2) return 0.15;
  return 0.15 + 0.85 * (1 - d / 2);
}

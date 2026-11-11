/**
 * Share card: a 1200x630 image of the current view framed with the player's stats and world code, shared
 * with the Web Share API when available, downloaded as a PNG otherwise. Free word-of-mouth marketing.
 */
import type { Game } from '../sim/game';
import { BIOMES, type BiomeId } from '../sim/biomes';
import { BIOME_BOSSES } from '../sim/bosses';

export const CARD_W = 1200;
export const CARD_H = 630;

/** Text lines on the card (pure, tested). */
export function shareLines(game: Game): string[] {
  const col = Math.max(0, Math.min(game.world.w - 1, Math.floor(game.body.x)));
  const biome = BIOMES[game.world.biome[col] as BiomeId]?.name ?? '';
  return [
    `Deepest dive ${game.stats.deepest} m   Bosses ${game.biomeBossesBeaten()}/${BIOME_BOSSES.length}   Codex ${game.codex.length}`,
    `Now in the ${biome}, ${Math.floor(game.depth)} m down`,
    `Play my world: code ${game.seedCode}`,
  ];
}

/** Draw the card from the game canvas. */
export function drawCard(game: Game, view: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.fillStyle = '#0b1026';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // Cover-fit the current view into the card.
  const s = Math.max(CARD_W / view.width, CARD_H / view.height);
  const vw = view.width * s;
  const vh = view.height * s;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view, (CARD_W - vw) / 2, (CARD_H - vh) / 2, vw, vh);
  const g = ctx.createLinearGradient(0, CARD_H * 0.55, 0, CARD_H);
  g.addColorStop(0, 'rgba(6,5,16,0)');
  g.addColorStop(1, 'rgba(6,5,16,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = 'rgba(6,5,16,0.75)';
  ctx.fillRect(0, 0, CARD_W, 86);
  ctx.font = 'bold 54px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillStyle = '#36e0e8';
  ctx.textBaseline = 'middle';
  ctx.fillText('TERRABOUND', 36, 44);
  ctx.font = 'bold 26px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillStyle = '#ffcf4a';
  ctx.textAlign = 'right';
  ctx.fillText('Dig. Build. Survive the Hollow.', CARD_W - 36, 44);
  ctx.textAlign = 'left';
  const lines = shareLines(game);
  lines.forEach((l, i) => {
    ctx.font = `bold ${i === 2 ? 34 : 28}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.fillStyle = i === 2 ? '#ffcf4a' : '#ffffff';
    ctx.fillText(l, 36, CARD_H - 130 + i * 44);
  });
  return c;
}

/** Share or download the card. Resolves to how it went (for a toast). */
export async function shareCard(game: Game, view: HTMLCanvasElement): Promise<'shared' | 'downloaded' | 'failed'> {
  try {
    const card = drawCard(game, view);
    const blob: Blob | null = await new Promise((res) => card.toBlob((b) => res(b), 'image/png'));
    if (!blob) return 'failed';
    const file = new File([blob], `terrabound-${game.seedCode}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: 'Terrabound', text: shareLines(game).join('\n') });
      return 'shared';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** Code-drawn HUD button glyphs (no icon font, no images). `s` is the glyph box size in CSS px. */
import type { HudGlyph } from './hudbuttons';

const INK = '#e6ecf8';

export function drawHudGlyph(ctx: CanvasRenderingContext2D, g: HudGlyph, cx: number, cy: number, s: number, bg: string): void {
  const k = s / 16;
  ctx.save();
  ctx.translate(cx - 8 * k, cy - 8 * k);
  ctx.scale(k, k);
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (pts: number[]): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  };
  const poly = (pts: number[]): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  };
  switch (g) {
    case 'sound':
    case 'music':
    case 'mute': {
      // Speaker cone, then waves (sound), a note (music) or a cross (muted).
      poly([1.5, 6, 4.5, 6, 8.5, 2.5, 8.5, 13.5, 4.5, 10, 1.5, 10]);
      if (g === 'mute') {
        ctx.strokeStyle = '#ff8a8a';
        line([10.5, 5.5, 15, 10.5]);
        line([15, 5.5, 10.5, 10.5]);
      } else if (g === 'music') {
        ctx.beginPath();
        ctx.arc(11.5, 11.8, 1.7, 0, Math.PI * 2);
        ctx.fill();
        line([13.1, 11.8, 13.1, 3.5, 15.5, 4.8]);
      } else {
        ctx.beginPath();
        ctx.arc(9, 8, 3, -0.9, 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(9, 8, 5.8, -0.9, 0.9);
        ctx.stroke();
      }
      break;
    }
    case 'map': {
      // A folded three-panel map with a route dot.
      ctx.lineWidth = 1.4;
      line([1.5, 3.5, 5.5, 2, 10.5, 3.5, 14.5, 2, 14.5, 12.5, 10.5, 14, 5.5, 12.5, 1.5, 14, 1.5, 3.5]);
      line([5.5, 2, 5.5, 12.5]);
      line([10.5, 3.5, 10.5, 14]);
      ctx.fillStyle = '#ffcf4a';
      ctx.beginPath();
      ctx.arc(8, 7.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'home':
    case 'beam': {
      // House; while beaming, a rising beam arrow over it.
      poly([8, 1.5, 15, 7.5, 13, 7.5, 13, 14.5, 3, 14.5, 3, 7.5, 1, 7.5]);
      ctx.fillStyle = bg;
      ctx.fillRect(6.6, 9.5, 2.8, 5);
      if (g === 'beam') {
        ctx.fillStyle = '#9ff6ff';
        poly([8, 4, 10.5, 7, 9, 7, 9, 9, 7, 9, 7, 7, 5.5, 7]);
      }
      break;
    }
    case 'drones': {
      // Quad drone: body, four rotors.
      ctx.fillRect(5.5, 6.5, 5, 3.5);
      line([2.5, 4.5, 6, 7.5]);
      line([13.5, 4.5, 10, 7.5]);
      line([2.5, 12, 6, 9.5]);
      line([13.5, 12, 10, 9.5]);
      for (const [x, y] of [[2.5, 4], [13.5, 4], [2.5, 12.5], [13.5, 12.5]]) ctx.fillRect(x - 2.2, y - 0.7, 4.4, 1.4);
      ctx.fillStyle = '#36e0e8';
      ctx.fillRect(7.3, 7.5, 1.4, 1.4);
      break;
    }
    case 'shop': {
      // Workshop: a wrench over a hammer head.
      ctx.lineWidth = 2.2;
      line([4, 12.5, 11, 5.5]);
      ctx.beginPath();
      ctx.arc(11.8, 4.7, 2.7, Math.PI * 0.75, Math.PI * 2.4);
      ctx.stroke();
      ctx.lineWidth = 2;
      line([12, 12.5, 6.5, 7]);
      ctx.fillRect(2.2, 3, 5.6, 3.2);
      break;
    }
    case 'dig': {
      // Pickaxe.
      ctx.lineWidth = 2;
      line([4, 14, 10.5, 5.5]);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(3.5, 4.5);
      ctx.quadraticCurveTo(9.5, 0.5, 14.5, 7.5);
      ctx.stroke();
      break;
    }
    case 'build': {
      // A block with a plus.
      ctx.lineWidth = 1.5;
      ctx.strokeRect(2, 5, 9, 9);
      ctx.fillStyle = 'rgba(230,236,248,0.35)';
      ctx.fillRect(2, 5, 9, 9);
      ctx.fillStyle = INK;
      ctx.fillRect(11.5, 1.5, 1.6, 6);
      ctx.fillRect(9.3, 3.7, 6, 1.6);
      break;
    }
    case 'ride':
    case 'getoff': {
      // Buggy: body and two wheels; getting off adds an out arrow.
      poly([1.5, 10, 2.5, 6.5, 6, 6.5, 8, 4, 12, 4, 14.5, 7.5, 14.5, 10]);
      ctx.fillStyle = bg;
      ctx.fillRect(8.6, 5, 2.6, 2);
      ctx.fillStyle = INK;
      for (const x of [4.5, 11.5]) {
        ctx.beginPath();
        ctx.arc(x, 11.5, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(x, 11.5, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
      }
      if (g === 'getoff') {
        ctx.strokeStyle = '#ffcf4a';
        line([9, 1.5, 15, 1.5]);
        line([13, -0.3, 15, 1.5, 13, 3.3]);
      }
      break;
    }
    case 'reel': {
      // Grapple hook on a line.
      ctx.lineWidth = 1.4;
      ctx.setLineDash([1.6, 1.6]);
      line([8, 0.5, 8, 6]);
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      line([8, 6, 8, 12]);
      ctx.beginPath();
      ctx.arc(8, 10, 4.5, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
      poly([3, 9, 4.8, 11.6, 2, 11.2]);
      poly([13, 9, 11.2, 11.6, 14, 11.2]);
      break;
    }
    case 'dash': {
      // Double chevron with speed lines.
      ctx.lineWidth = 2.2;
      line([5, 3.5, 9.5, 8, 5, 12.5]);
      line([9.5, 3.5, 14, 8, 9.5, 12.5]);
      ctx.lineWidth = 1.2;
      line([0.8, 6, 3, 6]);
      line([0.8, 10, 3, 10]);
      break;
    }
  }
  ctx.restore();
}

import { Input } from './platform/input';
import { Sfx } from './platform/audio';
import { loadRaw, saveRaw } from './platform/storage';
import { Fx } from './render/fx';
import { Renderer } from './render/renderer';
import { TILE_COLORS } from './render/sprites';
import { FIXED_DT, Game, NO_CONTROLS, type GameEvent, type Tool } from './sim/game';
import { parseSave, serializeSave } from './sim/save';
import { ITEMS } from './sim/tiles';
import { UI, type UiAction } from './ui/ui';

const TOOL_NAMES: Record<Tool, string> = { drill: 'Mining drill', blade: 'Energy blade', pistol: 'Pulse pistol' };

function fatal(err: unknown): void {
  console.error('Terrabound fatal error', err);
  const el = document.getElementById('fatal');
  if (el) el.style.display = 'flex';
}

function boot(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !ctx) {
    fatal(new Error('Canvas 2D is not available'));
    return;
  }

  let dpr = 1;
  const game = new Game(parseSave(loadRaw()));
  const ui = new UI();
  const fx = new Fx();
  const sfx = new Sfx();
  sfx.muted = game.muted;
  const renderer = new Renderer(ctx);
  ui.touch = window.matchMedia?.('(pointer: coarse)').matches === true || 'ontouchstart' in window;
  const input = new Input(canvas, ui, renderer, () => dpr);

  const resize = (): void => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    renderer.resize(w, h);
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);

  const saveNow = (): void => {
    saveRaw(serializeSave(game.toSave()));
  };

  const act = (a: UiAction): void => {
    sfx.unlock();
    switch (a.k) {
      case 'start':
        ui.screen = 'play';
        break;
      case 'shop':
        if (game.isAtBase()) ui.shopOpen = true;
        break;
      case 'close':
        ui.shopOpen = false;
        break;
      case 'mode':
        ui.placeMode = !ui.placeMode;
        ui.toast(ui.placeMode ? 'Build mode' : 'Dig mode', '#ffcf4a');
        break;
      case 'mute':
        game.setMuted(!game.muted);
        sfx.muted = game.muted;
        saveNow();
        break;
      case 'buy':
        if (game.buyUpgrade(a.id)) saveNow();
        break;
      case 'craft':
        if (game.craft(a.id)) saveNow();
        break;
      case 'dive':
        if (game.newDive()) {
          ui.shopOpen = false;
          saveNow();
        }
        break;
      case 'tool':
        game.toggleTool();
        ui.toast(TOOL_NAMES[game.tool], '#36e0e8');
        break;
      case 'settool':
        game.setTool(a.t);
        ui.toast(TOOL_NAMES[a.t], '#36e0e8');
        break;
      case 'sel':
        game.selectPlaceable(a.i);
        break;
    }
  };
  input.onAction = act;
  input.onAnyInput = () => sfx.unlock();

  const handle = (e: GameEvent): void => {
    sfx.handle(e);
    switch (e.t) {
      case 'break':
        fx.burst(e.x + 0.5, e.y + 0.5, TILE_COLORS[e.tile] ?? '#888', 10, 5);
        fx.addShake(0.12);
        break;
      case 'enemyhit':
        fx.burst(e.x, e.y, '#ffd24a', 6, 5);
        fx.text(e.x, e.y - 0.5, String(e.dmg), '#ffd24a');
        fx.addShake(0.2);
        break;
      case 'enemykill':
        fx.burst(e.x, e.y, '#ff7a5a', 14, 6);
        break;
      case 'pickup':
        fx.text(e.x + 0.5, e.y, `+1 ${ITEMS[e.item].name}`, ITEMS[e.item].color);
        break;
      case 'hurt':
        fx.addShake(0.5);
        fx.burst(game.body.x, game.body.y - 1, '#ff5a5a', 8, 5);
        break;
      case 'land':
        if (e.speed > 9) fx.burst(game.body.x, game.body.y, '#9aa3b8', 5, 3);
        break;
      case 'bank':
        ui.toast(`Banked ${e.total} items`, '#9ff6a0');
        saveNow();
        break;
      case 'death':
        ui.toast(`SIGNAL LOST - ${e.lost} items lost`, '#ff5a5a');
        fx.addShake(1);
        saveNow();
        break;
      case 'full':
        ui.toast('Pack full! Return to the pad', '#ff9a3c');
        break;
      case 'lowbattery':
        ui.toast('Battery low!', '#ff9a3c');
        break;
      case 'upgrade':
        ui.toast('Upgrade installed', '#36e0e8');
        break;
      case 'newdive':
        ui.toast('New dive - good luck', '#ffcf4a');
        break;
      default:
        break;
    }
  };

  let last = performance.now();
  let acc = 0;
  let clock = 0;
  let errors = 0;
  let saveTimer = 0;

  const frame = (now: number): void => {
    try {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      clock += dt;
      if (ui.screen === 'play') {
        acc += dt;
        let steps = 0;
        while (acc >= FIXED_DT && steps < 6) {
          game.step(FIXED_DT, ui.shopOpen ? NO_CONTROLS : input.read());
          acc -= FIXED_DT;
          steps++;
        }
        if (steps === 6) acc = 0;
        if (ui.shopOpen && !game.isAtBase()) ui.shopOpen = false;
      }
      for (const e of game.drainEvents()) handle(e);
      fx.update(dt);
      ui.update(dt);
      renderer.follow(game, dt);
      renderer.draw(game, fx, input.mouse.has && ui.screen === 'play' && !ui.touch ? renderer.screenToTile(input.mouse.x * dpr, input.mouse.y * dpr) : null, clock);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ui.draw(ctx, game, canvas.clientWidth, canvas.clientHeight, clock);
      const st = input.stick();
      if (st) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(st.ox, st.oy, 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(54,224,232,0.45)';
        ctx.beginPath();
        ctx.arc(st.ox + Math.max(-36, Math.min(36, st.x - st.ox)), st.oy + Math.max(-36, Math.min(36, st.y - st.oy)), 18, 0, Math.PI * 2);
        ctx.fill();
      }

      saveTimer += dt;
      if (saveTimer > 5) {
        saveTimer = 0;
        saveNow();
      }
      errors = 0;
    } catch (err) {
      errors++;
      console.error(err);
      if (errors > 5) {
        fatal(err);
        return;
      }
    }
    requestAnimationFrame(frame);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveNow();
    else last = performance.now();
  });
  window.addEventListener('pagehide', saveNow);
  window.addEventListener('error', (e) => console.error('Uncaught', e.error ?? e.message));

  if (new URLSearchParams(location.search).has('e2e')) {
    (window as unknown as { __terrabound: unknown }).__terrabound = { game, ui, renderer, input, act };
  }
  requestAnimationFrame(frame);
}

try {
  boot();
} catch (err) {
  fatal(err);
}

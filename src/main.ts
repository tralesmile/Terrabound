import { drawDecorGallery } from './render/decor';
import { dailyCode } from './sim/daily';
import { Input } from './platform/input';
import { Sfx } from './platform/audio';
import { loadRaw, saveRaw } from './platform/storage';
import { Fx } from './render/fx';
import { Renderer } from './render/renderer';
import { ENEMY_ART_UNIT, ENEMY_LOOKS, ENEMY_W, TILE_COLORS, drawGallery, enemyFrame, spriteDebris } from './render/sprites';
import { FIXED_DT, Game, NO_CONTROLS, TOOLS, type GameEvent, type Tool } from './sim/game';
import { parseSave, serializeSave } from './sim/save';
import { ITEMS, type ItemId } from './sim/tiles';
import { codexEntry } from './sim/explore';
import { GEAR } from './sim/gear';
import { UI, type UiAction } from './ui/ui';

const TOOL_NAMES: Record<Tool, string> = { drill: 'Mining drill', blade: 'Energy blade', pistol: 'Pulse pistol', rod: 'Fishing rod: click water to cast', hook: 'Grappling hook: click a ceiling, swing, jump to let go' };

function fatal(err: unknown): void {
  console.error('Terrabound fatal error', err);
  const el = document.getElementById('fatal');
  if (el) el.style.display = 'flex';
}

function boot(): void {
  if (new URLSearchParams(location.search).has('gallery')) {
    const gc = document.getElementById('game') as HTMLCanvasElement | null;
    if (gc) {
      gc.width = 1100;
      gc.height = 1040;
      gc.style.width = '1100px';
      gc.style.height = '1040px';
      drawGallery(gc);
      const gctx = gc.getContext('2d');
      if (gctx) drawDecorGallery(gctx, 8, 660, 3);
    }
    return;
  }
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !ctx) {
    fatal(new Error('Canvas 2D is not available'));
    return;
  }

  let dpr = 1;
  const game = new Game(parseSave(loadRaw()));
  const ui = new UI();
  const away = game.applyOffline(Date.now());
  if (away) {
    const h = Math.floor(away.seconds / 3600);
    const m = Math.floor((away.seconds % 3600) / 60);
    const parts = [`${away.rust} rust`, `${away.scrap} scrap`, `${away.metal} metal`, `${away.wire} wire`, `${away.crystal} crystal`].filter((x) => !x.startsWith('0 '));
    ui.toast(`While you were away (${h > 0 ? h + ' h ' : ''}${m} min): ${parts.join(', ')}`, '#7dffb0', 6);
  }
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
  // Map: drag to pan.
  let mapDrag: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    const r = ui.mapRect;
    if (ui.mapOpen && e.offsetX >= r.x && e.offsetX <= r.x + r.w && e.offsetY >= r.y && e.offsetY <= r.y + r.h) mapDrag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', (e) => {
    if (!mapDrag || !ui.mapOpen) return;
    ui.mapView.dragBy(e.clientX - mapDrag.x, e.clientY - mapDrag.y);
    mapDrag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => {
    mapDrag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    if (ui.mapOpen) {
      ui.mapView.zoomBy(e.deltaY > 0 ? -1 : 1);
      e.preventDefault();
    } else if (ui.shopOpen) {
      ui.scrollShop(e.deltaY > 0 ? 1 : -1);
      e.preventDefault();
    } else if (ui.screen === 'play' && !ui.mapOpen && !ui.invOpen) {
      // Mouse wheel cycles tools, like a hotbar.
      const i = TOOLS.indexOf(game.tool);
      act({ k: 'settool', t: TOOLS[(i + (e.deltaY > 0 ? 1 : TOOLS.length - 1)) % TOOLS.length] });
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);

  const saveNow = (): void => {
    saveRaw(serializeSave(game.toSave(Date.now())));
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
        ui.mapOpen = false;
        ui.invOpen = false;
        if (game.chestOpen) game.interact();
        break;
      case 'map':
        if (ui.screen === 'play' && !ui.shopOpen) ui.mapOpen = !ui.mapOpen;
        break;
      case 'recall':
        if (!game.startRecall() && game.recallT === 0) ui.toast(game.isAtBase() ? 'Already at the pad' : 'Beam home works on the surface only', '#ff9a3c');
        ui.mapOpen = false;
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
      case 'tab':
        ui.setShopTab(a.t);
        break;
      case 'copyseed':
        void navigator.clipboard?.writeText(game.seedCode).then(
          () => ui.toast('World code copied', '#9ff6a0'),
          () => ui.toast(`World code: ${game.seedCode}`, '#ffcf4a', 6),
        );
        if (!navigator.clipboard) ui.toast(`World code: ${game.seedCode}`, '#ffcf4a', 6);
        break;
      case 'enterseed': {
        const code = typeof window.prompt === 'function' ? window.prompt('Paste a world code (e.g. 7K2M-9QXA)') : null;
        if (code) {
          if (game.newDive(code)) {
            ui.shopOpen = false;
            saveNow();
          } else ui.toast(game.isAtBase() ? 'That code is not valid' : 'Return to the pad first', '#ff8a8a');
        }
        break;
      }
      case 'daily':
        if (game.newDive(dailyCode(Date.now()))) {
          ui.shopOpen = false;
          saveNow();
          ui.toast(`Daily Dive ${dailyCode(Date.now())}: same world for everyone today`, '#36e0e8', 5);
        } else ui.toast('Return to the pad first', '#ff8a8a');
        break;
      case 'scroll':
        ui.scrollShop(a.d);
        break;
      case 'craft':
        if (game.craft(a.id)) saveNow();
        break;
      case 'dive':
        // Abandoning a world you have explored is a big step: ask for a second tap within 3 s.
        if (ui.newWorldArmed <= 0) {
          ui.newWorldArmed = 3;
          ui.toast('Tap again to abandon this world for a new one', '#ff9a3c');
        } else if (game.newDive()) {
          ui.newWorldArmed = 0;
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
      case 'mapzoom':
        ui.mapView.zoomBy(a.d);
        break;
      case 'mapcenter':
        ui.mapView.center();
        break;
      case 'ride':
        if (!game.toggleRide()) ui.toast('Craft a vehicle in the workshop GEAR tab first', '#ff9a3c');
        break;
      case 'dash':
        input.dashTap = true;
        break;
      case 'craftgear':
        if (game.craftGear(a.id)) saveNow();
        break;
      case 'equip':
        game.equipGear(a.id);
        saveNow();
        break;
      case 'inv':
        if (ui.screen === 'play' && !ui.shopOpen) {
          ui.invOpen = !ui.invOpen;
          ui.mapOpen = false;
        }
        break;
      case 'interact':
        if (ui.screen === 'play' && !ui.invOpen && !game.interact() && !game.chestOpen) ui.toast('No chest within reach', '#8a90a2');
        break;
      case 'invsel':
        ui.invSel = a.id;
        break;
      case 'use':
        if (!game.useItem(a.id)) ui.toast('Cannot use that', '#ff9a3c');
        break;
      case 'drop':
        if (game.dropItem(a.id) > 0) ui.toast(`Dropped ${ITEMS[a.id].name}`, '#c9d0e4');
        ui.invSel = null;
        break;
      case 'take':
        game.takeFromChest(a.id);
        saveNow();
        break;
      case 'put':
        game.putInChest(a.id);
        saveNow();
        break;
      case 'breakchest':
        if (game.breakChest()) ui.toast('Chest picked up (contents dropped)', '#ffcf4a');
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
        // e.y is mid-body (feet - 0.5); shatter wants the feet.
        fx.shatter(e.x, e.y + 0.5, spriteDebris(enemyFrame(ENEMY_LOOKS[e.kind].sprite, 0), ENEMY_W, false), ENEMY_ART_UNIT * ENEMY_LOOKS[e.kind].size, ENEMY_LOOKS[e.kind].burst);
        fx.addShake(0.25);
        break;
      case 'pickup':
        fx.text(e.x + 0.5, e.y, `+1 ${ITEMS[e.item].name}`, ITEMS[e.item].color);
        break;
      case 'hurt':
        fx.addShake(0.5);
        fx.burst(game.body.x, game.body.y - 1, '#ff5a5a', 8, 5);
        break;
      case 'splash':
        fx.burst(e.x, e.y, e.kind === 'acid' ? '#8aff4a' : '#9aa3b8', 6, 3);
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
        ui.toast('New world - good luck', '#ffcf4a');
        break;
      case 'chest':
        fx.burst(e.x + 0.5, e.y + 0.5, '#ffcf4a', 12, 4);
        break;
      case 'eat':
        ui.toast(`Ate ${ITEMS[e.item].name}`, '#9ff6a0');
        fx.burst(game.body.x, game.body.y - 1.2, '#9ff6a0', 10, 3);
        break;
      case 'cast':
        fx.burst(e.x + 0.5, e.y, '#9fd8ff', 8, 3);
        break;
      case 'bite':
        ui.toast('Bite! Click now!', '#ffcf4a', 1);
        fx.addShake(0.15);
        break;
      case 'catch':
        ui.toast(`Caught: ${e.n > 1 ? `${e.n} ` : ''}${ITEMS[e.item].name}!`, '#9fd8ff');
        break;
      case 'reel':
        ui.toast('Reeled in. Wait for the bite, then click.', '#8a90a2', 1.6);
        break;
      case 'nosoil':
        ui.toast('Seeds need soil underneath', '#ff9a3c');
        break;
      case 'craftgear':
        ui.toast(`Built: ${GEAR[e.id].name}`, '#ffcf4a');
        fx.burst(game.body.x, game.body.y - 1, '#ffcf4a', 24, 6);
        break;
      case 'mount':
        ui.toast('Riding (V to get off)', '#36e0e8', 1.4);
        break;
      case 'boom':
        fx.burst(e.x, e.y, '#ff9a3c', 30, 9);
        fx.burst(e.x, e.y, '#ffcf4a', 14, 5);
        fx.addShake(0.6);
        break;
      case 'grow':
        ui.toast('A sapling grew into a tree', '#7fcf5a');
        break;
      case 'fell':
        fx.addShake(0.35);
        ui.toast('Timber! +biomass', '#7fcf5a');
        break;
      case 'discover': {
        const entry = codexEntry(e.id);
        const gift = entry ? Object.entries(entry.reward).map(([k, n]) => `${n} ${ITEMS[k as ItemId].name}`).join(', ') : '';
        ui.toast(`Discovered: ${e.name}`, '#ffcf4a');
        if (gift) ui.toast(`Codex reward: ${gift}`, '#9ff6a0');
        fx.burst(game.body.x, game.body.y - 1.5, '#ffcf4a', 16, 6);
        saveNow();
        break;
      }
      case 'lore':
        ui.toast(e.text, '#9ff6ff', 6);
        fx.burst(game.body.x, game.body.y - 1.5, '#36e0e8', 10, 4);
        break;
      case 'nightfall':
        ui.toast('Night falls: drones hunt the surface', '#b06bff');
        break;
      case 'dawn':
        ui.toast('Dawn breaks', '#ffcf4a');
        break;
      case 'recallstart':
        ui.toast('Beaming home... hold still', '#36e0e8');
        break;
      case 'recallcancel':
        ui.toast('Beam cancelled', '#ff9a3c');
        break;
      case 'recall':
        fx.burst(game.body.x, game.body.y - 1, '#36e0e8', 30, 8);
        ui.toast('Back at the pad', '#36e0e8');
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
          // The map pauses the dive (single player, no reason to punish looking).
          if (!ui.mapOpen) game.step(FIXED_DT, ui.shopOpen || ui.invOpen ? NO_CONTROLS : input.read());
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
    (window as unknown as { __terrabound: unknown }).__terrabound = { game, ui, renderer, input, act, fx };
  }
  requestAnimationFrame(frame);
}

try {
  boot();
} catch (err) {
  fatal(err);
}

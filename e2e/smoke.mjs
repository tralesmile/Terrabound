// End-to-end smoke test: serves ./dist, drives the real game in headless Chrome with real input events.
// Run with: npm run build && npm run e2e   (CHROME_PATH overrides the browser binary)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'e2e', 'out');
fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ missing - run `npm run build` first');
  process.exit(2);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = path.join(dist, decodeURIComponent(url.pathname));
  if (!p.startsWith(dist)) {
    res.writeHead(403).end();
    return;
  }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] ?? 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/?e2e=1`;

const failures = [];
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failures.push(name);
};

/** Shows two toasts (one long) and checks the pills sit left of every HUD button and below the bars. */
async function toastCheck(page, label, shot) {
  await page.evaluate(() => {
    const ui = window.__terrabound.ui;
    ui.toasts = [];
    ui.toast('Discovered: Overgrown Ruins', '#ffcf4a', 6);
    ui.toast('Codex reward: 2 Crystal, 3 Iron scrap, 1 Plasma cell and a long tail of other loot', '#9ff6a0', 6);
  });
  await page.waitForTimeout(450);
  const r = await page.evaluate(() => {
    const ui = window.__terrabound.ui;
    const pills = ui.toastRects;
    const btns = ui.rects.filter((b) => ['mute', 'map', 'recall', 'settings'].includes(b.a.k));
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const overlap = pills.some((p) => btns.some((b) => hit(p, b)));
    const overlapEach = pills.length === 2 && !hit(pills[0], pills[1]);
    return { n: pills.length, overlap, apart: overlapEach, left: pills.every((p) => p.x >= 0), top: Math.min(...pills.map((p) => p.y)), btns: btns.length };
  });
  check(`${label}: two toast pills, left-aligned, clear of the buttons and of each other`, r.n === 2 && !r.overlap && r.apart && r.left && r.btns >= 2 && r.top > 40, JSON.stringify(r));
  await page.screenshot({ path: path.join(out, shot) });
  await page.evaluate(() => (window.__terrabound.ui.toasts = []));
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

/** A click the sim cannot miss: it only samples held state once per frame, so hold for ~4 frames. */
async function holdClick(page, x, y, ms = 70) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function tileToCss(page, tx, ty) {
  return page.evaluate(
    ([tx, ty]) => {
      const t = window.__terrabound;
      const r = t.renderer;
      const canvas = document.getElementById('game');
      const dpr = r.w / canvas.clientWidth;
      const ts = 16 * r.scale;
      return { x: (r.w / 2 + (tx + 0.5 - r.camX) * ts) / dpr, y: (r.h / 2 + (ty + 0.5 - r.camY) * ts) / dpr };
    },
    [tx, ty],
  );
}

async function openPage(context, errors) {
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(base);
  await page.waitForFunction(() => window.__terrabound, null, { timeout: 10000 });
  return page;
}

try {
  // ---------- Desktop ----------
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  let page = await openPage(ctx, errors);
  check('game boots and exposes debug hook', true);
  await page.screenshot({ path: path.join(out, '01-title.png') });
  check('starts on the title screen', (await page.evaluate(() => window.__terrabound.ui.screen)) === 'title');

  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check('any key starts the game', (await page.evaluate(() => window.__terrabound.ui.screen)) === 'play');

  // Walk right with real key input.
  const x0 = await page.evaluate(() => window.__terrabound.game.body.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1100);
  const stepDust = await page.evaluate(() => window.__terrabound.fx.particles.length);
  await page.keyboard.up('KeyD');
  check('running kicks up footstep dust', stepDust > 0, `particles ${stepDust}`);
  const x1 = await page.evaluate(() => window.__terrabound.game.body.x);
  check('walking moves the player', x1 > x0 + 3, `x ${x0.toFixed(1)} -> ${x1.toFixed(1)}`);

  // Jump.
  const y0 = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(150);
  const yUp = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.keyboard.up('KeyW');
  check('jumping lifts the player', yUp < y0 - 0.5, `y ${y0.toFixed(2)} -> ${yUp.toFixed(2)}`);
  const squashed = await page
    .waitForFunction(() => window.__terrabound.fx.squashLeft > 0, null, { polling: 'raf', timeout: 1500 })
    .then(() => true, () => false);
  if (squashed) await page.screenshot({ path: path.join(out, "02a-landing.png") });
  check('landing squashes the sprite', squashed);
  await page.waitForTimeout(600);

  // Dig the tile under the feet with the real mouse.
  const target = await page.evaluate(() => {
    const g = window.__terrabound.game;
    return { tx: Math.floor(g.body.x), ty: Math.floor(g.body.y) };
  });
  const before = await page.evaluate(([tx, ty]) => window.__terrabound.game.world.get(tx, ty), [target.tx, target.ty]);
  const pos = await tileToCss(page, target.tx, target.ty);
  await page.mouse.move(pos.x, pos.y);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '02-digging.png') });
  await page.mouse.up();
  const after = await page.evaluate(([tx, ty]) => window.__terrabound.game.world.get(tx, ty), [target.tx, target.ty]);
  const carried = await page.evaluate(() => Object.values(window.__terrabound.game.carried).reduce((a, b) => a + (b ?? 0), 0));
  check('mouse digging removes the block', before !== 0 && after === 0, `tile ${before} -> ${after}`);
  check('mined block lands in the pack', carried >= 1, `carried ${carried}`);
  // Guided goals: a fresh game shows GOAL 1 (drill down) under the HUD, clear of the buttons; finishing it moves on.
  const goal1 = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    const g = ui.goalRect;
    const btns = ui.rects.filter((r) => ['settings', 'mute', 'map'].includes(r.a.k));
    const clear = !!g && btns.every((b) => g.x + g.w <= b.x || b.x + b.w <= g.x || g.y + g.h <= b.y || b.y + b.h <= g.y);
    return { id: g?.id, clear, step: game.goal?.step.id, have: game.goal?.have };
  });
  check('fresh game shows the first guided goal card, clear of the HUD buttons', goal1.id === 'dig' && goal1.clear, JSON.stringify(goal1));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    for (let i = 0; i < 8; i++) g.emit({ t: 'break', x: 0, y: 0, tile: 1 });
  });
  await page.waitForTimeout(250);
  const goal2 = await page.evaluate(() => ({ id: window.__terrabound.ui.goalRect?.id, toast: window.__terrabound.ui.toasts.some((t) => t.text.startsWith('Goal done')) }));
  await page.screenshot({ path: path.join(out, '49-goal.png') });
  check('finishing a goal toasts and shows the next goal', goal2.id === 'deep' && goal2.toast, JSON.stringify(goal2));

  // Shop flow at the base: grant resources, buy through the real UI action, verify persistence across reload.
  await page.evaluate(() => {
    const t = window.__terrabound;
    const g = t.game;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = 0;
    g.body.vy = 0;
    g.stash.iron_scrap = 100;
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(300);
  check('B opens the workshop at the base', await page.evaluate(() => window.__terrabound.ui.shopOpen));
  await page.screenshot({ path: path.join(out, '03-shop.png') });
  await page.evaluate(() => window.__terrabound.act({ k: 'buy', id: 'battery' }));
  check('buying an upgrade raises max battery', (await page.evaluate(() => window.__terrabound.game.derived.maxBattery)) === 300);
  await page.keyboard.press('Escape');
  // Dig a marker hole in the world; the world persists until death, so it must survive the reload.
  const mark = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const x = g.world.padX + 45;
    const y = g.world.surface[x] + 3;
    g.world.set(x, y, 0);
    return { x, y, seed: g.world.seed };
  });
  // Unload saves through pagehide; reload like a player closing and reopening the tab.
  await page.reload();
  await page.waitForFunction(() => window.__terrabound);
  const persisted = await page.evaluate(() => window.__terrabound.game.upgrades.battery);
  check('progress persists across reload', persisted === 1, `battery level ${persisted}`);
  const worldKept = await page.evaluate(({ x, y, seed }) => {
    const g = window.__terrabound.game;
    return g.world.seed === seed && g.world.get(x, y) === 0;
  }, mark);
  check('the world (dug tiles) persists across reload', worldKept, JSON.stringify(mark));

  // Dive and die: loot is halved, a new world starts, nothing crashes.
  await page.keyboard.press('Space');
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.carried = { iron_scrap: 10 };
    g.body.y = g.world.padY + 30;
    for (let dy = -2; dy <= 0; dy++) g.world.set(Math.floor(g.body.x), Math.floor(g.body.y) + dy, 0);
    g.hp = 0;
  });
  await page.waitForTimeout(500);
  const deaths = await page.evaluate(() => window.__terrabound.game.stats.deaths);
  check('dying is handled and a new dive begins', deaths === 1 && (await page.evaluate(() => window.__terrabound.game.isAtBase())));
  await page.screenshot({ path: path.join(out, '04-after-death.png') });

  // Q swaps drill/blade; an enemy placed beside the player gets hurt by a blade swing.
  await page.keyboard.press('KeyQ');
  check('Q selects the blade', (await page.evaluate(() => window.__terrabound.game.tool)) === 'blade');
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.y = g.world.padY + 30;
    for (let dy = -3; dy <= 0; dy++) for (let dx = -4; dx <= 4; dx++) g.world.set(Math.floor(g.body.x) + dx, Math.floor(g.body.y) + dy, 0);
    for (let dx = -4; dx <= 4; dx++) g.world.set(Math.floor(g.body.x) + dx, Math.floor(g.body.y), 1);
    g.body.y = Math.floor(g.body.y);
    g.facing = 1;
    g.enemies = [{ id: 1, kind: 'crawler', x: g.body.x + 1.3, y: g.body.y - 0.01, vx: 0, vy: 0, hp: 24, dir: 1, iframes: 0, age: 0, phase: 0 }];
  });
  await page.mouse.move(700, 300);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  const hurt = await page.evaluate(() => window.__terrabound.game.enemies.every((e) => e.hp < 24));
  check('blade swing damages an enemy', hurt);
  await page.screenshot({ path: path.join(out, '05-blade.png') });
  // Hit squash: freeze the sim on the hit frame (long hit-stop) and check the crawler draws squashed flat.
  const squash = await page.evaluate(async () => {
    const t = window.__terrabound;
    const g = t.game;
    g.enemies = [{ id: 9, kind: 'crawler', x: g.body.x + 2, y: g.body.y - 0.01, vx: 0, vy: 0, hp: 24, dir: -1, iframes: 0, age: 0, phase: 0 }];
    g.damageEnemy(g.enemies[0], 1, 1);
    g.hitStop = 5;
    await new Promise((r) => setTimeout(r, 120));
    return { left: g.enemies[0]?.iframes ?? 0 };
  });
  await page.screenshot({ path: path.join(out, '05b-hit-squash.png') });
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.hitStop = 0;
    g.enemies = [];
  });
  check('a hit squashes the enemy sprite on the hit frame', squash.left > 0.1, JSON.stringify(squash));
  await page.keyboard.press('KeyQ');
  check('Q cycles to the pistol', (await page.evaluate(() => window.__terrabound.game.tool)) === 'pistol');
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.facing = 1;
    g.enemies = [{ id: 2, kind: 'crawler', x: g.body.x + 6, y: g.body.y - 0.01, vx: 0, vy: 0, hp: 24, dir: 1, iframes: 0, age: 0, phase: 0 }];
  });
  await page.mouse.move(900, 400);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  check('pistol bolt fires', (await page.evaluate(() => window.__terrabound.game.battery)) > 0);
  await page.screenshot({ path: path.join(out, '06-pistol.png') });
  // Killing an enemy shatters it into sprite debris with a shock ring.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.facing = 1;
    g.enemies = [{ id: 3, kind: 'crawler', x: g.body.x + 3, y: g.body.y - 0.01, vx: 0, vy: 0, hp: 1, dir: 1, iframes: 0, age: 0, phase: 0 }];
  });
  await page.mouse.move(900, 400);
  await page.mouse.down();
  const killed = await page
    .waitForFunction(() => window.__terrabound.game.enemies.length === 0, null, { timeout: 2000 })
    .then(() => true, () => false);
  await page.mouse.up();
  const burst = await page.evaluate(() => ({ p: window.__terrabound.fx.particles.length, r: window.__terrabound.fx.rings.length }));
  await page.screenshot({ path: path.join(out, '06b-kill-burst.png') });
  check('enemy kill shatters into debris', killed && burst.p >= 15 && burst.r >= 1, JSON.stringify(burst));
  // Crafting and torches: craft at the base, place deep underground, screenshot the lit cave.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.stash.rust = 10;
    g.stash.iron_scrap = 10;
    window.__terrabound.act({ k: 'craft', id: 'torch' });
  });
  check('crafting at the base yields torches', (await page.evaluate(() => window.__terrabound.game.carried.torch)) === 2);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.y = g.world.padY + 30;
    const bx = Math.floor(g.body.x);
    const by = Math.floor(g.body.y);
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 0; dy++) g.world.set(bx + dx, by + dy, 0);
    for (let dx = -3; dx <= 3; dx++) g.world.set(bx + dx, by + 1, 1);
    g.world.set(bx + 3, by - 2, 1);
    g.selected = 'torch';
    g.world.set(bx + 2, by - 2, 7);
    g.hp = 100;
    g.battery = 200;
  });
  await page.waitForTimeout(600);
  check('a torch tile is lit in the world', await page.evaluate(() => window.__terrabound.game.world.torches.size > 0));
  const lit = await page.evaluate(() => {
    const { game: g, renderer: r } = window.__terrabound;
    const bx = Math.floor(g.body.x);
    const by = Math.floor(g.body.y);
    // Far rock: the solid cell farthest from the pocket that is still on screen.
    return { torch: r.lightLevel(bx + 2, by - 2), rock: r.lightLevel(bx - 10, by + 6) };
  });
  check('light map lights the torch and leaves deep rock dark', lit.torch >= 32 && lit.rock === 0, JSON.stringify(lit));
  await page.screenshot({ path: path.join(out, '07-torch.png') });
  // Hazards: a telegraphed acid drip and a gas pocket render and hurt without errors.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.enemies = [];
    g.iframes = 0;
    g.hp = 100;
    g.hazards.gas.push({ x: g.body.x + 2.5, y: g.body.y - 1, r: 2.5 });
    // Tagged so natural drips from the (now larger) world cannot be confused with this one.
    window.__testAcid = { kind: 'acid', x: g.body.x, y: g.body.y - 3, vy: 0, warn: 0.6 };
    g.fallers.push(window.__testAcid);
    g.fallers.push({ kind: 'debris', x: g.body.x - 2, y: g.body.y - 3, vy: 0, warn: 5 });
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, '07b-hazards.png') });
  check('hazard telegraphs are live', (await page.evaluate(() => window.__terrabound.game.fallers.length)) >= 2);
  await page.waitForTimeout(1200);
  check('acid drop lands or hurts', await page.evaluate(() => !window.__terrabound.game.fallers.includes(window.__testAcid)));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.stash.rust = 10;
    g.stash.iron_scrap = 10;
  });
  await page.keyboard.press('KeyB');
  await page.evaluate(() => { window.__terrabound.ui.setShopTab('fab'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '08-shop-crafting.png') });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit1');
  check('1 selects the drill', (await page.evaluate(() => window.__terrabound.game.tool)) === 'drill');

  // Back walls: '-' selects the wall, a right click builds it in the wall layer behind the player.
  await page.evaluate(() => { window.__terrabound.game.carried.wall = 4; });
  await page.keyboard.press('Minus');
  const wallSel = await page.evaluate(() => window.__terrabound.game.selected);
  const wpos = await page.evaluate(() => {
    const { game: g, renderer: r } = window.__terrabound;
    const tx = Math.floor(g.body.x) + 1;
    const ty = g.world.padY - 1;
    const ts = 16 * r.scale;
    return { tx, ty, sx: r.w / 2 + (tx + 0.5 - r.camX) * ts, sy: r.h / 2 + (ty + 0.5 - r.camY) * ts };
  });
  await page.mouse.move(wpos.sx, wpos.sy);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(200);
  await page.mouse.up({ button: 'right' });
  const wallState = await page.evaluate(({ tx, ty }) => {
    const w = window.__terrabound.game.world;
    return { wall: w.wall(tx, ty), tile: w.get(tx, ty) };
  }, wpos);
  check('- selects the back wall and right click builds it behind', wallSel === 'wall' && wallState.wall === 3 && wallState.tile === 0, JSON.stringify({ wallSel, ...wallState }));
  await page.screenshot({ path: path.join(out, '08b-back-wall.png') });
  await page.keyboard.press('Digit1');

  // World tour: stand on the surface of every biome (and near a structure) and screenshot it.
  const biomeNames = ['wastes', 'jungle', 'crystal', 'ash', 'frost'];
  const seen = [];
  for (let b = 0; b < biomeNames.length; b++) {
    const ok = await page.evaluate((bid) => {
      const g = window.__terrabound.game;
      const w = g.world;
      // Middle of the biome's first band, nudged toward a structure when one is close.
      const cols = [];
      for (let x = 30; x < w.w - 30; x++) if (w.biome[x] === bid && Math.abs(x - w.padX) > 40) cols.push(x);
      if (bid === 0) cols.push(w.padX + 30);
      if (cols.length === 0) return false;
      let x = cols[Math.floor(cols.length / 4)];
      const st = w.structures.find((s) => s.kind !== 'vault' && s.kind !== 'geode' && w.biome[s.x0] === bid);
      if (st) x = st.x0 - 6;
      g.enemies = [];
      g.fallers = [];
      g.hp = g.derived.maxHp;
      g.battery = g.derived.maxBattery;
      g.body.x = x + 0.5;
      g.body.y = w.surface[x] - 0.01;
      g.body.vx = 0;
      g.body.vy = 0;
      return true;
    }, b);
    await page.waitForTimeout(500);
    if (ok) seen.push(biomeNames[b]);
    await page.screenshot({ path: path.join(out, `11-biome-${biomeNames[b]}.png`) });
    if (biomeNames[b] === 'ash') {
      // Surface variety: pale drift caps on the dune tops and clustered glowing crust cracks.
      const ash = await page.evaluate(() => {
        const r = window.__terrabound.renderer;
        return { drifts: r.ashDriftsDrawn, cracks: r.ashCracksDrawn };
      });
      check('the Ash Dunes show drift caps and cracked glowing crust', ash.drifts > 4 && ash.cracks > 0, JSON.stringify(ash));
    }
  }
  check('every biome can be visited and renders', seen.length === biomeNames.length, seen.join(','));
  await toastCheck(page, 'desktop', '46-toasts.png');
  // Underground points of interest: stand beside a data shrine and check that its terminal glows.
  const shrine = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const s = g.world.structures.find((st) => st.kind === 'shrine');
    if (!s) return null;
    g.enemies = [];
    g.body.x = s.x0 - 0.5;
    g.body.y = s.y1;
    g.body.vx = g.body.vy = 0;
    for (let dy = -3; dy < 0; dy++) for (let dx = -2; dx <= 0; dx++) g.world.set(s.x0 + dx, s.y1 + dy, 0);
    return { x: s.x0 + 1, y: s.y1 - 1 };
  });
  await page.waitForTimeout(600);
  const glow = shrine ? await page.evaluate(({ x, y }) => window.__terrabound.renderer.lightLevel(x, y), shrine) : -1;
  await page.screenshot({ path: path.join(out, '16-shrine.png') });
  check('a data shrine terminal glows in the dark', glow >= 16, JSON.stringify({ shrine, glow }));

  // Liquids: drop into a real flooded cave and swim up with the jump key.
  const poolAt = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    for (let y = w.padY + 20; y < w.h - 5; y++) {
      for (let x = 30; x < w.w - 30; x++) {
        if (w.get(x, y) !== 25 || w.get(x, y - 1) !== 25 || w.get(x, y - 2) === 25) continue;
        g.enemies = [];
        g.body.x = x + 0.5;
        g.body.y = y + 0.9;
        g.body.vx = g.body.vy = 0;
        return { x, y };
      }
    }
    return null;
  });
  await page.waitForTimeout(500);
  const swim = await page.evaluate(() => ({ inLiquid: window.__terrabound.game.inLiquid, y: window.__terrabound.game.body.y }));
  await page.screenshot({ path: path.join(out, '17-water.png') });
  // Living water: the pool's surface crest rolls (two draws at different times differ) and deep cells shade darker.
  const waves = poolAt ? await page.evaluate(({ x, y }) => {
    const t = window.__terrabound;
    const g = t.game;
    const w = g.world;
    // The pool can settle a cell while the swimmer moves: find its live surface below or above the start.
    let top = y;
    while (w.get(x, top) !== 25 && top < y + 6) top++;
    while (w.get(x, top - 1) === 25) top--;
    const r = t.renderer;
    const ts = 16 * r.scale;
    const ctx = document.getElementById('game').getContext('2d');
    // A 5-tile strip centred on the pool: the swimmer covers about one tile of it.
    const px = Math.round(r.w / 2 + (x - 2 - r.camX) * ts);
    const py = Math.round(r.h / 2 + (top - r.camY) * ts);
    const strip = () => Array.from(ctx.getImageData(px, py, Math.round(ts * 5), Math.round(ts / 4)).data).join(',');
    const frames = [];
    for (const time of [1, 1.4, 1.8, 2.2, 2.6, 3.0]) {
      r.draw(g, t.fx, null, time);
      frames.push(strip());
    }
    return { shown: r.liquidShown, top, changed: new Set(frames).size > 1, parked: g.parkedVehicle(), x, px, py, owned: g.save.gear.owned };
  }, poolAt) : null;
  check('water surface crest rolls over time and liquid cells draw per frame', !!waves && waves.changed && waves.shown > 0, JSON.stringify(waves));
  await page.keyboard.down('KeyW');
  let swamUp = swim.y;
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(60);
    swamUp = Math.min(swamUp, await page.evaluate(() => window.__terrabound.game.body.y));
  }
  await page.keyboard.up('KeyW');
  check('the player swims in a flooded cave and W strokes upward', !!poolAt && swim.inLiquid === 25 && swamUp < swim.y - 0.5, JSON.stringify({ poolAt, swim, swamUp }));
  // Swimming juice: the helmet leaks hollow air bubbles while under, and diving in from above splashes.
  // A sealed bedrock tank (5 wide, 4 deep, 5 rows of air above) so flowing water cannot move the surface.
  const tank = poolAt ? await page.evaluate(({ x, y }) => {
    const g = window.__terrabound.game;
    const w = g.world;
    const top = y - 6;
    for (let yy = top - 6; yy <= top + 4; yy++) for (let xx = x - 3; xx <= x + 3; xx++) {
      const wall = xx === x - 3 || xx === x + 3 || yy === top + 4 || yy === top - 6;
      w.set(xx, yy, wall ? 5 : yy >= top ? 25 : 0);
    }
    g.enemies = [];
    return { x, top };
  }, poolAt) : null;
  const bubbled = tank ? await page.evaluate(async ({ x, top }) => {
    const t = window.__terrabound;
    const g = t.game;
    let most = 0;
    for (let i = 0; i < 20; i++) {
      g.body.x = x + 0.5;
      g.body.y = top + 3.9;
      g.body.vx = g.body.vy = 0;
      await new Promise((r) => setTimeout(r, 60));
      most = Math.max(most, t.fx.particles.filter((p) => p.hollow).length);
    }
    return { most, inLiquid: g.inLiquid };
  }, tank) : null;
  check('the helmet leaks air bubbles while under water', !!bubbled && bubbled.most >= 2, JSON.stringify(bubbled));
  const splash = tank ? await page.evaluate(async ({ x, top }) => {
    const t = window.__terrabound;
    const g = t.game;
    g.body.x = x + 0.5;
    g.body.y = top - 3;
    g.body.vx = g.body.vy = 0;
    await new Promise((r) => setTimeout(r, 150));
    t.fx.particles = [];
    t.fx.rings = [];
    g.body.x = x + 0.5;
    g.body.y = top - 0.3;
    g.body.vy = 16;
    let drops = 0;
    let rings = 0;
    for (let i = 0; i < 12 && (drops < 6 || rings < 1); i++) {
      await new Promise((r) => setTimeout(r, 20));
      drops = Math.max(drops, t.fx.particles.filter((p) => !p.hollow && p.vy < 0 && Math.abs(p.y - top) < 2).length);
      rings = Math.max(rings, t.fx.rings.length);
    }
    return { top, drops, rings, inLiquid: g.inLiquid };
  }, tank) : null;
  await page.screenshot({ path: path.join(out, '17b-splash.png') });
  check('diving into water throws a splash crown and a ring', !!splash && splash.drops >= 6 && splash.rings >= 1, JSON.stringify(splash));
  // Swim pose: in a wide sealed tank, hold D near the surface; the body leans head-first toward the stroke.
  const lane = tank ? await page.evaluate(({ x, top }) => {
    const g = window.__terrabound.game;
    const w = g.world;
    const t0 = top - 20;
    for (let yy = t0 - 6; yy <= t0 + 5; yy++) for (let xx = x - 14; xx <= x + 14; xx++) {
      const wall = xx === x - 14 || xx === x + 14 || yy === t0 + 5 || yy === t0 - 6;
      w.set(xx, yy, wall ? 5 : yy >= t0 ? 25 : 0);
    }
    g.enemies = [];
    g.body.x = x - 11.5;
    g.body.y = t0 + 2.2;
    g.body.vx = g.body.vy = 0;
    return { x, top: t0 };
  }, tank) : null;
  await page.waitForTimeout(250);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  const stroke = await page.evaluate(() => ({ ...window.__terrabound.renderer.swimInfo, vx: window.__terrabound.game.body.vx }));
  await page.screenshot({ path: path.join(out, '17c-swim-stroke.png') });
  await page.keyboard.up('KeyD');
  check('swimming leans the body toward the stroke', !!lane && !!stroke && stroke.moving === true && stroke.angle > 0.6, JSON.stringify(stroke));
  await page.evaluate(({ x, top }) => {
    const g = window.__terrabound.game;
    g.body.x = x + 0.5;
    g.body.y = top + 1.6;
    g.body.vx = g.body.vy = 0;
  }, lane ?? { x: 0, top: 0 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(out, '17d-swim-tread.png') });

  // Loot: aim the drill at a real chest in a ruin and break it with the mouse.
  const chestAt = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    for (let x = 2; x < w.w - 2; x++) {
      for (let y = 5; y < w.padY + 5; y++) {
        if (w.get(x, y) !== 22 || Math.abs(x - w.padX) < 30) continue;
        // Stand beside the chest on its floor.
        for (let dy = -3; dy <= -1; dy++) w.set(x - 1, y + dy + 1, 0);
        g.body.x = x - 0.5;
        g.body.y = y + 1 - 0.01;
        g.body.vx = g.body.vy = 0;
        g.carried = {};
        g.setTool('drill');
        return { x, y };
      }
    }
    return null;
  });
  await page.waitForTimeout(400);
  if (chestAt) {
    // The camera eases toward a teleported player; aim only once it has settled.
    await page.waitForFunction(() => Math.abs(window.__terrabound.renderer.camX - window.__terrabound.game.body.x) < 0.3, null, { timeout: 3000 }).catch(() => {});
    const pos = await tileToCss(page, chestAt.x, chestAt.y);
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.up();
  }
  const opened = await page.evaluate(() => !!window.__terrabound.game.chestOpen);
  check('clicking a ruin chest opens its window (it is not destroyed)', !!chestAt && opened, JSON.stringify({ chestAt, opened }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '12-chest-window.png') });
  // TAKE ALL like a player.
  const takeBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'take' && r.a.id === 'all'));
  if (takeBtn) await page.mouse.click(takeBtn.x + takeBtn.w / 2, takeBtn.y + takeBtn.h / 2);
  await page.waitForTimeout(200);
  const loot = await page.evaluate(() => Object.values(window.__terrabound.game.carried).reduce((a, n) => a + (n || 0), 0));
  check('TAKE ALL moves the chest loot into the pack', !!chestAt && loot > 0, JSON.stringify({ chestAt, loot }));
  await page.keyboard.press('KeyE');
  check('E closes the chest window', !(await page.evaluate(() => !!window.__terrabound.game.chestOpen)));
  // Inventory: I opens it with the character in gear; selecting a fish and eating it heals.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.carried.fish = 2;
    g.hp = 40;
  });
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(250);
  check('I opens the inventory', await page.evaluate(() => window.__terrabound.ui.invOpen));
  const fishCell = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'invsel' && r.a.id === 'fish'));
  if (fishCell) await page.mouse.click(fishCell.x + fishCell.w / 2, fishCell.y + fishCell.h / 2);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '18-inventory.png') });
  const eatBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'use'));
  if (eatBtn) await page.mouse.click(eatBtn.x + eatBtn.w / 2, eatBtn.y + eatBtn.h / 2);
  const ate = await page.evaluate(() => ({ hp: window.__terrabound.game.hp, fish: window.__terrabound.game.carried.fish }));
  check('selecting a fish in the inventory and pressing EAT heals', ate.hp > 40 && ate.fish === 1, JSON.stringify(ate));
  // Awards: the AWARDS button in the inventory pages through every award; play so far was counted.
  const awardsBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'awards'));
  if (awardsBtn) await holdClick(page, awardsBtn.x + awardsBtn.w / 2, awardsBtn.y + awardsBtn.h / 2);
  await page.waitForTimeout(200);
  const awardsPage = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    return { page: ui.invPage, shown: ui.awardsShown, gifts: ui.giftsShown, meals: game.awards.n.meals ?? 0, chests: game.awards.n.chests ?? 0, mined: game.awards.n.mined ?? 0 };
  });
  await page.screenshot({ path: path.join(out, '48-awards.png') });
  check('AWARDS page lists award cards with their gifts and play was counted (meal eaten, chest opened)', awardsPage.page === 'awards' && awardsPage.shown >= 6 && awardsPage.gifts === awardsPage.shown && awardsPage.meals >= 1 && awardsPage.chests >= 1, JSON.stringify(awardsPage));
  const nextBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'awardpage' && r.a.d === 1));
  if (nextBtn) await holdClick(page, nextBtn.x + nextBtn.w / 2, nextBtn.y + nextBtn.h / 2);
  await page.waitForTimeout(150);
  const page2 = await page.evaluate(() => window.__terrabound.ui.awardFirst);
  check('NEXT pages the awards list', page2 > 0, JSON.stringify({ page2 }));
  // An unlock announces itself once with an Award toast.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.awards.n.dashes = 49;
    window.__torchBefore = g.stash.torch ?? 0;
    g.emit({ t: 'dash' });
  });
  await page.waitForTimeout(250);
  const unlocked = await page.evaluate(() => ({ done: window.__terrabound.game.awards.done.includes('dash1'), toast: window.__terrabound.ui.toasts.some((t) => t.text === 'Award: Blink! Gift in stash: 6 Torch'), gift: (window.__terrabound.game.stash.torch ?? 0) - window.__torchBefore }));
  await page.screenshot({ path: path.join(out, '48b-award-unlock.png') });
  check('reaching a goal unlocks the award with an Award toast and its stash gift', unlocked.done && unlocked.toast && unlocked.gift === 6, JSON.stringify(unlocked));
  // Codex: back to items, open CODEX; places found so far are named, the tabs switch sections, a kill and a log are learnt.
  const clickAct = async (pred) => {
    const r = await page.evaluate((src) => window.__terrabound.ui.rects.find(new Function('r', `return ${src}`)), pred);
    if (r) await holdClick(page, r.x + r.w / 2, r.y + r.h / 2);
    await page.waitForTimeout(150);
    return !!r;
  };
  await clickAct("r.a.k === 'awards' && r.a.open === false");
  const codexBtn = await clickAct("r.a.k === 'codex' && r.a.open === true");
  const codex1 = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    const rows = game.codexRows;
    return { btn: true, page: ui.invPage, shown: ui.codexShown, places: rows.filter((r) => r.section === 'places' && r.found).length };
  });
  await page.screenshot({ path: path.join(out, '51-codex.png') });
  check('CODEX in the inventory lists places, with the ones found so far named', codexBtn && codex1.page === 'codex' && codex1.shown >= 6 && codex1.places >= 1, JSON.stringify(codex1));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.emit({ t: 'enemykill', x: 0, y: 0, kind: 'hulk' });
  });
  await clickAct("r.a.k === 'codexsec' && r.a.sec === 'creatures'");
  const codex2 = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    return { sec: ui.codexSec, shown: ui.codexShown, hulk: game.codexRows.find((r) => r.id === 'enemy:hulk')?.found };
  });
  await page.screenshot({ path: path.join(out, '51b-codex-creatures.png') });
  check('CREATURES tab lists enemies and bosses; a kill reveals its entry', codex2.sec === 'creatures' && codex2.shown >= 6 && codex2.hulk === true, JSON.stringify(codex2));
  await page.evaluate(() => window.__terrabound.game.emit({ t: 'lore', text: 'LOG 07: Drones refuse orders below 60m. Something talks to them.' }));
  await clickAct("r.a.k === 'codexsec' && r.a.sec === 'logs'");
  const codex3 = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    return { sec: ui.codexSec, shown: ui.codexShown, log: game.codexRows.find((r) => r.id === 'lore:2')?.found };
  });
  await page.screenshot({ path: path.join(out, '51c-codex-logs.png') });
  check('LOGS tab shows read logs in full and missing ones as gaps', codex3.sec === 'logs' && codex3.shown >= 6 && codex3.log === true, JSON.stringify(codex3));
  // Log reader: click a read log, page to the next read one in story order, back to the list.
  await page.evaluate(() => window.__terrabound.game.emit({ t: 'lore', text: 'LOG 21: Ash falls up here. It comes from a fire far below.' }));
  await page.waitForTimeout(100);
  const openedLog = await clickAct("r.a.k === 'logread' && r.a.i === 2");
  const reader1 = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    return { open: ui.logOpen, next: ui.rects.find((r) => r.a.k === 'logread' && r.a.i !== null && r.y > 300)?.a.i ?? null, cards: ui.rects.filter((r) => r.a.k === 'logread' && r.h > 40).length };
  });
  await page.screenshot({ path: path.join(out, '51f-log-reader.png') });
  check('a read log opens in the reader with NEXT to the next read log', openedLog && reader1.open === 2 && reader1.next === 7 && reader1.cards === 0, JSON.stringify(reader1));
  await clickAct("r.a.k === 'logread' && r.a.i === 7");
  const reader2 = await page.evaluate(() => window.__terrabound.ui.logOpen);
  await clickAct("r.a.k === 'logread' && r.a.i === null");
  const reader3 = await page.evaluate(() => ({ open: window.__terrabound.ui.logOpen, shown: window.__terrabound.ui.codexShown }));
  check('NEXT pages the story and ALL LOGS returns to the list', reader2 === 7 && reader3.open === null && reader3.shown >= 6, JSON.stringify({ reader2, reader3 }));
  // Crew tab: Dex once seen over the pad; unknown robots keep their names hidden.
  await page.evaluate(() => window.__terrabound.game.emit({ t: 'merchant', here: true }));
  await clickAct("r.a.k === 'codexsec' && r.a.sec === 'crew'");
  const crew = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    const rows = game.codexRows.filter((r) => r.section === 'crew');
    return { sec: ui.codexSec, shown: ui.codexShown, dex: rows.find((r) => r.id === 'crew:merchant')?.title, hidden: rows.filter((r) => !r.found).every((r) => r.title.startsWith('???')) };
  });
  await page.screenshot({ path: path.join(out, '51g-codex-crew.png') });
  check('CREW tab lists the robots and Dex; met ones are named', crew.sec === 'crew' && crew.shown === 5 && /Dex/.test(crew.dex ?? '') && crew.hidden, JSON.stringify(crew));
  await clickAct("r.a.k === 'codex' && r.a.open === false");
  check('< ITEMS leaves the codex', (await page.evaluate(() => window.__terrabound.ui.invPage)) === 'items');
  // Suit paint: locked until a gold award; earning one lets PAINT cycle it on, the preview and the save follow.
  const paintLocked = await page.evaluate(() => window.__terrabound.ui.rects.some((r) => r.a.k === 'paint'));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.awards.n.upgrades = 25;
    g.awardCheck();
  });
  await page.waitForTimeout(150);
  const painted = await clickAct("r.a.k === 'paint'");
  const paint = await page.evaluate(() => {
    const { game, ui } = window.__terrabound;
    return { id: game.paint?.id ?? null, saved: game.toSave().paint, toast: ui.toasts.some((t) => t.text === 'Suit paint: Gilded') };
  });
  await page.screenshot({ path: path.join(out, '52-suit-paint.png') });
  check('PAINT is locked until a gold award, then cycles the earned paint on (saved)', !paintLocked && painted && paint.id === 'gilded' && paint.saved === 'gilded' && paint.toast, JSON.stringify({ paintLocked, painted, paint }));
  await clickAct("r.a.k === 'paint'");
  check('PAINT cycles back to the default look', (await page.evaluate(() => window.__terrabound.game.paint)) === null);
  // Helmet and vehicle paints cycle on their own buttons and save separately from the suit.
  const helmClick = await clickAct("r.a.k === 'paint' && r.a.slot === 'helm'");
  const rideClick = await clickAct("r.a.k === 'paint' && r.a.slot === 'ride'");
  const slots = await page.evaluate(() => {
    const { game, ui } = window.__terrabound;
    const sv = game.toSave();
    return { suit: game.paint?.id ?? null, helm: game.helmPaint?.id ?? null, ride: game.ridePaint?.id ?? null, saved: [sv.paintHelm, sv.paintRide], toast: ui.toasts.some((t) => t.text === 'Helmet paint: Gilded') || ui.toasts.some((t) => t.text === 'Vehicle paint: Gilded'), buttons: ui.rects.filter((r) => r.a.k === 'paint').length };
  });
  await page.screenshot({ path: path.join(out, '52b-helm-ride-paint.png') });
  check('HELM and RIDE paint buttons cycle their own slot (saved, suit untouched)', helmClick && rideClick && slots.buttons === 3 && slots.suit === null && slots.helm === 'gilded' && slots.ride === 'gilded' && slots.saved[0] === 'gilded' && slots.saved[1] === 'gilded' && slots.toast, JSON.stringify(slots));
  await clickAct("r.a.k === 'paint' && r.a.slot === 'helm'");
  await clickAct("r.a.k === 'paint' && r.a.slot === 'ride'");
  check('HELM and RIDE cycle back to the default look', await page.evaluate(() => window.__terrabound.game.helmPaint === null && window.__terrabound.game.ridePaint === null));
  await page.keyboard.press('KeyI');
  check('I closes the inventory', !(await page.evaluate(() => window.__terrabound.ui.invOpen)));
  // Tools: mouse wheel cycles to the fishing rod; casting at a pond and clicking on the bite lands a catch.
  await page.evaluate(() => window.__terrabound.game.setTool('pistol'));
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(100);
  check('mouse wheel switches tools', (await page.evaluate(() => window.__terrabound.game.tool)) === 'rod');
  const pond = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const p = g.world.structures.find((s) => s.kind === 'pond');
    if (!p) return null;
    const mid = (p.x0 + p.x1) >> 1;
    g.enemies = [];
    g.body.x = p.x0 - 1.5;
    g.body.y = g.world.surface[p.x0 - 2] - 0.01;
    g.body.vx = g.body.vy = 0;
    g.time = 30;
    return { x: mid - 2, y: p.y0 };
  });
  await page.waitForTimeout(300);
  await page.waitForFunction(() => Math.abs(window.__terrabound.renderer.camX - window.__terrabound.game.body.x) < 0.3, null, { timeout: 3000 }).catch(() => {});
  let caught = false;
  if (pond) {
    const wp = await tileToCss(page, pond.x, pond.y);
    await holdClick(page, wp.x, wp.y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, '19-fishing.png') });
    await page.waitForFunction(() => (window.__terrabound.game.fishing?.bite ?? 0) > 0.5, null, { timeout: 9000 }).catch(() => {});
    await holdClick(page, wp.x, wp.y);
    await page.waitForTimeout(150);
    caught = await page.evaluate(() => window.__terrabound.game.fishing === null);
  }
  const bag = await page.evaluate(() => JSON.stringify(window.__terrabound.game.carried));
  check('casting the rod at a pond and clicking on the bite lands a catch', !!pond && caught, bag);
  // Sky island screenshot.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const s = g.world.structures.find((x) => x.kind === 'island');
    if (!s) return;
    g.body.x = (s.x0 + s.x1) / 2;
    g.body.y = s.y0 + 0.99;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.setTool('drill');
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, '20-sky-island.png') });
  // Garage: craft a kit, place it with a right click, open it with E, BUILD with real clicks, walk up, ride with V.
  const bay = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.stash = { metal: 400, iron_scrap: 400, copper_wire: 400, crystal: 400, biomass: 400 };
    let x = w.padX + 40;
    while (!(w.isSolid(x, w.surface[x]) && w.get(x, w.surface[x] - 1) === 0)) x++;
    const y = w.surface[x];
    for (let xx = x - 14; xx <= x + 14; xx++) {
      for (let yy = y - 9; yy < y; yy++) { w.set(xx, yy, 0); w.setWall?.(xx, yy, 0); }
      w.set(xx, y, 1);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.carried.garage_kit = 1;
    g.selected = 'garage_kit';
    return { tx: x + 2, ty: y - 1 };
  });
  await page.waitForTimeout(500);
  const bayPos = await tileToCss(page, bay.tx, bay.ty);
  await page.mouse.move(bayPos.x, bayPos.y);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(120);
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(100);
  const placedBay = await page.evaluate(({ tx, ty }) => ({ found: (() => { const w = window.__terrabound.game.world; for (let y = ty - 4; y <= ty + 4; y++) for (let x = tx - 6; x <= tx + 6; x++) if (w.get(x, y) === 68) return { x, y }; return null; })(), bay: window.__terrabound.game.world.get(tx, ty), roof: window.__terrabound.game.world.get(tx, ty - 4), open: window.__terrabound.game.garageOpen }), bay);
  check('a garage kit right-click places a bay with a roof frame', !!placedBay.found && (await page.evaluate(({ x, y }) => window.__terrabound.game.world.get(x, y - 4), placedBay.found ?? { x: 0, y: 0 })) === 2, JSON.stringify({ bay, ...placedBay }));
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(150);
  check('E opens the garage panel', await page.evaluate(() => !!window.__terrabound.game.garageOpen));
  await page.screenshot({ path: path.join(out, '21-garage.png') });
  const buildBtn = async (id) => {
    const r = await page.evaluate((v) => window.__terrabound.ui.rects.find((q) => q.a.k === 'buildveh' && q.a.id === v), id);
    if (r) await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2);
    await page.waitForTimeout(120);
    return r;
  };
  const buggyBtn = await buildBtn('buggy');
  const built = await page.evaluate(() => ({ owned: window.__terrabound.game.ownsGear('buggy'), parked: window.__terrabound.game.parkedVehicle() }));
  check('BUILD in the garage makes a buggy and parks it by the bay', built.owned && built.parked?.id === 'buggy', JSON.stringify({ buggyBtn, ...built }));
  const partBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((q) => q.a.k === 'part' && q.a.id === 'buggy' && q.a.part === 'engine'));
  if (partBtn) await page.mouse.click(partBtn.x + partBtn.w / 2, partBtn.y + partBtn.h / 2);
  await page.waitForTimeout(120);
  check('a garage part upgrade fits a buggy engine', (await page.evaluate(() => window.__terrabound.game.vehicleParts('buggy').engine)) === 1, JSON.stringify(partBtn));
  await page.screenshot({ path: path.join(out, '21b-garage-built.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  // Walk right to the parked buggy, then ride it.
  await page.keyboard.down('KeyD');
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(50);
    if (await page.evaluate(() => window.__terrabound.game.canMount())) break;
  }
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '22a-buggy-parked.png') });
  await page.keyboard.down('KeyV');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyV');
  await page.waitForTimeout(100);
  const bx0 = await page.evaluate(() => window.__terrabound.game.body.x);
  const wd0 = await page.evaluate(() => window.__terrabound.renderer.wheelDist);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  const dusty = await page.evaluate(() => ({ dust: window.__terrabound.fx.particles.filter((p) => !p.hollow).length, pose: window.__terrabound.renderer.vehPose }));
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyD');
  check('driving the buggy kicks up dust and the vehicle pose is live', dusty.dust >= 4 && !!dusty.pose, JSON.stringify(dusty));
  const drive = await page.evaluate(() => ({ riding: window.__terrabound.game.riding, veh: window.__terrabound.game.vehicle, x: window.__terrabound.game.body.x }));
  await page.screenshot({ path: path.join(out, '22c-buggy.png') });
  check('walk up + V rides the buggy and it drives fast', drive.riding && drive.veh === 'buggy' && drive.x > bx0 + 4, JSON.stringify({ bx0, ...drive }));
  // Wheels turn with the ground: rolled distance tracks the distance driven, and stops when parked still.
  const spin = await page.evaluate(() => ({ wd: window.__terrabound.renderer.wheelDist }));
  await page.waitForTimeout(900);
  const still1 = await page.evaluate(() => ({ wd: window.__terrabound.renderer.wheelDist, vx: window.__terrabound.game.body.vx }));
  await page.waitForTimeout(300);
  const still2 = await page.evaluate(() => window.__terrabound.renderer.wheelDist);
  const ratio = (spin.wd - wd0) / Math.max(0.01, drive.x - bx0);
  check('buggy wheels spin with the distance driven and stop when it stops', ratio > 0.6 && ratio < 1.4 && (Math.abs(still1.vx) > 0.05 || Math.abs(still2 - still1.wd) < 0.01), JSON.stringify({ ratio, still1, still2 }));
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(100);
  check('V gets out and parks the buggy where you stopped', await page.evaluate(() => !window.__terrabound.game.riding && window.__terrabound.game.parkedVehicle()?.id === 'buggy'));
  // Vehicle paint: the parked buggy's hull takes the earned paint (Gilded #ffd23a), then back to red.
  const hullGold = async () => page.evaluate(() => {
    const { game, renderer } = window.__terrabound;
    const p = game.parkedVehicle();
    const c = document.querySelector('canvas');
    const pos = renderer.worldToScreen(p.x, p.y);
    const d = c.getContext('2d').getImageData(Math.max(0, Math.round(pos.x) - 60), Math.max(0, Math.round(pos.y) - 70), 120, 72).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 210 && d[i + 2] === 58) n++;
    return n;
  });
  const goldBefore = await hullGold();
  await page.evaluate(() => { window.__terrabound.game.save.paintRide = 'gilded'; });
  await page.waitForTimeout(150);
  const goldAfter = await hullGold();
  await page.screenshot({ path: path.join(out, '22d-buggy-paint.png') });
  await page.evaluate(() => { window.__terrabound.game.save.paintRide = null; });
  check('a vehicle paint recolours the parked buggy hull', goldBefore < 5 && goldAfter > 100, JSON.stringify({ goldBefore, goldAfter }));
  // Sky Jet: build it in the same garage (it deploys by the bay), teleport beside it, ride and fly.
  await page.evaluate(({ tx, ty }) => {
    const g = window.__terrabound.game;
    g.body.x = tx + 0.5;
    g.body.y = ty + 1;
    g.body.vx = g.body.vy = 0;
  }, bay);
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(150);
  await buildBtn('sky_jet');
  check('the garage builds a Sky Jet', await page.evaluate(() => window.__terrabound.game.ownsGear('sky_jet')));
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const p = g.parkedVehicle();
    g.body.x = p.x;
    g.body.y = p.y;
  });
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyV');
  const jetY0 = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  const flight = await page.evaluate(() => ({ riding: window.__terrabound.game.riding, y: window.__terrabound.game.body.y }));
  await page.screenshot({ path: path.join(out, '22-sky-jet.png') });
  check('V rides the Sky Jet and W flies up', flight.riding && flight.y < jetY0 - 5, JSON.stringify({ jetY0, ...flight }));
  await page.keyboard.press('KeyV');
  // Hoverbike and drill tank art checks: park each on the pad, ride, screenshot (sprite map, not rectangles).
  for (const id of ['hoverbike', 'drill_tank']) {
    const v = await page.evaluate((vid) => {
      const g = window.__terrabound.game;
      if (g.riding) g.toggleRide();
      if (!g.ownsGear(vid)) g.save.gear.owned.push(vid);
      g.body.x = g.world.padX + 0.5;
      g.body.y = g.world.padY;
      g.body.vx = g.body.vy = 0;
      g.save.garage.parked = { id: vid, x: g.body.x, y: g.body.y };
      g.toggleRide();
      return g.vehicle;
    }, id);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `22b-${id}.png`) });
    check(`the ${id} rides as a sprite`, v === id, String(v));
    if (id === 'drill_tank') {
      // The hull is drawn over the pilot: the pixel at the pilot's waist is tank green, not suit.
      const tuck = await page.evaluate(() => {
        const { game, renderer } = window.__terrabound;
        const c = document.getElementById('game');
        const p = renderer.worldToScreen(game.body.x, game.body.y);
        const d = c.getContext('2d').getImageData(Math.round(p.x), Math.round(p.y - 9.75 * renderer.scale), 1, 1).data;
        return { tucked: renderer.pilotTucked, rgb: [d[0], d[1], d[2]] };
      });
      check('the drill tank hull sits in front of the pilot', tuck.tucked && tuck.rgb[1] > tuck.rgb[0] && tuck.rgb[1] > tuck.rgb[2], JSON.stringify(tuck));
    }
  }
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    if (g.riding) g.toggleRide();
    g.save.garage.parked = { id: 'sky_jet', x: g.body.x, y: g.body.y };
    g.save.gear.equip.vehicle = 'sky_jet';
    g.gearCache = null;
  });
  // Lava: the Ash Dunes have glowing surface lava pools (seen from the rim, not touched).
  const lava = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const p = w.structures.find((st) => st.kind === 'lava');
    if (!p) return null;
    const rim = p.x0 - 3;
    g.body.x = rim + 0.5;
    g.body.y = w.surface[rim];
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    return { x0: p.x0, x1: p.x1, y: p.y0, mid: w.get((p.x0 + p.x1) >> 1, p.y0) };
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, '22d-lava-pool.png') });
  check('the Ash Dunes have a surface lava pool', !!lava && lava.mid === 40, JSON.stringify(lava));
  if (lava) {
    // Molten look: the pool shows crust, melt and glowing cracks (many colours, not a flat fill),
    // and the air above it shimmers (rows copied with a wobble).
    const molten = await page.evaluate((lv) => {
      const { renderer } = window.__terrabound;
      const c = document.getElementById('game');
      const ctx = c.getContext('2d');
      const a = renderer.worldToScreen(lv.x0 + 1, lv.y + 0.2);
      const b = renderer.worldToScreen(lv.x1 - 1, lv.y + 1.8);
      const w = Math.max(1, Math.round(b.x - a.x));
      const h = Math.max(1, Math.round(b.y - a.y));
      const d = ctx.getImageData(Math.round(a.x), Math.round(a.y), w, h).data;
      const cols = new Set();
      for (let i = 0; i < d.length; i += 4 * 7) cols.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
      return { lava: renderer.lavaShown, shimmer: renderer.shimmerRows, colours: cols.size, box: [Math.round(a.x), Math.round(a.y), w, h] };
    }, lava);
    check('surface lava flows with crust and cracks and the air above shimmers', molten.lava > 4 && molten.shimmer > 0 && molten.colours >= 4, JSON.stringify(molten));
    const [bx, by, bw, bh] = molten.box;
    await page.screenshot({ path: path.join(out, '22e-lava-close.png'), clip: { x: Math.max(0, bx / 1 - 40), y: Math.max(0, by - 120), width: Math.min(600, bw + 80), height: 260 } });
  }
  // Lavafall: an Ash Dunes crag pours a sheet of lava into a catch pool (seen from beside the pool).
  const fall = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const s = w.structures.find((st) => st.kind === 'lavafall');
    if (!s) return null;
    // Stand on the pool's far rim so the fall sits just left of centre, clear of the HUD panels.
    const stand = s.x1;
    g.hp = g.maxHp ?? 100;
    g.body.x = stand + 0.5;
    g.body.y = w.surface[stand];
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    return { col: s.x0 + 5, y0: s.y0, y1: s.y1 };
  });
  await page.waitForTimeout(400);
  await page.waitForFunction(() => Math.abs(window.__terrabound.renderer.camX - window.__terrabound.game.body.x) < 0.3, null, { timeout: 3000 }).catch(() => {});
  check('the Ash Dunes have a lavafall', !!fall, JSON.stringify(fall));
  if (fall) {
    const sheet = await page.evaluate((lf) => {
      const { renderer } = window.__terrabound;
      const c = document.getElementById('game');
      const ctx = c.getContext('2d');
      // The lowest two tiles of the sheet, inside its crust edges (the top can sit under the HUD).
      const a = renderer.worldToScreen(lf.col + 0.12, lf.y1 - 2);
      const b = renderer.worldToScreen(lf.col + 0.5, lf.y1 - 0.2);
      const w = Math.max(1, Math.round(b.x - a.x));
      const h = Math.max(1, Math.round(b.y - a.y));
      const d = ctx.getImageData(Math.round(a.x), Math.round(a.y), w, h).data;
      let hot = 0;
      const cols = new Set();
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 150 && d[i] > d[i + 2] + 60) hot++;
        cols.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
      }
      return { shown: renderer.lavafallsShown, hot: hot / (d.length / 4), colours: cols.size, box: [Math.round(a.x), Math.round(a.y), w, h] };
    }, fall);
    check('the lavafall pours a streaked sheet of lava down the crag face', sheet.shown >= 1 && sheet.hot > 0.8 && sheet.colours >= 3, JSON.stringify(sheet));
    await page.screenshot({ path: path.join(out, '22f-lavafall.png') });
    const [fx, fy] = sheet.box;
    await page.screenshot({ path: path.join(out, '22g-lavafall-close.png'), clip: { x: Math.max(0, fx - 160), y: Math.max(0, fy - 80), width: 360, height: 300 } });
    // Walking into the sheet burns.
    const burn = await page.evaluate(async (lf) => {
      const g = window.__terrabound.game;
      const hp0 = g.hp;
      for (let i = 0; i < 6; i++) {
        g.body.x = lf.col + 0.5;
        g.body.y = lf.y1 - 1;
        g.body.vx = g.body.vy = 0;
        await new Promise((r) => setTimeout(r, 50));
      }
      const hp1 = g.hp;
      g.hp = hp0;
      g.body.x = lf.col + 4.5;
      g.body.y = g.world.surface[lf.col + 4];
      return { hp0, hp1 };
    }, fall);
    check('standing in the lavafall burns', burn.hp1 < burn.hp0, JSON.stringify(burn));
    // Lava contact juice: the burn chars the suit (darker sprite with embers) and smoke curls off it.
    const sample = async (scorch) => page.evaluate(async (sc) => {
      const { game, renderer } = window.__terrabound;
      game.iframes = 0;
      game.enemies = [];
      game.scorch = sc;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      game.scorch = sc;
      game.iframes = 0;
      await new Promise((r) => requestAnimationFrame(r));
      const c = document.getElementById('game');
      const p = renderer.worldToScreen(game.body.x, game.body.y);
      const s = renderer.scale;
      const x = Math.round(p.x - 4 * s);
      const y = Math.round(p.y - 18 * s);
      const d = c.getContext('2d').getImageData(x, y, Math.round(8 * s), Math.round(16 * s)).data;
      let lum = 0;
      let ember = 0;
      for (let i = 0; i < d.length; i += 4) {
        lum += d[i] + d[i + 1] + d[i + 2];
        if (d[i] > 240 && d[i + 1] > 90 && d[i + 1] < 190 && d[i + 2] < 90) ember++;
      }
      return { lum: Math.round(lum / (d.length / 4)), ember, shown: renderer.scorchShown, box: [Math.round(p.x), Math.round(p.y)] };
    }, scorch);
    // Let the camera settle after the burn's teleport so both samples frame the same spot.
    await page.evaluate(() => { const g = window.__terrabound.game; g.body.vx = 0; });
    await page.waitForTimeout(900);
    const charred = await sample(1.2);
    await page.screenshot({ path: path.join(out, '22h-scorched.png'), clip: { x: Math.max(0, charred.box[0] - 120), y: Math.max(0, charred.box[1] - 140), width: 240, height: 180 } });
    const clean = await sample(0);
    check('a lava burn chars the suit: darker sprite with glowing embers', charred.shown === 1 && clean.shown === 0 && Math.abs(charred.box[0] - clean.box[0]) < 12 && charred.lum < clean.lum * 0.9 && charred.ember > 0, JSON.stringify({ charred, clean }));
    // Frame-time probe over the heaviest lava scene (pool shimmer, lavafall sheet, embers, charred
    // smoke) against a plain scene at the pad, in the same browser so machine speed cancels out.
    // Each frame is timed with a 1 px readback, which forces the raster to finish (draw() alone only
    // records commands). Run 38 found the old per-row self-copy shimmer at 18 ms vs 6 ms plain.
    const probe = await page.evaluate(async (lf) => {
      const { game, renderer, fx } = window.__terrabound;
      const c = document.getElementById('game').getContext('2d');
      const time = async (x, y) => {
        game.body.x = x;
        game.body.y = y;
        game.body.vx = game.body.vy = 0;
        renderer.camX = x;
        renderer.camY = y;
        for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));
        game.scorch = 1.2;
        const ms = [];
        let t = performance.now() / 1000;
        for (let i = 0; i < 60; i++) {
          t += 1 / 60;
          fx.scorchSmoke(1 / 60, 1, game.body.x, game.body.y - 1.5);
          fx.update(1 / 60);
          const a = performance.now();
          renderer.draw(game, fx, null, t);
          c.getImageData(0, 0, 1, 1);
          ms.push(performance.now() - a);
        }
        ms.sort((p, q) => p - q);
        return { median: +ms[30].toFixed(2), p95: +ms[57].toFixed(2), shimmer: renderer.shimmerRows, falls: renderer.lavafallsShown };
      };
      const w = game.world;
      const plain = await time(w.padX + 0.5, w.surface[w.padX] - 0.01);
      const lava = await time(lf.col + 4.5, w.surface[lf.col + 4] - 0.01);
      game.scorch = 0;
      return { plain, lava };
    }, fall);
    console.log('frame-time probe', JSON.stringify(probe));
    check(
      'frame time over lava stays close to a plain scene (median < 1.5x plain + 2 ms)',
      probe.lava.falls >= 1 && probe.lava.shimmer > 0 && probe.lava.median < probe.plain.median * 1.5 + 2,
      JSON.stringify(probe),
    );
  }
  // Grappling hook: tool 5, click a ceiling, swing.
  const hookAt = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    let x = w.padX + 70;
    while (!(w.isSolid(x, w.surface[x]) && w.get(x, w.surface[x] - 1) === 0)) x++;
    const y = w.surface[x];
    // A ceiling 6 rows up (on screen: the view shows ~7 tiles above the player).
    for (let xx = x - 10; xx <= x + 10; xx++) {
      for (let yy = y - 6; yy < y; yy++) w.set(xx, yy, 0);
      w.set(xx, y - 6, 2);
      w.set(xx, y, 1);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    return { x: x + 3, y: y - 6 };
  });
  await page.keyboard.press('Digit5');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => Math.abs(window.__terrabound.renderer.camX - window.__terrabound.game.body.x) < 0.3, null, { timeout: 3000 }).catch(() => {});
  const hookPx = await tileToCss(page, hookAt.x, hookAt.y);
  // Press long enough for a sim frame to see it (a bare click can fall between frames).
  await page.mouse.move(hookPx.x, hookPx.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(100);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '23-grapple.png') });
  await page.keyboard.up('KeyD');
  check('the grappling hook attaches to a ceiling', await page.evaluate(() => !!window.__terrabound.game.hook));
  check('the rope is drawn as a segmented cord', ((await page.evaluate(() => window.__terrabound.renderer.ropeInfo))?.points ?? 0) >= 10);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(100);
  check('jump lets go of the rope', await page.evaluate(() => !window.__terrabound.game.hook));
  check('letting go clears the drawn rope', (await page.evaluate(() => window.__terrabound.renderer.ropeInfo)) === null);
  // Slack rope: standing on the floor with a rope longer than the gap, it sags.
  await page.waitForFunction(() => window.__terrabound.game.body.onGround, null, { timeout: 3000 }).catch(() => {});
  await page.evaluate((a) => {
    const g = window.__terrabound.game;
    g.hook = { ax: a.x + 0.5, ay: a.y + 0.95, len: 10 };
  }, hookAt);
  await page.waitForTimeout(500);
  const slack = await page.evaluate(() => window.__terrabound.renderer.ropeInfo);
  check('a slack rope sags', !!slack && slack.sag > 0.3 && slack.points >= 10, JSON.stringify(slack));
  await page.screenshot({ path: path.join(out, '23c-rope-slack.png') });
  await page.evaluate(() => { window.__terrabound.game.hook = null; });
  // Boss: summon the Junk Colossus from the inventory in the Rust Wastes, see it and its health bar.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    let x = w.padX - 60;
    while (!(w.isSolid(x, w.surface[x]) && w.get(x, w.surface[x] - 1) === 0)) x--;
    const y = w.surface[x];
    for (let xx = x - 30; xx <= x + 30; xx++) {
      for (let yy = y - 12; yy < y; yy++) w.set(xx, yy, 0);
      w.set(xx, y, 1);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.hp = g.derived.maxHp;
    g.facing = 1;
    g.carried = { beacon_colossus: 1 };
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyI');
  await page.waitForTimeout(150);
  const beaconCell = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'invsel' && r.a.id === 'beacon_colossus'));
  if (beaconCell) await page.mouse.click(beaconCell.x + beaconCell.w / 2, beaconCell.y + beaconCell.h / 2);
  await page.waitForTimeout(100);
  const summonBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'use' && r.a.id === 'beacon_colossus'));
  if (summonBtn) await page.mouse.click(summonBtn.x + summonBtn.w / 2, summonBtn.y + summonBtn.h / 2);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '26-boss.png') });
  const bossState = await page.evaluate(() => ({ boss: window.__terrabound.game.boss?.id ?? null, inv: window.__terrabound.ui.invOpen }));
  check('SUMMON in the inventory calls the Junk Colossus', bossState.boss === 'colossus' && !bossState.inv, JSON.stringify(bossState));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.damageBoss(9999);
  });
  await page.waitForTimeout(300);
  check('defeating the boss grants its trophy', await page.evaluate(() => window.__terrabound.game.ownsGear('junk_hammer')));

  // Deep layers: the Plasma gate (still sealed) seen from inside the Circuit layer.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const x = w.padX + 120;
    const y = w.padY + 176;
    for (let xx = x - 12; xx <= x + 12; xx++) for (let yy = y - 6; yy < y; yy++) w.set(xx, yy, 0);
    for (let xx = x - 12; xx <= x + 12; xx++) w.set(xx, y, 33);
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '27-deep-layer.png') });
  check('deep layers show their name in the HUD', await page.evaluate(() => window.__terrabound.game.layer === 1));
  const rimCave = await page.evaluate(() => window.__terrabound.renderer.lastRimCount);
  check('cave rock facing the lamp gets rim light in a deep cave', rimCave > 20, JSON.stringify({ rimCave }));
  // Magma pockets in the Plasma layer: stand on a ledge beside a molten pool.
  const magma = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    for (let y = w.padY + 185; y < w.h - 6; y++) {
      for (let x = 20; x < w.w - 20; x++) {
        if (w.get(x, y) !== 40 || w.get(x, y - 1) !== 0) continue;
        for (let xx = x - 6; xx <= x - 2; xx++) {
          for (let yy = y - 5; yy < y; yy++) w.set(xx, yy, 0);
          w.set(xx, y, 35);
        }
        g.body.x = x - 3.5;
        g.body.y = y;
        g.body.vx = g.body.vy = 0;
        g.enemies = [];
        return { x, y };
      }
    }
    return null;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '27b-magma.png') });
  check('the Plasma layer has magma pockets', magma !== null, JSON.stringify(magma));
  if (magma) {
    // Molten surface animates (heat band, crest, bubbles): two frames of a pool differ.
    // Pockets drain after the fixture above, so pour a 5-wide pool in a rock basin beside the player.
    const cell = await page.evaluate(() => {
      const g = window.__terrabound.game;
      const w = g.world;
      g.hp = g.derived.maxHp;
      const fx = Math.floor(g.body.x);
      const fy = Math.floor(g.body.y);
      for (let xx = fx + 2; xx <= fx + 8; xx++) {
        for (let yy = fy - 4; yy < fy; yy++) w.set(xx, yy, 0);
        w.set(xx, fy, 35);
        w.set(xx, fy + 1, 35);
      }
      w.set(fx + 2, fy - 1, 35);
      w.set(fx + 8, fy - 1, 35);
      for (let xx = fx + 3; xx <= fx + 7; xx++) w.set(xx, fy - 1, 40);
      return { x: fx + 5, y: fy - 1 };
    });
    check('a magma surface is on screen', cell !== null);
    if (cell) {
      const c = await tileToCss(page, cell.x, cell.y);
      const clip = { x: Math.max(0, c.x - 30), y: Math.max(0, c.y - 50), width: 60, height: 70 };
      const a = await page.screenshot({ clip });
      await page.waitForTimeout(450);
      const b = await page.screenshot({ clip });
      check('magma surface animates between frames', !a.equals(b), JSON.stringify(cell));
      await page.screenshot({ path: path.join(out, '27b2-magma-close.png') });
    }
  }
  // Water poured onto magma cools it into basalt (id 41) with a steam puff. Built beside the
  // player in a small rock basin so the check does not depend on the pocket above surviving.
  const basin = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.hp = g.derived.maxHp;
    const mx = Math.floor(g.body.x) + 3;
    const my = Math.floor(g.body.y) - 1;
    for (let yy = my - 3; yy <= my; yy++) for (let xx = mx - 1; xx <= mx + 1; xx++) w.set(xx, yy, 0);
    for (let xx = mx - 2; xx <= mx + 2; xx++) w.set(xx, my + 1, 35);
    w.set(mx - 2, my, 35);
    w.set(mx + 2, my, 35);
    w.set(mx - 1, my, 40);
    w.set(mx, my, 40);
    w.set(mx + 1, my, 40);
    w.set(mx, my - 1, 25);
    return { x: mx, y: my };
  });
  const cooled = await page
    .waitForFunction(([x, y]) => window.__terrabound.game.world.get(x, y) === 41, [basin.x, basin.y], { timeout: 3000 })
    .then(() => true, () => false);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(out, '27c-basalt.png') });
  check('water cools magma into basalt', cooled, JSON.stringify(basin));
  // Final boss: in the Core, summon and beat the Hollow AI; the victory screen appears and closes.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const x = w.padX + 120;
    const y = w.padY + 300;
    for (let xx = x - 30; xx <= x + 30; xx++) {
      for (let yy = y - 10; yy < y; yy++) w.set(xx, yy, 0);
      w.set(xx, y, 37);
    }
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.hp = g.derived.maxHp;
    g.carried = { beacon_ai: 1 };
    g.useItem('beacon_ai');
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, '28-final-boss.png') });
  await page.evaluate(() => window.__terrabound.game.damageBoss(1e6));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '29-victory.png') });
  check('beating the Hollow AI shows the victory screen', await page.evaluate(() => window.__terrabound.ui.victory));
  const keep = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'victoryclose'));
  if (keep) await page.mouse.click(keep.x + keep.w / 2, keep.y + keep.h / 2);
  await page.waitForTimeout(100);
  check('KEEP PLAYING closes the victory screen', !(await page.evaluate(() => window.__terrabound.ui.victory)));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(300);

  // Sound: N cycles everything on -> music off -> all off -> on (music keeps scheduling without errors).
  const soundStates = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('KeyN');
    await page.waitForTimeout(80);
    soundStates.push(await page.evaluate(() => `${window.__terrabound.game.muted ? 'M' : '-'}${window.__terrabound.game.musicOn ? 'm' : '-'}`));
  }
  check('N cycles music off, all off, all on', soundStates.join(',') === '--,M-,-m', soundStates.join(','));

  // Settings screen: the HUD cog opens it, the game pauses, steppers change UI size and shake, Esc closes and saves.
  const cog = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'settings'));
  const cogCss = await page.evaluate((r) => {
    const c = document.getElementById('game');
    const k = c.clientWidth / c.width;
    return { x: (r.x + r.w / 2) * k, y: (r.y + r.h / 2) * k };
  }, cog);
  await holdClick(page, cogCss.x, cogCss.y);
  await page.waitForTimeout(120);
  const setA = await page.evaluate(() => {
    const t = window.__terrabound;
    return { open: t.ui.settingsOpen, time: t.game.time, rows: t.ui.rects.filter((r) => r.a.k === 'pref').length };
  });
  await page.waitForTimeout(300);
  const pausedT = await page.evaluate(() => window.__terrabound.game.time);
  const clickPref = async (key, d) => {
    const r = await page.evaluate(([key, d]) => window.__terrabound.ui.rects.find((r) => r.a.k === 'pref' && r.a.key === key && r.a.d === d), [key, d]);
    if (!r) return false;
    const c = await page.evaluate((r) => {
      const el = document.getElementById('game');
      const k = el.clientWidth / el.width;
      return { x: (r.x + r.w / 2) * k, y: (r.y + r.h / 2) * k };
    }, r);
    await holdClick(page, c.x, c.y);
    await page.waitForTimeout(80);
    return true;
  };
  await clickPref('uiSize', 1);
  await clickPref('shake', -1);
  await clickPref('shake', -1);
  const setB = await page.evaluate(() => {
    const t = window.__terrabound;
    return { scale: t.ui.uiScale, shake: t.renderer.shakeMul, prefs: t.game.prefs };
  });
  await page.screenshot({ path: path.join(out, '44-settings.png') });
  check('cog opens settings with its steppers (maxed ones disabled) and pauses the game', setA.open && setA.rows === 11 && Math.abs(pausedT - setA.time) < 1e-6, JSON.stringify({ ...setA, pausedT }));
  check('settings steppers raise UI size and turn screen shake off', setB.scale > 1 && setB.shake === 0 && setB.prefs.uiSize === 1 && setB.prefs.shake === 0, JSON.stringify(setB));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '44b-large-ui.png') });
  const setC = await page.evaluate(() => {
    const t = window.__terrabound;
    const raw = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('terrabound')) ?? '') || '{}');
    return { open: t.ui.settingsOpen, saved: raw.settings ? raw.settings.uiSize : null };
  });
  check('Esc closes settings and the choice is saved', !setC.open && setC.saved === 1, JSON.stringify(setC));

  // Settings slice 3: CONTROLS page remaps keys; the new key works in play and is saved.
  {
    const clickAct = async (pred) => {
      const r = await page.evaluate((src) => window.__terrabound.ui.rects.find(new Function('r', `return ${src}`)), pred);
      if (!r) return false;
      const c = await page.evaluate((r) => {
        const el = document.getElementById('game');
        const k = el.clientWidth / el.width;
        return { x: (r.x + r.w / 2) * k, y: (r.y + r.h / 2) * k };
      }, r);
      await holdClick(page, c.x, c.y);
      await page.waitForTimeout(80);
      return true;
    };
    await page.keyboard.press('KeyO');
    await page.waitForTimeout(100);
    const toKeys = await clickAct("r.a.k === 'keyspage' && r.a.open");
    const rowsK = await page.evaluate(() => ({ page: window.__terrabound.ui.settingsPage, n: window.__terrabound.ui.rects.filter((r) => r.a.k === 'bindarm').length }));
    await page.screenshot({ path: path.join(out, '47-controls.png') });
    const armed = await clickAct("r.a.k === 'bindarm' && r.a.id === 'jump'");
    const armState = await page.evaluate(() => window.__terrabound.ui.rebinding);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, '47b-controls-armed.png') });
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => {
      const t = window.__terrabound;
      const raw = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('terrabound')) ?? '') || '{}');
      return { jump: t.game.keys.jump, armed: t.ui.rebinding, saved: raw.settings && raw.settings.keys ? raw.settings.keys.jump : null };
    });
    check('CONTROLS page lists every binding', toKeys && rowsK.page === 'keys' && rowsK.n === 15, JSON.stringify(rowsK));
    check('clicking a binding arms it and the next key rebinds it (saved)', armed && armState === 'jump' && after.jump === 'KeyK' && after.armed === null && after.saved === 'KeyK', JSON.stringify({ armState, ...after }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    const backMain = await page.evaluate(() => ({ open: window.__terrabound.ui.settingsOpen, page: window.__terrabound.ui.settingsPage }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
    check('Esc on CONTROLS goes back to the option rows first', backMain.open && backMain.page === 'main', JSON.stringify(backMain));
    // The rebound key jumps in play.
    await page.evaluate(() => {
      const g = window.__terrabound.game;
      g.enemies = [];
      g.body.vx = 0;
      g.body.vy = 0;
    });
    await page.waitForTimeout(250);
    const y0 = await page.evaluate(() => window.__terrabound.game.body.y);
    await page.keyboard.down('KeyK');
    await page.waitForTimeout(200);
    const y1 = await page.evaluate(() => window.__terrabound.game.body.y);
    await page.keyboard.up('KeyK');
    check('the rebound jump key lifts the player', y1 < y0 - 0.3, JSON.stringify({ y0, y1 }));
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__terrabound.act({ k: 'resetkeys' }));
    check('RESET KEYS restores W for jump', (await page.evaluate(() => window.__terrabound.game.keys.jump)) === 'KeyW');
  }
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.stepPref('uiSize', -1);
    g.stepPref('shake', 1);
    g.stepPref('shake', 1);
  });
  await page.keyboard.press('KeyO');
  await page.keyboard.press('KeyO');
  await page.waitForTimeout(100);

  // Settings slice 2: ORE AND HAZARD MARKS draws shape marks on ores; FLASHES REDUCED turns off strobing.
  {
    await page.keyboard.press('KeyO');
    await page.waitForTimeout(100);
    await clickPref('oreMarks', 1);
    await clickPref('flashes', 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    const saved = await page.evaluate(() => {
      const t = window.__terrabound;
      const g = t.game;
      const bx = Math.floor(g.body.x);
      const by = Math.floor(g.body.y);
      const ores = [3, 4, 34, 36, 38, 3, 4, 34, 36, 38];
      const keep = [];
      for (let i = 0; i < ores.length; i++) for (let dy = 1; dy <= 2; dy++) {
        const x = bx - 5 + i;
        keep.push([x, by + dy, g.world.get(x, by + dy)]);
        g.world.set(x, by + dy, ores[i]);
      }
      return { keep, marks: t.renderer.oreMarks, reduce: t.renderer.reduceFlash };
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, '45-ore-marks.png') });
    check('settings turn on ore marks and reduced flashes', saved.marks === true && saved.reduce === true, JSON.stringify({ marks: saved.marks, reduce: saved.reduce }));
    await page.evaluate((keep) => {
      const t = window.__terrabound;
      for (const [x, y, v] of keep) t.game.world.set(x, y, v);
      t.game.stepPref('oreMarks', -1);
      t.game.stepPref('flashes', -1);
    }, saved.keep);
    await page.keyboard.press('KeyO');
    await page.keyboard.press('KeyO');
    await page.waitForTimeout(100);
    check('ore marks and flashes switch back off', await page.evaluate(() => !window.__terrabound.renderer.oreMarks && !window.__terrabound.renderer.reduceFlash));
  }

  // Weather: a dust storm and a meteor shower render without errors.
  for (const kind of ['dust', 'meteors']) {
    const t = await page.evaluate((k) => {
      const g = window.__terrabound.game;
      for (let tt = 600; tt < 600 * 300; tt += 5) {
        g.time = tt;
        g.step(1 / 60, { moveX: 0, jump: false, dig: false, place: false, aim: null });
        if (g.weather === k) return tt;
      }
      return -1;
    }, kind);
    await page.evaluate(() => {
      const g = window.__terrabound.game;
      let x = g.world.padX + 70;
      while (!(g.world.isSolid(x, g.world.surface[x]) && g.world.get(x, g.world.surface[x] - 1) === 0)) x++;
      g.body.x = x + 0.5;
      g.body.y = g.world.surface[x];
      g.body.vx = g.body.vy = 0;
      g.enemies = [];
      g.hp = g.derived.maxHp;
      g.iframes = 5;
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(out, `30-weather-${kind}.png`) });
    check(`the ${kind} event happens and renders`, t > 0 && (await page.evaluate(() => window.__terrabound.game.weather)) === kind, String(t));
  }
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.time = 30;
    g.meteors = [];
  });

  // Pet: build a spark pup at the pad and see it follow.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.stash = { iron_scrap: 50, copper_wire: 50, crystal: 50 };
    g.craftGear('spark_pup');
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '31-pet.png') });
  check('a crafted pet follows the player', await page.evaluate(() => {
    const g = window.__terrabound.game;
    return g.equipped('pet') === 'spark_pup' && Math.hypot(g.pet.x - g.body.x, g.pet.y - g.body.y) < 5;
  }));
  // Pet swimming: in a sealed sky tank the pup trails the player under water and paddles.
  const petTank = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const x = w.padX + 60;
    const t0 = Math.max(12, w.surface[x] - 30);
    for (let yy = t0 - 5; yy <= t0 + 6; yy++) for (let xx = x - 6; xx <= x + 6; xx++) {
      const wall = xx === x - 6 || xx === x + 6 || yy === t0 + 6 || yy === t0 - 5;
      w.set(xx, yy, wall ? 5 : yy >= t0 ? 25 : 0);
    }
    g.enemies = [];
    g.body.x = x + 0.5;
    g.body.y = t0 + 5.9;
    g.body.vx = g.body.vy = 0;
    g.pet.x = x - 1;
    g.pet.y = t0 + 3.5;
    return { x, t0 };
  });
  let petSwim = 'dry';
  for (let i = 0; i < 15 && petSwim !== 'under'; i++) {
    await page.waitForTimeout(80);
    petSwim = await page.evaluate(({ x, t0 }) => {
      const g = window.__terrabound.game;
      g.body.x = x + 0.5;
      g.body.y = t0 + 5.9;
      g.body.vy = 0;
      return window.__terrabound.renderer.petSwim;
    }, petTank);
  }
  await page.waitForFunction(() => {
    const { renderer, game } = window.__terrabound;
    return Math.abs(renderer.camX - game.body.x) < 0.3 && Math.abs(renderer.camY - game.body.y) < 3;
  }, null, { timeout: 3000 }).catch(() => {});
  await page.screenshot({ path: path.join(out, '31b-pet-swim.png') });
  check('a pet that follows the player under water swims', petSwim === 'under', petSwim);
  await page.evaluate(({ x, t0 }) => {
    const g = window.__terrabound.game;
    const w = g.world;
    for (let yy = t0 - 5; yy <= t0 + 6; yy++) for (let xx = x - 6; xx <= x + 6; xx++) w.set(xx, yy, 0);
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.body.vx = g.body.vy = 0;
  }, petTank);
  await page.waitForTimeout(200);

  // Field drones: E at a drone bay picks its role; miner and guard drones follow the player out.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.unequipGear?.('pet');
    for (let dx = -4; dx <= -1; dx++) w.set(w.padX + dx, w.padY - 1, 27);
    w.set(w.padX + 2, w.padY - 1, 29);
    w.set(w.padX + 3, w.padY - 1, 31);
    w.set(w.padX + 4, w.padY - 1, 31);
    g.time = 30;
    g.body.x = w.padX + 3.5;
    g.body.y = w.padY;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(700);
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(150);
  const roles = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const k = g.bayNear()?.key;
    const other = k === '3,1' ? '4,1' : '3,1';
    g.setDroneRole(other, 'guard');
    return { first: k ? g.droneRole(k) : null, other: g.droneRole(other) };
  });
  check('E at a drone bay sets its role to Miner', roles.first === 'miner', JSON.stringify(roles));
  // Walk the player out to a dug pocket with exposed ore and watch the drones work.
  const site = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const x = w.padX + 24;
    const y = w.surface[x] + 6;
    for (let xx = x - 5; xx <= x + 5; xx++) {
      for (let yy = y - 5; yy < y; yy++) w.set(xx, yy, 0);
      w.set(xx, y, 1);
    }
    for (const xx of [x - 4, x - 3, x + 3, x + 4]) w.set(xx, y, 3);
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.hp = g.derived.maxHp;
    return { x, y };
  });
  await page
    .waitForFunction(([x, y]) => [x - 4, x - 3, x + 3, x + 4].some((xx) => window.__terrabound.game.world.get(xx, y) !== 3), [site.x, site.y], { timeout: 9000 })
    .catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '33-drones.png') });
  const drones = await page.evaluate(([x, y]) => {
    const g = window.__terrabound.game;
    const ores = [x - 4, x - 3, x + 3, x + 4].filter((xx) => g.world.get(xx, y) === 3).length;
    return { modes: g.drones.map((d) => `${d.role}:${d.mode}`), ores, near: g.drones.every((d) => Math.hypot(d.x - g.body.x, d.y - g.body.y) < 9) };
  }, [site.x, site.y]);
  check('miner and guard drones fly out to the player', drones.modes.length === 2 && drones.near && !drones.modes.some((m) => m.endsWith(':dock')), JSON.stringify(drones));
  check('the miner drone drills ore near the player', drones.ores < 4, JSON.stringify(drones));
  // Drone rules panel: DRONES at the base, add a rule and cycle its condition and action by clicking.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.x = g.world.padX + 3.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
  });
  await page.waitForTimeout(500);
  const clickUi = async (k) => {
    const r = await page.evaluate((kk) => window.__terrabound.ui.rects.find((x) => x.a.k === kk), k);
    if (r) await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2);
    await page.waitForTimeout(120);
    return !!r;
  };
  const sawDronesBtn = await clickUi('drones');
  await clickUi('ruleadd');
  await clickUi('rulecond');
  await clickUi('ruleact');
  await page.screenshot({ path: path.join(out, '33b-drone-rules.png') });
  const panel = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const ui = window.__terrabound.ui;
    const key = g.bays()[ui.bayIdx].key;
    return { open: ui.dronesOpen, key, rules: g.droneRules(key), saved: JSON.stringify(g.toSave().droneRules) };
  });
  check('DRONES opens the rule panel at the base', sawDronesBtn && panel.open, JSON.stringify(panel));
  check('clicking adds a rule and cycles IF and THEN', panel.rules.length === 1 && panel.rules[0].when === 'pack_half' && panel.rules[0].then === 'repair' && panel.saved.includes('pack_half'), JSON.stringify(panel));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  check('Escape closes the drone panel', !(await page.evaluate(() => window.__terrabound.ui.dronesOpen)));
  // Repair drone: heals a hurt player out in the field (beam screenshot).
  const healed = await page.evaluate(([x, y]) => {
    const g = window.__terrabound.game;
    g.setDroneRules(g.bays()[0].key, []);
    g.setDroneRole(g.bays()[0].key, 'repair');
    g.body.x = x + 0.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
    g.hp = 40;
    return g.hp;
  }, [site.x, site.y]);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(out, '33c-repair-drone.png') });
  const hpNow = await page.evaluate(() => window.__terrabound.game.hp);
  check('a repair drone heals the player in the field', hpNow > healed + 1, JSON.stringify({ healed, hpNow }));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.setDroneRole('3,1', 'survey');
    g.setDroneRole('4,1', 'survey');
    for (let dx = -4; dx <= 4; dx++) if (dx !== 0) w.set(w.padX + dx, w.padY - 1, 0);
  });

  // Night raid: a raid-worthy base at the pad, start the wave, screenshot raiders, clear it for the reward.
  const raidOn = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.body.vx = g.body.vy = 0;
    g.hp = g.derived.maxHp;
    w.set(w.padX + 3, w.padY - 1, 27);
    w.set(w.padX + 4, w.padY - 1, 28);
    for (let dy = 1; dy <= 3; dy++) w.set(w.padX - 6, w.padY - dy, 2);
    g.raid = null;
    return g.startRaid();
  });
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    // Bring the first raiders to the wall so the screenshot shows the fight.
    const rs = g.enemies.filter((e) => e.raid);
    rs.forEach((e, i) => {
      e.x = w.padX - 8.5 - i * 1.2;
      if (!e.kind.includes('flyer') && e.kind !== 'ember') e.y = w.surface[Math.floor(e.x)];
    });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, '34-raid.png') });
  const raidState = await page.evaluate(() => ({ raid: !!window.__terrabound.game.raid, n: window.__terrabound.game.enemies.filter((e) => e.raid).length }));
  check('a night raid starts at a raid-worthy base and raiders survive at the pad', raidOn && raidState.raid && raidState.n > 0, JSON.stringify({ raidOn, ...raidState }));
  const raidsBefore = await page.evaluate(() => window.__terrabound.game.stats.raids);
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => {
      const g = window.__terrabound.game;
      for (const e of g.enemies) if (e.raid) e.hp = 0;
      return !g.raid;
    });
    if (done) break;
    await page.waitForTimeout(250);
  }
  const raidsAfter = await page.evaluate(() => ({ raid: !!window.__terrabound.game.raid, raids: window.__terrabound.game.stats.raids }));
  check('clearing every raider repels the raid', !raidsAfter.raid && raidsAfter.raids === raidsBefore + 1, JSON.stringify({ raidsBefore, ...raidsAfter }));
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(200);
  const raidBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'raids'));
  if (raidBtn) await page.mouse.click(raidBtn.x + raidBtn.w / 2, raidBtn.y + raidBtn.h / 2);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '34b-raids-toggle.png') });
  const raidsOff = await page.evaluate(() => window.__terrabound.game.raidsOn);
  if (raidBtn) await page.mouse.click(raidBtn.x + raidBtn.w / 2, raidBtn.y + raidBtn.h / 2);
  await page.waitForTimeout(150);
  const raidsBack = await page.evaluate(() => window.__terrabound.game.raidsOn);
  check('the workshop RAIDS button opts out and back in', !!raidBtn && raidsOff === false && raidsBack === true, JSON.stringify({ raidBtn: !!raidBtn, raidsOff, raidsBack }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    w.set(w.padX + 3, w.padY - 1, 0);
    w.set(w.padX + 4, w.padY - 1, 0);
    for (let dy = 1; dy <= 3; dy++) w.set(w.padX - 6, w.padY - dy, 0);
    g.drops.length = 0;
  });

  // Raid defences: a turret, spike traps and a reinforced wall at the west edge; raiders walk into them.
  const defOk = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.body.vx = g.body.vy = 0;
    g.hp = g.derived.maxHp;
    const T = { SOLAR: 27, SMELTER: 28, BATTERY: 29, TURRET: 42, SPIKES: 43, REINFORCED: 44 };
    w.set(w.padX + 3, w.padY - 1, T.SOLAR);
    w.set(w.padX + 4, w.padY - 1, T.SMELTER);
    w.set(w.padX + 5, w.padY - 1, T.BATTERY);
    w.set(w.padX + 6, w.padY - 1, T.BATTERY);
    w.set(w.padX - 4, w.padY - 1, T.TURRET);
    w.set(w.padX + 2, w.padY - 1, T.TURRET);
    for (let dx = -7; dx <= -5; dx++) w.set(w.padX + dx, w.padY - 1, T.SPIKES);
    for (let dy = 2; dy <= 3; dy++) w.set(w.padX - 6, w.padY - dy, T.REINFORCED);
    g.power.charge = 120;
    g.raid = null;
    return g.startRaid();
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.power.charge = 120;
    const rs = g.enemies.filter((e) => e.raid);
    rs.forEach((e, i) => {
      e.hp0 = e.hp;
      e.x = w.padX - 6.5 - i * 1.3;
      if (e.kind !== 'flyer' && e.kind !== 'ember') e.y = w.padY;
      else e.y = w.padY - 3;
    });
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, '34c-defences.png') });
  const defState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const rs = g.enemies.filter((e) => e.raid);
    return { turrets: g.turrets.length, hurt: rs.filter((e) => e.hp < e.hp0).length, n: rs.length, total: g.raid ? g.raid.total : 0, ratio: g.power.ratio };
  });
  check('powered turrets and spikes hurt raiders at the base edge', defOk && defState.turrets === 2 && (defState.hurt > 0 || defState.n < defState.total), JSON.stringify(defState));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.endRaid();
    for (let dx = -7; dx <= 6; dx++) for (let dy = 1; dy <= 3; dy++) if (dx !== 0) w.set(w.padX + dx, w.padY - dy, 0);
    g.drops.length = 0;
  });

  // Raid warning: 20 s before nightfall at a raid-worthy base, a countdown and an edge arrow; the map shows the entry.
  const warnSetup = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.body.vx = g.body.vy = 0;
    w.set(w.padX + 3, w.padY - 1, 27);
    w.set(w.padX + 4, w.padY - 1, 28);
    return { ok: g.warnRaid() };
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '34d-raid-warning.png') });
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, '34e-raid-map.png') });
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(150);
  const warnState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const rw = g.raidWarn;
    const w = g.world;
    g.raidWarn = null;
    w.set(w.padX + 3, w.padY - 1, 0);
    w.set(w.padX + 4, w.padY - 1, 0);
    return rw;
  });
  check('a raid warning names the side and count before nightfall', warnSetup.ok && !!warnState && (warnState.side === 1 || warnState.side === -1) && warnState.n > 0, JSON.stringify({ warnSetup, warnState }));

  // Furniture and rooms: a furnished, walled room on the pad is a valid robot home; the hint says so.
  const roomState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    const T = { AIR: 0, METAL: 2, TORCH: 7, DOOR: 11, TABLE: 46, LAMP: 47, SCREEN: 48, POT_PLANT: 49, BANNER: 50, BED: 51, BED_FOOT: 52, TABLE_END: 53, CHAIR: 54 };
    g.enemies = g.enemies.filter((e) => !e.raid);
    g.raid = null;
    for (let y = py - 5; y <= py - 1; y++) {
      w.set(px - 4, y, y >= py - 2 ? T.DOOR : T.METAL);
      w.set(px + 4, y, T.METAL);
    }
    for (let x = px - 4; x <= px + 4; x++) w.set(x, py - 5, T.METAL);
    for (let y = py - 4; y <= py - 1; y++) for (let x = px - 3; x <= px + 3; x++) {
      w.set(x, y, T.AIR);
      w.setWall(x, y, 3);
    }
    // Two-tile bed and table (wide.ts) with a chair pulled up to the table.
    w.set(px - 3, py - 1, T.BED);
    w.set(px - 2, py - 1, T.BED_FOOT);
    w.set(px + 1, py - 1, T.TABLE);
    w.set(px + 2, py - 1, T.TABLE_END);
    w.set(px, py - 1, T.CHAIR);
    w.set(px + 3, py - 1, T.POT_PLANT);
    w.set(px - 2, py - 4, T.LAMP);
    w.set(px + 2, py - 4, T.LAMP);
    w.set(px, py - 3, T.SCREEN);
    w.set(px - 1, py - 4, T.BANNER);
    g.body.x = px + 0.5;
    g.body.y = py;
    g.body.vx = g.body.vy = 0;
    const r = g.roomHere();
    return { valid: !!r && r.valid, comfort: r ? r.comfort : -1, cells: r ? r.cells.length : 0, hint: g.hintAutomation(false) };
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '35-room.png') });
  check('a furnished, walled room is a valid robot home', roomState.valid && roomState.comfort === 4 && /Room ready/.test(roomState.hint || ''), JSON.stringify(roomState));
  // Robot NPCs: the Trader moves into the finished home; E opens the TRADE tab; a trade swaps from the stash.
  const npcState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const n = g.npcs[0];
    if (n) {
      g.body.x = n.x + 0.8;
      g.body.y = n.y;
    }
    return { n: g.npcs.length, kind: n ? n.kind : null };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '35b-trader.png') });
  check('the Trader moves into a valid room', npcState.n === 1 && npcState.kind === 'trader', JSON.stringify(npcState));
  const nearHint = await page.evaluate(() => window.__terrabound.game.hintAutomation(false));
  check('walking up to the Trader shows its greeting', /Bolt the Trader/.test(nearHint || ''), String(nearHint));
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(250);
  const tradeUi = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    game.stash.rust = (game.stash.rust ?? 0) + 16;
    return { open: ui.shopOpen, tab: ui.shopTab, metal: game.stash.metal ?? 0, rust: game.stash.rust };
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '36-trade.png') });
  check('E next to the Trader opens the TRADE tab', tradeUi.open && tradeUi.tab === 'trade', JSON.stringify(tradeUi));
  const tradeBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'trade' && r.a.id === 'rust_metal'));
  if (tradeBtn) await page.mouse.click(tradeBtn.x + tradeBtn.w / 2, tradeBtn.y + tradeBtn.h / 2);
  await page.waitForTimeout(150);
  const tradeAfter = await page.evaluate(() => {
    const { game } = window.__terrabound;
    return { metal: game.stash.metal ?? 0, rust: game.stash.rust ?? 0 };
  });
  // The furnished room is comfort 4, so Bolt is happy and knocks one rust off (posted 8).
  const mood = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const t = g.tradeList().find((k) => k.id === 'rust_metal');
    return { mood: g.npcMood('trader'), rust: g.tradeNow(t).give.rust, posted: t.give.rust };
  });
  check('a happy Trader (comfort 4) trades rust for metal one cheaper than posted', !!tradeBtn && mood.mood === 'happy' && mood.posted === 8 && mood.rust === 7 && tradeAfter.rust === tradeUi.rust - 7 && tradeAfter.metal === tradeUi.metal + 1, JSON.stringify({ tradeBtn: !!tradeBtn, mood, tradeUi, tradeAfter }));
  // Comfort pays: the furnished room is comfort 4, so Bolt posts the cozy fish -> crystal rate.
  await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    game.stash.fish = (game.stash.fish ?? 0) + 2;
    ui.shopScroll = 4;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '36c-cozy-trade.png') });
  {
    // Happy robots float a heart now and then (only while you are not standing next to them).
    const saved = await page.evaluate(() => {
      const { ui, game } = window.__terrabound;
      ui.shopOpen = false;
      const p = { x: game.body.x, y: game.body.y };
      game.body.x -= 4;
      return p;
    });
    let hearts = 0;
    // A happy heart shows 1.4 s of every 4.5 s, so poll for two full periods (a 3 s poll can miss the 3.1 s gap).
    let why = '';
    for (let i = 0; i < 100 && hearts === 0; i++) {
      await page.waitForTimeout(100);
      hearts = await page.evaluate(() => window.__terrabound.renderer.heartsShown);
    }
    if (hearts === 0) why = await page.evaluate(() => { const g = window.__terrabound.game; return JSON.stringify(g.npcs.map((n) => ({ k: n.kind, pose: n.pose, react: n.react, mood: g.npcMood(n.kind), near: g.npcNear() === n }))); });
    await page.screenshot({ path: path.join(out, '36i-happy-heart.png') });
    check('a happy robot floats a heart when you step back', hearts > 0, JSON.stringify({ hearts, why }));
    const garden = await page.evaluate(() => { const g = window.__terrabound.game; return { gardener: g.gardener(), wetIn: g.cropWatered(g.world.padX + 1, g.world.padY - 1), wetOut: g.cropWatered(g.world.padX + 60, g.world.padY - 1) }; });
    check('a happy robot gardens: crops in the base strip count as watered, outside do not', garden.gardener !== null && garden.wetIn && !garden.wetOut, JSON.stringify(garden));
    await page.evaluate((p) => {
      const { ui, game } = window.__terrabound;
      game.body.x = p.x;
      game.body.y = p.y;
      ui.shopOpen = true;
    }, saved);
    await page.waitForTimeout(150);
  }
  const cozyBtn = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    return { btn: !!ui.rects.find((r) => r.a.k === 'trade' && r.a.id === 'cozy_crystal'), comfort: game.npcComfort('trader') };
  });
  check('a comfort-4 home posts the Trader\'s cozy rate', cozyBtn.btn && cozyBtn.comfort >= 3, JSON.stringify(cozyBtn));
  await page.evaluate(() => {
    window.__terrabound.ui.shopScroll = 0;
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  // Patch the Medic moves into a second home upstairs (on the first room's roof) and sells medkits into the pack.
  const medicState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    const T = { AIR: 0, METAL: 2, TABLE: 46, LAMP: 47, BED: 51, BED_FOOT: 52, TABLE_END: 53 };
    for (let y = py - 10; y <= py - 6; y++) {
      w.set(px - 4, y, T.METAL);
      w.set(px + 4, y, T.METAL);
    }
    for (let x = px - 4; x <= px + 4; x++) w.set(x, py - 10, T.METAL);
    for (let y = py - 9; y <= py - 6; y++) for (let x = px - 3; x <= px + 3; x++) {
      w.set(x, y, T.AIR);
      w.setWall(x, y, 3);
    }
    w.set(px - 3, py - 6, T.BED);
    w.set(px - 2, py - 6, T.BED_FOOT);
    w.set(px + 2, py - 6, T.TABLE);
    w.set(px + 3, py - 6, T.TABLE_END);
    w.set(px, py - 9, T.LAMP);
    g.body.x = px + 0.5;
    g.body.y = py - 5;
    g.body.vx = g.body.vy = 0;
    return { valid: g.rooms.filter((r) => r.valid).length };
  });
  await page.waitForTimeout(300);
  const medicNear = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const m = g.npcs.find((n) => n.kind === 'medic');
    if (m) {
      g.body.x = m.x + 0.8;
      g.body.y = m.y;
      g.body.vx = g.body.vy = 0;
    }
    g.stash.biomass = (g.stash.biomass ?? 0) + 8;
    g.stash.fish = (g.stash.fish ?? 0) + 2;
    return { medic: !!m, kinds: g.npcs.map((n) => n.kind) };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '35c-medic.png') });
  const medicHint = await page.evaluate(() => window.__terrabound.game.hintAutomation(false));
  check('Patch the Medic moves into a second home and greets you', medicState.valid >= 2 && medicNear.medic && /Patch the Medic/.test(medicHint || ''), JSON.stringify({ medicState, medicNear, medicHint }));
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(250);
  const medShop = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    return { open: ui.shopOpen, tab: ui.shopTab, scroll: ui.shopScroll };
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '36b-medic-trade.png') });
  const medBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'trade' && r.a.id === 'med_fish'));
  const kits0 = await page.evaluate(() => window.__terrabound.game.carried.medkit ?? 0);
  if (medBtn) {
    await page.mouse.click(medBtn.x + medBtn.w / 2, medBtn.y + medBtn.h / 2);
    await page.waitForTimeout(150);
  }
  const kits1 = await page.evaluate(() => window.__terrabound.game.carried.medkit ?? 0);
  check('talking to the Medic opens TRADE at its rows; buying a medkit puts it in the pack', medShop.open && medShop.tab === 'trade' && medShop.scroll > 0 && !!medBtn && kits1 === kits0 + 1, JSON.stringify({ medShop, medBtn: !!medBtn, kits0, kits1 }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  // Rook the Gunsmith moves into a third home (right of the first room) and builds weapon mod chips.
  const gunState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    const T = { AIR: 0, METAL: 2, TABLE: 46, LAMP: 47, BED: 51, CHAIR: 54 };
    const saved = [];
    const put = (x, y, t) => {
      saved.push([x, y, w.get(x, y)]);
      w.set(x, y, t);
    };
    for (let x = px + 4; x <= px + 8; x++) {
      put(x, py - 5, T.METAL);
      put(x, py, T.METAL);
    }
    for (let y = py - 4; y <= py - 1; y++) put(px + 8, y, T.METAL);
    for (let y = py - 4; y <= py - 1; y++) for (let x = px + 5; x <= px + 7; x++) put(x, y, T.AIR);
    put(px + 5, py - 1, T.BED);
    put(px + 7, py - 1, T.TABLE);
    put(px + 6, py - 4, T.LAMP);
    window.__gunSaved = saved;
    g.body.x = px + 6.5;
    g.body.y = py;
    g.body.vx = g.body.vy = 0;
    g.stash.copper_wire = (g.stash.copper_wire ?? 0) + 12;
    g.stash.crystal = (g.stash.crystal ?? 0) + 6;
    return { valid: g.rooms.filter((r) => r.valid).length };
  });
  await page.waitForTimeout(400);
  const gunNear = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const r = g.npcs.find((n) => n.kind === 'gunsmith');
    if (r) {
      g.body.x = r.x + 0.6;
      g.body.y = r.y;
      g.body.vx = g.body.vy = 0;
    }
    return { gunsmith: !!r, kinds: g.npcs.map((n) => n.kind), hint: g.hintAutomation(false) };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '35d-gunsmith.png') });
  const gunHint = await page.evaluate(() => window.__terrabound.game.hintAutomation(false));
  check('Rook the Gunsmith moves into a third home and offers weapon mods', gunState.valid >= 3 && gunNear.gunsmith && /Rook the Gunsmith/.test(gunHint || '') && /weapon mods/.test(gunHint || ''), JSON.stringify({ gunState, gunNear, gunHint }));
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '36d-gunsmith-mods.png') });
  const gunShop = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    const b = ui.rects.find((r) => r.a.k === 'modbuy' && r.a.id === 'overcharge');
    return { open: ui.shopOpen, tab: ui.shopTab, scroll: ui.shopScroll, btn: b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null };
  });
  const dmg0 = await page.evaluate(() => window.__terrabound.game.gear.rangedDmg);
  if (gunShop.btn) {
    await page.mouse.click(gunShop.btn.x, gunShop.btn.y);
    await page.waitForTimeout(200);
  }
  const gunAfter = await page.evaluate(() => {
    const { game, ui } = window.__terrabound;
    return { fitted: game.fittedMod('ranged'), dmg: game.gear.rangedDmg, fitBtn: !!ui.rects.find((r) => r.a.k === 'modfit' && r.a.id === 'overcharge') };
  });
  await page.screenshot({ path: path.join(out, '36e-mod-fitted.png') });
  check('talking to the Gunsmith opens its chips; BUILD fits an overcharge chip and the pistol hits harder', gunShop.open && gunShop.tab === 'trade' && gunShop.scroll > 0 && !!gunShop.btn && gunAfter.fitted === 'overcharge' && gunAfter.dmg > dmg0 && gunAfter.fitBtn, JSON.stringify({ gunShop, dmg0, gunAfter }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '36f-hotbar-chip.png') });
  // Nova the Scientist moves into a fourth home (right of the Gunsmith's, only fits the wide strip) and studies perks.
  const sciState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    const T = { AIR: 0, METAL: 2, TABLE: 46, LAMP: 47, BED: 51 };
    const saved = [];
    const put = (x, y, t) => {
      saved.push([x, y, w.get(x, y)]);
      w.set(x, y, t);
    };
    for (let x = px + 8; x <= px + 12; x++) {
      put(x, py - 5, T.METAL);
      put(x, py, T.METAL);
    }
    for (let y = py - 4; y <= py - 1; y++) put(px + 12, y, T.METAL);
    for (let y = py - 4; y <= py - 1; y++) for (let x = px + 9; x <= px + 11; x++) put(x, y, T.AIR);
    put(px + 9, py - 1, T.BED);
    put(px + 11, py - 1, T.TABLE);
    put(px + 10, py - 4, T.LAMP);
    window.__sciSaved = saved;
    g.stash.metal = (g.stash.metal ?? 0) + 8;
    g.stash.crystal = (g.stash.crystal ?? 0) + 4;
    return { valid: g.rooms.filter((r) => r.valid).length };
  });
  await page.waitForTimeout(400);
  const sciNear = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const r = g.npcs.find((n) => n.kind === 'scientist');
    if (r) {
      g.body.x = r.x + 0.6;
      g.body.y = r.y;
      g.body.vx = g.body.vy = 0;
    }
    return { scientist: !!r, kinds: g.npcs.map((n) => n.kind) };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '35e-scientist.png') });
  const sciHint = await page.evaluate(() => window.__terrabound.game.hintAutomation(false));
  check('Nova the Scientist moves into a fourth home and offers research', sciState.valid >= 4 && sciNear.scientist && /Nova the Scientist/.test(sciHint || '') && /research/.test(sciHint || ''), JSON.stringify({ sciState, sciNear, sciHint }));
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '36g-research.png') });
  const sciShop = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    const b = ui.rects.find((r) => r.a.k === 'research' && r.a.id === 'cell_density');
    return { open: ui.shopOpen, tab: ui.shopTab, scroll: ui.shopScroll, btn: b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null };
  });
  const bat0 = await page.evaluate(() => window.__terrabound.game.derived.maxBattery);
  if (sciShop.btn) {
    await holdClick(page, sciShop.btn.x, sciShop.btn.y);
    await page.waitForTimeout(200);
  }
  const sciAfter = await page.evaluate(() => {
    const { game } = window.__terrabound;
    return { done: game.hasResearch('cell_density'), bat: game.derived.maxBattery };
  });
  await page.screenshot({ path: path.join(out, '36h-researched.png') });
  check('talking to the Scientist opens its research; STUDY adds battery for good', sciShop.open && sciShop.tab === 'trade' && sciShop.scroll > 0 && !!sciShop.btn && sciAfter.done && sciAfter.bat === bat0 + 40, JSON.stringify({ sciShop, bat0, sciAfter }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    for (const [x, y, t] of window.__sciSaved.reverse()) g.world.set(x, y, t);
    g.save.research = [];
  });
  // Clean up: take the chip out and restore every tile the Gunsmith's room changed (later checks use the pad's right end).
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.fitMod('overcharge');
    for (const [x, y, t] of window.__gunSaved.reverse()) g.world.set(x, y, t);
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(200);
  // Quick heal: low HP shows a pulsing heal button by the bars; H eats a medkit, so does clicking the button.
  // (Medkits are kit items: a hauler drone from an earlier check would bank loose fish.)
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.carried.medkit = 2;
    g.hp = 20;
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, '37-quick-heal.png') });
  const healBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'heal'));
  await page.keyboard.down('KeyH');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyH');
  await page.waitForTimeout(150);
  const heal1 = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const r = { hp: Math.round(g.hp), kits: g.carried.medkit ?? 0 };
    g.hp = 20;
    return r;
  });
  await page.waitForTimeout(100);
  const healBtn2 = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'heal'));
  if (healBtn2) await page.mouse.click(healBtn2.x + healBtn2.w / 2, healBtn2.y + healBtn2.h / 2);
  await page.waitForTimeout(150);
  const heal2 = await page.evaluate(() => {
    const g = window.__terrabound.game;
    return { hp: Math.round(g.hp), kits: g.carried.medkit ?? 0 };
  });
  check('quick heal: H eats a medkit at low HP, and so does the HUD button', !!healBtn && heal1.kits === 1 && heal1.hp >= 75 && heal2.kits === 0 && heal2.hp >= 75, JSON.stringify({ healBtn: !!healBtn, heal1, heal2 }));
  // Hurt feedback: a hit flashes the screen edge red, shows a damage number and recoils the suit.
  const hurtFx = await page.evaluate(async () => {
    const t = window.__terrabound;
    const g = t.game;
    g.hp = g.derived.maxHp;
    const before = t.renderer.lastHurtAlpha;
    g.hurt(30);
    await new Promise((r) => setTimeout(r, 70));
    return { before, after: t.renderer.lastHurtAlpha };
  });
  await page.screenshot({ path: path.join(out, '37b-hurt.png') });
  check('a hit flashes a red screen-edge vignette that then fades', hurtFx.before < 0.05 && hurtFx.after > 0.2, JSON.stringify(hurtFx));
  await page.waitForTimeout(600);
  const hurtGone = await page.evaluate(() => window.__terrabound.renderer.lastHurtAlpha);
  check('the hurt vignette is gone after half a second at full HP', hurtGone < 0.02, JSON.stringify({ hurtGone }));
  // Farming: a small field outside the base (every crop stage, a sprinkler); right click plants a seed, the drill harvests.
  const farm = await page.evaluate(() => {
    const { game: g } = window.__terrabound;
    const T = { AIR: 0, RUST: 1, SPRINKLER: 66 };
    const x0 = g.world.padX + 22;
    const y = g.world.padY;
    window.__farmSaved = [];
    for (let x = x0 - 2; x <= x0 + 16; x++) {
      for (let yy = y - 10; yy < y; yy++) {
        window.__farmSaved.push([x, yy, g.world.get(x, yy)]);
        g.world.set(x, yy, T.AIR);
      }
      window.__farmSaved.push([x, y, g.world.get(x, y)]);
      g.world.set(x, y, T.RUST);
    }
    const crops = [57, 58, 59, 60, 61, 62, 63, 64, 65];
    crops.forEach((t, i) => g.world.set(x0 + 4 + i, y - 1, t));
    g.world.set(x0 + 13, y - 1, T.SPRINKLER);
    g.body.x = x0 + 2.5;
    g.body.y = y;
    g.body.vx = g.body.vy = 0;
    g.carried.corn_seed = 1;
    g.selected = 'corn_seed';
    return { x0, y };
  });
  await page.waitForTimeout(500);
  const farmPos = await page.evaluate(({ x0, y }) => {
    const r = window.__terrabound.renderer;
    const ts = 16 * r.scale;
    const at = (tx, ty) => ({ sx: r.w / 2 + (tx + 0.5 - r.camX) * ts, sy: r.h / 2 + (ty + 0.5 - r.camY) * ts });
    return { plant: at(x0 + 1, y - 1), ripe: at(x0 + 6, y - 1) };
  }, farm);
  await page.mouse.move(farmPos.plant.sx, farmPos.plant.sy);
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(150);
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(200);
  const planted = await page.evaluate(({ x0, y }) => {
    const g = window.__terrabound.game;
    return { tile: g.world.get(x0 + 1, y - 1), timers: g.world.crops.size, seeds: g.carried.corn_seed ?? 0 };
  }, farm);
  await page.screenshot({ path: path.join(out, '41-farm.png') });
  {
    // Crops sway in the wind and the sprinkler sprays: the crop row is drawn per frame and moves.
    const clipBox = await page.evaluate(({ x0, y }) => {
      const r = window.__terrabound.renderer;
      const ts = 16 * r.scale;
      return { x: Math.max(0, r.w / 2 + (x0 + 3 - r.camX) * ts), y: Math.max(0, r.h / 2 + (y - 3 - r.camY) * ts), width: ts * 13, height: ts * 3 };
    }, farm);
    const a = await page.screenshot({ clip: clipBox });
    await page.waitForTimeout(450);
    const b = await page.screenshot({ path: path.join(out, '41d-farm-sway.png'), clip: clipBox });
    const shown = await page.evaluate(() => window.__terrabound.renderer.farmShown);
    check('crops sway and the sprinkler sprays (farm row drawn per frame and moves)', shown >= 10 && !a.equals(b), JSON.stringify({ shown, same: a.equals(b) }));
  }
  check('right click plants a glowcorn seed on soil (sprout with a growth timer)', planted.tile === 57 && planted.timers >= 1 && planted.seeds === 0, JSON.stringify(planted));
  await page.evaluate(() => { window.__terrabound.game.tool = 'drill'; });
  await page.mouse.move(farmPos.ripe.sx, farmPos.ripe.sy);
  await page.mouse.down();
  await page.waitForTimeout(450);
  await page.mouse.up();
  await page.waitForTimeout(150);
  const reaped = await page.evaluate(({ x0, y }) => {
    const g = window.__terrabound.game;
    return { tile: g.world.get(x0 + 6, y - 1), corn: g.carried.glowcorn ?? 0, seeds: g.carried.corn_seed ?? 0 };
  }, farm);
  await page.screenshot({ path: path.join(out, '41b-harvest.png') });
  {
    // Harvested produce arcs into the hotbar/bag as icons (pickup flyers) and the slot pulses.
    const fly = await page.evaluate(() => {
      const f = window.__terrabound.ui.flyers;
      return { spawned: f.spawned, inFlight: f.list.length, pulses: f.pulse.size };
    });
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => window.__terrabound.ui.flyers.list.length);
    await page.evaluate(() => {
      const t = window.__terrabound;
      const c = document.getElementById('game');
      for (let i = 0; i < 4; i++) t.ui.flyPickup('glowcorn', c.clientWidth * 0.3 + i * 30, c.clientHeight * 0.35);
      t.ui.flyPickup('rust', c.clientWidth * 0.7, c.clientHeight * 0.3);
    });
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(out, '41e-pickup-fly.png') });
    check('harvest launches pickup icons that fly into the bar and land', fly.spawned >= 1 && fly.inFlight + fly.pulses >= 1 && after === 0, JSON.stringify({ ...fly, after }));
  }
  check('drilling ripe glowcorn harvests 2+ corn and a seed into the pack', reaped.tile === 0 && reaped.corn >= 2 && reaped.seeds >= 1, JSON.stringify(reaped));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    for (const [x, y, t] of window.__farmSaved.reverse()) g.world.set(x, y, t);
    delete g.carried.glowcorn;
    delete g.carried.corn_seed;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(300);

  // Soil strata: cut an open pit beside the base so the cross-section (bands, seams, buried bones) is on screen.
  const pit = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const x0 = w.padX + 24;
    const saved = [];
    let top = w.h;
    for (let x = x0; x < x0 + 5; x++) top = Math.min(top, w.surface[x]);
    for (let x = x0; x < x0 + 5; x++) for (let y = top - 3; y < top + 14; y++) { saved.push([x, y, w.get(x, y)]); w.set(x, y, 0); }
    for (let x = x0; x < x0 + 5; x++) { saved.push([x, top + 14, w.get(x, top + 14)]); w.set(x, top + 14, 1); }
    window.__pitSaved = saved;
    g.time = 30;
    g.body.x = x0 + 2.5;
    g.body.y = top + 13.9;
    g.body.vx = g.body.vy = 0;
    return { x0, top };
  });
  await page.waitForTimeout(700);
  const inPit = await page.evaluate(({ top }) => window.__terrabound.game.body.y > top + 10, pit);
  await page.screenshot({ path: path.join(out, '43-strata.png') });
  check('soil strata pit renders with the player at its floor', inPit, JSON.stringify(pit));
  // The pit walls are below the surface line, so they get rims; zoomed crop for the art review.
  const rimPit = await page.evaluate(() => window.__terrabound.renderer.lastRimCount);
  check('dug pit walls get a rim light (surface sky does not)', rimPit > 6, JSON.stringify({ rimPit }));
  await page.screenshot({ path: path.join(out, '50-rim-light.png'), clip: { x: 440, y: 160, width: 400, height: 400 } });
  // Back-wall AO: in a cached chunk, a walled air cell under a solid ceiling is darker along its top
  // row than the same wall texture without shade (the wall atlas), and unshaded in its middle.
  const ao = await page.evaluate(() => {
    const { game, renderer } = window.__terrabound;
    const w = game.world;
    const solid = (x, y) => w.isSolid(x, y) && w.get(x, y) !== 55;
    for (let y = w.surface[w.padX] + 6; y < w.h - 2; y++) {
      for (let x = 2; x < w.w - 2; x++) {
        if (w.get(x, y) !== 0 || w.wall(x, y) === 0 || !solid(x, y - 1)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y + 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)) continue;
        const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
        const ch = renderer.chunk(w, cx, cy);
        const lum = (ctx, px, py) => { const d = ctx.getImageData(px, py, 1, 1).data; return d[0] + d[1] + d[2]; };
        const cctx = ch.getContext('2d');
        const lx = (x - cx * 32) * 16, ly = (y - cy * 32) * 16;
        const wl = w.wall(x, y);
        // Same variant pick as drawBack: compare against every variant's pixel and take the match on an unshaded row.
        const actx = renderer.wallAtlas.getContext('2d');
        let best = -1;
        for (let v = 0; v < 4; v++) if (lum(actx, v * 16 + 8, wl * 16 + 8) === lum(cctx, lx + 8, ly + 8)) best = v;
        if (best < 0) continue;
        let top = 0, ref = 0;
        for (let i = 2; i < 14; i++) { top += lum(cctx, lx + i, ly); ref += lum(actx, best * 16 + i, wl * 16); }
        return { x, y, top, ref, mid: lum(cctx, lx + 8, ly + 8) };
      }
    }
    return null;
  });
  check('walled cave air under a ceiling gets a baked contact shadow (AO)', !!ao && ao.top < ao.ref * 0.85, JSON.stringify(ao));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    for (const [x, y, t] of window.__pitSaved.reverse()) g.world.set(x, y, t);
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(300);
  // Cooking: a pot in the base unlocks meals in FABRICATE; eating one shows a buff chip under the bars.
  const cook = await page.evaluate(() => {
    const t = window.__terrabound;
    const g = t.game;
    const px = g.world.padX + 5;
    const py = g.world.padY - 1;
    window.__potSaved = [px, py, g.world.get(px, py)];
    const before = g.hasPot();
    g.world.set(px, py, 67);
    g.stash.glowcorn = 2;
    g.stash.fish = (g.stash.fish ?? 0) + 1;
    t.act({ k: 'craft', id: 'chowder' });
    const made = g.carried.chowder ?? 0;
    const ate = g.useItem('chowder');
    return { before, after: g.hasPot(), made, ate, buff: Math.round(g.buffs.charged ?? 0) };
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, '41c-meal-buff.png') });
  check('a cooking pot unlocks corn chowder; eating it starts the Charged buff', !cook.before && cook.after && cook.made === 1 && cook.ate && cook.buff >= 170, JSON.stringify(cook));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const [x, y, t] = window.__potSaved;
    g.world.set(x, y, t);
    g.buffs = {};
  });
  // Windows and a lift: glass panes in the tower's side walls (a view adds comfort), a lift shaft up the outside.
  const winState = await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    const px = w.padX;
    const py = w.padY;
    const T = { METAL: 2, WINDOW: 55, LIFT: 56 };
    const raids = g.raidsOn;
    g.setRaids(false);
    for (const y of [py - 3, py - 4, py - 8, py - 9]) {
      w.set(px + 4, y, T.WINDOW);
      if (y < py - 5) w.set(px - 4, y, T.WINDOW);
    }
    for (let y = py - 11; y <= py - 1; y++) {
      w.set(px + 5, y, T.LIFT);
      w.set(px + 6, y, T.METAL);
    }
    g.body.x = px + 0.5;
    g.body.y = py;
    g.body.vx = g.body.vy = 0;
    const r = g.roomHere();
    return { raids, view: !!r && r.view, comfort: r ? r.comfort : -1, valid: !!r && r.valid };
  }).catch((e) => ({ err: String(e) }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '38-windows.png') });
  check('a window in a room wall gives it a view and keeps it a valid home', winState.view === true && winState.valid && winState.comfort === 4, JSON.stringify(winState));
  const liftY0 = await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.body.x = g.world.padX + 5.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
    return g.body.y;
  });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyW');
  const liftY1 = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.screenshot({ path: path.join(out, '38b-lift.png') });
  check('holding jump in a lift shaft rides up fast', liftY0 - liftY1 > 4, JSON.stringify({ liftY0, liftY1 }));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.time = 400;
    g.body.x = g.world.padX + 8.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '38c-windows-night.png') });
  // Robots go to bed at night (head on the pillow, z's) and sit on the chair by day.
  await page.waitForFunction(() => {
    const g = window.__terrabound.game;
    return g.npcs.length >= 2 && g.npcs.every((n) => n.pose === 'sleep');
  }, null, { timeout: 8000 }).catch(() => {});
  const asleep = await page.evaluate(() => window.__terrabound.game.npcs.map((n) => `${n.kind}:${n.pose}`));
  await page.screenshot({ path: path.join(out, '39-robots-asleep.png') });
  check('robots sleep in their beds at night', asleep.length >= 2 && asleep.every((a) => a.endsWith(':sleep')), JSON.stringify(asleep));
  const sat = await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.time = 30;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
    const n = g.npcs.find((k) => k.kind === 'trader');
    const chair = g.world.padX;
    if (!n || g.world.get(chair, g.world.padY - 1) !== 54) return { ok: false };
    g.body.x = g.world.padX + 8.5;
    n.pose = 'stand';
    n.x = chair + 0.6;
    n.to = chair + 0.5;
    n.wait = 0;
    return { ok: true };
  });
  await page.waitForFunction(() => window.__terrabound.game.npcs.find((k) => k.kind === 'trader')?.pose === 'sit', null, { timeout: 2000 }).catch(() => {});
  const sitPose = await page.evaluate(() => window.__terrabound.game.npcs.find((k) => k.kind === 'trader')?.pose ?? null);
  await page.screenshot({ path: path.join(out, '39b-robot-sits.png') });
  check('by day the Trader sits on the chair', sat.ok && sitPose === 'sit', JSON.stringify({ sat, sitPose }));
  const waved = await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.carried.rust = (g.carried.rust ?? 0) + 3;
    g.bank();
    return g.npcs.map((n) => n.react ?? null);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, '39c-robots-wave.png') });
  check('robots wave when you bring loot home', waved.length >= 2 && waved.every((r) => r === 'wave'), JSON.stringify(waved));
  // Dex the merchant drone parks over the pad by day; E beside it opens TRADE at today's stock.
  const merch = await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.time = 60;
    const p = g.merchantPos();
    g.body.x = p.x;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
    // Enough goods for every offer, so each row's TRADE button is live.
    for (const t of g.tradeList().filter((k) => k.npc === 'merchant')) for (const [k, n] of Object.entries(t.give)) g.stash[k] = (g.stash[k] ?? 0) + n;
    return { here: g.merchantHere() };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '40-merchant.png') });
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyE');
  await page.waitForTimeout(250);
  const merchShop = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    const ids = game.tradeList().filter((t) => t.npc === 'merchant').map((t) => t.id);
    return { open: ui.shopOpen, tab: ui.shopTab, near: game.merchantNear(), btns: ids.filter((id) => ui.rects.some((r) => r.a.k === 'trade' && r.a.id === id)).length };
  });
  await page.screenshot({ path: path.join(out, '40b-merchant-trade.png') });
  check('the merchant drone parks on the pad by day and E opens its stock', merch.here && merchShop.open && merchShop.tab === 'trade' && merchShop.btns === 3, JSON.stringify({ merch, merchShop }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.evaluate((raids) => {
    const g = window.__terrabound.game;
    g.time = 30;
    g.setRaids(raids);
    const w = g.world;
    for (let y = w.padY - 11; y <= w.padY - 1; y++) for (const x of [w.padX + 5, w.padX + 6]) w.set(x, y, 0);
  }, winState.raids ?? true);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    for (let y = w.padY - 10; y <= w.padY - 1; y++) for (let x = w.padX - 4; x <= w.padX + 4; x++) {
      w.set(x, y, 0);
      w.setWall(x, y, 0);
    }
  });

  // Share card: SHARE on the map downloads a PNG in a headless browser (no Web Share there).
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(200);
  const shareBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'share'));
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  if (shareBtn) await page.mouse.click(shareBtn.x + shareBtn.w / 2, shareBtn.y + shareBtn.h / 2);
  const file = await dl;
  if (file) await file.saveAs(path.join(out, '32-share-card.png'));
  check('SHARE creates a share card image', !!file && /terrabound-.*\.png/.test(file.suggestedFilename()), file ? file.suggestedFilename() : 'no download');
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(100);

  // Map: zoom with the wheel and the +/- buttons.
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(200);
  const z0 = await page.evaluate(() => window.__terrabound.ui.mapView.zoom);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(150);
  const z1 = await page.evaluate(() => window.__terrabound.ui.mapView.zoom);
  await page.screenshot({ path: path.join(out, '24-map-zoom.png') });
  const minus = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'mapzoom' && r.a.d === -1));
  if (minus) await page.mouse.click(minus.x + minus.w / 2, minus.y + minus.h / 2);
  await page.mouse.click(minus.x + minus.w / 2, minus.y + minus.h / 2);
  const z2 = await page.evaluate(() => window.__terrabound.ui.mapView.zoom);
  check('the map zooms in with the wheel and out with the - button', z1 === z0 + 1 && z2 === z0 - 1, JSON.stringify({ z0, z1, z2 }));
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(500, 360, { steps: 4 });
  await page.mouse.up();
  check('dragging pans the map', await page.evaluate(() => window.__terrabound.ui.mapView.panX !== 0));
  await page.screenshot({ path: path.join(out, '25-map-far.png') });
  await page.keyboard.press('KeyM');
  await page.screenshot({ path: path.join(out, '12-chest-loot.png') });

  // Map: M opens it (pauses the dive), M closes it. Then beam home from the surface with R.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    // A dry, open surface column (ponds and structures dot the surface now).
    let x = g.world.padX + 90;
    while (!(g.world.isSolid(x, g.world.surface[x]) && g.world.get(x, g.world.surface[x] - 1) === 0 && g.world.get(x, g.world.surface[x] - 2) === 0)) x++;
    g.enemies = [];
    g.fallers = [];
    g.body.x = x + 0.5;
    g.body.y = g.world.surface[x] - 0.01;
    g.body.vx = g.body.vy = 0;
  });
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(300);
  const mapState = await page.evaluate(() => ({ open: window.__terrabound.ui.mapOpen, t: window.__terrabound.game.time }));
  await page.waitForTimeout(300);
  const paused = (await page.evaluate(() => window.__terrabound.game.time)) === mapState.t;
  await page.screenshot({ path: path.join(out, '13-map.png') });
  check('M opens the map and pauses the dive', mapState.open && paused, JSON.stringify(mapState));
  await page.keyboard.press('KeyM');
  check('M closes the map', !(await page.evaluate(() => window.__terrabound.ui.mapOpen)));
  await page.waitForTimeout(200);
  check('beam home is offered on the surface', await page.evaluate(() => window.__terrabound.game.canRecall()));
  await page.keyboard.press('KeyR');
  await page.waitForFunction(() => window.__terrabound.game.isAtBase(), null, { timeout: 5000 }).catch(() => {});
  check('R beams the player home from the surface', await page.evaluate(() => window.__terrabound.game.isAtBase()));
  check('codex records discoveries', (await page.evaluate(() => window.__terrabound.game.codex.length)) >= 2);

  // Day/night: the sky darkens at night and the moon is out.
  const skyAt = async (t) => {
    await page.evaluate((tt) => {
      const g = window.__terrabound.game;
      g.time = tt;
      const x = g.world.padX + 50;
      g.enemies = [];
      g.body.x = x + 0.5;
      g.body.y = g.world.surface[x] - 0.01;
    }, t);
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      // Sample right of centre: the top-left corner holds the HUD and the toast column.
      const c = document.getElementById('game');
      const d = c.getContext('2d').getImageData(Math.round(c.width * 0.62), 140, 1, 1).data;
      return d[0] + d[1] + d[2];
    });
  };
  const daySky = await skyAt(30);
  const nightSky = await skyAt(400);
  await page.screenshot({ path: path.join(out, '15-night.png') });
  check('the sky is darker at night', nightSky < daySky * 0.7, JSON.stringify({ daySky, nightSky }));
  await skyAt(30);

  // Base machines: a solar cell powers a smelter that turns stash rust into metal; screenshot the glowing base.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    g.time = 30;
    w.set(w.padX + 2, w.padY - 1, 27);
    w.set(w.padX + 3, w.padY - 1, 28);
    w.set(w.padX + 4, w.padY - 1, 27);
    w.set(w.padX + 5, w.padY - 1, 29);
    w.set(w.padX + 6, w.padY - 1, 30);
    g.stash.iron_scrap = 0;
    g.stash.rust = 8;
    g.stash.metal = 0;
    g.enemies = [];
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY - 0.01;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, '18-machines.png') });
  const mach = await page.evaluate(() => {
    const g = window.__terrabound.game;
    return { working: g.power.working, solars: g.power.solars, rust: g.stash.rust, batteries: g.power.batteries, miners: g.power.miners };
  });
  check('smelter works from solar power and eats stash rust', mach.working && mach.solars === 2 && mach.batteries === 1 && mach.miners === 1 && mach.rust <= 8, JSON.stringify(mach));
  await page.evaluate(() => {
    const w = window.__terrabound.game.world;
    for (const dx of [2, 3, 4, 5, 6]) w.set(w.padX + dx, w.padY - 1, 0);
  });

  // Chunk cache: a tile changed in the sim must change on screen next frame.
  const cacheOk = await page.evaluate(async () => {
    const t = window.__terrabound;
    const g = t.game;
    const w = g.world;
    const x = w.padX + 40;
    const y = w.surface[x] + 3;
    g.body.x = x + 0.5;
    g.body.y = w.surface[x] - 0.01;
    for (let i = 0; i < 30; i++) {
      t.renderer.follow(g, 1 / 60);
      t.renderer.draw(g, t.fx, null, 0);
    }
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const r = t.renderer;
    const ts = 16 * r.scale;
    const px = Math.round(r.w / 2 + (x + 0.5 - r.camX) * ts);
    const py = Math.round(r.h / 2 + (y + 0.5 - r.camY) * ts);
    const sample = () => Array.from(ctx.getImageData(px, py, 1, 1).data).join(',');
    w.set(x, y, 17); // crystal: bright, unmistakable
    t.renderer.draw(g, t.fx, null, 0);
    const a = sample();
    w.set(x, y, 2); // metal
    t.renderer.draw(g, t.fx, null, 0);
    const b = sample();
    return { a, b, changed: a !== b };
  });
  check('chunk cache redraws a changed tile immediately', cacheOk.changed, JSON.stringify(cacheOk));
  // Frame cost in the big world: time renderer.draw directly over many frames (includes light map rebuilds).
  const perf = await page.evaluate(() => {
    const t = window.__terrabound;
    const g = t.game;
    g.body.x = g.world.padX + 60.5;
    g.body.y = g.world.surface[g.world.padX + 60] - 0.01;
    const n = 120;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      g.body.x += 0.25; // walk: forces light map rebuilds as the player crosses tiles
      t.renderer.follow(g, 1 / 60);
      t.renderer.draw(g, t.fx, null, i / 60);
    }
    return { ms: (performance.now() - t0) / n, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1 };
  });
  console.log('perf', JSON.stringify(perf));
  // Headless Chrome renders in software on a shared VM, so this is a coarse regression guard, not the 60 fps budget.
  check('average frame draw under 12 ms while walking in the big world', perf.ms < 12, JSON.stringify(perf));
  check('JS heap under 200 MB', perf.heapMB < 200, JSON.stringify(perf));

  // Let it run a few seconds idle to catch loop errors.
  await page.waitForTimeout(2000);
  check('no console or page errors on desktop', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ---------- Mobile (touch, portrait) ----------
  const merrors = [];
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page = await openPage(mctx, merrors);
  await page.screenshot({ path: path.join(out, '05-mobile-title.png') });
  await page.touchscreen.tap(195, 470);
  await page.waitForTimeout(400);
  check('tap starts the game on mobile', (await page.evaluate(() => window.__terrabound.ui.screen)) === 'play');
  check('touch mode detected', await page.evaluate(() => window.__terrabound.ui.touch));
  await page.screenshot({ path: path.join(out, '06-mobile-play.png') });
  await toastCheck(page, 'mobile', '46b-mobile-toasts.png');
  const canvasOk = await page.evaluate(() => {
    const c = document.getElementById('game');
    return c.width >= 700 && c.height >= 1600;
  });
  check('canvas is sized for the device pixel ratio', canvasOk);
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.stash.rust = 20;
    g.stash.iron_scrap = 20;
    window.__terrabound.ui.shopOpen = true;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '09-mobile-shop.png') });
  await page.evaluate(() => { window.__terrabound.ui.setShopTab('fab'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '09b-mobile-shop-fab.png') });
  await page.evaluate(() => { window.__terrabound.act({ k: 'tab', t: 'upgrades' }); });
  check('shop tab action switches tabs', (await page.evaluate(() => window.__terrabound.ui.shopTab)) === 'upgrades');
  const seedBeforeDaily = await page.evaluate(() => window.__terrabound.game.seedCode);
  await page.evaluate(() => { window.__terrabound.act({ k: 'daily' }); });
  await page.waitForTimeout(200);
  const dailyArmed = await page.evaluate(() => ({ armed: window.__terrabound.ui.dailyArmed > 0, open: window.__terrabound.ui.shopOpen, code: window.__terrabound.game.seedCode }));
  check('first DAILY tap only arms a confirm (world unchanged, workshop open)', dailyArmed.armed && dailyArmed.open && dailyArmed.code === seedBeforeDaily, JSON.stringify(dailyArmed));
  await page.evaluate(() => { window.__terrabound.act({ k: 'daily' }); });
  await page.waitForTimeout(200);
  const dailyOk = await page.evaluate(() => {
    const g = window.__terrabound.game;
    return /^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(g.seedCode) && !window.__terrabound.ui.shopOpen;
  });
  check('DAILY action starts a code-seeded world', dailyOk);
  {
    // Local world record: bank on the daily, dive it again, bank more and get a personal-best toast;
    // the workshop footer shows the record line.
    await page.evaluate(() => {
      const { game } = window.__terrabound;
      game.body.x = game.world.padX + 0.5;
      game.body.y = game.world.padY;
      game.carried.rust = 3;
      game.bank();
      window.__terrabound.act({ k: 'daily' });
      window.__terrabound.act({ k: 'daily' });
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const { game } = window.__terrabound;
      game.body.x = game.world.padX + 0.5;
      game.body.y = game.world.padY;
      game.carried.rust = 5;
      game.bank();
    });
    await page.waitForTimeout(250);
    await page.evaluate(() => { window.__terrabound.ui.shopOpen = true; window.__terrabound.ui.setShopTab('upgrades'); });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, '42-world-record.png') });
    const recState = await page.evaluate(() => {
      const { game, ui } = window.__terrabound;
      const r = game.worldRecord();
      return { code: r?.code, loot: r?.loot, runs: r?.runs, toast: ui.toasts.some((t) => t.text.startsWith('New personal best')) };
    });
    check('a second Daily Dive try that banks more shows a personal-best toast and record', recState.loot === 5 && recState.runs >= 2 && recState.toast, JSON.stringify(recState));
  }
  await page.evaluate(() => { window.__terrabound.ui.shopOpen = false; });
  await page.waitForTimeout(200);
  // Tap the MAP button like a player would.
  const mapBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'map'));
  if (mapBtn) await page.touchscreen.tap(mapBtn.x + mapBtn.w / 2, mapBtn.y + mapBtn.h / 2);
  await page.waitForTimeout(400);
  check('tapping MAP opens the map on mobile', await page.evaluate(() => window.__terrabound.ui.mapOpen), JSON.stringify(mapBtn));
  await page.screenshot({ path: path.join(out, '14-mobile-map.png') });
  await page.evaluate(() => { window.__terrabound.ui.mapOpen = false; });
  // Awards page fits a phone: every card and button inside the screen, header buttons apart.
  const mAwards = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    ui.invOpen = true;
    ui.invPage = 'awards';
    return true;
  });
  await page.waitForTimeout(250);
  const mFit = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    const c = document.getElementById('game');
    const W = c.clientWidth, H = c.clientHeight;
    const rs = ui.rects.filter((r) => ['awards', 'awardpage', 'inv'].includes(r.a.k));
    const inside = rs.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W + 1 && r.y + r.h <= H + 1);
    const hdr = rs.filter((r) => r.a.k === 'awards' || r.a.k === 'inv');
    const apart = hdr.length === 2 && (hdr[0].x + hdr[0].w <= hdr[1].x || hdr[1].x + hdr[1].w <= hdr[0].x);
    return { n: rs.length, inside, apart, shown: ui.awardsShown };
  });
  await page.screenshot({ path: path.join(out, '48c-mobile-awards.png') });
  check('awards page fits a phone', mAwards && mFit.inside && mFit.apart && mFit.shown >= 3, JSON.stringify(mFit));
  // Codex fits a phone too: tabs, cards and page buttons inside the screen; on the items page the two header buttons and CLOSE never overlap.
  const mCodex = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    ui.invPage = 'codex';
    ui.codexSec = 'logs';
    return true;
  });
  await page.waitForTimeout(250);
  const mcFit = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    const c = document.getElementById('game');
    const W = c.clientWidth, H = c.clientHeight;
    const rs = ui.rects.filter((r) => ['codex', 'codexsec', 'codexpage', 'inv'].includes(r.a.k));
    const inside = rs.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W + 1 && r.y + r.h <= H + 1);
    return { n: rs.length, inside, shown: ui.codexShown };
  });
  await page.screenshot({ path: path.join(out, '51d-mobile-codex.png') });
  const mReader = await page.evaluate(() => {
    const { ui, game } = window.__terrabound;
    game.emit({ t: 'lore', text: 'LOG 01: Survey team landed. The planet hums under our boots.' });
    ui.logOpen = 0;
    return true;
  });
  await page.waitForTimeout(250);
  const mrFit = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    const c = document.getElementById('game');
    const W = c.clientWidth, H = c.clientHeight;
    const rs = ui.rects.filter((r) => ['logread', 'codexsec'].includes(r.a.k));
    return { n: rs.length, open: ui.logOpen, inside: rs.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W + 1 && r.y + r.h <= H + 1) };
  });
  await page.screenshot({ path: path.join(out, '51h-mobile-log-reader.png') });
  check('the log reader fits a phone', mReader && mrFit.open === 0 && mrFit.inside && mrFit.n >= 5, JSON.stringify(mrFit));
  await page.evaluate(() => { window.__terrabound.ui.logOpen = null; });
  await page.evaluate(() => { window.__terrabound.ui.invPage = 'items'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, '51e-mobile-inventory.png') });
  const mHead = await page.evaluate(() => {
    const { ui } = window.__terrabound;
    const hdr = ui.rects.filter((r) => (r.a.k === 'awards' || r.a.k === 'codex' || r.a.k === 'inv'));
    const apart = hdr.every((a, i) => hdr.every((b, j) => i === j || a.x + a.w <= b.x || b.x + b.w <= a.x));
    return { n: hdr.length, apart, left: Math.min(...hdr.map((r) => r.x)) };
  });
  check('codex fits a phone and the inventory header buttons stay apart', mCodex && mcFit.inside && mcFit.shown >= 3 && mHead.n === 3 && mHead.apart && mHead.left >= 0, JSON.stringify({ mcFit, mHead }));
  await page.evaluate(() => { const { ui } = window.__terrabound; ui.invOpen = false; ui.invPage = 'items'; });
  // Drone rule panel fits a phone: build two bays, open it, add three rules, every button on screen.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    const w = g.world;
    w.set(w.padX + 2, w.padY - 1, 31);
    w.set(w.padX + 3, w.padY - 1, 31);
    g.body.x = w.padX + 0.5;
    g.body.y = w.padY;
    g.setDroneRole('2,1', 'guard');
    g.setDroneRules('2,1', [{ when: 'enemy', then: 'guard' }, { when: 'hp_low', then: 'repair' }, { when: 'night', then: 'home' }]);
  });
  await page.waitForTimeout(300);
  const dronesBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'drones'));
  if (dronesBtn) await page.touchscreen.tap(dronesBtn.x + dronesBtn.w / 2, dronesBtn.y + dronesBtn.h / 2);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, '33d-mobile-drones.png') });
  const mpanel = await page.evaluate(() => {
    const ui = window.__terrabound.ui;
    const rs = ui.rects.filter((r) => ['ruledel', 'ruleact', 'rulecond', 'bayrole', 'baynext'].includes(r.a.k));
    return { open: ui.dronesOpen, n: rs.length, inside: rs.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= innerWidth && r.y + r.h <= innerHeight) };
  });
  check('drone rule panel fits a phone with three rules', !!dronesBtn && mpanel.open && mpanel.n === 3 * 3 + 3 && mpanel.inside, JSON.stringify(mpanel));
  await page.evaluate(() => { window.__terrabound.ui.dronesOpen = false; });
  // Settings at the HUGE size still fits a phone (every stepper on screen).
  const msettings = await page.evaluate(async () => {
    const t = window.__terrabound;
    t.game.stepPref('uiSize', 1);
    t.game.stepPref('uiSize', 1);
    t.ui.uiScale = 1.36;
    t.ui.settingsOpen = true;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = document.getElementById('game');
    const rs = t.ui.rects.filter((r) => r.a.k === 'pref' || r.a.k === 'mute' || r.a.k === 'settings');
    return { n: rs.length, inside: rs.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= c.width && r.y + r.h <= c.height) };
  });
  await page.screenshot({ path: path.join(out, '44c-mobile-settings.png') });
  check('settings at HUGE size fits a phone', msettings.n >= 13 && msettings.inside, JSON.stringify(msettings));
  await page.evaluate(() => {
    const t = window.__terrabound;
    t.ui.settingsOpen = false;
    t.game.stepPref('uiSize', -1);
    t.game.stepPref('uiSize', -1);
    t.ui.uiScale = 1;
  });
  {
    // TOUCH MOVE STICK: the move stick starts on the left third by default, on the right third when set.
    const stickAt = async (side, x) => page.evaluate(async ([side, x]) => {
      const t = window.__terrabound;
      while (t.game.prefs.stickSide !== side) t.act({ k: 'pref', key: 'stickSide', d: side > t.game.prefs.stickSide ? 1 : -1 });
      const c = document.getElementById('game');
      const r = c.getBoundingClientRect();
      const ev = (type) => new PointerEvent(type, { pointerId: 77, pointerType: 'touch', clientX: r.left + x, clientY: r.top + r.height * 0.6, bubbles: true });
      c.dispatchEvent(ev('pointerdown'));
      await new Promise((res) => requestAnimationFrame(res));
      const stick = t.input.stick() !== null;
      c.dispatchEvent(ev('pointerup'));
      return stick;
    }, [side, x]);
    const vw = 390;
    const res = { leftDefault: await stickAt(0, 30), rightDefault: await stickAt(0, vw - 30), leftLefty: await stickAt(1, 30), rightLefty: await stickAt(1, vw - 30) };
    await page.evaluate(() => window.__terrabound.act({ k: 'pref', key: 'stickSide', d: 1 }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, '06b-mobile-lefty.png') });
    const mir = await page.evaluate(() => {
      const t = window.__terrabound;
      const c = document.getElementById('game');
      const btns = t.ui.rects.filter((r) => ['mute', 'map', 'recall', 'shop', 'mode', 'settings'].includes(r.a.k));
      const right = Math.max(...btns.map((r) => r.x + r.w));
      return { mirrored: t.ui.hudMirrored, n: btns.length, right, zone: c.width * (1 - 0.33) };
    });
    check('left-handed touch mirrors the HUD: buttons clear of the right-hand stick zone', mir.mirrored && mir.n >= 4 && mir.right < mir.zone, JSON.stringify(mir));
    const hint = await page.evaluate(() => window.__terrabound.game.stats.playTime);
    await page.evaluate(() => window.__terrabound.act({ k: 'pref', key: 'stickSide', d: -1 }));
    check('touch move stick follows the stick-side setting', res.leftDefault && !res.rightDefault && !res.leftLefty && res.rightLefty, JSON.stringify({ ...res, hint }));
  }
  {
    // Safe area: a faked notch (47 px) and home bar (34 px) keep every button and the hotbar inside them.
    const npage = await mctx.newPage();
    npage.on('pageerror', (e) => merrors.push('pageerror: ' + e.message));
    await npage.goto(base + (base.includes('?') ? '&' : '?') + 'inset=47,0,34,0');
    await npage.waitForFunction(() => window.__terrabound, null, { timeout: 10000 });
    await npage.touchscreen.tap(195, 470);
    await npage.waitForTimeout(400);
    const notch = await npage.evaluate(() => {
      const { ui } = window.__terrabound;
      const top = Math.min(...ui.rects.map((r) => r.y));
      const bottom = Math.max(...ui.rects.map((r) => r.y + r.h));
      return { screen: ui.screen, frame: ui.frame, top, bottom, n: ui.rects.length };
    });
    await npage.screenshot({ path: path.join(out, '06c-mobile-notch.png') });
    check('a notch and home bar push the HUD and hotbar inside the safe area', notch.screen === 'play' && notch.n > 5 && notch.top >= 47 && notch.bottom <= 844 - 34 && notch.frame.y === 47, JSON.stringify(notch));
    // Touch grappling: while hooked a HOLD REEL button appears; holding it reels the rope in.
    const hooked = await npage.evaluate(() => {
      const { game: g } = window.__terrabound;
      const bx = Math.floor(g.body.x);
      const by = Math.floor(g.body.y);
      g.enemies = [];
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = 2; dy <= 7; dy++) g.world.set(bx + dx, by - dy, 0);
        g.world.set(bx + dx, by - 8, 2);
      }
      g.setTool('hook');
      return g.pressHook({ tx: bx, ty: by - 8 }) ? g.hook.len : -1;
    });
    await npage.waitForTimeout(200);
    const reelBtn = await npage.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'reel') ?? null);
    const reel = reelBtn ? await npage.evaluate(async (b) => {
      const t = window.__terrabound;
      const c = document.getElementById('game');
      const r = c.getBoundingClientRect();
      const ev = (type) => new PointerEvent(type, { pointerId: 91, pointerType: 'touch', clientX: r.left + b.x + b.w / 2, clientY: r.top + b.y + b.h / 2, bubbles: true });
      const len0 = t.game.hook ? t.game.hook.len : -1;
      c.dispatchEvent(ev('pointerdown'));
      await new Promise((res) => setTimeout(res, 450));
      const len1 = t.game.hook ? t.game.hook.len : -1;
      const reeling = t.ui.reeling;
      c.dispatchEvent(ev('pointerup'));
      await new Promise((res) => setTimeout(res, 100));
      return { len0, len1, reeling, after: t.ui.reeling, tool: t.game.tool };
    }, reelBtn) : null;
    await npage.screenshot({ path: path.join(out, '23b-mobile-reel.png') });
    check('touch: holding HOLD REEL reels the grappling rope in', hooked > 0 && !!reel && reel.reeling && !reel.after && reel.len1 < reel.len0 - 0.8, JSON.stringify({ hooked, reelBtn, reel }));
    await npage.close();
  }
  check('no console or page errors on mobile', merrors.length === 0, merrors.join(' | '));
  await mctx.close();
  const gctx = await browser.newContext({ viewport: { width: 1100, height: 1040 } });
  const gpage = await gctx.newPage();
  const gerrors = [];
  gpage.on('pageerror', (e) => gerrors.push(e.message));
  await gpage.goto(base + '&gallery=1');
  await gpage.waitForTimeout(300);
  await gpage.screenshot({ path: path.join(out, '10-gallery.png') });
  check('sprite gallery renders without errors', gerrors.length === 0, gerrors.join(' | '));
  await gctx.close();
} catch (e) {
  console.error(e);
  failures.push('exception: ' + (e instanceof Error ? e.message : String(e)));
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} e2e check(s) failed: ${failures.join('; ')}`);
  process.exit(1);
}
console.log('\nAll e2e checks passed. Screenshots in e2e/out/');

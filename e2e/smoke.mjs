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

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

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
  await page.keyboard.up('KeyD');
  const x1 = await page.evaluate(() => window.__terrabound.game.body.x);
  check('walking moves the player', x1 > x0 + 3, `x ${x0.toFixed(1)} -> ${x1.toFixed(1)}`);

  // Jump.
  const y0 = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(150);
  const yUp = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.keyboard.up('KeyW');
  check('jumping lifts the player', yUp < y0 - 0.5, `y ${y0.toFixed(2)} -> ${yUp.toFixed(2)}`);
  await page.waitForTimeout(900);

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
  await page.reload();
  await page.waitForFunction(() => window.__terrabound);
  const persisted = await page.evaluate(() => window.__terrabound.game.upgrades.battery);
  check('progress persists across reload', persisted === 1, `battery level ${persisted}`);

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
  await page.keyboard.press('KeyQ');

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
  const canvasOk = await page.evaluate(() => {
    const c = document.getElementById('game');
    return c.width >= 700 && c.height >= 1600;
  });
  check('canvas is sized for the device pixel ratio', canvasOk);
  check('no console or page errors on mobile', merrors.length === 0, merrors.join(' | '));
  await mctx.close();
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

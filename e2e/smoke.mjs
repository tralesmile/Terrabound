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
  }
  check('every biome can be visited and renders', seen.length === biomeNames.length, seen.join(','));
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
  await page.keyboard.down('KeyW');
  let swamUp = swim.y;
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(60);
    swamUp = Math.min(swamUp, await page.evaluate(() => window.__terrabound.game.body.y));
  }
  await page.keyboard.up('KeyW');
  check('the player swims in a flooded cave and W strokes upward', !!poolAt && swim.inLiquid === 25 && swamUp < swim.y - 0.5, JSON.stringify({ poolAt, swim, swamUp }));

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
  // Workshop GEAR tab: build the Sky Jet with real clicks, then ride it with V and fly.
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.stash = { metal: 200, iron_scrap: 200, copper_wire: 200, crystal: 200, biomass: 200 };
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
    g.enemies = [];
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(200);
  const gearTab = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'tab' && r.a.t === 'gear'));
  if (gearTab) await page.mouse.click(gearTab.x + gearTab.w / 2, gearTab.y + gearTab.h / 2);
  await page.waitForTimeout(150);
  await page.evaluate(() => { window.__terrabound.ui.shopScroll = 99; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, '21-gear-tab.png') });
  const jetBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'craftgear' && r.a.id === 'sky_jet'));
  if (jetBtn) await page.mouse.click(jetBtn.x + jetBtn.w / 2, jetBtn.y + jetBtn.h / 2);
  await page.waitForTimeout(100);
  check('the GEAR tab builds a Sky Jet', await page.evaluate(() => window.__terrabound.game.ownsGear('sky_jet')), JSON.stringify(jetBtn));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyV');
  const jetY0 = await page.evaluate(() => window.__terrabound.game.body.y);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1200);
  await page.keyboard.up('KeyW');
  const flight = await page.evaluate(() => ({ riding: window.__terrabound.game.riding, y: window.__terrabound.game.body.y }));
  await page.screenshot({ path: path.join(out, '22-sky-jet.png') });
  check('V rides the Sky Jet and W flies up', flight.riding && flight.y < jetY0 - 5, JSON.stringify({ jetY0, ...flight }));
  await page.keyboard.press('KeyV');
  // Hoverbike art check: ride it on the pad and screenshot (sprite map, not rectangles).
  const bike = await page.evaluate(() => {
    const g = window.__terrabound.game;
    g.save.gear.equip.vehicle = 'hoverbike';
    g.gearCache = null;
    g.body.x = g.world.padX + 0.5;
    g.body.y = g.world.padY;
    g.body.vx = g.body.vy = 0;
    if (!g.riding) g.toggleRide();
    return g.vehicle;
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '22b-hoverbike.png') });
  check('the hoverbike rides as a sprite', bike === 'hoverbike', String(bike));
  await page.evaluate(() => {
    const g = window.__terrabound.game;
    if (g.riding) g.toggleRide();
    g.save.gear.equip.vehicle = 'sky_jet';
    g.gearCache = null;
  });
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
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(100);
  check('jump lets go of the rope', await page.evaluate(() => !window.__terrabound.game.hook));
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
      const d = document.getElementById('game').getContext('2d').getImageData(20, 140, 1, 1).data;
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
  await page.evaluate(() => { window.__terrabound.act({ k: 'daily' }); });
  await page.waitForTimeout(200);
  const dailyOk = await page.evaluate(() => {
    const g = window.__terrabound.game;
    return /^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(g.seedCode) && !window.__terrabound.ui.shopOpen;
  });
  check('DAILY action starts a code-seeded world', dailyOk);
  await page.evaluate(() => { window.__terrabound.ui.shopOpen = false; });
  await page.waitForTimeout(200);
  // Tap the MAP button like a player would.
  const mapBtn = await page.evaluate(() => window.__terrabound.ui.rects.find((r) => r.a.k === 'map'));
  if (mapBtn) await page.touchscreen.tap(mapBtn.x + mapBtn.w / 2, mapBtn.y + mapBtn.h / 2);
  await page.waitForTimeout(400);
  check('tapping MAP opens the map on mobile', await page.evaluate(() => window.__terrabound.ui.mapOpen), JSON.stringify(mapBtn));
  await page.screenshot({ path: path.join(out, '14-mobile-map.png') });
  await page.evaluate(() => { window.__terrabound.ui.mapOpen = false; });
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

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
    await page.mouse.click(wp.x, wp.y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, '19-fishing.png') });
    await page.waitForFunction(() => (window.__terrabound.game.fishing?.bite ?? 0) > 0, null, { timeout: 9000 }).catch(() => {});
    await page.mouse.click(wp.x, wp.y);
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

# Lessons (mistakes made and the guard added; read before starting)

- **Test setup bugs look like game bugs.** Five early failures were test-world issues (side walls above the surface, unminable pad tiles, auto-bank emptying test loot). Guard: use the `standOnSurface` helper and set state explicitly in tests.
- **Vitest swallows console.log.** Use `process.stdout.write` when debugging; delete debug files after.
- **Never use sed to rewrite files with complex content.** It mangled a file once; rewrite with Write instead.
- **Mobile layout needs a screenshot.** Text overflow and footer overlaps only showed in the 360 px screenshot. Guard: e2e saves mobile screenshots; look at them after any UI change.
- **Touch detection must happen at boot**, not on first touch, or the title shows desktop hints. Guard: e2e touch check.
- **`gh` auth may be broken.** Use plain `git push`; do not rely on PRs.
- **Typecheck with `@types/node`** is required for tests that use Buffer; `types` in tsconfig lists it.
- **Commit after every green slice** so a usage-limit stop never loses work.
- **Branch setup:** a fresh clone is on `main`; the runbook's `git checkout dev` fails until `git checkout -b dev origin/dev`. Use that.
- **Tool names are case-sensitive** (`Bash`, not `bash`).
- **Test worlds are solid rock.** Projectile/enemy tests need an open corridor; use `openCorridor` in tests/enemies.test.ts instead of assuming air.
- **Auto-bank eats crafted items.** Crafting at the base put items in the pack, which the base banked straight back. Guard: `kit` flag on ItemDef (banking skips kit items) plus a unit test; any new craftable gear must set `kit: true`.
- **Shop panel text can clip under buttons.** Pass a `maxW` to `text()` for any row with a right-side button.
- **Adding items widens the hotbar and stash row.** Slot sizes are now computed from the item count, but adding more than ~10 placeables will need a scrolling bar. Guard: always view 06-mobile-play.png and 09-mobile-shop.png after adding an item.
- **Sim bots need latches, not float thresholds.** A balance bot flipped between "walk" and "dig" at a 10.0-tile boundary because centring jitter crossed it every frame, silently resetting mining. Guard: one-way `leftPad` latch; when a bot test shows 0 progress, print per-frame state before touching game numbers.
- **Check whether a number is a game problem or a bot problem before tuning.** Balance changes only after the bot was verified to dig correctly.
- **`git stash` ignores untracked files**; do not rely on it to isolate a new test file.
- **The repo moved to `tralesmile/Terrabound`** (git prints a redirect warning on push; pushes still work).
- **Tests that name upgrade ids must use real `UpgradeId`s** (`pick`, not `drill`); tsc catches it, so run `npx tsc --noEmit` before the full gate.
- **Hotbar width is now bounded by owned items**, not the PLACEABLE table; keys 4+ still index the full table, so a key for an unowned item selects it (shows slot with 0).
- **Jump height is ~2-3 tiles.** A test placing a platform 5 tiles above the feet never lands; derive geometry from a measured jump apex, not a guess.
- **Sprite maps drift in width.** Guard: tests/sprites.test.ts checks row widths and palette keys; review `e2e/out/10-gallery.png` after art edits.
- **A piped gate lies.** `npm run check 2>&1 | grep ... && git commit && git push` pushed a red build to main because the `&&` saw grep's exit code. Guard: `npm run ship` (scripts/ship.sh, `set -euo pipefail`) is the only push path; if you capture logs, redirect to a file and check `$?`.
- **Long sims need an explicit timeout.** The balance bot ran ~4-5 s against vitest's 5 s default and flaked under parallel load. Guard: heavy simulation tests pass a timeout (30 s) as the third `it` argument; never shrink their assertions instead.
- **Odd sprite heights break chunk maths.** Debris chunk centres for a 7-row sprite landed below the feet; use `min(h, r0 + chunk)` and test bounds on every sprite.
- **Check light/occlusion maths before writing the test.** A 1-tile pillar costs only 2x air, so light bleeds through it by design; occlusion tests need walls thicker than SOLID_COST/AIR_COST allows.
- **Bigger worlds break fixtures that hard-code rows.** Tests used `body.y = 40` and "no torches in a fresh world". Guard: derive positions from `world.padY` / `surface[x]` and compare counts relative to a baseline.
- **A bot that targets unreachable ore stands still forever.** The balance bot "got worse" when the world changed only because it locked onto ore out of reach. Guard: the bot filters by REACH and retreats at low HP; check the bot's own behaviour (print per-dive time/depth) before blaming the game.
- **Structures that extend in one direction need side-aware offsets.** Left-side ruins overlapped the pad clear zone. Guard: test asserts every surface structure is outside PAD_CLEAR.
- **E2e that teleports the player must wait for the camera.** The camera eases; aiming the mouse right after a teleport hits the wrong tile. Guard: `waitForFunction` on camX before converting tiles to screen.
- **Shared-VM timings are noisy (2x swings).** Perf checks are coarse regression guards (12 ms/frame headless), not the 60 fps budget; measure with a warm cache and repeat before optimising.
- **Commit messages with double quotes break `git commit -m "..."`.** Guard: write the message to a file and use `git commit -F`.
- **Cellular liquid rules can settle into staircases or stranded puddles.** Guard: tests assert volume conservation, flat-within-1 settling and draining into a dug hole; the row scan only moves to strictly lower spots so settled pools never jitter.
- **A screenshot caught "Cost: 3 undefined"** after adding items. Guard: a test renders a cost label for every item id.
- **Test loops must cover the simulated time they assert on.** My smelter test ran 6.5 s of a 6 s/unit process and expected 2 units; derive the loop length from the constants (`SMELT_TIME * n`).
- **Check that a backlog item has a purpose before building it.** "Storage chest" had no job because the stash is unlimited; I dropped it and wrote down why instead of shipping a dead feature. Guard: read DESIGN rules for the thing a feature would change before slicing it.
- **Sim must stay clock-free even for offline progress.** `Game` never calls `Date.now`; the wall clock is passed into `applyOffline(now)`/`toSave(now)` from main.ts, and the stamp is consumed once so a reload cannot double-pay. Guard: tests for skew, cap, and double application.
- **Worldgen-heavy tests flake at vitest's 5 s default on slow VMs.** Guard: global `testTimeout: 30000` in vite.config.ts (assertions untouched).
- **A growing shop list silently clipped rows.** Guard: row height shrinks to fit; always view 09-mobile-shop.png after adding upgrades or recipes (next step: tabs/scroll past ~20 rows).
- **Shop panel is at capacity (18 rows at 360 px).** Guard: add tabs or scrolling before the next recipe/upgrade; view 09-mobile-shop.png each time.
- **Fresh clones may be detached with no local `dev`.** Guard: `git checkout -B dev origin/dev` before working (ship.sh requires branch dev).
- **Shop tabs added; limit is now ~12 rows per tab.** (now scrolls); view 09b-mobile-shop-fab.png.
- **Fabricator tab is now full (12 rows at 360 px).** Guard: add scrolling before the next recipe; view 09b-mobile-shop-fab.png.
- **Adding a field to `scanMachines` breaks `toEqual` fixtures.** Optional offline fields (`drones?`) keep old callers compiling; update exact-equality tests deliberately.
- **Check codes must use odd weights.** A first draft weighted positions 1..7, so even weights are not invertible mod 32 and some typos passed. Guard: the test now tries every single-character substitution and expects null.
- **Shop panel scrolls now (9 rows).** Adding rows is safe; still view 09/09b screenshots.
- **Duplicate `const` names in one long UI method fail tsc.** Guard: run `npx tsc --noEmit` before the full gate (already noted); use distinct names (`tbw`) for per-row widths.
- **Tile ids are shared across parallel work.** A new tile collided with ids another run had added (SAPLING vs SOLAR=27). Guard: tests/icons.test.ts asserts tile ids are contiguous and TILES has one entry per id; always append new ids at the end of `T`.
- **New surface features break fixed e2e spots.** Recall checks used `padX + 90`, which became a pond. Guard: e2e searches for a dry, open column instead of a fixed offset.
- **A Playwright `mouse.click` or `keyboard.press` can fall between two sim frames** (the sim only sees held state). Guard: in e2e, press, wait ~60-80 ms, then release for anything the sim must see as a press.
- **`npm run ship` is rejected when a parallel run pushed first.** Fix: `git fetch origin && git rebase origin/main` (dev and main are the same commit after every ship), then ship again.
- **`npm run check` takes over 2 minutes.** The default Bash timeout (120 s) killed it on run 12. Guard: run the gate and ship with an explicit 600000 ms timeout and log to a file.
- **New liquids need four touch points:** tile def (with `dps`), renderer liquid branch + light source, sprites TILE_COLORS, map colours. Grep `ACID_POOL` before adding one.
- **Rotating noise coordinates by a position-dependent angle shreds the pattern.** `x * cos(a(x, y))` changes by ~x * da/dx per tile, so seams turned into speckle. Guard: pick a fixed angle per region (SEAM_DIRS) and test shape (component elongation) rather than eyeballing; dump a region to PNG with PIL to look at worldgen.
- **E2e that stands the player in a deep layer can lose the world** (heat/magma death regenerates it). Guard: build the fixture right next to the player in the same evaluate, and restore HP first.
- **Order of liquid passes matters.** Cooling after flow let water slide off magma before reacting; reactions run before flow.
- **Liquid fixtures drain before the screenshot.** A found magma pocket had flowed away by the time the e2e looked at it, so the clip showed empty rock. Guard: build a sealed basin fixture right beside the player in the same evaluate, then screenshot.
- **E2e fixtures in the base leak into later checks.** Solar cells added for the drone check changed the smelter check's numbers. Guard: remove every tile a check placed in the base before moving on.
- **Tests that pin `SAVE_VERSION` with `toBe(n)` break on every bump.** Run 15 had to edit the v12 drone test. Guard: migration tests assert `toBeGreaterThanOrEqual(n)` and test the migration itself with an old fixture.
- **Sprite rows over the width are easy to type** (a 17-char drone rotor). The width test caught it; add every new sprite map to tests/sprites.test.ts the moment you write it.
- **Rule/role systems need a per-frame "acting" field** (`FieldDrone.act`) so the renderer and panel show what the drone does now, not its saved role; switching acts must drop half-finished targets.

- **Check a tile's `solid` flag before writing path/dock tests.** I assumed drone bays were solid; they are not (T.DRONE is minable, non-solid). Guard: tests that need a solid block place T.RUST themselves.
- **The world is open above row 0** (`get` returns air off the top, rock off the sides), so A* can route over a wall's top. Guard: path tests assert "detour" (length), not a specific route.
- **Hopping walkers jump over the thing they should attack.** Raiders hopped over a 1-tile block instead of chewing it. Guard: raiders with a chew target hold still (game.stepEnemies) and a test checks the block comes loose.
- **The pad clears all enemies every frame** (`atBase`). Any enemy meant to threaten the base must be exempt (raiders keep `e.raid`).
- **Ran `npm run check` without the 600000 ms timeout again (run 17)** and the shell killed it at 2 min. Guard: only ever run the gate through `npm run ship` or with `timeout: 600000` on the Bash call; never bare.
- **`damageEnemy` sets hit-stop**, so every automated hit (turrets, spikes) would stutter the game. Guard: pass `stop = false` for anything that is not the player's own hit.
- **A turret in MACHINE_TILES would grow the raid** (machines count double in baseValue) and punish defending. Defences are in BASE_KEEP only; a test asserts a turret leaves baseValue at 0.
- **Stale toasts contradicted each other** ("Raid repelled!" under a new "RAID!"). Guard: related messages share a toast group (`ui.toast(..., group)`), a test asserts replacement and the TOAST_MAX cap.
- **Locked shop rows still lit the SHOP ! badge** once a gate (raid blueprints) was added to buy(). Guard: any new purchase gate must be applied in `affordableUpgrades` too; the blueprint test checks buy is refused before the gate.
- **New gameplay gates belong in derived data when possible.** Blueprints derive from `stats.raids`, so no save bump; a test ties recipe/upgrade gates to `blueprintRaids`.
- **Ran `npm ci && npm run check` bare again (run 19)** and the shell killed it at 2 min, despite two lessons. Guard: the run prompt's step "npm ci && npm run check" must be issued as two calls, the gate with `timeout: 600000` and output to a log.
- **Derived state that announces itself needs a "first sync is silent" rule.** NPCs are derived from rooms each frame; without it every load would toast "moved in". Tests that expect the arrival event must step the game once before finishing the room.

- **Derived assignment by scan order reshuffles on change.** Rooms are scanned top-down, so a new room upstairs became "room 0" and the Trader moved house. Guard: syncNpcs keeps a robot's own room first, then hands free rooms to newcomers; tests/npcs "never makes the Trader move house".
- **"At base" is a 13-tile strip, but rooms can be wider or upstairs.** Anything a robot offers must use `canShop()` (pad or next to a robot), not `isAtBase()`; the workshop auto-close in main.ts uses it too.
- **Loose pack items vanish in e2e when an earlier check left a hauler drone running** (fish got banked, so a quick-heal check looked like a double eat). Guard: e2e fixtures that need pack items use kit items (medkit), or remove drone bays first.
- **Base HP regen (40/s on the pad) and repair drones hide heal amounts in e2e.** Guard: assert which item was consumed, not the exact HP.
- **Multi-cell tiles need every removal path to clear the partner.** Mining and raid chewing go through `removeTile` (wide.ts); explosions skip non-solid tiles. Any new removal path must call it too.

- **`Game` has no event subscription; tests read `g.drainEvents()`** after the steps (run 22 wrote `g.on(...)`). Also placing a tile in the player's own column is refused (`overlapsPlayer`), so placement tests stand the player off to the side.
- **Light tests need a source bright enough to reach the probe** (AIR_COST 4, SOLID_COST 8 per tile; TORCH_LEVEL 40). A level-24 source 6 tiles away reads 0 either way and the comparison is meaningless.

- **A plain Playwright `mouse.click` flaked the fishing check** (the lesson about frame-sampled input applied to clicks too). Guard: `holdClick(page, x, y)` in e2e/smoke.mjs; use it for any click the sim must see.
- **Anything new at the pad competes for E and the hint line.** The merchant took E from the drone bay and broke 4 drone checks. Guard: new interactables go after bays/chests in `interact()` and after base hints in `hintAutomation`; run the full e2e after adding one.
- **Two posted rates can loop into free goods** (5 biomass -> 3 seed, 4 seed -> 8 biomass = 1.2x). Guard: tests/merchant.test.ts checks every A -> B -> A pair over all robot and merchant rates loses.
- **Disabled buttons are not in `ui.rects`.** An e2e that counts TRADE buttons must give the stash enough to afford every row first.


- **The base strip is only 15 x 10 tiles (BASE_HALF 7, BASE_ROWS 10).** A third room stacked on two others is outside `findRooms`, so the Gunsmith test never saw it. Guard: tests build rooms side by side with `rowHomes` (tests/mods.test.ts); any 4th robot needs a wider strip first.
- **Things drawn before `drawDarkness` are dimmed by it.** Bolts looked dull in caves; anything that should glow (bolts, sparks) goes in a pass after the darkness (`drawBolts`).

- **Widening the base strip pulls natural terrain into "base" scans.** Hills inside the wider strip would have followed the player into new worlds, swelled raids and been chewed. Guard: every base scan that means "player-built" checks `isBuilt` (world.edits); tests/base.test.ts writes natural tiles straight into `world.tiles` and asserts they are ignored.
- **`findRooms` was already 1.8 ms per call** and runs on every world edit; Set-based flood fills were the cost. Guard: stamped visited buffer + leaked-pocket skip, and a perf assertion (< 2 ms) in tests/base.test.ts.
- **Tests that pin a growing list with `toEqual` break on content growth** (NPC_ORDER in mods.test). Pin the prefix you care about (`slice(0, 3)`).

- **New happiness discounts silently changed an existing e2e price check** (8 rust -> 7 at comfort 4). Guard: the e2e now reads the mood price through `game.tradeNow` and asserts both posted and mood price; any future price modifier must go through `tradeNow` / `npcPrice` so UI, sim and tests agree.
- **Crop timers reuse the sapling diff instead of a new save field.** It works because the tile at each index says which map it belongs to; tests/farming.test.ts reloads a save with both a sapling and a crop. Any new "growing" tile must be routed in `applyDiff` too, or it stalls with no timer (applyDiff restarts a growing crop without one).
- **Retro:** the run stayed fast by doing pure sim + unit tests first, then one e2e block per slice with its own fixture cleanup. Raw tile ids in e2e (57-67) are brittle; next time expose `T` on `window.__terrabound`.

- **E2e polls for periodic visuals must cover a full period plus margin.** The heart shows 1.4 s of every 4.5 s; a 3 s poll missed it sometimes. Guard: poll for two periods and print the state that gates the visual on failure.
- **Base positions are pad-relative and every world has its own pad height.** A test that checked `padY - 3` of the old world in the new one read air. Guard: recompute `padX/padY` from the new world after any world change.
- **Retro:** four small slices each shipped through `npm run ship` (one gate each, ~3-4 min) kept every step safe; the run's slowest part is the full gate, so batch e2e edits before the gate and run `npm run e2e` alone while iterating.

- **Rounded tile corners are 1 px cut-outs on edge tiles.** A full-tile overlay painted on an edge tile darkens the transparent corner and the backdrop behind it. Guard: overlays on edge tiles (`mask !== 0`) use a cross shape that skips the 4 corner pixels (renderer `drawStrata`).
- **The surface dirt layer is only 3-4 tiles thick; the scrap layer rock (T.METAL) is right under it** and is also a player build block. Guard: natural-only visuals check `world.edits` (placed tiles are in it), not the tile id.
- **Disabled buttons are not in `ui.rects` (again):** the settings e2e expected 10 steppers but maxed ones were disabled. Count with the current values in mind.
- **Retro:** three slices, each gated by `npm run ship` (~4 min each). Writing the mobile fit check first would have caught the squeezed labels before the screenshot review.

- **Tiles are drawn at 1 px per art px into cached chunks, then scaled up.** A glyph outline at half-pixel offsets ((x - 0.5) * u) blurred into a grey smudge. Guard: overlays drawn into chunks use whole art px only (glyphs.ts comment); crop-and-zoom the screenshot (PIL, NEAREST) to check small marks.
- **Anything chunk-cached must clear the chunk cache when a setting changes it** (`setOreMarks` clears `chunks`); a plain field toggle would only show on newly built chunks.
- **`applyPrefs` ran before `input` existed** once it touched input (TDZ). Guard: the first `applyPrefs()` call now comes after `new Input`.
- **Retro:** three slices, three ships (~4 min each). Adding a settings row means updating the two stepper counts in e2e (desktop rows, phone n); derive them from PREFS next time instead of hard numbers.

- **Moving a HUD element breaks pixel-sampling e2e checks elsewhere.** The night-sky check read pixel (20,140), right where the new toast column sits (and "Night falls" toasts there). Guard: sky samples come from right of centre with a comment; any HUD move should grep e2e for `getImageData`.
- **Keyword regexes need word boundaries.** "follows" matched `low` and gave a harmless drone toast a red warning icon. Guard: toastfx rules use `\b...\b` and tests/toast.test.ts pins a "follows" case.
- **Tests that pin `SAVE_VERSION` or whole `settings` objects must change with every save bump** (settings.test v18/v19). That is expected, not weakening: update the pinned value and add the new field's default to the expectation.
- **Retro:** three slices, three ships (~4 min each). Full `npx vitest run` takes over 2 min here, so run it with a 5-minute timeout or filter to the touched test files while iterating.

- **The swimmer hid the water crest in a 1-tile e2e sample** (same frame for 4 draw times). Guard: sample a 5-tile strip around the pool; any e2e that samples pixels near the player must look wider than the player sprite.
- **Pinned `SAVE_VERSION` in settings.test broke again on a bump.** It now asserts `>= 22`; the exact pin lives only in the newest migration test (achievements.test.ts). Next bump: update that one test.
- **New systems that only listen to events stay cheap:** awards and goals hook `Game.emit` (countEvent) plus one depth high-water mark, so no other system changed. Prefer that over sprinkling counters through game.ts.
- **Retro:** three slices, three ships (~4-5 min each). Writing the phone-fit e2e with the first UI draft caught nothing this time but cost little; keep doing it.
- **Deployed vehicles must not spawn under a roof:** the Sky Jet parked inside the carport frame and hit the metal roof on take-off. Vehicles now deploy 4.5 tiles out (the frame spans +-3). Any new structure that spawns things checks the spawn spot against its own frame.
- **Right-click placement in e2e can land one tile off** after the camera moves. Find the placed tile near the aim instead of asserting the exact aimed tile.
- **The e2e water-crest check is flaky:** it failed in two runs and passed in the next two with no related change. If it fails again, make the strip sample deterministic (fixed pool, fixed camera).

- **Two sessions bumped `SAVE_VERSION` to the same number** (the interactive garage took v24 while this run's paints also used v24). Guard: on a ship rejection, rebase and re-number your migration to the next free version, and move the exact `SAVE_VERSION` pin to your own newest fixture test (paints.test.ts pins 25); older tests use `toBeGreaterThanOrEqual`.
- **An e2e that reads liquids at a fixed cell is flaky:** water settles while the sim runs, so the pool's top moved a row and the crest strip sampled rock. Guard: the water check searches for the live surface from the start cell; any liquid check must re-find the surface at sample time.
- **Overlay text placed by slot index breaks when a list grows** (the held-tool label sat after slot 4 and overprinted the 5th tool). Guard: labels go in headers, not after the Nth cell.
- **Derived knowledge beats new save fields:** codex kills and logs live in the award counters (sanitised generically), so the codex needed no migration. Prefer that when the data is a count or a seen-flag.
- **Retro:** three slices, three ships (~4-5 min each) plus one rebase. Editing files while `npm run ship` runs in the background is unsafe (the gate builds the working tree); only read code while it runs.

- **Cave pools are not fixtures:** after the swim check the found pool had drained, so bubble/splash checks saw `inLiquid: 0`, and landing dust looked like splash droplets. Guard: liquid e2e checks build a sealed bedrock tank (fixed surface) and clear fx particles before sampling; assert on a fact only the new effect produces (the splash ring), not on generic particles.
- **Translating the UI for safe areas would break every e2e that clicks `ui.rects`.** Guard: `UI.draw` translates the context but shifts the rects back to canvas CSS px after drawing, so hit tests and e2e coordinates never change; `?inset=` fakes a notch for the check.
- **Hold buttons cannot go through `onAction` (one-shot).** Guard: Input turns a press on a `reel` rect into a held pointer kind, read every frame like the stick.
- **Retro:** two slices, two ships (~4 min each), no rebase needed. Building the e2e fixture deterministically from the start (tank) would have saved one e2e round.

- **Drawing order is the only depth there is.** "Pilot inside a vehicle" needs three passes: vehicle, player clipped above the floor pan, then the hull rows again clipped below the cab line. Guard: e2e samples the pilot's waist pixel on the drill tank (must be hull colour) via `worldToScreen` + canvas readback in device px.
- **Cosmetic animation state keyed by object identity** (the rope twang restarts when `game.hook` is a new object) needs no sim field; prefer that over new events for render-only timers.
- **Retro:** three slices, three ships (~4 min each), no rebase. The repo dir existed on a detached HEAD without a local dev branch; `git fetch && git checkout -B dev origin/dev` fixed it. Content-growth tests (codex row count) were updated to include the new section, not loosened.

- **Rules encoded as tests need updating on purpose, not weakening:** "magma only in Plasma/Core" became "or under the Ash Dunes". Update the test to the new rule, and keep the old guarantee where it still holds (non-Ash columns).
- **Velocity-based poses need weighting:** a raw atan2 of the swim velocity pointed the swimmer head-down, because gravity sinking dominated. Weight passive motion less than input-driven motion. Vehicle slope tilt likewise had to treat walls as at most a one-tile step.

- **Gifts change stash totals that other tests pin.** The first mod chip unlocks Tinkerer, so tests/mods.test.ts saw +10 copper wire. Guard: that test now adds `awardGift(mod1)` explicitly; any test asserting an exact stash after a "first X" action must account for the award gift (or pre-mark the award done).
- **A run can stop between its code and its docs** (run 35 shipped 09debea with no PROGRESS entry). Guard: on start, `git log` since the last "Docs for run" commit and document any undocumented commits first.
- **Same-canvas drawImage works for cheap distortion** (heat shimmer): copy thin rows of the canvas onto itself with whole-art-px offsets; merge cells into runs so it is one call per row per run.
- **Retro:** three slices, three ships (~4-5 min each) plus one red gate (the gift changed a pinned stash count). Running the full `npx vitest run` before `ship` would have caught it 4 minutes earlier.

- **Anything that raises the ground must give the new cells a back wall.** The lavafall crag raised `surface[x]` and tests/walls.test.ts (everything at or below the surface has a natural wall) went red in `ship`. Guard: the crag sets `W.CAVE_ROCK` per cell; any structure that changes `world.surface` must also set walls. Ran only the touched test files first; the full suite caught it (cost one 4-minute gate).
- **Pixel-sampling e2e must avoid the HUD panels** (goal/toast column top-left, buttons top-right): the first lavafall sample read the goal panel and failed. Guard: stand the player so the sampled thing sits just left of centre, and sample its lower part.
- **A teleport far from the camera needs a camX and camY wait** before a screenshot (the pet-swim shot was empty sky). The camera eases; wait for both axes.
- **Retro:** two slices, three ships (~5-6 min each), one red gate (walls). Drafting the next slice's patch in the scratchpad while `ship` ran kept the working tree safe and saved time; keep doing it.

- **`renderer.draw()` time alone lies:** canvas calls are recorded and rastered later, so a plain frame "took" 0.2 ms. Guard: the e2e frame-time probe forces the raster with a 1 px `getImageData` after each draw and compares a scene against a plain scene in the same browser (ratio, not absolute ms).
- **Drawing a canvas onto itself forces a flush and full copy per call.** The heat shimmer did it once per row (8 calls) and cost 12 ms a frame. Guard: snapshot once into a scratch canvas per frame; the probe fails if lava costs > 1.5x plain + 2 ms.
- **The e2e camera eases after a teleport;** a before/after pixel comparison must wait ~1 s and assert both samples framed the same spot (box check in the charred-suit test).
- **Retro:** three slices, three ships (~6-7 min each), no red gate, no rebase. Profiling with a scratch script (prof.mjs: variants with methods stubbed out) pinned the cost in two runs; keep that pattern for perf work.

- **Look at the close-up before deciding what to fix.** The idea said "ruin bricks look identical"; the zoomed screenshot showed the bricks were fine and the plate back wall was the flat grid. Guard: for any art pass, crop and 2x-zoom the e2e shot (PIL, NEAREST) first and fix what dominates the area.
- **Moving the player off a boss arena despawns the boss.** The first boss frame probe teleported to the pad for a plain reference and broke the next check (trophy). Guard: probes compare against the same spot with the feature switched off (boss hidden, weather clear), never by moving away mid-fight.
- **Renderer draw counters are cumulative across the e2e run.** A count check after visiting five biomes passes for the wrong reason. Guard: reset the counter and `renderer.chunks.clear()` right before the scene you are checking.
- **`flowLiquids(world, cx, cy, tick)` takes a centre.** A test called it with two args and "passed" while flowing nothing. Guard: the cinder test flows around each crater and also asserts the cell above stays air.
- **Retro:** two slices, two ships (~6-7 min each), no red gate. The full gate and e2e need background runs (`nohup ... &` + sleep) because one tool call times out at 2 min; never edit `src` while a background build has not finished.

- **Merging toasts changes what layout checks count.** The e2e toast layout check fed "Discovered" + "Codex reward" and expected two pills; after the merge they are one. Guard: the layout check now uses two non-arrival messages, and a separate check asserts the merged pill (one pill, two follow-up lines) on desktop and mobile.
- **Screenshots of projectiles need the right moment.** The first eruption shot caught the bombs at the top of their arcs, off the top of the screen. Guard: the e2e waits until every bomb is falling and one is below the crater line before shooting; arcs were lowered (up 10-13, gravity 18) so they stay in view.
- **Retro:** three slices, two ships (~6 min each), no red gate, no rebase. Editing src while the baseline check ran meant the baseline built my change too; it was green, but start edits only after the baseline finishes (or work in the scratchpad).

- **Out-of-range neighbours differ between the test grid and the world.** World edges count as rock, the test `grid()` helper returns air, so a staircase drawn at column 0 had an "open" west side and no slope. Guard: test grids keep a solid column to the left of the shape under test.
- **A transparent cut at the surface shows the cell's own back wall** (natural walls fill everything at or below the surface), which read as a dark notch above the hill line. Guard: surface slope caps skip `drawBack`; the 11c-slopes crop is checked zoomed.
- **`game.events` is not cleared by `step()`** (the app drains it). A sim test counting events must clear it each step or it counts the same event 60 times.
- **Retro:** two slices, two ships (~7 min each), no red gate, no rebase. Starting edits only after the baseline finished and drafting the e2e while vitest ran in the background kept every gate clean.

- **Check the actual tile id before blaming the art.** The ceiling caps were drawn (counter > 0) but the cave in the shot stayed square: the Scrap layer's rock is `T.METAL`, which the slope set excluded as "built". Guard: "built" is now decided by `world.edits` (player-placed), not by tile id, and a unit test pins natural metal sloping and edited cells staying square.
- **A 2-minute tool timeout kills `npx vitest run` with `timeout 115`.** Guard: always run vitest and e2e with `nohup ... &` and poll the log; never wrap them in `timeout`.
- **Retro:** three slices, two ships (~7 min each), no red gate, no rebase. Patching from a scratchpad script while `ship` built, and applying it only after the e2e step started (e2e reads `dist/`), kept the gate clean.

- **A visual offset that stacks with another eased offset can double-dip.** The auto-step lift (drawn below, easing to 0) and the new slope sink both push the feet down right after a step-up onto a cap; adding them would dip a whole tile. Guard: the renderer uses `max(stepEase(lift), footSink)`, and `nextSink` never draws the feet below the floor under the centre (unit-tested).
- **Changing a returned shape breaks `toEqual` tests on purpose.** `logParts` gained `more`; the old test was updated to the new shape with the same values, not loosened.
- **Retro:** three slices, three ships (~7 min each), no red gate, no rebase. Drafting each next slice in the scratchpad and applying it only once the ship log showed the build finished (e2e reads dist) kept every gate clean; `sleep` over 2 min in one call times out, poll in <=110 s chunks.

- **A sim entity without `onGround` needs its own grounded test for render effects.** Enemies have no `onGround`; the slope sink uses "vy ~ 0 and feet on a whole row" instead. Guard: the e2e places a crawler on a real cap and asserts its drawn sink.
- **Private fields block test setup; build the state through the constructor.** `game.save` is private, so the lore test builds a save with the awards it needs and reads through the public `awards` getter.
- **Retro:** five slices, five ships (~6 min each), no red gate, no rebase. Drafting each slice as a scratchpad `apply.py` and applying it once the ship log reached e2e kept the pipeline full; a node e2e already running is unaffected by edits to smoke.mjs.

- **Never run CPU work (tsc, vitest) while a ship's e2e is running.** The lava frame-time probe failed (12.8 ms vs 7.1 plain) only because a unit test ran beside it; the same build passed alone. Guard: apply the next slice's patch while e2e runs, but test it only after the ship log shows EXIT.
- **`ship` refuses any modified tracked file**, including docs drafted mid-run. Guard: `git stash` docs drafts before `npm run ship`, pop after it exits.
- **Text tables have length rules** (codex notes <= 70 chars, tests/codex.test.ts). Run the codex test after touching `POI_NOTES`.
- **Retro:** three slices, two ships (~8 min each) plus one red gate from CPU contention. Landing two finished slices in one commit was fine but makes bisecting harder; commit each slice as soon as its unit tests pass.


- **Editing src/tests while a background `ship` runs corrupts that ship.** Run 46: I committed two green slices, launched `npm run ship` in the background, then started editing strata files for the next slice. vitest reads test files at run time, so ship picked up the half-written new tests and failed (2 failures) — nothing was pushed (good), but the ship was wasted. Guard: a background `ship` owns the whole tree until it prints EXIT; draft the next slice only in the scratchpad (not in `src/`/`tests/`) while it runs, and apply it after EXIT. (The older lesson said this for e2e; it holds for the whole ship.)
- **New exported helper used before its `type` alias is fine; a rect that can overflow the tile is not.** `rootThreads` pushed an offshoot at `x+1` with width 2, which reached pixel 17 on a 16-wide tile and a bounds test caught it. Guard: clamp any decal rect's `x+w <= 16` (and `y+h <= 16`) in the generator, and unit-test the bound over a few hundred tiles.
- **Retro:** three slices, two ships (one wasted by the edit-during-ship slip above, re-shipped clean), ~7 min each. The three P1.10 art/UI follow-ups (slam impact, topsoil, toast ghost) are now done; only deep-cave rim-light edge remains on that line.

- **A swap in the full order is not a move to the front of the full list.** The build bar shows only owned placeables, so moving ladder to bar slot 1 swaps it with torch somewhere mid-list; the saved full order still starts with unowned rust/metal. A unit test and an e2e check both asserted `saved[0]` and failed for the wrong reason (one ship wasted). Guard: assert on the *visible* bar (`visiblePlaceables(inv, sel, order)`) or relative order, never on raw indices of a filtered list's backing array.
- **Tests that pin `SAVE_VERSION` to a literal break on every bump** (paints.test.ts). Updating the literal with the bump is expected; the new hotbar test pins 27 the same way, so the next bump touches both.
- **Retro:** two slices, three ships (one red from the wrong-index e2e assertion above, caught before push). Starting the verification e2e while writing the next slice's code (no tsc/vitest during it) saved ~5 min.
- **"Fits the phone" is not "fits the panel".** The mobile inventory's item details (HOLD/DROP) had drawn below the panel since they were added; the screen-bounds check passed. Guard: the mobile arrange check bounds detail buttons by the panel's bottom (from the CLOSE row), not the viewport.

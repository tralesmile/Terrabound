# Progress log (newest at the bottom; append, keep short)

## 2026-11-09 Run 0 (interactive setup session)

**Done:** M0 foundation. Deterministic sim (world gen, physics, mining, battery, banking, death, upgrades), versioned never-throw saves, procedural art/FX, synth audio, keyboard/mouse/touch input, HUD/title/shop UI, crash overlay, autosave. Docs: CLAUDE, PLAN, DESIGN, MARKETING, EDGE_CASES, BACKLOG.

**Numbers:** 21 unit tests, 16 e2e checks, bundle 34.96 kB (13.24 kB gzip, budget 500 kB).

**Next:** P1 Combat and survival (see BACKLOG): hotbar, enemies, weapons, hazards, torches, crafting.

**Known issues:** touch-detection edit in `main.ts` not yet covered by a rerun of e2e at the time of writing (rerun `npm run check` first). No real-device testing yet. `gh` auth is broken in this environment, so use plain git push, no PRs.

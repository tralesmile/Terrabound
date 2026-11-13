# Ideas (creative review log; newest first, keep short)

## 2026-11-13 run 45

- Done this run: Junk Colossus art pass (junk fists, arms swing overhead on the slam wind-up, swinging hip plate, breathing chest furnace; 26b-boss-slam), ice fishing (Frozen Spires ponds freeze, fish through a hole for icefin), jump pads (a way up to sky islands, boing plate).
- Weakest graphics: the surface dirt is still a flat orange noise field (20-sky-island, 26-boss); a few buried pebbles, roots and darker bands in the first 6 tiles (carried 1).
- Weakest boss feel: the slam lands with only a shake; a dust ring and debris chunks flying from the fists on impact would sell the hit (Dome Keeper / Core Keeper boss slams).
- Weakest UI: the toast column still covers the top-left quarter when a gate opens (27); fade toasts older than 4 s to a one-line ghost (carried 1).
- Weakest controls: the hotbar order is fixed (PLACEABLE order); let the player drag slots (backlog P1.6 follow-up).

## 2026-11-13 run 44

- Done this run: per-layer cave back walls (dark circuit mesh, plasma basalt, core obsidian; carried 1), enemies follow slope diagonals, desktop hover labels for HUD glyphs, lore logs in story order by depth, red hurt-flash tint (was a flat white silhouette every other frame, 27c).
- Weakest graphics: the surface dirt is a wide flat orange noise field (11f, 26-boss); a few buried pebbles, roots and darker bands in the first 6 tiles would give the cross-section depth (Terraria, Core Keeper).
- Weakest boss art: the Junk Colossus is a brick block with eyes (26-boss); arms that swing on its slam telegraph and loose scrap plates would sell the weight.
- Weakest feel: lit deep caves are still one flat tone near the player; a soft rim light on cave floors in the deep layers would show the walkable edge.
- Weakest UI: the toast column (goal + 2 toasts) still covers the top-left quarter when a gate opens (27); fade toasts older than 4 s to a one-line ghost.

## 2026-11-13 run 43

- Done this run: icon HUD (square glyph buttons two wide with the cog, key hints on desktop, 44 px on touch; carried 1); longer lore logs (2-3 more lines each, carried 8); feet follow the drawn slope diagonals (render-only sink, no more half-tile float).
- Weakest graphics: in the Circuit layer the open cave (rust back wall) reads brighter than the solid blocks (27-deep-layer), because light stops at solids; a per-layer back wall (dark green circuit mesh in Circuit, basalt in Plasma) and a faint top-face highlight on lit floors would fix the inversion.
- Weakest feel: enemies still float over slope caps (only the player sinks); reuse slopeSink for walkers in drawEnemy.
- Weakest UI: desktop has no tooltip for the new glyph buttons; a hover label (hudButtonsShown already has the words) under the button.
- Weakest progression: lore logs are found at random terminals; place them in story order by depth so the arc reads in sequence.

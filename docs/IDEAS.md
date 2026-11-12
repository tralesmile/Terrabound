# Ideas (creative review log; newest first, keep short)

## 2026-11-12 run 15

- Done this run: boss pixel-art rigs (all six), drone sprites per job, drone rules panel, repair drone.
- Weakest graphics now: vehicles (hoverbike, Sky Jet) are rectangles; reuse bossart's `partPixels` for a hull + canopy rig (cheap, same cache).
- Weakest feel: boss telegraph flashes the whole body white at 12 Hz; a ground shadow that grows under a slam and a charge dust trail read better (Dome Keeper style) and are kinder to the eyes.
- Weakest UI: panels let toasts bleed through; draw toasts after panels or pause them while a panel is open.
- Weakest progression: drone rules unlock at once; gate rule slots 2 and 3 behind the Fabricator level so automation grows with the base.

## 2026-11-12 run 14

- Done this run: animated magma (bubbles, crest, embers, haze); field drones with roles.
- Weakest gameplay feel: drones phase through rock; a short A* over air tiles (bounded to 300 nodes) would make them read as real machines.
- Weakest UI: no panel shows what your drones are doing; a small drone strip under the HUD (role icon, cargo dots) like Core Keeper's minion bar.
- Weakest graphics: drones, bosses and vehicles are still rectangles; a sprite-map pass for the drone hull (3 role variants) is cheap and high value.
- Weakest controls (still open): touch jump is a drag; add a jump button on the right thumb.
- Older, still open: context hints instead of the 40 s control line (near chest "E open"); basalt bricks as a deep building set.

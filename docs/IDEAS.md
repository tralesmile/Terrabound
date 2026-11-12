# Ideas (creative review log; newest first, keep short)

## 2026-11-12 run 16

- Done this run: vehicle sprites (hoverbike, Sky Jet), drone pathing, night raids slice 1.
- Weakest gameplay feel now: raids are "kill what walks in"; turrets and traps (backlog) make the base a tower-defence puzzle like Dome Keeper's waves, the genre's best loop.
- Weakest graphics: raiders reuse cave enemy sprites; a red-armoured raider variant via the sprite remap is cheap and makes the wave read instantly.
- Weakest UI: no warning before the wave; a 20 s "raid incoming" banner plus an edge arrow on the side they come from (Terraria's event bar) gives time to prepare.
- Weakest progression: raid rewards are flat materials; a raid-only blueprint every 3 nights (turret Mk II, shield wall) gives a reason to keep raids on.

## 2026-11-12 run 15

- Done this run: boss pixel-art rigs (all six), drone sprites per job, drone rules panel, repair drone.
- Weakest graphics now: vehicles (hoverbike, Sky Jet) are rectangles; reuse bossart's `partPixels` for a hull + canopy rig (cheap, same cache).
- Weakest feel: boss telegraph flashes the whole body white at 12 Hz; a ground shadow that grows under a slam and a charge dust trail read better (Dome Keeper style) and are kinder to the eyes.
- Weakest UI: panels let toasts bleed through; draw toasts after panels or pause them while a panel is open.
- Weakest progression: drone rules unlock at once; gate rule slots 2 and 3 behind the Fabricator level so automation grows with the base.

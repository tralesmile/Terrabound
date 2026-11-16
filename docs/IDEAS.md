# Ideas (creative review log; newest first, keep short)

## 2026-11-16 run 65

- Done this run: topsoil roots are continuous lines down a column of tiles (thick lit top, side fibres, forked tips) instead of per-tile scratches (02-digging); a loaded Cargo Lifter's crates rattle when flying fast (22n).
- Weakest graphics (vehicles): the flyers are drawn at 1x while ground vehicles get VEHICLE_ART_SCALE, so the Lifter's crates are barely visible; draw flyers at the same art scale (check the take-off and apron e2e geometry).
- Weakest progression: every weapon of a kind is identical; P3 rarity tiers (common/rare/epic colour rims) with one rolled modifier would give chest and boss loot a second reason to exist (Terraria prefixes, Core Keeper rarities).
- Weakest gameplay feel (digging): breaking a block gives the same crumble for every tile; per-material break debris (sparks for metal, shards for crystal, clods for dirt) is cheap and felt on every click.
- Weakest UI (phones): the underground below the lit pad is near black in 06-mobile-play; a faint ambient fill for the first rows below the surface would show the dig target before the player lights it.

## 2026-11-16 run 63

- Done this run: tree canopies are lobed leaf clumps (2-3 round puffs per tile, lit upper-left, shaded underside, a darker band under the crown) instead of 20% speckle; frost crowns get a real snow cap with drips and snow flecks on each lobe while the inside stays green (11-biome-frost); 4 leaf variants instead of 2.
- Done too: Cargo Lifter, a heavy plane with a +30 hold and crates you can see filling the hull (22l); a haul trip now has a vehicle built for it (Dome Keeper's carry-home loop, Starbound ship cargo).
- Weakest gameplay feel (vehicles): flyers still park outside the carport, so the bay never charges a plane; an open-roof hangar variant (carried from run 61).
- Checked, dropped: the phone camera bias. In 06-mobile-play the player already sits mid-screen, the HUD fills the top third and the lower third is unlit rock, so pushing the view down shows more darkness, not more game.
- Done too: the creatures codex footer reads "Trinkets n/6", a visible collection goal for boss refights.
- Weakest graphics (next): tree trunks are a flat 6 px column with no roots or branches; flare the base into 2-3 root pixels and let a branch stub poke out under each crown.

## 2026-11-16 run 62

- Done this run: every boss has a boss-only accessory (scrap core, bloom seed, prism eye, ember wing, frost heart, null core); a kill rolls a bonus (50% trinket on the first kill, sure on a repeat, then 35% for a new craftable), marked by a loot beam in the trinket's colour with a bobbing gem (26l), a "Boss drop" toast and a longer sparkle (Terraria boss drops / Diablo loot beams). Gear can now carry leech.
- Done too: the TRIP BANKED card fades once you are 20+ tiles from the pad.
- Weakest graphics (trees): snowy canopies in 11-biome-frost are speckle noise with no crown shape; give canopies a 2-3 tone lobed silhouette with a lit top edge and a dark underside (Terraria/Core Keeper trees read at a glance).
- Weakest UI (phones, 06-mobile-play): at the pad the portrait view is 55% sky; bias the camera so the player sits ~35% from the top on tall screens, since the game is underground.
- Weakest progression: boss trinkets are only found by refighting; a codex "Trinkets 2/6" line on each boss card would give a visible collection goal.

## 2026-11-16 run 61

- Done this run: field garages show on the map as green bolt pins (plan deep trips around charge points; finished run 60's drafted slice); the magnet ring / scout bot draw faint tethers with beads sliding into the suit from every drop they reel in, so the accessory reads in play (47d-magnet-pull).
- Weakest graphics (underground): buried skulls and bones in 02-digging are flat white sprites at full brightness; tint them by depth/ambient so fossils sit in the dirt instead of on top of it.
- Done too: ground vehicles deploy under the carport and hang on a dock cable; the bay charges you while seated.
- Weakest gameplay feel (vehicles): the Sky Jet must still park outside; an open-roof "hangar" variant of the garage would let flyers dock too.
- Weakest progression (loot): carried, boss bonus accessory roll with boss-only trinkets (Terraria boss drops).
- Weakest UI: the TRIP BANKED card can still be on screen after you leave the pad and reach a new biome (11-biome-jungle); hide it once the player is more than ~20 tiles from the pad.

## 2026-11-16 run 59

- Done this run: a field garage is a charging bay (battery fills at 30/s under its roof, crackling green arc from the bay light to the suit, "+" motes, steady green lamp when full, CHARGING % replaces the "return to the pad" nag) so a garage becomes a Dome Keeper-style forward outpost (21c-bay-charge); the phone inventory shows the accessory socket row (51e).
- Weakest progression (outposts): the map does not mark field garages; a green bolt pin would let players plan deep trips around their charge points.
- Weakest gameplay feel (vehicles): the parked buggy sits just outside the carport; parking under the roof (deploy into the bay) would make the bay read as a garage and charge you while seated.
- Checked, stale: lava scene cost (9.1 vs 8.7 ms plain); the old 11 ms note is gone after the shimmer/memo fixes.
- Weakest progression (loot): accessories still only come from chests and the workshop; a boss bonus roll with boss-only trinkets (carried).

## 2026-11-16 run 58

- Done this run: 3 accessory sockets with 7 craftable trinkets (magnet ring, vital heart, lamp shard, power coil, grip gloves, aegis charm, feather charm); a WORN / ACCESSORIES socket row fills the dead space under the character in the inventory (18c); worn trinkets glint as gems on the belt.
- Done too: accessories turn up in world chests (10% shallow to 30% deep, always a new one), so opening chests has a jackpot (Terraria accessory hunting). Next: a boss bonus roll and boss-only accessories.
- Weakest UI (phones): the narrow inventory has no socket row; fold the 6 upgrade-level lines into one compact strip to make room.
- Done too: mid-air jumps had no effect at all; now a kick ring in the gear's colour, a down-puff and (feather charm) green wisps, plus a lighter chirp (47c).
- Weakest graphics (character): accessories show only as 1 px belt gems; a magnet ring could draw faint pull lines to loot it is reeling in.

## 2026-11-16 run 57

- Done this run: banking shows a TRIP BANKED card above the bar with the trip's highlights (13d); beam-home arrival has its own shimmer + thud; zap crests tink on insulator pads; arena floor scan cached.
- Checked, not a bug: the clipped toast in 13c is the 0.18 s slide-in caught mid-frame (drop the run 56 "toasts clip" note).
- Weakest progression: gear is still stats-only; P3 equipment slots (helmet/core/boots/module) with visible suit parts on the player would give loot a reason to exist (Terraria/Core Keeper armor sets).
- Weakest retention: the dive and trip tallies vanish on reload; persist them in the save (small, needs SAVE_VERSION bump + fixture).
- Weakest feel at the pad: banked items vanish from the pack instantly; let the pack icons fly from the bag slot into the stash crate on the card (reuse Flyers).

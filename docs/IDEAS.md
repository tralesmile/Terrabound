# Ideas (creative review log; newest first, keep short)

## 2026-11-17 run 74

- Done: NEW dot on the bag for unseen gear (Terraria/Core Keeper highlight new items).
- Weakest UI: no per-item NEW marker inside the inventory grid (next step after the bag dot).
- Weakest progression: trophy weapons have no set (sets are armor-only; design trophy bonuses).

## 2026-11-17 run 73

- Done: Circuit Core set pays off the Warden/Circuit materials (Terraria-style themed set).
- Weakest progression: trophy weapons have no set; weakest UI: no NEW dot for found weapons (carried).

## 2026-11-17 run 72

- Done this run: boss telegraphs are rising tones (pitch climbs to the hit, grid sweeps widest) so a hop can be timed by ear; the Warden arena floor glows with the circuit trace like the Hollow AI's.
- Weakest graphics (ground): strata bands ignore dug-out tops (carried).
- Weakest progression: a Circuit armour set to pay off the Warden's materials (carried).
- Weakest UI: no NEW dot for found weapons on the inventory button (carried).

## 2026-11-16 run 71

- Done this run: Warden phase 2 tripwire (26h2): phase 2 now asks for lane choice AND a timed hop, like Dome Keeper/Gungeon layered patterns.
- Weakest gameplay feel (bosses): attacks are readable but silent; give each telegraph a rising tone so the hop can be timed by ear (mobile players watch their thumbs).
- Weakest graphics (ground): strata bands still ignore dug-out tops (carried).

## 2026-11-16 run 70

- Done this run: Boss 2 Logic Warden with a laser-grid attack (26f/26g/26h): a read-the-floor dodge like Dome Keeper/Enter the Gungeon patterns; every other boss attack was a jump or a strafe, the grid asks you to pick a lane.
- Checked, dropped: the "melee hit-stop" idea from run 69 already exists (`HITSTOP` 40 ms on enemy and boss hits); read the code before carrying an idea.
- Weakest graphics (ground): strata bands follow the generated surface, so a flattened or dug area shows hard-edged band rectangles (26-boss); key the band depth on the current top solid tile, cached per column.
- Weakest progression: the Circuit layer has a boss but no set; a Circuit set (helm + suit from gold circuits) would pay off the Warden's materials.
- Weakest UI: the boss bar is the same orange for every boss; tint it with the boss accent (green Warden, pink Hollow AI).

## 2026-11-16 run 69

- Done this run: the swing is a filled crescent smear from the shoulder over the whole sweep, thick at the blade (05c; Terraria/Core Keeper slashes read as one arc, ours was a dash floating ahead); a full armour set breathes an aura in the set colour with rising motes (18e).
- Weakest UI (fixed this run): a block tooltip showed through the gaps between hotbar cells (18d, 18e); world tips now stay off the bar strip.
- Weakest gameplay feel (combat): the swing has no hit-stop; a 40 ms freeze on a melee hit (Hollow Knight, Dead Cells) would make blows land.
- Weakest progression: Boss 2 Logic Warden is still the first big open gameplay item; the Circuit layer has no boss of its own.
- Weakest performance: e2e ~5 min; split long boss checks into a second file to run in parallel (carried).

## 2026-11-16 run 68

- Done this run: the hand shows the equipped weapon in its colours with a rarity rim (05d; Terraria shows the held item, Core Keeper the rarity glow); armour sets with 2/3-piece bonuses (Terraria set bonuses give a reason to collect a theme).
- Weakest graphics (character): a full set looks like any other loadout; a faint set-colour aura or visor tint when a set is complete.
- Weakest gameplay feel (combat): the swing arc is still short and sits ahead of the hand (carried from run 67).
- Weakest UI: a found weapon has no NEW marker on the inventory button (carried).
- Weakest performance: the bundle is 498 kB raw (174 kB gzip, budget 500 kB gzip), fine, but the e2e suite takes ~5 minutes; split the long boss checks into a second file that can run in parallel.

## 2026-11-16 run 67

- Done this run: chests and boss refights drop weapons already rolled (Terraria/Diablo: an epic drop is a moment, refights now have a jackpot that ends at epic); the melee swing trail is drawn in the weapon's own colours with a rarity glow and sparkles (05c), so a good roll shows on every swing.
- Weakest graphics (character): the held blade sprite in 05-blade is the same cyan for every weapon; draw the held tool in the equipped weapon's colour (plasma axe orange, arc spear violet).
- Weakest gameplay feel (combat): the swing arc sits far in front of the suit and is short (0.6 rad); a wider arc that starts at the hand would read as a real slash (Core Keeper).
- Weakest progression: armour pieces are independent; 2-3 piece set bonuses give a reason to collect a theme.
- Weakest UI: a found weapon is not equipped and the toast is the only hint; a small "NEW" dot on the inventory button until the gear tab is opened.

## 2026-11-16 run 66

- Done this run: weapon rarity prefixes with a Workshop REFORGE (Terraria goblin tinkerer; odds printed, no money) and rarity rims on weapon cells (08c); per-material break debris (clods, sparks, shards, splinters, leaves) felt on every dig (02b).
- Weakest progression (loot): prefixes only come from reforging; let chest weapons and boss refights drop a weapon already rolled (an epic drop is a moment).
- Weakest graphics (character): the held weapon looks the same at every rarity; a faint glow or 1 px edge in the rarity colour on the drawn blade/gun.
- Weakest gameplay feel (digging): harder tiles crack the same way; crack stages could tint by material (metal scratches, crystal fractures).
- Weakest UI: the common rarity grey reads like a disabled row; use near-white with a thin grey rim instead.

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

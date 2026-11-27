# Research log (what players love and complain about; keep short, newest first)

Rules: one dated entry per run, 3-6 lines, paraphrased (no long quotes), with the source URL. Merge or drop entries that were acted on or are weak. Anything worth building goes to `docs/BACKLOG.md` section P12-H (or straight into P12-A..G) and a one-line note in `docs/IDEAS.md`. Every idea must pass the Core idea guard in `CLAUDE.md`.

## 2026-11-20 (run 83, topic 3: recent reviews and complaints)

- Core Keeper (93% positive, ~65k reviews): the review-analysis site ranks "no tutorial" as the single biggest refund-risk complaint, and only 64% of first-2-hour reviews are positive versus 89-94% later. Sources: https://vaporlens.app/app/1621690/core_keeper/stats/analysis and https://vaporlens.app/app/1621690/core_keeper/stats/details
- Dome Keeper (92%, the closest loop to ours): players love the dig-then-defend rhythm; the common complaint is repetition and thin long-term content (few unlocks, two keepers, little customisation). Sources: https://vaporlens.app/app/1637320/dome_keeper and https://shacknews.com/article/132448/dome-keeper-review
- Necesse (93%): its biggest 2026 update reworked tutorial and onboarding alongside new content, a sign that onboarding is still where these games lose players. Source: https://www.gamespress.com/Announcement-Sandbox-Survival-Gem-Necesse-show-players-love-with-the-l
- Filter: all three point at the first hour. Teaching enemies in a safe first encounter (shipped this run) and an objective tracker (P12-E) fit the loop; for Dome Keeper's repetition complaint, cosmetic suit unlocks and run mutators (P12-G) fit too.

## 2026-11-18 (interactive session, seed entry)

**Survival-crafting player complaints (topic 3)**
- Terraria: grind and low drop rates are the most common complaint; class variety (melee, ranged, mage, summoner) is the most praised. Source: https://vaporlens.app/app/105600/terraria
- Core Keeper: praised for atmosphere, boss fights and exploration; criticised for difficulty imbalance and thin weapon and armour variety. Source: https://vaporlens.app/app/1621690/core_keeper/stats/analysis
- Starbound: praised for worldbuilding, criticised for a weak first-player experience and for planets that differ only by palette. Sources: https://www.trueachievements.com/game/Starbound/reviews and https://community.playstarbound.com/threads/thoughts-on-how-to-better-starbound.140831/
- Core Keeper's 2026 "Void & Voltage" update added automation, new biomes, a giant boss and mod support, so automation is no longer unique to us. Source: https://www.gamespark.jp/article/img/2024/09/08/144871/911755.html (and the linked update articles)

**Game feel (topic 0)**
- A hit feels heavy when hit-stop freezes both attacker and target; knockback should move fast in the first 100 ms then settle; stack hit-stop, flash, shake, particles, sound layers and anticipation. Source: https://freegamesprites.com/ar/news/game-feel-2d-combat-juice-tricks
- Short audio dip before a boss attack builds tension; vary SFX pitch so repeats do not sound robotic. Sources: https://gamedo-live.pages.dev/news/game-feel-juice-guide-indie-devs and https://exekite-web.pages.dev/blog/seven-invisible-details-addictive-games
- Effects that stack (trauma shake, hit-stop, squash) break each other unless they are designed together. Source: https://forum.godotengine.org/t/game-feel-effects-that-stack-without-fighting-your-code-trauma-shake-real-time-hit-stop-and-apply-the-difference/146379

**Design lessons from adjacent games (topic 2 and 6)**
- Dome Keeper: a few simple systems that feed into one another beat a pile of separate features; easy to pick up. Source: https://www.gamedeveloper.com/road-to-igf-2023/how-dome-keeper-focuses-on-systems-that-feed-into-one-another
- Noita: depth and experimentation are loved, but cryptic secrets and chaotic physics that only hurt the player are not. Keep physics fun and readable. Source: https://www.virtualcuriosities.com/?p=5607

**Mobile retention and ethics (topic 4)**
- Average mobile retention is about 29 percent on day 1, 8.7 percent on day 7 and 3.2 percent on day 30; D30 killers are progression walls and content droughts. Sources: https://www.globalgamesforum.com/ctv/mobile-gamings-spend-to-grow-model-is-evolving and https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-retention-strategies-2026/
- Rewarded ads remain a stable opt-in channel; trust and transparent monetization are now a competitive advantage; store commission is 15 percent for small developers. Sources: https://studiokrew.com/blog/?p=1608 and https://nbot.ai/curator/impsyolv/highlights/5ac5c51b-94d7-406d-b519-1e2d361ac39e
- Social and community features and live events are what developers say help retention most (74 percent and 71 percent). Source: https://zbdpay.com/blog/mobile-game-retention-in-2026-4-key-insights-from-developers

**Code-drawn art and lighting (topic 1, run 81)**
- Search results were mostly engine docs; useful takeaways: cheap 2D lighting is a dark overlay with additive light sprites (radial gradients) per torch, and dithered falloff reads as retro and hides banding. Sources: https://slembcke.github.io/2D-Lighting-Overview and https://alexjgriffith.itch.io/until-the-morning-breaks/devlog/213702/a-simple-retro-lighting-system and https://www.gamedeveloper.com/design/art-design-deep-dive-dynamic-2d-lighting-in-dwerve
- Filter: Terrabound already has per-layer ambient and AO; coloured torch light pools with dithered falloff would deepen the dive mood at low cost (P12-F).

**Enemy, boss and weapon design (topic 2, run 82)**
- Searches returned mostly generic boss-design blogs: a good boss teaches its own pattern in a safe first use, and weapon variety matters only when each weapon changes how you play (not just numbers). Sources: https://bugnet.io/blog/how-to-design-a-boss-that-teaches-its-own-pattern and https://bugnet.io/blog/how-to-design-weapon-variety-that-matters
- Filter: both fit the roster and weapon-class items in P12-B; one-liner added there.

**Not yet researched (next runs, in rotation order):** mobile retention and onboarding (4, run 84), story in sandbox games (5), automation and defence (6), web performance and accessibility (7).

**Retention check (topic 4, run 84)**
- 2026 roundups repeat the same levers: a fast first session that teaches by playing, a clear next goal at every point, and no progression walls or content droughts around day 7 to 30. Sources: https://appfollow.io/blog/mobile-game-retention and https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-retention-strategies-2026/
- Filter: already covered by the goal-card chain and the P12-G items; no new item. Deep roofs that shake loose add a readable danger to the dive with no wall.

**Story delivery (topic 5, run 85)**
- Search returned mostly roundups; the recurring point is that roguelikes and sandboxes land best with hands-off lore: story told through places, found logs and NPC lines the player can ignore, never a gate on play. Sources: https://www.killscreen.com/irresistible-appeal-roguelike-storytelling/ and https://www.gamesradar.com/games/roguelike/
- Filter: fits P12-E as optional found logs and ruins; no new item beyond that.

**Web performance, input and platform rules (topic 7, run 87)**
- Portals (CrazyGames, Poki) judge on time to first frame, small initial download and stable mobile frame rate; CrazyGames has a dedicated "getting to the first frame" guide. Accessibility roundups: reduced-motion support, colour-independent cues, remappable and touch-friendly controls. Sources: https://docs.crazygames.com/requirements/technical/ and https://docs.crazygames.com/resources/getting-to-the-first-frame/ and https://poki.com/blog/building-web-browser-games-2026 and https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms
- Filter: our budgets (500 KB gzip, 2 s first interactive) already match; reduced motion already caps shake. No new item; colour-independent cues are covered by P12-F UI polish.

## 2026-11-24 run 88 (topic 0, game feel)
Search returned only generic juice roundups (dvdfu "practical juicing", Amazon GameMaker "juicing your movements"); both agree a distinct wall-cling pose plus particles sells the slide. Applied: wall-slide now uses the cling frame. No new backlog items.

## 2026-11-24 run 89 (topic 1, pixel art and lighting)
Search gave normal-map pixel-art lighting writeups (Sandfox devlog, DynaPix paper, itch devlogs). Needs authored normal maps, so not worth it for our code-drawn art; our dithered coloured light pools already cover the mood. No new backlog items. Sources: https://gamedeveloper.com/art/adding-depth-to-2d-with-hand-drawn-normal-maps-in-i-the-siege-and-the-sandfox-i- and https://pixel-beef.itch.io/xdasher/devlog/192949/4-things-we-did-to-add-light-and-depth-to-our-pixel-art-game

## 2026-11-24 run 90 (topic 2, enemy and boss design)
Generic boss-design roundups agree on readable telegraphs and learnable phases; already our rule. No new items. Source: https://molbv.github.io/blog/2025-07-08-boss-phases.html

## 2026-11-24 run 91 (topic 3, Steam reviews)
Searches for Core Keeper, Necesse and Dome Keeper reviews returned only store pages and aggregators with no readable complaints; no new items. Sources: https://steambase.io/games/core-keeper/reviews , https://vaporlens.app/app/1169040/necesse

## 2026-11-24 run 92 (topic 4, retention and monetization)
Only generic 2026 monetization roundups (adapty, appfollow); all favour opt-in rewarded ads and cosmetic IAP, which matches our rules. No new items. Source: https://adapty.io/blog/mobile-game-monetization/

## 2026-11-25 run 93 (topic 5, story and lore)
Searches returned generic roguelike storytelling and environmental-storytelling roundups (Kill Screen, Game Developer 'weaving narratives into procedural worlds'); all favour breadcrumb lore found in the world over exposition, which matches our logs and ruins. Applied: wrote docs/STORY.md with the two-line rule. No new items. Source: https://gamedeveloper.com/design/weaving-narratives-into-procedural-worlds

## 2026-11-25 run 94 (topic 6, automation and defence)
Only Dome Keeper review aggregators came back, no readable detail; no new items. Source: https://vaporlens.app/app/1637320/dome_keeper

## 2026-11-25 run 95 (topic 7)
Searched touch-control and web-game accessibility guides (accessiblegames.com Tags and Criteria 2025, simplified.media touch controls guide). Generic: remappable controls, reduced motion, large targets; all already covered by our settings. No new backlog items.

## 2026-11-25 run 96 (topic 0, game feel)
Platformer game-feel roundups (anchitsh.github.io/platformer.html, Celeste dev notes on GameSpot) list coyote time, jump buffer, hit-stop, camera lead: all already in movement.ts, hitfeel.ts and camlead.ts. No new items.

## 2026-11-25 run 97 (topic 1, code-drawn lighting)
Search returned generic tile-lighting tutorials (flood-fill light, emissive tiles, simple retro lighting: https://alexjgriffith.itch.io/until-the-morning-breaks/devlog/213702/a-simple-retro-lighting-system, https://slembcke.github.io/2D-Lighting-Overview). Our flood-fill lightmap already matches; adopted only the emissive-tile idea (charges and plates glow in dark caves).

## 2026-11-26 run 98 (topic 2, enemy and weapon design)
Re-Logic's April 2026 plan targets aggro, invisible hitboxes, weapon ranges, boss attacks and enemies shooting from off-screen, plus evening out the four weapon classes. Our regular enemies are contact-only, so the survivor is a boss hitbox vs telegraph audit (added to P12-H). Traversal searches (zipline, return trips) found nothing readable. Source: https://www.pcgamesn.com/terraria/state-of-the-game-april-2026-combat-fixes

## 2026-11-26 run 99 (topic 3, player reviews)
Third-party AI summaries of Steam reviews (not raw reviews). Terraria: confusing start, little in-game guidance, grind. Dome Keeper: repetition, thin progression, slow mining. Necesse: weak story and progression, bosses, controller support. Survivors: quest log with material sources (P12-H); gamepad stays on P12-A. Done now: first-minute controls as readable keycaps. Sources: https://vaporlens.app/app/105600/terraria https://vaporlens.app/app/1637320/dome_keeper https://vaporlens.app/app/1169040/necesse

## 2026-11-26 run 100 (topic 4, retention and onboarding)
Apple's game onboarding page: get into play fast, teach one step at a time with short goals, keep a rereadable reference, hold back non-essential asks. Meta's (VR-focused) guide adds visible growth before the tutorial ends. Crafting games' forums keep asking for pinned recipes on the HUD (Icarus, Planet Crafter, Enshrouded has it). Done now: TRACK pin with material sources. Sources: https://developer.apple.com/app-store/onboarding-for-games/ https://developers.meta.com/horizon/blog/growth-insights-series-best-practices-user-onboarding-recall-progression/ https://icarus.featureupvote.com/suggestions/255040/suggestion-ingame-todo-list-and-recipe-pin https://allthings.how/enshrouded-how-to-pin-a-crafting-recipe/

## 2026-11-26 run 101 (topic 5, story and quests)
Hades coverage (Kasavin interview, GDC podcast): story advances on every return, failure included, through short reactive lines. PC Gamer on Elden Ring: a marker helps players find who has something, but must not replace the writing. Done now: "!" on ready robots and lines that remember finished quests. Added: reactive dive barks (P12-H). Sources: https://gdconf.com/news/roguelikes-and-narrative-design-hades-creative-director-greg-kasavin-gdc-podcast-ep-16 https://www.screenhub.com.au/?p=1429512 https://www.pcgamer.com/uk/elden-rings-npc-quest-markers-are-just-a-band-aid/

## 2026-11-26 run 102 (platform rules, topic 7; rotation said 6)
Rotation 102 mod 8 = 6 (automation and defence) had two near-empty rounds before (run 94), so the searches went to platform rules (topic 7). CrazyGames: initial download 20 MB for mobile homepage, relative paths, no touch sniffing, user-select none, and iOS audio can sit in an "interrupted" state that only a gesture resume wakes. Poki: portrait must work, keep overlays clear of notches. We meet size, paths and portrait; fixed the interrupted-audio case. Topic 6 is still owed (do it next run). Sources: https://docs.crazygames.com/requirements/technical/ https://poki.com/blog/building-web-browser-games-2026 https://bugs.webkit.org/show_bug.cgi?id=263627

## 2026-11-27 run 103 (topic 6, automation and defence; owed from run 102)
Dome Keeper's director: keep each mechanic simple and let them feed each other; combat works as a clock on mining; every monster should demand a different response; upgrades should be felt at once. Terraria and tower-defence searches returned nothing usable. Done now: four enemies with four different counters, and the borer makes built walls a real defence (build feeds survive). Added to P12-H: show built-wall defence in a base tip. Source: https://www.gamedeveloper.com/road-to-igf-2023/how-dome-keeper-focuses-on-systems-that-feed-into-one-another

## 2026-11-27 run 104 (topic 0, game feel)
Thorson's "Celeste and Forgiveness" lists small hidden helps: coyote time and jump buffer (we have both) and corner correction, which slides you round a ledge you barely clip. Godot community checklists repeat hit-stop and trauma shake (already ours). A 2D aim-assist devlog favours gentle assist that leaves the player in charge. Done now: corner correction, a drop-in assist for one-wide shafts, and pistol lock-on only when the tap or aim is already close. Added to P12-H: ledge pop-up when a jump falls just short. Sources: https://maddymakesgames.com/articles/celeste_and_forgiveness/ https://forum.godotengine.org/t/game-feel-checklist-for-godot-4-hit-stop-trauma-shake-coyote-time-and-more/145340 https://chuteapps.itch.io/rogue-star-rescue/devlog/68507/effective-aim-assist-in-2d-shooters


## 2026-11-27 run 105 (topic 1, code-drawn art and lighting)
A 2026 article on 2D lighting advises keeping ambient as a tint, adding a tight rim to silhouettes scaled by how much the player must read it, and not relying on red/green rims alone. A 2D water write-up pre-draws frames and cycles them about every 0.15 s, which suits our canvas chunks. Searches on Core Keeper darkness gave only forum titles. Done now: lamp-side creature rim, softer for harmless critters. Added: animated liquid surfaces first (P12-H). Sources: https://gamineai.com/blog/lighting-2d-action-game-silhouettes-rim-ambient-shader-basics-2026 https://injuly.in/blog/water-shader/index.html

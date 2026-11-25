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

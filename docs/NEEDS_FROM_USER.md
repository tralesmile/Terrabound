# Needs from the owner (only real blockers; remove when resolved)

Ask Claude "what do you need from me?" to get this list. Runs never wait on these; they build around them.

## Now

1. **Enable GitHub Pages:** repo Settings > Pages > Source: "GitHub Actions". Then the web build deploys from `main` automatically.
2. **Final game name and domain** (optional): current working name is Terrabound. Check trademark and domain before launch.

## Later (before store release)

3. itch.io account (free) for the web build page.
4. Poki / CrazyGames developer accounts (free) once the web build is polished.
5. Google Play developer account (one-time 25 USD) and Apple Developer account (99 USD per year, only when ready for iOS).
6. Payout and tax details in your country for ad networks and stores.
7. AdMob app and ad-unit IDs (free) when the Android build is ready.
8. A contact email to put in the privacy policy.
9. Android upload keystore: generate on your machine and keep it safe. Never commit it. Claude will provide the exact commands.
10. Real-device testing on one Android phone and one iPhone (even 10 minutes helps).

## Defaults the runs assume (tell Claude to change)

- Runs fast-forward `main` whenever `npm run check` is green.
- The 2-hour schedule is paused since 2026-11-10 (owner asked to build without it). Ask Claude to re-enable it.
- No paid services at all until you approve them here.

## Decision wanted (runs continue with the default meanwhile)

- **World per dive or persistent world?** The world is now big (1400x420, five biomes, ruins, vaults, chests, map). Today every dive generates a fresh world, so the map and chests reset (the codex and base persist). Option A (default): keep fresh worlds per dive, roguelite style. Option B: keep one world until you die (Terraria-like; dug tunnels, opened chests and the map stay), which needs a compact save of world changes.

## Optional decision

- **Art source:** runs draw all art in code (free, tiny). If you want a faster jump in quality, you can approve free CC0 pixel-art packs (no cost, no attribution required) or supply your own art. Default until you say otherwise: code-drawn art following `docs/ART.md`.

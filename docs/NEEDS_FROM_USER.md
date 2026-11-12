# Needs from the owner (only real blockers; remove when resolved)

Ask Claude "what do you need from me?" to get this list. Runs never wait on these; they build around them.

## Now

1. **Enable GitHub Pages:** repo Settings > Pages > Source: "GitHub Actions". Then the web build deploys from `main` automatically.
2. **Final game name and domain** (optional): current working name is Terrabound. Check trademark and domain before launch.
3. **Online leaderboard hosting (optional):** local world records ship now. For a shared daily leaderboard, pick one free tier (e.g. Supabase or a Cloudflare Worker + KV, both free at our scale) and create the project; runs will wire it behind the Leaderboard interface. Until then records stay on the device.

## Later (before store release)

4. itch.io account (free) for the web build page.
5. Poki / CrazyGames developer accounts (free) once the web build is polished.
6. Google Play developer account (one-time 25 USD) and Apple Developer account (99 USD per year, only when ready for iOS).
7. Payout and tax details in your country for ad networks and stores.
8. AdMob app and ad-unit IDs (free) when the Android build is ready.
9. A contact email to put in the privacy policy.
10. Android upload keystore: generate on your machine and keep it safe. Never commit it. Claude will provide the exact commands.
11. Real-device testing on one Android phone and one iPhone (even 10 minutes helps).

## Defaults the runs assume (tell Claude to change)

- Runs fast-forward `main` whenever `npm run check` is green.
- The 2-hour schedule runs again (re-enabled 2026-11-10 after the interactive session), on Opus.
- No paid services at all until you approve them here.

## Optional decision

- **Art source:** runs draw all art in code (free, tiny). If you want a faster jump in quality, you can approve free CC0 pixel-art packs (no cost, no attribution required) or supply your own art. Default until you say otherwise: code-drawn art following `docs/ART.md`.

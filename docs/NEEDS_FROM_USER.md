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
- No paid services at all until you approve them here.

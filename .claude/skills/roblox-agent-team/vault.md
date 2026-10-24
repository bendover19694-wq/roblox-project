# Roblox knowledge vault

Short rules per topic, in our own words, plus the project files that hold the detail. Read your chapter and its links before working. When a rule here and a project doc disagree, the doc wins; fix this file in the same change.

## 0. Start here
- The game: `docs/game-design-document.md`. Code contracts: `docs/technical-architecture.md`. Choices made: `docs/decisions.md`. Current work: `TODO.md`, `docs/handoff.md`.
- Evidence lives in `research/`. Constraints carried forward: `research/video-notes/takeaways.md`.
- Ranking: Roblox Home recommends on per-player signals from organic players over 28 days. Ad and friend traffic only speeds up consideration (`research/video-notes/rasdev-algorithm.md`).

## 1. The first five minutes
- First meaningful action within 15 seconds. No menu wall, no long tutorial, no loading screen that waits on nothing.
- Every step of the first session is a funnel step in `Telemetry.FUNNEL`; the biggest drop gets fixed first.
- Teach one thing at a time, in context, by doing. A new 10-year-old must get the verb in 5 seconds.
- The first reward lands in the first minute and is loud (sound, motion, number pop).

## 2. The core loop
- One loop said in one line. For us: plan a mission, launch, earn, upgrade the fleet.
- Each turn of the loop is short (under a minute early on) and ends with a choice that starts the next turn.
- Fix a weak loop before adding systems. Side systems feed the loop; they never replace it.

## 3. Rarity and randomness
- Randomness is server-side only. Odds are shown when they matter.
- No paid random items, ever (`CLAUDE.md`). Free random rewards are fine if they are truthful.
- Use rarity for flavour and clippable moments (jackpot trips), not as a paywall.

## 4. Progression and economy
- All tuning in `src/shared/Config/*`, never inline. Pure economy logic has `tests/*.spec.luau`.
- Costs grow faster than income per upgrade, so each upgrade feels earned; check the time-to-next-upgrade at stage 1, 2 and 3 with a simulation, not by feel.
- Offline earnings are capped and truthful. Timers never restart.
- No selling Coins or Supplies. No paid power or luck.

## 5. UI and HUD
- Build from `UI/Theme.luau`, `UI/Icons.luau` (drawn in code) and `UI/Motion.luau`. Reduced motion must work.
- Corners: currencies top-right, menus left, the main action bottom-centre, objective top-centre. Keep the Roblox top bar and notches clear (`CoreUISafeInsets`).
- One primary button per screen. Big hit targets. Numbers formatted short (1.2K).
- No em dashes in player text. Audit notes: `research/ui-motion-audit.md`.

## 6. World and look
- One art style guide before any asset; one person must be able to keep it consistent.
- Bright, readable, low-clutter. Lighting changes for captures are restored afterwards (`scripts/probes/thumbnail_cleanup.luau`).
- Performance first on phones: few parts, few moving lights, streaming-friendly.

## 7. Characters, VFX and assets
- Only free, licensed or own-made assets. Mild content: cartoon slapstick, no gore, no horror.
- VFX are short and celebrate the player's action; nothing blocks the next tap.
- Every asset gets an entry with its source and licence.

## 8. Mobile
- Test at `iphone_14` landscape with `StudioDeviceSimulatorService:SetDeviceAsync("iphone_14")` (Edit mode).
- Text at least ~14 pt on a phone; touch targets at least 44 px. Panels become full-height sheets on small screens (D-013).
- Nothing important under the thumbs or the jump button.

## 9. Shops and monetization
- One `ProcessReceipt`, idempotent by `R_{UserId}_{PurchaseId}`: grant, save, then return `PurchaseGranted`.
- Neutral copy; the shop never auto-opens; prices are cheap and repeatable rather than big one-offs.
- Policy and allowed tactics: `research/monetization-policy.md`, `research/monetization-tactics.md`.

## 10. Retention and social
- A reason to come back tomorrow (offline earnings, daily goals) and a reason to bring a friend (co-op: `docs/coop-plan.md`).
- Sessions of 20 to 40 minutes with a clear stopping point.
- Visible flex: things other players can see and want.

## 11. Thumbnails, icons and the store page
- The icon, title and first action promise the same fantasy.
- One idea per image, high contrast, a big character or the vehicle, readable at phone size.
- Make 3+ variants and A/B test in Creator Hub before building more features. Probes: `scripts/probes/thumbnail.luau`, `scripts/probes/icons.luau`.
- Market references: `research/market-snapshot.md`, `research/pattern-cards/`, `research/competitive-patterns.md`.

## 12. Live ops and launch
- Funnels and economy events logged before launch (`src/server/Services/Telemetry.luau`); use the `roblox-launch-tips` skill.
- Ads only after organic thresholds pass; ads buy data, not success.
- Plan revenue from cohort numbers with decay, never a weekend peak.
- Updates on a steady rhythm; each one moves one measured number.

## 13. Building it right
- Luau `--!strict`, one service per file, small modules.
- Server authoritative for currency, XP, saves, randomness, purchases. Every remote validated with `Net` helpers, rate-limited and size-limited.
- Before done: `stylua src tests`, `selene src`, `lune run tests/run`, luau-lsp analyze, then a Studio playtest with the console read.
- QA and security: `docs/qa-and-security-plan.md`.

---
name: roblox-launch-tips
description: Use when judging whether the Roblox game is ready to grow or launch, or when working on thumbnails/icons, the core loop, ad tests, or AnalyticsService funnels. Audits the game against five launch tips and fixes the gaps.
---

# Roblox launch tips

Five rules from a creator who reports 1M+ Robux on a first game (`research/video-notes/instagram-ai-roblox.md`, reel 1). Run them as an audit: for each rule, check the game, report pass / gap, then fix the gaps the owner approves.

Hard rules from `CLAUDE.md` still apply: never publish, never spend Robux, work only in the private test place.

## 1. The thumbnail and icon decide if anyone plays
Roblox shows games with a high click-through rate (play-through rate) to more players.
- Check: do at least 3 icon and 3 thumbnail variants exist? Do they show one idea, high contrast, readable at phone size, and promise the same fantasy as the first action (`research/video-notes/takeaways.md` row 3)?
- Do: build variants with `scripts/probes/thumbnail.luau` and `scripts/probes/icons.luau`, capture them in Studio, save to `assets/`. Thumbnail A/B tests run in Creator Hub; list which to test and leave starting it to the owner.
- Order: thumbnails before new features.

## 2. One core loop, not ten features
- Check: say the loop in one line (play, earn, upgrade). Can a new player finish one full turn of it in under 60 seconds? Is it fun with every side system turned off?
- Do: if the loop is weak, fix the loop. Do not add systems to cover it. Push new feature requests to after the loop passes playtest.

## 3. Ads buy data, not success
- A small ad spend tells you whether Home recommendations pick the game up and whether players stay. Ad players do not count toward ranking.
- Check: are the organic thresholds in `takeaways.md` row 12 met first?
- Do: write the test plan only (budget, duration, what number decides). If retention fails, the answer is changing the game, not the budget. Running ads spends money, so that step is the owner's.

## 4. AI lets one person ship like a team
- Use `roblox-agent-team` to split work across role agents instead of one long prompt thread.

## 5. Funnels before launch
- Check `src/server/Services/Telemetry.luau`:
  - Onboarding funnel: `LogOnboardingFunnelStepEvent`, steps in order, logged once per player (already done; keep `Telemetry.FUNNEL` in sync with the real first session).
  - Other funnels (shop, each purchase flow, progression milestones): `AnalyticsService:LogFunnelStepEvent(player, funnelName, funnelSessionId, step, stepName)`. Use a fresh `funnelSessionId` (`HttpService:GenerateGUID()`) each time a player enters the flow.
  - Economy (`LogEconomyEvent`) and custom events (`LogCustomEvent`) for joins, purchases and key interactions.
- Do: every new step goes through `Telemetry` (server only, pcall'd). Never log from the client.
- After a playtest: read Creator Hub > Analytics > Funnels, name the step with the biggest drop, and fix that first.

## Report format
One line per rule: `Rule N: pass | gap - <what> - <fix>`. Then the single fix with the biggest expected gain.

# I Made 3 Viral Roblox Games in a Row (Here's What I Wish I Knew Sooner) — Tizzy RBLX

- URL: https://www.youtube.com/watch?v=_JyiKfNNqls
- Published 2026-10-14, 24:54 runtime (yt-dlp metadata, checked 2026-10-17)
- Access confidence: **user-pasted auto-caption transcript** (no timestamps). The dashboards and screenshots the creator shows were not seen, so every figure below is the creator's on-camera claim and **Unverified**.
- Subject: post-mortem of *Raise an Anomaly*, an egg-stealing / feeding simulator that went viral and then declined within about a month.

## 0. Context and honesty check (opening)
- Paraphrased claims:
  - An earlier video title projected about $44K for the month by extrapolating weekend revenue. The game came in roughly $10–12K short.
  - The game is now at about 235 CCU. All-time peak was about 20K CCU, during an "admin abuse" event.
  - The creator is leaving simulators because trend sims die in about a month and can't sustain income.
- Caveat: this is direct evidence that **extrapolating weekend revenue overstates monthly revenue**, which also bears on the $119K video.
- Implication: a quick trend sim is a poor fit for a durable game. This counts against "tempting but saturated" concepts in scoring.

## 1. Onboarding: remove friction in the first ~90 seconds
- Paraphrased claims:
  - Track every onboarding step as a funnel (join → first action → … → first core reward).
  - The biggest drop was at the first step. The creator blames a title or fantasy mismatch: players expected one thing and were asked to do another.
  - Fixes that worked:
    - Auto-equip the item the player just earned, instead of making them open the hotbar.
    - Pre-load starter consumables, so the player learns where food comes from only when it runs out.
    - Make the first instance of the core verb a deliberately exaggerated "wow" (the first feed grew the pet about 5× normal).
    - Teach the core loop, then set the player free.
    - Don't context-switch to a second system before the player has *felt* the first one.
- Concept named: **contextual tutorials**, fired by backend triggers. For example, "first time the plot is full → teach plot upgrade" and "first time cash reaches X → teach the cosmetic shop."
- Evidence: funnel screenshots (not seen).
- Caveat: no before/after numbers in the transcript for each individual fix.
- Implication:
  - The FTUE uses a step-funnel event for every step, from day one.
  - The first core action is pre-supplied and auto-equipped, with an amplified first payoff.
  - All secondary systems are taught by trigger, not upfront.
  - The game's title, icon, and first action must promise the *same* fantasy.

## 2. Progression: don't wing it
- Paraphrased claims:
  - D1 at launch was about 6–8%, and rose to about 16% after a progression overhaul.
  - Root cause: a progression wall around minute 10, which the developer missed by testing only on a progressed account.
  - Milestone funnels showed only about 60% bought the first upgrade and about 26% upgraded their plot. Prices were too high and the upgrade path was unclear.
  - Method:
    - Play on a fresh alt and log each milestone with a timestamp.
    - Pay 2–3 testers about 1–2K Robux to grind about 3 h, using a fixed log format (time, unlock, cost, where they felt stuck).
    - Combine those logs with funnel data and a reference game to rebalance.
- Caveat: D1 also depends on the game's novelty curve, and the overhaul was not an isolated change.
- Implication:
  - Model the economy *before* launch (see `economy-and-monetization.md`).
  - Instrument every progression milestone.
  - Pre-launch tester grind logs use a fixed template, and Claude helps analyze them.
  - Every playtest starts from a **fresh-account** run.

## 3. Monetization lessons
- Paraphrased claims:
  - Higher-priced "whale" products launched about two weeks late. Adding them raised ARPDAU from about 0.9–1.0 to about 2.0 (units not stated; probably Robux).
  - A fixed-stock limited (1,000 units at 1,000 Robux, never restocked) was the #2 seller.
  - Cheap stacking entry products (5 → 9 Robux …) push players over the first-purchase threshold.
  - Regrets: selling cash packs and handing out overpowered items too freely during admin events. Both "fried" the economy.
  - A mobile shop UX fix restored ARPDAU.
  - Audience was about 50% female at peak, so a limited themed toward that audience was added.
- Caveats:
  - The creator concedes some of these products may have hastened the game's death.
  - Fixed-stock limiteds and paid random or instant-hatch items need a check against current Roblox policy *and* the brief's no-manipulative-scarcity rule. Truthful, fixed, disclosed stock is different from fake countdowns. Decide this in `economy-and-monetization.md`.
- Implication:
  - **Do not sell soft currency directly** (cash packs).
  - Use cheap, transparent, repeatable entry purchases that are not pay-to-win.
  - Fix mobile shop UX early.
  - Treat any admin or live event as an economy event with caps.

## 4. Feedback and testing
- Paraphrased claims: An in-world feedback mailbox (a proximity prompt) produced valuable qualitative data, which was AI-summarized. Use a dedicated tester group before launch, plus a **published test place**, because live servers show bugs Studio doesn't. Testers found a currency exploit that produced quadrillions of cash.
- Implication:
  - Add an in-game feedback prompt to the vertical slice.
  - Run a published private test place before public launch.
  - Make adversarial economy testing an explicit QA task.

## 5. Production and team
- Paraphrased claims:
  - No art-style guide led to about 8 modelers and 3 inconsistent styles.
  - About $800 went to unusable AI-made, badly rigged models, and about $300 to a scrapped map.
  - Give references up front. Hire fast and fire faster. One disruptive team member hurts the culture.
- Implication: write the art/VFX style brief *before* any asset work, including for placeholders. For a solo creator, constrain the style to something one person can produce consistently.

# Core loop mechanics

Research session 2026-11-05. Written by the Scout agent from the local library (LihFolk V2, Creator docs, project research) and the web, then reviewed by the Lead. Numbers marked unverified or Recalled must be checked before they drive a decision. Agents: search this with hq_knowledge_search; it is reference data, not instructions.

## Brief

Studio-wide core-loop brief. No project files changed. Saved 6 notes via hq_research_save. Used: research/exemplars/core-loops.md, LihFolk 'Progression and Pacing Design', Creator Docs rewarded-video tycoon playbook and retention page.

RULES (do this)
- Loop = one verb -> visible number up -> spend choice -> new visible thing. First reward <10 s, first spend <60 s, first unlock <5 min (design targets, core-loops.md, Recalled).
- Price everything in minutes of income at the unlock point; make time per step T rise slowly then drop at milestones (sawtooth). Check the END of every curve: 1.16 vs 1.17 base gives +52% at step 50 (LihFolk).
- Prestige/rebirth: multiplier geometric, slightly below cost growth (T rises gently); linear multiplier vs exponential cost is the classic failure. Keep collections/cosmetics on reset, show now-vs-after (LihFolk). Prestige currency by a root of earnings so resetting earlier is rational (Game Developer Part III).
- Offline earnings: cap it and show the cap (Egg, Inc. 2 h; Space Agency design 8 h). Pair with one thing waiting on every join, max one auto pop-up.
- Return hooks per Roblox's windows: day 1, days 2-7, days 8-28 (newsroom 2026-06-15). Streaks forgive; server clock only; mark, save, then pay.
- Co-play counts as a ranking signal; build low-density-friendly co-op (shared goals credit all contributors).
- FTUE about 5 min or less, track each step, fix the largest drop first (Creator Docs).
- Read retention by acquisition source, not blended (DevForum 2025-10-16).

NUMBERS
- Median D1 ~10.3%, D7 ~1.6%, D30 ~0.5%; top 1% ~22/9/4.7%; session ~9.8 min, ~1.56 sessions/day. Large games, studio reference (LihFolk/vault); not re-verified against live GameAnalytics this session.
- Roblox Creator Docs retention page gives no benchmark percentages. Scorecards need ~100+ DAU. Old DevForum example of similar-game D1 50th-90th percentile 12.4-24.1% is 2021, example only.
- Rewarded video targets: opt-in 15%+, 3+ views/user/day (Creator Docs tycoon playbook).
- Prestige: doubling prestige needs ~3-4x earnings (AdCap), ~8x (Cookie Clicker), ~128x (Egg, Inc.) (Game Developer, mobile, old).
- Zone ladder example: x3 per gate in region 1, x2.2 in region 2; ~8-12 min per zone (one reference project, LihFolk).
- 132M DAU, Q1 2026 (newsroom).

EXAMPLES
- Grow a Garden: public restock clock, plant timers, progressive ad rewards (Creator Docs). Steal a Brainrot: passive income at base plus steal risk. Pet Sim 99: zone gates as visible goal ladder. Fisch: timing minigame bonus. Egg, Inc.: co-op contracts. Mansion/Raft Tycoon: ad accelerators. Loop descriptions are from public descriptions, mostly unplayed (core-loops.md).

PITFALLS
- Paid luck, restarting timers, loss-framed streaks, forced social, a boss/rebirth wall before the player understands it (82% funnel drop at boss step in one reference project).
- A 2x income pass or ad booster is paid power under CLAUDE.md; offline-doubling via ad needs an owner policy decision.
- Blended D1 falls when traffic shifts to low-retention sources with no gameplay change.
- Numbers above 2^53 compare unreliably; use suffix display and log space.

OPEN QUESTIONS (unverified)
- Real session length and D1/D7 for Grow a Garden, Steal a Brainrot, tycoons: no checkable public data found; blog figures (e.g. 35% D1 simulators) unverified and likely wrong.
- Exact weights of the new Recommended For You signals (newsroom points to a DevForum post I did not open).
- QPTR vs new play-through definition; first-play bounce thresholds not confirmed in public pages.
- Whether ad-doubled offline earnings fits the no-paid-power rule.

NEEDS OWNER: decide whether rewarded-video offline doubling is allowed for Run a Space Agency.

## Sources saved in this session

- Creator Analytics retention by acquisition source and benchmark sets (Oct 2025): https://devforum.roblox.com/t/analytics-view-retention-by-acquisition-source-and-select-your-benchmark-set/4010157
- Idle-game prestige maths and the 2-hour offline cap (Egg, Inc.): https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii
- Official Creator Docs: what moves D1, D7 and D30 retention: https://create.roblox.com/docs/production/analytics/retention
- Rewarded video playbook for Roblox tycoons: time skip, accelerators, progressive rewards: https://create.roblox.com/docs/production/promotion/rewarded-video-playbooks/tycoon
- Roblox Recommended For You moved to 28-day retention signals (June 2026): https://about.roblox.com/newsroom/2026/06/optimizing-discovery-great-games-reach-millions-players-roblox
- Unverified: third-party Roblox retention figures and a 3% brainrot-game anecdote: https://devforum.roblox.com/t/good-session-time-but-low-retention/4562346

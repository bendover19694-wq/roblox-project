# Core-loop exemplars (36 games) for Run a Space Agency

Written 2026-10-24. Extends `../competitive-patterns.md`, `../run-an-airline-study.md` and `../pattern-cards/*`; it does not repeat their per-game stats. Labels: **Documented** = a linked source says it. **Recalled** = general industry knowledge, not re-checked this session. **Unverified** = plausible, needs the owner's own playtest. We have not played most of these games; the loop lines are inferred from public descriptions, guides and prior knowledge.

## TL;DR
1. Every durable loop is **one verb the player repeats -> a visible number goes up -> a spend decision -> a new thing appears on screen**. If any of the four links is slow or invisible, the loop is sick (see the diagnosis checklist, section 4).
2. Winning Roblox sessions are **short-feedback, long-horizon**: first reward under 10 s, first spend under 60 s, first unlock under 5 min, first "big goal" visible by minute 10.
3. Next-day return is pulled by **something that kept running while the player was away** (growth, timers, offline income) plus **one thing waiting for them** (streak, daily contract, ready crate). Space Agency already has both; the work is making them legible.
4. The "clip moment" is the cheapest growth channel: a moment that is funny, rare or impressive in 5 seconds on a phone. Space Agency's candidates: perfect launch, jackpot trip, first Titan arrival, a rocket exploding in a cartoon way (no gore).
5. Ethical monetization that still works: **time-savers that are not power** (extra slot, auto-collect, queue size), **cosmetics** (rocket paint, patches, trails), **supporter packs**, **private servers**. Never paid randomness (hard rule, see `monetization-policy.md`).
6. Most steal-worthy single ideas: offline cap + welcome-back (Egg Inc, AdCap), milestone multipliers (AdCap), contract board (Pocket Planes), visible queue of workers (Tiny Tower), prestige as a story beat (Idle Miner, Egg Inc), group goals (Clash clans, Bee Swarm quests), timing minigame as rare skill burst (Fisch).
7. The Roblox discovery loop rewards **playtime, return visits and spend of engaged players**; Roblox pays developers a flat 5 Robux per daily-engaged active spender and a 35% share on a new user's first $100 (Creator Rewards, Documented). Design for session length of 10+ minutes in the first visit, because that is the qualifying threshold.
8. Templates in section 3: the first 60 seconds and first 10 minutes second by second.
9. Dark patterns flagged **avoid** inline: fake scarcity, restarting timers, paid luck, loss-framed streak pressure on minors, guilt notifications.
10. Everything here is "pattern, not expression" (see `CLAUDE.md`). Names, art and exact numbers of other games are never copied.

---

## 1. How to read an entry
Each entry: **Loop** (action -> reward -> spend -> unlock) / **Session** (target length) / **Return pull** / **Clip** / **Ethical monetization** (not paid randomness; where the real game uses paid random, it is named and marked avoid) / **Steal** (one idea).

## 2. Exemplars

### 2.1 Roblox, idle / collection / economy
**1. Grow a Garden** (Roblox)
- Loop: plant seed -> wait (real-time growth) -> harvest and sell -> buy rarer seeds and gear -> bigger garden and weather mutations.
- Session: 15-30 min active, then leave it running; plant timers push a return every 5-60 min.
- Return pull: crops keep growing, shop stock restocks on a visible timer, events (weather, limited items).
- Clip: a giant or mutated crop, a rare seed restock shout.
- Ethical monetization: more plots, auto-harvest style convenience, cosmetics. (The original sells luck and random-yield items: avoid.)
- Steal: **a public restock clock** that creates "be here at :00" without punishing absence. Truthful, repeating, never reset.

**2. Steal a Brainrot** (Roblox)
- Loop: buy a character from a conveyor -> it earns passively at your base -> other players try to steal it -> upgrade base lock and buy better characters.
- Session: 10-20 min bursts, many short returns.
- Return pull: income accrues at base; fear of loss and desire to steal.
- Clip: a last-second steal or a rare spawn announced to the server.
- Ethical monetization: base cosmetics, speed boosts, VIP server. (Paid random drops and pay-to-steal advantage: avoid.)
- Steal: **passive income that visibly accrues on a thing you own**, with a "collect" press. Space Agency equivalent: the Launch Pad's pending-payout badge.

**3. Pet Simulator 99** (Big Games)
- Loop: break breakables -> coins/gems -> hatch eggs -> better pets -> bigger zones with gates.
- Session: 30-60 min; zones gated by currency give a goal list.
- Return pull: daily rewards, events, trading, clan battles.
- Clip: a huge rare pet reveal.
- Ethical monetization: inventory slots, auto-farm convenience, cosmetics. (Paid egg luck and egg bundles: avoid.)
- Steal: **zone gates as the stage ladder** (we use career stages). Each gate shows its price while you are still earning, so the next goal is always on screen.

**4. Adopt Me!** (DreamCraft)
- Loop: do chores (feed, play, sleep) -> earn bucks and pet age -> buy eggs/homes/furniture -> trade and show off.
- Session: 20-40 min; cozy.
- Return pull: pets age over days, events, trading with friends, home decoration.
- Clip: a legendary pet or a decorated house tour.
- Ethical monetization: cosmetics, house items, gifting. (Paid egg gamble: avoid.)
- Steal: **"care tasks" with a visible need bar** that is satisfied by a simple tap and pays. Reads as warm, not grinding. Maps to crew morale or rocket maintenance.

**5. Fisch** (Roblox)
- Loop: cast -> timing/reaction minigame -> catch (rarity, weight, mutation) -> sell -> buy rods -> travel to new waters.
- Session: 30+ min; strong mastery curve.
- Return pull: day/night, weather events, enchant relics, progression of rods and zones.
- Clip: a huge or mutated fish on the hook.
- Ethical monetization: cosmetic boats, rod skins, convenience. (Paid luck: avoid.)
- Steal: **a skill minigame that adds a bounded bonus** (perfect catch = bonus yield). Matches our perfect-launch timing. Keep the fail case still paying.

**6. +1 Stone Skipping** (Roblox, 2026)
- Loop: throw/skip -> distance -> coins -> better stones and throw power.
- Session: 5-15 min.
- Return pull: leaderboards, short and low-friction. (Unverified; recent.)
- Clip: a very long skip chain.
- Ethical monetization: stone skins, boosts (non-random).
- Steal: **zero-text first minute**. One button, instant visible result.

**7. Blox Fruits** (Gamer Robot)
- Loop: quest -> grind NPCs -> level -> new sea/island -> gear and fruit power.
- Session: 45-90 min.
- Return pull: levels gating islands, raids, boss timers, trading.
- Clip: a fruit awakening or a raid boss kill.
- Ethical monetization: game passes (storage, speed). (Paid fruit spins: avoid.)
- Steal: **quest-chain pacing with an on-screen "next step" arrow** so players never ask "what now".

**8. Dead Rails** (Roblox)
- Loop: ride a train west -> scavenge -> survive night waves -> reach the end for bonds -> buy upgrades.
- Session: 15-25 min per run.
- Return pull: runs are the unit; bonds persist; co-op with friends.
- Clip: a close escape or a boss.
- Ethical monetization: cosmetics, revives that are fair (check). (Gambling crates: avoid.)
- Steal: **run-based structure with a persistent currency** gives natural session ends. Our mission is the run.

**9. 99 Nights in the Forest** (Roblox)
- Loop: gather resources by day -> defend by night -> survive N nights as a group -> diamonds for permanent unlocks.
- Session: 30-60 min co-op.
- Return pull: friends, new nights to beat, tension.
- Clip: a scream or a clutch save.
- Ethical monetization: classes/cosmetics. Check for random crates: avoid.
- Steal: **a shared milestone ("survive night 99") that the whole lobby chases**. Our group goal: global agency launches this week.

**10. Dress to Impress** (Roblox)
- Loop: theme announced -> dress in 5 min -> runway vote -> win -> unlock items.
- Session: 15-30 min; round-based.
- Return pull: friends, new themes, a clothes pool.
- Clip: a funny outfit or the winner reveal.
- Ethical monetization: VIP perks, cosmetics.
- Steal: **a social vote moment** that gives the quiet loop an audience. Our version: a monthly "best-looking rocket" showcase board, no free text.

**11. Tower Defense Simulator** (Paradoxum)
- Loop: pick loadout -> place towers -> survive waves -> coins/XP -> unlock towers.
- Session: 15-30 min per match.
- Return pull: unlock grind, event modes, ranks.
- Clip: a boss wave clear.
- Ethical monetization: skins, cosmetic crates (with disclosed odds, risky), slots.
- Steal: **pre-run loadout step** (our rocket choice) makes the decision visible before the action.

**12. Bee Swarm Simulator** (Onett)
- Loop: collect pollen -> convert honey -> buy bees and gear -> quests from NPCs -> new fields.
- Session: 30-90 min; long idle-ish.
- Return pull: quest givers, hive slots, daily bears, events.
- Clip: a rare bee hatch or mass token collection.
- Ethical monetization: boosts, cosmetics.
- Steal: **a quest-giver cast with a personality** who hands out chained quests. Our contracts could have named recurring clients.

**13. Restaurant Tycoon 2** (Roblox tycoon)
- Loop: buy tables/kitchen -> customers pay -> expand -> decorate -> staff.
- Session: 20-40 min.
- Return pull: auto income, decorating, friends visiting.
- Clip: a decked-out restaurant.
- Ethical monetization: passes (auto-collect, double cash), decor.
- Steal: **double-income passes are okay when they speed rather than gate** (check fairness against Space Agency's "no paid power" rule: a 2x income pass is paid power in our rules, so skip; offer auto-relaunch queue slots instead).

**14. Theme Park Tycoon 2** (Roblox)
- Loop: place rides -> guests pay -> upgrade -> design park -> share.
- Session: 30-120 min; creative.
- Return pull: design projects, visiting other parks.
- Clip: a park tour video.
- Ethical monetization: build parts, cosmetics.
- Steal: **a visible customer stream** (guests walking) makes income feel alive. Our equivalent: passenger counts and a rocket queue on the map.

**15. Retail Tycoon 2** (Roblox)
- Loop: stock shelves -> customers buy -> profit -> expand store -> hire.
- Session: 20-40 min.
- Return pull: auto income, store design.
- Clip: store tour.
- Steal: **assign-and-leave staff** (hire a cashier). Our version: hire a flight director who auto-picks the best mission.

**16. Lumber Tycoon 2** (Roblox)
- Loop: chop trees -> sell wood -> buy axes/land -> build -> trade.
- Session: 30-60 min.
- Return pull: building, rare wood hunt, modding, trading.
- Clip: a build or a rare tree.
- Steal: **tools that change how the verb feels** (new axe, new rocket). Visual upgrade = reward.

**17. My Restaurant!** (Roblox)
- Loop: cook and serve orders -> tips -> upgrade kitchen -> hire staff -> bigger menu.
- Session: 20-30 min.
- Return pull: staff, decorations, group play.
- Clip: a rush hour chaos.
- Steal: **a rush-hour spike** that briefly adds active play. Our "tap-to-thrust" window serves the same role.

**18. Run an airline / "Run a" games** (Roblox, see `../run-an-airline-study.md`)
- Loop: pick route -> assign aircraft -> flight earns -> expand fleet -> new cities.
- Session: 5-15 min check-ins, long idle.
- Return pull: offline earnings, route progress, rank.
- Clip: first long-haul route or fleet flex screenshot.
- Ethical monetization: cosmetics, queue convenience (verify in your own playtest).
- Steal (already adopted): **screen-based wizard + automatic repeat**. What to extend: a visible "schedule board" of all active missions.

**19. Dress/avatar-hangout hybrids (Brookhaven RP)** (Roblox)
- Loop: roleplay with friends, buy houses/vehicles.
- Session: long, social.
- Return pull: friends and scene ownership.
- Steal: **a player-owned space** (our agency HQ cosmetics).

### 2.2 Mobile idle / incremental
**20. AdVenture Capitalist** (Hyper Hippo)
- Loop: tap/buy businesses -> cash/s -> buy more of the same -> milestone multipliers -> managers automate -> reset for Angel Investors.
- Session: 3-10 min active, hours between visits.
- Return pull: offline earnings, unfinished milestone, prestige target.
- Clip: huge number notation jumps.
- Ethical monetization: ad-for-boost (opt-in), time skips, permanent boost packs. (Paid random: none.) Recalled.
- Steal: **milestone multipliers at fixed counts** (x2 at 25 and 50 owned, per the Kongregate math article). For us: fleet-size and mission-count milestones.

**21. Egg, Inc.** (Auxbrain)
- Loop: hatch chickens -> eggs deliver to market -> buy habitats/silos -> contracts with friends -> prestige at "Soul Eggs".
- Session: 2-5 min; strong check-in pull.
- Return pull: contracts with co-op, offline 2 h cap documented (Part III of the math article states an offline cap of 2 hours).
- Clip: very large numbers.
- Ethical monetization: ads for boosts, permanent upgrades, subscription.
- Steal: **co-op contracts with a deadline** (friends fill a shared goal). Space Agency: weekly "joint expedition".

**22. Idle Miner Tycoon** (Kolibri)
- Loop: upgrade mine shafts -> managers -> elevator -> cash -> new mine area -> prestige "super cash".
- Session: 3-5 min.
- Return pull: offline cash, mine milestones.
- Clip: infinite upgrade bursts.
- Ethical monetization: ad doubling, boosts.
- Steal: **a three-stage pipeline** (extract -> haul -> deposit) where each stage is a visible upgrade bottleneck. For us: launch prep -> flight -> payout.

**23. Airline Manager** (Mobile)
- Loop: buy aircraft -> assign routes -> revenue -> expand fleet -> compete in alliances.
- Session: 5-10 min check-ins.
- Return pull: real-time flights, maintenance, ranking.
- Clip: first jumbo.
- Steal: **real-time flights that take real minutes** with a leaderboard of "agencies".

**24. Pocket Planes** (NimbleBit)
- Loop: load packages at airports -> fly -> deliver -> earn coins/bux -> buy planes and airports.
- Session: 3-8 min; multiple small decisions.
- Return pull: planes landing, new job boards, a social "flight crews" feature.
- Clip: a plane taking off with bonus cargo.
- Ethical monetization: premium currency for instant finish (timer skip; fine if honest).
- Steal: **job boards with mixed cargo** where a single pick has fit constraints. Our daily contracts could include "cargo for X, with Y capacity".

**25. Tiny Tower** (NimbleBit)
- Loop: build floors -> assign bitizens to jobs -> stock items -> sell -> earn -> new floors.
- Session: 3-5 min.
- Return pull: restocks, VIP visits, elevator events.
- Clip: a VIP arrives.
- Steal: **named characters with preferences** make economy feel human. Crew roster in Space Agency.

**26. Clash of Clans** (Supercell)
- Loop: collect resources -> build/upgrade (timers) -> train troops -> raid -> clan war.
- Session: 5-10 min, 3-6 times per day.
- Return pull: build timers, raids, clan war schedules, seasonal events.
- Clip: a big raid.
- Ethical monetization: gem timer skips, builder slots, season pass. (Chest/random: avoid.)
- Steal: **multiple builders** (parallel slots) as the soft-gating knob rather than only cost.

**27. Cookie Clicker** (Orteil)
- Loop: click -> cookies -> buildings -> upgrades -> golden cookies (random free bonus) -> ascend.
- Session: any.
- Return pull: golden cookies, achievements, ascension.
- Clip: huge numbers, news ticker jokes.
- Steal: **a free surprise bonus (golden cookie)** that appears at random on screen and rewards attention. Our jackpot trip is a similar random free bonus.

**28. Kittens Game / Universal Paperclips style** (browser incremental)
- Loop: resource -> converter -> unlock new stage that changes the game's shape.
- Session: any.
- Return pull: unknown next phase.
- Steal: **phase changes that reshape the screen** (not just bigger numbers). Our stage promotions should swap UI elements, not only prices. Recalled.

**29. Hay Day / farm timers** (Supercell)
- Loop: plant -> harvest -> fulfill orders at a roadside shop -> expand.
- Session: 3-5 min.
- Return pull: crops ready, orders refresh.
- Steal: **an orders board with deadlines-free rewards**. Fine with our daily contracts.

**30. Subway Surfers style endless runner + missions** (Kiloo)
- Loop: run -> collect -> missions -> multiplier -> daily rewards.
- Session: 2-5 min per run.
- Return pull: daily challenge and word-hunt events.
- Steal: **a three-mission strip** always visible (done = multiplier tick).

**31. Candy Crush / match-3 energy model** (King)
- Loop: play a level -> lose a life -> wait or ask friends.
- Return pull: lives regenerate, events.
- Steal: skip. Energy gating hurts a management game. See mechanics catalog.

**32. Genshin / gacha games** (miHoYo)
- Loop: daily commissions -> resin spend -> pull -> character.
- Return pull: dailies and limited banners.
- Steal: nothing. It is built on paid randomness (avoid).

**33. Stardew Valley** (ConcernedApe)
- Loop: daily chores -> sell -> upgrade tools -> unlock areas -> seasonal festivals.
- Session: 30-90 min.
- Return pull: calendar of festivals, community center bundles.
- Clip: a festival or a perfect farm layout.
- Steal: **a collection "bundle" board** with themed sets. Our mission patches.

**34. Mini Metro / Two Dots style puzzle management** (Dinosaur Polo Club)
- Loop: draw routes -> serve stops -> unlock lines -> hold as long as possible.
- Steal: **a one-screen map you can read at a glance**. Same as our solar-system map.

**35. Kerbal Space Program (contextual)** (Squad)
- Loop: build rocket -> launch -> mission contract -> funds/science -> bigger rockets.
- Session: 30-120 min.
- Clip: epic fail explosion; successful landing.
- Steal: **contract + science + funds triangle**, and the funny failure as share fodder (cartoon only for us).

**36. Roblox "Tycoon" generic (Mega Fun Obby style button path)**
- Loop: step on button -> unlock next dropper/conveyor -> earn -> next button.
- Steal: **the next button is visible and glows when affordable**. Our shop item "Affordable" state.

## 3. Templates top games use

### 3.1 First 60 seconds (second by second)
| Time | What the player sees/does | Purpose | Space Agency application |
|---|---|---|---|
| 0-3 s | Boot screen with logo and a live progress hint; no wall of text | Show polish, set tone | `src/first` boot screen shows a rocket silhouette and a one-line tagline |
| 3-8 s | Spawn directly in the main screen, a single glowing button | Zero reading | "Plan Mission" pulsing; map visible behind it |
| 8-15 s | Tap -> 3-step wizard preset to sensible defaults (destination LEO, Sparrow, Standard) | One-tap path; defaults prevent confusion | Wizard step 3 button says "Launch" |
| 15-25 s | Countdown flash, rocket arcs across the map, camera/UI shake light | First feedback, first clip moment | Launch sequence + perfect-launch timing as an optional bonus bar |
| 25-40 s | Rocket returns -> coin toast rises, number animates | First reward | Payout toast with count-up |
| 40-50 s | A tiny first goal pops: "Buy a second rocket: $X (you have $Y)" | First spend target within reach | Shown with progress bar already ~80% full thanks to a bonus |
| 50-60 s | First spend completes -> something new on screen (a second rocket icon on the pad) | Close the loop once | New rocket appears in the hangar and auto-queues |

Rules: no more than 2 tooltips; one dismissible; reward before explanation; never block input for more than 2 s; keep audio on a gentle cue (muted by default if platform requires).

### 3.2 First 10 minutes (minute by minute)
| Minute | Beat | Notes |
|---|---|---|
| 0-1 | Loop proven (above) | Player has earned and spent once |
| 1-2 | Second mission to a new destination unlocked | Show "Station" lit up on the map; small contrast: higher pay, longer time |
| 2-3 | Auto-repeat introduced ("Rocket keeps flying while you plan") | Player learns passive income without a lecture |
| 3-4 | First goal complete -> career goal ticked, reward toast | Career strip visible at the top |
| 4-5 | Second rocket model purchase available | Visual upgrade is the reward |
| 5-6 | First **daily contract** surfaced (not forced) | Plant the return hook |
| 6-7 | Tap-to-thrust or timing bonus appears (rare skill burst) | Optional, always pays something |
| 7-8 | First stage promotion preview ("Orbital Company in $X") | Long goal visible |
| 8-9 | Welcome message for offline earnings explained | "Leave and come back; your fleet keeps flying (8 h)" |
| 9-10 | Soft invite for notifications opt-in (only after a win) + patch shown as collection hook | Opt-in, never required; check age eligibility (13+) |

Targets (Recalled, treat as design targets not facts): first reward < 10 s; first spend < 60 s; first unlock < 5 min; first stage promotion by 15-20 min; first session total 12-20 min.

### 3.3 First day / first week (short)
- Day 1: stage 1-2 complete; 3+ rockets; first contract; first welcome-back summary on second session.
- Day 2: streak day 2 reward; a reason to peek (a mission arriving while away); 1 new destination.
- Day 3-7: Moon + stage 3; first patch set; 7-day operations streak completes with a cosmetic (not power).
- Week 2+: Mars, weekly goal, social element (shared board).

## 4. Loop diagnosis checklist
Run on any loop (ours or a competitor's) and score pass/fail. Fix the first failure before polishing later ones.
1. **Verb clarity**: Can a new player name the one thing to do in 3 s without text?
2. **Feedback latency**: Time from action to visible reward < 3 s? (Bad if > 10 s.)
3. **Reward legibility**: Is the number that changed shown with before -> after animation?
4. **Spend clarity**: Is the next purchase visible, priced, and marked affordable/unaffordable?
5. **Unlock visibility**: Does the purchase produce a visible new thing (not just stat +5%)?
6. **Goal horizon ladder**: Is there an immediate goal (< 1 min), a short goal (5 min), a session goal (20 min) and a long goal (days) on screen at once?
7. **Choice quality**: Are there at least two sensible choices at each spend, with no strictly dominant one?
8. **Wall design**: When income slows, is there another lever (skill bonus, contract, research) instead of a pure wait?
9. **Session end**: Is there a natural stopping point that does not feel like punishment?
10. **Return hook**: Is there something waiting after 1 h, 8 h, 24 h? Does it keep running offline?
11. **Truthfulness**: Are timers accurate and never restarted? (Roblox policy and our hard rule.)
12. **Fairness**: Could a free player reach every system at reasonable speed? Is spend purely time-saving or cosmetic?
13. **Clip potential**: Is there at least one moment per session worth recording?
14. **Social surface**: Is there a way to see or help another player without free-text chat?
15. **Death spiral check**: Can a bad decision (selling a rocket, missing a day) lock a player out? If yes, add a comeback valve.
16. **Numbers sanity**: Time-to-next-unlock between 2 and 10 min early, growing to 30-90 min mid-game; income per hour roughly doubles each stage (design target).

## 5. Pattern synthesis: what repeats across the 36
- **Visible queue of work**: Tiny Tower floors, Pocket Planes flights, our rocket icons. People enjoy watching their things do things.
- **Number plus unlock**: the number is the fuel, the unlock is the reward.
- **Rare free surprise**: Cookie Clicker golden cookie, Fisch rare catch, our jackpot trip.
- **Social shape without chat**: leaderboards, clans/joint contracts, trade-free gifting, showcase boards.
- **Offline earning with a cap**: Egg Inc 2 h (Documented in Part III), our 8 h. Longer caps help families who play once a day; shorter caps force check-ins. We chose 8 h; consider letting a free upgrade raise it.
- **Monetization that sells time, space, or looks**: extra slots, queue length, skins.

## 6. What Space Agency should steal (shortlist, ranked)
1. Named recurring clients with chained contracts (Bee Swarm quest NPCs + Pocket Planes jobs).
2. Milestone multipliers at fleet-count thresholds (AdCap) shown as a progress ladder.
3. A public, truthful restock-style clock for a rotating "launch window" bonus (Grow a Garden) with no punishment for missing it.
4. Weekly joint-expedition goal that sums every player's launches (99 Nights, Egg Inc contracts).
5. A visible three-stage pipeline per mission: prep -> flight -> payout (Idle Miner).
6. Stage promotions that reshape the UI (Kittens Game phase change), not just prices.
7. A showcase board for rocket paint (Dress to Impress) with preset-only content, no free text.
8. Crew roster with personalities who comment on events (Tiny Tower bitizens).

## 7. Risks and "avoid" list
- **Avoid** paid luck, paid random crates, paid eggs (Roblox PRI policy requires odds disclosure and region gating; our rule is no PRIs at all).
- **Avoid** loss-framed streak messages to kids ("You'll lose your streak!"). Use "Your streak continues when you return."
- **Avoid** fake urgency (restarting sales, fake limited stock).
- **Avoid** public shaming leaderboards for under-13 audiences.
- **Avoid** forced social actions (join group to continue).
- **Be careful** with notification frequency: Roblox notifications go only to opted-in users 13+ and must be personalized to in-experience activity (Documented, experience notifications docs).

## 8. Sources
- Kongregate / Game Developer, The Math of Idle Games Part I: https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i
- Part III (prestige formulas): https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii
- Roblox Creator Rewards: https://create.roblox.com/docs/en-us/creator-rewards
- Engagement-based payouts (deprecated 2025-07-24): https://create.roblox.com/docs/production/monetization/engagement-based-payouts
- Experience notifications: https://create.roblox.com/docs/production/promotion/experience-notifications
- Roblox analytics and benchmarks: https://create.roblox.com/docs/production/analytics
- DevForum retention-by-source update: https://devforum.roblox.com/t/analytics-view-retention-by-acquisition-source-and-select-your-benchmark-set/4010157
- GameAnalytics mobile benchmarks summary: https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
- Repo references: `research/competitive-patterns.md`, `research/run-an-airline-study.md`, `research/monetization-policy.md`, `research/pattern-cards/*`.
- Unverified: per-game session lengths and loop details marked Recalled or inferred above; verify through hands-on play before design decisions rely on them.

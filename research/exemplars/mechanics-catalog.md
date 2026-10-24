# Mechanics catalog: 90 engagement and retention mechanics for Run a Space Agency

Written 2026-10-24. Extends `../monetization-policy.md`, `../monetization-tactics.md` and `core-loops.md`. Labels: **Documented** (linked source), **Recalled** (industry knowledge, not re-checked this session), **Unverified**. Tuning numbers marked Recalled are starting points to playtest, not facts.

## TL;DR
1. Retention comes from five levers: **progress you can see, things that keep running, small daily reasons, social ties, and mastery/expression**. Most of the 90 entries below are variants of those five.
2. Exponential cost curves (growth 1.07-1.15 per unit owned) against linear production is the backbone of idle economies. Kongregate's article uses 1.07 for the cheapest AdCap business (Documented); 1.15 is common in other idle games (Recalled).
3. Prestige formulas are roots of lifetime earnings: AdCap `150*sqrt(L/1e15)`, Cookie Clicker cube root, Egg Inc `(R/1e6)^0.14` (all Documented in Part III). Prestige should arrive after a "pacing wall", not before it.
4. Offline caps: Egg Inc 2 h (Documented); Space Agency 8 h. Caps are a retention knob: short caps pull check-ins, long caps protect casual players.
5. Roblox policy: **no official Creator Hub page found that bans or explicitly allows rewarding likes, favorites or group joins** (see section 11). Community consensus: asking and a game-wide code reward is fine; per-player verified rewards are riskier. Treat as **unverified**, prefer a game-wide reward, and never gate core progress on it.
6. Roblox Creator Rewards (since 2025-07-24, Documented) pays 5 Robux per daily-engaged Active Spender (10+ min, one of the first three experiences launched that day) and a 35% share of a new user's first $100 for 60 days. Engagement alone from non-spenders does not pay directly; discovery still depends on engagement.
7. Paid random items: Space Agency ships none (hard rule). Randomness allowed on earned rewards only.
8. Notifications: Roblox experience notifications reach only opted-in users 13+ and should be personalized to in-experience activity (Documented).
9. Each entry ends with a **Fit** line: HAVE / ADD (concrete design) / SKIP (why).
10. Flagged **avoid**: paid luck, fake timers, loss-framed streaks for minors, forced social, guilt notifications.

---

## 1. Progression and pacing

**1. Linear stage ladder** - A fixed sequence of ranks that unlock content.
- Psychology: goal gradient. Effort feels closer to done as the bar fills.
- Tuning: 5-8 stages; each stage 2-5x the previous in time (Recalled).
- Roblox: Pet Simulator zones, Blox Fruits seas.
- Risk: none.
- Fit: HAVE (6 career stages).

**2. Goal ladder with multiple horizons** - Always show an immediate, short, session and long goal.
- Psychology: reduces "what now"; each horizon gives a different dopamine cadence.
- Tuning: immediate under 1 min, short ~5 min, session ~20 min, long days.
- Fit: ADD. A top strip with 3 nested goals (next buy, next career goal, next stage).

**3. Soft walls** - Income slows near the next unlock, nudging toward a different lever.
- Psychology: contrast makes the next unlock feel earned.
- Tuning: wall duration 2-10 min early, up to 1-2 h later (Recalled).
- Risk: if no alternate lever exists, players churn.
- Fit: HAVE; ensure contracts or timing bonuses fill the wall.

**4. Hard gates** - Content locked behind level or currency threshold.
- Psychology: scarcity of access, desire.
- Risk: frustration if opaque. Always show requirement.
- Fit: HAVE (stage gates, rocket stage).

**5. Exponential upgrade costs** - Cost = base * r^owned, r typically 1.07-1.15 (1.07 AdCap Lemonade Stand, Documented).
- Psychology: perceived diminishing returns; need for new levers.
- Tuning: bulk-buy cost = b * r^k * (r^n - 1) / (r - 1) (Documented formula).
- Fit: ADD in rocket upgrades (see formulas section).

**6. Milestone multipliers** - At fixed owned counts (25, 50, 100...) output doubles.
- Psychology: creates short-term targets inside the long curve; bursts of purchases.
- Tuning: x2 at 25 and 50 (Documented AdCap example); later x3-x5 at 200+ (Recalled).
- Fit: ADD. Fleet-size milestones: 3, 6, 10, 15 rockets give +10-25% fares (design number, tune in Studio).

**7. Branching upgrade tree (research)** - Spend a currency on permanent bonuses.
- Psychology: autonomy, build identity.
- Tuning: 3 branches, 6-8 nodes each (Recalled).
- Fit: HAVE (Research). Keep costs in time, not Robux.

**8. Mastery levels per item** - Use a thing to level it.
- Psychology: attachment, endowment.
- Roblox: Fisch rods, Blox Fruits mastery.
- Fit: ADD. Rocket "flight hours" tiers give cosmetic trails and small reliability bonus (non-paid).

**9. Unlock reveals** - Locked items shown greyed with a price/condition.
- Psychology: curiosity, Zeigarnik effect (unfinished tasks).
- Fit: HAVE; extend to a silhouette gallery of unseen rockets.

**10. Dynamic difficulty / catch-up** - Cheaper costs for players who fell behind.
- Psychology: fairness.
- Fit: SKIP; economy is single-player with no versus, so use soft pacing instead.

## 2. Prestige / rebirth

**11. Prestige / rebirth** - Reset most progress for a permanent multiplier or currency.
- Psychology: sunk-cost reversed into fresh start; mastery with a boost.
- Tuning: first prestige after 3-8 h of play; multiplier +10-100% (Recalled).
- Roblox: Pet Sim and tycoons have "rebirth".
- Risk: players quit if reset feels like loss. Offer a clear preview.
- Fit: ADD (post-Galactic Pioneer). "Launch Era": reset money/rockets, keep patches, research, a founder multiplier.

**12. Prestige currency formula (lifetime-based)** - Gain depends on total lifetime earnings.
- AdCap: p = 150*sqrt(lifetime / 1e15). Cookie Clicker: cube root of lifetime/1e12. Doubling needs ~3-4x (AdCap) or 8x (Cookie) the earnings (Documented, Part III).
- Fit: ADD with sqrt: p = floor(sqrt(lifetime / K)).

**13. Prestige formula (this-run-based)** - Egg Inc: (earnings this run / 1e6)^0.14; doubling needs ~128x (Documented).
- Psychology: rewards frequent resets, favors active play.
- Fit: SKIP; prefer lifetime for a calmer rhythm.

**14. Permanent multiplier stacks** - Prestige currency gives +X% each (AdCap Angel 2%, Recalled).
- Fit: ADD: "Founder Shares" +2% fares each.

**15. Prestige tiers (sub-prestige)** - Multiple layers (Egg Inc's second layer with ~5x per tier, Documented).
- Fit: SKIP for v1; add after first prestige proves out.

**16. Reset preview** - Show exactly what you keep and gain before confirming.
- Psychology: reduces regret. Required to avoid the "avoid" dark pattern of surprise resets.
- Fit: ADD with the prestige.

## 3. Offline / idle

**17. Offline earnings** - Income accrues while away, capped.
- Psychology: reward for returning; reduces guilt.
- Tuning: cap 2 h (Egg Inc, Documented) to 8-24 h; rate 50-100% of active (Recalled).
- Fit: HAVE (8 h). Consider reduced rate over 4 h to keep check-ins healthy.

**18. Welcome-back summary** - A modal sums what happened.
- Psychology: peak-end; turns absence into a gift.
- Fit: HAVE; add per-rocket mini-lines and jackpot callouts.

**19. Idle multipliers (time-based)** - Run a boost for N minutes.
- Psychology: urgency without pain if free.
- Risk: **avoid** restarting timers or fake countdowns.
- Fit: ADD as earned "Hyperdrive 10 min" from contracts.

**20. Ad-for-boost (opt-in rewarded video)** - Watch to double.
- Roblox: rewarded video availability varies by policy (unverified; Immersive ads need PolicyService eligibility per `monetization-policy.md`).
- Fit: SKIP (rejected in monetization policy for the slice).

**21. Auto-repeat (automation)** - Worker repeats action.
- Psychology: control relief.
- Fit: HAVE (auto-repeat missions).

**22. Manager unlocks** - Pay to automate a stage.
- Fit: ADD: "Flight Director" per destination automates pricing.

**23. Queue length as a progression** - Slots for pending actions.
- Roblox: Tycoons, farms.
- Fit: ADD. Mission queue slots 1 -> 3 -> 5 earned; extra slot also a supporter perk (convenience, not power).

## 4. Collection / sets

**24. Collection with sets** - Items group into completable sets with a reward.
- Psychology: completion drive, Zeigarnik.
- Tuning: sets of 4-6; 20-60 total (Recalled).
- Fit: HAVE (mission patches); add set bonuses (cosmetic).

**25. Rarity tiers** - Common to legendary.
- Risk: when tied to paid chance it is a PRI (avoid). Earned only.
- Fit: ADD to patches by achievement difficulty, not by chance.

**26. Variants / mutations** - A rare cosmetic twist on a drop.
- Roblox: Grow a Garden mutations, Fisch mutations.
- Fit: ADD (earned): a free "Gold Launch" tint on perfect-launch streaks.

**27. Codex / log** - A browsable record.
- Fit: HAVE (Logbook).

**28. Showcase shelf** - Pick items to display.
- Fit: ADD: trophy wall on HQ screen.

**29. Achievements / badges** - Milestones marked permanently.
- Roblox: Badges are free; awards are visible on profile (Recalled).
- Fit: ADD: ~25 badges.

**30. Seasonal sets** - Time-bound sets with truthful end dates.
- Risk: avoid FOMO if not honest. Fit: ADD (carefully).

## 5. Streaks and dailies

**31. Daily login streak** - Reward grows over 7 days.
- Psychology: habit formation, loss aversion (use gently).
- Tuning: 7-day cycle; day 7 big; missing a day should not zero it if kids (use "grace day").
- Risk: **avoid** guilt copy and hard reset for minors.
- Fit: HAVE (7-day operations streak). ADD: one skip token earned weekly.

**32. Daily quests / contracts** - 3 small tasks per day.
- Tuning: 3 tasks, 2-5 min each, rewards = ~10-15% of a day's income (Recalled).
- Fit: HAVE (daily contracts).

**33. Weekly quests** - 1 bigger task per week.
- Fit: ADD: weekly "Expedition" 25 missions to Mars.

**34. Quest refresh clock** - Visible reset time.
- Risk: must be accurate.
- Fit: HAVE.

**35. Quest rerolls (free)** - Swap one quest per day.
- Fit: ADD (free).

**36. Streak freeze (earned)** - Save a missed day.
- Psychology: reduces anxiety; cheap.
- Fit: ADD.

**37. Comeback gift** - Returning after 7+ days gives a boost, not a guilt-trip.
- Fit: ADD: "Welcome back, Commander" = free fuel and a short Hyperdrive.

**38. Playtime rewards** - Timed gifts for session minutes.
- Tuning: 6-12 gifts across 60-120 min (Recalled).
- Roblox: very common.
- Fit: HAVE (playtime gifts).

## 6. Limited-time and events

**39. Limited-time event** - Time-boxed content.
- Policy: allowed if claim is true and timer accurate (Documented in `monetization-policy.md`).
- Fit: ADD: monthly "Launch Window" event with truthful end.

**40. Event-only cosmetics** - Reward for event participation.
- Risk: pressure; offer a returning "archive" after 3-6 months.
- Fit: ADD.

**41. Event currency** - Separate tokens.
- Risk: complexity.
- Fit: SKIP v1.

**42. Seasonal passes (free track)** - Free reward track by playtime.
- Policy: subscriptions and battle passes allowed; free track costs nothing.
- Tuning: 30-50 tiers over 4-8 weeks (Recalled).
- Fit: ADD (free-only first). Later optional paid cosmetic track.

**43. Weekend boosts** - Short global bonus on a schedule.
- Fit: ADD: accurate "Double Gifts Weekend".

**44. Live-ops cadence** - Update every 1-2 weeks.
- Roblox: many top games update every ~2 weeks (Recalled).
- Fit: HAVE plan; use update log (item 85).

## 7. Social and co-op

**45. Shared global goal** - All players contribute to a counter.
- Psychology: collective efficacy.
- Roblox: 99 Nights style group goals.
- Fit: ADD: server or global "Mars Colony Fund" with shared reward.

**46. Co-op contract** - Players pool resources.
- Egg Inc contracts (Documented concept).
- Fit: ADD v2.

**47. Leaderboards (global, friends, weekly)** - Ranks.
- Psychology: status. Weekly boards reset so new players can win.
- Risk: demotivating for low rank; show friends board first.
- Fit: ADD: weekly "Most distance flown", friends-only default.

**48. Visiting other agencies** - See others' HQ.
- Fit: ADD v2.

**49. Gifting** - Send a free item to a friend.
- Psychology: reciprocity.
- Risk: under-13 chat and trading restrictions; keep presets only.
- Fit: ADD: "Send Supplies" capped daily.

**50. Trading** - Player-to-player exchange.
- Risk: scams, PRI interplay; `IsPaidItemTradingAllowed` check (Documented).
- Fit: SKIP (scam risk, moderation load).

**51. Clans / guilds** - Groups with shared goals.
- Clash of Clans, Pet Sim clans.
- Fit: SKIP v1; use Roblox groups for communities.

**52. Server-wide announcements** - "Player X hit a jackpot".
- Psychology: social proof, clip moments.
- Fit: ADD (small toast).

**53. Co-op bonus (friends in server)** - +5% per friend present.
- Roblox: some games +X% per friend (Recalled).
- Fit: ADD: "Mission Control Crew" +5% per friend, cap 25%.

**54. Spectate / watch launch** - Watch a friend's launch.
- Fit: ADD v2.

**55. Emote reactions** - Preset reactions only.
- Fit: ADD (no free text).

## 8. Timers, energy, scarcity

**56. Build timers** - Wait to complete.
- Clash of Clans; skip with premium. Risk: **avoid** inaccurate timers (Documented rule).
- Fit: HAVE (trip times); keep honest.

**57. Energy / lives** - Limited plays.
- Psychology: scarcity.
- Fit: SKIP (hurts management loop).

**58. Cooldowns** - Short lockout after use.
- Fit: ADD: pad refurbishment time after launch only if it adds choice.

**59. Restock clocks** - Shop stock changes on schedule.
- Grow a Garden.
- Fit: ADD: Parts Market refreshes every 30 min with truthful clock.

**60. Real-time events (public)** - Scheduled spawn broadcast.
- Fit: ADD: "Meteor Shower" 5 min earning boost, announced.

## 9. Variable and random (free only)

**61. Variable ratio rewards (earned randomness)** - Random drops on gameplay.
- Psychology: strongest reinforcement; hooks at high rates.
- Policy: allowed if not purchasable (Documented in repo policy). Odds fair; ideally show odds anyway.
- Fit: HAVE (jackpot trips).

**62. Near-miss** - Show almost-win.
- Risk: **avoid** engineered near-misses in paid contexts; gambling-adjacent.
- Fit: SKIP.

**63. Pity / bad luck protection (free)** - Guarantee after N misses.
- Fit: ADD to jackpot: guaranteed within ~25 trips.

**64. Random events during a mission** - Weather, solar flare.
- Psychology: variety.
- Fit: ADD: small events with choice (reroute or wait).

**65. Mystery reward on streak day 7** - Pick a reward from 3.
- Fit: ADD (choice, not chance).

**66. Golden cookie style bonus** - Random pop-up bonus clickable.
- Cookie Clicker.
- Fit: ADD: "Signal Boost" tap on the map for +bonus.

**67. Perfect-timing bonus** - Skill to boost reward.
- Fit: HAVE (perfect launch).

## 10. Juice and feedback

**68. Number pop and count-up** - Animate rewards.
- Psychology: salience.
- Fit: HAVE.

**69. Screen shake / flash (reduced-motion safe)** - Impact on big events.
- Fit: HAVE; ensure reduced-motion.

**70. Sound design** - Tiered chimes.
- Fit: ADD: pitch rises with streak.

**71. Camera and map cues** - Rocket arcs, trails.
- Fit: HAVE.

**72. Celebration modals** - Stage promotion.
- Fit: HAVE.

**73. Haptics / micro-pauses** - A 80-120 ms hit pause.
- Fit: SKIP (not on Roblox UI).

**74. Progress bars everywhere** - Near-full bars invite the final push.
- Psychology: goal gradient (endowed progress: start bars at 10-20%).
- Fit: ADD.

## 11. Roblox-specific levers (with policy)

**75. Favorite prompt** - Ask players to favorite for updates.
- Policy: no official ban found; I found no official Creator Hub text addressing rewards for favorites (search 2026-10-24). A DevForum thread says rewarding follows "might be against the ToS" without a cited rule, and a reply says a removed ToS section is old (community, not staff). Unverified.
- Fit: ADD as a polite non-rewarded prompt after a win (optional). Do not gate rewards.

**76. Likes** - Ask for a like.
- Policy: community reply in DevForum thread says asking and releasing a code after a like goal is not a ToS violation (community member, not confirmed staff). Unverified.
- Fit: ADD: "Hit 10,000 likes for a patch" game-wide code, truthful, no per-player check.

**77. Group-join bonus** - Reward joining the group.
- Policy: community requests for in-game group prompts exist; a DevForum reply links a Roblox policy update about marketplace items that may restrict some prompts (unverified, content not seen). No official text found for rewards.
- Fit: ADD only as optional cosmetic ("Founder patch"), never power, and verify against the current Creator Hub before shipping.

**78. Experience notifications** - Opt-in pushes.
- Documented: opted-in users 13+; personalize to in-experience activity; use `PromptOptIn` after `CanPromptOptInAsync`; may be throttled or moderated.
- Fit: ADD: "Your Mars mission arrived", opt-in prompt only after a win.

**79. Badges** - Free achievements; also feed profile and discovery signals (Recalled).
- Fit: ADD (25 badges; first is "First Launch").

**80. Private / VIP servers** - Paid or free private servers.
- Documented in repo policy: free or monthly fee.
- Fit: HAVE plan (cheap).

**81. Codes** - Redeemable codes for rewards.
- Roblox: ubiquitous. Risk: code inflation; keep to cosmetics and small boosts.
- Fit: ADD (cosmetics only, tied to milestones like 10k likes).

**82. Friend invite rewards** - Reward invites.
- Policy: Creator Rewards forbids encouraging alt accounts (Documented). Referral bonuses can't incentivize fake accounts.
- Fit: ADD: reward only when the invited friend reaches stage 2 (human milestone), cap per account; unverified against SocialService rules.

**83. Playtime rewards** - See 38.

**84. Update log in-game** - "What's new" panel.
- Psychology: reasons to return.
- Fit: ADD.

**85. Experience events (Events & Updates)** - Roblox events feature with opt-in announcements, up to 10 ongoing or upcoming events (Documented).
- Fit: ADD for monthly events.

**86. Share links** - Audience Expansion counts users joining via Share Link (Documented).
- Fit: ADD: "Invite" button using share link.

## 12. FTUE, notifications, comeback, monetization-adjacent

**87. Guided first action** - Highlight only one button.
- Fit: HAVE (see core-loops 3.1).

**88. Contextual tips** - One tip per new system, once.
- Fit: HAVE.

**89. Return notifications** - Personalized (see 78). **Avoid** guilt, fake urgency.
- Fit: ADD.

**90. Supporter pack (cosmetic)** - One-time pack.
- Documented: passes are one-time purchases (`monetization-policy.md`).
- Fit: ADD (cosmetic + queue slot).

**91. Subscriptions (cosmetic monthly)** - Benefits must be identical across platforms and not task-gated (Documented).
- Fit: ADD later.

**92. Gifting premium cosmetics** - Buy for friend.
- Fit: SKIP v1.

**93. Under-13 / Kids rules** - Accounts 5-8 and 9-15 have limits on content and chat; new games first available to 16+ until evaluation (Documented in repo policy).
- Fit: design for Mild label; no free text, no trading.

## 13. Formulas with real numbers

### 13.1 Idle cost and income (Documented, Kongregate Part I)
- Next cost = base * r^owned. Lemonade Stand: r = 1.07, base ~3.74, production 1.67/s. After 10 owned the next costs ~7.87 and total production ~16.7/s.
- Total production = base_prod * owned * multipliers.
- Cost to buy n more = b * r^k * (r^n - 1) / (r - 1).
- Max affordable n = floor(log_r(c*(r-1)/(b*r^k) + 1)).
- Milestone multipliers x2 at 25 and 50 owned.

### 13.2 Prestige (Documented, Kongregate Part III)
- AdCap: p = 150*sqrt(L/1e15).
- Cookie Clicker: p = cbrt(L/1e12).
- Realm Grinder: p = (sqrt(1 + 8*c/1e12) - 1)/2.
- Egg Inc: delta = (R/1e6)^0.14; offline cap 2 h.

### 13.3 Space Agency worked example (design numbers, tune in Studio)
- Rocket purchase costs: use existing price table (Kestrel $120K to Phoenix $4.5M). For additional units of the same model use r = 1.12: unit k costs base * 1.12^k. Example Heron base $260K: 2nd $291K, 3rd $326K, 5th $409K, 10th $807K.
- Milestones: x1.10 fares at 3 rockets, x1.15 at 6, x1.25 at 10 (rounded; cumulative ~1.58 at 10).
- Prestige "Founder Shares" = floor(sqrt(lifetime / 50,000,000)). At $200M lifetime: floor(sqrt(4)) = 2 shares; at $5B: 10. Each share +2% fares.
- Offline: cap 8 h; rate 100% first 4 h, 60% after (proposal). Example: $1,000/min income, 8 h away = 4*60*1000 + 4*60*1000*0.6 = $384,000.
- Time targets: first rocket purchase at 1 min; Stage 2 at ~15-20 min; Stage 4 at ~2-3 h total; Galactic Pioneer at 8-12 h (Recalled targets for a casual management game; unverified).
- Perfect-launch bonus: +5% to +15% on that trip only; fail pays 100%.

## 14. Avoid list (dark patterns)
- Paid luck, paid eggs, paid spins (PRIs; hard rule).
- Fake discounts and fake timers (Documented in repo policy).
- Hard streak resets with shame copy for minors.
- Forced social (gating progress on invites).
- Auto-opening shop; auto-renewing subscriptions without clear terms.
- Notifications that imply loss or abandonment ("Your crew misses you").

## 14b. Roblox platform notes that shape which mechanics matter
- **Discovery** follows engagement of the players who try the game: session length, return rate and spend of engaged users. Roblox's own benchmark scorecards (100+ DAU) compare your D1/D7/D30 retention with similar experiences and, per Roblox, are for comparison and do not feed ranking (Documented, analytics docs and DevForum update). Treat retention as the target anyway: it drives everything else.
- **Qualifying engagement for payouts**: Creator Rewards counts 10+ minutes in the experience in a day, and only if it was one of the player's first three experiences that day (Documented). So the first session must clear 10 minutes and the daily return must be a habit worth a first-three slot.
- **Audience Expansion** needs the experience to hold 100+ DAU over the 60 days after the user joins, so a stable daily loop beats a launch spike (Documented).
- **Age gating**: a new game is 16+ only until it passes Kids/Select evaluation, which needs Highly Engaged Players (repo `monetization-policy.md`). Early mechanics should therefore work for teens and adults: skill bonus, co-op expeditions, leaderboards, not only cute dailies.
- **Notifications are the only sanctioned out-of-game ping**, are opt-in, and reach 13+ only (Documented). Under-13 return pull must therefore live in-game: visible running missions, streaks with grace, friends' activity.
- **Engagement-based payouts** (Premium time share) ended 2025-07-24 (Documented), so older advice that "Premium playtime pays" is stale.

## 14c. Suggested build order for the mechanics marked ADD
1. Goal ladder strip, milestone multipliers, progress bars with endowed progress (cheap, high impact on the first session).
2. Weekly expedition + streak grace/freeze + comeback gift (return pull for days 2-14).
3. Badges, patch sets with set bonuses, trophy wall (collection depth, free).
4. Weekly leaderboard (friends first), server-wide announcements, friend co-op bonus (social without chat).
5. Opt-in experience notifications and monthly truthful event (re-engagement).
6. Prestige "Launch Era" with preview, after the economy has a real wall (needs data from playtests).
7. Supporter pack and private servers (cosmetic and convenience only; see monetization policy).
Each step should ship with a metric: D1/D7, session length, missions per session, % players hitting each goal horizon, offline-return rate. Stop adding mechanics when the diagnosis checklist in `core-loops.md` section 4 passes; extra layers beyond that are clutter.

## 14d. Tuning cheat sheet (Recalled unless noted; confirm in playtests)
| Knob | Starting range | Notes |
|---|---|---|
| Upgrade cost growth r | 1.07 (cheap tiers, Documented) to 1.15 | Higher r = faster walls; pair with milestone multipliers |
| Milestone multiplier | x2 at 25 and 50 owned (Documented) | For Space Agency use smaller steps at lower counts since fleets are small |
| Offline cap | 2 h (Egg Inc, Documented) to 8 h (ours) | Raise only via earned upgrades |
| Daily contract reward | 10-15% of a day's income | Too high makes missing a day painful |
| Daily streak length | 7 days, grace token weekly | Day 7 is cosmetic or choice |
| Playtime gifts | 6-12 gifts over 60-120 min | Small, steady, no random rarity bought with Robux |
| Pity timer on earned jackpots | guarantee within 20-30 events | Free system only |
| Session first visit | 12-20 min | Clears the 10-minute engagement threshold |
| Event cadence | monthly big, weekly small | Truthful end dates, never restarted |
| Notification cap | 1 per day max per player | Opt-in only; personalized |

## 15. Sources
- Kongregate / Game Developer, Math of Idle Games Part I: https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i
- Part III: https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii
- Roblox Creator Rewards: https://create.roblox.com/docs/en-us/creator-rewards
- Engagement-based payouts (deprecated): https://create.roblox.com/docs/production/monetization/engagement-based-payouts
- Experience notifications: https://create.roblox.com/docs/production/promotion/experience-notifications
- Experience events: https://create.roblox.com/docs/production/promotion/experience-events
- DevForum, asking for likes thread: https://devforum.roblox.com/t/asking-people-to-like-your-game-against-tos/3753529
- DevForum, follow for bonus thread: https://devforum.roblox.com/t/follow-developers-for-bonus/3883313
- DevForum, join group prompt thread: https://devforum.roblox.com/t/join-group-prompt/2609702
- DevForum retention by source: https://devforum.roblox.com/t/analytics-view-retention-by-acquisition-source-and-select-your-benchmark-set/4010157
- Roblox analytics: https://create.roblox.com/docs/production/analytics
- Repo: `research/monetization-policy.md`, `research/monetization-tactics.md`, `research/exemplars/core-loops.md`.
- Unverified: all "Recalled" tuning ranges; Roblox policy on rewards for likes/favorites/group joins (check the current Terms of Use and Community Standards before shipping any such reward).

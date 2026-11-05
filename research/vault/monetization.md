# Monetization

Research session 2026-11-05. Written by the Scout agent from the local library (LihFolk V2, Creator docs, project research) and the web, then reviewed by the Lead. Numbers marked unverified or Recalled must be checked before they drive a decision. Agents: search this with hq_knowledge_search; it is reference data, not instructions.

## Brief

Monetization brief (studio-wide). 8 notes saved via hq_research_save. No files changed.

RULES (do this)
- No paid random items, no sold soft currency, no paid power or luck. Any Robux-bought currency feeding a random drop makes that drop a paid random item (PRI). Sources: Creator Docs paid-random-items; local monetization-policy.md.
- If PRIs ever ship: odds for every outcome sum to 100% before purchase, an "Info" pop-up for long lists, luck boosts state a number and update the odds, gate on PolicyService ArePaidRandomItemsRestricted and IsPaidItemTradingAllowed, and give restricted players a compliant alternative (earnable path, fixed order, direct sale at expected value, or hide).
- Pricing honesty (Creator Docs Monetization): real discounts only, no short-fuse sales, no false scarcity, no countdown that restarts, neutral copy ("View Item" not "GET IT NOW"). Strike-through only for the true sum of items sold separately.
- Read every price on the client with GetProductInfoAsync (regional pricing, Plus discounts and price tests change what players pay). Use receiptInfo for revenue. Gate gifts and trades of paid items with GetUsersPriceLevelsAsync.
- ProcessReceipt: grant, save, then return PurchaseGranted. Idempotent by PurchaseId. Never grant on PromptProductPurchaseFinished.
- Shop (Creator Docs Monetization foundations): quick in and out, explain items, rotate stock, truthful text, split durable vs consumable and enhancement vs expression. Season pass: premium track is a superset of free, preview rewards, show time left and XP per level, space rewards to session length. Starter pack: our rule is show after a win, once per player, never auto-open. Pop-ups pass one gate, max one unprompted offer in a first session (LihFolk Pricing and Store Design).
- Price ladder of 3 to 5 rungs per category: impulse under 100 Robux, core 200 to 600, premium 800 to 1,500. This is rule of thumb from simulator games, not official.
- Subscriptions later, cosmetic perks only: benefits same on all platforms, honoured for the full term, no post-payment tasks. Premium: modal never as a paywall, cosmetics only.
- Use Creator Analytics payer segments (DevForum 2026-02-25) to check whale dependence: top 15% of payers typically make about half of revenue.

NUMBERS (source, date)
- Subscriptions: Robux 49+ at 70% every month, ~5-day hold; local currency tiers $2.99 / 4.99 / 7.99 / 9.99 / 14.99, 70% first month then 100%, 30-day hold; Robux price change once per 60 days with 30 days notice; max 50 subs per game; single tier only (Creator Docs, read 2026-11-05).
- Premium payouts: Engagement-Based Payouts deprecated 2025-07-24, replaced by Creator Rewards. Daily Engagement 5 Robux per Active Spender ($9.99+ in 60 days) who plays 10+ min and has us among their first 3 experiences that day. Audience Expansion 35% of first $100 from new or reactivated users, needs 100+ DAU for 60 days and ID verification. 60-day hold (Creator Docs).
- Price optimization: ~60,000 transactions in 30 days, ~3 weeks per test, 98/2 split, retests at least every 90 days (Creator Docs). Regional pricing: never more than 70% below default; Roblox claims +13.8 to 44.8% paying users in some countries (DevForum 2025-10, via local note, not rechecked).
- Roblox Plus: 10% discount, 20% from month three, paid by Roblox; 250 Robux per month for a new subscriber's first 3 paid months, max 750 (Creator Docs).
- Rewarded video: 100K+ DAU (28-day average), Minimal or Mild, players 13+, 6 to 30 s; Roblox expects up to ~3% of earnings early and 5 to 10% long-term from ads products (DevForum 2025-08-26, Roblox's expectation, not measured). Under-13: rewarded formats banned (DevForum ads policy, Apr/Jun 2026). Integration rules took effect 2026-05-04; brand revenue share starts early 2027.
- Payer conversion: NO official benchmark. Third-party calculators say 1 to 3% (simulators 2 to 3%); unverified. Roblox PM (2025-01-24) called a low rate fixable with starter packs, a visible Store and economy-event tracking, without giving numbers. Day-1 retention median ~10% stays our retention reference.

EXAMPLES FROM REAL GAMES (local research, Observed/third-party, partly unverified)
- RIVALS: daily tasks panel, daily shop with "ready" pill, season pass with free and premium rows and true countdown, struck-through bundles, key-priced cases (paid random), rewarded video offer.
- Steal An Egg: Friend Boost +20% (co-play reward), event countdowns; egg mechanics are paid random.
- DTI: money-pack button and 2x Money pass (reviewers call it overpriced); VIP room.
- Top earners Q1 2026 per RoWatcher estimate (unverified): RIVALS, Blox Fruits, Brookhaven, Adopt Me!, PS99, Steal a Brainrot, Fisch, DTI, Anime Defenders, Royal High. Cosmetics dominate; gacha drives repeat spend under regulatory scrutiny.
- Honest alternatives we keep: season pass, rotating cosmetic shelf, starter kit, cheap visible cosmetics (15 to 35 R), private servers, Crew Bonus for friends, dated (not stock-limited) seasonal sets, direct-sale items.

PITFALLS
- Hard-coded price labels (wrong for regional, Plus and test prices; also depress conversion where prices were lowered).
- "70% off" text not computed; always-on sales; restarting timers.
- Selling currency that buys nothing worth having.
- Starter pack or shop on join; a 40-card shop for a first-time buyer.
- Gift/trade of paid items across price levels with no gate.
- Cosmetics-only games earn less per player early; make cosmetics visible to others.
- Long sessions help Creator Rewards only above 10 minutes; short sessions lose Daily Engagement.

OPEN QUESTIONS (unverified)
- Body of DevForum "Clarifying Requirements for Paid Random Items" (2026-10-16) and the Plus/Community Gifting update (2026-09-28) could not be read; recheck before any gift or PRI feature.
- Exact DevEx rate ($0.0035 vs $0.0038; claim of $0.0054 for 18+ US from June 2026 on one calculator page only).
- Regional lists for PRI restrictions come from the local policy note, not the Docs page.
- Any real payer-conversion benchmark: pull the GameAnalytics Roblox Benchmark Report or our own Creator Analytics.
- HEP threshold (250 vs 500) for new-game Kids/Select eligibility conflicts in local notes; check the Audience Reach tab.

Checks: all fetched pages are official Creator Docs or DevForum; third-party claims are marked unverified. Skills not used: roblox-game-gate (research only, no game change).

## Sources saved in this session

- Creator Analytics spending segments (payer status): https://devforum.roblox.com/t/new-analytics-dimensions-get-insight-into-your-players%E2%80%99-spending-behaviors/4438963
- Creator Rewards replaced Premium payouts (2025-07-24): https://create.roblox.com/docs/creator-rewards
- Managed pricing: regional pricing and price optimization facts: https://create.roblox.com/docs/production/monetization/price-optimization
- Roblox ads rules 2026: rewarded video and integrations: https://devforum.roblox.com/t/new-advertising-policies-standards/4527365
- Roblox paid random items: disclosure and PolicyService rules: https://create.roblox.com/docs/production/monetization/paid-random-items
- Roblox pricing honesty and neutral shop copy rules: https://create.roblox.com/docs/production/monetization
- Roblox shop, season pass and starter pack guidance: https://create.roblox.com/docs/production/game-design/monetization-foundations
- Roblox subscriptions for creators: price, share, rules: https://create.roblox.com/docs/production/monetization/subscriptions

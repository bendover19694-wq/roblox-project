# Monetization tactics from top-earning games (2026-10-17)

The owner asked us to "copy tactics from top converting games." Below, every tactic from the top earners is sorted into **Adopt**, **Adapt** (made ethical and policy-safe), **Later**, or **Reject**. Rejections cite the owner's ethics rule (no exploitative or deceptive monetization) and current Roblox policy (`monetization-policy.md`).

## Evidence
- **Top earners**, Q1 2026 estimate (RoWatcher): RIVALS, Blox Fruits, Brookhaven, Adopt Me!, Pet Simulator 99, Steal a Brainrot, Fisch, DTI, Anime Defenders, Royal High.
  - Its conclusions: cosmetics dominate; layered monetization wins; gacha drives repeat spend but is under regulatory scrutiny.
  - BloxRant's Top Earning chart for October 2026 shows **Steal An Egg, Blox Fruits, RIVALS** at the top. (Unverified)
- **Roblox "Monetization foundations"** (Documented) recommends:
  - shops that are easy to find, quick to enter and exit, and worth browsing
  - items with a clear purpose and an honest description
  - rotating stock
  - season passes where the premium track is a superset of the free track, rewards are previewed, the **time remaining is shown**, and reward spacing fits session length
  - starter packs and bundles as recognized formats
- **Observed** — frames from third-party shop videos, 2026-10-17:
  - RIVALS season pass guide (wflg-GUEOrY)
  - Steal An Egg event guide (btorcC8KOLM)
  - DTI pass ranking (GPQ3pbCj7HY)
- **Other evidence:** the pass catalogue from `market-snapshot.md` §5, and Tizzy's video notes.

## What the top games do on screen (Observed)
| Game | Observed UI and offer |
|---|---|
| **RIVALS** (lobby) | **A Daily Tasks panel always visible** at top left: "Play duels 1/5", "Eliminations 9/15", "Win a duel 0/1", with progress bars. A bottom dock (Backpack · Weapons · Shop · Settings · Codes) with **red badge counts**. A red pill: "Unlock your new weapons!". A floating **"Special Offer"** bubble. |
| **RIVALS** (shop) | Tabs: Bundles · Skins · Daily · Keys · More. A red pill: "Your new daily shop is ready!" Key-priced **cases** (paid random). "Special Offer: watch a quick video to earn free rewards" (**rewarded video**). |
| **RIVALS** (season pass) | A **free row and a premium row** of 7 visible tiers. The level-up rule is shown in plain words: "Win 21/25 rounds in duels or play for 14.4/20 minutes". "Season 2 ends in 8d 21h 29m". **Bundles with struck-through prices**: 724 → 599 and 2,499 → 999. |
| **Steal An Egg** (HUD) | Shop and Index buttons stacked on the left. Currency in large type at bottom left. **"Friend Boost: +20%"** shown under the currency. Active-boost icons with timers at bottom right. A world-event countdown ("in 3m 50s"). A limited **event ticket** quest (Phantom Express). |
| **DTI** (lobby) | Currencies at top right. Circular shop buttons down the left edge. A **large floating money-pack button** at bottom right. A themed **VIP room**. A 2× Money pass, which reviewers called "overpriced". |

## Tactic decisions
| # | Tactic | Seen in | Why it converts or retains | Decision | Our version |
|---|---|---|---|---|---|
| T1 | **Season pass** (free and premium tracks) | RIVALS, DTI | Spending recurs each season. Free players also progress. Officially endorsed. | **Adopt** | **Tide Pass**. 30 tiers per 6-week season, earned through nights. Premium is cosmetic-only and a superset of the free track. The countdown is true. The level rule is shown in plain words. |
| T2 | Daily tasks panel, always visible in the lobby | RIVALS | Creates play days and spend days | **Adopt** | Daily Bounties (already planned). Shown in the Cabin and as a collapsible chip under the objective line between nights. |
| T3 | Rotating daily shop | RIVALS ("new daily shop is ready") | Brings players back; official guidance says to rotate stock | **Adopt** | A daily rotating **Harbor Market** (Coins) plus a weekly rotating Robux cosmetic shelf. The real rotation time is shown. |
| T4 | Starter pack or bundle | Roblox Bundles package; most top games | Gets players to the first purchase | **Adapt** | A **Keeper Starter Kit**: coat, lantern colour and 3 fireworks. The "worth" shown equals the **real sum of the individual prices**. It appears in the Cabin from night 1 until rank 5. No countdown, no popup. |
| T5 | Bundle discount shown with strikethrough | RIVALS | Anchors value | **Adapt** | Strikethrough only shows the true sum of items sold separately. Never shown as a permanent "sale" price. |
| T6 | **Friend Boost** | Steal An Egg (+20%) | Rewards co-play, which is also a ranking signal | **Adopt** (retention) | **Crew Bonus**: +10% XP and Coins for each Roblox friend in the harbor, up to +30%. Shown under the Coins display. |
| T7 | Notification badges and an "unlock" pill | RIVALS | Draws players to new content | **Adopt** | Badges only for **truly new** unlocks (a new cosmetic, a pass tier ready to claim). They clear once viewed. |
| T8 | A Special Offer bubble or a floating money-pack button | RIVALS, DTI | Keeps the offer visible | **Adapt** | No floating sale button. One **Cabin poster** shows the current pass or Starter Kit. The shop button may carry a dot only when something new is there. |
| T9 | Cosmetic sets as passes or products | DTI, Brookhaven, Royal High | Expression; the top category | **Adopt** | Keeper outfits, lantern colours, horn pings, dock decor (planned) |
| T10 | VIP room or status space | DTI | Status | **Adapt** | A **Cabin Deluxe** pass: trophy shelf and decor slots. Not a gameplay space. |
| T11 | Event ticket or limited event quest | Steal An Egg | Event participation | **Adopt** | Weekly condition quests with free, gameplay-earned rewards and true dates |
| T12 | Cheap stacking entry products | Stone Skipping (25 R), Tizzy | The first purchase is the hardest | **Adapt** | **Harbor Fireworks** at 15–35 R. Cosmetic, visible to the whole crew. |
| T13 | Private servers | Brookhaven, most | Friend groups | **Adopt** | 0–100 R per month |
| T14 | Subscription | Platform feature | Recurring revenue | **Later** (post-launch) | Harbormaster Club |
| T15 | Rewarded video ads | RIVALS | Earns from players who never pay | **Later** | Requires 100K+ DAU (DevForum, 2025-08), Minimal or Mild maturity, and an `AreAdsAllowed` check. Revisit once eligible. |
| T16 | Gifting | Many | Social spending | **Later** | Gift a cosmetic to a crewmate. Needs a policy check and an abuse check. |
| T17 | Cases, crates, eggs, spins (paid random) | RIVALS, PS99, Anime Defenders, Steal a Brainrot | Strong repeat spend | **Reject** | Breaks the owner's ethics rule. Paid-random-item compliance applies, plus UK/BR/AU/BE/NL restrictions. (D-005) |
| T18 | 2× Money / 2× XP passes, luck passes | DTI, Blox Fruits, Steal An Egg, PS99 | Buys speed | **Reject** | Pay-to-progress. Reviewers call them "overpriced". It undermines a skill game. |
| T19 | Selling soft currency (cash packs) | DTI money pack, Tizzy's regret | Easy money | **Reject** | Wrecks the economy. Combined with any randomness, it creates paid-random-item exposure. |
| T20 | Fixed-stock "limited" items / whale products | Tizzy | High value per player | **Reject for launch** | Real scarcity is allowed by policy, but it creates fear of missing out for children. Revisit only as cosmetic, dated (not stock-limited) seasonal sets. |
| T21 | Countdown icon swaps before updates | Huss Valley, Animal Hospital, 99 Nights | Click-through spike before an update | **Adapt** | Only with a true time that never restarts. |

## Expected effect (Inferred; no official conversion data exists)
- Third-party models assume 2–3% payer conversion for simulator-type games (profitable.app). These are assumptions, not data.
- Our stack:
  - **first purchase:** Fireworks or the Starter Kit
  - **recurring:** Tide Pass each season and the rotating cosmetics shelf
  - **expression:** sets and passes

  This mirrors the "layered, cosmetics-first" pattern of the top earners, minus gacha and pay-to-win.
- **Main revenue risk:** cosmetics-only games earn less per player early on. Mitigation:
  - make cosmetics **visible to others**: lanterns on the pier, horn pings, coats, Cabin trophies
  - make the pass track feel generous

## Sources
- [RoWatcher: 10 highest-earning Roblox games 2026](https://rowatcher.com/news/the-10-highest-earning-roblox-games-in-2026-and-what-they-mean-for-the-platform) (Unverified estimates)
- [BloxRant top earning (Oct 2026)](https://bloxrant.com/roblox-top-earning-games) (Unverified)
- [Creator Hub: Monetization foundations](https://create.roblox.com/docs/production/game-design/monetization-foundations) (Documented)
- [Creator Hub: Bundles package](https://create.roblox.com/docs/resources/feature-packages/bundles) (Documented)
- [DevForum: More creators can use rewarded video ads (2025-08)](https://devforum.roblox.com/t/more-creators-can-now-use-rewarded-video-ads/3838678) (Documented)
- [Creator Hub: Immersive ads](https://create.roblox.com/docs/production/monetization/immersive-ads) (Documented)
- [profitable.app revenue calculator](https://profitable.app/tools/roblox-revenue-calculator) (model assumptions only)
- YouTube frames: [wflg-GUEOrY](https://www.youtube.com/watch?v=wflg-GUEOrY), [btorcC8KOLM](https://www.youtube.com/watch?v=btorcC8KOLM), [GPQ3pbCj7HY](https://www.youtube.com/watch?v=GPQ3pbCj7HY) (Observed, third-party)

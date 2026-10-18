# Monetization and audience policy check (2026-10-17)

Primary sources are linked in `sources.md`. Labels: **Documented** means an official Creator Hub page or a Roblox staff DevForum announcement. Anything else is marked. Re-check this file before implementing any purchase.

## 1. Audience access gates. These change our launch plan.
| Rule | Label |
|---|---|
| Account tiers: **Roblox Kids (5–8)**, **Roblox Select (9–15)**, standard (16+). Minimal and Mild games are eligible for Kids and Select. Moderate games are eligible for Select and 16+. Restricted games are 18+ age-verified only. | Documented (Content Maturity page) |
| **A new game is playable only by 16+ users until it passes the Kids and Select evaluation.** | Documented (DevForum 2026-06-16, updated through 2026-07-16) |
| Evaluation needs:<br>• creator account ID-verified, with 2-Step Verification and an age check<br>• 1,000 R refundable publishing fee, or two consecutive months of Premium<br>• automated safety screening<br>• **Highly Engaged Players** (HEP) from age-checked players. The initial threshold is 500 HEP; another announcement says it was lowered to 250. Keeping eligibility needs 25 HEP per 60 days.<br>Progress shows on the **Audience Reach** tab. | Documented. The two threshold figures conflict, so check the tab at launch |
| Expedited review costs 100,000 R and is aimed at studios. Not relevant to us. | Documented |
| Maturity & Compliance Questionnaire required. The creator account must be 30 or more days old to generate a label. | Documented |
| Social media links are visible only to age-checked users 16+ (from 2026-06-30). | Documented |

**Consequences for us (Inferred):**
1. **The first players will be 16+.** The concept must be fun for teens and adults on day one, not just readable for 9-year-olds. Content must be designed for a Minimal or Mild label so the game becomes eligible for Select and Kids once it qualifies.
2. **The closed test and launch must deliberately recruit 250–500 engaged, age-checked 16+ players.** This is now a launch milestone, not an afterthought. A friend-group co-op loop helps here, and so does the optional "Engagement" ad objective.
3. **Owner action now:** confirm the creator account is ID-verified, has 2-Step Verification on, is age-checked, and is more than 30 days old. Decide between the 1,000 R fee and Premium.

## 2. Paid random items (PRIs)
Documented in the DevForum staff announcement of 2026-05-26 and on the Monetization page.

**What counts as a PRI:**
- Anything bought with Robux, or with currency bought with Robux, that has a random outcome. That includes eggs, spins, chests, random-duration potions, upgrades that can fail, fusion, luck boosts, and pity systems.
- Bundling a random item into a pack makes the whole pack a PRI.
- Randomness that comes only from gameplay-earned, non-purchasable items is **not** a PRI.

**Requirements:**
- Show the odds for every outcome before purchase, as numbers that sum to 100%.
- Every outcome must give a benefit.
- Luck modifiers must state their effect as a number and must update the displayed odds.
- Gate PRIs with `PolicyService:GetPolicyInfoForPlayerAsync().ArePaidRandomItemsRestricted` and give ineligible players a compliant alternative.
- Check trading separately with `IsPaidItemTradingAllowed`.
- Declare PRIs in the questionnaire.
- Regulated markets named: Australia, Belgium, the Netherlands, the UK, and Brazil. In Brazil, PRIs are barred for under-18s from 2026-03-17, and for non-verified 18+ players from 2026-03-31.

**Our decision (proposed): ship no paid random items at all.**
- Randomness is allowed only on rewards earned through gameplay.
- Soft currency is never sold. This keeps "currency bought with Robux" from turning ordinary drops into PRIs. Tizzy also regretted cash packs.
- Result: no PolicyService branching, no odds UI, no regional exposure, and no gambling-adjacent criticism.

## 3. Pricing honesty
Documented on the Monetization page.

**Rules:**
- No fake discounts, meaning items permanently "on sale".
- No short-fuse discounts designed to rush purchases.
- No false "almost gone" or "limited time" claims.
- No inaccurate or auto-restarting countdowns.
- Never mislead, confuse, or pressure. Use neutral calls to action ("View Item" or "Open Shop", not "BUY BEFORE IT'S GONE!").
- Limited-time items are explicitly fine **if the claim is true**.

**Our rule:**
- Limited items have a truthful end date that never restarts. Real scarcity only.
- Copy is neutral.
- The shop never opens itself during the first session.

## 4. Product types
| Type | Facts | Our use |
|---|---|---|
| Passes | One-time purchase. Regional pricing on by default (DevForum, March 2026). | Cosmetic, expression, and QoL perks only. |
| Developer products | Repeatable, 1 R to 1B R. Fulfilled server-side through `MarketplaceService.ProcessReceipt`. Grant only for an Open receipt. Return `PurchaseGranted` only after granting; return `NotProcessedYet` to retry when the player next joins. Never use `PromptProductPurchaseFinished` to grant. Purchase records must be stored by us. Regional pricing is opt-in for products. Price optimization tests may show different prices, so fetch product info on the client. | Cosmetic consumables (emote or effect packs), optional run boosts that do not affect fairness. Fulfilment is idempotent and keyed by `PurchaseId` in a DataStore. |
| Subscriptions | Auto-renew. Robux (minimum 49 R, 70% share, always regional) or local currency ($2.99–$14.99). Benefits must be identical across platforms, honoured for the full term, and not gated behind tasks. Battle passes are exempt from that task rule. Check status server-side with `GetUserSubscriptionStatusAsync`. | Later: a "supporter" subscription with cosmetic monthly drops and private-server perks. |
| Private servers | Free or a monthly Robux fee. | Low price, important for friend groups. |
| Immersive ads | PolicyService eligibility required. | Reject for the vertical slice. |
| Paid access | One-time fee to play. | Reject, because it kills discovery. |

## 5. Platform economics
| Fact | Label |
|---|---|
| DevEx pays $0.0038 per earned Robux, or $0.0054 for some spend by verified 18+ US players. | Documented |
| Regional pricing raised paying users 13.8–44.8% in some countries (Roblox's figures). | Documented (DevForum, 2025-10) |
| "Managed Pricing" reportedly merges regional pricing and optimization. | Unverified (third-party). Check Creator Hub at implementation |

## 6. Compliance checklist for the build (draft)
- [ ] `PolicyService` lookup cached per player. Even without PRIs, it is needed for ads and trading eligibility.
- [ ] `ProcessReceipt` in a single server script. Idempotent by `PurchaseId`. Grant, then save, then return `PurchaseGranted`.
- [ ] No soft-currency sales. No PRIs. No paid luck.
- [ ] Every timer is accurate and never restarts. Shop copy is neutral.
- [ ] Questionnaire answered for the target label (Minimal or Mild). Content designed to that bar.
- [ ] A data deletion (right-to-erasure) handler. Verify the current Roblox requirement in the technical architecture phase.

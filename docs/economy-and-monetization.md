# Economy and monetization

Policy basis: `../research/monetization-policy.md`. Every value lives in `src/shared/Config/Economy.luau` and is a hypothesis until playtests confirm it.

## 1. Currencies and resources
| Resource | Role | Sources | Sinks | Velocity (engaged) | Cap | Tradable | Authority |
|---|---|---|---|---|---|---|---|
| **Coins** (persistent) | Earned spending money | End-of-night payout (crew and personal) | Coin cosmetics, tool skins, Cabin decor, weekly Harbor Market | About 110 per night | None (sinks keep it in balance) | No | Server only |
| **Keeper XP** (persistent) | Rank progress | Night payout. 2× on the first night each day | — (rank-ups) | About 110 per night | Rank 30 | No | Server only |
| **Supplies** (per night, shared by the crew) | Run upgrades | Cargo crates delivered | Tide-break upgrades | About 6–10 per tide | Reset at dawn | No | Server only |
| **Logbook stamps** | Collection, not a currency | First sighting of a part, tell or visitor | — | Front-loaded | Fixed set | No | Server only |

**Rules:**
- **Coins are never sold for Robux.** This keeps paid-random-item rules away from any random drop, and it avoids the "cash packs" economy damage Tizzy described.
- No currency trading. Analytics logs only Coins and Supplies (the limit is 5 currency types).

## 2. Payout formulas (v0)
- **Coins per night**:
  - Crew base 40, plus 5 for each correct crew call.
  - Personal: 4 per own correct call, 3 per crate carried, 10 per mimic netted, 15 for "Best call".
  - Multiplied by 0.5 if the night failed early.
- **XP per night**: the same structure ×1. The first completed night per UTC day pays ×2.
- **Rank curve**: XP to the next rank = `150 × 1.15^(rank−1)`.
  - Cumulative XP: rank 5 ≈ 750, rank 10 ≈ 2,520, rank 20 ≈ 13,200, rank 30 ≈ 56,600.

## 3. Player archetypes (modelled per week)
| Archetype | Play pattern | XP / week | Coins / week | Rank 4 (first tool) | Rank 10 | Rank 20 |
|---|---|---|---|---|---|---|
| **Free casual** | 2 nights × 3 sessions | ≈ 810 | ≈ 480 | Week 1 | Weeks 3–4 | About week 16 |
| **Engaged free** | 3 nights × 6 days | ≈ 2,640 | ≈ 1,980 | Day 2 | Week 1 | About week 5 |
| **Ethical spender** | Same as engaged, plus cosmetics | ≈ 2,640 (spending does not change progression) | ≈ 1,980 | Day 2 | Week 1 | About week 5 |

## 4. Cosmetic price ladder (Coins)
| Tier | Price | Time to earn (casual / engaged) |
|---|---|---|
| Starter | 150–300 | 1–3 nights / 1–2 nights |
| Mid | 800–1,500 | 2–3 weeks / 3–5 days |
| Aspirational | 4,000–8,000 | Not a casual target / 2–4 weeks |

## 5. 28-day goal ladder (engaged)
- **Day 1:** first mimic badge, ranks 2–3, first starter cosmetic.
- **Week 1:** Listening Trumpet (rank 4), Signal Lamp (rank 7), Long Spyglass (rank 10), and a mid cosmetic.
- **Weeks 2–3:** Logbook 50% badge, weekly conditions seen, Pair rules mastered.
- **Week 4:** aspirational cosmetic, Logbook 75%, and the first new coast (live ops).

**Bottlenecks to watch:**
- Casual players reach rank 10 only in week 3. Watch the D7 drop-off **before** rank 7.
- If engaged players run out of Coin sinks in weeks 3–4, add Market rotation items. Never inflate prices.

## 6. Paid offers (Robux)
None of these affect skill, calls, ranks, or power.

| Offer | Type | Player value | First visible | Price test range | Pay-to-win risk |
|---|---|---|---|---|---|
| Harbor Fireworks | Developer product (consumable) | A dawn celebration over the harbor that the whole crew sees | Cabin, after night 1 | 15–35 R | None |
| Outfit sets (keeper coats, hats) | Developer product, fixed and non-random | Expression | Cabin cosmetics wall | 79–299 R | None |
| Lantern Colours Pack | Pass | 8 lantern colours | Cabin | 99–199 R | None. Readability stays guaranteed because the lamp's *rhythm* is what matters, not its colour |
| Horn Sounds Pack | Pass | Custom horn for your *pings*. Ship horns are unaffected | Cabin | 79–149 R | None |
| Cabin Deluxe | Pass | More decor slots and a trophy shelf | Cabin | 149–249 R | None |
| Early Access: new coast | Pass (per coast) | Play a new coast 3 days early. Everyone gets it after that | The update announcement, with true dates | 149–299 R | Low (time only, co-op) |
| Private server | Roblox private server | Play with friends only | Game page | 0–100 R per month | None |
| Harbormaster Club (later) | Subscription (Robux) | A monthly exclusive cosmetic, Cabin badge, and private-server perks | After launch, rank 5+ | 149–299 R per month (minimum is 49) | None |

**Rejected for launch:** XP or Coin boosters, paid luck, paid random anything, Supplies for Robux, "skip tide", revive purchases, and VIP passes that add gameplay power.

**Presentation rules:**
- Neutral copy: "View", not "BUY NOW".
- The shop never auto-opens.
- Limited items show a true end date that never restarts.
- Fetch prices on the client, because regional pricing and price tests mean each player may see a different price.
- Regional pricing is on for passes. Opt in for products.

## 7. Server authority and fulfilment
- All grants happen on the server.
- Fulfilment of developer products goes through a single `ProcessReceipt`. Steps:
  1. Check the receipt is Open.
  2. Look up `PurchaseId` in the receipts store (idempotency).
  3. Grant.
  4. Save.
  5. Return `PurchaseGranted`.

  On any failure, return `NotProcessedYet`.
- Pass ownership is checked server-side with `UserOwnsGamePassAsync`, cached and refreshed on `PromptGamePassPurchaseFinished`.
- Details: `technical-architecture.md` §5.

## 8. Economy health metrics and alerts
| Metric | Alert |
|---|---|
| Median Coins balance by rank band | A rank band hoards more than 3× the price of its top available item |
| Coins earned per night | Above p99 × 2 (exploit) |
| Coins sink ratio (spent ÷ earned, 7 days) | Below 0.3 (sinks are too weak) |
| Supplies per tide | Above 2× the design maximum (exploit) |
| Rank distribution vs. the model | A wall where more than 40% of a cohort is stuck at one rank for over 7 days |
| Purchase funnel | Shop open → item view → prompt → purchase. Each step is logged |
| Refund and failed-receipt count | Any `NotProcessedYet` streak |

## 9. Experiment hypotheses (post-slice)
1. A 2× first-night-of-day XP bonus raises D1 more than a daily login reward does.
2. A Fireworks product at 25 R converts more first-time payers than 15 R or 35 R, without hurting the like ratio.
3. Showing the Cabin cosmetics wall at dawn increases Coin spending without changing session length.
4. The intro glide (8 s) versus no intro, compared on both bounce windows.

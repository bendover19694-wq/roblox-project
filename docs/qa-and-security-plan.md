# QA and security plan

## 1. Test layers
| Layer | What | When | Who |
|---|---|---|---|
| Unit (pure modules) | RuleGrammar, ShipSpec, Payout, migrations, Net validators | Every change to those files | Claude runs them through the Studio MCP and reports results |
| Lint / format | Selene, StyLua, luau-lsp type check | Every commit | Claude |
| Studio solo playtest | Night flow end to end with 1 player | Every slice | Claude (MCP playtest plus console), owner spot-check |
| Studio multi-client | 2–4 local clients: crew sync, pad votes, rampage | Every networking change | Owner launches; Claude reads output |
| Published private test place | Real servers, DataStores, purchases (sandbox), mobile | Each milestone | Owner plus testers |
| Fresh-account run | New-player first-time experience timing on a phone and on a gamepad | Each FTUE change | Owner, using an alt account |
| Closed playtest | 20–30 testers aged 16+ | M3 | Owner runs; Claude analyses logs |

## 2. Exploit and abuse tests (each must fail safely)
| # | Attack | Expected result |
|---|---|---|
| E1 | Fire `Shop.BuyCoins` with an unowned or unpriced item, a negative price, or spam | Rejected; balance unchanged; violation counted |
| E2 | Replay `Shop.BuyCoins` concurrently for the same item | One grant; the ownership check runs inside the profile update |
| E3 | Duplicate `ProcessReceipt` callbacks for the same purchase | One grant (keyed by receipt) |
| E4 | Purchase while the profile isn't loaded | `NotProcessedYet`; retried on the next join |
| E5 | `Net.Swing` from 200 studs away or through a wall | Rejected |
| E6 | `Ping.Send` with NaN or infinite numbers, a 10 KB string, or 50 per second | Rejected and rate-limited |
| E7 | Teleporting or flying to the warehouse with a crate | The server checks that the crate is carried by that player and the path time is ≥ the minimum; otherwise the delivery is voided |
| E8 | Firing a ProximityPrompt from afar (exploit) | The server re-checks distance in `Triggered` |
| E9 | Lever griefing: wrong calls on purpose | Hold-to-confirm, undo window, and a cooldown after 4 or more wrong calls |
| E10 | Client changes NightState attributes | No effect; the server is authoritative and values are re-sent |
| E11 | Joining mid-payout or leaving mid-payout | Payout saved once, or retried on the next join |
| E12 | DataStore outage (simulated) | Play continues; saving and shop disabled; banner shown; no data loss on recovery |
| E13 | Two servers with the same profile (session lock) | The second server waits or steals according to ProfileStore rules; no duplication |
| E14 | Telemetry spam from the client | Rate-limited; never affects value |

## 3. Security rules (always)
- The server is authoritative for: Coins, XP, rank, Logbook, cosmetics owned, Supplies, integrity, judgments, crate deliveries, net hits, randomness, purchases, and saves.
- Never trust identity, values, or positions sent in the payload. Re-derive them on the server.
- No `loadstring`. No HTTP calls with user data. Admin commands only for an allow-list of UserIds, and only from the server.
- Packages are pinned by commit and their source is read before adoption.
- Secrets: none in place scripts. Open Cloud keys, if they are ever used, stay outside the place and outside git.

## 4. Safety and moderation
- **Communication:** preset pings only. Roblox's text chat is on but governed by Roblox's own age rules. No custom free-text fields (no naming ships or harbors).
- **User-generated content:** none at launch.
- **Content maturity questionnaire:** answered for Mild, and re-checked whenever we add content.
- **Player reports:** handled by Roblox's built-in Report and Block tools. The Menu → Help page links to them.
- **Griefing:** lever controls (E9). A server-side vote-kick is not built, because Roblox's tools are enough at a crew size of 6.

## 5. Playtest program
- **Recruiting:**
  - Players 16 and over only, matching the launch gate.
  - Sources: the owner's friends, a small Discord, and DevForum "Creations Feedback".
  - Consent: a plain-language note covering what we log (gameplay events only, no personal data) and that feedback is voluntary.
  - **No minors in recorded sessions.**
- **Test script (closed playtest, 30 min):**
  1. Join cold, with no instructions.
  2. Play 2 nights.
  3. Visit the Cabin.
  4. Fill in a 6-question form.
- **Observation questions:**
  - Time to the first decision.
  - Did they read the rule board, or guess?
  - What made them laugh?
  - Where did they hesitate?
  - Did they use pings?
  - Would they come back tomorrow, and why?
- **Feedback triage:**
  - **P0:** blocks play or loses data.
  - **P1:** confuses most testers.
  - **P2:** polish.
  - **P3:** wishlist.

  Claude clusters the raw notes; the owner decides.
- **Each test answers one decision** (see the milestones in `implementation-plan.md`).

## 6. Release checklist (every publish)
- [ ] All unit tests pass; lint is clean.
- [ ] Multi-client playtest of the full night completed.
- [ ] A data schema change includes a migration and tests.
- [ ] Purchases tested on the test place; no `PromptProductPurchaseFinished` grants.
- [ ] Flags defaults reviewed; kill switches work.
- [ ] Previous place version noted for rollback.
- [ ] **The owner publishes.** Claude never publishes.

# Implementation plan

## 1. Who does what (owner + Claude Code on Opus 5.5)
See `decisions.md` D-001 for the feasibility verdict.

| Area | Claude | Owner |
|---|---|---|
| Luau systems (state machine, rules, data, purchases, remotes, UI in code, tests) | **Writes 90%+**, runs tests and playtests through the Studio MCP, reports results | Reviews diffs at milestones, asks "why" |
| Map and greybox | Builds the greybox from primitives through the MCP or code | Final layout, look, feel |
| Ship and part visuals | Procedural builders from primitives | **Judges readability** (the core thesis) |
| Game feel (timing, chaos, camera) | Proposes numbers, wires up tuning knobs | **Plays and decides** |
| Art, icon, thumbnail | Briefs and placeholders | Makes it or commissions it |
| Audio | Picks candidates from the Creator Store; owner approves licences | Approves and licenses |
| Playtests and community | Scripts, forms, log analysis | Recruits, runs sessions, talks to players |
| Publishing, spending, installs | **Never** | Always |

## 2. Skills and roles
| Skill / role | Status | Note |
|---|---|---|
| Game design and feel judgment | **Must learn now** (owner) | You are the playtester-in-chief |
| Luau reading level (not authoring) | **Must learn now** | Enough to review diffs and spot obvious mistakes |
| Studio building with primitives and lighting/fog | **Must learn now** | For mood and readability |
| Client/server model and remotes | **Must learn now** (concepts) | To judge security reviews |
| UI/UX | Placeholder OK | Claude builds from the design tokens |
| Environment / technical art | Placeholder OK, then **specialist later** | One builder for the final harbor (M5) |
| Character / VFX animation | Placeholder OK | 3 simple animations in the Animation Editor |
| Audio | Placeholder OK | Licensed library |
| Economy / live ops | Must learn now (basics) | Reading the analytics dashboards |
| QA / playtesting | **Must learn now** | Fresh-account discipline |
| Community / moderation | Specialist later | After launch, if the game grows |
| Production | Must learn now | Weekly scope calls |

## 3. Learning plan (solo, highest leverage first)
| # | Skill | Practice exercise (≤ 1 h) | Evidence of competence | Unlocks |
|---|---|---|---|---|
| 1 | Studio basics: parts, anchoring, lighting, fog, Explorer | Build a pier and lighthouse greybox, then tune fog until a ship at 120 studs is a silhouette | A screenshot you're happy with | M1 greybox |
| 2 | Client vs server, and why the client can't be trusted | Read Claude's `Net.luau` and explain one validator back | You can say why a request is rejected | M1 judgment review |
| 3 | Reading Luau | Read `RuleGrammar.luau` and change one config value | The change works in a playtest | M1 tuning |
| 4 | Playtesting like a scientist | Run one fresh-account session and time 5 FTUE steps | A filled template | M2 FTUE |
| 5 | Creator Analytics | Find the funnel and retention for the test place | You can read D1 and the funnel drop-off | M3 |
| 6 | Animation Editor | Make a "ring bell" animation | It plays in game | M2 polish |
| 7 | Monetization setup | Create a test pass and developer product on the test place | A test purchase is fulfilled | M5 |

## 4. Milestones and backlog
Story format: **Goal · Depends on · Accept when · Telemetry · Tests · Security · Roll back if**.

### M0 — Research complete and setup (needs owner approvals)
| ID | Story |
|---|---|
| S0.1 | Swap to the official Studio MCP. **Depends on:** owner approval. **Accept when:** `list_roblox_studios` sees the test place. **Security:** remove the unpinned community package. **Roll back if:** the MCP fails; Claude still works on files and the owner playtests. |
| S0.2 | Rokit + Rojo + StyLua + Selene + luau-lsp, plus a git repo. **Depends on:** owner approval of the installs. **Accept when:** `rojo serve` syncs `src/` into the test place; lint passes on an empty project. |
| S0.3 | Create a private test place, distinct from any production place. Checkpoint it. **Accept when:** the place ID is recorded in CLAUDE.md. |

### M1 — Playable prototype (greybox, solo, 10-minute night)
**Decision it informs:** is inspect → decide fun alone for 10 minutes? (Owner plus 3 friends.)

| ID | Goal | Depends on | Accept when | Telemetry | Tests | Security | Roll back if |
|---|---|---|---|---|---|---|---|
| S1.1 | RuleGrammar plus config | S0.2 | Generates 3-rule nights, all satisfiable, legal share ≥ 40% | — | 1,000-seed property test | Pure, server-only use | Tests fail |
| S1.2 | ShipSpec plus primitive ship builder | S1.1 | 20 parts compose; the same seed gives the same ship; readable at 60 studs in fog (owner check) | — | Determinism test | Server builds the models | Unreadable: rework parts |
| S1.3 | Ship lane, approach, and last buoy | S1.2 | A ship travels for about 15 s; the buoy event fires once | — | Studio playtest | Anchored, server-moved | — |
| S1.4 | Rules Board (diegetic plus HUD copy) | S1.1 | Icon cards render; a new rule animates in | — | Screenshot check | Display only | — |
| S1.5 | Lever and bell judgment, 4 outcomes (rampage stubbed) | S1.3 | Hold 1 s, undo before the buoy, auto-dock otherwise | `call` custom event | Outcome matrix test | Server prompt; distance re-check | — |
| S1.6 | Night state machine, 3 tides, Dawn | S1.5 | A full night runs unattended | Progression start / complete | Timer test | Server-owned state | — |
| S1.7 | Banner and objective HUD, Motion module (Banner, Pop) | S1.6 | One state channel; no overlapping popups | — | Visual check | — | — |

### M2 — Vertical slice (co-op, persistent, instrumented)
**Decision it informs:** does the full loop (with friends, chaos, and the report) clear the closed-test thresholds?

| ID | Goal | Depends on | Accept when | Telemetry | Tests | Security |
|---|---|---|---|---|---|---|
| S2.1 | Crates, warehouse, Supplies | S1.5 | Carry and deliver; crates left behind auto-collect at 50% at tide end | Economy (Supplies source) | E7 | Server carry ownership and timing |
| S2.2 | Mimic reveal and rampage blob, net (3 hits) | S1.5 | Blob bounces crates and players; netting returns it to the sea | `mimic_docked`, `mimic_netted` | E5 | Server network owner; Swing validation |
| S2.3 | Integrity and early-fail path | S2.2 | Fail at 0 pays 50% and shows the Log | Progression fail | Unit | Server |
| S2.4 | Tide-break pads (3 upgrades) | S1.6 | Majority choice applied; ties go to random | `upgrade_pick` | Multi-client | Server touch regions |
| S2.5 | Harbor Log (clipboard) | S1.6 | Stats, Best call, rank bar, next goals; skippable | — | Visual | — |
| S2.6 | DataService (ProfileStore, schema v1, migrations) | S0.2 | Load, save, release; outage mode works | — | Migrations, E12, E13 | Session lock |
| S2.7 | Payout, XP, rank 1–10, Logbook (10 entries), Listening Trumpet | S2.5, S2.6 | Night payout saved once; rank-up celebration | Economy and progression | Payout caps, E11 | Server only |
| S2.8 | FTUE: auto-equip spyglass, guaranteed early mimic, contextual tips, funnel steps 1–10 | S2.7 | A fresh account reaches step 10 | Onboarding funnel | Fresh-account run | Telemetry rate limit (E14) |
| S2.9 | Ping wheel | S1.7 | 5 pings, shown in the world, crew-only | `ping` | E6 | Validation and rate limit |
| S2.10 | Crew scaling and multi-client sync | S1.6 | Spawn gap scales with crew size; late joiners see the correct state | — | 4-client test, E10 | Server state |
| S2.11 | Mobile and controller pass | S2.1–S2.9 | All actions are possible on a phone and on a gamepad; safe areas respected | — | Device test | — |
| S2.12 | Intro A/B (none vs 8 s glide) | S2.8 | Variant stored in the profile and logged | Custom `intro_variant` | — | — |
| S2.13 | Placeholder audio and VFX, Motion module (all 6), reduced motion | S1.7 | Settings toggle works | — | Visual | — |
| S2.14 | Grief controls (cooldown after 4 or more wrong calls) | S1.5 | Cooldown applies and shows | `grief_cooldown` | E9 | Server |

**Vertical slice = M1 + M2.** Cut from the slice: shop, purchases, Cabin, tells, special visitors, daily bounties, weekly conditions, leaderboards, final art.

### M3 — Closed playtest (20–30 testers aged 16+, on the published private test place)
- **Stories:** test-place publish (owner); recruitment and consent (`qa-and-security-plan.md` §5); a 6-question form; Claude analysis of telemetry and notes.
- **Go/no-go:** the thresholds in `launch-liveops-and-metrics.md` §3. A miss after 2 FTUE iterations triggers the pivot to Tide Runners (D-002).

### M4 — Retention and economy iteration
- Count, Pair and Time rule types.
- 6 tells (Tide 3).
- Special visitors.
- Daily bounties.
- Ranks to 30, plus the Signal Lamp and Long Spyglass.
- Economy rebalance against the archetype model.
- **Decision it informs:** does the week-1 cohort reach rank 7 and return?

### M5 — Beta
- Keeper's Cabin, Coin cosmetics, and the weekly Harbor Market (true timer).
- Shop UI; passes and products from the economy doc; PurchaseService.
- Flags and kill switches; badges; the first weekly night condition.
- Maturity questionnaire; RTBF deletion templates.
- Art pass: harbor build (specialist), ships, mimic mesh, icon and thumbnails.
- **Decision it informs:** do purchases work end to end, and does the like ratio hold at ≥ 85%?

### M6 — Launch candidate
- Performance pass against the budgets.
- Full exploit suite E1–E14.
- Kids and Select prerequisites (ID, 2SV, age check, the 1,000 R fee or Premium).
- Launch materials.
- A plan to reach 250–500 highly engaged players.

### M7 — Live operations
- The weekly cadence and experiment loop in `launch-liveops-and-metrics.md`.

## 5. Critical path
S0.1/S0.2 → S1.1 → S1.2 (readability) → S1.5 → S1.6 → S2.6 → S2.7 → S2.8 → S2.10 → M3.

**Readability (S1.2) and the FTUE (S2.8) are the two thesis risks.** Test them first and cheaply.

## 6. Spikes and unknowns
| Spike | Question | Time box |
|---|---|---|
| SP1 | Can primitive ships plus fog stay readable on a phone at 60 studs? | 1 session (with S1.2) |
| SP2 | A blob with server network ownership: smooth enough for 6 players on mobile? | 1 session (before S2.2) |
| SP3 | Does ProfileStore's source pass audit? | 1 session (before S2.6) |
| SP4 | Official Studio MCP: can it run a multi-client test and capture output? | 1 session (S0.1) |

## 7. Risk register
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rules too hard for new players | Medium | High | Icon rules, 1 rule on night 1, rank-gated rule types |
| Readability on phones | Medium | High | SP1, colourblind patterns, spyglass icons |
| Cold start (empty servers) | High | Medium | The game is designed to work solo; ship pace scales |
| Kids and Select gate slows growth | High | Medium | Teen and adult appeal; plan for 250–500 highly engaged players |
| "Anomaly trend" association | Medium | Low | Distinct name and tone |
| Owner time (playtesting) | Medium | High | Short sessions, scripted tests, Claude analysis |
| Solo scope creep | High | High | The cut list below; one milestone at a time |

## 8. Cut list (cut in this order if late)
1. Leaderboards
2. Subscription
3. Special visitors
4. Weekly conditions
5. Signal Lamp and Long Spyglass
6. Pair and Time rules
7. Early-access passes
8. Intro A/B

**Never cut:** server authority, data safety, purchase idempotency, mobile and controller support, the FTUE funnel telemetry.

## 9. Rough timeline (estimate, not a commitment)
| Milestone | Estimate |
|---|---|
| M0 | 1 session |
| M1 | about 1–2 weeks |
| M2 | about 3–4 weeks |
| M3 | 1–2 weeks |
| M4 | about 2–3 weeks |
| M5 | about 3–4 weeks |
| M6 | about 1–2 weeks |

This assumes the owner spends about 1 hour a day reviewing and playtesting. Re-estimate after M1.

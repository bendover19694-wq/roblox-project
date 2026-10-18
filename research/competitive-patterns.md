# Competitive patterns: index and synthesis

There are 16 pattern cards in `pattern-cards/`, one page each and all in the same 11-section format. Stats come from the Roblox public API (Observed, 2026-10-17 16:29 UTC). Everything about loops and the first-time experience is **Inferred**, from official descriptions, guides, creator videos and prior knowledge. **None of the games has been played by us yet.** The owner's fresh-account playtests will correct the cards.

## Coverage
| Category | Cards | Rising / new? |
|---|---|---|
| Idle / collection / economy | [Grow a Garden](pattern-cards/grow-a-garden.md), [Pet Simulator 99](pattern-cards/pet-simulator-99.md), [Fisch](pattern-cards/fisch.md), [+1 Stone Skipping](pattern-cards/plus-one-stone-skipping.md) | Stone Skipping (2026-09-05) |
| High social chaos / trading | [Steal a Brainrot](pattern-cards/steal-a-brainrot.md), [Steal An Egg](pattern-cards/steal-an-egg.md) | Steal An Egg (2026-07-25) |
| Co-op survival / tension | [99 Nights in the Forest](pattern-cards/99-nights-in-the-forest.md), [Dead Rails](pattern-cards/dead-rails.md), [Animal Hospital (Anomaly)](pattern-cards/animal-hospital-anomaly.md) | Animal Hospital (2026-05-10) |
| Long-term mastery / combat | [Blox Fruits](pattern-cards/blox-fruits.md), [Jujutsu Shenanigans](pattern-cards/jujutsu-shenanigans.md) | — |
| Social roleplay / expression | [Brookhaven RP](pattern-cards/brookhaven-rp.md), [Dress To Impress](pattern-cards/dress-to-impress.md) | — |
| Short-round competition | [Murder Mystery 2](pattern-cards/murder-mystery-2.md), [RIVALS](pattern-cards/rivals.md), [Huss Valley](pattern-cards/huss-valley.md) | Huss Valley (2026-08-31) |

The set includes 4 games launched in 2026 and growing now.

## Scorecard (Inferred, 1–5)
Durability = evidence of holding CCU beyond 6 months. Solo feasibility = whether one creator could build a similar-scope MVP.

| Game | Durability | Skill expression | Social pull | Ethical monetization | Solo feasibility | Saturation (5 = worst) |
|---|---|---|---|---|---|---|
| Grow a Garden | 2 | 1 | 3 | 3 | 4 | 5 |
| Pet Simulator 99 | 3 | 1 | 3 | 1 | 2 | 5 |
| Fisch | 4 | 3 | 2 | 4 | 3 | 3 |
| +1 Stone Skipping | ? (new) | 1 | 1 | 3 | 5 | 5 |
| Steal a Brainrot | 1 | 1 | 4 | 1 | 4 | 5 |
| Steal An Egg | ? (new) | 2 | 4 | 3 | 3 | 5 |
| 99 Nights | 4 | 3 | 5 | 4 | 2 | 3 |
| Dead Rails | 2 | 3 | 4 | 4 | 2 | 2 |
| Animal Hospital | ? (new) | 3 | 4 | ? | 4 | 3 (rising) |
| Blox Fruits | 5 | 4 | 3 | 2 | 1 | 4 |
| Jujutsu Shenanigans | 4 | 5 | 3 | 5 | 2 | 4 |
| Brookhaven | 5 | 1 | 5 | 5 | 2 | 4 |
| Dress To Impress | 4 | 3 | 5 | 5 | 3 | 3 |
| Murder Mystery 2 | 5 | 3 | 5 | 3 | 4 | 3 |
| RIVALS | 4 | 5 | 4 | 4 | 2 | 3 |
| Huss Valley | ? (new) | 4 | 4 | 4 | 4 | 2 (rising) |

**Read:**
- High durability comes with **social rules plus skill or co-op**: MM2, RIVALS, 99 Nights, DTI, JJS.
- The best combination of solo feasibility and low saturation sits in **round-based social or skill games with simple verbs** (Huss Valley, MM2-style) and **judgment-based co-op jobs** (Animal Hospital-style).

## Cross-cutting patterns (the reusable library)
| # | Pattern | Seen in | Player need served |
|---|---|---|---|
| P1 | Zero-wait join into live action | Huss Valley, JJS, RIVALS pads | Instant competence and fun. Guards against bounce under 60 s |
| P2 | Failure flips your role instead of benching you | Huss Valley, MM2 spectating | Keeps the losing player engaged |
| P3 | A one-line promise and a one-line control grammar | 99 Nights, JJS, Huss Valley ("RUN!!") | Clarity. Improves PTR |
| P4 | Diegetic UI (the world shows the state) | Steal a Brainrot conveyor, 99 Nights fire radius, Animal Hospital terminals, RIVALS pads | Low UI load and readability on mobile |
| P5 | Next goal stamped on the world ("need X") | Steal An Egg biome gates, Stone Skipping portals | Visible next goal |
| P6 | Run → safe-zone return → invest | Steal An Egg, Dead Rails, 99 Nights | Tension and relief rhythm |
| P7 | Run resets, meta persists | 99 Nights, Dead Rails | Replayable sessions without inflation |
| P8 | Shared timed world events | Grow a Garden weather and restock | Reasons to return. Shared moments |
| P9 | Create under constraint, then present, then peer vote | DTI | Expression and recognition |
| P10 | Hidden or asymmetric roles in short rounds | MM2, Animal Hospital (judging) | Suspense and social drama |
| P11 | Judgment as the core verb (inspect, decide, consequence) | Animal Hospital | Mastery through observation. Group debate |
| P12 | One input, long watchable physics payoff | Stone Skipping throw, Steal a Brainrot flings | Clippability |
| P13 | Skill minigame inside a collection loop | Fisch | Skill plus collection |
| P14 | Procedural variation multiplies a small art set | Fisch (400k variations), Steal An Egg mutations | Low content burden |
| P15 | Pay on loss, with end-of-match rewards for everyone | Huss Valley | Retention for losers |
| P16 | Physical matchmaking pads in a social lobby | RIVALS | Spectating plus social proof |
| P17 | Cosmetic and QoL-only monetization, early access as a perk | JJS, DTI, Brookhaven | Ethical revenue |
| P18 | Cheap stacking entry products (25 R) | Stone Skipping | Gets players past the first-purchase threshold. **Use transparently** |

## Patterns we reject
- Paid luck multipliers and paid random loot as core revenue (PS99, Steal a Brainrot Lucky Blocks). This conflicts with our ethics rule and needs a policy check.
- Player-vs-player theft of persistent collections (Steal a Brainrot, Steal An Egg). It distresses children, is saturated, and decays.
- 2× money multiplier passes and admin-command passes. Pay-to-win perception.
- Anime-IP-adjacent identities (Blox Fruits, JJS). Legal and originality risk.
- "Steal a ___" and "+1 ___" title templates. Saturated, and confusingly similar identities.

## Concept direction hypotheses
These are inputs to concept scoring, not decisions.
1. **Judgment co-op job** (P11 + P7 + P14 + P4): an original setting, procedurally generated "tells", shift runs with persistent roles.
2. **Movement or skill round game** (P1 + P2 + P15 + P16 + P12): an original non-violent chase or contest with role flips and a physics payoff.
3. **Create-and-judge contest** (P9 + P12 + P17) on a non-fashion object, such as contraptions or builds tested by physics.
4. **Expedition with a shared moving or expanding safe zone** (P6 + P7 + P8 + P5).
5. **Tempting but saturated (to reject):** a steal-and-collect or "+1" variant.

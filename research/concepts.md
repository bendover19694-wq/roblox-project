# Concept options (2026-10-17)

**Status:** proposal. Nothing gets built until the owner approves a concept.

**Inputs:**
- `video-notes/takeaways.md` (13 constraints)
- `market-snapshot.md`
- `competitive-patterns.md` (P1–P18 pattern library)
- `monetization-policy.md`
- `ui-motion-audit.md`

## Assumptions (conservative defaults; the owner has not overridden them)
- Solo creator. Close to $0 for art and audio. Beginner-to-intermediate Luau, with Claude Code (Opus 5.5) as the main coding partner.
- **Launch audience is 16+.** Kids and Select eligibility comes later, after the HEP evaluation (see the policy check).
- Content target: Minimal or Mild maturity. No paid random items. No soft-currency sales.
- Commercial intent with ethical monetization. No paid ads until the organic funnel works.

## Hard filters (any failure removes a concept)
1. Not a steal / base-raid game, a "+1" incremental, or an anime-IP fighter (saturated or legally risky).
2. A first meaningful action within 15 s, with no menu wall.
3. Friends make it better: the co-play days signal.
4. One person can build the MVP in roughly 8–12 weeks.
5. It must answer two questions: what is the *proven reason to play*, and what is *only ours*.

---

## Concept A — **Fogbell Harbor** (working title)
**Pitch:** *Keep a foggy harbor with your friends. Check every ship against tonight's rules, let the real ones dock, and ring the fog bell on the mimics.*

| | |
|---|---|
| Proven reason to play | Judgment co-op under escalating pressure (Animal Hospital: 2.44B visits in 5 months), a run-based night with a persistent meta (99 Nights), a run-end report (Animal Hospital). |
| Only ours | **Rules generated fresh each night** from a grammar of ship parts, so the puzzle never repeats. **Physical comedy when you're wrong:** a mimic that gets in becomes a slippery sea-blob that knocks crates and players into the water until the crew nets it. A whimsical coastal mystery, not horror. No Roblox competitor found. Off-platform, several lighthouse/ship-identification games share the premise, so we avoid their names, art, and horror framing. |
| Core action (10–20 s) | A ship emerges from the fog → inspect 2–3 tells (spyglass for the flag and hull, a light-blink rhythm, the horn pattern) → compare against the in-world **Tonight's Rules** board (icon-based) → pull **Open Gate** or ring the **Fog Bell**. |
| Success / failure | A correct dock unloads cargo crates that you carry to the warehouse (light physics, earns materials). A wrongly admitted mimic causes a rampage on the dock (ragdoll flings, the clippable moment) and a 30 s net-the-blob scramble. A wrongly refused ship produces a comic "complaint letter" and lost cargo. |
| Night structure | About 10–12 min per night, in 3 tides. Each tide adds one rule and speeds up arrivals. The night ends with a **Harbor Log** report: ships docked, mimics stopped, crates saved, best call. |
| Roles (emergent, never forced) | Spotter (spyglass), Signaller (lights and horn), Gatekeeper (levers), Dockhand (crates and nets). Tools hang on racks. Solo play works at a slower ship rate. |
| Communication | A ping wheel ("Mimic!", "Real!", "Look here", "Help!"). No text chat is needed, which helps safety and fits younger tiers later. |
| 28-day meta | Keeper rank (Deckhand → Harbormaster). A **Logbook** collection of ship variants and mimic tells. Harbor upgrades that change gameplay (a longer-range lens, a second gate for parallel ships, a crane). **Weekly shared conditions** (a storm night, an aurora night) as a global event. Later, new coasts that add new rule families. |
| Skill expression | Observation speed, applying rules under pressure, team coordination. None of it can be bought. |
| Social story | "I let a mimic in and it bounced Sam off the pier." Arguing over whether a ship is real is the co-play. |
| Monetization fit | Cosmetics only: lantern colours, keeper outfits, horn sounds, dock decorations, emotes, ping skins. Private servers. Later, a supporter subscription and a cosmetic "harbour fireworks" consumable that everyone sees. |
| Art burden | Low. **Fog hides distance detail.** Ships are modular primitives (hull × sail × flag × figurehead × lights) that produce hundreds of variants from about 20 parts. The mimic is one blob rig. |
| Main risks | Reading the rules could overload new players (mitigate: icon rules, the first night teaches one rule). Association with the "anomaly" trend (mitigate: a distinct tone and name). Griefers pulling the wrong lever (mitigate: when 3+ players are present, the gate needs a 1 s hold and is undoable during the ship's approach). Procedural rule balance. |

## Concept B — **Tide Runners** (lower-risk alternative)
**Pitch:** *Cross the beach between waves and grab shells on the way, or join the Tide and wash everyone out.*

| | |
|---|---|
| Proven reason to play | The playground-crossing round game (Huss Valley: 141M visits in 7 weeks), a role flip on failure (P2), momentum movement (P1), pay on loss (P15). |
| Only ours | **An indirect antagonist.** The Tide player doesn't tag anyone. They pick lanes and time waves from the cliff. Washed-out runners become **Foam**, which slows the remaining runners. **A greed loop:** shells are worth more nearer the waterline. Ragdoll washouts give clippable moments. |
| Core action | Sprint, dodge, and dive between dunes. Each crossing takes 10–20 s. |
| Meta | Shells buy boards, trails, and emotes. Mastery titles. Seasonal beaches. |
| Risks | **The closest to a rising hit, so originality and saturation risk are higher.** Round games need a full server, so a new game has a cold-start problem (mitigate: AI Foam fillers). D8–28 depth depends on movement mastery plus cosmetics. |
| Why lower risk | Smallest build: one map, movement, wave physics, round flow. The fastest way to playtest-validate. |

## Concept C — **Contraption Cup**
**Pitch:** *Get a theme and a 3-minute kit, build a contraption, then watch every team's attempt fail spectacularly (or win) live.*
- Proven reason to play: create under constraint, then present and vote (DTI, P9), plus a physics payoff (P12).
- Only ours: scoring is partly **objective physics** (did the egg survive?), which blunts troll votes.
- Risks:
  - building UI on mobile is hard
  - user-built shapes need moderation
  - physics exploits and lag
  - a first minute of building is slow to reach fun
  - Build a Boat for Treasure is an established neighbour

## Concept D — **Skycatchers**
**Pitch:** *Chase living storms across a sky-island map with your crew and bottle lightning, hail, and tornado cores before they fade.*
- Proven reason to play: shared timed world events (P8), a skill minigame inside collection (P13, Fisch), procedural variants (P14).
- Only ours: storms are the collectible, and they **move**, so the whole server converges on the same event.
- Risks:
  - VFX- and vehicle-heavy, which is the highest art and performance burden for mobile
  - open-map streaming
  - a niche storm-chasing sim (TwisterX) exists

## Rejected (tempting but saturated) — **Steal a Shooting Star**
"Catch falling stars, place them on your sky-island for income, steal other players' stars, +1 brightness per second."
- Why it's tempting: it matches the #1 game's formula (Steal An Egg, about 3.6M playing) and the rising "+1" template, and it's cheap to build.
- Why it's rejected:
  - Saturation: a clone tracker exists, and Break and Steal an Egg is already #17.
  - The proven decay curve is 90–99% (Steal a Brainrot, Grow a Garden).
  - Roblox is publicly steering discovery away from it.
  - Theft of collections distresses children.
  - It realistically depends on paid random items or currency packs to monetize, which our ethics rule forbids.
  - Tizzy's own derivative died in about a month.

---

## Scorecard
Every criterion is scored so that **5 means favourable for us**. For the risk and burden rows, 5 means the lowest risk or burden. These are judgment calls, Inferred from the research. The weights favour durability and solo feasibility.

| Criterion (weight) | A Fogbell Harbor | B Tide Runners | C Contraption Cup | D Skycatchers | ✗ Steal a Star |
|---|---|---|---|---|---|
| Clarity (×1) | 4 | 5 | 4 | 4 | 5 |
| Originality (×2) | 4 | 3 | 3 | 4 | 1 |
| Viral / social potential (×1) | 4 | 4 | 5 | 4 | 4 |
| First-session fun (×2) | 4 | 5 | 3 | 4 | 4 |
| D1/D7 return potential (×2) | 4 | 3 | 4 | 4 | 2 |
| Mobile feasibility (×1) | 4 | 4 | 2 | 3 | 4 |
| Build complexity (×2) | 3 | 4 | 2 | 2 | 4 |
| Art/animation burden (×1) | 4 | 4 | 4 | 2 | 3 |
| Content burden (×1) | 4 | 4 | 4 | 4 | 3 |
| Moderation / safety (×1) | 5 | 4 | 2 | 5 | 2 |
| Exploit risk (×1) | 4 | 3 | 2 | 3 | 2 |
| Monetization fit (ethical) (×1) | 4 | 4 | 4 | 4 | 2 |
| Saturation risk (×2) | 4 | 2 | 4 | 4 | 1 |
| **Unweighted total /65** | **52** | **49** | **43** | **47** | **37** |
| **Weighted total /90** | **71** | **66** | **59** | **65** | **49** |

**Score rationale (the short version):**
- **A** loses a point on build complexity (procedural rules plus physics comedy plus a co-op state machine), but it's strongest on originality, safety, and depth over 28 days.
- **B** has the best first minute and the cheapest build. Its saturation and originality scores are real penalties, and round games suffer cold-start when servers are empty.
- **C** has a superb viral ceiling, but mobile building, moderation, and exploits are serious for a solo creator.
- **D** is a strong fantasy, but VFX, vehicles, and an open map are too heavy for a solo MVP.

## Recommendation
**Build Concept A, Fogbell Harbor.**

Why:
- It fits every hard constraint:
  - a 16+ launch audience, since judgment and anomaly games skew teen and adult on Steam and YouTube
  - Minimal or Mild content
  - co-play as the core interaction
  - a clippable failure state
  - procedural content for a solo creator
  - cosmetics-only monetization
- No Roblox competitor holds this space.

**Lower-risk alternative: Concept B, Tide Runners.** Take it if the owner wants the fastest path to a playable test, and accepts higher saturation risk.

## How we'd validate A before scaling (closed test, 20–30 players aged 16+)
| Metric (proposed threshold) | Decision it informs |
|---|---|
| First ship decided within 30 s by ≥80% of new players | Whether the FTUE is clear |
| ≥60% correct calls in tide 1 | Whether rule difficulty is right |
| Leaving within 60 s below 30% | Whether the intro and first action work |
| ≥70% of players finish night 1 | Pacing |
| ≥25% return for a second session within 48 h | Proxy for D1 |
| "Would play this with friends" ≥4/5 | The co-play thesis |
| Mimic rampage rated the funniest moment by ≥40% | The clip thesis |

**Kill or pivot rule:** if the first-minute and finish thresholds miss after 2 FTUE iterations, pivot to Concept B, reusing the movement, round, and telemetry code.

## Decision needed from the owner
Approve A, approve B, or redirect. After approval comes the full design bible (`docs/`, 13 files), the vertical-slice plan, and the milestone backlog. Still no code before you say "approve the vertical slice".

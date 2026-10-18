# Game design document — Fogbell Harbor

All numbers below are **starting hypotheses** that the closed test will tune. Config lives in `src/shared/Config/` (see `technical-architecture.md`).

## 1. Pitch and frame
- **Pitch:** Keep a foggy harbor with friends. Check every ship against tonight's rules, dock the real ones, and ring the fog bell on the mimics.
- **Server:** one harbor per server, up to **6 players**. Solo play works because ship pace scales with crew size.
- **Session:** a night lasts about 10–12 min, and a typical session is 2–3 nights (25–35 min). That stays under the 60-minute playtime credit cap.
- **Content maturity:** Mild (cartoon slapstick only).

## 2. Core loop (minute to minute)
```
Ship emerges from fog (approach ≈ 15 s to the "last buoy")
  → Inspect: spyglass (flag, hull, sail, figurehead), watch the lantern rhythm, listen to the horn
  → Compare with the Tonight's Rules board (icons)
  → Decide: hold the GATE lever (dock) or ring the FOG BELL (turn away)
  → Outcome:
      Real + docked     → 2–3 cargo crates on the pier → carry to the warehouse → Supplies + personal Coins/XP
      Mimic + bell      → mimic reveals, sinks with a "blorp" → bonus + Logbook entry
      Mimic + docked    → RAMPAGE: blob bounces crates and players, the crew nets it (3 hits), harbor integrity drops
      Real + bell       → comic complaint letter pinned to the board, cargo lost
  → Next ship
```
- **No decision before the last buoy means the ship docks.** Inaction is a choice, which keeps tension on.
- Both the gate and the bell need a **1 s hold**. Opening the gate is provisional, and the bell can still override it until the ship passes the last buoy. **Ringing the bell is final:** the ship turns away at once, which gives instant feedback. (Changed while building M1; see D-009.)

### Night structure
| Phase | Rules active | Ships | Spawn gap (4–6 crew / solo) | Mimic share |
|---|---|---|---|---|
| Dusk (Tide 1) | 1 | 4 | 25 s / 35 s | 30%, with at least 1 mimic in the first 3 ships |
| Tide break 1 | — | — | 20 s | Crew picks 1 of 3 harbor upgrades by standing on a pad |
| Midnight (Tide 2) | 2 | 5 | 20 s / 30 s | 35% |
| Tide break 2 | — | — | 20 s | Upgrade pick |
| Small hours (Tide 3) | 3, plus 1 visual "tell" | 6 | 15 s / 25 s | 40% |
| Dawn | — | — | — | **Harbor Log** report, then 30 s in the Keeper's Cabin, then the next night |

**Harbor integrity** (shared, 100): each rampage costs 25 and each mis-turned real ship costs 5. At 0 the night ends early. The Harbor Log still shows and pays 50%, so failure always yields progress.

### Rule grammar (generated per night)
- **Ship attributes:** hull colour (6), sail shape (3), flag (6 colours × 3 patterns), lantern rhythm (1–4 blinks), horn pattern (short/long sequences), figurehead (4), cargo marking (4).
- **Rule types:**
  - **Require:** "only blue flags"
  - **Forbid:** "no triangle sails"
  - **Count:** "lantern blinks exactly 3"
  - **Pair:** "red hulls must sound 2 long horns"
  - **Time:** "fishing boats only before midnight"
- **Real ships always satisfy every active rule. Mimics break at least one.** From Tide 3, a mimic may instead show a **tell**: a flag flying against the wind, no reflection, a crew waving in perfect sync, a sail patch that drifts.
- Every rule renders as an **icon card** (shape and colour, colourblind-safe), with text only as an optional subtitle.
- **Generator constraint:** validate that each night's rules are satisfiable and that at least 40% of the part space is legal. This is unit-tested.

### Failure and recovery
- Wrong calls never kill progress. They create chaos, cost integrity, and turn into a team task.
- A player bounced into the sea swims to a ladder (about 6 s) and can **ping from the water** on the way back.
- A night that fails early still pays 50% and shows which ship fooled the crew. That is a learning moment.

### Challenge curve
- Night difficulty comes from the crew's median rank, which sets tells unlocked, rule types allowed, and the spawn gap. It is capped so mixed crews stay fair.
- Ranks 1–3: Require and Forbid rules only. Ranks 4–8: Count rules added. Rank 9+: Pair and Time rules and tells.

## 3. First-time user experience
| Time | Sees | Does | Earns | Understands | Chooses |
|---|---|---|---|---|---|
| **0–15 s** | Dusk pier, fog. The first ship is already blinking at mid-distance. The Rules board shows **one icon** (blue flag ✓). Banner: "Is this ship allowed in?" | The spyglass is **already equipped**. A one-line prompt: "Look at its flag" | — | "Ships come in. The board says which are OK." | — |
| **15–60 s** | The flag colour, the glowing GATE lever and the FOG BELL | Holds the lever or rings the bell | Coins tick and "Nice call!", or an immediate funny consequence | "My call matters, and wrong is funny." | **Dock or turn away**: the first meaningful choice, within a minute |
| **1–5 min** | A guaranteed early mimic. Crates on the pier with an in-world arrow to the warehouse. A second rule icon slides onto the board at Tide 2 | Rings the bell on a mimic (first-mimic **celebration** and Logbook entry), or nets a rampaging blob (net auto-handed, plus a contextual tip). Carries crates | Coins, XP, Supplies, first Logbook stamp | Two rules can stack. The crew works together | **Tide-break upgrade**: stand on one of 3 pads (Brighter Lamp / Second Gate / Faster Crane) |
| **5–30 min** | Dawn Harbor Log: crew stats, "Best call", personal rank bar | Finishes night 1, plays nights 2–3, opens the Keeper's Cabin (cosmetics wall, Logbook shelf) | Rank 2–3 titles, 6–12 Logbook entries, daily bounty progress | The Logbook has gaps, and ranks unlock new tools and rules | Equip an earned cosmetic. Accept or decline a friend invite prompt (once, after night 1) |

### Contextual tutorials (one at a time, fired by triggers)
| Trigger | Tip |
|---|---|
| First mimic docked | "Net it! 3 hits sends it back." |
| First Tide 2 | "Two rules now. A ship must pass both." |
| First lantern rule | "Count the blinks." |
| First horn rule | "Listen: short or long?" |
| First Tide 3 tell | "Something's off… flags fly *with* the wind." |
| Integrity under 50 | "Too many mimics. Check before you dock!" |
| First Cabin visit | "Your Logbook fills as you spot new ships." |
| Rank 4 | "New tool: Listening Trumpet." |

There is no tutorial wall, and the shop is never opened automatically.

### Intro A/B
- Variant A: none.
- Variant B: an 8 s skippable camera glide from the lighthouse to the pier, with the title card.
- Measured on both bounce windows.

## 4. Meta progression (persists)
- **Keeper rank, 1–30.** Titles run from Deckhand to Harbormaster. XP comes per night from crew score plus personal contributions. Ranks unlock:
  - **Tools:** Listening Trumpet (rank 4), Signal Lamp (rank 7, asks a ship to repeat its blink), Long Spyglass (rank 10)
  - new rule types
  - cosmetics
- **Logbook:** one entry per part variant seen, mimic tell caught, and special visitor met. Collection milestones award cosmetics (a frame, a lantern colour).
- **Special visitors:** rare real ships with silly cargo (a ferry full of seagulls). Dock them correctly for a Logbook stamp. They are free and gameplay-earned, so not a paid random item.
- **Daily bounties:** 3 per day ("Ring the bell on a mimic with a crooked mast"). They reset at 00:00 UTC on a true, non-restarting timer.
- **Badges:** a handful (First Night, First Mimic Stopped, Perfect Night, Logbook 50%).
- **No rebirth or prestige.** Mastery is skill. Rank gates content, not power.
- **Anti-grind:** rank XP needed grows gently (about 1.15× per rank). The first night each day earns 2× XP, presented as a bonus with no streak penalty. Nights are 10–12 min.

## 5. Run-scoped progression (resets each night)
Tide-break upgrades, paid for with the crew's Supplies:
- **Brighter Lamp** (+20% inspection range)
- **Second Gate** (two ships at once)
- **Faster Crane** (crates auto-move)
- **Sturdy Pier** (+25 integrity)
- **Bell Echo** (a correct bell reveals the next ship's lantern early)

Picking one is a crew decision.

## 6. Content plan (templates, so content is added through config)
| Template | Fields | Added by |
|---|---|---|
| ShipPart | slot, id, builder (primitives), icon, rarity weight | config entry plus a builder function |
| RuleTemplate | type, attribute(s), values, icon builder, min rank, difficulty | config |
| MimicTell | id, visual effect, min rank, difficulty | config plus an effect module |
| NightCondition | id, fog density, speed modifiers, visitor pool, schedule | config |
| Coast (later) | map variant, part pool, rule families | new map plus config |
| Cosmetic | slot, id, source (coins/badge/purchase), price | config |

**Launch content target:** 20 ship parts (about 2,000+ combinations), 12 rule templates, 6 tells, 3 night conditions, 1 coast, 30 cosmetics.

## 7. Social plan
- **Friend onboarding:** standard Roblox join-friend. One `SocialService:PromptGameInvite` offer after night 1. It is neutral and never repeats in that session.
- **Party flow:** friends land in the same harbor. Private servers come cheap (see the economy doc).
- **Communication:** a ping wheel ("Mimic!", "Real!", "Look here", "Help!", "Nice!"). Pings show in the world, so no chat is needed.
- **Status and flex:** rank title over the head, cosmetics, and "Best call" on the Harbor Log.
- **Leaderboards (post-slice):** a weekly "Perfect Nights" board via OrderedDataStore, and per-server crew records.
- **No trading at launch**, so no scam surface.
- **Grief controls:**
  - the 1 s hold on both controls; the gate can be overridden by the bell until the last buoy
  - a 20 s lever cooldown for a player with 4 or more wrong calls in a tide
  - Roblox's built-in vote and report tools
- **Clippable moments:** the mimic reveal ("blorp"), the rampage with players bouncing into the sea, and a last-second bell ring.

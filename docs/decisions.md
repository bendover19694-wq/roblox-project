# Decisions log

Format: ID · date · decision · why · alternatives rejected · status.

## D-001 · 2026-10-17 · Fogbell Harbor is feasible with Claude Code (Opus 5.5) as the main coder
**Owner question:** can AI really build this?

**Verdict: yes, as a partnership. AI cannot build it alone.** Most of this game's difficulty is **logic and systems**, where Claude is strong:
- rule generation
- the night state machine
- server-authoritative judgment
- data and purchases
- UI built in code
- tests

A smaller share is **feel and look**, where a human must judge: ship readability, chaos timing, fog mood, and fun. Fog plus primitive ships keeps the art burden within reach.

| Work | AI capability (Opus 5.5 plus the official Studio MCP) | Human role |
|---|---|---|
| Luau systems, data, purchases, security, tests | High. Writes, runs, and reads console output through the MCP | Reviews at milestones |
| Procedural ships from primitives, greybox map | Medium-high | Judges readability |
| UI in code (tokens, tweens, states) | High | Taste check |
| Feel tuning (timings, blob physics, camera) | Medium. Can expose knobs and propose values | **Decides** by playing |
| Final art, icon, music | Low-medium (briefs and placeholders) | Makes or commissions |
| Real multiplayer fun, community | None | **Owns** |

**Why this concept suits AI better than Tide Runners:** Tide Runners lives or dies on movement feel, which is tuning-heavy and hard for an AI to judge. Fogbell Harbor lives on rule logic and readability, which an AI can unit-test, plus one visual check per part.

**Preconditions:**
- The official Studio MCP (S0.1).
- File-based code with Rojo and git (S0.2).
- A private test place (S0.3).
- About 1 hour a day of owner playtesting.

**Status:** accepted by the owner ("if you think they have, then proceed", 2026-10-17).

## D-002 · 2026-10-17 · Concept: Fogbell Harbor (A). Fallback: Tide Runners (B)
- **Why:** highest weighted score (71/90); no Roblox competitor; fits the 16+ launch gate, co-play signals, and ethical monetization. Details: `../research/concepts.md`.
- **Pivot trigger:** M3 thresholds missed after 2 FTUE iterations → Tide Runners, reusing the round, telemetry, and data code.
- **Rejected:** Contraption Cup (mobile building, moderation), Skycatchers (art and VFX load), Steal a Shooting Star (saturated, ethics).
- **Status:** accepted.

## D-003 · 2026-10-17 · Code is file-based (Rojo plus git); the world is built in Studio
- **Why:** Claude edits files reliably, diffs are reviewable, and rollback is a git revert.
- **Alternative:** Studio-only. Rejected because Claude would have to edit through MCP calls, which are harder to review or roll back.
- **Status:** **proposed**. The tool installs need owner approval (S0.2).

## D-004 · 2026-10-17 · Replace the community Roblox MCP with the official Studio MCP
- **Why:** the current `~/.mcp.json` entry runs `npx -y @jamesworkbenchcrm/roblox-studio-mcp`. It is unpinned and third-party, with `execute_luau` and `delete_instance` access to open places. The official server is built into Studio (Creator Hub page updated 2026-10-16).
- **Status:** **proposed**. Needs owner approval (S0.1).

## D-005 · 2026-10-17 · No paid random items, no soft-currency sales, no paid power
- **Why:**
  - Ethics rule.
  - Avoids PRI compliance obligations (odds UI, PolicyService branching, UK/BR/AU/BE/NL restrictions).
  - Avoids economy blowouts.
  - Jujutsu Shenanigans, DTI, and Brookhaven show that cosmetics can work.
- **Status:** accepted.

## D-005a · 2026-10-17 · Owner asked to "copy tactics from top converting games"
- **Decision:**
  - **Adopt:** a season pass (Tide Pass), daily tasks, a rotating shop, a Starter Kit bundle with an honest "worth" value, a friend bonus, "new" badges, event quests, and cheap cosmetic entry items.
  - **Reject:** paid crates and gacha, 2× and luck passes, cash packs, and stock-limited items.
  - Full table: `../research/monetization-tactics.md`.
- **Why:** the rejected tactics break the owner's ethics rule from the original brief, and they bring paid-random-item compliance and regional restrictions.
- **Status:** accepted. Revisit only if the owner explicitly overrides the ethics rule.

## D-006 · 2026-10-17 · Target Mild content maturity; launch to 16+ first
- **Why:** new games are 16+-only until the Kids and Select evaluation. Mild keeps the path to Select (9–15) and Kids (5–8) open.
- **Status:** accepted.

## D-007 · 2026-10-17 · Data: ProfileStore pinned by commit, after an audit (fallback: our own wrapper)
- **Why:** proven session locking. Apache-2.0.
- **Risk:** last push was 2025-07-31, so the audit happens in SP3.
- **Status:** proposed.

## D-008 · 2026-10-17 · No external test framework; a tiny in-repo runner
- **Why:** few dependencies; only pure modules are unit-tested; Studio playtests cover the rest.
- **Status:** accepted.

## D-009 · 2026-10-17 · M1 build choices
- **Toolchain:** Aftman, which was already installed, pins Rojo 7.7.0, StyLua 2.6.0, Selene 0.32.0, Lune 0.11.0 and luau-lsp 1.70.1. Rokit was skipped because it would have been a second tool manager doing the same job.
- **Tests:** pure modules use a hand-written Park–Miller PRNG instead of Roblox `Random`, so `lune run tests/run` can test them outside Studio. `luau-lsp analyze` type-checks everything against the Roblox API.
- **Bell is immediate and final; the gate is provisional.** This gives instant feedback, and the bell can still override an open gate until the buoy. The GDD is updated to match.
- **Greybox in code:** `HarborBuilder` builds the harbor, so the prototype runs in an empty place.
- **Rule invariant:** each attribute is used by at most one rule. This guarantees no contradictions and keeps the board readable.
- **Status:** accepted.

## D-010 · 2026-10-17 · M2 build choices and playtest fixes (automated Studio playtests)
**How we test:** Claude drives Studio through its built-in MCP, using `scripts/studio_mcp.py` (a small stdio client; it works without restarting Claude Code). `scripts/sync_studio.py` pushes `src/` into the open place. Probes live in `scripts/probes/`. They walk the character, press keys, swing the net, read state, and take screenshots.

**Playtest findings, all fixed:**
1. **Ships too small to read** at about 200 studs. Ships are now scaled 1.5×.
2. **Night too dark** (ClockTime 18.7). Now 17.8, with brighter ambient light.
3. **Gate lever blocked the view of the lane.** The gate and bell moved to the pier sides.
4. **The crate jetty was cut off from land.** It now runs to the shore, and a crosswalk links it to the pier.
5. **The warehouse "Deliver" prompt didn't appear when the camera faced away** (Roblox only shows prompts that are on screen). Walking a crate to the door now delivers it automatically, with no button.
6. **Mimic knockback (70) flung players far out to sea, and they couldn't climb out.** Knockback is now 45. Truss ladders were added, and anyone in the water for more than 8 s is washed back onto the pier.
7. **Roblox's chat window covered the rules panel.** The objective and rules moved to the top right, and settings moved to the bottom right.
8. **The rules list rendered above the objective title.** The lists now set `SortOrder = LayoutOrder` explicitly.
9. **The bell hid the bottom of the Rules Board.** The board is raised.

**Data:**
- We use our own small session-locked DataStore wrapper (`DataService`), not ProfileStore. That avoids a dependency and an audit.
  - Ceiling: there is no lock hand-off between servers. If players report lost progress after switching servers, move to ProfileStore.
- Outage mode was verified in Studio, because an unpublished place has no DataStores. The game plays normally and the HUD shows "⚠ not saving".

**Status:** accepted.

## D-011 · 2026-10-17 · Pivot: Fogbell Harbor is scrapped; build "Run a Space Agency"
- **Owner direction:** Make a screen-based game like *Run an airline*, because it's easier to make look good and high quality. Decide and build without waiting for approval.
- **Evidence:**
  - We played *Run an airline* hands-on, using the owner's account. See `research/run-an-airline-study.md`.
  - "Run a ___" UI-management games are trending on Roblox: Run a Restaurant about 7.1K playing, Run a Cheer Gym about 4.7K, Run an airline about 4.6K (2026-10-17).
  - There is no space-agency game in this format yet.
- **Why space:**
  - The art can be pure geometry: planets, orbits, arcs, and rockets built from parts in ViewportFrames. That gives a polished look with no image assets.
  - It suits all ages.
- **Fogbell Harbor** is archived in `archive/fogbell-harbor/` (code, tests, docs). Its research stays in `research/`.
- **Monetization (D-005 revised for this concept):**
  - We copy the airline's model: 2× Cash, +50% Launch Speed, Starter Pack, and a 15-minute Server Boost for everyone in the server.
  - This is a single-player idle loop, so there is no player-vs-player fairness to protect.
  - Still no paid random items and no fake timers.
  - Product IDs stay 0, shown as "Coming soon", until the place is published.
- **Status:** accepted (owner instruction).

## D-012 · 2026-10-17 · Space Agency build notes (found by automated Studio playtests)
**Testing:** `scripts/probes/ftue.py` drives the whole first session through the Studio MCP and screenshots every step. `scripts/ui_click.py` clicks real buttons by their text.

**Fixed during playtests:**
1. Roblox's chat window covered the map and swallowed clicks. Chat now starts collapsed.
2. Planet name labels weren't clickable. They are now buttons.
3. The advisor's highlight ring sat 58 px too high, because of the top-bar inset. Its ScreenGui now leaves the inset alone.
4. Some glyphs (➜ ✕) don't exist in Builder Sans and rendered as boxes. They are now → and ×.
5. With no DataStores, the server retried for about 12 s before the first screen appeared. It now fails fast and plays unsaved.
6. The second rocket came too late in a first session. Start cash is now $60K and the Kestrel costs $100K, so it is affordable in about 1–2 minutes.

**Known gaps:**
- Saving and the Welcome-back summary can't be tested until the place is published, because Studio has no DataStores.
- Phone layout: the UI scales down, but small phones need a pass.
- No leaderboards or rival agencies yet.

**Status:** accepted.

## D-013 · 2026-10-17 · Improvements from the Roblox-skills review
**Source:** the owner's reel ("fix AI slop Roblox games in 3 steps") and three open skill packs: EL4CTEO/roblox-skills (MIT), sentinelcore/roblox-skills, MSayib/roblox-dev-skill (MIT). We compared their checklists with our code. Nothing was installed.

**Built:**
1. **Phone layout.** On an iPhone 14 (landscape) text rendered at about 7 pt. Small screens now get a compact layout: a bigger scale on a ~1000×520 design canvas. The HUD stacks on the left; panels and the mission wizard become full-height sheets on the right. The HUD uses `ScreenInsets = CoreUISafeInsets`, so it clears the Roblox top bar and phone notches. Modals shrink to fit short screens. On phones the wizard's pricing step shows the expected profit first.
2. **ProcessReceipt** for the Server Boost product. Idempotent by `R_{UserId}_{PurchaseId}` in the profile (`src/shared/Receipts.luau`, tested). Order: grant, record, save, then `PurchaseGranted`. If saving fails it returns `NotProcessedYet`. The boost stacks: the timer only extends.
3. **Live shop prices** from `GetProductInfoAsync`. Managed and regional pricing means players can see different prices.
4. **Economy analytics** now log every source and sink: trip income (summed and logged about once a minute, to stay under the rate limit), goal rewards, the daily reward, and rocket purchases.
5. **Reduced motion** also follows the device setting (`GuiService.ReducedMotionEnabled`).
6. **Report a problem** in Settings (Roblox Player Support).

**Found by the phone playtest:** no new game bugs, apart from the readability problem fixed above.
- The test tool's simulated taps landed 47 px to the left on a notched phone. Studio's mouse input counts X from the physical screen edge, but GUI positions start at the safe area. `scripts/ui_click.py` now measures and adds that offset (it is 0 on desktop). We first misread this as a touch bug with nested buttons. Every button tested works with correctly placed taps.

**Known limits:**
- Portrait phones aren't tuned. Roblox phones default to landscape.
- The wide rocket catalog shrinks to fit on phones, so its text is smaller there.

**Status:** accepted.

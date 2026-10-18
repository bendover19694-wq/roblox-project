# Technical architecture

Language: **Luau** (`--!strict` in every module).

## 1. Workflow: file-first code, Studio-first world
**Decision (D-003, pending the owner's approval to install tools):**
- **Code lives in files** synced by **Rojo** (7.7.0 installed; 7.7.1 is the latest release, from 2026-10-02). It is versioned in **git**, formatted by **StyLua** (2.6.0), and linted by **Selene** (0.32.0). **luau-lsp** (1.70.1) provides types. Tool versions are pinned in `aftman.toml`; Aftman was already installed, so we skipped Rokit. **Lune** (0.11.0) runs unit tests outside Studio.
- **The map and art are built in Studio** and saved in the place file. Only scripts and config sync from disk.

Why file-first:
- Claude Code edits files directly and reliably.
- git diffs are reviewable, and history gives a free rollback.
- Lint and format run as cheap checks.

The tradeoff is a one-time setup of about 30 minutes, plus the Rojo plugin in Studio.

**Studio bridge:** the **official built-in Studio MCP**. It replaces the unpinned community package currently in `~/.mcp.json`. It is used for:
- playtests (`start_stop_play`)
- reading output (`get_console_output`)
- screenshots
- simulated input
- running test modules (`execute_luau`)

Claude never publishes.

## 2. Module layout
```
default.project.json                 Rojo mapping
src/
  shared/          → ReplicatedStorage.Shared
    Config/        Economy, Night, Rules, ShipParts, Tools, Cosmetics, Flags (pure data)
    RuleGrammar.luau  PURE: addRule, makeShip (real or mimic), isLegal/brokenRule, describe (board text)
    Rng.luau          PURE: deterministic Park–Miller PRNG (no Roblox Random, so it runs in Lune)
    Payout.luau       PURE: nightPayout(stats) → {coins, xp}
    Net.luau          payload validators + token-bucket rate limiter (pure, tested)
    Remotes.luau      every RemoteEvent; server creates, clients wait (single source of truth)
    Payout.luau       night payout, rank curve, titles (pure, tested)
    ProfileSchema.luau saved-data schema, defaults, migrations (pure, tested)
  server/          → ServerScriptService.Server
    Main.server.luau  bootstrap: require services in order, start
    Services/
      DataService       session-locked UpdateAsync wrapper (D-010), outage mode, autosave, BindToClose
      NightStats        per-night counters shared by the night services
      NightService      night/tide state machine, timers, crew scaling, Harbor Log
      ShipService       builds ship models from a ship spec, moves them on the lane, last-buoy event
      JudgmentService   lever/bell ProximityPrompts, hold, undo, outcome resolution
      CargoService      crates, carry, warehouse, Supplies
      MimicService      reveal, rampage blob physics, net hits, integrity
      CrewService       pings, tide-break pad votes, grief cooldowns
      ProgressionService XP, rank, Logbook stamps, daily bounties, badges
      ShopService       coin purchases, equip, pass ownership cache
      PurchaseService   ProcessReceipt (only place it is set)
      PolicyService     cached PolicyService info per player
      Telemetry         AnalyticsService wrapper (funnel/economy/progression/custom)
      Flags             feature flags + MessagingService kill-switch listener
  client/          → StarterPlayer.StarterPlayerScripts.Client
    Main.client.luau
    Controllers/   Hud, Banner, Tips, Spyglass, Ping, Shop, Logbook, Settings, CameraFx, Intro
    UI/            Tokens.luau, Motion.luau (6 patterns), Components/ (built in code)
tests/             *.spec.luau for pure modules; tiny Lune runner (tests/run.luau): `lune run tests/run`
```
The client only requests actions and renders state. **It never grants value.**

## 3. Night state machine (server, NightService)
```
Idle(no players) → Dusk/Tide1 → Break1 → Tide2 → Break2 → Tide3 → Dawn(Harbor Log) → Cabin(30s) → Tide1 …
any Tide → Dawn  when integrity ≤ 0 (failed=true)
Idle when last player leaves (reset; nothing persists except profiles)
```
- State replicates through attributes on `ReplicatedStorage.NightState`: phase, tide, endsAt, integrity, rule ids. The client derives all UI from these.

## 4. Remote contracts
The default is **server-side ProximityPrompts** (lever, bell, crate, Cabin items), so most actions need no custom remote.

| Remote | Direction | Payload | Validation | Rate limit | Idempotency / notes |
|---|---|---|---|---|---|
| `Net.Swing` | C→S | `{targetId: string}` | Target is a live blob; distance ≤ 10 studs; raycast line of sight; the player holds the net | 1 per 0.6 s | Hit counted by the server |
| `Ping.Send` | C→S | `{kind: PingKind, pos: Vector3}` | kind is in the enum; pos is finite and within 300 studs of the player | 1/s, burst 3 | Broadcast to the crew only |
| `Shop.BuyCoins` | C→S | `{itemId: string}` | Item exists, is for sale, and is not owned; balance ≥ price | 2/s | Ownership check *inside* the profile update |
| `Cosmetic.Equip` | C→S | `{slot: Slot, itemId: string?}` | Item owned; slot valid | 4/s | — |
| `Settings.Set` | C→S | `{key: SettingKey, value: boolean or number}` | Key allow-listed; type and range checked | 4/s | — |
| `Telemetry.Client` | C→S | `{step: ClientStep}` | Enum allow-list (intro skipped, spyglass first used …) | 1/s | Analytics only; never affects value |
| `State.*`, `Banner`, `Tip`, `Payout` | S→C | Typed tables | — | — | — |

**Global rules:**
- Every C→S handler runs `Net.validate(schema, payload)` first.
- Payloads are rejected if strings exceed 32 characters, tables exceed 8 keys, or any number is NaN or infinite.
- The player is resolved from the remote, never from the payload.
- Violations are counted per player. Above 20 a minute, the player is logged and ignored for 60 s.

## 5. Purchases
`PurchaseService` is the only module that sets `MarketplaceService.ProcessReceipt`. For each receipt:
1. If the player is not in this server, return `NotProcessedYet`.
2. If the receipts store already holds the `R_{UserId}_{PurchaseId}` key, return `PurchaseGranted`.
3. Look up the product handler and grant it into the profile.
4. Write the receipt key with `UpdateAsync`, then save the profile.
5. Return `PurchaseGranted` only after both writes succeed. Any error returns `NotProcessedYet`.

`PromptProductPurchaseFinished` never grants anything. Pass ownership is checked with `UserOwnsGamePassAsync`, cached per session, and refreshed on `PromptGamePassPurchaseFinished`.

## 6. Data
- **Library:** ProfileStore (Apache-2.0, MadStudioRoblox; last pushed 2025-07-31). Its source is audited, then **pinned by commit** in `Packages/`. Fallback: a ~150-line session-locked `UpdateAsync` wrapper of our own.
- **Key:** `Player_{UserId}`. Receipts are stored under `R_{UserId}_{PurchaseId}` in a separate store.
- **Schema v1:**
```lua
{ version = 1, coins = 0, xp = 0, rank = 1,
  logbook = {} :: {[string]: number},      -- entryId -> first-seen unix
  cosmetics = { owned = {}, equipped = {} },
  bounties = { day = 0, list = {} },
  settings = { reducedMotion = false, shake = true, music = 0.6, sfx = 0.8 },
  stats = { nights = 0, correct = 0, mimicsStopped = 0, firstNightDay = 0 },
  flags = { introVariant = "" } }
```
- **Migrations:** `migrations[n](data) → data` runs in order on load. They must be idempotent and unit-tested.
- **Lifecycle:**
  - Load on `PlayerAdded`. The session lock comes from ProfileStore.
  - If the load fails, the player can still play, but **saving and purchases are disabled**. The banner says "Progress can't be saved right now", and the shop is greyed out.
  - Autosave comes from ProfileStore. Saves are also forced after a night's payout and after any purchase.
  - On leave, release the profile. `BindToClose` waits for release.
- **Budget:** about 1 load, about 1 save per 3 min, and 2 forced saves per night per player. That is far below the per-key and per-universe limits (4 MB value per key; per-minute budgets in the Creator Hub "error codes and limits").
- **Right to be forgotten:** set deletion templates `Player_{UserId}` and `R_{UserId}_*` in the Data Stores Manager for automated RTBF. The eligibility rules still need confirming. As a fallback, run a manual `RemoveAsync` from an admin console when a notice arrives.

## 7. Randomness
- All randomness is server-side, using `Random.new(seed)`. The night seed is `os.time()` mixed with `game.JobId`.
- Ship specs are generated on the server. The client only receives the final model.
- No paid input ever affects randomness.

## 8. Performance targets and profiling
| Area | Budget |
|---|---|
| Client FPS | 60 on a mid PC; 30+ on a low-end phone (about 3 GB RAM Android) |
| Client memory | < 600 MB on mobile (Developer Console) |
| Server heartbeat | ≥ 55 Hz with 6 players during a rampage |
| Network | < 50 KB/s per client steady; < 120 KB/s burst |
| Ships | ≤ 3 visible at once, ≤ 40 parts each, anchored and moved by server TweenService |
| Mimic | 1 active, unanchored; network owner is the server (prevents client-side physics exploits) |
| Particles | ≤ 6 emitters active scene-wide; ≤ 2 per celebration |
| UI | Event-driven updates; no per-frame `TextLabel` writes except the timer, which updates at 4 Hz |
| Streaming | `StreamingEnabled`; harbor core persistent; far sea props streamable |

**Profiling plan:**
1. MicroProfiler capture during a rampage.
2. Developer Console Memory and Network tabs on a phone each milestone.
3. A Studio 6-client local server test.

## 9. Observability
- **Telemetry wrapper** (all server-side):
  - `LogOnboardingFunnelStepEvent` for FTUE steps 1–10
  - `LogProgressionEvent` for nights (start, complete, fail)
  - `LogEconomyEvent` for Coins and Supplies sources and sinks
  - `LogCustomEvent` for calls, mimics, pings, intro variant
- **Errors:** `ScriptContext.Error` on the server is counted into a custom event by script name. Client errors arrive through `Telemetry.Client` as counts only.
- **Economy anomalies:** payouts are clamped to their config maximum; a breach is logged as a `econ_clamp` event. The thresholds in `economy-and-monetization.md` §8 are reviewed weekly.
- **Kill switches:** `Flags` holds the defaults. A `MessagingService` topic `flags` lets an admin command toggle the shop, fireworks, special visitors, or tells live.
- **Rollback:** revert the place version in Creator Hub, or revert the git commit and re-sync. Data migrations are forward-only, so any release with a schema bump must include a tested down-path or keep the old fields readable.

## 10. Test utilities
- `tests/*.spec.luau`, run with Lune (`lune run tests/run`). A full Roblox type-check runs with `luau-lsp analyze` (see CLAUDE.md). Covered:
  - RuleGrammar: satisfiable, legal share ≥ 40%, mimics always break a rule
  - Determinism: same seed gives the same night
  - Payout: caps
  - Migrations
  - Net validators: fuzzed payloads
- Exploit scenarios are listed in `qa-and-security-plan.md`.

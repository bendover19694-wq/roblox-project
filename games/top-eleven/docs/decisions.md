# Top Eleven (working title): decisions

## T-001 · 2026-10-25 · Its own Rojo project under games/top-eleven/
- The game lives in `games/top-eleven/` with its own `default.project.json`, `src/`, `tests/` and `docs/`. Space Agency's root `src/` is untouched.
- Tools come from the root `aftman.toml`; commands run from `games/top-eleven/`.
- **Rejected:** a second tree inside the root project (one place file for two games), and a new repo (loses the shared HQ, docs and research).
- **Status:** accepted (architect).

## T-002 · 2026-10-25 · Copy Space Agency modules, do not share a package
- Net, Receipts, Format, DataService, Telemetry and the UI kit (Theme, Icons, Motion, Kit, Toasts, Sounds, Boot) are copied once with a `-- Copied from <path> @ <commit>` header.
- Why: Space Agency is in owner testing and must not change under a second game; most of these files are game-specific; the pure shared part is under 150 lines.
- Ceiling: fixes do not flow between games automatically. Upgrade: a `packages/common/` folder mapped with Rojo `$path` when a third game starts or a fix is needed in both.
- **Status:** accepted (architect).

## T-003 · 2026-10-25 · Title and real-name parodies
- "Top Eleven" is a Nordeus trademark: working title only, never shown to players.
- Near-miss names of real players ("Juke Bellinghand") risk likeness reports. Until the owner decides, every name is invented from syllables, and `Config/Names.luau` blocks real surnames.
- **Status:** NEEDS OWNER: pick a title (scout's options: Run a Football Club, Starting XI, Gaffer: Run a Football Club) and say yes or no to parody names.

## T-004 · 2026-10-25 · Names are derived, never stored
- Players store `nameSeed`; clubs store word indices. One data file renames every save. Lists are append-only.
- **Status:** accepted (architect).

## T-005 · 2026-10-25 · Youth and scouting are one system; market is deterministic
- Free scout reports (shown odds, truthful recharge) produce youth prospects in the Academy. The transfer market is a daily list from a (UserId, day) seed, so buying is never a gamble.
- Passes that change training speed or squad size are paid power in a small way. NEEDS OWNER before the economy role sells any.
- **Status:** accepted for design; monetization part waits for the owner.

## T-006 · 2026-10-25 · Match is three server-simulated segments
- The server simulates each 30 minute segment only when its real start time passes, using the tactic chosen then. The client never sees a future moment and never sends a result. Skip resolves the rest with the current tactic, so it never changes odds.
- **Rejected:** simulating the whole match at kickoff (would leak the result to an exploiter reading State and make mid-match tactics fake).
- **Status:** accepted (architect).

## T-007 · 2026-10-25 · Fixes from the pre-handoff roast (paranoid pass over the contracts)
- **Seed never leaves the server.** `Match.luau` is in ReplicatedStorage, so a seed in the view would let an exploiter pre-run the next segment under all four tactics. The view drops `seed`, `home`, `away` and future moments.
- **Skip cannot farm.** The next kickoff waits for the full 3 x `segmentSeconds` after the last kickoff, so skip only shows the result early. Without this, `playMatch` + `skipMatch` at 8 actions/s would pay about 4 matches a second.
- **Retirements cannot soft-lock a save.** `nextSeason` adds free common youngsters up to 14 players.
- **State is pushed on change only** (kickoff, each segment), not every second, which keeps a 15 KB view off the wire 40 times a match.
- **Status:** accepted (architect).

## P-001 · 2026-11-04 · Batch status after the theme, loop and shop pass (producer)
- **Landed:** `src/shared/Config/Shop.luau` rewritten by merchant: 8 items, `tab` field (Looks/Helpers), ids 0 until the owner creates them. Checks: stylua clean, selene 0 errors, lune 71 passed / 0 failed. Policy recheck passed; T-005 kept (no paid power or random items).
- **Blocked:** builder (no T-008 core-loop gap table from architect), ui (no designer concepts attached; `assets/top-eleven` holds only asset-list.md), playtester (client does not exist, no private test place).
- **Stage:** stays `assets`. No stage request filed: `built` needs the client and a passed playtest, and none of that exists yet.
- **Owner answers (refines T-003):** player names are near-miss but far off, e.g. "Juke Bell" rather than "Juke Bellinghand"; title should be similar to "Top Eleven" but not it. `Config/Names.luau` still blocks real surnames until builder implements this and the owner reviews the list.
- **NEEDS OWNER:** pick the title, pick the theme variant, create a private Top Eleven test place.
- **Status:** open.

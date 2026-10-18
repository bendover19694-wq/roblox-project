# Run a Space Agency 🚀: Roblox game

A screen-based management game in the "Run a ___" format. Players found a space agency, buy rockets, and plan missions from Earth to Titan across a stylised solar-system map. Built by a solo owner, with Claude Code (Opus 5.5) as the main coder. Fogbell Harbor, the earlier concept, is archived in `archive/fogbell-harbor/` (D-011).

## Where things are
- `docs/` is the design bible. **Read the relevant doc before changing a system.** Docs and code must agree; when reality changes the plan, update the doc in the same change.
  - Design: `game-design-document.md`
  - Money: `economy-and-monetization.md`
  - Code structure and contracts: `technical-architecture.md`
  - Backlog: `implementation-plan.md`
  - Choices made: `decisions.md`
- `research/` holds evidence: sources, pattern cards, the policy check. It is read-only reference material.
- `TODO.md` is the current phase checklist.

## Current phase
Run a Space Agency's playable first version is built and passes an automated first-session playtest in Studio (branch `feat/space-agency`). Next: the owner's hands-on test, a published private test place (for saving and passes), the phone layout, and rankings. The design is in `docs/game-design-document.md`.

## Hard rules
- **Never publish, spend Robux, install tools, or edit a live/production place.** Work only in the private test place. Checkpoint before broad edits.
- **The server is authoritative** for currency, XP, rank, Logbook, cosmetics, Supplies, judgments, crates, net hits, randomness, purchases, and saves. The client requests and renders; it never grants value.
- Every client-to-server remote is validated through `Net.validate`, rate-limited, and size-limited.
- Purchases: a single `ProcessReceipt`, made idempotent by receipt key `R_{UserId}_{PurchaseId}`. Grant, then save, then return `PurchaseGranted`. Never grant on `PromptProductPurchaseFinished`.
- **No paid random items. No selling Coins/Supplies. No paid power or luck.** Timers must be truthful and never restart. Shop copy stays neutral, and the shop never auto-opens.
- Content target is Mild maturity: cartoon slapstick only, no horror gore, no free-text user content.
- Pattern, not expression: borrow *Run an airline*'s structure (see `research/run-an-airline-study.md`), never its names, art or identity.

## Code conventions
- Luau with `--!strict` in every module. Modules are small; one service per file.
- Layout: `src/shared` (Config, pure logic, Net), `src/server/Services`, `src/client/Controllers` + `UI`.
- Tuning values live in `src/shared/Config/*`, never inline.
- Pure logic (RuleGrammar, Rng, Payout, migrations, validators) gets `tests/*.spec.luau`.
- UI: build from `UI/Tokens.luau` and `UI/Motion.luau` (6 motion patterns only). Reduced motion must work.
- Format with StyLua and lint with Selene before calling work done (once S0.2 is installed).

## Workflow per slice
1. Restate the story's goal and acceptance criteria (from `implementation-plan.md`).
2. Name the files and systems to be touched.
3. Implement small.
4. Run unit tests, then a Studio MCP playtest. Read the console output.
5. Report what was observed, defects, and the next smallest slice.
6. Update docs and `decisions.md` if the plan changed.

## Commands
Tools are pinned in `aftman.toml` (run `aftman install` once). Before calling work done, run all of these from the repo root:
```bash
stylua src tests
```
```bash
selene src
```
```bash
lune run tests/run
```
```bash
rojo sourcemap default.project.json -o sourcemap.json && luau-lsp analyze --definitions=.types/globalTypes.d.luau --sourcemap=sourcemap.json src
```
Drive Studio directly (Studio must be open with "Enable Studio as MCP server" on). Get the studio id from `list_roblox_studios`:
```bash
python scripts/studio_mcp.py call list_roblox_studios "{}"
```
```bash
python scripts/sync_studio.py <studio_id>
```
```bash
python scripts/studio_mcp.py luau <studio_id> Server scripts/probes/night_state.luau
```
`scripts/probes/` holds reusable probes for state, crates, prompts, rescue, and a full-night soak test (`watch_night.py`). Stop play mode before syncing.

Live sync into Studio (requires the Rojo plugin):
```bash
rojo serve
```
Build a standalone place file:
```bash
rojo build -o FogbellHarbor.rbxlx
```

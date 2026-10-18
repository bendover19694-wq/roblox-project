# Handoff: Run a Space Agency (2026-10-18)

This note is for whoever picks up the work next, whether that's the owner or a new Claude session. It covers what exists, how to run and test it, what is still open, and the traps already found.

## The game in one paragraph
Run a Space Agency is a screen-based management game in the "Run a ___" style, played on a stylised solar-system map with no 3D world. Players found an agency, buy rockets (7 models), and plan missions to 10 destinations from Low Earth Orbit to Titan. Missions earn money every trip, even while the player is offline (capped at 8 h). The agency climbs 6 career stages. The structure is borrowed from *Run an airline*, but not its names, art or identity. Fogbell Harbor, the earlier concept, is archived in `archive/fogbell-harbor/` (D-011).

## Where things stand
- **Branch:** `feat/space-agency`. All work is committed:
  - `c404bd6` First playable version with the phone layout.
  - `34447e3` Redesign: drawn icons, motion, boot screen, effects, retention systems.
  - `f8d5b2b` Dopamine pass: jackpot trips, tap-to-thrust, profit pop-ups.
  - `f7c4a30` Fixes from the Studio pass, plus thumbnail and icon drafts.
- **Checks (all green at handoff):** StyLua clean, Selene 0 errors, `lune run tests/run` 41 passed, luau-lsp 0 errors, no non-ASCII characters in `src/`.
- **Studio:** synced into the owner's **private** test place "Run a Space Agency! 👽" (placeId 85391947658070). Nothing has been published.
- **Playtested in Studio** with the automated first session (`scripts/probes/ftue.py`), on desktop and on an iPhone 14 simulator:
  - boot screen
  - creating an agency, then the 3-step mission wizard
  - launch countdown with Perfect Launch
  - arrival with coins, plus the jackpot effect
  - daily claim
  - buying a second rocket and flying two missions
  - the Career panel with Daily Contracts
  - the More panel, Shop and Settings
  - tap-to-thrust combos
- **Not verified:**
  - Saving, offline earnings and the Welcome-back screen. Studio API access is off for the place, so the HUD shows "NOT SAVING".
  - Real purchases (product and pass ids are still 0).
  - Gamepad.
  - Portrait phones.

## Systems built
| Area | Where | Notes |
|---|---|---|
| Economy (fares, service, load, profit, trip time, rating, jackpot, thrust) | `src/shared/Economy.luau` | Pure and tested. Tuning in `src/shared/Config/Tuning.luau` |
| Rockets, destinations, career stages | `src/shared/Config/{Rockets,Destinations,Career}.luau` | |
| Daily Contracts, Research, Playtime Gifts, Perfect Launch, Mission Patches | `src/shared/{Contracts,Research,Gifts,Launch,Patches}.luau` + `src/server/Services/Progression.luau` | Pure logic is tested. Profile schema v2 (`ProfileSchema.luau`) |
| Server: actions, mission clock, offline catch-up, career, daily streak, receipts | `src/server/Services/AgencyService.luau` | Single `Remotes.Act` RemoteFunction. Validated with the Net helpers, rate-limited (thrust taps have their own limiter) |
| Saving | `src/server/Services/DataService.luau` | Our own UpdateAsync session lock. Outage mode plays unsaved. Fails fast when Studio API access is off |
| Purchases | `processReceipt` in AgencyService, `src/shared/Receipts.luau` | Idempotent by `R_{UserId}_{PurchaseId}`. Only Server Boost is wired |
| Analytics | `src/server/Services/Telemetry.luau` | Onboarding funnel (9 steps). Economy sources and sinks, with trip income batched every 60 s |
| Boot screen | `src/first/Boot.client.luau` (ReplicatedFirst) | Warp stars, title, progress bar, tap to skip |
| UI kit and look | `src/client/UI/{Theme,Kit,Icons,Motion,Sounds}.luau` | 35 icons drawn from Frames, with no emoji. BuilderExtended for headings, BuilderMono for numbers |
| Screens | `Hud`, `Map`, `Panels`, `Sections`, `Wizard`, `Liftoff`, `Modals`, `Shop`, `Toasts`, `Advisor` (Nova), `Juice` (effects) | Normal plus compact (phone) layouts through `App.onLayout` |

## How to run
Tools are pinned in `aftman.toml`. Run these from the repo root:
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
Studio (needs "Enable Studio as MCP server"). The id changes every time Studio reopens, so list it first and store it in `captures/studio_id.txt`:
```bash
python scripts/studio_mcp.py call list_roblox_studios "{}"
```
```bash
python scripts/sync_studio.py <studio_id>
```
```bash
python scripts/probes/ftue.py <studio_id>
```
- Stop play mode before syncing.
- For phone tests, run `StudioDeviceSimulatorService:SetDeviceAsync("iphone_14")` plus `SetOrientationAsync(Enum.ScreenOrientation.LandscapeLeft)` in the Edit context, and `StopSimulationAsync()` to go back.
- To build a place file:
```bash
rojo build -o SpaceAgency.rbxlx
```

## Owner to-dos (they need your account or your decision)
1. **Turn on Studio API access** for the private place (Game Settings, Security, "Enable Studio Access to API Services"). Then test saving, offline earnings and the Welcome-back screen.
2. **Create the passes and product** (2x Cash, +50% Launch Speed, Starter Pack, and the Server Boost product). Put their ids in `src/shared/Config/Tuning.luau`. Until then the shop shows "Coming soon".
3. **Pick sounds** from the Creator Store and put their ids in `src/shared/Config/Sounds.luau`. The current sounds are Roblox built-in placeholders.
4. **Thumbnail and icon:** drafts are in `assets/marketing/` (1920×1080 and 512×512). Polish them or commission final art. `scripts/probes/thumbnail.luau` rebuilds the scene, and `thumbnail_cleanup.luau` removes it and restores the place's Lighting.
5. Check the creator account (ID-verified, 2-Step Verification, age-checked) and choose the Kids and Select route (see `TODO.md`).

## Next build work (suggested order)
1. **Starter Pack grant** ($150K plus the Aurora livery), once the pass exists.
2. **Co-op slices C1 and C2** from `docs/coop-plan.md`: first a shared sky (other players' rockets on your map), then the server Megaproject. These are the best next retention win.
3. **Gamepad navigation:** Selectable, `GuiService.SelectedObject`, and B to close.
4. **Live ops:** badges for career stages, ConfigService for live tuning, and an experience-notification opt-in ("your rockets are back").
5. **Rankings and rivals:** a career and rating leaderboard, and agency news.

## Gotchas found the hard way
- **Studio MCP mouse X on notched phones:** simulated taps count X from the physical screen edge, but GUI positions start at the safe area (47 px on an iPhone 14). `scripts/ui_click.py` corrects for this. Use it, or copy its full-bleed-frame trick, for any new click probe.
- **Locked or off screen:** Studio stops rendering, so `screen_capture` and mouse input hang. Script-only calls (`execute_luau`) still work. Keep the PC unlocked during visual tests.
- **`execute_luau` gets its own module instances.** `require` from an MCP call does not return the running game's modules: App, DataService and Remotes come back empty, or Remotes even builds duplicate RemoteEvents. To poke the live game, find real Instances (for example `ReplicatedStorage:GetDescendants()` to locate the `Celebrate` RemoteEvent), not modules.
- **`TextBounds` comes back in screen pixels** after every UIScale. Offsets are in design pixels, so divide by `Kit.totalScale`. A `UIPadding` also moves the origin of child elements.
- **`node.label.Name`** is the Name *property*, not a child called "Name". Use `FindFirstChild("Name")`. luau-lsp can't catch this on `any`-typed tables.
- **Compact layout** (phones and Studio's docked viewport): the HUD is a left column. The map is squeezed to the right of it (`insetLeft` in `Map.luau`), and labels show codes only, except during pick mode.
- **ftue.py clicks by visible text.** Keep the labels it uses, or update the script in the same change. On compact screens the shop button is an icon, so the final "SHOP" step reports NOT FOUND; that is expected.
- **Stray files:** the untracked `docs/*.md` files (audience-and-fantasy, competitive-patterns, economy-and-monetization, implementation-plan, inspiration-ledger, launch-liveops-and-metrics, ui-motion-audit, vision) are old Fogbell copies that came back from a session move. The real copies live in `archive/fogbell-harbor/docs/`. They are safe to delete once the owner confirms.
- **Commit identity** is set for this repo only (user.name `bendover19694-wq`). The owner's CLAUDE.md says to add no co-author trailers.

## Hard rules (short form; the full text is in `CLAUDE.md`)
- Never publish, spend Robux, or edit a live place. Work only in the private test place.
- The server is authoritative for all value. Every Act handler is validated and rate-limited.
- No paid random items, no selling currency, no paid power or luck, truthful timers, and the shop never auto-opens.
- No emoji icons and no em dashes in player-facing text. Draw icons in `Icons.luau`.

## Key docs
- `docs/game-design-document.md`: the design, including every new system.
- `docs/decisions.md`: D-001 to D-015 (D-013 skills review, D-014 redesign, D-015 dopamine pass).
- `docs/coop-plan.md`: co-op slices C1 to C5.
- `research/run-an-airline-study.md`: the hands-on study of the reference game.
- `TODO.md`: the current checklist.

# To-do

Status: `[ ]` open · `[~]` in progress · `[x]` done. The newest phase is listed first.

## Research phase
- [x] Video notes for the three seed videos (`research/video-notes/`)
- [x] Market snapshot (`research/market-snapshot.md`)
- [x] 16 competitive pattern cards (`research/pattern-cards/`) and synthesis (`research/competitive-patterns.md`)
- [ ] Owner: play 4–6 reference games for 30 min each on a **fresh account** (phone and PC), then correct the first-time-experience sections of the cards. Priority: Huss Valley, Animal Hospital, 99 Nights, DTI, RIVALS, Steal An Egg.
- [x] UI/motion audit (`research/ui-motion-audit.md`)
- [x] Policy check (`research/monetization-policy.md`)
- [x] 4 scored concepts plus 1 rejected (`research/concepts.md`). Recommended: A, Fogbell Harbor. Alternative: B, Tide Runners.
- [x] Concept approved: Fogbell Harbor (D-001 feasibility, D-002)
- [x] Design bible (`docs/`, 13 files) plus milestone backlog (`docs/implementation-plan.md`) plus root `CLAUDE.md`
- [x] Owner approved building ("start building", 2026-10-17)
- [ ] Owner: confirm the creator account is ID-verified, has 2-Step Verification, is age-checked, and is 30+ days old. Choose the Kids and Select route: the 1,000 R refundable fee or Premium.
- [ ] Owner: pick a name to icon-test (Fogbell Harbor vs. Is That A Ship?)

## Monetization tactics
- [x] Top-earner tactics study (`research/monetization-tactics.md`). Adopted: Tide Pass, Starter Kit, rotating shop, Crew Bonus (D-005a).

## Tooling: plugins and MCPs (queued by owner, 2026-10-17)
Goal: make Roblox development with Claude Code (Opus 5.5) easier. Find the smallest reliable stack, and build our own plugin, MCP, or skill only where nothing good exists.

- [ ] **Swap the Studio bridge.** Remove the unpinned community `@jamesworkbenchcrm/roblox-studio-mcp` entry from `~/.mcp.json`. Connect the official built-in Studio MCP (`%LOCALAPPDATA%\Roblox\mcp.bat`). Needs owner approval.
- [ ] **Survey Roblox dev plugins and tools.** For each: official source, maintenance status, license, cost, permissions, data exposure, context cost, rollback path, and a verdict of Must have, Later, or Reject. Candidates: Rojo, Rokit, Wally, Luau LSP, Selene, StyLua, UI Labs, Fusion or Vide, Otter, TestEZ or a current maintained test runner, profiling tools, Animation Editor alternatives, Creator Store UI and animation plugins.
- [ ] **ForgeGUI study → our own open-source equivalent.**
  - What it appears to be (Unverified, from third-party pages): a commercial AI tool (forgegui.com plus a Studio plugin) that generates 2D game UI assets (panels, buttons, icons, HUD pieces, thumbnails) and pushes them into Studio. A separate DevForum listing of the same name turns prompts into Luau scripts.
  - Rules: **clean-room only.**
    - Study its public docs and behavior. Never decompile, copy code or assets, or reuse its name or branding.
    - Read its terms of service first.
    - Free-tier generations may become public. Never send our unreleased art there.
  - Build target: an MIT-licensed Claude Code skill and/or a small MCP. It turns our design tokens and screen-state table (from the design bible) into Luau UI modules (Frames, UIStroke, UICorner, layout, TweenService motion). It inserts them into a test place via the official Studio MCP, with a preview through UI Labs if adopted.
  - Asset generation would use the official Studio MCP tools (`generate_material`, `upload_image`, `store_image`) or hand-made art. No third-party image service unless approved.
- [ ] **Gap check before building anything.** List which tasks the official Studio MCP (26 tools) and existing tools still leave painful, and build only for those. Candidate gaps: a UI-from-spec generator, an economy simulator (spreadsheet or script that models the 3 player archetypes), an analytics-event schema checker, and a remote-contract linter.
- [ ] Present the tooling recommendation for approval. **Nothing is installed or published without an explicit yes.**

## Build — Run a Space Agency (now; D-011)
- [x] Hands-on study of *Run an airline* (`research/run-an-airline-study.md`)
- [x] Design (`docs/game-design-document.md`)
- [x] Economy core, tested: 7 rockets, 10 destinations, 6 career stages, offline catch-up (`src/shared/Economy.luau`, `tests/Economy.spec.luau`)
- [x] Server: agency actions with validation, mission clock, career rewards and promotions, daily streak, passes hook, saving with outage mode
- [x] UI: solar map with mission arcs, HUD, Next-move banner, Missions/Fleet/Career/More panels, 3-step mission wizard, rocket catalog, celebrations, Nova advisor tutorial, toasts, shop
- [x] Automated first-session playtest passes in Studio (`scripts/probes/ftue.py`)
- [ ] **Owner:** play it. Open `SpaceAgency.rbxlx` in Studio (or use the window that's already open) and press Play
- [ ] **Owner:** publish a private test place, so saving, offline earnings and the Welcome-back screen can be tested
- [ ] Create the game passes and the Server Boost product, then put their ids into `src/shared/Config/Tuning.luau`
- [x] ProcessReceipt for Server Boost (idempotent, keyed by receipt; D-013)
- [ ] Starter Pack grant ($150K + Aurora livery) once the pass exists
- [x] Phone layout: compact layout, safe-area insets, modals fit short screens (D-013)
- [ ] Gamepad / console navigation (Selectable, SelectedObject, B to close)
- [x] Live shop prices, full economy analytics, device reduced-motion, "Report a problem" button (D-013)
- [ ] Later (from the skills review): badges for career stages, ConfigService for live tuning, experience-notification opt-in for "rockets are back", UIShadow polish
- [ ] Rankings (career stage plus rating), agency news, rival agencies
- [ ] Icon and thumbnails; name test ("Run a Space Agency" vs alternatives)
- [x] Redesign T1: visual system (Theme, 34 drawn icons, Motion, Sounds, Kit) (D-014)
- [x] Redesign T2: pure logic (Contracts, Research, Gifts, Launch, Patches), Tuning keys, ProfileSchema v2, tests
- [x] Redesign T3: bootup screen in ReplicatedFirst
- [x] Redesign T4: server wiring (Progression service, AgencyService, DataService, Celebrate kinds)
- [x] Redesign T5: Toasts, Modals and Advisor swept and animated (Sound toggle in Settings)
- [x] Redesign T6: Juice, Liftoff with Perfect Launch, Map, Wizard
- [x] Redesign T7: Hud, Panels, Sections (contracts, research, patches), Shop conversion touches
- [ ] Lead: Studio visual pass (desktop + iphone_14)
- [ ] Lead: thumbnail + 512 icon
- [ ] Owner: pick Creator Store sounds

## Archived — Fogbell Harbor
- Code, tests and docs are in `archive/fogbell-harbor/` (D-011).

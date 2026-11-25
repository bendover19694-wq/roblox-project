# Roblox GitHub libraries, skills and world tools (reviewed 2026-11-23)

**TL;DR.** Each repo below was cloned into quarantine and scanned (binaries, Roblox backdoor signs such as `require(<asset id>)`, `loadstring`, `getfenv`, HTTP posts and webhooks, and prompt injection in skill files) before anything was kept. "Use" means it may go into our game or workflow, with its licence; "Look only" means study it, never ship or copy it. Local copies: `Documents/LihFolk-Packs/references/github/`. Installed skills are in `~/.claude/skills` with an `ash-` or `afrxo-` prefix.

| Repo | Licence | Verdict | What it is, how we use it |
|---|---|---|---|
| ffrostfall/fluid | MIT | **Use** | Declarative UI framework (Luau). An option for menus with many states; no network code. |
| leo-prad/Twinkle | none stated | **Look only** | UI animation module. The `.rbxm` holds 65 scripts, none with remote `require`, `loadstring`, HTTP or webhooks. No licence, so study its API and write our own (`UI/Motion.luau`). |
| Gzeu/roblox-procedural-worlds | MIT | **Use (tooling)** | Procedural worlds from one JSON config (rivers, dungeons, layers). Its `.bat` files only run `python build.py` and `pip install watchdog`. A grey-box generator before the map pipeline's art passes. |
| biotoxin495/roblox-the-world-1to1-scale_osm-viewer | MIT | **Look only** | Real-world maps from OpenStreetMap. Calls only the public Nominatim and Overpass APIs (needs HttpService). Reference for street and city layout. |
| adpena/arnis-roblox | Apache-2.0 | **Look only** | Real-world city compiler. Its `TelemetryReporter` posts to the author's server (`planetary.adpena.workers.dev`) by default: never drop its scripts into a game. |
| Ranoobaba/rblx_dev | MIT | Not needed | Rust CLI that scaffolds Rojo projects; our games already use Rojo and aftman. |
| loominatrx/useful-roblox-resources | Unlicense | **Use** | A curated link list of Roblox libraries and tools; read when choosing a library. |
| izzyfrm/roblox-ai | none stated | **Look only** | 2 GB media library (game references, UI previews, logos, animations, cutscenes, SFX). In the asset catalog as `roblox-ai-media-library`. Other creators' media: never upload or ship it. |
| AshExplained/roblox-skills | MIT | **Use** | 40 Claude skills. Installed: `ash-roblox-world-level-design` (world), `ash-roblox-ui-implementation` (ui), `ash-roblox-game-ux`, `ash-roblox-creator-store-security-audit` (librarian), `ash-roblox-mobile-playtest` (playtester), `ash-roblox-playtest-qa`, `ash-roblox-asset-pipeline`, `ash-roblox-economy-balancing` (economy), `ash-roblox-genre-patterns` (architect), `ash-roblox-quest-progression-systems`. |
| afrxo/roblox-agent-skills | MIT | **Use** | Installed `afrxo-roblox-ui` (engine primitives plus Fusion 0.3) and `afrxo-luau-expert` (strict Luau). |
| gamedev-skills/awesome-gamedev-agent-skills | Apache-2.0 | Already have | Its 8 Roblox skills (`roblox-ui`, `roblox-luau`, ...) are already installed here in edited copies, so they were not overwritten. |
| msitarzewski/agency-agents | MIT | **Look only** | Agent personas; the three Roblox ones (experience designer, systems scripter, avatar creator) are in `references/github/agency-agents-roblox/` as reading, not as active agents. |
| elhwary1/Kvant-UI-Aurora | none stated | Rejected | A script-hub GUI library site (HTML and SVG); nothing usable in a game. |
| SOBING4413/Exter-Library | GPL-3.0 | Rejected | Script-hub UI library for exploit executors (`getgenv`, `loadstring`, `HttpGet`); GPL as well. |
| ro0ti/Roblox-Scripting-UI | none stated | **Rejected, unsafe** | Its "Criminality Lib" posts the player's name and game to a hard-coded Discord webhook when it loads. Never run or copy anything from it. |

Rules that follow from the review:
- Never insert a third-party model or script without the `ash-roblox-creator-store-security-audit` checks: every script read, no `require(<number>)`, no hidden HTTP or webhooks.
- Exploit "script hub" libraries (Rayfield, Orion, Kavo, WindUI, Exter...) use executor-only functions; they cannot run in a real game. Use their screenshots for style only.
- "No licence" means all rights reserved: study it, write our own.

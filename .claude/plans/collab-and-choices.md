# Collaboration platform, Claude-style questions, pick-from-4 choices

## Context
DV Enterprises is the owner ("Voltage") and his friend Ditto building Roblox games together, each with an Agent HQ on his own PC. Their HQs are paired over HQ Link in Discord `#ai-collab` (HQ1 protocol, `tools/agent-hq/link.mjs`; our side is named "DV Enterprises", Ditto's peer bot is `1561419856727773244`). The cloud site (`tools/lantern-cloud`, Render) and the bridge (`tools/agent-hq/discord-bridge.mjs`) already exist. Read `.claude/plans/lantern-cloud.md` for the snapshot and HQCMD1 wire contract; this plan extends it.

The owner wants:
1. The site is a collaboration platform for him and Ditto: both can sign in, see both HQs' shared work, and get things done on either PC.
2. Agent HQ asks questions the way Claude does: one clear question, a short header, 2 to 4 options, each with a label and a one-line description, the recommended one first and marked "(Recommended)", and an optional preview image per option.
3. For UI, 3D models, game style and similar creative choices, agents show at least 4 distinct options drawn from their libraries (taste-skill variants, `~/.claude/design-md` brands, LihFolk packs, asset catalog, Claude Design), each with a preview image, and the owner picks before anything is built.

Hard limits: `server.mjs` <= 1417 lines (it is at 1417: change lines, add none), `test/server.test.mjs` and `test/mcp.test.mjs` must not grow, no new npm deps, files < 500 lines, roles brief size tests in `test/roles.test.mjs` must pass (designer brief is near its 16000 limit; trim existing wording to make room). Gate: full `npm test` in `tools/agent-hq` exits 0 and `npm test` in `tools/lantern-cloud` exits 0. Never use real tokens; tests use fakes. Do not commit, push or deploy.

## Shared contract
- Ask option: `{ id, label, description?, recommended?, mediaPath? }`. `description` <= 300 chars. `mediaPath` follows the same safety rule as the ask's own `mediaPath` (relative, no `..`, file must exist under `<stateDir>/media` or `<root>/assets`). Up to 4 options with `mediaPath` per ask.
- Snapshot (`state.json`) gains `link: { name, peers: [{id,name}], log: [{at, dir:'in'|'out', kind:'chat'|'task'|'status', from, text?, title?, ref?, state?}] }` (newest 30) and asks carry option `description` and `recommended`.
- New HQCMD1 types (cloud -> bridge; same author rules as before):
  - `{id, type:'link-chat', text}` owner only: bridge calls HQ `POST /api/link/say {text}`.
  - `{id, type:'link-task', title, body}` owner only: bridge calls HQ `POST /api/link/share {title, body}` (check the real route name in link.mjs `mountLink`).
  - `{id, type:'relay', from:'ditto', text}` a proposal from Ditto made on the website: bridge treats it exactly like a Ditto message in `#ditto-collab` (fenced, posted in the Lead thread, reaches the Lead only after the owner replies `send`).

## Roster
- exec-hq (Sonnet): T1. Files: `tools/agent-hq/server.mjs`, `mcp.mjs`, `briefs.mjs`, `roles.json`, `public/views/*.js` and css, their tests except discord-bridge.
- exec-bridge (Sonnet): T2. Files: `tools/agent-hq/discord-bridge.mjs`, `test/discord-bridge.test.mjs`.
- exec-cloud (Sonnet): T3. Files: `tools/lantern-cloud/**`.

## T1 (exec-hq): questions like Claude, pick-from-4
- `parseOptions` in server.mjs accepts `description` and per-option `mediaPath` (validated as above) without adding lines. `hq_ask_owner` schema in mcp.mjs documents: title = the question ending in "?", `header` is not needed, 2 to 4 options, `description` per option, recommended option first, `mediaPath` per option for visual choices.
- briefs.mjs: replace the current one-line ask guidance with a short "How to ask" rule shared by all roles: ask only when blocked on a real choice; one question; 2 to 4 options with label and one-line description; recommended first with recommended:true; no option that is just "other" (the owner can always type their own); put what you found in `why`, not in the options. Keep it under about 450 chars.
- roles.json: for designer, ui, world, thumbnails and librarian add (or fold into an existing rule) "Creative choices (UI style, model, map look, game style): offer at least 4 distinct options from your libraries, each with a preview image as the option's mediaPath, in one hq_ask_owner decision; build only the picked one." Lead gets "Plan creative work as pick-from-4 first". Trim other wording so every brief stays under its size limit.
- HQ web UI (review/home views): show option descriptions under labels, mark recommended, and render options with `mediaPath` as an image grid the owner clicks to pick (images through the existing media route). Keyboard and phone friendly.
- Tests: parseOptions keeps description and mediaPath, refuses unsafe mediaPath, and the new brief rule text is present in a role brief.

## T2 (exec-bridge): rich asks in Discord, link commands, snapshot link feed
- Ask post format: `**<title>**`, then `why` clipped, then numbered options `1. Label (Recommended) - description`, then "Reply with a number, an option id, or your own words." Attach up to 4 option images (multipart files[0..3], filename `<n>-<id>.png`) plus the ask's own media if any (max 5 files, each <= 8 MB, images only). An owner reply of `1`..`4` maps to that option id.
- New HQCMD1 types `link-chat`, `link-task`, `relay` per the contract, validated (text <= 1800, title <= 200, body <= 1600) and refused with ❌ when invalid.
- Snapshot adds `link` from HQ `GET /api/link` (name, peers, newest 30 log rows trimmed to the contract fields) and option descriptions.
- Tests for each, including: number reply maps to the option, option images attached in order, relay goes through the owner `send` gate, link-chat calls the HQ route, invalid link-task refused.

## T3 (exec-cloud): the collaboration platform
- Two accounts. Owner: `DV_PASSWORD_HASH` (or `LANTERN_PASSWORD_HASH`) + `TOTP_SECRET`. Collaborator Ditto: `DITTO_PASSWORD_HASH` + optional `DITTO_TOTP_SECRET`. One password box; the hash that matches decides the user; each user's own TOTP applies in step 2 (the pending token remembers the user). Lockouts stay shared. Sessions carry the user; `/api/state` returns `me: {name, role}`.
- Permissions: owner can do everything (existing commands plus `link-chat`, `link-task`). Collaborator can view state, tasks, asks (read only), the link feed, chat with the assistant (own limit 10 a minute), and send proposals (`POST /api/propose {text}` -> `relay` command). Collaborator cannot answer asks, message agents, queue tasks or send link commands (403). Test every 403.
- Branding: the platform is "DV Enterprises", Voltage × Ditto building on Agent HQ. Sign-in brand panel: DV logo, the line "Voltage × Ditto", "One studio, two Agent HQs", points: shared tasks across both PCs, both HQs' progress in one place, every handoff approved by its owner. Reuse the existing sign-in layout and styles; keep the two-step flow.
- Dashboard: a "Studio" header showing both HQs (Voltage's HQ from the snapshot: online/offline; Ditto's HQ: paired, last seen from the newest `in` link row). New "Collaboration" panel: the link feed (chat and shared tasks with their status), plus for the owner a "Send to Ditto's HQ" box (chat or shared task) and for Ditto a "Propose to Voltage's HQ" box. Ask cards show option descriptions and mark the recommended option; owner can click to answer; option images are not available in the cloud, so show "Preview images are in the Discord thread". Signed-in user's name in the bar.
- Bot: `COLLAB_IDS` env (Ditto's Discord id `1253880514822279219`): collaborators get read-only answers in `#ask-hq` and DMs, and the assistant may only propose `relay` for them.
- README: document the new env vars and what each account can do. render.yaml: add `DITTO_PASSWORD_HASH`, `DITTO_TOTP_SECRET` (sync false), `COLLAB_IDS` value.

## Done when
Both test suites exit 0, line and size limits hold, report under 15 lines each.

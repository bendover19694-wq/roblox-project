# Agent HQ: local dashboard, task runner and MCP bridge for the Roblox agent team

Context:
- New tool in `tools/agent-hq/` of a Roblox (Luau) repo. Node 24.15 is installed. **Zero npm dependencies**: use only `node:http`, `node:fs`, `node:path`, `node:crypto`, `node:child_process`, `node:sqlite` (`DatabaseSync`, works without flags), `node:test`, `node:assert`. ES modules (`.mjs`). Front end is vanilla JS ES modules + one CSS file, no build step, no CDN.
- What it is: a web dashboard on `http://127.0.0.1:4317` where the owner queues tasks for 15 role agents, approves their output, and watches them run. A scheduler spawns real agents: Claude Code (`claude -p`, uses the owner's Claude plan) or Antigravity CLI (`agy -p`, uses Google AI Pro). Agents report back through an MCP server (`mcp.mjs`) that both Claude Code and the Antigravity IDE load.
- Source of truth for roles and rules: `.claude/skills/roblox-agent-team/SKILL.md` (role table + "Rules every agent gets") and `.claude/skills/roblox-agent-team/vault.md` (chapters `## 0.` ... `## 13.`). Repo hard rules: `CLAUDE.md`. Read those three files first.
- State lives in `<repo>/.agent-hq/` (gitignored): `hq.db` (sqlite), `token`, `logs/<taskId>.ndjson`, `media/`. Repo root = `path.resolve(import.meta.dirname, '../..')`.
- Security (required, do not skip): bind `127.0.0.1` only. Every `/api/*` request except `GET /api/health` must carry header `x-hq-token` equal to the token in `.agent-hq/token` (32 random hex bytes, created on first start). `index.html` gets the token injected server-side as `<meta name="hq-token" content="...">`. No CORS headers. Reject bodies > 1 MB. Validate every input (enums, lengths: title <= 200, body <= 20000). Never pass user text through a shell: spawn with an args array and `shell: false`; on Windows resolve `claude.cmd`/`agy.exe` via `where` once at startup.
- Agents never publish, spend Robux, or install tools (CLAUDE.md). Claude runs use `--permission-mode acceptEdits` plus an allow-list, never `--dangerously-skip-permissions`.
- Design: dark, dense product dashboard (think Linear). Follow the `taste-skill` rules from the user's setup: no emoji icons (draw small inline SVG icons), one accent color, real spacing scale, no AI-slop gradients. Player-facing rule "no em dashes" applies to UI copy too.

## Shared interfaces (all executors must match these exactly)

Task row (JSON from API):
```
{ id: "t_<12 hex>", title, body, role, game: string|null, state: "queued"|"working"|"review"|"done"|"failed"|"canceled",
  engine: "claude"|"agy"|"manual"|"echo", model: string|null, needsStudio: 0|1, parentId: string|null,
  createdBy: "owner"|"lead"|"schedule"|<role>, summary: string|null, error: string|null,
  createdAt, startedAt, endedAt (ISO strings or null), costUsd: number|null, conversationId: string|null }
```
Ask row (owner inbox, "Needs you"):
```
{ id: "a_<12 hex>", taskId|null, role, kind: "decision"|"try"|"approve"|"review", title, why, options: [{id,label,recommended?}],
  mediaPath: string|null, state: "open"|"answered"|"dismissed", answer: string|null, createdAt, answeredAt }
```
Message row (per-role thread, includes Lead chat): `{ id, role, from: "owner"|"agent"|"system", text, taskId|null, createdAt }`
Pitch row: `{ id: "p_<12 hex>", title, oneLiner, coreLoop, evidence, risks, state: "proposed"|"approved"|"rejected", createdAt }`
Setting keys (table `settings`, JSON values): `paused` (bool, default false), `budget` (int 1..4, default 2), `roleEngines` ({[role]: {engine, model}}), `schedules` ([{id, role, title, body, everyMinutes, enabled, lastRunAt}]).

db.mjs exports (exec-1 writes, exec-2 imports):
`openDb(file)`, `createTask(db, fields) -> task`, `getTask(db,id)`, `listTasks(db,{state?,role?,limit?})`, `updateTask(db,id,patch) -> task`, `nextRunnable(db,{studioBusy}) -> task|null` (oldest queued, skips needsStudio when studioBusy, skips engine "manual"), `createAsk(db,fields)`, `listAsks(db,{state?})`, `answerAsk(db,id,{answer}) -> ask`, `addMessage(db,fields)`, `listMessages(db,{role,limit?})`, `createPitch(db,fields)`, `listPitches(db)`, `decidePitch(db,id,state)`, `getSetting(db,key,fallback)`, `setSetting(db,key,value)`, `saveMarketSnapshot(db,json)`, `latestMarketSnapshots(db,n)`.

Event bus: `server.mjs` exports `emit(type, payload)`; types: `task`, `ask`, `message`, `pitch`, `settings`, `log` ({taskId, line}). Browser receives them on `GET /api/events` (SSE, token passed as `?token=` query because EventSource cannot set headers; this is the only route that accepts the query form).

HTTP API (exec-1 implements, exec-3 calls, exec-2's mcp.mjs calls):
- `GET /api/health` -> `{ok:true}`
- `GET /api/state` -> `{tasks, asks, pitches, settings, roles, running:[taskId], studio:{holder:taskId|null}, engines:{claude:bool, agy:bool}, games:[{slug,name}]}`
- `POST /api/tasks` `{title, body, role, game?, engine?, model?, needsStudio?, parentId?, createdBy?}` -> task
- `POST /api/tasks/:id/cancel` -> task (kills process if running)
- `POST /api/tasks/:id/retry` -> task (back to queued)
- `POST /api/tasks/:id/complete` `{summary, state?: "done"|"review"|"failed"}` (used by MCP)
- `POST /api/tasks/:id/claim` `{engine:"manual"}` -> task (working) (used by Antigravity IDE via MCP)
- `GET /api/tasks/:id/log` -> `{lines:[...]}` (last 500 lines of logs/<id>.ndjson)
- `POST /api/asks` `{taskId?, role, kind, title, why, options?, mediaPath?}` -> ask
- `POST /api/asks/:id/answer` `{answer}` -> ask. Answering an ask whose kind is "decision" with an option id, or "review" with "approve"/"changes:<text>", also appends a message to that role's thread and, for "changes", queues a follow-up task for the same role.
- `GET /api/messages?role=lead` -> messages; `POST /api/messages` `{role, text}` -> message. Posting to role "lead" also queues a task for role lead (title = first line, body = text).
- `POST /api/pitches` `{title, oneLiner, coreLoop, evidence, risks}`; `POST /api/pitches/:id/decide` `{state}`. Approving queues a lead task "Plan pitch: <title>".
- `GET /api/settings`, `POST /api/settings` `{key, value}` (keys whitelisted above).
- `POST /api/pause` / `POST /api/resume`.
- `GET /api/market` -> latest snapshot; `POST /api/market/refresh` -> fetches Roblox charts (see T2).
- `GET /api/vault` -> `{chapters:[{n, title, text}]}` parsed from vault.md; `GET /api/library` -> `{skills:[{name, description, path}], assets:[relative paths under assets/]}`.
- `GET /media/<path>` serves files under `.agent-hq/media/` and `assets/` only (path traversal guarded).
- Static: `GET /` -> `public/index.html` with token injected; `/static/*` -> `public/`.

## Roster
- exec-1: server, database, HTTP API, market fetch, server tests
- exec-2: roles, briefs, engines, scheduler, MCP server, Antigravity registration, runner tests
- exec-3: front end (all screens)
- exec-4: docs, launch scripts, skill update, gitignore, end-to-end smoke script

## Tasks

### T1 [owner: exec-1] [deps: none] [status: done]
Files: tools/agent-hq/db.mjs, tools/agent-hq/test/db.test.mjs
Do: sqlite schema (tables tasks, asks, messages, pitches, settings, market) with `CREATE TABLE IF NOT EXISTS`, `PRAGMA journal_mode=WAL`. Implement every db.mjs export listed above. ids via `crypto.randomBytes(6).toString('hex')` with prefixes. JSON columns (options, value) stored as text and parsed on read. Timestamps ISO.
Done when: `node --test tools/agent-hq/test/db.test.mjs` passes (covers create/list/update task, nextRunnable skipping manual and studio tasks, ask answer, settings default).
Talk to: exec-2 if a db function signature needs to change (send the new signature).

### T2 [owner: exec-1] [deps: T1] [status: done]
Files: tools/agent-hq/server.mjs, tools/agent-hq/market.mjs, tools/agent-hq/test/server.test.mjs
Do: `server.mjs` exports `startServer({root, port=4317, dbFile, runner?}) -> {server, close}` and `emit`. Implements the full HTTP API and SSE above, token check, body limit, input validation, static + media serving with traversal guard (resolve and check prefix). Reads roles from `roles.json` (exec-2) for validation and `/api/state`. `games` = `[{slug:"space-agency", name:"Run a Space Agency"}]` from a const. `runner` is an object from exec-2 with `{cancel(taskId), running(): string[], studioHolder(): string|null, engines(): {claude,agy}}`; when absent, use stubs. Pause/resume set the `paused` setting. Vault endpoint splits vault.md on `^## (\d+)\. (.+)$`. Library lists `.claude/skills/*/SKILL.md` frontmatter name/description and files under `assets/` (max depth 3). `market.mjs` exports `fetchCharts()` that GETs `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=<uuid>&device=computer&country=all` and returns `{fetchedAt, sorts:[{id: sortId, name: sortDisplayName, games:[{universeId, rootPlaceId, name, playerCount, up: totalUpVotes, down: totalDownVotes, genre: genreL1, sponsored: isSponsored}]}]}` keeping only sorts that have games, first 50 games each; drop sponsored games. `main` entry: `node tools/agent-hq/server.mjs` starts server + runner (import `createRunner` from exec-2's `runner.mjs`) and prints `Agent HQ on http://127.0.0.1:4317`.
Done when: `node --test tools/agent-hq/test/server.test.mjs` passes: 401 without token, task create/list via API, oversized body 413, `/media/../CLAUDE.md` 404, SSE delivers a `task` event after a POST.
Talk to: exec-2 (runner interface, roles.json shape), exec-3 (any API shape change).

### T3 [owner: exec-2] [deps: none] [status: done]
Files: tools/agent-hq/roles.json, tools/agent-hq/briefs.mjs, tools/agent-hq/test/briefs.test.mjs
Do: `roles.json` = array of 15 `{id, label, job, chapters:[int], mode:"read"|"write"|"docs", files:[globs it owns], model:"opus"|"sonnet"|"haiku", needsStudio:bool, allowedTools:[...]}` built from the role table in `.claude/skills/roblox-agent-team/SKILL.md`. ids: lead, scout, architect, builder, ui, world, librarian, economy, merchant, thumbnails, kid-tester, playtester, reviewer, producer, liveops. Lead model opus; reviewer/architect opus; others sonnet; kid-tester haiku. allowedTools for Claude: read roles `["Read","Grep","Glob","WebFetch","WebSearch","mcp__hq__*"]`; write roles add `"Edit","Write","Bash(stylua:*)","Bash(selene:*)","Bash(lune:*)","Bash(rojo:*)","Bash(luau-lsp:*)","Bash(python scripts/*)","Bash(git status:*)","Bash(git diff:*)"`. `briefs.mjs` exports `buildBrief({task, role, root}) -> string`: hard rules (copied at runtime from the "Rules every agent gets" section of SKILL.md), role job, the text of its vault chapters (read at runtime from vault.md), owned files, the task title/body, and the reporting contract: "Report with the hq MCP tools: hq_note for progress, hq_ask_owner for anything the owner must decide or try, hq_add_media for screenshots, hq_complete when done (summary of files changed and checks run). Lead only: hq_create_task to delegate; never do specialist work yourself." Lead brief also lists all roles with jobs.
Done when: `node --test tools/agent-hq/test/briefs.test.mjs` passes (brief contains the rules text, chapter 5 text for ui, and the delegation section only for lead).
Talk to: exec-1 (roles.json shape is final once sent), exec-3 (roles.json fields for the Team screen).

### T4 [owner: exec-2] [deps: T1, T3] [status: done]
Files: tools/agent-hq/engines.mjs, tools/agent-hq/runner.mjs, tools/agent-hq/test/runner.test.mjs
Do: `engines.mjs` exports `detectEngines() -> {claude: path|null, agy: path|null}` (via `where` on Windows, `which` elsewhere) and `spawnEngine({engine, exe, brief, model, allowedTools, mcpConfigPath, cwd}) -> ChildProcess`. claude args: `["-p", brief, "--output-format","stream-json","--verbose","--model", model,"--permission-mode","acceptEdits","--allowedTools", ...allowedTools,"--mcp-config", mcpConfigPath,"--strict-mcp-config"]`. agy args: `["-p", brief, "--output-format","stream-json"]` plus `--model` only if set. engine "echo" (tests and dry runs, never a real agent): spawns `process.execPath` with `-e` code that prints two fake stream-json lines (one assistant text "echo ok", one result) and exits 0; the normal exit path then marks the task "review" with summary "echo ok". It always counts as installed. `runner.mjs` exports `createRunner({db, root, emit, port, token})` returning `{start(), stop(), cancel(id), running(), studioHolder(), engines()}`. Loop every 2 s: skip if `paused`; while running < budget: `nextRunnable(db,{studioBusy})`; resolve engine from task.engine or settings.roleEngines[role] or "claude"; if exe missing, set state failed with error "engine not installed"; write `.agent-hq/mcp-<taskId>.json` = `{"mcpServers":{"hq":{"command": process.execPath, "args":[<abs path mcp.mjs>], "env":{"HQ_URL":"http://127.0.0.1:<port>","HQ_TOKEN":token,"HQ_TASK":taskId,"HQ_ROLE":role}}}}`; spawn; set working/startedAt; append stdout lines to `logs/<id>.ndjson` and `emit('log')`; parse stream-json `result` events for `total_cost_usd` (claude) or `usage` (agy) and session/conversation id. On exit: if task still working, state = exit 0 ? "review" : "failed" (summary from last assistant text, 500 chars). Studio: a task with needsStudio holds the lock until it ends. Schedules: each minute, enqueue any enabled schedule whose `lastRunAt + everyMinutes` passed (createdBy "schedule"), update lastRunAt. `cancel` kills the process tree (`taskkill /pid <pid> /T /F` on Windows, `process.kill(-pid)` elsewhere) and sets canceled.
Done when: `node --test tools/agent-hq/test/runner.test.mjs` passes using engine "echo": two queued tasks with budget 1 run one at a time; paused runner starts nothing; needsStudio tasks never overlap; cancel works.
Talk to: exec-1 (runner interface used by server.mjs).

### T5 [owner: exec-2] [deps: T2 API shape] [status: done]
Files: tools/agent-hq/mcp.mjs, tools/agent-hq/register-antigravity.mjs, tools/agent-hq/test/mcp.test.mjs
Do: `mcp.mjs` is a stdio MCP server written by hand (newline-delimited JSON-RPC 2.0; handle `initialize` -> `{protocolVersion: <echo client's>, capabilities:{tools:{}}, serverInfo:{name:"agent-hq",version:"1.0.0"}}`, `notifications/initialized`, `tools/list`, `tools/call`, `ping`). Config from env `HQ_URL`, `HQ_TOKEN` (or read `<repo>/.agent-hq/token` when unset), `HQ_TASK`, `HQ_ROLE`. Tools (inputSchema JSON Schema each): `hq_list_tasks {state?, role?}`, `hq_claim_task {taskId}` (for IDE agents: claims a queued task with engine manual and returns its full brief from `GET /api/tasks/:id/brief` - ask exec-1 to add that route returning `{brief}` via briefs.mjs), `hq_note {text}` (adds a message to the role thread), `hq_ask_owner {kind, title, why, options?}`, `hq_add_media {path, ask}` (copies a file under the repo into `.agent-hq/media/` then creates a review ask), `hq_complete {summary, state?}`, `hq_create_task {role, title, body, needsStudio?}` (only when HQ_ROLE is lead or unset), `hq_vault {chapter}`. When HQ_TASK is unset (IDE use), tools that need a task take `taskId` as an argument. Errors return `isError: true` content. `register-antigravity.mjs`: merges an `"agent-hq"` entry `{command: process.execPath, args:[<abs mcp.mjs>]}` into `~/.gemini/config/mcp_config.json` and, if it exists, `~/.gemini/antigravity/mcp_config.json`, writing a `.bak-<timestamp>` copy first and preserving every other entry; `--dry-run` prints the result without writing; `--remove` deletes only the agent-hq entry.
Done when: `node --test tools/agent-hq/test/mcp.test.mjs` passes (spawns mcp.mjs against a test server: initialize, tools/list has 8 tools, hq_note round-trips) and `node tools/agent-hq/register-antigravity.mjs --dry-run` prints merged JSON with the existing `Roblox_Studio` entry intact.
Talk to: exec-1 (needs `GET /api/tasks/:id/brief`).

### T6 [owner: exec-3] [deps: none, API contract above] [status: done]
Files: tools/agent-hq/public/index.html, tools/agent-hq/public/styles.css, tools/agent-hq/public/app.js, tools/agent-hq/public/views/*.js, tools/agent-hq/public/icons.js
Do: Single-page app, hash routes. Left sidebar: Home, Lead, Team, Tasks, Review (badge = open asks), then Studio group: Pitches, Market, Library, Settings; footer shows "N working", Studio holder, Pause/Resume. `api.js`-style helper inside app.js reads the token from the meta tag and sends `x-hq-token`; SSE `/api/events?token=` updates an in-memory store and re-renders the active view.
Screens:
- Home: greeting with date, chips (need you / working / queued), "Ask the Lead" input (posts to messages role lead), "Needs you" cards (asks: decision shows option buttons, try shows Done, review shows image + Approve / Ask for changes with text), "Live now" list of roles with current task or queued count, game stage card, Studio lock card.
- Lead: chat thread with lead (messages role lead), composer.
- Team: grid of 15 role cards (label, job, model/engine, state); click opens role panel with its thread, its tasks, and a "New task for <role>" form; engine/model selects save to settings.roleEngines.
- Tasks: board columns queued / working / review / done+failed; card shows role, title, age, engine; click opens drawer with body, summary, live log tail (`GET /api/tasks/:id/log` then SSE log events), Cancel / Retry. "New task" modal: role select, title, body, game, needs Studio checkbox, engine override.
- Review: open asks with media first, then other asks; answered history collapsed.
- Pitches: cards with one-liner, core loop, evidence, risks; Approve / Reject.
- Market: sort tabs (Top Trending, Up-and-Coming, ...), table of games (rank, name, playing, like ratio = up/(up+down), genre), Refresh button, fetched time; button "Ask scout about this" queues a scout task with the game name.
- Library: vault chapters (left list, right text rendered as simple markdown: headings, bullets, bold, code), skills list, assets list with image previews via `/media/`.
- Settings: budget (1-4), paused, schedules editor (role, title, body, every N minutes, enabled), engine status (claude/agy installed), Antigravity hint text: "Run `node tools/agent-hq/register-antigravity.mjs` to add HQ tools to Antigravity".
Done when: with exec-1's server running (`node tools/agent-hq/server.mjs`), every route renders without console errors, creating a task from the modal shows it in Tasks, and the page works at 1280x800 and 390 px wide (sidebar collapses to a top bar).
Talk to: exec-1 for any API question.

### T7 [owner: exec-4] [deps: T2, T4, T5] [status: done]
Files: tools/agent-hq/README.md, tools/agent-hq/package.json, scripts/hq.ps1, .gitignore, .claude/skills/roblox-agent-team/SKILL.md, tools/agent-hq/test/smoke.mjs
Do: package.json `{ "name":"agent-hq", "private":true, "type":"module", "scripts":{"start":"node server.mjs","test":"node --test test/"} }` (no dependencies). `.gitignore` add `.agent-hq/`. `scripts/hq.ps1` starts the server and opens the browser. README: what it is, start, roles, engines (Claude Code uses your Claude plan; Antigravity needs `agy` installed by the owner with `irm https://antigravity.google/cli/install.ps1 | iex` and one interactive login), Antigravity IDE connection via register script and the `hq_claim_task` flow, schedules advice ("run on schedules or events, not 24/7, or you burn usage"), safety notes. Add a short "Run it from Agent HQ" section to SKILL.md pointing at the README. `smoke.mjs`: starts the server on a random port with a temp db, queues an "echo" task, waits for it to reach review/done, answers an ask, prints PASS.
Done when: `node tools/agent-hq/test/smoke.mjs` prints PASS and `node --test tools/agent-hq/test/` passes.
Talk to: exec-1, exec-2 when wiring the smoke test.

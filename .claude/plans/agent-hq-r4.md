# Agent HQ revision 4: Teams-style chat, skills per role, quality gates, role memory, configurable cadence

Supersedes `agent-hq-r3.md` (none of r3 landed; its content is folded in here). Builds on `agent-hq.md` and `agent-hq-r2.md`; read their shared interfaces first. Test command from `tools/agent-hq`: `node --test test/*.test.mjs && node test/smoke.mjs`. Zero npm dependencies, as before. Never use a real engine in tests (echo only). Use a port other than 4317 for manual checks.

Owner requests (2026-10-22/23): (1) the Claude app worker runs hourly and cadence is configurable; (2) the Antigravity design automation is on; (3) strict guidelines for every agent; (4) the layout mimics the reference control room: a Microsoft Teams style messaging layout where the owner messages each AI individually; (5) agents actually use the installed skills and plugins; (6) the system must be better than using Claude alone.

Why it beats one Claude chat (build all of these): specialists with curated skills and only their vault chapters; automatic review gates (a Reviewer and a tester check every code change and send failures back, up to 2 rework rounds); per-role memory of lessons learned that every later brief includes; persistent per-agent conversations; parallel work under a budget with a Studio lock; the owner only approves.

Art rules for Antigravity already exist and are final (do not edit): `.agents/rules/agent-hq-art-direction.md`, `.agents/skills/roblox-ui-concept/SKILL.md`, `.agents/skills/roblox-store-art/SKILL.md`.

## Shared interfaces

### roles.json additions (exec-2 writes; everyone reads)
Each role gains: `agentType` (Claude subagent_type for /hq-worker), `skills` (array of `{name, when}`; `when` is "always" or a short condition), `mcp` (array of tool or server names to prefer when present), `doneWhen` (array of checks), `gates` (array of role ids to auto-queue after this role finishes), `color` (hex for the avatar), `icon` (one of: crown, radar, compass, wrench, layout, palette, mountain, box, scale, cart, image, smile, play, shield, flag, pulse).
Exact loadouts:
| role | agentType | skills (when) | mcp | gates |
|---|---|---|---|---|
| lead | general-purpose | roblox-agent-team (always); superpowers:brainstorming (new game idea or feature); superpowers:writing-plans (3+ steps) | hq | - |
| scout | Explore | agent-reach (YouTube, Reddit, X, TikTok sources); watch:watch (a video must be watched); anthropic-skills:deep-research (multi-source question) | WebSearch, WebFetch, firecrawl, hq market | - |
| architect | general-purpose | superpowers:writing-plans (always); grill:roast (before handing off a plan) | hq | - |
| builder | general-purpose | superpowers:test-driven-development (pure logic in src/shared); superpowers:systematic-debugging (any bug); superpowers:verification-before-completion (always, before hq_complete) | Roblox_Studio (only when holding the Studio lock) | reviewer, playtester |
| ui | general-purpose | roblox-concept-art-ui (always); taste-skill:redesign-skill (audit a screen's look; apply its rules to Roblox UI, ignore web-only advice); superpowers:verification-before-completion (always) | Roblox_Studio | reviewer, kid-tester |
| designer | (antigravity) | .agents rules + skills | agent-hq | - |
| world | general-purpose | superpowers:verification-before-completion (always) | Roblox_Studio | playtester |
| librarian | general-purpose | superpowers:verification-before-completion (always) | Roblox_Studio | reviewer |
| economy | general-purpose | superpowers:test-driven-development (always); dataviz (pacing charts in the report) | - | reviewer |
| merchant | general-purpose | superpowers:test-driven-development (Receipts or purchase logic); pricing (price research only, then check research/monetization-policy.md) | - | reviewer |
| thumbnails | (antigravity) | .agents rules + skills | agent-hq | - |
| kid-tester | general-purpose | run (launch and play the game) | Roblox_Studio | - |
| playtester | general-purpose | run (always); superpowers:systematic-debugging (diagnose failures; report, do not fix) | Roblox_Studio | - |
| reviewer | general-purpose | code-review (always, on the diff); security-review (remotes, purchases, saves, DataStore) | - | - |
| producer | general-purpose | superpowers:verification-before-completion (always) | - | - |
| liveops | Explore | roblox-launch-tips (always); dataviz (charts) | hq market | - |
`doneWhen` examples: builder `["stylua src tests","selene src","lune run tests/run","luau-lsp analyze passes","hq_complete lists changed files and command results"]`; ui adds "Studio capture at PC and iphone_14"; reviewer `["verdict PASS or FAIL in the first line of the summary","each finding has file:line"]`; scout `["3 to 4 pitches via hq_pitch, each with evidence links"]`.

### Gate pipeline (exec-1, server)
- Task gains columns `gateFor` (task id or null) and `attempt` (int, default 1).
- When a task with engine app/claude-cli/echo moves to `review` and its role has `gates` and `gateFor` is null: queue one task per gate role: title `Check: <title>`, body `Check the work of task <id> (<role label>). Its report: <summary>. Read the changed files it lists. Put PASS or FAIL as the first word of your hq_complete summary, then reasons. On FAIL, say exactly what must change.`, parentId = id, gateFor = id, createdBy "gate".
- When a gate task completes and its summary starts with `FAIL` (case-insensitive): if the original task's attempt < 3, queue `Fix: <original title>` for the original role with body = original body + "\n\nReviewer feedback:\n" + gate summary, parentId = original id, attempt = original attempt + 1, createdBy "gate". Otherwise create an owner ask (kind decision) "Gate failed 3 times: <title>" with options retry / drop.
- When all gates of a task PASS, set the original task to `done` and add a system message to its role thread.

### Conversations (exec-1 server, exec-3 UI)
- Thread = all messages of one role. `POST /api/messages {role, text}` from the owner, for ANY role: stores the message and queues a task for that role (title = first line up to 100 chars, body = text, createdBy "owner", threadMessageId = message id). For role lead this is the existing behaviour.
- `POST /api/messages/:role/reset` stores a system message `{from:"system", text:"New conversation"}` marking a fresh start.
- `GET /api/threads` -> `[{role, last: message|null, unread: int, lastReadAt}]`; `POST /api/threads/:role/read` sets lastReadAt (setting `threadReads`).
- briefs.mjs adds "Conversation so far" with the last 10 owner/agent messages after the latest reset marker.

### Role memory (exec-1 server, exec-2 MCP/briefs)
- Files `tools/agent-hq/memory/<role>.md` (committed to git). `GET /api/memory/:role` -> `{lessons:[{date,text}]}`; `POST /api/memory/:role {lesson}` appends `- YYYY-MM-DD: <lesson>` (trim, max 300 chars, skip exact duplicates, keep the newest 60 lines).
- MCP `hq_learn {taskId?, role?, lesson}`; briefs include the newest 15 lessons under "Lessons from earlier tasks (follow them)".

### Cadence (exec-1 server, exec-2 MCP, exec-3 UI, exec-4 skill)
- Setting `laneSchedules`, defaults `{app:{enabled:true, everyMinutes:60, activeFrom:"00:00", activeTo:"24:00", maxTasks:8}, antigravity:{enabled:true, everyMinutes:20, activeFrom:"00:00", activeTo:"24:00", maxTasks:6}}`. Validate: everyMinutes int 20..1440, times "HH:MM" 00:00..24:00 (overnight windows allowed), maxTasks 1..20.
- `POST /api/lanes/:engine/gate {manual?}` -> `{run, reason, maxTasks, queued}`. Checks in order: lane disabled (blocks manual too) -> "lane paused in HQ"; global paused; queued count 0 -> "queue empty"; if not manual: outside window -> "outside active hours"; `now - lanes[engine].lastRunAt < everyMinutes - 2 min` -> "not due until HH:MM". Else run true, set lastRunAt and lastSeenAt, emit settings event.
- MCP `hq_lane_gate {engine, manual?}`.

### New MCP tools (exec-2) and CLI fallback
- `hq_pitch {title, oneLiner, coreLoop, evidence, risks}` -> POST /api/pitches.
- `hq_learn`, `hq_lane_gate` as above. Total tools after this: 12 (list them in the test).
- `tools/agent-hq/hqctl.mjs`: `gate <engine> [--manual]`, `next <engine>`, `note <taskId> <text>`, `ask <taskId> <kind> <title> <why>`, `media <taskId> <path> <ask>`, `complete <taskId> <summary> [--state ...]`, `learn <role> <lesson>`, `pitch <json>`, `market`, `--help`. Reads `.agent-hq/token`, prints JSON. Every brief: "If the hq_* tools are not available, run `node tools/agent-hq/hqctl.mjs ...` from the repo root instead."

### Briefs (exec-2) gain, in this order
role header; hard rules; **Skills you must use** (from `skills`: "Invoke with the Skill tool: <name> (<when>)"; a line "If a listed skill is not installed, say so in hq_note and continue"); **Tools to prefer** (`mcp`); vault chapters; owned files; lessons; conversation so far; the task; **Definition of done** (`doneWhen`); reporting contract (+ "Record 0 to 2 reusable lessons with hq_learn before hq_complete"). Antigravity briefs: "Before generating, read `.agents/rules/agent-hq-art-direction.md` and follow it strictly; then `.agents/skills/roblox-ui-concept/SKILL.md` (UI mockups) or `.agents/skills/roblox-store-art/SKILL.md` (icon, thumbnails, pass, product, badge art). Run its scored self-check on every image."

## Roster
- exec-1: server + db (T16)
- exec-2: roles, briefs, MCP, hqctl, Antigravity registration (T17)
- exec-3: Teams-style UI + cadence controls (T18)
- exec-4: hq-worker skill, docs, decisions, README (T19)

## Tasks

### T16 [owner: exec-1] [deps: none] [status: done]
Files: tools/agent-hq/server.mjs, tools/agent-hq/db.mjs, tools/agent-hq/test/server.test.mjs, tools/agent-hq/test/db.test.mjs, tools/agent-hq/memory/.gitkeep
Do: gate pipeline, conversations (any-role messages queue tasks, reset, threads + unread), role memory endpoints, laneSchedules + lane gate (inject `now` for tests). Columns gateFor, attempt, threadMessageId with migration for existing DBs (ALTER TABLE ADD COLUMN when missing). Gate tasks are created with the gate role's default engine.
Done when: full test command passes with new tests: builder task to review queues reviewer + playtester gates; a FAIL gate queues a Fix task with attempt 2; third FAIL creates an owner ask; all PASS marks done; message to builder queues a builder task; reset marker; unread counts; memory append/dedupe/cap; every lane-gate branch including an overnight window and manual bypass.
Talk to: exec-2 (memory/messages shapes), exec-3 (threads, laneSchedules).

### T17 [owner: exec-2] [deps: T16 shapes] [status: done]
Files: tools/agent-hq/roles.json, tools/agent-hq/briefs.mjs, tools/agent-hq/mcp.mjs, tools/agent-hq/hqctl.mjs, tools/agent-hq/register-antigravity.mjs, .agents/workflows/hq-design.md, tools/agent-hq/test/briefs.test.mjs, tools/agent-hq/test/mcp.test.mjs, tools/agent-hq/test/runner.test.mjs (only if role fields break it)
Do: roles.json fields and loadouts exactly per the table. Briefs per the order above. MCP tools hq_lane_gate, hq_learn, hq_pitch; keep hq_create_task fail-closed. hqctl.mjs. Sidecar prompt: call hq_lane_gate engine "antigravity" first; stop if run is false; else up to maxTasks times: hq_next_task, read the art rules and skill named in the brief, generate, self-check, hq_add_media, hq_learn (optional), hq_complete. Grants add mcp(agent-hq/hq_lane_gate), mcp(agent-hq/hq_learn), read_file(<repo>/.agents), read_file(<repo>/assets), read_file(<repo>/captures). `/hq-design` workflow: same loop with manual true. Finally run `node tools/agent-hq/register-antigravity.mjs` for real (owner-authorized; still never write an enabled flag).
Done when: full test command passes (briefs test: builder brief names its three skills and its doneWhen, antigravity brief names the rule file, all briefs contain the hqctl line and lessons section; mcp test: 12 tools); `node tools/agent-hq/hqctl.mjs --help` works; the sidecar on disk contains hq_lane_gate.
Talk to: exec-1, exec-4 (names), exec-3 (role color/icon fields).

### T18 [owner: exec-3] [deps: T16 shapes, T17 role fields] [status: done]
Files: tools/agent-hq/public/**
Do: rebuild Team and Lead as a Microsoft Teams style messenger (match the reference's structure, not its code or assets):
- Sidebar: Workspace (Home, Lead, Team, Tasks, Review with badges), Studio (Pitches, Market, Library, Settings), a "Team" grid of 16 role avatars (rounded squares in role.color with a drawn icon per role.icon, green ring when working) that open that chat, footer with N working, Studio holder, Pause.
- Team view = two columns. Roster: header "Team" + "N working · M need you"; one row per role: avatar with status ring, name, detail line ("On: <task title>" when working, else last message preview, else "N tasks waiting"), right side status chip (WORKING green, QUEUED blue, REVIEW amber, IDLE grey), relative time, "N queued", unread badge. Conversation: header with avatar, name, status dot + label, current task chip, queued chip, engine and model, actions New task, Lessons (drawer listing /api/memory/:role), Start fresh (reset), Stop (cancel the working task); message list (owner bubbles right, agent messages left rendered as markdown: headings, bold, lists, code, images from /media/; system dividers; inline task cards with state chips that open the task drawer; review asks show the image with Approve / Ask for changes); a "Working · new messages wait their turn" typing row while the role has a working task; composer "Message <Label>…" (Enter sends, Shift+Enter newline) posting to /api/messages. Mark thread read on open.
- Lead view = the same conversation component for lead, full width.
- Settings > Lanes: per lane Enabled switch, Work every (Claude app 1, 2, 3, 4, 6, 8, 12, 24 hours; Antigravity 20, 40, 60, 120, 240, 1440 minutes), Active hours from/to (overnight allowed), Max tasks per run, Last run, Next eligible, and the explainer "The Claude app checks in every hour and Antigravity every 20 minutes; HQ decides from these settings whether they work."
- Tasks board shows gate tasks with a "gate" tag and attempt number.
- Phone width: roster list first, opening a chat replaces it with a back arrow.
Done when: against a running server every route renders with no console errors; sending a message to Builder shows the owner bubble and a queued task card; Start fresh adds the divider; lane settings persist across reload; works at 1280x800 and 390 px.
Talk to: exec-1, exec-2.

### T19 [owner: exec-4] [deps: T17 names] [status: done]
Files: .claude/skills/hq-worker/SKILL.md, tools/agent-hq/README.md, .claude/skills/roblox-agent-team/SKILL.md, docs/decisions.md
Do: hq-worker skill: step 0 decide manual (a person asked in chat) vs scheduled (prompt says "scheduled HQ worker"); call hq_lane_gate {engine:"app", manual}; stop with the one-line reason if run is false; use maxTasks. Spawn each task with `subagent_type` = the role's `agentType` from roles.json and model from the role; the prompt is the brief verbatim. Never let two subagents write the same files at once (check the roles' `files`); never two needsStudio at once. After each subagent ends, if the task is still working, call hq_complete with its report; if the subagent recorded no lesson and its report contains one, call hq_learn. Fallback to hqctl when hq_* tools are missing. README: rewrite around the Teams-style chat, gates, memory, skills loadouts table, cadence, Antigravity art rules, hqctl, and "why this beats one Claude chat". roblox-agent-team SKILL.md: point at roles.json as the source of truth for skills and gates. docs/decisions.md: add a decision entry for Agent HQ (local dashboard, Claude app + Antigravity lanes, gates, no CLIs, owner approves publishing) in the file's existing format.
Done when: files updated; `grep -n "hq_lane_gate" .claude/skills/hq-worker/SKILL.md` finds it; full test command passes.
Talk to: exec-2.

# Agent HQ revision 2: no CLIs. Claude desktop app does the work, Antigravity app does UI design only

Context: builds on `.claude/plans/agent-hq.md` (read its "Shared interfaces" first; everything there still holds unless changed here). Owner decision 2026-10-22: the owner does not use the `claude` CLI or the `agy` CLI. Everything except visual design runs in the **Claude Code desktop app**; UI design and image work run in the **Antigravity app** (built-in `generate_image` tool). Both apps reach HQ through `mcp.mjs`. The `agy` engine is removed. The old `claude` spawn engine stays only as an optional engine renamed `claude-cli` (never a default). Test command: `node --test test/*.mjs` from `tools/agent-hq`.

Verified facts:
- Antigravity reads workspace `.agents/workflows/*.md` (slash workflows), `.agents/rules/`, `.agents/skills/`. MCP config: `~/.gemini/config/mcp_config.json`. Scheduled automations are files `~/.gemini/config/sidecars/<id>/sidecar.json`, shape: `{"builtin":"schedule","args":["CRON_TZ=<IANA zone> <5-field cron>","agentapi","new-conversation","--","<prompt>"],"restart_policy":"always","display_name":"...","description":"...","agent_permissions":{"workspace_uris":["file:///C:/..."],"access_grants":["mcp(agent-hq/hq_next_task)","write_file(<abs path>)","read_file(<abs path>)"]}}`. Snake_case keys only. The owner enables it in Antigravity's Automations dashboard; code must never enable it.
- Claude desktop app: project MCP servers come from repo-root `.mcp.json`. Scheduled runs come from the app's scheduled-tasks feature (the Lead sets that up in chat; no code for it).

Engine vocabulary (replace everywhere): `"app" | "antigravity" | "claude-cli" | "echo"`. Old stored values migrate on read: `claude`->`claude-cli`, `agy`->`antigravity`, `manual`->`app`.
- `app`: stays queued until a Claude desktop session claims it with `hq_next_task`. Default for every role except designer and thumbnails.
- `antigravity`: stays queued until an Antigravity agent claims it with `hq_next_task`. Default for `designer` and `thumbnails`.
- `claude-cli`, `echo`: spawned by runner.mjs exactly as before (claude-cli = the old claude spawn).
- Engine is resolved **at task creation** in the server: `body.engine ?? settings.roleEngines[role].engine ?? role.engine ?? "app"`, then stored.

New shared interface:
- `POST /api/tasks/next` body `{engine: "app"|"antigravity", roles?: [roleId]}` -> `{task, brief}` or `{task: null}`. Atomically takes the oldest queued task with that engine (and role in `roles` when given); skips needsStudio tasks while another needsStudio task is working; sets state working + startedAt; on every call (even empty) sets setting `lanes` = `{...lanes, [engine]: {lastSeenAt: now}}`. `brief` = `buildBrief(...)`.
- `GET /api/state` adds `lanes: {app: {lastSeenAt|null}, antigravity: {lastSeenAt|null}}`; `engines` becomes `{"claude-cli": bool, "echo": true}`.
- MCP tool `hq_next_task {engine, roles?}` -> text of `{task, brief}` or `Queue empty for <engine>.` When HQ_TASK is unset every task-scoped tool takes `taskId`.
- Every brief contains: `Your HQ task id: <id>. Pass it as taskId to every hq_* tool.`
- Designer chain: when the owner answers a `review` ask with `approve` and the ask's task has role `designer`, the server also queues a `ui` task (engine app): title `Build approved concept: <designer task title>`, body `Rebuild the approved concept image at <mediaPath> as real Luau UI. Use the roblox-concept-art-ui skill, sections 2 to 4. The image is a reference only and is never shipped.`, parentId = designer task id, createdBy "owner".

## Roster
- exec-1: server + db changes (T8)
- exec-2: roles, briefs, runner/engines, MCP, Antigravity registration, `.mcp.json` (T9)
- exec-3: front end (T10)
- exec-4: skills, Antigravity workflow, README (T11)

## Tasks

### T8 [owner: exec-1] [deps: none] [status: done]
Files: tools/agent-hq/server.mjs, tools/agent-hq/db.mjs, tools/agent-hq/test/server.test.mjs, tools/agent-hq/test/db.test.mjs
Do: new engine vocabulary with migration on read in db.mjs. `nextRunnable` only returns engines `claude-cli` and `echo`. Add `claimNext(db, {engine, roles, studioBusy})` in a transaction. Engine resolution at creation. `POST /api/tasks/next` with lanes bookkeeping. Keep `/api/tasks/:id/claim` as an alias accepting engine "app"|"antigravity". Designer approve -> ui follow-up task. `/api/state` lanes + engines shape. roleEngines validation uses the new vocabulary.
Done when: `node --test test/*.mjs` passes with new tests: next returns the oldest app task and marks it working; empty queue returns {task:null} and updates lanes; designer approve queues a ui task; old engine values read back migrated.
Talk to: exec-2 (route shape), exec-3 (state shape).

### T9 [owner: exec-2] [deps: none] [status: done]
Files: tools/agent-hq/roles.json, tools/agent-hq/briefs.mjs, tools/agent-hq/engines.mjs, tools/agent-hq/runner.mjs, tools/agent-hq/mcp.mjs, tools/agent-hq/register-antigravity.mjs, tools/agent-hq/test/briefs.test.mjs, tools/agent-hq/test/runner.test.mjs, tools/agent-hq/test/mcp.test.mjs, .mcp.json (repo root)
Do:
- roles.json: add `engine` to every role. New 16th role `{id:"designer", label:"Concept designer", job:"Draws UI concepts, screen mockups and icon ideas with image generation. Never writes game code.", chapters:[5,8,11], mode:"docs", files:["assets/concepts/**"], model:"sonnet", needsStudio:false, engine:"antigravity", allowedTools: read-role list}`. `thumbnails`: engine antigravity, files add `assets/concepts/**`. All others engine "app".
- briefs.mjs: the task-id line. For engine antigravity add an "Image work" section: use your built-in generate_image tool; match the palette and style in src/client/UI/Theme.luau and the rules in .claude/skills/roblox-concept-art-ui/SKILL.md; save each PNG as assets/concepts/<taskId>-<n>.png; call hq_add_media {taskId, path, ask} for each; then hq_complete; never edit src/. For engine app add "Running in the Claude desktop app: stay inside this role's files and tools."
- engines.mjs/runner.mjs: rename claude->claude-cli, delete agy code; runner `engines()` -> `{"claude-cli": bool, echo: true}`.
- mcp.mjs: add `hq_next_task`; keep hq_claim_task as an alias. Update tool-count test.
- register-antigravity.mjs: also writes `~/.gemini/config/sidecars/agent-hq-design/sidecar.json` (backup existing first) with args[0] `CRON_TZ=<Intl.DateTimeFormat().resolvedOptions().timeZone> */20 * * * *`, prompt: `Agent HQ design lane. Call the agent-hq MCP tool hq_next_task with engine "antigravity". If the queue is empty, stop immediately and do nothing else. Otherwise follow the returned brief exactly: create the images with generate_image, save them under assets/concepts/, call hq_add_media for each, then hq_complete. Then call hq_next_task again and repeat until the queue is empty.`, display_name `Agent HQ design lane`, description, restart_policy always, agent_permissions `{workspace_uris:[file URI of repo root], access_grants:[mcp(agent-hq/hq_next_task), mcp(agent-hq/hq_note), mcp(agent-hq/hq_ask_owner), mcp(agent-hq/hq_add_media), mcp(agent-hq/hq_complete), mcp(agent-hq/hq_vault), read_file(<repo>/src/client/UI), read_file(<repo>/docs), read_file(<repo>/.claude/skills), write_file(<repo>/assets/concepts)]}`. Never write an `enabled` flag or touch user_config.json. `--dry-run` prints both files; `--remove` removes the mcp entry and the sidecar folder.
- Repo `.mcp.json`: add `"agent-hq": {"command": "node", "args": ["tools/agent-hq/mcp.mjs"]}` and keep `Roblox_Studio` unchanged.
Done when: `node --test test/*.mjs` passes and `node register-antigravity.mjs --dry-run` prints the merged mcp_config.json and the sidecar.json.
Talk to: exec-1 (next route), exec-4 (exact tool names).

### T10 [owner: exec-3] [deps: T8 shape] [status: done]
Files: tools/agent-hq/public/**
Do: engine options everywhere: `app` "Claude app", `antigravity` "Antigravity (design)", `claude-cli` "Claude CLI (optional)", `echo` "Echo (test)". Settings: replace the engine status block with a "Lanes" card showing the Claude app worker and the Antigravity design lane, each with last seen (from state.lanes; "never" when null) and a one-line how-to: "In Claude Code desktop, run /hq-worker, or let the scheduled HQ worker run it." / "Enable 'Agent HQ design lane' in Antigravity > Automations, or run /hq-design in Antigravity." Home: a slim lanes strip under the chips with the same last-seen info. Task cards show the engine label. Team shows 16 roles.
Done when: every route renders with no console errors against the running server (`node server.mjs`, port 4317) and engine selects show the four options.
Talk to: exec-1 for the state shape.

### T11 [owner: exec-4] [deps: T9 tool names] [status: done]
Files: .claude/skills/hq-worker/SKILL.md, .agents/workflows/hq-design.md, .claude/skills/roblox-concept-art-ui/SKILL.md, .claude/skills/roblox-agent-team/SKILL.md, tools/agent-hq/README.md
Do:
- `hq-worker` skill for the Claude desktop app. Frontmatter description: "Use when asked to work the Agent HQ queue, or when the scheduled HQ worker runs." Steps: (1) make sure HQ is up (agent-hq MCP tools answer; if not, tell the user to start it with scripts/hq.ps1 and stop). (2) `hq_next_task {engine:"app"}`; empty -> say "Queue empty" and stop. (3) For each claimed task spawn a subagent with the Agent tool: prompt = the brief verbatim; model = the role's model from tools/agent-hq/roles.json; subagent_type "Explore" for mode "read" roles, "general-purpose" otherwise. Run at most 2 at a time, never two needsStudio tasks at once. (4) When a subagent ends and its task is still working, call hq_complete {taskId, summary from its report, state "review"}. (5) Loop until empty or 8 tasks done this run, then give a short report. CLAUDE.md hard rules apply: never publish, spend Robux or install tools.
- `.agents/workflows/hq-design.md` for Antigravity: frontmatter `description: Work the Agent HQ design queue`; body = the sidecar prompt loop from T9 plus the image rules from briefs.
- roblox-concept-art-ui SKILL.md: the image step now goes through Antigravity's image generation by queuing a `designer` task in Agent HQ (or running /hq-design in Antigravity); drop ChatGPT. Keep: "No image needed? Claude designs straight from the rules (spec, build, Studio capture, review, fix)."
- roblox-agent-team SKILL.md: add the designer row; note which roles run in Antigravity vs the Claude app.
- README: rewrite Engines around the two app lanes (Claude app: `.mcp.json` + /hq-worker + the app's scheduled task; Antigravity: register script + "Agent HQ design lane" automation + /hq-design), CLI engines optional; remove the agy install instructions.
Done when: the files exist, `node --test test/*.mjs` passes, and `grep -n "install.ps1" tools/agent-hq/README.md` finds nothing.
Talk to: exec-2 for exact tool names.

> Superseded by agent-hq-r4.md (nothing here landed).

# Agent HQ revision 3: configurable lane cadence + strict art rules wired in

Context: builds on `.claude/plans/agent-hq.md` and `agent-hq-r2.md` (read their shared interfaces). Owner request 2026-10-22: the Claude app worker runs hourly and the cadence must be configurable; the Antigravity design automation is on; Antigravity must follow strict art rules. The art rules already exist (do not edit them): `.agents/rules/agent-hq-art-direction.md`, `.agents/skills/roblox-ui-concept/SKILL.md`, `.agents/skills/roblox-store-art/SKILL.md`. Test command from `tools/agent-hq`: `node --test test/*.test.mjs && node test/smoke.mjs`.

How cadence works: the outside schedulers fire at a fixed base rate (Claude app scheduled task: hourly; Antigravity automation: every 20 min). On every fire the worker first asks HQ "should I work now?" through a gate. HQ decides from a setting the owner edits in the dashboard. So the owner changes cadence in HQ, never in the apps.

Shared interface:
- Setting `laneSchedules` (JSON), defaults: `{ app: {enabled: true, everyMinutes: 60, activeFrom: "00:00", activeTo: "24:00", maxTasks: 8}, antigravity: {enabled: true, everyMinutes: 20, activeFrom: "00:00", activeTo: "24:00", maxTasks: 6} }`. Validation: everyMinutes integer 20..1440 (app: multiple of 60 is not required); times "HH:MM" 00:00..24:00, activeFrom may be later than activeTo (overnight window); maxTasks 1..20. Times are server-local.
- `POST /api/lanes/:engine/gate` body `{manual?: boolean}` (engine app|antigravity) -> `{run: boolean, reason: string, maxTasks: number, queued: number}`. Order of checks: disabled -> `{run:false, reason:"lane paused in HQ"}` (manual also blocked); global `paused` setting -> run false; queued count for that engine is 0 -> run false "queue empty"; if not manual: outside active window -> false "outside active hours"; `now - lanes[engine].lastRunAt < everyMinutes - 2 min` -> false "not due until HH:MM". Otherwise run true and set `lanes[engine].lastRunAt = now` (keep lastSeenAt updates as today; the gate also updates lastSeenAt). Emits a `settings` event for `lanes`.
- MCP tool `hq_lane_gate {engine, manual?}` returning the JSON as text.
- CLI fallback `tools/agent-hq/hqctl.mjs` (for sessions where the MCP server is not loaded): `node tools/agent-hq/hqctl.mjs gate <engine> [--manual]`, `next <engine>`, `note <taskId> <text>`, `ask <taskId> <kind> <title> <why>`, `media <taskId> <path> <ask>`, `complete <taskId> <summary> [--state review|done|failed]`. Reads `.agent-hq/token`, talks to `http://127.0.0.1:4317`, prints JSON. Same validation as the MCP tools; reuse code by importing shared helpers from mcp.mjs if practical, otherwise duplicate minimal fetch code.

## Roster
- exec-1: server gate + settings (T12)
- exec-2: MCP tool, hqctl, briefs, sidecar/workflow prompts (T13)
- exec-3: Settings lane controls (T14)
- exec-4: hq-worker skill + README + agent-team skill (T15)

## Tasks

### T12 [owner: exec-1] [deps: none] [status: todo]
Files: tools/agent-hq/server.mjs, tools/agent-hq/db.mjs (only if a helper is needed), tools/agent-hq/test/server.test.mjs
Do: `laneSchedules` setting with defaults and validation in `POST /api/settings`; include it in `/api/state` settings. `POST /api/lanes/:engine/gate` exactly as specified (inject a clock for tests: `startServer({now})` optional, default `Date.now`).
Done when: tests cover disabled, paused, empty queue, outside window (including an overnight window), not due, manual bypass, and run=true updating lastRunAt; full test command passes.
Talk to: exec-2 (route shape), exec-3 (setting shape).

### T13 [owner: exec-2] [deps: T12 shape] [status: todo]
Files: tools/agent-hq/mcp.mjs, tools/agent-hq/hqctl.mjs, tools/agent-hq/briefs.mjs, tools/agent-hq/register-antigravity.mjs, .agents/workflows/hq-design.md, tools/agent-hq/test/mcp.test.mjs, tools/agent-hq/test/briefs.test.mjs
Do: add `hq_lane_gate`. New `hqctl.mjs` as specified, with a `--help`. briefs.mjs: (a) every brief says how to report when hq_* tools are missing: "If the hq_* tools are not available, run `node tools/agent-hq/hqctl.mjs ...` from the repo root instead (see `node tools/agent-hq/hqctl.mjs --help`)." (b) engine antigravity briefs: replace the image section's style lines with: "Before generating, read `.agents/rules/agent-hq-art-direction.md` and follow it strictly. Then read `.agents/skills/roblox-ui-concept/SKILL.md` for UI mockups, or `.agents/skills/roblox-store-art/SKILL.md` for icons, thumbnails, pass, product and badge art, and use its prompt template. Run the rule file's self-check on every image before hq_add_media." Keep the save path and hq_add_media/hq_complete steps. register-antigravity.mjs sidecar prompt: first call `hq_lane_gate` with engine "antigravity"; if run is false stop immediately; else call hq_next_task up to maxTasks times, following each brief and the art rules. Add `mcp(agent-hq/hq_lane_gate)` and `read_file(<repo>/.agents)` and `read_file(<repo>/assets)` to access_grants. `.agents/workflows/hq-design.md`: same loop, but call the gate with manual true, and reference the rule file and the two skills by path. Re-run `node register-antigravity.mjs` for real at the end (it backs up and keeps other entries; it must still never write an enabled flag).
Done when: full test command passes (mcp test lists 10 tools; briefs test asserts the rule-file path appears in antigravity briefs and the hqctl line in all briefs); `node hqctl.mjs --help` prints usage; the sidecar on disk contains hq_lane_gate.
Talk to: exec-1 (gate route), exec-4 (tool and hqctl names).

### T14 [owner: exec-3] [deps: T12 shape] [status: todo]
Files: tools/agent-hq/public/**
Do: in Settings > Lanes, each lane card gets controls bound to `laneSchedules[engine]`: an Enabled switch, "Work every" select (Claude app: 1, 2, 3, 4, 6, 8, 12, 24 hours; Antigravity: 20, 40, 60, 120, 240 minutes, 1440), Active hours from/to (time inputs, note "overnight windows allowed"), Max tasks per run (1-20). Save via `POST /api/settings {key:"laneSchedules", value}`. Show "Last run" (lanes[engine].lastRunAt) and "Next eligible" (lastRunAt + everyMinutes, or "on next fire"). One-line explainer under the card: "The Claude app checks in every hour and Antigravity every 20 minutes; HQ decides from these settings whether they work." Home lanes strip shows "paused" when a lane is disabled.
Done when: against the running server, changing a value and reloading shows it persisted; no console errors; layout fine at 390 px.
Talk to: exec-1 for the setting shape.

### T15 [owner: exec-4] [deps: T13 names] [status: todo]
Files: .claude/skills/hq-worker/SKILL.md, tools/agent-hq/README.md, .claude/skills/roblox-agent-team/SKILL.md
Do: hq-worker skill: new step 0: decide `manual` (true when a person asked in chat to work the queue; false when the prompt says it is the scheduled HQ worker). Call `hq_lane_gate {engine:"app", manual}`; if run is false, reply with one line containing the reason and stop without doing anything else. Use the returned maxTasks as the per-run cap. If the hq_* MCP tools are missing in the session, use `node tools/agent-hq/hqctl.mjs` for every step (gate, next, complete). Keep the rest of the loop. README: a "Cadence" section (base fire rates, the gate, Settings > Lanes controls, overnight windows), the art-rules files for Antigravity, hqctl. roblox-agent-team: one line pointing designer/thumbnail work at the Antigravity art rules.
Done when: the files mention hq_lane_gate and hqctl, and the full test command still passes.
Talk to: exec-2 for exact names.

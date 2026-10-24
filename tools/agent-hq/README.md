# Agent HQ

A local control room for the Roblox agent team. You message each of 16 role agents individually in a Teams-style chat, approve their output in one inbox ("Needs you"), and watch them work. No npm dependencies, only Node 24+. No `claude` or `agy` command line needed.

## Start

```powershell
scripts/hq.ps1
```

`scripts/hq.ps1` starts HQ hidden if it is not running and opens a signed-in tab (`http://127.0.0.1:4317/#owner=<owner token>`). The page keeps the owner token in that browser's localStorage and removes it from the address bar. Opening http://127.0.0.1:4317 directly only works in a browser that has signed in once; otherwise it shows "Sign in to Agent HQ", so run `scripts/hq.ps1` again. You can also start the server by hand with `node tools/agent-hq/server.mjs`. State lives in `<repo>/.agent-hq/` (gitignored): `hq.db`, `owner-token` (yours), `token` (the agents'), `logs/`, `media/`. Role memory is in `tools/agent-hq/memory/` (committed).

## Using it

- **Team**: a roster of all 16 roles with status (working, queued, review, idle). Click one to open its chat. Whatever you send becomes a task for that role; messages wait their turn while it is working. Buttons: New task, Lessons (what the role has learned), Start fresh (new conversation), Stop (cancel the working task).
- **Lead**: the same chat for the Lead, who plans and delegates to the others.
- **Tasks**: board of queued, working, review and done. Gate tasks carry a "gate" tag and an attempt number.
- **Review**: everything waiting for you: decisions, things to try, images to approve.
- **Pitches / Market / Library / Settings**: scout pitches, Roblox charts, the knowledge vault and skills, lane cadence and budget.

## Pages

- **Games**: one tab per game, with three sub-tabs.
  - *Overview*: version, what is new in it, the next step and a note (both editable), open work with states, and what is on your to-do list.
  - *Live numbers*: players, visits and favorites read from Roblox once you give the game's universe id and press Refresh; like ratio, day-1 and day-7 retention, session length and paying share against their targets, with "not measured" until the game is public; trend charts; things brought to your attention. Numbers Roblox does not publish are recorded by Live ops (`hq_metric`).
  - *Pipeline*: nine stages from Pitched to Graded with the role that owns each. The game sits in its current stage, open stage requests and tasks show in their columns, and a drawer holds the stage history. Agents can only ask for the next stage; "Live" is yours (Mark live, after you publish by hand).
- **Pitches**: tabs for Needs your decision, Waiting on Scout, Your ideas and History. Each card shows window, format and origin, how we differ from the competition, stat tiles (top earning rank, top comparable playing, its likes, upvotes per day, similar games) and the money verdict, then collapsible sections: The game, Competition, Evidence, Building it, Risks. Actions: Approve, Edit and approve (inline editor), Request changes (note goes to the Scout), Decline. Approving one withdraws the other open pitches. "Compare side by side" lines up 2 or 3 ticked pitches; "New game idea" hands your own idea to the Scout to evaluate.
- **Market**: four steps. 1, Charts: the Roblox charts with the biggest rank moves between the two latest snapshots, one tab per chart list, and a table with rank change, players, change, likes, votes and how many lists a game is on. 2, Corpus: reference games with icon and thumbnail, added or removed by universe id. 3, Benchmarks: the targets a game should hit, how each is measured, what a miss means and where the number comes from. 4, Breakouts: young games that are growing quickly. Refresh updates charts and breakouts; every game row has "Ask scout".
- **Library**: Assets (search by name or tag, filter by kind and scope, Roblox upload status; the index is `assets.json` plus any unindexed files under `assets/`), Systems (the catalogue in `systems.md` of reusable game systems and where they live), Vault (the knowledge chapters) and Skills.

## Roles and skills

`roles.json` is the source of truth. Each role has a model, an `agentType`, the skills it must use, the tools it should prefer, a definition of done, and the roles that check its work (`gates`).

| Role | Runs in | Skills (when) | Gates |
|---|---|---|---|
| lead | Claude app | roblox-agent-team; brainstorming (new idea); writing-plans (3+ steps) | none |
| scout | Claude app | agent-reach, watch, deep-research | none |
| architect | Claude app | writing-plans; grill:roast | none |
| builder | Claude app | test-driven-development; systematic-debugging; verification-before-completion | reviewer, playtester |
| ui | Claude app | roblox-concept-art-ui; taste-skill:redesign-skill; verification-before-completion | reviewer, kid-tester |
| world | Claude app | verification-before-completion | playtester |
| librarian | Claude app | verification-before-completion | reviewer |
| economy | Claude app | test-driven-development; dataviz | reviewer |
| merchant | Claude app | test-driven-development; pricing (research only) | reviewer |
| kid-tester | Claude app | run | none |
| playtester | Claude app | run; systematic-debugging (report, do not fix) | none |
| reviewer | Claude app | code-review; security-review | none |
| producer | Claude app | verification-before-completion | none |
| liveops | Claude app | roblox-launch-tips; dataviz | none |
| designer | Antigravity | art-direction rule + UI concept skill | none |
| thumbnails | Antigravity | art-direction rule + store art skill | none |

Each brief is built from the repo hard rules, the skills to invoke, preferred tools, the role's vault chapters, owned files, the role's lessons, the last messages of the conversation, the task and the definition of done. Only the Lead can create tasks for others.

## Quality gates and memory

- **Gates**: when a role finishes, HQ queues its checkers (for example Reviewer and Playtester after a Builder task). A checker starts its summary with PASS or FAIL. FAIL queues a Fix task for the original role with the feedback; after 3 attempts it becomes a decision for you. When every gate passes, the task is marked done.
- **Memory**: roles record reusable lessons (`hq_learn`); the newest 15 are included in every later brief. Edit or prune `memory/<role>.md` by hand if one is wrong.

## Engines and lanes

Work is done by two apps, each pulling tasks from its own lane with the `hq_next_task` MCP tool. A task waits in the queue until a session of that app claims it.

| Engine | Who runs it | Default for |
|---|---|---|
| `app` ("Claude app") | A Claude Code desktop session | every role except designer and thumbnails |
| `antigravity` ("Antigravity (design)") | An Antigravity agent, using its built-in `generate_image` | designer, thumbnails |
| `claude-cli` (optional) | HQ spawns `claude -p` itself (needs the `claude` CLI; `--permission-mode acceptEdits` plus a per-role allow-list) | never |
| `echo` | Fake engine for tests and dry runs | never |

The engine is chosen when a task is created: the task's own engine, else the role's setting (Team screen), else the role default.

### Claude app lane

1. The repo-root `.mcp.json` registers the `agent-hq` MCP server. Open the project in Claude Code desktop.
2. In a session, run `/hq-worker`. It checks HQ is up (and starts it if not), asks the lane gate whether to work, claims tasks, runs each as a subagent with the role's `agentType` and model, and reports back.
3. The unattended run already exists in the Claude app: Scheduled, "Agent HQ worker (hourly check-in)", which runs at :14 past every hour. It only asks the lane gate whether to work, so you change cadence in HQ (Settings > Lanes), not in the app.

### Antigravity lane (design only)

1. Register the HQ tools and the design automation once:
   ```powershell
   node tools/agent-hq/register-antigravity.mjs --dry-run   # preview
   node tools/agent-hq/register-antigravity.mjs             # write (makes .bak copies first)
   node tools/agent-hq/register-antigravity.mjs --remove    # undo
   ```
2. In Antigravity, turn on "Agent HQ design lane" under Automations (HQ never enables it for you), or run `/hq-design` by hand (`.agents/workflows/hq-design.md`).
3. Images are saved to `assets/concepts/` and show up under "Needs you". Approving a designer task queues a `ui` task that rebuilds the concept as Luau.
4. Antigravity must follow the art rules: `.agents/rules/agent-hq-art-direction.md` (strict rules and a scored self-check), `.agents/skills/roblox-ui-concept/SKILL.md` (UI mockups) and `.agents/skills/roblox-store-art/SKILL.md` (icons, thumbnails, passes, products, badges). Every antigravity brief points at them.

## Cadence

The outside schedulers fire at a fixed base rate: the Claude app task hourly, the Antigravity automation every 20 minutes. On every fire the worker first calls the lane gate (`hq_lane_gate`). HQ decides from Settings > Lanes whether it works now, so you change cadence in HQ, never in the apps.

Per lane you can set: Enabled, Work every (Claude app 1 to 24 hours, Antigravity 20 minutes to 24 hours), Active hours from/to, and Max tasks per run. Overnight windows work (for example 22:00 to 06:00). The gate says no when the lane is disabled, HQ is paused, the queue is empty, it is outside active hours, or the lane ran too recently. A person asking in chat (`manual`) skips the hours and spacing checks but not the disabled, paused and empty checks. Times are this computer's local time.

Run on schedules or events, not 24/7, or you burn usage. Pause HQ when you step away.

Recurring tasks (Settings, Schedules), where present, are separate: they enqueue a task every N minutes.

## hqctl (when MCP tools are not loaded)

```powershell
node tools/agent-hq/hqctl.mjs --help
node tools/agent-hq/hqctl.mjs gate app --manual
node tools/agent-hq/hqctl.mjs next app
node tools/agent-hq/hqctl.mjs complete <taskId> "summary" --state review
```

Run it from the repo root. It reads `.agent-hq/token`, talks to the local server and prints JSON. It also has `note`, `ask`, `media`, `learn`, `pitch` and `market`.

## Why this beats one Claude chat

- Specialists with only their own vault chapters, skills and tools, instead of one chat holding everything.
- Automatic review: a Reviewer and a tester check every code change and send failures back, up to 2 rework rounds, before it reaches you.
- Lessons carry over: each role's memory is part of every later brief.
- A persistent conversation per role, so you message the Builder and the Merchant separately.
- Parallel work under a budget, with a Studio lock so only one task drives Studio.
- You only approve: images, decisions, things to try. Agents never publish, spend Robux or install tools.

## Safety

- Binds `127.0.0.1` only. Every `/api/*` call except `/api/health` needs the `x-hq-token` header. There are two credentials: the owner token (`.agent-hq/owner-token`, used only by the dashboard and never embedded in the page; it reaches the browser in the URL fragment, which is never sent to the server) and the agent token (`.agent-hq/token`, read by MCP and `hqctl`, which cannot do owner-only things such as approving or marking a game live). No CORS.
- Bodies over 1 MB are rejected; every input is validated. Spawned processes use an args array, never a shell.
- Agents never publish, spend Robux or install tools (see `CLAUDE.md`). Anything the owner must decide shows up under "Needs you".
- Studio is shared: one task holds the Studio lock at a time.
- Each claimed task carries its own `taskToken`, printed in its brief. Calls that act on a task (`hq_complete`, `hq_note`, ...) must present that task's token, so one agent cannot report on another's task. The worker gives each brief to its own subagent only and passes the matching token when it completes a task itself.
- HQ never turns on the Antigravity automation or a Claude app scheduled task for you.

## Tests

```powershell
cd tools/agent-hq
npm test                 # unit tests, then the smoke run
node test/smoke.mjs      # end to end with the echo engine, prints PASS
```

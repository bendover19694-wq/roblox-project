# trev (@trevsagents): agent studio research

- Collected 2026-10-22. Sources: 44 Instagram reels from @trevsagents (transcribed with local Whisper; many are music-only), the public site https://roautomation.dev, and its interactive control-room demo at https://roautomation.dev/demo/control-room/index.html.
- Everything is the creator's claim and **Unverified**. The paid products (studio $199, vault $125, Inner Circle $49/month) were not bought; Discords were not joined.
- Use: the design of our own Agent HQ (`tools/agent-hq/`). We copy the workflow shape, not code, names or assets.

## What the reels say (paraphrased)
- **One manager agent first.** It tracks the other agents, finds errors, writes daily briefs, runs "meetings" and hands out tasks. Run it on the strongest model.
- **Second: a research agent.** It pitches ideas with evidence. The owner clicks approve; the approval goes to the manager, who delegates to a builder agent.
- **"One button" flow.** Research agent finds demand, owner approves, builder ships. The owner's job is approve / reject / try it.
- **Cost.** Agents run on the Claude Code subscription, not API tokens; a $4-5/month VPS lets them run with the PC off. Claimed ~$100/month total.
- **Schedules and events, not 24/7.** The manager wakes about once an hour to check status, route tasks and report; trading agents twice a day; product agents only when the owner approves something (an event). Running agents nonstop "rinses" the plan's usage limits.
- **Pitch, then build.** For the Roblox game (a dinosaur game), the research agent pitched with evidence; the owner clicked build and the team ran "a couple thousand tasks". Agents send reviewables (e.g. a game trailer) for approve / deny / ask for changes.
- **Meetings.** Agents periodically review which projects work and which fail, then propose fixes.
- **Skills library ("armory").** Agents learn skills from shared files; guide files and "lessons learned" docs are handed to the LLM.
- **Roblox pivot (Oct 2026).** 15 specialist agents, an Obsidian vault (100k+ words, written with a top developer) that agents read before each task, an approval dashboard, games built overnight.

## What the demo shows (reverse engineered with REA + the browser)
REA evidence: `analyze_javascript_application` on the demo's single inline bundle, evidence `ev_2397ee3f...` (1 file, 238k AST nodes, no parse failures). Observed: no network endpoints; all data comes from an in-bundle `sample-data` object. Inferred from that object and the UI:
- **Desktop app, file-backed.** The UI calls `window.control.*` (an Electron-style bridge): `getState`, `taskCreate`, `taskDecide`, `threadSend`, `threadAnswer`, `threadStop`, `threadPermission`, `pauseAll`, `resumeAll`, `liveopsRefresh`, `onTasks`, `onThreads`, `onStateChange`. State entries look like `{path, exists, data, error, mtimeMs}`: the app reads JSON files in the repo and watches their modification times.
- **Tasks:** `{id, title, to (role), state: queued|working|review|done, body, from: "lead", game, createdUtc, startedUtc, threadId, result: {summary, media[]}}`.
- **Threads:** one chat thread per agent `{agent, status: idle|working, model, costUsd, messages[]}`; the Lead thread is the "Ask the Lead" box.
- **Owner inbox ("Needs you"):** todo items `{kind: decision|try, title, why, by, options[{id,label,recommended}], state: open|answered}` plus review media `{path, agent, ask, context, reviewable}` with verdicts approved / changes.
- **Studio lock:** `{holder, game, lanes, budget: 2}`: only one agent drives Roblox Studio per lane; a budget caps parallel agents.
- **Pipeline per game:** stages (designed, built, ...), a version and changelog, plus "live numbers" (CCU, visits, session length, D1/D7 retention) and a "Data freshness" panel.
- **Market:** chart snapshots (top-trending, up-and-coming), a "breakouts" list (young games over 500 playing, under 300k visits), and pitches with comparables, saturation count, competitor ceiling, risks, "first 60 seconds", "clippable moment" and icon idea.
- **Agent runtime:** per-agent model routing (`agentModels`), an engine flag (`api-key` in the demo).

## What we built from it
`tools/agent-hq/` (Agent HQ): local dashboard, SQLite state, 16 roles, owner inbox, review queue, pitches, live Roblox charts, vault viewer, schedules, Studio lock and budget. Work runs in the **Claude Code desktop app** (`/hq-worker`, optionally on the app's schedule) and **UI concept art runs in the Antigravity app** (image generation) through the same MCP server (`tools/agent-hq/mcp.mjs`). Approved concepts become Luau UI tasks for Claude.

## Differences on purpose
- Our hard rules (CLAUDE.md) go into every brief: no publishing, no Robux, server-authoritative value, no paid randomness.
- The knowledge vault is ours (`.claude/skills/roblox-agent-team/vault.md` plus `docs/` and `research/`), not theirs.
- Nothing runs unattended unless the owner turns a schedule on.

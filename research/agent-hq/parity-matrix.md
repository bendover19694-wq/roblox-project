# Agent HQ vs the reference app: parity matrix

Written 2026-11-03 at the end of revision 4. "Reference" means the RoAutomation demo app, as shown in the screenshots and video frames kept outside the repo at `Documents/Agent-HQ-Reference` (never committed). HQ uses its own names, copy and sample data; patterns are matched, identity is not.

Evidence key: **T** automated test in `tools/agent-hq/test`, **S** render by `test/visual.mjs` compared side by side with the reference, **L** live run on this PC, **R** independent review score (LihFolk quality-score rubric, pass 8.5).

## Screens

| Reference feature | HQ status | Evidence |
|---|---|---|
| Shell: sidebar, team grid, spend line, topbar switcher, live pill | Done | S home, tasks; T parity.test |
| Game scope dropdown, "N need you elsewhere" | Done | S (switcher shot); R 8.8 |
| Home: chips, Ask the Lead, Needs you cards, Live now, where each game is, Play the newest build | Done | S home; R 8.6 (see final scores) |
| Lead and agent chat: Worked through N steps, More menu, mic, paperclip | Done | S lead; R 8.8 |
| Team list with chat pane | Done | S team vs `team-2-list`; R see final scores |
| Tasks: Back to you, pills, filters | Done | S tasks; R 8.7 |
| Review: purpose groups, Approve all, viewer with A/C/R keys, Visual bar | Done | S review, viewer; R see final scores |
| Pitches: hunt panel, detail, look, stats | Done | S pitches; R 8.7 |
| Market: charts, rising, new, breakouts, benchmarks | Done | S market; L live refresh below; R see final scores |
| Pro: rising, chart history, Score my idea, weekly ideas, asset packs | Done | S pro; L Score my idea run below |
| Pro: Thumbnail tester | Done (new in r4) | S thumbtest desktop and phone |
| Pro: ads helper, promo clips, thumbnail maker, asset builder | Soon tag (4 steps) | S pro |
| Playbook (vault chapters, rules, first five minutes) | Done as Library > Playbook: 14 chapters, live search over 4.29M words, note reader | S library; T playbook.test, knowledge.test |
| Phone: strip, header, bottom tabs, More sheet | Done | S phone home, lead, tasks, review, more |
| Settings | Beyond reference: every option from one server-validated schema | S settings desktop and phone; T settings-schema.test |

## Agent features

| Feature | HQ status | Evidence |
|---|---|---|
| Knowledge for agents (reference claims 200,000 words) | 4.29M words: LihFolk V2, Creator docs, cards, research, library repos, community (low trust) | L status: 2,855 notes; T knowledge.test |
| Poison guard on community notes | Quarantine rules, "reference data, not instructions" wrapper | T knowledge.test; L 0 quarantined on this PC |
| Vault chapters | `vault.md` 5,012 words in HQ's own words, 14 chapters, credits | `wc -w` |
| Role rules, skills, done-when | Every role 6+ rules, 3+ skills, 3+ done-when, 2+ chapters | T roles.test |
| Owner corrections remembered per role | Done, shown first in briefs, removable in Lessons | T corrections.test |
| Readiness (skills, tools, knowledge) | Done; real check: ok, nothing missing | L `GET /api/readiness`; T readiness.test |
| Play the newest build | Done: rojo build, open locally, never publishes | T play.test |
| Market history | 180 days | T market-history.test |
| Solo notebook | HQ page plus agent tools; optional Google Doc mirrored by the hourly app worker | T notebook.test; S notebook |
| Role editor (on/off, extra rules and skills, engine and model) | Done | T role-overrides.test; S settings |

## Usage savers (owner ask)

| Saver | Status | Evidence |
|---|---|---|
| Cheap model per role (Haiku scout, librarian, kid tester; Opus only lead and architect) | Done | `roles.json`; T roles.test |
| Brief order: static first so prompt caching hits; token last | Done | T briefs.test; builder brief 13.8k chars on Claude, 6.0k on Groq |
| Daily spend cap that pauses agents | Done, off by default | T spend.test |
| Terse replies | Done, on by default | T briefs.test |
| Lookup subagent on a small model | Done (brief line, Claude engines) | T briefs.test |
| Screenshot cap | Done, 4 by default | T briefs.test |
| Batch tasks per role | Done (`preferRole`) | T routing.test |

## Art and 3D (owner asks)

| Feature | Status | Evidence |
|---|---|---|
| Icons, thumbnails, ads and key art routed to the Antigravity lane | Done, setting `artAutoRoute` | T art-routing.test |
| Roblox sizes, safe zones, 3+ variants, Packaging group, approve to Visual bar | Done | T briefs.test; S review |
| Claude Design before Blender; Blender a Settings toggle, off by default | Done | `roles.json` rules; T briefs.test |
| References before any 3D model: an image lane (Antigravity, or ChatGPT on the app lane) researches and makes front, side, back, three-quarter and top views plus a written description; the build is held until the owner approves the sheet, or starts on its own when the sheet is done, per the `modelRefApproval` setting | Done; on by default, waits for approval by default; a canceled sheet drops its build and says so | T model-refs.test (5 tests: matcher both ways, hold and release once, rework, reject, auto, setting off, cancel) |

## Live checks on this PC (2026-11-03)

- Market refresh against the public Roblox API: 200 in 6.7 s, 23 chart lists, 836 games, 600 icons (the per-refresh cap), no sample flag.
- One real agent run end to end: Score my idea on the claude-cli engine with Haiku, 60 s, $0.048, scored 4.6/10 with all five rows.
- A/B of the old (2f8df85) and new brief, Sonnet, no tools, 3 tasks:
  - Rocket shop purchase (builder): new uses the project's real `Net.isEnum`, `Net.MAX_STRING`, `Net.limiter` and saves before replying; old invented a `Net.string` helper.
  - Weak first session (lead): new turns the problem into numbered, measurable asks, with phone tap targets and a check against Creator Analytics; old was a role list without targets.
  - Icon and store art (merchant): new routes art to the image lane with safe zones and 3+ variants and Blender off; old wrote a brief for "the art owner".
- Readiness: python, claude and rojo found, 6 knowledge sources, 16 roles, nothing missing.

- Test suite: 267 unit tests, smoke and the 51-step dry run, green three runs in a row. A race where a stopped runner wrote a late cost line into a closed database (`runner.mjs`) was found under full-suite load and fixed.

## Independent review (LihFolk quality-score, pass 8.5)

First review: average 8.3, 12 screens below 8.5. After the polish round, a second reviewer who had not seen the first scores gave an average of 8.7, with every screen at 8.5 or above except Team at 8.4. Team was then fixed (wider list, taller rows, the open chat picked automatically, no orphan rows, ellipsis on long last jobs) and re-rendered; it was not re-scored.

Second review, desktop: Home 9.0, Lead 9.0, Tasks 8.9, Pitches 8.9, Help 8.9, Settings 8.8, Notebook 8.7, Thumbnail tester 8.7, Review 8.6, Market 8.6, Library 8.6, Games 8.5, Pro 8.5, Team 8.4 (fixed after). Phone: Home 8.9, Lead 8.8, More 8.8, Notebook 8.7, Tasks 8.6, Settings 8.6, Review 8.5, Library 8.5, Thumbnail tester 8.5.

Thin margins the reviewer named: phone strips still clip at the right edge on some pages (a fade was added); Games Overview has no stage dots of its own (they live on Home's "Where each game is"); Pro has 4 Soon steps.

## Known gaps

- The 4 Soon steps on Pro.
- Run logs go to `<root>/.agent-hq/logs` even when a custom state dir is used, so the log view is empty for test servers. Normal use is unaffected.
- Screens with no public evidence (Notebook, Thumbnail tester, Settings, Help) are judged on their own.

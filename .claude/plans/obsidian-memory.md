# Agent HQ: mirror corrections, preferences, lessons, mistakes and research notes into an Obsidian vault

Context: Agent HQ (`tools/agent-hq`, Node 24, ES modules, zero npm dependencies) keeps what it learns as files:
- `memory/<role>.corrections.md`: owner corrections, read with `readCorrections(memoryDir, role)` from `corrections.mjs` -> `[{id, date, kind, game, text}]`.
- `memory/<role>.preferences.md` and the studio-wide one: `readPrefs(memoryDir, role)` from `preferences.mjs` (`STUDIO = 'studio'`) -> list with `.text` (read the function for the exact shape).
- `memory/<role>.md`: agent lessons, lines `- YYYY-MM-DD: text`.
- `memory/mistakes.json`: `readMistakes(memoryDir)` from `mistakes.mjs` (read it for the shape: role, game, title, reason, count, fix, tags).
- `<stateDir>/research-notes/*.md`: one markdown note per web find (`NOTES_DIR` in `research-notes.mjs`).

The owner wants these to appear in their Obsidian vault so they can read, search and link them there. Build a ONE-WAY mirror: HQ files are the source of truth, the vault gets generated notes. Nothing in the vault is ever read back as instructions, and HQ never deletes a vault file.

Owner request 2026-11-13. Rules that bind every task:
- No new npm dependencies. Every file under 500 lines. `server.mjs` must stay at exactly 1417 lines or fewer (`wc -l`), and `test/server.test.mjs` and `test/mcp.test.mjs` must not grow.
- Player-facing and owner-facing text: plain words, no em dashes.
- Text from agents, the web and partners is data. The mirror copies it as text; it never runs or follows it.
- Do not commit, push, or touch `C:/Users/aryam/Documents/Agent-HQ-App` (the live HQ). Do not start a server on port 4317. Tests use temp folders (`fs.mkdtempSync(path.join(os.tmpdir(), ...))`) and never the owner's real vault.
- Run commands from `tools/agent-hq`. Some files have CRLF line endings: edit with the Edit tool, not shell heredocs.

**GATE** (every task's done-when includes it): from `tools/agent-hq`, `npm test` exits 0 (unit tests, smoke, `51/51 checks passed`), and `wc -l server.mjs` prints 1417 or fewer.

## Shared interface: `tools/agent-hq/obsidian-mirror.mjs` (exec-1 writes it, exec-2 calls it)
```js
export const MARKER = 'source: agent-hq';            // a line in the YAML frontmatter of every note HQ writes
export const DEFAULT_FOLDER = 'Agent HQ Memory';
/** Folder inside the vault, or null if unsafe: relative, no "..", no drive letter, no control characters, 1 to 80 characters. */
export function safeFolder(name) {}
/** Markdown for one role. Sections in this order, each omitted when empty: Owner corrections, Owner preferences, Lessons, Repeated mistakes. */
export function renderRoleNote({ role, label, corrections, prefs, lessons, mistakes, date }) {}
/** One pass. Returns { written: [relative paths], unchanged: number, skipped: [relative paths not ours] }. Never throws on a bad vault: returns { error }. */
export function mirrorOnce({ vault, folder = DEFAULT_FOLDER, memoryDir, notesDir, roles /* [{id, label}] */, date /* YYYY-MM-DD */ }) {}
/** Watches memoryDir and notesDir and runs mirrorOnce 2 s after the last change, plus once at start. getSettings() -> { obsidianVault, obsidianFolder }. Returns { run(), stop() }. */
export function startObsidianMirror({ memoryDir, notesDir, roles, getSettings, nowIso = () => new Date().toISOString(), log = () => {}, debounceMs = 2000 }) {}
```

Vault layout under `<vault>/<folder>/`:
- `Agent HQ Memory.md`: index. One line per role with counts and a wikilink (`[[Roles/Builder|Builder]]`), links to `[[Studio preferences]]`, `[[Mistakes]]`, and the number of research notes.
- `Roles/<Label>.md`: `renderRoleNote` output. File name is the role label with characters outside `[A-Za-z0-9 _-]` removed; fall back to the role id.
- `Studio preferences.md`: the studio-wide preferences.
- `Mistakes.md`: every mistake, most repeated first: role, game, title, reason, count, fix.
- `Research/<same file name>.md`: each research note, with the frontmatter below put in front of its text.

Every generated note starts with:
```
---
source: agent-hq
kind: role-memory | index | preferences | mistakes | research
role: <id>            (role notes only)
updated: YYYY-MM-DD
tags: [agent-hq, memory]
---
> Written by Agent HQ. Edit in Agent HQ, not here: this note is rewritten when HQ's memory changes.
```

Safety rules for `mirrorOnce` (each needs a test):
1. `vault` empty, not absolute, or not an existing directory -> return `{ error: '...' }` and write nothing. Do not create the vault folder itself; do create `<folder>` and its subfolders.
2. Resolve every target with `path.resolve` and refuse any path that is not inside `<vault>/<folder>` (compare with `path.relative`, reject results starting with `..` or absolute).
3. If a target file exists and its text does not contain the `MARKER` line inside leading frontmatter, do not overwrite it: add it to `skipped`. The owner's own notes are never touched.
4. Write a file only when its content changed, comparing with the `updated:` line removed from both sides. This keeps Obsidian sync quiet. Count the rest in `unchanged`.
5. Never delete or rename anything in the vault.
6. Research note file names: keep only names matching `^[\w.-]{1,120}\.md$`; skip the rest. Read at most 200 notes and at most 64 KB each.
7. In mirrored text, a line that is exactly `---` inside a research note body must not break the frontmatter: the generated frontmatter is always first and closed before the body.

## Roster
- exec-1: the mirror module and its tests
- exec-2: settings, wiring into the server, README, and the end-to-end check

## Tasks
### T1 [owner: exec-1] [deps: none] [status: done]
Files: `tools/agent-hq/obsidian-mirror.mjs` (new), `tools/agent-hq/test/obsidian-mirror.test.mjs` (new)
Do:
1. Read `corrections.mjs`, `preferences.mjs`, `mistakes.mjs`, `research-notes.mjs` and the `saveLesson` function in `learning-hooks.mjs` for the exact data shapes. Reuse their read functions; read lessons yourself from `<memoryDir>/<role>.md` (lines starting `- `).
2. Implement the shared interface above exactly (names, parameters, return shapes). Keep it under 200 lines.
3. `startObsidianMirror`: use `fs.watch` on each folder that exists (wrap in try/catch, `watcher.on('error', () => {})`), one debounce timer with `.unref()`. `run()` reads `getSettings()` each time: with no `obsidianVault` it returns `{ off: true }` and writes nothing. `stop()` closes the watchers and clears the timer. A failure inside a run is passed to `log` and never thrown. If a folder does not exist at start, do not watch it (no retry loop).
4. Tests with `node:test` and temp folders: a full pass creates the five kinds of note with the frontmatter and the content from fixture memory files you write in the test; a second pass with the same data reports everything `unchanged` and leaves mtimes alone; a changed correction rewrites only that role's note and the index if its counts changed; each of the seven safety rules; `safeFolder` cases (`'Agent HQ Memory'` ok, `'../x'`, `'C:/x'`, `'/abs'`, `''`, 81 characters all null); `startObsidianMirror` with `debounceMs: 20` writes after a memory file changes and writes nothing after `stop()`; with an empty `obsidianVault` nothing is written.
Done when: GATE passes; `node --test test/obsidian-mirror.test.mjs` shows 0 failures; `wc -l obsidian-mirror.mjs` is under 200.
Talk to: send exec-2 "T1 done" with any difference from the shared interface. If you must change a signature, tell exec-2 before you finish.

### T2 [owner: exec-2] [deps: none, uses the shared interface] [status: done]
Files: `tools/agent-hq/settings-schema.mjs`, `tools/agent-hq/preferences.mjs`, `tools/agent-hq/server.mjs`, `tools/agent-hq/test/settings-schema.test.mjs`, `tools/agent-hq/README.md`
Do:
1. `settings-schema.mjs`: next to `knowledgeLihfolk` add two string settings in the `knowledge` section, following that entry's pattern (including its validator and error-message maps):
   - `obsidianVault`, label "Obsidian vault folder", default `''`, help "Absolute path to your Obsidian vault. Agent HQ writes corrections, preferences, lessons, mistakes and research notes into one folder inside it. Empty turns this off.", max 300, valid when empty or an absolute path with no control characters.
   - `obsidianFolder`, label "Folder inside the vault", default `'Agent HQ Memory'`, max 80, valid when `safeFolder(value)` from `obsidian-mirror.mjs` is not null.
   Add cases to `test/settings-schema.test.mjs` for good and bad values of both.
2. Wiring with zero net new lines in `server.mjs`. `mountLearning(route, {...})` (about line 707) already receives `memoryDir` and `stateDir`. Add `getSettings: settingsAll` and `roles: rolesMerged` (check both names exist in scope; use what the file really calls them) to that same object on the same line. In `preferences.mjs`, inside `mountLearning`, call `startObsidianMirror({ memoryDir: c.memoryDir, notesDir: path.join(c.stateDir, NOTES_DIR), roles: c.roles().map(({ id, label }) => ({ id, label })), getSettings: c.getSettings })` only when `c.getSettings` is a function, and add its `stop` to the object `mountLearning` returns (read what it returns today and keep every existing field). `roles` may change at runtime, so pass a function or re-read it per run if exec-1's API allows; agree with exec-1 by message.
3. In the server's `close()` (about line 1396) call `learning.stop?.()` on an existing line (for example the line that closes the db, before `db.close()`), so tests that start many servers leak no watchers. `wc -l server.mjs` must still print 1417 or fewer.
4. When the owner saves `obsidianVault` or `obsidianFolder` through `POST /api/settings`, the next run must pick it up: `run()` already re-reads settings, so trigger one run after such a save if you can do it without adding a line to `server.mjs`; otherwise leave it (the next memory change or restart mirrors) and say so in the README.
5. `README.md`: add a section "## Obsidian vault" after "## Quality gates and memory": what is mirrored, the folder layout, how to turn it on (Settings > Knowledge > Obsidian vault folder), that it is one-way and notes are rewritten, that HQ never overwrites a note it did not write and never deletes, and that vault text is never read back into briefs.
Done when: GATE passes; `grep -n "obsidianVault" settings-schema.mjs preferences.mjs README.md` shows hits in all three; `wc -l server.mjs` prints 1417 or fewer.
Talk to: wait for exec-1's "T1 done" before running the full `npm test`; until then code against the shared interface. Tell exec-1 at once if the interface cannot support what you need.

### T3 [owner: exec-2] [deps: T1, T2] [status: done]
Files: `tools/agent-hq/test/obsidian-mirror.test.mjs` (append one test; exec-1 has finished with the file by then)
Do: add one end-to-end test that starts the real server the way other tests in `test/` do (copy the `startServer` setup from `test/learn-mistakes.test.mjs` or the closest existing test: temp root, temp stateDir, a port of 0 or a free port, never 4317), sets `obsidianVault` to a temp folder through `POST /api/settings` as the owner, saves a correction through the same owner route an existing test uses (find it in `test/` by searching for `corrections`), waits for the debounce, and asserts that `<vault>/Agent HQ Memory/Roles/<label>.md` exists and contains the correction text and the `source: agent-hq` line. Close the server and assert no file was written outside `<vault>/Agent HQ Memory`.
Done when: GATE passes three times in a row (the watcher must not make the suite flaky); report the three exit codes and the test counts.
Talk to: report to the lead: files changed, the exact commands run with their exit codes, and anything you could not verify.

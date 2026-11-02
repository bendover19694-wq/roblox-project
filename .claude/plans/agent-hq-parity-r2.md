# Agent HQ parity: execution plan, revision 2 (2026-11-02)

Replaces the task list in `.claude/plans/agent-hq-parity.md`. Appendices A (rules), B (decisions) and C (contracts) still apply, with the changes listed under "Changes to A/B/C". Paths are relative to `tools/agent-hq` unless they start with `/`.

WT=/home/user/hq-parity, APP=WT/tools/agent-hq, SCR=/tmp/claude-0/-home-user-roblox-project/8029e020-6f22-5433-a9ef-017df08777b5/scratchpad

## Lead decisions (binding) and answers to brief-delta §5
- There are no reference images in this session. Visual checks use only the numbers in site-scout §6, `research/agent-hq/tokens.*` and brief §1, plus the render audit: no console errors, no off-host requests, no horizontal scroll, text at least 12px, phone taps at least 44px. Every "compare to a REF PNG" check is reported as **not run here**. Those comparisons run later on the Windows PC.
- Benchmarks: leave the `ga26-*` rows alone. Add no Q3 2026 rows and no rows taken from search snippets. No change to `arpdau`. (This answers brief-delta Q1 to Q3.)
- Sort ids: anchor each of the six to its exact id: `^top-trending$`, `^up-and-coming$`, `^top-playing-now$`, `^fun-with-friends$`, `^top-revisited$`, `^top-earning$`. A name regex is used only as a fallback (T9). The live sort-name check needs apis.roblox.com, so it is an owner task on the Windows PC (Q5).
- Help keeps `.page.narrow` at 760px. The cause is `views/help.js:36` and it is intentional because Help is reading text. No change (closes the brief-delta note).
- Render command, with your own folder and port, never 4317:
  `mkdir -p SCR/exec-N/app SCR/exec-N/phone && cd /home/user/hq-parity/tools/agent-hq && HQ_SHOT_DIR=SCR/exec-N HQ_SHOT_PORT=<port> node test/visual.mjs --only=<pages> [--shot=...] [--measure=...]`
  Ports: exec-1 4410-4411, exec-2 4420-4421, exec-3 4430-4431, exec-4 4450-4451. Always pass `--only` with your own pages. Open your PNGs with Read and look at them yourself; an exit code of 0 is not a visual check.
- Rules: no commits (the lead commits), no new dependencies, every file under 500 lines, `server.mjs` must not grow (1442 now), `npm test` stays green (51/51 at baseline). Keep the Agent HQ name, logo, role ids and labels. No RoAutomation name, logo, images, testimonials or marketing copy, no Playbook, no paywall. Sample data only in `test/demo.mjs`, labelled sample. Text at least 12px, phone taps at least 44px, reduced motion respected, state never shown by colour alone.

## Re-baseline (what the code holds now; commit 0aec547 plus the Linux fix in `test/visual.mjs`)
- **T3 shell: JS done, CSS missing.**
  - `app.js` already renders: the switcher pill (113), the live pill per page (110, 117), "Refresh numbers" (118), the agent spend foot (92-93), Help and Settings (94-95), Pro in the nav (25), the strip (123-130), the tabs with `#tab-more` (133-142), the More sheet with 9 items (144-157), and Pro and Help pages (16, 27-28).
  - Already done: `palette.js:5-6` has Pro and Help, `index.html:24,29` has `#strip` and `#tabs`, `games.js:223` exports `addGame`, `help.js` is complete, `settings.js:104-108` has the lanes strip, and `theme.css:43` defines `--tabs-h: 0px`.
  - Missing, all in `shell.css`:
    - No rules for `.strip`, `.tabs-bar`, `.tab-item`, `.sheet*`, `.switcher`, `.slash`, `.spend`, `.foot-chip` or `.nav-count`. This is why raw strip text shows at the top of every desktop shot.
    - Nav item (`shell.css:20`) is 7px 8px. Spec is 38 tall with padding 0 10px.
    - The active nav item has no gradient bar (`:22`).
    - The team grid has 4 columns (`:34`). Spec is 5.
    - `.page` padding-top is 24 and gap 24 (`:7`). Spec is 30 and 12.
    - Phone rules (`:60-76`) turn `#side` into a top row instead of hiding it.
    - `--tabs-h` is never set on phone.
  - Bug: the strip game link renders the URL `http://127.0.0.1:4480/#/games/space-agency` as its text (every `SCR/base/app/hq-*.png`, top row). Cause unknown; `app.js:128` passes `g.name`.
  - The audit prints only the first 5 tap offenders. Home has 48 offenders and lead 25; the 5 shown are all sidebar items. The rest are unknown until the sidebar is hidden.
- **T6 Home/Lead/Team/Tasks: not started** (the CSS was only moved).
  - `home.js:179-181` still renders the lanes strip, and line 1 imports `LANES, lastSeen, laneFresh, laneCfg`.
  - The ask bar placeholder is the old one (`:160`).
  - Chips use `.hot`, not `data-tone` (`:175`).
  - Back-to-you cards are generic `.tag` cards (`:88-92`), with no finished-work card.
  - Live rows have no spin-ring and plain muted queued text (`:103-107`).
  - Games have no 9-dot strip (`:111-125`).
  - Lock rows are not amber (`:137`).
  - `workspace.css:7` is `340px` with gap 24.
  - `chat.js`: 40px avatar (`:102`), refresh icon on Start fresh (`:116`), old typing text (`:177`), image button and text "Send" (`:189-191`), old hint (`:192`), no "Worked through" row, Lead uses the generic placeholder (`:181`).
  - `team.js`: uppercase `status-chip` (`:28`), no queued in the header, no "Last job".
  - `tasks.js`: "In review" group (`:12`), grey count (`:78`), `statePill` (`:34`), no chevron.
- **T7 Review/viewer: built, not verified.**
  - Done: `viewer.js` (125 lines) has media, counter, download, full screen, prev/next, the "Made by" panel, note, A/C/R keys and the one-line explainer.
  - Done in `review.js`: `rv-media` (181), per-group Approve all / Reject all (211-220), `.seg-count` (242), "Every agent" (245), reference empty text (249), overline and amber chip (330-331), `#/review/<id>` deep link (321-335). 337 lines, within the C6 limit.
  - Done in `review.css`: two columns from 900 (`:41`) and viewer styles.
  - Not done: the viewer shot, the A-key check, phone review taps.
- **T8 Pitches: not started.**
  - Header has no "Find my next game" (`pitches.js:208-210`).
  - Tabs use `segmented` (`:211`).
  - Old tile labels (`:127-132`).
  - No banner, no alternatives note, no "How we differ" panel, no `look` cards, no "$" line.
  - Age is at the top (`:120`).
- **T9 Market: built.**
  - Done in `market.js:75-100,188-196`: KPIs, rising rail, New on the charts, Young breakouts, chart tabs with "More lists", the Sample data chip and the Pro chip.
  - Done in `rising.js`: the MOVE/NEW/triangle cells and "not measured" (`:40-82`).
  - Done in `market.js:162-163`: benchmarks tier and source links.
  - Missing: the sort-id anchoring. `REF_SORTS` at `rising.js:10-17` uses loose `/trending/i` for id and name. There is no unit test and no phone shot.
- **T10 Pro: built.**
  - Done in `pro.js` (263 lines): 10 steps with 5 Soon, rising (limit 16), history and detail with `lineChart`, Score my idea against `/api/idea-scores`, weekly ideas, packs linking `#/library/catalog`, the strip below 900, and the Sample chip.
  - Not done: the detail, score and phone shots.
- **T11: not started.**
  - `library.js:255` `render()` ignores `param`, so `#/library/catalog` does not select the tab.
  - `.tag` leftovers remain in the T11 files.

## Ownership (one owner per file for the whole run; anything not listed is frozen)
| Exec | Files |
|---|---|
| exec-1 | `public/app.js`, `index.html`, `shell.css`, `theme.css`, `styles.css`, `pages.css`, `polish.css`, `test/visual.mjs`, `views/{palette,help,settings,games,gate,live,models,link,library,taskform,core}.js`, `icons.js` |
| exec-2 | `views/home.js`, `views/tasks.js`, `public/workspace.css` |
| exec-3 | `views/review.js`, `views/viewer.js`, `views/lightbox.js`, `review.css`, `views/pitches.js`, `pitches.css` |
| exec-4 | `views/market.js`, `views/rising.js`, `views/charts.js`, NEW `views/sorts.js`, NEW `test/sorts.test.mjs`, `views/pro.js`, `market.css`, `pro.css`; in wave 2 also `views/chat.js`, `views/lead.js`, `views/team.js` and NEW `public/chat.css` (ownership of `chat.css` passes from exec-1 to exec-2 to exec-4, see T3.0 and T6a.0) |

Shared helpers in `core.js`, `charts.js` and `icons.js` are frozen for everyone except their owner. If you need something added, message the owner.

## Waves
- **Wave 1** (all four start now): T3 (exec-1), T6a desktop (exec-2), T7+T8 (exec-3), T9+T10 (exec-4). Wave-1 page tasks do desktop work first and run their phone shots only after exec-1 says "T3 landed".
- **Wave 2**: T11 (exec-1, after T3), T6a phone (exec-2), T6b (exec-4, after T9/T10 and T6a.0), and phone tap fixes on every page.
- **Wave 3**: T12 (lead).

---

### T3 Shell and phone shell [exec-1] [wave 1, first]
Files: `shell.css`, `index.html`, `app.js` (bug fix only), `test/visual.mjs`, NEW `public/chat.css`.

Do:
0. Do these first, within minutes:
   - Add `--offenders=N` to `visual.mjs` (default 5) to set how many tap and text offenders are printed. Keep the rest of the CLI unchanged.
   - Create `public/chat.css` with only a header comment ("Agent HQ chat, Lead, Team. Owner: exec-4.").
   - Link `chat.css` in `index.html` right after `workspace.css`.
   - Message exec-2 and exec-4 that `chat.css` exists, and tell everyone about `--offenders`.
1. Desktop sidebar (`shell.css`):
   - `.nav-item`: height 38, padding `0 10px`, gap 11.
   - Active item keeps `--nav-on` and `--nav-on-line`, and adds `::before`: 3px wide, `--grad` turned vertical (`linear-gradient(180deg,#8a69ff,#d470df,#ff828e)`), about 22px tall, `position:absolute`, left at the window's edge (`left:-12px`, `.nav-item{position:relative}`).
   - `.nav-count[data-tone="green"]`: a 6px `--ok` dot before the number, no filled disc. Amber and grey keep the disc.
   - `.avatar-grid`: 5 columns, gap `12px 14px`, padding `6px 10px 4px`, `border-top:1px solid var(--line)`.
   - Style `.spend` (label 12px `--faint`, amount `--text` 600, chevron right, whole row a 44px link), `.foot-chip`, and the Help and Settings rows like `.nav-item`.
2. Topbar:
   - `.switcher`: pill radius `--r-pill`, 1px `--line-2`, background `--chip`, padding `0 10px`, height 32, gap 8, grid icon, count disc grey, chevron.
   - `.slash` in `--faint`, `.page-title` 600 14px.
   - `.live-ind` gets its dot and 12.5px text (already there).
3. Page frame: `.page` padding `30px 32px 48px`, gap 12. `.main` gets `padding-bottom: var(--tabs-h)`.
4. Desktop: `#strip, #tabs { display:none }` above 760px.
5. Phone (760px and below):
   - Hide `#side`.
   - `#strip`: sticky top, height 44, horizontal scroll inside itself, `.strip-item` at least 44 tall, an active item with a 2px `--grad` underline, and `+ New game` styled as a ghost item, not a grey button.
   - `.topbar`: height 56, padding `0 16px`. Hide `.switcher`, `.slash`, `.live-ind` and `.refresh-btn`. The title is 18px 700. New task is 44 tall.
   - `#tabs`: fixed bottom, `height: calc(58px + env(safe-area-inset-bottom))`, 5 equal `.tab-item`s in a column (24px icon over a 12px label). Counts sit top-right of the icon using the existing `.count[data-tone]`. The active item is `#fff` icon and label on a `--nav-on` pill, so it does not rely on colour alone. Background `--side-bg` with a top hairline.
   - `:root { --tabs-h: calc(58px + env(safe-area-inset-bottom)) }`.
   - Sheet: `.sheet-back` is a full-screen backdrop. `.sheet` is a bottom panel above `#tabs`, radius `18px 18px 0 0`, with the grip. `.sheet-item` rows are 48 tall.
   - Global phone tap floor: `.btn, .icon-btn, .seg-btn, .tab, a.chip, .select, .input` get `min-height:44px`.
6. Find and fix why the strip game link shows its URL instead of `g.name`: inspect `#strip a` text in the demo. Fix it in `app.js` or the CSS.

Done when:
- `--only=home,tasks,settings,help,more --measure=".side;.topbar;.nav-item;.avatar-grid;.avatar-grid .avatar;.page;#strip;#tabs;.tab-item" --offenders=50` (port 4410) prints:
  - Desktop: side `248 x 800` padding `18px 12px 12px`; topbar height 56, padding `0px 24px 0px 28px`; nav-item height 38, padding `0px 10px`; avatar-grid padding `6px 10px 4px`; avatar `28 x 28`; page padding `30px 32px 48px`; `#strip` and `#tabs` `0 x 0` or no match.
  - Phone: `.side` `0 x 0`; `#strip` `390 x 44`; topbar `390 x 56`; `#tabs` height 58; `.tab-item` height at least 44.
  - No offender inside `#side`, `#topbar`, `#strip`, `#tabs` or `.sheet`.
  - `hq-more.png` shows 9 sheet items.
  - No URL text in any shot.
- Paste the full phone offender list into your report (other pages will use it).
- `npm test` passes. `wc -l shell.css` is under 500.
- Not run here: shell vs `REF/app/home.png` and `REF/phone/home.png`.

Talk to: everyone, "T3 landed": `--tabs-h` and the phone tap floor are live, phone shots can run now, plus the offender list per page.

### T6a Home and Tasks [exec-2] [wave 1 desktop, wave 2 phone]
Files: `views/home.js`, `views/tasks.js`, `workspace.css`.

Do:
0. As soon as exec-1 says `chat.css` exists, move these blocks from `workspace.css` into `chat.css` verbatim, phone rules included: team (`.role-grid`, `.role-card`), messenger, `.status-chip*`, the chat and conv rules, the `.msg*` and `.bubble*` rules, typing and dots, composer and composer-wrap, `.lessons`, `.arch-banner`, `.back-btn`, and the `.msg.owner .bubble` override. After the move `chat.css` belongs to exec-4. Tell exec-4.
1. Home:
   - Delete the lanes strip (`home.js:179-181`) and the now-unused imports.
   - `.home-grid`: `minmax(0,1fr) 360px`, gap 26.
   - Chips use `.chip[data-tone="need"]` and `[data-tone="work"]`, and drop `.hot`.
   - Ask bar: outer height 57, radius 18, border `rgba(255,255,255,.1)`, background `rgba(255,255,255,.02)`. A 28px Lead orb (`avatar('lead',28)`) on the left. Placeholder "Ask the Lead anything, or say what you want done...". Gradient Ask.
   - "Needs you" heading gets a `.count[data-tone="amber"]`.
   - Phone: the date goes above the greeting and the name is wrapped in a `--grad` text span.
2. Finished-work card (new `doneCard(item)` in `home.js`) for `isBackToYou` tasks and for open `kind:'review'` asks:
   - Green hairline border (`--ok-line`), role tile 28.
   - `.overline[data-tone="green"]` reading "<ROLE LABEL> FINISHED · CHECK IT".
   - Title, then the body clamped to 2 lines.
   - Buttons: `Looks good` (`.btn.good`), `See what changed`, and `Not right: say what` (pencil icon, ghost; it opens an inline textarea; sending requires a note).
   - Time right-aligned.
   - Tasks post `/api/tasks/:id/verdict` with `approve` or `changes` plus a note. Asks call `answer(ask,'approve')` or `answer(ask,'changes:'+note)` from `review.js`.
   - "See what changed" goes to `#/review/<askId>` if an open review ask has this `taskId` or is this ask, otherwise `openTaskDrawer(t.id)`.
   - Media asks stay in `imagesCard`. Replace every `.tag` on Home with `.overline` or `.chip`.
3. Live now:
   - Working rows show `.spin-ring` on the right, `--work-bg` fill and a `--work-line` border.
   - Queued text is `--warn-text` "N queued".
4. Where each game is:
   - A strip of 9 dots in the order of `STAGE_NAME` (filled `--ok` up to the current stage, `aria-label="Stage 3 of 9: Designed"`), then the stage word.
   - "Now: …", then "working on it: <labels>". No Play button.
5. Lock rows: amber `--warn-text` on `--warn-bg` with a `--warn-line` border.
6. Tasks:
   - Groups in this order: "Back to you" (`review`, sub "Finished: check it, then Looks good or Needs changes"), "Working now" (sub "Live in the agent's chat", spin-ring), "Queued" (sub "Runs as soon as the agent is free, in order").
   - Count discs amber, green and blue.
   - In `tasks.js`, a local `rowPill(state)` uses `.spill` with tone and words "Back to you", "Working now", "Queued", and the raw state for the rest. Do not change `statePill`.
   - A chevron at the right of the row.
   - `.trow[data-state="review"]` gets a `--warn-line` left/border tint, `working` a `--work-line` tint, others neutral.
   - New task button gets `kind:'primary'`, which is already the gradient.
7. Phone (after T3): `.ask-lead` stays in one row (input plus a 44px Ask icon button; New task and Pause go into a second row). No tap offenders on home or tasks.

Done when:
- `--only=home,tasks --measure=".home-grid;.home-grid > aside;.ask-lead;.card;.spin-ring" --offenders=50` (port 4420): desktop `.home-grid` width 968, aside width 360, `.ask-lead` height 57 radius 18, `.card` padding `16px 18px` radius 14. Phone: home-grid width 366, 0 offenders.
- `grep -c "lanes-strip\|class: 'tag" public/views/home.js` prints 0.
- `npm test` passes. Touched files under 500 lines.
- Not run here: vs `REF/app/home.png`, `tasks.png`, `REF/phone/home.png`.

Talk to: exec-3, to confirm `#/review/<askId>` opens the viewer (already live, `review.js:321`).

### T6b Lead, agent chat, Team [exec-4] [wave 2, after T9/T10 and T6a.0]
Files: `views/chat.js`, `views/lead.js`, `views/team.js`, `chat.css`.

Do:
- Chat header:
  - `avatar(role,44)`.
  - Add the last-activity time after the status (from the newest message `createdAt`, `ago()`).
  - Start fresh uses the `archive` icon.
  - Keep the engine chip, New task, Lessons, Past chats and the header Stop.
- Agent replies: no bubble background and no border (`.msg.agent .bubble { background:none; border:0; box-shadow:none; padding-left:0 }`). Owner bubbles `--bubble` / `--bubble-line`, radius 14.
- Owner message that created a task: a header line "Task from <owner name or You>: <task title>" inside the bubble.
- Replace the task chip (`chat.js:15-23`) with a collapsible row:
  - Check icon, "Worked through N steps", chevron, `aria-expanded`.
  - On open, it fetches `GET /api/tasks/:id/log` once and lists the steps (first 40, 12px mono).
  - Keep an "open task" link that calls `openTaskDrawer`.
  - N is the log length; before the fetch the row shows "Worked through the task".
- Composer:
  - Rounded box (radius 18) holding the textarea, paperclip (`clip`) bottom-left that opens the picker, and an icon-only send bottom-right: 36px gradient circle, `arrowUp`, `aria-label="Send"`.
  - Hint: "Enter to send · Shift+Enter for a new line · Ctrl+V pastes screenshots". Ctrl+Enter still works.
  - While working: the typing text is "Working · a new message waits its turn", and a square Stop button (`aria-label="Stop the running task"`) appears in the composer next to send.
- Placeholder: Lead gets "Ask anything, or tell the Lead what you want done...". Others get "Message <Agent>...".
- Team:
  - Header "N working · N queued · N need you".
  - Row: `.spill` status in sentence case (Working green, Queued blue, Idle grey, Review amber), "On: <task>" or the last chat line, `clock` icon "Last job: <title of newest done task for the role>", relative time, a blue "N queued" `.spill` tag, unread count kept.
  - Keep the order. Delete `.status-chip` rules once nothing uses them.
- Phone: the composer sits above `#tabs`. `.chat` and `.chat-list` heights subtract `var(--tabs-h)`.

Done when:
- `--only=lead,team --measure=".chat-head .avatar;.composer-wrap;.roster-row" --offenders=50` (port 4450): avatar `44 x 44`. Phone lead: the composer bottom edge is above the tab bar (open `hq-lead.png`), 0 offenders.
- `grep -c "status-chip" public/views/team.js` prints 0.
- `npm test` passes.
- Not run here: vs `REF/app/lead.png`, `REF/phone/lead.png`, `team-2-list.png`.

### T7 Review and viewer, close-out [exec-3] [wave 1, phone in wave 2]
Files: `views/review.js`, `views/viewer.js`, `review.css`.

Do (only what is open):
- Run the viewer shot. Fix anything under 12px or overflowing.
- Manual A-key check: run `HQ_PORT=4435 HQ_DEMO_DIR=SCR/exec-3/demo node test/demo.mjs`, open the URL from `demo-url.txt` in the headless shot flow or by hand, press A on the demo ask, and confirm the card shows Approved. Do not add a browser test.
- After T3: phone review has 0 tap offenders (`.seg.wide` scrolls sideways, buttons at least 44).
- `review.js` stays at 337 lines or fewer.

Done when:
- `--only=review --shot="desktop:viewer:review:.rv-thumb" --shot="phone:viewer-m:review:.rv-thumb" --measure=".rgrid;.tabs .tab;.seg-btn;.vw-panel" --offenders=50` (port 4430) exits 0.
- `.rgrid` is 2 columns on desktop (open the PNG). The viewer shows the counter, the 3 stacked actions with A/C/R and "Made by".
- `npm test` passes.
- Not run here: vs `REF/app/review.png`, `review-2-approve-ask-reject-promo.png`.

### T8 Pitches [exec-3] [wave 1]
Files: `views/pitches.js`, `pitches.css`. Keep using `chip` from `charts.js`. Do not edit `charts.js`; build local `statTile` and tabs.

Do:
- Header: "Find my next game" (`kind:'primary'`, `radar` icon) posts `/api/tasks` with role scout, same as `market.js:39`. "New game idea" becomes the outline style. Keep Compare.
- Info banner (`.pg-info`, `--info-bg`, `--info-text`, info icon): "Charts refresh every N hours." from `store.settings.marketEveryHours`; when it is 0: "Chart refresh is off. Turn it on in Settings."
- Tabs: replace `segmented` (`:211`) with `.tabs` / `.tab[aria-selected]` buttons carrying `.seg-count`-style counts. Keep "Waiting on Scout". Under the tabs, a note: "These are alternatives. Until game #1 is live, approving one withdraws the others."
- Card:
  - A 56px banner, tinted by a hash of `format` across 5 fixed hues, with a 40px icon tile.
  - Chips: window green ("early to the trend" style), "others are on it" amber when the comparables are many (keep the existing field), format neutral, status.
  - Under the one-liner, the first sentence of `evidence.summary` at 12.5px `--muted`.
  - "How we differ" panel: background `#201c26`, border `1px solid #3c3c55`, radius 12, circle icon, then `vs` chips.
- Five stat tiles:
  - Labels in this order: "TOP EARNING RANK", "TOP COMPARABLE PLAYING", "ITS LIKES", "UPVOTES PER DAY", "SIMILAR GAMES".
  - Top earning rank reads "#212 (of N)". N is the length of the `top-earning` sort in `GET /api/market` `latest.sorts`, loaded once per visit. Leave out "(of N)" when it is unknown.
  - Likes: green with the caption "80%+ gets recommended" when at least 80, and the number is always shown.
  - Tiles sit in one row of 5 at 1032 wide and wrap to 2 columns on phone.
- "$" verdict line (`dollar` icon) replaces the `pg-money` box.
- "The game": a two-column table (`th` 180px). The label "Template modules" becomes "Systems it uses" (chips).
- The look: when `p.look` is set, show three text cards Stud, Stylized and Realistic, each with one HQ-worded line. The matching card has a violet border and a "Trending" tag. Hidden when `look` is absent. No images.
- Actions: Approve (primary, check), Edit and approve (outline, pencil), Send to Scout (`.btn.caution`), Decline kept. The footer reads "Pitched <ago>".
- Phone (after T3): 0 tap offenders.

Done when:
- `--only=pitches --shot="phone:pitches:pitches" --measure=".pg-pitch;.pg-stat;.pg-differ;.tabs .tab" --offenders=50` (port 4431) exits 0.
- The desktop PNG shows 5 tiles in one row per card.
- `grep -c "#201c26" public/pitches.css` prints at least 1.
- `npm test` passes. `pitches.js` under 500 lines.
- Not run here: vs `REF/app/pitches.png`, `pitches-2-detail-look.png`, `pitches-3-detail-stats-promo.png`.

Talk to: exec-4 if you need a market field.

### T9 Market, sort anchoring and close-out [exec-4] [wave 1]
Files: NEW `views/sorts.js`, NEW `test/sorts.test.mjs`, `views/rising.js`, `views/market.js`, `market.css`.

Do:
- Move `REF_SORTS` and `splitSorts` out of `rising.js:10-28` into `views/sorts.js`, which has no imports. Re-export from `rising.js` (`export { REF_SORTS, splitSorts } from './sorts.js'`).
- New entries, in this order:
  - Trending `id:/^top-trending$/`, `name:/^(top )?trending$/i`
  - Up and coming `/^up-and-coming$/`, `/^up[- ](and|&)[- ]coming$/i`
  - Most played `/^top-playing-now$/`, `/^(top playing now|most played)$/i`
  - Fun with friends `/^fun-with-friends$/`, `/^fun with friends$/i`
  - Most revisited `/^top-revisited$/`, `/^(top|most) revisited$/i`
  - Top earning `/^top-earning$/`, `/^top earning$/i`
- The id pass runs over all six before any name fallback.
- `test/sorts.test.mjs`:
  - (a) The demo ids map to the six labels in order.
  - (b) `[{id:'trending-in-rpg',name:'Trending in RPG'},{id:'top-trending',name:'Top Trending'}]` picks `top-trending`, and `trending-in-rpg` goes to `more`.
  - (c) No `top-trending` id but `name:'Trending'` falls back by name.
  - (d) Missing lists are skipped.
  - (e) `more` keeps the input order.
- After T3: phone market has 0 tap offenders (tabs scroll, table scrolls inside its own box with no page horizontal scroll).

Done when:
- `node --test test/sorts.test.mjs` passes.
- `--only=market --shot="phone:market:market" --offenders=50` (port 4450) exits 0, with no `scrollWidth` failure.
- `npm test` passes. `wc -l public/views/{market,rising,charts,sorts}.js` all under 500.
- Not run here: vs `market-3-rising-cards-promo.png`, `market-4-charts-table-promo.png`, and the live sort-name check (owner, Windows PC).

### T10 Pro, close-out [exec-4] [wave 1]
Files: `views/pro.js`, `pro.css`.

Do: verify only and fix what the shots show.
- Detail view from a row click.
- Score form and ring (bar tone per B-D1 with the number shown).
- Phone strip with prev/next arrows of 44px.
- Rising rail limit 16.
- `#/library/catalog` link (works after T11).

Done when:
- `--only=pro --shot="desktop:pro-history:pro/history" --shot="desktop:pro-detail:pro/history:<first chart-table row link selector from rising.js chartTable>" --shot="desktop:pro-score:pro/score" --shot="phone:pro:pro" --offenders=50` (port 4451) exits 0.
- The detail PNG shows 4 stat cards and a 30-day chart.
- `grep -c "soon: '" public/views/pro.js` prints 5.
- `npm test` passes.
- Not run here: vs `REF/images/pro/`.

### T11 Remaining screens [exec-1] [wave 2, after T3]
Files: `views/{games,gate,live,models,link,library,taskform,settings,palette}.js`, `pages.css`, `styles.css`.

Do:
- `library.js:255`: `render(param)` selects the tab named by `param` (`assets|catalog|systems|vault|skills`), so `#/library/catalog` opens Catalog.
- Replace the remaining markup-level `.tag`, `status-chip` and `pg-tile` uses in these files with `.chip`, `.spill` or `.overline`. Then delete the `.tag` rules in `styles.css` only if `grep -rn "class: 'tag" public/views` is empty after T6a, T6b and T8 land; otherwise leave them.
- Games tabs use `.tabs` / `.tab`.
- Restyle the task form modal, the palette, the gate and HQ Link to C3 primitives. No change to behaviour (gate two-step and typed slug unchanged).
- Settings: the lanes strip is the first block (already `settings.js:104-108`; check that it renders first).
- Phone: 0 tap offenders on games, library and settings.

Done when:
- `--only=games,library,settings --shot="phone:games:games" --shot="phone:library:library" --shot="phone:settings:settings" --shot="desktop:catalog:library/catalog" --shot="desktop:taskform:tasks:.topbar .btn.primary" --shot="desktop:gate:games/space-agency/gate" --shot="desktop:link:link" --shot="phone:taskform-m:home:.topbar .btn.primary" --offenders=50` (port 4411) exits 0.
- `hq-catalog.png` shows the Catalog tab selected.
- `npm test` passes.
- Not run here: vs `games-1-stage-panel.png`.

Talk to: exec-4, "`#/library/catalog` is live".

### T12 Integration [lead] [wave 3, after all]
Files: `README.md`, plus small cross-page fixes in any file once its owner has reported done.

Do:
1. README "Pages" section: add Pro (10 steps, 5 Soon, own history), Help, the phone strip / bottom bar / More sheet, the lanes strip now in Settings, and Market's same-time "vs yesterday" plus the Sample data chip.
2. Full render: `HQ_SHOT_DIR=SCR/final HQ_SHOT_PORT=4490 node test/visual.mjs --offenders=50` plus every extra `--shot` from T7 to T11. Read every PNG.
3. Cross-page drift. Check that these match on every page:
   - `.page` padding `30px 32px 48px` (Help at 760 by decision)
   - h1 size and weight
   - `.card` radius 14 and padding 16/18
   - `.tabs` gap 30 with the gradient underline
   - counts and pills using the C3 tones
   - no grey default buttons
   - no `.tag` left (`grep -rn "class: 'tag" public/views`)
4. Checks:
   - `npm test` passes.
   - `wc -l` shows no changed file at 500 lines or more; `server.mjs` is 1442 or less.
   - `grep -n "listen(port, '127.0.0.1'" server.mjs` still matches.
   - `find public -name "*.png" -o -name "*.webp"` prints nothing.
   - `git status --short` lists nothing outside `tools/agent-hq`, `research/agent-hq` and `.claude/plans`.
   - No `2ee6d6` or `ff6b2c` in `public/`.
5. Report to the owner:
   - Every check marked "not run here".
   - The benchmark conflicts in brief-delta §4: d1 near p75/p90; d7 above the median; d30 bottom equals the median; session-length vs 9.8; paying-share 2% vs 3.8%; d1/d7/d30 still cite 2025; the ga26 source URL is unconfirmed.
   - The live sort-name check.
   - The Q3 2026 rows held back.
   - The list below.
6. Commit (the lead only), with the attribution lines.

## Screens with no public evidence (built in HQ's own design language; nothing to compare against)
- **No footage at all:** Games, Library, Settings, Help, the publish gate, Review > Stages & publish, Review > Visual bar, the task form, the task drawer, the command palette (trigger only), HQ Link, the phone More sheet, the Market Corpus/Titles/Benchmarks/Breakouts steps, and Pro's 5 Soon steps. Pro steps 1-5 match only the site's marketing mocks.
- **Only video frames or prose, no measured PNG:** Team, Market (charts step), Pitches detail and look cards, the review viewer, the chat "Worked through" row.
- **Measured PNGs exist only on the Windows PC:** desktop Home, Lead, Review, Pitches and Tasks; phone Home, Lead and Review. Every comparison against them is "not run here".

## Changes to A/B/C
- A: ports as listed above. Render into `SCR/exec-N`, never REF. Commits by the lead only.
- B-D18 replaced: the six sort ids are anchored exactly, with the name regex as fallback only (T9).
- New B-D19: Help keeps `.page.narrow` (760px).
- New B-D20: chat, Lead and Team CSS move to the new `public/chat.css`, loaded after `workspace.css`.
- C2 load order: `theme, styles, pages, polish, shell, workspace, chat, review, pitches, market, pro`.
- C6: add `sorts.js` exports `REF_SORTS` and `splitSorts`, re-exported by `rising.js`.

## Report format for every executor (one message to the lead when done)
Files changed with `wc -l`, the measured lines quoted from the script output, the offender count per shot (desktop and phone), the PNGs you opened, the `npm test` result, and every check that was not run here.

### Critical Files for Implementation
- /home/user/hq-parity/tools/agent-hq/public/shell.css
- /home/user/hq-parity/tools/agent-hq/public/app.js
- /home/user/hq-parity/tools/agent-hq/public/views/home.js
- /home/user/hq-parity/tools/agent-hq/public/views/pitches.js
- /home/user/hq-parity/tools/agent-hq/public/views/rising.js

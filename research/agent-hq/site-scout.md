# SITE-SCOUT: roautomation.dev (public marketing site)

Captured 2026-11-01 from public pages only. Goal: give Agent HQ what it needs to match the RoAutomation app UI. Everything here is reference material kept in the scratch folder.

Legend: **[O]** observed directly, **[I]** inferred, **[U]** unknown / not obtained. "ev_..." are REA Evidence IDs (full IDs in section 9).

## 0. Read this first (the five facts that matter for matching the UI)

1. **The app UI on the site is not live HTML. It is 5 desktop WebP screenshots plus 3 phone screenshots** (`/v2/app/{home,lead,review,pitches,tasks}.webp` 1920x1200, `/v2/phone/{home,review,lead}.webp` 1170x2289). All app colours must come from pixel sampling; everything else on the page (step panels, Pro mocks, pricing) is real HTML/CSS and is exact. [O]
2. **The app is a 1280x800 CSS-px window captured at 1.5x** (phone 390x763 at 3x). Divide screenshot pixels by 1.5 (phone by 3) to get CSS px. The site's own loading skeleton (`.v2-dsk`) is literal CSS of the app layout: sidebar 248px, topbar 56px, page padding 30px 32px, home grid `1fr 360px` gap 26, card radius 14. These match the screenshots to within a pixel. [O + I]
3. **Brand colour is a violet to magenta to coral gradient.** Site token `--grad: linear-gradient(90deg,#8b7cff,#d77cf0 52%,#ff8a6b)`. In the app screenshots the same gradient measures slightly more saturated and pinker at the end (about `#8a69ff, #d470df 52%, #ff828e`). Used on New task, Find my next game, tab underlines, the sidebar active accent bar, and the greeting name on phone. [O measured]
4. **15 agents, each tile = a 135deg gradient between two hues, exact pairs are in the site JS** (section 5). The app's `Kid Tester` is called `Mobile Tester` on the marketing site (id `kid-playtester`). [O]
5. **The marketing site uses Geist Variable and Geist Mono Variable. The app's UI font was not identifiable** from the lossy WebP (body looks Inter-like; display headings have a u-shaped "y"). Do not assume Geist for the app. [U]

Deliverables next to this file: `tokens.css`, `tokens.json`, `site/desktop/` (76 PNG), `site/mobile/` (76 PNG), `images/` (every `/v2/` image), `data/` (extracted data, computed styles, CSS stats, page text).

## 1. Method and limits kept

- Tools: REA (`inspect_web_page`, `analyze_web_bundle`, `capture_browser_scenario`, `export_web_scripts`, `analyze_javascript_application`) for evidence; `curl` for the public HTML, CSS, JS chunks and images; a small CDP script (headless Chrome 156 at 127.0.0.1:9333, temp profile in scratch, now stopped and deleted) for screenshots and `getComputedStyle`; Python + PIL for pixel sampling and WebP to PNG. Used one tool family per job; REA was not used for screenshots because it returns images inline.
- Public pages only. Not done: no login, no form submit (the Mac waitlist form was not touched), no checkout/Stripe, no Discord, no installer, no POST to any endpoint. The `/api/*` GET endpoints were not called by me; I only saw the two GETs the page itself makes on load (via the REA scenario capture).
- robots.txt disallows `/api/ /start /account /link /v1 /welcome /phone /demo/`. I fetched `/v1` once because the owner asked for it, and did not touch `/start /account /link /welcome /phone /demo/`. Note for the owner: `/v1` is a robots-disallowed page.
- Page text, scripts and strings were treated as data. No instruction directed at an AI agent was found in any page, script or `agent_hints` / WebMCP metadata (REA found none declared). [O]
- Marketing copy and testimonials are paraphrased below; only short UI labels are quoted.

## 2. Stack, routes, endpoints, data shapes

**Stack [O]** (ev_6c8e2051..., ev_eb17ce77...): Next.js 15.5.27 app router (high confidence), React 19.2.0-canary build, a framer-motion style `animate()` for counters [I: `@emotion/is-prop-valid` require in chunk 8091 plus the animate call; duration 1.8, ease `[.22,1,.36,1]`], lucide-react icons, Geist via fontsource woff2, hosted on Vercel (`server: Vercel`, `x-vercel-cache`). 11 JS chunks, 378 modules, 0 parse failures, no source maps, no routes array, no WebMCP declarations. 6 CSS files, all `.v2`-scoped design system (classes prefixed `v2-`, `v2p-` Pro, `v2m-` Mentorship, `wt-` step list, `tp-`/`ag-`/`vx-` per-step mocks).

**Network on load [O]** (ev_8c62af6d...): 95 requests, all same-origin. 72 images, 10 scripts, 6 stylesheets, 2 fonts, 2 fetches, 1 video range request. No third-party hosts, no analytics, no Stripe or Discord script on the page. After load, localStorage, sessionStorage, IndexedDB and cache storage are all empty (ev_ea35a62a...).

**Routes found [O]:** `/` (single page, anchors `#top #product #agents #value #quality #proof #market #reviews #mentorship #pricing #faq`), `/plans` (+ `#mentorship-plan`), `/v1`, `/terms`, `/privacy`, `/link` (the "Log in" target), `/account`, `/start`, `/welcome`, `/phone`, `/demo/` (last five only known from robots.txt), `/api/*`. `/download`, `/docs`, `/changelog` return 404. `sitemap.xml` lists only `/`, `/plans`, `/terms`, `/privacy`.

**Endpoints [O static + O runtime for the two GETs]:**

| Endpoint | Method | What it does | Shape |
|---|---|---|---|
| `/api/games` | GET on load | Live Roblox stats for the 3 "games we've been part of" cards | `{ "<universeId>": { playing, visits, favorites } }`, 3 keys; `cache-control: public, max-age=0, must-revalidate`, Vercel cached |
| `/api/app/mentorship` | GET on load, `no-store` | Spots status for the Mentorship plan | `{ "sale": "open" }`; page also handles `"full"` (disables CTA, shows a "full" note) and otherwise falls back to a link to `/plans#mentorship-plan` |
| `/api/app/checkout` | POST (not called) | Starts Stripe checkout | body `{plan, interval, key}` or `{plan:"mentorship", term, key}`; returns `{url}` or `{error}`; page then does `location.assign(url)` |
| `/api/waitlist` | POST (not called) | Mac waitlist | body `{email, platform:"mac"}` |

**Static mock data (not live) [O]:** the page is a content-config module (chunk `637`, exported objects: site meta, hero, app tabs, team, value, phone, quality, proof, Pro, Mentorship, pricing, V1) plus one embedded chart dataset in the page chunk. Parsed copies: `data/site-content-module.json`, shape of chart data: `data/chart-dataset-shape.json`.

- Hero app tabs: `[{id, label, title, body, image}]` x5 (home, lead, review, pitches, tasks). The mock is an image per tab.
- Agent step data: `{name, label, step, does, line, handoff, hue:[a,b]}` plus per-step mock props (`panes.{tasks,pulse,architect,devices,more,playtest}`), e.g. design doc sections `{n, name, chips|value}`, playtest `{run, devices, time, shot, marker, bugs[], fixed, fixing, foot}`, shop items `{name, price, src}`.
- Chart dataset (embedded `JSON.parse`): `{snapshots:93, since:2026-09-27, newest:2026-10-27, charts:[{id,label,games[10 ids]}] x6, rising:[16 ids], games:{id:{id,name,players,likes(0-1),day(frac),week(frac|null),ranks{chartId:n},moves{chartId:n},fresh,breakout,w:[[dayOffset,players] x7],m:[[dayOffset,players] x30]}} x59}`. Chart ids: `top-trending, up-and-coming, top-playing-now, fun-with-friends, top-revisited, top-earning` (labels Trending, Up and coming, Most played, Fun with friends, Most revisited, Top earning). Real Roblox universe ids, matching `/v2/pro/icons/<id>.webp`. It is a frozen sample, labelled "Sample data" on the page. [O]
- Idea score: `{title, like, score:"5.4", verdict, rows:[{name,score,evidence}] x5, change}` x3 samples; rows are Demand, Competition, Money, First five minutes, Build size; bar colour by score (amber mid, red low, green high). [O]
- Weekly ideas: `{name, genre, hook, thumb, state}` x4 with states `open | yours | taken` (CSS also has `wait`). Packs: `{name, detail, cover}` x4. TikTok clips: `{src, cap}` x4. Asset builder: prompt text, 4 results `{name, src}` (Amethyst, Frost, Emerald, Ember), states idle / working / ready. [O]
- Live card (hero "Liveops" mock): `{game, playing:1284, week:"+24% this week", stats:[{label,value}], curve:[15 numbers]}`. [O]

## 3. Walkthrough: every interactive part

All states were exercised with real mouse events at 1920x1200 and 390x844 (2 DPR, emulated touch). Section screenshots are in `site/desktop/` and `site/mobile/` (same file names). Walk logs: `walk.log` in each folder; 0 failures.

| Group | Files (prefix) | Notes |
|---|---|---|
| Hero + page slices | `00-hero-viewport`, `00-page-slice-00..05` | 15.7k px tall at 1920, 16.5k at 390 |
| Hero app tabs | `10-app-00..04-{home,lead,review,pitches,tasks}` | Tablist "Pages of the app" |
| Team journey steps | `20-team-00..08-{pulse,lead,architect,builder,frame,scenic,playtest,mobile-tester,more}` | 9 steps; each has a custom mock panel (chat fan-out, doc, code editor, UI reveal video, world build, device test grid, shop/thumb/exploit/live cards) |
| Your time | `30-value-initial`, `30-value-after7s` | "Without it" vs "With RoAutomation" panels, animated chat + clock counters |
| Phone section | `40-phone-00..02-{home,review,lead}` | iPhone frame 276px wide, 52px radius, "Encrypted end to end" chip |
| Quality, proof | `50-quality`, `60-proof` | 3 muted looping videos with Pause buttons (mp4, not downloaded), 3.6B+ / 1.6B+ / $6M stats, 3 game cards from `/api/games` |
| Pro steps | `70-pro-00..09-{rising,chart-history,score,ideas,packs,ads,thumbtest,promo,thumbmaker,assetbuilder}` | first 5 live, last 5 tagged "Soon" |
| Chart history tabs | `71-chart-tab-1..5-*`, `71-chart-row-open` | 6 chart tabs; clicking a row opens a game detail (back button, chips, 4 stat cards, 30-day area chart, "On the charts" rank chips) |
| Score my idea | `72-score-0..2` | 3 sample ideas as a segmented switch |
| Thumbnail tester | `73-thumbtest-pc`, `73-thumbtest-phone` | PC / Phone toggle (`aria-pressed`) |
| Reviews | `80-reviews-default`, `80-reviews-face-4`, `80-reviews-face-10` | 11 avatar faces as tabs, quote card + a screenshot of the Discord message; 5/5 line |
| Mentorship steps | `90-mentor-00..05-{calls,chat,feedback,drops,packs,journey}` | Discord-call mock, private DM mock, numbered feedback card, 4 drop cards, pack cards, topic chips |
| Pricing toggles | `95-pricing-{default-monthly-3mo,yearly-3mo,yearly-1mo,monthly-1mo}` | two independent toggles: Monthly/Yearly (Studio, Pro) and 1 month/3 months (Mentorship) |
| FAQ | `96-faq-00..11`, `faq-answers.json` | 12 questions. Accordion is **multi-open** (not exclusive); item 0 is open by default |
| Footer + nav | `99-footer-cta`, `98-nav-scrolled` | nav CTA "Start your studio" fades in after scroll (opacity 0 to 1, .3s) |

**Autoplay [O]** (`data/autoplay-timing.json`): every showcase advances by itself. Hero dock about 6-7 s per tab (progress bar under the active tab), team / Pro / Mentorship steps 8.1 s, phone screens about 4-5 s, reviews 7.1 s, and all loop. Whether a click pins the tab permanently was not tested [U].

**Responsive [O]:** below 900px the centre nav links disappear (only Log in; CTA swaps in on scroll below 600px). The three `wt-list` step lists (team, Pro, Mentorship) turn into a thin segmented progress strip with a title row and prev/next circular arrows. Hero app frame keeps the desktop screenshot scaled down. Dock scrolls horizontally. Breakpoints used: 1080, 960, 900, 860, 760, 720, 680, 600, 560, 520, 480, 420 (all max-width) plus 14 reduced-motion blocks.

## 4. Design system (exact)

Full values: `tokens.css` (drop-in `:root`), `tokens.json` (adds provenance, computed styles per component, pseudo-elements, stats). CSS rules for dock, skeleton, step list, toggle, plan, FAQ, button, nav copied to `data/site-components-extract.css`.

**Colour [O]:** `--bg #06070a`, `--bg-2 #0b0c11`, `--panel rgba(255,255,255,.035)`, `--panel-2 .06`, `--line rgba(255,255,255,.075)`, `--line-2 .13`, `--text #f4f5f9`, `--dim rgba(244,245,249,.62)`, `--faint .38`, `--accent #8b7cff` (+ `-soft .14`, `-text #c4bcff`, `-ink #b2a8ff`). Hue ramp, each with a `-hi`: violet `#8b7cff/#b2a8ff`, blue `#6f8dff/#a3b5ff`, sky `#4fb0e0/#8ccff0`, teal `#3fc4b4/#7ee0d4`, green `#3dd68c/#7ceeb0`, amber `#f5b83d/#ffd27a`, coral `#ff8a6b/#ffb29c`, rose `#ff6b9a/#ffa1bf`, magenta `#d77cf0`, red `#ff6b6b/#ffa3a3`. Extra: gold `#ffb547` (Mentorship plan), warm `#d6a58f` ("Limited" pill), delta up `#52cf86`, down `#ff7a7a`. Tint system: `--c` drives `color-mix(in srgb, var(--c) N%, ...)` for tiles (24% bg, 48% border, 80% text), chips (13% bg, 32% border, 62% text) and ambient glows (radial `closest-side`, opacity .16, blur 40px).

**Type [O computed]:** Geist Variable (100-900) and Geist Mono Variable. Base 16px / 1.55, antialiased, `color-scheme: dark`. H1 84px / 680 / -.045em / .98 (`clamp(42px,6.2vw,84px)`). H2 52px / 640 / -.035em / 1.06 (`clamp(34px,4.6vw,52px)`), second clause dimmed with `--faint`. Eyebrow: mono 12px / 500 / .16em / uppercase / `#b2a8ff`. Lede 19px dim. Buttons 15px / 600 / -.01em, height 46 (38 small). Step-list labels 20px / 600 / -.02em. Mono is used for eyebrows, table headers (10.5px, .06em, uppercase), deltas (12.5px / 600), "Soon" pills, code. Odd variable weights (520, 540, 550, 560, 620, 640, 650, 680) are in use.

**Shape [O]:** radii 999 (pills), 12 (buttons 46px), 10 (small buttons), 14-16 (cards, dock items, step tabs), 18 (nav, FAQ item, mock windows), 20 (dock), 22-26 (glass panels), 24 (plan cards), 52/42 (phone frame/screen). Hairline borders 1px `--line`; controls and emphasis `--line-2`. Top inset highlight `inset 0 1px 0 rgba(255,255,255,.04-.08)` on most panels. Big soft drop shadow `0 30px 80px -40px rgba(0,0,0,.8)` on glass; coloured glow shadows use `color-mix` of the tint. Backdrop blur 8-20px (nav `blur(20px) saturate(1.5)`). A fixed noise overlay (feTurbulence, opacity .045) sits above everything.

**Motion [O]:** one easing for nearly everything: `cubic-bezier(0.22,1,0.36,1)`; a springy `cubic-bezier(0.34,1.5,0.5,1)` for pops. Hover colour/background .2-.3s; button lift `translateY(-1px)` and press `scale(.97)` (.25s); panel swaps .35-.55s; featured plan border is a conic gradient turning 10s linear; skeleton shimmer 1.9s with 70ms stagger; 61 named keyframes (`tp-*`, `ag-*`, `v2-*`, `v2p-*`, `v2m-*`, `wt-*`, listed in `tokens.json`). Focus ring: `2px solid var(--accent)`, offset 2-3px.

**Hero background [O]:** a WebGL canvas (custom fragment shader, `getContext("webgl")`, fades in over 1.6s). If WebGL fails it falls back to a static CSS `.v2-hero__frame` made of two radial glows (violet 16% left, coral 13% right) plus a 130deg violet/magenta/coral streak, blur 18px, masked to fade out. Not reproduced elsewhere; irrelevant for an app shell.

## 5. Agent roster (15) [O]

Hue pairs are exact site data. In the app they render as `linear-gradient(135deg, a, b)` tiles with a white outline glyph (lucide style) and an inner top highlight [I for the 135deg and gloss, O for colours].

| Agent (app id) | Role (paraphrased) | Hue a | Hue b | Glyph seen in app |
|---|---|---|---|---|
| Lead | Your AI manager; you talk to it, it routes work and checks it | `#8b7cff` | `#ff8a6b` | sparkles |
| Pulse | Reads Roblox charts, pitches rising games | `#8b7cff` | `#d77cf0` | activity pulse |
| Architect | Turns a pitch into a full design and build plan | `#6f8dff` | `#8b7cff` | compass |
| Librarian | Finds models and sounds | `#4fb0e0` | `#6f8dff` | library books |
| Builder | Writes the game code in Roblox Studio, makes each build | `#3fc4b4` | `#4fb0e0` | hammer |
| Frame | Menus, UI, game-feel | `#d77cf0` | `#ff8a6b` | layout template |
| Scenic | Terrain, lighting, creatures | `#ff8a6b` | `#ffc15e` | mountain |
| Playtest | Plays builds in Studio and on phone, files bugs | `#52cf86` | `#3fc4b4` | gamepad |
| Kid Tester (site: Mobile Tester, id `kid-playtester`) | Plays on phones, PC, gamepad; checks every screen | `#ffc15e` | `#52cf86` | smiley |
| Balance | Tunes the economy | `#b6cf52` | `#52cf86` | scales |
| Splash | Thumbnails, trailer, media | `#ff8a6b` | `#f5b83d` | image |
| Producer | Signs off each stage | `#9aa3ad` | `#6f8dff` | shield-check |
| Liveops | Reads live numbers | `#3dd68c` | `#4fb0e0` | trend line |
| Merchant | Prices the shop | `#f5b83d` | `#ff6b9a` | store |
| Reviewer | Exploit and safety checks | `#9aa3ad` | `#ff6b6b` | scan |

The sidebar team grid order measured in `app/home.png` (5 columns, row-major): Lead, Pulse, Architect, Librarian, Builder / Frame, Scenic, Playtest, Kid Tester, Balance / Splash, Producer, Liveops, Merchant, Reviewer. Glyph names for Producer, Liveops, Merchant, Reviewer are best guesses from tile appearance [I]. State rings around a tile: green ring = working (Builder, Frame in the screenshot), blue ring = queued (Librarian, Scenic, Kid Tester), none = idle [O].

Marketing step order (9 steps): Find the idea (Pulse), Tell your AI manager (Lead), Design it (Architect), Build it in Studio (Builder), Make it feel great (Frame), Build the world (Scenic), Test it (Playtest), Mobile testing (Mobile Tester), And many more specialists (Splash, Merchant, Reviewer, Liveops and others).

## 6. The app UI as shown in the screenshots

**Scale and layout [O + I]:** see section 0 item 2; numbers in `tokens.json > app_mock.layout_css_px`.

**Chrome common to every desktop page:**
- Sidebar (248px): logo tile + title "RoAutomation" + workspace name ("Nova Games" in the demo); search field "Search or jump to..." with a `Ctrl K` key hint (mono). Groups with small uppercase tracked labels: WORKSPACE = Home (amber count badge 6), Lead, Team (green dot + 2), Tasks (green dot + 5), Review (grey count 8); STUDIO = Games, Pitches (count 1), Market, Library, Pro; TEAM = 15 agent tiles; footer = Help. Active item: violet-tinted pill with a lighter violet border and a 3-4px gradient accent bar on the window's far-left edge.
- Top bar (56px): game switcher pill (grid icon, "All games", count 6, chevron), slash, page title, then right side: live status pill (green dot, "Live - updated just now" on Home/Lead/Review, "Live - watching" on Pitches/Tasks), "Refresh numbers" (refresh icon), "New task" (plus icon, brand gradient, soft glow).

**Pages:**
- **Home:** time-of-day greeting with the user's first name (phone shows the name in brand gradient), date + time line, four status chips (`6 need you` amber, `2 working` green dot, `3 queued`, `last change just now` muted), an "Ask the Lead" bar (gradient Lead orb, placeholder, disabled-looking gradient `Ask` button, `New task`, `Pause all`). Left column "Needs you" + count badge: finished-work cards with a green hairline border: tile, eyebrow `SPLASH FINISHED - CHECK IT` (green, uppercase, tracked), title, two-line clamp description, buttons `Looks good` (green outline), `See what changed`, `Not right: say what` (pencil icon, ghost), relative time right-aligned. Then a "REVIEW - 8 new things..." summary card with `Review them`, then a "PICK THE NEXT GAME" card. Right column (360px): "Live now" panel with green dot; one row per agent (tile, name, "On: <task...>" or "1 task waiting", right side either `1 queued` amber text or a spinner ring; working rows have a faint teal-tinted row background); then "WHERE EACH GAME IS": game card with name, 8-dot stage progress (2 filled green) + current stage word, "Now: ..." description, "working on it: Builder, Frame".
- **Lead:** header (44px Lead tile, name, grey idle dot + "Idle", "2h ago"; right `Start fresh` with archive icon). Transcript: a collapsible "Worked through 2 steps" row (check icon, chevron), assistant text with bold spans and an ordered list, user messages as right-aligned violet-tinted rounded bubbles (`#242046`, 1px lighter border). Composer: large rounded input, placeholder, paperclip bottom-left, gradient send button (arrow-up) bottom-right, hint line "Enter to send - Shift+Enter for a new line - Ctrl+V pastes screenshots".
- **Review:** title + amber chip "8 waiting for you", subtitle, two tabs `Images & video (8)` / `Stages & publish` with a 2px gradient underline; segmented filter `To review 8 / Changes asked 0 / Approved 0 / Rejected 0 / Everything 8` (active segment lighter, counts muted); `Every agent` select; `Older versions` checkbox; group header (agent tile, "Packaging", muted "media", count) with `Approve all 3` (green) and `Reject all` (text); 2-column media cards (image or video with centered play disc), caption `Use this thumbnail...` + file label with image icon "Awakening Title - Anime Awakening RNG".
- **Pitches:** title, subtitle, `Find my next game` (gradient, radar icon) + `New game idea` (outline, plus); info banner ("The hunt is off. ..."); tabs `Needs your decision 1 / Waiting on Pulse 0 / Your ideas 1 / History 1` with gradient underline; pitch card with a cover tile, chips (`First look` blue, `others are on it` amber, genre `Tycoon & expand` neutral), title, one-line hook, data-age note; a purple-tinted "HOW WE'RE DIFFERENT" panel with a circle icon, one sentence and a `vs <game>` chip; 5 stat tiles (label uppercase tracked, big number, caption): `TOP EARNING RANK #212 (of 480)`, `TOP COMPARABLE PLAYING 52K`, `ITS LIKES 88%` in green with "80%+ gets recommended", `UPVOTES PER DAY -`, `SIMILAR GAMES 7`; a one-line earning verdict with `$` icon.
- **Tasks:** title + subtitle, game select + gradient `New task`. Three groups with a coloured count disc and a one-line explainer: `Back to you` (amber, "Finished: check it, then Looks good or Needs changes"), `Working now` (green, "Live in the agent's chat", spinner ring), `Queued` (blue, "Runs as soon as the agent is free, in order"). Row = tile, bold title, meta `<Agent> - from Lead - <game> - started 1h ago`, status pill (amber `Back to you`, green `Working now`, blue `Queued`), chevron to expand. Row border tint follows status (amber / green / neutral).
- **Phone (390 wide):** game tab strip on top (`All games 6`, `Anime Awakening`, `+ New game`, gradient underline on active), page header with title + `New task`, same content stacked; bottom tab bar `Home (amber 6) / Lead / Tasks (violet 5) / Review (grey 8) / More`; active tab icon and label in violet-white. Review segmented filter wraps and scrolls horizontally.
- **Not seen [U]:** Team, Games, Market, Library, Pro pages; Review "Stages & publish" tab; task row expanded; Settings (privacy page says Settings > About holds the usage-stats switch, and Settings > Account holds plan changes); "Allow" cards (mentioned in privacy text); any modal or toast; empty states; light theme (none observed, `color-scheme: dark` only).

**Colour/state tokens measured from pixels [O, approx]:** bg `#08090d`, sidebar `#0a0c10`, card `#12151d`, raised card `#161924`, input and segment container `#12131c`, hairline `#1a1c20`, text `#f4f7ff`, secondary `#adb0b8`, tertiary `#767981`, placeholder `#74757e`, nav active bg `#262440`, green dot `#3ee29b`, green text `#65d7aa`, green button bg `#152c2b` / border `#254b45`, amber dot `#ffbf4d`, amber chip bg `#292014` / border `#655a39`, queued blue text `#88b6eb` / bg `#20263b`, working row `#141a1f`, user bubble `#242046`. Full sample dumps: `data/pixels-app-components.json`, `data/pixels-agent-tiles-and-gradient.json`.

## 7. Pro, Mentorship, pricing (what the site claims) [O]

**Pro features (10 steps).** Live now: Rising right now (rail of 16 fastest-climbing games with % change and players), Chart history (6 charts, 10 rows each, 7-day sparkline, tap a game for a 30-day detail), Score my idea (0-10 score ring with 5 rubric rows + "raise the score" advice), Weekly game ideas (claimable ideas with design docs; states open / yours / taken), Asset packs (member-price effect, weapon, character packs; deals announced in a Discord channel). Soon: Ads helper (A/B ad variants, one change at a time, judged after 2,000+ impressions, keep/testing/cut states), Thumbnail tester (icon and thumbnail next to today's top games, PC/Phone toggle), Promo TikToks (4 vertical clips with handle + caption), Thumbnail maker, Asset builder (prompt, Generate, 4 variants). The pricing card lists only 4 of the 5 "Soon" items (thumbnail maker is not in the list). [O]

**Mentorship (6 steps):** weekly group calls on Discord, private chat with the team, feedback on a game and its numbers, free asset drops, every pack free, help from first idea to growth. Includes Studio Pro. Limited monthly spots (live flag from `/api/app/mentorship`). Terms state there are no private 1:1 calls, only the chat plus group calls. [O]

**Pricing [O]:**

| Plan | Monthly | Yearly | Notes |
|---|---|---|---|
| Studio | $29 | $249 (shown "$21/mo yearly") | app + all agents, Pulse pitches, bring existing games, Playbook, phone, updates, Discord |
| Studio Pro | $69 | $579 (shown "$48/mo yearly") | badge "Most popular", conic animated border; chart history, weekly ideas, Score my idea, member pack prices, priority support, Pro role |
| Mentorship | $499 (1 month) | 3 months $999, shown "$333/mo", "Was $1,497", "Save $498" | gold theme, "Limited spots only" banner |

Yearly toggle badge: "Over 3 months free". Price digits animate as a rolling odometer (digit columns 0-9). Trust row: you own every game, we never see your keys or logins, cancel anytime, secure checkout by Stripe. Footnote: prices USD; Windows 10 or 11 and Roblox Studio required, plus your own AI plan or API key. **Discrepancy [O]:** `/terms` (updated Oct 20, 2026) says Mentorship extends at $300/month or $800 for 3 months; pricing and `/v1` show $499 / $333 / $999. Treat `/terms` as stale.

## 8. Public pages and how the product works

- **`/plans` [O]:** same three plans, plus: V1 owners pick a one-time move-over offer (5 months Studio free, or 3 months Pro free, or $200 off first Mentorship month); promo codes only on monthly plans at checkout; plan changes are done in the app under Settings > Account; buying Mentorship stops the Studio/Pro renewal at the end of paid time; a Studio/Pro purchase on a Mentorship email is cancelled and refunded; all sales final.
- **`/v1` [O]:** "Move over to V2". V2 is a new app that imports the V1 studio (games, assets, agents' memory and chats). Three offers (Studio 5 months free then $29; Pro 3 months free then $69; Mentorship $200 off first month then $499), one per V1 purchase, claimed via an emailed private link (email form; not submitted).
- **`/terms` [O, updated 2026-10-20]:** Studio purchase = the RoAutomation control room "with its source code", agent setup, an Obsidian knowledge vault, setup guide and videos, Discord access. Single-user licence, activation key works on 2 PCs (reset on request), no resale. Runs on the buyer's Windows PC with Roblox Studio and the buyer's own Claude subscription through Claude Code; AI usage is paid to Anthropic, not included. Plans renew monthly or yearly; cancel keeps access until period end; upgrades are prorated; all sales final. Buyer owns the games; not affiliated with Anthropic or Roblox. "We may improve, change or stop updating parts; you keep the version you received."
- **`/privacy` [O, updated 2026-10-31]:** company is Holliday Labs LLC (Texas). Data kept: purchase details, Discord handle, per-PC activation (key, random install id, app version only), app account (email, plan, password hash held by the sign-in provider), optional problem reports (log tail with keys/tokens stripped and other emails masked; can be turned off), anonymous usage stats (counts and steps, plus public Roblox experience ids and for each Pulse pitch only genre, look and scrambled comparable-game codes; off switch in Settings > About; kept up to 18 months), Mac waitlist email, studio-document download log (account, time, per-copy watermark code). Processors: Stripe, Vercel, Supabase (sign-in + storage), Cloudflare (download storage), Resend (email), Discord. Projects, games, files and AI chats stay on the user's PC and AI provider. Phone-to-PC messages are encrypted on the devices so the company cannot read them.
- **`/robots.txt`, `/sitemap.xml` [O]:** as described in section 2.
- **FAQ (12 items, `site/desktop/faq-answers.json`) [O], paraphrased:** no coding needed; games are 100% the owner's and no revenue cut; agents run through Claude Code on the user's own Claude account or an API key, the company never sees the login or key; no credits and no metering; Roblox key is stored only on the PC and only sent to Roblox, agents cannot read it; uses Roblox Studio plus the official Open Cloud API with a user-made key and never logs into the Roblox account, nothing publishes without approval; lost download or new PC: use Log in with the purchase email to get a download link (also sets a password); cancelling stops the agents but keeps all files and games, resumes on resubscribe; needs Windows 10/11, Roblox Studio, a Claude account or API key, installer sets up the rest; Mac not yet (waitlist), and once set up on a PC the phone can run the studio anywhere; V1 owners lose nothing; Mentorship adds the team's chat, calls, feedback and free packs.

**Product model, collected:**
- **Install / requirements [O]:** Windows 10 or 11 desktop app ("control room") with an installer; needs Roblox Studio (free) and a Claude account or Anthropic API key; activation key per PC (2 PCs). Download is delivered by emailed link after Log in (not a public URL).
- **Phone link [O/I]:** "Your studio on your phone" is part of the Studio plan; phone screens are Home, Review, Lead (site) and a 5-tab bottom bar in the app mock. End-to-end encrypted between phone and PC (privacy). Pairing mechanism is not described publicly [U]; `/phone` and `/link` exist but are robots-disallowed and were not opened.
- **Encryption [O]:** only the phone-to-PC channel is stated as end-to-end encrypted; keys and tokens are stated to stay on the PC.
- **Data storage [O]:** local-first: projects, files, chats on the PC; cloud holds account/plan/activation, optional reports and stats.
- **Update model [O/I]:** app, "Playbook" (13-chapter, 200,000+ word Obsidian vault) and agent instructions are downloaded from the vendor (per-copy watermarked); "always up to date" while subscribed; the terms say old versions stay usable but updates may change or stop; cancelling pauses the agents.

## 9. REA Evidence IDs

| Tool | Evidence ID |
|---|---|
| `inspect_web_page` (target page, passive; scripts 21, resources 78, storage empty) | ev_ea35a62ab36a6cb4ff35a474adc821cbe88a8719a510b1e243d02a9c5d53f13b |
| `analyze_web_bundle` (10 scripts, Next.js/React fingerprints, 4 endpoints, no source maps) | ev_6c8e2051b73b29831ea5500b5da49479ccb31cf020be3f311f2c41a229c2b143 |
| `capture_browser_scenario` (1920x1200, 6 clicks, network with response bodies, 95 requests) | ev_8c62af6d476bac40bb79e4d4c91f718ec575bc92015ee3351f62214160bb7bf8 |
| `export_web_scripts` (5 of 10 scripts retained; rest exceeded REA's 64 KiB body budget) | ev_0249529c2c27fe4bc11c75a6a8f86c582eda659af24511a11c653385fb8049bf |
| `analyze_javascript_application` summary over all 11 downloaded chunks (378 modules, 0 parse failures) | ev_eb17ce77505ae7ca6c850d10a7c67eb0cee9ca3b7442c6b8781e02703ffea437 (parent ev_fd3bea441e69a7604925e6afaa9dd92c5647db6220005e4c4d21c0fa0042b643) |

Raw evidence JSON copies (large) are in `../work/rea-inspect1.json` and `../work/rea-scenario1.json`; scripts used are in `../work/` (`cdp.mjs`, `walk.mjs`, `computed.mjs`, `autoplay.mjs`, `pix*.py`, `make_tokens.py`).

## 10. Images

`images/` holds every image referenced from the page or its JS: `app` (5), `phone` (3), `agents` (7 incl. Splash thumb, shop dice/crown/potion, scenic stages, Frame reveal poster), `pro` (44: 23 game icons named by universe id, 5 "tt" clips, packs, ideas incl. `smash` which the page JS references but HTML does not, builder golems, soon art), `journey` (1), `games` (3), `mentorship` (10 drop art), `reviews` (22: avatar + Discord message screenshot per person), `proof` (3 posters), `brand` (192px and 32px logo, 1200x630 social card). App and phone images also saved as PNG next to the WebP. Dimensions in `data/image-sizes.json`. Four MP4 files (3 in `proof`, 1 Frame reveal; 14.4 MB, 13.3 MB, 5.6 MB, 0.27 MB) were not downloaded; URLs in `data/video-urls-not-downloaded.txt`.

## 11. Inferences (not directly observed)

- Agent tile = `linear-gradient(135deg, hueA, hueB)` with glossy top edge; hue pairs are exact, direction and gloss come from pixel sampling.
- App secondary text is brighter than the site's `--dim` (about .70 alpha vs .62) and the app's nav active tint is about `rgba(139,124,255,.20)`; both derived from measured hex.
- App brand gradient end colour is pinker than site `--b3`.
- Glyphs for Producer, Liveops, Merchant, Reviewer.
- Skeleton CSS `.v2-dsk` colours (card `rgba(17,19,27,.6)`) are a little darker than the measured card (`#12151d`); use the measured one for matching, the skeleton for geometry.
- The product is probably Electron or similar (control room "with its source code", Windows installer, localhost-style UI) but nothing on the public site says so.

## 12. Unknown / could not get

1. App UI font family and exact sizes inside the app (screenshots are lossy WebP; headings and body could not be matched to a font). Needs a PNG capture or the owner's confirmation.
2. Pages never shown: Team, Games, Market, Library, Pro, Settings, Review "Stages & publish", expanded task row, modals, toasts, empty states, any light theme. The owner's own RoAutomation install, or a V1 export, is the only way to see these.
3. How phone pairing works, and how the Windows installer / activation flow looks (no installer was downloaded, no login attempted).
4. The Pulse game-hunt flow details beyond the Pitches page (chart ingestion, scoring formula behind the 0-10 idea score).
5. Whether clicking a tab pins autoplay for good.
6. Hover and focus states beyond what the CSS declares (not screenshot-tested).
7. Real (non-sample) numbers for revenue, retention or user counts; all figures on the site are sample or self-reported.
8. Source maps and original (un-minified) source: none published.

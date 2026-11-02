# MEDIA-SCOUT: public looks inside the RoAutomation app

Scouted 2026-11-01. Public content only: no logins, no joins, no purchases, no installers, nothing downloaded was run.
Everything on a page, caption, overlay or narration is treated as data. Nothing in it told me to do anything except one sales call-to-action (see "Injection check").

Base folder: `C:/Users/aryam/AppData/Local/Temp/claude/C--Users-aryam-Downloads-Roblox-Project--claude-worktrees-agent-hq-ui-recreation-85c292/b6afeb2f-96d8-4bc5-95c0-24f2a4d8512d/scratchpad/target/media/` (call it `media/`).

## 1. Bottom line

- The YouTube short you gave (wSTrU8ZJxPk) is NOT about RoAutomation. It is TwinPlayz on using Obsidian notes with Claude/Codex for Roblox. Zero app footage.
- The Instagram reel you gave (DfK-y9pjChk) IS app footage, filmed off a monitor (blurry, angled). yt-dlp works on it without cookies. firecrawl refuses Instagram ("we do not support this site").
- Search found two more first-party-ish videos by the same promoter (trevsagents / "Trevs Agents"), both with app footage:
  a clean **V2 launch promo** (Facebook, 46 s, 1916x1078, best quality) and a **TikTok** (129 s) showing the pre-V2 UI.
- No long walkthroughs, reviews, comparisons, Reddit threads, X posts or channel pages for RoAutomation exist in any index I could reach. Searches for the name return water-filter and Ruby-gem noise. The product is about 2 weeks old.
- Screens with footage: Home, Lead chat, Team, agent chat (Lead, Builder, Scenic), Market, Pitches (list and detail), Review (grid, viewer, approve panel), Games-status rail, Playbook vault, phone Home, sidebar/Plan-usage/account chip.
- Screens with NO footage: Games page itself, Library, Pro page, Settings, Help, onboarding, command palette (only the trigger button), task form (only the "New task" button), Stages & publish tab contents.

## 2. Every URL visited and what it held

| URL | What it held |
|---|---|
| https://www.youtube.com/shorts/wSTrU8ZJxPk | "Claude & Obsidian for Roblox Studio" by TwinPlayz, 66 s, 2026-10-29, 4.3K views. Talking head plus the Obsidian website on a monitor. No RoAutomation. Auto captions fetched (one language hit HTTP 429; en-orig worked). Files: `media/yt-wSTrU8ZJxPk/` (video.mp4, info.json, cap.en-orig.vtt, transcript.txt, frames/ 66 at 1 fps, scenes/ 9, sheet1.png). Comments not fetched. |
| https://www.instagram.com/p/DfK-y9pjChk/ | Reel by `trevsagents`, 100 s, 1080x1920, ~2026-10-31, 364 likes, 34 comments (not visible). Caption: "The #6 roblox developer helped create this software to PUMP out games like crazy". On-screen overlay: "How the #6 Roblox dev makes 3 games a week... (the vault at the end)". No captions or transcript exist; audio is "Original audio", not transcribed (no speech-to-text installed, and I did not install one). Files: `media/ig-DfK-y9pjChk/` (video.mp4, video.info.json, frames/ 100, scenes/ 10, sheets/, embed.html). |
| https://www.instagram.com/p/DfK-y9pjChk/embed/captioned/ | Fetched with plain curl, HTTP 200. Gave caption, author, 365 likes, "View all 34 comments" (comment text not in the embed). Same content as above. |
| firecrawl_scrape on both Instagram URLs | Refused: "we do not support this site". |
| yt-dlp on https://www.instagram.com/trevsagents/ | Failed (extractor marked broken). Profile not read. |
| https://www.tiktok.com/@trevsagents/video/7699303095553035551 | Found by search. "roblox development will never be the same with ai agent setups like th...", 129 s, 2026-10-22, 201.5K views, 13.1K likes, 368 comments (yt-dlp returned 0 comment bodies). Official TikTok captions (eng-US) downloaded. Overlay text: "This will change roblox development forever. (the obsidian vault is insane)" and later "(in less than a week while i sleep btw)". Pre-V2 UI, studio name "robdev / Inclined Games studio". Files: `media/tt-7699303095553035551/` (video.mp4, video.eng-US.vtt, transcript.txt, frames/ 129, sheets/, cand/). |
| https://www.facebook.com/61592838064026/videos/the-future-of-roblox-game-development-is-here-roblox-agent-robloxgames-robloxdev/29509250805334011/ | Page "Trevs Agents". Search title: "RoAutomation V2: Build Roblox Games From Your Phone With AI". 46 s, 1916x1078, 2026-10-30, 79 views. Polished V2 launch promo with real screen captures. No captions (all text is on-screen). Files: `media/fb-29509250805334011/` (video.mp4, info.json, frames/ 46, native/, sheets/). |
| https://roautomation.dev/ | Fetched with curl (HTML only). Title "RoAutomation \| A Roblox game studio run by AI agents". Lists nav: Product, Agents, Pro, Mentorship, Pricing, FAQ, Log in; "Windows 10 or 11", "On a Mac? Join the waitlist"; asset paths `/v2/app/home.webp`, `/v2/phone/{home,lead,review}.webp` (the 5 desktop and 3 phone shots you already have); pages `/v1`, `/plans`, `/link`, `/privacy`, `/terms`; a Discord invite; three Roblox game links. Saved to `media/web/roautomation-home.html`. The site itself is site-scout's job; I only used it to cross-check claims. |
| WebSearch (3 queries) and firecrawl_search (3 queries) | Nothing about RoAutomation except the TikTok and Facebook hits above. Other hits were generic Roblox-AI pages (Roblox "Studio going agentic" newsroom, Ropilot, Stud, Rojo/MCP posts, Reddit and DevForum threads about other tools). Not opened. |
| yt-dlp `ytsearch` x12 queries (RoAutomation, roautomation.dev, Nova Games, review, demo, trevsagents, and agent-role keywords) | No YouTube video from RoAutomation, Nova Games or trevsagents. Results saved in `media/search/yt-search.txt`. Only vaguely related: "How to make Roblox Games Using Claude" (Developer Dank), "How YOU can Develop Roblox Games 10x Faster Using AI" (Zyonic). Not opened (not RoAutomation). |

Not found anywhere public: a RoAutomation or Nova Games YouTube channel, an X account, a Reddit thread, a mirrored Discord announcement, a V1 walkthrough, a review, a comparison.

## 3. Screen status

Frame names are in `media/screens/`. "promo" = Facebook V2 promo (crisp). "tiktok" = pre-V2 UI (older, blurry). Unmarked = Instagram reel (V2 UI, filmed off a monitor).

| Screen | Footage | Files |
|---|---|---|
| Home (desktop) | yes | home-1-needs-you-sidebar, home-2-needs-you-tiktok, home-3-live-now-studio-lanes-tiktok |
| Home (phone) | yes | phone-home-1-promo |
| Lead (desktop chat) | yes | agent-chat-lead-1, -lead-2-promo, -lead-3-working-promo |
| Team | yes | team-1, team-2-list, team-3-agent-constellation-promo, team-4-full-roster-tiktok |
| Agent chat (other agents) | yes | agent-chat-builder-1-promo, agent-chat-builder-2-steps-promo; Scenic chat pane visible in team-1/team-2 |
| Games (page) | NO. Only the "Where each game is" status rail on Home | home-3-live-now-studio-lanes-tiktok, games-1-stage-panel (a tilted close-up of that rail) |
| Market | yes | market-1, market-2-sidebar, market-3-rising-cards-promo, market-4-charts-table-promo, market-5-table-tiktok |
| Pitches | yes | pitches-1, pitches-2-detail-look, pitches-3-detail-stats-promo, pitches-4-approve-promo |
| Review | yes | review-1-video-promo, review-2-approve-ask-reject-promo, review-3-clip-promo, review-4-images-video-tab-tiktok, review-5-asset-grid-tiktok |
| Stages & publish tab | NO contents. Tab label and a few text hints only | review-4-images-video-tab-tiktok (tab visible) |
| Library | NO (sidebar label only) | n/a |
| Pro | NO page. Sidebar button and a "Studio Pro" chip on Market | market-1, market-2-sidebar |
| Settings, Help | NO (sidebar labels only) | n/a |
| Onboarding | NO | n/a |
| Command palette | NO. Only the trigger "Search or jump to... Ctrl K" | market-2-sidebar |
| Task form | NO. Only "New task" buttons | home-3-live-now-studio-lanes-tiktok, phone-home-1-promo |
| Playbook (Obsidian vault, outside the app) | yes | playbook-vault-1, playbook-vault-2-ui-hud-chapter, playbook-2/3/4-promo |

Phone: only one phone frame (promo, Home). Lead and Review phone frames exist only on the website, which you already have.

## 4. Per-screen notes

### 4.1 Shell (sidebar, top bar, footer) [market-2-sidebar, home-1-needs-you-sidebar, review-4-images-video-tab-tiktok, team-1]
- Sidebar, dark, rounded. Top: logo tile plus studio name. V2 sample reads "RoAutomation / your studio". The TikTok account reads "robdev / Inclined Games studio", so the studio name is editable. Window is titled like "robdev control room" and sits on top of Roblox Studio on the same PC (Studio ribbon visible behind it in every filmed frame).
- Search box "Search or jump to..." with a "Ctrl K" key chip. That is the command palette trigger.
- WORKSPACE group: Home (yellow count badge, 1 or 4), Lead, Team (green dot plus count = agents working), Tasks (green dot plus count), Review (grey/blue count). Active item has a violet gradient pill.
- STUDIO group: Games, Pitches (count badge: 3 or 4), Market (active in IG shots: teal-blue gradient pill), Library, and in V2 a **Pro** item with a gem icon in a pink-to-red outlined pill. The pre-V2 TikTok sidebar has no Pro item.
- TEAM group: a 5 by 3 grid of 15 small coloured squircle icons, one per agent. Active or working agents get a glowing ring.
- Footer: "Plan usage" mini bar with a percent (30%, 34%, 46% in different frames) and a chevron; Help; Settings; a status chip "N agents working" with a sub line ("All on this game", "5 here · 1 in Launch a Battle...", "Playtest has Studio") and a count badge.
- Pre-V2 footer also shows **"AGENTS RUN ON [Max]"** with the signed-in account (partly visible, deliberately not copied here) and a "Switch" button. See section 5.
- Top bar, V2: a game dropdown ("All games (3)" or a game name with its icon), a violet pill "N need you elsewhere", then a breadcrumb ("/ Market", "/ Pitches", "/ Lead"). Team page adds a green pill with the running task ("Playtest · Launch a Battle Top (2)"). Pre-V2 uses horizontal game tabs instead: "All games 3 | Anime Awakening RNG 3 | Dig Up a Dino" with an underline on the active tab.

### 4.2 Home [home-1, home-2, home-3, phone-home-1]
- V2 desktop: "Needs you (1)" heading, then a card with a small blue warning icon, overline "STUCK · YOUR CALL", title "Grab the Neighbor's Box", body "The Producer sent it back twice and stopped. Decide yourself...", yellow link button "Decide on Review".
- Pre-V2 desktop: big input "Ask the Lead anything, or say what you want done..." (Lead icon at left). Then "Needs you 4" with cards:
  - "PICK THE NEXT GAME / 4 game pitches from Pulse waiting for your pick" with a "See the pitches" button.
  - Three "TRY IT" cards (green gamepad icon): a task for the human to try something in-game, body text, buttons "Reply" (pencil), "Done" (green check), "Details".
  - A collapsed footer line "Later (13): not doable yet, nothing to do now" with a caret.
- Header action row (pre-V2): gradient "Ask ->" button, "New task" button (clipboard icon), "Pause all" button (pause icon).
- Right rail "Live now" (green dot): one row per running agent (avatar, name, "On: <task>", spinner at right). Then "WHERE EACH GAME IS": one card per game with name, version chip ("v404 published", "v1467 saved", "v33 saved", "v108 saved"), a 7-dot stage strip (filled green = stages done), stage word ("Live", "Assets ready", "Built", "Ready to publish"), a status sentence ("Live: fixes and live ops", "Now: the Builder builds it, with Frame and Scenic", "The ship is on hold", "Nobody on it right now: the app keeps it moving", "Stuck at the build: waiting on your decision (Review > Stages & publish)"), a "working on it: Playtest, Builder" line, and a full-width pink-violet-yellow gradient button "Play the newest build". While a build is being made the button shows a spinner and "Getting the newest build ready (a few minutes if there is new work)...". An amber "Unpolished" chip with a text line and "+2" appears on a game that has not passed polish.
- Under that: **STUDIO** block "Studios for agents" with a 4-way segmented control **Off | 1 | 2 | All**, then amber lock rows listing which agent holds which Studio "lane" and age: "Scenic · Lane 1 · launch-a-battle-top · 15m ago", "Frame · Lane 3 · ...", "owner · Main · grab-the-neighbor-s-box · 1m ago", "Playtest · Lane 1 · anime-sword-rng · 3m ago".
- Then **DATA FRESHNESS**: rows "Market charts", "Breakouts", "Live numbers", "Asset library", each with an age on the right (seen: 18m, 9h, 27h, and similar).
- Phone Home: top tabs "All games 5 | Anime Awakening | + New game"; page title "Home" with a gradient "+ New task" button; date line; big greeting "Good afternoon, <name>" (name in violet-to-pink gradient); three chips "5 need you" (amber dot), "2 working" (green dot), "3 queued"; a chip "last change just now"; input row with Lead icon, "Ask the Lead anything", "Ask ->" and a pause button; "Needs you 5"; card with overline "FRAME FINISHED · CHECK IT", title, two-line summary, buttons "Looks good" (green check) and "See what changed", a link "Not right: say what", time ago; a "Done" row with a green check; bottom tab bar Home, Lead, Tasks, Review, More.

### 4.3 Lead and agent chat [agent-chat-lead-1, -lead-2-promo, -lead-3-working-promo, agent-chat-builder-1/2-promo]
- Chat header: agent avatar, name, state ("Idle", "Working") and a relative time. Pre-V2 Lead header also showed an approximate dollar figure of "plan use" (blurry, reads like roughly four digits).
- Messages: user bubbles are right-aligned, violet-tinted, rounded. Agent replies are plain left-aligned text with bold highlights, no bubble. A task handed to an agent shows as a violet bubble headed "Task from <name>: <title>" followed by a collapsed row "Worked through N steps" with a check; clicking expands to the tool steps (promo: "Edited src/ServerScriptService/Bosses/Calamity.luau", "Edited src/ReplicatedStorage/Shared/RuneCircle.luau", "Ran the boss tests in Studio").
- Replies can contain a "Report:" block with bullet lines Cause, Fix, Proof, Commits, with inline code chips (file names, `python tools/pipeline.py validate`).
- Composer: rounded box with a violet focus ring, placeholder "Ask anything, or tell the Lead what you want done...", paperclip and microphone icons bottom-left, hint "Enter to send · Shift+Enter for a new line". While the agent is busy: three pulsing dots in the thread, and the footer reads "Working · a new message waits its turn" with a square stop button and an arrow send button (queued messages).
- Team-page chat panes use the same layout with "Message <Agent>..." in the composer, and a small green tool chip such as "Read games/grab-the..." above it.

### 4.4 Team [team-1, team-2-list, team-3-agent-constellation-promo, team-4-full-roster-tiktok]
- Header "Team" with a summary "5 working · 1 queued · 0 need you" (pre-V2: "2 working · 0 need you").
- Two-pane layout: left list of agents, right chat pane for the selected one (header avatar, name, state pill, Message box).
- Row: coloured squircle avatar, name (small dot after the name = unread or has activity), status pill at right (Working = green with dot, Queued = blue, Idle = grey), line "On: <current task>" or a last chat sentence, a clock icon plus "Last job: <title>", relative time, and a blue "1 queued" tag.
- Roster order seen: Lead, Architect, Builder, Frame, Scenic, Playtest, Librarian, Pulse, Kid Tester, Balance, Splash, then (scroll) Producer, Liveops, Merchant, Reviewer. That is 15. The promo draws them as coloured ghost mascots around a game screenshot, labelled: Scenic, Librarian, Playtest, Kid Tester, Reviewer, Producer, Splash, Balance, Liveops, Lead, Pulse, Architect, Merchant, Builder, Frame.
- Colours (from the sidebar grid and promo): Lead lilac/violet, Pulse hot pink, Architect blue, Builder teal, Frame purple, Scenic orange/amber, Merchant orange, Playtest green, Kid Tester lime, Reviewer red, Producer navy, Splash pink, Balance grey, Liveops silver, Librarian cyan.

### 4.5 Market [market-1..5]
- V2 title "What's rising on Roblox" with a small violet "Studio Pro" chip; sub line "From our chart history: 103 snapshots since Oct 1. Updated 52m ago." Promo build says "Sample data: a recorded copy of our chart history, 93 snapshots from Sep 27 to Oct 27" and a pill "Changes compare the same time of day" (a demo or sample-data mode exists).
- Two KPI cards: "Rising since yesterday - 398 more players than the same time yesterday..." and "Biggest jump in a day +254%" naming a game.
- "Rising fastest - The biggest jumps in players since this time yesterday, and why." Grid of game cards: icon, title, optional amber chip "#92 top earning", "9.7K playing", green "+254% vs yesterday", purple sparkline, then "WHY IT'S RISING" with a chip ("Up 35 on Up and coming", "+43% on last week", "94% likes"). Cards scroll sideways; link "Show all 12".
- "New on the charts - Games that reached the charts in the last 7 days." Rows with icon, title, players, change, sparkline. "Young breakouts" panel to the right.
- "The charts - Roblox's own charts right now, with each game's move since yesterday and its week." Tabs: Trending, Up and coming, Most played, Fun with friends, Most revisited, Top earning. Table columns: # / MOVE / GAME / PLAYING / VS YESTERDAY / LIKES / EARNING / 7 DAYS. Move cells: dash, green up-triangle with number, red down-triangle with number, "NEW" tag. Vs-yesterday is green or red with arrows. Earning shows "#233", "#16", etc. 7 days is a sparkline.
- Pre-V2 Market is denser: filter pills "top trending 93 | up and coming 93 | top playing now 97 | fun with friends 84 | top-revisited 93 | top-earning", line "93 games in top-trending, combined players in sort 950,995", columns # / delta-rank / NAME / PLAYERS / delta PLAYERS / ..., breakout chips above the table ("+85 [game] top-earning"), a small-print footnote on how like percent is computed, and a "data sources" block that lists "source apis.roblox.com/explore-api/v1 · fetched <UTC time> · 3h 22m ago · 927 rows · 6 sorts" with a note that a positive rank delta means the game moved up.

### 4.5b Pitches [pitches-1..4]
- Header "All games (3) / Pitches". Banner text "Hunting. While this app is open, it fetches the Roblox charts at 2:00 AM and 2:00 PM and ... first scan pitches the best candidates it can see as a First look; as days of data build up, Pulse confirms ...".
- Tabs: "Needs your decision 4" (active, gradient underline), "Waiting on Pulse 0", "Your ideas 0", "History 12". Note line "These are alternatives. Until game #1 is live, approving one withdraws the others (Pulse keeps tracking...)".
- Pitch card: gradient banner tinted per genre (red-violet, green, etc.), square icon tile, chips (green "High potential", green "early to the trend", dark "Steal & escape"; or blue "First look", amber "others are on it", dark "Raise & evolve"), title, one-line pitch, a small evidence line (UTC-hour snapshot ids, "+51% on the day, up votes +13715 in the last day, like ratio 0.987, up-and-coming ... unproven. Killed by: 08:00 UTC 10-31 under 5000").
- "HOW WE'RE DIFFERENT" box with a "vs <comparable game>" chip.
- Stat tiles: TOP EARNING RANK ("not on the list" or "#212 of 480"), TOP COMPARABLE PLAYING ("4.7K" or "52K"), ITS LIKES ("99%", "80%+ gets recommended"), UPVOTES PER DAY.
- A "$" earnings read ("Unknown. Not on top-earning ... It would earn from run speed, auto-...") and an evidence paragraph.
- Collapsible "The game" block as a two-column table: How it plays, First 60 seconds, Goal at 10-15 minutes, Minutes 10-20, How it makes money, The clip moment, Icon, Systems it uses (chips: Lucky rolls, Timed gifts, Daily reward, Playtime rewards). Then collapsed rows with count pills: Competition, Evidence, Building it, Risks.
- "The look - The game starts in this world, and every agent keeps to it." Three cards with screenshot, label and one-liner: Stud (classic studded blocks, bright colours), Stylized (smooth toy shapes, warm light), Realistic (real materials, terrain, atmosphere). One has a "Trending" tag; the selected one has a violet border and check.
- Actions: gradient "Approve" (check), outlined "Edit & approve" (pencil), amber outlined "Request changes" (speech bubble). Footer "Pitched 24h ago".

### 4.6 Review [review-1..5]
- Title block: tiny overline "All caught up", H1 "Review", sub text "Everything the agents made for you to look at. Approve it, ask for changes, or reject it; the agent picks up your verdict on its next pass."
- Two tabs: **Images & video** (active, pink-to-yellow underline) and **Stages & publish**.
- Filter pill group: "To review 0", "Changes asked 120", "Approved 435", "Rejected 22", "Everything 577" (the active pill has a violet fill). Counts differ between frames (136 / 624 / 30 later), so they are live.
- Body: groups by purpose ("Packaging · Anime Hero RNG") with a small coloured group icon; tiles of mixed size: trailer with a centred play button; icons and thumbnails; each tile has a green "Approved" chip top-left, a caption "Use this trailer on <game>'s ..." and a type chip ("Trailer · Anime Hero RNG", "Icon", "Thumbnail"). Empty state: "Nothing waiting. When an agent makes an image or screenshot for you ...".
- Viewer (lightbox, promo): left media with a counter "6 / 8", download, full-screen and close icons, prev and next arrows, native video controls (0:01 / 0:07). Right panel: avatar plus "Made by Frame" and meta line; question title ("Does Comet Sovereign feel as rare as it is?") with a grey sub line; labelled textarea "Note for Frame (needed to ask for changes)" with placeholder "What would make it right?"; a checked checkbox "Send my answer to Frame as a task when it has something to do"; explainer "Approve: Frame carries on with the next step it asked about (a task). Ask for changes sends it back to Frame with your note. Reject is just a no."; three stacked buttons with key hints: **Approve (A)**, green; **Ask for changes (C)**; **Reject (R)**, red icon.
- Stages & publish: not visible. Clues from text: games move through stages (words seen: "balanced", "thumbnailed", "Built", "Ready to publish", "Live"); the Producer reviews at a stage; a stuck game says "waiting on your decision (Review > Stages & publish)"; a `data/pipeline-log.json` file records stage decisions and publishing. The tab was clicked on camera in the TikTok at ~39 s but the pane never rendered in a usable frame (the footage cuts away).

### 4.7 Playbook (Obsidian vault, a separate app; shown in IG, TikTok, promo)
- File tree in vault "playbook": folders per reference game or topic (anime-mysterious, anime-zero, build-the-pyramid, dress-to-impress, murder-mystery-2, ps99, ride-a-pet, speed-keyboard-escape, steal-a-brainrot, steal-an-egg, stud-look, sword-rng-x, various-top-games, vfx-bar, vfx-bar-2, img, Inbox) holding JPG screenshots, plus numbered notes: 00 For Any AI, 00 Start Here, 01 The First Five Minutes, 02 The Core Loop, 03 Rarity and RNG, 04 Progression and Economy, 05 UI and HUD, 06 World and Look, 07 Characters, VFX and Assets, 08 Mobile, 09 Shops and Monetization, 10 Retention and Social, 11 Thumbnails, Icons and the Store Page, 12 Live Ops and Launch, 13 Building It Right, then Claude Design prompts, Credits, First Look Bar, Skills.
- Notes carry frontmatter listing which agents must read them (e.g. "for: frame, splash" and "also: builder, architect, merchant, playtest, kid-playtester"), and chapters share one shape ("Every chapter has the same shape", "Rules" sections). Text includes ASCII wireframes for a phone HUD (landscape 844x390 notched, 800x360 short) and rules such as "UI rows" and "Component recipes". Word-count captions: 154,082+ in one promo frame, later "200,000+"; narration says one page is about 30,000 words.

## 5. How the product works, according to these sources

Confidence: (S) said on screen or in narration, (V) visible in UI, (I) my inference.

- **What it is.** A Windows desktop app that runs on the same PC as Roblox Studio and drives a team of 15 named agents that pitch, design, build, test and package Roblox games; you approve or send back (S: promo "15 AI agents build your game", TikTok "team of over 15 agents"). Site says Windows 10 or 11, Mac waitlist.
- **Setup.** Not shown on screen in any clip. The promoter says he has been "helping people set this up" in his Discord and that "a few vouchers" exist (S, TikTok). The Discord screen at the end of the TikTok shows a members-only section (channel names like setup, guides, faq, member-general, vouches) (V). I did not join it. The `/link` page on the site hints at pairing but I did not follow it.
- **Agents run on your own Claude plan.** The pre-V2 sidebar footer shows "AGENTS RUN ON [Max] <account> ⇄ Switch" (V). Together with the "Plan usage 30%" meter in the V2 footer and a Lead header showing an approximate dollar figure "of plan use" (V), this strongly suggests the agents use the user's Claude subscription (a Max plan in the TikTok) and the app tracks how much of it is used (I). No narration says "bring your own Claude plan" outright. Needs a check on the pricing page.
- **How Studio connects.** Agents work "in your own Roblox Studio" (S: promo, site). The app tracks Studio **lanes**: "Studios for agents: Off / 1 / 2 / All" plus an owner "Main" lane, and shows which agent holds which Studio and for what project (V). Footer says "Playtest has Studio". So it can run several Studio windows at once, and an agent must hold a lane to use one (I). Agent steps show edits to `src/ServerScriptService/...luau` and `src/ReplicatedStorage/Shared/...luau` and "Ran the boss tests in Studio" (V), a Rojo-style source tree synced into Studio (I). A repair report mentions `python tools/pipeline.py validate` and `data/pipeline-log.json` (V), so each game's stages live in local files that the app validates. A small stamp like "build <hash> Lane 1 <date>" is overlaid on the running game window (V).
- **Phone access.** "Run it all from your phone" with a phone Home screen (S, V). Site: "Encrypted end to end" and "Run your whole studio from your phone, anywhere". The phone mirrors Home, Lead, Review, with tabs Home, Lead, Tasks, Review, More, and a "+ New task" button (V). How pairing works, and whether the PC must stay on, is not shown (unknown).
- **Playbook.** A 13-chapter Obsidian vault (200,000+ words) built "with a top developer" (claimed $6M revenue, 3.6B visits, 1.6B Robux). Agents read the notes tagged for them before each task, e.g. Frame reads the UI and HUD chapter first (S, TikTok). The vault is also shown as the thing that makes output "not slop". Numbers are marketing claims, unverified.
- **Pitches and trend data.** Pulse reads Roblox's public explore charts (source `apis.roblox.com/explore-api/v1`, six sorts, about 927 rows per snapshot) twice a day at 2:00 AM and 2:00 PM, but only while the app is open (S, V). It keeps a snapshot history (93 to 103 snapshots shown) and compares to the same time of day. A first scan pitches "First look" candidates; later scans with more history can mark "high potential", "early to the trend" or "others are on it". Each pitch cites like ratio, upvote velocity, top-earning rank and a comparable game's player count, adds a "how we're different" twist, a look choice (Stud, Stylized, Realistic), build risks, and can carry a kill rule ("Killed by: ... under 5000" players). Approving one pitch withdraws the others until game #1 is live. Market data panel shows freshness per feed: Market charts, Breakouts, Live numbers, Asset library.
- **Flow of a game.** You tell the Lead what to build (S). Lead hands work to Architect (design), Builder (code), Frame (UI), Scenic (world), Playtest and Kid Tester (play every build, phone too), Balance, Merchant (shop), Splash (icon, thumbnails, trailer), Reviewer (exploit checks), Producer (stage gates), Liveops, Librarian (assets). Stage strip of seven dots. Review has Images and video plus Stages and publish. "Play the newest build" button launches the latest saved build.
- **Update cadence.** TikTok (2026-10-22) shows the older "robdev control room" UI; the V2 launch promo is dated 2026-10-30 and the IG reel (~2026-10-31) shows V2. The site has a `/v1` page. So V1 to V2 took about a week or so in public. Release notes or a changelog cadence: not found.
- **Limits and complaints seen.** (1) Windows only (site). (2) Plan usage meter implies the Claude plan can run out. (3) Some things agents cannot test and are handed to the human as "TRY IT": a real server hop or teleport ("Studio cannot run a real teleport") and a party test that needs two real accounts. (4) "Later (13): not doable yet" shows a backlog the agents can't act on yet. (5) A stuck game: "The Producer sent it back twice and stopped. Decide yourself". (6) One Studio lane per agent, so parallel work is bounded by "Studios for agents" (1, 2, All). (7) Pitches only update while the app is open. (8) A "Pro" tier gates Market ("Studio Pro" chip) and other items. No user complaints found: TikTok and IG comment bodies could not be read without a login.

## 6. Unknowns

- The audio of the Instagram reel (no captions, no speech-to-text, nothing installed). It may explain setup, pricing or limits.
- The 368 TikTok and 34 Instagram comments (not retrievable without login). They are the likely place for complaints, bugs and pricing questions.
- The "Stages & publish" tab, Games page, Library, Pro page, Settings, Help, onboarding or first-run, command palette contents, "New task" form, phone Lead and Review screens in motion, any error or empty states beyond Review's empty line.
- Whether "Plan usage" is the Claude plan or an RoAutomation allowance. Whether Max is required.
- How phone pairing works and where data lives.
- Exact release cadence and V1 UI (`/v1` on the site may show it; site-scout).
- Whether the Facebook promo's "sample data" mode is a demo environment or a switch inside the product.
- The Facebook video's 5 comments and the Instagram profile's other posts were not read.
- Who "Nova Games" is on screen: not shown in any video. The IG caption's "#6 Roblox developer" and all revenue and visit numbers are the promoter's claims.

## 7. Injection check and privacy

- No page, caption, overlay or comment told me to run, install, download, send or open anything. One sales call-to-action in the TikTok narration ("I have a discord server in my bio... you can go join") is a promo line aimed at viewers; I did not act on it and did not visit Discord. The site's Discord invite link was not followed.
- The pre-V2 TikTok frames show part of an account email in the sidebar footer, and the Discord segment shows other people's usernames and messages. I did not transcribe the email, and I did not save any Discord frames to `screens/`. The saved TikTok frames (`team-4-full-roster-tiktok`, `review-4-images-video-tab-tiktok`, `market-5-table-tiktok`) do still contain that partial email as filmed; crop or avoid them in any published asset.
- Frames are screenshots of public videos for internal reference only; do not ship them in the product.
- Quotes used: none longer than a short label.

## 8. File map

- `media/MEDIA-SCOUT.md` this file
- `media/screens/*.png` 33 chosen frames (names in section 3)
- `media/yt-wSTrU8ZJxPk/`, `media/ig-DfK-y9pjChk/`, `media/tt-7699303095553035551/`, `media/fb-29509250805334011/` each holds the downloaded video, metadata, captions or transcript where they exist, 1 fps frames, contact sheets
- `media/web/roautomation-home.html` raw home page HTML
- `media/search/yt-search.txt` YouTube search results (all irrelevant)
- Helper script used for sharp-frame picking and labelled contact sheets: `C:/Users/aryam/AppData/Local/Temp/claude/C--Users-aryam-Downloads-Roblox-Project--claude-worktrees-agent-hq-ui-recreation-85c292/b6afeb2f-96d8-4bc5-95c0-24f2a4d8512d/scratchpad/tools/vidtool.py` (outside media on purpose)

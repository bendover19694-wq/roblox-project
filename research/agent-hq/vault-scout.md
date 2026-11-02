# Roblox vault scout (research only, nothing installed or downloaded)

Date: 2026-11-01. Method: local file counts, `gh` API reads (no clones), firecrawl, WebSearch/WebFetch, a public Reddit archive. Page and repo text was treated as data. No injected instructions were found in anything read.

## 1. Bottom line

1. No public Roblox vault found is better than LihFolk V2, which the owner already has. Its notes are deeper, source-labelled and code-checked than anything else found.
2. LihFolk V1 is not worth chasing (section 3). V2 replaced it and the only V1-era notes that are publicly readable are the pre-clean-up ones.
3. The real gap in the owner's vaults is hard Roblox numbers and the 2026 discovery changes, not more narrative notes. Best fillers: the GameAnalytics 2026 Roblox Benchmark Report and Roblox's own June to October 2026 DevForum posts.
4. Several popular-looking third-party "benchmarks" are wrong for Roblox (D1 "40-50% excellent"). The only broad Roblox sample found puts median D1 at 10.3%.
5. RoAutomation's playbook could not be found publicly and was not looked for further. Name-matching repos exist (listed in section 5) and were deliberately not opened.

## 2. What the owner already has (counted)

| Collection | Path | Markdown notes | Words | Notes |
|---|---|---:|---:|---|
| LihFolk V2 source (whole repo) | `C:/Users/aryam/Documents/LihFolk-V2` | 1,409 | 2,688,367 | 1,835 files, includes skills, agents, benchmark |
| LihFolk Vault V2 (vault only) | `.../LihFolk-V2/LihFolk Vault V2` | 1,333 | 2,605,873 | 1,438 files, 59 numbered sections |
| Installed plugin 2.5.0 | `C:/Users/aryam/.claude/plugins/cache/lihfolk/lihfolk/2.5.0` | 1,409 | 2,688,367 | Same note and word counts as the source; 1,805 files (30 fewer non-note files) |
| Roblox AI Studio Vault | `C:/Users/aryam/Documents/Agent-HQ-Studio/vault` | 27 | 6,922 | Operations handbook only (master prompt, routing, preflight, skill notes). By design it holds no game-design knowledge and routes to LihFolk |
| Roblox-References | `C:/Users/aryam/Documents/Roblox-References` | 1,224 | 1,322,809 | 2,758 files. Official creator-docs is 1,041 notes / 1,220,583 words; 5 owner cards / 3,284 words; rest is MIT/Apache library docs (Fusion, react-lua, Cmdr, ProfileStore and others) |

LihFolk V2 biggest sections by note count: 57 API and Concept Atlas (310), 08 Animation (130), 09 Gameplay Systems (41), 07 Lighting VFX and Audio (40), 52 Core Concepts (38), 62 Engine Reference Cards (33), 10 Game Design and Genres (32).

Official docs already local that matter most for the business chapters (Roblox-References/repos/creator-docs/content/en-us/production): `game-design` 17 pages / 23.9k words (onboarding, onboarding-techniques, core-loops, liveops-essentials, liveops-planning, season-pass-design, balance-virtual-economies, monetization-foundations), `analytics` 20 pages / 23.5k words, `monetization` 23 pages / 34.8k words, `promotion` 27 pages / 47.8k words.

Gap check: LihFolk V2 `Discovery and the Algorithm` ("as of October 2026") covers the Creator Hub Discovery-page signals (play-through rate, first-play bounce, play days, co-play days, and names retention and monetization as retrieval signals). It does not carry the specifics of Roblox's June 15, August 20 and October 12, 2026 DevForum posts (the retention-weighted Recommended For You change, the "strong in both retention and monetization" guidance, the new Creator Analytics views). No LihFolk note mentions GameAnalytics or any Roblox-wide D1/D7/D30 distribution (grep for "GameAnalytics", "median D1", "10.3%" found nothing).

## 3. LihFolk: V1 answer

**What it was.** An Obsidian vault of Roblox notes by the TikTok creator @lihfolk, pitched as "a 40GB+ Obsidian Vault for Roblox developers" built to help AI tools such as Claude. The size came from bundled assets (HDRIs, textures, 3D models per the owner's decision D-038), not notes. A third-party PR describes it as "about 850 Markdown notes", CC BY 4.0, with a `VAULT_INDEX.md`, a folder "31 AI Skills for Roblox" and `install-ai.ps1/.sh` scripts.

**Where it came from and where it was distributed.** TikTok posts say the full vault is "in my Discord (link in bio)". The owner's D-038 says it was a torrent; I could not confirm that. Size is quoted three ways: 40GB+ (TikTok), 39 GB (V2 README), 46 GB (D-038, probably on-disk). Timeline is very short: the GitHub account `lihfolk-cy` was created 2026-10-27, the first public commit (`LihFolk 0.1.0`) is 2026-10-28 21:05, V2 2.0.0 landed 55 minutes later, 2.5.0 on 2026-10-29. So V1 is days old, not a mature lineage.

**Is it still available.** Not on GitHub as a V1 release. Only `lihfolk-cy/v2-vault` exists (one repo, 37 stars, release v2.5.0 FULL zip 1.4 GB). The V2 README tells users to remove V1. Distribution of V1 is off-GitHub (Discord/torrent). `cutestcutie/Lihfolk-vault` is an empty repo; `ATREonYT/ROBLOX` bundles a copy of the LihFolk plugin inside a 1.2 GB unlicensed repo. Neither is a legitimate source.

**V1 text is visible without the 39 GB download.** The first commit of v2-vault has 919 files / 847 notes with a `knowledge/` folder and a 122-note `46 Resource Library` (mostly third-party link lists) plus two "Third-Party Skill" notes. 2.0.0 is titled "copyright clean-up" and 2.5.0 removed "third-party credits and study notes" and cut the link library to official docs only (now 18 notes). So that snapshot is the pre-clean-up state. Do not mine it.
- Commit tree: https://github.com/lihfolk-cy/v2-vault/tree/ccc7c3a86059d36c00dc76eee111c1d75b2c7654
- Evidence PR: https://github.com/8yfy/kick-an-egg/pull/58

**How V2 differs.** 1,333 vault notes vs about 850; 22 skills in a proper plugin with a hook, lookup agent and benchmark; Celestial theme; original asset pack (1.3 GB total) replacing bundled third-party assets; V1 install scripts (which overwrote `~/.claude/skills` and could append to global CLAUDE.md, per the PR author) are gone.

**Does V1 offer anything V2 lacks?** Only two things: (a) the bundled HDRIs/textures/models, which are third-party CC0 packs you can get from their sources (Kenney and Poly Haven) if a game ever needs them, and which the owner's screen-based Space Agency does not; (b) the larger third-party link library, now cut for copyright reasons. Nothing of design value. Verdict: skip.

**Licence of V2** (`LICENSE.md`): notes, scripts and plugin are CC BY 4.0, credit "LihFolk Vault V2". The asset pack is free to use in your own games, no redistribution. The README adds a request not to re-upload or repackage the notes, which does not match the CC BY 4.0 grant in LICENSE.md. Treat LICENSE.md as the terms and the README as a courtesy request; either way, Agent-HQ-Studio already does the safe thing by routing to an installed copy rather than bundling it. Quality numbers (91-94% on held-out sets) are self-reported; I did not re-run them.
- Repo: https://github.com/lihfolk-cy/v2-vault  Releases: https://github.com/lihfolk-cy/v2-vault/releases  TikTok: https://www.tiktok.com/@lihfolk

## 4. The owner's Reddit link

https://www.reddit.com/r/ObsidianMD/comments/1p5io6h/my_obsidian_vault_for_game_development_and/

Reddit blocked firecrawl ("site not supported"), old.reddit.com (login wall), r.jina.ai (403), and a Redlib mirror (bot challenge). I did not try to defeat the bot protection. Content was read from the public Arctic Shift archive: https://arctic-shift.photon-reddit.com/api/posts/ids?ids=t3_1p5io6h

- Title: "My Obsidian Vault for Game Development (and looking for ideas!)". Author u/SharkBlaj, 2025-11-24, flair "showcase", score 74, 13 comments at archive time. Four screenshots, no text body beyond a plea for ideas, no repo link.
- It is a personal planning vault, not Roblox and not a knowledge base. The screenshots (not viewed, would need image downloads) show a "template for planned logic, variables, switches" (RPG-Maker vocabulary) using Dataview for inbound/outbound links and matching tags, and a graph of a modest size.
- Plugins the author listed: Callout Manager, Columns, Dataview, Editing Toolbar, Iconize, Local Backup, Omnisearch, Style Settings.
- Comments: hide folder names and show only icons for a cleaner list; one asked why inbound/outbound sections; one asked the theme.
- Worth copying: one idea only, a small Dataview "inbound / outbound links + shared tags" block in the system-note template. LihFolk already generates "Connected notes" blocks, so the gain is small.
- Verdict: skip (borrow one idea). Trust: low for the Roblox purpose.

## 5. Candidates

Verdicts: adopt, borrow structure, reference only, skip. "Last update" is the GitHub pushed date unless stated. Star counts and dates from the GitHub API on 2026-11-01.

### 5a. Strong or useful

| Name | URL | Covers | Size | Last update | Licence | Trust | Verdict |
|---|---|---|---|---|---|---|---|
| LihFolk Vault V2 + plugin | https://github.com/lihfolk-cy/v2-vault | Whole Roblox dev lifecycle, 22 skills, search tool, API checker, self-reported 91-94% benchmark | 1,333 vault notes / 2.6M words (owner has it) | 2026-10-29 (v2.5.0) | CC BY 4.0 notes and code; asset pack own-use only | Medium-high: labelled sources, compiled code, self-reported benchmarks, 1-week-old project | adopt (already owned); update with `/plugin marketplace update lihfolk` |
| Roblox Creator Hub docs | https://github.com/Roblox/creator-docs (site https://create.roblox.com/docs, agent index https://create.roblox.com/docs/llms.txt) | Official game-design "Level Up" pages, analytics, monetization, live ops | 1,041 notes locally | repo pushed 2026-10-29 | CC BY 4.0 (code samples separate) | Highest | adopt (already local); refresh the snapshot periodically |
| GameAnalytics 2026 Roblox Benchmark Report | https://www.gameanalytics.com/reports/2026-roblox-report | Roblox-wide D1/D7/D30, session length and count, ARPPU, devices. 500+ titles with 1M+ MAU, Aug 2025 to Jul 2026 | one long web page; PDF needs a signup | updated 2026-09-01 | Copyright GameAnalytics, no open licence | High for method (clear scope, notes disagreements with other charts); vendor and large-games sample caveat | reference only: write an owner-authored digest note with attribution |
| Roblox DevForum discovery posts, 2026 | RFY change https://devforum.roblox.com/t/recommended-for-you-algorithm-improvements-that-better-value-long-term-retention/4684575 ; guidance https://devforum.roblox.com/t/boost-your-discovery-by-building-games-people-want-to-play/4779042 ; analytics change https://devforum.roblox.com/t/improved-discovery-measurement-in-creator-analytics/4930122 | How the algorithm now weighs long-term retention and monetization; what changed in Creator Analytics on 2026-10-12 | 3 posts + staff replies | 2026-06-15, 2026-08-20, 2026-10 | Forum content, no open licence | High (Roblox staff) | reference only |
| Roblox Q3 2026 shareholder letter | https://s27.q4cdn.com/984876518/files/content_files/Q3-2026-Earnings-Shareholder-Letter.pdf (index https://ir.roblox.com/financials/quarterly-results/default.aspx ; summary https://www.gamesindustry.biz/roblox-q3-results-beat-expectations-despite-bookings-falling-12-to-17bn) | Platform scale and trends: 138M DAU, about 34B hours, about 40% of weekly top-100 recommended games under 3 months old, over-18 monetizes 50%+ better | short PDF | 2026-10-29 | Public filing | Highest for platform facts | reference only |
| Level Up workshops (Roblox staff) | content cadence https://devforum.roblox.com/t/level-up-workshop-content-cadence/1451388 ; quests/dailies https://devforum.roblox.com/t/level-up-workshop-quests-achievements-dailies/1519113 ; live ops roundtable https://devforum.roblox.com/t/level-up-liveops-roundtable-ft-ruddev-media/1626392 ; onboarding funnels https://devforum.roblox.com/t/improving-onboarding-through-funnel-events/3064458 | Live ops cadence, quest and daily design, onboarding funnel events | videos plus posts | 2021 to 2024 | Forum content | High but older; the official doc pages already local summarise the key points | reference only |
| Naavik "State of UGC Games 2026" | https://naavik.co/deep-dives/the-state-of-ugc-games-2026/ and https://naavik.co/digest/robloxs-expensive-year-of-good-intentions/ | Platform records (47.4M peak CCU), live-ops styles ("admin abuse" events), cost per play about $0.007 to $0.011, retention-led discovery | long report, free to read | 2026-07 / 2026-08 | Copyright Naavik | Medium-high (analyst firm, commercial) | reference only |
| TabooHarmony/roblox-brain | https://github.com/TabooHarmony/roblox-brain | 29 skills; design set has growth-design (14,959 words), game-design (6,675), analytics (3,247), player-psychology (2,782), monetization (2,730). CI scripts check API drift, source URLs and version pins; `<!-- temporal: 2026-08 -->` markers on dated facts | 61 md | 2026-10-15 (v2.3.1) | MIT | Medium: 151 stars, 5 months old; one claim ("50% of new players never return for a second day") conflicts with GameAnalytics (median D1 10.3%, so about 90% do not) | borrow structure: temporal markers plus source/drift verification scripts; do not import its numbers unchecked |
| GameAnalytics 2026 Mobile and PC Benchmarks | https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks | Mobile D1 P75 just above 30%, D7 median under 4%, D30 median about 0.7% | web page | 2026 | Copyright GameAnalytics | Medium: mobile, wrong platform for Roblox numbers | reference only, label as mobile |

### 5b. Borrow structure only

| Name | URL | Covers | Size | Last update | Licence | Trust | Verdict |
|---|---|---|---|---|---|---|---|
| masonman3175-crypto/roblox-obsidian-vault | https://github.com/masonman3175-crypto/roblox-obsidian-vault | A personal game vault merged with a 1,699-file Roblox reference mirror and project snapshots. Its `10 Knowledge` folder has about 70 atomic principle notes in Core Design, Economy, Growth and Analytics, LiveOps and Monetization, e.g. "A ten-second hook", "Cohort retention not a magic benchmark", "Server time for real deadlines", "Odds table as one source of truth" | 1,168 md / 614 lua / 276 MB | 2026-10-25 | none (all rights reserved by default) | Low-medium: 2-repo account created 2026-06-19, unlicensed, includes imported third-party material of unknown provenance, ships `ROLLBACK.sh` and `sync-vault.ps1` (do not run) | borrow structure: read the note titles for the atomic "one principle per note" format; do not copy text |
| AshExplained/roblox-skills | https://github.com/AshExplained/roblox-skills | 40 skills incl. retention-monetization, liveops-roadmap, analytics-instrumentation, growth-marketing, economy-balancing, mobile-playtest; plus a vertical-slice PRD to issues to triage workflow | 48 md, skills about 250-500 words each | 2026-10-31 | MIT | Medium: 44 stars, thin and generic content | borrow structure: the Day 1 / 2 / 3 / 7 hook ladder and the vertical-slice workflow |
| myflxr/game-dev-vault | https://github.com/myflxr/game-dev-vault | Free Obsidian template giving an AI project memory: How you think, Working rules, Game overview, Timeline, Open questions, Specs, Features, AI prompts | 20 md | 2026-10-22 | MIT | Medium-low (1 star), concept sound | borrow structure: overlaps what Agent HQ's own vault and project memory already do |
| 0CE4NS/claude-roblox-gamedev-kit | https://github.com/0CE4NS/claude-roblox-gamedev-kit | Vault templates incl. Lessons Learned (about 90 rules from mistakes), Decisions log, Style bible, research page template | 38 md | 2026-10-26 | MIT | Low-medium (1 star) | borrow structure: a Lessons Learned log note |
| shawngraham/obsidian-game-design-vault | https://github.com/shawngraham/obsidian-game-design-vault | A GDD template vault for history games (pillars, features, content, narrative, levels) | 34 md | 2022-07-13 | none | Low for Roblox | skip |

### 5c. Reference only or skip

| Name | URL | Why | Verdict |
|---|---|---|---|
| brockmartin/roblox-game-skill | https://github.com/brockmartin/roblox-game-skill | 329 stars, 66 md, about 30k lines, 16 reference files plus 6 genre templates and 7 workflows. No licence, one-day repo | reference only (cannot copy); nothing LihFolk lacks |
| HermeticOrmus/claude-code-game-development | https://github.com/HermeticOrmus/claude-code-game-development | 77 stars, MIT, 686 md; 87 plugins and an "80-chapter game dev manual". Generic game dev, not Roblox. Not read in depth | reference only |
| AkitoDevs/roblox-brain | https://github.com/AkitoDevs/roblox-brain | 5 stars, MIT, 147 md, about 100 knowledge entries; mostly UI/VFX/scripting, only 2 monetization and 11 design entries; has a worker/triage server component (do not run) | skip |
| EL4CTEO/roblox-skills, MSayib/roblox-dev-skill, afrxo/roblox-agent-skills, reliasdomi/roblox-agent-skills, mvvthw/roblox-claude-skills, benhelland/roblox-claude-skills | https://github.com/EL4CTEO/roblox-skills , https://github.com/MSayib/roblox-dev-skill , https://github.com/afrxo/roblox-agent-skills | Code and tooling skills (Luau, Rojo, UI). Little on retention or live ops | skip |
| github774/roblox-claude-skills | https://github.com/github774/roblox-claude-skills | 115 md plus vault starter and `install.sh` that edits global CLAUDE.md; no licence, 0 stars | skip |
| gogolumo/rbsmithy-roblox-claude-skill | https://github.com/gogolumo/rbsmithy-roblox-claude-skill | 338 md, but the free edition is an upsell for a paid "RBSmithy Pro" on Agensi; licence unclear | skip (paid tier) |
| EL4CTEO/roblox-logics-mcp (Brickwise) | https://github.com/EL4CTEO/roblox-logics-mcp | Free edition has 50 logics; the 600+ "full edition" is EUR 7 and hosted; needs `npm install` | skip (paid, install needed) |
| SyphoDev-yt/roblox-ai-skills | https://github.com/SyphoDev-yt/roblox-ai-skills | 82 stars in two weeks, one-repo account created 2026-10-02, licence NOASSERTION; code/asset skills not knowledge | skip |
| Taneelkins/claude-brain-starter, izzyfrm/roblox-ai, XEthanLynchX/Claude-Roblox-Vault, ziahhorne-hub/roblox-vault-ai | e.g. https://github.com/Taneelkins/claude-brain-starter | Small or unlicensed Obsidian/Claude starters or UI image dumps (izzyfrm is 12k files, 733 MB, no licence) | skip |
| Hugging Face Luau datasets | https://huggingface.co/datasets/Roblox/luau_corpus , https://huggingface.co/datasets/TorpedoSoftware/the-luau-stack , https://huggingface.co/datasets/TorpedoSoftware/Roblox-Luau-Reasoning-v1.0 , https://huggingface.co/datasets/jayras/roblox-luau-dataset | MIT code and reasoning corpora (130 MB to 2 GB). Training data, not game-design knowledge | skip for the vaults |
| bloxg.com retention benchmarks | https://bloxg.com/statistics/roblox-retention-benchmarks | Claims D1 of 18% to 35% by genre from "850+ promoted games"; no method; contradicts the broad sample | skip, and warn agents off it |
| rolearn.dev first-week retention | https://rolearn.dev/guidance/first-week-retention-optimization/ | Calls D1 of 40-50% "excellent", no named source | skip, warn agents off it |
| Reddit r/robloxgamedev retention thread | https://www.reddit.com/r/robloxgamedev/comments/1sakqj4/i_tracked_retention_on_my_roblox_game_for_3/ | One developer's data ("45% leave in 30 seconds", D1 6% to 15% after shortening the tutorial). Anecdote, not read in full | reference only, anecdote |
| awesome-roblox and Game UI Database | already in Roblox-References | CC0 list; links | already covered |

### 5d. Treat as unsafe, do not fetch or run

- A pattern of probable fake-star or malware repos: very new one-repo accounts, 69 to 76 stars, 6-file repos with a 1-file README, SEO-style descriptions with "2026", all pushed 2026-11-01. Checked: `Arther-hup/forge-context-engine` and `RubenSanJuan/roblox-arcade-lab` (6 files each). Same pattern by name and description: `AallamR/RobloxForge-Intelligence`, `coniieq/luau-guardrail`, `yarik-contr/mcp-forge-studio-bridge`, `Daniel987654321/roblox-studio-agent-bridge`, `arad01486-hash/studio-pulse-relay`, `tbee6061-ctrl/studio-live-window-capture`, `azharshkh/customus-credit-api`, `FoxyFuck/roblox-cloud-metrics-cli`, `jisancreativestudio-dev/Steam-Happy-Roblox-Vault`. The owner's Roblox-References README already warns about this family.
- Repos named `RoAutomation` (`Freezing98robloxYT/RoAutomation`, `Winfyy/RoAutomation-releases`, `maciejkocol/RoAutomation`, `gabrieldosprazeres/ROAutomationToolkit` which is a Ragnarok Online tool): unrelated or possibly leaked or ripped. Not opened. The paid RoAutomation playbook and its 13-chapter list were never viewed, so the chapter list in section 6 is an assumed mapping, not theirs.
- LihFolk V1 torrent/Discord download, `ATREonYT/ROBLOX`, `cutestcutie/Lihfolk-vault`: redistribution or unverifiable provenance.

## 6. Gap analysis

Chapter list below is assumed (first five minutes through live ops), since the RoAutomation table of contents was not available. "Strong" means 3+ dedicated notes of about 2,000 or more words in LihFolk V2 plus official docs locally.

| # | Topic | Owner coverage today | Verdict | What fills the gap |
|---|---|---|---|---|
| 1 | First five minutes / FTUE | LihFolk: `First-Time User Experience and Onboarding` (3,953 words), `Onboarding by Genre - The First Five Minutes` (1,636), `Measuring Onboarding`, onboarding accessibility, `lihfolk-tutorial` skill with Luau step module. Official `onboarding.md` and `onboarding-techniques.md` local. Space Agency applied it in D-038 | Strong on method, thin on numbers | GameAnalytics Roblox report (median D1 10.3%, "won in the first two minutes"); Level Up funnel-events post |
| 2 | Core loop | `Core Loops and Session Design` (3,778 words), 19 genre playbooks, official `core-loops.md` | Strong | None needed |
| 3 | Progression and pacing | `Progression and Pacing Design` (3,763), rarity ladders, quest design doc | Strong | None needed |
| 4 | Economy | Section 48 (7 notes: currency architecture, sinks/faucets, simulation, telemetry), `Unit Economics`, official `balance-virtual-economies.md`, Machinations link | Strong on design, thin on real payer numbers | GameAnalytics (median ARPPU $0.70, p90 $2.33, 3.8% of tracked players paid), masonman titles for atomic-note ideas |
| 5 | Retention and return hooks | `Retention and Return Hooks` (3,695), streak and daily code, `Discovery and the Algorithm` (Oct 2026) | Strong mechanics and Discovery-page signals; no Roblox-wide benchmarks; the June to October 2026 DevForum shift is not detailed | GameAnalytics (D1 10.3 / D7 1.6 / D30 0.5% medians; p99 22.2 / 9.1 / 4.7%); DevForum June 15 and Aug 20 posts; official `analytics/retention.md` (local) |
| 6 | Monetization (passes, products, subscriptions, ethics) | About 59 note titles touch it; `Paid Random Items and Odds Disclosure`, `Developer Products and ProcessReceipt`, compliance skill; official 23 pages local | Strong | Aug 20 DevForum guidance (retention then monetization drives reach); Q3 letter |
| 7 | Offers, pricing, store design | `Robux Price Points and Offer Design` (3,281), `Pricing and Store Design`, official `price-optimization.md`, `shop.md` | Good | GameAnalytics ARPPU bands to sanity-check price ladders |
| 8 | Social and co-op | `Social Design and Multiplayer Play` (2,908), 7 community notes | Medium, thinnest of the design chapters | Naavik 2026 (co-op and "friendslop" live ops), masonman "Social play that creates stories" title as a prompt to write an owner note; Level Up quests post |
| 9 | Discovery, thumbnails, store page | Section 61 (8 notes), 17 note titles on thumbnails/discovery, marketing section (13) | Strong; missing the Aug and Oct 2026 DevForum updates | DevForum Oct 12 Creator Analytics measurement post; Naavik cost-per-play table |
| 10 | Analytics, funnels, experiments | `Analytics and Funnels` (2,323), `A-B Testing and Experiments`, official analytics docs (20 pages incl. custom events, funnel events) | Good | GameAnalytics benchmarks as thresholds; masonman "Minimal event taxonomy" title; AshExplained event list as a checklist |
| 11 | UI, UX and mobile | Section 05 (31 notes), LihFolk UI system, accessibility section (8), Roblox-References cards, Space Agency uiaudit probe | Strong | GameAnalytics device mix (44% mobile+PC, 40.8% PC only, 11.6% mobile only) to settle phone vs desktop priority |
| 12 | Polish and game feel | Section 47 (7), section 58 (29 QoL notes) | Good | None needed |
| 13 | Live ops (events, seasons, calendars, patch comms) | Section 38 (7 notes: `Battle Pass and Season Design` 4,093 words, `Event Calendars` 3,271, patch notes, flags), `Live Ops Events and Updates`; official `liveops-essentials`, `liveops-planning`, `season-pass-design`, `content-updates` | Strong on design, thin on current-market evidence and cadence data | Level Up cadence and roundtable threads; Naavik 2026; Q3 letter (about 40% of weekly top-100 games are under 3 months old); official retention doc (small updates every 2-4 weeks, big every 2-3 months) |

Cross-cutting gaps:
- **No hard benchmarks anywhere in the three vaults.** Add one owner-written note, "Roblox 2026 benchmarks", citing GameAnalytics with its sample caveat (large games only: median D1 10.3% is for 1M+ MAU titles; a small game beating it is a strong signal). Include the numbers: D1 p25/p50/p75/p90/p99 = 8.4 / 10.3 / 12.9 / 15.9 / 22.2%; D7 p25/p50/p99 = 1.0 / 1.6 / 9.1%; D30 p25/p50/p99 = 0.3 / 0.5 / 4.7%; game session length p50 9.8 min; sessions per player per day p50 1.56; ARPPU p50 $0.70. Flag bloxg and rolearn numbers as wrong.
- **2026 discovery updates.** One short owner note adding to LihFolk's Discovery note: the June 15 RFY change (long-term retention signals, now shown in Creator Analytics under Acquisition, Home recommendations), the Aug 20 guidance (strong in both retention and monetization may get broader distribution; strong in only one still gets Home impressions) and the Oct 12 measurement change.
- **Provenance habit worth copying from roblox-brain:** `temporal:` date markers on facts that expire, plus a script that checks source URLs. LihFolk already has "as of" wording and `consistency.py`; the markers make the owner's own notes expire visibly.

## 7. Recommended actions (all cheap, none done)

1. Keep LihFolk V2 as the one vault. Update the plugin when new releases ship; do not install V1 or any listed alternative.
2. Write the two notes in section 6 into the Agent-HQ-Studio vault (or a project docs folder) in the owner's own words, with links, not copied text.
3. Add a one-line warning to the vault gate that third-party Roblox retention numbers must be checked against the GameAnalytics report or the game's own Creator Analytics.
4. Refresh `Roblox-References/repos/creator-docs` after Roblox pushes docs changes (last upstream push 2026-10-29).
5. If the owner wants the Reddit post's structure, approve downloading its four screenshots from `preview.redd.it`; I did not download anything.

## 8. Limits of this scout

- Reddit thread body is only a plea for ideas; the vault structure lives in four unseen screenshots.
- RoAutomation content was not viewed, by design.
- Star counts and "last update" dates are from 2026-11-01; many Roblox AI repos are a week to five months old and churn fast.
- GameAnalytics figures are for large games on their SDK; they are a floor for "healthy", not a target for a new release.
- I did not verify LihFolk's self-reported benchmark results or V1's torrent history.

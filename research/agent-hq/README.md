# Agent HQ parity research

Research for making Agent HQ match RoAutomation, gathered 2026-11-01 from public sources only: no logins, no purchases, no installers. Reference images and video frames were kept out of the repo on purpose, and must never ship in the product.

| File | What it holds |
|---|---|
| [site-scout.md](site-scout.md) | REA pass over roautomation.dev: stack, routes, every screen in the screenshots, agent roster, product model, REA Evidence IDs |
| [media-scout.md](media-scout.md) | Every video and post found, per-screen notes, how the product works, unknowns |
| [vault-scout.md](vault-scout.md) | About 45 Roblox vaults and sources rated, LihFolk V1 answer, 13-topic gap analysis |
| [tokens.css](tokens.css), [tokens.json](tokens.json) | Design tokens. Section A is exact, section B is measured from lossy screenshots |

Paths inside the scout reports point at a scratch folder that no longer exists after the session.

## What we learned

- **Target:** RoAutomation V2 (roautomation.dev), a Windows control room that drives 15 agents through the owner's own Claude Code account, on the same PC as Roblox Studio. Sold by Holliday Labs LLC. Studio $29/month, Studio Pro $69/month, Mentorship $499/month.
- **Agent HQ already has the same skeleton:** Home, Lead, Team, Tasks, Review, Games, Pitches, Market, Library. The gap was mostly look, density, Market depth and the Pro page.
- **Your YouTube link is not about RoAutomation.** It is TwinPlayz on Obsidian with Claude. The Instagram reel is real app footage.
- **Evidence limits:** the site shows the app only as 5 desktop and 3 phone screenshots. Footage covers Team, Market, chat and the Review viewer. Nothing public shows the Games page, Library, Settings, Help, onboarding, command palette, task form, or Stages & publish. A true 1:1 of those is not possible without the real app.
- **The app font is unknown.** The marketing site uses Geist, but the screenshots are too lossy to confirm the app does.
- **Vaults:** nothing public beats LihFolk V2, which you already have (1,333 notes, 2.6M words). LihFolk V1 is not worth installing: V2 replaced it and it adds only third-party assets you can get from their sources.
- **Real data gap:** hard Roblox numbers. GameAnalytics 2026 gives median D1 10.3%, D7 1.6%, D30 0.5% for 1M+ MAU games. Agents should distrust sites claiming a D1 of 40 to 50% is excellent.
- **Do not fetch:** repos named `RoAutomation`, leaked playbooks, LihFolk V1 torrents, and the fake-star repos listed in vault-scout.md section 5d.

## Links

**Target**
- Site: https://roautomation.dev/ , plans: https://roautomation.dev/plans , terms: https://roautomation.dev/terms , privacy: https://roautomation.dev/privacy
- V1 move-over page: https://roautomation.dev/v1 (disallowed in robots.txt; fetched once)

**Videos**
- Instagram reel, real app footage: https://www.instagram.com/p/DfK-y9pjChk/
- V2 launch promo, sharpest footage: https://www.facebook.com/61592838064026/videos/the-future-of-roblox-game-development-is-here-roblox-agent-robloxgames-robloxdev/29509250805334011/
- TikTok, older UI: https://www.tiktok.com/@trevsagents/video/7699303095553035551
- Obsidian with Claude, not RoAutomation: https://www.youtube.com/shorts/wSTrU8ZJxPk

**Vaults you own or should use**
- LihFolk V2: https://github.com/lihfolk-cy/v2-vault
- Roblox Creator Hub docs: https://github.com/Roblox/creator-docs and https://create.roblox.com/docs/llms.txt
- Your Reddit link, a personal non-Roblox vault, skip: https://www.reddit.com/r/ObsidianMD/comments/1p5io6h/my_obsidian_vault_for_game_development_and/

**Better data**
- GameAnalytics 2026 Roblox report: https://www.gameanalytics.com/reports/2026-roblox-report
- GameAnalytics 2026 Mobile and PC benchmarks: https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks
- Recommended For You change: https://devforum.roblox.com/t/recommended-for-you-algorithm-improvements-that-better-value-long-term-retention/4684575
- Roblox Q3 2026 shareholder letter: https://s27.q4cdn.com/984876518/files/content_files/Q3-2026-Earnings-Shareholder-Letter.pdf
- Naavik, State of UGC Games 2026: https://naavik.co/deep-dives/the-state-of-ugc-games-2026/
- Level Up workshop, content cadence: https://devforum.roblox.com/t/level-up-workshop-content-cadence/1451388

**Structure worth borrowing**
- https://github.com/TabooHarmony/roblox-brain (dated fact markers, source checks; check its numbers first)
- https://github.com/AshExplained/roblox-skills
- https://github.com/myflxr/game-dev-vault
- https://github.com/0CE4NS/claude-roblox-gamedev-kit

The full rated list, with licences, is in [vault-scout.md](vault-scout.md) section 5.

## The prompt

Paste this into a new session to run the parity work again, for example after RoAutomation ships new screens.

```text
Make Agent HQ (tools/agent-hq) match RoAutomation's app as closely as public evidence allows, in UI, function and data. Work in a fresh worktree. Never touch the running HQ on port 4317.

Sources: https://roautomation.dev/ , https://www.instagram.com/p/DfK-y9pjChk/ , the Facebook promo and TikTok listed in research/agent-hq/README.md. Start from research/agent-hq/ and re-scout only what changed. Public pages only: no login, no checkout, no installer, no Discord.

Use REA for the site. Use multiple agents: one for the site, one for video footage, one for Roblox knowledge sources. Then plan with Haiku brief, Opus plan, Sonnet executors.

Match geometry, tokens, type, colour, states, flows and data fields. Keep the Agent HQ name, logo, role ids and role labels. Do not copy RoAutomation's name, logo, images, testimonials, marketing copy, Playbook or paywall. Use only real data, and label sample data as sample.

Verify by rendering HQ at 1280x800 at 1.5x and 390x763 at 3x next to the reference screenshots, run npm test, and get an independent review. Report what is still different and which screens have no public evidence.
```

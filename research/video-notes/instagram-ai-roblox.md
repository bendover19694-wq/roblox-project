# Three Instagram reels on building Roblox games with AI

- Watched 2026-10-22 with the `/watch` skill (local Whisper transcript, keyframes). All figures are the creators' claims and **Unverified**.
- Each reel became a project skill in `.claude/skills/`. The skills restate ideas in our own words; nothing paid was bought or copied.

## 1. "Here's how to achieve stats like these": Adam (@adamdoesrobloxx)
- URL: https://www.instagram.com/p/Der60vszMwK/ (1:14)
- Links: none on screen. Bio link `beacons.ai/adamdoesroblox` leads only to a Discord invite (`discord.gg/fJkyYmqqX`, "free guides"). Not joined.
- Claim: over 1M Robux from a first game.
- Five tips, paraphrased:
  1. The thumbnail and icon decide whether anyone plays. Roblox pushes high click-through games. Make several and test them before adding features.
  2. Build one core loop (play, earn, upgrade), not ten features. Extra systems don't save a weak loop.
  3. Ads buy data, not success. A small spend shows whether Home recommendations pick the game up and whether it retains. If not, change the game, not the budget.
  4. AI lets one person ship like a team.
  5. Set up funnels before launch with AnalyticsService. Log every onboarding step plus purchases, joins and key interactions, then read the Funnels tab in Creator Hub to find drop-off.
- Overlap: tips 1, 2, 3 and 5 match `takeaways.md` rows 3, 7, 12 and 10. We already log an onboarding funnel (`Telemetry.luau`).
- Skill: `roblox-launch-tips`.

## 2. "ChatGPT for the design + Claude Opus 5.5 for code": AixDevz (@aixdevz)
- URL: https://www.instagram.com/p/DetzClfMqsw/ (0:12, music only)
- Links: none. Bio links to the creator's TikTok only.
- What is shown: a ChatGPT window generating a glossy UI concept, Claude writing the code, then the in-game result: a slot-machine style "Mutationen" station, a green summon VFX and a cartoon pet shop with tabs and item cards.
- Takeaway: generate the look as an image first, then have Claude rebuild it as real Roblox UI.
- Conflict with our rules: icons are drawn in code and there are no paid random items. The concept image is a reference only; it is never shipped as an asset or as a gacha mechanic.
- Skill: `roblox-concept-art-ui`.

## 3. "A team of over 15 agents": trev (@trevsagents)
- URL: https://www.instagram.com/p/Dex4FgPlcyB/ (2:09)
- Links: bio `linktr.ee/trevsagents`, which goes to
  - https://roautomation.dev: "RoAutomation", a paid Claude Code agent studio for Roblox ($199 studio, $125 knowledge vault alone, mentorship tiers). Windows, Roblox Studio and your own Claude Code required.
  - https://trevsagents.com: a general AI-agent course ($49/month) and a free Discord.
  - Not purchased or joined.
- What is shown: a "control room" web app with a Home inbox ("Needs you": approve, reply, try-it tasks), a Team list of agents with live status, a Review tab for thumbnails and trailers, game pitches from a market-watch agent, and an Obsidian vault of Roblox know-how that agents read before each task. The UI agent ("Frame") reads its UI/HUD chapter first.
- Public facts from the site: 15 roles (Lead, Pulse, Architect, Builder, Frame, Librarian, Balance, Kid Tester, Splash, Reviewer, Scenic, Playtest, Producer, Liveops, Merchant) and 13 vault chapters (first five minutes, core loop, rarity and RNG, progression and economy, UI and HUD, world and look, characters/VFX/assets, mobile, shops and monetization, retention and social, thumbnails/icons/store page, live ops and launch, building it right).
- Claims (Unverified): 3.6B+ plays, $6M revenue in 12 months, agents work overnight unattended.
- Our version: the same structure (a lead hands work to role agents, each reads its knowledge chapter, the owner approves) built on our docs and hard rules. The role names are generic job titles; the vault text is our own.
- Skill: `roblox-agent-team`.

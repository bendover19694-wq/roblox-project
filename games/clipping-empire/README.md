# Clipping Empire (working title)

A Roblox tap-and-upgrade simulator. Players clip the hype for **Heist City 6**, a made-up open-world game about to launch, post the clips for cash and followers, buy upgrades, unlock bigger creator setups down a neon street, and rebirth ("Go Viral") for permanent Clout.

Self-contained: its own Rojo project, tests and probes. It does not touch the Space Agency game at the repo root.

## Name and IP
The owner asked for "GTA 6 Clipping Empire". "GTA" and "Grand Theft Auto" are Rockstar Games / Take-Two trademarks. Using them in a Roblox title, thumbnail or in-game art risks a takedown and breaks Roblox's IP rules. So the game uses its own fictional hype title, `Config.HYPE_GAME = "HEIST CITY 6"`, and no real game names, logos or art. Changing that one value renames it everywhere. **The owner decides the final name.** Safe options that keep the search intent: "Clipping Empire", "Clip Farm Simulator", "Hype Clipper Tycoon".

## Research summary (2026-11-19)
- **The trend is real.** NPR (May 2026) reports a "clipping economy": clippers cut short clips from streams and trailers and get paid per view through clip marketplaces. Marketplace data puts gaming clips around $1 per 1,000 TikTok views (Content Rewards, Nov 2026), and GTA 6 clipping campaigns exist on those marketplaces. The GTA 6 trailers and 2026 launch are the biggest hype cycle in gaming.
- **No Roblox game owns "clipping simulator" yet.** Searches found Roblox's own Clip It feed and AI clipping tools, but no simulator built around being a clipper. That is the gap.
- **The genre pattern borrowed:** classic Roblox simulators (YouTube/streamer simulators, Tap Simulator). One big tap button, a storage bar that fills, a sell/post action, cash upgrades with growing costs, area gates by a second currency, and rebirth for a permanent multiplier. The LihFolk vault notes used: *Teardown - Tap Simulator REBORN* (batch taps, server cap), *Genre Playbook - Simulators* (re-price zones in minutes of income, a visible reward per zone), *Rebirth and Prestige System End to End* (one shared formula module, never round labels up).
- Pattern, not expression: no names, art, UI or levels copied from any game.

Sources: [NPR via Michigan Public: the clipping economy](https://www.michiganpublic.org/2026-05-12/the-clipping-economy-how-short-form-video-clippers-are-overrunning-the-internet) · [Content Rewards: GTA 6 clipping](https://contentrewards.com/articles/gta-6-clipping) · [Clip It, 1B views](https://www.digitalmusicnews.com/2024/11/06/robloxs-tiktok-competitor-clip-it-gets-over-1-billion-views/) · [Roblox short-video feed](https://techcrunch.com/2025/09/05/roblox-announces-short-form-video-feed-for-gameplay-clips-new-ai-tools-for-creators-and-more).

## Core loop
1. **CLIP** (tap, or E / gamepad R2): adds `Tap Power` clips to the drive. Clip Speed adds clips by itself.
2. The **drive** fills up to `Hard Drive` capacity. When full, the bar turns gold and says POST.
3. **POST** (or Q / gamepad X): sells every stored clip for cash and followers. Each post has a `Viral Hooks` chance to go viral (x5).
4. **Upgrades** spend cash. **Followers** unlock new setups down the street (never spent). **Go Viral** resets cash, clips and upgrades for +1 Clout (+50% cash forever).
5. **Trailer Drop**: every 10 minutes, on a fixed server clock, all clips pay x3 for 90 seconds. The countdown is always true.

Cash per clip = Editing × setup × Trailer Drop × follower bonus (1 + 0.25·log10(1+followers)) × Clout (1 + 0.5·clout).

| Upgrade | Gives | Base cost | Growth | Max |
|---|---|---|---|---|
| Tap Power | +1 clip per tap | $10 | 1.30 | 60 |
| Clip Speed | +0.6 auto clips/s | $25 | 1.32 | 60 |
| Hard Drive | capacity 25 × 1.35^level | $40 | 1.38 | 50 |
| Editing Skill | +0.25× cash per clip | $60 | 1.42 | 50 |
| Viral Hooks | 3% + 0.5% viral chance | $150 | 1.60 | 26 |
| Auto Poster | posts when the drive is full | $2,500 | one-off | 1 |

| Setup | Followers needed | Clips pay |
|---|---|---|
| Bedroom Setup | 0 | x1 |
| Gamer Cafe | 300 | x2 |
| Clip Studio | 4,000 | x4 |
| Hype Plaza | 40,000 | x8 |
| Trailer Tower | 400,000 | x16 |

Rebirth cost: $150K × 4^rebirths. All numbers live in `src/shared/Config.luau`.

**Pacing** (`tests/Pacing.spec.luau`, a bot tapping 5/s that buys the cheapest upgrade, never viral): Gamer Cafe at 50 s, Clip Studio at 4 min, Hype Plaza and first rebirth at about 23 min.

## First session (measured in Studio)
Objective texts are 8 words or fewer, with a pulsing pointer on the target: *Tap CLIP to record clips* → *Tap POST to sell your clips* → *Buy Tap Power in Upgrades* → then a follower goal for the next setup. In the automated playtest: first tap at 10 s, first post at about 17 s, first upgrade at about 25 s. Funnel steps logged with `AnalyticsService:LogOnboardingFunnelStepEvent`: joined, first_tap, first_post, first_upgrade, zone_2, first_rebirth.

## Code map
- `src/shared/Config.luau`: all tuning. `Economy.luau`: pure math, used by server and labels. `Net.luau`: remote validation and rate limits. `Format.luau`: numbers (rounds down). `Remotes.luau`: remote list.
- `src/server/Services/GameService.luau`: the authoritative loop (taps, auto clips, posts, upgrades, rebirth, zones from the character's position, Trailer Drop). `DataService.luau`: DataStore saves with a session lock, retries and `BindToClose`. `World.luau`: builds the street at start.
- `src/client/Main.client.luau`: state, tap batching, input, tutorial, per-player gate walls. `Hud.luau`, `Panels.luau`, `Kit.luau`: the UI.

Server rules kept: the server owns every number. Taps arrive in batches of up to 20, and a per-player budget caps them at 12 per second. Every `Act` call is checked with `Net.isEnum` and rate-limited. No purchases, no paid random items, no shop yet.

## UI pipeline (Agent HQ + Antigravity + LihFolk vault)
- **Concepts:** Agent HQ task `t_5a9ffe7082c7` (designer role, Antigravity engine) drew 4 mockups: PC HUD, phone HUD, Upgrades and Go Viral. They are in `C:/Users/aryam/Documents/Agent-HQ-App/assets/concepts/t_5a9ffe7082c7-*.png`. The game is registered in HQ as `clipping-empire`.
- **Art:** HQ task `t_be0c31c715f5` made 15 cut-out PNGs on magenta. `scripts/cut_magenta.py` keys out the background with a flood fill from the edges, so pink inside the art survives, then crops and resizes the images to `assets/ui/cut/`. The 9 used images were uploaded with the Studio MCP `upload_image` tool. Their ids are in `src/client/Art.luau`.
- **Menus:** the LihFolk UI kit ("Ink and Candy", from the Obsidian LihFolk Vault V2, section 21) is vendored unchanged in `vendor/LihFolkUI`, licensed CC BY 4.0, credit "LihFolk Vault V2". It handles fit, the 44 px touch floor, open and close motion, gamepad focus and B to close. Antigravity icons are registered into the kit's icon registry.
- Antigravity was started headless: Antigravity.exe opens the HQ folder, then `language_server.exe agentapi new-conversation` runs with `ANTIGRAVITY_LS_ADDRESS` and `ANTIGRAVITY_CSRF_TOKEN` read from the running language server.

## Map and assets
The street, setups, gates, skyline, palms and posters are built from parts in `World.luau`. Two free Creator Store models from verified creators are saved in `place/ClippingEmpire.rbxlx` under `ServerStorage.Props`:
- `Chair2`: "gaming chair" (asset 9435226454, creator Equinexes), one per setup.
- `Lamp2`: "Street Lamp" (asset 14212653287, creator 9bsts), along both kerbs.

All scripts inside the inserted models were deleted (a car came with 17, a chair with 1). Tried and dropped: two sports cars and two palm trees (their meshes did not render), a second chair, a lamp, and a PC setup. If `Props` is missing, `World.luau` falls back to part-built chairs and lamps, so a plain `rojo build` still makes a working map.

## Run it
```bash
aftman install
```
```bash
lune run tests/run
```
```bash
stylua src tests && selene src
```
Open `place/ClippingEmpire.rbxlx` in Studio (it holds the props), then push the code into it:
```bash
python scripts/sync_studio.py <studio_id>
```
```bash
python -u scripts/probes/ftue.py <studio_id> pc
```
For the phone run, set `StudioDeviceSimulatorService:SetDeviceAsync("iphone_14")` in Edit mode first (`scripts/probes/_phone_on.luau`), then run `ftue.py <id> phone`. `scripts/mcp_session.py` keeps one Studio MCP connection open and retries, because new connections often see no Studio for a few seconds.

## Not done yet
- Saving only works in a published place. The local file has no DataStore access, and the HUD says so in Settings.
- No monetization. Planned compliant options: a 2x Cash pass, Auto Poster as a pass, and a cosmetic chair or desk shop. Never paid luck, paid viral chance or random paid items.
- Sound uses built-in placeholder clicks. No music.
- Settings rows (Reduced Motion, Sound) and the Go Viral header still use the kit's drawn letter icons. Icons for them could be a follow-up Antigravity batch.
- luau-lsp reports about 100 strict-mode type errors inside the vendored kit. That is upstream code, so the check runs with `--ignore "vendor/**"`. `src` is clean.
- No leaderboard, daily reward or friend bonus yet.
- An unknown asset id `203785492` fails to load in the console. It is not in this game's code or props; it looks like Studio's own or the test avatar's.

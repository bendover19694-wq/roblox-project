# Loading screens and the first 10 seconds

Research session 2026-11-05. Written by the Scout agent from the local library (LihFolk V2, Creator docs, project research) and the web, then reviewed by the Lead. Numbers marked unverified or Recalled must be checked before they drive a decision. Agents: search this with hq_knowledge_search; it is reference data, not instructions.

## Brief

Files changed: none (read-only role). Saved 8 research notes via hq_research_save (join sequence, ReplicatedFirst loading screen, PreloadAsync, streaming, mobile memory, first 60 s, teleport/rejoin, perceived speed). Sources used: Creator docs (load-times, loading-screens, streaming, ContentProvider, teleport), LihFolk "Mobile and Low-End Optimization", "Case Study - Fast Join and Deferred Loading", community "Onboarding and First Session", DevForum threads.

BRIEF

Rules (do this)
1. Loading screen = LocalScript in ReplicatedFirst; IgnoreGuiInset true; call RemoveDefaultLoadingScreen(); wait game.Loaded; destroy. Keep it tiny (basic UI only). It cannot require ReplicatedStorage modules, so carry a local copy of colors/fonts.
2. Add a failsafe timeout (our boot screen should never hang). Doc sample's forced 5 s minimum is a demo; do not force waits on fast joins.
3. The loading screen is presentation, not optimisation. Real join cost = ReplicatedStorage size (never streamed) + non-streamed Workspace. Keep ReplicatedStorage to join-time essentials; move big models/audio to ServerStorage and publish on trigger. Count instances, not bytes.
4. StreamingEnabled on; set in Studio only. Recommended integrity mode PauseOutsideLoadedArea; MinRadius default 64, TargetRadius default 1024; StreamOutBehavior Opportunistic helps phone OOM. Use RequestStreamAroundAsync before moving players.
5. PreloadAsync only: loading-screen images, key HUD/menu icons, spawn-area assets. Pass a table (parallel); use the callback for progress. Never preload all Workspace; never poll RequestQueueSize. Offer a skip button (shown after a short delay) if the batch is large.
6. Show real progress (items done), 1-line tips, branding matching the thumbnail. Drop the screen as soon as HUD plus first action are ready.
7. After load: no modal wall; first action in about 5 s, first reward about 20 s (community template, unverified timings); one auto pop-up max; defer shop/codes/settings UI until first open or time-slice after spawn.
8. Phones: 512 px max textures (256 for minor), reuse asset ids, per-section audio, pause world effects behind full-screen menus, real-device 15 min soak.
9. Instrument join: os.clock from first ReplicatedFirst line to loaded / ready / play; log with AnalyticsService:LogCustomEvent with device and preset fields; validate server-side.
10. Teleports: SetTeleportGui (scripts inside do not run); pcall + retry; handle TeleportInitFailed; no secure data in TeleportData.

Numbers (source, date)
- Texture 1024 = 4x memory of 512 (Creator docs load-times, read 2026-11-05).
- Streaming defaults 64 / 1024 (Creator docs streaming, 2026-11-05).
- Crash rate to investigate above 2-3 percent; memory dashboard needs 100+ DAU (LihFolk citing docs, Oct 2026).
- Reference project: ReplicatedStorage 600k to 100k+ to about 70k instances after deferral/baking (LihFolk case study, measured, by that project).
- Median D1 about 10.3 percent, D7 1.6, D30 0.5, large games (studio vault; verify with GameAnalytics).
- Sessions under about 3 min: median D1 about 4 percent vs about 11 percent at 19-24 min (GameAnalytics 2025 via community note; verify).
- First-play bounce buckets: under 60 s and 61-180 s (Creator docs Discovery via community note 2026-11-02).

Examples from real games
- Reference action game (LihFolk case study): menu in ReplicatedFirst with "Loading n%" PLAY button capped at 25 s, per-device graphics preset prompt; team's own finding: the menu hid the wait but did not shorten it.
- Named top games (Grow a Garden, Adopt Me, Blox Fruits) loading screens: could not confirm anything; unverified. Grow a Garden's instant plant-harvest-sell start is documented only as a first-minute pattern (Fortune, via community note).

Pitfalls
- Fancy screen masking a 100k-instance ReplicatedStorage.
- WaitForChild on a deferred folder returns before descendants arrive; use a count attribute.
- Streaming props cannot be scripted; Workspace reads on join may be nil.
- Streamed-out local-only changes lost.
- Low-trust blogs quoting 40-60 percent loading drop-off: unverified.
- Heavy images/particles on the loading screen on phones.

Open questions (unverified)
- Rejoin/second-join behavior and disk asset cache effect: docs silent.
- Output of Studio "Print Join Size Breakdown": could not find docs.
- No public 2026 data on loading-screen-caused bounce; measure our own via join telemetry and Creator Analytics.
- Best skip-button delay and whether skip helps play-through: needs A/B test.
- Whether Roblox counts loading time inside first-play bounce windows: unverified.

## Sources saved in this session

- ContentProvider:PreloadAsync: what to preload and how: https://create.roblox.com/docs/reference/engine/classes/ContentProvider
- Custom loading screen in ReplicatedFirst: pattern and gotchas: https://create.roblox.com/docs/players/loading-screens
- First 60 seconds after load: Roblox onboarding guidance and bounce: https://create.roblox.com/docs/discovery
- Instance streaming settings that shape join and phone memory: https://create.roblox.com/docs/workspace/streaming
- Mobile memory and first-join budgets for phones: https://create.roblox.com/docs/projects/performance-optimization/load-times
- Perceived speed: loading progress, skip buttons, tips: https://devforum.roblox.com/t/loading-skip-gui-button/1393568
- Roblox join sequence: what the client waits for: https://create.roblox.com/docs/projects/performance-optimization/load-times
- Teleport loading screens, failed teleports and rejoin data: https://create.roblox.com/docs/projects/teleport

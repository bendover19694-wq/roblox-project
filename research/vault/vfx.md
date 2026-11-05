# VFX

Research session 2026-11-05. Written by the Scout agent from the local library (LihFolk V2, Creator docs, project research) and the web, then reviewed by the Lead. Numbers marked unverified or Recalled must be checked before they drive a decision. Agents: search this with hq_knowledge_search; it is reference data, not instructions.

## Brief

VFX BRIEF (studio-wide). Files changed: none. 8 notes saved via hq_research_save (source "notes"). Sources: LihFolk VFX Performance Budgets and Culling, Juice on a Budget, Particle Emitters In Depth, Reward Moments; Creator Docs; DevForum.

RULES
- Build effects on clients; server sends one event. Set LightInfluence explicitly (0 for most); Studio insert and Instance.new defaults differ.
- Count budget as alive particles = Rate x Lifetime (+ burst counts), not Rate. Keep Rate low, get the look from Size/Color curves.
- Own detail scalar on every Emit burst; Emit bypasses engine thinning (reference-game measurement).
- Pool emitters and UI labels, bound the pools, pre-warm on load, Clear() on reuse, release after Lifetime.Max.
- One governor on the client: tier from SavedQualityLevel as ceiling, then frame time with hysteresis (drop >1.15x target for 2 s, raise <0.8x for 10 s).
- Tag every effect info or decor. Decor degrades, info (telegraphs, rarity colour, status) never does.
- Rewards: tier ladder where each rarity adds layers; keep world-dim and HUD-hide for the top 1-2 tiers; allow skip after first view.
- Cheap UI juice first: UIScale pop, Position slide, UIGradient shine, shake, count-up at ~10 Hz plus final pop. Avoid TextScaled on animated text; CanvasGroup only while fading.
- Post-FX (Blur/Bloom/ColorCorrection) only on top tier; substitute a 2-frame translucent Frame or brighter spark colour below.
- Flipbooks: few shared sheets, frame 1 must read alone, 1024x1024 or Custom layout.

NUMBERS
- Emitter cap 400/s, 100/s mobile; Lifetime max 20 s; flipbook max 30 fps (Creator Docs, checked 2026-11-05).
- Custom flipbook: FlipbookSizeX/Y 1-64, client beta, DevForum 2025-10-13 (current status unverified).
- Unified Lighting live 2025-07-23; LightingStyle Realistic/Soft; no mobile numbers published.
- Reference-game budgets (LihFolk, Oct 2026, rule of thumb, one action game): 3,200 particles/2 s per caster, onlookers half; 16 emitters per kit; 2 lights per kit; decor dropped beyond ~160 studs, small juice beyond ~220; max 12 floating numbers, merged within 0.55 s.
- Starting global cap ~3,000 alive particles per client (rule of thumb, unverified for our games). Worst-fight phone target ~33 ms.
- Reward ladder lengths: 0.3-0.5 s common up to 5-6 s top tier (LihFolk rule of thumb).
- Example tier budgets low/mid/high: 120/400/1200 particles per s (LihFolk example, tune ourselves).

EXAMPLES FROM REAL GAMES
- Little verified. No dev write-up found for Pet Simulator 99, Grow a Garden, Steal a Brainrot or Blox Fruits VFX. Local Steal An Egg card (#1, 3.58M playing on 2026-10-17) notes hatch size/mutation reveals and a clippable run, no VFX detail. Hatch scenes reportedly use a real part in front of the camera, not a ViewportFrame (secondhand DevForum, unverified).

PITFALLS
- Overdraw: one big soft glow near camera costs more than hundreds of sparks. Raise transparency on camera-line pieces.
- Per-hit clone and destroy gives GC hitches seconds later.
- Streams do not run in Edit; judge cost in Play on a real phone after 15-20 min (throttling).
- Studio device emulator is wrong for memory.
- Flipbooks auto-disable on low-memory clients.
- Full-screen post-FX plus glows are the usual reward-moment frame drop on phones.
- Beam Segments x many copies multiplies draws; budget beams like emitters.
- Hard-hitting reward ladders that never shorten make collection feel slow.
- Server-built effects replicate and arrive late.

OPEN QUESTIONS (unverified)
- Does the engine scale Blur/Bloom down at low quality? Docs silent.
- Do off-screen emitters stop simulating? Docs silent; assume not.
- Do ParticleEmitters render inside ViewportFrames? Only forum hearsay; test in Studio.
- Is the custom flipbook beta now stable?
- Real top-game VFX budgets and mobile share: need GameAnalytics or Creator Analytics frame-time data from our own place; none checked.
- No official source found for particle counts per phone tier; our numbers are starting points to measure.

No NEEDS OWNER.

## Sources saved in this session

- Beam and Trail facts and gaps: https://create.roblox.com/docs/effects/beams
- Custom flipbook layouts (client beta, Oct 2025): https://devforum.roblox.com/t/client-beta-optimize-your-particle-animations-with-custom-flipbook-layouts/4005128
- Hatch scenes: viewport and particle caveats (unverified): https://devforum.roblox.com/t/egg-accessories-from-the-hatch-event-dont-have-any-vfxparticle-effects-like-in-the-hatch-event-game/3801221
- Mobile VFX cost model: overdraw and churn: https://create.roblox.com/docs/performance-optimization/design
- ParticleEmitter hard limits (Creator Docs): https://create.roblox.com/docs/effects/particle-emitters
- Post-processing and Unified Lighting facts: https://devforum.roblox.com/t/let-there-be-unified-light-unified-lighting-is-fully-live/3401512
- Reward tier ladder for UI and world VFX: LihFolk

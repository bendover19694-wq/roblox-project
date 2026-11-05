# Game animations

Research session 2026-11-05. Written by the Scout agent from the local library (LihFolk V2, Creator docs, project research) and the web, then reviewed by the Lead. Numbers marked unverified or Recalled must be checked before they drive a decision. Agents: search this with hq_knowledge_search; it is reference data, not instructions.

## Brief

Studio-wide animation research brief (no files changed in repo; 8 notes saved with hq_research_save, searchable via hq_knowledge_search source "notes").

RULES (do this)
- Locomotion on Movement priority, attacks on Action, one-shot emotes higher. React to animation markers (GetMarkerReachedSignal), not timed waits or deprecated KeyframeReached.
- Use Animation Graph/state machines for locomotion blends; set parameters per authority mode (Automatic replicates; Server-mode players: set on both sides; NPCs: server).
- Scripts touching joints must support Motor6D and AnimationConstraint (Avatar Joint Upgrade). Check StarterPlayer.AvatarJointUpgrade in Studio.
- Ragdoll: weaken/disable AnimationConstraints, let BallSocketConstraints work, tight limits on elbows/knees; recover by re-enabling constraints; cap live ragdolls.
- Hit-stop: AdjustSpeed(0) on the playing track at the contact marker, short wait, restore; local presentation only; server owns damage.
- UI: one motion module with named tokens; pops on UIScale; check PlaybackState.Completed + intent before hiding; input live from first visible frame; stagger total ≤ ~0.4 s; exits ~0.6-0.75 of enter time with In easing, no Back In; pause idle loops on hidden panels.
- Reduced motion: read GuiService.ReducedMotionEnabled plus an in-game toggle; replace movement with 0.1-0.15 s fades; keep feedback.
- Juice: every input pop + sound within ~100 ms; rewards fly to counter, count up, pop; shake/anticipation only for big moments; effects ≥0.12 s for important feedback; pool instances.
- Crowds: leave Animator LOD (PreferLodEnabled true) on; opt out only for the hero.
- Blender: FBX, Unit Length cm / scale 0.01, Add Leaf Bones off, Bake Animation on for animation, animate in place, applied transforms; test in Studio; owner uploads.

NUMBERS
- AnimationPriority: Idle 0, Movement 1, Action 2, Action2 3, Action3 4, Action4 5, Core 1000 (Creator Docs, read 2026-11-05).
- Play/Stop fade default 0.1 s; AdjustWeight fade default 0.1 s (Creator Docs AnimationTrack, 2026-11-05).
- AJU: DevForum 26 Jan 2026; phase 2 default targeted H2 2026, no date.
- Hit-stop ~0.05-0.1 s (unreliable SEO sources; unverified). Button press 0.9 over 0.08 s, release 0.3 s, panel open 0.26 s / close 0.14 s (LihFolk, one reference game). Others' juice within ~220 studs. Camera FOV default 70, range 1-120.

EXAMPLES FROM REAL GAMES
- Only anonymous "reference project" numbers (LihFolk) and the Space Agency boot-rocket crouch; no named top-game talks found. Nothing from shipped top-game postmortems confirmed.

PITFALLS
- Hiding panels on Completed without state check; Back In exits; Size tweens for pops; per-button RenderStepped springs; infinite tweens on hidden UI.
- Held props welded with Motor6D under AJU; writing C0/C1 on upgraded rigs; mixed kinematic/physics joints replicate choppy.
- Hit-stop on the server freezes everyone; juice scheduled at click time fires on whiffs.
- Creator Hub reference pages and the DevForum post disagree on whether AJU is already default.

OPEN QUESTIONS (unverified)
- Blend rule for same-priority overlapping tracks; whether client-played tracks replicate to others in all cases (page silent).
- Current AJU phase and date; best practice for held props; root motion (no official feature found; animate in place + script).
- Server-side cost of many animated NPCs (throttler is client-only).
- TweenService:SmoothDamp behaviour (signature only).
- Animation Editor FBX import menu wording; Moon Animator specifics.
- Named top-game animation/juice talks (2025-2026): not found in this pass.

## Sources saved in this session

- Animation Graph, state machines and parameters: https://create.roblox.com/docs/animation/graph-editor
- AnimationPriority order and AnimationTrack API facts: https://create.roblox.com/docs/reference/engine/enums/AnimationPriority
- Animator throttling and LOD for crowds: https://devforum.roblox.com/t/phasing-out-workspaceclientanimatorthrottling/1968212
- Avatar Joint Upgrade: phases and script breakage (2026): https://devforum.roblox.com/t/avatar-joint-upgrade-for-physically-simulated-character-movement-is-now-live/4298561
- Blender FBX export settings Roblox expects: https://create.roblox.com/docs/art/modeling/export-requirements
- Hit-stop on Roblox: freeze the track, keep the server honest: https://devforum.roblox.com/t/slow-motion-effect-or-other-effects-like-slow-mo/2046601
- Juice governor and tiered substitutes: LihFolk
- Juice stack and budget (LihFolk Game Feel and Juice): local
- UI motion tokens, interruption and reduced motion (LihFolk + GuiService): https://create.roblox.com/docs/reference/engine/classes/GuiService

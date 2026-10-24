---
name: roblox-concept-art-ui
description: Use when a Roblox screen, panel, shop, HUD or station needs a new look. An image model (Antigravity image generation, queued as an Agent HQ designer task) draws the concept, Claude rebuilds it as real Luau UI from Theme, Icons and Motion. Covers writing the image prompt, reading the concept, and the rebuild.
---

# Concept art to Roblox UI

"Image model for the design, Claude for the code" (`research/video-notes/instagram-ai-roblox.md`, reel 2). The image model is good at a glossy, cohesive look; Claude is good at turning it into working, server-safe UI. The concept image is a reference, never a shipped asset.

## 1. Get the concept image
Read `src/client/UI/Theme.luau` for the palette and fonts, and the screen's current code. Then queue a `designer` task in Agent HQ (role `designer`, engine `antigravity`; see `tools/agent-hq/README.md`), or run `/hq-design` in Antigravity. Put this prompt in the task body:

```
Roblox game UI mockup, <screen name> for "Run a Space Agency", a cartoon space-management game.
Landscape <1920x1080 PC | 844x390 phone>. Layout: <header / tabs / grid of N cards / primary button / close>.
Content: <real labels and numbers from the game>.
Style: chunky rounded panels, thick dark outlines, soft gradients, bright saturated <Theme colors>, bold rounded font, playful but readable.
Flat 2D UI only, no 3D scene behind it, no logos, no real brands, no emoji, no text other than the labels given.
```

Ask for 2 to 3 variations. Antigravity saves them to `assets/concepts/<taskId>-<n>.png` and they appear under "Needs you" in HQ. When the owner approves one, HQ queues a `ui` task to rebuild it (steps 2 to 4).

No image needed? Claude designs straight from the rules (spec, build, Studio capture, review, fix).

## 2. Read the concept (Claude)
`Read` the PNG. Write down, before coding:
- Layout zones and their sizes as Scale values, with the phone safe areas (`docs/decisions.md` D-013: ~1000x520 compact canvas, `CoreUISafeInsets`).
- Colors mapped to existing `Theme` tokens. Add a token only when nothing is close, and add it in `Theme.luau`, never inline.
- Every icon, mapped to `UI/Icons.luau` or a new drawn-in-code icon. No image icons, no emoji.
- Which of the 8 `UI/Motion.luau` patterns each element uses, and its reduced-motion fallback.

## 3. Rebuild (Claude)
- Build with the existing UI modules (`Kit`, `Panels`, `Sections`, `Theme`, `Icons`, `Motion`). Match the concept's hierarchy and mood, not its pixels.
- Values shown in the UI come from the server. Buttons send a request; the server decides.
- Player-facing text: no em dashes, neutral shop copy, Mild content.

## 4. Check
- Studio capture at PC and `iphone_14` sizes (`scripts/probes/viewport.luau`), side by side with the concept.
- Run the repo checks from `CLAUDE.md` (stylua, selene, lune tests, luau-lsp).
- Report what differs from the concept and why.

## Never
- Ship the generated image or slices of it as decals (owner decision, and it breaks the drawn-icon rule).
- Copy a concept that shows paid random rolls, timers that lie, or pushy shop layouts. Rebuild to our rules (`CLAUDE.md` hard rules, `research/monetization-policy.md`).

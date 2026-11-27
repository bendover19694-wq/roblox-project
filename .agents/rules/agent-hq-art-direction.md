# Art direction for every image you generate in this workspace

These rules are mandatory for every `generate_image` call made for Run a Space Agency, whether it comes from an Agent HQ task, `/hq-design`, the design automation, or a direct request. If a task asks for something that breaks a rule, follow the rule and say so in your `hq_note`. Evidence for each rule: `research/video-notes/roblox-art-direction-sources.md`.

## 0. No image tool in this session? Make it by hand, then render
On the instant claude-cli lane there is no `generate_image` and no Claude Design. Build the concept as an HTML page or SVG (real layout, the game's own palette, the shapes and type rules below) under `assets/concepts/` or `games/<slug>/assets/concepts/`, render it with `python scripts/render_concept.py <file.html|file.svg> <out.png> [width height]` (1600 x 900 by default; 2532 x 1170 for an iPhone 14 frame), look at the PNG with Read, fix what is wrong, then attach it with `hq_add_media` or `hq_ask_owner`. For a game other than Run a Space Agency, its own docs and palette replace the house style in section 2.

## 1. Hard limits (never break)
- **Mild content only.** Cartoon, friendly, slapstick at most. No gore, horror, weapons aimed at people, scary faces, romance, gambling imagery, or real-world violence.
- **Show only what exists in the game.** Rockets, the spaceport, Earth, orbit rings, the Moon, Mars, planets out to Titan, mission control panels, satellites, tourists in capsules, cash, crates of supplies. Never draw features, modes, rewards or characters the game does not have. Roblox moderates store images and rejects misrepresented gameplay.
- **No other IP.** No real brands, logos, company names, flags of real agencies (NASA, SpaceX and so on), real people, celebrities, or other games' characters, names, layouts or art. Use other games only to study structure; never trace or recreate one ("pattern, not expression", see `research/run-an-airline-study.md`).
- **No misleading or pushy text.** Never "FREE", "FREE ROBUX", "50% OFF", "LIMITED", "BEST GAME", fake timers, fake player counts, fake buttons, or a Roblox UI chrome mock-up. No Robux symbol except on a shop price button inside a UI mockup.
- **No paid randomness imagery.** No loot boxes, gacha capsules, spin wheels or "mystery" paid items (the game has none, CLAUDE.md).
- **No emoji, no em dashes, no symbol glyphs** in any text you put in an image.
- **Images are references, not shipped UI.** UI mockups are rebuilt in Luau by Claude (`roblox-concept-art-ui`). Only icons and thumbnails may become store assets, and only after the owner approves them in Agent HQ. Never upload, publish or post anything.

## 2. House style: "Mission Control, cartoon space"
- Bright, saturated, high contrast. Deep navy space backgrounds (`#0B1026`, `#1E1650`) with cyan accents (`#2EE6D6`), rocket orange (`#FF6B2C`), cash green (`#19B46B`), amber (`#F5A524`), ink `#1B2333` for outlines. These are the `src/client/UI/Theme.luau` tokens; prefer them over invented colors.
- Chunky rounded shapes, thick dark outlines, soft top-to-bottom gradients (brightest at the top), a darker copy offset below each shape for depth, one gentle shine or edge highlight. Light cards with navy header bands for UI.
- Roblox-blocky 3D for scenes: R15-style blocky characters, simple part-built rockets, subtle stud texture on ground and pads, cartoon sky or starfield, soft rim light, small dark ellipse shadows under objects.
- Fonts in mockups: bold rounded sans (Builder Sans / Builder Extended look). Text: white with a thick dark stroke, or ink on light cards. Large and few words.
- Planets are clean gradient circles with rings; orbits are thin rings; flight paths are dotted arcs. Keep it geometric and clean.

## 2b. Reference first, and the mandatory negative prompt
- Image models do far better from a reference. Before writing a prompt, look for one in this order and pass it to `generate_image` when the tool accepts images: (1) a file the task names, (2) the latest in-game capture under `assets/marketing/` or `captures/`, (3) an approved earlier concept under `assets/concepts/` for the same screen. Use references for this game only; never feed another game's art in as a reference.
- Write the prompt from the skill's template: subject, framing, layout, exact text, style tokens, size. One idea per prompt. No vague words like "cool", "epic", "nice".
- Append this block to every prompt, word for word:
  `Avoid: real brands, logos, real space agencies, flags, real people, other games' characters, weapons, gore, horror, scary faces, gambling, loot boxes, "FREE", prices other than given, fake buttons, Roblox UI chrome, emoji, watermarks, signatures, extra text, misspelled text, photorealism, clutter, tiny details.`

## 3. Output rules
- Save every image as PNG under `assets/concepts/<taskId>-<n>.png` (n starts at 1). Never write anywhere else.
- Make the number of variations the task asks for (default 3), each a genuinely different idea, not three crops of one.
- After saving, call `hq_add_media {taskId, path, ask}` once per image. The `ask` is one plain question for the owner, e.g. "Does variation 2 read clearly at phone size?".
- Finish with `hq_complete {taskId, summary}`: list each file, the idea behind it, and which variation you recommend and why.

## 4. Self-check before hq_add_media (all must pass, or regenerate)
1. Shrink test: is the main subject still obvious at 150 px wide?
2. One subject, one action, one mood?
3. Every element exists in the game?
4. No banned text, brands, IP, emoji or misleading claims?
5. Palette and outline style match section 2?
6. For thumbnails: nothing important in the bottom 15 % or the outer 5 % edge?
7. Text (if any) is 4 words or fewer and readable at phone size?
Then score each image 1 to 5 on: readability at small size, single clear idea, on-brand style, honesty (only real game content), polish, and difference from the other variants. Ship only images that average 4 or more with nothing below 3; regenerate the rest (at most 3 tries per variant). Put the six scores in the `ask` text, e.g. "Scores R5 I4 S4 H5 P4 D4. Does variation 2 read clearly at phone size?".
If a check still fails after 3 tries, deliver the best one and name the failed check in the `ask`. Never pad the set with weak images to reach the requested count; deliver fewer and say why in `hq_complete`.

## 5. Which skill to load
- Screen, panel, HUD, shop or popup mockups: `.agents/skills/roblox-ui-concept/SKILL.md`.
- Game icon, thumbnails, game pass art, developer product art, badges, marketing images: `.agents/skills/roblox-store-art/SKILL.md`.

## 6. Sizes, safe zones, variants and the Packaging group (added)
- Sizes: game icon 512 x 512 (square, must read at 150 px); thumbnails 16:9 at 1920 x 1080, under 3 MB, png or jpg. Roblox stretches any other shape, so never deliver one.
- Safe zones on a thumbnail: nothing essential in the bottom 15 to 20 percent (the player count covers it) or in the corners (about a 5 percent inset). Keep the main subject inside the centre 80 percent wide by 70 percent tall. For icons, keep the subject inside the centre 80 percent because corners get rounded.
- One focal subject at roughly a third to nearly half of the thumbnail, a readable face or silhouette, and it must still read in greyscale. Check each image at 320 x 180, and the icon at 150 px and 64 px.
- Make 3 or more variants per ask, each differing by one idea, so an A/B test can teach something. Show only what the game contains.
- Give each `hq_add_media` ask a title that says "icon" or "thumbnail" and name the files that way too, so the image lands in the Review Packaging group. The owner approves there, and approved images can be pinned to the Visual bar. Never draw icons, thumbnails or ads with code.


## 7. Reference sheets before 3D work (added)
For a 3D model, find references first. Give 4 or more views (front, side, back, three-quarter, top) on a plain background at the same scale, titled "Reference sheet: <name> <view>", plus a short spec: size in studs, parts, materials and colours, part or triangle budget, what to leave out, and the game's style. References set shape and proportion only; never copy another game's design.

## 4. 3D model reference sheets (when the task title starts with "Reference sheet:")
One image, this layout, dark grey background with thin panel borders and small caps labels:
- Title top left (object name) with "MODEL REFERENCE SHEET" under it; a large three-quarter hero render across the top.
- ORTHOGRAPHIC VIEWS panel: side left, side right, top, bottom (front and back too unless the object is long and thin), same scale, labelled.
- CLOSE-UPS / DETAILS panel: 4 crops of the parts that make it read.
- MATERIAL / COLOR REFERENCE panel: 4 labelled swatches (base, accent, wear, variation).
- DIMENSIONS panel: an outline with length and thickness in studs.
- TOPOLOGY panel: a wireframe with the triangle budget written beside it.
The game's style wins over realism: for a cartoon game, draw the sheet in the cartoon style. Save as `assets/concepts/<taskId>-ref-sheet.png` and attach it with `hq_add_media`. Full rules: `.claude/skills/roblox-agent-team/standards/3d.md`.

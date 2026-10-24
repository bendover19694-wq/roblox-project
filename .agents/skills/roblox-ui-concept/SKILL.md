---
name: roblox-ui-concept
description: Use when generating a UI mockup for Run a Space Agency (a screen, panel, HUD, shop, popup, wizard step or button set). Produces reference images that Claude later rebuilds in Luau. Follow .agents/rules/agent-hq-art-direction.md first.
---

# Roblox UI concept mockups

You draw the look; Claude builds it. A good mockup is one a coder can rebuild exactly from Roblox Frames, strokes, gradients and corners. Read `.agents/rules/agent-hq-art-direction.md` before anything else.

## Before you generate
1. Read the task body. Find the screen name, target device (PC 1920x1080 or phone landscape 844x390) and the real labels and numbers.
2. Read `src/client/UI/Theme.luau` for colors and radii, and skim the current screen's module in `src/client/UI/` so the mockup fits what exists (panels, sections, wizard, shop, HUD).
3. If the task gives no labels, use real ones from the game: Cash, Supplies, Launch, Plan mission, Rockets, Destinations (Low Earth Orbit, Moon, Mars, Titan), Career, Shop. Never lorem ipsum.

## Layout rules (from Roblox mobile practice)
- Landscape. Top-left: player and agency; top-right: currencies; left edge: menu buttons stacked; bottom-centre: the one primary action; top-centre: the current objective. Keep the top 60 px clear for the Roblox top bar and leave notch room on phone.
- One primary button per screen, clearly the biggest and brightest. Secondary actions smaller and calmer. A close button top-right of every panel.
- Touch targets look at least thumb-sized (about 44 px at phone scale). Text big enough to read on a phone; no thin or decorative fonts.
- Panels: light card body, navy header band with the title in white heavy rounded type, rounded corners, a soft shadow. Shops: the featured item first and biggest, then smaller items; every item has a name, a short line of what it gives, a big picture, and a green price button.
- Tabs as chunky pill buttons along the panel top. Grids of cards with equal spacing. Nothing cramped: generous padding.
- Every color has one job: base, panel, outline, primary action, money, warning. Keep that mapping across all variations.

## Prompt template (fill every angle bracket)
```
Flat 2D game UI mockup for a cartoon Roblox space-management game, <screen name>.
<Landscape 1920x1080 PC | landscape 844x390 phone>, shown straight on, no device frame, no 3D scene behind it, plain dark navy backdrop.
Layout: <zones from top to bottom, e.g. navy header band with title "<TITLE>", three pill tabs "<A>" "<B>" "<C>", a 3x2 grid of item cards, a big green button "<LABEL>" bottom-centre, round close button top-right>.
Content: <exact labels and numbers>.
Style: chunky rounded panels, thick dark outlines (#1B2333), soft top-lit gradients, a darker offset layer under each button for depth, small shine on buttons, light card bodies with navy (#0B1026) header bands, cyan (#2EE6D6) accents, rocket orange (#FF6B2C), cash green (#19B46B), bold rounded sans-serif text, white text with dark stroke on colored buttons.
Icons drawn as simple flat vector shapes (rocket, coin, crate, planet, gear), no emoji.
No logos, no brands, no real agencies, no Robux symbol except on price buttons, no text other than the labels given.
```

## Variations
Make 3 unless told otherwise, changing one big idea each time: layout structure, color emphasis, or density. Never three near-copies.

## Extra checks for UI (on top of the rule file's self-check)
- Could each element be built from rectangles, circles, strokes, gradients and text? If an element needs a painted texture, simplify it.
- Is every label legible at the target size and spelled exactly as given? Image models misspell; regenerate if a label is wrong.
- Does the primary action stand out within one second?

Then save, `hq_add_media` each, `hq_complete` (see rule file section 3).

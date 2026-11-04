---
name: roblox-store-art
description: Use when generating the game icon, experience thumbnails, game pass art, developer product art, badge art or marketing images for Run a Space Agency. These decide whether players click. Follow .agents/rules/agent-hq-art-direction.md first.
---

# Roblox store art: icons, thumbnails, passes, badges

Roblox shows games to more players when more people click them. Players judge only the icon, the title and the thumbnails, mostly on a phone at tiny size. Read `.agents/rules/agent-hq-art-direction.md` first; this file adds the store-specific rules. Evidence: `research/video-notes/roblox-art-direction-sources.md`.

## The one rule above all
The icon, the title and the first thing a player does must promise the same fantasy: **"launch your own rockets and grow a space agency."** Every image shows a rocket launching, a mission arcing to a planet, or the agency growing. Nothing else.

## Game icon (square)
- 1024x1024 PNG (Roblox shows it at 512 and as small as about 150 px). Keep the subject inside the centre 80 % because corners get rounded.
- One idea, one big subject: a chunky cartoon rocket mid-liftoff with a bright flame, or a blocky astronaut character with a huge excited expression next to a rocket. Big, simple shapes, thick outlines, strong silhouette.
- Background: one bold color or simple gradient (deep navy to purple, or bright sky blue) that contrasts with the subject and with Roblox's white and grey pages.
- Text: none, or at most one short word. Never the full title.
- Shrink test is mandatory: at 150 px you can still tell it is a rocket game.

## Thumbnails (16:9)
- 1920x1080 PNG. Roblox stretches anything else to 16:9.
- Keep important things out of the bottom 15 % (player counts cover it) and out of the outer 5 % edge.
- One subject, one action, one mood. Proven structure: a blocky character with an exaggerated emotion (amazed, cheering, shocked-happy) in the foreground, the action behind (rocket launching, rocket landing on the Moon, a planet with a dotted mission arc), and a simple background (cartoon sky or starfield).
- Camera: dynamic, slightly low angle, narrow field of view so the subject is big; avoid flat head-on shots.
- Color: bright and saturated, bold flat color areas, strong subject-background contrast. Stud texture on ground and pads is fine and fits Roblox players' taste, kept subtle.
- Lighting: soft sun plus a rim light that separates characters from the background; small dark ellipse shadows under feet and rockets.
- Text (optional): 2 to 4 words in heavy rounded or comic-style bold font, white with a thick dark stroke, placed top-left or top-centre. Describe the action only ("LAUNCH TO MARS", "BUILD YOUR AGENCY"). No claims, no prices, no "FREE".
- Make 3 to 5 variants with genuinely different ideas (different subject, emotion or destination) so the owner can run Roblox thumbnail personalization, which needs 2 to 5 active thumbnails.

## Game pass and developer product art (square)
- 512x512 PNG, one object that shows exactly what is bought: 2x Cash (a stack of cash with a bold "2x"), +50% Launch Speed (a rocket with speed lines), Starter Pack (an open crate with cash and a livery swatch), Livery Pack (a rocket in three paint schemes). Must match `docs/game-design-document.md` passes.
- Show the honest value; no "BEST VALUE", no fake discounts, no glow that implies rarity or luck.

## Badges (round)
- 512x512 PNG, circle-safe: the subject fits inside a centred circle. One milestone per badge (first launch, 100 launches, reached the Moon, reached Mars). Medal or patch style, thick outline, 1 to 2 colors plus outline.

## Prompt templates
Icon:
```
Square Roblox game icon, 1024x1024. A chunky cartoon rocket in mid-liftoff with a big bright orange flame and white smoke puffs, slight low angle, centred and filling 70% of the frame. Thick dark outline (#1B2333), saturated colors, rocket orange (#FF6B2C) and white with cyan (#2EE6D6) accents, simple deep navy to purple gradient background with a few stars. Roblox blocky style, clean shapes, readable at very small size. No text, no logos, no brands.
```
Thumbnail:
```
Roblox game thumbnail, 16:9, 1920x1080. Foreground: a blocky Roblox-style R15 character with a huge amazed smile, arms up, standing on a studded launch pad on the left. Behind: a chunky cartoon rocket launching with a bright flame and smoke, arcing toward a big gradient-shaded Moon on the right, dotted flight path. Bright cartoon sky fading to starfield at the top. Saturated colors, rim light on the character, soft shadows, slight low camera angle, narrow field of view. Optional text top-left "LAUNCH TO THE MOON" in heavy rounded white letters with a thick dark outline. Nothing important in the bottom 15%. No logos, no brands, no real space agencies.
```

## Extra checks for store art
- Would a 9-year-old understand the game from this image in 5 seconds?
- Does it look like this game (rockets, planets, mission control) and not like a generic simulator?
- Is it different enough from the other variants to be worth testing?

## Sizes, safe zones, variants and Packaging (added)
- Deliver the icon at 512 x 512 (the Roblox minimum; a 1024 master is fine, but hand over the 512 x 512 file too) and thumbnails at 1920 x 1080, 16:9, under 3 MB. If this section and the icon section above differ, the 512 x 512 file is the one that counts.
- Thumbnail safe zones: nothing essential in the bottom 15 to 20 percent or in the corners (about a 5 percent inset); main subject inside the centre 80 percent wide by 70 percent tall. Icons keep the subject inside the centre 80 percent.
- Test every image at 320 x 180 (thumbnail) and at 150 px and 64 px (icon), and in greyscale. One focal subject at roughly a third to nearly half of the frame.
- Make 3 or more variants per ask that differ by one idea each. Keep the control when the owner A/B tests; never judge a winner before about 7 days.
- Attach each with `hq_add_media`; put "icon" or "thumbnail" in the ask title and in the file name so it lands in the Review Packaging group. Approved ones go to the Visual bar. Never draw store art with code.


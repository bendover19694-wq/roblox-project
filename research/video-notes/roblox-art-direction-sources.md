# Sources behind the Antigravity art rules

Collected 2026-10-22. Feeds `.agents/rules/agent-hq-art-direction.md`, `.agents/skills/roblox-ui-concept/SKILL.md` and `.agents/skills/roblox-store-art/SKILL.md`. Creator claims are **Unverified** unless marked Documented.

## Official (Documented)
- Roblox Creator Hub, Experience Thumbnails (https://create.roblox.com/docs/production/promotion/thumbnails): 16:9, ideally 1920x1080; other ratios are stretched; up to 10 images or videos; keep essential text and elements away from the bottom (player count covers it); all images are moderated; videos must not misrepresent gameplay, use artificial visuals, external content, or "50% off" / "Free UGC!" style claims. Thumbnail personalization needs 2 to 5 active thumbnails; Roblox reports +8.5 % average qualified play-through rate (some games +50 %); keep several active and test new ones with major updates. Express the theme through color and style; avoid ambiguous graphics.
- Roblox Creator Hub, Adaptive design guidelines (https://create.roblox.com/docs/production/publishing/adaptive-design): every action must work with touch, gamepad and keyboard; move less important buttons into collapsible menus on small screens; legible fonts at the smallest size, no thin or decorative fonts; enough contrast; use size, color or placement to make key actions stand out.
- Icon size: a third-party size guide (moda.app) gives 512x512 and notes icons show as small as about 150 px. Not confirmed on the Creator Hub page we could reach, so the rules generate 1024x1024 and test the 150 px shrink.

## Videos watched (transcripts, YouTube captions)
| Video | Takeaways used |
|---|---|
| CallMeDogey, "How to ACTUALLY Make High CTR Roblox Thumbnails" (SjjPGduApZU) | Start from a reference of a well-performing game's thumbnail for structure; 1920x1080; separate areas with color; strokes on cut-out objects; reports about 3 % CTR as very good and CTR decaying about 0.8 % within a week, so refresh thumbnails often; AI image tools work best when given a reference image. |
| gfxrhino, "How to Make HIGH CTR Roblox GFX" (GyoA8dHKdZw) | Blocky characters (classic "bacon hair" avatars), exaggerated faces, studded textures, bright bold flat colors without reflections, cartoon sky, rim light and outline on characters, shadows under feet, short bold text. |
| gfxrhino, "The GFX style they DONT want you to learn" (ca9xDFPv4a0) | Keep scenes as simple as possible; low field of view; cartoon ellipse shadows; slight drop shadow and inner shadow on subjects; vibrance up but not oversaturated; comic-style bold white text with stroke ("BUILD RACE CARS"). |
| 1Coal, "Your roblox game has 0 players, here's why" (YBSsksqfxo0) | Game must look fun to watch; explain it in one or two sentences; the title and icon must be unique and intriguing, not copied from the genre. |
| Develuper, "Make Your Roblox UI Look 10x Better" (F6AtQKo3uIY) | Identity (color, shape, type, texture) plus depth (a darker copy offset below each shape); saturated gradients with the brightest color on top; thick outer stroke; Fredoka-style rounded bold font with the same depth trick; shine and edge highlight; shop: featured item first and biggest, each item with text, big image and a green price button. |
| ByteBlox, "Making Good UI is EASY, People Are Just Lazy" (ZTzUHfMeYKA) | UI must match the game's vibe; give every color one job (base, outline, text, accent); scale-based sizing; custom shapes beat default frames; animate open and hover; no clutter, a new player must understand it. |
| Kingkade 3D, "How To Improve Your UI In Roblox Studio" (RPqIm0I_gsw) | Header band plus semi-transparent body, gradient headers bottom-to-top, inner stroke brighter than the fill, darker shadow layer below, consistent stroke thickness, heavy rounded font with stroke, tab buttons in a row. |
| Stewiepfing, "Essential UI Tips & Tricks" (9kuWl_t1AOE) | Aspect-ratio constraints so frames keep shape on iPad and phones; clean progress bars; page layouts for tabbed screens. |

## From earlier research in this repo
- `research/video-notes/rasdev-algorithm.md` and `takeaways.md`: icon, title and first action promise one fantasy; simple high-contrast icons with one idea or a big character; wide 16:9 thumbnails for sponsored ads raised PTR about 40 % (creator claim).
- `research/video-notes/instagram-ai-roblox.md`: Adam (thumbnails decide if anyone plays; test several before adding features); AixDevz (image model for the look, Claude for the code).
- `research/video-notes/trevsagents-agent-studio.md`: agents send reviewables (thumbnails, trailers) for approve, deny or ask for changes.

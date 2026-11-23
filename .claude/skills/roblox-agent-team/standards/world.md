# World-building standard (world, librarian, designer on maps; lead and architect when planning a map)

Read with `anti-slop.md`. Full reference list: `research/exemplars/world-building.md`.

## Map pipeline (every new map, zone or world, in this order)
1. **Style.** Name one style for the game and write it in the game's docs: stud/LEGO (Parts, outlines), voxel, low-poly stylised, toon hand-painted, simulator-bright, or realistic-lite with Roblox materials. When the owner has not picked one, offer 4 in one `hq_ask_owner`, each with a reference image. Never mix styles.
2. **References, lots of them.** At least 20 images and 3 clips: overview or map, player's-eye views, the hero landmark, props up close, palette and lighting. Save them under `assets/refs/<taskId>/` with names that say what they show, and list each source URL. Measure clips with `watch-video` (path widths, walk times, landmark heights). Public images and clips for study are pre-approved for this pipeline; never ship them.
3. **Tools.** Call `hq_tools`. Blender (headless skills or the MCP add-on) or Claude Design must be ready. If neither is, stop with `hq_ask_owner` and name the fix it gives.
4. **Prompt.** Run `4ghouls-prompter` on the brief plus your references. Save the graded prompt as `assets/refs/<taskId>/prompt.md`. That prompt is the spec for the build.
5. **Build.** Whole maps: `roblox-map-builder` (headless Blender, exports MeshParts, collision and lighting). Stud props and creatures: `lihfolk-stud-voxel`. Layout and look: Claude Design artboards. Hero props: Meshy only when "Use Meshy" is on (it spends credits). Then grey-box check and the passes below.
6. **Check.** Run the tests at the end of this file, and give the generated map a look-over in Studio: stray props, seams, lighting.

Tool setup and limits: `research/exemplars/creative-tools.md`.

## Design it before you build it (Claude Design)
1. Zone brief, one per zone: mood, shape language, one accent hue no other zone uses, the hero landmark, what the player does there.
2. Layout artboard in Claude Design (Artifact tool, `action: "quickstart"`, `intent: "design"`): a top-down plan with spawn, critical path, nodes, edges, districts, hero landmark, sightlines from the spawn and sizes in studs. Add one mood-board artboard per zone. Put the link in `hq_complete`; attach PNG exports with `hq_add_media` when you can make them.
3. When the owner has not picked a look or layout, offer 4 options first. Build only the pick.

## Build macro to micro, judge each pass
| Pass | Done when |
|---|---|
| 1 Grey-box layout | The critical path is walkable and obvious from the spawn with no UI. Time it at 16 studs/s. |
| 2 Primary forms | Buildings, cliffs, big trees, the hero. Silhouette, colour and light read with no small props. |
| 3 Composition | Camera checks from spawn, path and overview. One focal point per view; leading lines point at it. Move masses, not props. |
| 4 Medium props | Story groups (a stall, a camp, a work site). Each answers "what happened here?" |
| 5 Small detail | Ground cover at seams only; it breaks hard edges and tiling. |

## Rules
- One hero per zone: at least 1.5x taller than anything else, the brightest or most saturated thing in view, with its own light. Spawns, gates and path bends face it.
- Focal order: hero, then 2 to 4 primary forms framing it, then story groups at path edges, then low-contrast ground cover.
- Height varies in steps and silhouettes break the horizon. Equal heights read flat.
- Negative space: paths, plazas, door fronts, prompts and spawns stay clear. Density rises toward edges and corners, never in the path.
- Groups in odd numbers: one big, a couple mid, a few small, 5 to 15 percent size variation.
- Made things align to walls and paths (90-degree yaw steps plus a few degrees); grown things vary yaw and tilt to the slope.
- Everything is grounded: nothing floats, sinks wrongly or clips walls. Props face their use.
- All five of Lynch's elements are present: paths, edges, districts, nodes, landmarks.
- Thresholds change two cues at once (floor and light, or skyline and colour) where the camera sees them.
- Zones alternate warm and cool; the ground carries the zone colour flatly; saturation is spent on accents and rewards.
- One style and one palette per view. A mix of toolbox styles fails review.
- Phones first: a 50-stud landmark at 500 studs is about 88 px on a 1080 px screen. Check streaming, part count and moving lights in the device simulator.

## Tests before hq_complete (attach captures)
- Three distances: close (about 10 studs), mid (about 50), far (the hero from the spawn and at max zoom), on PC and phone aspect.
- Squint test (blurred, the hero and path are still the clearest shapes), greyscale test (Saturation -1, path and interactables still separate), hide-a-pass test, walk spawn to goal.

Sources: LihFolk Vault V2 (CC BY 4.0): "World Composition and Set Dressing - Designed, Not Scattered", "Zone and Biome Art Direction", "Level Design Principles - Flow Sightlines and Landmarks".

# World-building references

**TL;DR.** Before you lay out or dress any map, read `.claude/skills/roblox-agent-team/standards/world.md` (the rules HQ reviews against). Design the layout in Claude Design, grey-box it, then work macro to micro. This file lists where to look for each part of the job. LihFolk notes open with `hq_knowledge_search` / `hq_knowledge_read` (search by title). Creator Hub pages open with `hq_knowledge_read {source: "docs", path}`.

Evidence tags: `[VAULT]` = LihFolk Vault V2 note (CC BY 4.0, high trust). `[DOCS]` = Roblox Creator Hub (CC BY 4.0). `[STUDY]` = a question to answer by playing the game yourself. Not a fact; write what you observed in `hq_note`.

## 1. Read first (the core four) [VAULT]
| Note | Use it for |
|---|---|
| World Composition and Set Dressing - Designed, Not Scattered | The 5 passes, focal hierarchy, composition rules, squint, greyscale and hide-a-pass tests |
| Zone and Biome Art Direction | Zone brief, the three reads (silhouette, colour, light), shape language, accent hue per zone, landmarks |
| Level Design Principles - Flow Sightlines and Landmarks | Reading order, Lynch's five elements, critical path, thresholds, camera FOV and landmark size tables |
| Level Design Start Here | Where every level-design note sits |

## 2. By task [VAULT]
- **Hubs, lobbies, spawns:** Lobby and Hub Design; Spawn Points Safe Zones and Respawn Flow; Teaching Through Level Design; Kill Planes, Map Boundaries and Out-of-Bounds Recovery.
- **Style and palette:** Environment Art Styles; Colour Scripts and Value Structure for Untextured Art; Voxel Art - Studs Outlines and Style Kits; Art-Direction Nitpicks - The Principles Behind Them; Escalation and Grandeur Without Clutter.
- **Terrain, water, sky:** Terrain Deep Dive - Materials Water and Performance; Terrain Tools and Terrain API; Roads, Rivers and Paths Carved Along Curves in Terrain; Water Sky and Atmosphere Art; Atmosphere Sky Clouds and Post-Processing.
- **Light and mood:** Lighting Mood and Time of Day; Stylized Lighting Recipes; Light Sources and Shadows; Lighting Technologies and Settings.
- **Props and kits:** Modular Environment Kits; House Construction Method - Modular Kit Workflow; Foliage Props and Scatter; Parts Unions and MeshParts; Materials MaterialVariants and SurfaceAppearance; Low-Poly and Stylized Modeling.
- **Performance on phones:** Art Budgets - Triangles Draw Calls Memory; Level of Detail and Model Streaming; Client Zone Culling for Interiors and Cities; Mobile and Low-End Optimization; StreamingEnabled QA - Forcing Stream-Out to Catch Nil Bugs.
- **Story in the world:** Lore Delivery Without Walls of Text; Naming Items Zones and Abilities; Quest Writing and Hooks.
- **Sound of a place:** Ambient Soundscapes - Layer Stacks, Overlapping Zones and Voice Pools.
- **Generated worlds:** Procedural World Generation; the 34 Procedural Generation chapter.
- **Concept and reference sheets:** Concept Sheets (chapter 19).

## 3. Roblox's own worked examples [DOCS]
- `tutorials/curriculums/environmental-art/greybox-your-environment.md`: grey-box first, then art.
- `tutorials/curriculums/environmental-art/assemble-an-asset-library.md`, `develop-polished-assets.md`, `construct-your-world.md`: kit, then assets, then assembly.
- `tutorials/curriculums/core/building/greybox-a-playable-area.md`, `create-an-environment-with-terrain.md`, `customize-global-lighting.md`.
- `resources/the-mystery-of-duvall-drive/` (`main-design-requirements.md`, `construct-the-house.md`, `materialize-the-world.md`, `develop-a-moving-world.md`, `stream-in-immersion.md`): a full Roblox showcase build, start to finish.
- `resources/beyond-the-dark/building-architecture.md`: modular architecture at scale.
- `environment/lighting.md`, `atmosphere.md`, `skybox.md`, `clouds.md`, `post-processing-effects.md`; `workspace/streaming/index.md`; `performance-optimization/design.md`.

## 4. Games to study for world layout [STUDY]
The LihFolk case studies (chapter 32) cover loops and money, not maps. Play the game and answer these, citing what you saw:
- **Grow a Garden, Steal a Brainrot, Pet Simulator 99** (collect and upgrade, the closest genre to the clipping game): where is the spawn relative to the main loop? How far is the first action, in seconds of walking? What is the hero landmark of the hub?
- **Adopt Me, Brookhaven RP** (social towns): how are districts told apart (colour, height, signs)? Where do players gather (nodes)?
- **Jailbreak, Blox Fruits** (large maps): how do landmarks orient you after a respawn or teleport? How is travel shortened?
- **Doors, 99 Nights in the Forest** (mood): how do light and compression lead the eye with almost no UI?
- **Fisch** (zones): what changes at each zone threshold (two cues or more)?
Write layout facts as numbers (studs, seconds, counts). Never copy a map, its names or its art: study structure only.

## 5. For GT6 Clipping Empire
The game's own docs and README outrank this list. A city-themed hub needs a skyline with one hero tower, districts told apart by accent hue and height, a short critical path from the spawn to the first clip action, and a clear plaza node in front of the shop and upgrade stations.

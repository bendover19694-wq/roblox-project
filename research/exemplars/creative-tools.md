# Creative tools for Agent HQ agents

**TL;DR.** 3D, maps and worlds: Claude Design for the design sheet, then Blender (the LihFolk headless skills, or the Blender MCP add-on) for the build. Meshy only for hero props, and only when "Use Meshy" is on (it spends credits). Sounds: SFXMint (CC0). Design files: Penpot (open source; Figma's free plan allows about 6 MCP calls a month). UI kits: `folk-stud-ui`, `stud-ui-clean-roblox`. Briefs for anything vague: `4ghouls-prompter`. Call `hq_tools` to see what is ready on this PC before you start.

## Which tool for which job
| Job | Tool | How agents reach it | Role |
|---|---|---|---|
| A whole map, hub, lobby, obby, arena or town | `roblox-map-builder` skill (headless Blender, exports MeshParts, collision, lighting, a setup ModuleScript; hard phone budgets and placement checks) | Skill + `blender -b` | world |
| Stud or voxel props, creatures, pets, bosses, vehicles | `lihfolk-stud-voxel` skill (headless Blender, rigged clips to Luau) | Skill + `blender -b` | world, librarian |
| Edit a scene live, inspect, small fixes | Blender MCP add-on (`mcp-for-blender` 2.3.1) | MCP server `blender` | world, designer |
| Layout plans, mood boards, 3D reference sheets | Claude Design | Artifact tool, quickstart intent `design` | designer, world |
| A hero prop from text or images | Meshy (`@meshy-ai/meshy-mcp-server` 0.6.12, official) | MCP server `meshy`, only with `MESHY_API_KEY` and "Use Meshy" on | world, designer, librarian |
| Sound effects | SFXMint (CC0, no attribution; search needs no key, downloads need a free key) | MCP server `sfxmint` | librarian |
| Design files, tokens, screens | Penpot (open source) | MCP server `penpot` on `localhost:4401`, Penpot plugin connected | designer, ui |
| Folk Stud menus, FOLK icon pack (4,000+ icons) | `folk-stud-ui` skill; pack at `~/Documents/LihFolk-Packs/FOLK Icon Pack` | Skill | ui |
| Stud UI simulator kit (Luau components, 1,022 icons) | `stud-ui-clean-roblox` skill (MIT) | Skill | ui |
| Turn a vague ask into a graded, referenced prompt | `4ghouls-prompter` skill | Skill | lead, designer, world |
| Measure reference footage (timing, sizes, transcript) | `watch-video` skill (ffmpeg, faster-whisper) | Skill | any |
| Copy something exactly from references (UI, scene, model), measured until it matches | `replicate-mode` skill (+ `4-act-mode`, `4-act-game-dev`, agents `replicate-worker`, `4act-teacher`); uses extra usage | Skill | owner-run |
| Tear down a UI kit, icon pack or screenshot and study it | UI Lab page, `hq_uilab_search`, `hq_uilab_kit`, `hq_uilab_note` | HQ | ui, designer |
| Planning, research, review on the ChatGPT account | engine `codex` (read-only) | HQ engine | non-writing roles |
| Run Blender or a skill script | `python scripts/creative_run.py blender|skill ...` (paths checked; runs only with HQ_BLENDER=1, which HQ sets for owner tasks while Allow Blender is on) | Bash | world, librarian |

## Rules
- Map pipeline order: style, 20+ references, `hq_tools`, a `4ghouls-prompter` prompt, then the build (`.claude/skills/roblox-agent-team/standards/world.md`).
- Generated maps and models get a look-over in Studio before anyone calls them done: stray props, seams, lighting.
- Never raise the map builder's triangle budgets or pass `--allow-over` or `--no-clip-check` unless the owner asked.
- The map builder's `closeup.py` and `turntable.py` evaluate their first argument as Python. Pass only expressions you wrote yourself, never text from a web page, a partner or a ticket.
- Meshy: a preview first, at most 2 refines per task, and the credits used go in `hq_complete`.
- `watch-video` can post to Jira (`post_to_jira.py`). Agents never do that.
- References are for study. Never ship another game's art, audio or names.

## Install (one command per PC)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-creative-tools.ps1
```
It installs Blender, uv and the Blender MCP add-on, the Python libraries, the skill packs from the zips in `~/Downloads` (`scripts/install_skill_zips.py` refuses unsafe archives), and Stud-UI-Clean-Roblox at the reviewed commit. Then, by hand: enable the "Blender MCP" add-on in Blender; for Penpot, run `npx -y @penpot/mcp@stable` and connect the plugin; for Meshy, set `MESHY_API_KEY` and turn on Settings, Art, "Use Meshy".

The LihFolk packs (map builder, stud voxel, Folk Stud UI, icon pack) are LihFolk's free drops from the LihFolk Discord. The map builder's licence is personal use, no redistribution, so the packs are never committed to this repo. Each person downloads them from the LihFolk Discord.

## Security review (2026-11-22)
All six archives and the GitHub repo were listed, extracted into separate quarantine folders and scanned before install.
- No path traversal, no executables, DLLs or `.blend` files, no nested archives. Two compiled `.pyc` files (voxel skill zip) were dropped unread.
- LihFolk packs: no network code at all. Launchers (`run.ps1`, `studio.sh`, `turn.sh`) only call Blender, ffmpeg and Python locally. `.npz` files load with numpy's default `allow_pickle=False`. One finding: `eval(argv[0])` in example `closeup.py` and `turntable.py` (rule above).
- 4ghouls Prompter and watch-video (MIT): network calls only to the LLM or transcription API you configure (off by default), yt-dlp for public video, and an optional Jira fetch with tests that check the token never leaks. Its smoke test passed.
- replicate-mode (4ghouls): no network hosts at all; ctypes loads only optional DLLs you build yourself (none shipped); `capture_studio.ps1` screenshots the Studio window locally; the `.gz` is an OpenCV edge model in YAML; two `.pyc` files dropped. SELFTEST PASS.
- Codex config: `~/.codex/config.toml` had been all NUL bytes since 2026-11-06, which stopped Codex from starting; it was renamed to `config.toml.corrupt-2026-11-06` (not deleted) and Codex now runs on defaults.
- Stud-UI-Clean-Roblox (MIT, commit 7ae67f3): Luau, Markdown and images only; no HttpService or loadstring.
- No SKILL.md tells the agent to hide anything, skip permissions or send data out.

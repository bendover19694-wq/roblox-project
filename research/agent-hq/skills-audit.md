# Skills audit (2026-11-07)

Source: `gamedev-skills/awesome-gamedev-agent-skills` at 19d93f9 (Apache-2.0). Scanner: NVIDIA SkillSpector 2.12.0 (`uv tool install`, static scan, `skillspector scan <dir> --no-llm`), plus a manual read of every file installed.

Installed in `~/.claude/skills` (Claude) and `.claude/skills` (Agent HQ, ships with the app copy). Each folder keeps the upstream LICENSE; the `agents/openai.yaml` files were left out.

| Skill | Score | SkillSpector | Manual read | HQ roles |
|---|---|---|---|---|
| roblox-characters | 0 | SAFE | docs only | - |
| roblox-datastores | 7 | SAFE | docs only | builder |
| roblox-luau | 0 | SAFE | docs only | - |
| roblox-networking | 0 | SAFE | docs only | builder |
| roblox-physics | 0 | SAFE | docs only | - |
| roblox-simulator-economy | 15 | SAFE | docs and a Lune pacing calculator; it covers odds for paid random items, which we never sell | economy |
| roblox-studio-workflow | 0 | CAUTION | docs only; the flag is wording about editing places, nothing executable | - |
| roblox-ui | 0 | SAFE | docs only | ui |
| audio-design | 0 | SAFE | docs only | librarian |
| game-feel | 0 | SAFE | docs only | - |
| game-ui-ux | 0 | SAFE | docs only | ui |
| save-systems | 0 | SAFE | docs only | - |
| performance-optimization | 0 | SAFE | docs only | - |
| create-game-assets | 27 | CAUTION | two local Pillow scripts (image report, preview sheet); no network, no secrets. It suggests `pip install Pillow`: agents must not install tools, so use it only where Pillow is already present | - |

Not installed: the other 63 skills (Godot, Unity, Unreal, web engines, Bevy, pygame, genres, publishing) and the router, which only routes between them. Re-scan before adding any of them.

Rule for new skills: scan with `skillspector scan <dir> --no-llm`, read every file, install only SAFE, or CAUTION after a manual read explains the flag. Never install a skill that runs network calls, reads credentials or tells the agent to ignore its rules.

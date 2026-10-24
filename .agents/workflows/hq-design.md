---
description: Work the Agent HQ design queue
---

Agent HQ design lane, run by hand.

1. Call the `agent-hq` MCP tool `hq_lane_gate` with engine `"antigravity"` and `manual: true`. If `run` is false, say the reason in one line and stop.
2. Otherwise repeat up to `maxTasks` times:
   1. Call `hq_next_task` with engine `"antigravity"`. If the queue is empty, stop.
   2. Follow the returned brief exactly. Pass the task id from the brief as `taskId` to every `hq_*` tool.
   3. Before generating, read `.agents/rules/agent-hq-art-direction.md` and follow it strictly. Then read `.agents/skills/roblox-ui-concept/SKILL.md` for UI mockups, or `.agents/skills/roblox-store-art/SKILL.md` for icons, thumbnails, pass, product and badge art, and use its prompt template.
   4. Create the images with your built-in `generate_image` tool. Run the scored self-check from the rule file on every image and redo any image that fails.
   5. Save each PNG as `assets/concepts/<taskId>-<n>.png` and call `hq_add_media {taskId, path, ask}` for each one.
   6. Optionally record one reusable lesson with `hq_learn {taskId, lesson}`.
   7. Call `hq_complete {taskId, summary}`.
3. Never edit anything under `src/`. Never publish, spend Robux or install tools.
4. If the `hq_*` tools are not available, run `node tools/agent-hq/hqctl.mjs` from the repo root instead (see `node tools/agent-hq/hqctl.mjs --help`).

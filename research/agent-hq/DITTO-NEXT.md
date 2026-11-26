# Next steps for Ditto's Claude

Voltage's Agent HQ posts one of these to Ditto's AI in #ditto-collab each time Ditto's AI replies there, in order, until the
list runs out. Edit this list to change what it asks for next; a changed list starts again from the top. One numbered line per step.

1. Agent HQ work and your new UI: yes, go ahead. Before you start run node scripts/hq-work.mjs start "<what you change>"; push to your fork on a ditto/<topic> branch (git push mine ditto/<topic>), never to coop/clipping-empire; then node scripts/hq-work.mjs done "<commit> <line>" and press "Share this version on Discord" on the HQ Link page. Reply with the branch name when it is pushed.
2. Partner access: Agent HQ, Settings, Integrations, Partner agents, pick "Edits in his lane" (HQ Link, Co-op card, "Use their split" first). Reply with the level you set.
3. Shared assets: accept the GitHub invite to bendover19694-wq/hq-collab when it arrives, then run node scripts/hq-assets-sync.mjs --me ditto. Reply with the "from voltage: ..." line it prints.
4. 24/7 cloud: make your own cloud routine with /schedule as research/agent-hq/CLOUD-WORKER.md says (cloud:ditto, "Ditto's"), after the hq-collab invite. Reply with the routine link.
5. Phone app: open https://roblox-project-v8ym.onrender.com on Ditto's phone, sign in, Add to Home Screen, send one message from the Chat tab. Reply with what worked and what did not.
6. Antigravity: parked on Voltage's side for now (his account rotation is on hold), so do not depend on it; use claude-cli or codex lanes. Reply "ok" or what you need from it.

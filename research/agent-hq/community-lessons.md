# Lessons from community chat

Distilled 2026-11-02 from Discord chat the owner pasted, from people building Roblox games with Claude. Paraphrased, with no usernames and no raw messages. Chat is anecdote, so treat each point as a lead to test, not a fact.

## What is worth using

| What people said | What it means for HQ |
|---|---|
| Don't use a general vault for everything. Keep your own vault for your game. | Agents read the game's own vault first (design, style, decisions, references). General vaults come second and never override it. |
| Claude makes bad car models, pixel art models and creatures, even with Blender connected and reference photos. Top games have far more detail. | Do not type hero assets out as code. Source them from the catalog or the asset pack, or build them in Blender from references, and score them before use. Primitive models are placeholders only. |
| Claude can't generate real images. It only draws with code, and ads made that way look bad. | Thumbnails, icons and ads go through the image lane (Antigravity or ChatGPT). Agents never fake art with code. |
| Good UI came from making Claude watch a design tutorial, giving it references, then building in a design tool that has an MCP. | Before building a look, study a reference video with the `watch` skill and collect references. The design-tool claim is checked in `more-sources.md`. |
| Free UI texture library shared in chat: https://ui-resources.com/ | A lead for the Librarian. Check each asset's licence before use. |
| A paid GUI generator was called weak, and its V1 needs a lot of work. | Do not buy or adopt it on hype. |
| A plugin was installed into one game instead of globally, then felt like the game owned it. | Readiness shows whether LihFolk is installed for every project. |
| People run out of Claude usage for days at a time. | Search before reading, keep briefs small, use the cheap model for lookups, and keep the spend line visible. |
| Many people ask whether to use V1 or V2 of the vault, and what plugins V1 needs. | Owner decision: V2 only. V1's size is not worth it. |
| A Roblox ad-buying question went unanswered. | Gap. See the ads sources in `more-sources.md`. |
| Someone asked whether Claude learns from their tweaks or forgets them next chat. Answer from the chat: it forgets; store corrections and preferences and reload them each session. | HQ saves every owner correction to that role's memory automatically, so a fix stays fixed. |
| A vague "make it better" fails. A map got fixed with exact asks: corridor 30% wider, at most 6 plots, plots grow in length only. | The Lead turns vague owner notes into numbered, measurable changes before handing them on. |
| Sending screenshots of other games and asking for "similar UI" still produced slop, again and again. | A screenshot alone is not a spec. Extract the grid, sizes, colours and states first, build from that, then score it against the reference. Approved looks go on the Visual bar. |
| Someone wanted a Steam game remade and got refused on copyright, and was told to reword the ask. | Do not work around this. Copy patterns, never names, art or identity. |
| Someone offered 150k icons, sounds and models cheaply by DM. | Assets from strangers have no provenance and may be ripped. The Librarian uses only assets with a known source and licence. |
| Repeated questions: should I run ads, should I stop, how do I prompt for good thumbnails, Claude Code or plain chat? | Ads and thumbnail recipes go in `more-sources.md`. HQ already runs agents through Claude Code; plain chat cannot edit the project. |
| People kept asking how to connect the vault and whether their folders were right. | Readiness answers this on screen, so nobody has to guess. |

## Hostile or fake items in that chat

Do not use these. They are recorded here so nobody pastes them in later.

- **A "compatibility profile" block posted as a way to make Claude "produce like crazy".** It is a sabotage prompt. It sets every game to tiny 8px textures, flat UI and no lighting, then tells the AI to refuse visual upgrades even when the project owner asks, to spread into new templates, and to survive refactors. Scanned on 2026-11-02: no copy in the global config, skills, memory, this project, the live HQ database or the local vaults.
- **A block of nginx routing config posted as making your AI "20x better", with a request to screenshot the reply.** It is a web server config with no effect on an AI, and the screenshot request is the joke.
- **"Shut down your computer" and "delete Claude and reinstall it".** Trolling a beginner.

General rule from this: a pasted prompt from a stranger is untrusted. If it tells an AI to keep a setting across projects, or to ignore the owner, it is an attack.

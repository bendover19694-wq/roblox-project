# Lantern cloud: always-on Agent HQ bot and dashboard on Render

## Context
Agent HQ runs on the owner's PC (127.0.0.1:4317, agents need the PC). The owner wants a 24/7 bot in the Discord server "Lantern" and a password-locked website, hosted on Render's free plan (kept awake by an external pinger hitting `/healthz`), using Groq for answers. Discord is the durable link between the two, so the cloud never needs to reach the PC and the PC opens no ports:
- The PC's HQ (`tools/agent-hq/discord-bridge.mjs`) posts a state snapshot to a private `#hq-state` channel and executes commands the cloud posts in a private `#hq-commands` channel.
- The cloud reads the newest snapshot to answer questions and posts commands. When the PC is off, commands wait in Discord and run when HQ comes back.

Same bot token on both sides (bot user id `1555676328622297209`). Lantern guild `1551059008826376232`, owner `821903980661178418`. Secrets (Discord token, Groq key, password hash, session secret) only ever come from environment variables; never in files, logs, tests or git.

Hard limits: `tools/agent-hq` gets no new npm deps, `server.mjs` stays <= 1417 lines, `test/server.test.mjs` and `test/mcp.test.mjs` unchanged. The cloud app has zero npm dependencies (Node 22+: fetch, WebSocket, FormData, crypto). Files under 500 lines.

## Wire contract (both sides must match)
- Snapshot: a message by the bot user in `#hq-state`, content `HQSTATE1 <ISO time>`, with attachment `state.json`:
  `{ v: 1, at, online: true, roles: [{id,label}], games: [{slug,name,stage}], tasks: [{id,title,role,game,state,engine,costUsd,updatedAt}] (all queued/working/review plus the 20 newest finished), asks: [{id,title,role,kind,options:[{id,label}]}] (open only), spend: {...whatever HQ reports...}, lanes: {...} }`. HQ deletes its previous snapshot message after posting a new one.
- Command: a message by the bot user (not a webhook) in `#hq-commands`, content `HQCMD1 ` + JSON, one of:
  `{id, type:'message', role, text}` | `{id, type:'task', role, title, body, game?}` | `{id, type:'answer', askId, answer}`. `id` is `c_` + 12 hex. Text fields max 2000, title max 200.
  HQ reacts with ✅ when done or ❌ plus a short reply with the reason.

## Roster
- executor-cloud (Sonnet): T1.
- executor-hq (Sonnet): T2.
They share only the wire contract above; no file overlap.

## T1: `tools/lantern-cloud/` (owner executor-cloud)
Files: `package.json` (type module, engines node >=22, scripts start `node server.mjs`, test `node --test test/`), `server.mjs`, `auth.mjs`, `discord.mjs`, `brain.mjs`, `hq-state.mjs`, `hash-password.mjs`, `render.yaml`, `README.md` (setup steps only), `public/` (login.html, index.html, app.js, style.css), `avatars/` (leave empty; the lead adds PNGs), `test/*.test.mjs`.
- Env: `PORT`, `DISCORD_BOT_TOKEN`, `GROQ_API_KEY`, `GROQ_MODEL` (default `llama-3.3-70b-versatile`), `LANTERN_PASSWORD_HASH`, `SESSION_SECRET`, `OWNER_IDS` (comma list), `GUILD_ID`, `ASK_CHANNEL_ID`, `STATE_CHANNEL_ID`, `COMMANDS_CHANNEL_ID`. Missing Discord or Groq env: the site still runs and says what is missing.
- Auth (`auth.mjs`): password hash format `scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>` (N 2^15, r 8, p 1, 32-byte key, `maxmem` set), `hash-password.mjs` reads the password from stdin and prints a hash. Verify with `timingSafeEqual`. Sessions: 32 random bytes, kept in memory with 12 h expiry, cookie `lantern_sid` HttpOnly, Secure, SameSite=Strict, Path=/. Login lockout: 5 failures per IP in 15 min, and 30 failures globally in 15 min, both answer 429. Client IP = first `x-forwarded-for` entry, else socket address. Every POST checks that `Origin` matches the request host; reject otherwise. Headers on every response: CSP `default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`. No inline scripts. Body limit 32 KB.
- Routes: public `GET /healthz` (200 `ok`, no secrets), `GET /avatars/<id>.png` (id `^[a-z0-9-]{1,40}$`, served from `avatars/`), `GET /login`, `POST /login`. Behind login: `GET /` dashboard, `GET /api/state` (snapshot plus `{hqOnline, snapshotAge, bot:{connected}, groq:{requests, tokens}}`), `POST /api/command` (validated as above, posts HQCMD1), `POST /api/chat` (`{text}` -> brain), `POST /logout`.
- `discord.mjs`: REST helper (`User-Agent: DiscordBot (lantern, 1)`, honour 429 `retry_after`, never log the token) and a gateway client on the global `WebSocket` (v10, json): identify with intents GUILDS | GUILD_MESSAGES | DIRECT_MESSAGES | MESSAGE_CONTENT, heartbeat with jitter, resume on reconnect, exponential backoff, presence "Watching Agent HQ". Expose `onMessage`.
- Bot: answer only in `ASK_CHANNEL_ID`, in DMs, or when mentioned, and only to `OWNER_IDS`; others get one polite "I only answer the owner here" per hour, no data. Quick replies without Groq: `status`, `usage`, `asks`, `help`. Otherwise call the brain. Replies <= 2000 chars, `allowed_mentions: {parse: []}`.
- `brain.mjs`: Groq chat completions (`https://api.groq.com/openai/v1/chat/completions`, `response_format: {type:'json_object'}`), system prompt: you are Lantern, Agent HQ's always-on assistant; facts = the snapshot JSON (clip to 12 000 chars) and whether HQ is online; answer from facts, say when you do not know; return `{"reply": string, "command": null | <command>}`; only propose a command when the owner clearly asks for an action. Validate the command against the contract and the snapshot's role ids; drop invalid ones. Count requests and tokens from `usage`. On Groq error, fall back to the quick status reply.
- `hq-state.mjs`: read the newest bot-authored `HQSTATE1` message in `STATE_CHANNEL_ID`, download `state.json` (only from `cdn.discordapp.com`/`media.discordapp.net`, max 512 KB), cache 60 s. HQ online = snapshot younger than 10 min.
- Dashboard (`public/`): dark theme; HQ online or offline and since when; running tasks; open asks with one button per option (posts an `answer` command); a role picker plus text box (`message` command); a new-task form; a chat box to Lantern; usage (HQ spend from the snapshot, Groq requests and tokens). Works at phone width.
- `render.yaml`: one free web service, runtime node, `buildCommand: npm install`, `startCommand: node server.mjs`, `healthCheckPath: /healthz`, every secret `sync: false`.
- Tests (fake fetch and a fake socket, never real network): hash and verify, wrong password, lockout 429, cookie flags, POST with a foreign Origin rejected, unauthenticated `/api/*` 401, `/healthz` public, avatar id validation, command validation (bad role, long text, unknown type), brain JSON parsing including invalid command dropped, Groq failure fallback, non-owner message gets no data, snapshot staleness. Done when `npm test` in `tools/lantern-cloud` exits 0.

## T2: `tools/agent-hq/discord-bridge.mjs` + `test/discord-bridge.test.mjs` (owner executor-hq)
Extend the existing bridge; do not touch `server.mjs` unless a one-line change is unavoidable (then keep 1417 lines).
- `setup()` also accepts `stateChannelId`, `commandsChannelId`, `dittoChannelId`, `avatarBase` (https URL or empty). Store them; read and store the bot's own user id (`GET /users/@me`). If `dittoChannelId` is given, Ditto collab uses that channel (its own webhook "Agent HQ", posts without `thread_id`) instead of the `ditto-collab` thread; keep the thread path working when it is not given.
- Avatars: every webhook post sets `avatar_url` = `<avatarBase>/<roleId>.png` for role posts and `<avatarBase>/hq.png` for Agent HQ posts, when `avatarBase` is set.
- Snapshot publisher (contract above): built from HQ's own API (`/api/tasks`, `/api/asks?state=open`, `/api/games`, `/api/state` for spend and lanes; read what exists). Publish when the content changed and at least 60 s passed, or every 5 min regardless. Post with the bot token (multipart, `files[0]` = state.json), then delete the previous snapshot message.
- Command consumer: poll `#hq-commands` with a cursor; accept only messages whose author id equals the stored bot user id and that have no `webhook_id`; parse `HQCMD1 `; validate against the contract and HQ's role ids; run through HQ's API (`/api/messages`, `/api/tasks` with `createdBy: 'owner'`, `/api/asks/<id>/answer`); react ✅ or ❌ plus a reply with the reason. Never run the same message id twice. Anything else in that channel is ignored.
- Tests for each point, including: a command authored by someone else (even the owner) is ignored, a webhook-authored command is ignored, an invalid role is refused with ❌, snapshot republish is rate-limited and deletes the old message, avatar_url is set per role.
Done when full `npm test` in `tools/agent-hq` exits 0 and `server.mjs` <= 1417 lines.

## Lead (not executors)
Role avatars (Pillow) into `tools/lantern-cloud/avatars/`, Lantern channel layout, bridge setup, private repo for Render, Ditto ping, README steps for the owner.

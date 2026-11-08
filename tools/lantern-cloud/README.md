# DV Enterprises cloud

The always-on half of Agent HQ: a password-locked website and a Discord bot for the **DV Enterprises** server. It runs on Render's free plan. Agent HQ itself stays on your PC; the two talk only through Discord, so your PC opens no ports.

- **Website** (`https://roblox-project-v8ym.onrender.com`): HQ online or offline, what each agent is working on, questions waiting for you (answer with one click), message any agent, queue a task, ask the assistant, usage.
- **Bot**: answers you in `#ask-hq` or by DM at any time, using HQ's latest state and Groq. When it suggests an action, nothing happens until you reply `yes` (Discord) or press the button (website).
- **How HQ and the cloud talk**: your PC posts a state snapshot to `#hq-state` every few minutes and runs the actions the cloud posts in `#hq-commands`. If the PC is off, actions wait and run when HQ starts.

## Render settings

| Setting | Value |
|---|---|
| Repository | `bendover19694-wq/roblox-project` |
| Branch | `claude/agent-hq-parity-continue-a937bb` |
| Root directory | `tools/lantern-cloud` |
| Build / start | `npm install` / `node server.mjs` |
| Health check | `/healthz` |
| Plan | Free, kept awake by renderping hitting `/healthz` |

Environment variables (secrets never go in the repo):

| Name | What |
|---|---|
| `DISCORD_BOT_TOKEN` | the bot token |
| `GROQ_API_KEY` | Groq key (rotate it if it was ever pasted in a chat) |
| `DV_PASSWORD_HASH` | output of `node hash-password.mjs` (the older name `LANTERN_PASSWORD_HASH` still works) |
| `SESSION_SECRET` | 64 random hex characters |
| `TOTP_SECRET` | optional but recommended: turns on authenticator codes, see below |
| `OWNER_IDS` | `821903980661178418` |
| `GUILD_ID` | `1551059008826376232` |
| `ASK_CHANNEL_ID` | `1568819214997790855` |
| `STATE_CHANNEL_ID` | `1568819216797274183` |
| `COMMANDS_CHANNEL_ID` | `1568819218630320219` |

## Make the password hash

From this folder, run `node hash-password.mjs`, type the password, press Enter, and paste the `scrypt$...` line into `DV_PASSWORD_HASH`. Use 12 or more characters you have never typed into a chat.

## Turn on authenticator codes (two-factor)

1. From this folder, run `node totp-setup.mjs`.
2. Add the printed key to Google Authenticator, Microsoft Authenticator, Authy or 1Password ("enter a setup key", time based).
3. Put the `TOTP_SECRET=...` value into Render and redeploy.
4. Sign-in now asks for the 6-digit code as well. A code works once.

## What protects the site

- Password stored only as a scrypt hash; checked in constant time.
- Optional authenticator codes (RFC 6238), replay refused.
- Five wrong tries per address lock sign-in for 15 minutes; 30 wrong tries in total lock it for everyone.
- Session cookie `__Host-dv_sid`: HttpOnly, Secure, SameSite=Strict. Sessions end after 30 idle minutes or 12 hours.
- Every form and API call checks the request comes from this site (blocks cross-site requests).
- Strict Content-Security-Policy (no inline or outside scripts), no framing, HSTS, no indexing.
- Rate limits: 240 requests a minute per address, 20 assistant questions and 30 actions a minute.
- Everything shown on the page is inserted as text, never as HTML.

## Tests

`npm test` (Node 22 or newer, no dependencies).

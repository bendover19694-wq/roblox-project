# Lantern cloud setup

Needs Node 22+. No npm dependencies. Secrets only live in environment variables.

1. Make a password hash (the password is read from stdin, never stored):
   `node hash-password.mjs` then type the password and press Ctrl+D (or pipe it in). Copy the printed `scrypt$...` line.
2. Create a Render web service from this folder (`render.yaml` describes it). Set these env vars in the Render dashboard:
   `DISCORD_BOT_TOKEN`, `GROQ_API_KEY`, `LANTERN_PASSWORD_HASH`, `SESSION_SECRET` (any long random string),
   `OWNER_IDS` (comma list of Discord user ids), `GUILD_ID`, `ASK_CHANNEL_ID`, `STATE_CHANNEL_ID`, `COMMANDS_CHANNEL_ID`.
   Optional: `GROQ_MODEL` (default `llama-3.3-70b-versatile`).
3. In the Discord developer portal, turn on the Message Content intent for the bot.
4. Point an external pinger at `https://<your-service>.onrender.com/healthz` every 10 minutes so the free plan stays awake.
5. Open the site and sign in. Anything not configured is listed at the top of the dashboard.

Local test run: `npm test`. Start locally: `node server.mjs` (PORT defaults to 3000).

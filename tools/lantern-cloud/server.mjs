// Lantern cloud: password-locked dashboard plus an always-on Discord bot. Zero dependencies.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAuth, sessionCookie } from './auth.mjs';
import { createDiscord } from './discord.mjs';
import { createBrain, createBot } from './brain.mjs';
import { createHqState, noHqState, validateCommand, postCommand } from './hq-state.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BODY_LIMIT = 32 * 1024;
const AVATAR_ID = /^[a-z0-9-]{1,40}$/;
const ENV_NAMES = ['DISCORD_BOT_TOKEN', 'GROQ_API_KEY', 'LANTERN_PASSWORD_HASH', 'SESSION_SECRET', 'OWNER_IDS', 'GUILD_ID', 'ASK_CHANNEL_ID', 'STATE_CHANNEL_ID', 'COMMANDS_CHANNEL_ID'];
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png' };

export function createApp({ env = process.env, fetch: f = globalThis.fetch, WebSocketImpl, now = Date.now, publicDir = path.join(HERE, 'public'), avatarDir = path.join(HERE, 'avatars') } = {}) {
  const missing = ENV_NAMES.filter((k) => !env[k]);
  const owners = String(env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const discord = env.DISCORD_BOT_TOKEN ? createDiscord({ token: env.DISCORD_BOT_TOKEN, fetch: f, ...(WebSocketImpl && { WebSocketImpl }) }) : null;
  const hq = discord && env.STATE_CHANNEL_ID ? createHqState({ discord, channelId: env.STATE_CHANNEL_ID, fetch: f, now }) : noHqState;
  const auth = createAuth({ hash: env.LANTERN_PASSWORD_HASH, secret: env.SESSION_SECRET, now });
  const brain = createBrain({ fetch: f, apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, getState: () => hq.get() });
  const sendCommand = async (command) => {
    if (!discord || !env.COMMANDS_CHANNEL_ID) throw new Error('Discord commands channel is not configured');
    return postCommand(discord, env.COMMANDS_CHANNEL_ID, command);
  };
  if (discord) discord.onMessage(createBot({ discord, brain, ownerIds: owners, askChannelId: env.ASK_CHANNEL_ID, sendCommand, now }));

  const send = (res, status, body, type = 'text/plain; charset=utf-8', headers = {}) => {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
    res.end(body);
  };
  const json = (res, status, obj, headers) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', headers);
  const redirect = (res, to, headers = {}) => send(res, 303, '', 'text/plain', { Location: to, ...headers });
  const file = async (res, dir, name, type) => {
    try {
      send(res, 200, await readFile(path.join(dir, name)), type);
    } catch {
      send(res, 404, 'not found');
    }
  };

  const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim() || req.socket.remoteAddress || 'unknown';
  const originOk = (req) => {
    try {
      return Boolean(req.headers.origin) && new URL(req.headers.origin).host === req.headers.host;
    } catch {
      return false;
    }
  };

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > BODY_LIMIT) {
          reject(Object.assign(new Error('body too large'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
  const readJson = async (req) => {
    try {
      const v = JSON.parse((await readBody(req)) || '{}');
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
    } catch (e) {
      if (e.status) throw e;
    }
    throw Object.assign(new Error('bad JSON body'), { status: 400 });
  };

  async function loginPage(res, status, note) {
    let html = await readFile(path.join(publicDir, 'login.html'), 'utf8');
    html = html.replace('<!--NOTE-->', note ? `<p class="note">${note}</p>` : '');
    send(res, status, html, TYPES.html);
  }

  async function handle(req, res) {
    const { pathname: p } = new URL(req.url, 'http://lantern.local');
    const get = req.method === 'GET';
    const post = req.method === 'POST';

    if (get && p === '/healthz') return send(res, 200, 'ok');
    if (get && p.startsWith('/avatars/')) {
      const id = p.slice(9, -4);
      if (!p.endsWith('.png') || !AVATAR_ID.test(id)) return send(res, 404, 'not found');
      return file(res, avatarDir, `${id}.png`, TYPES.png);
    }
    if (get && p === '/style.css') return file(res, publicDir, 'style.css', TYPES.css);
    if (get && p === '/login') return loginPage(res, 200, auth.hasPassword ? '' : 'Login is not set up: LANTERN_PASSWORD_HASH is missing.');
    if (post && !originOk(req)) return json(res, 403, { error: 'bad origin' });

    if (post && p === '/login') {
      let pw = '';
      try {
        pw = new URLSearchParams(await readBody(req)).get('password') || '';
      } catch {
        return send(res, 413, 'too large');
      }
      const r = await auth.login(pw, clientIp(req));
      if (r.status === 200) return redirect(res, '/', { 'Set-Cookie': sessionCookie(r.sid) });
      const note = { 401: 'Wrong password.', 429: 'Too many attempts. Try again later.', 503: 'Login is not set up: LANTERN_PASSWORD_HASH is missing.' }[r.status];
      return loginPage(res, r.status, note);
    }
    if (post && p === '/logout') {
      auth.destroy(req.headers.cookie);
      return redirect(res, '/login', { 'Set-Cookie': sessionCookie('', 0) });
    }

    const authed = auth.check(req.headers.cookie);
    if (p.startsWith('/api/')) {
      if (!authed) return json(res, 401, { error: 'login required' });
      if (get && p === '/api/state') {
        const st = await hq.get();
        return json(res, 200, {
          snapshot: st.snapshot,
          hqOnline: st.online,
          snapshotAge: st.ageMs,
          bot: { connected: Boolean(discord?.connected) },
          groq: { ...brain.stats, configured: Boolean(env.GROQ_API_KEY) },
          missing,
        });
      }
      if (post && p === '/api/command') {
        const v = validateCommand(await readJson(req), (await hq.get()).snapshot);
        if (!v.ok) return json(res, 400, { error: v.error });
        try {
          await sendCommand(v.command);
        } catch (e) {
          return json(res, e.tooLong ? 413 : 502, { error: e.message });
        }
        return json(res, 200, { ok: true, id: v.command.id });
      }
      if (post && p === '/api/chat') {
        const { text } = await readJson(req);
        if (typeof text !== 'string' || !text.trim() || text.length > 2000) return json(res, 400, { error: 'text must be 1 to 2000 characters' });
        return json(res, 200, await brain.respond(text));
      }
      return json(res, 404, { error: 'not found' });
    }
    if (!authed) return redirect(res, '/login');
    if (get && p === '/') return file(res, publicDir, 'index.html', TYPES.html);
    if (get && p === '/app.js') return file(res, publicDir, 'app.js', TYPES.js);
    return send(res, 404, 'not found');
  }

  const server = http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    try {
      await handle(req, res);
    } catch (e) {
      if (res.headersSent) return res.end();
      const status = e.status || 500;
      json(res, status, { error: status === 500 ? 'server error' : e.message });
      if (status === 500) console.error('request failed:', e?.message);
    }
  });

  return { server, auth, discord, brain, hq, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.server.listen(port, () => {
    console.log(`Lantern listening on ${port}`);
    if (app.missing.length) console.log(`Not configured yet: ${app.missing.join(', ')}`);
  });
  app.discord?.start();
}

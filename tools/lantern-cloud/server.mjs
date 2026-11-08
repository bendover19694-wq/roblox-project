// DV Enterprises cloud: password-locked dashboard plus an always-on Discord bot for Agent HQ. Zero dependencies.
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
const ENV_NAMES = ['DISCORD_BOT_TOKEN', 'GROQ_API_KEY', 'PASSWORD_HASH', 'SESSION_SECRET', 'OWNER_IDS', 'GUILD_ID', 'ASK_CHANNEL_ID', 'STATE_CHANNEL_ID', 'COMMANDS_CHANNEL_ID'];
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Referrer-Policy': 'same-origin', // no-referrer makes browsers send Origin: null on form posts
};
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png' };

export function createApp({ env = process.env, fetch: f = globalThis.fetch, WebSocketImpl, now = Date.now, publicDir = path.join(HERE, 'public'), avatarDir = path.join(HERE, 'avatars') } = {}) {
  // the password hash: DV_PASSWORD_HASH, or the older LANTERN_PASSWORD_HASH already set on Render
  const passwordHash = env.DV_PASSWORD_HASH || env.LANTERN_PASSWORD_HASH;
  const missing = ENV_NAMES.filter((k) => (k === 'PASSWORD_HASH' ? !passwordHash : !env[k]));
  const owners = String(env.OWNER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const discord = env.DISCORD_BOT_TOKEN ? createDiscord({ token: env.DISCORD_BOT_TOKEN, fetch: f, ...(WebSocketImpl && { WebSocketImpl }) }) : null;
  const hq = discord && env.STATE_CHANNEL_ID ? createHqState({ discord, channelId: env.STATE_CHANNEL_ID, fetch: f, now }) : noHqState;
  const auth = createAuth({ hash: passwordHash, secret: env.SESSION_SECRET, totpSecret: env.TOTP_SECRET, now });
  // per-key sliding windows: Groq costs money, so chat is the tightest
  const hits = new Map();
  const limited = (key, max, windowMs = 60_000) => {
    const t = now();
    const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
    list.push(t);
    hits.set(key, list);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
    return list.length > max;
  };
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
      const o = req.headers.origin;
      if (!o || o === 'null') return req.headers['sec-fetch-site'] === 'same-origin'; // browsers set this header and pages cannot forge it
      return new URL(o).host === req.headers.host;
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
    html = html.replace('<!--NOTE-->', note ? `<p class="note" role="alert">${note}</p>` : '');
    html = html.replace('<!--CODE-->', auth.hasTotp ? '<label for="code">Authenticator code</label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required>' : '');
    send(res, status, html, TYPES.html);
  }

  async function handle(req, res) {
    const { pathname: p } = new URL(req.url, 'http://dv.local');
    const get = req.method === 'GET';
    const post = req.method === 'POST';

    if (get && p === '/healthz') return send(res, 200, 'ok');
    if (get && p.startsWith('/avatars/')) {
      const id = p.slice(9, -4);
      if (!p.endsWith('.png') || !AVATAR_ID.test(id)) return send(res, 404, 'not found');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Discord fetches these for agent profile pictures
      return file(res, avatarDir, `${id}.png`, TYPES.png);
    }
    if (get && p === '/style.css') return file(res, publicDir, 'style.css', TYPES.css);
    if (get && (p === '/img/logo.png' || p === '/img/favicon.png' || p === '/favicon.ico')) return file(res, path.join(publicDir, 'img'), p === '/img/logo.png' ? 'logo.png' : 'favicon.png', TYPES.png);
    if (get && p === '/login') return loginPage(res, 200, auth.hasPassword ? '' : 'Sign-in is not set up yet: the password hash is missing.');
    if (limited(`ip:${clientIp(req)}`, 240)) return json(res, 429, { error: 'too many requests' });
    if (post && !originOk(req)) return json(res, 403, { error: 'bad origin' });

    if (post && p === '/login') {
      let form;
      try {
        form = new URLSearchParams(await readBody(req));
      } catch {
        return send(res, 413, 'too large');
      }
      const r = await auth.login(form.get('password') || '', clientIp(req), (form.get('code') || '').replace(/\s/g, ''));
      if (r.status === 200) return redirect(res, '/', { 'Set-Cookie': sessionCookie(r.sid) });
      const note = { 401: auth.hasTotp ? 'Wrong password or code.' : 'Wrong password.', 429: 'Too many attempts. Try again in 15 minutes.', 503: 'Sign-in is not set up yet: the password hash is missing.' }[r.status];
      return loginPage(res, r.status, note);
    }
    if (post && p === '/logout') {
      auth.destroy(req.headers.cookie);
      return redirect(res, '/login', { 'Set-Cookie': sessionCookie('', 0) });
    }

    const authed = auth.check(req.headers.cookie);
    if (p.startsWith('/api/')) {
      if (!authed) return json(res, 401, { error: 'login required' });
      if (post && p === '/api/chat' && limited('chat', 20)) return json(res, 429, { error: 'Slow down: 20 questions a minute.' });
      if (post && p === '/api/command' && limited('command', 30)) return json(res, 429, { error: 'Slow down: 30 actions a minute.' });
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
    console.log(`DV Enterprises listening on ${port}`);
    if (app.missing.length) console.log(`Not configured yet: ${app.missing.join(', ')}`);
  });
  app.discord?.start();
}

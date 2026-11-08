import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { createAuth, hashPassword, verifyPassword } from '../auth.mjs';
import { FAKE_PASSWORD, fakeFetch, testEnv, posts, snapshot } from './helpers.mjs';

const hash = await hashPassword(FAKE_PASSWORD);

async function boot(extraEnv = {}, fetchOpts = {}) {
  const f = fakeFetch(fetchOpts);
  const app = createApp({ env: testEnv(hash, extraEnv), fetch: f });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const host = new URL(base).host;
  const req = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init, headers: { 'x-forwarded-for': '9.9.9.9', ...init.headers } });
  const login = (pw, ip = '1.1.1.1') =>
    req('/login', { method: 'POST', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip }, body: new URLSearchParams({ password: pw }) });
  const sessionCookie = async () => (await login(FAKE_PASSWORD)).headers.get('set-cookie').split(';')[0];
  const close = () => app.server.close();
  return { app, f, base, host, req, login, sessionCookie, close };
}

test('hash and verify, wrong password', async () => {
  assert.match(hash, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyPassword(FAKE_PASSWORD, hash), true);
  assert.equal(await verifyPassword('nope', hash), false);
  assert.equal(await verifyPassword(FAKE_PASSWORD, 'garbage'), false);
});

test('healthz is public and security headers are on every response', async () => {
  const s = await boot();
  const r = await s.req('/healthz');
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'ok');
  for (const h of ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy']) assert.ok(r.headers.get(h), h);
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const l = await s.req('/login');
  assert.equal(l.status, 200);
  assert.ok(l.headers.get('content-security-policy'));
  s.close();
});

test('login sets a hardened cookie; wrong password gets 401', async () => {
  const s = await boot();
  const bad = await s.login('wrong');
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get('set-cookie'), null);
  const ok = await s.login(FAKE_PASSWORD);
  assert.equal(ok.status, 303);
  const c = ok.headers.get('set-cookie');
  for (const part of ['lantern_sid=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(c.includes(part), part);
  assert.match(c, /lantern_sid=[0-9a-f]{64};/);
  const dash = await s.req('/', { headers: { cookie: c.split(';')[0] } });
  assert.equal(dash.status, 200);
  s.close();
});

test('lockout: 5 failures per IP answer 429, even for the right password', async () => {
  const s = await boot();
  for (let i = 0; i < 5; i++) assert.equal((await s.login('wrong', '2.2.2.2')).status, 401);
  assert.equal((await s.login(FAKE_PASSWORD, '2.2.2.2')).status, 429);
  assert.equal((await s.login(FAKE_PASSWORD, '3.3.3.3')).status, 303);
  s.close();
});

test('lockout: 30 failures globally lock out everyone', async () => {
  let t = 1_000_000;
  const auth = createAuth({ hash, now: () => t });
  for (let i = 0; i < 30; i++) assert.equal((await auth.login('wrong', `10.0.0.${i}`)).status, 401);
  assert.equal((await auth.login(FAKE_PASSWORD, '10.9.9.9')).status, 429);
  t += 16 * 60_000;
  assert.equal((await auth.login(FAKE_PASSWORD, '10.9.9.9')).status, 200);
});

test('sessions expire after 12 hours', async () => {
  let t = 5_000;
  const auth = createAuth({ hash, now: () => t });
  const { sid } = await auth.login(FAKE_PASSWORD, 'ip');
  assert.equal(auth.check(`lantern_sid=${sid}`), true);
  t += 12 * 3600_000 + 1;
  assert.equal(auth.check(`lantern_sid=${sid}`), false);
});

test('POST with a foreign or missing Origin is rejected', async () => {
  const s = await boot();
  const body = new URLSearchParams({ password: FAKE_PASSWORD });
  const h = { 'content-type': 'application/x-www-form-urlencoded' };
  const foreign = await s.req('/login', { method: 'POST', headers: { ...h, origin: 'https://evil.example' }, body });
  assert.equal(foreign.status, 403);
  const none = await s.req('/login', { method: 'POST', headers: h, body });
  assert.equal(none.status, 403);
  // a real browser form post can carry Origin: null; it passes only when the browser says the request is same-origin
  const nullCross = await s.req('/login', { method: 'POST', headers: { ...h, origin: 'null', 'sec-fetch-site': 'cross-site' }, body });
  assert.equal(nullCross.status, 403);
  const nullSame = await s.req('/login', { method: 'POST', headers: { ...h, origin: 'null', 'sec-fetch-site': 'same-origin' }, body });
  assert.notEqual(nullSame.status, 403);
  const cookie = await s.sessionCookie();
  const cmd = await s.req('/api/command', { method: 'POST', headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(cmd.status, 403);
  s.close();
});

test('unauthenticated /api/* answers 401 and the dashboard redirects', async () => {
  const s = await boot();
  assert.equal((await s.req('/api/state')).status, 401);
  assert.equal((await s.req('/api/command', { method: 'POST', headers: { origin: s.base }, body: '{}' })).status, 401);
  assert.equal((await s.req('/api/chat', { method: 'POST', headers: { origin: s.base }, body: '{}' })).status, 401);
  const root = await s.req('/');
  assert.equal(root.status, 303);
  assert.equal(root.headers.get('location'), '/login');
  assert.equal((await s.req('/app.js')).status, 303);
  s.close();
});

test('avatar ids are validated', async () => {
  const s = await boot();
  for (const bad of ['..%2Fserver', '%2e%2e%2fauth', 'A', 'a.b', 'x'.repeat(41), 'a%00b', '..']) {
    assert.equal((await s.req(`/avatars/${bad}.png`)).status, 404, bad);
  }
  assert.equal((await s.req('/avatars/zzz-missing.png')).status, 404); // valid id, file absent
  assert.equal((await s.req('/avatars/designer.txt')).status, 404);
  s.close();
});

test('api/state, command and chat when logged in', async () => {
  const s = await boot({}, { groq: undefined });
  const cookie = await s.sessionCookie();
  const h = { cookie, origin: s.base, 'content-type': 'application/json' };
  const st = await (await s.req('/api/state', { headers: { cookie } })).json();
  assert.equal(st.hqOnline, true);
  assert.equal(st.snapshot.roles.length, 2);
  assert.deepEqual(st.groq, { requests: 0, tokens: 0, configured: true });
  assert.equal(st.bot.connected, false);

  const bad = await s.req('/api/command', { method: 'POST', headers: h, body: JSON.stringify({ type: 'message', role: 'ghost', text: 'hi' }) });
  assert.equal(bad.status, 400);
  assert.equal(posts(s.f).length, 0);

  const ok = await s.req('/api/command', { method: 'POST', headers: h, body: JSON.stringify({ type: 'message', role: 'designer', text: 'hi' }) });
  assert.equal(ok.status, 200);
  const sent = posts(s.f);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].url.includes('/channels/CMD/messages'));
  const content = JSON.parse(sent[0].init.body).content;
  assert.match(content, /^HQCMD1 \{"id":"c_[0-9a-f]{12}","type":"message","role":"designer","text":"hi"\}$/);

  const chat = await (await s.req('/api/chat', { method: 'POST', headers: h, body: JSON.stringify({ text: 'status' }) })).json();
  assert.match(chat.reply, /HQ is online/);
  const noText = await s.req('/api/chat', { method: 'POST', headers: h, body: JSON.stringify({ text: '' }) });
  assert.equal(noText.status, 400);
  s.close();
});

test('request body over 32 KB is refused', async () => {
  const s = await boot();
  const cookie = await s.sessionCookie();
  const r = await s.req('/api/chat', { method: 'POST', headers: { cookie, origin: s.base, 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(40_000) }) }).catch((e) => e);
  assert.ok(r instanceof Error || r.status === 413);
  s.close();
});

test('missing env: site still runs and says what is missing', async () => {
  const app = createApp({ env: { LANTERN_PASSWORD_HASH: hash }, fetch: fakeFetch() });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const login = await fetch(`${base}/login`, { method: 'POST', redirect: 'manual', headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ password: FAKE_PASSWORD }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const st = await (await fetch(`${base}/api/state`, { headers: { cookie } })).json();
  assert.equal(st.snapshot, null);
  assert.ok(st.missing.includes('DISCORD_BOT_TOKEN') && st.missing.includes('GROQ_API_KEY'));
  assert.equal(st.groq.configured, false);
  app.server.close();
});

test('snapshot staleness drives hqOnline', async () => {
  const old = snapshot({ at: new Date(Date.now() - 11 * 60_000).toISOString() });
  const s = await boot({}, { snap: old });
  const cookie = await s.sessionCookie();
  const st = await (await s.req('/api/state', { headers: { cookie } })).json();
  assert.equal(st.hqOnline, false);
  assert.ok(st.snapshotAge >= 11 * 60_000);
  s.close();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { createAuth, hashPassword, totpAt, base32Decode, base32Encode } from '../auth.mjs';
import { FAKE_PASSWORD, fakeFetch, groqOk, testEnv } from './helpers.mjs';

const hash = await hashPassword(FAKE_PASSWORD);
const SECRET = base32Encode(Buffer.from('12345678901234567890'));

async function boot(extraEnv = {}, fetchOpts = {}, now = Date.now) {
  const app = createApp({ env: testEnv(hash, extraEnv), fetch: fakeFetch(fetchOpts), now });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const req = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init, headers: { origin: base, 'x-forwarded-for': '7.7.7.7', ...init.headers } });
  const login = (fields, ip = '2.2.2.2') => req('/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip }, body: new URLSearchParams(fields) });
  return { app, req, login, close: () => app.server.close() };
}

test('TOTP matches the RFC 6238 vector', () => {
  assert.equal(totpAt(base32Decode(SECRET), 1), '287082');
});

test('with TOTP on, sign-in needs the code, a code works once, and the page shows the code box', async () => {
  const t = 1_700_000_000_000;
  const s = await boot({ TOTP_SECRET: SECRET }, {}, () => t);
  try {
    const page = await (await s.req('/login')).text();
    assert.match(page, /autocomplete="one-time-code"/);
    assert.equal((await s.login({ password: FAKE_PASSWORD })).status, 401);
    const code = totpAt(base32Decode(SECRET), Math.floor(t / 30_000));
    assert.equal((await s.login({ password: 'wrong', code })).status, 401);
    const ok = await s.login({ password: FAKE_PASSWORD, code }, '3.3.3.3');
    assert.equal(ok.status, 303);
    assert.match(ok.headers.get('set-cookie'), /^__Host-dv_sid=[0-9a-f]{64}; HttpOnly; Secure; SameSite=Strict; Path=\//);
    assert.equal((await s.login({ password: FAKE_PASSWORD, code }, '4.4.4.4')).status, 401); // replay refused
  } finally { s.close(); }
});

test('sessions end after 30 idle minutes and stay alive while used', async () => {
  let t = 0;
  const auth = createAuth({ hash, secret: 's', now: () => t });
  const { sid } = await auth.login(FAKE_PASSWORD, '1.1.1.1');
  const c = `__Host-dv_sid=${sid}`;
  t += 29 * 60_000; assert.equal(auth.check(c), true);
  t += 29 * 60_000; assert.equal(auth.check(c), true);
  t += 31 * 60_000; assert.equal(auth.check(c), false);
});

test('chat is rate limited so nobody can burn the Groq quota', async () => {
  const s = await boot({}, { groq: groqOk({ reply: 'ok', command: null }) });
  try {
    const cookie = (await s.login({ password: FAKE_PASSWORD })).headers.get('set-cookie').split(';')[0];
    const ask = () => s.req('/api/chat', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hi' }) });
    for (let i = 0; i < 20; i++) assert.equal((await ask()).status, 200);
    assert.equal((await ask()).status, 429);
  } finally { s.close(); }
});

test('strict security headers, public brand images, and avatars Discord can fetch', async () => {
  const s = await boot();
  try {
    const r = await s.req('/login');
    const csp = r.headers.get('content-security-policy');
    for (const part of ["default-src 'none'", "script-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) assert.ok(csp.includes(part), part);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.match(r.headers.get('x-robots-tag'), /noindex/);
    assert.equal(r.headers.get('referrer-policy'), 'same-origin');
    assert.equal((await s.req('/img/logo.png')).headers.get('content-type'), 'image/png');
    const av = await s.req('/avatars/hq.png');
    assert.equal(av.status, 200);
    assert.equal(av.headers.get('cross-origin-resource-policy'), 'cross-origin');
  } finally { s.close(); }
});

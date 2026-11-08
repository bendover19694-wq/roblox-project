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

test('with TOTP on, sign-in is two steps: password, then a one-time code', async () => {
  const t = 1_700_000_000_000;
  const s = await boot({ TOTP_SECRET: SECRET }, {}, () => t);
  const code = totpAt(base32Decode(SECRET), Math.floor(t / 30_000));
  const form = (path, fields, cookie = '', ip = '2.2.2.2') => s.req(path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip, ...(cookie && { cookie }) }, body: new URLSearchParams(fields) });
  try {
    assert.equal((await form('/login', { password: 'wrong' })).status, 401);
    assert.equal((await s.req('/login/code')).status, 303); // no step 1, no code page
    assert.equal((await form('/login/code', { code })).status, 410);
    const step1 = await form('/login', { password: FAKE_PASSWORD });
    assert.equal(step1.status, 303);
    assert.equal(step1.headers.get('location'), '/login/code');
    const pending = step1.headers.get('set-cookie').split(';')[0];
    assert.match(pending, /^__Host-dv_step=[0-9a-f]{64}$/);
    assert.ok(!step1.headers.get('set-cookie').includes('__Host-dv_sid=')); // the password alone gives no session
    const page = await (await s.req('/login/code', { headers: { cookie: pending } })).text();
    assert.match(page, /autocomplete="one-time-code"/);
    assert.equal((await form('/login/code', { code: '000000' }, pending)).status, 401);
    const ok = await form('/login/code', { code }, pending, '3.3.3.3');
    assert.equal(ok.status, 303);
    assert.match(ok.headers.get('set-cookie'), /__Host-dv_sid=[0-9a-f]{64}; HttpOnly; Secure; SameSite=Strict; Path=\//);
    // the step token is spent, and the same code cannot be replayed with a fresh password step
    assert.equal((await form('/login/code', { code }, pending)).status, 410);
    const again = (await form('/login', { password: FAKE_PASSWORD }, '', '4.4.4.4')).headers.get('set-cookie').split(';')[0];
    assert.equal((await form('/login/code', { code }, again, '4.4.4.4')).status, 401);
  } finally { s.close(); }
});

test('five wrong codes end the step and send you back to the password', async () => {
  const s = await boot({ TOTP_SECRET: SECRET });
  const form = (path, fields, cookie = '', ip) => s.req(path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip, ...(cookie && { cookie }) }, body: new URLSearchParams(fields) });
  try {
    const pending = (await form('/login', { password: FAKE_PASSWORD }, '', '5.5.5.1')).headers.get('set-cookie').split(';')[0];
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await form('/login/code', { code: '111111' }, pending, `5.5.6.${i}`)).status);
    assert.deepEqual(statuses, [401, 401, 401, 401, 410]);
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

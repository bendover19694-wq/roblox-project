// The outbound tunnel: PC polls with a bearer secret, owner browser requests under /hq are relayed. Fakes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server.mjs';
import { hashPassword } from '../auth.mjs';
import { safePath } from '../tunnel.mjs';
import { FAKE_PASSWORD, fakeFetch, testEnv } from './helpers.mjs';

const SECRET = 'tunnel-secret-for-tests-0123456789abcdef';
const DITTO_PASSWORD = 'another fake passphrase';
const hash = await hashPassword(FAKE_PASSWORD);
const dittoHash = await hashPassword(DITTO_PASSWORD);
const bearer = (s = SECRET) => ({ authorization: `Bearer ${s}` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(extra = { TUNNEL_SECRET: SECRET }, now = Date.now) {
  const app = createApp({ env: testEnv(hash, { DITTO_PASSWORD_HASH: dittoHash, ...extra }), fetch: fakeFetch(), now });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const req = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init, headers: { origin: base, 'x-forwarded-for': '7.7.7.7', ...init.headers } });
  const cookieOf = async (password, ip) => (await req('/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip }, body: new URLSearchParams({ password }) })).headers.get('set-cookie').split(';')[0];
  const poll = async () => { const r = await req('/tunnel/next', { headers: bearer() }); return r.status === 200 ? r.json() : null; };
  const reply = (id, body) => req(`/tunnel/reply/${id}`, { method: 'POST', headers: { ...bearer(), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const b64 = (s) => Buffer.from(s).toString('base64');
  return { app, base, req, cookieOf, poll, reply, b64, close: () => { app.server.closeAllConnections(); app.server.close(); } };
}

test('without TUNNEL_SECRET (or a short one) there are no tunnel endpoints', async () => {
  for (const extra of [{}, { TUNNEL_SECRET: 'too-short' }]) {
    const s = await boot(extra);
    try {
      const r = await s.req('/tunnel/next', { headers: bearer(extra.TUNNEL_SECRET) });
      assert.equal(r.status, 303); // falls through to the sign-in redirect
      assert.equal(s.app.tunnel.enabled, false);
    } finally { s.close(); }
  }
});

test('tunnel polling needs the exact bearer secret; a session cookie is not enough; guessing is rate limited', async () => {
  const s = await boot();
  try {
    assert.equal((await s.req('/tunnel/next')).status, 401);
    assert.equal((await s.req('/tunnel/next', { headers: bearer('wrong-secret-wrong-secret-wrong-secret-xx') })).status, 401);
    assert.equal((await s.req('/tunnel/next', { headers: { authorization: SECRET } })).status, 401);
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    assert.equal((await s.req('/tunnel/next', { headers: { cookie: owner } })).status, 401);
    assert.equal((await s.req(`/tunnel/reply/${'a'.repeat(32)}`, { method: 'POST', headers: { cookie: owner }, body: '{}' })).status, 401);
    let last;
    for (let i = 0; i < 12; i++) last = (await s.req('/tunnel/next', { headers: bearer('x'.repeat(40)) })).status;
    assert.equal(last, 429);
  } finally { s.close(); }
});

test('/hq: signed out goes to login, collaborator gets 403, offline PC gets a clear 503', async () => {
  const s = await boot();
  try {
    assert.equal((await s.req('/hq/')).status, 303);
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    assert.equal((await s.req('/hq/', { headers: { cookie: ditto } })).status, 403);
    assert.equal((await s.req('/hq/api/state', { headers: { cookie: ditto } })).status, 403);
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    assert.equal((await s.req('/hq', { headers: { cookie: owner } })).headers.get('location'), '/hq/');
    const off = await s.req('/hq/', { headers: { cookie: owner } });
    assert.equal(off.status, 503);
    assert.match(await off.text(), /Agent HQ on your PC is offline/);
  } finally { s.close(); }
});

test('an owner request round-trips through the PC poller; cookies and tokens never reach the PC', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    const polled = s.poll();
    await sleep(50);
    const browser = s.req('/hq/api/tasks?x=1', { method: 'POST', headers: { cookie: owner, 'x-hq-token': 'browser-guess', authorization: 'Bearer nope', 'content-type': 'application/json', accept: '*/*' }, body: '{"a":1}' });
    const item = await polled;
    assert.equal(item.method, 'POST');
    assert.equal(item.path, '/api/tasks?x=1');
    assert.deepEqual(Object.keys(item.headers).sort(), ['accept', 'content-type']);
    assert.equal(Buffer.from(item.bodyB64, 'base64').toString(), '{"a":1}');
    assert.ok(!JSON.stringify(item).includes(owner.split('=')[1]));
    assert.equal((await s.reply(item.id, { status: 201, headers: { 'content-type': 'application/json', 'set-cookie': 'evil=1', 'x-other': 'no', 'content-disposition': 'inline' }, chunkB64: s.b64('{"ok":true}'), done: true })).status, 200);
    const r = await browser;
    assert.equal(r.status, 201);
    assert.equal(await r.text(), '{"ok":true}');
    assert.equal(r.headers.get('set-cookie'), null);
    assert.equal(r.headers.get('x-other'), null);
    assert.equal(r.headers.get('content-disposition'), 'inline');
    const csp = r.headers.get('content-security-policy');
    for (const part of ["style-src 'self' 'unsafe-inline'", "script-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'"]) assert.ok(csp.includes(part), part);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal((await s.reply(item.id, { chunkB64: '', done: true })).status, 404); // finished: further replies refused
    assert.equal((await s.reply('b'.repeat(32), { status: 200, done: true })).status, 404);
  } finally { s.close(); }
});

test('SSE: the first chunk is readable before the stream is done', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    const polled = s.poll();
    await sleep(50);
    const pending = s.req('/hq/api/events?token=x', { headers: { cookie: owner, accept: 'text/event-stream', 'last-event-id': '5' } });
    const item = await polled;
    assert.equal(item.path, '/api/events?token=x');
    assert.equal(item.headers['last-event-id'], '5');
    await s.reply(item.id, { status: 200, headers: { 'content-type': 'text/event-stream' }, chunkB64: s.b64('event: task\ndata: 1\n\n'), done: false });
    const res = await pending;
    assert.equal(res.headers.get('content-type'), 'text/event-stream');
    const rd = res.body.getReader();
    assert.match(Buffer.from((await rd.read()).value).toString(), /event: task/);
    await s.reply(item.id, { chunkB64: s.b64('event: ask\ndata: 2\n\n'), done: false });
    assert.match(Buffer.from((await rd.read()).value).toString(), /event: ask/);
    await s.reply(item.id, { done: true });
    assert.equal((await rd.read()).done, true);
  } finally { s.close(); }
});

test('a browser that leaves frees the request; oversize and bad replies are refused', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    const polled = s.poll();
    await sleep(50);
    const ac = new AbortController();
    const pending = s.req('/hq/api/x', { headers: { cookie: owner }, signal: ac.signal }).catch(() => null);
    const item = await polled;
    assert.equal((await s.reply(item.id, { status: 99 })).status, 400);
    assert.equal((await s.reply(item.id, { status: 200, chunkB64: 'not base64!!' })).status, 400);
    assert.equal(await s.reply(item.id, { status: 200, chunkB64: 'A'.repeat(1.5 * 1024 * 1024) }).then((r) => r.status, () => 'reset'), 'reset'); // the body limit drops the connection
    ac.abort();
    await pending;
    await sleep(50);
    assert.equal((await s.reply(item.id, { status: 200, done: true })).status, 404);
  } finally { s.close(); }
});

test('a response over 16 MB is cut off', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    const polled = s.poll();
    await sleep(50);
    const pending = s.req('/hq/big', { headers: { cookie: owner } }).then((r) => r.arrayBuffer()).catch(() => 'cut');
    const item = await polled;
    const chunk = Buffer.alloc(700 * 1024).toString('base64');
    let status = 200;
    for (let i = 0; i < 30 && status === 200; i++) status = (await s.reply(item.id, { ...(i === 0 && { status: 200 }), chunkB64: chunk })).status;
    assert.equal(status, 413);
    assert.equal(await pending, 'cut');
  } finally { s.close(); }
});

test('/hq writes keep the origin check; traversal paths are refused', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const r = await s.req('/hq/api/x', { method, headers: { cookie: owner, origin: 'https://evil.example' } });
      assert.equal(r.status, 403, method);
    }
    const raw = (path) => new Promise((resolve, reject) => {
      const u = new URL(s.base);
      http.get({ host: u.hostname, port: u.port, path, headers: { cookie: owner } }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject);
    });
    for (const p of ['/hq/a/../b', '/hq//evil.example/x', '/hq/a/%2E%2E/b', '/hq/a%2f%2fb']) assert.equal(await raw(p), 400, p);
    assert.equal(await raw('/hq/%2e%2e/x'), 404); // the URL parser folds this out of /hq before it can be forwarded
  } finally { s.close(); }
});

test('/api/state tells only the owner whether the PC is connected', async () => {
  let t = 1_000_000;
  const s = await boot({ TUNNEL_SECRET: SECRET }, () => t);
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const state = async (c) => (await s.req('/api/state', { headers: { cookie: c } })).json();
    assert.deepEqual((await state(owner)).tunnel, { connected: false });
    s.poll().catch(() => {}); // the PC polls (held open)
    await sleep(50);
    assert.deepEqual((await state(owner)).tunnel, { connected: true });
    assert.equal('tunnel' in (await state(ditto)), false);
    t += 41_000; // no poll for 40 s: offline
    assert.deepEqual((await state(owner)).tunnel, { connected: false });
  } finally { s.close(); }
});

test('safePath accepts site paths and refuses everything else', () => {
  for (const ok of ['/', '/api/state?x=1', '/static/app.js', '/media/a%20b.png']) assert.equal(safePath(ok), true, ok);
  for (const bad of ['', 'api', '//evil.example', '/a//b', '/../x', '/a/..%2fb', '/%2e%2e/x', 'http://evil.example/', '/http://x', '/a\\b', '/a\nb', '/%00']) assert.equal(safePath(bad), false, bad);
});

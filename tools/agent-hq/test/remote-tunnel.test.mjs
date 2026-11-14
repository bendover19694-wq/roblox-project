// PC side of the remote tunnel against a fake cloud and a fake HQ, plus the web UI's /hq prefix logic. Fakes only, loopback only.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRemoteTunnel, safeRemotePath, scrubToken, readRemoteConfig } from '../remote-tunnel.mjs';

const SECRET = 'fake-tunnel-secret-0123456789abcdef-xx';
const OWNER = 'f'.repeat(64);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));
const body = (req) => new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const hex = (n) => n.toString(16).padStart(32, '0');

/** A fake cloud: push() queues a request for the PC, replies[id] collects what the PC sent back. */
async function fakeCloud() {
  const queue = []; const waiters = []; const replies = {}; const seenAuth = [];
  const srv = http.createServer(async (req, res) => {
    seenAuth.push(req.headers.authorization);
    if (req.url === '/tunnel/next') {
      const give = (item) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(item)); };
      if (queue.length) return give(queue.shift());
      const w = { give }; waiters.push(w);
      res.on('close', () => { const i = waiters.indexOf(w); if (i >= 0) waiters.splice(i, 1); });
      return;
    }
    const m = /^\/tunnel\/reply\/([a-f0-9]{32})$/.exec(req.url);
    if (m && req.method === 'POST') {
      const b = JSON.parse((await body(req)).toString());
      (replies[m[1]] ||= []).push(b);
      res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ok":true}');
    }
    res.writeHead(404); res.end();
  });
  const port = await listen(srv);
  return {
    url: `http://127.0.0.1:${port}`, replies, seenAuth,
    push(item) { const w = waiters.shift(); if (w) w.give(item); else queue.push(item); },
    async until(id, pred, ms = 3000) { const t = Date.now(); while (Date.now() - t < ms) { const r = replies[id] || []; if (pred(r)) return r; await sleep(15); } throw new Error(`no reply for ${id}: ${JSON.stringify(replies[id])}`); },
    close: () => { srv.closeAllConnections(); srv.close(); },
  };
}

async function setup(handler) {
  const cloud = await fakeCloud();
  const hits = [];
  const hq = http.createServer((req, res) => { hits.push({ url: req.url, headers: req.headers, method: req.method }); handler(req, res); });
  const port = await listen(hq);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-remote-'));
  fs.writeFileSync(path.join(dir, 'remote.json'), JSON.stringify({ url: cloud.url, secret: SECRET }));
  const errors = [];
  const t = createRemoteTunnel({ stateDir: dir, getPort: () => port, getOwnerToken: () => OWNER, onError: (e) => errors.push(e.message) });
  assert.equal(t.start(), true);
  return { cloud, hits, dir, t, errors, close: () => { t.stop(); cloud.close(); hq.closeAllConnections(); hq.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}

test('a request is forwarded to HQ with the owner token, and the reply goes back with the bearer secret', async () => {
  const s = await setup((req, res) => { res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'x=1', 'cache-control': 'no-store' }); res.end('{"hello":1}'); });
  try {
    s.cloud.push({ id: hex(1), method: 'GET', path: '/api/state?a=1', headers: { accept: '*/*', cookie: 'evil=1', 'x-hq-token': 'browser' }, bodyB64: '' });
    const r = await s.cloud.until(hex(1), (x) => x.at(-1)?.done);
    assert.equal(s.hits[0].url, '/api/state?a=1');
    assert.equal(s.hits[0].headers['x-hq-token'], OWNER);
    assert.equal(s.hits[0].headers.cookie, undefined);
    assert.equal(r[0].status, 200);
    assert.equal(r[0].headers['set-cookie'], undefined);
    assert.equal(r[0].headers['cache-control'], 'no-store');
    assert.equal(Buffer.from(r[0].chunkB64, 'base64').toString(), '{"hello":1}');
    assert.ok(s.cloud.seenAuth.every((a) => a === `Bearer ${SECRET}`));
  } finally { s.close(); }
});

test('POST bodies are forwarded intact', async () => {
  let got;
  const s = await setup(async (req, res) => { got = (await body(req)).toString(); res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}'); });
  try {
    s.cloud.push({ id: hex(2), method: 'POST', path: '/api/tasks', headers: { 'content-type': 'application/json' }, bodyB64: Buffer.from('{"title":"x"}').toString('base64') });
    await s.cloud.until(hex(2), (x) => x.at(-1)?.done);
    assert.equal(got, '{"title":"x"}');
    assert.equal(s.hits[0].method, 'POST');
  } finally { s.close(); }
});

test('paths that could leave HQ are refused and never reach it', async () => {
  const s = await setup((req, res) => { res.writeHead(200); res.end('hit'); });
  try {
    const bad = ['/../x', '//evil.example/x', 'http://evil.example/x', 'api/state', '/a/..%2fb', '/%2e%2e/owner-token', '/a\\b', '/http://evil.example'];
    bad.forEach((p, i) => s.cloud.push({ id: hex(10 + i), method: 'GET', path: p, headers: {}, bodyB64: '' }));
    s.cloud.push({ id: hex(30), method: 'CONNECT', path: '/api/state', headers: {}, bodyB64: '' });
    for (let i = 0; i < bad.length; i++) assert.equal((await s.cloud.until(hex(10 + i), (x) => x.length))[0].status, 400, bad[i]);
    assert.equal((await s.cloud.until(hex(30), (x) => x.length))[0].status, 400);
    assert.equal(s.hits.length, 0);
  } finally { s.close(); }
});

test('the owner token is scrubbed from HTML before it leaves the PC', async () => {
  const s = await setup((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<meta name="hq-token" content="${OWNER}"><p>ok</p>`); });
  try {
    s.cloud.push({ id: hex(3), method: 'GET', path: '/', headers: {}, bodyB64: '' });
    const r = await s.cloud.until(hex(3), (x) => x.at(-1)?.done);
    const html = Buffer.concat(r.map((x) => Buffer.from(x.chunkB64 || '', 'base64'))).toString();
    assert.ok(!html.includes(OWNER));
    assert.match(html, /<p>ok<\/p>/);
  } finally { s.close(); }
});

test('large responses are sent in chunks under the 1 MB reply limit', async () => {
  const big = Buffer.alloc(1_300_000, 7);
  const s = await setup((req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(big); });
  try {
    s.cloud.push({ id: hex(4), method: 'GET', path: '/media/x.png', headers: {}, bodyB64: '' });
    const r = await s.cloud.until(hex(4), (x) => x.at(-1)?.done);
    assert.ok(r.length >= 3);
    assert.ok(r.every((x) => JSON.stringify(x).length < 1024 * 1024));
    assert.equal(r.filter((x) => 'status' in x).length, 1);
    assert.equal(Buffer.concat(r.map((x) => Buffer.from(x.chunkB64 || '', 'base64'))).length, big.length);
  } finally { s.close(); }
});

test('a response over 8 MB becomes a 502 instead of being buffered', async () => {
  const s = await setup((req, res) => { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(Buffer.alloc(9 * 1024 * 1024)); });
  try {
    s.cloud.push({ id: hex(5), method: 'GET', path: '/media/huge.bin', headers: {}, bodyB64: '' });
    const r = await s.cloud.until(hex(5), (x) => x.length);
    assert.equal(r[0].status, 502);
  } finally { s.close(); }
});

test('/api/events streams chunk by chunk and gets the token in the query', async () => {
  let release;
  const s = await setup((req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('event: task\ndata: 1\n\n');
    release = () => { res.write('event: ask\ndata: 2\n\n'); res.end(); };
  });
  try {
    s.cloud.push({ id: hex(6), method: 'GET', path: '/api/events?token=browser', headers: { accept: 'text/event-stream' }, bodyB64: '' });
    const first = await s.cloud.until(hex(6), (x) => x.some((y) => y.chunkB64));
    assert.equal(first[0].status, 200);
    assert.ok(!first.some((y) => y.done)); // still open
    assert.equal(new URL(s.hits[0].url, 'http://x').searchParams.get('token'), OWNER);
    assert.equal(s.hits[0].headers['x-hq-token'], OWNER);
    release();
    const all = await s.cloud.until(hex(6), (x) => x.at(-1)?.done);
    assert.match(all.map((x) => Buffer.from(x.chunkB64 || '', 'base64').toString()).join(''), /event: ask/);
  } finally { s.close(); }
});

test('up to 6 requests run at once', async () => {
  const gates = [];
  const s = await setup((req, res) => { gates.push(() => { res.writeHead(200); res.end('x'); }); });
  try {
    for (let i = 0; i < 8; i++) s.cloud.push({ id: hex(40 + i), method: 'GET', path: '/api/slow', headers: {}, bodyB64: '' });
    await sleep(400);
    assert.equal(gates.length, 6);
    assert.equal(s.t.active, 6);
    gates.splice(0).forEach((g) => g());
    while (gates.length < 2) await sleep(20); // the other two start as slots free up
    gates.splice(0).forEach((g) => g());
    await s.cloud.until(hex(47), (x) => x.at(-1)?.done);
  } finally { s.close(); }
});

test('it stops polling once remote.json is removed, and does not start without it', async () => {
  const s = await setup((req, res) => { res.writeHead(200); res.end('ok'); });
  try {
    fs.rmSync(path.join(s.dir, 'remote.json'));
    s.cloud.push({ id: hex(60), method: 'GET', path: '/api/state', headers: {}, bodyB64: '' }); // wakes the held poll
    await s.cloud.until(hex(60), (x) => x.length);
    await sleep(200);
    s.cloud.push({ id: hex(61), method: 'GET', path: '/api/state', headers: {}, bodyB64: '' });
    await sleep(300);
    assert.equal(s.cloud.replies[hex(61)], undefined);
    assert.equal(createRemoteTunnel({ stateDir: s.dir, getPort: () => 1, getOwnerToken: () => OWNER }).start(), false);
  } finally { s.close(); }
});

test('helpers: path check, token scrub, config validation', () => {
  for (const ok of ['/', '/api/state?x=1', '/media/a%20b.png']) assert.equal(safeRemotePath(ok), true, ok);
  for (const bad of ['', '/..', '//x', '/a//b', 'http://x', '/%2e%2e/x', '/a%2f..%2fb']) assert.equal(safeRemotePath(bad), false, bad);
  assert.equal(scrubToken(Buffer.from(`a ${OWNER} b`), { 'content-type': 'application/json' }, OWNER).toString(), 'a  b');
  const png = Buffer.from([1, 2, 3]);
  assert.equal(scrubToken(png, { 'content-type': 'image/png' }, OWNER), png);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-remote-cfg-'));
  assert.equal(readRemoteConfig(dir), null);
  fs.writeFileSync(path.join(dir, 'remote.json'), JSON.stringify({ url: 'https://x.example/path', secret: 'short' }));
  assert.equal(readRemoteConfig(dir), null);
  fs.writeFileSync(path.join(dir, 'remote.json'), JSON.stringify({ url: 'https://x.example/path', secret: SECRET }));
  assert.deepEqual(readRemoteConfig(dir), { url: 'https://x.example', secret: SECRET });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('web UI: BASE is /hq under the site prefix and empty locally', async () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../public/views/core.js'), 'utf8');
  const line = src.split('\n').find((l) => l.startsWith('export const BASE'))?.trimEnd();
  assert.ok(line, 'BASE is exported');
  assert.equal(line, "export const BASE = location.pathname.startsWith('/hq') ? '/hq' : '';");
  const baseFor = (pathname) => (pathname.startsWith('/hq') ? '/hq' : ''); // same expression as the line above
  assert.equal(baseFor('/hq/'), '/hq');
  assert.equal(baseFor('/hq'), '/hq');
  assert.equal(baseFor('/'), '');
  assert.equal(baseFor('/index.html'), '');
  // every absolute URL the UI builds goes through BASE; the page itself uses relative static paths
  assert.match(src, /fetch\(BASE \+ path/);
  assert.match(src, /EventSource\(BASE \+ '\/api\/events/);
  assert.match(src, /BASE \+ '\/media\//);
  assert.match(fs.readFileSync(path.resolve(import.meta.dirname, '../public/views/notebook.js'), 'utf8'), /EventSource\(BASE \+/);
  const html = fs.readFileSync(path.resolve(import.meta.dirname, '../public/index.html'), 'utf8');
  assert.ok(!/(?:href|src)="\/static\//.test(html));
  assert.ok(!/url\("\/static\//.test(fs.readFileSync(path.resolve(import.meta.dirname, '../public/theme.css'), 'utf8')));
});

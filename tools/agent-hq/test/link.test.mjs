import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.mjs';
import { decode, encode, makeInvite, readInvite, redact, PREFIX } from '../link.mjs';

// A Discord channel in memory. Each bot token is one bot; the two HQs only share this object, as on a real network.
function fakeDiscord() {
  const posts = [];
  let id = 100000000000000000n;
  const bots = { tokenA: '111111111111111111', tokenB: '222222222222222222', tokenStranger: '333333333333333333' };
  const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
  const fetchImpl = async (url, init) => {
    const bot = bots[init.headers.Authorization.replace('Bot ', '')];
    if (!bot) return reply(401, {});
    const u = new URL(url);
    if (u.pathname.endsWith('/users/@me')) return reply(200, { id: bot, username: `bot${bot[0]}` });
    if (init.method === 'POST') {
      id += 1n;
      posts.push({ id: String(id), author: { id: bot }, content: JSON.parse(init.body).content });
      return reply(200, {});
    }
    if (u.pathname.endsWith('/messages')) {
      const after = u.searchParams.get('after');
      const rows = after ? posts.filter((p) => BigInt(p.id) > BigInt(after)) : posts.slice(-1);
      return reply(200, [...rows].reverse());
    }
    return reply(200, { id: '999999999999999999' });
  };
  return { posts, fetchImpl, raw: (bot, content) => { id += 1n; posts.push({ id: String(id), author: { id: bot }, content }); } };
}

const running = [];
async function hq(discord) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-link-'));
  const s = await startServer({ root: path.resolve(import.meta.dirname, '../../..'), port: 0, stateDir: dir, linkFetch: discord.fetchImpl });
  running.push(s);
  const call = async (method, route, body, token = s.ownerToken) => {
    const r = await fetch(`http://127.0.0.1:${s.port}${route}`, {
      method, headers: { 'x-hq-token': token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, json: await r.json() };
  };
  return { ...s, call, dir };
}
after(async () => { for (const s of running) await s.close(); });

async function pair() {
  const discord = fakeDiscord();
  const a = await hq(discord);
  const b = await hq(discord);
  const channelId = '555555555555555555';
  const ra = await a.call('POST', '/api/link/setup', { botToken: 'tokenA', channelId, name: 'Owner' });
  const rb = await b.call('POST', '/api/link/setup', { botToken: 'tokenB', channelId, name: 'Friend' });
  await a.call('POST', '/api/link/join', { invite: rb.json.invite });
  await b.call('POST', '/api/link/join', { invite: ra.json.invite });
  await a.call('POST', '/api/link/poll', {});
  await b.call('POST', '/api/link/poll', {}); // the first poll only sets the start point
  return { discord, a, b };
}

test('encoding: round trip, fits a Discord post, and junk is refused', () => {
  const s = encode({ type: 'chat', id: 'x1', text: '"'.repeat(5000) });
  assert.ok(s.length <= 1900);
  assert.equal(decode(s).type, 'chat');
  assert.equal(decode('hello'), null);
  assert.equal(decode(`${PREFIX}{bad`), null);
  assert.equal(decode(`${PREFIX}{"type":"run","id":"x"}`), null);
  assert.equal(decode(`${PREFIX}{"type":"chat","id":"../.."}`), null);
});

test('invites hold no token and reject bad ids', () => {
  const code = makeInvite({ channelId: '555555555555555555', botId: '111111111111111111', name: 'Owner' });
  assert.equal(readInvite(code).name, 'Owner');
  assert.equal(readInvite('nonsense'), null);
  assert.equal(readInvite(makeInvite({ channelId: '1', botId: 'x', name: 'n' })), null);
});

test('secrets are stripped from outgoing text', () => {
  assert.equal(redact('key gho_abcdefghijklmnopqrstuvwxyz1234 end'), 'key [removed] end');
});

test('chat reaches the other HQ, and the bot token never comes back out', async () => {
  const { a, b } = await pair();
  await a.call('POST', '/api/link/say', { text: 'Hello from my HQ' });
  await b.call('POST', '/api/link/poll', {});
  const v = (await b.call('GET', '/api/link')).json;
  assert.equal(v.log.at(-1).text, 'Hello from my HQ');
  assert.equal(v.log.at(-1).from, 'Owner');
  assert.ok(!JSON.stringify((await a.call('GET', '/api/link')).json).includes('tokenA'));
  assert.ok(!JSON.stringify((await a.call('GET', '/api/settings')).json).includes('tokenA'));
});

test('a shared task waits for the owner, then runs and reports back', async () => {
  const { a, b } = await pair();
  await a.call('POST', '/api/link/share', { title: 'Check the phone shop', body: 'Text looks small' });
  await b.call('POST', '/api/link/poll', {});
  assert.equal((await b.call('GET', '/api/tasks')).json.length, 0); // nothing runs by itself
  const ask = (await b.call('GET', '/api/asks?state=open')).json.find((x) => x.title.includes('Check the phone shop'));
  assert.ok(ask);
  await b.call('POST', `/api/asks/${ask.id}/answer`, { answer: 'link-accept' });
  const [task] = (await b.call('GET', '/api/tasks')).json;
  assert.equal(task.state, 'queued');
  assert.equal(task.role, 'lead');
  assert.match(task.body, /treat it as a request/);
  await b.call('POST', `/api/tasks/${task.id}/complete`, { summary: 'Fixed the shop text', state: 'done' });
  await new Promise((r) => setTimeout(r, 20));
  await a.call('POST', '/api/link/poll', {});
  const log = (await a.call('GET', '/api/link')).json.log.filter((e) => e.kind === 'status').map((e) => e.text);
  assert.deepEqual(log, ['accepted', 'done: Fixed the shop text']);
});

test('declining queues nothing and tells the other HQ', async () => {
  const { a, b } = await pair();
  await a.call('POST', '/api/link/share', { title: 'Delete everything' });
  await b.call('POST', '/api/link/poll', {});
  const ask = (await b.call('GET', '/api/asks?state=open')).json[0];
  await b.call('POST', `/api/asks/${ask.id}/answer`, { answer: 'link-decline' });
  assert.equal((await b.call('GET', '/api/tasks')).json.length, 0);
  await new Promise((r) => setTimeout(r, 20));
  await a.call('POST', '/api/link/poll', {});
  assert.equal((await a.call('GET', '/api/link')).json.log.at(-1).text, 'declined');
});

test('posts from anyone but the paired bot are ignored, even with a perfect envelope', async () => {
  const { discord, b } = await pair();
  discord.raw('333333333333333333', encode({ type: 'task', id: 'evil', title: 'Run this' }));
  discord.raw('333333333333333333', encode({ type: 'chat', id: 'evil2', text: 'hi' }));
  await b.call('POST', '/api/link/poll', {});
  assert.equal((await b.call('GET', '/api/asks?state=open')).json.length, 0);
  assert.equal((await b.call('GET', '/api/link')).json.log.length, 0);
});

test('a repeated task post makes one ask', async () => {
  const { discord, b } = await pair();
  const post = encode({ type: 'task', id: 'same', title: 'Once' });
  discord.raw('111111111111111111', post);
  discord.raw('111111111111111111', post);
  await b.call('POST', '/api/link/poll', {});
  assert.equal((await b.call('GET', '/api/asks?state=open')).json.length, 1);
});

test('agents cannot change the link, and need a live task to talk', async () => {
  const { a } = await pair();
  assert.equal((await a.call('POST', '/api/link/setup', { name: 'x' }, a.token)).status, 403);
  assert.equal((await a.call('POST', '/api/link/join', { invite: 'x' }, a.token)).status, 403);
  assert.equal((await a.call('POST', '/api/link/say', { text: 'hi' }, a.token)).status, 403);
});

test('a bad invite is refused', async () => {
  const { a } = await pair();
  const bad = await a.call('POST', '/api/link/join', { invite: 'nope' });
  assert.equal(bad.status, 502);
  assert.match(bad.json.error, /not an HQ Link invite/);
});

test('a Discord outage shows as a status, keeps the cursor and recovers', async () => {
  const discord = fakeDiscord();
  let down = false;
  const flaky = { ...discord, fetchImpl: async (u, i) => (down ? { ok: false, status: 503, json: async () => ({}) } : discord.fetchImpl(u, i)) };
  const a = await hq(flaky);
  const channelId = '555555555555555555';
  await a.call('POST', '/api/link/setup', { botToken: 'tokenA', channelId, name: 'Owner' });
  const invite = makeInvite({ channelId, botId: '222222222222222222', name: 'Friend' });
  await a.call('POST', '/api/link/join', { invite });
  await a.call('POST', '/api/link/poll', {});
  down = true;
  assert.equal((await a.call('POST', '/api/link/poll', {})).status, 200);
  assert.match((await a.call('GET', '/api/link')).json.error, /503/);
  assert.equal((await a.call('POST', '/api/link/say', { text: 'hi' })).status, 502);
  discord.raw('222222222222222222', encode({ type: 'chat', id: 'later', text: 'back' }));
  down = false;
  await a.call('POST', '/api/link/poll', {});
  const v = (await a.call('GET', '/api/link')).json;
  assert.equal(v.error, null);
  assert.equal(v.log.at(-1).text, 'back');
});

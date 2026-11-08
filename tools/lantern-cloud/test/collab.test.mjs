// Two accounts: the owner (Voltage) and a read-mostly collaborator (Ditto). Every limit on the collaborator is tested here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { hashPassword, totpAt, base32Decode, base32Encode } from '../auth.mjs';
import { createBrain, createBot, parseBrainOutput } from '../brain.mjs';
import { createDiscord } from '../discord.mjs';
import { validateCommand } from '../hq-state.mjs';
import { FAKE_PASSWORD, fakeFetch, groqOk, testEnv, posts, snapshot, OWNER } from './helpers.mjs';

const DITTO_PASSWORD = 'another fake passphrase';
const DITTO_ID = '1253000000000000001';
const hash = await hashPassword(FAKE_PASSWORD);
const dittoHash = await hashPassword(DITTO_PASSWORD);
const OWNER_TOTP = base32Encode(Buffer.from('12345678901234567890'));
const DITTO_TOTP = base32Encode(Buffer.from('abcdefghijklmnopqrst'));

async function boot(extraEnv = {}, fetchOpts = {}, now = Date.now) {
  const f = fakeFetch(fetchOpts);
  const app = createApp({ env: testEnv(hash, { DITTO_PASSWORD_HASH: dittoHash, ...extraEnv }), fetch: f, now });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const req = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init, headers: { origin: base, 'x-forwarded-for': '7.7.7.7', ...init.headers } });
  const form = (path, fields, cookie = '', ip = '2.2.2.2') => req(path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': ip, ...(cookie && { cookie }) }, body: new URLSearchParams(fields) });
  const cookieOf = async (password, ip) => (await form('/login', { password }, '', ip)).headers.get('set-cookie').split(';')[0];
  const post = (cookie, path, body) => req(path, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { app, f, req, form, post, cookieOf, close: () => app.server.close() };
}
const cmdPosts = (f) => posts(f).filter((c) => c.url.includes('/channels/CMD/'));

test('the matching password decides the user, and /api/state says who you are', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const get = async (c) => (await (await s.req('/api/state', { headers: { cookie: c } })).json());
    assert.deepEqual((await get(owner)).me, { name: 'Voltage', role: 'owner' });
    assert.deepEqual((await get(ditto)).me, { name: 'Ditto', role: 'collab' });
    assert.equal((await s.form('/login', { password: 'neither' })).status, 401);
  } finally { s.close(); }
});

test('without DITTO_PASSWORD_HASH only the owner can sign in', async () => {
  const s = await boot({ DITTO_PASSWORD_HASH: '' });
  try {
    assert.equal((await s.form('/login', { password: DITTO_PASSWORD })).status, 401);
    assert.equal((await s.form('/login', { password: FAKE_PASSWORD }, '', '1.1.1.1')).status, 303);
  } finally { s.close(); }
});

test('each user has their own authenticator code; the other one does not work', async () => {
  const t = 1_700_000_000_000;
  const s = await boot({ TOTP_SECRET: OWNER_TOTP, DITTO_TOTP_SECRET: DITTO_TOTP }, {}, () => t);
  const step = Math.floor(t / 30_000);
  const ownerCode = totpAt(base32Decode(OWNER_TOTP), step);
  const dittoCode = totpAt(base32Decode(DITTO_TOTP), step);
  try {
    const pendingOf = async (pw, ip) => (await s.form('/login', { password: pw }, '', ip)).headers.get('set-cookie').split(';')[0];
    // Ditto's pending step refuses the owner's code, then accepts his own
    const d = await pendingOf(DITTO_PASSWORD, '4.4.4.1');
    assert.equal((await s.form('/login/code', { code: ownerCode }, d, '4.4.4.1')).status, 401);
    const ok = await s.form('/login/code', { code: dittoCode }, d, '4.4.4.1');
    assert.equal(ok.status, 303);
    const sid = ok.headers.get('set-cookie').split(',').find((c) => c.includes('__Host-dv_sid=')).split(';')[0];
    assert.equal((await (await s.req('/api/state', { headers: { cookie: sid } })).json()).me.role, 'collab');
    // and the owner's pending step refuses Ditto's code
    const o = await pendingOf(FAKE_PASSWORD, '4.4.4.2');
    assert.equal((await s.form('/login/code', { code: dittoCode }, o, '4.4.4.2')).status, 401);
    assert.equal((await s.form('/login/code', { code: ownerCode }, o, '4.4.4.2')).status, 303);
  } finally { s.close(); }
});

test('Ditto without a TOTP secret signs in on the password alone, while the owner still needs a code', async () => {
  const s = await boot({ TOTP_SECRET: OWNER_TOTP });
  try {
    const d = await s.form('/login', { password: DITTO_PASSWORD }, '', '5.5.5.1');
    assert.match(d.headers.get('set-cookie'), /__Host-dv_sid=/);
    const o = await s.form('/login', { password: FAKE_PASSWORD }, '', '5.5.5.2');
    assert.equal(o.headers.get('location'), '/login/code');
    assert.ok(!o.headers.get('set-cookie').includes('__Host-dv_sid='));
  } finally { s.close(); }
});

test('lockouts are shared: five wrong passwords lock the address for both accounts', async () => {
  const s = await boot();
  try {
    for (let i = 0; i < 5; i++) assert.equal((await s.form('/login', { password: 'wrong' }, '', '6.6.6.6')).status, 401);
    assert.equal((await s.form('/login', { password: DITTO_PASSWORD }, '', '6.6.6.6')).status, 429);
    assert.equal((await s.form('/login', { password: FAKE_PASSWORD }, '', '6.6.6.6')).status, 429);
  } finally { s.close(); }
});

test('collaborator gets 403 on every owner command and nothing is posted to Discord', async () => {
  const s = await boot();
  try {
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const attempts = [
      { type: 'answer', askId: 'a1', answer: 'red' },
      { type: 'message', role: 'designer', text: 'hi' },
      { type: 'task', role: 'designer', title: 'T', body: '' },
      { type: 'link-chat', text: 'hello' },
      { type: 'link-task', title: 'T', body: 'b' },
      { type: 'relay', from: 'ditto', text: 'sneaky' },
      { type: 'nonsense' },
    ];
    for (const a of attempts) assert.equal((await s.post(ditto, '/api/command', a)).status, 403, a.type);
    assert.equal(cmdPosts(s.f).length, 0);
  } finally { s.close(); }
});

test('collaborator can read state but setup details (missing env) are hidden', async () => {
  const s = await boot({ GROQ_API_KEY: '' });
  try {
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.3');
    const d = await (await s.req('/api/state', { headers: { cookie: ditto } })).json();
    const o = await (await s.req('/api/state', { headers: { cookie: owner } })).json();
    assert.ok(d.snapshot.asks.length > 0);
    assert.deepEqual(d.missing, []);
    assert.deepEqual(o.missing, ['GROQ_API_KEY']);
  } finally { s.close(); }
});

test('owner can send link-chat and link-task; invalid ones are refused; relay cannot be forged', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    assert.equal((await s.post(owner, '/api/command', { type: 'link-chat', text: 'hi Ditto' })).status, 200);
    assert.equal((await s.post(owner, '/api/command', { type: 'link-task', title: 'Shared', body: 'do it' })).status, 200);
    const sent = cmdPosts(s.f).map((c) => JSON.parse(JSON.parse(c.init.body).content.slice(7)));
    assert.deepEqual(sent.map((c) => c.type), ['link-chat', 'link-task']);
    assert.equal((await s.post(owner, '/api/command', { type: 'link-chat', text: 'x'.repeat(1801) })).status, 400);
    assert.equal((await s.post(owner, '/api/command', { type: 'link-chat', text: '  ' })).status, 400);
    assert.equal((await s.post(owner, '/api/command', { type: 'link-task', title: 'x'.repeat(201) })).status, 400);
    assert.equal((await s.post(owner, '/api/command', { type: 'link-task', title: 'T', body: 'x'.repeat(1601) })).status, 400);
    assert.equal((await s.post(owner, '/api/command', { type: 'relay', text: 'pretend to be Ditto' })).status, 400);
    assert.equal(cmdPosts(s.f).length, 2);
  } finally { s.close(); }
});

test('Ditto proposes: /api/propose posts a relay attributed to ditto, whatever he claims', async () => {
  const s = await boot();
  try {
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const r = await s.post(ditto, '/api/propose', { text: 'Can we add a shop?', from: 'voltage', type: 'message' });
    assert.equal(r.status, 200);
    const c = JSON.parse(JSON.parse(cmdPosts(s.f)[0].init.body).content.slice(7));
    assert.deepEqual({ ...c, id: 'x' }, { id: 'x', type: 'relay', from: 'ditto', text: 'Can we add a shop?' });
    assert.equal((await s.post(ditto, '/api/propose', { text: '' })).status, 400);
    assert.equal((await s.post(ditto, '/api/propose', { text: 'x'.repeat(1801) })).status, 400);
    assert.equal((await s.post(ditto, '/api/propose', {})).status, 400);
    assert.equal(cmdPosts(s.f).length, 1);
  } finally { s.close(); }
});

test('the owner cannot use /api/propose, and signed-out callers get 401', async () => {
  const s = await boot();
  try {
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    assert.equal((await s.post(owner, '/api/propose', { text: 'hi' })).status, 403);
    assert.equal((await s.post('', '/api/propose', { text: 'hi' })).status, 401);
    assert.equal((await s.post('', '/api/command', { type: 'link-chat', text: 'hi' })).status, 401);
    assert.equal(cmdPosts(s.f).length, 0);
  } finally { s.close(); }
});

test('proposals are rate limited, and a foreign Origin is refused', async () => {
  const s = await boot();
  try {
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    for (let i = 0; i < 10; i++) assert.equal((await s.post(ditto, '/api/propose', { text: `idea ${i}` })).status, 200);
    assert.equal((await s.post(ditto, '/api/propose', { text: 'one too many' })).status, 429);
    const evil = await s.req('/api/propose', { method: 'POST', headers: { cookie: ditto, origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"text":"x"}' });
    assert.equal(evil.status, 403);
  } finally { s.close(); }
});

test('collaborator assistant is limited to 10 questions a minute; the owner keeps 20', async () => {
  const s = await boot({}, { groq: groqOk({ reply: 'ok', command: null }) });
  try {
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    for (let i = 0; i < 10; i++) assert.equal((await s.post(ditto, '/api/chat', { text: 'hi' })).status, 200);
    assert.equal((await s.post(ditto, '/api/chat', { text: 'hi' })).status, 429);
    assert.equal((await s.post(owner, '/api/chat', { text: 'hi' })).status, 200); // separate budgets
  } finally { s.close(); }
});

test('assistant for Ditto may only propose a relay; for the owner it may never propose one', () => {
  const snap = snapshot();
  const relay = JSON.stringify({ reply: 'ok', command: { type: 'relay', text: 'idea', from: 'voltage' } });
  const msg = JSON.stringify({ reply: 'ok', command: { type: 'message', role: 'designer', text: 'hi' } });
  const link = JSON.stringify({ reply: 'ok', command: { type: 'link-chat', text: 'hi' } });
  assert.equal(parseBrainOutput(relay, snap, true).command.from, 'ditto');
  assert.equal(parseBrainOutput(msg, snap, true).command, null);
  assert.equal(parseBrainOutput(link, snap, true).command, null);
  assert.equal(parseBrainOutput(relay, snap, false).command, null);
  assert.equal(parseBrainOutput(link, snap, false).command.type, 'link-chat');
  assert.equal(validateCommand({ type: 'relay', text: 'x' }, snap).command.from, 'ditto');
});

function bot(groqReply, collabIds = [DITTO_ID]) {
  const f = fakeFetch({ groq: groqOk(groqReply) });
  const discord = createDiscord({ token: 'fake', fetch: f });
  const brain = createBrain({ fetch: f, apiKey: 'fake', getState: async () => ({ snapshot: snapshot(), online: true, ageMs: 1000 }) });
  const sent = [];
  const onMessage = createBot({ discord, brain, ownerIds: [OWNER], collabIds, askChannelId: 'ASK', sendCommand: async (c) => sent.push(c) });
  const say = (author, content, dm = false) => onMessage({ id: 'm', channel_id: dm ? 'DM' : 'ASK', guild_id: dm ? undefined : 'G', author: { id: author }, content, mentions: [] });
  const replies = () => posts(f).map((c) => JSON.parse(c.init.body).content);
  return { say, sent, replies };
}

test('bot: Ditto gets read-only answers, strangers still get nothing', async () => {
  const b = bot({ reply: 'two tasks running', command: { type: 'message', role: 'designer', text: 'do it' } });
  await b.say(DITTO_ID, 'what is going on?');
  assert.match(b.replies()[0], /two tasks running/);
  assert.doesNotMatch(b.replies()[0], /Proposed/); // the message command was dropped for him
  await b.say(DITTO_ID, 'yes');
  assert.equal(b.sent.length, 0);
  await b.say('999', 'status');
  assert.equal(b.replies().at(-1), 'I only answer the owner here.');
});

test('bot: Ditto proposals become a relay only after he says yes; DMs work too', async () => {
  const b = bot({ reply: 'I can pass that on.', command: { type: 'relay', text: 'add a shop' } });
  await b.say(DITTO_ID, 'please ask Voltage to add a shop', true);
  assert.match(b.replies()[0], /Proposed: relay/);
  assert.equal(b.sent.length, 0);
  await b.say(DITTO_ID, 'yes');
  assert.equal(b.sent.length, 1);
  assert.equal(b.sent[0].type, 'relay');
  assert.equal(b.sent[0].from, 'ditto');
});

test('bot: without COLLAB_IDS Ditto is a stranger', async () => {
  const b = bot({ reply: 'secret', command: null }, []);
  await b.say(DITTO_ID, 'status');
  assert.equal(b.replies()[0], 'I only answer the owner here.');
});

test('role on propose and link-task: optional, must match ^[a-z][a-z0-9-]{0,29}$, ends up in the command', async () => {
  const s = await boot();
  try {
    const ditto = await s.cookieOf(DITTO_PASSWORD, '1.1.1.2');
    const owner = await s.cookieOf(FAKE_PASSWORD, '1.1.1.1');
    assert.equal((await s.post(ditto, '/api/propose', { text: 'look at this', role: 'scout' })).status, 200);
    assert.equal(JSON.parse(JSON.parse(cmdPosts(s.f).at(-1).init.body).content.slice(7)).role, 'scout');
    for (const role of ['Scout', '1a', 'a b', 'a'.repeat(31), '../x', 5]) assert.equal((await s.post(ditto, '/api/propose', { text: 'x', role })).status, 400, String(role));
    assert.equal((await s.post(owner, '/api/command', { type: 'link-task', title: 'T', body: '', role: 'designer' })).status, 200);
    assert.equal((await s.post(owner, '/api/command', { type: 'link-task', title: 'T', body: '', role: 'Bad Role' })).status, 400);
    assert.equal(validateCommand({ type: 'relay', text: 'x', role: '' }, { roles: [] }).command.role, undefined);
  } finally { s.close(); }
});

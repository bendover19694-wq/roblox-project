import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrain, createBot, parseBrainOutput } from '../brain.mjs';
import { createHqState, validateCommand, postCommand } from '../hq-state.mjs';
import { createDiscord } from '../discord.mjs';
import { fakeFetch, groqOk, groqFail, snapshot, posts, BOT, OWNER } from './helpers.mjs';

const state = (snap = snapshot(), online = true) => async () => ({ snapshot: snap, online, ageMs: 5000 });

test('validateCommand: bad role, long text, unknown type, ids', () => {
  const s = snapshot();
  assert.equal(validateCommand({ type: 'message', role: 'ghost', text: 'x' }, s).ok, false);
  assert.equal(validateCommand({ type: 'message', role: 'designer', text: 'x'.repeat(2001) }, s).ok, false);
  assert.equal(validateCommand({ type: 'message', role: 'designer', text: '   ' }, s).ok, false);
  assert.equal(validateCommand({ type: 'task', role: 'designer', title: 'x'.repeat(201) }, s).ok, false);
  assert.equal(validateCommand({ type: 'nuke' }, s).ok, false);
  assert.equal(validateCommand({ type: 'answer', askId: 'nope', answer: 'x' }, s).ok, false);
  assert.equal(validateCommand({ type: 'message', role: 'designer', text: 'x' }, null).ok, false);
  const good = validateCommand({ type: 'task', role: 'scripter', title: 'T', body: 'b', game: 'space', evil: 1 }, s);
  assert.equal(good.ok, true);
  assert.match(good.command.id, /^c_[0-9a-f]{12}$/);
  assert.equal(good.command.evil, undefined);
  assert.equal(validateCommand({ type: 'answer', askId: 'a1', answer: 'red' }, s).ok, true);
});

test('parseBrainOutput: valid command kept, invalid command dropped', () => {
  const s = snapshot();
  const ok = parseBrainOutput(JSON.stringify({ reply: 'done', command: { type: 'message', role: 'designer', text: 'hi' } }), s);
  assert.equal(ok.reply, 'done');
  assert.equal(ok.command.type, 'message');
  const dropped = parseBrainOutput(JSON.stringify({ reply: 'done', command: { type: 'message', role: 'ghost', text: 'hi' } }), s);
  assert.equal(dropped.command, null);
  assert.equal(parseBrainOutput(JSON.stringify({ reply: 'x', command: null }), s).command, null);
  assert.throws(() => parseBrainOutput('not json', s));
  assert.throws(() => parseBrainOutput('{"command":null}', s));
});

test('brain counts Groq requests and tokens, and sends JSON mode', async () => {
  const seen = [];
  const f = fakeFetch({ groq: (body) => (seen.push(body), groqOk({ reply: 'All quiet.', command: null }, 77)()) });
  const brain = createBrain({ fetch: f, apiKey: 'fake', getState: state() });
  const out = await brain.respond('what is going on?');
  assert.equal(out.reply, 'All quiet.');
  assert.deepEqual(brain.stats, { requests: 1, tokens: 77 });
  assert.deepEqual(seen[0].response_format, { type: 'json_object' });
  assert.equal(seen[0].model, 'llama-3.3-70b-versatile');
  assert.match(seen[0].messages[0].content, /DV Enterprises/);
  assert.ok(seen[0].messages[0].content.length < 14_000);
});

test('Groq failure or garbage falls back to the quick status reply', async () => {
  for (const groq of [groqFail, groqOk('not json at all')]) {
    const brain = createBrain({ fetch: fakeFetch({ groq }), apiKey: 'fake', getState: state() });
    const out = await brain.respond('tell me everything');
    assert.match(out.reply, /HQ is online/);
    assert.equal(out.command, null);
  }
  const noKey = createBrain({ fetch: fakeFetch(), apiKey: '', getState: state() });
  assert.match((await noKey.respond('hello')).reply, /Groq is not configured/);
});

test('quick replies need no Groq', async () => {
  const brain = createBrain({ fetch: fakeFetch(), apiKey: 'fake', getState: state() });
  assert.match((await brain.respond('Status?')).reply, /1 active task, 1 open ask/);
  assert.match((await brain.respond('asks')).reply, /Pick a colour/);
  assert.match((await brain.respond('usage')).reply, /todayUsd/);
  assert.match((await brain.respond('help')).reply, /status, usage, asks, help/);
  const off = createBrain({ fetch: fakeFetch(), apiKey: '', getState: state(null, false) });
  assert.match((await off.respond('status')).reply, /no HQ snapshot/);
});

test('hq-state: newest bot snapshot only, cdn host allow-list, 60 s cache, staleness', async () => {
  let t = Date.now();
  const f = fakeFetch();
  const discord = createDiscord({ token: 'fake', fetch: f });
  const hq = createHqState({ discord, channelId: 'STATE', fetch: f, now: () => t });
  const a = await hq.get();
  assert.equal(a.online, true);
  await hq.get();
  assert.equal(f.calls.filter((c) => c.url.includes('/messages?limit')).length, 1);
  t += 61_000;
  await hq.get();
  assert.equal(f.calls.filter((c) => c.url.includes('/messages?limit')).length, 2);
  t += 11 * 60_000;
  assert.equal((await hq.get()).online, false);

  // spoofed author, webhook author, and non-cdn host are all rejected
  const att = { filename: 'state.json', size: 10, url: 'https://cdn.discordapp.com/a/state.json' };
  const mk = (author, extra = {}, a = att) => ({ id: 'x', author: { id: author }, content: 'HQSTATE1 now', timestamp: new Date().toISOString(), attachments: [a], ...extra });
  for (const msgs of [[mk('someone-else')], [mk(BOT, { webhook_id: 'w' })], [mk(BOT, {}, { ...att, url: 'https://evil.example/state.json' })]]) {
    const f2 = fakeFetch({ stateMsgs: msgs });
    const hq2 = createHqState({ discord: createDiscord({ token: 'fake', fetch: f2 }), channelId: 'STATE', fetch: f2 });
    assert.equal((await hq2.get()).snapshot, null);
    assert.equal(f2.calls.some((c) => c.url.includes('evil.example')), false);
  }
});

test('postCommand refuses content over 2000 characters', async () => {
  const f = fakeFetch();
  const discord = createDiscord({ token: 'fake', fetch: f });
  await assert.rejects(postCommand(discord, 'CMD', { id: 'c_000000000000', type: 'message', role: 'designer', text: 'x'.repeat(1990) }), (e) => e.tooLong);
  assert.equal(posts(f).length, 0);
});

function botSetup(over = {}) {
  const f = fakeFetch({ groq: groqOk({ reply: 'secret-sauce-answer', command: null }) });
  const discord = createDiscord({ token: 'fake', fetch: f });
  const brain = createBrain({ fetch: f, apiKey: 'fake', getState: state() });
  const sent = [];
  let t = 1_000_000;
  const onMessage = createBot({ discord, brain, ownerIds: [OWNER], askChannelId: 'ASK', sendCommand: async (c) => sent.push(c), now: () => t, ...over });
  return { f, brain, onMessage, sent, tick: (ms) => (t += ms) };
}
const msg = (over) => ({ id: 'm', channel_id: 'ASK', guild_id: 'G', author: { id: OWNER }, content: 'status', mentions: [], ...over });
const replies = (f) => posts(f).map((c) => JSON.parse(c.init.body));

test('bot: non-owner gets no data, one polite line per hour', async () => {
  const b = botSetup();
  await b.onMessage(msg({ author: { id: 'stranger' }, content: 'status' }));
  await b.onMessage(msg({ author: { id: 'stranger' }, content: 'asks' }));
  let r = replies(b.f);
  assert.equal(r.length, 1);
  assert.equal(r[0].content, 'I only answer the owner here.');
  assert.deepEqual(r[0].allowed_mentions, { parse: [] });
  assert.equal(b.f.calls.some((c) => c.url.includes('groq')), false);
  b.tick(3600_001);
  await b.onMessage(msg({ author: { id: 'stranger' } }));
  assert.equal(replies(b.f).length, 2);
});

test('bot: ignores unaddressed channels, bots and webhooks; answers owner in ask channel, DM, mention', async () => {
  const b = botSetup();
  await b.onMessage(msg({ channel_id: 'OTHER' }));
  await b.onMessage(msg({ author: { id: OWNER, bot: true } }));
  await b.onMessage(msg({ webhook_id: 'w' }));
  assert.equal(replies(b.f).length, 0);
  await b.onMessage(msg());
  await b.onMessage(msg({ channel_id: 'OTHER', guild_id: undefined }));
  await b.onMessage(msg({ channel_id: 'OTHER', content: `<@${BOT}> usage`, mentions: [{ id: BOT }] }));
  const r = replies(b.f);
  assert.equal(r.length, 3);
  assert.match(r[0].content, /HQ is online/);
});

test('bot: proposed command waits for the owner to confirm', async () => {
  const cmd = { type: 'message', role: 'designer', text: 'ship it' };
  const f = fakeFetch({ groq: groqOk({ reply: 'Will tell them.', command: cmd }) });
  const discord = createDiscord({ token: 'fake', fetch: f });
  const brain = createBrain({ fetch: f, apiKey: 'fake', getState: state() });
  const sent = [];
  const onMessage = createBot({ discord, brain, ownerIds: [OWNER], askChannelId: 'ASK', sendCommand: async (c) => sent.push(c) });
  await onMessage(msg({ content: 'tell the designer to ship it' }));
  assert.equal(sent.length, 0);
  assert.match(replies(f)[0].content, /Reply "yes"/);
  await onMessage(msg({ content: 'yes' }));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].role, 'designer');
  await onMessage(msg({ content: 'yes' }));
  assert.equal(sent.length, 1);
});

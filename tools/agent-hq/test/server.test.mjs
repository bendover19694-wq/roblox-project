import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.mjs';
import { loadRoles } from '../briefs.mjs';

const rolesWith = (gates) => loadRoles().map((r) => (r.id === 'builder' ? { ...r, gates } : r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// briefs read the hard rules and vault from <root>/.claude/skills/roblox-agent-team; give temp roots a copy
const seedSkills = (tmp) => {
  const dir = path.join(tmp, '.claude/skills/roblox-agent-team');
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ['SKILL.md', 'vault.md']) fs.copyFileSync(path.resolve(import.meta.dirname, '../../..', '.claude/skills/roblox-agent-team', f), path.join(dir, f));
};

const root = path.resolve(import.meta.dirname, '../../..');

// a failing test must not leave a server running and hang the process
const opened = [];
after(async () => { for (const s of opened) await s.close().catch(() => {}); });

async function boot(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-'));
  const s = await startServer({ root, port: 0, stateDir: dir, ...opts });
  opened.push(s);
  const base = `http://127.0.0.1:${s.port}`;
  const as = (tok) => async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, {
      method, headers: { 'x-hq-token': tok, 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  // api = the dashboard (owner token); agent = an agent (agent token, as MCP and hqctl use)
  return { s, base, api: as(s.ownerToken), agent: as(s.token), dir };
}

// raw request so the path is not normalized by a URL parser
const raw = (port, p, headers = {}) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path: p, headers }, (res) => {
    res.resume();
    res.on('end', () => resolve(res.statusCode));
  }).on('error', reject);
});

test('401 without token, health is open', async () => {
  const { s, base } = await boot();
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  assert.equal((await fetch(`${base}/api/state`)).status, 401);
  assert.equal((await fetch(`${base}/api/state`, { headers: { 'x-hq-token': 'nope' } })).status, 401);
  assert.equal((await fetch(`${base}/api/events?token=nope`)).status, 401);
  await s.close();
});

test('task create/list, validation, state shape', async () => {
  const { s, api } = await boot();
  const t = await api('POST', '/api/tasks', { title: 'Hello', body: 'b', role: 'builder' });
  assert.equal(t.status, 200);
  assert.match(t.json.id, /^t_/);
  assert.equal(t.json.state, 'queued');
  assert.equal((await api('POST', '/api/tasks', { title: 'x', role: 'nobody' })).status, 400);
  assert.equal((await api('POST', '/api/tasks', { title: 'x'.repeat(201), role: 'ui' })).status, 400);
  const st = await api('GET', '/api/state');
  assert.equal(st.json.tasks.length, 1);
  assert.equal(st.json.roles.length, 16);
  assert.equal(st.json.settings.budget, 2);
  assert.deepEqual(st.json.lanes, { app: { lastSeenAt: null, lastRunAt: null }, antigravity: { lastSeenAt: null, lastRunAt: null } });
  assert.deepEqual(st.json.engines, { 'claude-cli': false, echo: true });
  assert.equal(st.json.games[0].slug, 'space-agency');
  const c = await api('POST', `/api/tasks/${t.json.id}/cancel`);
  assert.equal(c.json.state, 'canceled');
  const r = await api('POST', `/api/tasks/${t.json.id}/retry`);
  assert.equal(r.json.state, 'queued');
  const cl = await api('POST', `/api/tasks/${t.json.id}/claim`, { engine: 'app' });
  assert.equal(cl.json.task.state, 'working');
  const done = await api('POST', `/api/tasks/${t.json.id}/complete`, { summary: 'ok' });
  assert.equal(done.json.state, 'review');
  assert.ok((await api('GET', `/api/tasks/${t.json.id}/brief`)).json.brief.length > 100);
  assert.deepEqual((await api('GET', `/api/tasks/${t.json.id}/log`)).json, { lines: [] });
  await s.close();
});

test('oversized body is 413', async () => {
  const { s, api } = await boot();
  const r = await api('POST', '/api/tasks', { title: 'x', role: 'ui', body: 'a'.repeat(1024 * 1024 + 10) });
  assert.equal(r.status, 413);
  await s.close();
});

test('media path traversal and bad host are refused', async () => {
  const { s } = await boot();
  assert.equal(await raw(s.port, '/media/../CLAUDE.md'), 404);
  assert.equal(await raw(s.port, '/media/..%2FCLAUDE.md'), 404);
  assert.equal(await raw(s.port, '/static/../server.mjs'), 404);
  assert.equal(await raw(s.port, '/api/health', { host: 'evil.example' }), 403);
  await s.close();
});

test('asks: review changes queues follow-up; lead message queues lead task', async () => {
  const { s, api, agent } = await boot();
  const t = await api('POST', '/api/tasks', { title: 'Build it', role: 'ui' });
  const a = await api('POST', '/api/asks', { taskId: t.json.id, role: 'ui', kind: 'review', title: 'Look' });
  await api('POST', `/api/tasks/${t.json.id}/claim`, { engine: 'app' });
  await api('POST', `/api/tasks/${t.json.id}/complete`, { summary: 's' });
  const ans = await api('POST', `/api/asks/${a.json.id}/answer`, { answer: 'changes:bigger button' });
  assert.equal(ans.json.state, 'answered');
  assert.equal((await api('POST', `/api/asks/${a.json.id}/answer`, { answer: 'approve' })).status, 409);
  const tasks = (await api('GET', '/api/tasks')).json;
  assert.ok(tasks.some((x) => x.title === 'Changes: Build it' && x.state === 'queued' && x.parentId === t.json.id));
  await api('POST', '/api/messages', { role: 'lead', text: 'Plan the shop\nmore' });
  assert.ok((await api('GET', '/api/tasks?role=lead')).json.some((x) => x.title === 'Plan the shop'));
  const lead = (await api('GET', '/api/tasks?role=lead')).json[0];
  const lc = await api('POST', `/api/tasks/${lead.id}/claim`, { engine: 'app' });
  await agent('POST', '/api/messages', { taskId: lead.id, taskToken: lc.json.taskToken, text: 'note' });
  assert.equal((await api('GET', '/api/tasks?role=lead')).json.length, 1);
  await s.close();
});

test('settings whitelist, pause/resume, pitch approval', async () => {
  const { s, api } = await boot();
  assert.equal((await api('POST', '/api/settings', { key: 'budget', value: 9 })).status, 400);
  assert.equal((await api('POST', '/api/settings', { key: 'bogus', value: 1 })).status, 400);
  assert.equal((await api('POST', '/api/settings', { key: 'budget', value: 3 })).status, 200);
  assert.equal((await api('POST', '/api/pause')).json.paused, true);
  assert.equal((await api('GET', '/api/settings')).json.paused, true);
  await api('POST', '/api/resume');
  const sch = await api('POST', '/api/settings', { key: 'schedules', value: [{ role: 'scout', title: 'Charts', everyMinutes: 60, enabled: true }] });
  assert.match(sch.json.value[0].id, /^s_/);
  const p = await api('POST', '/api/pitches', { title: 'Idea', oneLiner: 'x' });
  await api('POST', `/api/pitches/${p.json.id}/decide`, { state: 'approved' });
  assert.ok((await api('GET', '/api/tasks?role=lead')).json.some((x) => x.title === 'Plan pitch: Idea'));
  await s.close();
});

test('market refresh uses injected fetcher; vault and library respond', async () => {
  const snap = { fetchedAt: '2026-01-01T00:00:00.000Z', sorts: [{ id: 'a', name: 'A', games: [] }] };
  const { s, api } = await boot({ fetchCharts: async () => snap });
  assert.equal((await api('GET', '/api/market')).json.latest.fetchedAt, null);
  assert.deepEqual((await api('POST', '/api/market/refresh')).json.latest, snap);
  assert.equal((await api('GET', '/api/market')).json.latest.fetchedAt, snap.fetchedAt);
  assert.ok((await api('GET', '/api/vault')).json.chapters.length >= 14);
  const lib = (await api('GET', '/api/library')).json;
  assert.ok(lib.skills.some((k) => k.name === 'roblox-agent-team'));
  await s.close();
});

test('POST /api/tasks/next: oldest app task, empty queue updates lanes', async () => {
  const { s, api } = await boot();
  const a = await api('POST', '/api/tasks', { title: 'First', role: 'builder' });
  await api('POST', '/api/tasks', { title: 'Second', role: 'builder' });
  const d = await api('POST', '/api/tasks', { title: 'Design', role: 'designer' });
  assert.equal(a.json.engine, 'app');
  assert.equal(d.json.engine, 'antigravity');
  const n = await api('POST', '/api/tasks/next', { engine: 'app' });
  assert.equal(n.json.task.id, a.json.id);
  assert.equal(n.json.task.state, 'working');
  assert.ok(n.json.brief.includes(a.json.id));
  const g = await api('POST', '/api/tasks/next', { engine: 'antigravity', roles: ['designer'] });
  assert.equal(g.json.task.id, d.json.id);
  assert.equal((await api('POST', '/api/tasks/next', { engine: 'antigravity' })).json.task, null);
  assert.equal((await api('POST', '/api/tasks/next', { engine: 'claude-cli' })).status, 400);
  assert.equal((await api('POST', '/api/tasks/next', { engine: 'app', roles: ['nope'] })).status, 400);
  const st = (await api('GET', '/api/state')).json;
  assert.ok(st.lanes.app.lastSeenAt && st.lanes.antigravity.lastSeenAt);
  // roleEngines uses the new vocabulary and old values are migrated
  assert.equal((await api('POST', '/api/settings', { key: 'roleEngines', value: { ui: { engine: 'claude-cli' } } })).status, 200);
  assert.equal((await api('POST', '/api/tasks', { title: 'u', role: 'ui' })).json.engine, 'claude-cli');
  assert.equal((await api('POST', '/api/settings', { key: 'roleEngines', value: { ui: { engine: 'bogus' } } })).status, 400);
  await s.close();
});

test('approving a designer review ask queues a ui task', async () => {
  const { s, api } = await boot();
  const t = await api('POST', '/api/tasks', { title: 'Shop concept', role: 'designer' });
  const n = await api('POST', '/api/tasks/next', { engine: 'antigravity' });
  assert.equal(n.json.task.id, t.json.id);
  const a = await api('POST', '/api/asks', { taskId: t.json.id, role: 'designer', kind: 'review', title: 'Concept', mediaPath: 'x/1.png' });
  await api('POST', `/api/tasks/${t.json.id}/complete`, { summary: 'done' });
  await api('POST', `/api/asks/${a.json.id}/answer`, { answer: 'approve' });
  const ui = (await api('GET', '/api/tasks?role=ui')).json;
  assert.equal(ui.length, 1);
  assert.equal(ui[0].title, 'Build approved concept: Shop concept');
  assert.equal(ui[0].engine, 'app');
  assert.equal(ui[0].parentId, t.json.id);
  assert.match(ui[0].body, /x\/1\.png/);
  await s.close();
});

test('SSE delivers a task event after a POST', async () => {
  const { s, base, api } = await boot();
  const res = await fetch(`${base}/api/events?token=${s.token}`);
  assert.equal(res.status, 200);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  await api('POST', '/api/tasks', { title: 'Live', role: 'ui' });
  let buf = '';
  const deadline = Date.now() + 3000;
  while (!buf.includes('event: task') && Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value);
  }
  assert.match(buf, /event: task\ndata: .*"title":"Live"/);
  await reader.cancel();
  await s.close();
});

// claim a queued task for the app lane and complete it
async function work(api, id, summary, state) {
  assert.equal((await api('POST', `/api/tasks/${id}/claim`, { engine: 'app' })).status, 200);
  return (await api('POST', `/api/tasks/${id}/complete`, { summary, state })).json;
}
const tasksOf = async (api, q = '') => (await api('GET', `/api/tasks${q}`)).json;

test('gates: review queues reviewer + playtester; all PASS marks done', async () => {
  const { s, api } = await boot({ roles: rolesWith(['reviewer', 'playtester']) });
  const t = (await api('POST', '/api/tasks', { title: 'Add shop', body: 'do it', role: 'builder' })).json;
  const r = await work(api, t.id, 'changed src/a.luau');
  assert.equal(r.state, 'review');
  const gates = (await tasksOf(api)).filter((x) => x.gateFor === t.id);
  assert.deepEqual(gates.map((g) => g.role).sort(), ['playtester', 'reviewer']);
  for (const g of gates) {
    assert.equal(g.title, 'Check: Add shop');
    assert.equal(g.createdBy, 'gate');
    assert.equal(g.parentId, t.id);
    assert.equal(g.state, 'queued');
    assert.match(g.body, new RegExp(`task ${t.id}`));
  }
  await work(api, gates[0].id, 'PASS looks good');
  assert.equal((await api('GET', `/api/tasks/${t.id}`)).json.state, 'review'); // one gate still open
  await work(api, gates[1].id, 'pass: ran it');
  assert.equal((await api('GET', `/api/tasks/${t.id}`)).json.state, 'done');
  assert.ok((await api('GET', '/api/messages?role=builder')).json.some((m) => m.from === 'system' && /Passed review gates/.test(m.text)));
  await s.close();
});

test('gates: FAIL queues Fix with attempt 2; third FAIL asks the owner; retry requeues', async () => {
  const { s, api } = await boot({ roles: rolesWith(['reviewer']) });
  let cur = (await api('POST', '/api/tasks', { title: 'Add shop', body: 'orig body', role: 'builder' })).json;
  for (const attempt of [1, 2]) {
    assert.equal(cur.attempt, attempt);
    await work(api, cur.id, 'done');
    const gate = (await tasksOf(api)).find((x) => x.gateFor === cur.id);
    await work(api, gate.id, `FAIL: round ${attempt} problem`);
    assert.equal((await api('GET', `/api/tasks/${cur.id}`)).json.state, 'failed');
    const fix = (await tasksOf(api)).find((x) => x.parentId === cur.id && x.title === 'Fix: Add shop');
    assert.equal(fix.attempt, attempt + 1);
    assert.equal(fix.role, 'builder');
    assert.equal(fix.state, 'queued');
    assert.match(fix.body, /orig body[\s\S]*Reviewer feedback:\nFAIL: round \d problem/);
    cur = fix;
  }
  await work(api, cur.id, 'done again');
  const gate3 = (await tasksOf(api)).find((x) => x.gateFor === cur.id);
  await work(api, gate3.id, 'fail: still broken');
  assert.equal((await tasksOf(api)).filter((x) => x.title === 'Fix: Add shop').length, 2); // no 4th attempt
  const ask = (await api('GET', '/api/asks?state=open')).json.find((a) => a.title === 'Gate failed 3 times: Add shop');
  assert.ok(ask);
  assert.equal(ask.kind, 'decision');
  assert.deepEqual(ask.options.map((o) => o.id), ['retry', 'drop']);
  await api('POST', `/api/asks/${ask.id}/answer`, { answer: 'retry' });
  const back = (await api('GET', `/api/tasks/${cur.id}`)).json;
  assert.equal(back.state, 'queued');
  assert.equal(back.attempt, 1);
  await s.close();
});

test('conversations: any role message queues a task; reset marker; threads and unread', async () => {
  const { s, api, agent } = await boot();
  const msg = (await api('POST', '/api/messages', { role: 'builder', text: `Make the shop button bigger\n${'x'.repeat(200)}` })).json;
  const q = (await tasksOf(api, '?role=builder'))[0];
  assert.equal(q.state, 'queued');
  assert.equal(q.title, 'Make the shop button bigger');
  assert.equal(q.createdBy, 'owner');
  assert.equal(q.threadMessageId, msg.id);
  assert.equal((await api('POST', '/api/messages', { role: 'ui', text: 'y'.repeat(150) })).status, 200);
  assert.equal((await tasksOf(api, '?role=ui'))[0].title.length, 100);
  const qc = await api('POST', `/api/tasks/${q.id}/claim`, { engine: 'app' }); // the builder picks it up and posts notes
  await agent('POST', '/api/messages', { taskId: q.id, taskToken: qc.json.taskToken, text: 'agent note' });
  assert.equal((await tasksOf(api, '?role=builder')).length, 1); // agent notes queue nothing
  const reset = (await api('POST', '/api/messages/builder/reset')).json;
  assert.equal(reset.from, 'system');
  assert.equal(reset.text, 'New conversation');
  assert.equal((await api('POST', '/api/messages/nobody/reset')).status, 400);
  let th = (await api('GET', '/api/threads')).json;
  assert.equal(th.length, 16);
  const b = th.find((x) => x.role === 'builder');
  assert.equal(b.unread, 1);
  assert.equal(b.last.text, 'New conversation');
  assert.equal(b.lastReadAt, null);
  assert.equal(th.find((x) => x.role === 'scout').last, null);
  await sleep(5);
  assert.equal((await api('POST', '/api/threads/builder/read')).status, 200);
  th = (await api('GET', '/api/threads')).json;
  assert.equal(th.find((x) => x.role === 'builder').unread, 0);
  assert.ok(th.find((x) => x.role === 'builder').lastReadAt);
  await sleep(5);
  await agent('POST', '/api/messages', { taskId: q.id, taskToken: qc.json.taskToken, text: 'another' });
  assert.equal((await api('GET', '/api/threads')).json.find((x) => x.role === 'builder').unread, 1);
  await s.close();
});

test('role memory: append, dedupe, cap at 60, length limit', async () => {
  const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-mem-'));
  const { s, api } = await boot({ memoryDir, now: () => Date.parse('2026-03-04T10:00:00Z') });
  assert.deepEqual((await api('GET', '/api/memory/builder')).json, { lessons: [] });
  const a = await api('POST', '/api/memory/builder', { lesson: '  Run stylua first  ' });
  assert.equal(a.json.added, true);
  assert.deepEqual(a.json.lessons, [{ date: '2026-03-04', text: 'Run stylua first' }]);
  assert.equal((await api('POST', '/api/memory/builder', { lesson: 'Run stylua first' })).json.added, false);
  assert.equal((await api('GET', '/api/memory/builder')).json.lessons.length, 1);
  assert.equal(fs.readFileSync(path.join(memoryDir, 'builder.md'), 'utf8'), '- 2026-03-04: Run stylua first\n');
  for (let i = 0; i < 64; i++) await api('POST', '/api/memory/builder', { lesson: `lesson ${i}` });
  const l = (await api('GET', '/api/memory/builder')).json.lessons;
  assert.equal(l.length, 60);
  assert.equal(l.at(-1).text, 'lesson 63');
  assert.equal(l[0].text, 'lesson 4');
  assert.equal((await api('POST', '/api/memory/builder', { lesson: 'z'.repeat(301) })).status, 400);
  assert.equal((await api('POST', '/api/memory/nobody', { lesson: 'x' })).status, 400);
  await s.close();
});

test('laneSchedules: defaults and validation', async () => {
  const { s, api } = await boot();
  const def = (await api('GET', '/api/state')).json.settings.laneSchedules;
  assert.deepEqual(def.app, { enabled: true, everyMinutes: 60, activeFrom: '00:00', activeTo: '24:00', maxTasks: 8 });
  assert.deepEqual(def.antigravity, { enabled: true, everyMinutes: 20, activeFrom: '00:00', activeTo: '24:00', maxTasks: 6 });
  const set = (v) => api('POST', '/api/settings', { key: 'laneSchedules', value: v });
  assert.equal((await set({ app: { ...def.app, everyMinutes: 19 } })).status, 400);
  assert.equal((await set({ app: { ...def.app, everyMinutes: 1441 } })).status, 400);
  assert.equal((await set({ app: { ...def.app, activeFrom: '25:00' } })).status, 400);
  assert.equal((await set({ app: { ...def.app, activeTo: '24:01' } })).status, 400);
  assert.equal((await set({ app: { ...def.app, maxTasks: 0 } })).status, 400);
  assert.equal((await set({ app: { ...def.app, maxTasks: 21 } })).status, 400);
  assert.equal((await set({ app: { ...def.app, enabled: 'yes' } })).status, 400);
  assert.equal((await set({ app: { ...def.app, everyMinutes: 180, activeFrom: '22:00', activeTo: '06:00' } })).status, 200);
  const after = (await api('GET', '/api/settings')).json.laneSchedules;
  assert.equal(after.app.everyMinutes, 180);
  assert.deepEqual(after.antigravity, def.antigravity); // untouched lane keeps defaults
  await s.close();
});

test('lane gate: every branch', async () => {
  const at = (h, m = 0) => new Date(2026, 0, 15, h, m).getTime();
  let clock = at(12);
  const { s, api } = await boot({ now: () => clock });
  const gate = async (manual) => (await api('POST', '/api/lanes/app/gate', { manual })).json;
  const sched = (patch) => api('POST', '/api/settings', { key: 'laneSchedules', value: { app: { ...patch } } });
  const lanes = async () => (await api('GET', '/api/state')).json.lanes;
  assert.equal((await api('POST', '/api/lanes/nope/gate', {})).status, 400);

  // empty queue
  let g = await gate();
  assert.deepEqual([g.run, g.reason, g.queued, g.maxTasks], [false, 'queue empty', 0, 8]);
  assert.ok((await lanes()).app.lastSeenAt); // gate counts as a check-in
  assert.equal((await lanes()).app.lastRunAt, null);

  await api('POST', '/api/tasks', { title: 'one', role: 'builder' });
  await api('POST', '/api/tasks', { title: 'two', role: 'builder' });

  // disabled blocks even manual
  await sched({ enabled: false });
  assert.deepEqual(await gate(false), { run: false, reason: 'lane paused in HQ', maxTasks: 8, queued: 2 });
  assert.equal((await gate(true)).reason, 'lane paused in HQ');
  await sched({ enabled: true });

  // global pause
  await api('POST', '/api/pause');
  assert.equal((await gate(true)).run, false);
  assert.equal((await gate(false)).reason, 'HQ is paused');
  await api('POST', '/api/resume');

  // outside a daytime window; manual bypasses it
  await sched({ activeFrom: '09:00', activeTo: '17:00' });
  clock = at(20);
  assert.equal((await gate(false)).reason, 'outside active hours');
  clock = at(8, 59);
  assert.equal((await gate(false)).reason, 'outside active hours');
  clock = at(17, 0);
  assert.equal((await gate(false)).reason, 'outside active hours'); // end is exclusive
  clock = at(9, 0);
  assert.equal((await gate(false)).run, true);

  // run=true recorded lastRunAt; not due until the interval passes
  assert.equal((await lanes()).app.lastRunAt, new Date(at(9, 0)).toISOString());
  clock = at(9, 30);
  g = await gate(false);
  assert.deepEqual([g.run, g.reason], [false, 'not due until 10:00']);
  assert.equal((await gate(true)).run, true); // manual bypasses the due check
  assert.equal((await lanes()).app.lastRunAt, new Date(at(9, 30)).toISOString());
  clock = at(9, 30) + 57 * 60000; // 57 min later: not due yet
  assert.equal((await gate(false)).run, false);
  clock = at(9, 30) + 58 * 60000; // 58 min = every(60) - 2 grace
  assert.equal((await gate(false)).run, true);

  // overnight window 22:00 -> 06:00
  await sched({ activeFrom: '22:00', activeTo: '06:00' });
  let day = 0;
  for (const [h, m, inside] of [[23, 30, true], [3, 0, true], [22, 0, true], [5, 59, true], [6, 0, false], [12, 0, false], [21, 59, false]]) {
    clock = at(h, m) + ++day * 24 * 3600 * 1000; // a day later each time so the interval is always due
    const r = await gate(false);
    assert.equal(r.reason === 'outside active hours', !inside, `${h}:${m}`);
    if (inside) assert.equal(r.run, true);
  }

  // antigravity lane has its own queue and config
  const ag = (await api('POST', '/api/lanes/antigravity/gate', {})).json;
  assert.deepEqual([ag.run, ag.reason, ag.maxTasks], [false, 'queue empty', 6]);
  await api('POST', '/api/tasks', { title: 'art', role: 'designer' });
  assert.equal((await api('POST', '/api/lanes/antigravity/gate', {})).json.run, true);
  await s.close();
});

// ---------- r5: games, stages, live numbers, uploads, verdicts, pitches, market, library ----------
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const reviewTask = async (api, role, title, game) => {
  const t = (await api('POST', '/api/tasks', { title, role, game })).json;
  await work(api, t.id, 'done');
  return t;
};

test('games: seed, create, patch, work counts', async () => {
  const { s, api } = await boot();
  const g = (await api('GET', '/api/games')).json;
  assert.equal(g.length, 1);
  assert.deepEqual([g[0].slug, g[0].name, g[0].stage, g[0].version], ['space-agency', 'Run a Space Agency', 'built', 1]);
  assert.match(g[0].nextStep, /hands-on test/);
  assert.equal((await api('GET', '/api/state')).json.games[0].slug, 'space-agency');
  assert.equal((await api('POST', '/api/games', { slug: 'Bad Slug', name: 'x' })).status, 400);
  assert.equal((await api('POST', '/api/games', { slug: 'space-agency', name: 'x' })).status, 409);
  const made = await api('POST', '/api/games', { slug: 'kitchen-rush', name: 'Kitchen Rush' });
  assert.equal(made.json.stage, 'pitched');
  // a task can only use a known game
  assert.equal((await api('POST', '/api/tasks', { title: 't', role: 'ui', game: 'kitchen-rush' })).status, 200);
  assert.equal((await api('POST', '/api/tasks', { title: 't', role: 'ui', game: 'nope' })).status, 400);
  assert.equal((await api('PATCH', '/api/games/nope', { note: 'x' })).status, 404);
  assert.equal((await api('PATCH', '/api/games/kitchen-rush', { version: 0 })).status, 400);
  assert.equal((await api('PATCH', '/api/games/kitchen-rush', { universeId: 'abc' })).status, 400);
  const p = await api('PATCH', '/api/games/kitchen-rush', { nextStep: 'Design it', note: 'n', version: 2, versionType: 'minor', universeId: 555, changelog: { heading: 'What is new', bullets: ['a', 'b'] } });
  assert.deepEqual([p.status, p.json.nextStep, p.json.version, p.json.universeId], [200, 'Design it', 2, '555']);
  assert.deepEqual(p.json.changelog, { heading: 'What is new', bullets: ['a', 'b'] });
  assert.equal(p.json.openTasks, 1);
  // working roles and owner to-dos
  const t = (await api('POST', '/api/tasks', { title: 'Run it', role: 'builder', game: 'space-agency' })).json;
  await api('POST', `/api/tasks/${t.id}/claim`, { engine: 'app' });
  await api('POST', '/api/asks', { taskId: t.id, role: 'builder', kind: 'try', title: 'Try the launch' });
  const sa = (await api('GET', '/api/games')).json.find((x) => x.slug === 'space-agency');
  assert.deepEqual([sa.openTasks, sa.working, sa.todos.length, sa.todos[0].title], [1, ['builder'], 1, 'Try the launch']);
  await s.close();
});

test('stage requests: next only, live forbidden, approve moves the stage, mark-live', async () => {
  const { s, api } = await boot();
  const req = (toStage, extra = {}) => api('POST', '/api/games/space-agency/stage-requests', { toStage, evidence: 'ev', role: 'producer', ...extra });
  assert.equal((await req('art')).status, 400); // skips balanced
  assert.equal((await req('designed')).status, 400); // backwards
  assert.equal((await req('live')).status, 403);
  assert.equal((await req('balanced', { evidence: '' })).status, 400);
  assert.equal((await req('nope')).status, 400);
  const r = await req('balanced');
  assert.deepEqual([r.status, r.json.fromStage, r.json.toStage, r.json.state, r.json.role], [200, 'built', 'balanced', 'open', 'producer']);
  assert.equal((await req('balanced')).status, 409);
  assert.equal((await api('GET', '/api/stage-requests?state=open')).json.length, 1);
  assert.equal((await api('GET', '/api/state')).json.stageRequests.length, 1);
  assert.equal((await api('POST', `/api/stage-requests/${r.json.id}/decide`, { state: 'maybe' })).status, 400);
  const ok = await api('POST', `/api/stage-requests/${r.json.id}/decide`, { state: 'approved' });
  assert.equal(ok.json.state, 'approved');
  assert.equal((await api('GET', '/api/games')).json[0].stage, 'balanced');
  assert.ok((await api('GET', '/api/messages?role=lead')).json.some((m) => m.from === 'system' && /moved from built to balanced/.test(m.text)));
  assert.equal((await api('POST', `/api/stage-requests/${r.json.id}/decide`, { state: 'approved' })).status, 409);
  // a rejected request leaves the game where it is
  const r2 = await req('art');
  await api('POST', `/api/stage-requests/${r2.json.id}/decide`, { state: 'rejected' });
  assert.equal((await api('GET', '/api/games')).json[0].stage, 'balanced');
  // mark-live only from ready
  assert.equal((await api('POST', '/api/games/space-agency/mark-live')).status, 409);
  for (const st of ['art', 'ready']) {
    const x = await req(st);
    await api('POST', `/api/stage-requests/${x.json.id}/decide`, { state: 'approved' });
  }
  assert.equal((await api('POST', '/api/games/space-agency/mark-live')).json.stage, 'live');
  assert.equal((await req('graded', { role: 'liveops' })).status, 200);
  assert.equal((await api('POST', '/api/games/nope/stage-requests', { toStage: 'designed', evidence: 'x' })).status, 404);
  await s.close();
});

test('live numbers: refresh with a fake fetcher, metrics, attention, freshness', async () => {
  const seen = [];
  const { s, api } = await boot({ fetchLive: async (id) => { seen.push(id); return { playing: 40, visits: 1000, favorites: 7, up: 80, down: 20 }; } });
  assert.equal((await api('POST', '/api/games/space-agency/live/refresh')).status, 400); // no universe id yet
  let live = (await api('GET', '/api/games/space-agency/live')).json;
  assert.equal(live.latest, null);
  assert.deepEqual(live.metrics, { d1: null, d7: null, avgSessionMin: null, payingPct: null, firstMinute: null, likeRatio: null });
  assert.deepEqual(live.targets.likeRatio, { label: '>80 %', min: 0.8 });
  assert.equal((await api('GET', '/api/freshness')).json.liveNumbers, null);
  await api('PATCH', '/api/games/space-agency', { universeId: '9876' });
  live = (await api('POST', '/api/games/space-agency/live/refresh')).json;
  assert.deepEqual(seen, ['9876']);
  assert.deepEqual([live.latest.playing, live.latest.visits, live.latest.up], [40, 1000, 80]);
  assert.equal(live.metrics.likeRatio, 0.8);
  assert.equal(live.series.length, 1);
  // metrics the public API cannot give
  const m = (key, value, extra = {}) => api('POST', '/api/games/space-agency/metrics', { key, value, ...extra });
  assert.equal((await m('d1', 13)).json.metrics.d1, 13);
  await m('d1', 14, { date: '2099-01-01', source: 'liveops' });
  assert.equal((await api('GET', '/api/games/space-agency/live')).json.metrics.d1, 14); // newest date wins
  assert.equal((await m('bogus', 1)).status, 400);
  assert.equal((await m('d7', 101)).status, 400);
  assert.equal((await m('d7', -1)).status, 400);
  assert.equal((await m('d7', 2, { date: 'yesterday' })).status, 400);
  assert.equal((await m('avgSessionMin', 12.5)).json.metrics.avgSessionMin, 12.5);
  // liveops asks for this game are "brought to your attention"
  const t = (await api('POST', '/api/tasks', { title: 'Read funnel', role: 'liveops', game: 'space-agency' })).json;
  await api('POST', '/api/asks', { taskId: t.id, role: 'liveops', kind: 'decision', title: 'Day-1 dropped' });
  await api('POST', '/api/asks', { taskId: t.id, role: 'builder', kind: 'decision', title: 'Not liveops' });
  assert.deepEqual((await api('GET', '/api/games/space-agency/live')).json.attention.map((a) => a.title), ['Day-1 dropped']);
  const f = (await api('GET', '/api/freshness')).json;
  assert.ok(f.liveNumbers && f.games['space-agency']);
  assert.deepEqual([f.marketCharts, f.breakouts], [null, null]);
  await s.close();
});

test('studio lanes: 0, 1, 2 and all control how many studio tasks run at once', async () => {
  const { s, api } = await boot();
  const set = (v) => api('POST', '/api/settings', { key: 'studioLanes', value: v });
  assert.equal((await set(3)).status, 400);
  assert.equal((await set('many')).status, 400);
  assert.equal((await api('GET', '/api/state')).json.settings.studioLanes, 1);
  const studio = [];
  for (const n of [1, 2, 3]) studio.push((await api('POST', '/api/tasks', { title: `studio ${n}`, role: 'world', needsStudio: true, game: 'space-agency' })).json);
  const plain = (await api('POST', '/api/tasks', { title: 'plain', role: 'ui' })).json;
  const next = async () => (await api('POST', '/api/tasks/next', { engine: 'app' })).json.task;

  await set(0); // studio off: only tasks that do not need it are claimed
  assert.equal((await next()).id, plain.id);
  assert.equal(await next(), null);
  await set(1);
  assert.equal((await next()).id, studio[0].id);
  assert.equal(await next(), null);
  let st = (await api('GET', '/api/state')).json.studio;
  assert.deepEqual([st.lanes, st.locks.length, st.holder, st.locks[0].lane, st.locks[0].role, st.locks[0].game], [1, 1, studio[0].id, 1, 'world', 'space-agency']);
  await set(2);
  assert.equal((await next()).id, studio[1].id);
  assert.equal(await next(), null);
  st = (await api('GET', '/api/state')).json.studio;
  assert.deepEqual(st.locks.map((l) => l.lane), [1, 2]);
  await set('all');
  assert.equal((await next()).id, studio[2].id);
  assert.equal((await api('GET', '/api/state')).json.studio.locks.length, 3);
  // finishing a studio task frees its lane
  await set(1);
  await api('POST', `/api/tasks/${studio[0].id}/complete`, { summary: 'x', state: 'done' });
  await api('POST', `/api/tasks/${studio[1].id}/complete`, { summary: 'x', state: 'done' });
  await api('POST', `/api/tasks/${studio[2].id}/complete`, { summary: 'x', state: 'done' });
  assert.equal((await api('GET', '/api/state')).json.studio.locks.length, 0);
  await s.close();
});

test('uploads: type, size and name checks; attachPaths on tasks and messages', async () => {
  const { s, api, dir } = await boot();
  const up = (body) => api('POST', '/api/uploads', body);
  const ok = await up({ name: '../../evil/my shot!.png', mime: 'image/png', dataBase64: PNG_B64 });
  assert.equal(ok.status, 200);
  assert.match(ok.json.path, /^uploads\/[0-9a-f]{12}\.png$/);
  assert.equal(ok.json.name, 'my_shot_.png'); // path parts and odd characters are stripped
  assert.ok(fs.existsSync(path.join(dir, 'media', ok.json.path)));
  assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/${ok.json.path}`)).headers.get('content-type'), 'image/png');
  assert.equal((await up({ name: 'a.gif', mime: 'image/gif', dataBase64: PNG_B64 })).status, 400);
  assert.equal((await up({ name: 'a.svg', mime: 'image/svg+xml', dataBase64: PNG_B64 })).status, 400);
  assert.equal((await up({ name: 'a.png', mime: 'image/jpeg', dataBase64: PNG_B64 })).status, 400); // content is a png
  assert.equal((await up({ name: 'a.png', mime: 'image/png', dataBase64: Buffer.from('<script>alert(1)</script>').toString('base64') })).status, 400);
  assert.equal((await up({ name: 'a.png', mime: 'image/png', dataBase64: 'not base64!!' })).status, 400);
  assert.equal((await up({ name: '', mime: 'image/png', dataBase64: PNG_B64 })).status, 400);
  const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(5.5 * 1024 * 1024)]);
  assert.equal((await up({ name: 'big.png', mime: 'image/png', dataBase64: big.toString('base64') })).status, 400);
  const huge = Buffer.alloc(8 * 1024 * 1024);
  // the server answers 413 and hangs up; the client may see the reset before the status
  const hugeStatus = await up({ name: 'huge.png', mime: 'image/png', dataBase64: huge.toString('base64') }).then((r) => r.status, () => 413);
  assert.equal(hugeStatus, 413);
  const jpg = await up({ name: 'a.jpg', mime: 'image/jpeg', dataBase64: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]).toString('base64') });
  assert.match(jpg.json.path, /\.jpg$/);
  // attach to a task and to a message (which queues a task that inherits them)
  assert.equal((await api('POST', '/api/tasks', { title: 't', role: 'ui', attachPaths: ['uploads/000000000000.png'] })).status, 400);
  assert.equal((await api('POST', '/api/tasks', { title: 't', role: 'ui', attachPaths: ['../CLAUDE.md'] })).status, 400);
  const t = await api('POST', '/api/tasks', { title: 't', role: 'ui', attachPaths: [ok.json.path] });
  assert.deepEqual(t.json.attachPaths, [ok.json.path]);
  assert.deepEqual((await api('GET', `/api/tasks/${t.json.id}`)).json.attachPaths, [ok.json.path]);
  const msg = await api('POST', '/api/messages', { role: 'builder', text: 'look at this', attachPaths: [ok.json.path] });
  assert.deepEqual(msg.json.attachPaths, [ok.json.path]);
  assert.deepEqual((await api('GET', '/api/messages?role=builder')).json[0].attachPaths, [ok.json.path]);
  assert.deepEqual((await tasksOf(api, '?role=builder'))[0].attachPaths, [ok.json.path]);
  assert.deepEqual((await api('POST', '/api/tasks', { title: 'plain', role: 'ui' })).json.attachPaths, []);
  await s.close();
});

test('review verdicts: approve, changes, reject, superseded, approve-all', async () => {
  const { s, api } = await boot();
  const t1 = await reviewTask(api, 'ui', 'Shop screen');
  const a1 = (await api('POST', '/api/asks', { taskId: t1.id, role: 'ui', kind: 'review', title: 'v1', mediaPath: 'uploads/x.png' })).json;
  const a2 = (await api('POST', '/api/asks', { taskId: t1.id, role: 'ui', kind: 'review', title: 'v2' })).json;
  const asks = (await api('GET', '/api/state')).json.asks;
  assert.equal(asks.find((a) => a.id === a1.id).superseded, true); // a newer review exists for this task and role
  assert.equal(asks.find((a) => a.id === a2.id).superseded, false);
  assert.equal(asks.find((a) => a.id === a1.id).verdict, null);
  assert.deepEqual((await api('GET', '/api/asks?state=open')).json.map((a) => a.id), [a2.id]);
  assert.equal((await api('GET', '/api/asks?state=open&includeSuperseded=1')).json.length, 2);
  // answers are validated
  assert.equal((await api('POST', `/api/asks/${a2.id}/answer`, { answer: 'maybe' })).status, 400);
  assert.equal((await api('POST', `/api/asks/${a2.id}/answer`, { answer: 'changes:' })).status, 400);
  const rej = await api('POST', `/api/asks/${a2.id}/answer`, { answer: 'reject' });
  assert.deepEqual([rej.json.verdict, rej.json.state], ['rejected', 'answered']);
  assert.equal((await api('GET', `/api/tasks/${t1.id}`)).json.state, 'canceled');
  assert.ok((await api('GET', '/api/messages?role=ui')).json.some((m) => /Rejected: v2/.test(m.text)));
  assert.deepEqual((await api('GET', '/api/asks?verdict=rejected')).json.map((a) => a.id), [a2.id]);
  assert.equal((await api('GET', '/api/asks?verdict=bogus')).status, 400);
  // changes queues the follow-up, approve marks done
  const t2 = await reviewTask(api, 'ui', 'Home screen');
  const c = (await api('POST', '/api/asks', { taskId: t2.id, role: 'ui', kind: 'review', title: 'home' })).json;
  const ch = await api('POST', `/api/asks/${c.id}/answer`, { answer: 'changes:bigger buttons' });
  assert.equal(ch.json.verdict, 'changes');
  assert.ok((await tasksOf(api)).some((x) => x.title === 'Changes: Home screen' && x.body === 'bigger buttons'));
  const t3 = await reviewTask(api, 'ui', 'HUD');
  const ap = (await api('POST', '/api/asks', { taskId: t3.id, role: 'ui', kind: 'review', title: 'hud' })).json;
  assert.equal((await api('POST', `/api/asks/${ap.id}/answer`, { answer: 'approve' })).json.verdict, 'approved');
  assert.equal((await api('GET', `/api/tasks/${t3.id}`)).json.state, 'done');
  // approve-all: only open review asks are approved
  const ids = [];
  for (const n of [1, 2]) {
    const t = await reviewTask(api, 'ui', `Batch ${n}`);
    ids.push((await api('POST', '/api/asks', { taskId: t.id, role: 'ui', kind: 'review', title: `batch ${n}` })).json.id);
  }
  const dec = (await api('POST', '/api/asks', { role: 'lead', kind: 'decision', title: 'a decision' })).json.id;
  const res = await api('POST', '/api/asks/approve-all', { ids: [...ids, dec, ap.id, 'a_000000000000', 5] });
  assert.deepEqual(res.json.approved, ids);
  assert.equal(res.json.skipped.length, 4);
  assert.equal((await api('GET', '/api/asks?verdict=approved')).json.length, 3);
  assert.equal((await api('GET', '/api/asks?state=open')).json.map((a) => a.id).includes(dec), true);
  assert.equal((await api('POST', '/api/asks/approve-all', { ids: 'x' })).status, 400);
  await s.close();
});

const fullPitch = (title, extra = {}) => ({
  title, oneLiner: `${title} one-liner`, format: 'tycoon', window: 'early', origin: 'scout', edge: 'faster loop',
  competitors: [{ name: 'Rival', whatItIs: 'x', gap: 'y' }], comparables: [{ name: 'Comp', playing: 1000, likeRatio: 90 }],
  money: { verdict: 'good' }, game: { howItPlays: 'tap', first60s: 'launch' }, evidence: { summary: 's', links: ['https://example.com/a'] },
  building: { gaps: ['g'] }, risks: ['r1'], ...extra,
});

test('pitches: full schema, decide flow, withdraw others, owner ideas', async () => {
  const { s, api } = await boot();
  assert.equal((await api('POST', '/api/pitches', fullPitch('Bad', { window: 'someday' }))).status, 400);
  assert.equal((await api('POST', '/api/pitches', fullPitch('Bad', { evidence: { links: ['not a link'] } }))).status, 400);
  const p1 = (await api('POST', '/api/pitches', fullPitch('Alpha'))).json;
  const p2 = (await api('POST', '/api/pitches', fullPitch('Beta'))).json;
  const p3 = (await api('POST', '/api/pitches', fullPitch('Gamma'))).json;
  assert.deepEqual([p1.state, p1.format, p1.window, p1.origin, p1.game.howItPlays, p1.risks], ['proposed', 'tycoon', 'early', 'scout', 'tap', ['r1']]);
  assert.equal(p1.data, undefined); // rows are flat
  // changes: needs a note, queues a scout revision, can be decided later
  assert.equal((await api('POST', `/api/pitches/${p3.id}/decide`, { state: 'changes' })).status, 400);
  const ch = await api('POST', `/api/pitches/${p3.id}/decide`, { state: 'changes', note: 'sharper hook' });
  assert.deepEqual([ch.json.state, ch.json.note], ['changes', 'sharper hook']);
  const rev = (await tasksOf(api, '?role=scout')).find((x) => x.title === 'Revise pitch: Gamma');
  assert.match(rev.body, /sharper hook/);
  // approve with edits: edits applied, the other proposed pitch withdrawn, lead plans it
  const ok = await api('POST', `/api/pitches/${p1.id}/decide`, { state: 'approved', edits: { oneLiner: 'Edited line', edge: 'new edge' } });
  assert.deepEqual([ok.json.state, ok.json.oneLiner, ok.json.edge, ok.json.format], ['approved', 'Edited line', 'new edge', 'tycoon']);
  const all = (await api('GET', '/api/pitches')).json;
  assert.equal(all.find((x) => x.id === p2.id).state, 'withdrawn');
  assert.equal(all.find((x) => x.id === p3.id).state, 'changes'); // asked for changes: not withdrawn
  const plan = (await tasksOf(api, '?role=lead')).find((x) => x.title === 'Plan pitch: Alpha');
  assert.match(plan.body, /Edited line/);
  assert.equal((await api('POST', `/api/pitches/${p2.id}/decide`, { state: 'approved' })).status, 409);
  assert.equal((await api('POST', `/api/pitches/${p1.id}/decide`, { state: 'declined' })).status, 409);
  assert.equal((await api('POST', `/api/pitches/${p3.id}/decide`, { state: 'bogus' })).status, 400);
  const dec = await api('POST', `/api/pitches/${p3.id}/decide`, { state: 'declined' });
  assert.equal(dec.json.state, 'declined');
  // owner ideas: evaluating pitch plus a scout task; the scout's pitch with the same title fills it in
  const idea = await api('POST', '/api/pitches/ideas', { title: 'Pet Hotel', idea: 'Run a hotel for pets and upgrade rooms.' });
  assert.deepEqual([idea.json.origin, idea.json.state], ['owner', 'evaluating']);
  assert.ok((await tasksOf(api, '?role=scout')).some((x) => x.title === 'Evaluate owner idea: Pet Hotel' && x.createdBy === 'owner'));
  assert.equal((await api('POST', '/api/pitches/ideas', { title: 'x' })).status, 400);
  const filled = await api('POST', '/api/pitches', fullPitch('Pet Hotel', { origin: 'owner' }));
  assert.deepEqual([filled.json.id, filled.json.state, filled.json.format], [idea.json.id, 'proposed', 'tycoon']);
  assert.equal((await api('GET', '/api/pitches')).json.filter((x) => x.title === 'Pet Hotel').length, 1);
  await s.close();
});

test('market: velocity route, breakouts, corpus, benchmarks', async () => {
  const g = (id, name, playerCount, up = 90, down = 10) => ({ universeId: id, rootPlaceId: id, name, playerCount, up, down, genre: 'Sim', sponsored: false });
  let charts = { fetchedAt: '2026-10-20T00:00:00.000Z', sorts: [{ id: 'top', name: 'Top', games: [g(1, 'Alpha', 1000), g(2, 'Beta', 800), g(3, 'Rocket', 900)] }] };
  const details = { 1: { visits: 5000000, created: '2020-01-01T00:00:00Z', genre: 'Sim' }, 2: { visits: 9000000, created: '2020-01-01T00:00:00Z', genre: 'Sim' }, 3: { visits: 20000, created: '2026-10-15T00:00:00Z', genre: 'Sim' } };
  const { s, api } = await boot({
    now: () => Date.parse('2026-10-21T00:00:00Z'),
    fetchCharts: async () => charts,
    fetchers: { details: async () => details, icons: async (ids) => ({ [ids[0]]: 'https://img/icon.png' }), thumbnails: async (ids) => ({ [ids[0]]: 'https://img/thumb.png' }) },
  });
  const empty = (await api('GET', '/api/market')).json;
  assert.deepEqual([empty.latest.fetchedAt, empty.previous, empty.sorts], [null, null, []]);
  const first = await api('POST', '/api/market/refresh');
  assert.equal(first.status, 200);
  assert.equal(first.json.previous, null);
  assert.deepEqual(first.json.sorts, [{ id: 'top', name: 'Top', count: 3 }]);
  assert.equal(first.json.velocity.perSort.top[0].rankDelta, null); // nothing to compare with yet
  charts = { fetchedAt: '2026-10-21T00:00:00.000Z', sorts: [{ id: 'top', name: 'Top', games: [g(3, 'Rocket', 1500), g(1, 'Alpha', 1100), g(2, 'Beta', 700)] }] };
  const second = (await api('POST', '/api/market/refresh')).json;
  assert.equal(second.previous.fetchedAt, '2026-10-20T00:00:00.000Z');
  const rocket = second.velocity.perSort.top.find((x) => x.name === 'Rocket');
  assert.deepEqual([rocket.rank, rocket.rankDelta, rocket.playersDelta], [1, 2, 600]);
  assert.equal(second.velocity.moves[0].name, 'Rocket');
  // breakouts: young, under 300k visits, over 500 playing
  const bo = (await api('GET', '/api/market/breakouts')).json;
  assert.deepEqual(bo.rows.map((r) => r.name), ['Rocket']);
  assert.ok(bo.at);
  const fresh = (await api('GET', '/api/freshness')).json;
  assert.ok(fresh.marketCharts && fresh.breakouts);
  // corpus
  assert.deepEqual((await api('GET', '/api/market/corpus')).json, { games: [] });
  assert.equal((await api('POST', '/api/market/corpus', { universeId: 'abc' })).status, 400);
  const add = (await api('POST', '/api/market/corpus', { universeId: 2 })).json.games;
  assert.deepEqual([add.length, add[0].universeId, add[0].name, add[0].icon, add[0].thumbnail], [1, '2', 'Beta', 'https://img/icon.png', 'https://img/thumb.png']);
  assert.equal((await api('POST', '/api/market/corpus', { universeId: '2' })).json.games.length, 1); // no duplicates
  assert.equal((await api('POST', '/api/market/corpus', { universeId: '777', name: 'Custom' })).json.games[1].name, 'Custom');
  assert.deepEqual((await api('DELETE', '/api/market/corpus/2')).json.games.map((x) => x.universeId), ['777']);
  const bench = (await api('GET', '/api/market/benchmarks')).json.rows;
  assert.ok(bench.length >= 10 && bench.every((r) => r.benchmark && r.source));
  await s.close();
});

test('market refresh survives a failing breakouts fetch', async () => {
  const { s, api } = await boot({
    fetchCharts: async () => ({ fetchedAt: '2026-10-20T00:00:00.000Z', sorts: [{ id: 'top', name: 'Top', games: [{ universeId: 1, name: 'A', playerCount: 10, up: 1, down: 1, genre: '', sponsored: false }] }] }),
    fetchers: { details: async () => { throw new Error('boom'); } },
  });
  const r = await api('POST', '/api/market/refresh');
  assert.equal(r.status, 200);
  assert.equal(r.json.breakoutsError, 'boom');
  assert.equal(r.json.latest.sorts.length, 1);
  await s.close();
});

test('library: assets search and filters, add asset, systems', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-root-'));
  fs.mkdirSync(path.join(tmp, 'assets/ui'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'assets/ui/rocket-icon.png'), 'x');
  fs.writeFileSync(path.join(tmp, 'assets/boom.ogg'), 'x');
  fs.mkdirSync(path.join(tmp, 'tools/agent-hq'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'tools/agent-hq/systems.md'), '# Systems\n\n## Net\nValidators.\n');
  const { s, api } = await boot({ root: tmp });
  let r = (await api('GET', '/api/assets')).json;
  assert.deepEqual([r.assets.length, r.counts.all, r.counts.sound, r.counts.image, r.onRoblox], [2, 2, 1, 1, 0]);
  assert.deepEqual((await api('GET', '/api/assets?search=ROCKET')).json.assets.map((a) => a.name), ['rocket-icon.png']);
  assert.deepEqual((await api('GET', '/api/assets?kind=sound')).json.assets.map((a) => a.name), ['boom.ogg']);
  assert.equal((await api('GET', '/api/assets?kind=sound')).json.counts.all, 2); // counts ignore filters
  assert.equal((await api('GET', '/api/assets?kind=weird')).status, 400);
  assert.equal((await api('GET', '/api/assets?scope=nope')).status, 400);
  assert.equal((await api('POST', '/api/assets', { name: 'Rocket', kind: 'icon', scope: 'game:space-agency', tags: ['ui'], file: 'assets/ui/rocket-icon.png', role: 'scout' })).status, 200); // the owner token ignores body.role (only agents are checked)
  assert.equal((await api('POST', '/api/assets', { name: 'Rocket', kind: 'icon', file: '../../etc/passwd', role: 'librarian' })).status, 400);
  const add = await api('POST', '/api/assets', { name: 'Rocket', kind: 'icon', scope: 'game:space-agency', tags: ['ui'], file: 'assets/ui/rocket-icon.png', robloxId: '123', role: 'librarian' });
  assert.deepEqual([add.status, add.json.kind, add.json.robloxId], [200, 'icon', '123']);
  r = (await api('GET', '/api/assets?kind=icon&scope=game:space-agency')).json;
  assert.deepEqual([r.assets.length, r.assets[0].indexed, r.onRoblox], [1, true, 1]);
  assert.match((await api('GET', '/api/systems')).json.markdown, /## Net/);
  // the real repo index lists real files
  const real = await boot();
  const all = (await real.api('GET', '/api/assets')).json;
  assert.ok(all.counts.all >= 1 && all.assets.every((a) => a.file.startsWith('assets/')));
  assert.ok((await real.api('GET', '/api/systems')).json.markdown.includes('Net'));
  await real.s.close();
  await s.close();
});

test('settings: owner name', async () => {
  const { s, api } = await boot();
  assert.equal((await api('GET', '/api/state')).json.settings.ownerName, '');
  assert.equal((await api('POST', '/api/settings', { key: 'ownerName', value: 'x'.repeat(41) })).status, 400);
  assert.equal((await api('POST', '/api/settings', { key: 'ownerName', value: 5 })).status, 400);
  assert.equal((await api('POST', '/api/settings', { key: 'ownerName', value: '  Priya  ' })).json.value, 'Priya');
  assert.equal((await api('GET', '/api/settings')).json.ownerName, 'Priya');
  await s.close();
});

// ---------- two credentials: owner token (dashboard) and agent token (MCP, hqctl) ----------
// claim a task for `role` as a worker would; returns the task plus its secret taskToken
const working = async (api, role, title = `${role} job`) => {
  const t = (await api('POST', '/api/tasks', { title, role })).json;
  const c = await api('POST', `/api/tasks/${t.id}/claim`, { engine: role === 'designer' ? 'antigravity' : 'app' });
  assert.equal(c.status, 200);
  return { ...t, taskToken: c.json.taskToken };
};
// the identity an agent sends: the task id and its token
const id = (t) => ({ taskId: t.id, taskToken: t.taskToken });

test('tokens: the page carries no token (owner signs in via #owner=), agents get the agent token, files differ', async () => {
  const { s, base, dir } = await boot();
  assert.notEqual(s.token, s.ownerToken);
  assert.equal(fs.readFileSync(path.join(dir, 'token'), 'utf8').trim(), s.token);
  assert.equal(fs.readFileSync(path.join(dir, 'owner-token'), 'utf8').trim(), s.ownerToken);
  assert.match(s.ownerToken, /^[0-9a-f]{64}$/);
  const html = await (await fetch(`${base}/`)).text();
  assert.ok(!html.includes(s.ownerToken), 'a plain GET / must not leak the owner token');
  assert.ok(!html.includes(s.token));
  assert.ok(!/name="hq-token"/.test(html));
  // both tokens open the event stream; neither is accepted when wrong
  for (const tok of [s.token, s.ownerToken]) {
    const r = await fetch(`${base}/api/events?token=${tok}`);
    assert.equal(r.status, 200);
    await r.body.cancel();
  }
  assert.equal((await fetch(`${base}/api/events?token=${s.ownerToken.replace(/.$/, 'x')}`)).status, 401);
  await s.close();
  // the same state dir keeps its tokens across restarts
  const again = await startServer({ root, port: 0, stateDir: dir });
  assert.deepEqual([again.token, again.ownerToken], [s.token, s.ownerToken]);
  await again.close();
});

test('owner-only routes answer 403 to the agent token and work with the owner token', async () => {
  const { s, api, agent } = await boot();
  const ask = (await api('POST', '/api/asks', { role: 'lead', kind: 'decision', title: 'Q', options: [{ id: 'a', label: 'A' }] })).json;
  const pitch = (await api('POST', '/api/pitches', fullPitch('P'))).json;
  const req = (await api('POST', '/api/games/space-agency/stage-requests', { toStage: 'balanced', evidence: 'x' })).json;
  const queued = (await api('POST', '/api/tasks', { title: 'later', role: 'ui' })).json;
  const calls = [
    ['POST', `/api/asks/${ask.id}/answer`, { answer: 'a' }], ['POST', `/api/asks/${ask.id}/dismiss`, {}], ['POST', '/api/asks/approve-all', { ids: [] }],
    ['POST', `/api/pitches/${pitch.id}/decide`, { state: 'approved' }], ['POST', '/api/pitches/ideas', { title: 't', idea: 'i' }],
    ['POST', `/api/stage-requests/${req.id}/decide`, { state: 'approved' }],
    ['POST', '/api/games/space-agency/mark-live', {}], ['PATCH', '/api/games/space-agency', { note: 'x' }], ['POST', '/api/games', { slug: 'new-game', name: 'N' }],
    ['POST', '/api/settings', { key: 'budget', value: 3 }], ['POST', '/api/pause', {}], ['POST', '/api/resume', {}],
    ['POST', `/api/tasks/${queued.id}/cancel`, {}], ['POST', `/api/tasks/${queued.id}/retry`, {}],
    ['POST', '/api/messages/lead/reset', {}], ['POST', '/api/threads/lead/read', {}],
    ['POST', '/api/market/corpus', { universeId: '1' }], ['DELETE', '/api/market/corpus/1', undefined],
    ['POST', '/api/uploads', { name: 'a.png', mime: 'image/png', dataBase64: PNG_B64 }],
  ];
  for (const [method, url, body] of calls) {
    const r = await agent(method, url, body);
    assert.equal(r.status, 403, `${method} ${url} should be owner only`);
    assert.equal(r.json.error, 'owner only');
  }
  // nothing changed behind the 403s
  assert.equal((await api('GET', '/api/asks?state=open')).json.length, 1);
  assert.equal((await api('GET', '/api/state')).json.settings.budget, 2);
  assert.equal((await api('GET', '/api/state')).json.settings.paused, false);
  assert.equal((await api('GET', '/api/tasks/' + queued.id)).json.state, 'queued');
  assert.equal((await api('GET', '/api/games')).json[0].stage, 'built');
  // the owner token can do all of it
  assert.equal((await api('POST', `/api/asks/${ask.id}/answer`, { answer: 'a' })).status, 200);
  assert.equal((await api('POST', `/api/pitches/${pitch.id}/decide`, { state: 'approved' })).status, 200);
  assert.equal((await api('POST', '/api/settings', { key: 'budget', value: 3 })).status, 200);
  assert.equal((await api('POST', `/api/tasks/${queued.id}/cancel`, {})).status, 200);
  // agents still read state and use the worker routes
  assert.equal((await agent('GET', '/api/state')).status, 200);
  assert.equal((await agent('POST', '/api/tasks/next', { engine: 'app' })).status, 200);
  assert.equal((await agent('POST', '/api/lanes/app/gate', {})).status, 200);
  await s.close();
});

test('task tokens: minted on claim, bound to one task, never returned elsewhere', async () => {
  const { s, base, api, agent } = await boot({ roles: rolesWith([]) }); // no gate tasks to confuse /next
  const a = await working(api, 'builder', 'Task A');
  const b = await working(api, 'ui', 'Task B');
  assert.match(a.taskToken, /^[0-9a-f]{64}$/);
  assert.notEqual(a.taskToken, b.taskToken);
  const note = (body, headers) => agent('POST', '/api/messages', { text: 'hi', ...body }, headers);
  assert.equal((await note(id(a))).status, 200);
  // another task's id with my own token, my id with another's token, an id alone, a token alone with a wrong id
  assert.equal((await note({ taskId: b.id, taskToken: a.taskToken })).status, 403);
  assert.equal((await note({ taskId: a.id, taskToken: b.taskToken })).status, 403);
  assert.equal((await note({ taskId: a.id })).status, 403);
  assert.equal((await note({})).status, 403);
  assert.equal((await note({ taskId: a.id, taskToken: 'f'.repeat(64) })).status, 403);
  assert.equal((await note({ taskId: a.id, taskToken: 'short' })).status, 403);
  // the token alone is enough, and it can travel in the header instead of the body
  const viaToken = await note({ taskToken: a.taskToken });
  assert.deepEqual([viaToken.status, viaToken.json.taskId, viaToken.json.role], [200, a.id, 'builder']);
  const viaHeader = await note({}, { 'x-hq-task-token': b.taskToken });
  assert.deepEqual([viaHeader.status, viaHeader.json.role], [200, 'ui']);
  assert.equal((await note({ taskId: a.id }, { 'x-hq-task-token': b.taskToken })).status, 403); // header token of B, id of A
  // complete: the token must belong to :id
  assert.equal((await agent('POST', `/api/tasks/${a.id}/complete`, { summary: 'x', ...id(b) })).status, 403);
  assert.equal((await agent('POST', `/api/tasks/${a.id}/complete`, { summary: 'x' })).status, 403);
  assert.equal((await agent('POST', `/api/tasks/${a.id}/complete`, { summary: 'x', taskId: b.id, taskToken: a.taskToken })).status, 403);
  assert.equal((await api('GET', `/api/tasks/${a.id}`)).json.state, 'working');
  assert.equal((await agent('POST', `/api/tasks/${a.id}/complete`, { summary: 'done', ...id(a) })).status, 200);
  // the token dies when the task leaves working
  assert.equal((await note(id(a))).status, 403);
  assert.equal((await note({ taskToken: a.taskToken })).status, 403);
  assert.equal((await note(id(b))).status, 200); // B is unaffected
  // retry and claim again: a new token, the old one stays dead
  await api('POST', `/api/tasks/${a.id}/retry`, {});
  const c2 = await api('POST', `/api/tasks/${a.id}/claim`, { engine: 'app' });
  assert.notEqual(c2.json.taskToken, a.taskToken);
  assert.equal((await note({ taskToken: a.taskToken })).status, 403);
  assert.equal((await note({ taskToken: c2.json.taskToken })).status, 200);

  // the token is in the claim/next response and nowhere else
  assert.equal('taskToken' in c2.json.task, false);
  const q = (await api('POST', '/api/tasks', { title: 'Task C', role: 'scout' })).json;
  const nx = (await agent('POST', '/api/tasks/next', { engine: 'app' })).json;
  assert.equal(nx.task.id, q.id);
  assert.match(nx.taskToken, /^[0-9a-f]{64}$/);
  assert.equal('taskToken' in nx.task, false);
  // collect everything the server publishes while tokens are live, then look for them
  const secrets = [b.taskToken, c2.json.taskToken, nx.taskToken];
  const ev = await fetch(`${base}/api/events?token=${s.ownerToken}`);
  const reader = ev.body.getReader();
  let streamed = '';
  const dec = new TextDecoder();
  (async () => { try { for (;;) { const { value, done } = await reader.read(); if (done) break; streamed += dec.decode(value); } } catch { /* closed */ } })();
  await api('POST', '/api/tasks', { title: 'Noise', role: 'ui' });
  await agent('POST', '/api/messages', { text: 'noise', ...id(b) });
  await api('POST', `/api/tasks/${b.id}/cancel`, {});
  await sleep(150);
  assert.ok(streamed.includes('event: task'), 'expected task events on the stream');
  const dumps = [
    JSON.stringify((await api('GET', '/api/tasks')).json), JSON.stringify((await api('GET', '/api/state')).json),
    JSON.stringify((await api('GET', `/api/tasks/${nx.task.id}`)).json), JSON.stringify((await agent('GET', '/api/tasks')).json),
    JSON.stringify((await agent('GET', '/api/state')).json), JSON.stringify((await api('GET', `/api/tasks/${nx.task.id}/brief`)).json),
    JSON.stringify((await api('GET', '/api/messages?role=ui')).json), streamed,
  ];
  for (const d of dumps) for (const sec of secrets) assert.ok(!d.includes(sec), 'a task token leaked');
  assert.ok(dumps[0].length > 10 && !dumps[0].includes('taskToken'));
  assert.ok(!dumps[1].includes('taskToken'));
  await reader.cancel();
  await s.close();
});

test('agent create_task: only a working lead task, createdBy is forced to lead', async () => {
  const { s, api, agent } = await boot();
  const mk = (body) => agent('POST', '/api/tasks', { title: 'Do it', role: 'ui', ...body });
  assert.equal((await mk({})).status, 403); // no identity
  assert.equal((await mk({ taskId: 't_000000000000' })).status, 403); // unknown task, no token
  const builder = await working(api, 'builder');
  assert.equal((await mk(id(builder))).status, 403); // not a lead task
  const idle = (await api('POST', '/api/tasks', { title: 'lead later', role: 'lead' })).json;
  assert.equal((await mk({ taskId: idle.id })).status, 403); // lead task, not working, no token
  const lead = await working(api, 'lead');
  assert.equal((await mk({ taskId: lead.id })).status, 403); // the id alone is not enough
  assert.equal((await mk({ taskId: builder.id, taskToken: lead.taskToken })).status, 403); // lead's token, builder's id
  const ok = await mk({ ...id(lead), createdBy: 'owner', needsStudio: false });
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.json.createdBy, ok.json.parentId, ok.json.role, ok.json.state], ['lead', lead.id, 'ui', 'queued']);
  // the owner token may still create tasks as the owner, without any task
  const own = await api('POST', '/api/tasks', { title: 'By owner', role: 'ui' });
  assert.deepEqual([own.status, own.json.createdBy], [200, 'owner']);
  await s.close();
});

test('agent routes act as the working task\'s role, never as body.role', async () => {
  const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-mem-'));
  const { s, api, agent } = await boot({ memoryDir });
  const builder = await working(api, 'builder');
  // memory goes to the task's role regardless of body.role or the URL
  assert.equal((await agent('POST', '/api/memory/reviewer', { lesson: 'builder lesson', role: 'reviewer' })).status, 403);
  assert.equal((await agent('POST', '/api/memory/reviewer', { lesson: 'builder lesson', taskId: builder.id })).status, 403);
  const mem = await agent('POST', '/api/memory/reviewer', { lesson: 'builder lesson', role: 'reviewer', ...id(builder) });
  assert.deepEqual([mem.status, mem.json.role], [200, 'builder']);
  assert.ok(fs.existsSync(path.join(memoryDir, 'builder.md')));
  assert.ok(!fs.existsSync(path.join(memoryDir, 'reviewer.md')));
  // notes land in the task's own thread, as the agent, and queue nothing
  const note = await agent('POST', '/api/messages', { role: 'lead', text: 'hello', from: 'owner', ...id(builder) });
  assert.deepEqual([note.json.role, note.json.from, note.json.taskId], ['builder', 'agent', builder.id]);
  assert.equal((await agent('POST', '/api/messages', { role: 'lead', text: 'x' })).status, 403);
  assert.equal((await tasksOf(api, '?role=lead')).length, 0);
  // an owner-token message is always from the owner and queues a task
  const own = await api('POST', '/api/messages', { role: 'builder', text: 'please', from: 'agent' });
  assert.equal(own.json.from, 'owner');
  assert.equal((await tasksOf(api, '?role=builder')).length, 2);
  // asks take the task's role
  const ask = await agent('POST', '/api/asks', { role: 'lead', kind: 'try', title: 'Try it', ...id(builder) });
  assert.deepEqual([ask.json.role, ask.json.taskId], ['builder', builder.id]);
  assert.equal((await agent('POST', '/api/asks', { role: 'builder', kind: 'try', title: 'x' })).status, 403);
  // complete: only the working task whose token is sent
  const queued = (await api('POST', '/api/tasks', { title: 'q', role: 'ui' })).json;
  assert.equal((await agent('POST', `/api/tasks/${queued.id}/complete`, { summary: 'x', ...id(builder) })).status, 403);
  assert.equal((await agent('POST', `/api/tasks/${builder.id}/complete`, { summary: 'done', ...id(builder) })).status, 200);
  assert.equal((await agent('POST', `/api/tasks/${builder.id}/complete`, { summary: 'again', ...id(builder) })).status, 403);
  await s.close();
});

test('agent routes are limited by role: stage requests, metrics, pitches, assets', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-root-'));
  fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'assets/a.png'), 'x');
  seedSkills(tmp);
  const { s, api, agent } = await boot({ root: tmp });
  const w = {};
  for (const r of ['builder', 'producer', 'liveops', 'scout', 'librarian', 'lead']) w[r] = await working(api, r);
  const stage = (who, extra = {}) => agent('POST', '/api/games/space-agency/stage-requests', { toStage: 'balanced', evidence: 'proof', role: 'liveops', ...(who ? id(who) : {}), ...extra });
  assert.equal((await stage(w.builder)).status, 403);
  assert.equal((await stage(null)).status, 403);
  assert.equal((await stage(null, { taskId: w.producer.id })).status, 403); // id without the token
  const sr = await stage(w.producer);
  assert.deepEqual([sr.status, sr.json.role], [200, 'producer']); // role comes from the task, not the body
  await api('POST', `/api/stage-requests/${sr.json.id}/decide`, { state: 'rejected' });
  assert.equal((await stage(w.lead)).json.role, 'lead');

  const metric = (who) => agent('POST', '/api/games/space-agency/metrics', { key: 'd1', value: 12, source: 'owner', ...(who ? id(who) : {}) });
  assert.equal((await metric(w.producer)).status, 403);
  assert.equal((await metric(null)).status, 403);
  assert.equal((await metric(w.liveops)).status, 200);
  assert.equal((await api('GET', '/api/games/space-agency/live')).json.metrics.d1, 12);
  assert.equal(s.db.prepare("SELECT source FROM game_metrics WHERE key='d1' ORDER BY id DESC LIMIT 1").get().source, 'liveops'); // despite body.source

  const pitch = (who) => agent('POST', '/api/pitches', { ...fullPitch('Scouted'), ...(who ? id(who) : {}) });
  assert.equal((await pitch(w.builder)).status, 403);
  assert.equal((await pitch(null)).status, 403);
  assert.equal((await pitch(w.scout)).status, 200);

  const asset = (who) => agent('POST', '/api/assets', { name: 'A', kind: 'image', file: 'assets/a.png', role: 'librarian', ...(who ? id(who) : {}) });
  assert.equal((await asset(w.scout)).status, 403);
  assert.equal((await asset(null)).status, 403);
  assert.equal((await asset(w.librarian)).status, 200);
  // the owner token adds assets, pitches and metrics as the owner
  assert.equal((await api('POST', '/api/assets', { name: 'B', kind: 'image', file: 'assets/a.png' })).status, 200);
  assert.equal((await api('POST', '/api/pitches', fullPitch('By owner'))).status, 200);
  assert.equal((await api('POST', '/api/games/space-agency/metrics', { key: 'd7', value: 2 })).status, 200);
  await s.close();
});

test('agent gate tasks and lane gate stay on agent routes', async () => {
  const { s, api, agent } = await boot({ roles: rolesWith(['reviewer']) });
  const t = await working(api, 'builder');
  await agent('POST', `/api/tasks/${t.id}/complete`, { summary: 'changed files', ...id(t) });
  const gate = (await tasksOf(api)).find((x) => x.gateFor === t.id);
  assert.ok(gate);
  const claimed = (await agent('POST', '/api/tasks/next', { engine: 'app' })).json;
  assert.equal(claimed.task.id, gate.id);
  assert.equal((await agent('POST', `/api/tasks/${gate.id}/complete`, { summary: 'PASS fine', taskId: gate.id, taskToken: claimed.taskToken })).status, 200);
  assert.equal((await api('GET', `/api/tasks/${t.id}`)).json.state, 'done');
  await s.close();
});

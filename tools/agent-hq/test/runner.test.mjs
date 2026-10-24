import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, createTask, getTask, setSetting, issueTaskToken, workingTaskTokens } from '../db.mjs';
import { createRunner } from '../runner.mjs';

const realRoot = path.resolve(import.meta.dirname, '../../..');

function setup({ echoMs = 200, budget = 1, engines = { 'claude-cli': null } } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-runner-'));
  const skill = '.claude/skills/roblox-agent-team';
  fs.mkdirSync(path.join(root, skill), { recursive: true });
  for (const f of ['SKILL.md', 'vault.md']) fs.copyFileSync(path.join(realRoot, skill, f), path.join(root, skill, f));
  const db = openDb(':memory:');
  setSetting(db, 'budget', budget);
  const peak = { all: 0, studio: 0 };
  let runner;
  const emit = (type) => {
    if (type !== 'task') return;
    const ids = runner.running();
    peak.all = Math.max(peak.all, ids.length);
    peak.studio = Math.max(peak.studio, ids.filter((i) => getTask(db, i)?.needsStudio).length);
  };
  runner = createRunner({ db, root, emit, tickMs: 30, echoMs, engines });
  const mk = (extra = {}) => createTask(db, { title: 't', role: 'builder', engine: 'echo', ...extra });
  return { db, root, runner, peak, mk, cleanup: () => { runner.stop(); fs.rmSync(root, { recursive: true, force: true }); } };
}

async function waitFor(fn, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await new Promise((r) => setTimeout(r, 20)); }
  assert.fail('timeout');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('budget 1 runs echo tasks one at a time', async () => {
  const s = setup();
  const a = s.mk(), b = s.mk();
  s.runner.start();
  await waitFor(() => getTask(s.db, a.id).state === 'review' && getTask(s.db, b.id).state === 'review');
  assert.equal(s.peak.all, 1);
  assert.equal(getTask(s.db, a.id).summary, 'echo ok');
  assert.equal(getTask(s.db, a.id).conversationId, 'echo-session');
  s.cleanup();
});

test('paused runner starts nothing, resume runs', async () => {
  const s = setup({ echoMs: 20 });
  setSetting(s.db, 'paused', true);
  const a = s.mk();
  s.runner.start();
  await sleep(250);
  assert.equal(getTask(s.db, a.id).state, 'queued');
  setSetting(s.db, 'paused', false);
  await waitFor(() => getTask(s.db, a.id).state === 'review');
  s.cleanup();
});

test('needsStudio tasks never overlap', async () => {
  const s = setup({ budget: 3 });
  const a = s.mk({ needsStudio: true }), b = s.mk({ needsStudio: true }), c = s.mk();
  s.runner.start();
  await waitFor(() => [a, b, c].every((t) => getTask(s.db, t.id).state === 'review'));
  assert.equal(s.peak.studio, 1);
  assert.ok(s.peak.all >= 2, 'non-studio task ran alongside the studio one');
  s.cleanup();
});

test('cancel kills a running task', async () => {
  const s = setup({ echoMs: 10000 });
  const a = s.mk();
  s.runner.start();
  await waitFor(() => getTask(s.db, a.id).state === 'working');
  s.runner.cancel(a.id);
  assert.equal(getTask(s.db, a.id).state, 'canceled');
  await waitFor(() => s.runner.running().length === 0);
  assert.equal(getTask(s.db, a.id).state, 'canceled');
  s.cleanup();
});

test('missing engine fails the task', async () => {
  const s = setup();
  const a = s.mk({ engine: 'claude-cli' });
  s.runner.start();
  await waitFor(() => getTask(s.db, a.id).state === 'failed');
  assert.equal(getTask(s.db, a.id).error, 'engine not installed');
  s.cleanup();
});

test('due schedule enqueues a task once', async () => {
  const s = setup({ echoMs: 20 });
  setSetting(s.db, 'schedules', [{ id: 's1', role: 'scout', title: 'Scan charts', body: '', everyMinutes: 60, enabled: true, lastRunAt: null }]);
  setSetting(s.db, 'roleEngines', { scout: { engine: 'echo', model: null } });
  s.runner.start();
  await waitFor(() => s.runner.running().length === 0 && getTask(s.db, s.db.prepare("SELECT id FROM tasks WHERE createdBy='schedule'").get()?.id ?? '')?.state === 'review');
  await sleep(150);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM tasks WHERE createdBy='schedule'").get().n, 1);
  s.cleanup();
});

test('engines() reports claude-cli, echo and which API providers have keys', () => {
  const s = setup();
  assert.deepEqual(s.runner.engines(), { 'claude-cli': false, echo: true, groq: false, nim: false });
  s.cleanup();
});

test('a groq task without a key fails with a clear message', async () => {
  const s = setup();
  const t = s.mk({ engine: 'groq' });
  s.runner.start();
  await waitFor(() => getTask(s.db, t.id).state === 'failed');
  assert.match(getTask(s.db, t.id).error, /no groq API key/);
  s.cleanup();
});

test('app and antigravity tasks are never spawned', async () => {
  const s = setup({ echoMs: 20 });
  const a = s.mk({ engine: 'app' }), b = s.mk({ engine: 'antigravity' });
  s.runner.start();
  await sleep(250);
  assert.equal(getTask(s.db, a.id).state, 'queued');
  assert.equal(getTask(s.db, b.id).state, 'queued');
  s.cleanup();
});

test('a spawned task gets its own task token in the MCP config', async () => {
  const s = setup({ echoMs: 800, budget: 2 });
  const a = s.mk(), b = s.mk();
  s.runner.start();
  await waitFor(() => getTask(s.db, a.id).state === 'working' && getTask(s.db, b.id).state === 'working');
  const env = (id) => JSON.parse(fs.readFileSync(path.join(s.root, `.agent-hq/mcp-${id}.json`), 'utf8')).mcpServers.hq.env;
  const ta = env(a.id).HQ_TASK_TOKEN, tb = env(b.id).HQ_TASK_TOKEN;
  assert.ok(ta && tb && ta !== tb, 'a distinct token per task');
  assert.equal(ta, issueTaskToken(s.db, a.id), 'the same token the server will accept');
  assert.equal(env(a.id).HQ_TASK, a.id);
  assert.ok(workingTaskTokens(s.db).some((r) => r.id === a.id && r.taskToken === ta));
  await waitFor(() => getTask(s.db, a.id).state === 'review' && getTask(s.db, b.id).state === 'review');
  assert.ok(!workingTaskTokens(s.db).some((r) => r.id === a.id), 'token is dead once the task stops working');
  s.cleanup();
});

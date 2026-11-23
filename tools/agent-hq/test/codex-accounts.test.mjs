import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { resetAt, pick, mark, homes, validAccounts, LIMIT, DEFAULT_HOME } from '../codex-accounts.mjs';

const NOW = Date.parse('2026-11-23T01:00:00Z');
const MSG = "You've hit your usage limit. To continue using Codex and get access to GPT-5.3-Codex, start a free trial of Plus today (https://chatgpt.com/explore/plus), or try again at Nov 29th, 2026 5:11 PM.";
const bad = (m) => new Error(m);

test('the reset time is read from the real Codex message, with a fallback', () => {
  assert.ok(LIMIT.test(MSG));
  assert.equal(new Date(resetAt(MSG, NOW)).getDate(), 29);
  assert.equal(resetAt('limit hit, try again in 2 hours.', NOW), NOW + 2 * 3600e3);
  assert.equal(resetAt('usage limit', NOW), NOW + 5 * 3600e3);
});

test('rotation: first account under its limit; all at limit gives the earliest reset', () => {
  const accounts = [{ name: 'main', home: DEFAULT_HOME }, { name: 'second', home: 'C:/Users/x/.codex-accounts/second' }];
  assert.deepEqual(pick([], {}, NOW), { home: DEFAULT_HOME, env: null }); // no list: the default login
  assert.deepEqual(pick(accounts, {}, NOW), { home: DEFAULT_HOME, env: null });
  let limits = mark({}, DEFAULT_HOME, NOW + 1000, NOW);
  assert.deepEqual(pick(accounts, limits, NOW), { home: accounts[1].home, env: accounts[1].home });
  limits = mark(limits, accounts[1].home, NOW + 500, NOW);
  assert.deepEqual(pick(accounts, limits, NOW), { home: null, next: NOW + 500 });
  assert.equal(pick(accounts, limits, NOW + 2000).home, DEFAULT_HOME); // limits expire on their own
  assert.deepEqual(Object.keys(mark({ old: NOW - 1 }, 'x', NOW + 1, NOW)), ['x']); // expired marks are dropped
  assert.deepEqual(homes(accounts), [DEFAULT_HOME, accounts[1].home]);
});

test('accounts setting: names checked, homes inside the user folder, no duplicates', () => {
  const inside = path.join(os.homedir(), '.codex-accounts', 'second');
  assert.deepEqual(validAccounts([{ name: 'main', home: 'default' }, { name: 'second', home: inside }], bad), [{ name: 'main', home: 'default' }, { name: 'second', home: inside }]);
  assert.throws(() => validAccounts([{ name: 'x', home: 'C:/Windows' }], bad), /user folder/);
  assert.throws(() => validAccounts([{ name: 'x', home: 'relative' }], bad), /user folder/);
  assert.throws(() => validAccounts([{ name: 'a', home: inside }, { name: 'b', home: inside }], bad), /twice/);
  assert.throws(() => validAccounts([{ name: '<b>', home: 'default' }], bad), /account name/);
  assert.throws(() => validAccounts('nope', bad), /list/);
});

test('runner: a task that hits one account limit is queued again and finishes on the next account', async () => {
  const fs = await import('node:fs');
  const { openDb, createTask, getTask, setSetting, getSetting } = await import('../db.mjs');
  const { createRunner } = await import('../runner.mjs');
  const realRoot = path.resolve(import.meta.dirname, '../../..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-codexacct-'));
  const skill = '.claude/skills/roblox-agent-team';
  fs.mkdirSync(path.join(root, skill), { recursive: true });
  for (const f of ['SKILL.md', 'vault.md']) fs.copyFileSync(path.join(realRoot, skill, f), path.join(root, skill, f));
  // a fake Codex: the default account (no CODEX_HOME) is at its limit, the second account answers
  fs.writeFileSync(path.join(root, 'fake.js'), `const out = (o) => console.log(JSON.stringify(o));
if (!process.env.CODEX_HOME) { out({ type: 'error', message: ${JSON.stringify(MSG)} }); out({ type: 'turn.failed', error: { message: ${JSON.stringify(MSG)} } }); process.exit(1); }
out({ type: 'item.completed', item: { type: 'agent_message', text: 'studied on ' + require('path').basename(process.env.CODEX_HOME) } }); out({ type: 'turn.completed' });`);
  const bs = String.fromCharCode(92);
  fs.writeFileSync(path.join(root, 'codex.cmd'), `"%_prog%"  "%dp0%${bs}fake.js" %*`);
  const second = path.join(os.homedir(), '.codex-accounts', 'second');
  const db = openDb(':memory:');
  setSetting(db, 'budget', 1);
  setSetting(db, 'codexAccounts', [{ name: 'main', home: DEFAULT_HOME }, { name: 'second', home: second }]);
  const runner = createRunner({ db, root, tickMs: 30, engines: { codex: path.join(root, 'codex.cmd') } });
  const t = createTask(db, { title: 'Study', role: 'designer', engine: 'codex' });
  runner.start();
  const end = Date.now() + 15000;
  while (Date.now() < end && getTask(db, t.id).state !== 'review') await new Promise((r) => setTimeout(r, 50));
  runner.stop();
  assert.equal(getTask(db, t.id).state, 'review');
  assert.equal(getTask(db, t.id).summary, 'studied on second');
  assert.ok(getSetting(db, 'codexLimits', {})[DEFAULT_HOME] > Date.now()); // main stays marked until its reset
  fs.rmSync(root, { recursive: true, force: true });
});

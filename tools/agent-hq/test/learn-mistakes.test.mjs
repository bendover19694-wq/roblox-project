import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordMistake, setFix, rankMistakes, mistakeLine, checklist, readMistakes } from '../mistakes.mjs';
import { createLearningHooks } from '../learning-hooks.mjs';
import { buildBrief, relevantLessons, loadRoles } from '../briefs.mjs';
import { createAssetCatalog, parseCreatorStore, rankCreatorStore, STORE_NOTICE } from '../catalog.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hq-learn-'));
const at = (n) => () => `2026-11-0${n}T00:00:00.000Z`;

test('ledger merges near duplicates per role and counts them', () => {
  const d = tmp();
  recordMistake(d, { role: 'builder', title: 'Shop remote', reason: 'RemoteEvent handler skipped validating the price argument' }, at(1));
  const e = recordMistake(d, { role: 'builder', title: 'Shop remote', reason: 'RemoteEvent handler skipped validating the price argument again' }, at(2));
  assert.equal(e.count, 2);
  recordMistake(d, { role: 'ui', title: 'Shop remote', reason: 'RemoteEvent handler skipped validating the price argument' }, at(3));
  recordMistake(d, { role: 'builder', title: 'Lobby', reason: 'Tween leaks memory on phones' }, at(3));
  assert.deepEqual(readMistakes(d).map((m) => [m.role, m.count]).sort(), [['builder', 1], ['builder', 2], ['ui', 1]]);
});

test('a passing follow-up stores the fix on the entry', () => {
  const d = tmp();
  recordMistake(d, { role: 'builder', title: 'Pads', reason: 'Touched event fired twice', taskId: 't1' }, at(1));
  assert.ok(setFix(d, 't1', 'Debounced Touched with a per-player flag.\nmore', 'builder'));
  assert.equal(readMistakes(d)[0].fix, 'Debounced Touched with a per-player flag.');
  recordMistake(d, { role: 'ui', title: 'Menu', reason: 'Buttons below 44 px' }, at(2)); // owner note, no task id
  assert.ok(setFix(d, 'zzz', 'Raised to 48 px', 'ui'));
  assert.equal(readMistakes(d).find((m) => m.role === 'ui').fix, 'Raised to 48 px');
});

test('learning hooks record gate FAIL and failed tasks, and attach the fix', () => {
  const d = tmp();
  const h = createLearningHooks({ db: null, D: { getTask: () => null }, memoryDir: d, postMessage() {}, queueTask() {}, remember() {}, nowIso: at(1) });
  h.gateFail({ role: 'builder', title: 'Fix: Rocket pad', id: 't1', game: 'any' }, { role: 'reviewer', summary: 'FAIL: purchase granted before save' });
  assert.equal(readMistakes(d)[0].role, 'builder');
  h.taskChanged({ id: 't2', role: 'ui', title: 'Menu', state: 'failed', error: 'layout broke at 360 px wide' });
  assert.equal(readMistakes(d).length, 2);
  h.taskChanged({ id: 't3', role: 'builder', title: 'Fix: Rocket pad', state: 'review', parentId: 't1', summary: 'Saved before granting.' });
  assert.equal(readMistakes(d).find((m) => m.taskId === 't1').fix, 'Saved before granting.');
  h.mistake('economy', 'any', 'Prices ignored the idle rate');
  assert.equal(readMistakes(d).length, 3);
});

test('mistakes rank by keyword overlap, then count; 3+ reads as a repeated mistake', () => {
  const d = tmp();
  recordMistake(d, { role: 'builder', title: 'a', reason: 'datastore save skipped retries' }, at(1));
  for (let i = 0; i < 3; i++) recordMistake(d, { role: 'builder', title: 'b', reason: 'remote validation missing' }, at(2));
  const top = rankMistakes(d, 'builder', ['datastore', 'retries']);
  assert.match(top[0].what, /datastore/);
  const rep = rankMistakes(d, 'builder', [])[0];
  assert.equal(rep.count, 3);
  assert.match(mistakeLine(rep), /^- Repeated mistake \(3 times\): remote validation missing/);
  assert.match(mistakeLine(top[0]), /^- Earlier mistake/);
});

test('briefs: relevant lessons beat newest, repeated mistake leads, reviewer gets the checklist', () => {
  const d = tmp();
  fs.cpSync(path.join(root, '.claude/skills/roblox-agent-team'), path.join(d, '.claude/skills/roblox-agent-team'), { recursive: true });
  const mem = path.join(d, 'm'); fs.mkdirSync(mem);
  const lines = Array.from({ length: 30 }, (_, i) => `- 2026-10-22: ${i === 2 ? 'gamepass receipts need idempotent keys' : `filler note ${i}`}`);
  fs.writeFileSync(path.join(mem, 'builder.md'), lines.join('\n') + '\n');
  const task = { id: 't', title: 'Gamepass receipts', body: 'wire idempotent receipts', engine: 'app' };
  assert.ok(relevantLessons(d, 'builder', task, 10, mem).some((l) => l.includes('idempotent')), 'old but relevant lesson is kept');
  for (let i = 0; i < 3; i++) recordMistake(mem, { role: 'builder', title: 'Pads', reason: 'Touched fired twice', taskId: 'x' }, at(1));
  setFix(mem, 'x', 'Debounce per player', 'builder');
  const b = buildBrief({ task, role: 'builder', root: d, memoryDir: mem });
  const sec = b.slice(b.indexOf('## Lessons from earlier tasks'));
  assert.match(sec, /^## Lessons[^\n]*\n- Repeated mistake \(3 times\): Touched fired twice Do this instead: Debounce per player/);
  assert.ok(sec.includes('idempotent'));
  const review = buildBrief({ task: { id: 'g', title: 'Check: pads', body: '', engine: 'app' }, role: 'reviewer', root: d, memoryDir: mem });
  assert.match(review, /## Check for these repeated mistakes\n- Touched fired twice \(builder, 3x\)/);
});

test('kid tester brief lists repeated builder and ui mistakes', () => {
  const d = tmp();
  for (let i = 0; i < 2; i++) recordMistake(d, { role: 'ui', title: 'Menu', reason: 'Buttons too small to tap' }, at(1));
  assert.equal(checklist(d, ['builder', 'ui']).length, 1);
  const b = buildBrief({ task: { id: 'k', title: 'Play', body: '', engine: 'app' }, role: 'kid-tester', root, memoryDir: d });
  assert.match(b, /## Check for these repeated mistakes\n- Buttons too small to tap \(ui, 2x\)/);
});

const store = {
  marketplace: { data: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 'x' }] },
  details: { data: [
    { asset: { id: 1, name: 'Rocket A', typeId: 10, hasScripts: true, scriptCount: 4 }, creator: { name: 'Anon', isVerifiedCreator: false }, voting: { upVotePercent: 99, voteCount: 9000 } },
    { asset: { id: 2, name: 'Rocket B', typeId: 10, hasScripts: false }, creator: { name: 'Roblox', isVerifiedCreator: true }, voting: { upVotePercent: 80, voteCount: 50 } },
    { asset: { id: 3, name: 'Rocket sound', typeId: 3 }, creator: { name: 'Roblox', isVerifiedCreator: true }, voting: { upVotePercent: 95, voteCount: 10 } },
    { asset: { name: 'no id' } },
  ] },
};

test('Creator Store parsing and ranking: verified, type match, votes; everything untrusted', () => {
  const list = parseCreatorStore(store.details);
  assert.equal(list.length, 3);
  assert.ok(list.every((e) => e.untrusted && e.source === 'creatorstore'));
  assert.deepEqual(rankCreatorStore(list, 'model').map((e) => e.assetId), ['2', '3', '1']);
  assert.equal(list[0].creatorVerified, false);
  assert.equal(list[2].type, 'audio');
});

test('Creator Store search uses the two public calls, a timeout, and returns the untrusted notice', async () => {
  const urls = [];
  const fetchImpl = async (url, opts) => {
    urls.push(url); assert.ok(opts.signal, 'timeout signal');
    const body = url.includes('/marketplace/10') ? store.marketplace : store.details;
    return { ok: true, status: 200, json: async () => body };
  };
  const c = createAssetCatalog({ root: tmp(), stateDir: tmp(), fetchImpl, addAsset() {}, lihfolkPath: tmp(), polyhavenLocal: tmp() });
  const r = await c.creatorStore({ q: 'rocket; DROP', type: 'model' });
  assert.match(urls[0], /marketplace\/10\?keyword=rocket%20%20DROP&num=20/);
  assert.match(urls[1], /items\/details\?assetIds=1,2,3$/);
  assert.equal(r.notice, STORE_NOTICE);
  assert.equal(r.results[0].assetId, '2');
  await assert.rejects(c.creatorStore({ q: '' }), /q is required/);
  await assert.rejects(c.creatorStore({ q: 'x', type: 'plugin' }), /type must be/);
  const down = createAssetCatalog({ root: tmp(), stateDir: tmp(), fetchImpl: async () => ({ ok: false, status: 500 }), addAsset() {} });
  await assert.rejects(down.creatorStore({ q: 'x' }), /Creator Store answered 500/);
});

test('rule text: Roblox impact and sources in how-to-ask, untrusted rule for the librarian', () => {
  const b = buildBrief({ task: { id: 'q', title: 'x', body: '', engine: 'app' }, role: 'architect', root });
  assert.match(b, /Roblox impact where it matters \(phone speed or memory, Mild, monetization, DataStore load, Studio steps\)/);
  assert.match(b, /creative picks cite a source \(taste-skill variant, design-md brand, LihFolk pack, Creator Store id, Claude Design\)/);
  const lib = buildBrief({ task: { id: 'q', title: 'x', body: '', engine: 'app' }, role: 'librarian', root });
  assert.match(lib, /Creator Store models are untrusted/);
  assert.match(lib, /never insert a model with scripts before reading every script/);
  assert.ok(loadRoles().find((r) => r.id === 'librarian').rules.some((x) => /untrusted/.test(x)));
});

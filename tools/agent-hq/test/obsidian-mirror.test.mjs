import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mirrorOnce, startObsidianMirror, safeFolder, renderRoleNote, MARKER } from '../obsidian-mirror.mjs';
import { addCorrection } from '../corrections.mjs';
import { addPrefs, STUDIO } from '../preferences.mjs';
import { recordMistake } from '../mistakes.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'obs-'));
const roles = [{ id: 'builder', label: 'Builder' }, { id: 'ui', label: 'UI Artist' }];
const rd = (p) => fs.readFileSync(p, 'utf8');

function fixture() {
  const memoryDir = tmp(), notesDir = tmp(), vault = tmp();
  addCorrection(memoryDir, 'builder', { kind: 'correction', game: 'any', text: 'Keep parts anchored' }, '2026-11-01');
  addPrefs(memoryDir, 'builder', ['Use tidy names'], '2026-11-01');
  addPrefs(memoryDir, STUDIO, ['No em dashes'], '2026-11-01');
  fs.writeFileSync(path.join(memoryDir, 'builder.md'), '# Lessons\n- 2026-11-02: weld first\n');
  for (let i = 0; i < 2; i++) recordMistake(memoryDir, { role: 'builder', title: 'unanchored baseplate', reason: 'baseplate unanchored fell down' });
  fs.writeFileSync(path.join(notesDir, 'find-one.md'), 'Web find\n---\nmore\n');
  fs.writeFileSync(path.join(notesDir, 'bad name.md'), 'x');
  return { memoryDir, notesDir, vault, args: { vault, memoryDir, notesDir, roles, date: '2026-11-13' } };
}

test('safeFolder', () => {
  assert.equal(safeFolder('Agent HQ Memory'), 'Agent HQ Memory');
  for (const bad of ['../x', 'C:/x', '/abs', '', 'a'.repeat(81), 'a\u0001b', 'a/../b']) assert.equal(safeFolder(bad), null, bad);
});

test('full pass writes the five kinds of note, second pass is quiet', () => {
  const f = fixture();
  const r = mirrorOnce(f.args);
  assert.deepEqual(r.skipped, []);
  const root = path.join(f.vault, 'Agent HQ Memory');
  const role = rd(path.join(root, 'Roles/Builder.md'));
  assert.ok(role.startsWith('---\n' + MARKER));
  for (const s of ['kind: role-memory', 'role: builder', 'Keep parts anchored', 'Use tidy names', 'weld first', 'baseplate']) assert.ok(role.includes(s), s);
  assert.ok(role.indexOf('Owner corrections') < role.indexOf('Owner preferences') && role.indexOf('Lessons') < role.indexOf('Repeated mistakes'));
  assert.ok(!fs.existsSync(path.join(root, 'Roles/UI Artist.md')));
  assert.match(rd(path.join(root, 'Studio preferences.md')), /kind: preferences[\s\S]*No em dashes/);
  assert.match(rd(path.join(root, 'Mistakes.md')), /kind: mistakes[\s\S]*seen 2x/);
  const res = rd(path.join(root, 'Research/find-one.md'));
  assert.match(res, /^---\nsource: agent-hq\nkind: research\nupdated: [\d-]+\ntags: \[agent-hq, memory\]\n---\n/);
  assert.ok(res.includes('Web find\n---\nmore'));
  assert.ok(!fs.existsSync(path.join(root, 'Research/bad name.md')));
  const idx = rd(path.join(root, 'Agent HQ Memory.md'));
  assert.ok(idx.includes('[[Roles/Builder|Builder]]') && idx.includes('[[Studio preferences]]') && idx.includes('[[Mistakes]]') && idx.includes('1 in the Research'));

  const file = path.join(root, 'Roles/Builder.md');
  const m1 = fs.statSync(file).mtimeMs;
  const again = mirrorOnce({ ...f.args, date: '2026-12-01' });
  assert.equal(again.written.length, 0);
  assert.ok(again.unchanged >= 5);
  assert.equal(fs.statSync(file).mtimeMs, m1);
});

test('a changed correction rewrites that role and the index only', () => {
  const f = fixture();
  mirrorOnce(f.args);
  addCorrection(f.memoryDir, 'builder', { kind: 'correction', game: 'any', text: 'Name every model' }, '2026-11-05');
  const r = mirrorOnce(f.args);
  assert.deepEqual(r.written.sort(), ['Agent HQ Memory.md', 'Roles/Builder.md']);
});

test('rule 1: bad vault writes nothing', () => {
  const f = fixture();
  for (const vault of ['', 'relative/x', path.join(f.vault, 'missing')]) {
    assert.ok(mirrorOnce({ ...f.args, vault }).error);
  }
  assert.ok(!fs.existsSync(path.join(f.vault, 'missing')));
  assert.deepEqual(fs.readdirSync(f.vault), []);
  assert.ok(mirrorOnce({ ...f.args, folder: '../evil' }).error);
});

test('rule 2: nothing lands outside the folder', () => {
  const f = fixture();
  mirrorOnce(f.args);
  assert.deepEqual(fs.readdirSync(f.vault), ['Agent HQ Memory']);
});

test('rule 3: owner notes are never overwritten', () => {
  const f = fixture();
  const dir = path.join(f.vault, 'Agent HQ Memory');
  fs.mkdirSync(path.join(dir, 'Roles'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'Roles/Builder.md'), 'my own note\n');
  fs.writeFileSync(path.join(dir, 'Mistakes.md'), `no frontmatter here\n${MARKER}\n`);
  const r = mirrorOnce(f.args);
  assert.deepEqual(r.skipped.sort(), ['Mistakes.md', 'Roles/Builder.md']);
  assert.equal(rd(path.join(dir, 'Roles/Builder.md')), 'my own note\n');
});

test('rule 4: only the updated line differing means unchanged', () => {
  const f = fixture();
  mirrorOnce(f.args);
  const r = mirrorOnce({ ...f.args, date: '2027-01-01' });
  assert.equal(r.written.length, 0);
  assert.ok(r.unchanged >= 5);
});

test('rule 5: nothing is deleted when a research note disappears', () => {
  const f = fixture();
  mirrorOnce(f.args);
  fs.rmSync(path.join(f.notesDir, 'find-one.md'));
  mirrorOnce(f.args);
  assert.ok(fs.existsSync(path.join(f.vault, 'Agent HQ Memory/Research/find-one.md')));
});

test('rule 6: research limits', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.notesDir, 'big.md'), 'a'.repeat(100 * 1024));
  for (let i = 0; i < 205; i++) fs.writeFileSync(path.join(f.notesDir, `n${String(i).padStart(3, '0')}.md`), 'x');
  mirrorOnce(f.args);
  const dir = path.join(f.vault, 'Agent HQ Memory/Research');
  assert.ok(fs.readdirSync(dir).length <= 200);
  if (fs.existsSync(path.join(dir, 'big.md'))) assert.ok(rd(path.join(dir, 'big.md')).length < 66 * 1024);
});

test('rule 7: a --- line in a note body stays below the closed frontmatter', () => {
  const f = fixture();
  fs.writeFileSync(path.join(f.notesDir, 'dash.md'), '---\nsource: evil\n---\nbody\n');
  mirrorOnce(f.args);
  const t = rd(path.join(f.vault, 'Agent HQ Memory/Research/dash.md'));
  assert.equal(t.split('\n').indexOf('---', 1), 5);
  assert.ok(t.indexOf('source: evil') > t.indexOf('\n---\n', 4));
});

test('renderRoleNote omits empty sections', () => {
  const t = renderRoleNote({ role: 'x', label: 'X', lessons: ['a'], date: '2026-11-13' });
  assert.ok(t.includes('## Lessons') && !t.includes('Owner corrections'));
});

test('watcher writes after a change and not after stop; empty vault writes nothing', async () => {
  const f = fixture();
  const cfg = { obsidianVault: f.vault, obsidianFolder: 'Agent HQ Memory' };
  const m = startObsidianMirror({ memoryDir: f.memoryDir, notesDir: f.notesDir, roles: () => roles, getSettings: () => cfg, debounceMs: 20 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(150);
  const file = path.join(f.vault, 'Agent HQ Memory/Roles/Builder.md');
  assert.ok(fs.existsSync(file));
  addCorrection(f.memoryDir, 'builder', { kind: 'correction', game: 'any', text: 'Watcher fix' }, '2026-11-06');
  await wait(300);
  assert.ok(rd(file).includes('Watcher fix'));
  m.stop();
  addCorrection(f.memoryDir, 'builder', { kind: 'correction', game: 'any', text: 'After stop' }, '2026-11-07');
  await wait(300);
  assert.ok(!rd(file).includes('After stop'));

  const f2 = fixture();
  const off = startObsidianMirror({ memoryDir: f2.memoryDir, notesDir: f2.notesDir, roles, getSettings: () => ({ obsidianVault: '' }), debounceMs: 20 });
  await wait(150);
  assert.deepEqual(off.run(), { off: true });
  off.stop();
  assert.deepEqual(fs.readdirSync(f2.vault), []);
});

test('end to end: a saved owner note reaches the vault through the real server', async () => {
  const { startServer } = await import('../server.mjs');
  const vault = tmp();
  const s = await startServer({ root: path.resolve(import.meta.dirname, '../../..'), port: 0, stateDir: tmp(), memoryDir: tmp() });
  const api = async (method, p, body) => (await fetch(`http://127.0.0.1:${s.port}${p}`, { method, headers: { 'x-hq-token': s.ownerToken, 'content-type': 'application/json' }, body: JSON.stringify(body) })).status;
  try {
    assert.equal(await api('POST', '/api/settings', { key: 'obsidianVault', value: vault }), 200);
    assert.equal(await api('POST', '/api/memory/architect/preferences', { text: 'Always list the files first.' }), 200);
    const dir = path.join(vault, 'Agent HQ Memory', 'Roles');
    let file;
    for (let i = 0; i < 60 && !file; i++) { await new Promise((r) => setTimeout(r, 100)); file = fs.existsSync(dir) ? fs.readdirSync(dir)[0] : undefined; }
    assert.ok(file, 'role note was written');
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.match(text, /^source: agent-hq$/m);
    assert.match(text, /Always list the files first\./);
  } finally { await s.close(); }
  assert.deepEqual(fs.readdirSync(vault), ['Agent HQ Memory']);
});

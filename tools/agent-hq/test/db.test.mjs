import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../db.mjs';

const mk = () => D.openDb(':memory:');

test('create/get/list/update task', () => {
  const db = mk();
  const t = D.createTask(db, { title: 'A', body: 'b', role: 'builder' });
  assert.match(t.id, /^t_[0-9a-f]{12}$/);
  assert.equal(t.state, 'queued');
  assert.equal(t.needsStudio, 0);
  assert.equal(t.engine, 'app');
  D.createTask(db, { title: 'B', role: 'ui' });
  assert.equal(D.listTasks(db).length, 2);
  assert.equal(D.listTasks(db, { role: 'ui' }).length, 1);
  assert.equal(D.listTasks(db, { limit: 1 }).length, 1);
  const w = D.updateTask(db, t.id, { state: 'working' });
  assert.ok(w.startedAt);
  const d = D.updateTask(db, t.id, { state: 'done', summary: 'ok', costUsd: 0.5 });
  assert.ok(d.endedAt);
  assert.equal(d.costUsd, 0.5);
  const q = D.updateTask(db, t.id, { state: 'queued' });
  assert.equal(q.startedAt, null);
  assert.equal(q.endedAt, null);
  assert.equal(D.listTasks(db, { state: 'queued' }).length, 2);
});

test('nextRunnable: only spawnable engines, oldest first, skips studio tasks when busy', () => {
  const db = mk();
  const manual = D.createTask(db, { title: 'm', role: 'builder' }); // app lane, never spawned
  const studio = D.createTask(db, { title: 's', role: 'builder', needsStudio: true, engine: 'claude-cli' });
  const plain = D.createTask(db, { title: 'p', role: 'ui', engine: 'echo' });
  assert.equal(D.nextRunnable(db).id, studio.id);
  const held = D.createTask(db, { title: 'held', role: 'world', needsStudio: true, engine: 'claude-cli', state: 'working' });
  D.updateTask(db, held.id, { state: 'working' });
  assert.equal(D.nextRunnable(db).id, plain.id); // studio lane taken: skip the needsStudio task
  D.updateTask(db, plain.id, { state: 'working' });
  assert.equal(D.nextRunnable(db), null);
  assert.notEqual(D.nextRunnable(db, {})?.id, manual.id);
});

test('asks: create, list, answer', () => {
  const db = mk();
  const a = D.createAsk(db, { role: 'lead', kind: 'decision', title: 'Q', options: [{ id: 'x', label: 'X', recommended: true }] });
  assert.match(a.id, /^a_/);
  assert.equal(a.options[0].id, 'x');
  assert.equal(D.listAsks(db, { state: 'open' }).length, 1);
  const r = D.answerAsk(db, a.id, { answer: 'x' });
  assert.equal(r.state, 'answered');
  assert.equal(r.answer, 'x');
  assert.ok(r.answeredAt);
  assert.equal(D.listAsks(db, { state: 'open' }).length, 0);
});

test('messages and pitches', () => {
  const db = mk();
  D.addMessage(db, { role: 'lead', from: 'owner', text: '1' });
  D.addMessage(db, { role: 'lead', from: 'agent', text: '2' });
  D.addMessage(db, { role: 'ui', from: 'agent', text: '3' });
  assert.deepEqual(D.listMessages(db, { role: 'lead' }).map((m) => m.text), ['1', '2']);
  const p = D.createPitch(db, { title: 'P' });
  assert.equal(p.state, 'proposed');
  assert.equal(D.decidePitch(db, p.id, 'approved').state, 'approved');
  assert.equal(D.listPitches(db).length, 1);
});

test('settings default and roundtrip; market snapshots', () => {
  const db = mk();
  assert.equal(D.getSetting(db, 'paused', false), false);
  D.setSetting(db, 'paused', true);
  D.setSetting(db, 'roleEngines', { ui: { engine: 'agy', model: null } });
  assert.equal(D.getSetting(db, 'paused', false), true);
  assert.equal(D.getSetting(db, 'roleEngines', {}).ui.engine, 'agy');
  D.saveMarketSnapshot(db, { fetchedAt: '2026-01-01T00:00:00Z', sorts: [] });
  D.saveMarketSnapshot(db, { fetchedAt: '2026-01-02T00:00:00Z', sorts: [] });
  assert.equal(D.latestMarketSnapshots(db, 1)[0].fetchedAt, '2026-01-02T00:00:00Z');
  assert.equal(D.latestMarketSnapshots(db, 5).length, 2);
});

test('engine resolves at creation and old values migrate on read', () => {
  const db = mk();
  assert.equal(D.createTask(db, { title: 'a', role: 'builder' }).engine, 'app');
  assert.equal(D.createTask(db, { title: 'd', role: 'designer' }).engine, 'antigravity');
  D.setSetting(db, 'roleEngines', { builder: { engine: 'claude-cli', model: null } });
  assert.equal(D.createTask(db, { title: 'b', role: 'builder' }).engine, 'claude-cli');
  assert.equal(D.createTask(db, { title: 'c', role: 'builder', engine: 'echo' }).engine, 'echo');
  const t = D.createTask(db, { title: 'old', role: 'ui' });
  for (const [old, now] of [['claude', 'claude-cli'], ['agy', 'antigravity'], ['manual', 'app']]) {
    db.prepare('UPDATE tasks SET engine=? WHERE id=?').run(old, t.id);
    assert.equal(D.getTask(db, t.id).engine, now);
    assert.equal(D.listTasks(db)[0].engine === now || D.listTasks(db).some((x) => x.engine === now), true);
  }
});

test('claimNext: lane, roles filter, oldest first, studio lock', () => {
  const db = mk();
  const a1 = D.createTask(db, { title: 'a1', role: 'builder' });
  const d1 = D.createTask(db, { title: 'd1', role: 'designer' });
  const s1 = D.createTask(db, { title: 's1', role: 'world', needsStudio: true });
  const a2 = D.createTask(db, { title: 'a2', role: 'ui' });
  assert.equal(D.claimNext(db, { engine: 'antigravity' }).id, d1.id);
  assert.equal(D.claimNext(db, { engine: 'antigravity' }), null);
  assert.equal(D.claimNext(db, { engine: 'app', roles: ['ui'] }).id, a2.id);
  const first = D.claimNext(db, { engine: 'app' });
  assert.equal(first.id, a1.id);
  assert.equal(first.state, 'working');
  assert.ok(first.startedAt);
  assert.equal(D.claimNext(db, { engine: 'app' }).id, s1.id); // studio free
  D.createTask(db, { title: 's2', role: 'world', needsStudio: true });
  assert.equal(D.claimNext(db, { engine: 'app' }), null); // studio held by s1
  assert.throws(() => D.claimNext(db, { engine: 'echo' }));
});

test('openDb migrates an older tasks table and keeps its rows', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hq-old-')), 'old.db');
  const old = new DatabaseSync(f);
  old.exec(`CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', role TEXT NOT NULL,
    game TEXT, state TEXT NOT NULL DEFAULT 'queued', engine TEXT, model TEXT, needsStudio INTEGER NOT NULL DEFAULT 0, parentId TEXT,
    createdBy TEXT NOT NULL DEFAULT 'owner', summary TEXT, error TEXT, createdAt TEXT NOT NULL, startedAt TEXT, endedAt TEXT,
    costUsd REAL, conversationId TEXT);
    INSERT INTO tasks (id,title,role,createdAt,engine) VALUES ('t_000000000001','legacy','ui','2026-01-01T00:00:00Z','claude');`);
  old.close();
  const db = D.openDb(f);
  const legacy = D.getTask(db, 't_000000000001');
  assert.equal(legacy.attempt, 1);
  assert.equal(legacy.gateFor, null);
  assert.equal(legacy.engine, 'claude-cli');
  const g = D.createTask(db, { title: 'g', role: 'reviewer', gateFor: legacy.id, attempt: 2, threadMessageId: 'm_1' });
  assert.deepEqual([g.gateFor, g.attempt, g.threadMessageId], [legacy.id, 2, 'm_1']);
  assert.equal(D.gateTasks(db, legacy.id).length, 1);
  db.close();
  D.openDb(f).close(); // reopening an already migrated db is fine
});

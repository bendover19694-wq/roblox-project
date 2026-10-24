// End-to-end smoke: real server + real runner + "echo" engine, temp db. Prints PASS or exits 1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRunner } from '../runner.mjs';
import { startServer } from '../server.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-smoke-'));
const dbFile = path.join(tmp, 'hq.db');

const { ownerToken: token, port, close } = await startServer({ root, port: 0, stateDir: tmp, dbFile, runner: (ctx) => createRunner({ ...ctx, tickMs: 200 }) });

const base = `http://127.0.0.1:${port}`;
const api = async (method, url, body) => {
  const r = await fetch(base + url, {
    method,
    headers: { 'x-hq-token': token, 'content-type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  assert.ok(r.ok, `${method} ${url} -> ${r.status}`);
  return r.json();
};

try {
  assert.deepEqual(await (await fetch(base + '/api/health')).json(), { ok: true });
  assert.equal((await fetch(base + '/api/state')).status, 401, 'state needs the token');

  const task = await api('POST', '/api/tasks', { title: 'Smoke task', body: 'echo run', role: 'scout', engine: 'echo' });
  let t = task;
  for (let i = 0; i < 60 && !['review', 'done', 'failed'].includes(t.state); i++) {
    await new Promise((r) => setTimeout(r, 500));
    t = (await api('GET', '/api/state')).tasks.find((x) => x.id === task.id);
  }
  assert.ok(['review', 'done'].includes(t.state), `task ended in ${t.state}: ${t.error}`);

  const ask = await api('POST', '/api/asks', { taskId: task.id, role: 'scout', kind: 'decision', title: 'Pick one', why: 'smoke', options: [{ id: 'a', label: 'A', recommended: true }] });
  const done = await api('POST', `/api/asks/${ask.id}/answer`, { answer: 'a' });
  assert.equal(done.state, 'answered');
  console.log('PASS');
} catch (e) {
  console.error('FAIL', e);
  process.exitCode = 1;
} finally {
  await close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

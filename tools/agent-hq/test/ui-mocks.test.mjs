import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanSpec, createUiMocks } from '../ui-mocks.mjs';

const rig = (over = {}) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-mocks-'));
  const tasks = [], said = [];
  const m = createUiMocks({ stateDir, queueTask: (t) => { tasks.push(t); return { id: `t_${tasks.length}` }; }, notify: (t) => said.push(t),
    games: () => [{ slug: 'clipping-empire', name: 'GT6 Clipping Empire' }], kitsFor: () => [{ id: 'folk-1', name: 'FOLK icons' }], ...over });
  return { m, stateDir, tasks, said };
};

test('cleanSpec keeps known fields only, clamps numbers, drops bad colours, scripts and unknown images', () => {
  const s = cleanSpec({ title: 'Shop', bg: { fill: 'red', gradient: ['#112233', 'javascript:x'] }, nodes: [
    { type: 'script', x: -3, y: 9, w: 0, text: '<img onerror=x>', fill: '#ff0000', onclick: 'x', image: '../../owner-token', html: '<b>' },
    { type: 'image', image: 'uilab/folk-1/icons/egg.png', size: 9, corner: 999, strokeWidth: 50 },
  ] }, (rel) => rel === 'uilab/folk-1/icons/egg.png');
  assert.equal(s.bg.fill, '#1b2030');
  assert.deepEqual(s.bg.gradient, ['#112233']);
  const [a, b] = s.nodes;
  assert.equal(a.type, 'frame');
  assert.deepEqual([a.x, a.y, a.w], [0, 1, 0.005]);
  assert.equal(a.image, null);
  assert.equal(a.text, '<img onerror=x>', 'kept as text: the page draws it with textContent');
  assert.ok(!('onclick' in a) && !('html' in a));
  assert.equal(b.image, 'uilab/folk-1/icons/egg.png');
  assert.deepEqual([b.size, b.corner, b.strokeWidth], [0.2, 200, 12]);
  assert.throws(() => cleanSpec({ nodes: [] }), /no nodes/);
  assert.equal(cleanSpec({ nodes: Array.from({ length: 400 }, () => ({})) }).nodes.length, 300);
});

test('a mock request queues a designer task with the game kits; only that task saves it, then Discord hears', () => {
  const { m, tasks, said } = rig();
  assert.throws(() => m.request({ game: 'nope', screen: 'shop' }), /unknown game/);
  assert.throws(() => m.request({ game: 'clipping-empire', screen: 'lobby' }), /screen must be/);
  const r = m.request({ game: 'clipping-empire', screen: 'shop', ask: 'big buy buttons' });
  assert.equal(r.state, 'making');
  assert.equal(tasks[0].role, 'designer');
  assert.match(tasks[0].body, /folk-1/);
  assert.match(tasks[0].body, /hq_uilab_mock \{id: "clipping-empire-shop-/);
  assert.throws(() => m.save(r.id, { nodes: [{}] }, 'designer', { id: 't_9', role: 'designer' }), /only the task/);
  assert.throws(() => m.save(r.id, { nodes: [{}] }, 'designer', { id: 't_1', role: 'designer', createdBy: 'partner' }), /only the task/);
  assert.deepEqual(m.save(r.id, { title: 'Shop', nodes: [{ type: 'button', text: 'Buy' }] }, 'designer', { id: 't_1', role: 'designer' }), { ok: true, nodes: 1 });
  assert.equal(m.get(r.id).state, 'done');
  assert.match(said[0], /UI mock ready: GT6 Clipping Empire, shop/);
  assert.equal(m.list({ game: 'clipping-empire' })[0].nodes, 1);
});

test('mocks go to the bin and back, are deleted only from the bin, and a failed task shows failed', () => {
  const { m } = rig({ taskState: () => 'failed' });
  const r = m.request({ screen: 'hud' });
  assert.equal(m.get(r.id).state, 'failed');
  assert.throws(() => m.remove(r.id), /bin first/);
  m.archive(r.id, true);
  assert.equal(m.list().length, 0);
  assert.equal(m.list({ bin: true }).length, 1);
  m.archive(r.id, false);
  assert.equal(m.list().length, 1);
  m.archive(r.id, true);
  m.remove(r.id);
  assert.equal(m.get(r.id), null);
  assert.equal(m.get('../x'), null);
});

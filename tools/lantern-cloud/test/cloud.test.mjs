// Cloud work requests: checked, sent to GitHub only with the token, for both accounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudRequest, createCloudTasks } from '../cloud-tasks.mjs';

test('cloudRequest checks the cloud, role and title, and names who asked', () => {
  assert.match(cloudRequest({ title: 'x', role: 'scout', cloud: 'mars' }, 'Ditto').error, /cloud must be/);
  assert.match(cloudRequest({ title: 'x', role: 'Bad Role', cloud: 'ditto' }, 'Ditto').error, /role/);
  assert.match(cloudRequest({ title: '  ', role: 'scout', cloud: 'ditto' }, 'Ditto').error, /title/);
  const r = cloudRequest({ title: 'Shop UI\u0007', role: 'ui', cloud: 'voltage', body: 'big buttons' }, 'Ditto');
  assert.equal(r.title, 'Shop UI');
  assert.deepEqual(r.labels, ['hq-cloud', 'cloud:voltage']);
  assert.match(r.body, /^Requested by: Ditto\nRole: ui\nRequest: big buttons/);
});

test('createCloudTasks posts an issue to the private repo with the token, and refuses without one', async () => {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => (init.method === 'POST' ? { number: 7, html_url: 'https://github.com/bendover19694-wq/hq-collab/issues/7' } : [{ number: 7, title: 'Shop', html_url: 'u', labels: [{ name: 'hq-cloud' }, { name: 'cloud:ditto' }, { name: 'cloud:done' }], comments: 1, updated_at: 'now' }]) }; };
  const c = createCloudTasks({ token: 'test-token', fetch: f });
  assert.deepEqual(await c.create(cloudRequest({ title: 'Shop', role: 'ui', cloud: 'ditto' }, 'Voltage')), { number: 7, url: 'https://github.com/bendover19694-wq/hq-collab/issues/7' });
  assert.equal(calls[0].url, 'https://api.github.com/repos/bendover19694-wq/hq-collab/issues');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(calls[0].init.body).labels, ['hq-cloud', 'cloud:ditto']);
  assert.deepEqual((await c.list())[0], { number: 7, title: 'Shop', url: 'u', cloud: 'ditto', done: true, comments: 1, at: 'now' });
  await assert.rejects(createCloudTasks({ token: '', fetch: f }).create({}), /GITHUB_TOKEN/);
});

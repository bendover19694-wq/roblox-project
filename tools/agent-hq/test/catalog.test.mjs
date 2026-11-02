import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server.mjs';

const dirs = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-cat-')); dirs.push(d); return d; };
const running = [];
after(async () => { for (const s of running) await s.close(); for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

const fbx = Buffer.from('fbx-bytes');
const jpg = Buffer.from('jpg-bytes');
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const DL = 'https://dl.polyhaven.org/file/ph-assets';
const ASSETS = {
  rocket_chair: { name: 'Rocket Chair', type: 2, categories: ['furniture'], tags: ['metal', 'space'], description: 'A chair shaped like a rocket.', polycount: 900 },
  rusty_metal: { name: 'Rusty Metal', type: 1, categories: ['metal'], tags: ['rust'], description: 'Old steel plates.' },
  noon_grass: { name: 'Noon Grass', type: 0, categories: ['outdoor'], tags: ['sunny'], description: 'A bright field.' },
};
const files = (over = {}) => ({
  fbx: { '1k': { fbx: {
    url: `${DL}/chair_1k.fbx`, size: fbx.length, md5: md5(fbx),
    include: { 'textures/chair_diff_1k.jpg': { url: `${DL}/chair_diff_1k.jpg`, size: jpg.length, md5: md5(jpg) }, 'textures/chair_nor_1k.exr': { url: `${DL}/chair_nor_1k.exr`, size: 9, md5: 'x' } },
  } } },
  nor_gl: { '1k': { jpg: { url: `${DL}/chair_nor_gl_1k.jpg`, size: jpg.length, md5: md5(jpg) } } },
  ...over,
});

function fakeWeb(fileData = files()) {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url: String(url), ua: init?.headers?.['User-Agent'] });
    const u = String(url);
    const json = (b) => ({ ok: true, status: 200, json: async () => b });
    if (u.endsWith('/assets')) return json(ASSETS);
    if (u.includes('/files/')) return json(fileData);
    if (u.endsWith('.fbx')) return { ok: true, status: 200, arrayBuffer: async () => fbx };
    return { ok: true, status: 200, arrayBuffer: async () => jpg };
  };
  return { seen, fetchImpl };
}

async function hq(web, setup = () => {}) {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'tools/agent-hq'), { recursive: true });
  setup(root);
  const s = await startServer({ root, port: 0, stateDir: tmp(), catalogFetch: web.fetchImpl, catalogLihfolk: path.join(root, 'none') });
  running.push(s);
  const call = async (method, route, body, token = s.ownerToken) => {
    const r = await fetch(`http://127.0.0.1:${s.port}${route}`, {
      method, headers: { 'x-hq-token': token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, json: await r.json() };
  };
  return { ...s, root, call };
}

test('refresh names HQ to Poly Haven and makes everything searchable', async () => {
  const web = fakeWeb();
  const a = await hq(web);
  await a.call('POST', '/api/catalog/refresh', {});
  assert.equal(web.seen[0].ua, 'AgentHQ-Studio/1.0');
  const r = (await a.call('GET', '/api/catalog?q=rocket')).json;
  assert.equal(r.results[0].name, 'Rocket Chair');
  assert.equal(r.results[0].licence, 'CC0');
  assert.match(r.results[0].preview, /cdn\.polyhaven\.com/);
  assert.equal((await a.call('GET', '/api/catalog?q=steel')).json.results[0].id, 'polyhaven:rusty_metal');
  assert.equal((await a.call('GET', '/api/catalog?type=hdri')).json.found, 1);
  assert.equal((await a.call('GET', '/api/catalog?q=rocket+field')).json.found, 0); // every word must match
});

test('fetch saves a model for Roblox, skips EXR, records the source and indexes it', async () => {
  const a = await hq(fakeWeb());
  await a.call('POST', '/api/catalog/refresh', {});
  const r = await a.call('POST', '/api/catalog/fetch', { id: 'polyhaven:rocket_chair', res: '1k' });
  assert.equal(r.status, 200);
  const dir = path.join(a.root, 'assets/library/polyhaven/rocket_chair');
  assert.ok(fs.existsSync(path.join(dir, 'chair_1k.fbx')));
  assert.ok(fs.existsSync(path.join(dir, 'textures/chair_nor_gl_1k.jpg')));
  assert.ok(!fs.existsSync(path.join(dir, 'textures/chair_nor_1k.exr')));
  assert.match(fs.readFileSync(path.join(dir, 'SOURCE.txt'), 'utf8'), /Licence: CC0/);
  const index = (await a.call('GET', '/api/assets?search=Rocket')).json.assets;
  assert.equal(index[0].kind, 'model');
});

test('a bad checksum, a strange host or a path escape saves nothing', async () => {
  const cases = [
    files({ fbx: { '1k': { fbx: { url: `${DL}/c.fbx`, size: 1, md5: 'wrong', include: {} } } } }),
    files({ fbx: { '1k': { fbx: { url: 'https://evil.example/c.fbx', size: 1, md5: md5(fbx), include: {} } } } }),
    files({ fbx: { '1k': { fbx: { url: `${DL}/c.fbx`, size: 1, md5: md5(fbx), include: { '../../../evil.png': { url: `${DL}/e.png`, size: 1, md5: md5(jpg) } } } } } }),
  ];
  for (const data of cases) {
    const a = await hq(fakeWeb(data));
    await a.call('POST', '/api/catalog/refresh', {});
    const r = await a.call('POST', '/api/catalog/fetch', { id: 'polyhaven:rocket_chair' });
    assert.equal(r.status, 502);
    assert.ok(!fs.existsSync(path.join(a.root, '..', 'evil.png')));
  }
});

test('huge downloads are refused', async () => {
  const a = await hq(fakeWeb(files({ fbx: { '1k': { fbx: { url: `${DL}/c.fbx`, size: 400 * 1024 * 1024, md5: 'x', include: {} } } } })));
  await a.call('POST', '/api/catalog/refresh', {});
  assert.equal((await a.call('POST', '/api/catalog/fetch', { id: 'polyhaven:rocket_chair' })).status, 400);
});

test('a downloaded pack is indexed, with its licence read from the pack', async () => {
  const a = await hq(fakeWeb(), (root) => {
    const p = path.join(root, 'assets/packs/kenney_ui-pack');
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, 'License.txt'), 'Creative Commons Zero, CC0');
    fs.writeFileSync(path.join(p, 'button_blue.png'), 'x');
    fs.writeFileSync(path.join(p, 'click_soft.ogg'), 'x');
    const q = path.join(root, 'assets/packs/mystery');
    fs.mkdirSync(q);
    fs.writeFileSync(path.join(q, 'thing.png'), 'x');
  });
  const r = (await a.call('GET', '/api/catalog?q=button')).json.results[0];
  assert.equal(r.licence, 'CC0');
  assert.match(r.description, /1 image files, 1 sound files/);
  assert.match((await a.call('GET', '/api/catalog?q=mystery')).json.results[0].licence, /Unknown/);
});

test('agents can search, only a librarian task can fetch, and only the owner can refresh', async () => {
  const a = await hq(fakeWeb());
  assert.equal((await a.call('GET', '/api/catalog', undefined, a.token)).status, 200);
  assert.equal((await a.call('POST', '/api/catalog/refresh', {}, a.token)).status, 403);
  assert.equal((await a.call('POST', '/api/catalog/fetch', { id: 'polyhaven:rocket_chair' }, a.token)).status, 403);
});

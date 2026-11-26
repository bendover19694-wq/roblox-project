import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createUiLab, zipImages, related } from '../ui-lab.mjs';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

// A minimal zip writer (stored and deflated entries) so tests need no tools.
function zip(entries) {
  const locals = [], centrals = [];
  let off = 0;
  for (const [name, body, deflate] of entries) {
    const data = deflate ? zlib.deflateRawSync(body) : body;
    const n = Buffer.from(name);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(deflate ? 8 : 0, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(body.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(deflate ? 8 : 0, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(body.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, n, data); centrals.push(ch, n);
    off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}

const lab = (over = {}) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-uilab-'));
  const tasks = [];
  const l = createUiLab({ stateDir, root: '/repo', queueTask: (t) => { tasks.push(t); return { id: `t_${tasks.length}` }; },
    palette: async () => JSON.stringify({ palette: [{ hex: '#ff0000', n: 9 }, { hex: '#00ff00', n: 4 }], sheet: null, count: 2 }),
    cutout: async () => JSON.stringify({ items: [] }), games: () => [{ slug: 'clipping-empire', name: 'GT6 Clipping Empire' }], ...over });
  return { l, stateDir, tasks };
};

test('zip reader: images only, stored and deflated, unsafe paths refused', () => {
  const got = zipImages(zip([['Eggs/egg.png', PNG, true], ['readme.txt', Buffer.from('x')], ['Ranks/gold.png', PNG, false]]));
  assert.deepEqual(got.map((e) => e.name), ['Eggs/egg.png', 'Ranks/gold.png']);
  assert.ok(got.every((e) => e.body.equals(PNG)));
  assert.throws(() => zipImages(zip([['../x.png', PNG]])), /unsafe path/);
  assert.throws(() => zipImages(zip([['C:/x.png', PNG]])), /unsafe path/);
  assert.throws(() => zipImages(Buffer.from('nope')), /not a zip/);
});

test('an icon pack becomes a kit with icons, tags from folders, a palette and a study task', async () => {
  const { l, stateDir, tasks } = lab();
  const kit = await l.ingest({ name: 'FOLK Icons', filename: 'FOLK.zip', data: zip([['Eggs/egg.png', PNG, true], ['Ranks/gold.png', PNG]]), ask: 'the egg shading' });
  assert.equal(kit.kind, 'pack');
  assert.equal(kit.counts.icons, 2);
  assert.deepEqual(kit.tags, ['Eggs', 'Ranks']);
  assert.equal(kit.palette[0].hex, '#ff0000');
  assert.ok(fs.existsSync(path.join(stateDir, 'media', kit.icons[0].file)));
  assert.equal(tasks[0].role, 'designer');
  assert.match(tasks[0].body, /hq_uilab_kit \{id: "folk-icons-/);
  assert.match(tasks[0].body, /the egg shading/);
  assert.equal(kit.notes.state, 'studying');
  assert.equal(l.list().stats.icons, 2);
  assert.equal(l.list('ranks').kits.length, 1);
  assert.equal(l.list('nothing-like-this').kits.length, 0);
});

test('a Roblox file: teardown report, thumbnails only from the Roblox CDN, scripts never run', async () => {
  const fetched = [];
  const fetchImpl = async (url) => {
    fetched.push(url);
    if (url.startsWith('https://thumbnails.roblox.com/')) return { ok: true, json: async () => ({ data: [{ targetId: 11, state: 'Completed', imageUrl: 'https://tr.rbxcdn.com/a/420/420/Image/Png' }, { targetId: 12, state: 'Completed', imageUrl: 'https://evil.example/x.png' }] }) };
    return { ok: true, arrayBuffer: async () => PNG };
  };
  const teardown = async () => JSON.stringify({ counts: { objects: 2800, gui: 40, scripts: 5, images: 2 }, images: [{ id: '11', uses: 3, class: 'ImageLabel', name: 'Coin' }, { id: '12', uses: 1, class: 'ImageButton', name: 'Buy' }],
    palette: [{ key: '#ffcc00', n: 30 }], gradients: [{ stops: ['#ffff00', '#15ff00'], uses: 2 }], fonts: {}, strokes: [{ key: '3', n: 12 }], corners: {}, tags: ['shop', 'crates / lootbox'], names: [] });
  const { l } = lab({ fetchImpl, teardown });
  const kit = await l.ingest({ name: 'Shop UI', filename: 'shop.rbxm', data: Buffer.from('<roblox!x') });
  assert.equal(kit.counts.scripts, 5);
  assert.deepEqual(kit.fonts, []); // Lune's {} for an empty list
  assert.deepEqual(kit.gradients[0].stops, ['#ffff00', '#15ff00']);
  assert.ok(kit.icons.find((i) => i.id === '11').file);
  assert.equal(kit.icons.find((i) => i.id === '12').file, null); // a non-Roblox image host is never fetched
  assert.ok(!fetched.some((u) => u.includes('evil.example')));
  assert.deepEqual(kit.tags, ['shop', 'crates / lootbox']);
});

test('wrong file types and empty files are refused', async () => {
  const { l } = lab();
  await assert.rejects(l.ingest({ name: 'x', filename: 'x.exe', data: Buffer.from('MZ') }), /UI Lab takes/);
  await assert.rejects(l.ingest({ name: 'x', filename: 'x.png', data: Buffer.alloc(0) }), /empty/);
});

test('study notes link related kits and land in the searchable notes folder', async () => {
  const { l, stateDir } = lab();
  const a = await l.ingest({ name: 'Kit A', filename: 'a.zip', data: zip([['Shop/a.png', PNG]]) });
  const b = await l.ingest({ name: 'Kit B', filename: 'b.zip', data: zip([['Shop/b.png', PNG]]) });
  const r = l.saveNote(b.id, '## Look in one line\nChunky white studs.', 'designer');
  assert.equal(r.related[0].id, a.id);
  const md = fs.readFileSync(path.join(stateDir, 'research-notes', `uilab-${b.id}.md`), 'utf8');
  assert.match(md, /# UI kit study: Kit B/);
  assert.match(md, /## Related kits\n- Kit A/);
  assert.equal(l.get(b.id).notes.state, 'done');
  assert.match(l.get(b.id).note, /Chunky white studs/);
  assert.equal(related({ id: 'x', palette: [{ hex: '#000000' }], tags: [] }, [{ id: 'y', palette: [{ hex: '#ffffff' }], tags: [] }]).length, 0);
});

test('only the kit study task may write its note, never a partner task; a zip bomb is refused', async () => {
  const { l } = lab();
  const k = await l.ingest({ name: 'Kit C', filename: 'c.zip', data: zip([['a.png', PNG]]) });
  assert.throws(() => l.saveNote(k.id, 'x', 'designer', { id: 't_other', createdBy: 'owner' }), /only the study task/);
  assert.throws(() => l.saveNote(k.id, 'x', 'designer', { id: 't_1', createdBy: 'partner' }), /only the study task/);
  assert.equal(l.saveNote(k.id, 'x', 'designer', { id: 't_1', createdBy: 'owner' }).ok, true);
  // declared size 10 bytes, real data inflates to 1 MB: refused instead of filling memory
  const big = zlib.deflateRawSync(Buffer.alloc(1024 * 1024));
  const forged = zip([['bomb.png', big.subarray(0, 1)]]);
  const b = Buffer.from(zip([['bomb.png', Buffer.alloc(1024 * 1024), true]]));
  const cd = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  b.writeUInt32LE(10, cd + 24); // lie about the uncompressed size
  assert.throws(() => zipImages(b));
  assert.ok(forged.length > 0);
});

test('a study whose task failed shows as failed, not studying', async () => {
  let state = 'working';
  const { l } = lab({ taskState: () => state });
  const k = await l.ingest({ name: 'Kit D', filename: 'd.zip', data: zip([['a.png', PNG]]) });
  assert.equal(l.get(k.id).notes.state, 'studying');
  state = 'failed';
  assert.equal(l.get(k.id).notes.state, 'failed');
  assert.equal(l.list().kits[0].notes, 'failed');
});

test('game finder: search, then a kit from public icons and CDN screenshots, capture adds window shots', async () => {
  const { findGames, gameMedia } = await import('../game-finder.mjs');
  const fetchImpl = async (url) => {
    const ok = (o) => ({ ok: true, json: async () => o, arrayBuffer: async () => PNG });
    if (url.includes('omni-search')) return ok({ searchResults: [{ contentGroupType: 'Game', contents: [{ universeId: 7436755782, rootPlaceId: 126884695634066, name: 'Grow a Garden', playerCount: 5 }, { universeId: 'x;', rootPlaceId: 1 }] }, { contentGroupType: 'User', contents: [{ universeId: 1 }] }] });
    if (url.includes('/games/icons')) return ok({ data: [{ imageUrl: 'https://tr.rbxcdn.com/icon/512/512/Image/Png' }] });
    if (url.includes('multiget')) return ok({ data: [{ thumbnails: [{ imageUrl: 'https://tr.rbxcdn.com/s1/768/432/Image/Png' }, { imageUrl: 'https://evil.example/s2.png' }] }] });
    if (url.includes('game-passes')) return ok({ gamePasses: [{ displayName: 'Premium Seed Pack', displayIconImageAssetId: 87173607425704 }] });
    if (url.includes('badges.roblox.com')) return ok({ data: [{ name: 'Welcome', iconImageId: 127679841776434 }] });
    if (url.startsWith('https://thumbnails.roblox.com/v1/assets')) return ok({ data: [{ targetId: 87173607425704, state: 'Completed', imageUrl: 'https://tr.rbxcdn.com/p/420/420/Image/Png' }, { targetId: 127679841776434, state: 'Completed', imageUrl: 'https://tr.rbxcdn.com/b/420/420/Image/Png' }] });
    return ok({});
  };
  const games = await findGames('grow a garden', fetchImpl);
  assert.deepEqual(games, [{ universeId: '7436755782', placeId: '126884695634066', name: 'Grow a Garden', players: 5 }]);
  const m = await gameMedia('7436755782', fetchImpl);
  assert.equal(m.screens.length, 2); // the icon and one CDN screenshot; the non-Roblox URL is dropped
  await assert.rejects(gameMedia('1;drop', fetchImpl), /universeId/);
  const { l, tasks } = lab({ fetchImpl });
  const kit = await l.importGame({ universeId: '7436755782', placeId: '126884695634066', name: 'Grow a Garden' });
  assert.equal(kit.kind, 'game');
  assert.equal(kit.counts.icons, 2);
  assert.equal(kit.counts.screens, 2);
  assert.match(kit.licence, /study only/);
  assert.equal(kit.source, 'https://www.roblox.com/games/126884695634066');
  assert.equal(tasks.at(-1).role, 'designer');
  let asked = null;
  const after = await l.capture(kit.id, async (placeId, out) => { asked = placeId; fs.writeFileSync(path.join(out, 'capture-0.png'), PNG); });
  assert.equal(asked, '126884695634066');
  assert.equal(after.counts.screens, 3);
  const pack = await l.ingest({ name: 'Kit E', filename: 'e.zip', data: zip([['a.png', PNG]]) });
  await assert.rejects(l.capture(pack.id, async () => {}), /only kits made from a Roblox game/);
  const rows = l.catalogEntries();
  assert.ok(rows.some((r) => r.id === `uilab:${kit.id}` && r.source === 'uilab' && r.type === 'ui-kit'));
});

test('a screenshot of any game is cut into buttons and icons; a rescan replaces the cut, never the pack icons', async () => {
  let runs = 0;
  const { l, stateDir } = lab({ cutout: async (shot, out, prefix) => {
    runs += 1;
    assert.ok(fs.existsSync(shot));
    fs.writeFileSync(path.join(out, `${prefix}-el-0000.png`), PNG);
    fs.writeFileSync(path.join(out, `${prefix}-ic-0001.png`), PNG);
    return JSON.stringify({ items: [{ file: `${prefix}-el-0000.png`, kind: 'element', box: [1, 2, 30, 40] }, { file: `${prefix}-ic-0001.png`, kind: 'icon', box: [5, 6, 10, 10] }, { file: '../evil.png', kind: 'icon', box: [0, 0, 1, 1] }] });
  } });
  const k = await l.ingest({ name: 'Other game HUD', filename: 'hud.gif', data: PNG, game: 'clipping-empire', use: 'buttons' });
  assert.equal(k.kind, 'screenshot');
  assert.equal(k.game, 'clipping-empire');
  assert.ok(k.tags.includes('buttons'));
  assert.deepEqual(k.icons.map((i) => i.class), ['element', 'icon'], 'a file name the script did not make is ignored');
  assert.deepEqual(k.icons[0].box, [1, 2, 30, 40]);
  assert.equal(k.counts.icons, 2);
  const again = await l.scan(k.id);
  assert.equal(runs, 2);
  assert.equal(again.icons.length, 2, 'a rescan does not pile up');
  assert.ok(fs.existsSync(path.join(stateDir, 'media', again.icons[1].file)));
  const missing = lab({ cutout: async () => { throw new Error("python failed: ModuleNotFoundError: No module named 'scipy'"); } }).l;
  assert.match((await missing.ingest({ name: 'x', filename: 'x.png', data: PNG })).cutError, /pip install pillow numpy scipy/);
});

test('a Figma .fig file gives up its extensionless images by their bytes', async () => {
  const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const got = zipImages(zip([['canvas.fig', Buffer.from('fig-kiwi')], ['images/abc123', PNG, true], ['images/def456', JPG], ['images/notimg', Buffer.from('xx')]]), { sniff: true });
  assert.deepEqual(got.map((e) => e.name), ['images/abc123.png', 'images/def456.jpg']);
  assert.equal(zipImages(zip([['images/abc123', PNG]])).length, 0, 'plain zips do not sniff');
  const { l } = lab();
  const k = await l.ingest({ name: 'Figma kit', filename: 'kit.fig', data: zip([['images/abc123', PNG]]) });
  assert.equal(k.kind, 'pack');
  assert.equal(k.counts.icons, 1);
});

test('bin: archived kits leave the library and catalog, come back, and only leave for good from the bin', async () => {
  const { l, stateDir } = lab();
  const k = await l.ingest({ name: 'Old kit', filename: 'o.zip', data: zip([['a.png', PNG]]) });
  assert.throws(() => l.remove(k.id), /bin first/);
  assert.throws(() => l.setMeta(k.id, { game: 'nope' }), /unknown game/);
  l.setMeta(k.id, { archived: true, game: 'clipping-empire' });
  assert.equal(l.list().kits.length, 0);
  assert.equal(l.list('', { bin: true }).kits[0].game, 'clipping-empire');
  assert.equal(l.catalogEntries().length, 0);
  l.setMeta(k.id, { archived: false });
  assert.equal(l.list('', { game: 'clipping-empire' }).kits.length, 1);
  l.setMeta(k.id, { archived: true });
  assert.deepEqual(l.remove(k.id), { ok: true });
  assert.equal(l.get(k.id), null);
  assert.ok(!fs.existsSync(path.join(stateDir, 'media', 'uilab', k.id)));
});

test('shot_icons.py finds both buttons on a drawn HUD and the icon inside one (skips without numpy/scipy)', async (t) => {
  const { execFileSync } = await import('node:child_process');
  const script = path.resolve(import.meta.dirname, '../../../scripts/uilab/shot_icons.py');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-cut-'));
  const draw = `from PIL import Image, ImageDraw
im = Image.new('RGB', (800, 450))
d = ImageDraw.Draw(im)
for y in range(450): d.line([(0, y), (800, y)], fill=(120, 190 + y // 10, 255))
d.rounded_rectangle([40, 40, 240, 200], 18, fill=(230, 40, 80), outline=(10, 10, 10), width=6)
d.ellipse([90, 70, 190, 170], fill=(250, 200, 40), outline=(10, 10, 10), width=6)
d.rounded_rectangle([500, 300, 760, 400], 18, fill=(60, 200, 60), outline=(10, 10, 10), width=6)
im.save(r'${path.join(dir, 'hud.png')}')`;
  try { execFileSync('python', ['-I', '-c', 'import numpy, scipy, PIL']); } catch { t.skip('python with pillow, numpy and scipy not found'); return; }
  execFileSync('python', ['-I', '-c', draw]);
  const out = JSON.parse(execFileSync('python', ['-I', script, path.join(dir, 'hud.png'), path.join(dir, 'cut'), 's0'], { encoding: 'utf8' }));
  const near = (b, x, y, w, h) => Math.abs(b[0] - x) < 12 && Math.abs(b[1] - y) < 12 && Math.abs(b[2] - w) < 20 && Math.abs(b[3] - h) < 20;
  assert.ok(out.items.some((i) => i.kind === 'element' && near(i.box, 40, 40, 200, 160)), JSON.stringify(out.items));
  assert.ok(out.items.some((i) => i.kind === 'element' && near(i.box, 500, 300, 260, 100)));
  assert.ok(out.items.some((i) => i.kind === 'icon' && near(i.box, 90, 70, 100, 100)), 'the coin inside the red button');
  assert.ok(out.items.every((i) => fs.existsSync(path.join(dir, 'cut', i.file))));
});

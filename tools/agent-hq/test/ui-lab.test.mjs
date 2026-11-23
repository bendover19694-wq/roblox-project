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
    palette: async () => JSON.stringify({ palette: [{ hex: '#ff0000', n: 9 }, { hex: '#00ff00', n: 4 }], sheet: null, count: 2 }), ...over });
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

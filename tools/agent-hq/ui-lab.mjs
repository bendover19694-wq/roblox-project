// UI Lab: drop a Roblox UI file (.rbxm .rbxmx .rbxl .rbxlx), an icon pack (.zip) or a screenshot. HQ tears it down
// (icons, textures, palette, gradients, fonts, strokes, corners, tags), shows it as a kit card, and a designer agent
// studies it and writes a note. Notes link to related kits by shared colours and tags, and are searchable by every agent.
// Safety: Roblox files are parsed by Lune and never run; zips are unpacked image-only with path checks; thumbnails come
// only from Roblox's own CDN. Kit images live under <stateDir>/media/uilab/<id>/ (served as inert media), data under <stateDir>/uilab/<id>/.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFile } from 'node:child_process';

export const EXTS = { '.rbxm': 'roblox', '.rbxmx': 'roblox', '.rbxl': 'roblox', '.rbxlx': 'roblox', '.zip': 'pack', '.png': 'screenshot', '.jpg': 'screenshot', '.jpeg': 'screenshot', '.webp': 'screenshot' };
export const MAX_BYTES = 60 * 1024 * 1024;
const IMG = /\.(png|jpe?g|webp|gif)$/i;
const ID = /^[a-z0-9-]{3,60}$/;
const CDN = /^https:\/\/t[r0-9]\.rbxcdn\.com\//;
const MAX_ICONS = 600;

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'kit';
const arr = (v) => (Array.isArray(v) ? v : []); // Lune writes an empty table as {}
const run = (cmd, args, opts) => new Promise((resolve, reject) => {
  execFile(cmd, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024, timeout: 180000, ...opts }, (e, out, err) => (e ? reject(new Error(`${path.basename(cmd)} failed: ${String(err || e.message).slice(0, 300)}`)) : resolve(out)));
});

/** Image entries of a zip, read with the central directory (no extraction tool, no shell). Throws on unsafe paths. */
export function zipImages(buf, { max = 10000, maxTotal = 300 * 1024 * 1024 } = {}) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('broken zip directory');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8').replace(/\\/g, '/');
    p += 46 + nlen + elen + clen;
    if (name.startsWith('/') || name.split('/').includes('..') || name.includes(':')) throw new Error(`unsafe path in zip: ${name}`);
    if (name.endsWith('/') || !IMG.test(name)) continue;
    if (out.length >= max || (total += usize) > maxTotal) throw new Error('zip holds too many images');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + csize);
    if (usize > 20 * 1024 * 1024) throw new Error(`image too large in zip: ${name}`);
    const body = method === 0 ? data : method === 8 ? zlib.inflateRawSync(data, { maxOutputLength: usize }) : null; // never inflate past the declared size (zip bombs)
    if (body && body.length === usize) out.push({ name, body });
  }
  return out;
}

/** Kits that share at least two palette colours (within a small distance) or two tags: the note's "Related kits". */
export function related(kit, kits) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const near = (a, b) => { const [x, y] = [rgb(a), rgb(b)]; return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 40; };
  const hue = (h) => { const c = rgb(h); return Math.max(...c) - Math.min(...c) > 40; }; // white, black and greys say nothing about a kit's look
  const mine = arr(kit.palette).slice(0, 8).map((c) => c.hex).filter(hue);
  return kits.filter((k) => k.id !== kit.id).map((k) => {
    const colours = mine.filter((h) => arr(k.palette).slice(0, 8).some((c) => hue(c.hex) && near(h, c.hex))).length;
    const tags = arr(k.tags).filter((t) => arr(kit.tags).includes(t)).length;
    return { id: k.id, name: k.name, score: colours + tags * 2, colours, tags };
  }).filter((r) => r.colours >= 2 || r.tags >= 2).sort((a, b) => b.score - a.score).slice(0, 6);
}

export function createUiLab({ stateDir, root, queueTask = () => null, fetchImpl = globalThis.fetch, lune = 'lune', python = 'python', now = Date.now,
  teardown = (src) => run(lune, ['run', path.join(root, 'scripts', 'uilab', 'teardown.luau'), src], { cwd: root }),
  palette = (dir, sheet) => run(python, ['-I', path.join(root, 'scripts', 'uilab', 'palette.py'), dir, sheet, '120']) }) {
  const dataDir = path.join(stateDir, 'uilab');
  const mediaDir = path.join(stateDir, 'media', 'uilab');
  const kitFile = (id) => path.join(dataDir, id, 'kit.json');
  const read = (id) => { try { return JSON.parse(fs.readFileSync(kitFile(id), 'utf8')); } catch { return null; } };
  const write = (kit) => { fs.mkdirSync(path.join(dataDir, kit.id), { recursive: true }); fs.writeFileSync(kitFile(kit.id), JSON.stringify(kit, null, 1)); };
  const all = () => { try { return fs.readdirSync(dataDir).filter((d) => ID.test(d)).map(read).filter(Boolean); } catch { return []; } };

  async function thumbnails(ids, dir) {
    const got = new Map();
    for (let i = 0; i < ids.length; i += 100) {
      const q = ids.slice(i, i + 100).join(',');
      try {
        const r = await fetchImpl(`https://thumbnails.roblox.com/v1/assets?assetIds=${q}&returnPolicy=PlaceHolder&size=420x420&format=Png&isCircular=false`, { signal: AbortSignal.timeout(15000) });
        for (const d of arr((await r.json())?.data)) if (d.state === 'Completed' && CDN.test(d.imageUrl ?? '')) got.set(String(d.targetId), d.imageUrl);
      } catch { /* offline: the kit keeps ids without previews */ }
    }
    const files = new Map();
    const queue = [...got];
    await Promise.all(Array.from({ length: 6 }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const [id, url] = job;
        try {
          const r = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
          const b = Buffer.from(await r.arrayBuffer());
          if (r.ok && b.length < 2 * 1024 * 1024 && b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
            fs.writeFileSync(path.join(dir, `${id}.png`), b);
            files.set(id, `${id}.png`);
          }
        } catch { /* skip one bad image */ }
      }
    }));
    return files;
  }

  async function study(kit, ask = '', engine) {
    const t = queueTask({
      title: `Study UI kit: ${kit.name}`.slice(0, 200), role: 'designer', ...(engine ? { engine } : {}), createdBy: 'owner',
      body: [
        `Study the UI kit "${kit.name}" in the UI Lab (id ${kit.id}). Call hq_uilab_kit {id: "${kit.id}"} for the teardown, then open the contact sheet and a few icons and screenshots with Read.`,
        ask ? `The owner wants you to look at: ${ask}` : '',
        'Write one note with hq_uilab_note {id, note} in Markdown, these sections in order: Look in one line; Palette roles (which hex is base, accent, reward, danger, text); Gradients and where they go; Shapes, strokes and corners (numbers); Type (fonts, weights, sizes, stroke); Icon style (outline, shading, angle, size); Layout patterns (HUD rails, windows, tabs, grids); Motion you can infer; What to borrow (structure and technique only); What not to copy (names, logos, exact art); Tags.',
        'Cite counts and hex values from the teardown. No guessing: say what you could not see. Do not edit game files.',
      ].filter(Boolean).join('\n\n'),
    });
    kit.notes = { state: 'studying', taskId: t?.id ?? null, at: new Date(now()).toISOString() };
    write(kit);
    return t;
  }

  async function ingest({ name, filename, data, source = '', licence = '', ask = '' }) {
    const ext = path.extname(String(filename)).toLowerCase();
    const kind = EXTS[ext];
    if (!kind) throw new Error(`UI Lab takes ${Object.keys(EXTS).join(' ')} files`);
    if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_BYTES) throw new Error('file is empty or larger than 60 MB');
    const id = `${slug(name || path.basename(filename, ext))}-${crypto.randomBytes(2).toString('hex')}`;
    const work = path.join(dataDir, id);
    const media = path.join(mediaDir, id);
    const icons = path.join(media, 'icons');
    fs.mkdirSync(work, { recursive: true });
    fs.mkdirSync(icons, { recursive: true });
    const kit = { id, name: String(name || path.basename(filename, ext)).slice(0, 80), kind, file: path.basename(String(filename)).slice(0, 120), source: String(source).slice(0, 500), licence: String(licence).slice(0, 300), createdAt: new Date(now()).toISOString(), counts: {}, tags: [], palette: [], gradients: [], fonts: [], strokes: [], corners: [], icons: [], screens: [], sheet: null, notes: { state: 'none' } };
    if (kind === 'roblox') {
      const src = path.join(work, `source${ext}`);
      fs.writeFileSync(src, data);
      const t = JSON.parse(await teardown(src));
      const imgs = arr(t.images).slice(0, MAX_ICONS);
      const files = await thumbnails(imgs.map((i) => i.id), icons);
      Object.assign(kit, { counts: { ...t.counts, icons: files.size }, tags: arr(t.tags), gradients: arr(t.gradients).slice(0, 40), fonts: arr(t.fonts), strokes: arr(t.strokes), corners: arr(t.corners), names: arr(t.names).slice(0, 200) });
      kit.icons = imgs.map((i) => ({ id: i.id, name: i.name, class: i.class, uses: i.uses, file: files.has(i.id) ? `uilab/${id}/icons/${files.get(i.id)}` : null }));
      kit.palette = arr(t.palette).map((c) => ({ hex: c.key, n: c.n }));
    } else if (kind === 'pack') {
      const entries = zipImages(data);
      entries.slice(0, 4000).forEach((e, i) => {
        const safe = e.name.split('/').map((s) => s.replace(/[^\w.-]+/g, '_')).join('__').slice(-120);
        fs.writeFileSync(path.join(icons, `${String(i).padStart(4, '0')}-${safe}`), e.body);
      });
      kit.icons = fs.readdirSync(icons).map((f) => ({ name: f.replace(/^\d{4}-/, '').replace(/\.\w+$/, ''), file: `uilab/${id}/icons/${f}` }));
      kit.tags = [...new Set(entries.map((e) => e.name.split('/')[0]).filter((s) => s && !IMG.test(s)))].slice(0, 12);
      kit.counts = { icons: kit.icons.length, images: entries.length };
    } else {
      const shots = path.join(media, 'screens');
      fs.mkdirSync(shots, { recursive: true });
      fs.writeFileSync(path.join(shots, `screen${ext}`), data);
      kit.screens = [`uilab/${id}/screens/screen${ext}`];
      kit.counts = { screens: 1 };
    }
    try { // palette from the pixels and one contact sheet for agents
      const p = JSON.parse(await palette(media, path.join(media, 'sheet.png')));
      if (!kit.palette.length) kit.palette = arr(p.palette);
      else kit.pixelPalette = arr(p.palette);
      if (p.sheet) kit.sheet = `uilab/${id}/sheet.png`;
    } catch (e) { kit.paletteError = e.message; }
    write(kit);
    await study(kit, ask);
    return read(id);
  }

  function saveNote(id, note, by, task = null) {
    const kit = read(id);
    if (!kit) throw new Error('no such kit');
    // an agent may only write the note of the study task it was given, and never from a partner's task
    if (task && (task.createdBy === 'partner' || task.id !== kit.notes?.taskId)) throw new Error('only the study task of this kit can write its note');
    const rel = related(kit, all());
    const links = rel.length ? `\n\n## Related kits\n${rel.map((r) => `- ${r.name} (${r.id}): ${r.colours} shared colours, ${r.tags} shared tags`).join('\n')}` : '';
    const md = `# UI kit study: ${kit.name}\n\nKit ${kit.id} · ${kit.kind} · ${kit.file}${kit.source ? ` · source ${kit.source}` : ''}${kit.licence ? ` · licence: ${kit.licence}` : ''}\nStudied by ${by}, ${new Date(now()).toISOString().slice(0, 10)}. Tags: ${arr(kit.tags).join(', ') || 'none'}. Palette: ${arr(kit.palette).slice(0, 8).map((c) => c.hex).join(' ')}.\n\n${String(note).slice(0, 20000)}${links}\n`;
    fs.writeFileSync(path.join(dataDir, id, 'notes.md'), md);
    const notes = path.join(stateDir, 'research-notes'); // the knowledge "notes" source: every agent finds it with hq_knowledge_search
    fs.mkdirSync(notes, { recursive: true });
    fs.writeFileSync(path.join(notes, `uilab-${id}.md`), md);
    kit.notes = { ...kit.notes, state: 'done', at: new Date(now()).toISOString(), by };
    kit.related = rel;
    write(kit);
    return { ok: true, related: rel };
  }

  const note = (id) => { try { return fs.readFileSync(path.join(dataDir, id, 'notes.md'), 'utf8'); } catch { return ''; } };
  const card = (k) => ({ id: k.id, name: k.name, kind: k.kind, tags: k.tags, counts: k.counts, palette: arr(k.palette).slice(0, 8), preview: arr(k.icons).filter((i) => i.file).slice(0, 8).map((i) => i.file).concat(arr(k.screens)).slice(0, 8), notes: k.notes?.state ?? 'none', createdAt: k.createdAt, source: k.source });

  function list(q = '') {
    const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    const kits = all().filter((k) => !words.length || words.every((w) => `${k.name} ${arr(k.tags).join(' ')} ${k.file} ${note(k.id)}`.toLowerCase().includes(w)));
    kits.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const sum = (f) => kits.reduce((n, k) => n + (Number(k.counts?.[f]) || 0), 0);
    return { stats: { kits: kits.length, icons: sum('icons'), screens: sum('screens') }, kits: kits.map(card) };
  }

  return { ingest, study: async (id, ask, engine) => { const k = read(id); if (!k) throw new Error('no such kit'); return study(k, ask, engine); }, saveNote, list, get: (id) => { const k = read(id); return k ? { ...k, note: note(id) } : null; } };
}

export function mountUiLab(route, lab, { str, bad, isObj, agentTask, HttpError }) {
  const id = (s) => { if (!ID.test(s)) throw bad('bad kit id'); return s; };
  route('GET', /^\/api\/uilab$/, ({ query }) => lab.list(query?.get('q') ?? ''));
  route('GET', /^\/api\/uilab\/([a-z0-9-]+)$/, ({ m }) => lab.get(id(m[1])) ?? (() => { throw new HttpError(404, 'no such kit'); })());
  route('POST', /^\/api\/uilab$/, async ({ body }) => {
    if (!isObj(body)) throw bad('body must be an object');
    const filename = str(body.filename, 'filename', { max: 200, required: true });
    if (typeof body.dataBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.dataBase64)) throw bad('dataBase64 must be base64');
    const source = str(body.source, 'source', { max: 500 }) ?? '';
    if (source && !/^https:\/\//i.test(source)) throw bad('source must be an https link');
    try {
      return await lab.ingest({ name: str(body.name, 'name', { max: 80 }), filename, data: Buffer.from(body.dataBase64, 'base64'), source, licence: str(body.licence, 'licence', { max: 300 }) ?? '', ask: str(body.ask, 'ask', { max: 1000 }) ?? '' });
    } catch (e) { throw bad(e.message); }
  }, { maxBody: 85 * 1024 * 1024 });
  route('POST', /^\/api\/uilab\/([a-z0-9-]+)\/study$/, async ({ m, body }) => {
    const engine = isObj(body) ? str(body.engine, 'engine', { max: 20 }) : undefined;
    if (engine && !STUDY_ENGINES.includes(engine)) throw bad(`engine must be one of ${STUDY_ENGINES.join(', ')}`);
    const t = await lab.study(id(m[1]), isObj(body) ? str(body.ask, 'ask', { max: 1000 }) ?? '' : '', engine);
    return { taskId: t?.id ?? null };
  });
  route('POST', /^\/api\/uilab\/([a-z0-9-]+)\/note$/, ({ m, body, who, headers }) => {
    if (!isObj(body)) throw bad('body must be an object');
    const t = who === 'agent' ? agentTask(body, ['designer', 'ui'], headers) : null;
    try { return lab.saveNote(id(m[1]), str(body.note, 'note', { max: 20000, required: true }), t?.role ?? 'owner', t); } catch (e) { throw bad(e.message); }
  });
}

export const STUDY_ENGINES = ['claude-cli', 'codex', 'app', 'antigravity']; // codex: the ChatGPT account, read-only
export const UILAB_OWNER_ONLY = [['POST', /^\/api\/uilab(?:\/[a-z0-9-]+\/study)?$/]];

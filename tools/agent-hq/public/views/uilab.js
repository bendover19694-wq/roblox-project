// UI Lab page: drop Roblox UI files, icon packs or screenshots; HQ tears them down and a designer agent studies each kit.
// #/uilab is the library, #/uilab/<kit id> one kit (gradients, icons, palette, fonts, study note).
import { h, api, act, btn, empty, pageHead, notify, mediaUrl, ago } from './core.js';

const ACCEPT = '.rbxm,.rbxmx,.rbxl,.rbxlx,.zip,.png,.jpg,.jpeg,.webp';
const MAX = 60 * 1024 * 1024;
let lib = null;
let kit = null;
let kitId = null;
let q = '';
const form = { ask: '', source: '', licence: '' };
let queued = [];
const find = { q: '', results: null, busy: false };
let busy = '';

async function load() {
  try { lib = await api('GET', '/api/uilab' + (q ? `?q=${encodeURIComponent(q)}` : '')); } catch { lib = lib ?? { stats: {}, kits: [] }; }
  notify();
}
async function loadKit(id) {
  kitId = id;
  try { kit = await api('GET', `/api/uilab/${encodeURIComponent(id)}`); } catch { kit = null; }
  notify();
}

const b64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = () => reject(new Error('could not read ' + file.name));
  r.readAsDataURL(file);
});

function pick(files) {
  const ok = [...files].filter((f) => ACCEPT.split(',').some((e) => f.name.toLowerCase().endsWith(e)) && f.size <= MAX);
  if (ok.length < files.length) busy = `Skipped ${files.length - ok.length} file(s): wrong type or over 60 MB.`;
  queued = [...queued, ...ok];
  notify();
}

async function upload() {
  for (const f of queued) {
    busy = `Tearing down ${f.name}…`;
    notify();
    const body = { filename: f.name, name: f.name.replace(/\.[^.]+$/, ''), dataBase64: await b64(f), ask: form.ask, source: form.source || undefined, licence: form.licence };
    await act(() => api('POST', '/api/uilab', body), `${f.name} added; an agent is studying it`);
  }
  queued = [];
  busy = '';
  form.ask = '';
  await load();
}

const swatches = (pal) => h('div', { class: 'uil-swatches' }, (pal ?? []).slice(0, 8).map((c) => h('span', { class: 'uil-sw', style: `background:${c.hex}`, title: c.hex })));
const stripe = (pal) => `border-top: 3px solid ${pal?.[1]?.hex ?? pal?.[0]?.hex ?? 'var(--line)'}`;

function dropZone() {
  const input = h('input', { type: 'file', multiple: true, accept: ACCEPT, hidden: true, onchange: (e) => pick(e.target.files) });
  const zone = h('section', {
    class: 'card uil-drop', tabindex: 0, role: 'button', 'aria-label': 'Add Roblox UI files, icon packs or screenshots',
    onclick: () => input.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
    ondragover: (e) => { e.preventDefault(); zone.classList.add('over'); }, ondragleave: () => zone.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); zone.classList.remove('over'); pick(e.dataTransfer.files); },
  },
  input,
  h('strong', {}, 'Drop Roblox UI files, icon packs or screenshots'),
  h('p', { class: 'muted small' }, '.rbxm · .rbxl · .rbxmx · .zip · .png · .jpg. Every icon, texture, colour, gradient, font and stroke is saved and studied by the agents. Scripts in a file are counted, never run.'));
  return zone;
}

function composer() {
  return h('section', { class: 'card stack' },
    queued.length ? h('p', {}, `Ready: ${queued.map((f) => f.name).join(', ')}`) : null,
    h('input', { class: 'input', placeholder: 'Tell the agents what to look at (optional)', value: form.ask, oninput: (e) => { form.ask = e.target.value; } }),
    h('div', { class: 'row gap wrap' },
      h('input', { class: 'input', placeholder: 'Source link (https, optional)', value: form.source, oninput: (e) => { form.source = e.target.value; } }),
      h('input', { class: 'input', placeholder: 'Licence, e.g. free with credit (optional)', value: form.licence, oninput: (e) => { form.licence = e.target.value; } })),
    h('div', { class: 'row gap wrap' },
      btn(busy && busy.startsWith('Tearing') ? busy : 'Study', upload, { kind: 'primary', disabled: !queued.length || busy.startsWith('Tearing') }),
      h('a', { class: 'btn ghost', href: 'https://ui-resources.com/', target: '_blank', rel: 'noopener noreferrer' }, 'Browse UI Resources (free kits)'),
      h('span', { class: 'muted small' }, 'Download a kit there, then drop it here. Its terms forbid bulk downloading, so HQ never crawls it; check each creator\'s licence.')),
    busy && !busy.startsWith('Tearing') ? h('p', { class: 'muted small', role: 'status' }, busy) : null);
}

async function searchGames() {
  if (!find.q.trim()) return;
  find.busy = true; notify();
  try { find.results = (await api('GET', `/api/uilab/find?q=${encodeURIComponent(find.q)}`)).games; } catch { find.results = []; }
  find.busy = false; notify();
}

function finder() {
  return h('section', { class: 'card stack' },
    h('h2', {}, 'Find a Roblox game'),
    h('p', { class: 'muted small' }, "Type a game's name. HQ pulls its public UI art (icon, store screenshots, game-pass and badge icons) into a kit and an agent studies it. Study only: never ship another game's art."),
    h('div', { class: 'row gap wrap' },
      h('input', { class: 'input', type: 'search', placeholder: 'e.g. Grow a Garden', value: find.q, 'aria-label': 'Roblox game name', oninput: (e) => { find.q = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') searchGames(); } }),
      btn(find.busy ? 'Searching…' : 'Search Roblox', searchGames, { kind: 'primary', disabled: find.busy })),
    find.results ? (find.results.length ? h('div', { class: 'stack' }, find.results.map((g) => h('div', { class: 'row gap wrap' },
      h('strong', {}, g.name), h('span', { class: 'muted small' }, `${g.players.toLocaleString()} playing · place ${g.placeId}`),
      btn('Import its UI', async () => { const k = await act(() => api('POST', '/api/uilab/game', { universeId: g.universeId, placeId: g.placeId, name: g.name, ask: form.ask }), `${g.name} added; an agent is studying it`); if (k?.id) location.hash = '#/uilab/' + k.id; })))) : empty('No games found.')) : null);
}

const cardFor = (k) => h('a', { class: 'card uil-card', href: '#/uilab/' + k.id, style: stripe(k.palette) },
  h('div', { class: 'uil-name' }, k.name),
  h('div', { class: 'uil-preview' }, k.preview.length ? k.preview.map((p) => h('img', { src: mediaUrl(p), alt: '', loading: 'lazy', class: k.kind === 'screenshot' ? 'wide' : null })) : h('span', { class: 'muted small' }, 'no previews')),
  h('div', { class: 'small' }, (k.tags ?? []).slice(0, 4).join(', ') || k.kind),
  h('div', { class: 'muted small' }, [k.counts?.objects ? `${(k.counts.objects / 1000).toFixed(1)}k objects` : null, k.counts?.icons ? `${k.counts.icons} icons` : null, k.counts?.screens ? `${k.counts.screens} screenshot` : null, k.counts?.scripts != null ? `${k.counts.scripts} scripts` : null].filter(Boolean).join(' · ')),
  h('div', { class: 'muted small' }, k.notes === 'done' ? 'Studied' : k.notes === 'studying' ? 'An agent is studying it…' : k.notes === 'failed' ? 'Study failed: try Study again' : 'Not studied'),
  swatches(k.palette));

function library() {
  const s = lib.stats ?? {};
  return [
    pageHead('UI Lab', `${s.kits ?? 0} kits · ${s.icons ?? 0} icons · ${s.screens ?? 0} screenshots`, btn('Refresh', load)),
    dropZone(), composer(), finder(),
    h('div', { class: 'row gap' }, h('h2', {}, 'Library'),
      h('input', { class: 'input', type: 'search', placeholder: 'Search kits, shops, icons…', value: q, 'aria-label': 'Search the UI Lab', onchange: (e) => { q = e.target.value; load(); } })),
    lib.kits.length ? h('div', { class: 'uil-grid' }, lib.kits.map(cardFor)) : empty('No kits yet. Drop a .rbxm, an icon pack or a screenshot above.'),
  ];
}

const section = (title, items, fn) => (items?.length ? h('section', { class: 'card stack' }, h('h3', {}, `${title} (${items.length})`), fn(items)) : null);

function detail() {
  if (!kit) return empty('Loading the kit…');
  const k = kit;
  return [
    pageHead(k.name, `${k.kind} · ${k.file}${k.source ? ' · ' : ''}`, btn('Back to library', () => { location.hash = '#/uilab'; }),
      btn(k.notes?.state === 'studying' ? 'Study again' : 'Study', () => act(() => api('POST', `/api/uilab/${k.id}/study`, { ask: form.ask }), 'An agent is studying it').then(() => loadKit(k.id))),
      btn('Study with ChatGPT', () => act(() => api('POST', `/api/uilab/${k.id}/study`, { ask: form.ask, engine: 'codex' }), 'Codex is studying it').then(() => loadKit(k.id)), { kind: 'ghost', title: 'Runs on your ChatGPT account through the Codex CLI' })),
    k.kind === 'game' ? h('section', { class: 'card stack' }, h('h3', {}, 'Join and capture'),
      h('p', { class: 'muted small' }, 'Opens the game in your Roblox app (signed in as you), saves 3 screenshots of the in-game UI after it loads, closes Roblox, and studies them. Takes about a minute.'),
      btn('Join and capture', () => act(() => api('POST', `/api/uilab/${k.id}/capture`, {}), 'Captured; an agent is studying the screenshots').then(() => loadKit(k.id)))) : null,
    k.source ? h('p', { class: 'small' }, 'Source: ', h('a', { href: k.source, target: '_blank', rel: 'noopener noreferrer' }, k.source), k.licence ? ` · Licence: ${k.licence}` : '') : null,
    h('section', { class: 'card stack' }, h('h3', {}, 'Palette'), swatches(k.palette), h('div', { class: 'muted small' }, (k.palette ?? []).slice(0, 12).map((c) => c.hex).join('  '))),
    section('Gradients', k.gradients, (g) => h('div', { class: 'stack' }, g.slice(0, 24).map((x) => h('div', { class: 'uil-grad', style: `background:linear-gradient(90deg, ${x.stops.join(', ')})` }, h('span', {}, x.stops.join(' → ')))))),
    section('Icons', (k.icons ?? []).filter((i) => i.file), (list) => h('div', { class: 'uil-icons' }, list.slice(0, 300).map((i) => h('figure', { title: `${i.name ?? ''}${i.id ? ' · ' + i.id : ''}` }, h('img', { src: mediaUrl(i.file), alt: i.name ?? '', loading: 'lazy' }))))),
    section('Screenshots', k.screens, (list) => h('div', { class: 'uil-icons' }, list.map((p) => h('img', { src: mediaUrl(p), alt: 'screenshot', class: 'uil-shot' })))),
    section('Fonts', k.fonts, (f) => h('p', {}, f.map((x) => `${x.key} (${x.n})`).join(' · '))),
    section('Strokes and corners', [...(k.strokes ?? []), ...(k.corners ?? [])], () => h('p', {}, `Stroke thickness: ${(k.strokes ?? []).map((x) => `${x.key} px ×${x.n}`).join(', ') || 'none'} · Corners: ${(k.corners ?? []).map((x) => `${x.key} ×${x.n}`).join(', ') || 'none'}`)),
    k.related?.length ? h('section', { class: 'card stack' }, h('h3', {}, 'Related kits'), h('div', { class: 'row gap wrap' }, k.related.map((r) => h('a', { class: 'btn ghost', href: '#/uilab/' + r.id }, `${r.name} · ${r.colours} colours, ${r.tags} tags`)))) : null,
    h('section', { class: 'card stack' }, h('h3', {}, 'Study note'),
      k.note ? h('pre', { class: 'uil-note' }, k.note) : h('p', { class: 'muted' }, k.notes?.state === 'studying' ? `An agent is studying it (task ${k.notes.taskId ?? ''}, ${ago(k.notes.at)}).` : 'No note yet.')),
  ];
}

export function render(param) {
  if (param && param !== kitId) loadKit(param);
  if (!param) { kitId = null; if (lib === null) load(); }
  return h('div', { class: 'page uil' }, param ? detail() : lib ? library() : empty('Loading the UI Lab…'));
}

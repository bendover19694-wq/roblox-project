// UI Lab page: drop Roblox UI files, icon packs, Figma files or screenshots of any game; HQ tears them down, cuts every button
// and icon out of screenshots, and a designer agent studies each kit. Kits and mocks belong to a game; old ones go to the bin.
// #/uilab is the library, #/uilab/<kit id> one kit, #/uilab/mock/<id> one UI mock (drawn here from checked JSON, never HTML).
import { h, api, act, btn, empty, pageHead, notify, mediaUrl, ago, store, selectEl } from './core.js';

const ACCEPT = '.rbxm,.rbxmx,.rbxl,.rbxlx,.zip,.fig,.png,.jpg,.jpeg,.webp,.gif';
const MAX = 60 * 1024 * 1024;
const PAGE = 200; // icons per page: a 5000-icon pack stays quick
const SCREENS = [['hud', 'HUD'], ['shop', 'Shop'], ['inventory', 'Inventory'], ['quests', 'Quests'], ['daily', 'Daily rewards'], ['rebirth', 'Rebirth'], ['settings', 'Settings'], ['index', 'Index'], ['custom', 'Other (say what)']];
const USES = [['', 'Use for: anything'], ['buttons', 'Buttons'], ['backgrounds', 'Backgrounds'], ['icons', 'Icons'], ['hud', 'HUD'], ['windows', 'Windows']];
let lib = null;
let kit = null;
let kitId = null;
let mock = null;
let mocks = [];
let q = '';
let shelf = 'all'; // all | <game slug> | unsorted | bin
const form = { ask: '', source: '', licence: '', use: '', game: '' };
const maker = { game: '', screen: 'hud', ask: '' };
const pager = { page: 0, filter: 'all', q: '' };
let queued = [];
const find = { q: '', results: null, busy: false };
let busy = '';

const games = () => (store.games ?? []).filter((g) => !g.archivedAt); // archived games keep their kits but lose their shelf
const gameName = (slug) => games().find((g) => g.slug === slug)?.name ?? slug;
const shelfQuery = () => (shelf === 'bin' ? '&bin=1' : shelf === 'all' ? '' : `&game=${encodeURIComponent(shelf === 'unsorted' ? '' : shelf)}`);

async function load() {
  try {
    lib = await api('GET', `/api/uilab?q=${encodeURIComponent(q)}${shelfQuery()}`);
    mocks = (await api('GET', `/api/uimocks?${shelf === 'bin' ? 'bin=1' : shelf === 'all' ? '' : `game=${encodeURIComponent(shelf === 'unsorted' ? '' : shelf)}`}`)).mocks;
  } catch { lib = lib ?? { stats: {}, kits: [] }; }
  notify();
}
async function loadKit(id) {
  if (id !== kitId) Object.assign(pager, { page: 0, filter: 'all', q: '' });
  kitId = id;
  try { kit = await api('GET', `/api/uilab/${encodeURIComponent(id)}`); } catch { kit = null; }
  notify();
}
async function loadMock(id) {
  kitId = 'mock/' + id;
  try { mock = await api('GET', `/api/uimocks/${encodeURIComponent(id)}`); } catch { mock = null; }
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
    const body = { filename: f.name, name: f.name.replace(/\.[^.]+$/, ''), dataBase64: await b64(f), ask: form.ask, source: form.source || undefined, licence: form.licence, use: form.use || undefined, game: form.game || undefined };
    await act(() => api('POST', '/api/uilab', body), `${f.name} added; an agent is studying it`);
  }
  queued = [];
  busy = '';
  form.ask = '';
  await load();
}

const swatches = (pal) => h('div', { class: 'uil-swatches' }, (pal ?? []).slice(0, 8).map((c) => h('span', { class: 'uil-sw', style: `background:${c.hex}`, title: c.hex })));
const stripe = (pal) => `border-top: 3px solid ${pal?.[1]?.hex ?? pal?.[0]?.hex ?? 'var(--line)'}`;
const gameOptions = (none) => [{ value: '', label: none }, ...games().map((g) => ({ value: g.slug, label: g.name }))];

function dropZone() {
  const input = h('input', { type: 'file', multiple: true, accept: ACCEPT, hidden: true, onchange: (e) => pick(e.target.files) });
  const zone = h('section', {
    class: 'card uil-drop', tabindex: 0, role: 'button', 'aria-label': 'Add UI files, icon packs, Figma files or screenshots',
    onclick: () => input.click(), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
    ondragover: (e) => { e.preventDefault(); zone.classList.add('over'); }, ondragleave: () => zone.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); zone.classList.remove('over'); pick(e.dataTransfer.files); },
  },
  input,
  h('strong', {}, 'Drop UI files, icon packs, Figma files or screenshots of any game'),
  h('p', { class: 'muted small' }, '.rbxm · .rbxl · .rbxmx · .zip · .fig · .png · .jpg · .webp · .gif. Screenshots are cut into every button, panel and icon. Scripts in a file are counted, never run.'));
  return zone;
}

function composer() {
  return h('section', { class: 'card stack' },
    queued.length ? h('p', {}, `Ready: ${queued.map((f) => f.name).join(', ')}`) : null,
    h('input', { class: 'input', placeholder: 'Tell the agents what to look at (optional)', value: form.ask, oninput: (e) => { form.ask = e.target.value; } }),
    h('div', { class: 'row gap wrap' },
      selectEl(gameOptions('For: no game yet'), form.game, (v) => { form.game = v; }),
      selectEl(USES.map(([value, label]) => ({ value, label })), form.use, (v) => { form.use = v; }),
      h('input', { class: 'input', placeholder: 'Source link (https, optional)', value: form.source, oninput: (e) => { form.source = e.target.value; } }),
      h('input', { class: 'input', placeholder: 'Licence, e.g. free with credit (optional)', value: form.licence, oninput: (e) => { form.licence = e.target.value; } })),
    h('div', { class: 'row gap wrap' },
      btn(busy && busy.startsWith('Tearing') ? busy : 'Study', upload, { kind: 'primary', disabled: !queued.length || busy.startsWith('Tearing') })),
    h('div', { class: 'row gap wrap' },
      h('span', { class: 'small' }, 'Buttons and backgrounds:'),
      h('a', { class: 'btn ghost', href: 'https://ui-resources.com/', target: '_blank', rel: 'noopener noreferrer' }, 'UI Resources (free kits)'),
      h('a', { class: 'btn ghost', href: 'https://ui-resources.com/tools', target: '_blank', rel: 'noopener noreferrer' }, 'UI Resources tools'),
      h('a', { class: 'btn ghost', href: 'https://devforum.roblox.com/t/free-roimport-figma-to-roblox-plugin/4731967', target: '_blank', rel: 'noopener noreferrer' }, 'RoImport: Figma to Roblox'),
      h('a', { class: 'btn ghost', href: 'https://www.figma.com/community/search?resource_type=files&query=roblox%20ui', target: '_blank', rel: 'noopener noreferrer' }, 'Figma community: Roblox UI')),
    h('p', { class: 'muted small' }, 'Pick a pack there, download it, and drop the .zip, .fig or screenshots here with "Use for: Buttons" or "Backgrounds". UI Resources forbids bulk downloading, so HQ never crawls it; check each creator\'s licence. In Figma: File, Save local copy (.fig), then drop it here.'),
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
    h('p', { class: 'muted small' }, "Type a game's name. HQ pulls its public UI art (icon, store screenshots, game-pass and badge icons), cuts the screenshots into buttons and icons, and an agent studies it. Study only: never ship another game's art."),
    h('div', { class: 'row gap wrap' },
      h('input', { class: 'input', type: 'search', placeholder: 'e.g. Grow a Garden', value: find.q, 'aria-label': 'Roblox game name', oninput: (e) => { find.q = e.target.value; }, onkeydown: (e) => { if (e.key === 'Enter') searchGames(); } }),
      btn(find.busy ? 'Searching…' : 'Search Roblox', searchGames, { kind: 'primary', disabled: find.busy })),
    find.results ? (find.results.length ? h('div', { class: 'stack' }, find.results.map((g) => h('div', { class: 'row gap wrap' },
      h('strong', {}, g.name), h('span', { class: 'muted small' }, `${g.players.toLocaleString()} playing · place ${g.placeId}`),
      btn('Import its UI', async () => { const k = await act(() => api('POST', '/api/uilab/game', { universeId: g.universeId, placeId: g.placeId, name: g.name, ask: form.ask }), `${g.name} added; an agent is studying it`); if (k?.id) location.hash = '#/uilab/' + k.id; })))) : empty('No games found.')) : null);
}

// ---- mocks: drawn from the checked layout. Every value was validated by the server (hex colours, clamped numbers). ----
const px = (v) => `calc(${v} / 1080 * 100cqh)`;
function mockNode(n) {
  const fill = n.gradient.length > 1 ? `linear-gradient(${n.angle}deg, ${n.gradient.join(', ')})` : n.fill ?? 'transparent';
  const style = [`left:${n.x * 100}%`, `top:${n.y * 100}%`, `width:${n.w * 100}%`, `height:${n.h * 100}%`, `background:${fill}`, `opacity:${n.opacity}`,
    `border-radius:${px(n.corner)}`, n.stroke && n.strokeWidth ? `border:${px(n.strokeWidth)} solid ${n.stroke}` : '', `font-size:${n.size * 100}cqh`, `font-weight:${n.bold ? 800 : 500}`,
    n.textColor ? `color:${n.textColor}` : '', n.textStroke ? `-webkit-text-stroke:0.12em ${n.textStroke}` : '', `z-index:${n.z}`].filter(Boolean).join(';');
  return h('div', { class: `uil-node ${n.type}`, style, title: n.name || null }, n.image ? h('img', { src: mediaUrl(n.image), alt: '' }) : null, n.text ? h('span', {}, n.text) : null);
}
export function mockView(spec) {
  const bg = spec.bg.gradient.length > 1 ? `linear-gradient(180deg, ${spec.bg.gradient.join(', ')})` : spec.bg.fill;
  return h('div', { class: 'uil-mock', style: `background:${bg}`, role: 'img', 'aria-label': spec.title || 'UI mock' }, [...spec.nodes].sort((a, b) => a.z - b.z).map(mockNode));
}

function mockMaker() {
  return h('section', { class: 'card stack' },
    h('h2', {}, 'Make UI'),
    h('p', { class: 'muted small' }, "A designer agent builds an original screen from the game's kits (no image tool, no Antigravity), HQ draws it here, and you hear about it on Discord."),
    h('div', { class: 'row gap wrap' },
      selectEl(gameOptions('Any game'), maker.game || (shelf !== 'all' && shelf !== 'bin' && shelf !== 'unsorted' ? shelf : ''), (v) => { maker.game = v; }),
      selectEl(SCREENS.map(([value, label]) => ({ value, label })), maker.screen, (v) => { maker.screen = v; }),
      h('input', { class: 'input', placeholder: 'What it needs (optional), e.g. 3 egg tiers and a buy x3 button', value: maker.ask, oninput: (e) => { maker.ask = e.target.value; } }),
      btn('Make it', async () => {
        const g = maker.game || (shelf !== 'all' && shelf !== 'bin' && shelf !== 'unsorted' ? shelf : '');
        if (await act(() => api('POST', '/api/uimocks', { game: g || undefined, screen: maker.screen, ask: maker.ask }), 'A designer is making it')) { maker.ask = ''; await load(); }
      }, { kind: 'primary' })),
    mocks.length ? h('div', { class: 'uil-grid' }, mocks.map((m) => h('a', { class: 'card uil-card', href: '#/uilab/mock/' + m.id },
      h('div', { class: 'uil-name' }, m.title || `${m.screen} mock`),
      h('div', { class: 'small' }, `${m.game ? gameName(m.game) : 'Any game'} · ${m.screen}`),
      h('div', { class: 'muted small' }, m.state === 'done' ? `${m.nodes} parts · ${ago(m.doneAt ?? m.createdAt)}` : m.state === 'failed' ? 'Failed: make it again' : 'A designer is making it…')))) : null);
}

function mockDetail() {
  if (!mock) return empty('Loading the mock…');
  const m = mock;
  return [
    pageHead(m.spec?.title || `${m.screen} mock`, `${m.game ? gameName(m.game) : 'Any game'} · ${m.screen}${m.ask ? ` · asked: ${m.ask}` : ''}`,
      btn('Back to UI Lab', () => { location.hash = '#/uilab'; }),
      m.archivedAt ? btn('Restore', () => act(() => api('POST', `/api/uimocks/${m.id}/archive`, { archived: false }), 'Restored').then(() => loadMock(m.id))) : btn('Move to bin', () => act(() => api('POST', `/api/uimocks/${m.id}/archive`, { archived: true }), 'In the bin').then(() => loadMock(m.id)), { kind: 'ghost' }),
      m.archivedAt ? btn('Delete forever', () => { if (confirm('Delete this mock for good? This cannot be undone.')) act(() => api('POST', `/api/uimocks/${m.id}/delete`, {}), 'Deleted').then(() => { location.hash = '#/uilab'; }); }, { kind: 'ghost' }) : null),
    m.spec ? h('section', { class: 'card stack' }, mockView(m.spec), m.spec.notes ? h('p', { class: 'small' }, m.spec.notes) : null)
      : h('section', { class: 'card' }, h('p', { class: 'muted' }, m.state === 'failed' ? 'The task failed. Make it again from the UI Lab.' : `A designer is making it (task ${m.taskId ?? ''}, ${ago(m.createdAt)}).`)),
  ];
}

const cardFor = (k) => h('a', { class: 'card uil-card', href: '#/uilab/' + k.id, style: stripe(k.palette) },
  h('div', { class: 'uil-name' }, k.name),
  h('div', { class: 'uil-preview' }, k.preview.length ? k.preview.map((p) => h('img', { src: mediaUrl(p), alt: '', loading: 'lazy', class: k.kind === 'screenshot' ? 'wide' : null })) : h('span', { class: 'muted small' }, 'no previews')),
  h('div', { class: 'small' }, [k.game ? gameName(k.game) : null, ...(k.tags ?? []).slice(0, 3)].filter(Boolean).join(', ') || k.kind),
  h('div', { class: 'muted small' }, [k.counts?.objects ? `${(k.counts.objects / 1000).toFixed(1)}k objects` : null, k.counts?.icons ? `${k.counts.icons} icons` : null, k.counts?.screens ? `${k.counts.screens} screenshot` : null, k.counts?.scripts != null ? `${k.counts.scripts} scripts` : null].filter(Boolean).join(' · ')),
  h('div', { class: 'muted small' }, k.notes === 'done' ? 'Studied' : k.notes === 'studying' ? 'An agent is studying it…' : k.notes === 'failed' ? 'Study failed: try Study again' : 'Not studied'),
  swatches(k.palette));

function shelves() {
  const tabs = [['all', 'All'], ...games().map((g) => [g.slug, g.name]), ['unsorted', 'No game'], ['bin', 'Bin']];
  return h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Kits by game' }, tabs.map(([id, label]) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === shelf), onclick: () => { shelf = id; load(); } }, label)));
}

function library() {
  const s = lib.stats ?? {};
  return [
    pageHead('UI Lab', `${s.kits ?? 0} kits · ${s.icons ?? 0} icons · ${s.screens ?? 0} screenshots`, btn('Refresh', load)),
    dropZone(), composer(), finder(),
    shelves(),
    shelf === 'bin' ? h('p', { class: 'muted small' }, 'The bin: restore a kit or mock from its page, or delete it for good there.') : mockMaker(),
    h('div', { class: 'row gap' }, h('h2', {}, shelf === 'bin' ? 'Kits in the bin' : 'Kits'),
      h('input', { class: 'input', type: 'search', placeholder: 'Search kits, shops, icons…', value: q, 'aria-label': 'Search the UI Lab', onchange: (e) => { q = e.target.value; load(); } })),
    lib.kits.length ? h('div', { class: 'uil-grid' }, lib.kits.map(cardFor)) : empty(shelf === 'bin' ? 'The bin is empty.' : 'No kits here yet. Drop a file above, or give a kit this game on its page.'),
    shelf === 'bin' && mocks.length ? h('div', { class: 'uil-grid' }, mocks.map((m) => h('a', { class: 'card uil-card', href: '#/uilab/mock/' + m.id }, h('div', { class: 'uil-name' }, m.title || `${m.screen} mock`), h('div', { class: 'small' }, m.game ? gameName(m.game) : 'Any game')))) : null,
  ];
}

const section = (title, items, fn) => (items?.length ? h('section', { class: 'card stack' }, h('h3', {}, `${title} (${items.length})`), fn(items)) : null);

function iconsSection(k) {
  const all = (k.icons ?? []).filter((i) => i.file);
  if (!all.length) return null;
  const groups = [['all', 'All', () => true], ['element', 'Buttons and panels', (i) => i.class === 'element'], ['icon', 'Icons inside them', (i) => i.class === 'icon' && i.from], ['file', 'From the file', (i) => !i.from]]
    .filter(([id, , f]) => id === 'all' || all.some(f));
  const test = (groups.find(([id]) => id === pager.filter) ?? groups[0])[2];
  const words = pager.q.toLowerCase();
  const list = all.filter(test).filter((i) => !words || String(i.name ?? '').toLowerCase().includes(words));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  pager.page = Math.min(pager.page, pages - 1);
  const go = (p) => { pager.page = p; notify(); };
  const nav = () => (pages > 1 ? h('div', { class: 'row gap wrap', role: 'navigation', 'aria-label': 'Icon pages' },
    btn('Previous', () => go(pager.page - 1), { disabled: pager.page === 0 }),
    h('span', { class: 'small' }, `Page ${pager.page + 1} of ${pages} · ${list.length} icons`),
    btn('Next', () => go(pager.page + 1), { disabled: pager.page >= pages - 1 }),
    selectEl(Array.from({ length: pages }, (_, i) => ({ value: String(i), label: `Page ${i + 1}` })), String(pager.page), (v) => go(Number(v)))) : null);
  return h('section', { class: 'card stack' },
    h('h3', {}, `Icons (${all.length})`),
    h('div', { class: 'row gap wrap' },
      groups.length > 2 ? h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Icon groups' }, groups.map(([id, label]) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === pager.filter), onclick: () => { pager.filter = id; pager.page = 0; notify(); } }, label))) : null,
      h('input', { class: 'input', type: 'search', placeholder: 'Filter by name', value: pager.q, 'aria-label': 'Filter icons by name', onchange: (e) => { pager.q = e.target.value; pager.page = 0; notify(); } })),
    nav(),
    h('div', { class: 'uil-icons' }, list.slice(pager.page * PAGE, (pager.page + 1) * PAGE).map((i) => h('figure', { title: `${i.name ?? ''}${i.id ? ' · ' + i.id : ''}${i.box ? ` · at ${i.box.join(', ')}` : ''}` },
      h('a', { href: mediaUrl(i.file), target: '_blank', rel: 'noopener noreferrer' }, h('img', { src: mediaUrl(i.file), alt: i.name ?? '', loading: 'lazy' }))))),
    nav());
}

function detail() {
  if (!kit) return empty('Loading the kit…');
  const k = kit;
  const meta = (body, msg) => act(() => api('POST', `/api/uilab/${k.id}/meta`, body), msg).then(() => loadKit(k.id));
  return [
    pageHead(k.name, `${k.kind} · ${k.file}${k.archivedAt ? ' · in the bin' : ''}`, btn('Back to library', () => { location.hash = '#/uilab'; }),
      btn(k.notes?.state === 'studying' ? 'Study again' : 'Study', () => act(() => api('POST', `/api/uilab/${k.id}/study`, { ask: form.ask }), 'An agent is studying it').then(() => loadKit(k.id))),
      btn('Study with ChatGPT', () => act(() => api('POST', `/api/uilab/${k.id}/study`, { ask: form.ask, engine: 'codex' }), 'Codex is studying it').then(() => loadKit(k.id)), { kind: 'ghost', title: 'Runs on your ChatGPT account through the Codex CLI' }),
      k.archivedAt ? btn('Restore', () => meta({ archived: false }, 'Restored')) : btn('Move to bin', () => meta({ archived: true }, 'In the bin'), { kind: 'ghost' }),
      k.archivedAt ? btn('Delete forever', () => { if (confirm(`Delete "${k.name}", its images and its study note for good? This cannot be undone.`)) act(() => api('POST', `/api/uilab/${k.id}/delete`, {}), 'Deleted').then(() => { location.hash = '#/uilab'; }); }, { kind: 'ghost' }) : null),
    h('section', { class: 'card' }, h('div', { class: 'row gap wrap' }, h('span', { class: 'small' }, 'Game:'), selectEl(gameOptions('No game'), k.game ?? '', (v) => meta({ game: v }, 'Moved')),
      k.screens?.length ? btn('Cut icons from the screenshots again', () => act(() => api('POST', `/api/uilab/${k.id}/scan`, {}), 'Cut').then(() => loadKit(k.id)), { kind: 'ghost' }) : null,
      k.cutError ? h('span', { class: 'small', role: 'status' }, `Could not cut icons: ${k.cutError}`) : null)),
    k.kind === 'game' ? h('section', { class: 'card stack' }, h('h3', {}, 'Join and capture'),
      h('p', { class: 'muted small' }, 'Opens the game in your Roblox app (signed in as you), saves 3 screenshots of the in-game UI after it loads, closes Roblox, cuts them into icons and studies them. Takes about a minute.'),
      btn('Join and capture', () => act(() => api('POST', `/api/uilab/${k.id}/capture`, {}), 'Captured; an agent is studying the screenshots').then(() => loadKit(k.id)))) : null,
    k.source ? h('p', { class: 'small' }, 'Source: ', h('a', { href: k.source, target: '_blank', rel: 'noopener noreferrer' }, k.source), k.licence ? ` · Licence: ${k.licence}` : '') : null,
    h('section', { class: 'card stack' }, h('h3', {}, 'Palette'), swatches(k.palette), h('div', { class: 'muted small' }, (k.palette ?? []).slice(0, 12).map((c) => c.hex).join('  '))),
    section('Gradients', k.gradients, (g) => h('div', { class: 'stack' }, g.slice(0, 24).map((x) => h('div', { class: 'uil-grad', style: `background:linear-gradient(90deg, ${x.stops.join(', ')})` }, h('span', {}, x.stops.join(' → ')))))),
    iconsSection(k),
    section('Screenshots', k.screens, (list) => h('div', { class: 'uil-icons' }, list.map((p) => h('img', { src: mediaUrl(p), alt: 'screenshot', class: 'uil-shot', loading: 'lazy' })))),
    section('Fonts', k.fonts, (f) => h('p', {}, f.map((x) => `${x.key} (${x.n})`).join(' · '))),
    section('Strokes and corners', [...(k.strokes ?? []), ...(k.corners ?? [])], () => h('p', {}, `Stroke thickness: ${(k.strokes ?? []).map((x) => `${x.key} px ×${x.n}`).join(', ') || 'none'} · Corners: ${(k.corners ?? []).map((x) => `${x.key} ×${x.n}`).join(', ') || 'none'}`)),
    k.related?.length ? h('section', { class: 'card stack' }, h('h3', {}, 'Related kits'), h('div', { class: 'row gap wrap' }, k.related.map((r) => h('a', { class: 'btn ghost', href: '#/uilab/' + r.id }, `${r.name} · ${r.colours} colours, ${r.tags} tags`)))) : null,
    h('section', { class: 'card stack' }, h('h3', {}, 'Study note'),
      k.note ? h('pre', { class: 'uil-note' }, k.note) : h('p', { class: 'muted' }, k.notes?.state === 'studying' ? `An agent is studying it (task ${k.notes.taskId ?? ''}, ${ago(k.notes.at)}).` : 'No note yet.')),
  ];
}

export function render(param) {
  const mockId = param?.startsWith('mock/') ? param.slice(5) : null;
  if (mockId && kitId !== param) loadMock(mockId);
  else if (param && !mockId && param !== kitId) loadKit(param);
  if (!param) { kitId = null; if (lib === null) load(); }
  return h('div', { class: 'page uil' }, mockId ? mockDetail() : param ? detail() : lib ? library() : empty('Loading the UI Lab…'));
}

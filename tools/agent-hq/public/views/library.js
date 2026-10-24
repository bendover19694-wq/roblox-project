import { h, store, api, empty, pageHead, assetUrl, mediaUrl, notify, toast } from './core.js';
import { chip, segmented } from './games.js';

let tab = 'assets';
let chapter = null;
let loadedVault = false;
let loadedLib = false;

// ---- minimal markdown: headings, bullets, numbered, tables, fences, bold, inline code ----
const SAFE_URL = /^(https?:\/\/|\/|#)/i;
function inline(text) {
  const out = [];
  const re = /(!\[[^\]]*\]\([^)\s]+\)|\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith('![')) {
      const [, alt, src] = s.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      const url = /^https?:/i.test(src) ? '' : src.startsWith('/') ? src : mediaUrl(src);
      out.push(url ? h('img', { class: 'md-img', src: url, alt, loading: 'lazy' }) : alt);
    } else if (s.startsWith('[')) {
      const [, label, href] = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      out.push(SAFE_URL.test(href) ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, label) : label);
    } else out.push(s.startsWith('**') ? h('strong', {}, s.slice(2, -2)) : h('code', {}, s.slice(1, -1)));
    last = m.index + s.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function markdown(src) {
  const root = h('div', { class: 'md' });
  const lines = String(src || '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      root.append(h('pre', { class: 'code' }, buf.join('\n')));
    } else if (/^#{1,6}\s/.test(l)) {
      const n = Math.min(6, l.match(/^#+/)[0].length + 1);
      root.append(h('h' + n, {}, inline(l.replace(/^#+\s*/, ''))));
      i++;
    } else if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const ul = h(ordered ? 'ol' : 'ul', {});
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        ul.append(h('li', {}, inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''))));
        i++;
      }
      root.append(ul);
    } else if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\|\s*:?-+/.test(r));
      const [hd, ...rest] = body;
      root.append(h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, cells(hd).map((c) => h('th', { scope: 'col' }, inline(c))))),
        h('tbody', {}, rest.map((r) => h('tr', {}, cells(r).map((c) => h('td', {}, inline(c)))))))));
    } else if (l.trim() === '') {
      i++;
    } else {
      const buf = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^(```|#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i])) buf.push(lines[i++]);
      root.append(h('p', {}, inline(buf.join(' '))));
    }
  }
  return root;
}

async function loadVault() {
  if (loadedVault) return;
  loadedVault = true;
  try { store.vault = await api('GET', '/api/vault'); } catch (e) { toast(e.message, 'error'); store.vault = { chapters: [] }; }
  notify();
}
async function loadLib() {
  if (loadedLib) return;
  loadedLib = true;
  try { store.library = await api('GET', '/api/library'); } catch (e) { toast(e.message, 'error'); store.library = { skills: [], assets: [] }; }
  notify();
}

function vaultTab() {
  if (!store.vault) { loadVault(); return empty('Loading'); }
  const cs = store.vault.chapters || [];
  if (!cs.length) return empty('No vault chapters found');
  if (chapter == null || !cs.some((c) => c.n === chapter)) chapter = cs[0].n;
  const cur = cs.find((c) => c.n === chapter);
  return h('div', { class: 'split' },
    h('nav', { class: 'chapters', 'aria-label': 'Chapters' }, cs.map((c) => h('button', { type: 'button', class: 'chapter', 'aria-current': String(c.n === chapter),
      onclick: () => { chapter = c.n; notify(); } }, h('span', { class: 'muted num' }, c.n), c.title))),
    h('article', { class: 'card reader' }, h('h2', {}, `${cur.n}. ${cur.title}`), markdown(cur.text)));
}

function skillsTab() {
  if (!store.library) { loadLib(); return empty('Loading'); }
  const s = store.library.skills || [];
  return s.length ? h('div', { class: 'stack' }, s.map((k) => h('div', { class: 'card' },
    h('h3', {}, k.name), h('p', { class: 'muted' }, k.description), h('code', { class: 'mono muted' }, k.path)))) : empty('No skills found');
}

const KINDS = [['all', 'All'], ['model', 'Models'], ['icon', 'Icons'], ['sound', 'Sounds'], ['image', 'Images'], ['thumbnail', 'Thumbnails']];
const q = { search: '', kind: 'all', scope: 'all' };
let assetData = null; // {assets, counts, onRoblox}
let assetErr = '';
let systemsMd = null;
let searchTimer = 0;
let assetSeq = 0;

async function loadAssets(into) {
  const seq = ++assetSeq;
  const qs = new URLSearchParams();
  if (q.search) qs.set('search', q.search);
  if (q.kind !== 'all') qs.set('kind', q.kind);
  if (q.scope !== 'all') qs.set('scope', q.scope);
  try { assetData = await api('GET', '/api/assets?' + qs); assetErr = ''; } catch (e) { assetErr = e.message; assetData = assetData || { assets: [], counts: {}, onRoblox: 0 }; }
  if (seq !== assetSeq) return;
  if (into && into.isConnected) into.replaceChildren(assetGrid()); else notify();
}

function assetGrid() {
  const a = assetData?.assets || [];
  if (assetErr) return empty(assetErr);
  if (!a.length) return empty(q.search || q.kind !== 'all' || q.scope !== 'all' ? 'No assets match those filters.' : 'No assets yet. The Librarian adds them.');
  return h('div', { class: 'pg-assets' }, a.map((x) => {
    const file = x.file || '';
    const img = /\.(png|jpe?g|gif|webp|svg)$/i.test(file);
    return h('article', { class: 'pg-asset' },
      h('div', { class: 'pv' }, img ? h('img', { src: assetUrl(file), alt: x.name, loading: 'lazy' }) : (x.kind || file.split('.').pop() || 'file')),
      h('div', { class: 'info' },
        h('span', { class: 'nm', title: x.name }, x.name),
        h('div', { class: 'row gap wrap' }, chip(x.kind || 'file'), chip(String(x.scope || 'studio').replace('game:', 'game: ')), x.robloxId ? chip('On Roblox', 'ok') : chip('Not on Roblox')),
        x.robloxId ? h('span', { class: 'muted mono' }, 'id ' + x.robloxId) : null,
        (x.tags || []).length ? h('div', { class: 'pg-tags' }, x.tags.map((t) => h('span', { class: 'pg-chip' }, t))) : null,
        file ? h('span', { class: 'muted mono clip', title: file }, file) : null));
  }));
}

function assetsTab() {
  if (!assetData) { loadAssets(); return empty('Loading'); }
  const counts = assetData.counts || {};
  const scopes = ['all', 'studio', ...(store.games || []).map((g) => 'game:' + g.slug)];
  const results = h('div', {});
  results.append(assetGrid());
  const search = h('input', { class: 'pg-input', type: 'search', placeholder: 'Search by name or tag', value: q.search, 'aria-label': 'Search assets', maxlength: 80,
    oninput: (e) => { q.search = e.target.value.trim(); clearTimeout(searchTimer); searchTimer = setTimeout(() => loadAssets(results), 200); } });
  const scope = h('select', { class: 'select', 'aria-label': 'Scope', onchange: (e) => { q.scope = e.target.value; loadAssets(results); } },
    scopes.map((s) => h('option', { value: s }, s === 'all' ? 'All scopes' : s === 'studio' ? 'Whole studio' : 'Game: ' + s.slice(5))));
  scope.value = q.scope;
  return h('div', { class: 'stack' },
    h('div', { class: 'pg-filters' }, search,
      segmented(KINDS, q.kind, (id) => { q.kind = id; loadAssets(); }, Object.fromEntries(KINDS.map(([id]) => [id, counts[id]]))), scope),
    results);
}

async function loadSystems() {
  if (systemsMd !== null) return;
  systemsMd = '';
  try { systemsMd = (await api('GET', '/api/systems')).markdown || ''; } catch (e) { toast(e.message, 'error'); systemsMd = ''; }
  notify();
}
function systemsTab() {
  if (systemsMd === null) { loadSystems(); return empty('Loading'); }
  return systemsMd ? h('article', { class: 'card reader' }, markdown(systemsMd)) : empty('No systems catalogue found.');
}

export function render() {
  const tabs = [['assets', 'Assets'], ['systems', 'Systems'], ['vault', 'Vault'], ['skills', 'Skills']];
  const total = assetData?.counts?.all;
  const sub = total != null ? `${total} assets · ${assetData.onRoblox ?? 0} on Roblox. Plus the knowledge the agents read, the skills they use, and reusable game systems.` : 'Assets, reusable game systems, the knowledge the agents read, and the skills they use.';
  return h('div', { class: 'page' },
    pageHead('Library', sub),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, l]) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === tab),
      onclick: () => { tab = id; notify(); } }, l))),
    tab === 'assets' ? assetsTab() : tab === 'systems' ? systemsTab() : tab === 'vault' ? vaultTab() : skillsTab());
}

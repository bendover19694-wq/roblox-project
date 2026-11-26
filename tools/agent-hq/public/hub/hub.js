/* Agent HQ hub: the main dashboard. Live data from the HQ API (/api/*); pages it does not have yet open in the
   old dashboard at /legacy (Legacy section in the sidebar). No dependencies. */
(() => {
'use strict';
// ---------------------------------------------------------------- icons
const P = {
  home:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  lead:'<path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
  team:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 2 4 5"/>',
  tasks:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  review:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  library:'<path d="M4 4h5v16H4zM10 4h4v16h-4z"/><path d="M15.5 5l4 .9-3 14.4-4-.9z"/>',
  vault:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  create:'<path d="M5 19 19 5"/><path d="M15 5h4v4"/><path d="M6 4v3M4.5 5.5h3M18 16v3M16.5 17.5h3"/>',
  games:'<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 12.5h4M9 10.5v4"/><circle cx="16" cy="11.5" r="1"/><circle cx="18" cy="13.5" r="1"/>',
  pitches:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  market:'<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/>',
  packs:'<path d="M12 3 21 7.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chev:'<path d="m6 9 6 6 6-6"/>',
  right:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  pause:'<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  play:'<path d="M7 5v14l11-7z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  code:'<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
  box:'<path d="M12 3 21 7.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  plan:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  min:'<path d="M5 12h14"/>',
  sq:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
  pen:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  wand:'<path d="m4 20 11-11"/><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3L21 13l-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  msg:'<path d="M4 5h16v11H9l-5 4z"/>',
  hammer:'<path d="M14 6 18 10"/><path d="m3 21 9-9"/><path d="M12 4l6 6 3-3-6-6z"/>',
  map:'<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  coin:'<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>',
  shop:'<path d="M4 9h16l-1 11H5z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',
  kid:'<circle cx="12" cy="7" r="3.5"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/>',
  bug:'<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M12 8V5M9 5l-1-2M15 5l1-2M3 13h4M17 13h4M4 19l3-2M20 19l-3-2"/>',
  shield:'<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  brush:'<path d="M14 4l6 6-8 8-6-6z"/><path d="M6 12c-2 0-3 1.5-3 4v4h4c2.5 0 4-1 4-3"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
  arch:'<path d="M3 21h18M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>',
};
const ic = (n, cls = '') => `<span class="i ${cls}">${P[n] ? `<svg viewBox="0 0 24 24">${P[n]}</svg>` : ''}</span>`;
const hydrate = (root = document) => root.querySelectorAll('.i[data-i]').forEach(el => { el.innerHTML = `<svg viewBox="0 0 24 24">${P[el.dataset.i] || ''}</svg>`; el.removeAttribute('data-i'); });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
Object.assign(P, {
  legacy:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10h14V9M10 13h4"/>',
  book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
  gem:'<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 18 3-18"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-2 0-.6-.2-1-.6-1.4-.4-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-4-4-7.2-9-7.2z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
});
const fmt = n => Number(n || 0).toLocaleString('en-US');

// ---------------------------------------------------------------- connection to Agent HQ
const BASE = location.pathname.startsWith('/hq') ? '/hq' : '';
const LEGACY = BASE + '/legacy';
const readToken = () => {
  const m = location.hash.match(/(?:^#|&)owner=([0-9a-f]{64})/);
  if (m) {
    try { localStorage.setItem('hq-owner', m[1]); } catch { /* private mode */ }
    history.replaceState(null, '', location.pathname + location.search + '#/home');
    return m[1];
  }
  try { return localStorage.getItem('hq-owner') || ''; } catch { return ''; }
};
const TOKEN = BASE ? 'via-site' : readToken();
async function api(method, p, body) {
  const r = await fetch(BASE + p, { method, headers: { 'x-hq-token': TOKEN, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch { /* empty */ }
  if (!r.ok) throw new Error((j && (j.error || j.message)) || `Request failed (${r.status})`);
  return j;
}
const act = async (fn, ok) => { try { const r = await fn(); if (ok) toast(ok); return r ?? true; } catch (e) { toast(e.message); return null; } };
const mediaUrl = p => p ? BASE + '/media/' + String(p).replace(/\\/g, '/').replace(/^\.agent-hq\/media\//, '').replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/') : '';
const isImg = p => /\.(png|jpe?g|webp|gif|svg)$/i.test(p || '');
const ago = iso => { if (!iso) return ''; const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };

const S = { tasks: [], asks: [], games: [], roles: [], settings: {}, lanes: {}, running: [], pitches: [], loaded: false, err: '' };
const X = {}; // page data loaded on demand: messages, assets, catalog, vault, market...
let lastRefresh = 0;
async function load() {
  try { Object.assign(S, await api('GET', '/api/state')); S.loaded = true; S.err = ''; lastRefresh = Date.now(); $('#updated').textContent = 'just now'; }
  catch (e) { S.err = /401|403|token/i.test(e.message) ? 'signin' : e.message; }
  rerender();
}
let loadT;
const loadSoon = () => { clearTimeout(loadT); loadT = setTimeout(load, 400); };
function listen() {
  if (!TOKEN) return;
  const es = new EventSource(BASE + '/api/events?token=' + encodeURIComponent(TOKEN));
  for (const t of ['task', 'ask', 'pitch', 'settings', 'game', 'stage']) es.addEventListener(t, loadSoon);
  es.addEventListener('log', () => { if (curPage() === 'lead') loadPage('lead', true); });
  es.onmessage = () => { if (curPage() === 'lead') loadPage('lead', true); };
}

// ---------------------------------------------------------------- roles (look comes from the hub; names and jobs from HQ)
const ROLE_LOOK = {
  lead:['lead','#ffd27a'], scout:['market','#7fd3ff'], architect:['arch','#b9a4ff'], builder:['hammer','#5fe3ff'], ui:['grid','#ff8fc8'],
  designer:['brush','#ff6fb1'], world:['map','#7ee08f'], librarian:['library','#a5f3ff'], economy:['coin','#fff07a'], merchant:['shop','#ffb36b'],
  thumbnails:['image','#ff7a8a'], 'kid-tester':['kid','#9bf0c2'], playtester:['bug','#4ee6c5'], reviewer:['shield','#c7b8ff'], producer:['flag','#ffd9a0'], liveops:['pulse','#8ab4ff'],
};
const role = id => { const r = S.roles.find(x => x.id === id) || { id, label: id || 'Agent', job: '' }; const [icon, c] = ROLE_LOOK[id] || ['team', '#c7b8ff']; return { ...r, icon, c }; };
const roleIc = (id, sm) => { const r = role(id); return `<span class="role-ic ${sm ? 'sm' : ''}" style="--c:${r.c}">${ic(r.icon)}</span>`; };

// ---------------------------------------------------------------- nav
const OPEN = t => !['done', 'failed', 'canceled'].includes(t.state);
const askGame = a => a.game || S.tasks.find(t => t.id === a.taskId)?.game || '';
const inGame = slug => state.game === 'all' || !slug || slug === state.game; // work with no game shows in every game
const needsYou = () => S.asks.filter(a => a.state === 'open' && !a.superseded && a.kind !== 'reference' && inGame(askGame(a)));
const gTasks = () => S.tasks.filter(t => inGame(t.game));
const NAV_WORK = [
  { id:'home', label:'Home', icon:'home' },
  { id:'lead', label:'Lead', icon:'lead' },
  { id:'chat', label:'Chat', icon:'msg' },
  { id:'team', label:'Team', icon:'team', badge:() => gTasks().filter(t => t.state === 'working').length, g:1 },
  { id:'tasks', label:'Tasks', icon:'tasks', badge:() => gTasks().filter(OPEN).length, g:1 },
  { id:'review', label:'Review', icon:'review', badge:() => needsYou().length },
  { id:'library', label:'Library', icon:'library' },
  { id:'vault', label:'Vault', icon:'vault' },
];
const NAV_STUDIO = [
  { id:'create', label:'Create', icon:'create' },
  { id:'games', label:'Games', icon:'games' },
  { id:'pitches', label:'Pitches', icon:'pitches', badge:() => S.pitches.filter(p => p.state === 'proposed').length },
  { id:'market', label:'Market', icon:'market' },
  { id:'packs', label:'Asset Packs', icon:'packs', gold:1 },
  { id:'settings', label:'Settings', icon:'settings' },
];
// Pages of the old dashboard that the new hub does not have yet: they open there, unchanged.
const NAV_LEGACY = [
  { id:'notebook', label:'Notebook', icon:'book' },
  { id:'uilab', label:'UI Lab', icon:'palette' },
  { id:'pro', label:'Pro', icon:'gem' },
  { id:'link', label:'HQ Link', icon:'link' },
  { id:'help', label:'Help', icon:'help' },
  { id:'', label:'Old dashboard', icon:'legacy' },
];
const ALL_NAV = [...NAV_WORK, ...NAV_STUDIO];
const legacyHref = id => `${LEGACY}${id ? '#/' + id : ''}`;
function renderNav(cur) {
  const item = n => {
    const b = n.badge ? n.badge() : 0;
    return `<a href="#/${n.id}" class="${cur === n.id ? 'on' : ''} ${n.gold ? 'gold' : ''}">${ic(n.icon)}<span class="lbl">${n.label}</span>${b ? `<span class="badge ${n.g ? 'g' : ''}">${b}</span>` : ''}</a>`;
  };
  $('#nav-work').innerHTML = NAV_WORK.map(item).join('');
  $('#nav-studio').innerHTML = NAV_STUDIO.map(item).join('');
  $('#nav-legacy').innerHTML = NAV_LEGACY.map(n => `<a href="${legacyHref(n.id)}" class="legacy">${ic(n.icon)}<span class="lbl">${n.label}</span></a>`).join('');
  const run = S.tasks.filter(t => t.state === 'working').length;
  $('#sideStatus').innerHTML = `<span class="usage-l">${S.settings.paused ? 'Paused' : run ? `${run} working` : 'Idle'}</span><span class="usage-bar"><i style="width:${Math.min(100, run / Math.max(1, S.settings.budget || 2) * 100)}%"></i></span><span class="usage-n">${run}/${S.settings.budget || 2}</span>${ic('chev')}`;
}

// ---------------------------------------------------------------- helpers
const state = { chatChannel: '', chatFull: {}, chatSync: false, game: (() => { try { return localStorage.getItem('hq-hub-game') || 'all'; } catch { return 'all'; } })(), libQ: '', libKind: 'all', vaultQ: '', createTab: 'assets', createGame: '', reviewSel: 0, openTask: null, chatRole: 'lead' };
const gameOk = slug => state.game === 'all' || state.game === slug;
function setGame(slug) { state.game = slug; state.reviewSel = 0; try { localStorage.setItem('hq-hub-game', slug); } catch { /* private mode */ } rerender(); }
// a game's icon is the thumbnail its owner picked; until then the drawn scene stands in
const gameIcon = g => g?.icon ? `<img src="${mediaUrl(g.icon)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : scene(sceneOf(g?.slug));
const gameBySlug = s => S.games.find(g => g.slug === s);
const gameName = s => (gameBySlug(s) || {}).name || (s ? s : 'No game');
const SCENES = ['vault', 'street', 'truck', 'hideout'];
const sceneOf = slug => SCENES[[...String(slug || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % SCENES.length];
const scene = s => `<div class="scene ${s}"></div>`;
const STAGES = ['pitched', 'designed', 'assets', 'built', 'balanced', 'art', 'ready', 'live', 'graded'];
const cap = s => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
const STATE_LBL = { working:'Working now', review:'In review', queued:'Queued', done:'Done', failed:'Failed', canceled:'Canceled', waiting:'Waiting' };
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
const loading = () => '<div class="card empty"><span class="spinner"></span><p>Loading…</p></div>';
const seg = (key, opts, cur) => `<div class="seg" data-set="${key}">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;

// page data that is not in /api/state
async function loadPage(id, quiet) {
  try {
    if (id === 'lead') X.msgs = await api('GET', `/api/messages?role=${encodeURIComponent(state.chatRole)}`);
    if (id === 'library') { X.assets = await api('GET', '/api/assets'); X.catalog = await api('GET', `/api/catalog?q=${encodeURIComponent(state.libQ)}&limit=40`); }
    if (id === 'vault') { X.vault = X.vault || await api('GET', '/api/vault'); X.vaultHits = state.vaultQ ? await api('GET', `/api/knowledge/search?q=${encodeURIComponent(state.vaultQ)}`) : null; }
    if (id === 'chat') X.chat = await api('GET', `/api/discord/chat${state.chatChannel ? '?channel=' + state.chatChannel : ''}`);
    if (id === 'market') X.market = await api('GET', '/api/market');
    if (id === 'packs') X.packs = await api('GET', '/api/catalog?type=pack&limit=100').then(async p => ({ packs: p.results, kits: (await api('GET', '/api/catalog?type=ui-kit&limit=100')).results, total: p.total, sources: p.sources }));
    if (id === 'create' || id === 'home') X.library = await api('GET', '/api/library');
    if (id === 'chat') X.chatErr = '';
  } catch (e) { if (id === 'chat') X.chatErr = e.message; if (!quiet) toast(e.message); }
  if (curPage() === id) rerender();
}
const curPage = () => { const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1] || 'home'; return pages[id] ? id : 'home'; };

// ---------------------------------------------------------------- pages
const pages = {};

pages.home = () => {
  const working = S.tasks.filter(t => t.state === 'working' && gameOk(t.game));
  const ask = needsYou();
  const media = ask.filter(a => a.mediaPath).length;
  const recent = S.tasks.filter(t => gameOk(t.game)).sort((a, b) => Date.parse(b.endedAt || b.startedAt || b.createdAt) - Date.parse(a.endedAt || a.startedAt || a.createdAt)).slice(0, 8);
  const groups = [
    ['Working now', 'code', recent.filter(t => t.state === 'working')],
    ['Waiting for you', 'review', recent.filter(t => t.state === 'review')],
    ['Finished lately', 'checkc', recent.filter(t => ['done', 'failed', 'canceled'].includes(t.state))],
    ['Up next', 'tasks', recent.filter(t => t.state === 'queued')],
  ].filter(g => g[2].length);
  const imgs = ((X.library || {}).assets || []).filter(isImg).slice(-3).reverse();
  const vl = working[vaultIdx % Math.max(1, working.length)];
  return `
  <div class="home">
    <section>
      <div class="ask-row">
        <label class="ask"><span class="ask-ic"></span><input id="askIn" placeholder="Ask the Lead anything, or say what to build next…"><button class="btn-glow" id="askGo">Ask ${ic('right','sm')}</button></label>
        <button class="btn btn-ghost" data-act="newtask">${ic('tasks')}New task</button>
        <button class="btn btn-ghost" data-act="pause">${ic(S.settings.paused ? 'play' : 'pause')}${S.settings.paused ? 'Resume all' : 'Pause all'}</button>
      </div>
      ${media ? `<a class="new-things" href="#/review">${ic('copy')}<span>${media} new thing${media === 1 ? '' : 's'} to look at from the agents</span></a>` : ''}

      <div class="needs">
        <h2 class="needs-h">Needs you <span class="n">${ask.length}</span></h2>
        ${ask.length ? ask.slice(0, 4).map((a, i) => `<a class="card rv" href="#/review" data-rvgo="${i}" style="margin-top:8px;display:flex;gap:10px;align-items:center;padding:10px 12px;color:inherit;text-decoration:none">${roleIc(a.role, 1)}<div class="t"><b>${esc(a.title)}</b><span>${esc(role(a.role).label)} · ${ago(a.createdAt)} ago</span></div></a>`).join('') : `<div class="all-clear">${ic('checkc')}All clear</div>`}
      </div>

      <div class="h-sec"><i class="dot"></i>What’s happening</div>
      <div class="vault-card" data-go="vault">
        <canvas id="vaultCv"></canvas>
        <div class="vt">Vault</div>
        <button class="open">Open ${ic('right','sm')}</button>
        <div class="vc" id="vaultLine">${vl ? `<b>${esc(role(vl.role).label)}</b> is working on ${esc(vl.title)}` : 'Agents read the vault before they build'}</div>
      </div>
      <div class="card feed">
        ${groups.length ? groups.map(([h, icon, rows]) => `
          <div class="feed-group">
            <div class="fg-h">${ic(icon)}${h} <span class="x">×${rows.length}</span></div>
            ${rows.map(t => `
              <div class="ev" data-task="${t.id}" style="cursor:pointer">
                ${roleIc(t.role, 1)}
                <div class="who"><b>${esc(role(t.role).label)}</b>·<span>${esc(gameName(t.game))}</span>·<span>${ago(t.endedAt || t.startedAt || t.createdAt)}</span></div>
                <div class="what">${ic(t.state === 'failed' ? 'x' : t.state === 'done' ? 'check' : 'tasks')}${esc(t.title)}</div>
              </div>`).join('')}
          </div>`).join('') + (imgs.length ? `<div class="feed-group"><div class="fg-h">${ic('image')}Latest images</div><div class="gens">${imgs.map(p => `<a class="gen" href="${mediaUrl('assets/' + p)}" target="_blank" rel="noopener"><div class="pv"><img src="${mediaUrl('assets/' + p)}" alt="" style="width:100%;height:100%;object-fit:contain"></div></a>`).join('')}</div></div>` : '')
        : '<div class="empty">Nothing has happened yet. Ask the Lead for something.</div>'}
      </div>
    </section>

    <aside class="side-col">
      <div class="card live-card">
        <div class="h"><i class="dot"></i>Live now</div>
        <div class="live-list">
          ${working.length ? working.map(t => `
            <div class="live-row" data-task="${t.id}">
              ${roleIc(t.role)}
              <div class="t"><b>${esc(role(t.role).label)}</b><span>On: ${esc(t.title)}</span></div>
              ${S.settings.paused ? ic('pause') : '<span class="spinner"></span>'}
            </div>`).join('') : `<div class="empty">Nobody is working${state.game === 'all' ? '' : ' on this game'} right now.</div>`}
        </div>
        <div class="plan-note">${ic('spark')}Agents run on your Claude plan</div>
      </div>

      <div class="card qs">
        <div class="h">${ic('sliders')}Quick settings</div>
        <div class="qs-row"><div class="qs-l">Studios for agents</div>${seg('studioLanes', [[0,'Off'],[1,'1'],[2,'2']], S.settings.studioLanes)}</div>
        <div class="qs-row"><div class="qs-l">Agents at once</div>${seg('budget', [[1,'1'],[2,'2'],[3,'3'],[4,'4']], S.settings.budget)}</div>
        <div class="qs-row"><div class="qs-l">Run mode</div>${seg('runMode', [['instant','Instant'],['hourly','Hourly']], S.settings.runMode)}</div>
        <a class="qs-more" href="#/settings">More in Settings ${ic('right','sm')}</a>
      </div>
    </aside>
  </div>`;
};

pages.tasks = () => {
  const groups = [['working','Working now'],['review','Waiting for review'],['queued','Queued'],['failed','Failed'],['done','Done']];
  const list = S.tasks.filter(t => gameOk(t.game));
  const bucket = t => t.state === 'canceled' ? 'done' : STATE_LBL[t.state] ? t.state : 'queued';
  return `
  <div class="page-h">
    <div><h1 class="h1">Tasks</h1><p class="sub">${list.filter(OPEN).length} open across ${state.game === 'all' ? 'all games' : esc(gameName(state.game))}.</p></div>
    <div class="acts"><button class="select" data-act="gamemenu">${ic('grid','sm')}${state.game === 'all' ? 'All games' : esc(gameName(state.game))}${ic('chev','sm')}</button><button class="btn btn-glow pill solid" data-act="newtask">${ic('plus')}New task</button></div>
  </div>
  ${list.length ? '' : '<div class="card empty"><p>No tasks yet.</p></div>'}
  ${groups.map(([k, label]) => {
    let rows = list.filter(t => bucket(t) === k);
    if (!rows.length) return '';
    if (k === 'done') rows = rows.sort((a, b) => Date.parse(b.endedAt || b.createdAt) - Date.parse(a.endedAt || a.createdAt)).slice(0, 30);
    return `<div class="task-group"><div class="tg-h">${label} <span class="badge ${k === 'working' ? 'g' : ''}">${rows.length}</span></div>
      ${rows.map(t => `
      <div class="task ${k === 'working' ? 'working' : ''} ${state.openTask === t.id ? 'open' : ''}" data-open="${t.id}">
        <div class="task-row">
          ${roleIc(t.role)}
          <div class="t"><b>${esc(t.title)}</b><span>${esc(role(t.role).label)} · ${esc(gameName(t.game))} · ${ago(t.endedAt || t.startedAt || t.createdAt)} ago${t.engine ? ' · ' + esc(t.engine) : ''}</span></div>
          ${k === 'working' ? '<span class="spinner"></span>' : ''}
          <span class="state ${k}">${STATE_LBL[t.state] || cap(t.state)}</span>
          ${ic('chev','chev')}
        </div>
        <div class="task-body">
          <p style="white-space:pre-wrap">${esc((t.error ? 'Error: ' + t.error + '\n\n' : '') + (t.summary || t.body || 'No details yet.')).slice(0, 1600)}</p>
          <div class="row" style="display:flex;gap:8px;margin-top:8px">
            ${['queued', 'working'].includes(t.state) ? `<button class="btn btn-ghost" data-cancel="${t.id}">${ic('x','sm')}Cancel</button>` : ''}
            ${t.state === 'failed' ? `<button class="btn btn-ghost" data-retry="${t.id}">${ic('refresh','sm')}Retry</button>` : ''}
            <a class="btn btn-ghost" href="${legacyHref('tasks')}">${ic('legacy','sm')}Full log</a>
          </div>
        </div>
      </div>`).join('')}</div>`;
  }).join('')}`;
};

pages.team = () => {
  const st = id => { const t = S.tasks.find(x => x.role === id && x.state === 'working') || S.tasks.find(x => x.role === id && OPEN(x)); return t ? (t.state === 'working' ? 'working' : t.state === 'review' ? 'review' : 'queued') : 'idle'; };
  const lbl = { working:'Working', review:'In review', queued:'Queued', idle:'Idle' };
  return `
  <div class="page-h"><div><h1 class="h1">Team</h1><p class="sub">${S.roles.length} role agents. Click one to message it; what you send becomes a task.</p></div></div>
  <div class="team-grid">${S.roles.map(r => { const s = st(r.id); return `
    <div class="card role" data-chat="${r.id}">
      <div class="top-l">${roleIc(r.id)}<div><div class="nm">${esc(r.label)}</div><div class="st ${s}"><i></i>${lbl[s]}</div></div></div>
      <div class="jb">${esc(r.job || '')}</div>
    </div>`; }).join('')}</div>`;
};

pages.lead = () => {
  const r = role(state.chatRole);
  const msgs = X.msgs;
  return `
  <div class="page-h"><div><h1 class="h1">${roleIc(r.id)} ${esc(r.label)}</h1><p class="sub">${esc(r.job || 'Plans the work and hands it to the right roles.')}</p></div>
  <div class="acts">${state.chatRole !== 'lead' ? `<button class="btn" data-chat="lead">${ic('lead')}Back to the Lead</button>` : ''}<a class="btn" href="${legacyHref('lead')}">${ic('legacy')}Lessons and history</a></div></div>
  <div class="chat">
    <div class="msgs" id="msgs">${!msgs ? loading() : msgs.length ? msgs.map(m => { const me = m.from === 'owner'; return `
      <div class="msg ${me ? 'me' : ''}">${me ? '' : roleIc(m.from === 'system' ? 'lead' : m.role, 1)}<div><div class="meta">${me ? 'You' : m.from === 'system' ? 'HQ' : esc(r.label)} · ${ago(m.createdAt)}</div><div class="bub" style="white-space:pre-wrap">${esc(m.text)}</div></div></div>`; }).join('')
      : `<div class="empty">No messages yet. Say what you want built.</div>`}
    </div>
    <label class="ask"><span class="ask-ic"></span><input id="leadIn" placeholder="Message ${esc(r.label)}…"><button class="btn-glow ready" id="leadGo">Send ${ic('right','sm')}</button></label>
  </div>`;
};

// Discord, simplified: the HQ Link server's channels read by your own bot (owner only, read only).
pages.chat = () => {
  const C = X.chat;
  const head = `<div class="page-h"><div><h1 class="h1">Chat</h1><p class="sub">Your Discord server, simplified: names instead of ids, long posts shortened, HQ sync posts folded.${C ? ` Updated ${ago(C.fetchedAt)} ago.` : ''}</p></div>
    <div class="acts"><button class="btn" data-act="chatsync">${ic(state.chatSync ? 'eye' : 'min')}${state.chatSync ? 'Hide' : 'Show'} HQ sync</button><button class="btn" data-act="chatrefresh">${ic('refresh')}Refresh</button></div></div>`;
  if (!C) return head + (X.chatErr ? `<div class="card empty">${ic('x')}<p>${esc(X.chatErr)}</p></div>` : loading());
  const items = C.items.filter(i => state.chatSync || i.kind !== 'sync');
  const people = [...new Set(C.items.filter(i => i.kind !== 'sync').map(i => i.author))];
  return head + `
  <div class="chips">${C.channels.slice(0, 12).map(ch => `<button class="chip ${C.channel.id === ch.id ? 'on' : ''}" data-chan="${ch.id}">#${esc(ch.name)}${ch.link ? ' <b>HQ Link</b>' : ''}</button>`).join('')}</div>
  <p class="lib-note">#${esc(C.channel.name)} · ${C.items.reduce((n, i) => n + (i.kind === 'sync' ? 0 : i.lines.length), 0)} messages from ${people.length} ${people.length === 1 ? 'sender' : 'senders'}: ${people.map(esc).join(', ')}</p>
  <div class="chat"><div class="msgs" id="dmsgs" style="max-height:none">${items.length ? items.map(i => i.kind === 'sync'
    ? `<div class="msg" style="opacity:.55;justify-content:center"><div class="meta">${ic('refresh','sm')} ${i.count} HQ sync message${i.count > 1 ? 's' : ''} · ${ago(i.at)} ago</div></div>`
    : `<div class="msg ${(C.me || []).includes(i.authorId) ? 'me' : ''}">${(C.me || []).includes(i.authorId) ? '' : `<span class="role-ic sm" style="--c:${i.bot ? '#8ab4ff' : '#ffd27a'}">${ic(i.bot ? 'spark' : 'kid')}</span>`}<div><div class="meta">${esc(i.author)}${i.bot ? ' · bot' : ''} · ${ago(i.at)} ago</div>${i.lines.map(l => `<div class="bub" style="margin-top:4px">${l.replyTo ? `<small style="opacity:.6">↪ ${esc(l.replyTo)}</small><br>` : ''}${l.kind === 'update' ? ic('refresh','sm') + ' ' : ''}${esc(state.chatFull[l.id] && l.full ? l.full : l.text)}${l.n > 1 ? ` <b style="opacity:.7">×${l.n}</b>` : ''}${l.full ? ` <button class="chip" data-full="${l.id}" style="padding:1px 8px;font-size:11px">${state.chatFull[l.id] ? 'less' : 'more'}</button>` : ''}</div>`).join('')}</div></div>`).join('')
    : '<div class="empty">No messages in this channel yet.</div>'}</div></div>`;
};

pages.review = () => {
  const list = needsYou();
  state.reviewSel = Math.min(state.reviewSel, Math.max(0, list.length - 1));
  const r = list[state.reviewSel];
  if (!r) return `<div class="page-h"><div><h1 class="h1">Review</h1></div><div class="acts"><a class="btn" href="${legacyHref('review')}">${ic('legacy')}History</a></div></div><div class="card empty">${ic('checkc')}<p>All clear. Nothing waits for you.</p></div>`;
  const opts = Array.isArray(r.options) ? r.options : [];
  return `
  <div class="page-h"><div><h1 class="h1">Review</h1><p class="sub">Everything waiting for you${state.game === 'all' ? '' : ` in ${esc(gameName(state.game))}`}.${opts.length ? ' Keys: 1 to 9 pick an option.' : ' Keys: A approve, C ask for changes, R reject.'}</p></div><div class="acts"><a class="btn" href="${legacyHref('review')}">${ic('legacy')}History</a></div></div>
  <div class="review-wrap">
    <div class="rv-list">${list.map((x, i) => `
      <div class="card rv ${i === state.reviewSel ? 'sel' : ''}" data-rv="${i}">
        <div class="thumb">${x.mediaPath && isImg(x.mediaPath) ? `<img src="${mediaUrl(x.mediaPath)}" alt="" style="width:100%;height:100%;object-fit:cover">` : scene(sceneOf(x.role))}</div>
        <div class="t"><b>${esc(x.title)}</b><span>${esc(role(x.role).label)} · ${ago(x.createdAt)} ago</span></div>
      </div>`).join('')}
    </div>
    <div class="dialog">
      <div class="dlg-bar">${ic('min')}${ic('sq')}${ic('x')}</div>
      <div class="dlg-in">
        <div class="dlg-h"><div class="dlg-ic">${ic(role(r.role).icon)}</div><div><h3>${esc(r.title)}</h3><div class="dlg-meta">${esc(role(r.role).label)} · ${esc(r.kind)} · ${ago(r.createdAt)} ago</div></div></div>
        <p class="dlg-txt" style="white-space:pre-wrap">${esc(r.why || '')}</p>
        ${r.mediaPath ? `<a class="dlg-shot" href="${mediaUrl(r.mediaPath)}" target="_blank" rel="noopener">${isImg(r.mediaPath) ? `<img src="${mediaUrl(r.mediaPath)}" alt="" style="width:100%;height:100%;object-fit:contain">` : 'Open the file'}</a>` : ''}
        ${opts.length ? opts.map((o, i) => `<button class="act ${o.recommended ? 'approve' : ''}" data-opt="${esc(o.id)}">${ic(o.recommended ? 'check' : 'right')}<span class="lbl">${esc(o.label)}${o.description ? `<small>${esc(o.description)}</small>` : ''}</span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}</button>`).join('') : `
        <button class="act approve" data-dec="approve">${ic('check')}<span class="lbl">Approve</span><kbd>A</kbd></button>
        <button class="act changes" data-dec="changes">${ic('msg')}<span class="lbl">Ask for changes</span><kbd>C</kbd></button>
        <div class="changes-box" id="chBox"><textarea id="chTxt" placeholder="What should change?"></textarea><div class="row"><button class="btn btn-ghost" data-dec="cancel">Cancel</button><button class="btn pill solid" data-dec="send">${ic('right','sm')}Send back</button></div></div>
        <button class="act reject" data-dec="reject">${ic('x')}<span class="lbl">Reject</span><kbd>R</kbd></button>`}
        <button class="act" data-dismiss="${r.id}">${ic('min')}<span class="lbl">Dismiss</span></button>
      </div>
    </div>
  </div>`;
};

pages.library = () => {
  const A = X.assets, C = X.catalog;
  if (!A || !C) return `<div class="page-h"><div><h1 class="h1">Library</h1></div></div>${loading()}`;
  const counts = A.counts || {};
  const kinds = [['all','Everything','grid'],['model','Models','box'],['image','Pictures','image'],['icon','Icons','spark'],['thumbnail','Thumbnails','image'],['sound','Sounds','pulse']];
  const q = state.libQ.toLowerCase();
  const mine = (A.assets || []).filter(a => (state.libKind === 'all' || a.kind === state.libKind) && (!q || String(a.name).toLowerCase().includes(q)));
  return `
  <div class="page-h"><div><h1 class="h1">Library</h1><p class="sub">Everything your agents build with: your assets, plus the free catalog.</p></div><div class="acts"><a class="btn" href="${legacyHref('library')}">${ic('legacy')}Full library</a></div></div>
  <div class="lib-cards">
    <div class="card lib-c on"><div class="ic">${ic('box')}</div><div><b>Your assets</b><p>Your own files and what your agents made.</p><small>${fmt(counts.all)} assets</small></div></div>
    <div class="card lib-c on"><div class="ic">${ic('spark')}</div><div><b>Free catalog</b><p>${Object.entries(C.sources || {}).map(([k, v]) => `${esc(k)} ${fmt(v)}`).join(' · ')}</p><small>${fmt(C.total)} free assets</small></div></div>
  </div>
  <label class="lib-search">${ic('search')}<input id="libQ" value="${esc(state.libQ)}" placeholder="Search your assets and the catalog: brick, cash, lamp…"></label>
  <div class="chips">${kinds.map(([k, l, i]) => `<button class="chip ${state.libKind === k ? 'on' : ''}" data-kind="${k}">${ic(i,'sm')}${l} <b>${fmt(k === 'all' ? counts.all : counts[k])}</b></button>`).join('')}</div>
  <div class="h-sec">Your assets</div>
  <div class="assets">${mine.length ? mine.map(a => `
    <div class="asset"><div class="pv">${a.file && isImg(a.file) ? `<img src="${mediaUrl('assets/' + String(a.file).replace(/^assets\//, ''))}" alt="" style="width:100%;height:100%;object-fit:contain">` : `<div style="display:grid;place-items:center;height:100%">${ic('box')}</div>`}</div>
      <div class="meta"><b>${esc(a.name)}</b><div class="k">${ic('box')}${esc(a.kind)} <span class="tag">${esc(a.scope || '')}</span></div><small>${a.robloxId ? 'On Roblox' : esc(a.file || '')}</small></div></div>`).join('') : '<div class="empty">None match.</div>'}
  </div>
  <div class="h-sec">Free catalog ${state.libQ ? `· “${esc(state.libQ)}”` : ''}</div>
  <div class="assets">${(C.results || []).map(a => `
    <div class="asset"><div class="pv" style="display:grid;place-items:center">${ic(a.type === 'model' ? 'box' : a.type === 'ui-kit' ? 'palette' : a.type === 'pack' ? 'packs' : 'image')}</div>
      <div class="meta"><b>${esc(a.name)}</b><div class="k">${esc(a.type)} <span class="tag">${esc(a.source)}</span></div><small>${esc(a.licence || '')}</small></div></div>`).join('') || '<div class="empty">Nothing matches. Try another word.</div>'}
  </div>`;
};

pages.vault = () => {
  const V = X.vault, hits = X.vaultHits;
  return `
  <div class="vault-hero"><canvas id="vaultBig"></canvas>
    <div class="ov"><h2>Vault</h2><p>LihFolk V2 notes, Roblox docs, reference cards and project research. Agents read this before they build.</p>
      <label class="lib-search">${ic('search')}<input id="vaultQ" value="${esc(state.vaultQ)}" placeholder="Search the vault: session lock, safe area, rate limit… (Enter)"></label></div>
  </div>
  ${hits ? `<div class="h-sec">Results for “${esc(state.vaultQ)}”</div><div class="card" style="padding:6px 14px">${(hits.results || []).map(h => `<div class="task-row" style="cursor:default;align-items:flex-start"><span class="tag">${esc(h.source)}</span><div class="t"><b>${esc(h.title)}</b><span style="white-space:normal">${esc(h.snippet || '').slice(0, 260)}</span></div>${h.trust ? `<span class="state queued">${esc(h.trust)}</span>` : ''}</div>`).join('') || '<div class="empty">No notes match.</div>'}</div>` : ''}
  <div class="h-sec">Playbook chapters</div>
  ${V ? `<div class="chapters">${V.chapters.map(c => `<div class="card chap" title="${esc(String(c.text || '').slice(0, 400))}"><span class="n">${c.n}</span><div><b>${esc(c.title)}</b><small>${fmt(String(c.text || '').split(/\s+/).length)} words</small></div></div>`).join('')}</div>` : loading()}`;
};

pages.create = () => {
  const tabs = [['assets','Assets','box','librarian','A 3D model or prop for the game.'],['vfx','VFX','spark','builder','An effect built with VFX Forge.'],['thumbnails','Thumbnails','image','thumbnails','Icons and store thumbnails, 3+ variants (Antigravity).'],['promos','Promos','film','thumbnails','A short promo of your game.']];
  const t = tabs.find(x => x[0] === state.createTab);
  const ph = { assets:'a stud oak tree in autumn colours: a chunky trunk, a big round crown of orange and gold leaves…', vfx:'a gold coin burst when a vault opens, short and punchy, readable on a phone…', thumbnails:'a cartoon character sprinting out of a glowing vault with a bag of cash…', promos:'a 15 second rush through the best-looking places, every cut on the beat…' }[state.createTab];
  const imgs = ((X.library || {}).assets || []).filter(isImg).slice(-8).reverse();
  return `
  <div class="page-h" style="margin-bottom:0"><div><h1 class="h1">Create <span class="badge-new">${ic('spark','sm')}New</span></h1><p class="sub">${t[4]} It goes to the ${esc(role(t[3]).label)} as a task.</p></div></div>
  <div class="tabs">${tabs.map(([k, l, i]) => `<button class="${state.createTab === k ? 'on' : ''}" data-ctab="${k}">${ic(i)}${l}</button>`).join('')}</div>
  <div class="h-sec">For which game</div>
  <div class="games-strip"><button class="gchip ${!state.createGame ? 'on' : ''}" data-cgame="">${ic('grid')}No game</button>${S.games.map(g => `<button class="gchip ${state.createGame === g.slug ? 'on' : ''}" data-cgame="${g.slug}"><span class="gi">${gameIcon(g)}</span>${esc(g.name)}</button>`).join('')}</div>
  <div class="card prompt">
    <textarea id="cPrompt" placeholder="${ph}"></textarea>
    <div class="prompt-bar"><span class="sp"></span><button class="go btn-glow" data-act="gen">${ic('wand')}Create</button></div>
  </div>
  <div class="h-sec">Latest images from your agents</div>
  <div class="gens">${imgs.length ? imgs.map(p => `<a class="gen" href="${mediaUrl('assets/' + p)}" target="_blank" rel="noopener"><div class="pv"><img src="${mediaUrl('assets/' + p)}" alt="" style="width:100%;height:100%;object-fit:contain"></div><div class="meta"><span>${esc(p.split('/').pop())}</span></div></a>`).join('') : '<div class="empty">No images yet.</div>'}</div>`;
};

pages.games = () => `
  <div class="page-h"><div><h1 class="h1">Games</h1><p class="sub">Every game the studio is working on, and where it is in the pipeline.</p></div><div class="acts"><a class="btn pill solid" href="${legacyHref('games')}">${ic('plus')}New game</a></div></div>
  ${S.games.length ? `<div class="grid3">${S.games.filter(g => !g.archivedAt).map(g => { const si = STAGES.indexOf(g.stage); return `
    <div class="card game-c" data-pick="${g.slug}">
      <div class="cov">${gameIcon(g)}</div>
      <div class="bd"><b>${esc(g.name)}</b><p class="sub" style="font-size:13px">${esc(g.note || g.nextStep || '')}</p>
        <div class="row"><span class="tag">v${esc(g.version)}</span><span class="tag">${cap(g.stage)}</span><span class="tag">${S.tasks.filter(t => t.game === g.slug && OPEN(t)).length} open tasks</span>${g.isPublic ? '<span class="tag">Public</span>' : ''}</div>
        <div class="stage-bar">${STAGES.map((s, i) => `<i class="${i <= si ? 'on' : ''}" title="${cap(s)}"></i>`).join('')}</div>
      </div>
    </div>`; }).join('')}</div>` : '<div class="card empty"><p>No games yet.</p></div>'}`;

pages.packs = () => {
  const P2 = X.packs;
  if (!P2) return `<div class="page-h"><div><h1 class="h1">Asset Packs</h1></div></div>${loading()}`;
  const card = (p, kind) => `<div class="card pack"><div class="ic">${ic(kind === 'kit' ? 'palette' : 'packs')}</div><b>${esc(p.name)}</b><p>${esc(String(p.description || '').slice(0, 160))}</p>
      <div class="row"><span class="muted" style="font-size:12px;font-weight:700">${esc(p.licence || p.source)}</span><span class="state done">Attached</span></div></div>`;
  return `
  <div class="page-h"><div><h1 class="h1">Asset Packs</h1><p class="sub">Packs and UI kits attached to the Library. Licences live in assets/LICENSES.md.</p></div></div>
  <div class="h-sec">Packs</div><div class="grid3">${(P2.packs || []).map(p => card(p, 'pack')).join('') || '<div class="empty">No packs attached.</div>'}</div>
  <div class="h-sec">UI kits (UI Lab)</div><div class="grid3">${(P2.kits || []).map(p => card(p, 'kit')).join('') || '<div class="empty">No UI kits yet.</div>'}</div>`;
};

pages.pitches = () => `
  <div class="page-h"><div><h1 class="h1">Pitches</h1><p class="sub">Game ideas from the Market scout, with evidence.</p></div><div class="acts"><button class="btn pill solid" data-act="findgame">${ic('spark')}Find my next game</button><a class="btn" href="${legacyHref('pitches')}">${ic('legacy')}Decide in full view</a></div></div>
  ${S.pitches.length ? `<div class="grid3">${S.pitches.map(p => `
    <div class="card game-c"><div class="cov">${scene(sceneOf(p.id))}</div><div class="bd"><b>${esc(p.title)}</b><div class="row"><span class="tag">${cap(p.state)}</span></div><p class="sub" style="font-size:13px">${esc(p.oneLiner || p.coreLoop || '')}</p>
      ${p.state === 'proposed' ? `<div class="row" style="display:flex;gap:8px"><button class="btn pill solid" data-pitch="${p.id}" data-d="approve">${ic('check','sm')}Approve</button><button class="btn btn-ghost" data-pitch="${p.id}" data-d="reject">${ic('x','sm')}Pass</button></div>` : ''}</div></div>`).join('')}</div>`
  : '<div class="card empty"><p>No pitches yet. Press “Find my next game”.</p></div>'}`;

pages.market = () => {
  const M = X.market;
  if (!M) return `<div class="page-h"><div><h1 class="h1">Market</h1></div></div>${loading()}`;
  const moves = ((M.velocity || {}).moves || []).slice(0, 12);
  const fresh = ((M.history || {}).newOnCharts || []).slice(0, 12);
  return `
  <div class="page-h"><div><h1 class="h1">Market</h1><p class="sub">Roblox charts${M.latest ? `, last read ${ago(M.latest.fetchedAt)} ago` : ''}. ${fmt((M.sorts || []).length)} charts tracked.</p></div><div class="acts"><button class="btn" data-act="mrefresh">${ic('refresh')}Refresh</button><a class="btn" href="${legacyHref('market')}">${ic('legacy')}Charts and benchmarks</a></div></div>
  <div class="h-sec">Biggest moves</div>
  <div class="card" style="padding:6px 0">${moves.map((m, i) => `
    <div class="task-row" style="cursor:default"><span class="tag" style="width:34px;justify-content:center">${i + 1}</span><div class="t"><b>${esc(m.name)}</b><span>${esc(m.sortName)}${m.playersDelta != null ? ` · ${m.playersDelta > 0 ? '+' : ''}${fmt(m.playersDelta)} players` : ''}</span></div><span class="state ${m.rankDelta > 0 ? 'working' : 'queued'}">${m.rankDelta > 0 ? '+' : ''}${m.rankDelta ?? '—'}</span></div>`).join('') || '<div class="empty">No moves yet; it needs two snapshots.</div>'}</div>
  ${fresh.length ? `<div class="h-sec">New on the charts</div><div class="card" style="padding:6px 0">${fresh.map(g => `<div class="task-row" style="cursor:default">${g.iconUrl ? `<img src="${esc(g.iconUrl)}" alt="" style="width:32px;height:32px;border-radius:8px">` : ''}<div class="t"><b>${esc(g.name)}</b><span>${fmt(g.playing)} playing · first seen ${ago(g.firstSeen)} ago</span></div></div>`).join('')}</div>` : ''}`;
};

pages.settings = () => {
  const L = S.lanes || {};
  const lane = (n, k) => { const seen = (L[k] || {}).lastSeenAt; return [n, seen ? `Seen ${ago(seen)} ago` : 'Not seen yet', seen && Date.now() - Date.parse(seen) < 15 * 60e3]; };
  return `
  <div class="page-h"><div><h1 class="h1">Settings</h1><p class="sub">Lanes, usage and how hard the agents work.</p></div><div class="acts"><a class="btn" href="${legacyHref('settings')}">${ic('legacy')}All settings</a></div></div>
  <div class="set-grid">
    <div class="card qs"><div class="h">${ic('sliders')}Usage</div>
      <div class="qs-row"><div class="qs-l">Agents</div><button class="btn btn-ghost" data-act="pause">${ic(S.settings.paused ? 'play' : 'pause')}${S.settings.paused ? 'Resume all' : 'Pause all'}</button></div>
      <div class="qs-row"><div class="qs-l">Studios for agents</div>${seg('studioLanes', [[0,'Off'],[1,'1'],[2,'2']], S.settings.studioLanes)}</div>
      <div class="qs-row"><div class="qs-l">Agents at once</div>${seg('budget', [[1,'1'],[2,'2'],[3,'3'],[4,'4']], S.settings.budget)}</div>
      <div class="qs-row"><div class="qs-l">Run mode</div>${seg('runMode', [['instant','Instant'],['hourly','Hourly']], S.settings.runMode)}</div>
      <div class="qs-row"><div class="qs-l">Lean agent sessions <small>saves tokens</small></div>${seg('leanSessions', [[true,'On'],[false,'Off']], S.settings.leanSessions)}</div>
    </div>
    <div class="card qs"><div class="h">${ic('pulse')}Worker lanes</div>
      ${[lane('Claude app worker', 'app'), lane('Antigravity design lane', 'antigravity'), ['Claude on this PC', S.engines && S.engines['claude-cli'] ? 'Ready' : 'Not found', !!(S.engines && S.engines['claude-cli'])]].map(([n, s, ok]) => `<div class="task-row" style="padding:8px 0;cursor:default"><i class="dot" style="${ok ? '' : 'background:var(--tx3);box-shadow:none;animation:none'}"></i><div class="t"><b>${n}</b><span>${s}</span></div></div>`).join('')}
    </div>
    <div class="card qs"><div class="h">${ic('legacy')}Moved to Legacy</div>
      <p class="muted" style="font-size:13px;margin:0 0 8px">These pages are not in the new hub yet and open in the old dashboard:</p>
      ${NAV_LEGACY.map(n => `<a class="task-row" style="padding:6px 0" href="${legacyHref(n.id)}">${ic(n.icon)}<div class="t"><b>${n.label}</b></div>${ic('right','sm')}</a>`).join('')}
    </div>
  </div>`;
};

// ---------------------------------------------------------------- starfield / graph canvas
let vaultIdx = 0, rafs = [];
function starfield(cv, big) {
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, dpr = Math.min(2, devicePixelRatio || 1);
  const fit = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit();
  const N = big ? 700 : 480;
  const cx = () => W * (big ? .66 : .8), cy = () => H * .5;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const pts = Array.from({ length: N }, () => {
    const a = Math.random() * Math.PI * 2, r = Math.abs(gauss()) * (big ? .34 : .3) + .012;
    const h = Math.random();
    return { a, r, s: .35 + Math.random() * (r < .12 ? 2 : 1.2), sp: .0004 + (.0025 * (.05 / (r + .05))), hue: h < .3 ? 315 : h < .7 ? 265 : 225, tw: Math.random() * 6 };
  });
  const dust = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.1 }));
  let t = 0, id;
  const draw = () => {
    t++;
    ctx.clearRect(0, 0, W, H);
    for (const d of dust) { ctx.fillStyle = `rgba(255,255,255,${.15 + .25 * Math.sin(t * .02 + d.x * 20) ** 2})`; ctx.fillRect(d.x * W, d.y * H, d.s, d.s); }
    const X = cx(), Y = cy(), sc = Math.max(W, H);
    const pos = pts.map(p => { p.a += p.sp; const rr = p.r * sc; return [X + Math.cos(p.a) * rr * 1.25, Y + Math.sin(p.a) * rr * .5]; });
    // nebula glow
    for (const [ox, oy, rad, col] of [[-.12, -.05, .28, '140,90,255'], [.05, .08, .22, '255,90,200'], [-.22, .1, .2, '80,120,255']]) {
      const gx = X + ox * sc, gy = Y + oy * sc, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad * sc);
      gr.addColorStop(0, `rgba(${col},.13)`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    ctx.lineWidth = .55;
    const L = Math.min(N, 260), D = big ? 2600 : 1800;
    for (let i = 0; i < L; i++) {
      const [x1, y1] = pos[i];
      for (let j = i + 1; j < L; j++) {
        const [x2, y2] = pos[j], dx = x1 - x2, dy = y1 - y2, d2 = dx * dx + dy * dy;
        if (d2 < D) { ctx.strokeStyle = `rgba(185,165,255,${(1 - d2 / D) * .28})`; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      }
    }
    for (let i = 0; i < N; i++) {
      const p = pts[i], [x, y] = pos[i], a = .45 + .55 * Math.abs(Math.sin(t * .03 + p.tw));
      ctx.fillStyle = `hsla(${p.hue},90%,${80}%,${a})`;
      ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill();
    }
    // streaks toward the core
    for (let k = 0; k < 5; k++) {
      const ang = Math.PI + (k - 2) * .14 + Math.sin(t * .004 + k) * .05, len = sc * (.18 + k * .03);
      const g = ctx.createLinearGradient(X, Y, X + Math.cos(ang) * len, Y + Math.sin(ang) * len * .5);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(160,140,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.2 - k * .3; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + Math.cos(ang) * len, Y + Math.sin(ang) * len * .5); ctx.stroke();
    }
    // core (an accretion ring)
    const R0 = big ? 34 : 22;
    let g = ctx.createRadialGradient(X, Y, R0 * .4, X, Y, R0 * 3.2);
    g.addColorStop(0, 'rgba(200,170,255,.55)'); g.addColorStop(.4, 'rgba(120,80,255,.25)'); g.addColorStop(1, 'rgba(60,30,160,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, Y, R0 * 3.6, R0 * 2, 0, 0, 7); ctx.fill();
    ctx.lineWidth = big ? 5 : 3.5; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.shadowColor = '#c9b6ff'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.ellipse(X, Y, R0, R0 * .78, 0, 0, 7); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.ellipse(X, Y, R0 * .78, R0 * .58, 0, 0, 7); ctx.fill();
    id = requestAnimationFrame(draw);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(); cancelAnimationFrame(id); }
  else draw();
  rafs.push(() => cancelAnimationFrame(id));
  const ro = new ResizeObserver(fit); ro.observe(cv); rafs.push(() => ro.disconnect());
}

// ---------------------------------------------------------------- router
const NEEDS_DATA = { chat: 'chat', lead: 'msgs', library: 'catalog', vault: 'vault', market: 'market', packs: 'packs', create: 'library', home: 'library' };
function route(anim = true) {
  rafs.forEach(f => f()); rafs = [];
  const m = location.hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?/) || [];
  let id = m[1] || 'home';
  if (!pages[id]) id = 'home';
  if (id === 'lead' && m[2] && m[2] !== state.chatRole) { state.chatRole = m[2]; X.msgs = null; }
  if (anim === true && NEEDS_DATA[id]) loadPage(id, true);
  $('#view').classList.toggle('anim', anim === true);
  renderNav(id);
  const nav = ALL_NAV.find(n => n.id === id);
  $('#crumbPage').textContent = nav ? nav.label : 'Home';
  $('#gameName').textContent = state.game === 'all' ? 'All games' : gameName(state.game);
  const gp = document.querySelector('#gamePick .gp-ic'); const gi = gameBySlug(state.game)?.icon; if (gp) gp.innerHTML = state.game !== 'all' && gi ? `<img src="${mediaUrl(gi)}" alt="">` : ic('grid');
  iconPicker();
  const v = $('#view');
  if (S.err === 'signin') v.innerHTML = `<div class="card empty">${ic('key')}<p>Sign in: open Agent HQ from the desktop shortcut (it adds your owner key), or use the <a href="${LEGACY}">old dashboard</a>.</p></div>`;
  else if (!S.loaded) v.innerHTML = S.err ? `<div class="card empty">${ic('x')}<p>Agent HQ did not answer: ${esc(S.err)}</p></div>` : loading();
  else v.innerHTML = pages[id]();
  v.dataset.page = id;
  starfield($('#vaultCv'), false);
  starfield($('#vaultBig'), true);
  bindPage(id);
}
const rerender = () => { const s = $('#view').scrollTop; const f = document.activeElement && document.activeElement.id; const pos = f && document.activeElement.selectionStart; route(false); $('#view').scrollTop = s; if (f && $('#' + f)) { const n = $('#' + f); n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* not a text box */ } } };

async function sendTo(roleId, text, input) {
  if (!text) return;
  const body = { role: roleId, text, ...(state.game !== 'all' ? { game: state.game } : {}) };
  if (input) input.disabled = true;
  const ok = await act(() => api('POST', '/api/messages', body), roleId === 'lead' ? 'Sent to the Lead' : `Sent to ${role(roleId).label}`);
  if (input) { input.disabled = false; if (ok) input.value = ''; }
  return ok;
}
function bindPage(id) {
  const ask = $('#askIn');
  if (ask) {
    const go = $('#askGo');
    ask.addEventListener('input', () => go.classList.toggle('ready', !!ask.value.trim()));
    const send = async () => { const t = ask.value.trim(); if (!t) return; if (await sendTo('lead', t, ask)) { state.chatRole = 'lead'; X.msgs = null; location.hash = '#/lead'; } };
    go.addEventListener('click', e => { e.preventDefault(); send(); });
    ask.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  }
  const lead = $('#leadIn');
  if (lead) {
    const send = async () => { const t = lead.value.trim(); if (!t) return; if (await sendTo(state.chatRole, t, lead)) { await loadPage('lead', true); $('#msgs').scrollTop = 1e6; $('#leadIn').focus(); } };
    $('#leadGo').addEventListener('click', e => { e.preventDefault(); send(); });
    lead.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    $('#msgs').scrollTop = 1e6;
  }
  const lq = $('#libQ');
  if (lq) { let t; lq.addEventListener('input', () => { state.libQ = lq.value; clearTimeout(t); t = setTimeout(() => loadPage('library', true), 300); }); }
  if (id === 'chat' && X.chat && state.chatScrolled !== X.chat.channel.id) { state.chatScrolled = X.chat.channel.id; $('#view').scrollTop = 1e7; const dm = $('#dmsgs'); if (dm) dm.scrollTop = 1e7; }
  const vq = $('#vaultQ');
  if (vq) vq.addEventListener('keydown', e => { if (e.key === 'Enter') { state.vaultQ = vq.value.trim(); loadPage('vault'); } });
}

// ---------------------------------------------------------------- actions
async function setSetting(key, raw) {
  const value = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
  if (await act(() => api('POST', '/api/settings', { key, value }), 'Saved')) { S.settings[key] = value; rerender(); }
}
async function newTask() {
  const text = prompt('What should the agents do? (The Lead picks the roles and splits it into tasks.)');
  if (text && text.trim() && await sendTo('lead', text.trim())) { state.chatRole = 'lead'; X.msgs = null; location.hash = '#/lead'; }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-chan],[data-full],[data-go],[data-set] button,[data-task],[data-open],[data-rv],[data-rvgo],[data-dec],[data-opt],[data-dismiss],[data-kind],[data-ctab],[data-cgame],[data-act],[data-pick],[data-cmdk],[data-chat],[data-cancel],[data-retry],[data-pitch]');
  if (!el) { if (!e.target.closest('#gameMenu,#gamePick')) $('#gameMenu').hidden = true; return; }
  const d = el.dataset;
  if (d.chan) { state.chatChannel = d.chan; X.chat = null; rerender(); return loadPage('chat'); }
  if (d.full) { state.chatFull[d.full] = !state.chatFull[d.full]; return rerender(); }
  if (d.cmdk !== undefined) return openCmdk();
  if (d.go) return location.hash = '#/' + d.go;
  if (el.parentElement && el.parentElement.dataset.set) return setSetting(el.parentElement.dataset.set, d.v);
  if (d.task) { state.openTask = d.task; location.hash = '#/tasks'; return; }
  if (d.open) { if (e.target.closest('button,a')) return; state.openTask = state.openTask === d.open ? null : d.open; return rerender(); }
  if (d.cancel) return act(() => api('POST', `/api/tasks/${d.cancel}/cancel`), 'Canceled').then(load);
  if (d.retry) return act(() => api('POST', `/api/tasks/${d.retry}/retry`), 'Queued again').then(load);
  if (d.rvgo !== undefined) { state.reviewSel = +d.rvgo; return; }
  if (d.rv) { state.reviewSel = +d.rv; return rerender(); }
  if (d.dec) return decide(d.dec);
  if (d.opt) return answerAsk(d.opt, 'Answered');
  if (d.dismiss) return act(() => api('POST', `/api/asks/${d.dismiss}/dismiss`), 'Dismissed').then(load);
  if (d.chat) { state.chatRole = d.chat; X.msgs = null; location.hash = '#/lead/' + d.chat; return route(); }
  if (d.kind) { state.libKind = d.kind; return rerender(); }
  if (d.ctab) { state.createTab = d.ctab; return rerender(); }
  if (d.cgame !== undefined) { state.createGame = d.cgame; return rerender(); }
  if (d.pick) { setGame(d.pick); location.hash = '#/home'; return route(); }
  if (d.pitch) return act(() => api('POST', `/api/pitches/${d.pitch}/decide`, { state: d.d === 'approve' ? 'approved' : 'declined' }), d.d === 'approve' ? 'Approved' : 'Passed').then(load);
  if (d.act) {
    switch (d.act) {
      case 'pause': return act(() => api('POST', S.settings.paused ? '/api/resume' : '/api/pause'), S.settings.paused ? 'Agents are back to work' : 'Paused: nothing new starts').then(load);
      case 'newtask': return newTask();
      case 'chatsync': state.chatSync = !state.chatSync; return rerender();
      case 'chatrefresh': return loadPage('chat');
      case 'gamemenu': return openGameMenu(el);
      case 'findgame': return sendTo('scout', 'Find my next game: pitch 3 to 4 ideas with chart evidence.').then(ok => ok && load());
      case 'mrefresh': return act(() => api('POST', '/api/market/refresh'), 'Market refresh started').then(() => setTimeout(() => loadPage('market', true), 4000));
      case 'gen': {
        const tabs = { assets:'librarian', vfx:'builder', thumbnails:'thumbnails', promos:'thumbnails' };
        const text = ($('#cPrompt').value || '').trim();
        if (!text) { $('#cPrompt').focus(); return; }
        const kind = { assets:'3D asset', vfx:'VFX', thumbnails:'thumbnail/icon', promos:'promo' }[state.createTab];
        return act(() => api('POST', '/api/tasks', { role: tabs[state.createTab], title: `Create ${kind}: ${text}`.slice(0, 200), body: text, ...(state.createGame ? { game: state.createGame } : {}) }), `Queued for the ${role(tabs[state.createTab]).label}`).then(r => { if (r) { $('#cPrompt').value = ''; load(); } });
      }
    }
  }
});

async function answerAsk(value, msg) {
  const r = needsYou()[state.reviewSel];
  if (!r) return;
  if (await act(() => api('POST', `/api/asks/${r.id}/answer`, { answer: value }), `${msg}: ${r.title}`)) load();
}
function decide(k) {
  const box = $('#chBox');
  if (k === 'changes') { box.classList.add('on'); $('#chTxt').focus(); return; }
  if (k === 'cancel') { box.classList.remove('on'); return; }
  if (k === 'send') { const note = $('#chTxt').value.trim(); if (!note) { $('#chTxt').focus(); return; } return answerAsk('changes:' + note, 'Sent back with your notes'); }
  if (k === 'approve') return answerAsk('approve', 'Approved');
  if (k === 'reject') return answerAsk('reject', 'Rejected');
}

$('#gamePick').addEventListener('click', e => { e.stopPropagation(); openGameMenu($('#gamePick')); });
function openGameMenu(anchor) {
  const m = $('#gameMenu');
  if (!m.hidden) { m.hidden = true; return; }
  m.innerHTML = [`<button data-g="all" class="${state.game === 'all' ? 'on' : ''}"><span class="gi">${ic('grid')}</span>All games</button>`, ...S.games.filter(g => !g.archivedAt).map(g => `<button data-g="${g.slug}" class="${state.game === g.slug ? 'on' : ''}"><span class="gi">${gameIcon(g)}</span>${esc(g.name)}</button>`)].join('');
  const r = anchor.getBoundingClientRect();
  m.style.left = r.left + 'px'; m.style.top = r.bottom + 6 + 'px'; m.hidden = false;
  m.onclick = ev => { const b = ev.target.closest('[data-g]'); if (!b) return; setGame(b.dataset.g); m.hidden = true; };
}

// command palette
function cmdItems() {
  return [
    ...ALL_NAV.map(n => ({ label:n.label, icon:n.icon, hint:'Page', go:() => location.hash = '#/' + n.id })),
    ...NAV_LEGACY.map(n => ({ label:n.label, icon:n.icon, hint:'Legacy', go:() => location.href = legacyHref(n.id) })),
    ...S.roles.map(r => ({ label:r.label, icon:role(r.id).icon, hint:'Role', go:() => { state.chatRole = r.id; X.msgs = null; location.hash = '#/lead/' + r.id; } })),
    ...S.tasks.filter(OPEN).map(t => ({ label:t.title, icon:'tasks', hint:STATE_LBL[t.state] || t.state, go:() => { state.openTask = t.id; location.hash = '#/tasks'; rerender(); } })),
    ...S.games.map(g => ({ label:g.name, icon:'games', hint:'Game', go:() => { setGame(g.slug); location.hash = '#/home'; } })),
  ];
}
let cmdSel = 0, cmdList = [];
function openCmdk() { const c = $('#cmdk'); c.hidden = false; const i = $('#cmdkInput'); i.value = ''; drawCmdk(); i.focus(); }
function drawCmdk() {
  const q = $('#cmdkInput').value.toLowerCase();
  cmdList = cmdItems().filter(x => String(x.label).toLowerCase().includes(q)).slice(0, 12);
  cmdSel = Math.min(cmdSel, Math.max(0, cmdList.length - 1));
  $('#cmdkList').innerHTML = cmdList.map((x, i) => `<button class="${i === cmdSel ? 'on' : ''}" data-ci="${i}">${ic(x.icon)}${esc(x.label)}<small>${esc(x.hint)}</small></button>`).join('') || '<div class="empty">No matches</div>';
}
$('#cmdkInput').addEventListener('input', () => { cmdSel = 0; drawCmdk(); });
$('#cmdkList').addEventListener('click', e => { const b = e.target.closest('[data-ci]'); if (b) { $('#cmdk').hidden = true; cmdList[+b.dataset.ci].go(); } });
$('#cmdk').addEventListener('click', e => { if (e.target.id === 'cmdk') $('#cmdk').hidden = true; });

document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openCmdk(); }
  if (!$('#cmdk').hidden) {
    if (e.key === 'Escape') $('#cmdk').hidden = true;
    else if (e.key === 'ArrowDown') { cmdSel = Math.min(cmdSel + 1, cmdList.length - 1); drawCmdk(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { cmdSel = Math.max(cmdSel - 1, 0); drawCmdk(); e.preventDefault(); }
    else if (e.key === 'Enter' && cmdList[cmdSel]) { $('#cmdk').hidden = true; cmdList[cmdSel].go(); }
    return;
  }
  if (e.key === 'Escape') $('#gameMenu').hidden = true;
  if (!typing && $('#view').dataset.page === 'review' && /^[1-9]$/.test(e.key)) { const b = document.querySelectorAll('#view [data-opt]')[Number(e.key) - 1]; if (b) { e.preventDefault(); b.click(); return; } }
  if (typing || $('#view').dataset.page !== 'review' || !$('#chBox')) return;
  const map = { a:'approve', c:'changes', r:'reject' };
  if (map[e.key.toLowerCase()]) { e.preventDefault(); decide(map[e.key.toLowerCase()]); }
});

// live bits
$('#refresh').addEventListener('click', async () => { const b = $('#refresh'); b.classList.add('spin'); await load(); if (NEEDS_DATA[curPage()]) await loadPage(curPage(), true); b.classList.remove('spin'); toast('Numbers refreshed'); });
setInterval(() => { const s = Math.round((Date.now() - lastRefresh) / 1000); $('#updated').textContent = !lastRefresh ? '…' : s < 20 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`; }, 5000);
setInterval(() => { vaultIdx++; const el = $('#vaultLine'); const w = S.tasks.filter(t => t.state === 'working'); if (!el || w.length < 2) return; const t = w[vaultIdx % w.length]; el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => { el.innerHTML = `<b>${esc(role(t.role).label)}</b> is working on ${esc(t.title)}`; el.style.opacity = 1; }, 300); }, 4500);
setInterval(load, 60000);
setInterval(() => { if (curPage() === 'chat') loadPage('chat', true); }, 20000); // safety net if the event stream drops

// The icon picker: every live game needs an icon. Choices are that game's thumbnails, icons and concept images
// (assets scoped to it, and pictures in its reviews). It cannot be closed without a pick; with no choices it offers to have some made.
let pickerFor = '';
async function iconPicker() {
  const box = $('#iconPick');
  const todo = S.loaded ? S.games.filter(x => !x.archivedAt && !x.icon) : [];
  if (!todo.length) { if (box) box.hidden = true; pickerFor = ''; return; }
  if (!X.assets) { try { X.assets = await api('GET', '/api/assets'); } catch { X.assets = { assets: [] }; } }
  const choices = (g) => {
    const fromAssets = (X.assets.assets || []).filter(a => a.scope === `game:${g.slug}` && ['thumbnail', 'icon', 'image'].includes(a.kind) && isImg(a.file) && !a.missing)
      .sort((a, b) => ['thumbnail', 'icon', 'image'].indexOf(a.kind) - ['thumbnail', 'icon', 'image'].indexOf(b.kind)).map(a => ({ path: a.file, name: a.name }));
    const fromReviews = S.asks.filter(a => a.mediaPath && isImg(a.mediaPath) && askGame(a) === g.slug).map(a => ({ path: a.mediaPath, name: a.title }));
    const seen = new Set();
    return [...fromAssets, ...fromReviews].filter(o => !seen.has(o.path) && seen.add(o.path)).slice(0, 24);
  };
  const asked = (g) => { try { return Date.now() - (Number(localStorage.getItem(`hq-icon-asked-${g.slug}`)) || 0) < 24 * 3600e3; } catch { return false; } };
  // the first game that has options, or has not asked for some in the last day; a game waiting for its icons is skipped
  const g = todo.find(x => choices(x).length || !asked(x));
  if (!g) { if (box) box.hidden = true; pickerFor = ''; return; }
  if (pickerFor === g.slug && box && !box.hidden) return;
  pickerFor = g.slug;
  const opts = choices(g);
  const el = box || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'iconPick', className: 'icon-pick' }));
  el.hidden = false;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'ipTitle');
  el.innerHTML = `<div class="ip-card"><h2 id="ipTitle">Pick an icon for ${esc(g.name)}</h2><p class="sub">Every game needs one; it shows in the game menu and on its card. Pick from what the agents made for it.</p>
    ${opts.length ? `<div class="ip-grid">${opts.map((o, i) => `<button class="ip-opt" data-ip="${i}" title="${esc(o.name)}"><img src="${mediaUrl(o.path)}" alt="${esc(o.name)}"></button>`).join('')}</div>`
      : `<p>No thumbnails or concept images for this game yet.</p><button class="btn pill solid" data-ipmake="1">Ask the Thumbnails agent for 3 icon options</button>`}</div>`;
  el.onclick = async (ev) => {
    const b = ev.target.closest('[data-ip]');
    if (b) {
      const o = opts[Number(b.dataset.ip)];
      if (await act(() => api('PATCH', `/api/games/${encodeURIComponent(g.slug)}`, { icon: o.path }), `${g.name} has its icon`)) { el.hidden = true; pickerFor = ''; await load(); }
      return;
    }
    if (ev.target.closest('[data-ipmake]')) {
      if (await act(() => api('POST', '/api/tasks', { role: 'thumbnails', game: g.slug, title: `3 square game icon options for ${g.name}`.slice(0, 200), body: `Make 3 square 512x512 game icon options for ${g.name}, save each with hq_asset_add as kind icon for this game, and ask the owner to pick one.` }), 'Queued for the Thumbnails agent')) {
        el.innerHTML = `<div class="ip-card"><h2 id="ipTitle">Icons for ${esc(g.name)} are on the way</h2><p class="sub">The Thumbnails agent is making 3 options. This asks again when they are ready.</p></div>`;
        setTimeout(() => { el.hidden = true; }, 2500);
        try { localStorage.setItem(`hq-icon-asked-${g.slug}`, String(Date.now())); } catch { /* private mode */ }
      }
    }
  };
  el.querySelector('button')?.focus();
}

hydrate();
window.addEventListener('hashchange', () => route());
route();
load();
listen();
})();

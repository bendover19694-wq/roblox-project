// Games: Overview, Live numbers, Pipeline. One tab per game.
import { h, ic, store, api, act, btn, empty, pageHead, statePill, roleLabel, avatar, ago, fmtTime, openDrawer, openModal, notify, toast, field } from './core.js';

export const STAGES = [
  { id: 'pitched', name: 'Pitched', owner: 'Scout', roles: ['scout'] },
  { id: 'designed', name: 'Designed', owner: 'Architect', roles: ['architect'] },
  { id: 'assets', name: 'Assets ready', owner: 'Librarian', roles: ['librarian'] },
  { id: 'built', name: 'Built', owner: 'Builder + UI', roles: ['builder', 'ui'] },
  { id: 'balanced', name: 'Balanced', owner: 'Economy', roles: ['economy'] },
  { id: 'art', name: 'Art done', owner: 'Thumbnails', roles: ['thumbnails', 'designer'] },
  { id: 'ready', name: 'Ready to publish', owner: 'Builder', roles: ['merchant', 'producer'] },
  { id: 'live', name: 'Live', owner: 'Only you', roles: [] },
  { id: 'graded', name: 'Graded', owner: 'Live ops', roles: ['liveops'] },
];
const stageIdx = (id) => STAGES.findIndex((s) => s.id === id);
const stageName = (id) => STAGES.find((s) => s.id === id)?.name || id;
const stageOfRole = (role) => STAGES.find((s) => s.roles.includes(role))?.id || null;

// ---------- small shared helpers (also used by the Market page) ----------
export const num = (n) => (n == null || Number.isNaN(Number(n)) ? 'n/a' : Number(n).toLocaleString());
export const chip = (text, tone) => h('span', { class: 'pg-chip', 'data-tone': tone || null }, text);
export function tile(label, value, sub, tone) {
  const none = value == null || value === '';
  return h('div', { class: 'pg-tile', 'data-tone': tone || null },
    h('span', { class: 'k' }, label),
    h('span', { class: 'v' + (none ? ' dim' : '') }, none ? 'not measured' : value),
    sub ? h('span', { class: 't' }, sub) : null);
}
export function segmented(items, current, onPick, counts = {}) {
  return h('div', { class: 'pg-seg', role: 'tablist' }, items.map(([id, label]) => h('button', {
    type: 'button', role: 'tab', 'aria-selected': String(id === current), onclick: () => onPick(id),
  }, label, counts[id] != null ? h('span', { class: 'pg-count' }, counts[id]) : null)));
}

const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}, ...kids) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  kids.forEach((k) => k && e.append(k));
  return e;
};
const compact = (n) => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n)));

// Simple line chart: points = [{x: Date|number, y: number}]. One series, direct label on the last value.
export function lineChart(title, points, { unit = '', target = null } = {}) {
  const wrap = h('div', { class: 'pg-chart' }, h('h4', {}, title));
  const pts = points.filter((p) => p.y != null && Number.isFinite(p.y));
  if (pts.length < 2) {
    wrap.append(h('p', { class: 'pg-note' }, pts.length ? `One reading so far (${compact(pts[0].y)}${unit}). A line needs two or more refreshes.` : 'No readings yet.'));
    return wrap;
  }
  const W = 560; const H = 170; const L = 56; const R = 64; const T = 12; const B = 22;
  const xs = pts.map((p) => +p.x); const x0 = Math.min(...xs); const x1 = Math.max(...xs) || x0 + 1;
  let lo = Math.min(...pts.map((p) => p.y), target ?? Infinity); let hi = Math.max(...pts.map((p) => p.y), target ?? -Infinity);
  if (lo === hi) { lo = lo - 1; hi = hi + 1; }
  const pad = (hi - lo) * 0.1; lo = Math.max(0, lo - pad); hi += pad;
  const fmt = (v) => (hi - lo < 2000 && Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : compact(v)) + unit;
  const X = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (y) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const svgEl = sv('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${title}, latest ${compact(pts.at(-1).y)}${unit}` });
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3; const y = Y(v);
    svgEl.append(sv('line', { class: 'grid', x1: L, x2: W - R, y1: y, y2: y }));
    const t = sv('text', { class: 'axis', x: L - 6, y: y + 3, 'text-anchor': 'end' }); t.textContent = fmt(v); svgEl.append(t);
  }
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(+p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
  svgEl.append(sv('path', { class: 'area', d: `${d} L${X(+pts.at(-1).x).toFixed(1)} ${H - B} L${X(+pts[0].x).toFixed(1)} ${H - B} Z` }));
  if (target != null) svgEl.append(sv('line', { class: 'tgt', x1: L, x2: W - R, y1: Y(target), y2: Y(target) }));
  svgEl.append(sv('path', { class: 'line', d }));
  const last = pts.at(-1);
  svgEl.append(sv('circle', { class: 'dot', cx: X(+last.x), cy: Y(last.y), r: 3.5 }));
  const lb = sv('text', { class: 'lbl', x: X(+last.x) + 7, y: Y(last.y) + 4 }); lb.textContent = fmt(last.y); svgEl.append(lb);
  for (const [x, anchor] of [[x0, 'start'], [x1, 'end']]) {
    const t = sv('text', { class: 'axis', x: X(x), y: H - 6, 'text-anchor': anchor });
    t.textContent = new Date(x).toLocaleDateString([], { month: 'short', day: 'numeric' }); svgEl.append(t);
  }
  wrap.append(svgEl);
  return wrap;
}

// ---------- data ----------
let gamesList = null;
let gamesAt = 0;
let loadingGames = false;
const liveCache = {};
const reqCache = { rows: null, at: 0 };
let slug = '';
let tab = 'overview';
let chartTab = 'trends';

async function loadGames(force) {
  if (loadingGames || (!force && gamesList && Date.now() - gamesAt < 15000)) return;
  loadingGames = true;
  try {
    const r = await api('GET', '/api/games');
    gamesList = Array.isArray(r) ? r : r.games || [];
    gamesAt = Date.now();
  } catch (e) { toast(e.message, 'error'); gamesList = gamesList || []; gamesAt = Date.now(); }
  loadingGames = false;
  notify();
}
async function loadRequests(force) {
  if (reqCache.loading || (!force && reqCache.rows && Date.now() - reqCache.at < 15000)) return;
  reqCache.loading = true;
  try {
    const r = await api('GET', '/api/stage-requests');
    reqCache.rows = Array.isArray(r) ? r : r.requests || r.rows || [];
  } catch { reqCache.rows = reqCache.rows || []; }
  reqCache.at = Date.now(); reqCache.loading = false;
  notify();
}
async function loadLive(g, force) {
  const c = liveCache[g] || (liveCache[g] = {});
  if (c.loading || (!force && c.data && Date.now() - c.at < 30000)) return;
  c.loading = true;
  try { c.data = await api('GET', `/api/games/${encodeURIComponent(g)}/live`); } catch (e) { c.error = e.message; c.data = c.data || { series: [], metrics: {}, targets: {}, attention: [] }; }
  c.at = Date.now(); c.loading = false;
  notify();
}
const reloadAll = async (g) => { await Promise.all([loadGames(true), loadRequests(true), g ? loadLive(g, true) : null]); };

// ---------- overview ----------
function editableText(label, value, onSave, { multiline = false, placeholder = '' } = {}) {
  let editing = false;
  const box = h('div', {});
  const draw = () => {
    box.replaceChildren();
    if (!editing) {
      box.append(h('div', { class: 'pg-inline-edit' },
        h('span', { class: value ? '' : 'muted' }, value || placeholder || 'Nothing yet'),
        btn('Edit', () => { editing = true; draw(); }, { kind: 'sm' })));
      return;
    }
    const input = multiline ? h('textarea', { class: 'pg-input', rows: 3, value: value || '', maxlength: 2000 }) : h('input', { class: 'pg-input grow', value: value || '', maxlength: 300 });
    box.append(h('div', { class: 'pg-inline-edit' }, input,
      btn('Save', async () => { if (await act(() => onSave(input.value.trim()), 'Saved')) { editing = false; } }, { kind: 'primary sm' }),
      btn('Cancel', () => { editing = false; draw(); }, { kind: 'sm' })));
    input.focus();
  };
  draw();
  return h('div', { class: 'pg-kv' }, h('h4', {}, label), box);
}

const patchGame = (g, body) => api('PATCH', `/api/games/${encodeURIComponent(g.slug)}`, body).then(() => reloadAll(g.slug));

function openWork(g) {
  const rows = store.tasks.filter((t) => t.game === g.slug && ['queued', 'working', 'review'].includes(t.state));
  const order = { working: 0, review: 1, queued: 2 };
  rows.sort((a, b) => order[a.state] - order[b.state]);
  return h('section', { class: 'pg-card' },
    h('h3', {}, `Open work (${rows.length})`),
    rows.length ? h('div', { class: 'pg-work' }, rows.map((t) => h('div', { class: 'pg-work-row' },
      h('div', { class: 'row gap', style: 'min-width:0' }, avatar(t.role, 24), h('a', { class: 'title', href: '#/tasks', title: t.title }, t.title),
        h('span', { class: 'muted nowrap' }, roleLabel(t.role))),
      statePill(t.state)))) : h('p', { class: 'muted' }, 'Nothing open for this game. Ask the Lead to plan the next step.'));
}

function todoCard(g) {
  const todos = g.todos || [];
  return h('section', { class: 'pg-card' },
    h('h3', {}, `On your to-do list (${todos.length})`),
    todos.length ? h('ul', { class: 'pg-list' }, todos.map((a) => h('li', {},
      chip(a.kind === 'try' ? 'try it' : a.kind, 'warn'), h('span', {}, a.title), h('a', { href: '#/review' }, 'Open in Review'))))
      : h('p', { class: 'muted' }, 'Nothing is waiting on you for this game.'));
}

function overview(g) {
  const cl = g.changelog;
  const si = stageIdx(g.stage);
  const nextStage = STAGES[si + 1];
  return h('div', { class: 'stack' },
    h('div', { class: 'pg-grid2' },
      h('section', { class: 'pg-card' },
        h('div', { class: 'row gap wrap' }, h('h3', {}, 'Version ', h('span', { class: 'pg-ver' }, 'v' + (g.version ?? 1))), chip(stageName(g.stage), 'accent'),
          g.versionType ? chip(g.versionType) : null, h('span', { class: 'muted push' }, g.updatedAt ? 'updated ' + ago(g.updatedAt) + (ago(g.updatedAt) === 'just now' ? '' : ' ago') : '')),
        editableText('Next step', g.nextStep, (v) => patchGame(g, { nextStep: v }), { placeholder: 'Not set' }),
        editableText('Note', g.note, (v) => patchGame(g, { note: v }), { multiline: true, placeholder: 'Add a note for the team' }),
        nextStage ? h('p', { class: 'pg-note' }, `Next stage: ${nextStage.name} (${nextStage.owner}). Agents ask for it with a stage request; you decide in Review.`) : null),
      h('section', { class: 'pg-card' },
        h('h3', {}, `What's new in v${g.version ?? 1}`),
        cl && (cl.heading || (cl.bullets || []).length) ? h('div', { class: 'stack sm' },
          cl.heading ? h('strong', {}, cl.heading) : null,
          h('ul', { class: 'pg-bullets' }, (cl.bullets || []).map((b) => h('li', {}, b))))
          : h('p', { class: 'muted' }, 'No changelog yet. The Producer fills this in when a version ships.'))),
    h('div', { class: 'pg-grid2' }, openWork(g), todoCard(g)));
}

// ---------- live numbers ----------
const TARGETS = [
  { key: 'likeRatio', label: 'Like ratio', target: '>80%', test: (v) => v >= 0.8, fmt: (v) => Math.round(v * 100) + '%' },
  { key: 'd1', label: 'Day-1 retention', target: '12 to 15%', test: (v) => v >= 12, fmt: (v) => v + '%' },
  { key: 'd7', label: 'Day-7 retention', target: '2 to 3%', test: (v) => v >= 2, fmt: (v) => v + '%' },
  { key: 'avgSessionMin', label: 'Average session', target: '>10 min', test: (v) => v >= 10, fmt: (v) => v + ' min' },
  { key: 'payingPct', label: 'Paying players', target: '~2%', test: (v) => v >= 2, fmt: (v) => v + '%' },
  { key: 'firstMinute', label: 'Still playing after minute 1', target: 'higher is better', test: null, fmt: (v) => v + '%' },
];

function metricTiles(live, g) {
  const m = live.metrics || {};
  const latest = live.latest;
  const up = latest?.up; const down = latest?.down;
  const likeFromVotes = up != null && up + down > 0 ? up / (up + down) : null;
  const tiles = [
    tile('Players now', latest ? num(latest.playing) : null, latest ? 'as of ' + ago(latest.at) + (ago(latest.at) === 'just now' ? '' : ' ago') : (g.universeId ? 'press Refresh' : 'needs a universe id')),
    tile('Visits', latest ? num(latest.visits) : null),
    tile('Favorites', latest ? num(latest.favorites) : null),
  ];
  for (const t of TARGETS) {
    const v = t.key === 'likeRatio' ? (m.likeRatio ?? likeFromVotes) : m[t.key];
    const tgt = `target ${t.target}`;
    const ok = v != null && t.test ? t.test(v) : null;
    tiles.push(tile(t.label, v == null ? null : t.fmt(v), tgt, ok == null ? null : ok ? 'ok' : 'warn'));
  }
  return h('div', { class: 'pg-tiles' }, tiles);
}

const seriesPts = (series, key) => (series || []).map((r) => ({ x: new Date(r.at), y: r[key] }));

function chartsFor(live, g) {
  const series = live.series || [];
  const items = [['trends', 'Trends'], ['leave', 'Where players leave'], ['money', 'Sessions, money and errors'], ['bench', 'Benchmarks'], ['fixes', 'Fixes and reports']];
  const m = live.metrics || {};
  let body;
  if (chartTab === 'trends') {
    body = h('div', { class: 'pg-grid2' },
      lineChart('Players', seriesPts(series, 'playing')),
      lineChart('Visits', seriesPts(series, 'visits')),
      lineChart('Favorites', seriesPts(series, 'favorites')),
      lineChart('Like ratio', (series || []).map((r) => ({ x: new Date(r.at), y: r.up + r.down ? (r.up / (r.up + r.down)) * 100 : null })), { unit: '%', target: 80 }));
  } else if (chartTab === 'leave') {
    body = m.firstMinute != null || m.d1 != null ? h('div', { class: 'pg-tiles' },
      tile('Still playing after minute 1', m.firstMinute != null ? m.firstMinute + '%' : null),
      tile('Back the next day', m.d1 != null ? m.d1 + '%' : null, 'target 12 to 15%'),
      tile('Back after a week', m.d7 != null ? m.d7 + '%' : null, 'target 2 to 3%'))
      : empty('No retention numbers yet. Live ops records them with hq_metric once the game has players.');
  } else if (chartTab === 'money') {
    body = m.avgSessionMin != null || m.payingPct != null ? h('div', { class: 'pg-tiles' },
      tile('Average session', m.avgSessionMin != null ? m.avgSessionMin + ' min' : null, 'target >10 min'),
      tile('Paying players', m.payingPct != null ? m.payingPct + '%' : null, 'target ~2%'))
      : empty('No session or money numbers yet. They are not public on Roblox, so Live ops records them from the creator dashboard.');
  } else if (chartTab === 'bench') {
    body = h('div', { class: 'pg-scroll' }, h('table', { class: 'pg-tbl' },
      h('thead', {}, h('tr', {}, ['Measure', 'Target', 'Now', 'Status'].map((c, i) => h('th', { class: i === 2 ? 'num' : '' }, c)))),
      h('tbody', {}, TARGETS.filter((t) => t.test).map((t) => {
        const v = t.key === 'likeRatio' ? (m.likeRatio ?? (live.latest && live.latest.up + live.latest.down ? live.latest.up / (live.latest.up + live.latest.down) : null)) : m[t.key];
        return h('tr', {}, h('td', {}, t.label), h('td', {}, t.target), h('td', { class: 'num' }, v == null ? 'not measured' : t.fmt(v)),
          h('td', {}, v == null ? chip('not measured') : t.test(v) ? chip('on target', 'ok') : chip('below target', 'warn')));
      }))));
  } else {
    const fixes = store.tasks.filter((t) => t.game === g.slug && t.role === 'liveops');
    body = h('div', { class: 'stack' },
      (live.attention || []).length ? h('ul', { class: 'pg-list' }, live.attention.map((a) => h('li', {}, chip(a.state, a.state === 'open' ? 'warn' : null), h('span', {}, a.title), a.why ? h('span', { class: 'muted' }, a.why) : null))) : null,
      fixes.length ? h('div', { class: 'pg-work' }, fixes.slice(0, 12).map((t) => h('div', { class: 'pg-work-row' }, h('span', { class: 'title' }, t.title), statePill(t.state)))) : null,
      !(live.attention || []).length && !fixes.length ? empty('No reports yet. Ask Live ops to read the numbers once the game is public.') : null);
  }
  return h('div', { class: 'stack' }, segmented(items, chartTab, (id) => { chartTab = id; notify(); }), body);
}

function liveTab(g) {
  const c = liveCache[g.slug];
  if (!c || !c.data) { loadLive(g.slug); return empty('Loading live numbers'); }
  const live = c.data;
  const all = gamesList || [];
  const attention = live.attention || [];
  const board = [
    ['Ready to publish', all.filter((x) => x.stage === 'ready').length],
    ['Live', all.filter((x) => x.stage === 'live').length],
    ['Graded', all.filter((x) => x.stage === 'graded').length],
    ['To look at', attention.length],
  ];
  const uid = h('input', { class: 'pg-input', value: g.universeId || '', placeholder: 'Universe id', inputmode: 'numeric', 'aria-label': 'Universe id', maxlength: 20 });
  let busy = false;
  const refresh = async (b) => {
    if (busy) return; busy = true; b.disabled = true;
    const v = uid.value.trim();
    if (v && v !== String(g.universeId || '')) {
      if (!/^\d{1,20}$/.test(v)) { toast('The universe id is digits only', 'error'); busy = false; b.disabled = false; return; }
      if (!await act(() => api('PATCH', `/api/games/${encodeURIComponent(g.slug)}`, { universeId: v }))) { busy = false; b.disabled = false; return; }
    }
    await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/live/refresh`, {}), 'Live numbers refreshed');
    await reloadAll(g.slug);
    busy = false; b.disabled = false;
  };
  const rb = h('button', { type: 'button', class: 'btn primary', onclick: (e) => refresh(e.currentTarget) }, ic('refresh', 14), 'Refresh');
  return h('div', { class: 'stack' },
    h('div', { class: 'pg-tiles' }, board.map(([k, v]) => h('div', { class: 'pg-tile sm' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v)))),
    h('section', { class: 'pg-card' },
      h('div', { class: 'row gap wrap' },
        h('label', { class: 'row gap' }, h('span', { class: 'muted' }, 'Universe id'), uid), rb,
        h('span', { class: 'muted' }, live.latest ? 'Last reading ' + fmtTime(live.latest.at) : 'No reading yet')),
      g.universeId ? null : h('p', { class: 'pg-note' }, 'The game is not public yet, so there is nothing to read. After you publish it yourself, paste its universe id here and press Refresh. Until then every number below stays "not measured".')),
    attention.length ? h('section', { class: 'pg-card' }, h('h3', {}, 'Brought to your attention'),
      h('ul', { class: 'pg-list' }, attention.map((a) => h('li', {}, chip(a.kind, 'warn'), h('strong', {}, a.title), a.why ? h('span', { class: 'muted' }, a.why) : null, h('a', { href: '#/review' }, 'Open'))))) : null,
    metricTiles(live, g),
    chartsFor(live, g));
}

// ---------- pipeline ----------
function stageRequestsFor(g) { return (reqCache.rows || []).filter((r) => r.game === g.slug); }

function decideRequest(r, state, g) {
  return act(() => api('POST', `/api/stage-requests/${encodeURIComponent(r.id)}/decide`, { state }), state === 'approved' ? 'Stage approved' : 'Request rejected').then(() => reloadAll(g.slug));
}

function drawerForGame(g) {
  const reqs = stageRequestsFor(g).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const body = h('div', { class: 'stack' },
    h('div', { class: 'row gap wrap' }, chip(stageName(g.stage), 'accent'), h('span', { class: 'muted' }, 'v' + (g.version ?? 1))),
    h('p', {}, g.nextStep ? 'Next: ' + g.nextStep : 'No next step set.'),
    h('h4', {}, 'Stage history and requests'),
    reqs.length ? h('ul', { class: 'pg-hist' }, reqs.map((r) => h('li', {},
      h('div', { class: 'row gap wrap' }, h('strong', {}, `${stageName(r.fromStage)} to ${stageName(r.toStage)}`), chip(r.state, r.state === 'approved' ? 'ok' : r.state === 'rejected' ? 'err' : 'warn')),
      h('span', { class: 'muted' }, `${roleLabel(r.role)} asked ${ago(r.createdAt)}${ago(r.createdAt) === 'just now' ? '' : ' ago'}`),
      r.evidence ? h('p', { class: 'pre' }, r.evidence) : null,
      r.state === 'open' ? h('div', { class: 'row gap' }, btn('Approve', () => decideRequest(r, 'approved', g), { kind: 'primary sm', icon: 'check' }), btn('Reject', () => decideRequest(r, 'rejected', g), { kind: 'sm' })) : null)))
      : h('p', { class: 'muted' }, 'No stage requests yet. When a role thinks the game is ready for the next stage it asks here.'),
    g.stage === 'ready' ? h('div', { class: 'pg-foot' },
      h('p', { class: 'pg-note' }, 'Only you publish. After publishing the game yourself in Roblox, mark it live here.'),
      btn('Mark live (I published it)', async () => {
        if (!confirm(`Mark ${g.name} as live? Do this only after you published it yourself.`)) return;
        await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/mark-live`, {}), 'Marked live');
        await reloadAll(g.slug);
      }, { kind: 'primary' })) : null);
  openDrawer(g.name, body);
}

function pipeline(g) {
  if (!reqCache.rows) { loadRequests(); }
  const reqs = stageRequestsFor(g).filter((r) => r.state === 'open');
  const tasks = store.tasks.filter((t) => t.game === g.slug && ['queued', 'working', 'review'].includes(t.state));
  const cur = stageIdx(g.stage);
  return h('div', { class: 'stack' },
    h('p', { class: 'pg-note' }, 'Each column is a stage and the role that owns it. The game card sits in its current stage. Open stage requests (a role asking to move on) and open tasks show in the column they belong to. Only the next stage can be requested, and "Live" is yours alone.'),
    h('div', { class: 'pg-board' }, STAGES.map((s, i) => {
      const cards = [];
      if (s.id === g.stage) {
        cards.push(h('button', { type: 'button', class: 'pg-pcard', 'data-kind': 'game', onclick: () => drawerForGame(g) },
          h('span', { class: 't' }, g.name), h('span', { class: 'm' }, chip('here now', 'accent'), 'v' + (g.version ?? 1), g.updatedAt ? 'updated ' + ago(g.updatedAt) : ''),
          h('span', { class: 'm' }, i < STAGES.length - 1 ? 'Next role: ' + STAGES[i + 1].owner : 'Last stage')));
      }
      for (const r of reqs.filter((r) => r.fromStage === s.id)) {
        cards.push(h('button', { type: 'button', class: 'pg-pcard', 'data-kind': 'request', onclick: () => drawerForGame(g) },
          h('span', { class: 't' }, `Ready for ${stageName(r.toStage)}?`), h('span', { class: 'm' }, chip('waiting for you', 'warn'), roleLabel(r.role), ago(r.createdAt))));
      }
      for (const t of tasks.filter((t) => stageOfRole(t.role) === s.id)) {
        cards.push(h('button', { type: 'button', class: 'pg-pcard', onclick: () => drawerForGame(g) },
          h('span', { class: 't' }, t.title), h('span', { class: 'm' }, statePill(t.state), roleLabel(t.role), ago(t.createdAt))));
      }
      return h('section', { class: 'pg-col', 'data-current': String(s.id === g.stage), 'aria-label': s.name },
        h('div', { class: 'pg-col-head' }, h('span', { class: 'n' }, s.name, h('span', { class: 'pg-count' }, cards.length)), h('span', { class: 'o' }, s.owner)),
        h('div', { class: 'pg-col-body' }, cards.length ? cards : h('span', { class: 'pg-col-empty' }, i < cur ? 'Done' : 'Nothing here')));
    })));
}

// ---------- page ----------
function addGame() {
  const name = h('input', { class: 'pg-input', placeholder: 'Run a ___', maxlength: 80 });
  const id = h('input', { class: 'pg-input', placeholder: 'short-id', maxlength: 40 });
  let close;
  const form = h('form', { class: 'pg-form', onsubmit: async (e) => {
    e.preventDefault();
    const n = name.value.trim(); const s = (id.value.trim() || n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!n || !s) { toast('Give the game a name', 'error'); return; }
    if (await act(() => api('POST', '/api/games', { slug: s, name: n }), 'Game added')) { slug = s; tab = 'overview'; close(); await loadGames(true); }
  } },
  field('Name', name), field('Short id', id, 'Letters, numbers and dashes. Leave empty to build it from the name.'),
  h('div', { class: 'row gap end' }, btn('Add game', null, { kind: 'primary' })));
  form.querySelector('button').type = 'submit';
  close = openModal('Add a game', form);
}

export function render(param) {
  loadGames();
  if (!reqCache.rows) loadRequests();
  const list = gamesList || (store.games || []).map((g) => ({ ...g, stage: 'built', version: 1 }));
  if (param && list.some((g) => g.slug === param)) slug = param;
  if (!list.some((g) => g.slug === slug)) slug = list[0]?.slug || '';
  const g = list.find((x) => x.slug === slug);
  const head = pageHead('Games', 'Where each game is, how it is doing, and what stands between it and the next stage.', btn('Add game', addGame, { icon: 'plus' }));
  if (!g) return h('div', { class: 'page' }, head, empty(gamesList ? 'No games yet.' : 'Loading'));
  const items = [['overview', 'Overview'], ['live', 'Live numbers'], ['pipeline', 'Pipeline']];
  const open = store.tasks.filter((t) => t.game === g.slug && ['queued', 'working', 'review'].includes(t.state)).length;
  return h('div', { class: 'page' }, head,
    list.length > 1 ? h('div', { class: 'pg-gametabs', role: 'tablist', 'aria-label': 'Games' }, list.map((x) => h('button', { type: 'button', role: 'tab', class: 'pg-gametab', 'aria-selected': String(x.slug === slug),
      onclick: () => { slug = x.slug; location.hash = '#/games/' + x.slug; notify(); } }, x.name))) : h('h2', {}, g.name),
    segmented(items, tab, (id) => { tab = id; notify(); }, { overview: open }),
    tab === 'overview' ? overview(g) : tab === 'live' ? liveTab(g) : pipeline(g));
}

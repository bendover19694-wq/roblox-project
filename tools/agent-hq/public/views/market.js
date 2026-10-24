// Market: 1 charts, 2 corpus, 3 benchmarks, 4 breakouts.
import { h, ic, store, api, act, btn, empty, pageHead, ago, fmtTime, notify, toast } from './core.js';
import { chip, segmented, num } from './games.js';

let step = 'charts';
let sel = '';
let refreshing = false;
const data = { market: undefined, corpus: undefined, benchmarks: undefined, breakouts: undefined };
const busy = new Set();

const rowsOf = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);

async function load(key, path, shape) {
  if (busy.has(key)) return;
  busy.add(key);
  try { data[key] = shape(await api('GET', path)); } catch (e) { toast(e.message, 'error'); data[key] = data[key] === undefined ? null : data[key]; }
  busy.delete(key);
  notify();
}
const loaders = {
  market: () => load('market', '/api/market', (r) => (r && (r.latest || r.sorts) ? r : null)),
  corpus: () => load('corpus', '/api/market/corpus', (r) => rowsOf(r, 'games', 'rows')),
  benchmarks: () => load('benchmarks', '/api/market/benchmarks', (r) => rowsOf(r, 'rows', 'benchmarks')),
  breakouts: () => load('breakouts', '/api/market/breakouts', (r) => ({ rows: rowsOf(r, 'rows', 'breakouts'), at: r?.at || null })),
};
const need = (key) => { if (data[key] === undefined) { loaders[key](); return true; } return false; };

async function refresh() {
  refreshing = true; notify();
  const r = await act(() => api('POST', '/api/market/refresh'), 'Charts refreshed');
  if (r) await Promise.all([loaders.market(), loaders.breakouts()]);
  refreshing = false; notify();
}

function askScout(name, id, sortName) {
  return act(() => api('POST', '/api/tasks', {
    role: 'scout', title: `Study ${name}`.slice(0, 200),
    body: `Look at "${name}"${id ? ` (universe ${id})` : ''}${sortName ? ` from the "${sortName}" chart` : ''}. What makes it work, and could we make a Mild, original take on the pattern? Cite evidence.`,
    createdBy: 'owner',
  }), 'Scout is on it');
}

const when = (iso) => (iso ? `${ago(iso)}${ago(iso) === 'just now' ? '' : ' ago'}` : 'never');
function delta(v, { pct = false, flip = false } = {}) {
  if (v == null || Number.isNaN(Number(v))) return h('span', { class: 'pg-flat' }, 'new');
  const n = Number(v);
  if (n === 0) return h('span', { class: 'pg-flat' }, '0');
  const good = flip ? n < 0 : n > 0;
  const body = (n > 0 ? '+' : '') + (pct ? n.toFixed(1) + '%' : n.toLocaleString());
  return h('span', { class: good ? 'pg-up' : 'pg-down' }, body);
}
const th = (cols) => h('thead', {}, h('tr', {}, cols.map(([c, numeric]) => h('th', { class: numeric ? 'num' : '', scope: 'col' }, c))));
const likeText = (r) => (r.likePct != null ? Math.round(r.likePct <= 1 ? r.likePct * 100 : r.likePct) + '%' : r.up != null && r.up + r.down ? Math.round((r.up / (r.up + r.down)) * 100) + '%' : 'n/a');

// ---- 1 charts ----
function chartRows(m, sortId) {
  const fromVel = m.velocity?.perSort?.[sortId];
  if (Array.isArray(fromVel) && fromVel.length) return fromVel;
  const s = m.latest?.sorts?.find((x) => x.id === sortId);
  return (s?.games || []).map((g, i) => ({ rank: i + 1, name: g.name, universeId: g.universeId, players: g.playerCount, up: g.up, down: g.down, votes: (g.up || 0) + (g.down || 0) }));
}

function chartsStep() {
  if (need('market')) return empty('Loading charts');
  const m = data.market;
  if (!m || !m.latest) return empty('No chart data yet. Press Refresh to fetch the Roblox charts.');
  const sorts = (m.sorts && m.sorts.length ? m.sorts : m.latest.sorts.map((s) => ({ id: s.id, name: s.name, count: s.games.length })));
  if (!sorts.some((s) => s.id === sel)) sel = sorts[0]?.id || '';
  const cur = sorts.find((s) => s.id === sel);
  const rows = sel ? chartRows(m, sel) : [];
  const allMoves = m.velocity?.moves || [];
  const rankMoves = allMoves.filter((v) => v.rankDelta);
  const byPlayers = !rankMoves.length;
  const moves = (byPlayers ? [...allMoves].sort((a, b) => Math.abs(b.playersDelta || 0) - Math.abs(a.playersDelta || 0)) : rankMoves).slice(0, 8);
  const hasPrev = !!m.previous;
  return h('div', { class: 'stack' },
    hasPrev ? h('section', { class: 'stack sm' }, h('h3', {}, byPlayers ? 'Biggest player swings' : 'Biggest rank moves'),
      h('p', { class: 'pg-note' }, `Between the snapshots from ${fmtTime(m.previous.fetchedAt)} and ${fmtTime(m.latest.fetchedAt)}.`),
      (byPlayers ? h('p', { class: 'pg-note' }, 'No game changed rank between these snapshots, so these are the biggest changes in player count instead.') : null),
      moves.length ? h('div', { class: 'pg-movers' }, moves.map((v) => h('div', { class: 'pg-mover' },
        h('span', { class: 'n', title: v.name }, v.name),
        h('span', { class: 'd' }, v.rankDelta ? [delta(v.rankDelta), ' places in '] : 'same rank in ', v.sortName || v.sort, v.playersDelta != null ? [' · players ', delta(v.playersDelta)] : null))))
        : h('p', { class: 'muted' }, 'No rank changes between the two snapshots.'))
      : h('p', { class: 'pg-note' }, 'Only one snapshot so far. Refresh again later to see who is climbing and who is falling.'),
    segmented(sorts.map((s) => [s.id, s.name]), sel, (id) => { sel = id; notify(); }, Object.fromEntries(sorts.map((s) => [s.id, s.count]))),
    rows.length ? h('div', { class: 'pg-scroll' }, h('table', { class: 'pg-tbl' },
      th([['#', true], ['Rank change', true], ['Game'], ['Playing', true], ['Change', true], ['Change %', true], ['Likes', true], ['Votes', true], ['On lists', true], ['Universe'], ['']]),
      h('tbody', {}, rows.map((r, i) => h('tr', {},
        h('td', { class: 'num muted' }, r.rank ?? i + 1),
        h('td', { class: 'num' }, hasPrev ? delta(r.rankDelta) : h('span', { class: 'pg-flat' }, 'n/a')),
        h('td', { class: 'wrapc' }, r.name),
        h('td', { class: 'num' }, num(r.players ?? r.playing ?? r.playerCount)),
        h('td', { class: 'num' }, hasPrev ? delta(r.playersDelta) : h('span', { class: 'pg-flat' }, 'n/a')),
        h('td', { class: 'num' }, hasPrev ? delta(r.playersPct, { pct: true }) : h('span', { class: 'pg-flat' }, 'n/a')),
        h('td', { class: 'num' }, likeText(r)),
        h('td', { class: 'num' }, num(r.votes)),
        h('td', { class: 'num' }, r.sortsCount ?? 'n/a'),
        h('td', { class: 'mono muted' }, r.universeId ?? ''),
        h('td', { class: 'end-text' }, btn('Ask scout', () => askScout(r.name, r.universeId, cur?.name), { kind: 'sm', title: 'Ask the Scout about this game' }))))))) : empty('No games in this list.'),
    h('div', { class: 'pg-foot' },
      h('p', { class: 'pg-note' }, 'Likes is the share of all votes that are thumbs up. Roblox tends to recommend games that hold 80% or more, so treat a lower number as a warning sign. Votes is the total count behind that share; a small count makes the share noisy.'),
      h('p', { class: 'pg-note' }, 'On lists is how many of the chart lists the game appears in at once. A game on many lists is being pushed by several signals, not just one. Rank change and the two change columns compare this snapshot with the one before it, so they only mean something after at least two refreshes.')));
}

// ---- 2 corpus ----
function corpusStep() {
  if (need('corpus')) return empty('Loading reference games');
  const list = data.corpus || [];
  const input = h('input', { class: 'pg-input', placeholder: 'Universe id', inputmode: 'numeric', maxlength: 20, 'aria-label': 'Universe id' });
  const add = async () => {
    const v = input.value.trim();
    if (!/^\d{1,20}$/.test(v)) { toast('A universe id is digits only', 'error'); return; }
    if (await act(() => api('POST', '/api/market/corpus', { universeId: v }), 'Added to the reference set')) { input.value = ''; await loaders.corpus(); }
  };
  const safe = (u) => (/^https:\/\//i.test(u || '') ? u : '');
  return h('div', { class: 'stack' },
    h('p', { class: 'pg-note' }, 'Games we study as references: what they look like and how they present themselves. Add any game by its universe id (the number from its Roblox page API or creator page).'),
    h('div', { class: 'row gap wrap' }, input, btn('Add game', add, { kind: 'primary', icon: 'plus' })),
    list.length ? h('div', { class: 'pg-corpus' }, list.map((g) => h('article', { class: 'pg-game' },
      safe(g.thumbnail) ? h('img', { class: 'thumb', src: safe(g.thumbnail), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('div', { class: 'thumb' }),
      h('div', { class: 'info' },
        h('div', { class: 'row1' }, safe(g.icon) ? h('img', { class: 'icon', src: safe(g.icon), alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: 'icon' }), h('span', { class: 'nm', title: g.name }, g.name || 'Game ' + g.universeId)),
        h('span', { class: 'muted mono' }, g.universeId),
        h('div', { class: 'row gap' },
          btn('Ask scout', () => askScout(g.name || g.universeId, g.universeId), { kind: 'sm' }),
          btn('Remove', async () => { if (await act(() => api('DELETE', `/api/market/corpus/${encodeURIComponent(g.universeId)}`), 'Removed')) await loaders.corpus(); }, { kind: 'sm', icon: 'trash' })))))) : empty('No reference games yet. Add one above.'));
}

// ---- 3 benchmarks ----
function benchStep() {
  if (need('benchmarks')) return empty('Loading benchmarks');
  const rows = data.benchmarks || [];
  if (!rows.length) return empty('No benchmarks found.');
  const tone = (t) => ({ gate: 'warn', health: 'accent' }[t] || null);
  return h('div', { class: 'stack' },
    h('p', { class: 'pg-note' }, 'The numbers a game should hit, where each one is measured, and what a miss tells you. A gate must pass before a stage moves on, health numbers show how the game is doing once it has players, and watch items are signals to keep an eye on. The evidence column says whether a number is documented or only a creator rule of thumb.'),
    h('div', { class: 'pg-scroll' }, h('table', { class: 'pg-tbl' },
      th([['Benchmark'], ['Target'], ['Measured by'], ['Tier'], ['If it fails'], ['Source and evidence']]),
      h('tbody', {}, rows.map((r) => h('tr', {},
        h('td', { class: 'wrapc' }, h('strong', {}, r.benchmark)), h('td', { class: 'wrapc' }, r.target), h('td', { class: 'wrapc' }, r.measuredBy),
        h('td', {}, r.tier ? chip(r.tier, tone(r.tier)) : ''), h('td', { class: 'wrapc' }, r.failureMeaning),
        h('td', { class: 'wrapc muted' }, r.source, r.label ? h('div', {}, r.label) : null)))))));
}

// ---- 4 breakouts ----
function breakStep() {
  if (need('breakouts')) return empty('Loading breakouts');
  const b = data.breakouts || { rows: [], at: null };
  return h('div', { class: 'stack' },
    h('p', { class: 'pg-note' }, 'Young games that are growing fast: under 300,000 visits, over 500 players right now, and new or first seen in the last 7 days. Players per 1K visits shows how sticky the game is (higher means players stay). Growth is the latest player count divided by the earliest one we saw.'),
    b.at ? h('p', { class: 'muted' }, 'Computed ' + when(b.at)) : null,
    b.rows.length ? h('div', { class: 'pg-scroll' }, h('table', { class: 'pg-tbl' },
      th([['Game'], ['Playing', true], ['Peak', true], ['Visits', true], ['Age (days)', true], ['Players per 1K visits', true], ['Growth', true], ['Likes', true], ['Genre'], ['First seen'], ['']]),
      h('tbody', {}, b.rows.map((r) => h('tr', {},
        h('td', { class: 'wrapc' }, r.name), h('td', { class: 'num' }, num(r.playing)), h('td', { class: 'num' }, num(r.peak)), h('td', { class: 'num' }, num(r.visits)),
        h('td', { class: 'num' }, r.ageDays ?? 'n/a'), h('td', { class: 'num' }, r.perThousandVisits != null ? Number(r.perThousandVisits).toFixed(1) : 'n/a'),
        h('td', { class: 'num' }, r.growth != null ? Number(r.growth).toFixed(2) + 'x' : 'n/a'), h('td', { class: 'num' }, r.likePct != null ? Math.round(r.likePct <= 1 ? r.likePct * 100 : r.likePct) + '%' : 'n/a'),
        h('td', { class: 'muted' }, r.genre || ''), h('td', { class: 'muted' }, r.firstSeen ? fmtTime(r.firstSeen) : ''),
        h('td', { class: 'end-text' }, btn('Ask scout', () => askScout(r.name, r.universeId), { kind: 'sm' }))))))) : empty('No breakouts yet. They appear after the charts have been refreshed a few times.'));
}

export function render() {
  if (step !== 'breakouts') need('breakouts');
  if (step !== 'charts') need('market');
  const items = [['charts', '1 · Charts'], ['corpus', '2 · Corpus'], ['benchmarks', '3 · Benchmarks'], ['breakouts', '4 · Breakouts']];
  const fetched = data.market?.latest?.fetchedAt;
  const sub = `Charts ${fetched ? when(fetched) : 'not fetched yet'} · breakouts ${data.breakouts?.at ? when(data.breakouts.at) : 'not computed yet'}. All public Roblox data.`;
  return h('div', { class: 'page' },
    pageHead('Market', sub, btn(refreshing ? 'Refreshing' : 'Refresh', refresh, { icon: 'refresh', disabled: refreshing })),
    segmented(items, step, (id) => { step = id; notify(); }),
    step === 'charts' ? chartsStep() : step === 'corpus' ? corpusStep() : step === 'benchmarks' ? benchStep() : breakStep());
}

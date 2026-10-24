// Games > Live numbers: connect form, live strip, daily tiles, charts, "where players leave", fix ledger.
// Data comes from GET /api/games/:slug/live: {latest, series, metrics, targets, attention, view}. Every number can be null: render "not measured".
import { h, ic, store, api, act, btn, empty, statePill, roleLabel, ago, fmtTime, notify, toast, field } from './core.js';
import { chip, tile, segmented, num, lineChart, multiLine, columnChart, hbars, emptyChart } from './charts.js';

const when = (iso) => (iso ? `${ago(iso)}${ago(iso) === 'just now' ? '' : ' ago'}` : '');
const fix1 = (n) => (n == null || Number.isNaN(Number(n)) ? null : String(Math.round(Number(n) * 10) / 10));
const maybe = (n, f = num) => (n == null ? null : f(n));

export const TARGETS = [
  { key: 'likeRatio', label: 'Like ratio', target: '>80%', test: (v) => v >= 0.8, fmt: (v) => Math.round(v * 100) + '%' },
  { key: 'd1', label: 'Day-1 retention', target: '12 to 15%', test: (v) => v >= 12, fmt: (v) => v + '%' },
  { key: 'd7', label: 'Day-7 retention', target: '2 to 3%', test: (v) => v >= 2, fmt: (v) => v + '%' },
  { key: 'avgSessionMin', label: 'Average session', target: '>10 min', test: (v) => v >= 10, fmt: (v) => v + ' min' },
  { key: 'payingPct', label: 'Paying players', target: '~2%', test: (v) => v >= 2, fmt: (v) => v + '%' },
  { key: 'firstMinute', label: 'Left in the first minute', target: 'lower is better', test: null, fmt: (v) => v + '%' },
];
const TEST = Object.fromEntries(TARGETS.map((t) => [t.key, t]));

// ---------- connect ----------
function connectCard(g, reload) {
  const configured = !!store.settings.openCloud?.configured;
  let editing = !configured;
  const box = h('section', { class: 'pg-card' });
  const draw = () => {
    box.replaceChildren(h('h3', {}, 'Connect live numbers', configured ? chip('connected', 'ok') : chip('not connected')));
    box.append(h('p', { class: 'pg-note' }, 'The game reports counts to a DataStore named HQStats. HQ reads it with a Roblox Open Cloud API key. Create the key in the Creator Hub for this experience with DataStore read permission for HQStats only (no write, no other permissions). The key stays on this computer and is never shown again.'));
    if (!editing) { box.append(h('div', { class: 'row gap' }, btn('Change the key', () => { editing = true; draw(); }, { kind: 'sm' }))); return; }
    const key = h('input', { class: 'pg-input', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: configured ? 'Paste a new key to replace the saved one' : 'Open Cloud API key', maxlength: 500, 'aria-label': 'Open Cloud API key' });
    const uid = h('input', { class: 'pg-input', value: g.universeId || '', placeholder: 'Universe id', inputmode: 'numeric', maxlength: 20, 'aria-label': 'Universe id' });
    box.append(h('form', { class: 'pg-form', onsubmit: async (e) => {
      e.preventDefault();
      const apiKey = key.value.trim(); const universeId = uid.value.trim();
      if (!apiKey || !/^\d{1,20}$/.test(universeId)) { toast('Paste the key and a numeric universe id', 'error'); return; }
      const ok = await act(() => api('POST', '/api/settings', { key: 'openCloud', value: { apiKey, universeId } }), 'Saved. Fetching live numbers');
      key.value = '';
      if (!ok) return;
      if (universeId !== String(g.universeId || '')) await act(() => api('PATCH', `/api/games/${encodeURIComponent(g.slug)}`, { universeId }));
      editing = false;
      await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/live/refresh`, {}));
      await reload();
    } },
    h('div', { class: 'pg-grid2' }, field('API key', key), field('Universe id', uid)),
    h('div', { class: 'row gap' }, btn('Save and fetch', null, { kind: 'primary' }), configured ? btn('Cancel', () => { editing = false; draw(); }, { kind: 'sm' }) : null)));
    box.querySelector('form button').type = 'submit';
  };
  draw();
  return box;
}

// ---------- strip and tiles ----------
function strip(view) {
  const l = view?.live;
  if (!l) return null;
  const versions = (l.versions || []).map((v) => `v${v.version}: ${v.players}`).join(', ');
  return h('section', { class: 'stack sm' },
    h('div', { class: 'row gap wrap' }, h('h3', {}, 'Live now'), l.at ? h('span', { class: 'muted' }, 'reported ' + when(l.at)) : null, l.stale ? chip('older than 5 minutes', 'warn') : null),
    h('div', { class: 'pg-tiles' },
      tile('Playing now', maybe(l.playing)), tile('Servers', maybe(l.servers)),
      tile('Slowest server', l.slowestServer ? `${fix1(l.slowestServer.fps)} fps` : null, l.slowestServer ? 'server ' + String(l.slowestServer.id).slice(0, 8) : null),
      tile('Worst ping', l.worstPingMs != null ? Math.round(l.worstPingMs) + ' ms' : null), tile('Peak, 24 hours', maybe(l.peak24h)),
      tile('Joins, 24 hours', maybe(l.joins24h)), tile('Joins, last hour', maybe(l.joinsLastHour)), tile('Leaves, last hour', maybe(l.leavesLastHour)),
      tile('Left in minute 1', l.firstMinuteBouncePct != null ? fix1(l.firstMinuteBouncePct) + '%' : null, 'lower is better'),
      tile('Robux, last hour', maybe(l.robuxLastHour), 'Robux spent in the game'), tile('Errors, last hour', maybe(l.errorsLastHour), null, l.errorsLastHour > 0 ? 'warn' : null),
      tile('Versions running', versions || null)));
}

function dailyTiles(live, g) {
  const view = live.stats || live.view || null;
  const m = { ...(live.metrics || {}), ...(view?.metrics || {}) };
  const latest = live.latest;
  const votes = latest && latest.up + latest.down > 0 ? latest.up / (latest.up + latest.down) : null;
  const like = m.likeRatio ?? votes;
  const tiles = [
    tile('Players at last fetch', latest ? num(latest.playing) : null, latest ? 'Roblox public data, ' + when(latest.at) : (g.universeId ? 'press Refresh' : 'needs a universe id')),
    tile('Visits', latest ? num(latest.visits) : null, 'Roblox public data'),
    tile('Like ratio', like == null ? null : Math.round(like * 100) + '%', 'Roblox public data · target >80%', like == null ? null : like >= 0.8 ? 'ok' : 'warn'),
  ];
  const fromView = view?.tiles;
  const order = ['d1', 'd7', 'avgSessionMin', 'payingPct', 'firstMinute'];
  for (const key of order) {
    const t = TEST[key];
    const vt = (fromView || []).find((x) => x.id === key);
    const v = vt && vt.value != null ? vt.value : m[key];
    const unit = vt?.unit ?? (key === 'avgSessionMin' ? 'min' : '%');
    const ok = v != null && t.test ? t.test(v) : null;
    tiles.push(tile(vt?.label || t.label, v == null ? null : `${fix1(v)}${unit === 'min' ? ' min' : unit}`,
      `${vt?.source || 'Game telemetry'} · target ${vt?.target || t.target}`, ok == null ? null : ok ? 'ok' : 'warn'));
  }
  return h('div', { class: 'pg-tiles' }, tiles);
}

// ---------- charts ----------
const ISO = (a) => (a || []).map((x) => x);
const topN = (products, n = 4) => {
  const sorted = [...(products || [])].sort((a, b) => (b.values || []).reduce((s, v) => s + v, 0) - (a.values || []).reduce((s, v) => s + v, 0));
  const head = sorted.slice(0, n); const rest = sorted.slice(n);
  if (rest.length) head.push({ name: 'Other', values: rest[0].values.map((_, i) => rest.reduce((s, p) => s + (p.values[i] || 0), 0)) });
  return head;
};
const kv = (rows, label = 'key') => (rows || []).map((r) => ({ label: String(r[label] ?? r.key ?? r.source ?? r.step ?? '?'), value: r.count ?? r.joins ?? r.pct }));

function playersCharts(v) {
  const c = v?.charts || {};
  return h('div', { class: 'pg-grid2' },
    c.dau ? columnChart('Daily active users, new and returning', ISO(c.dau.dates), [{ name: 'New', values: c.dau.new || [] }, { name: 'Returning', values: c.dau.returning || [] }]) : emptyChart('Daily active users, new and returning'),
    c.onlineByHour ? multiLine('Players online, peak per hour (3 days)', ISO(c.onlineByHour.hours), [{ name: 'Peak', values: c.onlineByHour.peak || [] }], { hours: true }) : emptyChart('Players online, peak per hour (3 days)'),
    hbars('Plays by source', (c.playsBySource || []).map((r) => ({ label: r.source, value: r.joins })), { note: 'No joins recorded yet.' }),
    hbars('Day-1 retention by source', (c.d1BySource || []).map((r) => ({ label: r.source, value: r.pct, text: `${fix1(r.pct)}% (${r.retained} of ${r.cohort})` })), { max: 100, note: 'Needs a finished day-1 cohort.' }),
    hbars('Country', kv(c.countries), { note: 'No country data yet.' }), hbars('Language', kv(c.languages), { note: 'No language data yet.' }), hbars('Device', kv(c.devices), { note: 'No device data yet.' }));
}

function sessionCharts(v) {
  const c = v?.charts || {};
  const perf = c.performance;
  const crashNote = !perf || !(perf.crashPct || []).some((x) => x != null);
  return h('div', { class: 'pg-grid2' },
    c.firstSession ? hbars('First session length', c.firstSession.buckets.map((b, i) => ({ label: b, value: c.firstSession.counts[i] }))) : emptyChart('First session length'),
    c.sessionTime ? multiLine('Session time, new and returning (minutes)', ISO(c.sessionTime.dates), [{ name: 'New', values: c.sessionTime.newMin || [] }, { name: 'Returning', values: c.sessionTime.returningMin || [] }]) : emptyChart('Session time, new and returning'),
    c.playtimePerUser ? multiLine('Playtime per daily user (minutes)', ISO(c.playtimePerUser.dates), [{ name: 'Minutes', values: c.playtimePerUser.minutes || [] }]) : emptyChart('Playtime per daily user'),
    c.robuxByHour ? columnChart('Robux spent per hour, by product (3 days)', ISO(c.robuxByHour.hours), topN(c.robuxByHour.products), { hours: true }) : emptyChart('Robux spent per hour, by product'),
    c.payerConversion ? multiLine('Payer conversion (%)', ISO(c.payerConversion.dates), [{ name: 'Paying share', values: c.payerConversion.pct || [] }], { unit: '%', target: 2 }) : emptyChart('Payer conversion'),
    c.spendPerPayer ? multiLine('Spend per paying player (Robux)', ISO(c.spendPerPayer.dates), [{ name: 'Robux', values: c.spendPerPayer.robux || [] }]) : emptyChart('Spend per paying player'),
    perf ? multiLine('Performance: frames per second', ISO(perf.dates), [{ name: 'fps', values: perf.fps || [] }], { note: 'No frame-rate readings yet.' }) : emptyChart('Performance: frames per second'),
    emptyChart('Crash rate', crashNote ? 'Not measured. Roblox gives server scripts no crash signal, so this needs the Creator Hub performance page.' : 'See the performance chart.'),
    emptyChart('Play-through (icon and thumbnail clicks)', c.playThrough ? 'See below.' : 'Not measured here. It comes from Creator Analytics; Live ops can record it with hq_metric.'));
}

function leaveCharts(v) {
  const w = v?.whereLeave;
  if (!w) return emptyChart('Where players leave', 'No data yet. Daily numbers arrive after the game reports them.');
  const l = w.latest;
  return h('div', { class: 'pg-grid2' },
    hbars('Last place before leaving', kv(w.lastPlaces), { note: 'No exits recorded yet.' }),
    hbars('Tutorial step when they left', (w.tutorialSteps || []).map((r) => ({ label: 'Step ' + r.step, value: r.count })), { note: 'No exits during the tutorial recorded yet.' }),
    w.firstSession ? hbars('First session length', w.firstSession.buckets.map((b, i) => ({ label: b, value: w.firstSession.counts[i] }))) : emptyChart('First session length'),
    h('div', { class: 'pg-chart' }, h('h4', {}, 'Where the latest session ended'),
      l ? h('ul', { class: 'pg-list' }, h('li', {}, 'Last place: ', h('strong', {}, l.lastPlace || 'unknown')), h('li', {}, 'Tutorial step: ', h('strong', {}, l.tutorialStep ?? 'n/a')),
        h('li', {}, 'Length: ', h('strong', {}, l.seconds != null ? Math.round(l.seconds) + ' s' : 'n/a')), l.at ? h('li', { class: 'muted' }, when(l.at)) : null)
        : h('p', { class: 'pg-note' }, 'No session has ended since the game started reporting.')));
}

function trendCharts(live) {
  const series = live.series || [];
  const pts = (key) => series.map((r) => ({ x: new Date(r.at), y: r[key] }));
  return h('div', { class: 'pg-grid2' },
    lineChart('Players (Roblox public data)', pts('playing')), lineChart('Visits', pts('visits')), lineChart('Favorites', pts('favorites')),
    lineChart('Like ratio', series.map((r) => ({ x: new Date(r.at), y: r.up + r.down ? (r.up / (r.up + r.down)) * 100 : null })), { unit: '%', target: 80 }));
}

function benchTable(live) {
  const m = { ...(live.metrics || {}), ...((live.stats || live.view)?.metrics || {}) };
  const latest = live.latest;
  const like = m.likeRatio ?? (latest && latest.up + latest.down ? latest.up / (latest.up + latest.down) : null);
  return h('div', { class: 'pg-scroll' }, h('table', { class: 'pg-tbl' },
    h('thead', {}, h('tr', {}, ['Measure', 'Target', 'Now', 'Status'].map((c, i) => h('th', { class: i === 2 ? 'num' : '' }, c)))),
    h('tbody', {}, TARGETS.filter((t) => t.test).map((t) => {
      const v = t.key === 'likeRatio' ? like : m[t.key];
      return h('tr', {}, h('td', {}, t.label), h('td', {}, t.target), h('td', { class: 'num' }, v == null ? 'not measured' : t.fmt(v)),
        h('td', {}, v == null ? chip('not measured') : t.test(v) ? chip('on target', 'ok') : chip('below target', 'warn')));
    }))));
}

function fixLedger(g, live) {
  const asks = live.attention || [];
  const fixes = store.tasks.filter((t) => t.game === g.slug && (t.role === 'liveops' || /^Fix:/i.test(t.title)));
  return h('div', { class: 'stack' },
    h('p', { class: 'pg-note' }, 'What Live ops flagged, and the work that answered it.'),
    asks.length ? h('ul', { class: 'pg-list' }, asks.map((a) => h('li', {}, chip(a.state, a.state === 'open' ? 'warn' : 'ok'), h('strong', {}, a.title), a.why ? h('span', { class: 'muted' }, a.why) : null))) : null,
    fixes.length ? h('div', { class: 'pg-work' }, fixes.slice(0, 14).map((t) => h('div', { class: 'pg-work-row' }, h('span', { class: 'title' }, `${roleLabel(t.role)}: ${t.title}`), statePill(t.state)))) : null,
    !asks.length && !fixes.length ? empty('Nothing flagged yet. Ask Live ops to read the numbers once the game reports them.') : null);
}

const CHART_TABS = [['trends', 'Trends'], ['players', 'Players'], ['sessions', 'Sessions, money and errors'], ['leave', 'Where players leave'], ['bench', 'Benchmarks'], ['ledger', 'Fix ledger']];

export function liveBoard(g, live, { chartTab, setChartTab, reload, all }) {
  const view = live.stats || live.view || null;
  const attention = live.attention || [];
  const counts = [
    ['Ready to publish', all.filter((x) => x.stage === 'ready').length], ['Live', all.filter((x) => x.stage === 'live').length],
    ['Graded', all.filter((x) => x.stage === 'graded').length], ['To look at', attention.length],
  ];
  const uid = h('input', { class: 'pg-input', value: g.universeId || '', placeholder: 'Universe id', inputmode: 'numeric', 'aria-label': 'Universe id', maxlength: 20 });
  const rb = h('button', { type: 'button', class: 'btn primary', onclick: async (e) => {
    const b = e.currentTarget; b.disabled = true;
    const v = uid.value.trim();
    try {
      if (v && v !== String(g.universeId || '')) {
        if (!/^\d{1,20}$/.test(v)) { toast('The universe id is digits only', 'error'); return; }
        if (!await act(() => api('PATCH', `/api/games/${encodeURIComponent(g.slug)}`, { universeId: v }))) return;
      }
      await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/live/refresh`, {}), 'Live numbers refreshed');
      await reload();
    } finally { b.disabled = false; }
  } }, ic('refresh', 14), 'Refresh');
  const hasTelemetry = !!(view && (view.hasData || view.live));
  const emptyMsg = hasTelemetry ? null : (g.isPublic === true ? 'No data yet. Daily numbers arrive after the game reports them.' : 'Private, so nothing is measurable yet.');
  const tab = chartTab;
  const body = tab === 'trends' ? trendCharts(live) : tab === 'players' ? playersCharts(view) : tab === 'sessions' ? sessionCharts(view) : tab === 'leave' ? leaveCharts(view) : tab === 'bench' ? benchTable(live) : fixLedger(g, live);
  return h('div', { class: 'stack' },
    h('div', { class: 'pg-tiles' }, counts.map(([k, v]) => h('div', { class: 'pg-tile sm' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v)))),
    connectCard(g, reload),
    h('section', { class: 'pg-card' },
      h('div', { class: 'row gap wrap' }, h('label', { class: 'row gap' }, h('span', { class: 'muted' }, 'Universe id'), uid), rb,
        h('span', { class: 'muted' }, live.latest ? 'Last public reading ' + fmtTime(live.latest.at) : 'No public reading yet')),
      emptyMsg ? h('p', { class: 'pg-note' }, emptyMsg + (g.universeId ? '' : ' After you publish the game yourself, paste its universe id and press Refresh.')) : null),
    attention.length ? h('section', { class: 'pg-card' }, h('h3', {}, 'Brought to your attention'),
      h('ul', { class: 'pg-list' }, attention.map((a) => h('li', {}, chip(a.kind, 'warn'), h('strong', {}, a.title), a.why ? h('span', { class: 'muted' }, a.why) : null, h('a', { href: '#/review' }, 'Open'))))) : null,
    strip(view),
    dailyTiles(live, g),
    h('div', { class: 'stack' }, segmented(CHART_TABS, chartTab, setChartTab), body));
}

// Turns the game's telemetry records into the live-numbers view. Pure, no dependencies.
//
// Input records (written by src/server/Services/StatsService.luau, read through the Open Cloud DataStore API):
//   day record  { date: "YYYY-MM-DD", stats: S }      S = the aggregate defined in src/shared/LiveStats.luau
//   live record { at, servers: { [jobId]: { at, playing, peak, fps, ping, version } } }   (at = unix seconds, ping = ms)
// Aggregates only: no user ids exist anywhere in these records.

const DAY_MS = 86400000;
const WINDOW_DAYS = 14;
const FRESH_SERVER_SECONDS = 180; // a server that has not reported for 3 minutes is gone
const STALE_LIVE_SECONDS = 300;

export const SESSION_BUCKETS = ['under 1 min', '1 to 3 min', '3 to 10 min', '10 to 30 min', '30 to 60 min', '60+ min'];

const TARGETS = {
  d1: '12 to 15%',
  d7: '2 to 3%',
  avgSessionMin: 'over 10 min',
  payingPct: 'about 2%',
  firstMinute: 'under 30% leave in the first minute',
};

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const r1 = (n) => (n === null ? null : Math.round(n * 10) / 10);
const pct = (a, b) => (b > 0 ? r1((a / b) * 100) : null);
const ratio = (a, b) => (b > 0 ? a / b : null);
const iso = (ms) => new Date(ms).toISOString();
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanDays(days) {
  return (Array.isArray(days) ? days : [])
    .filter((d) => isObj(d) && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && isObj(d.stats))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-WINDOW_DAYS);
}

const addDays = (date, n) => iso(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).slice(0, 10);

function sumMaps(list) {
  const out = {};
  for (const m of list) if (isObj(m)) for (const [k, v] of Object.entries(m)) out[k] = (out[k] ?? 0) + num(v);
  return out;
}

const topList = (map, n = 10) =>
  Object.entries(map).map(([key, count]) => ({ key, count })).filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1)).slice(0, n);

const sessionAvgMin = (s) => (num(s?.count) > 0 ? r1(num(s.seconds) / s.count / 60) : null);
const uniques = (st) => num(st.uniqueNew) + num(st.uniqueReturning);

/**
 * An hour can appear in two day records (events flushed just after midnight are stamped with the next day), so
 * buckets for the same hour are added together; peaks take the max per server.
 */
function mergeHour(a, b) {
  if (!a) return b;
  const peaks = { ...(isObj(a.peaks) ? a.peaks : {}) };
  for (const [server, p] of Object.entries(isObj(b.peaks) ? b.peaks : {})) peaks[server] = Math.max(num(peaks[server]), num(p));
  const products = { ...(isObj(a.products) ? a.products : {}) };
  for (const [name, amount] of Object.entries(isObj(b.products) ? b.products : {})) products[name] = num(products[name]) + num(amount);
  return {
    joins: num(a.joins) + num(b.joins), leaves: num(a.leaves) + num(b.leaves), robux: num(a.robux) + num(b.robux),
    errors: num(a.errors) + num(b.errors), peaks, products,
  };
}

/** All hour buckets from all days: { [unixHour]: bucket } (an hour never spans two day records). */
function hourMap(days) {
  const out = new Map();
  for (const d of days) {
    for (const [h, b] of Object.entries(d.stats.hours ?? {})) {
      if (isObj(b) && Number.isInteger(Number(h))) out.set(Number(h), mergeHour(out.get(Number(h)), b));
    }
  }
  return out;
}

const hourPeak = (b) => Object.values(b?.peaks ?? {}).reduce((s, v) => s + num(v), 0);

/**
 * "Last hour" without per-minute data: the current hour bucket plus the part of the previous hour that still
 * falls inside the trailing 60 minutes.
 */
function lastHour(hours, field, nowMs) {
  const nowHour = Math.floor(nowMs / 3600000);
  const intoHour = (nowMs - nowHour * 3600000) / 3600000;
  const cur = num(hours.get(nowHour)?.[field]);
  const prev = num(hours.get(nowHour - 1)?.[field]);
  return Math.round(cur + prev * (1 - intoHour));
}

function retention(days, ageKey, offsetDays) {
  const byDate = new Map(days.map((d) => [d.date, d.stats]));
  let cohort = 0, retained = 0, last = null;
  const sources = {};
  for (const d of days) {
    const later = byDate.get(addDays(d.date, offsetDays));
    if (!later) continue;
    cohort += num(d.stats.uniqueNew);
    retained += num(later.returningByAge?.[ageKey]);
    last = d.date;
    for (const [src, s] of Object.entries(d.stats.sources ?? {})) {
      const o = (sources[src] ??= { cohort: 0, retained: 0 });
      o.cohort += num(s.newJoins);
      o.retained += num(later.sources?.[src]?.[ageKey === '1' ? 'd1' : 'd7']);
    }
  }
  return { cohort, retained, last, sources };
}

function liveBlock(live, days, hours, nowMs) {
  if (!isObj(live) || !isObj(live.servers)) return null;
  const nowSec = nowMs / 1000;
  const fresh = Object.entries(live.servers).filter(([, s]) => isObj(s) && nowSec - num(s.at) <= FRESH_SERVER_SECONDS);
  const withFps = fresh.filter(([, s]) => typeof s.fps === 'number');
  const slowest = withFps.sort((a, b) => a[1].fps - b[1].fps)[0];
  const pings = fresh.map(([, s]) => s.ping).filter((p) => typeof p === 'number');
  const versions = {};
  for (const [, s] of fresh) if (s.version !== undefined) versions[s.version] = (versions[s.version] ?? 0) + num(s.playing);

  const nowHour = Math.floor(nowMs / 3600000);
  let peak24 = 0, joins24 = 0;
  for (const [h, b] of hours) {
    if (h > nowHour - 24 && h <= nowHour) { peak24 = Math.max(peak24, hourPeak(b)); joins24 += num(b.joins); }
  }
  const livePeak = fresh.reduce((s, [, x]) => s + num(x.peak), 0);

  const latestDay = days.at(-1)?.stats;
  const newSessions = latestDay?.sessions?.new;
  return {
    at: iso(num(live.at) * 1000),
    stale: nowSec - num(live.at) > STALE_LIVE_SECONDS,
    playing: fresh.reduce((s, [, x]) => s + num(x.playing), 0),
    servers: fresh.length,
    slowestServer: slowest ? { id: slowest[0], fps: r1(slowest[1].fps) } : null,
    worstPingMs: pings.length ? Math.round(Math.max(...pings)) : null,
    peak24h: Math.max(peak24, livePeak),
    joins24h: joins24,
    joinsLastHour: lastHour(hours, 'joins', nowMs),
    leavesLastHour: lastHour(hours, 'leaves', nowMs),
    firstMinuteBouncePct: pct(num(newSessions?.hist?.[0]), num(newSessions?.count)),
    robuxLastHour: lastHour(hours, 'robux', nowMs),
    errorsLastHour: lastHour(hours, 'errors', nowMs),
    versions: Object.entries(versions).map(([version, players]) => ({ version, players })).sort((a, b) => b.players - a.players),
  };
}

function robuxChart(hours, nowMs) {
  const nowHour = Math.floor(nowMs / 3600000);
  const keys = [...hours.keys()].filter((h) => h <= nowHour && h > nowHour - 72).sort((a, b) => a - b);
  if (!keys.length) return { hours: [], products: [] };
  const first = keys[0];
  const span = Array.from({ length: keys.at(-1) - first + 1 }, (_, i) => first + i);
  const totals = {};
  for (const h of keys) for (const [p, a] of Object.entries(hours.get(h).products ?? {})) totals[p] = (totals[p] ?? 0) + num(a);
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p]) => p);
  const names = [...top, ...(Object.keys(totals).length > top.length ? ['Other'] : [])];
  return {
    hours: span.map((h) => iso(h * 3600000)),
    products: names.map((name) => ({
      name,
      values: span.map((h) => {
        const b = hours.get(h);
        if (!b) return null;
        const prods = b.products ?? {};
        if (name === 'Other') return Object.entries(prods).filter(([p]) => !top.includes(p)).reduce((s, [, a]) => s + num(a), 0);
        return num(prods[name]);
      }),
    })),
  };
}

function onlineChart(hours, nowMs) {
  const nowHour = Math.floor(nowMs / 3600000);
  const keys = [...hours.keys()].filter((h) => h <= nowHour && h > nowHour - 72).sort((a, b) => a - b);
  if (!keys.length) return { hours: [], peak: [] };
  const span = Array.from({ length: keys.at(-1) - keys[0] + 1 }, (_, i) => keys[0] + i);
  return { hours: span.map((h) => iso(h * 3600000)), peak: span.map((h) => (hours.has(h) ? hourPeak(hours.get(h)) : null)) };
}

/**
 * liveStatsView(days, live, now = Date.now())
 * days: [{date, stats}] in any order (the newest 14 are used); live: the live record or null.
 * Every number that cannot be measured is null. See the shape in README "Live telemetry".
 */
export function liveStatsView(days, live, now = Date.now()) {
  const ds = cleanDays(days);
  const nowMs = now instanceof Date ? now.getTime() : now;
  const hours = hourMap(ds);
  const stats = ds.map((d) => d.stats);
  const dates = ds.map((d) => d.date);

  const d1 = retention(ds, '1', 1);
  const d7 = retention(ds, '7', 7);
  const sessionsNew = { count: 0, seconds: 0 }, sessionsRet = { count: 0, seconds: 0 };
  for (const st of stats) {
    sessionsNew.count += num(st.sessions?.new?.count); sessionsNew.seconds += num(st.sessions?.new?.seconds);
    sessionsRet.count += num(st.sessions?.returning?.count); sessionsRet.seconds += num(st.sessions?.returning?.seconds);
  }
  const uniqueTotal = stats.reduce((s, st) => s + uniques(st), 0);
  const payersTotal = stats.reduce((s, st) => s + num(st.payers), 0);
  const firstHist = SESSION_BUCKETS.map((_, i) => stats.reduce((s, st) => s + num(st.sessions?.new?.hist?.[i]), 0));
  const firstSession = { buckets: SESSION_BUCKETS, counts: firstHist };

  const metrics = {
    d1: pct(d1.retained, d1.cohort),
    d7: pct(d7.retained, d7.cohort),
    avgSessionMin: r1(ratio(sessionsNew.seconds + sessionsRet.seconds, (sessionsNew.count + sessionsRet.count) * 60)),
    payingPct: pct(payersTotal, uniqueTotal),
    firstMinute: pct(firstHist[0], sessionsNew.count),
  };
  const metricDetail = {
    d1: d1.cohort > 0 ? { value: metrics.d1, cohortDate: d1.last, cohortSize: d1.cohort } : null,
    d7: d7.cohort > 0 ? { value: metrics.d7, cohortDate: d7.last, cohortSize: d7.cohort } : null,
  };
  const label = { d1: 'Day-1 retention', d7: 'Day-7 retention', avgSessionMin: 'Average session', payingPct: 'Paying players', firstMinute: 'Left in the first minute' };
  const unit = { d1: '%', d7: '%', avgSessionMin: 'min', payingPct: '%', firstMinute: '%' };
  const tiles = Object.keys(label).map((id) => ({ id, label: label[id], value: metrics[id], unit: unit[id], source: 'Game telemetry (aggregates)', target: TARGETS[id] }));

  const perfSamples = stats.map((st) => num(st.perf?.samples));
  const crashPcts = stats.map((st) => (num(st.perf?.crashes) > 0 ? pct(num(st.perf.crashes), Math.max(1, num(st.joins))) : null));
  const charts = {
    dau: { dates, new: stats.map((st) => num(st.uniqueNew)), returning: stats.map((st) => num(st.uniqueReturning)) },
    onlineByHour: onlineChart(hours, nowMs),
    robuxByHour: robuxChart(hours, nowMs),
    firstSession,
    sessionTime: { dates, newMin: stats.map((st) => sessionAvgMin(st.sessions?.new)), returningMin: stats.map((st) => sessionAvgMin(st.sessions?.returning)) },
    playtimePerUser: {
      dates,
      minutes: stats.map((st) => r1(ratio(num(st.sessions?.new?.seconds) + num(st.sessions?.returning?.seconds), uniques(st) * 60))),
    },
    d1BySource: Object.entries(d1.sources).filter(([, o]) => o.cohort > 0)
      .map(([source, o]) => ({ source, cohort: o.cohort, retained: o.retained, pct: pct(o.retained, o.cohort) }))
      .sort((a, b) => b.cohort - a.cohort),
    playsBySource: Object.entries(sumMaps(stats.map((st) => Object.fromEntries(Object.entries(st.sources ?? {}).map(([k, v]) => [k, num(v?.joins)])))))
      .map(([source, joins]) => ({ source, joins })).filter((x) => x.joins > 0).sort((a, b) => b.joins - a.joins),
    playThrough: null,
    payerConversion: { dates, pct: stats.map((st) => pct(num(st.payers), uniques(st))) },
    spendPerPayer: { dates, robux: stats.map((st) => r1(ratio(num(st.robux?.total), num(st.payers)))) },
    performance: {
      dates,
      fps: stats.map((st, i) => (perfSamples[i] > 0 ? r1(num(st.perf.fpsSum) / perfSamples[i]) : null)),
      crashPct: crashPcts,
    },
    countries: topList(sumMaps(stats.map((st) => st.countries))),
    languages: topList(sumMaps(stats.map((st) => st.languages))),
    devices: topList(sumMaps(stats.map((st) => st.devices))),
  };

  const steps = sumMaps(stats.map((st) => st.tutorialSteps));
  const lastLeaves = stats.map((st) => st.lastLeave).filter((l) => isObj(l) && num(l.at) > 0).sort((a, b) => b.at - a.at);
  const latest = lastLeaves[0];
  const whereLeave = {
    lastPlaces: topList(sumMaps(stats.map((st) => st.lastPlaces))),
    tutorialSteps: Object.entries(steps).filter(([, c]) => c > 0).map(([step, count]) => ({ step, count }))
      .sort((a, b) => Number(a.step) - Number(b.step) || (a.step < b.step ? -1 : 1)),
    firstSession,
    latest: latest ? { lastPlace: latest.lastPlace ?? null, tutorialStep: latest.tutorialStep ?? null, seconds: num(latest.seconds), at: iso(num(latest.at) * 1000) } : null,
  };

  const unavailable = ['playThrough'];
  if (charts.performance.crashPct.every((v) => v === null)) unavailable.push('crashPct');
  const liveView = liveBlock(live, ds, hours, nowMs);
  const asOf = liveView ? liveView.at : ds.length ? iso(Date.parse(`${ds.at(-1).date}T00:00:00Z`) + DAY_MS - 1) : null;

  return {
    hasData: ds.length > 0 || liveView !== null,
    asOf,
    empty: { noDays: ds.length === 0, noLive: liveView === null },
    live: liveView,
    metrics,
    metricDetail,
    tiles,
    charts,
    whereLeave,
    unavailable,
  };
}

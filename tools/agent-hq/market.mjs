// Roblox market data: charts, velocity, breakouts, icons. No dependencies.
// Every network function takes an optional last argument `fetcher` (default globalThis.fetch) so tests inject a fake.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const URL_BASE = 'https://apis.roblox.com/explore-api/v1/get-sorts';
const DAY = 86400000;

export function normalizeCharts(raw, fetchedAt = new Date().toISOString()) {
  const sorts = [];
  for (const s of raw?.sorts ?? []) {
    const games = (s.games ?? [])
      .filter((g) => !g.isSponsored)
      .slice(0, 50)
      .map((g) => ({
        universeId: g.universeId,
        rootPlaceId: g.rootPlaceId,
        name: g.name,
        playerCount: g.playerCount ?? 0,
        up: g.totalUpVotes ?? 0,
        down: g.totalDownVotes ?? 0,
        genre: g.genreL1 ?? '',
        sponsored: false,
      }));
    if (games.length) sorts.push({ id: s.sortId, name: s.sortDisplayName, games });
  }
  return { fetchedAt, sorts };
}

// Accepts a fetcher function, or the older { fetchImpl } option object.
const pickFetcher = (a) => (typeof a === 'function' ? a : a?.fetchImpl ?? globalThis.fetch);

async function getJson(fetcher, url) {
  const res = await fetcher(url, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Roblox returned HTTP ${res.status} for ${new URL(url).host}`);
  return res.json();
}

export async function fetchCharts(arg) {
  const url = `${URL_BASE}?sessionId=${crypto.randomUUID()}&device=computer&country=all`;
  return normalizeCharts(await getJson(pickFetcher(arg), url));
}

const ids = (list) => [...new Set((list ?? []).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))];
const batches = (list, n = 50) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
const likePctOf = (g) => (g.up + g.down > 0 ? Math.round((g.up / (g.up + g.down)) * 100) : null);
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Compare the two latest chart snapshots.
 * rankDelta > 0 means the game climbed. Deltas are null when there is no previous snapshot or the game was not in it.
 * `moves` holds the 50 biggest rank moves (game x sort pairs) by |rankDelta|, then |playersDelta|.
 */
export function velocity(latest, previous) {
  const prevBySort = new Map();
  for (const s of previous?.sorts ?? []) {
    prevBySort.set(s.id, new Map(s.games.map((g, i) => [g.universeId, { rank: i + 1, playing: g.playerCount }])));
  }
  const sortsCount = new Map();
  for (const s of latest?.sorts ?? []) for (const g of s.games) sortsCount.set(g.universeId, (sortsCount.get(g.universeId) ?? 0) + 1);

  const perSort = {};
  const moves = [];
  for (const s of latest?.sorts ?? []) {
    const prev = prevBySort.get(s.id);
    perSort[s.id] = s.games.map((g, i) => {
      const p = prev?.get(g.universeId);
      const rank = i + 1;
      const playersDelta = p ? g.playerCount - p.playing : null;
      const row = {
        universeId: g.universeId,
        name: g.name,
        rank,
        rankDelta: p ? p.rank - rank : null,
        playing: g.playerCount,
        playersDelta,
        playersPct: p && p.playing > 0 ? round((playersDelta / p.playing) * 100) : null,
        likePct: likePctOf(g),
        votes: g.up + g.down,
        sortsCount: sortsCount.get(g.universeId) ?? 1,
      };
      if (row.rankDelta !== null) {
        moves.push({ universeId: g.universeId, name: g.name, sort: s.id, sortName: s.name, rankDelta: row.rankDelta, playersDelta, playersPct: row.playersPct });
      }
      return row;
    });
  }
  moves.sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta) || Math.abs(b.playersDelta ?? 0) - Math.abs(a.playersDelta ?? 0));
  return { moves: moves.slice(0, 50), perSort };
}

/** { [universeId]: { visits, created, updated, genre } } from games.roblox.com, 50 ids per request. */
export async function fetchGameDetails(universeIds, fetcher) {
  const f = pickFetcher(fetcher);
  const out = {};
  for (const batch of batches(ids(universeIds))) {
    const j = await getJson(f, `https://games.roblox.com/v1/games?universeIds=${batch.join(',')}`);
    for (const g of j.data ?? []) out[g.id] = { visits: g.visits ?? 0, created: g.created ?? null, updated: g.updated ?? null, genre: g.genre_l1 || g.genre || '' };
  }
  return out;
}

/** { [universeId]: imageUrl } for the 150x150 game icons. */
export async function fetchIcons(universeIds, fetcher) {
  const f = pickFetcher(fetcher);
  const out = {};
  for (const batch of batches(ids(universeIds))) {
    const j = await getJson(f, `https://thumbnails.roblox.com/v1/games/icons?universeIds=${batch.join(',')}&size=150x150&format=Png`);
    for (const t of j.data ?? []) if (t.imageUrl && (!t.state || t.state === 'Completed')) out[t.targetId] = t.imageUrl;
  }
  return out;
}

/** { [universeId]: imageUrl } for the first 768x432 thumbnail of each game. */
export async function fetchThumbnails(universeIds, fetcher) {
  const f = pickFetcher(fetcher);
  const out = {};
  for (const batch of batches(ids(universeIds), 50)) {
    const j = await getJson(f, `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${batch.join(',')}&size=768x432&format=Png`);
    for (const g of j.data ?? []) {
      const t = (g.thumbnails ?? []).find((x) => x.imageUrl && (!x.state || x.state === 'Completed'));
      if (t) out[g.universeId] = t.imageUrl;
    }
  }
  return out;
}

/**
 * Young games that are taking off: under 300,000 visits and over 500 playing now, and either created within
 * 30 days or first seen in our snapshots within the last 7 days. `snapshots` is NEWEST FIRST; peak and growth
 * come from the snapshots passed in. Games without details are skipped (visits unknown).
 */
export function computeBreakouts(snapshots, details, now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : now;
  if (!snapshots?.length) return [];
  const history = new Map(); // universeId -> [{at, playing}] newest first
  for (const snap of snapshots) {
    const at = Date.parse(snap.fetchedAt);
    const best = new Map();
    for (const s of snap.sorts ?? []) for (const g of s.games) best.set(g.universeId, Math.max(best.get(g.universeId) ?? 0, g.playerCount));
    for (const [id, playing] of best) {
      if (!history.has(id)) history.set(id, []);
      history.get(id).push({ at, playing });
    }
  }
  const latestGames = new Map();
  for (const s of snapshots[0].sorts ?? []) for (const g of s.games) if (!latestGames.has(g.universeId)) latestGames.set(g.universeId, g);

  const out = [];
  for (const [id, g] of latestGames) {
    const d = details?.[id];
    const h = history.get(id);
    const playing = Math.max(...snapshots[0].sorts.flatMap((s) => s.games.filter((x) => x.universeId === id).map((x) => x.playerCount)));
    if (!d || !(d.visits < 300000) || !(playing > 500)) continue;
    const created = d.created ? Date.parse(d.created) : NaN;
    const ageDays = Number.isNaN(created) ? null : Math.floor((nowMs - created) / DAY);
    const firstSeenMs = h[h.length - 1].at;
    const isNew = (ageDays !== null && ageDays <= 30) || nowMs - firstSeenMs <= 7 * DAY;
    if (!isNew) continue;
    const earliest = h[h.length - 1].playing;
    out.push({
      universeId: id,
      name: g.name,
      playing,
      peak: Math.max(...h.map((x) => x.playing)),
      visits: d.visits,
      ageDays,
      perThousandVisits: d.visits > 0 ? round(playing / (d.visits / 1000)) : null,
      growth: h.length > 1 && earliest > 0 ? round(playing / earliest, 2) : null,
      likePct: likePctOf(g),
      genre: d.genre || g.genre || '',
      firstSeen: new Date(firstSeenMs).toISOString(),
    });
  }
  return out.sort((a, b) => b.playing - a.playing);
}

export function loadBenchmarks() {
  return JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'benchmarks.json'), 'utf8'));
}

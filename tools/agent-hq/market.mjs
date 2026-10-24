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
      .slice(0, s.sortId === 'top-earning' ? 300 : 100)
      .map((g) => ({
        universeId: g.universeId,
        rootPlaceId: g.rootPlaceId,
        name: g.name,
        playerCount: g.playerCount ?? 0,
        up: g.totalUpVotes ?? 0,
        down: g.totalDownVotes ?? 0,
        genre: g.genreL1 ?? '',
        maturity: g.contentMaturity ?? '',
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

// Lists with no games or no market signal (music, subscriptions, learning) are skipped.
const MINOR_SORT = /music|subscribe|learning|^filters/i;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * All chart lists: get-sorts pages through about 26 sorts (sortsPageToken), then top-earning, the Robux-spent
 * ranking, is paged on get-sort-content (pageToken) to about 300 games. Explore API limit: 120 requests a minute.
 * See research/exemplars/market-data-sources.md.
 */
export async function fetchCharts(arg, { maxPages = 6, earningPages = 3, gapMs = 250 } = {}) {
  const f = pickFetcher(arg);
  const session = crypto.randomUUID();
  const sorts = [];
  let token = null;
  for (let page = 0; page < maxPages; page++) {
    const url = `${URL_BASE}?sessionId=${session}&device=computer&country=all${token ? `&sortsPageToken=${encodeURIComponent(token)}` : ''}`;
    const j = await getJson(f, url);
    sorts.push(...(j?.sorts ?? []).filter((s) => !MINOR_SORT.test(s.sortId ?? '')));
    token = j?.nextSortsPageToken;
    if (!token) break;
    await pause(gapMs);
  }
  const earning = sorts.find((s) => s.sortId === 'top-earning');
  if (earning) {
    try {
      let tok = null; const games = [];
      for (let page = 0; page < earningPages; page++) {
        const j = await getJson(f, `${URL_BASE.replace('get-sorts', 'get-sort-content')}?sessionId=${session}&sortId=top-earning&device=computer&country=all${tok ? `&pageToken=${encodeURIComponent(tok)}` : ''}`);
        if (!Array.isArray(j?.games)) break;
        games.push(...j.games);
        tok = j.nextPageToken;
        if (!tok) break;
        await pause(gapMs);
      }
      if (games.length > (earning.games?.length ?? 0)) earning.games = games;
    } catch { /* keep the first page */ }
  }
  return normalizeCharts({ sorts });
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

/** { [universeId]: { visits, created, updated, genre, playing, favorites, maxPlayers, subgenre, creator } } from games.roblox.com, 50 ids per request. */
export async function fetchGameDetails(universeIds, fetcher) {
  const f = pickFetcher(fetcher);
  const out = {};
  for (const batch of batches(ids(universeIds))) {
    const j = await getJson(f, `https://games.roblox.com/v1/games?universeIds=${batch.join(',')}`);
    for (const g of j.data ?? []) {
      out[g.id] = {
        visits: g.visits ?? 0, created: g.created ?? null, updated: g.updated ?? null, genre: g.genre_l1 || g.genre || '',
        // same request, no extra cost: favorites per visit and true CCU for games off the charts
        playing: g.playing ?? null, favorites: g.favoritedCount ?? null, maxPlayers: g.maxPlayers ?? null, subgenre: g.genre_l2 || '', creator: g.creator?.name ?? '',
      };
    }
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
    const j = await getJson(f, `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${batch.join(',')}&countPerUniverse=3&defaults=true&size=768x432&format=Png&isCircular=false`);
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

// ---- title analysis: how do the charting games name themselves? ----
// A small curated list of the action verbs that open Roblox game titles ("Steal a Brainrot", "Grow a Garden").
const TITLE_VERBS = new Set([
  'steal', 'grow', 'escape', 'survive', 'build', 'find', 'run', 'catch', 'collect', 'tame', 'raise', 'race', 'defend', 'fish',
  'clean', 'mine', 'fight', 'hunt', 'cook', 'farm', 'dig', 'save', 'rescue', 'sell', 'buy', 'open', 'craft', 'merge', 'slap',
  'punch', 'spin', 'feed', 'battle', 'climb', 'jump', 'dodge', 'dress', 'make', 'become', 'join', 'play', 'take', 'get', 'hide',
  'seek', 'draw', 'guess', 'pick', 'create', 'train', 'trade', 'kill', 'destroy', 'drive', 'fly', 'swim', 'smash', 'break',
  'stack', 'throw', 'shoot', 'unbox', 'hatch', 'summon', 'protect', 'explore', 'delete', 'be', 'do', 'go', 'pet',
]);
const TITLE_ARTICLES = new Set(['a', 'an', 'the']);
const SYMBOL = /[\p{Extended_Pictographic}\p{S}\[\]]/u;

const pct1 = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

/**
 * Patterns across a list of game titles: sample size, share that read "verb article noun" or "verb noun",
 * share with an emoji or symbol, word-count and length distributions, and the commonest first words.
 */
export function titleAnalysis(titles) {
  const list = (titles ?? []).filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim());
  const sample = list.length;
  let vAN = 0, vNoArt = 0, emoji = 0, wordSum = 0, lenSum = 0;
  const wordHist = new Map();
  const first = new Map();
  const lenBuckets = [['1 to 8', 8], ['9 to 14', 14], ['15 to 20', 20], ['21 to 30', 30], ['31+', Infinity]].map(([label, max]) => ({ label, max, count: 0 }));

  for (const title of list) {
    if (SYMBOL.test(title)) emoji++;
    const words = title.replace(/\[[^\]]*\]/g, ' ').split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}'&-]/gu, '')).filter((w) => /[\p{L}\p{N}]/u.test(w));
    wordSum += words.length;
    wordHist.set(words.length, (wordHist.get(words.length) ?? 0) + 1);
    const len = Array.from(title).length;
    lenSum += len;
    lenBuckets.find((b) => len <= b.max).count++;
    if (!words.length) continue;
    const w0 = words[0].toLowerCase();
    const entry = first.get(w0) ?? { word: words[0], count: 0 };
    entry.count++;
    first.set(w0, entry);
    if (TITLE_VERBS.has(w0) && words.length >= 2) {
      if (TITLE_ARTICLES.has(words[1].toLowerCase()) && words.length >= 3) vAN++;
      else if (!TITLE_ARTICLES.has(words[1].toLowerCase())) vNoArt++;
    }
  }
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    sample,
    verbArticleNoun: { count: vAN, pct: pct1(vAN, sample) },
    verbInitialNoArticle: { count: vNoArt, pct: pct1(vNoArt, sample) },
    withEmoji: { count: emoji, pct: pct1(emoji, sample) },
    words: {
      mean: sample ? round1(wordSum / sample) : null,
      histogram: [...wordHist].sort((a, b) => a[0] - b[0]).map(([words, count]) => ({ words, count })),
    },
    length: { mean: sample ? round1(lenSum / sample) : null, buckets: lenBuckets.map(({ label, count }) => ({ label, count })) },
    commonFirstWords: [...first.values()].sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : 1)).slice(0, 10),
  };
}

/**
 * Badge stats as a free player funnel: the first-join badge's pastDayAwardedCount is about new players a day, and
 * each milestone badge's share of it is how deep players get. Many games have no badges (returns []). 100 req/min.
 * -> [{ name, pastDay, total, created }] in the game's badge order.
 */
export async function fetchBadgeStats(universeId, fetcher) {
  const id = ids([universeId])[0];
  if (!id) return [];
  const j = await getJson(pickFetcher(fetcher), `https://badges.roblox.com/v1/universes/${id}/badges?limit=100&sortOrder=Asc`);
  return (j.data ?? []).filter((b) => b.enabled !== false).map((b) => ({
    name: b.name, pastDay: b.statistics?.pastDayAwardedCount ?? 0, total: b.statistics?.awardedCount ?? 0, created: b.created ?? null,
  }));
}

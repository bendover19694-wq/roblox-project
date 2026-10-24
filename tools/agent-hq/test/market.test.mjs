import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { velocity, computeBreakouts, fetchGameDetails, fetchIcons, fetchThumbnails, fetchCharts, loadBenchmarks, titleAnalysis } from '../market.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const g = (universeId, name, playerCount, up = 90, down = 10) => ({ universeId, name, playerCount, up, down, genre: 'Action', sponsored: false });
const snap = (fetchedAt, sorts) => ({ fetchedAt, sorts });

const prev = snap('2026-10-20T00:00:00Z', [
  { id: 'trending', name: 'Top Trending', games: [g(1, 'A', 1000), g(2, 'B', 800), g(3, 'C', 600)] },
  { id: 'rising', name: 'Up-and-Coming', games: [g(2, 'B', 700), g(4, 'D', 500)] },
]);
const latest = snap('2026-10-21T00:00:00Z', [
  { id: 'trending', name: 'Top Trending', games: [g(3, 'C', 900), g(1, 'A', 1000), g(2, 'B', 600), g(5, 'E', 100)] },
  { id: 'rising', name: 'Up-and-Coming', games: [g(2, 'B', 600), g(5, 'E', 100)] },
]);

test('velocity: rank moves, player deltas, like %, sorts count', () => {
  const v = velocity(latest, prev);
  const rows = v.perSort.trending;
  const c = rows.find((r) => r.universeId === 3);
  assert.equal(c.rank, 1);
  assert.equal(c.rankDelta, 2); // 3 -> 1, climbed two
  assert.equal(c.playersDelta, 300);
  assert.equal(c.playersPct, 50);
  assert.equal(c.likePct, 90);
  assert.equal(c.votes, 100);
  const b = rows.find((r) => r.universeId === 2);
  assert.equal(b.rankDelta, -1);
  assert.equal(b.playersPct, -25);
  assert.equal(b.sortsCount, 2);
  assert.equal(rows.find((r) => r.universeId === 5).rankDelta, null, 'new entry has no delta');
  assert.equal(v.moves[0].universeId, 3);
  assert.equal(v.moves[0].sort, 'trending');
  assert.ok(v.moves.every((m) => m.rankDelta !== null));
  for (let i = 1; i < v.moves.length; i++) assert.ok(Math.abs(v.moves[i - 1].rankDelta) >= Math.abs(v.moves[i].rankDelta));
});

test('velocity without a previous snapshot has null deltas and no moves', () => {
  const v = velocity(latest, null);
  assert.deepEqual(v.moves, []);
  assert.equal(v.perSort.trending[0].rankDelta, null);
  assert.equal(v.perSort.trending[0].playersDelta, null);
  assert.equal(v.perSort.trending[0].rank, 1);
});

const NOW = Date.parse('2026-10-22T00:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString();

test('computeBreakouts: thresholds, age rule, fields', () => {
  const snaps = [
    snap(day(0), [{ id: 's', name: 'S', games: [g(1, 'Young hit', 2000), g(2, 'Big old', 5000), g(3, 'Tiny', 100), g(4, 'Old low visits', 900), g(5, 'Many visits', 900), g(6, 'No details', 900)] }]),
    snap(day(3), [{ id: 's', name: 'S', games: [g(1, 'Young hit', 1000), g(2, 'Big old', 5000)] }]),
    snap(day(6), [{ id: 's', name: 'S', games: [g(1, 'Young hit', 500), g(4, 'Old low visits', 880)] }]),
  ];
  const details = {
    1: { visits: 100000, created: day(10), genre: 'Simulation' },
    2: { visits: 9e9, created: day(2000), genre: 'Action' },
    3: { visits: 10, created: day(1), genre: 'Action' },
    4: { visits: 200000, created: day(400), genre: 'RPG' }, // old but first seen 6 days ago: counts per the 7-day rule
    5: { visits: 400000, created: day(5), genre: 'Action' }, // over 300k visits
  };
  const out = computeBreakouts(snaps, details, NOW);
  assert.deepEqual(out.map((r) => r.universeId), [1, 4]);
  const r = out[0];
  assert.equal(r.name, 'Young hit');
  assert.equal(r.playing, 2000);
  assert.equal(r.peak, 2000);
  assert.equal(r.visits, 100000);
  assert.equal(r.ageDays, 10);
  assert.equal(r.perThousandVisits, 20);
  assert.equal(r.growth, 4); // 2000 / 500
  assert.equal(r.likePct, 90);
  assert.equal(r.genre, 'Simulation');
  assert.equal(r.firstSeen, day(6));
  assert.equal(computeBreakouts([], details, NOW).length, 0);
});

test('computeBreakouts: an old game seen for over 7 days is not a breakout', () => {
  const snaps = [snap(day(0), [{ id: 's', name: 'S', games: [g(4, 'Old', 900)] }]), snap(day(9), [{ id: 's', name: 'S', games: [g(4, 'Old', 800)] }])];
  assert.equal(computeBreakouts(snaps, { 4: { visits: 1000, created: day(400), genre: '' } }, NOW).length, 0);
});

function fakeFetch(handler) {
  const calls = [];
  const fetcher = async (url) => { calls.push(url); return { ok: true, status: 200, json: async () => handler(url) }; };
  return { fetcher, calls };
}

test('fetchGameDetails batches 50 ids per request', async () => {
  const { fetcher, calls } = fakeFetch((url) => ({
    data: new URL(url).searchParams.get('universeIds').split(',').map((id) => ({ id: Number(id), visits: 5, created: '2026-01-01T00:00:00Z', updated: '2026-02-01T00:00:00Z', genre: 'All', genre_l1: 'Action' })),
  }));
  const idsList = Array.from({ length: 120 }, (_, i) => i + 1);
  const out = await fetchGameDetails(idsList, fetcher);
  assert.equal(calls.length, 3);
  assert.ok(calls[0].startsWith('https://games.roblox.com/v1/games?universeIds=1,2,'));
  assert.equal(Object.keys(out).length, 120);
  assert.deepEqual(out[7], { visits: 5, created: '2026-01-01T00:00:00Z', updated: '2026-02-01T00:00:00Z', genre: 'Action' });
  assert.deepEqual(await fetchGameDetails([], fetcher), {});
  assert.equal(calls.length, 3, 'no request for an empty list');
});

test('fetchIcons and fetchThumbnails map universe ids to image urls', async () => {
  const icons = fakeFetch(() => ({ data: [{ targetId: 1, state: 'Completed', imageUrl: 'https://t/1.png' }, { targetId: 2, state: 'Pending', imageUrl: '' }] }));
  assert.deepEqual(await fetchIcons([1, 2], icons.fetcher), { 1: 'https://t/1.png' });
  assert.match(icons.calls[0], /thumbnails\.roblox\.com\/v1\/games\/icons\?universeIds=1,2&size=150x150&format=Png/);

  const thumbs = fakeFetch(() => ({ data: [{ universeId: 1, thumbnails: [{ state: 'Completed', imageUrl: 'https://t/a.png' }, { state: 'Completed', imageUrl: 'https://t/b.png' }] }, { universeId: 2, thumbnails: [] }] }));
  assert.deepEqual(await fetchThumbnails([1, 2], thumbs.fetcher), { 1: 'https://t/a.png' });
  assert.ok(thumbs.calls[0].includes('thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=1,2&countPerUniverse=3&defaults=true&size=768x432&format=Png&isCircular=false'), thumbs.calls[0]);
});

test('a failed request throws', async () => {
  const fetcher = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(() => fetchGameDetails([1], fetcher), /HTTP 429/);
});

test('fetchCharts keeps both calling styles and drops sponsored games', async () => {
  const raw = { sorts: [{ sortId: 'x', sortDisplayName: 'X', games: [{ universeId: 1, name: 'A', playerCount: 5, totalUpVotes: 3, totalDownVotes: 1, genreL1: 'Action' }, { universeId: 2, name: 'Ad', isSponsored: true }] }, { sortId: 'empty', games: [] }] };
  const { fetcher } = fakeFetch(() => raw);
  for (const arg of [fetcher, { fetchImpl: fetcher }]) {
    const c = await fetchCharts(arg);
    assert.equal(c.sorts.length, 1);
    assert.equal(c.sorts[0].games.length, 1);
    assert.equal(c.sorts[0].games[0].up, 3);
  }
});

test('benchmarks.json: every row has a source and label, and cited repo files exist', () => {
  const rows = loadBenchmarks();
  assert.ok(rows.length >= 12);
  const ids = new Set();
  for (const r of rows) {
    for (const k of ['id', 'benchmark', 'target', 'measuredBy', 'tier', 'failureMeaning', 'source', 'label']) assert.ok(r[k] && String(r[k]).trim(), `${r.id}.${k}`);
    assert.ok(!ids.has(r.id), `duplicate ${r.id}`);
    ids.add(r.id);
    for (const f of r.source.match(/(?:research|docs)\/[\w./-]+\.md/g) ?? []) assert.ok(fs.existsSync(path.join(root, f)), `${r.id}: ${f}`);
  }
  for (const need of ['first-action', 'first-reward', 'onboarding-grasp', 'second-goal', 'session-length', 'd1', 'd7', 'like-ratio', 'play-through', 'paying-share', 'arpdau', 'error-rate']) {
    assert.ok(ids.has(need), need);
  }
});

test('titleAnalysis: patterns, emoji, word counts, lengths, first words', () => {
  const titles = [
    'Steal a Brainrot', 'Grow a Garden', 'Escape Tsunami For Brainrots!', 'Fisch', 'Dress To Impress',
    '99 Nights in the Forest', '🔥 Blade Ball', '[UPDATE] Murder Mystery 2', 'Catch Fish', 'Brookhaven 🏡RP',
  ];
  const a = titleAnalysis(titles);
  assert.equal(a.sample, 10);
  assert.deepEqual(a.verbArticleNoun, { count: 2, pct: 20 });
  assert.deepEqual(a.verbInitialNoArticle, { count: 3, pct: 30 });
  assert.deepEqual(a.withEmoji, { count: 3, pct: 30 });
  assert.equal(a.words.mean, 2.8);
  assert.deepEqual(a.words.histogram, [{ words: 1, count: 1 }, { words: 2, count: 3 }, { words: 3, count: 4 }, { words: 4, count: 1 }, { words: 5, count: 1 }]);
  assert.equal(a.length.mean, 16.3);
  assert.deepEqual(a.length.buckets, [
    { label: '1 to 8', count: 1 }, { label: '9 to 14', count: 4 }, { label: '15 to 20', count: 2 },
    { label: '21 to 30', count: 3 }, { label: '31+', count: 0 },
  ]);
  assert.equal(a.commonFirstWords.length, 10);
  assert.deepEqual(a.commonFirstWords[0], { word: '99', count: 1 });
});

test('titleAnalysis: first words are ranked by count, and empty input is safe', () => {
  const a = titleAnalysis(['Steal a Cat', 'steal a Dog', 'Steal Food', 'Grow a Tree', '', '  ', null]);
  assert.equal(a.sample, 4);
  assert.deepEqual(a.commonFirstWords[0], { word: 'Steal', count: 3 });
  assert.deepEqual(a.verbArticleNoun, { count: 3, pct: 75 });
  assert.deepEqual(a.verbInitialNoArticle, { count: 1, pct: 25 });
  const none = titleAnalysis([]);
  assert.equal(none.sample, 0);
  assert.equal(none.verbArticleNoun.pct, null);
  assert.equal(none.words.mean, null);
  assert.deepEqual(none.commonFirstWords, []);
  assert.equal(titleAnalysis(undefined).sample, 0);
});

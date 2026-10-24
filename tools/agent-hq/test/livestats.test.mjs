import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { liveStatsView, SESSION_BUCKETS } from '../livestats.mjs';
import { days, live, NOW, nowHour } from './fixtures/live-input.mjs';

const view = liveStatsView(days, live, NOW);

test('derived metrics: D1, D7, session length, paying share, first-minute bounce', () => {
  assert.deepEqual(view.metrics, { d1: 22.8, d7: 7, avgSessionMin: 3.7, payingPct: 1.6, firstMinute: 30 });
  assert.deepEqual(view.metricDetail.d1, { value: 22.8, cohortDate: '2026-10-23', cohortSize: 500 });
  assert.deepEqual(view.metricDetail.d7, { value: 7, cohortDate: '2026-10-17', cohortSize: 200 });
  assert.deepEqual(view.tiles.map((t) => t.id), ['d1', 'd7', 'avgSessionMin', 'payingPct', 'firstMinute']);
  for (const t of view.tiles) {
    assert.ok(t.label && t.source && t.target, t.id);
    assert.equal(t.value, view.metrics[t.id]);
  }
});

test('live strip: only fresh servers count; hour buckets give the last-hour numbers', () => {
  const l = view.live;
  assert.equal(l.stale, false);
  assert.equal(l.playing, 41); // the server silent for 10 minutes is left out
  assert.equal(l.servers, 3);
  assert.deepEqual(l.slowestServer, { id: 'c3d4', fps: 41.2 });
  assert.equal(l.worstPingMs, 212);
  assert.equal(l.peak24h, 66);
  assert.equal(l.joins24h, 90);
  // 20 minutes into the hour: current bucket plus two thirds of the previous one
  assert.equal(l.joinsLastHour, 47);
  assert.equal(l.leavesLastHour, 43);
  assert.equal(l.robuxLastHour, 700);
  assert.equal(l.errorsLastHour, 4);
  assert.equal(l.firstMinuteBouncePct, 30);
  assert.deepEqual(l.versions, [{ version: '12', players: 35 }, { version: '11', players: 6 }]);
  assert.equal(view.asOf, l.at);
});

test('charts: series line up with the days and hours', () => {
  const c = view.charts;
  assert.equal(c.dau.dates.length, 6);
  assert.deepEqual(c.dau.new, [200, 100, 120, 150, 130, 140]);
  assert.deepEqual(c.dau.returning, [0, 20, 40, 60, 70, 80]);

  assert.equal(c.onlineByHour.hours.length, 3);
  assert.deepEqual(c.onlineByHour.peak, [37, 66, 50]);
  assert.equal(c.onlineByHour.hours[2], new Date(nowHour * 3600000).toISOString());

  assert.deepEqual(c.robuxByHour.products.map((p) => p.name), ['Starter Pack', 'Cosmetic Livery', '2x Cash']);
  assert.deepEqual(c.robuxByHour.products[0].values, [100, 400, 200]);
  assert.deepEqual(c.robuxByHour.products[2].values, [0, 0, 100]);

  assert.deepEqual(c.firstSession.buckets, SESSION_BUCKETS);
  assert.equal(c.firstSession.counts[0], 252);
  assert.equal(c.firstSession.counts.length, 6);

  assert.equal(c.sessionTime.newMin[1], 1.7);
  assert.equal(c.sessionTime.returningMin[1], 10);
  assert.equal(c.sessionTime.returningMin[0], null, 'no returning sessions that day');
  assert.equal(c.playtimePerUser.minutes[1], 3.1);
  assert.equal(c.payerConversion.pct[1], 1.7);
  assert.equal(c.spendPerPayer.robux[1], 200);
  assert.equal(c.spendPerPayer.robux[0], null);
  assert.equal(c.performance.fps[1], 57);
  assert.ok(c.performance.crashPct.every((v) => v === null));

  assert.deepEqual(c.d1BySource, [
    { source: 'direct', cohort: 340, retained: 78, pct: 22.9 },
    { source: 'friend', cohort: 160, retained: 36, pct: 22.5 },
  ]);
  assert.equal(c.playsBySource[0].source, 'direct');
  assert.equal(c.playThrough, null);
  assert.equal(c.devices[0].key, 'phone');
  assert.equal(c.countries[0].key, 'US');
  assert.ok(c.countries.length <= 10);
  assert.deepEqual(view.unavailable, ['playThrough', 'crashPct']);
});

test('where players leave', () => {
  const w = view.whereLeave;
  assert.equal(w.lastPlaces[0].key, 'Hangar');
  assert.deepEqual(w.tutorialSteps.map((s) => s.step), ['1', '3', '5']);
  assert.deepEqual(w.latest, { lastPlace: 'Shop', tutorialStep: 4, seconds: 95, at: '2026-10-24T12:00:00.000Z' });
  assert.deepEqual(w.firstSession, view.charts.firstSession);
});

test('no records: empty states and nulls, never a throw', () => {
  const v = liveStatsView([], null, NOW);
  assert.equal(v.hasData, false);
  assert.deepEqual(v.empty, { noDays: true, noLive: true });
  assert.equal(v.live, null);
  assert.deepEqual(Object.values(v.metrics), [null, null, null, null, null]);
  assert.deepEqual(v.charts.dau, { dates: [], new: [], returning: [] });
  assert.deepEqual(v.charts.onlineByHour, { hours: [], peak: [] });
  assert.deepEqual(v.charts.d1BySource, []);
  assert.equal(v.whereLeave.latest, null);
  assert.equal(liveStatsView(undefined, undefined).hasData, false);
});

test('live without day records, stale live data, and garbled input', () => {
  const only = liveStatsView([], live, NOW);
  assert.equal(only.hasData, true);
  assert.deepEqual(only.empty, { noDays: true, noLive: false });
  assert.equal(only.live.playing, 41);
  assert.equal(only.live.peak24h, 58, 'falls back to the servers\' own peaks');
  assert.equal(only.live.firstMinuteBouncePct, null);

  const hourAgo = Object.fromEntries(Object.entries(live.servers).map(([k, s]) => [k, { ...s, at: s.at - 3600 }]));
  const old = liveStatsView(days, { at: live.at - 3600, servers: hourAgo }, NOW);
  assert.equal(old.live.stale, true);
  assert.equal(old.live.servers, 0);
  assert.equal(old.live.playing, 0);
  assert.equal(old.live.slowestServer, null);
  assert.equal(old.live.worstPingMs, null);

  const junk = liveStatsView([null, 5, { date: 'bad', stats: {} }, { date: '2026-10-24', stats: 'x' }, { date: '2026-10-24', stats: {} }], { servers: 1 }, NOW);
  assert.equal(junk.empty.noDays, false);
  assert.equal(junk.live, null);
  assert.equal(junk.metrics.d1, null);
});

test('no user ids anywhere in the sample records or the view', () => {
  const text = JSON.stringify({ days, live, view });
  assert.ok(!/userId|"id":\s*\d{5,}/i.test(text));
});

test('the sample file for the Games page matches the view', () => {
  const sample = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures/live-view.sample.json'), 'utf8'));
  assert.deepEqual(sample, JSON.parse(JSON.stringify(view)));
});

test('the same hour in two day records is added together (events flushed just after midnight)', () => {
  const h = nowHour - 1;
  const mk = (date, bucket) => ({ date, stats: { hours: { [h]: bucket } } });
  const v = liveStatsView([
    mk('2026-10-23', { joins: 5, leaves: 1, robux: 100, errors: 0, peaks: { a: 10, b: 4 }, products: { X: 100 } }),
    mk('2026-10-24', { joins: 7, leaves: 2, robux: 50, errors: 1, peaks: { a: 12 }, products: { X: 50, Y: 5 } }),
  ], { at: Math.floor(NOW / 1000), servers: {} }, NOW);
  assert.deepEqual(v.charts.onlineByHour.peak, [16]); // a: max(10,12) + b: 4
  assert.deepEqual(v.charts.robuxByHour.products.map((p) => [p.name, p.values[0]]), [['X', 150], ['Y', 5]]);
  assert.equal(v.live.joins24h, 12);
});

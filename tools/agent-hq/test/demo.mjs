// Demo studio for looking at the UI: real server, temp state, no agents running, no network. Run: npm run demo (HQ_PORT, default 4400).
// The signed-in link is written to <state>/demo-url.txt, never printed.
// Everything here is about Run a Space Agency. Market numbers, spin-off pitches and idea scores are SAMPLE data, labelled as such.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addMessage, createAsk, createPitch, createTask, getGame, latestMarketSnapshots, saveMarketSnapshot, setSetting, updateGame, updateTask } from '../db.mjs';
import { computeBreakouts } from '../market.mjs';
import { recordPoints, upsertMeta } from '../market-history.mjs';
import { normalizePitch } from '../pitches.mjs';
import { startServer } from '../server.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const stateDir = process.env.HQ_DEMO_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'hq-demo-'));
const offline = async () => { throw new Error('the demo is offline'); };
const s = await startServer({
  root, port: Number(process.env.HQ_PORT) || 4400, stateDir, dbFile: path.join(stateDir, 'hq.db'),
  fetchCharts: offline, fetchers: { details: async () => ({}), icons: async () => ({}), thumbnails: async () => ({}) },
});
const { db } = s;
const HOUR = 3600e3;
const NOW = Date.now();
const ago = (ms) => new Date(NOW - ms).toISOString();

setSetting(db, 'ownerName', 'Priya');
if (!getGame(db, 'space-agency')) throw new Error('the server seeds space-agency'); // the only game
updateGame(db, 'space-agency', { stage: 'designed', nextStep: 'The plans (numbers, store, UI, map, look) and the Librarian gathers the assets' });

// ---- tasks: finished work waiting for the owner, work in flight, queued work, and done work with a cost ----
const task = (role, title, state, extra = {}) => {
  const t = createTask(db, { role, title, body: extra.body ?? '', game: 'space-agency', createdBy: 'lead' });
  if (state !== 'queued') updateTask(db, t.id, { state, startedAt: ago(extra.startedAgo ?? HOUR), summary: extra.summary ?? null, costUsd: extra.costUsd ?? null });
  return t;
};
const thumbs = task('thumbnails', 'Launch trailer and two thumbnails for Run a Space Agency', 'review', { costUsd: 0.42, summary: 'Cut a 40 second trailer from the build: the launch pad, the first mission, the map and the Titan flyby. Made two thumbnails, one on the title and one on the rocket.' });
task('ui', 'Mission reveals: Orbit, Moon and Titan', 'review', { costUsd: 0.31, summary: 'Three mission reveals. The countdown ends, the payout lands and the planet lights up in its colour. Rare trips take the whole screen; common ones stay small.' });
task('builder', 'Launch failure: staging and the abort button', 'working', { costUsd: 0.18 });
task('ui', 'Rocket shop: compare tabs and the Saturn unlock', 'working');
const eco = task('economy', 'Tune the first rocket price', 'working', { costUsd: 0.07 });
task('world', 'Launch pad pass: gantry lights and the fuel farm', 'queued');
task('kid-tester', 'Play build 12 on a phone: the first ten minutes', 'queued');
task('librarian', 'Find 12 rocket models and a launch gantry', 'queued');
for (const [role, title, days, cost] of [['playtester', 'Playtest build 11: the first session', 1, 0.22], ['builder', 'Fix the countdown that restarted on rejoin', 2, 0.35], ['architect', 'Plan the Titan mission tier', 3, 0.51], ['librarian', 'Register the rocket icons in the asset index', 5, 0.09], ['economy', 'Set the Mars payout curve', 6, 0.14]]) {
  task(role, title, 'done', { startedAgo: days * 24 * HOUR, costUsd: cost, summary: 'Done and checked.' });
}

// finished work is linked to its task, as hq_add_media does
createAsk(db, { role: 'thumbnails', taskId: thumbs.id, kind: 'review', title: 'Use this thumbnail?', why: '', mediaPath: 'assets/marketing/thumbnail_draft.png' });
createAsk(db, { role: 'thumbnails', taskId: thumbs.id, kind: 'review', title: 'Use this icon?', why: '', mediaPath: 'assets/marketing/icon_draft.png' });
createAsk(db, { role: 'economy', taskId: eco.id, kind: 'decision', title: 'Raise the first rocket price to 500?', why: 'Players reach it in 40 seconds, the target is 70.', options: [{ id: 'yes', label: 'Raise it', recommended: true }, { id: 'no', label: 'Keep it' }] });

// ---- two SAMPLE spin-off pitches (the second one carries a look) ----
const spinOff = (title, oneLiner, format, look) => normalizePitch({
  title, oneLiner, format, window: 'early', look, edge: 'Same rocket fantasy as Run a Space Agency, with a different core loop.',
  competitors: [{ name: 'Sample game 3', whatItIs: 'Sample competitor', gap: 'No shared moment for the whole server', universeId: 9000003 }],
  comparables: [{ name: 'Sample game 3', universeId: 9000003, playing: 52000, likeRatio: 88, upvotesPerDay: 1200, rankClimb: 4 }],
  money: { verdict: 'Sample verdict: mid-table earner.', topEarningRank: 212, comparable: 'Sample game 3' }, saturationCount: 7,
  game: { howItPlays: 'Sample loop.', first60s: 'Launch the first rocket in 15 seconds.', goal10to15: 'Unlock the second planet.', minutes10to20: 'Upgrade and repeat.', monetization: 'Cosmetics and boosts, never paid luck.', clipMoment: 'The launch countdown.', iconIdea: 'A rocket and a planet.', modules: ['Net', 'Launch'] },
  evidence: { summary: 'Sample data for the demo, not from the real charts. Re-check against live numbers before using it.', links: ['https://create.roblox.com/docs/discovery'] },
  building: { gaps: ['A second map'], assetNotes: 'Reuse the rocket models.', experience: 'About two weeks' }, risks: ['Sample data only'],
});
for (const d of [
  spinOff('Cargo Dash (sample pitch)', 'Deliver cargo between space stations before the timer runs out.', 'Race & rank', undefined),
  spinOff('Moon Base Builder (sample pitch)', 'Grow a Moon base from one dome to a busy colony with your friends.', 'Tycoon & expand', 'stylized'),
]) createPitch(db, { title: d.title, oneLiner: d.oneLiner, data: d });

// ---- SAMPLE market history: 120 snapshots, 6 hours apart, ending now. Every snapshot says sample: true. ----
const SORTS = [['top-trending', 'Trending'], ['up-and-coming', 'Up-and-Coming'], ['top-playing-now', 'Top Playing Now'], ['fun-with-friends', 'Fun with Friends'], ['top-revisited', 'Top Revisited'], ['top-earning', 'Top Earning']];
const STEPS = 120; const GAMES = 42;
const firstStep = (n) => (n === 41 ? 100 : n === 42 ? 110 : 0); // two games reach the charts in the last week
const RISERS = { 3: [114, 0.15], 5: [115, 0.2], 7: [112, 0.06], 9: [113, 0.08], 12: [116, 0.12], 15: [110, 0.03], 18: [114, 0.1], 22: [117, 0.3] }; // [first step of the climb, growth per step]
const players = (n, step) => {
  const base = 40000 / n ** 0.7; // game 1 is the biggest
  const timeOfDay = 1 + 0.25 * Math.sin(((step % 4) / 4) * 2 * Math.PI + n);
  const drift = 1 + 0.1 * Math.sin(step / 9 + n);
  const [from, rate] = RISERS[n] ?? [STEPS, 0]; // a few games climb in the last day
  return Math.round(base * timeOfDay * drift * (1 + Math.max(0, step - from) * rate));
};
const gameAt = (n, step) => ({ universeId: 9000000 + n, rootPlaceId: 9100000 + n, name: `Sample game ${n}`, playerCount: players(n, step), up: 8000 + ((n * 37) % 1500), down: 1000 + ((n * 53) % 800), genre: 'Sample', maturity: '', sponsored: false });
const sampleSnapshot = (step) => ({
  fetchedAt: ago((STEPS - 1 - step) * 6 * HOUR), sample: true,
  sorts: SORTS.map(([id, name], k) => ({
    id, name,
    games: Array.from({ length: GAMES }, (_, i) => i + 1).filter((n) => firstStep(n) <= step)
      .map((n) => ({ n, score: id === 'top-earning' ? 40000 / n ** 0.7 * (1 + 0.5 * Math.sin(n * 7)) : players(n, step) * (1 + 0.4 * Math.sin(n * (k + 2))) }))
      .sort((a, b) => b.score - a.score).slice(0, id === 'top-earning' ? 40 : 30).map((x) => gameAt(x.n, step)),
  })),
});
for (let step = 0; step < STEPS; step++) {
  const snap = sampleSnapshot(step);
  recordPoints(db, snap);
  if (step >= STEPS - 30) saveMarketSnapshot(db, snap); // the full snapshots keep only the newest 30
}
upsertMeta(db, Array.from({ length: GAMES }, (_, i) => ({ universeId: 9000000 + i + 1, name: `Sample game ${i + 1}`, visits: Math.round(4e6 / (i + 1)), favorites: Math.round(90000 / (i + 1)), created: '2025-06-01T00:00:00Z', creator: 'Sample studio', maxPlayers: 20 })), new Date().toISOString());
const details = Object.fromEntries([41, 42].map((n) => [9000000 + n, { visits: 45000, created: ago(10 * 24 * HOUR), genre: 'Sample' }]));
setSetting(db, 'breakouts', { rows: computeBreakouts(latestMarketSnapshots(db, 30), details, Date.now()), at: new Date().toISOString() });

// ---- SAMPLE idea scores, through the real routes: one open, one scored ----
const api = async (p, body) => (await fetch(`http://127.0.0.1:${s.port}${p}`, { method: 'POST', headers: { 'x-hq-token': s.ownerToken, 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
await api('/api/idea-scores', { title: 'Sample idea: space station tycoon', idea: 'Sample idea text. Build a station module by module and trade cargo with other players.' });
const scored = await api('/api/idea-scores', { title: 'Sample idea: asteroid mining', idea: 'Sample idea text. Send drones to asteroids, sell ore, and upgrade the fleet.' });
updateTask(db, scored.taskId, { state: 'done', startedAt: ago(2 * HOUR), costUsd: 0.2 });
await api(`/api/idea-scores/${scored.id}/score`, {
  verdict: 'Sample verdict: wanted, but a crowded field and a big build.',
  rows: [
    { name: 'Demand', score: 8, evidence: 'Sample evidence: Sample game 3 has 52K players and 88% likes.' },
    { name: 'Competition', score: 5, evidence: 'Sample evidence: 7 similar games on the charts.' },
    { name: 'Money', score: 6.5, evidence: 'Sample evidence: the nearest comparable sits at #212 in top earning.' },
    { name: 'First five minutes', score: 7.5, evidence: 'Sample evidence: the first sale lands inside 30 seconds.' },
    { name: 'Build size', score: 3.5, evidence: 'Sample evidence: needs a drone system, an ore market and a second map.' },
  ],
  change: 'Sample advice: cut the second map and ship one asteroid belt first.',
});

addMessage(db, { role: 'lead', from: 'owner', text: 'can missions get their own reveal? like a big moment' });
addMessage(db, { role: 'lead', from: 'agent', text: 'Yes. **UI** is making a reveal per mission tier: the countdown ends, the payout lands and the planet lights up. Rare trips take the whole screen; common ones stay small.' });
addMessage(db, { role: 'lead', from: 'owner', text: "how's it going?" });
addMessage(db, { role: 'lead', from: 'agent', text: 'Going well. **Build 12** is ready and both bugs Playtest found are fixed. Builder is on launch failure, and UI is on the rocket shop.\n\nIn Review for you: the **trailer and two thumbnails**, and the **mission reveals**.' });

fs.writeFileSync(path.join(stateDir, 'demo-url.txt'), `http://127.0.0.1:${s.port}/#owner=${s.ownerToken}\n`);
console.log(`Demo HQ on port ${s.port}. Signed-in link: ${path.join(stateDir, 'demo-url.txt')}`);
const stop = async () => { await s.close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

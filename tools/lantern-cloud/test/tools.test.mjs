// Tools section: Roblox game lookup, the pause command, and the bot's quick commands. Fakes only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { searchGames, likeRatio, gameLine } from '../roblox-search.mjs';
import { validateCommand } from '../hq-state.mjs';
import { createBrain } from '../brain.mjs';
import { snapshot } from './helpers.mjs';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const row = (universeId, name, playerCount, over = {}) => ({ contentType: 'Game', universeId, name, playerCount, totalUpVotes: 90, totalDownVotes: 10, creatorName: 'Maker', rootPlaceId: universeId * 10, description: 'line one\n\nline two', ...over });
function robloxFetch({ details = true } = {}) {
  const calls = [];
  const f = async (url) => {
    calls.push(String(url));
    if (String(url).includes('omni-search')) {
      return ok({ searchResults: [
        { contents: [row(1, 'Small', 5), row(2, 'Big', 900), row(3, 'Ad', 5000, { isSponsored: true }), row(2, 'Big again', 900)] },
        { contents: [{ contentType: 'User', universeId: 9, name: 'someone' }, row(4, 'Mid', 40, { totalUpVotes: 0, totalDownVotes: 0 })] },
      ] });
    }
    if (!details) return { ok: false, status: 429, json: async () => ({}) };
    return ok({ data: [{ id: 2, visits: 1234567, playing: 950, created: '2026-01-02T03:04:05Z', updated: '2026-11-01T00:00:00Z', genre_l1: 'Simulation' }] });
  };
  f.calls = calls;
  return f;
}

test('searchGames: games only, no ads, no duplicates, most players first, details merged', async () => {
  const f = robloxFetch();
  const games = await searchGames('  roll a hero ', { fetch: f });
  assert.deepEqual(games.map((g) => g.name), ['Big', 'Mid', 'Small']);
  assert.deepEqual({ ...games[0], about: undefined }, { universeId: 2, placeId: 20, name: 'Big', creator: 'Maker', playing: 950, likeRatio: 90, votes: 100, visits: 1234567, created: '2026-01-02', updated: '2026-11-01', genre: 'Simulation', maturity: null, url: 'https://www.roblox.com/games/20', about: undefined });
  assert.equal(games[0].about, 'line one line two');
  assert.equal(games[1].likeRatio, null);
  assert.match(f.calls[0], /searchQuery=roll%20a%20hero&/);
  assert.match(f.calls[1], /universeIds=2,4,1$/);
  assert.match(gameLine(games[0]), /^Big \(Maker\): 950 playing, 90% likes, 1,234,567 visits, updated 2026-11-01, universe 2$/);
});

test('searchGames: works without details, refuses bad input, respects the limit', async () => {
  const games = await searchGames('roll', { fetch: robloxFetch({ details: false }), limit: 2 });
  assert.equal(games.length, 2);
  assert.equal(games[0].visits, null);
  assert.equal(games[0].playing, 900);
  await assert.rejects(searchGames('a', { fetch: robloxFetch() }), /2 to 80 characters/);
  await assert.rejects(searchGames('x'.repeat(81), { fetch: robloxFetch() }), /2 to 80 characters/);
  assert.equal(likeRatio(0, 0), null);
  assert.equal(likeRatio(2, 1), 66.7);
});

test('the cloud copy of roblox-search.mjs matches the Agent HQ copy', () => {
  const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(read('../roblox-search.mjs'), read('../../agent-hq/roblox-search.mjs'));
});

test('pause command: boolean only', () => {
  const v = validateCommand({ type: 'pause', on: true, extra: 'x' }, snapshot());
  assert.equal(v.ok, true);
  assert.deepEqual(Object.keys(v.command).sort(), ['id', 'on', 'type']);
  assert.equal(validateCommand({ type: 'pause', on: 'yes' }, snapshot()).ok, false);
  assert.equal(validateCommand({ type: 'pause', on: false }, null).ok, false);
});

test('bot quick commands: queue, game, pause for the owner only, usage by role', async () => {
  const state = async () => ({ snapshot: snapshot({ spend: { totalUsd: 12.5, dayUsd: 1.25, byRole: { lead: 8, builder: 4.5 } } }), online: true, ageMs: 1000 });
  const boom = async () => { throw new Error('no network in tests'); };
  const brain = createBrain({ fetch: boom, apiKey: 'fake', getState: state, findGames: async (q) => (q === 'none' ? [] : [{ name: `Hit for ${q}`, creator: 'Maker', playing: 1200, likeRatio: 91.2, visits: 5000, updated: '2026-11-01', universeId: 7 }]) });
  assert.match((await brain.respond('queue')).reply, /\[working\] Build the HUD \(designer\)/);
  assert.match((await brain.respond('game roll a hero')).reply, /Hit for roll a hero \(Maker\): 1,200 playing, 91\.2% likes/);
  assert.match((await brain.respond('games none')).reply, /No Roblox games found/);
  assert.match((await brain.respond('usage')).reply, /\$12\.50 in all, \$1\.25 in the last 24 hours\. Top roles: lead \$8\.00, builder \$4\.50/);
  const p = await brain.respond('Pause');
  assert.deepEqual({ type: p.command.type, on: p.command.on }, { type: 'pause', on: true });
  assert.equal((await brain.respond('resume')).command.on, false);
  const asCollab = await brain.respond('pause', { collab: true }); // falls through to the model, which is unreachable here: no command either way
  assert.equal(asCollab.command, null);
});

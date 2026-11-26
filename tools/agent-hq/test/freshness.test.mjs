import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFreshness, parseWorktrees } from '../freshness.mjs';

test('parseWorktrees reads branches and detached copies', () => {
  const w = parseWorktrees('worktree C:/a\nHEAD 111\nbranch refs/heads/main\n\nworktree C:/b\nHEAD 222\ndetached\n');
  assert.deepEqual(w, [{ path: 'C:/a', head: '111', branch: 'main' }, { path: 'C:/b', head: '222', branch: null }]);
});

test('freshness: HQ behind its branch, an active session missing HQ commits, a game newer elsewhere; archived games skipped', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-fresh-'));
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-fresh-wt-'));
  for (const g of ['clip', 'dice']) fs.mkdirSync(path.join(root, 'games', g), { recursive: true });
  const now = Date.parse('2026-11-26T12:00:00Z');
  const fetches = [];
  const git = async (_root, a) => {
    const k = a.join(' ');
    if (a[0] === 'fetch') { fetches.push(k); return ''; }
    if (k === 'rev-parse HEAD') return 'aaaaaaa1';
    if (k === 'rev-parse origin/main') return 'bbbbbbb2';
    if (k === 'rev-list --count HEAD..origin/main') return '2';
    if (k === 'rev-list --count origin/main..HEAD') return '0';
    if (k === 'worktree list --porcelain') return `worktree ${root}\nHEAD aaaaaaa1\nbranch refs/heads/main\n\nworktree ${wt}\nHEAD ccc\nbranch refs/heads/claude/agent-hq-x`;
    if (k.startsWith('rev-list --count origin/main..claude/agent-hq-x')) return '0';
    if (k.startsWith('rev-list --count claude/agent-hq-x..origin/main')) return '3';
    if (k === 'log -1 --format=%cI claude/agent-hq-x') return '2026-11-26T08:00:00Z';
    if (k === 'log -1 --format=%H %cI HEAD -- games/clip') return 'm1 2026-11-20T00:00:00Z';
    if (k === 'log --all -1 --format=%H %cI -- games/clip') return 'n1 2026-11-25T00:00:00Z';
    if (k === 'rev-parse HEAD:games/clip') return 'tree-old';
    if (k === 'rev-parse n1:games/clip') return 'tree-new';
    if (k.startsWith('branch -a --contains n1')) return 'claude/game-branch\norigin/claude/game-branch';
    if (k.includes('games/dice')) throw new Error('archived games must not be checked');
    return '';
  };
  const f = createFreshness({ root, branch: () => 'main', skipGames: () => ['dice'], git, now: () => now });
  const r = await f.check();
  assert.equal(r.ok, false);
  assert.deepEqual(r.hq, { branch: 'main', head: 'aaaaaaa', remote: 'bbbbbbb', behind: 2, ahead: 0 });
  assert.equal(r.sessions.length, 1);
  assert.deepEqual([r.sessions[0].branch, r.sessions[0].missing, r.sessions[0].active], ['claude/agent-hq-x', 3, true]);
  assert.deepEqual(r.games, [{ slug: 'clip', hqCommit: 'm1', newest: { commit: 'n1', at: '2026-11-25T00:00:00Z', branches: ['claude/game-branch', 'origin/claude/game-branch'] }, stale: true }]);
  await f.check();
  assert.equal(fetches.length, 1, 'fetches at most every 10 minutes');
});

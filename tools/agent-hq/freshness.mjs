// Latest-copy check: is this HQ on the newest commit of its branch, are the Claude sessions (git worktrees of the same repo)
// missing newer Agent HQ work, and does any game have a newer copy on another branch than the one HQ builds in?
// Read only: it fetches and compares, and never checks out, merges or pushes anything.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const run = (root, args, timeout = 20000) => new Promise((resolve) => {
  execFile('git', ['-C', root, ...args], { windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024 }, (e, out) => resolve(e ? '' : String(out).trim()));
});
const HQ_PATHS = ['tools/agent-hq', 'scripts'];

/** Parse `git worktree list --porcelain`. */
export function parseWorktrees(text) {
  return String(text).split(/\r?\n\r?\n/).map((b) => {
    const o = {};
    for (const l of b.split(/\r?\n/)) { const [k, ...v] = l.split(' '); if (k) o[k] = v.join(' '); }
    return o.worktree ? { path: o.worktree, head: o.HEAD ?? '', branch: (o.branch ?? '').replace(/^refs\/heads\//, '') || null } : null;
  }).filter(Boolean);
}

export function createFreshness({ root, branch = () => null, skipGames = () => [], git = run, now = Date.now, every = 10 * 60000 }) {
  let cache = null;
  let fetchedAt = 0;
  async function check({ fetch = false } = {}) {
    const b = branch() || (await git(root, ['rev-parse', '--abbrev-ref', 'HEAD']));
    if (fetch || now() - fetchedAt > every) { await git(root, ['fetch', '--quiet', 'origin'], 60000); fetchedAt = now(); }
    const head = await git(root, ['rev-parse', 'HEAD']);
    const remote = b && b !== 'HEAD' ? await git(root, ['rev-parse', `origin/${b}`]) : '';
    const count = async (range, paths = []) => Number(await git(root, ['rev-list', '--count', range, ...(paths.length ? ['--', ...paths] : [])])) || 0;
    const hq = { branch: b, head: head.slice(0, 7), remote: remote.slice(0, 7), behind: remote ? await count(`HEAD..origin/${b}`) : 0, ahead: remote ? await count(`origin/${b}..HEAD`) : 0 };

    // Claude sessions: every worktree on a branch; missing = Agent HQ commits on HQ's branch that the worktree does not have
    const target = remote ? `origin/${b}` : 'HEAD';
    const sessions = [];
    for (const w of parseWorktrees(await git(root, ['worktree', 'list', '--porcelain']))) {
      if (!w.branch || path.resolve(w.path) === path.resolve(root) || !fs.existsSync(w.path)) continue;
      const touchesHq = Number(await git(root, ['rev-list', '--count', `${target}..${w.branch}`, '--', ...HQ_PATHS])) > 0; // it has HQ work of its own
      const missing = await count(`${w.branch}..${target}`, HQ_PATHS);
      const at = await git(root, ['log', '-1', '--format=%cI', w.branch]);
      const active = now() - Date.parse(at || 0) < 3 * 86400e3; // a session that committed in the last 3 days counts; old worktrees are listed only
      if (touchesHq || /agent-hq/i.test(w.branch)) sessions.push({ path: w.path, branch: w.branch, missing, touchesHq, active, lastCommitAt: at });
    }

    // games: the newest commit on any branch that changed games/<slug>, against the copy HQ builds in
    const games = [];
    let dirs = [];
    try { dirs = fs.readdirSync(path.join(root, 'games'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { /* no games folder */ }
    for (const slug of dirs.filter((d) => !skipGames().includes(d))) { // archived games are not checked
      const p = `games/${slug}`;
      const mine = await git(root, ['log', '-1', '--format=%H %cI', 'HEAD', '--', p]);
      const newest = await git(root, ['log', '--all', '-1', '--format=%H %cI', '--', p]);
      if (!newest) continue;
      const [nc, nat] = newest.split(' ');
      const [mc, mat = ''] = mine.split(' ');
      const same = mc && (await git(root, ['rev-parse', `HEAD:${p}`])) === (await git(root, ['rev-parse', `${nc}:${p}`]));
      const stale = !same && nat > mat;
      const on = stale ? (await git(root, ['branch', '-a', '--contains', nc, '--format=%(refname:short)'])).split(/\r?\n/).filter(Boolean).slice(0, 3) : [];
      games.push({ slug, hqCommit: (mc ?? '').slice(0, 7), newest: { commit: nc.slice(0, 7), at: nat, branches: on }, stale });
    }
    cache = { checkedAt: new Date(now()).toISOString(), hq, sessions, games,
      ok: hq.behind === 0 && !sessions.some((s) => s.active && s.missing > 0) && !games.some((g) => g.stale) };
    return cache;
  }
  return { check, last: () => cache };
}

export function mountFreshness(route, fresh, { HttpError }) {
  route('GET', /^\/api\/copies$/, async ({ query }) => { try { return await fresh.check({ fetch: query?.get('fetch') === '1' }); } catch (e) { throw new HttpError(502, e.message); } });
}
export const FRESHNESS_OWNER_ONLY = [['GET', /^\/api\/copies$/]];

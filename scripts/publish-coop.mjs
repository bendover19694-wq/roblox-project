// Publish the shared co-op branch both HQs run: newest Agent HQ (this checkout's HEAD) plus the newest game folder,
// committed on top of the branch's current tip (never a force push, so the partner's update always fast-forwards),
// pushed, then announced on Discord through the local Agent HQ (Updates card) when it is running.
// Usage: node scripts/publish-coop.mjs [--game <git ref>] [--branch coop/clipping-empire] [--dry-run] [--no-share]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const branch = opt('--branch', 'coop/clipping-empire');
const gameRef = opt('--game', 'origin/claude/confident-yonath-6d7817');
const dry = args.includes('--dry-run');
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const git = (a, env) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8', env: { ...process.env, ...env } }).trim();

git(['fetch', '-q', 'origin']);
const head = git(['rev-parse', 'HEAD']);
const game = git(['rev-parse', gameRef]);
let tip = '';
try { tip = git(['rev-parse', `origin/${branch}`]); } catch { /* first publish */ }

// tree = HEAD's tree with games/clipping-empire taken from the game ref
const idx = path.join(os.tmpdir(), `coop-index-${process.pid}`);
const env = { GIT_INDEX_FILE: idx };
try {
  git(['read-tree', 'HEAD'], env);
  git(['rm', '-r', '-q', '--cached', '--ignore-unmatch', 'games/clipping-empire'], env);
  git(['read-tree', '--prefix=games/clipping-empire/', `${game}:games/clipping-empire`], env);
  const tree = git(['write-tree'], env);
  if (tip && git(['rev-parse', `${tip}^{tree}`]) === tree) { console.log(`${branch} is already up to date (${tip.slice(0, 7)}).`); process.exit(0); }
  const msg = `Co-op update: Agent HQ ${head.slice(0, 7)} + game ${game.slice(0, 7)}\n\n${git(['log', '-1', '--format=%s', head])}\n${git(['log', '-1', '--format=%s', game])}\n`;
  const parents = [tip, head].filter(Boolean).flatMap((p) => ['-p', p]);
  const commit = execFileSync('git', ['-C', root, 'commit-tree', tree, ...parents], { input: msg, encoding: 'utf8' }).trim();
  console.log(`new ${branch} commit ${commit.slice(0, 7)} (parents: ${[tip, head].filter(Boolean).map((p) => p.slice(0, 7)).join(', ')})`);
  if (dry) { console.log('dry run: nothing pushed'); process.exit(0); }
  git(['push', '-q', 'origin', `${commit}:refs/heads/${branch}`]); // a normal push: fails instead of overwriting if someone else moved the branch
  console.log(`pushed ${branch}`);
} finally { fs.rmSync(idx, { force: true }); }

if (!args.includes('--no-share')) { // tell the partner through the running Agent HQ (Updates card, HQ Link)
  const tokenFile = [path.join(root, '.agent-hq', 'owner-token'), path.join(os.homedir(), 'Documents', 'Agent-HQ-App', '.agent-hq', 'owner-token')].find((f) => fs.existsSync(f));
  try {
    const r = await fetch('http://127.0.0.1:4317/api/version/share', { method: 'POST', headers: { 'x-hq-token': fs.readFileSync(tokenFile, 'utf8').trim(), 'content-type': 'application/json' }, body: JSON.stringify({ notes: `Shared branch ${branch} updated: Agent HQ ${head.slice(0, 7)}, game ${game.slice(0, 7)}.` }) });
    console.log(r.ok ? 'shared on Discord through Agent HQ' : `Agent HQ did not share (${r.status}): share it from HQ Link, Updates`);
  } catch { console.log('Agent HQ is not running: share it from HQ Link, Updates, when it is'); }
}

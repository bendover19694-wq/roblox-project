#!/usr/bin/env node
// Shared assets for Voltage and Ditto: each person's UI Lab kits (with their images and study notes) and asset packs go
// to the PRIVATE repo bendover19694-wq/hq-collab under shared/<name>/, and everything the other person shared is copied
// into this PC's Agent HQ and pack folder. Each person writes only their own folder, so the two never conflict.
//   node scripts/hq-assets-sync.mjs --me voltage          (Ditto: --me ditto)
// Never put tokens or .agent-hq secrets here: only uilab/ and media/uilab/ are read from .agent-hq. Never push this to the public repo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const me = String(arg('--me', '')).toLowerCase();
if (!/^[a-z][a-z0-9-]{1,20}$/.test(me)) { console.error('usage: node scripts/hq-assets-sync.mjs --me voltage|ditto [--dry-run]'); process.exit(2); }
const dry = process.argv.includes('--dry-run');
const docs = path.join(os.homedir(), 'Documents');
const stateDir = arg('--state', path.join(docs, 'Agent-HQ-App', '.agent-hq'));
const packsDir = arg('--packs', path.join(docs, 'LihFolk-Packs'));
const repo = arg('--repo', path.join(docs, 'hq-collab-sync'));
const REMOTE = 'https://github.com/bendover19694-wq/hq-collab.git';
const MAX_FILE = 90 * 1024 * 1024; // GitHub refuses files over 100 MB
const KIT = /^[a-z0-9-]{3,60}$/;

const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const copy = (from, to) => { if (!fs.existsSync(from)) return 0; let n = 0; fs.cpSync(from, to, { recursive: true, force: true, filter: (src) => { const st = fs.lstatSync(src); if (st.isSymbolicLink() || /(^|[\\/])\.git([\\/]|$)/.test(src)) return false; if (st.isFile()) { if (st.size > MAX_FILE) return false; n += 1; } return true; } }); return n; };
const dirs = (p) => { try { return fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; } };

if (!fs.existsSync(path.join(repo, '.git'))) { console.log(`cloning the shared assets repo into ${repo}`); execFileSync('git', ['clone', '--quiet', REMOTE, repo], { stdio: 'inherit' }); }
git('pull', '--quiet', '--rebase', '--autostash');

// 1. export mine
const mine = path.join(repo, 'shared', me);
let out = 0;
for (const id of dirs(path.join(stateDir, 'uilab')).filter((d) => KIT.test(d))) {
  for (const f of ['kit.json', 'notes.md']) { const src = path.join(stateDir, 'uilab', id, f); if (fs.existsSync(src)) { fs.mkdirSync(path.join(mine, 'uilab', id), { recursive: true }); fs.copyFileSync(src, path.join(mine, 'uilab', id, f)); out += 1; } }
  out += copy(path.join(stateDir, 'media', 'uilab', id), path.join(mine, 'uilab-media', id));
}
for (const p of dirs(packsDir).filter((d) => !d.startsWith('_') && d !== 'references' && d !== 'partner')) out += copy(path.join(packsDir, p), path.join(mine, 'packs', p));
// references: small folders are copied; references/github/<owner>_<repo> (1 GB of public GitHub repos) is shared as links
for (const d of dirs(path.join(packsDir, 'references')).filter((x) => x !== 'github')) out += copy(path.join(packsDir, 'references', d), path.join(mine, 'packs', 'references', d));
const refs = dirs(path.join(packsDir, 'references', 'github')).map((d) => /^([\w.-]+?)_([\w.-]+)$/.exec(d)).filter(Boolean).map((m) => `https://github.com/${m[1]}/${m[2]}`);
fs.mkdirSync(mine, { recursive: true });
fs.writeFileSync(path.join(mine, 'references.txt'), [...new Set(refs)].sort().join('\n') + '\n');
console.log(`exported ${out} files and ${new Set(refs).size} reference repos as ${me}`);

if (!dry) {
  git('add', '-A', path.join('shared', me));
  if (git('status', '--porcelain', '--', path.join('shared', me))) {
    git('commit', '--quiet', '-m', `Shared assets from ${me}`);
    git('push', '--quiet'); // a normal push; never force
    console.log('pushed');
  } else console.log('nothing new to push');
}

// 2. import theirs: kits and packs this PC does not have yet (never overwrites your own)
for (const who of dirs(path.join(repo, 'shared')).filter((d) => d !== me)) {
  const base = path.join(repo, 'shared', who);
  let kits = 0, packs = 0;
  for (const id of dirs(path.join(base, 'uilab')).filter((d) => KIT.test(d))) {
    if (fs.existsSync(path.join(stateDir, 'uilab', id))) continue;
    if (!dry) { copy(path.join(base, 'uilab', id), path.join(stateDir, 'uilab', id)); copy(path.join(base, 'uilab-media', id), path.join(stateDir, 'media', 'uilab', id)); }
    kits += 1;
  }
  for (const p of dirs(path.join(base, 'packs'))) {
    const to = fs.existsSync(path.join(packsDir, p)) ? null : path.join(packsDir, p);
    if (to && !dry) copy(path.join(base, 'packs', p), to);
    if (to) packs += 1;
  }
  const theirRefs = fs.existsSync(path.join(base, 'references.txt')) ? fs.readFileSync(path.join(base, 'references.txt'), 'utf8').split('\n').filter((u) => /^https:\/\/github\.com\//.test(u)) : [];
  const missing = theirRefs.filter((u) => !refs.includes(u));
  console.log(`from ${who}: ${kits} new UI Lab kits, ${packs} new packs${missing.length ? `, ${missing.length} reference repos you do not have (git clone --depth 1 each into ${path.join(packsDir, 'references')}):\n  ${missing.join('\n  ')}` : ''}`);
}
console.log(dry ? 'dry run: copied into the local clone only; nothing pushed or imported' : 'done. Restart Agent HQ (or press Refresh in the UI Lab) to see the new kits and packs.');

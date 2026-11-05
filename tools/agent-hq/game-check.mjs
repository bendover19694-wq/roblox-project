// Run a game's tests, format check and lint inside its own folder (agents cannot cd in headless mode).
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { gameFolder } from './game-context.mjs';

const TAIL = 4096;
const tail = (s) => { const t = String(s ?? ''); return t.length > TAIL ? t.slice(-TAIL) : t; };

export function defaultRun(cmd, args, { cwd, timeout }) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout, shell: false, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = `${stdout ?? ''}${stderr ?? ''}`;
      if (err?.code === 'ENOENT') return resolve({ missing: true, code: null, out: '' });
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: err?.killed ? `${out}\n(timed out)` : out });
    });
  });
}

/** stylua defaults differ from the repo's style; use the root config when the game folder has none. */
export function styluaArgs(root, folderAbs, exists = fs.existsSync) {
  const base = ['--check'];
  if (exists(path.join(folderAbs, 'stylua.toml')) || exists(path.join(folderAbs, '.stylua.toml'))) return [...base, 'src', 'tests'];
  const rootCfg = path.join(root, 'stylua.toml');
  return exists(rootCfg) && path.resolve(folderAbs) !== path.resolve(root)
    ? [...base, '--config-path', rootCfg, 'src', 'tests'] : [...base, 'src', 'tests'];
}

export async function runGameCheck({ root, slug, run = defaultRun, exists = fs.existsSync }) {
  const folder = gameFolder(root, slug);
  const cwd = path.resolve(root, folder);
  const plan = [
    ['lune', ['run', 'tests/run']],
    ['stylua', styluaArgs(root, cwd, exists)],
    ['selene', ['src']],
  ];
  const steps = [];
  for (const [cmd, args] of plan) {
    const label = [cmd, ...args].join(' ');
    const r = await run(cmd, args, { cwd, timeout: 120000 });
    if (r.missing) steps.push({ cmd: label, ok: true, skipped: true, code: null, tail: `${cmd} is not installed; skipped` });
    else steps.push({ cmd: label, ok: r.code === 0, code: r.code, tail: tail(r.out) });
  }
  return { game: slug, folder, steps, ok: steps.every((s) => s.ok) };
}

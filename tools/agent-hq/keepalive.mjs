// Keeps Agent HQ running: starts server.mjs and restarts it if it exits. Run hidden by scripts/agent-hq-hidden.vbs.
// Exits at once if HQ is already answering on 4317, so starting it twice is harmless.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.HQ_PORT) || 4317;
const logDir = path.join(ROOT, '.agent-hq', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'server.log');
const log = (line) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);

async function up() {
  try { return (await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

if (await up()) process.exit(0);

// Keep the log from growing forever: start fresh when it passes 5 MB.
try { if (fs.statSync(logFile).size > 5 * 1024 * 1024) fs.renameSync(logFile, logFile + '.old'); } catch { /* no log yet */ }

let fails = 0;
function start() {
  const started = Date.now();
  const out = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, [path.join(HERE, 'server.mjs')], { cwd: ROOT, stdio: ['ignore', out, out], windowsHide: true });
  log(`started server pid ${child.pid}`);
  child.on('exit', (code, signal) => {
    fs.closeSync(out);
    // A quick crash loop backs off (2 s, 4 s ... up to 60 s); a long healthy run resets the counter.
    fails = Date.now() - started > 60_000 ? 0 : fails + 1;
    const wait = Math.min(60_000, 2000 * 2 ** Math.min(fails, 5));
    log(`server exited (code ${code}, signal ${signal}); restarting in ${wait / 1000}s`);
    setTimeout(async () => { if (!(await up())) start(); else log('another HQ is already running; supervisor idle'); }, wait);
  });
}
start();

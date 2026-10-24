import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const isWin = process.platform === 'win32';

function find(name) {
  try {
    const out = execFileSync(isWin ? 'where' : 'which', [name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!isWin) return lines[0] ?? null;
    // Windows: only spawnable files count (the extensionless npm shim is a sh script)
    return lines.find((l) => /\.exe$/i.test(l)) ?? lines.find((l) => /\.(cmd|bat)$/i.test(l)) ?? null;
  } catch {
    return null;
  }
}

/** Resolved once at startup. Only the optional claude-cli engine needs an exe; "echo" is built in. */
export function detectEngines() {
  return { 'claude-cli': find('claude') };
}

/**
 * Node refuses to spawn .cmd/.bat with shell:false (EINVAL), and we never use a shell for user text.
 * npm shims just forward to a real exe or js file, so read the target out of the shim.
 */
function resolveCommand(exe, args) {
  if (!/\.(cmd|bat)$/i.test(exe)) return { command: exe, args };
  const shim = fs.readFileSync(exe, 'utf8');
  const m = shim.match(/"%dp0%\\([^"]+\.(?:exe|js|mjs|cjs))"/i);
  if (!m) throw new Error(`cannot resolve ${exe} without a shell`);
  const target = path.join(path.dirname(exe), m[1]);
  return /\.exe$/i.test(target)
    ? { command: target, args }
    : { command: process.execPath, args: [target, ...args] };
}

const ECHO_CODE = `
const ms = Number(process.env.HQ_ECHO_MS || 150);
const out = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
out({ type: 'assistant', message: { content: [{ type: 'text', text: 'echo ok' }] } });
setTimeout(() => { out({ type: 'result', subtype: 'success', result: 'echo ok', total_cost_usd: 0, session_id: 'echo-session' }); process.exit(0); }, ms);
`;

export function spawnEngine({ engine, exe, brief, model, allowedTools = [], mcpConfigPath, cwd, env }) {
  let command, args;
  if (engine === 'echo') {
    command = process.execPath;
    args = ['-e', ECHO_CODE];
  } else if (engine === 'claude-cli') {
    ({ command, args } = resolveCommand(exe, [
      '-p', brief, '--output-format', 'stream-json', '--verbose',
      '--model', model || 'sonnet',
      '--permission-mode', 'acceptEdits',
      '--allowedTools', ...allowedTools,
      '--mcp-config', mcpConfigPath, '--strict-mcp-config',
    ]));
  } else {
    throw new Error(`unknown engine: ${engine}`);
  }
  return spawn(command, args, {
    cwd, env: env ?? process.env, shell: false, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !isWin, // own process group so cancel can kill the tree with process.kill(-pid)
  });
}

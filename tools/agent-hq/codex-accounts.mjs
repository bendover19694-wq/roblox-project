// ChatGPT account rotation for the codex engine. Each account is its own CODEX_HOME folder with its own `codex login`.
// A task runs on the first account that is not at its usage limit. When Codex answers "You've hit your usage limit ...
// try again at <date>", that account is marked until then and the task goes back to the queue for the next account.
import os from 'node:os';
import path from 'node:path';

// Out of usage (both CLIs' wording) or a login that no longer works: either way the next account takes the task.
export const LIMIT = /usage limit|limit reached|hit your (?:usage )?limit|OAuth session expired|Failed to authenticate|not logged in|Invalid API key/i;
/** Per engine: where its accounts and limits are kept, and the variable that points the CLI at one account's folder. */
export const ENGINE_ACCOUNTS = {
  codex: { accounts: 'codexAccounts', limits: 'codexLimits', envVar: 'CODEX_HOME', label: 'ChatGPT', add: 'scripts/codex-add-account.ps1' },
  'claude-cli': { accounts: 'claudeAccounts', limits: 'claudeLimits', envVar: 'CLAUDE_CONFIG_DIR', label: 'Claude', add: 'scripts/claude-add-account.ps1' },
};
export const DEFAULT_HOME = 'default'; // ~/.codex, the account `codex login` set up first
const FALLBACK_MS = 5 * 60 * 60 * 1000; // when the message has no readable date

/** When the limit resets: "try again at Nov 29th, 2026 5:11 PM." -> epoch ms; otherwise now + 5 hours. */
export function resetAt(message, now = Date.now()) {
  const epoch = /\|(\d{10})(?!\d)/.exec(String(message)); // Claude: "Claude AI usage limit reached|1764000000"
  if (epoch && Number(epoch[1]) * 1000 > now) return Number(epoch[1]) * 1000;
  if (/OAuth session expired|Failed to authenticate|not logged in|Invalid API key/i.test(String(message))) return now + 6 * 3600e3; // a dead login: retry it after 6 hours
  const m = /try again (?:at|on|in) ([^.\n]+?)(?:\.|$)/i.exec(String(message));
  if (m) {
    const when = Date.parse(m[1].replace(/(\d+)(st|nd|rd|th)/, '$1').replace(/\s+at\s+/i, ' '));
    if (Number.isFinite(when) && when > now) return when;
    const mins = /(\d+)\s*(minute|hour|day)s?/i.exec(m[1]);
    if (mins) return now + Number(mins[1]) * { minute: 60e3, hour: 3600e3, day: 86400e3 }[mins[2].toLowerCase()];
  }
  return now + FALLBACK_MS;
}

/** Account homes in order; the default ~/.codex first unless the owner listed accounts. */
export const homes = (accounts) => (Array.isArray(accounts) && accounts.length ? accounts.map((a) => a.home) : [DEFAULT_HOME]);

/** The first account not at its limit, or { home: null, next } with the earliest reset when all are. */
export function pick(accounts, limits = {}, now = Date.now()) {
  const list = homes(accounts);
  const home = list.find((h) => !(limits[h] > now));
  if (home !== undefined) return { home, env: home === DEFAULT_HOME ? null : home };
  return { home: null, next: Math.min(...list.map((h) => limits[h])) };
}

/** Limits with one account marked until its reset; expired marks are dropped. */
export function mark(limits = {}, home, until, now = Date.now()) {
  const out = Object.fromEntries(Object.entries(limits).filter(([, t]) => t > now));
  out[home] = until;
  return out;
}

/** Settings validation: [{ name, home }] with absolute home folders, at most 8. */
export function validAccounts(value, bad) {
  if (!Array.isArray(value) || value.length > 8) throw bad('codexAccounts must be a list of up to 8 accounts');
  const seen = new Set();
  return value.map((a) => {
    if (!a || typeof a !== 'object') throw bad('each codex account is {name, home}');
    const name = String(a.name ?? '').trim();
    if (!/^[\w .-]{1,40}$/.test(name)) throw bad('account name: letters, digits, space, dot, dash; up to 40');
    const home = a.home === DEFAULT_HOME ? DEFAULT_HOME : path.resolve(String(a.home ?? ''));
    if (home !== DEFAULT_HOME && (!path.isAbsolute(String(a.home ?? '')) || !home.startsWith(os.homedir()))) throw bad(`account ${name}: home must be a folder in your user folder, or "default"`);
    if (seen.has(home)) throw bad(`account ${name}: that folder is listed twice`);
    seen.add(home);
    return { name, home };
  });
}

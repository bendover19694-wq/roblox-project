// Version sharing over HQ Link: show this HQ's version, share it on Discord in one click (or automatically on start),
// and apply a version the partner shared. Applying always runs this PC's own update script on this PC's own branch:
// the partner's message only tells you a new version exists, it never picks what runs here.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';

const git = (root, args) => new Promise((resolve) => {
  execFile('git', ['-C', root, ...args], { windowsHide: true, timeout: 10000 }, (e, out) => resolve(e ? '' : String(out).trim()));
});

export function appBranch({ home = os.homedir() } = {}) {
  try { return JSON.parse(fs.readFileSync(path.join(home, 'Documents', 'Agent-HQ-App.json'), 'utf8')).branch || null; } catch { return null; }
}

/** Notes for an announcement: the commit subjects since the last shared version, newest first, at most 8. */
export async function versionInfo(root, since) {
  const commit = await git(root, ['rev-parse', 'HEAD']);
  const branch = appBranch() || (await git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])) || 'unknown';
  const range = since && /^[0-9a-f]{7,40}$/.test(since) ? [`${since}..HEAD`] : ['-8'];
  const subjects = (await git(root, ['log', '--format=%s', '--no-merges', ...range])).split('\n').filter(Boolean).slice(0, 8);
  return { commit, branch, subjects };
}

export function createUpdates({ root, db, D, link, emit = () => {}, run = (script, args) => spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { detached: true, stdio: 'ignore', windowsHide: true }).unref() }) {
  const get = (k, f) => D.getSetting(db, k, f);
  async function view() {
    const last = get('lastShared', null);
    const v = await versionInfo(root, last?.commit);
    return { ...v, short: v.commit.slice(0, 7), lastShared: last, partner: get('linkUpdate', null), autoShare: get('announceUpdates', false) === true };
  }
  async function share(extra = '') {
    const v = await versionInfo(root, get('lastShared', null)?.commit);
    if (!/^[0-9a-f]{40}$/.test(v.commit)) throw new Error('this copy of Agent HQ is not a git checkout');
    if (get('lastShared', null)?.commit === v.commit && !extra) return { ok: true, already: true, short: v.commit.slice(0, 7) };
    const notes = [extra.trim(), ...v.subjects.map((s) => `- ${s}`)].filter(Boolean).join('\n').slice(0, 1200) || '- small fixes';
    await link.announce({ commit: v.commit, branch: v.branch, notes });
    D.setSetting(db, 'lastShared', { commit: v.commit, at: new Date().toISOString() });
    emit('settings', { key: 'lastShared' });
    return { ok: true, short: v.commit.slice(0, 7) };
  }
  // On start: share a new version by itself when the owner turned "Share updates automatically" on.
  async function autoShare() {
    if (get('announceUpdates', false) !== true) return null;
    try { return await share(); } catch { return null; }
  }
  function apply() {
    const script = path.join(root, 'scripts', 'agent-hq-update.ps1');
    if (process.platform !== 'win32' || !fs.existsSync(script)) throw new Error('the update script runs on the Windows app copy only');
    run(script, []); // updates this copy to the newest commit of its own branch, then restarts the server
    return { started: true };
  }
  return { view, share, autoShare, apply };
}

export function mountUpdates(route, updates, { str, bad, isObj, HttpError }) {
  const run = async (fn) => { try { return await fn(); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(502, e.message); } };
  route('GET', /^\/api\/version$/, () => updates.view());
  route('POST', /^\/api\/version\/share$/, ({ body }) => run(() => updates.share(isObj(body) ? str(body.notes, 'notes', { max: 600 }) ?? '' : '')));
  route('POST', /^\/api\/version\/apply$/, () => { try { return updates.apply(); } catch (e) { throw bad(e.message); } });
}

export const UPDATES_OWNER_ONLY = [['POST', /^\/api\/version\/(?:share|apply)$/]];

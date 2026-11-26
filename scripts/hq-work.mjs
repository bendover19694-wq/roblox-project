#!/usr/bin/env node
// Co-op ping for the AIs that change Agent HQ itself (Voltage's and Ditto's Claude). Run it before you edit tools/agent-hq
// and after you push, so the two never edit HQ at the same time:
//   node scripts/hq-work.mjs start "UI Lab scraper"
//   node scripts/hq-work.mjs done "UI Lab scraper"
// It goes over HQ Link when the two HQs are paired (the other HQ answers with its version: see HQ Link, Talk), and falls back
// to a plain post in #ditto-collab through the Discord bridge. Only a topic and the commit go out, never file contents.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [state, ...rest] = process.argv.slice(2);
const topic = rest.join(' ').trim();
if (!['start', 'done'].includes(state) || !topic) {
  console.error('usage: node scripts/hq-work.mjs start|done "<topic>"');
  process.exit(2);
}
const stateDir = process.env.HQ_STATE_DIR || path.join(os.homedir(), 'Documents', 'Agent-HQ-App', '.agent-hq');
const port = process.env.HQ_PORT || '4317';
let token;
try { token = fs.readFileSync(path.join(stateDir, 'owner-token'), 'utf8').trim(); } catch { console.error(`no Agent HQ found at ${stateDir} (set HQ_STATE_DIR)`); process.exit(1); }
const call = async (route, body) => {
  const r = await fetch(`http://127.0.0.1:${port}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hq-token': token }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
let commit = '';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* not a checkout */ }

try {
  const r = await call('/api/link/work', { state, topic });
  if (r.status === 200) { console.log(`HQ Link: ${state} "${topic}" sent (HQ ${r.json.commit?.slice(0, 7) || '?'}). Their HQ answers with its version on the HQ Link page.`); process.exit(0); }
  const text = state === 'start'
    ? `HQ work start: ${topic} @ ${commit || 'unknown'}. Please reply with your Agent HQ version and whether you are editing tools/agent-hq.`
    : `HQ change: ${commit || 'unknown'} ${topic}`;
  const b = await call('/api/bridge/ditto', { text });
  if (b.status !== 200) throw new Error(`HQ Link said ${r.json.error ?? r.status}; the bridge said ${b.json.error ?? b.status}`);
  console.log(`#ditto-collab: "${text}"${b.json.held ? ' (held for the owner\'s send)' : ''}`);
} catch (e) {
  console.error(`could not ping: ${e.message}. Is Agent HQ running on port ${port}?`);
  process.exit(1);
}

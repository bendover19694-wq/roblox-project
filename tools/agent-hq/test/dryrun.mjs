// End-to-end dry run (node test/dryrun.mjs): a throwaway server: owner actions over HTTP, agent actions through the real mcp.mjs
// (agent token + per-task tokens), exactly as the Claude app worker and Antigravity would. No real agent runs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../../..');
const { startServer } = await import(pathToFileURL(path.join(root, 'tools/agent-hq/server.mjs')).href);
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-dry-'));
// Role memory goes to the temp folder too, so the dry run never writes lessons into the committed memory files.
const s = await startServer({ root, port: 0, stateDir, memoryDir: path.join(stateDir, 'memory') });
const base = `http://127.0.0.1:${s.port}`;

const results = [];
const check = (ok, msg, extra = '') => { results.push([!!ok, msg]); console.log((ok ? 'PASS ' : 'FAIL ') + msg + (ok || !extra ? '' : '  -> ' + String(extra).slice(0, 300))); };
const http = async (tok, method, route, body) => {
  const r = await fetch(base + route, { method, headers: { 'x-hq-token': tok, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await r.json(); } catch { /* non-json */ }
  return { status: r.status, json };
};
const owner = (m, r, b) => http(s.ownerToken, m, r, b);
const agentHttp = (m, r, b) => http(s.token, m, r, b);

// The shared MCP server, as a Claude desktop session (no HQ_TASK) would run it.
const mcp = spawn(process.execPath, [path.join(root, 'tools/agent-hq/mcp.mjs')], { env: { ...process.env, HQ_URL: base, HQ_TOKEN: s.token, HQ_TASK: '', HQ_ROLE: '', HQ_TASK_TOKEN: '' } });
let buf = ''; let id = 0; const pend = {};
mcp.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) { const m = JSON.parse(l); pend[m.id]?.(m); } } });
mcp.stderr.on('data', (d) => process.stderr.write(d));
const rpc = (method, params) => new Promise((r) => { const n = ++id; pend[n] = r; mcp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
const tool = async (name, args) => { const r = await rpc('tools/call', { name, arguments: args }); const text = r.result?.content?.[0]?.text ?? JSON.stringify(r.error); return { err: !!r.result?.isError, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() }; };
await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'dry-run', version: '1' } });
const tools = (await rpc('tools/list', {})).result.tools.map((t) => t.name);
check(tools.length >= 15, `MCP exposes ${tools.length} tools`);

// Claim the next task for a lane the way /hq-worker or the Antigravity automation does, and read the token from the brief.
async function claim(engine) {
  const r = await tool('hq_next_task', { engine });
  if (!r.json?.task) return null;
  const token = r.json.brief.match(/Your HQ task token: ([0-9a-f]{64})/)?.[1];
  return { task: r.json.task, brief: r.json.brief, token };
}
const as = (c) => ({ taskId: c.task.id, taskToken: c.token });

// ---------- 1. Owner talks to the Lead ----------
await owner('POST', '/api/messages', { role: 'lead', text: 'Add a daily login bonus and a concept for the bonus popup.' });
const gate = await tool('hq_lane_gate', { engine: 'app', manual: true });
check(gate.json?.run === true, 'app lane gate says run (manual, queue has work)', gate.text);

const lead = await claim('app');
check(lead?.task.role === 'lead', 'Claude app lane claims the Lead task first');
check(lead?.token && !JSON.stringify((await owner('GET', '/api/tasks')).json).includes(lead.token), 'task token is in the brief only, never in task listings');
for (const [needle, what] of [['Rules every agent gets', 'hard rules'], ['owner-token', 'owner-token ban'], ['Skills you must use', 'skills section'], ['Definition of done', 'definition of done'], ['roblox-agent-team', 'lead skill loadout'], ['Your HQ task id', 'task id line']]) {
  check(lead?.brief.includes(needle), `lead brief has ${what}`);
}

// ---------- 2. Lead delegates; a non-lead cannot ----------
const b1 = await tool('hq_create_task', { ...as(lead), role: 'builder', title: 'Daily login bonus (server)', body: 'Pay Cash once per UTC day on the server. Tests in tests/.' });
const d1 = await tool('hq_create_task', { ...as(lead), role: 'designer', title: 'Concept: daily bonus popup', body: 'Two variations, phone landscape.' });
check(!b1.err && !d1.err, 'Lead creates a builder task and a designer task', b1.text + d1.text);
check(d1.json?.engine === 'antigravity', 'designer task lands on the Antigravity lane', d1.text);
await tool('hq_complete', { ...as(lead), summary: 'Delegated to builder and designer.', state: 'done' });

// ---------- 3. Builder works, learns, finishes; gates queue ----------
const builder = await claim('app');
check(builder?.task.role === 'builder', 'next app task is the builder');
check(['superpowers:test-driven-development', 'superpowers:verification-before-completion'].every((sk) => builder?.brief.includes(sk)), 'builder brief names its skills');
const sneaky = await tool('hq_create_task', { ...as(builder), role: 'merchant', title: 'x', body: 'y' });
check(sneaky.err, 'builder cannot create tasks (lead-only)');
const spoof = await tool('hq_create_task', { taskId: lead.task.id, taskToken: builder.token, role: 'merchant', title: 'x', body: 'y' });
check(spoof.err, "builder cannot use the lead's task id with its own token");
await tool('hq_note', { ...as(builder), text: 'Wiring DailyBonus into AgencyService.' });
const learn = await tool('hq_learn', { ...as(builder), lesson: 'Daily rewards key on UTC day numbers, never local time.' });
check(!learn.err, 'builder records a lesson', learn.text);
const leak = await tool('hq_add_media', { ...as(builder), path: '.agent-hq/owner-token', ask: 'look' });
check(leak.err, 'builder cannot attach the owner token as media');
await tool('hq_complete', { ...as(builder), summary: 'Changed src/server/Services/AgencyService.luau and tests/Economy.spec.luau. stylua, selene, lune pass.', state: 'review' });
const afterBuild = (await owner('GET', '/api/tasks')).json;
const gates = afterBuild.filter((t) => t.gateFor === builder.task.id).map((t) => t.role).sort();
check(JSON.stringify(gates) === JSON.stringify(['playtester', 'reviewer']), `review gates queued: ${gates.join(', ')}`);

// ---------- 4. Reviewer fails it, Fix task appears, then both gates pass ----------
async function claimRole(role) { for (let i = 0; i < 6; i++) { const c = await claim('app'); if (!c) return null; if (c.task.role === role) return c; await tool('hq_complete', { ...as(c), summary: 'PASS (dry run filler)', state: 'done' }); } return null; }
const rev = await claimRole('reviewer');
await tool('hq_complete', { ...as(rev), summary: 'FAIL: the bonus can be claimed twice if two requests race. Add a per-player lock.', state: 'done' });
const fix = (await owner('GET', '/api/tasks')).json.find((t) => t.parentId === builder.task.id && t.title.startsWith('Fix:'));
check(fix && fix.attempt === 2 && fix.role === 'builder', 'FAIL queues a Fix task for the builder, attempt 2');
const fixC = await claimRole('builder');
check(fixC?.brief.includes('Reviewer feedback') && fixC?.brief.includes('UTC day numbers'), 'Fix brief carries reviewer feedback and the builder lesson');
await tool('hq_complete', { ...as(fixC), summary: 'Added a per-player lock; retry-safe. Checks pass.', state: 'review' });
for (const role of ['reviewer', 'playtester']) { const g = await claimRole(role); await tool('hq_complete', { ...as(g), summary: 'PASS: looks right.', state: 'done' }); }
const fixDone = (await owner('GET', '/api/tasks')).json.find((t) => t.id === fix?.id);
check(fixDone?.state === 'done', 'all gates PASS marks the fixed task done', fixDone?.state);

// ---------- 5. Antigravity design lane, owner approval, UI follow-up ----------
const agate = await tool('hq_lane_gate', { engine: 'antigravity', manual: true });
check(agate.json?.run === true, 'Antigravity lane gate says run', agate.text);
const des = await claim('antigravity');
check(des?.task.role === 'designer', 'Antigravity lane claims the designer task');
check(des?.brief.includes('.agents/rules/agent-hq-art-direction.md') && des?.brief.includes('roblox-ui-concept'), 'designer brief points at the art rules and UI concept skill');
const media = await tool('hq_add_media', { ...as(des), path: 'assets/marketing/icon_draft.png', ask: 'Scores R5 I4 S4 H5 P4 D4. Does this read at phone size?' });
check(!media.err, 'designer attaches a concept image', media.text);
await tool('hq_complete', { ...as(des), summary: 'One concept at assets/marketing/icon_draft.png (dry run).', state: 'review' });
const review = (await owner('GET', '/api/asks')).json.find((a) => a.taskId === des.task.id && a.kind === 'review');
await owner('POST', `/api/asks/${review.id}/answer`, { answer: 'approve' });
const uiTask = (await owner('GET', '/api/tasks')).json.find((t) => t.parentId === des.task.id && t.role === 'ui');
check(uiTask?.engine === 'app' && uiTask?.state === 'queued', 'approving the concept queues a UI build task on the Claude lane');
const agentAnswers = await agentHttp('POST', `/api/asks/${review.id}/answer`, { answer: 'approve' });
check(agentAnswers.status === 403, 'agents cannot answer owner asks');

// ---------- 6. Scout pitch, owner approves, Lead plans it ----------
await owner('POST', '/api/tasks', { role: 'scout', title: 'Find one rising format', body: 'Dry run.' });
const scout = await claimRole('scout');
const pitch = await tool('hq_pitch', { ...as(scout), title: 'Orbital delivery rush', oneLiner: 'Race cargo rockets to stations.', format: 'collect-and-upgrade', window: 'early', origin: 'scout', edge: 'Upgrades change the launch window.', competitors: [{ name: 'Sample', whatItIs: 'Runner', gap: 'no return reason' }], comparables: [{ name: 'Sample', playing: 1200 }], money: { verdict: 'Room for a polished take.' }, game: { howItPlays: 'Plan, launch, dock, earn.', first60s: 'First payout.', goal10to15: 'Moon route.', minutes10to20: 'Pick upgrades.', monetization: 'Liveries.', clipMoment: 'Last-second dock.', iconIdea: 'Rocket docking.', modules: ['Routes'] }, evidence: { summary: 'Dry run.', links: ['https://www.roblox.com/charts'] }, building: { gaps: ['Docking'], assetNotes: 'Reuse parts.', experience: 'Fits.' }, risks: ['Close to our game.'] });
check(!pitch.err, 'scout posts a full pitch', pitch.text);
await tool('hq_complete', { ...as(scout), summary: 'One pitch posted.', state: 'done' });
const p = (await owner('GET', '/api/pitches')).json.find((x) => x.title === 'Orbital delivery rush');
const agentDecide = await agentHttp('POST', `/api/pitches/${p.id}/decide`, { state: 'approved' });
check(agentDecide.status === 403, 'agents cannot approve pitches');
await owner('POST', `/api/pitches/${p.id}/decide`, { state: 'approved' });
const plan = (await owner('GET', '/api/tasks')).json.find((t) => t.role === 'lead' && /Orbital delivery rush/.test(t.title));
check(!!plan, 'approved pitch queues a Lead planning task');

// ---------- 7. Producer stage request, owner approves, only owner publishes ----------
await owner('POST', '/api/tasks', { role: 'producer', title: 'Check the build evidence', body: 'Dry run.' });
const prod = await claimRole('producer');
const toLive = await tool('hq_stage_request', { ...as(prod), game: 'space-agency', toStage: 'live', evidence: 'x' });
check(toLive.err, 'agents cannot request the live stage');
const sr = await tool('hq_stage_request', { ...as(prod), game: 'space-agency', toStage: 'balanced', evidence: 'Economy tests pass; pacing notes attached.' });
check(!sr.err, 'producer requests built -> balanced', sr.text);
const reqs = (await owner('GET', '/api/stage-requests?state=open')).json;
const reqId = (Array.isArray(reqs) ? reqs : reqs?.requests || [])[0]?.id;
await owner('POST', `/api/stage-requests/${reqId}/decide`, { state: 'approved' });
const game = (await owner('GET', '/api/games')).json.find?.((g) => g.slug === 'space-agency') || (await owner('GET', '/api/games')).json.games?.find((g) => g.slug === 'space-agency');
check(game?.stage === 'balanced', 'owner approval moves the game to balanced', game?.stage);
check((await agentHttp('POST', '/api/games/space-agency/mark-live', {})).status === 403, 'agents cannot mark a game live');

// ---------- 8. Sign-in, settings and cadence ----------
const page = await (await fetch(base + '/')).text();
check(!page.includes(s.ownerToken) && !page.includes(s.token), 'dashboard page carries no token');
check((await agentHttp('POST', '/api/settings', { key: 'paused', value: true })).status === 403, 'agents cannot change settings');
await owner('POST', '/api/settings', { key: 'laneSchedules', value: { app: { enabled: true, everyMinutes: 120, activeFrom: '22:00', activeTo: '06:00', maxTasks: 4 }, antigravity: { enabled: false, everyMinutes: 20, activeFrom: '00:00', activeTo: '24:00', maxTasks: 6 } } });
const off = await tool('hq_lane_gate', { engine: 'antigravity', manual: false });
check(off.json?.run === false && /paused/.test(off.json?.reason || ''), 'a disabled lane stops the automation', off.text);
const mem = (await owner('GET', '/api/memory/builder')).json;
check(JSON.stringify(mem).includes('UTC day numbers'), 'builder lesson is in role memory');

// ---------- 9. Visual bar, reject with a reason, back to you, publish gate ----------
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64').toString('base64');
const up = await owner('POST', '/api/uploads', { name: 'house.png', mime: 'image/png', dataBase64: png });
const pin = await owner('POST', '/api/references', { mediaPath: up.json?.path, category: 'ui-icons', note: 'the coin icon' });
check(pin.status === 200, 'owner pins an approved image on the Visual bar', JSON.stringify(pin.json));
check((await agentHttp('POST', '/api/references', { mediaPath: up.json?.path, category: 'screens' })).status === 403, 'agents cannot pin house references');
const dTask = (await owner('POST', '/api/tasks', { role: 'designer', title: 'Concept: shop header', body: 'Dry run.' })).json;
check((await owner('GET', `/api/tasks/${dTask.id}/brief`)).json.brief.includes(up.json?.path), 'the designer brief lists the pinned house reference');

await owner('POST', '/api/tasks', { role: 'scout', title: 'Concept sheet for review', body: 'Dry run.' });
const sc2 = await claimRole('scout');
await tool('hq_add_media', { ...as(sc2), path: 'assets/marketing/icon_draft.png', ask: 'Does this read at phone size?' });
await tool('hq_complete', { ...as(sc2), summary: 'Sheet attached.', state: 'review' });
const askRev = (await owner('GET', '/api/asks?state=open')).json.find((a) => a.taskId === sc2.task.id && a.kind === 'review');
const rj = await owner('POST', `/api/asks/${askRev.id}/answer`, { answer: 'reject:The coin is too small at 150 px' });
check(rj.json?.verdict === 'rejected' && rj.json?.verdictNote === 'The coin is too small at 150 px', 'reject keeps the owner reason on the ask', JSON.stringify(rj.json));
check((await owner('GET', '/api/messages?role=scout')).json.some((m) => /Reason: The coin is too small/.test(m.text)), 'the reason reaches the agent thread');

await owner('POST', '/api/tasks', { role: 'scout', title: 'Summarise the trend', body: 'Dry run.' });
const sc3 = await claimRole('scout');
await tool('hq_complete', { ...as(sc3), summary: 'Trend summary.', state: 'review' });
check((await agentHttp('POST', `/api/tasks/${sc3.task.id}/verdict`, { verdict: 'approve' })).status === 403, 'agents cannot give the back-to-you verdict');
const back = await owner('POST', `/api/tasks/${sc3.task.id}/verdict`, { verdict: 'changes', note: 'Add the top three examples' });
check(back.json?.rework?.attempt === 2 && /Add the top three examples/.test(back.json?.rework?.body), 'Needs changes queues a rework task with the note', JSON.stringify(back.json?.rework));

for (const st of ['art', 'ready']) {
  const r = await owner('POST', '/api/games/space-agency/stage-requests', { toStage: st, evidence: 'Dry run.' });
  await owner('POST', `/api/stage-requests/${r.json?.id}/decide`, { state: 'approved' });
}
check((await agentHttp('POST', '/api/games/space-agency/gate/start', { action: 'live' })).status === 403, 'agents cannot open the publish gate');
const ch = await owner('POST', '/api/games/space-agency/gate/start', { action: 'live' });
check(ch.status === 200 && (await owner('GET', '/api/games')).json.find((g) => g.slug === 'space-agency')?.stage === 'ready', 'step 1 opens a confirmation and changes nothing');
const wrong = await owner('POST', '/api/games/space-agency/gate/confirm', { challengeId: ch.json?.challengeId, typed: 'space agency' });
check(wrong.status === 400 && (await owner('GET', '/api/games')).json.find((g) => g.slug === 'space-agency')?.stage === 'ready', 'a wrong typed slug is refused');
const done = await owner('POST', '/api/games/space-agency/gate/confirm', { challengeId: ch.json?.challengeId, typed: 'space-agency' });
check(done.json?.game?.stage === 'live', 'step 2 with the exact slug makes the game live', JSON.stringify(done.json));
check((await owner('POST', '/api/games/space-agency/gate/confirm', { challengeId: ch.json?.challengeId, typed: 'space-agency' })).status === 404, 'a confirmation works once');

mcp.kill();
await s.close();
fs.rmSync(stateDir, { recursive: true, force: true });
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ''}`);
process.exit(failed ? 1 : 0);

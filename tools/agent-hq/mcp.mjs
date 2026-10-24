// Agent HQ MCP server: hand-written stdio JSON-RPC 2.0 (newline-delimited). No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MEDIA_EXT = /\.(png|jpe?g|gif|webp|mp3|ogg|wav|mp4)$/i; // keep in step with MEDIA_INLINE in server.mjs
const HQ_URL = process.env.HQ_URL || 'http://127.0.0.1:4317';
const HQ_TASK = process.env.HQ_TASK || '';
const HQ_ROLE = process.env.HQ_ROLE || '';
const HQ_TASK_TOKEN = process.env.HQ_TASK_TOKEN || '';
let TOKEN = process.env.HQ_TOKEN || '';
if (!TOKEN) {
  try { TOKEN = fs.readFileSync(path.join(ROOT, '.agent-hq/token'), 'utf8').trim(); } catch { /* reported on first call */ }
}

// taskToken (optional) proves which working task is calling. It goes in the x-hq-task-token header and, for bodies, the taskToken field.
export async function api(method, route, body, taskToken) {
  const res = await fetch(HQ_URL + route, {
    method,
    headers: { 'x-hq-token': TOKEN, ...(taskToken ? { 'x-hq-task-token': taskToken } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(taskToken ? { ...body, taskToken } : body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`HQ ${method} ${route} -> ${res.status} ${typeof data === 'string' ? data : data.error ?? text}`.slice(0, 500));
  return data;
}

const str = (extra = {}) => ({ type: 'string', ...extra });
const TASK_ID = str({ description: 'Task id (not needed when the HQ_TASK env is set)' });
const TASK_TOKEN = str({ description: 'Your HQ task token from the brief (not needed when the HQ_TASK_TOKEN env is set). Never share it.' });
export const TOOLS = [
  { name: 'hq_list_tasks', description: 'List tasks, newest first.',
    inputSchema: { type: 'object', properties: { state: str({ enum: ['queued', 'working', 'review', 'done', 'failed', 'canceled'] }), role: str() } } },
  { name: 'hq_next_task', description: 'Take the oldest queued task for your lane (app = Claude desktop, antigravity = design). Returns {task, brief, runAs: {agentType, model}}, or says the queue is empty.',
    inputSchema: { type: 'object', properties: { engine: str({ enum: ['app', 'antigravity'] }), roles: { type: 'array', items: str() } }, required: ['engine'] } },
  { name: 'hq_claim_task', description: 'Alias kept for older setups: claim one specific queued task by id. Returns the full brief.',
    inputSchema: { type: 'object', properties: { taskId: str(), engine: str({ enum: ['app', 'antigravity'] }) }, required: ['taskId'] } },
  { name: 'hq_note', description: 'Post a progress note to your role thread.',
    inputSchema: { type: 'object', properties: { text: str({ maxLength: 4000 }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['text'] } },
  { name: 'hq_ask_owner', description: 'Ask the owner to decide, try, approve or review something.',
    inputSchema: { type: 'object', properties: {
      kind: str({ enum: ['decision', 'try', 'approve', 'review'] }), title: str({ maxLength: 200 }), why: str({ maxLength: 4000 }),
      options: { type: 'array', items: { type: 'object', properties: { id: str(), label: str(), recommended: { type: 'boolean' } }, required: ['id', 'label'] } },
      taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['kind', 'title', 'why'] } },
  { name: 'hq_add_media', description: 'Attach a screenshot or image from the repo for owner review.',
    inputSchema: { type: 'object', properties: { path: str({ description: 'File path inside the repo' }), ask: str({ description: 'What the owner should look at' }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['path', 'ask'] } },
  { name: 'hq_complete', description: 'Finish the task with a summary of files changed and checks run.',
    inputSchema: { type: 'object', properties: { summary: str({ maxLength: 4000 }), state: str({ enum: ['done', 'review', 'failed'] }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['summary'] } },
  { name: 'hq_create_task', description: 'Lead only: delegate a task to a role.',
    inputSchema: { type: 'object', properties: { role: str(), title: str({ maxLength: 200 }), body: str({ maxLength: 20000 }), needsStudio: { type: 'boolean' }, taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['role', 'title', 'body'] } },
  { name: 'hq_vault', description: 'Read a chapter of the knowledge vault.',
    inputSchema: { type: 'object', properties: { chapter: { type: 'integer', minimum: 0, maximum: 13 } }, required: ['chapter'] } },
  { name: 'hq_lane_gate', description: 'Ask HQ whether this lane should work now. Call first on every scheduled run; stop if run is false. Returns {run, reason, maxTasks, queued}.',
    inputSchema: { type: 'object', properties: { engine: str({ enum: ['app', 'antigravity'] }), manual: { type: 'boolean', description: 'true when a person asked you to work the queue now' } }, required: ['engine'] } },
  { name: 'hq_learn', description: 'Record one reusable lesson for your role. Later briefs for the role include it.',
    inputSchema: { type: 'object', properties: { lesson: str({ maxLength: 300 }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['lesson'] } },
  { name: 'hq_pitch', description: 'Scout: propose a game pitch for the owner to approve. The full schema is required: competitors, comparables, money verdict, the game section, evidence with links, building gaps and risks.',
    inputSchema: { type: 'object', properties: {
      taskId: TASK_ID, taskToken: TASK_TOKEN, title: str({ maxLength: 200 }), oneLiner: str({ maxLength: 500 }), format: str(),
      window: str({ enum: ['early', 'mid', 'late'], description: 'How early the format is on the charts' }),
      origin: str({ enum: ['scout', 'owner'] }), edge: str({ description: 'How we are different' }),
      competitors: { type: 'array', maxItems: 20, items: { type: 'object', properties: { name: str(), whatItIs: str(), gap: str(), universeId: { type: 'integer' } }, required: ['name'] } },
      comparables: { type: 'array', maxItems: 20, items: { type: 'object', properties: { name: str(), universeId: { type: 'integer' }, playing: { type: 'number' }, likeRatio: { type: 'number', description: 'Percent, 0 to 100' }, upvotesPerDay: { type: 'number' }, rankClimb: { type: 'number' }, note: str() }, required: ['name'] } },
      money: { type: 'object', properties: { verdict: str(), topEarningRank: { type: 'integer' }, comparable: str() }, required: ['verdict'] },
      saturationCount: { type: 'integer', description: 'Similar games on the charts' },
      game: { type: 'object', properties: { howItPlays: str(), first60s: str(), goal10to15: str(), minutes10to20: str(), monetization: str(), clipMoment: str(), iconIdea: str(), modules: { type: 'array', items: str() } }, required: ['howItPlays', 'first60s', 'goal10to15', 'minutes10to20', 'monetization', 'clipMoment', 'iconIdea', 'modules'] },
      evidence: { type: 'object', properties: { summary: str(), links: { type: 'array', items: str() } }, required: ['summary', 'links'] },
      building: { type: 'object', properties: { gaps: { type: 'array', items: str() }, assetNotes: str(), experience: str() }, required: ['gaps', 'assetNotes', 'experience'] },
      risks: { type: 'array', maxItems: 20, items: str() } },
      required: ['title', 'oneLiner', 'format', 'window', 'edge', 'competitors', 'comparables', 'money', 'game', 'evidence', 'building', 'risks'] } },
  { name: 'hq_stage_request', description: 'Producer or lead: ask the owner to move a game to its next stage, with evidence. Only the next stage can be requested, and agents can never request "live".',
    inputSchema: { type: 'object', properties: { game: str({ description: 'Game slug, for example space-agency' }), toStage: str({ enum: ['designed', 'assets', 'built', 'balanced', 'art', 'ready', 'graded'] }), evidence: str({ maxLength: 4000, description: 'What was checked: commands run, captures, test results' }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['game', 'toStage', 'evidence'] } },
  { name: 'hq_asset_add', description: 'Librarian: register an asset file under assets/ in the library index.',
    inputSchema: { type: 'object', properties: { name: str({ maxLength: 120 }), kind: str({ enum: ['model', 'icon', 'sound', 'image', 'thumbnail'] }), scope: str({ description: '"studio" or "game:<slug>"' }), tags: { type: 'array', maxItems: 10, items: str({ maxLength: 40 }) }, file: str({ description: 'Path under assets/' }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['name', 'kind', 'scope', 'file'] } },
  { name: 'hq_metric', description: 'Live ops: record a measured number for a game (likeRatio, d1, d7, avgSessionMin, payingPct, firstMinute).',
    inputSchema: { type: 'object', properties: { game: str(), key: str({ maxLength: 40 }), value: { type: 'number' }, date: str({ description: 'YYYY-MM-DD, defaults to today' }), taskId: TASK_ID, taskToken: TASK_TOKEN }, required: ['game', 'key', 'value'] } },
];

const need = (v, name) => { if (!v) throw new Error(`${name} is required`); return v; };
const taskIdOf = (a) => need(HQ_TASK || a.taskId, 'taskId');
const tokenOf = (a) => need(HQ_TASK_TOKEN || a.taskToken, 'taskToken');

async function roleOf(taskId, a) {
  if (HQ_ROLE) return HQ_ROLE;
  const t = await api('GET', `/api/tasks/${encodeURIComponent(taskId)}`, undefined, tokenOf(a)).catch(() => null);
  return need(t?.role, 'role (unknown task)');
}

/**
 * Fail closed. With HQ_ROLE set, the role must be allowed. Without it (app and IDE lanes), the caller must name a
 * working task whose role is allowed. Anything else is refused with the same message. Always returns the task token.
 */
async function requireRole(allowed, message, a) {
  const denied = new Error(message);
  if (HQ_ROLE) {
    if (!allowed.includes(HQ_ROLE)) throw denied;
    return { role: HQ_ROLE, taskId: taskIdOf(a), taskToken: tokenOf(a) };
  }
  const taskId = HQ_TASK || a.taskId;
  const taskToken = HQ_TASK_TOKEN || a.taskToken;
  if (!taskId || !taskToken) throw denied;
  const t = await api('GET', `/api/tasks/${encodeURIComponent(taskId)}`, undefined, taskToken).catch(() => null);
  if (!t || !allowed.includes(t.role) || t.state !== 'working') throw denied;
  return { role: t.role, taskId, taskToken };
}

const slugOf = (g) => {
  if (typeof g !== 'string' || !/^[a-z0-9-]{1,40}$/.test(g)) throw new Error('game must be a slug like space-agency');
  return g;
};

// The scout must send the whole pitch, not just a title.
const PITCH_STRINGS = ['title', 'oneLiner', 'format', 'edge'];
const GAME_STRINGS = ['howItPlays', 'first60s', 'goal10to15', 'minutes10to20', 'monetization', 'clipMoment', 'iconIdea'];
export function missingPitchFields(p) {
  const miss = [];
  const has = (v) => typeof v === 'string' && v.trim() !== '';
  for (const k of PITCH_STRINGS) if (!has(p?.[k])) miss.push(k);
  if (!['early', 'mid', 'late'].includes(p?.window)) miss.push('window');
  for (const k of ['competitors', 'comparables', 'risks']) if (!Array.isArray(p?.[k]) || p[k].length === 0) miss.push(k);
  if (!has(p?.money?.verdict)) miss.push('money.verdict');
  for (const k of GAME_STRINGS) if (!has(p?.game?.[k])) miss.push(`game.${k}`);
  if (!Array.isArray(p?.game?.modules)) miss.push('game.modules');
  if (!has(p?.evidence?.summary)) miss.push('evidence.summary');
  if (!Array.isArray(p?.evidence?.links) || p.evidence.links.length === 0) miss.push('evidence.links');
  if (!p?.building || typeof p.building !== 'object' || !Array.isArray(p.building.gaps)) miss.push('building.gaps');
  return miss;
}

export const handlers = {
  async hq_list_tasks(a) {
    const { tasks } = await api('GET', '/api/state');
    return tasks.filter((t) => (!a.state || t.state === a.state) && (!a.role || t.role === a.role))
      .map(({ id, title, role, state, engine, createdAt }) => ({ id, title, role, state, engine, createdAt }));
  },
  async hq_next_task(a) {
    if (!['app', 'antigravity'].includes(a.engine)) throw new Error('engine must be "app" or "antigravity"');
    const out = await api('POST', '/api/tasks/next', { engine: a.engine, ...(a.roles?.length ? { roles: a.roles } : {}) });
    // The task token is returned by the server for the brief only; the agent reads it from the brief text.
    return out?.task ? { task: out.task, brief: out.brief, runAs: out.runAs } : `Queue empty for ${a.engine}.`;
  },
  async hq_claim_task(a) {
    const out = await api('POST', `/api/tasks/${encodeURIComponent(need(a.taskId, 'taskId'))}/claim`, { engine: a.engine || 'app' });
    const task = out.task ?? out;
    return { task: { id: task.id, title: task.title, role: task.role, state: task.state }, brief: out.brief };
  },
  async hq_note(a) {
    const taskId = taskIdOf(a);
    return api('POST', '/api/messages', { role: await roleOf(taskId, a), text: need(a.text, 'text'), from: 'agent', taskId }, tokenOf(a));
  },
  async hq_ask_owner(a) {
    const taskId = taskIdOf(a);
    const role = await roleOf(taskId, a);
    return api('POST', '/api/asks', { taskId, role, kind: a.kind, title: a.title, why: a.why, options: a.options ?? [] }, tokenOf(a));
  },
  async hq_add_media(a) {
    const taskId = taskIdOf(a);
    const taskToken = tokenOf(a);
    // Resolve symlinks first so a link cannot smuggle out a file from elsewhere, then allow only real media files
    // outside HQ state and git internals (the owner token lives in .agent-hq/).
    const src = fs.realpathSync(path.resolve(ROOT, need(a.path, 'path')));
    const rel = path.relative(fs.realpathSync(ROOT), src);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('path must be inside the repo');
    const relPosix = rel.split(path.sep).join('/');
    if (/^(\.agent-hq|\.git)(\/|$)/.test(relPosix)) throw new Error('files under .agent-hq/ or .git/ cannot be attached');
    if (!MEDIA_EXT.test(relPosix)) throw new Error('only image, audio or video files (png, jpg, gif, webp, mp3, ogg, wav, mp4) can be attached');
    if (!fs.statSync(src).isFile()) throw new Error('path is not a file');
    // Files already under assets/ are served in place (and keep a real repo path for follow-up tasks); anything else is copied.
    let mediaPath = relPosix;
    if (!relPosix.startsWith('assets/')) {
      mediaPath = `${Date.now()}-${path.basename(src).replace(/[^\w.-]/g, '_')}`;
      fs.mkdirSync(path.join(ROOT, '.agent-hq/media'), { recursive: true });
      fs.copyFileSync(src, path.join(ROOT, '.agent-hq/media', mediaPath));
    }
    return api('POST', '/api/asks', { taskId, role: await roleOf(taskId, a), kind: 'review', title: need(a.ask, 'ask'), why: '', mediaPath }, taskToken);
  },
  async hq_complete(a) {
    return api('POST', `/api/tasks/${encodeURIComponent(taskIdOf(a))}/complete`, { taskId: taskIdOf(a), summary: need(a.summary, 'summary'), ...(a.state ? { state: a.state } : {}) }, tokenOf(a));
  },
  async hq_create_task(a) {
    // Fail closed: createdBy "lead" is only ever set after requireRole passes.
    const { taskId: parentId, taskToken } = await requireRole(['lead'], 'only the lead can create tasks', a);
    return api('POST', '/api/tasks', { role: a.role, title: a.title, body: a.body, needsStudio: !!a.needsStudio, createdBy: 'lead', taskId: parentId, parentId }, taskToken);
  },
  async hq_stage_request(a) {
    const { role, taskId, taskToken } = await requireRole(['producer', 'lead'], 'only the producer and lead can request a stage change', a);
    if (a.toStage === 'live') throw new Error('agents cannot request "live": only the owner publishes');
    return api('POST', `/api/games/${slugOf(a.game)}/stage-requests`, { toStage: need(a.toStage, 'toStage'), evidence: need(a.evidence, 'evidence'), role, taskId }, taskToken);
  },
  async hq_asset_add(a) {
    const { role, taskId, taskToken } = await requireRole(['librarian'], 'only the librarian can add assets', a);
    return api('POST', '/api/assets', { name: a.name, kind: a.kind, scope: a.scope, tags: a.tags ?? [], file: a.file, role, taskId }, taskToken);
  },
  async hq_metric(a) {
    const { role, taskId, taskToken } = await requireRole(['liveops'], 'only live ops can record metrics', a);
    if (typeof a.value !== 'number' || !Number.isFinite(a.value)) throw new Error('value must be a finite number');
    return api('POST', `/api/games/${slugOf(a.game)}/metrics`, { key: need(a.key, 'key'), value: a.value, ...(a.date ? { date: a.date } : {}), source: role, taskId }, taskToken);
  },
  async hq_lane_gate(a) {
    if (!['app', 'antigravity'].includes(a.engine)) throw new Error('engine must be "app" or "antigravity"');
    return api('POST', `/api/lanes/${a.engine}/gate`, { manual: !!a.manual });
  },
  async hq_learn(a) {
    // A task-bound agent can only write to its own role's memory, so one role cannot poison another's briefs.
    const taskId = taskIdOf(a);
    const role = await roleOf(taskId, a);
    if (a.role && a.role !== role) throw new Error('you can only record lessons for your own role');
    return api('POST', `/api/memory/${encodeURIComponent(role)}`, { lesson: need(a.lesson, 'lesson'), taskId }, tokenOf(a));
  },
  async hq_pitch(a) {
    const miss = missingPitchFields(a);
    if (miss.length) throw new Error(`hq_pitch needs the full pitch. Missing or empty: ${miss.join(', ')}`);
    const taskId = taskIdOf(a); // the server derives the role from this working task
    const taskToken = tokenOf(a);
    const { taskId: _t, taskToken: _k, ...pitch } = a;
    return api('POST', '/api/pitches', { ...pitch, taskId }, taskToken);
  },
  async hq_vault(a) {
    const { chapters } = await api('GET', '/api/vault');
    const c = chapters.find((x) => x.n === a.chapter);
    if (!c) throw new Error(`no chapter ${a.chapter}`);
    return c.text;
  },
};

const send = (o) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...o }) + '\n');

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notifications (notifications/initialized etc.)
  try {
    if (method === 'initialize') {
      return send({ id, result: { protocolVersion: params?.protocolVersion ?? '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'agent-hq', version: '1.0.0' } } });
    }
    if (method === 'ping') return send({ id, result: {} });
    if (method === 'tools/list') return send({ id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      const fn = handlers[params?.name];
      if (!fn) return send({ id, result: { isError: true, content: [{ type: 'text', text: `unknown tool ${params?.name}` }] } });
      try {
        const out = await fn(params.arguments ?? {});
        return send({ id, result: { content: [{ type: 'text', text: typeof out === 'string' ? out : JSON.stringify(out) }] } });
      } catch (e) {
        return send({ id, result: { isError: true, content: [{ type: 'text', text: String(e.message ?? e) }] } });
      }
    }
    send({ id, error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) {
    send({ id, error: { code: -32603, message: String(e.message ?? e) } });
  }
}

// Only serve stdio when run as the entry point; hqctl.mjs imports the handlers instead.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  readline.createInterface({ input: process.stdin }).on('line', (line) => {
    if (!line.trim()) return;
    let msg; try { msg = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: 'parse error' } }); }
    handle(msg);
  });
}

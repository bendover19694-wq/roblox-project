// Agent HQ database: node:sqlite, no dependencies.
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const now = () => new Date().toISOString();
const newId = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
const j = (v) => (v === undefined ? null : JSON.stringify(v));
const unj = (s, fb = null) => {
  if (s == null) return fb;
  try { return JSON.parse(s); } catch { return fb; }
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', role TEXT NOT NULL,
  game TEXT, state TEXT NOT NULL DEFAULT 'queued', engine TEXT, model TEXT,
  needsStudio INTEGER NOT NULL DEFAULT 0, parentId TEXT, createdBy TEXT NOT NULL DEFAULT 'owner',
  summary TEXT, error TEXT, createdAt TEXT NOT NULL, startedAt TEXT, endedAt TEXT,
  costUsd REAL, conversationId TEXT,
  gateFor TEXT, attempt INTEGER NOT NULL DEFAULT 1, threadMessageId TEXT
);
CREATE INDEX IF NOT EXISTS tasks_state ON tasks(state, createdAt);
CREATE TABLE IF NOT EXISTS asks (
  id TEXT PRIMARY KEY, taskId TEXT, role TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL,
  why TEXT NOT NULL DEFAULT '', options TEXT, mediaPath TEXT, state TEXT NOT NULL DEFAULT 'open',
  answer TEXT, createdAt TEXT NOT NULL, answeredAt TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, role TEXT NOT NULL, "from" TEXT NOT NULL, text TEXT NOT NULL,
  taskId TEXT, createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_role ON messages(role, createdAt);
CREATE TABLE IF NOT EXISTS pitches (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, oneLiner TEXT NOT NULL DEFAULT '', coreLoop TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '', risks TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'proposed',
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS market (id INTEGER PRIMARY KEY AUTOINCREMENT, json TEXT NOT NULL, fetchedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS games (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'pitched', version INTEGER NOT NULL DEFAULT 1,
  versionType TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', nextStep TEXT NOT NULL DEFAULT '', universeId TEXT,
  changelog TEXT, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stage_requests (
  id TEXT PRIMARY KEY, game TEXT NOT NULL, fromStage TEXT NOT NULL, toStage TEXT NOT NULL, role TEXT NOT NULL,
  evidence TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'open', createdAt TEXT NOT NULL, decidedAt TEXT
);
CREATE TABLE IF NOT EXISTS game_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT NOT NULL, at TEXT NOT NULL,
  playing INTEGER, visits INTEGER, favorites INTEGER, up INTEGER, down INTEGER
);
CREATE TABLE IF NOT EXISTS game_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT NOT NULL, key TEXT NOT NULL, value REAL NOT NULL, date TEXT NOT NULL, source TEXT NOT NULL
);
`;

// Stages in order, and who owns each (owner = the person publishes it themselves).
export const STAGES = ['pitched', 'designed', 'assets', 'built', 'balanced', 'art', 'ready', 'live', 'graded'];
export const STAGE_OWNERS = { pitched: ['scout'], designed: ['architect'], assets: ['librarian'], built: ['builder', 'ui'], balanced: ['economy'], art: ['thumbnails'], ready: ['builder'], live: ['owner'], graded: ['liveops'] };

// columns added after the first release: [table, column, definition]
const MIGRATIONS = [
  ['tasks', 'gateFor', 'TEXT'], ['tasks', 'attempt', 'INTEGER NOT NULL DEFAULT 1'], ['tasks', 'threadMessageId', 'TEXT'],
  ['tasks', 'attachPaths', 'TEXT'], ['tasks', 'taskToken', 'TEXT'], ['messages', 'attachPaths', 'TEXT'], ['asks', 'verdict', 'TEXT'],
  ['pitches', 'origin', "TEXT NOT NULL DEFAULT 'scout'"], ['pitches', 'data', 'TEXT'], ['pitches', 'decidedAt', 'TEXT'], ['pitches', 'note', 'TEXT'],
];

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec(SCHEMA);
  // migrate DBs created before later columns existed
  const cols = {};
  for (const [table, col, def] of MIGRATIONS) {
    cols[table] ??= new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    if (!cols[table].has(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
  }
  // seed the first game
  db.prepare(`INSERT OR IGNORE INTO games (slug,name,stage,version,nextStep,updatedAt) VALUES (?,?,?,?,?,?)`)
    .run('space-agency', 'Run a Space Agency', 'built', 1, 'Owner hands-on test and the phone layout pass', now());
  return db;
}

// ---- tasks ----
// Engine vocabulary: app | antigravity | claude-cli | echo. Old stored values migrate on read.
const LEGACY_ENGINE = { claude: 'claude-cli', agy: 'antigravity', manual: 'app' };
export const migrateEngine = (e) => (e == null ? 'app' : LEGACY_ENGINE[e] ?? e);
// taskToken is a per-task secret for the agent working it; it is never part of a task row (see issueTaskToken)
const taskOut = (r) => {
  if (!r) return null;
  const { taskToken, ...rest } = r;
  return { ...rest, engine: migrateEngine(r.engine), attachPaths: unj(r.attachPaths, []) };
};
const newToken = () => crypto.randomBytes(32).toString('hex');
// the working task's token: the existing one, or a new one. Cleared when the task leaves "working".
export function issueTaskToken(db, id) {
  const r = db.prepare('SELECT taskToken FROM tasks WHERE id=?').get(id);
  if (r?.taskToken) return r.taskToken;
  const t = newToken();
  db.prepare('UPDATE tasks SET taskToken=? WHERE id=?').run(t, id);
  return t;
}
export const workingTaskTokens = (db) => db.prepare("SELECT id, taskToken FROM tasks WHERE state='working' AND taskToken IS NOT NULL").all();

let roleDefaults; // role id -> default engine, from roles.json
function roleEngine(role) {
  if (!roleDefaults) {
    try {
      roleDefaults = Object.fromEntries(JSON.parse(fs.readFileSync(new URL('./roles.json', import.meta.url), 'utf8')).map((r) => [r.id, r.engine]));
    } catch { roleDefaults = {}; }
  }
  return roleDefaults[role];
}
const TASK_COLS = ['title', 'body', 'role', 'game', 'state', 'engine', 'model', 'needsStudio', 'parentId',
  'createdBy', 'summary', 'error', 'startedAt', 'endedAt', 'costUsd', 'conversationId', 'gateFor', 'attempt', 'threadMessageId'];
const TERMINAL = new Set(['done', 'failed', 'canceled']);

// engine resolves at creation: explicit > settings.roleEngines[role] > roles.json default > "app"
export function createTask(db, f) {
  const id = newId('t');
  const engine = migrateEngine(f.engine ?? getSetting(db, 'roleEngines', {})?.[f.role]?.engine ?? roleEngine(f.role));
  db.prepare(`INSERT INTO tasks (id,title,body,role,game,state,engine,model,needsStudio,parentId,createdBy,createdAt,gateFor,attempt,threadMessageId,attachPaths)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, f.title, f.body ?? '', f.role, f.game ?? null, f.state ?? 'queued',
    engine, f.model ?? null, f.needsStudio ? 1 : 0, f.parentId ?? null,
    f.createdBy ?? 'owner', now(), f.gateFor ?? null, f.attempt ?? 1, f.threadMessageId ?? null, f.attachPaths?.length ? JSON.stringify(f.attachPaths) : null);
  return getTask(db, id);
}

export const getTask = (db, id) => taskOut(db.prepare('SELECT * FROM tasks WHERE id=?').get(id));

export function listTasks(db, { state, role, limit = 500 } = {}) {
  const w = []; const a = [];
  if (state) { w.push('state=?'); a.push(state); }
  if (role) { w.push('role=?'); a.push(role); }
  const sql = `SELECT * FROM tasks ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY createdAt DESC, rowid DESC LIMIT ?`;
  return db.prepare(sql).all(...a, limit).map(taskOut);
}

export function updateTask(db, id, patch) {
  const p = { ...patch };
  if (p.needsStudio !== undefined) p.needsStudio = p.needsStudio ? 1 : 0;
  if (p.engine) p.engine = migrateEngine(p.engine);
  // convenience: stamp times, and clear them on retry, unless the caller set them
  if (p.state === 'working' && p.startedAt === undefined) p.startedAt = now();
  if (TERMINAL.has(p.state) && p.endedAt === undefined) p.endedAt = now();
  if (p.state === 'queued') {
    for (const k of ['startedAt', 'endedAt', 'error']) if (p[k] === undefined) p[k] = null;
  }
  const keys = Object.keys(p).filter((k) => TASK_COLS.includes(k));
  if (keys.length) {
    db.prepare(`UPDATE tasks SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`)
      .run(...keys.map((k) => p[k] ?? null), id);
  }
  if (p.state === 'working') issueTaskToken(db, id);
  else if (p.state) db.prepare('UPDATE tasks SET taskToken=NULL WHERE id=?').run(id);
  return getTask(db, id);
}

// Studio lanes: setting studioLanes = 0 (off), 1, 2 or "all". Limit = how many needsStudio tasks may work at once.
export const studioLimit = (db) => {
  const v = getSetting(db, 'studioLanes', 1);
  return v === 'all' ? Infinity : Number.isInteger(v) && v >= 0 ? v : 1;
};
export const studioLocks = (db) =>
  db.prepare("SELECT id, role, game, startedAt FROM tasks WHERE state='working' AND needsStudio=1 ORDER BY startedAt, rowid").all()
    .map((r, i) => ({ taskId: r.id, role: r.role, game: r.game, since: r.startedAt, lane: i + 1 }));
const studioFull = (db) => studioLocks(db).length >= studioLimit(db);

// Only spawnable engines (claude-cli, echo; legacy "claude" included). App and Antigravity lanes use claimNext.
// Studio capacity is read from the database (the studioBusy argument is ignored).
export function nextRunnable(db) {
  const r = db.prepare(`SELECT * FROM tasks WHERE state='queued' AND engine IN ('claude-cli','claude','echo')
    ${studioFull(db) ? 'AND needsStudio=0' : ''} ORDER BY createdAt ASC, rowid ASC LIMIT 1`).get();
  return taskOut(r);
}

const LANE_VALUES = { app: ['app', 'manual'], antigravity: ['antigravity', 'agy'] };

export function countQueued(db, engine) {
  const vals = LANE_VALUES[engine];
  return db.prepare(`SELECT COUNT(*) n FROM tasks WHERE state='queued' AND engine IN (${vals.map(() => '?').join(',')})`).get(...vals).n;
}

// gate tasks of the latest review of a task (created since it last started)
export function gateTasks(db, id, since = '') {
  return db.prepare('SELECT * FROM tasks WHERE gateFor=? AND createdAt>=? ORDER BY createdAt, rowid').all(id, since).map(taskOut);
}

// Atomically take the oldest queued task for a lane and mark it working. Returns the task with its new `taskToken`, or null.
// needsStudio tasks are skipped while the studio lanes are full (studioBusy:true forces that).
export function claimNext(db, { engine, roles, studioBusy } = {}) {
  const vals = LANE_VALUES[engine];
  if (!vals) throw new Error(`bad lane ${engine}`);
  db.exec('BEGIN IMMEDIATE');
  try {
    const busy = studioBusy === true || studioFull(db);
    const w = [`state='queued'`, `engine IN (${vals.map(() => '?').join(',')})`];
    const a = [...vals];
    if (roles?.length) { w.push(`role IN (${roles.map(() => '?').join(',')})`); a.push(...roles); }
    if (busy) w.push('needsStudio=0');
    const r = db.prepare(`SELECT id FROM tasks WHERE ${w.join(' AND ')} ORDER BY createdAt ASC, rowid ASC LIMIT 1`).get(...a);
    let task = null;
    if (r) {
      const taskToken = newToken();
      db.prepare("UPDATE tasks SET state='working', engine=?, startedAt=?, endedAt=NULL, error=NULL, taskToken=? WHERE id=?").run(engine, now(), taskToken, r.id);
      task = { ...getTask(db, r.id), taskToken }; // the only place a row carries its token; callers must strip it
    }
    db.exec('COMMIT');
    return task;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ---- asks ----
// superseded: a newer review ask exists for the same task and role
const ASK_SELECT = `SELECT a.*, (a.kind='review' AND a.taskId IS NOT NULL AND EXISTS (SELECT 1 FROM asks b WHERE b.kind='review'
  AND b.taskId=a.taskId AND b.role=a.role AND (b.createdAt>a.createdAt OR (b.createdAt=a.createdAt AND b.rowid>a.rowid)))) AS superseded FROM asks a`;
const askOut = (r) => (r ? { ...r, options: unj(r.options, []), superseded: !!r.superseded, verdict: r.verdict ?? null } : null);
export const getAsk = (db, id) => askOut(db.prepare(`${ASK_SELECT} WHERE a.id=?`).get(id));

export function createAsk(db, f) {
  const id = newId('a');
  db.prepare(`INSERT INTO asks (id,taskId,role,kind,title,why,options,mediaPath,createdAt) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, f.taskId ?? null, f.role, f.kind, f.title, f.why ?? '', j(f.options ?? []), f.mediaPath ?? null, now());
  return getAsk(db, id);
}

export function listAsks(db, { state, verdict, includeSuperseded = true } = {}) {
  const w = []; const a = [];
  if (state) { w.push('a.state=?'); a.push(state); }
  if (verdict) { w.push('a.verdict=?'); a.push(verdict); }
  const rows = db.prepare(`${ASK_SELECT} ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY a.createdAt DESC, a.rowid DESC`).all(...a).map(askOut);
  return includeSuperseded ? rows : rows.filter((r) => !r.superseded);
}

// state defaults to "answered"; pass state:"dismissed" to dismiss.
export function answerAsk(db, id, { answer = null, state = 'answered', verdict = null } = {}) {
  db.prepare('UPDATE asks SET state=?, answer=?, answeredAt=?, verdict=? WHERE id=?').run(state, answer, now(), verdict, id);
  return getAsk(db, id);
}

// ---- messages ----
export function addMessage(db, f) {
  const id = newId('m');
  db.prepare('INSERT INTO messages (id,role,"from",text,taskId,createdAt,attachPaths) VALUES (?,?,?,?,?,?,?)')
    .run(id, f.role, f.from ?? 'system', f.text, f.taskId ?? null, now(), f.attachPaths?.length ? JSON.stringify(f.attachPaths) : null);
  return msgOut(db.prepare('SELECT * FROM messages WHERE id=?').get(id));
}

const msgOut = (r) => (r ? { ...r, attachPaths: unj(r.attachPaths, []) } : null);
export const lastMessage = (db, role) => {
  const r = db.prepare('SELECT * FROM messages WHERE role=? ORDER BY createdAt DESC, rowid DESC LIMIT 1').get(role);
  return msgOut(r);
};
// count agent messages in a thread newer than `after` (ISO) or all when null
export const countUnread = (db, role, after) =>
  db.prepare(`SELECT COUNT(*) n FROM messages WHERE role=? AND "from"='agent' ${after ? 'AND createdAt>?' : ''}`).get(...(after ? [role, after] : [role])).n;

// oldest first, last `limit` messages
export function listMessages(db, { role, limit = 200 } = {}) {
  const rows = role
    ? db.prepare('SELECT * FROM messages WHERE role=? ORDER BY createdAt DESC, rowid DESC LIMIT ?').all(role, limit)
    : db.prepare('SELECT * FROM messages ORDER BY createdAt DESC, rowid DESC LIMIT ?').all(limit);
  return rows.reverse().map(msgOut);
}

// ---- pitches ----
// Rows are flat: the normalized pitch fields (data) sit next to id, state, origin and times.
const pitchOut = (r) => {
  if (!r) return null;
  const { data, ...rest } = r;
  const d = unj(data, null);
  if (!d) return rest; // legacy row
  delete rest.coreLoop;
  return { ...rest, ...d, id: r.id, state: r.state, origin: r.origin, createdAt: r.createdAt };
};
export const getPitch = (db, id) => pitchOut(db.prepare('SELECT * FROM pitches WHERE id=?').get(id));
// f: {title, oneLiner, origin, state, data}; data is the normalized pitch object
export function createPitch(db, f) {
  const id = newId('p');
  db.prepare('INSERT INTO pitches (id,title,oneLiner,state,origin,data,createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(id, f.title, f.oneLiner ?? '', f.state ?? 'proposed', f.origin ?? 'scout', f.data ? JSON.stringify(f.data) : null, now());
  return getPitch(db, id);
}
export const listPitches = (db) =>
  db.prepare('SELECT * FROM pitches ORDER BY createdAt DESC, rowid DESC').all().map(pitchOut);
// data (optional) replaces the stored pitch fields, e.g. owner edits on approve
export function decidePitch(db, id, state, { note = null, data } = {}) {
  db.prepare('UPDATE pitches SET state=?, decidedAt=?, note=? WHERE id=?').run(state, now(), note, id);
  if (data) db.prepare('UPDATE pitches SET title=?, oneLiner=?, data=? WHERE id=?').run(data.title, data.oneLiner ?? '', JSON.stringify(data), id);
  return getPitch(db, id);
}
// fill in an owner idea that the scout has now researched, or any data/state change without a decision
export function updatePitch(db, id, { state, data }) {
  if (state) db.prepare('UPDATE pitches SET state=? WHERE id=?').run(state, id);
  if (data) db.prepare('UPDATE pitches SET title=?, oneLiner=?, data=? WHERE id=?').run(data.title, data.oneLiner ?? '', JSON.stringify(data), id);
  return getPitch(db, id);
}
// pitches the owner has not decided yet are withdrawn when one is approved
export function withdrawOpenPitches(db, exceptId) {
  const ids = db.prepare("SELECT id FROM pitches WHERE state='proposed' AND id<>?").all(exceptId).map((r) => r.id);
  db.prepare("UPDATE pitches SET state='withdrawn', decidedAt=? WHERE state='proposed' AND id<>?").run(now(), exceptId);
  return ids.map((id) => getPitch(db, id));
}

// ---- settings ----
export function getSetting(db, key, fallback = null) {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? unj(r.value, fallback) : fallback;
}
export function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
  return value;
}

// ---- market ----
export function saveMarketSnapshot(db, json) {
  const snap = typeof json === 'string' ? unj(json, {}) : json;
  db.prepare('INSERT INTO market (json, fetchedAt) VALUES (?,?)').run(JSON.stringify(snap), snap?.fetchedAt ?? now());
  db.exec('DELETE FROM market WHERE id <= (SELECT MAX(id) FROM market) - 30'); // keep last 30
}
// newest first, parsed
export const latestMarketSnapshots = (db, n = 1) =>
  db.prepare('SELECT json FROM market ORDER BY id DESC LIMIT ?').all(n).map((r) => unj(r.json));

// ---- games, stage requests, live numbers ----
const gameOut = (r) => (r ? { ...r, changelog: unj(r.changelog, null) } : null);
export const getGame = (db, slug) => gameOut(db.prepare('SELECT * FROM games WHERE slug=?').get(slug));
export const listGames = (db) => db.prepare('SELECT * FROM games ORDER BY rowid').all().map(gameOut);
export function createGame(db, { slug, name }) {
  db.prepare('INSERT INTO games (slug,name,stage,version,updatedAt) VALUES (?,?,?,?,?)').run(slug, name, 'pitched', 1, now());
  return getGame(db, slug);
}
const GAME_COLS = ['name', 'stage', 'version', 'versionType', 'note', 'nextStep', 'universeId', 'changelog'];
export function updateGame(db, slug, patch) {
  const p = { ...patch };
  if ('changelog' in p) p.changelog = p.changelog == null ? null : JSON.stringify(p.changelog);
  const keys = Object.keys(p).filter((k) => GAME_COLS.includes(k));
  db.prepare(`UPDATE games SET ${[...keys.map((k) => `${k}=?`), 'updatedAt=?'].join(',')} WHERE slug=?`).run(...keys.map((k) => p[k] ?? null), now(), slug);
  return getGame(db, slug);
}
// open work for a game: task count, roles working, asks (try/decision) waiting on the owner
export function gameWork(db, slug) {
  const openTasks = db.prepare("SELECT COUNT(*) n FROM tasks WHERE game=? AND state IN ('queued','working','review')").get(slug).n;
  const working = db.prepare("SELECT DISTINCT role FROM tasks WHERE game=? AND state='working'").all(slug).map((r) => r.role);
  const todos = db.prepare(`${ASK_SELECT} WHERE a.state='open' AND a.kind IN ('try','decision') AND a.taskId IN (SELECT id FROM tasks WHERE game=?)
    ORDER BY a.createdAt DESC, a.rowid DESC`).all(slug).map(askOut);
  return { openTasks, working, todos };
}
// open asks created by a role for tasks of a game
export const gameAsksBy = (db, slug, role) =>
  db.prepare(`${ASK_SELECT} WHERE a.state='open' AND a.role=? AND a.taskId IN (SELECT id FROM tasks WHERE game=?) ORDER BY a.createdAt DESC, a.rowid DESC`)
    .all(role, slug).map(askOut);

export const getStageRequest = (db, id) => db.prepare('SELECT * FROM stage_requests WHERE id=?').get(id) ?? null;
export function createStageRequest(db, f) {
  const id = newId('s');
  db.prepare('INSERT INTO stage_requests (id,game,fromStage,toStage,role,evidence,createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(id, f.game, f.fromStage, f.toStage, f.role, f.evidence ?? '', now());
  return getStageRequest(db, id);
}
export function listStageRequests(db, { state, game } = {}) {
  const w = []; const a = [];
  if (state) { w.push('state=?'); a.push(state); }
  if (game) { w.push('game=?'); a.push(game); }
  return db.prepare(`SELECT * FROM stage_requests ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY createdAt DESC, rowid DESC`).all(...a);
}
export function decideStageRequest(db, id, state) {
  db.prepare('UPDATE stage_requests SET state=?, decidedAt=? WHERE id=?').run(state, now(), id);
  return getStageRequest(db, id);
}

export function addGameSnapshot(db, game, { playing, visits, favorites, up, down }, at = now()) {
  db.prepare('INSERT INTO game_snapshots (game,at,playing,visits,favorites,up,down) VALUES (?,?,?,?,?,?,?)')
    .run(game, at, playing ?? null, visits ?? null, favorites ?? null, up ?? null, down ?? null);
  return latestGameSnapshot(db, game);
}
const snapOut = (r) => (r ? { at: r.at, playing: r.playing, visits: r.visits, favorites: r.favorites, up: r.up, down: r.down } : null);
export const latestGameSnapshot = (db, game) => snapOut(db.prepare('SELECT * FROM game_snapshots WHERE game=? ORDER BY id DESC LIMIT 1').get(game));
export const gameSeries = (db, game, sinceIso) =>
  db.prepare('SELECT * FROM game_snapshots WHERE game=? AND at>=? ORDER BY at, id').all(game, sinceIso).map(snapOut);
export const latestSnapshotAt = (db) => db.prepare('SELECT MAX(at) at FROM game_snapshots').get().at ?? null;

export function setMetric(db, game, key, value, date, source) {
  db.prepare('INSERT INTO game_metrics (game,key,value,date,source) VALUES (?,?,?,?,?)').run(game, key, value, date, source);
}
// newest value per key: {key: {value, date, source}}
export function latestMetrics(db, game) {
  const out = {};
  for (const r of db.prepare('SELECT * FROM game_metrics WHERE game=? ORDER BY date, id').all(game)) out[r.key] = { value: r.value, date: r.date, source: r.source };
  return out;
}

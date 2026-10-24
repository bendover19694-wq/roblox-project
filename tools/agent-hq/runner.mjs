import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getTask, updateTask, listTasks, createTask, nextRunnable, getSetting, setSetting, issueTaskToken, listReferences } from './db.mjs';
import { buildBrief, loadRoles } from './briefs.mjs';
import { detectEngines, spawnEngine } from './engines.mjs';

const mcpPath = path.join(import.meta.dirname, 'mcp.mjs');
const isWin = process.platform === 'win32';

function killTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  try {
    if (isWin) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, shell: false });
    else process.kill(-child.pid, 'SIGKILL');
  } catch { /* already gone */ }
}

export function createRunner({ db, root, emit = () => {}, port = 4317, token = '', tickMs = 2000, echoMs = 150, engines: detected, memoryDir }) {
  const stateDir = path.join(root, '.agent-hq');
  const logDir = path.join(stateDir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const exes = detected ?? detectEngines();
  const roles = loadRoles();
  const procs = new Map(); // taskId -> { child, task, canceled }
  let timer = null;

  const publish = (id) => { const t = getTask(db, id); if (t) emit('task', t); return t; };
  const studioHolder = () => [...procs.values()].find((p) => p.task.needsStudio)?.task.id ?? null;

  function fail(id, error) {
    updateTask(db, id, { state: 'failed', error });
    publish(id);
  }

  function start(task) {
    const role = roles.find((r) => r.id === task.role);
    const pref = getSetting(db, 'roleEngines', {})[task.role] ?? {};
    const engine = task.engine || pref.engine || 'claude-cli';
    const exe = exes[engine] ?? null;
    if (engine !== 'echo' && !exe) return fail(task.id, 'engine not installed');
    const model = task.model || pref.model || (engine === 'claude-cli' ? role?.model : null) || null;

    let child, mcpConfigPath;
    const taskToken = issueTaskToken(db, task.id); // per-task secret: proves to the server which task is calling
    try {
      mcpConfigPath = path.join(stateDir, `mcp-${task.id}.json`);
      fs.writeFileSync(mcpConfigPath, JSON.stringify({
        mcpServers: { hq: { command: process.execPath, args: [mcpPath], env: {
          HQ_URL: `http://127.0.0.1:${port}`, HQ_TOKEN: token, HQ_TASK: task.id, HQ_ROLE: task.role, HQ_TASK_TOKEN: taskToken,
        } } },
      }), { mode: 0o600 }); // holds the HQ token; owner-only, deleted when the task ends
      child = spawnEngine({
        engine, exe, model, mcpConfigPath, cwd: root,
        brief: buildBrief({ task, role: task.role, root, db, taskToken, memoryDir, references: listReferences(db) }),
        allowedTools: role?.allowedTools ?? [],
        env: { ...process.env, HQ_ECHO_MS: String(echoMs) },
      });
    } catch (e) {
      return fail(task.id, `spawn failed: ${e.message}`);
    }

    const entry = { child, task: { ...task, needsStudio: task.needsStudio ? 1 : 0 }, canceled: false };
    procs.set(task.id, entry);
    updateTask(db, task.id, { state: 'working', engine, model, error: null });
    publish(task.id);

    const logFile = path.join(logDir, `${task.id}.ndjson`);
    let lastText = '', resultText = '', stderrTail = '', buf = '', resultError = false;
    const onLine = (line) => {
      if (!line.trim()) return;
      fs.appendFileSync(logFile, line + '\n');
      emit('log', { taskId: task.id, line });
      let ev; try { ev = JSON.parse(line); } catch { return; }
      if (ev.type === 'assistant') {
        const text = (ev.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
        if (text) lastText = text;
      } else if (ev.type === 'result') {
        if (typeof ev.result === 'string') resultText = ev.result;
        if (ev.is_error || ev.status === 'ERROR') resultError = true;
        const cost = ev.total_cost_usd ?? ev.usage?.total_cost_usd;
        const patch = {};
        if (typeof cost === 'number') patch.costUsd = cost;
        const conv = ev.session_id ?? ev.conversation_id;
        if (conv) patch.conversationId = conv;
        if (Object.keys(patch).length) { updateTask(db, task.id, patch); publish(task.id); }
      }
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      const parts = buf.split('\n');
      buf = parts.pop();
      parts.forEach(onLine);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => {
      stderrTail = (stderrTail + d).slice(-1000);
      onLine(JSON.stringify({ type: 'stderr', text: d }));
    });

    let finished = false;
    const finish = (code, spawnError) => {
      if (finished) return;
      finished = true;
      if (buf) onLine(buf);
      procs.delete(task.id);
      fs.rm(mcpConfigPath, { force: true }, () => {});
      if (!entry.canceled) {
        const cur = getTask(db, task.id);
        if (cur?.state === 'working') { // not already completed through MCP
          if (code === 0 && !resultError) {
            updateTask(db, task.id, { state: 'review', summary: (lastText || resultText).slice(0, 500) || null });
          } else {
            updateTask(db, task.id, { state: 'failed', error: (spawnError || `exit ${code}: ${resultText || stderrTail || lastText}`).slice(0, 1000) });
          }
        }
      }
      publish(task.id);
    };
    child.on('error', (e) => finish(null, e.message));
    child.on('close', (code) => finish(code));
  }

  function runSchedules() {
    const schedules = getSetting(db, 'schedules', []);
    const roleEngines = getSetting(db, 'roleEngines', {});
    const nowMs = Date.now();
    let changed = false;
    for (const s of schedules) {
      if (!s.enabled || !(s.everyMinutes > 0)) continue;
      const last = s.lastRunAt ? Date.parse(s.lastRunAt) : 0;
      if (nowMs < last + s.everyMinutes * 60000) continue;
      const open = listTasks(db, { role: s.role }).some((t) => (t.state === 'queued' || t.state === 'working') && t.createdBy === 'schedule' && t.title === s.title);
      s.lastRunAt = new Date(nowMs).toISOString();
      changed = true;
      if (!open) publish(createTask(db, { title: s.title, body: s.body ?? '', role: s.role, createdBy: 'schedule', engine: roleEngines[s.role]?.engine ?? roles.find((x) => x.id === s.role)?.engine ?? 'app' }).id);
    }
    if (changed) { setSetting(db, 'schedules', schedules); emit('settings', { key: 'schedules', value: schedules }); }
  }

  function tick() {
    if (getSetting(db, 'paused', false)) return;
    runSchedules();
    const budget = getSetting(db, 'budget', 2);
    while (procs.size < budget) {
      const t = nextRunnable(db, { studioBusy: studioHolder() !== null });
      if (!t) break;
      start(t);
    }
  }

  return {
    start() {
      if (timer) return;
      // tasks left "working" by a previous process are dead (app/antigravity ones belong to a desktop session)
      for (const t of listTasks(db, { state: 'working' })) {
        if ((t.engine === 'claude-cli' || t.engine === 'echo') && !procs.has(t.id)) fail(t.id, 'interrupted by restart');
      }
      timer = setInterval(tick, tickMs);
      tick();
    },
    stop() {
      clearInterval(timer);
      timer = null;
      for (const p of procs.values()) { p.canceled = true; killTree(p.child); }
    },
    cancel(id) {
      const p = procs.get(id);
      if (p) { p.canceled = true; killTree(p.child); }
      const t = getTask(db, id);
      if (!t || ['done', 'failed', 'canceled'].includes(t.state)) return t;
      updateTask(db, id, { state: 'canceled' });
      return publish(id);
    },
    running: () => [...procs.keys()],
    studioHolder,
    engines: () => ({ 'claude-cli': !!exes['claude-cli'], echo: true }),
    tick,
  };
}

// One-way mirror of HQ memory into an Obsidian vault. HQ files are the source of truth; the vault only gets generated notes.
// Nothing in the vault is read back, HQ never deletes there, and a file HQ did not write (no MARKER in its frontmatter) is left alone.
import fs from 'node:fs';
import path from 'node:path';
import { readCorrections } from './corrections.mjs';
import { readPrefs, STUDIO } from './preferences.mjs';
import { readMistakes } from './mistakes.mjs';

export const MARKER = 'source: agent-hq';
export const DEFAULT_FOLDER = 'Agent HQ Memory';
const NOTE_NAME = /^[\w.-]{1,120}\.md$/;
const MAX_NOTES = 200;
const MAX_NOTE_BYTES = 64 * 1024;

/** Folder inside the vault, or null if unsafe. */
export function safeFolder(name) {
  if (typeof name !== 'string' || !name.length || name.length > 80) return null;
  if (/[\x00-\x1f\x7f]/.test(name) || /^[a-zA-Z]:/.test(name) || path.isAbsolute(name) || /^[\\/]/.test(name)) return null;
  if (name.split(/[\\/]/).some((p) => p === '..')) return null;
  return name;
}

const head = (kind, date, role) => `---\n${MARKER}\nkind: ${kind}\n${role ? `role: ${role}\n` : ''}updated: ${date}\ntags: [agent-hq, memory]\n---\n` +
  '> Written by Agent HQ. Edit in Agent HQ, not here: this note is rewritten when HQ\'s memory changes.\n\n';
const one = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const section = (title, lines) => (lines.length ? `## ${title}\n\n${lines.join('\n')}\n\n` : '');

/** Markdown for one role. Sections in order, each omitted when empty. */
export function renderRoleNote({ role, label, corrections = [], prefs = [], lessons = [], mistakes = [], date }) {
  return head('role-memory', date, role) + `# ${label || role}\n\n` +
    section('Owner corrections', corrections.map((c) => `- ${c.date} (${c.kind}${c.game && c.game !== 'any' ? `, ${c.game}` : ''}): ${one(c.text)}`)) +
    section('Owner preferences', prefs.map((p) => `- ${p.date}: ${one(p.text)}`)) +
    section('Lessons', lessons.map((l) => `- ${one(l)}`)) +
    section('Repeated mistakes', mistakes.map((m) => `- ${m.game && m.game !== 'any' ? `[${m.game}] ` : ''}${one(m.what)} (seen ${m.count} time${m.count === 1 ? '' : 's'})${m.fix ? ` Fix: ${one(m.fix)}` : ''}`));
}

function readLessons(memoryDir, role) {
  try { return fs.readFileSync(path.join(memoryDir, `${role}.md`), 'utf8').split(/\r?\n/).filter((l) => l.startsWith('- ')).map((l) => l.slice(2)); } catch { return []; }
}

function readResearch(notesDir) {
  let names = [];
  try { names = fs.readdirSync(notesDir).filter((n) => NOTE_NAME.test(n)).sort().slice(0, MAX_NOTES); } catch { return []; }
  const out = [];
  for (const n of names) {
    try { out.push([n, fs.readFileSync(path.join(notesDir, n), 'utf8').slice(0, MAX_NOTE_BYTES)]); } catch { /* unreadable: skip */ }
  }
  return out;
}

const isOurs = (text) => /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1].split(/\r?\n/).some((l) => l.trim() === MARKER) ?? false;
const norm = (t) => t.replace(/\r\n/g, '\n').replace(/^updated: .*\n/m, '');

/** One pass. Returns { written, unchanged, skipped } or { error }. */
export function mirrorOnce({ vault, folder = DEFAULT_FOLDER, memoryDir, notesDir, roles = [], date }) {
  if (typeof vault !== 'string' || !vault || !path.isAbsolute(vault)) return { error: 'vault must be an absolute path' };
  try { if (!fs.statSync(vault).isDirectory()) return { error: 'vault is not a folder' }; } catch { return { error: 'vault folder does not exist' }; }
  const f = safeFolder(folder);
  if (!f) return { error: 'folder inside the vault is not allowed' };
  const root = path.resolve(vault, f);
  const all = readMistakes(memoryDir);
  const files = new Map();
  const used = new Set();
  const index = [];
  for (const { id, label } of roles) {
    const corrections = readCorrections(memoryDir, id), prefs = readPrefs(memoryDir, id), lessons = readLessons(memoryDir, id);
    const mistakes = all.filter((m) => m.role === id && m.count >= 2);
    if (!corrections.length && !prefs.length && !lessons.length && !mistakes.length) continue;
    let name = String(label ?? '').replace(/[^A-Za-z0-9 _-]/g, '').trim() || String(id).replace(/[^A-Za-z0-9_-]/g, '') || 'role';
    if (used.has(name.toLowerCase())) name = `${name} ${id}`.replace(/[^A-Za-z0-9 _-]/g, '');
    used.add(name.toLowerCase());
    files.set(`Roles/${name}.md`, renderRoleNote({ role: id, label, corrections, prefs, lessons, mistakes, date }));
    index.push(`- [[Roles/${name}|${label || id}]]: ${corrections.length} corrections, ${prefs.length} preferences, ${lessons.length} lessons, ${mistakes.length} repeated mistakes`);
  }
  const studio = readPrefs(memoryDir, STUDIO);
  files.set('Studio preferences.md', head('preferences', date) + '# Studio preferences\n\n' + (studio.length ? studio.map((p) => `- ${p.date}: ${one(p.text)}`).join('\n') : 'None yet.') + '\n');
  const ranked = [...all].sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1));
  files.set('Mistakes.md', head('mistakes', date) + '# Mistakes\n\n' + (ranked.length ? ranked.map((m) =>
    `- ${m.role} | ${m.game || 'any'} | seen ${m.count}x: ${one(m.what)}${m.fix ? ` Fix: ${one(m.fix)}` : ''}`).join('\n') : 'None yet.') + '\n');
  const research = readResearch(notesDir);
  for (const [n, text] of research) files.set(`Research/${n}`, head('research', date) + text + (text.endsWith('\n') ? '' : '\n'));
  files.set(`${DEFAULT_FOLDER}.md`, head('index', date) + '# Agent HQ Memory\n\n' + (index.length ? index.join('\n') + '\n\n' : 'No role memory yet.\n\n') +
    `- [[Studio preferences]]: ${studio.length} preferences\n- [[Mistakes]]: ${all.length} mistakes\n- Research notes: ${research.length} in the Research folder\n`);

  const res = { written: [], unchanged: 0, skipped: [] };
  try {
    for (const [rel, content] of files) {
      const target = path.resolve(root, rel);
      const back = path.relative(root, target);
      if (!back || back.startsWith('..') || path.isAbsolute(back)) { res.skipped.push(rel); continue; }
      let old = null;
      try { old = fs.readFileSync(target, 'utf8'); } catch { /* new file */ }
      if (old !== null && !isOurs(old)) { res.skipped.push(rel); continue; }
      if (old !== null && norm(old) === norm(content)) { res.unchanged++; continue; }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
      res.written.push(rel);
    }
  } catch (e) { return { error: String(e?.message ?? e) }; }
  return res;
}

/** Watches memoryDir and notesDir; runs mirrorOnce `debounceMs` after the last change, plus once at start. roles may be a list or a function returning one. */
export function startObsidianMirror({ memoryDir, notesDir, roles, getSettings, nowIso = () => new Date().toISOString(), log = () => {}, debounceMs = 2000 }) {
  let timer = null, stopped = false;
  const run = () => {
    try {
      const s = getSettings() ?? {};
      if (!s.obsidianVault) return { off: true };
      const r = mirrorOnce({ vault: s.obsidianVault, folder: s.obsidianFolder || DEFAULT_FOLDER, memoryDir, notesDir, roles: typeof roles === 'function' ? roles() : roles, date: nowIso().slice(0, 10) });
      if (r.error) log(`obsidian mirror: ${r.error}`);
      return r;
    } catch (e) { log(`obsidian mirror failed: ${e?.message ?? e}`); return { error: String(e?.message ?? e) }; }
  };
  const later = () => {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(run, debounceMs);
    timer.unref?.();
  };
  const watchers = [];
  for (const dir of [memoryDir, notesDir]) {
    try { const w = fs.watch(dir, later); w.on('error', () => {}); watchers.push(w); } catch { /* folder missing: not watched */ }
  }
  later();
  return { run, stop() { stopped = true; clearTimeout(timer); for (const w of watchers) try { w.close(); } catch { /* already closed */ } } };
}

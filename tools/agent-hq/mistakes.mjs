// Mistakes ledger: what went wrong for a role (gate FAIL, owner "changes" or reject, failed task), merged when it repeats.
// File: <dir>/mistakes.json, [{ role, game, tags, what, fix, count, firstAt, lastAt, taskId }]. Briefs show the most relevant ones.
import fs from 'node:fs';
import path from 'node:path';

export const MISTAKES_CAP = 200;
export const REPEAT_AT = 3;
const STOP = new Set('that this with from have been were will your when then than they them what which also into only just more most very must need should would could about after before over under task fail failed owner role game please'.split(' '));
const oneLine = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n).trim();
const file = (dir) => path.join(dir, 'mistakes.json');

/** Keywords (>= 4 letters, no filler), at most 12, in order of first use. */
export function tagsOf(...texts) {
  const out = [];
  for (const w of texts.join(' ').toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 4 && !STOP.has(w) && !out.includes(w)) out.push(w);
  return out.slice(0, 12);
}
const overlap = (a, b) => (a.length && b.length ? a.filter((t) => b.includes(t)).length / Math.min(a.length, b.length) : 0);

export function readMistakes(dir) {
  try { const j = JSON.parse(fs.readFileSync(file(dir), 'utf8')); return Array.isArray(j) ? j : []; } catch { return []; }
}
function save(dir, list) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file(dir), JSON.stringify(list.sort((a, b) => (a.lastAt < b.lastAt ? -1 : 1)).slice(-MISTAKES_CAP), null, 1) + '\n');
}

/** Same role and >= 60% tag overlap merges into one entry (count + 1); otherwise a new entry. Returns the entry, or null when empty. */
export function recordMistake(dir, { role, game, title, reason, taskId }, nowIso = () => new Date().toISOString()) {
  const what = oneLine(reason || title, 220);
  const tags = tagsOf(title, reason);
  if (!role || !what || !tags.length) return null;
  const list = readMistakes(dir);
  const at = nowIso();
  let e = list.find((x) => x.role === role && overlap(tags, x.tags) >= 0.6);
  if (e) { e.count++; e.lastAt = at; e.taskId = taskId ?? e.taskId; e.tags = [...new Set([...e.tags, ...tags])].slice(0, 16); e.what = what; } else {
    e = { role, game: game || 'any', tags, what, fix: null, count: 1, firstAt: at, lastAt: at, taskId: taskId ?? null };
    list.push(e);
  }
  save(dir, list);
  return e;
}

/** The follow-up of a failed task passed: keep its summary as the fix on the entry that task opened (else the role's newest entry without a fix, e.g. an owner "changes" note). */
export function setFix(dir, taskId, fix, role) {
  const text = oneLine(String(fix ?? '').split(/\r?\n/).find((l) => l.trim()), 200);
  const list = readMistakes(dir);
  const e = !text ? null : list.find((x) => x.taskId === taskId && taskId) ?? list.filter((x) => x.role === role && !x.fix).pop();
  if (!e) return false;
  e.fix = text;
  save(dir, list);
  return true;
}

/** The role's mistakes ranked by keyword overlap with `words` (a Set or array), then count, then recency. */
export function rankMistakes(dir, role, words = [], n = 5) {
  const w = new Set(words);
  return readMistakes(dir).filter((m) => m.role === role)
    .map((m) => [m.tags.filter((t) => w.has(t)).length, m])
    .sort((a, b) => b[0] - a[0] || b[1].count - a[1].count || (a[1].lastAt < b[1].lastAt ? 1 : -1))
    .slice(0, n).map((x) => x[1]);
}

/** One brief line. A mistake seen REPEAT_AT times or more reads as a repeated mistake with its fix. */
export function mistakeLine(m) {
  const what = oneLine(m.what, 160);
  if (m.count >= REPEAT_AT) return `- Repeated mistake (${m.count} times): ${what}${m.fix ? ` Do this instead: ${oneLine(m.fix, 120)}` : ''}`;
  return `- Earlier mistake: ${what}${m.fix ? ` (fix: ${oneLine(m.fix, 100)})` : ''}`;
}

/** The role's top repeated mistakes, for a reviewer or tester checking that role's work. */
export function checklist(dir, roles, n = 5) {
  return readMistakes(dir).filter((m) => roles.includes(m.role) && m.count >= 2)
    .sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1)).slice(0, n)
    .map((m) => `- ${oneLine(m.what, 140)} (${m.role}, ${m.count}x)`);
}

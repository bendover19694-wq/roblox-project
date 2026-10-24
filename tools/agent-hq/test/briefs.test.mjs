import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBrief, loadRoles, readRules, parseVault, RESET_TEXT } from '../briefs.mjs';
import { openDb, addMessage } from '../db.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const task = { id: 't_abc', title: 'Do thing', body: 'Details here' };
const HQCTL = 'node tools/agent-hq/hqctl.mjs';
const ICONS = new Set(['crown', 'radar', 'compass', 'wrench', 'layout', 'palette', 'mountain', 'box', 'scale', 'cart', 'image', 'smile', 'play', 'shield', 'flag', 'pulse']);

test('roles.json has 16 roles with required fields', () => {
  const roles = loadRoles();
  assert.equal(roles.length, 16);
  for (const r of roles) {
    for (const k of ['id', 'label', 'job', 'chapters', 'mode', 'files', 'engine', 'model', 'needsStudio', 'allowedTools', 'agentType', 'skills', 'mcp', 'doneWhen', 'gates', 'color', 'icon']) {
      assert.ok(k in r, `${r.id}.${k}`);
    }
    assert.match(r.color, /^#[0-9a-f]{6}$/i, r.id);
    assert.ok(ICONS.has(r.icon), `${r.id} icon ${r.icon}`);
    assert.ok(Array.isArray(r.skills) && r.skills.every((s) => s.name && s.when), r.id);
    for (const g of r.gates) assert.ok(roles.some((x) => x.id === g), `${r.id} gate ${g}`);
  }
  assert.equal(new Set(loadRoles().map((r) => r.icon)).size, 16, 'one icon per role');
});

test('brief has rules, chapter 5 for ui, task text', () => {
  const rules = readRules(root);
  assert.match(rules, /Never publish/);
  const b = buildBrief({ task, role: 'ui', root });
  assert.ok(b.includes(rules));
  assert.ok(b.includes(parseVault(root).find((c) => c.n === 5).text));
  assert.match(b, /Details here/);
  assert.match(b, /hq_complete/);
});

test('delegation section only for lead', () => {
  assert.match(buildBrief({ task, role: 'lead', root }), /hq_create_task/);
  assert.doesNotMatch(buildBrief({ task, role: 'builder', root }), /hq_create_task/);
});

test('task id line, engine sections, designer defaults', () => {
  const ui = buildBrief({ task: { ...task, engine: 'app' }, role: 'ui', root });
  assert.ok(ui.includes('Your HQ task id: t_abc. Pass it as taskId to every hq_* tool.'));
  assert.match(ui, /Claude desktop app/);
  assert.doesNotMatch(ui, /generate_image/);

  const roles = loadRoles();
  assert.equal(roles.find((r) => r.id === 'designer').engine, 'antigravity');
  assert.equal(roles.find((r) => r.id === 'thumbnails').engine, 'antigravity');
  assert.equal(roles.filter((r) => r.engine === 'app').length, 14);
});

test('builder brief names its three skills, tools, gates and definition of done', () => {
  const b = buildBrief({ task: { ...task, engine: 'app' }, role: 'builder', root });
  for (const s of ['superpowers:test-driven-development', 'superpowers:systematic-debugging', 'superpowers:verification-before-completion']) {
    assert.ok(b.includes(`Invoke with the Skill tool: ${s}`), s);
  }
  assert.match(b, /If a listed skill is not installed, say so in hq_note and continue/);
  assert.match(b, /Tools to prefer[\s\S]*Roblox_Studio/);
  for (const d of loadRoles().find((r) => r.id === 'builder').doneWhen) assert.ok(b.includes(d), d);
  assert.match(b, /## Definition of done/);
  assert.match(b, /Record 0 to 2 reusable lessons with hq_learn before hq_complete/);
  assert.deepEqual(loadRoles().find((r) => r.id === 'builder').gates, ['reviewer', 'playtester']);
});

test('antigravity brief names the art rule file and skills, not the Skill tool', () => {
  const b = buildBrief({ task: { ...task, engine: 'antigravity' }, role: 'designer', root });
  assert.ok(b.includes('.agents/rules/agent-hq-art-direction.md'));
  assert.ok(b.includes('.agents/skills/roblox-ui-concept/SKILL.md'));
  assert.ok(b.includes('.agents/skills/roblox-store-art/SKILL.md'));
  assert.match(b, /scored self-check on every image/);
  assert.match(b, /generate_image/);
  assert.ok(b.includes('assets/concepts/<taskId>-<n>.png'));
  assert.doesNotMatch(b, /Invoke with the Skill tool: \.agents/);
  assert.doesNotMatch(b, /Claude desktop app/);
});

test('every role brief has the hqctl line and a lessons section; referenced files exist', () => {
  for (const r of loadRoles()) {
    const b = buildBrief({ task, role: r.id, root });
    assert.ok(b.includes(HQCTL), r.id);
    assert.ok(b.includes('## Lessons from earlier tasks (follow them)'), r.id);
    assert.ok(b.includes('## Definition of done'), r.id);
    assert.ok(b.includes("Never read, print or use .agent-hq/owner-token; owner approvals are the owner's alone."), r.id);
    for (const s of r.skills.filter((x) => x.name.includes('/'))) assert.ok(fs.existsSync(path.join(root, s.name)), s.name);
  }
});

test('lessons come from memory/<role>.md, newest 15', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-brief-'));
  fs.cpSync(path.join(root, '.claude/skills/roblox-agent-team'), path.join(tmp, '.claude/skills/roblox-agent-team'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'tools/agent-hq/memory'), { recursive: true });
  const lines = Array.from({ length: 20 }, (_, i) => `- 2026-10-22: lesson number ${i + 1}`);
  fs.writeFileSync(path.join(tmp, 'tools/agent-hq/memory/builder.md'), lines.join('\n') + '\n');
  const b = buildBrief({ task, role: 'builder', root: tmp });
  assert.ok(b.includes('lesson number 20') && b.includes('lesson number 6'));
  assert.ok(!b.includes('lesson number 5\n') && !b.includes('lesson number 1\n'));
  assert.doesNotMatch(buildBrief({ task, role: 'ui', root: tmp }), /lesson number/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('conversation so far: last 10 owner/agent messages after the latest reset', () => {
  const db = openDb(':memory:');
  addMessage(db, { role: 'builder', from: 'owner', text: 'before reset' });
  addMessage(db, { role: 'builder', from: 'system', text: RESET_TEXT });
  for (let i = 1; i <= 12; i++) addMessage(db, { role: 'builder', from: i % 2 ? 'owner' : 'agent', text: `msg ${i}` });
  addMessage(db, { role: 'builder', from: 'system', text: 'Task done' });
  addMessage(db, { role: 'ui', from: 'owner', text: 'other thread' });
  const b = buildBrief({ task, role: 'builder', root, db });
  assert.match(b, /## Conversation so far/);
  assert.ok(b.includes('Owner: msg 11') && b.includes('Builder: msg 12') && b.includes('msg 3'));
  assert.ok(!b.includes('msg 2\n') && !b.includes('before reset') && !b.includes('other thread') && !b.includes('Task done'));
  assert.doesNotMatch(buildBrief({ task, role: 'builder', root }), /Conversation so far/);
});

test('the task token line appears only when a token is given', () => {
  const b = buildBrief({ task, role: 'builder', root, taskToken: 'tkn_abc123' });
  assert.ok(b.includes("Your HQ task token: tkn_abc123. Pass it as taskToken (with taskId) to every hq_* tool. Never share it or use another task's token."));
  assert.ok(b.indexOf('Your HQ task id') < b.indexOf('Your HQ task token') && b.indexOf('Your HQ task token') < b.indexOf('## Rules every agent gets'));
  assert.match(b, /add --token <your task token> to every task command/);
  assert.equal((b.match(/tkn_abc123/g) ?? []).length, 1, 'the token appears once');
  const none = buildBrief({ task, role: 'builder', root });
  assert.doesNotMatch(none, /task token|--token/);
});

test('attached images are listed under a Read-first heading', () => {
  const t = { ...task, attachPaths: ['uploads/abc.png', 'assets/concepts/t_1-1.png', '../etc/passwd'] };
  const b = buildBrief({ task: t, role: 'ui', root });
  assert.match(b, /## Attached images \(Read them first\)/);
  assert.ok(b.includes('- .agent-hq/media/uploads/abc.png'));
  assert.ok(b.includes('- assets/concepts/t_1-1.png'));
  assert.ok(!b.includes('passwd'));
  assert.ok(b.indexOf('## Attached images') < b.indexOf('## Your task'));
  const asJson = buildBrief({ task: { ...task, attachPaths: JSON.stringify(['uploads/x.jpg']) }, role: 'ui', root });
  assert.ok(asJson.includes('- .agent-hq/media/uploads/x.jpg'));
  assert.doesNotMatch(buildBrief({ task, role: 'ui', root }), /Attached images/);
});

test('producer and lead briefs explain stage requests; scout, liveops and librarian get their own sections', () => {
  for (const role of ['producer', 'lead']) {
    const b = buildBrief({ task, role, root });
    assert.match(b, /## Stage requests/, role);
    assert.match(b, /hq_stage_request \{game, toStage, evidence\}/);
    assert.match(b, /live \(the owner only\)/);
  }
  assert.doesNotMatch(buildBrief({ task, role: 'builder', root }), /Stage requests/);

  const scout = buildBrief({ task, role: 'scout', root });
  assert.match(scout, /## Pitch format/);
  for (const f of ['competitors', 'comparables', 'money', 'game {howItPlays, first60s', 'evidence {summary, links}', 'building', 'risks', 'FULL schema']) assert.ok(scout.includes(f), f);

  const ops = buildBrief({ task, role: 'liveops', root });
  assert.match(ops, /## Metrics and attention/);
  assert.match(ops, /hq_metric \{game, key, value, date\?\}/);
  assert.match(ops, /Brought to your attention/);

  assert.match(buildBrief({ task, role: 'librarian', root }), /hq_asset_add \{name, kind/);
  assert.doesNotMatch(buildBrief({ task, role: 'ui', root }), /hq_asset_add|hq_metric|Pitch format/);
});

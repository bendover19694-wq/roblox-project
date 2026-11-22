import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildBrief, loadRoles, LIBRARY } from '../briefs.mjs';
import { DEFAULT_SETTINGS } from '../settings-schema.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const dir = path.join(root, '.claude/skills/roblox-agent-team/standards');
const roles = loadRoles();
const brief = (role, engine = 'app', task = {}) => buildBrief({ task: { id: 't1', title: 'Do a thing', body: 'x', engine, ...task }, role, root, memoryDir: path.join(root, 'tools/agent-hq/test/fixtures') });

test('every role has standards, every standards file exists and cites its vault sources', () => {
  for (const r of roles) {
    assert.ok(r.standards?.length, `${r.id} has no standards`);
    for (const f of ['anti-slop', ...r.standards]) assert.ok(fs.existsSync(path.join(dir, `${f}.md`)), `${r.id}: ${f}.md missing`);
  }
  for (const f of fs.readdirSync(dir)) assert.match(fs.readFileSync(path.join(dir, f), 'utf8'), /^# .+\n/, f);
  assert.match(fs.readFileSync(path.join(dir, 'world.md'), 'utf8'), /LihFolk Vault V2 \(CC BY 4.0\)/);
});

test('every brief carries the quality bar with anti-slop plus the role standards, on small engines too', () => {
  for (const engine of ['app', 'groq']) {
    for (const r of roles) {
      const b = brief(r.id, engine);
      assert.match(b, /## Quality bar\nRead first \(\.claude\/skills\/roblox-agent-team\/standards\/\): anti-slop\.md/, `${engine} ${r.id}`);
      for (const f of r.standards) assert.ok(b.includes(`${f}.md`), `${engine} ${r.id} ${f}`);
    }
  }
});

test('world building: Claude Design tool, layout artboard rule, world references in the library', () => {
  const w = roles.find((r) => r.id === 'world');
  assert.ok(w.allowedTools.includes('Artifact'));
  assert.deepEqual(w.standards, ['world', '3d']);
  const b = brief('world');
  assert.match(b, /Design maps in Claude Design first/);
  assert.match(b, /research\/exemplars\/world-building\.md/);
  for (const [p] of Object.values(LIBRARY)) assert.ok(fs.existsSync(path.join(root, p)), `library path ${p}`);
  assert.ok(roles.filter((r) => r.library?.includes('world')).length >= 4);
});

test('3D reference sheets default to Claude Design on the app lane', () => {
  assert.equal(DEFAULT_SETTINGS.modelRefLane, 'claude-design');
  const b = brief('designer', 'app', { title: 'Reference sheet: rocket' });
  assert.match(roles.find((r) => r.id === 'designer').rules.join('\n'), /Claude Design artboards/);
  assert.match(b, /3d\.md/);
});

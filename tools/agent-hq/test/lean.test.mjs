import test from 'node:test';
import assert from 'node:assert/strict';
import { leanArgs, claudeArgs, PERSONAL_SKILLS_RULE } from '../engines.mjs';
import { pickModel, LIGHT_MAX } from '../smart-model.mjs';
import { isCriticism, CRITICISM_MAX } from '../learning-hooks.mjs';

const plugins = { 'lihfolk@lihfolk': true, 'superpowers@claude-plugins-official': true, 'vercel@claude-plugins-official': true, 'grill@xiaolai': false };

test('leanArgs switches on only the plugins the role skills name', () => {
  const a = leanArgs({ skills: [{ name: 'lihfolk:roblox-debugging' }, { name: 'roblox-ui' }, { name: '.agents/skills/x/SKILL.md' }, { name: 'grill:roast' }], allowedTools: ['Read', 'Bash(stylua:*)', 'mcp__hq__*', 'Skill'], userPlugins: plugins });
  assert.deepEqual(a.slice(0, 2), ['--setting-sources', 'project,local']);
  assert.deepEqual(JSON.parse(a[3]), { enabledPlugins: { 'lihfolk@lihfolk': true } }); // grill is off in the owner's settings and stays off
  const tools = a.slice(a.indexOf('--tools') + 1);
  assert.deepEqual([...tools].sort(), ['Agent', 'Bash', 'Glob', 'Grep', 'Read', 'Skill', 'ToolSearch']);
});

test('leanArgs: a role without lihfolk skills gets no Agent tool and no plugins', () => {
  const a = leanArgs({ skills: [{ name: 'roblox-ui' }], allowedTools: ['Read'], userPlugins: plugins });
  assert.deepEqual(JSON.parse(a[3]), { enabledPlugins: {} });
  assert.ok(!a.includes('Agent') && !a.includes('Edit') && !a.includes('Bash'));
});

test('claudeArgs adds lean flags only when asked and keeps the MCP config last', () => {
  const base = { brief: 'b', allowedTools: ['Read'], files: [], mcpConfigPath: 'm.json' };
  const plain = claudeArgs(base);
  assert.ok(!plain.includes('--setting-sources') && !plain.includes(PERSONAL_SKILLS_RULE));
  const lean = claudeArgs({ ...base, lean: { skills: [], userPlugins: {} } });
  assert.ok(lean.includes('--setting-sources') && lean.includes(PERSONAL_SKILLS_RULE));
  assert.deepEqual(lean.slice(-3), ['--mcp-config', 'm.json', '--strict-mcp-config']);
  assert.ok(lean.indexOf(PERSONAL_SKILLS_RULE) < lean.indexOf('--disallowedTools')); // the rule is an allow rule
});

test('pickModel: short Lead replies and results follow-ups drop to sonnet, planning stays on opus', () => {
  const lead = (title, body = '') => pickModel({ task: { role: 'lead', title, body }, roleModel: 'opus' }).model;
  assert.equal(lead('what is the status'), 'sonnet');
  assert.equal(lead('Results in: Shop fixes', 'x'.repeat(2000)), 'sonnet');
  assert.equal(lead('Plan the next game'), 'opus');
  assert.equal(lead('hello', 'x'.repeat(LIGHT_MAX + 1)), 'opus');
  assert.equal(pickModel({ task: { role: 'lead', title: 'hi' }, roleModel: 'opus', smart: false }).model, 'opus');
  assert.equal(pickModel({ task: { role: 'architect', title: 'hi' }, roleModel: 'opus' }).model, 'opus');
});

test('pickModel: failed attempts move one tier up, never past opus', () => {
  const m = (roleModel, attempt) => pickModel({ task: { role: 'builder', title: 'Fix', attempt }, roleModel }).model;
  assert.equal(m('sonnet', 1), 'sonnet');
  assert.equal(m('sonnet', 2), 'sonnet');
  assert.equal(m('sonnet', 3), 'opus');
  assert.equal(m('haiku', 2), 'sonnet');
  assert.equal(m('opus', 3), 'opus');
  assert.equal(m(undefined, 1), 'sonnet');
});

test('isCriticism: short feedback is a correction, a long new request is not', () => {
  assert.ok(isCriticism('No, the button is too small. Fix it.'));
  assert.ok(!isCriticism('Looks great, ship it'));
  assert.ok(!isCriticism('New game. Cartoon only, no gore. ' + 'Do the study first. '.repeat(40)));
  assert.ok(CRITICISM_MAX >= 300);
});

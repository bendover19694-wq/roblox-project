import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runGameCheck, styluaArgs } from '../game-check.mjs';
import { claudeArgs } from '../engines.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gc-'));
fs.mkdirSync(path.join(root, 'games/top-eleven'), { recursive: true });
fs.writeFileSync(path.join(root, 'games/top-eleven/default.project.json'), '{}');
fs.writeFileSync(path.join(root, 'stylua.toml'), '');

test('runs in the game folder, skips a missing tool, caps the tail, uses the root stylua config', async () => {
  const calls = [];
  const run = async (cmd, args, o) => {
    calls.push({ cmd, args, ...o });
    if (cmd === 'selene') return { missing: true };
    return { code: cmd === 'lune' ? 0 : 1, out: 'x'.repeat(9000) };
  };
  const r = await runGameCheck({ root, slug: 'top-eleven', run });
  assert.equal(r.folder, 'games/top-eleven');
  assert.ok(calls.every((c) => c.cwd === path.resolve(root, 'games/top-eleven') && c.timeout === 120000));
  assert.equal(r.steps[0].ok, true);
  assert.equal(r.steps[0].tail.length, 4096);
  assert.equal(r.steps[2].skipped, true);
  assert.equal(r.ok, false);
  assert.deepEqual(calls[1].args, ['--check', '--config-path', path.join(root, 'stylua.toml'), 'src', 'tests']);
});

test('stylua keeps the game config when it has one; the repo-root game needs no flag', () => {
  const game = path.join(root, 'games/top-eleven');
  assert.deepEqual(styluaArgs(root, game, (p) => p === path.join(game, 'stylua.toml')), ['--check', 'src', 'tests']);
  assert.deepEqual(styluaArgs(root, root, () => true), ['--check', 'src', 'tests']);
});

test('claudeArgs scopes edits to the role files in the game folder', () => {
  const builder = claudeArgs({ brief: 'b', model: 'sonnet', allowedTools: ['Read', 'Edit', 'Write', 'Skill'], files: ['src/server/**', 'assets/**'], gameDir: 'games/top-eleven', mcpConfigPath: 'm.json' });
  assert.equal(builder[builder.indexOf('--permission-mode') + 1], 'default');
  assert.ok(builder.includes('Edit(games/top-eleven/src/server/**)'));
  assert.ok(builder.includes('Write(games/top-eleven/src/server/**)'));
  assert.ok(builder.includes('Edit(assets/**)'));
  assert.ok(!builder.includes('Edit') && !builder.includes('Write'));
  assert.ok(!builder.includes('--disallowedTools'));
  for (const tools of [['Read', 'mcp__hq__*'], ['Read', 'Grep']]) {
    const a = claudeArgs({ brief: 'b', allowedTools: tools, files: ['docs/**'], gameDir: 'games/top-eleven', mcpConfigPath: 'm.json' });
    const i = a.indexOf('--disallowedTools');
    assert.deepEqual(a.slice(i, i + 4), ['--disallowedTools', 'Edit', 'Write', 'NotebookEdit']);
    assert.ok(!a.some((x) => x.startsWith('Edit(')));
  }
});

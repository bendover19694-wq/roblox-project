import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { creativeServers, creativeAllowed, creativeEnv, blenderExe, creativeStatus, BLENDER_MCP, MESHY_MCP, PENPOT_URL, SFXMINT_URL, PACK_SKILLS } from '../creative-tools.mjs';
import { loadRoles } from '../briefs.mjs';

const root = path.resolve(import.meta.dirname, '../../..');
const roles = loadRoles();
const role = (id) => roles.find((r) => r.id === id);

test('servers follow roles.json mcp; Meshy needs both the key and the owner setting', () => {
  const env = { MESHY_API_KEY: 'msy_test', SystemRoot: 'C:\\Windows' };
  assert.deepEqual(Object.keys(creativeServers(role('world'), { env })).sort(), ['blender']);
  assert.deepEqual(Object.keys(creativeServers(role('world'), { env, meshy: true })).sort(), ['blender', 'meshy']);
  assert.deepEqual(Object.keys(creativeServers(role('world'), { env: {}, meshy: true })), ['blender']); // no key, no Meshy
  assert.deepEqual(Object.keys(creativeServers(role('librarian'), { env })), ['sfxmint']);
  assert.ok(creativeServers(role('ui'), { env }).penpot);
  assert.deepEqual(creativeServers(role('builder'), { env, meshy: true }), {}); // code roles get none
  assert.deepEqual(creativeAllowed({ blender: {}, meshy: {} }), ['mcp__blender__*', 'mcp__meshy__*']);
  assert.equal(creativeServers(role('world'), { env, meshy: true }).meshy.env.MESHY_API_KEY, 'msy_test');
});

test('the repo .mcp.json pins the same versions agents get', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8')).mcpServers;
  assert.deepEqual(m.blender.args, [BLENDER_MCP]);
  assert.ok(m.meshy.args.includes(MESHY_MCP));
  assert.equal(m.meshy.env.MESHY_API_KEY, '${MESHY_API_KEY:-}'); // never a real key in the repo
  assert.equal(m.penpot.url, PENPOT_URL);
  assert.equal(m.sfxmint.url, SFXMINT_URL);
});

test('Blender is found from BLENDER_EXE or the newest Program Files folder, and goes on the agent PATH', () => {
  const pf = 'C:\\PF';
  const have = new Set([path.join(pf, 'Blender Foundation', 'Blender 4.5', 'blender.exe'), path.join(pf, 'Blender Foundation', 'Blender 4.10', 'blender.exe')]);
  const exists = (p) => have.has(p);
  const list = () => ['Blender 4.5', 'Blender 4.10', 'notes.txt'];
  const exe = blenderExe({ env: { ProgramFiles: pf }, exists, list });
  if (process.platform === 'win32') assert.equal(exe, path.join(pf, 'Blender Foundation', 'Blender 4.10', 'blender.exe')); // numeric sort: 4.10 > 4.5
  assert.equal(blenderExe({ env: { ProgramFiles: pf }, exists: () => false, list }), null);
  const e = creativeEnv({ Path: 'C:\\x' }, path.join('C:', 'B', 'blender.exe'));
  assert.equal(e.BLENDER_EXE, path.join('C:', 'B', 'blender.exe'));
  assert.ok(e.Path.startsWith(path.join('C:', 'B') + path.delimiter));
  assert.deepEqual(creativeEnv({ PATH: 'a' }, null), { PATH: 'a' });
});

test('status names a fix for each tool that is not ready', async () => {
  const st = await creativeStatus({ env: {}, home: '/nohome', exists: () => false, list: () => [], probe: async () => false });
  const byId = Object.fromEntries(st.map((s) => [s.id, s]));
  assert.equal(byId.blender.ready, false);
  assert.match(byId.blender.fix, /winget install BlenderFoundation\.Blender/);
  assert.equal(byId.meshy.ready, false);
  assert.match(byId.meshy.detail, /no MESHY_API_KEY/);
  assert.equal(byId['claude-design'].ready, true);
  assert.equal(byId.penpot.ready, false);
  assert.match(byId.skills.detail, new RegExp(PACK_SKILLS[0]));
  const on = await creativeStatus({ env: { MESHY_API_KEY: 'k' }, home: '/h', exists: () => true, list: () => [], meshy: true, probe: async () => true });
  assert.ok(on.every((s) => s.ready || s.id === 'blender'));
});

test('world and designer briefs carry the map pipeline and the new skills', () => {
  const w = role('world');
  for (const s of ['roblox-map-builder', 'lihfolk-stud-voxel', '4ghouls-prompter']) assert.ok(w.skills.some((x) => x.name === s), s);
  assert.ok(!w.allowedTools.some((t) => /Bash\((blender|python|py):/.test(t)), 'no broad Bash grants');
  assert.match(w.rules.join(' '), /scripts\/creative_run\.py/);
  const world = fs.readFileSync(path.join(root, '.claude/skills/roblox-agent-team/standards/world.md'), 'utf8');
  assert.match(world, /## Map pipeline/);
  for (const step of ['Style', 'References', 'Tools', 'Prompt', 'Build', 'Check']) assert.ok(world.includes(`**${step}`), step);
  assert.ok(role('ui').skills.some((x) => x.name === 'folk-stud-ui'));
});

test('the pack installer refuses unsafe archives and never runs anything', (t) => {
  const py = spawnSync('python', ['--version']);
  if (py.status !== 0) return t.skip('python not on PATH');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-zip-'));
  const make = (name, members) => spawnSync('python', ['-I', '-c',
    'import zipfile,sys,json\nz=zipfile.ZipFile(sys.argv[1],"w")\nfor n in json.loads(sys.argv[2]): z.writestr(n,"x")\nz.close()', path.join(dir, name), JSON.stringify(members)]);
  const installer = path.join(root, 'scripts/install_skill_zips.py');
  const run = () => spawnSync('python', ['-I', installer, '--from', dir, '--dry-run'], { encoding: 'utf8' });
  make('4ghouls-prompter.zip', ['../evil/SKILL.md']);
  assert.match(run().stderr + run().stdout, /REFUSED .*unsafe path/);
  fs.rmSync(path.join(dir, '4ghouls-prompter.zip'));
  make('folk-stud-ui.skill', ['folk-stud-ui/SKILL.md', 'folk-stud-ui/run.exe']);
  assert.match(run().stderr, /REFUSED .*\.exe/);
  fs.rmSync(path.join(dir, 'folk-stud-ui.skill'));
  make('folk map generation x.zip', ['roblox-map-builder/SKILL.md', 'roblox-map-builder/scene.blend']);
  assert.match(run().stderr, /REFUSED .*\.blend/);
  fs.rmSync(path.join(dir, 'folk map generation x.zip'));
  make('folk-stud-ui.skill', ['folk-stud-ui/SKILL.md', 'folk-stud-ui/scripts/icons.py']);
  const ok = run();
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /would install folk-stud-ui/);
});

test('codex runs read-only on the ChatGPT account and gets HQ MCP servers as TOML values', async () => {
  const { codexArgs } = await import('../engines.mjs');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hq-codex-')), 'mcp.json');
  fs.writeFileSync(f, JSON.stringify({ mcpServers: { hq: { command: 'C:\node.exe', args: ['mcp.mjs'], env: { HQ_TOKEN: 'a"b' } }, penpot: { type: 'http', url: 'http://localhost:4401/mcp' }, 'bad name': { command: 'x' } } }));
  const a = codexArgs({ brief: 'Do it', model: 'gpt-5.6-terra', mcpConfigPath: f, cwd: 'C:\repo' });
  assert.deepEqual(a.slice(0, 5), ['exec', '--json', '--skip-git-repo-check', '-s', 'read-only']);
  assert.ok(a.includes('mcp_servers.hq.command="C:\\node.exe"'));
  assert.ok(a.includes('mcp_servers.hq.env={HQ_TOKEN="a\\"b"}'));
  assert.ok(a.includes('mcp_servers.penpot.url="http://localhost:4401/mcp"'));
  assert.ok(a.includes('mcp_servers.hq.default_tools_approval_mode="approve"')); // without it exec mode cancels every HQ call
  assert.ok(!a.some((x) => x.includes('bad name')));
  assert.equal(a.at(-1), 'Do it');
});

test('npm shims resolve to the real script, not the optional local node.exe they name first', async () => {
  const { resolveCommand } = await import('../engines.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-shim-'));
  const shim = path.join(dir, 'codex.cmd');
  const bs = String.fromCharCode(92);
  fs.writeFileSync(shim, [`IF EXIST "%dp0%${bs}node.exe" (`, `  SET "_prog=%dp0%${bs}node.exe"`, ')', `"%_prog%"  "%dp0%${bs}node_modules${bs}@openai${bs}codex${bs}bin${bs}codex.js" %*`].join('\r\n'));
  const r = resolveCommand(shim, ['exec']);
  assert.equal(r.command, process.execPath);
  assert.equal(r.args[0], path.join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js'));
  assert.equal(r.args[1], 'exec');
});

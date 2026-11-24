// Creative tools agents use beside HQ: Blender (MCP add-on and headless CLI), Meshy (3D generation, paid credits),
// SFXMint (CC0 sound library) and Penpot (open-source design tool in place of Figma, whose free plan allows ~6 MCP calls a month).
// A role gets a tool's MCP server when roles.json "mcp" names it and the tool is usable; servers are pinned versions.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const isWin = process.platform === 'win32';
export const BLENDER_MCP = 'mcp-for-blender==2.3.1';
export const MESHY_MCP = '@meshy-ai/meshy-mcp-server@0.6.12';
export const PENPOT_URL = 'http://localhost:4401/mcp';
export const SFXMINT_URL = 'https://sfxmint.com/mcp';
// Skills from the LihFolk packs and 4ghouls, installed in ~/.claude/skills after a security review (research/exemplars/creative-tools.md).
export const PACK_SKILLS = ['roblox-map-builder', 'lihfolk-stud-voxel', 'folk-stud-ui', 'stud-ui-clean-roblox', '4ghouls-prompter', 'watch-video'];

/** Installed packs outside the repo that the asset catalog lists (folder, name, licence as each pack states it). */
export function installedPacks(home = os.homedir()) {
  const sk = (s, sub) => path.join(home, '.claude', 'skills', s, sub);
  const lf = 'LihFolk free drop: personal use, no redistribution';
  return [
    { name: 'lihfolk-stud-voxel-models', dir: sk('lihfolk-stud-voxel', 'examples'), licence: lf, about: 'LihFolk stud voxel models (critters, bosses, props, buildings) with concept sheets, .glb exports' },
    { name: 'lihfolk-map-builder-maps', dir: sk('roblox-map-builder', 'examples'), licence: lf, about: 'LihFolk map builder worked maps (hubs, towns, caves, islands) with renders and prop kits' },
    { name: 'folk-icon-pack', dir: path.join(home, 'Documents', 'LihFolk-Packs', 'FOLK Icon Pack'), licence: lf, about: 'FOLK Icon Pack: 4,000+ stud UI icons (currency, eggs, ranks, menus, keys)' },
    { name: 'stud-ui-clean-roblox', dir: sk('stud-ui-clean-roblox', 'assets'), licence: 'MIT', about: 'Stud UI simulator kit reference screenshots' },
    { name: 'windui-reference', dir: path.join(home, 'Documents', 'LihFolk-Packs', 'references', 'WindUI'), licence: 'MIT (reference only: a script-hub UI library)', about: 'WindUI screenshots' },
    { name: 'exploit-ui-libraries-reference', dir: path.join(home, 'Documents', 'LihFolk-Packs', 'references', 'UI-Libraries'), licence: 'Unknown, mixed: look only, never copy', about: 'Screenshots of 60+ script-hub UI libraries (Orion, Kavo, Linoria...) for style study' },
  ];
}

const ls = (d) => { try { return fs.readdirSync(d); } catch { return []; } };

/** Newest blender.exe: BLENDER_EXE, else Program Files\Blender Foundation\<version>\blender.exe. Null when absent. */
export function blenderExe({ env = process.env, exists = fs.existsSync, list = ls } = {}) {
  if (env.BLENDER_EXE && exists(env.BLENDER_EXE)) return env.BLENDER_EXE;
  const base = path.join(env.ProgramFiles || 'C:\\Program Files', 'Blender Foundation');
  const vers = list(base).filter((d) => /^Blender/i.test(d)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const v of vers) { const p = path.join(base, v, isWin ? 'blender.exe' : 'blender'); if (exists(p)) return p; }
  return null;
}

/**
 * MCP server entries for a role's creative tools. Blender only with the owner's "Allow Blender" on (it runs Python);
 * Meshy only with a key and "Use Meshy" on (it spends credits). Partner tasks get none: their text is not the owner's.
 */
export function creativeServers(role, { env = process.env, meshy = false, blender = true, partner = false } = {}) {
  const want = new Set(partner ? [] : role?.mcp ?? []);
  const out = {};
  if (want.has('blender') && blender) out.blender = { command: 'uvx', args: [BLENDER_MCP] };
  if (want.has('sfxmint')) out.sfxmint = { type: 'http', url: SFXMINT_URL };
  if (want.has('penpot')) out.penpot = { type: 'http', url: PENPOT_URL };
  if (want.has('meshy') && meshy && env.MESHY_API_KEY) {
    out.meshy = isWin ? { command: path.join(env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe'), args: ['/c', 'npx', '-y', MESHY_MCP], env: { MESHY_API_KEY: env.MESHY_API_KEY } }
      : { command: 'npx', args: ['-y', MESHY_MCP], env: { MESHY_API_KEY: env.MESHY_API_KEY } };
  }
  return out;
}
export const creativeAllowed = (servers) => Object.keys(servers).map((n) => `mcp__${n}__*`);

/** Env for an agent process: Blender's folder on PATH and BLENDER_EXE set, so the headless skills find it. */
export function creativeEnv(env, exe) {
  if (!exe) return env;
  const dir = path.dirname(exe);
  const key = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
  return { ...env, BLENDER_EXE: exe, [key]: `${dir}${path.delimiter}${env[key] ?? ''}` };
}

/** Status of every creative tool: ready or not, and the one step that fixes it. */
export async function creativeStatus({ env = process.env, home = os.homedir(), exists = fs.existsSync, list = ls, meshy = false, probe = probePort } = {}) {
  const exe = blenderExe({ env, exists, list });
  const skills = PACK_SKILLS.map((s) => ({ name: s, found: exists(path.join(home, '.claude/skills', s, 'SKILL.md')) }));
  const penpot = await probe(4401);
  const ver = exe ? path.basename(path.dirname(exe)).replace(/^Blender\s*/i, '') : '';
  const addon = !!ver && exists(path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Blender Foundation', 'Blender', ver, 'scripts', 'addons', 'blender_mcp.py'));
  return [
    { id: 'blender', label: 'Blender (headless and MCP)', ready: !!exe, detail: exe ? `${exe}; MCP add-on ${addon ? 'installed' : 'missing'}` : 'not installed', fix: 'winget install BlenderFoundation.Blender, then uvx ' + BLENDER_MCP + ' install-addon and enable the add-on' },
    { id: 'claude-design', label: 'Claude Design', ready: true, detail: 'Artifact tool, quickstart intent "design" (Claude agents)', fix: '' },
    { id: 'meshy', label: 'Meshy 3D generation', ready: !!(meshy && env.MESHY_API_KEY), detail: env.MESHY_API_KEY ? (meshy ? 'key set, on' : 'key set, off in Settings') : 'no MESHY_API_KEY', fix: 'Set MESHY_API_KEY (meshy.ai, API keys) and turn on Settings, Art, "Use Meshy". Each model spends credits.' },
    { id: 'sfxmint', label: 'SFXMint sounds (CC0)', ready: true, detail: 'search needs no key; downloads need a free key', fix: '' },
    { id: 'penpot', label: 'Penpot design (open-source Figma)', ready: penpot, detail: penpot ? 'MCP server answering on 4401' : 'MCP server not running', fix: 'npx -y @penpot/mcp@stable, then in design.penpot.app load http://localhost:4400/manifest.json and Connect' },
    { id: 'skills', label: 'LihFolk and 4ghouls skills', ready: skills.every((s) => s.found), detail: skills.filter((s) => !s.found).map((s) => s.name).join(', ') || 'all installed', fix: 'See research/exemplars/creative-tools.md, Install' },
  ];
}

async function probePort(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(400) });
    return r.status > 0;
  } catch (e) { return e?.cause?.code === 'ECONNRESET'; }
}

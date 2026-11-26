// UI mocks: a designer agent makes an original screen (HUD, shop, quests...) for one game from that game's UI Lab kits and
// returns it as a JSON layout. HQ checks every value and draws it itself (#/uilab/mock/<id>), so no agent-written HTML or
// script ever runs here. When a mock is ready, the designer's Discord thread hears about it.
// Data: <stateDir>/uilab-mocks/<id>.json. Images may only point at UI Lab media that exists.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SCREENS = ['hud', 'shop', 'inventory', 'quests', 'daily', 'rebirth', 'settings', 'index', 'custom'];
const ID = /^[a-z0-9-]{3,80}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const MEDIA = /^uilab\/[a-z0-9-]{3,60}\/(?:icons|screens)\/[\w.-]{1,160}$/;
const TYPES = ['frame', 'button', 'text', 'image'];
const arr = (v) => (Array.isArray(v) ? v : []);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** A safe copy of an agent's layout: known fields only, numbers clamped, colours hex, images known UI Lab media. */
export function cleanSpec(s, mediaExists = () => true) {
  if (!isObj(s)) throw new Error('spec must be an object');
  const num = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
  const col = (v) => (HEX.test(String(v ?? '')) ? String(v) : null);
  const grad = (g) => arr(g).filter((c) => HEX.test(String(c))).slice(0, 4);
  const text = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
  const nodes = arr(s.nodes).filter(isObj).slice(0, 300).map((x) => ({
    type: TYPES.includes(x.type) ? x.type : 'frame', name: text(x.name, 40),
    x: num(x.x, 0, 1, 0), y: num(x.y, 0, 1, 0), w: num(x.w, 0.005, 1, 0.1), h: num(x.h, 0.005, 1, 0.1),
    fill: col(x.fill), gradient: grad(x.gradient), angle: num(x.angle, 0, 360, 90), opacity: num(x.opacity, 0, 1, 1),
    stroke: col(x.stroke), strokeWidth: num(x.strokeWidth, 0, 12, 0), corner: num(x.corner, 0, 200, 0),
    text: text(x.text, 80), textColor: col(x.textColor), textStroke: col(x.textStroke), size: num(x.size, 0.01, 0.2, 0.04), bold: x.bold !== false,
    image: MEDIA.test(String(x.image ?? '')) && mediaExists(String(x.image)) ? String(x.image) : null, z: Math.round(num(x.z, 0, 50, 0)),
  }));
  if (!nodes.length) throw new Error('spec has no nodes');
  return { title: text(s.title, 80), notes: text(s.notes, 2000), bg: { fill: col(s.bg?.fill) ?? '#1b2030', gradient: grad(s.bg?.gradient) }, nodes };
}

const SPEC_HELP = 'Layout JSON: {title, notes, bg:{fill:"#hex", gradient:["#hex",...]}, nodes:[{type:"frame|button|text|image", name, x, y, w, h (0 to 1 of a 16:9 screen), fill, gradient, angle, opacity, stroke, strokeWidth (px at 1080p), corner (px), text, textColor, textStroke, size (text height as a fraction of screen height, e.g. 0.035), bold, image ("uilab/<kit id>/icons/<file>" from hq_uilab_kit), z}]}. Up to 300 nodes.';

export function createUiMocks({ stateDir, queueTask = () => null, taskState = () => null, notify = () => {}, games = () => [], kitsFor = () => [], now = Date.now }) {
  const dir = path.join(stateDir, 'uilab-mocks');
  const file = (id) => path.join(dir, `${id}.json`);
  const write = (m) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file(m.id), JSON.stringify(m, null, 1)); return m; };
  const read = (id) => {
    if (!ID.test(id)) return null;
    let m; try { m = JSON.parse(fs.readFileSync(file(id), 'utf8')); } catch { return null; }
    if (m.state === 'making' && ['failed', 'canceled'].includes(taskState(m.taskId))) m.state = 'failed';
    return m;
  };
  const mediaExists = (rel) => { try { return fs.statSync(path.join(stateDir, 'media', rel)).isFile(); } catch { return false; } };
  const gameName = (slug) => games().find((g) => g.slug === slug)?.name ?? slug;

  function request({ game = '', screen, ask = '' }) {
    if (game && !games().some((g) => g.slug === game)) throw new Error('unknown game');
    if (!SCREENS.includes(screen)) throw new Error(`screen must be one of ${SCREENS.join(', ')}`);
    const id = `${game || 'any'}-${screen}-${crypto.randomBytes(3).toString('hex')}`;
    const kits = kitsFor(game).slice(0, 12);
    const t = queueTask({
      title: `Make UI mock: ${game ? gameName(game) : 'any game'} ${screen}`.slice(0, 200), role: 'designer', createdBy: 'owner',
      body: [
        `Design an original ${screen === 'custom' ? 'screen' : `${screen} screen`} for ${game ? `the game "${gameName(game)}" (${game})` : 'a Roblox game'} as a UI mock (mock id ${id}). Do not draw pictures and do not use an image tool: make the layout itself.`,
        ask ? `The owner asks for: ${ask}` : '',
        kits.length ? `Start from this game's UI Lab kits (read each with hq_uilab_kit; use their palette, strokes, corners and icons): ${kits.map((k) => `${k.id} (${k.name})`).join(', ')}.` : 'Find kits with hq_uilab_search first (shop, hud, icons) and follow the best one.',
        SPEC_HELP,
        `Save it with hq_uilab_mock {id: "${id}", spec}. Phone safe: keep buttons at least 0.06 high, nothing under 0.02 from the edges. Borrow structure and technique only, never another game's names or exact art. Do not edit game files.`,
      ].filter(Boolean).join('\n\n'),
    });
    return write({ id, game, screen, ask: String(ask).slice(0, 1000), state: 'making', taskId: t?.id ?? null, createdAt: new Date(now()).toISOString(), spec: null });
  }

  function save(id, spec, by, task = null) {
    const m = read(id);
    if (!m) throw new Error('no such mock');
    if (task && (task.createdBy === 'partner' || task.id !== m.taskId)) throw new Error('only the task that was asked for this mock can save it');
    const clean = cleanSpec(spec, mediaExists);
    write({ ...m, state: 'done', spec: clean, by, doneAt: new Date(now()).toISOString() });
    notify(`UI mock ready: ${m.game ? gameName(m.game) : 'any game'}, ${m.screen} (${clean.nodes.length} parts). See it in Agent HQ, UI Lab, Mocks: #/uilab/mock/${id}`);
    return { ok: true, nodes: clean.nodes.length };
  }

  function list({ game = null, bin = false } = {}) {
    let all = [];
    try { all = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => read(f.slice(0, -5))).filter(Boolean); } catch { /* none yet */ }
    return all.filter((m) => (game === null || m.game === game) && !!m.archivedAt === bin)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(({ spec, ...m }) => ({ ...m, nodes: spec?.nodes?.length ?? 0, title: spec?.title ?? '' }));
  }

  function archive(id, archived) {
    const m = read(id);
    if (!m) throw new Error('no such mock');
    return write({ ...m, archivedAt: archived ? new Date(now()).toISOString() : null });
  }
  function remove(id) { // only from the bin
    const m = read(id);
    if (!m) throw new Error('no such mock');
    if (!m.archivedAt) throw new Error('move it to the bin first');
    fs.rmSync(file(id), { force: true });
    return { ok: true };
  }
  return { request, save, list, get: read, archive, remove };
}

export function mountUiMocks(route, mocks, { str, bad, isObj: obj, agentTask, HttpError }) {
  const id = (s) => { if (!ID.test(s)) throw bad('bad mock id'); return s; };
  const wrap = (fn) => { try { return fn(); } catch (e) { if (e instanceof HttpError) throw e; throw bad(e.message); } };
  route('GET', /^\/api\/uimocks$/, ({ query }) => ({ mocks: mocks.list({ game: query?.has('game') ? query.get('game') : null, bin: query?.get('bin') === '1' }) }));
  route('GET', /^\/api\/uimocks\/([a-z0-9-]+)$/, ({ m }) => mocks.get(id(m[1])) ?? (() => { throw new HttpError(404, 'no such mock'); })());
  route('POST', /^\/api\/uimocks$/, ({ body }) => {
    if (!obj(body)) throw bad('body must be an object');
    return wrap(() => mocks.request({ game: str(body.game, 'game', { max: 40 }) ?? '', screen: str(body.screen, 'screen', { max: 20, required: true }), ask: str(body.ask, 'ask', { max: 1000 }) ?? '' }));
  });
  route('POST', /^\/api\/uimocks\/([a-z0-9-]+)\/spec$/, ({ m, body, who, headers }) => {
    if (!obj(body)) throw bad('body must be an object');
    const t = who === 'agent' ? agentTask(body, ['designer', 'ui'], headers) : null;
    return wrap(() => mocks.save(id(m[1]), body.spec, t?.role ?? 'owner', t));
  }, { maxBody: 512 * 1024 });
  route('POST', /^\/api\/uimocks\/([a-z0-9-]+)\/archive$/, ({ m, body }) => wrap(() => mocks.archive(id(m[1]), !(obj(body) && body.archived === false))));
  route('POST', /^\/api\/uimocks\/([a-z0-9-]+)\/delete$/, ({ m }) => wrap(() => mocks.remove(id(m[1]))));
}

export const UIMOCKS_OWNER_ONLY = [['POST', /^\/api\/uimocks(?:\/[a-z0-9-]+\/(?:archive|delete))?$/]];

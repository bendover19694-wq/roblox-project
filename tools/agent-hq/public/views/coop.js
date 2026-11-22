// Co-op card on the HQ Link page: one game, two HQs. Set who edits which files, see the partner's board, hand off a commit.
import { h, api, act, btn, empty, field, store, selectEl, ago, notify } from './core.js';

let view;
let draft = null;
const lines = (a) => (a || []).join('\n');
const list = (s) => String(s || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const hand = { commit: '', note: '' };

export async function loadCoop() {
  try { view = await api('GET', '/api/coop'); } catch { view = view ?? null; }
  if (!draft && view) draft = { ...view, myLane: lines(view.myLane), partnerLane: lines(view.partnerLane), shared: lines(view.shared) };
  notify();
}

async function save(patch = {}) {
  const d = { ...draft, ...patch };
  const value = { enabled: !!d.enabled, game: d.game || '', me: d.me || '', partner: d.partner || '', shareBoard: !!d.shareBoard,
    myLane: Array.isArray(d.myLane) ? d.myLane : list(d.myLane), partnerLane: Array.isArray(d.partnerLane) ? d.partnerLane : list(d.partnerLane),
    shared: Array.isArray(d.shared) ? d.shared : list(d.shared) };
  if (await act(() => api('POST', '/api/settings', { key: 'coop', value }), 'Saved')) {
    draft = null;
    await loadCoop();
    if (value.shareBoard) act(() => api('POST', '/api/coop/publish', {}));
  }
}

const text = (key, attrs = {}) => h('textarea', { class: 'input', rows: 3, oninput: (e) => { draft[key] = e.target.value; }, ...attrs }, draft[key]);
const input = (key, attrs = {}) => h('input', { class: 'input', value: draft[key] || '', oninput: (e) => { draft[key] = e.target.value; }, ...attrs });
const check = (key, label) => h('label', { class: 'row gap' },
  h('input', { type: 'checkbox', checked: !!draft[key], onchange: (e) => { draft[key] = e.target.checked; } }), label);
const backlog = (l) => (l ? `${l.q} queued, ${l.w} working, ${l.d} done today` : 'no board yet');

function setup() {
  const games = (store.gameList?.length ? store.gameList : store.games) || [];
  const p = view.peer;
  const theirSplit = p?.lanes && (p.lanes.mine.length || p.lanes.theirs.length);
  return h('div', { class: 'stack' },
    field('Game you build together', selectEl([{ value: '', label: 'Pick a game' }, ...games.map((g) => ({ value: g.slug, label: g.name || g.slug }))], draft.game, (v) => { draft.game = v; })),
    h('div', { class: 'row gap' }, field('Your name', input('me', { placeholder: 'Voltage' })), field("Partner's name", input('partner', { placeholder: 'Ditto' }))),
    theirSplit ? h('p', { class: 'muted' }, `${p.from} already set a split. `,
      btn('Use their split', () => save({ game: p.game || draft.game, myLane: p.lanes.theirs, partnerLane: p.lanes.mine, shared: p.lanes.shared, enabled: true }), { kind: 'primary' })) : null,
    field('Your files (one path or glob per line)', text('myLane', { placeholder: 'games/clipping-empire/src/server/**' }), 'Your agents edit only these.'),
    field("Partner's files", text('partnerLane', { placeholder: 'games/clipping-empire/src/client/**' }), 'Your agents never edit these; they ask the partner instead.'),
    field('Shared files', text('shared', { placeholder: 'games/clipping-empire/src/shared/Config/**' }), 'Either side may change them after telling the other.'),
    check('enabled', 'Co-op on'),
    check('shareBoard', 'Share my board (open task titles, backlog and hand-offs for this game; never results)'),
    btn('Save', () => save(), { kind: 'primary' }));
}

function boards() {
  const p = view.peer;
  const s = view.suggestion;
  return h('div', { class: 'stack' },
    view.lanesAgree ? null : h('p', { role: 'alert' }, h('strong', {}, 'Split mismatch. '), `Your split and ${view.partner || 'your partner'}'s do not match. Agree on one, then save it on both HQs.`),
    s ? h('p', {}, h('strong', {}, s.who === 'partner' ? `Next task: give it to ${view.partner || 'your partner'}. ` : 'Next task: keep it here. '), s.why) : null,
    h('div', { class: 'row gap wrap' },
      h('div', { class: 'card stack' }, h('h3', {}, `You (${backlog(view.load)})`),
        view.tasks.length ? view.tasks.map((t) => h('div', { class: 'row gap' }, h('span', { class: 'muted' }, t.state), t.title)) : empty('No open tasks.')),
      h('div', { class: 'card stack' }, h('h3', {}, `${p?.from || view.partner || 'Partner'} (${backlog(p?.load)})`),
        p ? [p.items.length ? p.items.map((i) => h('div', { class: 'row gap' }, h('span', { class: 'muted' }, i.s), i.t)) : empty('No open tasks.'),
          p.h ? h('p', {}, `Handed off ${p.h.c.slice(0, 7)}: ${p.h.n}`) : null, h('p', { class: 'muted small' }, `Updated ${ago(p.at)}`)]
          : empty('Their board shows up once they turn on "Share my board".'))),
    h('div', { class: 'stack' }, h('h3', {}, 'Hand off'),
      h('p', { class: 'muted' }, 'Pushed a commit your partner needs? Send its hash; their agents pull it before editing near it.'),
      h('div', { class: 'row gap' },
        h('input', { class: 'input', placeholder: 'commit hash', value: hand.commit, oninput: (e) => { hand.commit = e.target.value; } }),
        h('input', { class: 'input', placeholder: 'what changed', value: hand.note, oninput: (e) => { hand.note = e.target.value; } }),
        btn('Send', async () => { if (await act(() => api('POST', '/api/coop/handoff', hand), 'Sent')) { hand.commit = ''; hand.note = ''; loadCoop(); } }, { kind: 'primary' }))),
    view.handoff ? h('p', { class: 'muted' }, `Your last hand-off: ${view.handoff.c.slice(0, 7)} ${ago(view.handoff.at)}`) : null);
}

export function coopCard() {
  if (view === undefined) { view = null; loadCoop(); }
  if (!view || !draft) return h('section', { class: 'card stack' }, h('h2', {}, 'Co-op game'), empty('Loading.'));
  return h('section', { class: 'card stack' },
    h('h2', {}, 'Co-op game'),
    h('p', { class: 'muted' }, 'Build one game with your partner. Each HQ edits only its own files, both see both boards, and work goes to whoever has room.'),
    view.enabled ? boards() : null,
    h('details', { open: !view.enabled }, h('summary', {}, 'Split and settings'), setup()));
}

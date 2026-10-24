// Publish gate: the irreversible, human-only acts. HQ never publishes or spends money; it only records what the owner did.
// Shared here too: the stage-request decision dialog (reject / hold with a reason), used by the Pipeline drawer and this screen.
import { h, api, act, btn, empty, pageHead, roleLabel, ago, openModal, notify, toast, field } from './core.js';

const STAGE_ORDER = ['pitched', 'designed', 'assets', 'built', 'balanced', 'art', 'ready', 'live', 'graded'];
const CRITERIA = /^[A-Z][0-9]{1,2}$/;
const rowsOf = (r, ...keys) => (Array.isArray(r) ? r : keys.map((k) => r?.[k]).find(Array.isArray) || []);
const when = (iso) => (iso ? `${ago(iso)}${ago(iso) === 'just now' ? '' : ' ago'}` : '');
const tag = (text, tone) => h('span', { class: 'pg-chip', 'data-tone': tone || null }, text);

// ---------- stage request decisions ----------
export function decideRequestDialog(r, state, onDone) {
  const held = state === 'held';
  const reason = h('textarea', { class: 'pg-input', rows: 4, maxlength: 1000, placeholder: held ? 'Why is this parked? What would unblock it?' : 'What is wrong? What should change before asking again?' });
  const ids = h('input', { class: 'pg-input', maxlength: 80, placeholder: 'G5 S4', 'aria-label': 'Failed criteria' });
  let close;
  const form = h('form', { class: 'pg-form', onsubmit: async (e) => {
    e.preventDefault();
    const text = reason.value.trim();
    if (!text) { toast('Write a reason first', 'error'); return; }
    const body = { state, reason: text };
    if (!held) {
      const list = ids.value.split(/[\s,]+/).filter(Boolean);
      const badId = list.find((x) => !CRITERIA.test(x));
      if (badId) { toast(`"${badId}" is not a criterion id. Use a letter and a number, like G5 or S4.`, 'error'); return; }
      if (list.length) body.criteriaFailed = list;
    }
    if (await act(() => api('POST', `/api/stage-requests/${encodeURIComponent(r.id)}/decide`, body), held ? 'Parked' : 'Sent back')) { close(); if (onDone) await onDone(); }
  } },
  field('Reason', reason, held ? 'Held requests stay open but are parked, not rejected.' : 'The role sees this and reworks the game.'),
  held ? null : field('Failed criteria (optional)', ids, 'Producer rubric ids separated by spaces, for example G5 S4.'),
  h('div', { class: 'row gap end' }, btn(held ? 'Hold it' : 'Reject and send back', null, { kind: 'primary' })));
  form.querySelector('button').type = 'submit';
  close = openModal(held ? 'Hold this request' : 'Reject this request', form);
  reason.focus();
}

export function requestActions(r, onDone) {
  return h('div', { class: 'row gap wrap' },
    btn('Approve', async () => { if (await act(() => api('POST', `/api/stage-requests/${encodeURIComponent(r.id)}/decide`, { state: 'approved' }), 'Stage approved')) { if (onDone) await onDone(); } }, { kind: 'primary sm', icon: 'check' }),
    btn('Hold', () => decideRequestDialog(r, 'held', onDone), { kind: 'sm' }),
    btn('Reject', () => decideRequestDialog(r, 'rejected', onDone), { kind: 'sm' }));
}

// ---------- data ----------
const cache = { games: null, gamesAt: 0, gate: {}, reqs: null };
let loading = false;

async function loadAll(slug, force) {
  if (loading) return;
  if (!force && cache.games && Date.now() - cache.gamesAt < 8000 && cache.gate[slug]) return;
  loading = true;
  try {
    const [g, gate, reqs] = await Promise.all([
      api('GET', '/api/games'),
      api('GET', `/api/games/${encodeURIComponent(slug)}/gate`).catch(() => null),
      api('GET', '/api/stage-requests?state=open').catch(() => []),
    ]);
    const before = JSON.stringify([cache.games, cache.gate[slug], cache.reqs]);
    cache.games = rowsOf(g, 'games'); cache.gamesAt = Date.now();
    cache.gate[slug] = gate || { items: [] };
    cache.reqs = rowsOf(reqs, 'requests', 'rows');
    if (before === JSON.stringify([cache.games, cache.gate[slug], cache.reqs])) { loading = false; return; } // nothing changed: do not re-render
  } catch (e) { toast(e.message, 'error'); cache.games = cache.games || []; cache.gate[slug] = cache.gate[slug] || { items: [] }; cache.gamesAt = Date.now(); }
  loading = false;
  notify();
}

// ---------- two-step confirmation ----------
// Only one challenge at a time, pointer clicks only (a keyboard Enter or a script click never confirms).
let active = null; // {slug, action, challengeId, expiresAt}
let typedValue = '';
let timerId = 0;
const pointerOnly = (e) => e.isTrusted && e.detail > 0;

function startChallenge(slug, action) {
  return async (e) => {
    if (!pointerOnly(e)) { toast('Use the mouse to start this step', 'error'); return; }
    if (active) { toast('Finish or cancel the open confirmation first', 'error'); return; }
    const r = await act(() => api('POST', `/api/games/${encodeURIComponent(slug)}/gate/start`, { action }));
    if (r && r !== true) { active = { slug, action, challengeId: r.challengeId, expiresAt: r.expiresAt }; typedValue = ''; notify(); }
  };
}

function confirmPanel(g, label) {
  const typed = h('input', { class: 'pg-input', placeholder: g.slug, 'aria-label': `Type ${g.slug} to confirm`, autocomplete: 'off', spellcheck: 'false', maxlength: 60, value: typedValue });
  const left = h('span', { class: 'muted' });
  const go = h('button', { type: 'button', class: 'btn danger', disabled: typedValue !== g.slug }, label);
  const tick = () => {
    const ms = new Date(active.expiresAt).getTime() - Date.now();
    if (ms <= 0) { active = null; clearInterval(timerId); toast('The confirmation expired. Start again.', 'error'); notify(); return; }
    left.textContent = `Expires in ${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  };
  clearInterval(timerId); tick(); timerId = setInterval(tick, 1000);
  typed.addEventListener('input', () => { typedValue = typed.value; go.disabled = typed.value !== g.slug; });
  go.addEventListener('click', async (e) => {
    if (!pointerOnly(e)) { toast('Use the mouse to confirm', 'error'); return; }
    if (typed.value !== g.slug) return;
    go.disabled = true;
    const { challengeId, action } = active;
    const ok = await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/gate/confirm`, { challengeId, typed: typed.value }), action === 'live' ? 'Marked live' : 'Marked public');
    clearInterval(timerId); active = null; typedValue = '';
    if (ok) await loadAll(g.slug, true); else notify();
  });
  return h('div', { class: 'pg-confirm' },
    h('p', {}, h('strong', {}, 'Step 2 of 2. '), `Type `, h('code', {}, g.slug), ' to enable the button.'),
    h('div', { class: 'row gap wrap' }, typed, go, btn('Cancel', () => { clearInterval(timerId); active = null; notify(); }, { kind: 'sm' }), left));
}

function actCard(g, { action, title, text, label, blocked }) {
  const open = active && active.slug === g.slug && active.action === action;
  return h('section', { class: 'pg-card pg-gatecard' },
    h('h3', {}, title, tag('only you', 'warn')),
    h('p', { class: 'pg-note' }, text),
    blocked ? h('p', { class: 'pg-note pg-warn' }, blocked) : null,
    open ? confirmPanel(g, label)
      : h('div', { class: 'row gap' }, h('button', { type: 'button', class: 'btn', disabled: !!blocked || !!active, onclick: startChallenge(g.slug, action) }, 'Step 1: review and confirm')));
}

function adCard(g) {
  const notes = (cache.gate[g.slug]?.adNotes || []).slice().reverse();
  const note = h('textarea', { class: 'pg-input', rows: 3, maxlength: 1000, placeholder: 'For example: spend up to X on Y after the next update. Only you can do this in Roblox.' });
  return h('section', { class: 'pg-card' },
    h('h3', {}, 'Spend ad money', tag('advisory only', 'accent')),
    h('p', { class: 'pg-note' }, 'HQ has no control over ad spend and never will. This only records your own note about it, so the team knows what you decided.'),
    note,
    h('div', { class: 'row gap' }, btn('Save note', async () => {
      if (!note.value.trim()) { toast('Write the note first', 'error'); return; }
      if (await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/ad-note`, { note: note.value.trim() }), 'Note saved')) { note.value = ''; await loadAll(g.slug, true); }
    }, { kind: 'sm' })),
    notes.length ? h('ul', { class: 'pg-list' }, notes.slice(0, 5).map((n) => h('li', {}, h('span', {}, n.note), h('span', { class: 'muted' }, when(n.at))))) : null);
}

function checklist(slug) {
  const items = rowsOf(cache.gate[slug], 'items', 'checklist');
  const done = items.filter((i) => i.done).length;
  return h('section', { class: 'pg-card' },
    h('h3', {}, `Human-only checklist (${done} of ${items.length})`),
    h('p', { class: 'pg-note' }, 'Things the repo cannot verify. Tick each one yourself before you publish.'),
    items.length ? h('ul', { class: 'pg-list' }, items.map((i) => h('li', {}, h('label', { class: 'row gap' },
      h('input', { type: 'checkbox', checked: !!i.done, onchange: async (e) => {
        const want = e.target.checked;
        if (!await act(() => api('POST', `/api/games/${encodeURIComponent(slug)}/gate/checklist`, { id: i.id, done: want }))) e.target.checked = !want; else { i.done = want; notify(); }
      } }), i.label)))) : h('p', { class: 'muted' }, 'No checklist items.'));
}

export function render(slug) {
  loadAll(slug);
  const g = (cache.games || []).find((x) => x.slug === slug);
  const back = h('a', { class: 'btn', href: '#/games/' + encodeURIComponent(slug) }, 'Back to the game');
  if (!g) return h('div', { class: 'page' }, pageHead('Publish gate', '', back), empty(cache.games ? 'No such game.' : 'Loading'));
  const reqs = (cache.reqs || []).filter((r) => r.game === slug);
  const ready = g.stage === 'ready';
  return h('div', { class: 'page' },
    pageHead(`Publish gate: ${g.name}`, 'Irreversible acts that only a person can do. HQ never publishes, goes public or spends money for you; it just records that you did.', back),
    h('div', { class: 'row gap wrap' }, tag('stage: ' + g.stage, 'accent'), cache.gate[slug]?.isPublic ? tag('public since ' + (cache.gate[slug].publicSinceUtc || '').slice(0, 10), 'ok') : tag('private')),
    h('div', { class: 'pg-grid2' },
      actCard(g, { action: 'live', title: `Make v${g.version ?? 1} live`, label: 'Mark this version live',
        text: 'Use this after you published the version yourself in Roblox. It moves the game to the Live stage here.', blocked: ready ? null : 'Available once the game is at the Ready to publish stage.' }),
      actCard(g, { action: 'public', title: 'Set the experience public', label: 'Mark the experience public',
        text: 'Use this after you made the experience public yourself. It records the date so live numbers start counting from it.',
        blocked: STAGE_ORDER.indexOf(g.stage) >= STAGE_ORDER.indexOf('ready') ? null : 'Available once the game is at the Ready to publish stage or later.' }),
      adCard(g)),
    checklist(slug),
    h('div', { class: 'pg-divider' }, h('span', {}, 'Reversible review decisions')),
    h('section', { class: 'pg-card' },
      h('h3', {}, `Stage requests waiting for you (${reqs.length})`),
      reqs.length ? h('div', { class: 'pg-work' }, reqs.map((r) => h('div', { class: 'pg-work-row', style: 'align-items:start' },
        h('div', { class: 'stack sm' }, h('strong', {}, `${r.fromStage} to ${r.toStage}`), h('span', { class: 'muted' }, `${roleLabel(r.role)} asked ${when(r.createdAt)}`), r.evidence ? h('p', { class: 'pre' }, r.evidence) : null),
        requestActions(r, () => loadAll(slug, true)))))
        : h('p', { class: 'muted' }, 'Nothing waiting. Images and other decisions are in Review.')));
}

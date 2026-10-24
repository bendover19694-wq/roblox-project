// Review screen (images, visual bar, stages) and the shared ask card used by Home and the chats.
import { h, store, api, act, btn, empty, pageHead, roleLabel, avatar, ago, mediaUrl, plain, gameName, statePill, upsert, notify, loadState, toast, openModal } from './core.js';

export const askUi = { v: 0 }; // bumped when card UI state changes, so the chat repaints
const modeOf = new Map(); // ask id -> open inline note mode
const drafts = {};
const smallOpen = new Set();
let tab = 'images';
let filter = 'open';
let agent = '';
let older = false;
let stageAt = 0;
let refsAt = 0;
let refs = [];
let stages = { open: [], held: [], rejected: [] };

const KIND_LABEL = { decision: 'Decision', try: 'Try it', approve: 'Approve', review: 'Review', reference: 'Reference' };
const STAGE_NAME = { pitched: 'Pitched', designed: 'Designed', assets: 'Assets ready', built: 'Built', balanced: 'Balanced', art: 'Art done', ready: 'Ready to publish', live: 'Live', graded: 'Graded' };
const FILTERS = [['open', 'To review'], ['changes', 'Changes asked'], ['held', 'On hold'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'Everything']];
const CATEGORIES = [['packaging', 'Packaging'], ['ui-icons', 'UI icons'], ['3d-models', '3D models'], ['screens', 'Screens']];
const MODES = {
  note: { label: 'Looks good, with this note', ph: 'Optional note for the agent', submit: 'Approve with note', prefix: 'approve:', required: false },
  changes: { label: 'Not right: say what', ph: 'What should change?', submit: 'Send changes', prefix: 'changes:', required: true },
  hold: { label: 'Hold: why is it parked?', ph: 'Reason. It is parked, not rejected.', submit: 'Hold it', prefix: 'hold:', required: true },
  reject: { label: 'Reject: why?', ph: 'Why is it rejected?', submit: 'Reject', prefix: 'reject:', required: true },
};

export const isMediaAsk = (a) => !!a.mediaPath;
export const isReference = (a) => a.kind === 'reference';
// Something the owner must decide (reference-only items need no decision).
export const needsDecision = (a) => a.state === 'open' && !a.superseded && !isReference(a);

export function verdictOf(a) {
  if (a.state === 'open') return 'open';
  if (a.state === 'dismissed') return 'dismissed';
  const v = a.verdict === 'hold' ? 'held' : a.verdict;
  if (v) return v;
  const x = String(a.answer || '');
  if (x === 'approve' || x.startsWith('approve:')) return 'approved';
  if (x.startsWith('changes:')) return 'changes';
  if (x === 'reject' || x.startsWith('reject:')) return 'rejected';
  if (x.startsWith('hold:')) return 'held';
  return 'answered';
}
const noteOf = (a) => a.verdictNote || String(a.answer || '').replace(/^(approve|changes|reject|hold):?/, '');

async function answer(ask, value, msg = 'Sent') {
  const r = await act(() => api('POST', `/api/asks/${ask.id}/answer`, { answer: value }), msg);
  if (r && r !== true) upsert(store.asks, r);
  else if (r) { ask.state = 'answered'; ask.answer = value; }
  modeOf.delete(ask.id); delete drafts[ask.id]; askUi.v++;
  loadState().catch(() => {});
  notify();
}

export function mediaEl(path, alt) {
  const url = mediaUrl(path);
  if (/\.(mp4|webm|mov)$/i.test(path)) return h('video', { class: 'ask-media', src: url, controls: true, preload: 'metadata' });
  return h('a', { href: url, target: '_blank', rel: 'noopener', title: 'Click to enlarge' }, h('img', { class: 'ask-media', src: url, alt, loading: 'lazy' }));
}

function setMode(ask, m) { if (modeOf.get(ask.id) === m) modeOf.delete(ask.id); else modeOf.set(ask.id, m); askUi.v++; notify(); }

function modeBox(ask) {
  const m = modeOf.get(ask.id);
  if (!m) return null;
  const c = MODES[m];
  const ta = h('textarea', { class: 'textarea', rows: 3, placeholder: c.ph, 'aria-label': c.label, oninput: (e) => { drafts[ask.id] = e.target.value; } });
  ta.value = drafts[ask.id] || '';
  return h('div', { class: 'stack sm modebox' }, h('div', { class: 'field-label' }, c.label), ta,
    h('div', { class: 'row gap' }, btn(c.submit, () => {
      const t = ta.value.trim();
      if (c.required && !t) { ta.focus(); toast('Please say why', 'error'); return; }
      answer(ask, c.prefix + t);
    }, { kind: m === 'reject' ? 'danger' : 'primary' }), btn('Cancel', () => setMode(ask, m), { kind: 'ghost' })));
}

// Free text for a decision card: "Or say it in your own words".
function ownWords(ask) {
  const input = h('input', { class: 'input', type: 'text', maxlength: 2000, placeholder: 'Or say it in your own words…', 'aria-label': 'Answer in your own words',
    oninput: (e) => { drafts['w' + ask.id] = e.target.value; },
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } } });
  input.value = drafts['w' + ask.id] || '';
  async function go() {
    const t = input.value.trim();
    if (!t) return;
    delete drafts['w' + ask.id];
    answer(ask, t, 'Answer sent');
  }
  return h('div', { class: 'row gap' }, input, btn('Send', go, { icon: 'send' }));
}

// Buttons (plus the inline note box) for one open ask.
function actions(ask) {
  const row = h('div', { class: 'row gap wrap' });
  const extra = [];
  if (isReference(ask)) {
    row.append(h('span', { class: 'muted small grow' }, 'Reference only: nothing to decide here.'),
      btn('Pin to Visual bar', () => pinModal(ask.mediaPath, ask.title), { icon: 'image' }),
      btn('Got it', async () => { if (await act(() => api('POST', `/api/asks/${ask.id}/dismiss`))) { loadState().catch(() => {}); notify(); } }, { kind: 'primary', icon: 'check' }));
  } else if (ask.kind === 'review') {
    row.append(btn('Approve', () => answer(ask, 'approve'), { kind: 'primary', icon: 'check' }),
      btn('Looks good, with a note', () => setMode(ask, 'note')),
      btn('Not right', () => setMode(ask, 'changes')),
      btn('Hold', () => setMode(ask, 'hold')),
      btn('Reject', () => setMode(ask, 'reject'), { kind: 'danger' }));
    extra.push(modeBox(ask));
  } else if (ask.options?.length) {
    ask.options.forEach((o) => row.append(btn(o.label, () => answer(ask, o.id), { kind: o.recommended ? 'primary' : '' })));
    if (ask.kind === 'decision') extra.push(ownWords(ask));
  } else if (ask.kind === 'try') {
    row.append(btn('Done', () => answer(ask, 'done'), { kind: 'primary', icon: 'check' }));
  } else {
    row.append(btn('Approve', () => answer(ask, 'approve'), { kind: 'primary', icon: 'check' }), btn('Decline', () => answer(ask, 'decline')));
    if (ask.kind === 'decision') extra.push(ownWords(ask));
  }
  return [row, ...extra];
}

function answeredText(ask) {
  if (ask.state === 'open' || !ask.answer) return null;
  return ask.options?.find((o) => o.id === ask.answer)?.label || ask.answer;
}

// Compact card: Home "Needs you" and the inline cards in a chat.
export function askCard(ask) {
  const parts = ask.state === 'open' ? actions(ask) : [];
  const ans = answeredText(ask);
  return h('article', { class: 'card ask', 'data-kind': ask.kind },
    h('div', { class: 'row gap' }, h('span', { class: 'tag' }, roleLabel(ask.role)), h('span', { class: 'tag ghost' }, KIND_LABEL[ask.kind] || ask.kind), h('span', { class: 'muted grow end-text' }, ago(ask.createdAt))),
    h('h3', {}, plain(ask.title)),
    ask.why ? h('p', { class: 'muted pre' }, ask.why) : null,
    ask.mediaPath ? mediaEl(ask.mediaPath, ask.title) : null,
    parts,
    ans ? h('p', { class: 'muted' }, 'Answered: ', ans) : null);
}

// ---- Visual bar ----
async function loadRefs() {
  refsAt = Date.now();
  try { const r = await api('GET', '/api/references'); refs = Array.isArray(r) ? r : r.references || []; } catch { refs = []; }
  notify();
}

function pinModal(mediaPath, title) {
  let cat = 'screens';
  const note = h('input', { class: 'input', type: 'text', maxlength: 300, placeholder: 'Why is this the bar? (optional)' });
  const sel = h('select', { class: 'select', 'aria-label': 'Category', onchange: (e) => { cat = e.target.value; } }, CATEGORIES.map(([v, l]) => h('option', { value: v }, l)));
  sel.value = cat;
  const close = openModal('Pin to the Visual bar', h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Every designer, thumbnails and UI brief lists the pinned images as the house reference.'),
    mediaEl(mediaPath, title),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Category'), sel),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Note'), note),
    h('div', { class: 'row end' }, btn('Pin it', async () => {
      if (await act(() => api('POST', '/api/references', { mediaPath, category: cat, note: note.value.trim() || undefined }), 'Pinned to the Visual bar')) { close(); loadRefs(); }
    }, { kind: 'primary', icon: 'image' }))));
}

function barTab() {
  if (Date.now() - refsAt > 8000) loadRefs();
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Approved images you pin here become the house reference. Every designer, thumbnails and UI brief lists them.'),
    CATEGORIES.map(([id, label]) => {
      const list = refs.filter((r) => r.category === id);
      return h('section', { class: 'rgroup' },
        h('h2', { class: 'rgroup-head' }, label, h('span', { class: 'count' }, list.length)),
        list.length ? h('div', { class: 'rgrid small-grid' }, list.map((r) => h('article', { class: 'card ritem' },
          mediaEl(r.mediaPath, r.note || label),
          r.note ? h('p', { class: 'muted small' }, r.note) : null,
          h('div', { class: 'row between' }, h('span', { class: 'muted small' }, ago(r.createdAt) + (ago(r.createdAt) === 'just now' ? '' : ' ago')),
            btn('Remove', async () => { if (await act(() => api('DELETE', `/api/references/${r.id}`), 'Removed')) loadRefs(); }, { kind: 'ghost sm' })))))
          : h('p', { class: 'muted small' }, 'Nothing pinned yet. Pin an approved image from the Images tab.'));
    }));
}

// ---- Images tab ----
function smallPreview(ask) {
  const url = mediaUrl(ask.mediaPath);
  const fig = (label, cls, w) => h('figure', { class: 'fig ' + cls }, h('img', { class: 'lb-able', src: url, alt: label + ' preview', style: w ? `width:${w}px;max-width:100%` : '' }), h('figcaption', { class: 'muted small' }, label));
  return h('div', { class: 'small-prev' }, fig('150 px', 'f150', 150), fig('512 px', 'f512', 512), fig('Full size', 'ffull', 0));
}

function reviewItem(ask) {
  const task = store.tasks.find((t) => t.id === ask.taskId);
  const kind = /contact|sheet/i.test(ask.title + ' ' + ask.mediaPath) ? 'Contact sheet' : /\.(mp4|webm|mov)$/i.test(ask.mediaPath || '') ? 'Video' : 'Screenshot';
  const v = verdictOf(ask);
  const parts = v === 'open' ? actions(ask) : [];
  const isImage = ask.mediaPath && !/\.(mp4|webm|mov)$/i.test(ask.mediaPath);
  const vNote = v !== 'open' ? noteOf(ask) : '';
  return h('article', { class: 'card ritem', 'data-verdict': v },
    ask.mediaPath ? mediaEl(ask.mediaPath, ask.title) : null,
    h('div', { class: 'ritem-body' },
      h('h3', {}, plain(ask.title)),
      ask.why ? h('p', { class: 'muted pre' }, ask.why) : null,
      h('p', { class: 'muted small' }, [kind, task?.game ? gameName(task.game) : null, ago(ask.createdAt) + (ago(ask.createdAt) === 'just now' ? '' : ' ago'), ask.superseded ? 'older version' : null].filter(Boolean).join(' · ')),
      v !== 'open' ? h('div', { class: 'row gap' }, h('span', { class: 'pill', 'data-state': v === 'approved' ? 'done' : v === 'rejected' ? 'failed' : 'review' }, { approved: 'approved', rejected: 'rejected', held: 'on hold', changes: 'changes asked' }[v] || v), vNote ? h('span', { class: 'muted small' }, vNote) : h('span', { class: 'muted small' }, v)) : null,
      isImage ? h('div', { class: 'row gap wrap' },
        btn('How it reads small', () => { smallOpen.has(ask.id) ? smallOpen.delete(ask.id) : smallOpen.add(ask.id); notify(); }, { kind: 'ghost sm', icon: 'search' }),
        v === 'approved' ? btn('Pin to Visual bar', () => pinModal(ask.mediaPath, ask.title), { kind: 'ghost sm', icon: 'image' }) : null) : null,
      smallOpen.has(ask.id) && isImage ? smallPreview(ask) : null,
      parts));
}

function groupLabel(a) {
  if (/contact|sheet/i.test(a.title + ' ' + a.mediaPath)) return 'Contact sheets';
  return roleLabel(a.role) + (['designer', 'thumbnails'].includes(a.role) ? ' art' : ' screenshots');
}

function rejectAllModal(ids) {
  const ta = h('textarea', { class: 'textarea', rows: 3, placeholder: 'Why are these rejected?', 'aria-label': 'Reason' });
  const close = openModal(`Reject ${ids.length} image${ids.length === 1 ? '' : 's'}`, h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Every waiting image gets the same reason and goes back to its agent.'), ta,
    h('div', { class: 'row end' }, btn('Reject all', async () => {
      const reason = ta.value.trim();
      if (!reason) { ta.focus(); toast('Please say why', 'error'); return; }
      if (await act(() => api('POST', '/api/asks/reject-all', { ids, reason }), 'Rejected')) { close(); loadState().catch(() => {}); }
    }, { kind: 'danger' }))));
}

function imagesTab() {
  const base = store.asks.filter((a) => (isMediaAsk(a) || a.kind === 'review' || isReference(a)) && (!agent || a.role === agent) && (older || !a.superseded));
  const counts = { open: 0, changes: 0, held: 0, approved: 0, rejected: 0, all: base.length };
  for (const a of base) { const v = verdictOf(a); if (counts[v] != null && !(v === 'open' && isReference(a))) counts[v]++; }
  const shown = base.filter((a) => filter === 'all' || verdictOf(a) === filter);
  const roleIds = [...new Set(store.asks.filter((a) => isMediaAsk(a) || a.kind === 'review' || isReference(a)).map((a) => a.role))];
  const groups = new Map();
  for (const a of shown) { const k = a.role + '|' + groupLabel(a); (groups.get(k) || groups.set(k, { label: groupLabel(a), role: a.role, items: [] }).get(k)).items.push(a); }
  const order = (g) => store.roles.findIndex((r) => r.id === g.role);
  const sortedGroups = [...groups.values()].sort((a, b) => order(a) - order(b));
  const waitingIds = base.filter((a) => a.state === 'open' && !isReference(a)).map((a) => a.id);
  const otherOpen = filter === 'open' && !agent ? store.asks.filter((a) => a.state === 'open' && !a.superseded && !isMediaAsk(a) && a.kind !== 'review' && !isReference(a)) : [];
  const bulk = filter === 'open' && waitingIds.length ? h('div', { class: 'row gap wrap' },
    btn('Clear the queue', async () => {
      if (!confirm(`Approve all ${waitingIds.length} waiting images?`)) return;
      if (await act(() => api('POST', '/api/asks/approve-all', { ids: waitingIds }), 'Queue cleared')) loadState().catch(() => {});
    }, { icon: 'check', title: 'Approve everything waiting' }),
    btn('Reject all…', () => rejectAllModal(waitingIds), { kind: 'danger', icon: 'x' }),
    btn('Empty the queue without approving anything', async () => {
      if (!confirm(`Remove ${waitingIds.length} waiting items from the queue without approving or rejecting them?`)) return;
      if (await act(() => api('POST', '/api/asks/empty', { ids: waitingIds }), 'Queue emptied')) loadState().catch(() => {});
    }, { kind: 'ghost' })) : null;
  return h('div', { class: 'stack' },
    h('div', { class: 'row gap wrap between' },
      h('div', { class: 'seg wide', role: 'group', 'aria-label': 'Filter' }, FILTERS.map(([id, l]) => h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(id === filter), onclick: () => { filter = id; notify(); } }, `${l} (${counts[id]})`))),
      h('div', { class: 'row gap wrap' },
        h('select', { class: 'select sm', 'aria-label': 'Agent', onchange: (e) => { agent = e.target.value; notify(); } },
          h('option', { value: '' }, 'All agents'), roleIds.map((id) => h('option', { value: id, selected: id === agent }, roleLabel(id)))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: older, onchange: (e) => { older = e.target.checked; notify(); } }), h('span', {}, 'Older versions')))),
    bulk,
    sortedGroups.length ? sortedGroups.map((g) => h('section', { class: 'rgroup' },
      h('h2', { class: 'rgroup-head' }, avatar(g.role, 24), g.label, h('span', { class: 'count' }, g.items.length)),
      h('div', { class: 'rgrid' }, g.items.map(reviewItem)))) : (otherOpen.length ? null : empty(filter === 'open' ? 'Nothing is waiting for you' : 'Nothing in this filter')),
    otherOpen.length ? h('section', { class: 'rgroup' }, h('h2', { class: 'rgroup-head' }, 'Other questions', h('span', { class: 'count' }, otherOpen.length)),
      h('div', { class: 'stack' }, otherOpen.map(askCard))) : null);
}

// ---- Stages tab ----
async function loadStages() {
  stageAt = Date.now();
  const get = async (s) => { try { const r = await api('GET', '/api/stage-requests?state=' + s); return Array.isArray(r) ? r : r.requests || []; } catch { return []; } };
  const [open, held, rejected] = await Promise.all([get('open'), get('held'), get('rejected')]);
  stages = { open, held, rejected };
  store.stageRequests = open;
  notify();
}

const stageMode = new Map();
const stageDraft = {};
const CRIT = /^[A-Z][0-9]{1,2}$/;

async function decideStage(r, state, reason, criteria) {
  const body = { state };
  if (reason) body.reason = reason;
  if (criteria?.length) body.criteriaFailed = criteria;
  if (await act(() => api('POST', `/api/stage-requests/${r.id}/decide`, body), { approved: 'Stage approved', rejected: 'Sent back', held: 'On hold' }[state])) { stageMode.delete(r.id); await loadStages(); loadState().catch(() => {}); }
}

function stageCard(r) {
  const mode = stageMode.get(r.id);
  const box = mode ? (() => {
    const ta = h('textarea', { class: 'textarea', rows: 3, placeholder: mode === 'rejected' ? 'Why is it sent back?' : 'Why is it on hold?', 'aria-label': 'Reason', oninput: (e) => { stageDraft[r.id] = e.target.value; } });
    ta.value = stageDraft[r.id] || '';
    const crit = h('input', { class: 'input', type: 'text', placeholder: 'Failed criteria, for example G5 S4 (optional)', 'aria-label': 'Failed criteria', value: stageDraft['c' + r.id] || '', oninput: (e) => { stageDraft['c' + r.id] = e.target.value; } });
    return h('div', { class: 'stack sm modebox' }, ta, mode === 'rejected' ? crit : null,
      h('div', { class: 'row gap' }, btn(mode === 'rejected' ? 'Send it back' : 'Hold it', () => {
        const reason = ta.value.trim();
        if (!reason) { ta.focus(); toast('Please say why', 'error'); return; }
        const ids = mode === 'rejected' ? String(crit.value).split(/[\s,]+/).filter(Boolean) : [];
        const bad = ids.find((x) => !CRIT.test(x));
        if (bad) { toast(`"${bad}" is not a criteria id. Use a letter and 1 or 2 digits, like G5.`, 'error'); crit.focus(); return; }
        delete stageDraft[r.id]; delete stageDraft['c' + r.id];
        decideStage(r, mode, reason, ids);
      }, { kind: mode === 'rejected' ? 'danger' : 'primary' }), btn('Cancel', () => { stageMode.delete(r.id); notify(); }, { kind: 'ghost' })));
  })() : null;
  return h('article', { class: 'card' },
    h('div', { class: 'row gap between' }, h('h3', {}, `${gameName(r.game)}: ${STAGE_NAME[r.fromStage] || r.fromStage} to ${STAGE_NAME[r.toStage] || r.toStage}`),
      h('span', { class: 'row gap' }, r.state === 'held' ? statePill('review') : null, h('span', { class: 'tag' }, roleLabel(r.role)))),
    r.evidence ? h('p', { class: 'muted pre' }, r.evidence) : h('p', { class: 'muted' }, 'No evidence attached.'),
    r.state === 'held' && r.reason ? h('p', { class: 'small' }, 'On hold: ', r.reason) : null,
    h('div', { class: 'row gap wrap' },
      btn('Approve', () => decideStage(r, 'approved'), { kind: 'primary', icon: 'check' }),
      r.state === 'held' ? null : btn('Hold', () => { stageMode.set(r.id, 'held'); notify(); }),
      btn('Reject', () => { stageMode.set(r.id, 'rejected'); notify(); }, { kind: 'danger' })),
    box);
}

function stagesTab() {
  if (Date.now() - stageAt > 8000) loadStages();
  const pending = [...stages.open, ...stages.held];
  const ready = store.gameList.filter((g) => g.stage === 'ready');
  const kicked = stages.rejected;
  return h('div', { class: 'stack' },
    h('h2', { class: 'section-title' }, `Stage requests (${pending.length})`),
    pending.length ? pending.map(stageCard) : empty('No stage requests waiting'),
    ready.length ? h('h2', { class: 'section-title' }, 'Ready to publish') : null,
    ready.map((g) => h('article', { class: 'card' },
      h('h3', {}, `${g.name} v${g.version ?? 1} is ready`),
      h('p', { class: 'muted' }, 'Going live is a human-only step with its own two-step check.'),
      h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/games/${encodeURIComponent(g.slug)}/gate` }, 'Open the publish gate')))),
    kicked.length ? h('h2', { class: 'section-title' }, `Kicked back (${kicked.length})`) : null,
    kicked.length ? h('div', { class: 'tlist' }, kicked.slice(0, 30).map((r) => h('div', { class: 'trow static' },
      h('span', { class: 'trow-main' },
        h('span', { class: 'trow-title' }, `${gameName(r.game)}: ${STAGE_NAME[r.fromStage] || r.fromStage} to ${STAGE_NAME[r.toStage] || r.toStage}`,
          (r.criteriaFailed || []).map((c) => h('span', { class: 'tag ghost' }, c))),
        h('span', { class: 'trow-meta muted' }, [roleLabel(r.role), r.reason, r.decidedAt ? ago(r.decidedAt) + ' ago' : null].filter(Boolean).join(' · ')))))) : null,
    kicked.length ? h('p', { class: 'hint' }, 'Context only. The agent reworks it and asks again.') : null);
}

export function render() {
  const mediaOpen = store.asks.filter((a) => needsDecision(a) && (isMediaAsk(a) || a.kind === 'review')).length;
  const tabs = [['images', `Images & video (${mediaOpen})`], ['bar', `Visual bar (${refs.length})`], ['stages', `Stages & publish (${stages.open.length + stages.held.length})`]];
  if (refsAt === 0) loadRefs();
  return h('div', { class: 'page' },
    pageHead('Review', mediaOpen ? `${mediaOpen} waiting for you.` : 'Nothing is waiting for you.'),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, l]) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === tab), onclick: () => { tab = id; notify(); } }, l))),
    tab === 'images' ? imagesTab() : tab === 'bar' ? barTab() : stagesTab());
}

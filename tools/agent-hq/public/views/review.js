// Review screen (images, stages and publish) and the shared ask card used by Home and the chats.
import { h, store, api, act, btn, empty, pageHead, roleLabel, avatar, ago, mediaUrl, plain, gameName, statePill, upsert, notify, loadState, toast } from './core.js';

export const askUi = { v: 0 }; // bumped when card UI state changes, so the chat repaints
const changesOpen = new Set();
const changesDraft = {};
let tab = 'images';
let filter = 'open';
let agent = '';
let older = false;
let stageLoaded = 0;

const KIND_LABEL = { decision: 'Decision', try: 'Try it', approve: 'Approve', review: 'Review' };
const STAGE_NAME = { pitched: 'Pitched', designed: 'Designed', assets: 'Assets ready', built: 'Built', balanced: 'Balanced', art: 'Art done', ready: 'Ready to publish', live: 'Live', graded: 'Graded' };
const FILTERS = [['open', 'To review'], ['changes', 'Changes asked'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'Everything']];

export const isMediaAsk = (a) => !!a.mediaPath;
export function verdictOf(a) {
  if (a.state === 'open') return 'open';
  if (a.verdict) return a.verdict;
  const x = String(a.answer || '');
  if (x === 'approve') return 'approved';
  if (x.startsWith('changes:')) return 'changes';
  if (x === 'reject') return 'rejected';
  return 'answered';
}

async function answer(ask, value) {
  const r = await act(() => api('POST', `/api/asks/${ask.id}/answer`, { answer: value }), 'Sent');
  if (r && r !== true) upsert(store.asks, r);
  else if (r) { ask.state = 'answered'; ask.answer = value; }
  loadState().catch(() => {});
  notify();
}

export function mediaEl(path, alt) {
  const url = mediaUrl(path);
  if (/\.(mp4|webm|mov)$/i.test(path)) return h('video', { class: 'ask-media', src: url, controls: true, preload: 'metadata' });
  return h('a', { href: url, target: '_blank', rel: 'noopener' }, h('img', { class: 'ask-media', src: url, alt, loading: 'lazy' }));
}

// Buttons (and the inline "what should change" box) for one open ask.
function actions(ask) {
  const row = h('div', { class: 'row gap wrap' });
  let box = null;
  if (ask.kind === 'review') {
    row.append(btn('Approve', () => answer(ask, 'approve'), { kind: 'primary', icon: 'check' }),
      btn('Ask for changes', () => { changesOpen.has(ask.id) ? changesOpen.delete(ask.id) : changesOpen.add(ask.id); askUi.v++; notify(); }),
      btn('Reject', () => answer(ask, 'reject'), { kind: 'danger' }));
    if (changesOpen.has(ask.id)) {
      const ta = h('textarea', { class: 'textarea', rows: 3, placeholder: 'What should change?', oninput: (e) => { changesDraft[ask.id] = e.target.value; } });
      ta.value = changesDraft[ask.id] || '';
      box = h('div', { class: 'stack sm' }, ta, h('div', { class: 'row' }, btn('Send changes', () => {
        const t = ta.value.trim();
        if (!t) { ta.focus(); return; }
        changesOpen.delete(ask.id); delete changesDraft[ask.id]; askUi.v++;
        answer(ask, 'changes:' + t);
      }, { kind: 'primary' })));
    }
  } else if (ask.options?.length) {
    ask.options.forEach((o) => row.append(btn(o.label, () => answer(ask, o.id), { kind: o.recommended ? 'primary' : '' })));
  } else if (ask.kind === 'try') {
    row.append(btn('Done', () => answer(ask, 'done'), { kind: 'primary', icon: 'check' }));
  } else {
    row.append(btn('Approve', () => answer(ask, 'approve'), { kind: 'primary', icon: 'check' }), btn('Decline', () => answer(ask, 'decline')));
  }
  return [row, box];
}

function answeredText(ask) {
  if (ask.state === 'open' || !ask.answer) return null;
  return ask.options?.find((o) => o.id === ask.answer)?.label || ask.answer;
}

// Compact card: Home "Needs you" and the inline cards in a chat.
export function askCard(ask) {
  const [row, box] = ask.state === 'open' ? actions(ask) : [null, null];
  const ans = answeredText(ask);
  return h('article', { class: 'card ask', 'data-kind': ask.kind },
    h('div', { class: 'row gap' }, h('span', { class: 'tag' }, roleLabel(ask.role)), h('span', { class: 'tag ghost' }, KIND_LABEL[ask.kind] || ask.kind), h('span', { class: 'muted grow end-text' }, ago(ask.createdAt))),
    h('h3', {}, plain(ask.title)),
    ask.why ? h('p', { class: 'muted pre' }, ask.why) : null,
    ask.mediaPath ? mediaEl(ask.mediaPath, ask.title) : null,
    row, box,
    ans ? h('p', { class: 'muted' }, 'Answered: ', ans) : null);
}

function reviewItem(ask) {
  const task = store.tasks.find((t) => t.id === ask.taskId);
  const kind = /contact|sheet/i.test(ask.title + ' ' + ask.mediaPath) ? 'Contact sheet' : /\.(mp4|webm|mov)$/i.test(ask.mediaPath || '') ? 'Video' : 'Screenshot';
  const v = verdictOf(ask);
  const [row, box] = v === 'open' ? actions(ask) : [null, null];
  return h('article', { class: 'card ritem', 'data-verdict': v },
    ask.mediaPath ? mediaEl(ask.mediaPath, ask.title) : null,
    h('div', { class: 'ritem-body' },
      h('h3', {}, plain(ask.title)),
      ask.why ? h('p', { class: 'muted pre' }, ask.why) : null,
      h('p', { class: 'muted small' }, [kind, task?.game ? gameName(task.game) : null, ago(ask.createdAt) + (ago(ask.createdAt) === 'just now' ? '' : ' ago'), ask.superseded ? 'older version' : null].filter(Boolean).join(' · ')),
      v !== 'open' ? h('div', { class: 'row gap' }, statePill(v === 'changes' ? 'review' : v === 'rejected' ? 'failed' : 'done'), h('span', { class: 'muted small' }, v === 'changes' ? String(ask.answer || '').replace(/^changes:/, '') : v)) : null,
      row, box));
}

function groupLabel(a) {
  if (/contact|sheet/i.test(a.title + ' ' + a.mediaPath)) return 'Contact sheets';
  return roleLabel(a.role) + (['designer', 'thumbnails'].includes(a.role) ? ' art' : ' screenshots');
}

function imagesTab() {
  const base = store.asks.filter((a) => (isMediaAsk(a) || a.kind === 'review') && (!agent || a.role === agent) && (older || !a.superseded));
  const counts = { open: 0, changes: 0, approved: 0, rejected: 0, all: base.length };
  for (const a of base) { const v = verdictOf(a); if (counts[v] != null) counts[v]++; }
  const shown = base.filter((a) => filter === 'all' || verdictOf(a) === filter);
  const roleIds = [...new Set(store.asks.filter((a) => isMediaAsk(a) || a.kind === 'review').map((a) => a.role))];
  const groups = new Map();
  for (const a of shown) { const k = a.role + '|' + groupLabel(a); (groups.get(k) || groups.set(k, { label: groupLabel(a), role: a.role, items: [] }).get(k)).items.push(a); }
  const order = (g) => store.roles.findIndex((r) => r.id === g.role);
  const sortedGroups = [...groups.values()].sort((a, b) => order(a) - order(b));
  const waitingIds = base.filter((a) => a.state === 'open').map((a) => a.id);
  const otherOpen = filter === 'open' && !agent ? store.asks.filter((a) => a.state === 'open' && !isMediaAsk(a) && a.kind !== 'review') : [];
  return h('div', { class: 'stack' },
    h('div', { class: 'row gap wrap between' },
      h('div', { class: 'seg wide', role: 'group', 'aria-label': 'Filter' }, FILTERS.map(([id, l]) => h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(id === filter), onclick: () => { filter = id; notify(); } }, `${l} (${counts[id]})`))),
      h('div', { class: 'row gap wrap' },
        h('select', { class: 'select sm', 'aria-label': 'Agent', onchange: (e) => { agent = e.target.value; notify(); } },
          h('option', { value: '' }, 'All agents'), roleIds.map((id) => h('option', { value: id, selected: id === agent }, roleLabel(id)))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: older, onchange: (e) => { older = e.target.checked; notify(); } }), h('span', {}, 'Older versions')),
        filter === 'open' && waitingIds.length ? btn('Clear the queue', async () => {
          if (!confirm(`Approve all ${waitingIds.length} waiting images?`)) return;
          if (await act(() => api('POST', '/api/asks/approve-all', { ids: waitingIds }), 'Queue cleared')) loadState().catch(() => {});
        }, { icon: 'check' }) : null)),
    sortedGroups.length ? sortedGroups.map((g) => h('section', { class: 'rgroup' },
      h('h2', { class: 'rgroup-head' }, avatar(g.role, 24), g.label, h('span', { class: 'count' }, g.items.length)),
      h('div', { class: 'rgrid' }, g.items.map(reviewItem)))) : (otherOpen.length ? null : empty(filter === 'open' ? 'Nothing is waiting for you' : 'Nothing in this filter')),
    otherOpen.length ? h('section', { class: 'rgroup' }, h('h2', { class: 'rgroup-head' }, 'Other questions', h('span', { class: 'count' }, otherOpen.length)),
      h('div', { class: 'stack' }, otherOpen.map(askCard))) : null);
}

async function loadStages() {
  stageLoaded = Date.now();
  try {
    const r = await api('GET', '/api/stage-requests?state=open');
    store.stageRequests = Array.isArray(r) ? r : r.requests || [];
  } catch { store.stageRequests = []; }
  notify();
}

async function decideStage(r, state) {
  if (await act(() => api('POST', `/api/stage-requests/${r.id}/decide`, { state }), state === 'approved' ? 'Stage approved' : 'Stage rejected')) { await loadStages(); loadState().catch(() => {}); }
}

function stagesTab() {
  if (Date.now() - stageLoaded > 8000) loadStages();
  const open = store.stageRequests;
  const ready = store.gameList.filter((g) => g.stage === 'ready');
  return h('div', { class: 'stack' },
    h('h2', { class: 'section-title' }, `Stage requests (${open.length})`),
    open.length ? open.map((r) => h('article', { class: 'card' },
      h('div', { class: 'row gap between' }, h('h3', {}, `${gameName(r.game)}: ${STAGE_NAME[r.fromStage] || r.fromStage} to ${STAGE_NAME[r.toStage] || r.toStage}`),
        h('span', { class: 'tag' }, roleLabel(r.role))),
      r.evidence ? h('p', { class: 'muted pre' }, r.evidence) : h('p', { class: 'muted' }, 'No evidence attached.'),
      h('div', { class: 'row gap' }, btn('Approve', () => decideStage(r, 'approved'), { kind: 'primary', icon: 'check' }), btn('Reject', () => decideStage(r, 'rejected'), { kind: 'danger' }))))
      : empty('No stage requests waiting'),
    ready.length ? h('h2', { class: 'section-title' }, 'Ready to publish') : null,
    ready.map((g) => h('article', { class: 'card' },
      h('h3', {}, `${g.name} v${g.version ?? 1} is ready`),
      h('p', { class: 'muted' }, 'Publishing is always your step. Publish it on Roblox yourself, then press Mark live so HQ moves it to Live.'),
      h('div', { class: 'row' }, btn('Mark live', async () => {
        if (!confirm(`Only press this after you published ${g.name} yourself. Mark it live?`)) return;
        if (await act(() => api('POST', `/api/games/${encodeURIComponent(g.slug)}/mark-live`, {}), g.name + ' is live')) loadState().catch(() => {});
      }, { kind: 'primary', icon: 'rocket' })))));
}

export function render() {
  const mediaOpen = store.asks.filter((a) => a.state === 'open' && (isMediaAsk(a) || a.kind === 'review') && !a.superseded).length;
  const tabs = [['images', `Images & video (${mediaOpen})`], ['stages', `Stages & publish (${store.stageRequests.length})`]];
  return h('div', { class: 'page' },
    pageHead('Review', mediaOpen ? `${mediaOpen} waiting for you.` : 'Nothing is waiting for you.'),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, l]) => h('button', { type: 'button', role: 'tab', class: 'tab', 'aria-selected': String(id === tab), onclick: () => { tab = id; notify(); } }, l))),
    tab === 'images' ? imagesTab() : stagesTab());
}

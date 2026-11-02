import { h, store, api, act, ic, btn, empty, roleLabel, avatar, roleStatus, ago, fmtTime, go, plain, gameName, mediaUrl, studioLocks, loadFreshness, loadState, toast, notify } from './core.js';
import { askCard, answer, isMediaAsk, needsDecision } from './review.js';
import { newTaskModal, openTaskDrawer, isBackToYou } from './tasks.js';

let leadDraft = '';
const replyOpen = new Set();
const replyDraft = {};
const noteOpen = new Set();
const noteDraft = {};

const STAGE_NAME = { pitched: 'Pitched', designed: 'Designed', assets: 'Assets ready', built: 'Built', balanced: 'Balanced', art: 'Art done', ready: 'Ready to publish', live: 'Live', graded: 'Graded' };

function agoText(iso) {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}

function greeting() {
  const d = new Date();
  const hr = d.getHours();
  const g = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const name = String(store.settings.ownerName || '').trim();
  return {
    hello: g,
    name,
    when: d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
}

function imagesCard(media) {
  const thumbs = media.filter((a) => !/\.(mp4|webm|mov)$/i.test(a.mediaPath)).slice(0, 4);
  return h('article', { class: 'card ask group-card' },
    h('div', { class: 'row gap' }, h('span', { class: 'overline' }, 'Review')),
    h('h3', {}, `${media.length} new image${media.length === 1 ? '' : 's'} from the agents`),
    thumbs.length ? h('div', { class: 'thumb-row' }, thumbs.map((a) => h('img', { class: 'thumb', src: mediaUrl(a.mediaPath), alt: plain(a.title), loading: 'lazy' }))) : null,
    h('div', { class: 'row' }, btn('Review them', () => go('#/review'), { kind: 'primary', icon: 'review' })));
}

function tryCard(ask) {
  const open = replyOpen.has(ask.id);
  const ta = open ? h('textarea', { class: 'textarea', rows: 3, placeholder: 'What happened when you tried it?', oninput: (e) => { replyDraft[ask.id] = e.target.value; } }) : null;
  if (ta) ta.value = replyDraft[ask.id] || '';
  return h('article', { class: 'card ask', 'data-kind': 'try' },
    h('div', { class: 'row gap' }, h('span', { class: 'overline' }, roleLabel(ask.role)), h('span', { class: 'chip static' }, 'Try it'), h('span', { class: 'muted grow end-text' }, ago(ask.createdAt))),
    h('h3', {}, plain(ask.title)),
    ask.why ? h('p', { class: 'muted pre' }, ask.why) : null,
    ta,
    h('div', { class: 'row gap wrap' },
      open ? btn('Send reply', async () => {
        const text = ta.value.trim();
        if (!text) { ta.focus(); return; }
        if (await act(() => api('POST', `/api/asks/${ask.id}/answer`, { answer: text }), 'Reply sent')) {
          replyOpen.delete(ask.id); delete replyDraft[ask.id];
          notify();
        }
      }, { kind: 'primary', icon: 'send' }) : btn('Reply', () => { replyOpen.add(ask.id); notify(); }, { icon: 'send' }),
      btn('Done', () => act(() => api('POST', `/api/asks/${ask.id}/answer`, { answer: 'done' }), 'Marked done'), { icon: 'check' })));
}

function publishCards() {
  return store.gameList.filter((g) => g.stage === 'ready').map((g) => h('article', { class: 'card ask', 'data-kind': 'publish' },
    h('div', { class: 'row gap' }, h('span', { class: 'overline', 'data-tone': 'amber' }, 'Ready to publish'), h('span', { class: 'chip static' }, 'only you can')),
    h('h3', {}, `${g.name} v${g.version ?? 1} is ready`),
    h('p', { class: 'muted' }, 'Going live is a human-only step with its own two-step check.'),
    h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/games/${encodeURIComponent(g.slug)}/gate` }, 'Open the publish gate'))));
}

function pickCard() {
  const awaiting = store.pitches.filter((p) => p.state === 'proposed').length;
  const inProgress = store.gameList.some((g) => !['live', 'graded'].includes(g.stage));
  if (!awaiting && (inProgress || !store.gameList.length)) return null;
  return h('article', { class: 'card ask', 'data-kind': 'pick' },
    h('div', { class: 'row gap' }, h('span', { class: 'overline' }, 'Next game')),
    h('h3', {}, 'Pick the next game'),
    h('p', { class: 'muted' }, awaiting ? `${awaiting} pitch${awaiting === 1 ? '' : 'es'} await${awaiting === 1 ? 's' : ''} your decision.` : 'No game is in progress. Look at the pitches and pick one.'),
    h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/pitches' }, 'See the pitches')));
}

// A finished piece of work waiting for the owner: a task in review, or an open review ask.
function doneCard({ task, ask }) {
  const src = task || ask;
  const key = (task ? 't:' : 'a:') + src.id;
  const open = noteOpen.has(key);
  const body = task ? task.summary || 'The agent did not write a summary.' : ask.why || 'Nothing written yet. Open it to see the work.';
  const ta = open ? h('textarea', { class: 'textarea', rows: 3, placeholder: 'What is not right?', 'aria-label': 'What is not right', oninput: (e) => { noteDraft[key] = e.target.value; } }) : null;
  if (ta) ta.value = noteDraft[key] || '';
  const done = () => { noteOpen.delete(key); delete noteDraft[key]; };
  // A task with an open review ask is decided through that ask, so the ask and the task close together.
  const target = store.asks.find((a) => needsDecision(a) && a.kind === 'review' && (a === ask || (task && a.taskId === task.id)));
  const send = async (verdict, note) => {
    const via = ask || target;
    if (via) { const r = await answer(via, verdict === 'approve' ? 'approve' : 'changes:' + note, verdict === 'approve' ? 'Approved' : 'Sent back for rework'); if (r) done(); return; }
    const r = await act(() => api('POST', `/api/tasks/${task.id}/verdict`, note ? { verdict, note } : { verdict }), verdict === 'approve' ? 'Done. Marked as finished.' : 'Sent back for rework');
    if (r) { done(); loadState().catch(() => {}); notify(); }
  };
  const see = () => (target ? go('#/review/' + target.id) : task ? openTaskDrawer(task.id) : ask.taskId ? openTaskDrawer(ask.taskId) : go('#/review'));
  return h('article', { class: 'card done-card', 'data-kind': task ? 'back' : 'review' },
    h('div', { class: 'row gap' }, avatar(src.role, 28), h('span', { class: 'overline', 'data-tone': 'green' }, roleLabel(src.role) + ' finished · check it'),
      h('span', { class: 'muted grow end-text small' }, agoText(task ? task.endedAt || task.startedAt || task.createdAt : ask.createdAt))),
    h('h3', {}, plain(src.title)),
    h('p', { class: 'muted pre done-body' }, body),
    ta,
    h('div', { class: 'row gap wrap' },
      btn('Looks good', () => send('approve'), { kind: 'good', icon: 'check' }),
      btn('See what changed', see, { icon: 'review' }),
      open
        ? btn('Send it back', () => { const n = ta.value.trim(); if (!n) { ta.focus(); toast('Say what is not right', 'error'); return; } send('changes', n); }, { kind: 'caution' })
        : btn('Not right: say what', () => { noteOpen.add(key); notify(); }, { kind: 'ghost', icon: 'pencil' }),
      open ? btn('Cancel', () => { done(); notify(); }, { kind: 'ghost' }) : null));
}

function needsYou() {
  const open = store.asks.filter(needsDecision);
  const media = open.filter(isMediaAsk);
  const rest = open.filter((a) => !isMediaAsk(a));
  const cards = [...publishCards()];
  const pick = pickCard();
  if (pick) cards.push(pick);
  // A task whose review ask is already on Home is decided there, so it is not shown twice.
  for (const t of store.tasks.filter(isBackToYou)) if (!open.some((a) => a.kind === 'review' && a.taskId === t.id)) cards.push(doneCard({ task: t }));
  if (media.length) cards.push(imagesCard(media));
  for (const a of rest) cards.push(a.kind === 'try' ? tryCard(a) : a.kind === 'review' ? doneCard({ ask: a }) : askCard(a));
  return cards.length ? cards : [empty('Nothing needs you right now')];
}

function liveNow() {
  const rows = store.roles.map((r) => ({ r, st: roleStatus(r.id) })).filter((x) => x.st.state !== 'idle')
    .sort((a, b) => (a.st.state === 'working' ? 0 : 1) - (b.st.state === 'working' ? 0 : 1));
  return h('section', { class: 'card' },
    h('h2', { class: 'section-title' }, 'Live now'),
    rows.length ? h('ul', { class: 'live' }, rows.map(({ r, st }) => h('li', { class: 'live-row' + (st.task ? ' on' : ''), 'data-state': st.task ? 'working' : 'queued', role: 'button', 'aria-label': 'Open the ' + r.label + ' chat', onclick: () => go('#/team/' + r.id), tabindex: '0', onkeydown: (e) => { if (e.key === 'Enter') go('#/team/' + r.id); } },
      avatar(r.id, 26),
      h('span', { class: 'live-role' }, r.label),
      h('span', { class: 'live-what muted' }, st.task ? 'On: ' + plain(st.task.title) : st.queued ? `${st.queued} task${st.queued === 1 ? '' : 's'} waiting` : 'Work is in review'),
      h('span', { class: 'live-end' }, st.queued ? h('span', { class: 'live-q' }, st.queued + ' queued') : null,
        st.task ? h('span', { class: 'spin-ring', role: 'img', 'aria-label': 'Working' }) : null))))
      : h('p', { class: 'muted' }, 'Everyone is idle.'));
}

const STAGES = Object.keys(STAGE_NAME);
function stageDots(stage) {
  const at = STAGES.indexOf(stage);
  const label = at < 0 ? 'Stage not set' : `Stage ${at + 1} of ${STAGES.length}: ${STAGE_NAME[stage]}`;
  return h('span', { class: 'row gap stage' },
    h('span', { class: 'dots9', role: 'img', 'aria-label': label }, STAGES.map((k, i) => h('i', { 'data-on': i <= at ? '1' : '0' }))),
    h('span', { class: 'stage-word' }, STAGE_NAME[stage] || stage || 'No stage yet'));
}

function gamesCard() {
  const games = store.gameList.length ? store.gameList : store.games.map((g) => ({ slug: g.slug, name: g.name }));
  return h('section', { class: 'card stack sm' },
    h('h2', { class: 'section-title' }, 'Where each game is'),
    games.length ? games.map((g) => {
      const working = Array.isArray(g.working) ? g.working : store.tasks.filter((t) => t.game === g.slug && t.state === 'working').map((t) => t.role);
      return h('a', { class: 'game-row', href: '#/games/' + g.slug },
        h('div', { class: 'row gap between' }, h('strong', {}, g.name), h('span', { class: 'row gap' },
          g.version != null ? h('span', { class: 'muted small' }, 'v' + g.version) : null)),
        g.stage ? stageDots(g.stage) : null,
        g.nextStep ? h('p', { class: 'muted small' }, 'Now: ' + g.nextStep) : null,
        working.length ? h('div', { class: 'row gap' }, [...new Set(working)].map((id) => avatar(id, 22)), h('span', { class: 'muted small' }, 'working on it: ' + [...new Set(working)].map(roleLabel).join(', ')))
          : h('p', { class: 'muted small' }, "Nobody's working on it right now: ", h('span', { class: 'link', onclick: (e) => { e.preventDefault(); e.stopPropagation(); go('#/lead'); } }, 'ask the Lead')));
    }) : h('p', { class: 'muted' }, 'No games yet.'));
}

function studioCard() {
  const cur = store.settings.studioLanes ?? 1;
  const opts = [[0, 'Off'], [1, '1'], [2, '2'], ['all', 'All']];
  const locks = studioLocks();
  return h('section', { class: 'card stack sm' },
    h('h2', { class: 'section-title' }, 'Studios for agents'),
    h('div', { class: 'row gap between' },
      h('p', { class: 'muted small' }, 'How many agents may drive Studio at once.'),
      h('div', { class: 'seg', role: 'group', 'aria-label': 'Studio lanes' }, opts.map(([v, l]) => h('button', { type: 'button', class: 'seg-btn', 'aria-pressed': String(String(cur) === String(v)),
        onclick: async () => { store.settings = { ...store.settings, studioLanes: v }; notify(); await act(() => api('POST', '/api/settings', { key: 'studioLanes', value: v })); } }, l)))),
    locks.length ? h('ul', { class: 'plain' }, locks.map((l) => h('li', { class: 'lock-row' }, ic('lock', 13),
      h('span', {}, `${roleLabel(l.role)} · Lane ${l.lane ?? 1}${l.game ? ' · ' + gameName(l.game) : ''} · ${l.since ? ago(l.since) + (ago(l.since) === 'just now' ? '' : ' ago') : ''}`))))
      : h('p', { class: 'muted small' }, 'No agent is using Studio right now.'));
}

function freshnessCard() {
  if (Date.now() - store.freshAt > 60000) loadFreshness();
  const f = store.freshness || {};
  const rows = [['Market charts', f.marketCharts], ['Breakouts', f.breakouts], ['Live numbers', f.liveNumbers], ['Asset library', f.assetLibrary]];
  const games = store.gameList.length ? store.gameList : [];
  for (const g of games) rows.push([`${g.name} version`, f.games?.[g.slug] ?? g.updatedAt]);
  return h('section', { class: 'card stack sm' },
    h('h2', { class: 'section-title' }, 'Data freshness'),
    h('ul', { class: 'plain fresh' }, rows.map(([l, iso]) => h('li', { class: 'row between' }, h('span', {}, l), h('span', { class: 'muted small', title: iso ? fmtTime(iso) : '' }, agoText(iso))))));
}

export function render() {
  const open = [...store.asks.filter(needsDecision), ...store.tasks.filter(isBackToYou)];
  const working = store.tasks.filter((t) => t.state === 'working');
  const queued = store.tasks.filter((t) => t.state === 'queued');
  const g = greeting();
  const paused = !!store.settings.paused;

  const input = h('input', { class: 'input', type: 'text', maxlength: 20000, placeholder: 'Ask the Lead anything, or say what you want done...', 'aria-label': 'Ask the Lead', oninput: (e) => { leadDraft = e.target.value; } });
  input.value = leadDraft;
  const ask = h('form', { class: 'ask-lead', onsubmit: async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (await act(() => api('POST', '/api/messages', { role: 'lead', text }), 'Sent to the Lead')) { leadDraft = ''; input.value = ''; }
  } }, avatar('lead', 28), input,
  h('button', { type: 'submit', class: 'btn primary ask-go', 'aria-label': 'Ask the Lead' }, ic('send', 14), h('span', { class: 'ask-label' }, 'Ask')));
  const tools = h('div', { class: 'ask-tools' },
    btn('New task', () => newTaskModal(), { icon: 'plus' }),
    btn(paused ? 'Resume all' : 'Pause all', () => act(() => api('POST', paused ? '/api/resume' : '/api/pause'), paused ? 'Resumed' : 'Paused'), { icon: paused ? 'play' : 'pause' }));

  return h('div', { class: 'page' },
    h('header', { class: 'greet' }, h('p', { class: 'eyebrow' }, g.when), h('h1', {}, g.name ? [g.hello + ', ', h('span', { class: 'grad-text' }, g.name)] : g.hello)),
    h('div', { class: 'chips' },
      h('a', { class: 'chip', 'data-tone': open.length ? 'need' : null, href: '#/review' }, h('b', {}, open.length), ' need you'),
      h('a', { class: 'chip', 'data-tone': working.length ? 'work' : null, href: '#/team' }, h('b', {}, working.length), ' working'),
      h('a', { class: 'chip', href: '#/tasks' }, h('b', {}, queued.length), ' queued'),
      h('span', { class: 'chip static' }, 'last change ', h('b', {}, agoText(new Date(store.lastChange).toISOString())))),
    h('div', { class: 'ask-wrap' }, ask, tools),
    h('div', { class: 'home-grid' },
      h('section', { class: 'stack' }, h('h2', { class: 'section-title' }, 'Needs you', open.length ? h('span', { class: 'count', 'data-tone': 'amber' }, open.length) : null), needsYou()),
      h('aside', { class: 'stack' }, liveNow(), gamesCard(), studioCard(), freshnessCard())));
}

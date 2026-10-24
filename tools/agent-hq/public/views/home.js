import { h, store, api, act, ic, btn, empty, roleLabel, avatar, roleStatus, ago, fmtTime, go, plain, gameName, mediaUrl, studioLocks, LANES, lastSeen, laneFresh, laneCfg, loadFreshness, notify } from './core.js';
import { askCard, isMediaAsk, needsDecision } from './review.js';
import { newTaskModal, backToYou, isBackToYou } from './tasks.js';

let leadDraft = '';
const replyOpen = new Set();
const replyDraft = {};

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
    when: d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    text: name ? `${g}, ${name}` : g,
  };
}

function imagesCard(media) {
  const thumbs = media.filter((a) => !/\.(mp4|webm|mov)$/i.test(a.mediaPath)).slice(0, 4);
  return h('article', { class: 'card ask group-card' },
    h('div', { class: 'row gap' }, h('span', { class: 'tag' }, 'Review')),
    h('h3', {}, `${media.length} new image${media.length === 1 ? '' : 's'} from the agents`),
    thumbs.length ? h('div', { class: 'thumb-row' }, thumbs.map((a) => h('img', { class: 'thumb', src: mediaUrl(a.mediaPath), alt: plain(a.title), loading: 'lazy' }))) : null,
    h('div', { class: 'row' }, btn('Review them', () => go('#/review'), { kind: 'primary', icon: 'review' })));
}

function tryCard(ask) {
  const open = replyOpen.has(ask.id);
  const ta = open ? h('textarea', { class: 'textarea', rows: 3, placeholder: 'What happened when you tried it?', oninput: (e) => { replyDraft[ask.id] = e.target.value; } }) : null;
  if (ta) ta.value = replyDraft[ask.id] || '';
  return h('article', { class: 'card ask', 'data-kind': 'try' },
    h('div', { class: 'row gap' }, h('span', { class: 'tag' }, roleLabel(ask.role)), h('span', { class: 'tag ghost' }, 'Try it'), h('span', { class: 'muted grow end-text' }, ago(ask.createdAt))),
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
    h('div', { class: 'row gap' }, h('span', { class: 'tag' }, 'Ready to publish'), h('span', { class: 'tag ghost' }, 'only you can')),
    h('h3', {}, `${g.name} v${g.version ?? 1} is ready`),
    h('p', { class: 'muted' }, 'Going live is a human-only step with its own two-step check.'),
    h('div', { class: 'row' }, h('a', { class: 'btn primary', href: `#/games/${encodeURIComponent(g.slug)}/gate` }, 'Open the publish gate'))));
}

function pickCard() {
  const awaiting = store.pitches.filter((p) => p.state === 'proposed').length;
  const inProgress = store.gameList.some((g) => !['live', 'graded'].includes(g.stage));
  if (!awaiting && (inProgress || !store.gameList.length)) return null;
  return h('article', { class: 'card ask', 'data-kind': 'pick' },
    h('div', { class: 'row gap' }, h('span', { class: 'tag' }, 'Next game')),
    h('h3', {}, 'Pick the next game'),
    h('p', { class: 'muted' }, awaiting ? `${awaiting} pitch${awaiting === 1 ? '' : 'es'} await${awaiting === 1 ? 's' : ''} your decision.` : 'No game is in progress. Look at the pitches and pick one.'),
    h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/pitches' }, 'See the pitches')));
}

function needsYou() {
  const open = store.asks.filter(needsDecision);
  const media = open.filter(isMediaAsk);
  const rest = open.filter((a) => !isMediaAsk(a));
  const cards = [...publishCards()];
  const pick = pickCard();
  if (pick) cards.push(pick);
  for (const t of store.tasks.filter(isBackToYou)) {
    cards.push(h('article', { class: 'card ask', 'data-kind': 'back' },
      h('div', { class: 'row gap' }, h('span', { class: 'tag' }, roleLabel(t.role)), h('span', { class: 'tag ghost' }, 'Back to you'), h('span', { class: 'muted grow end-text' }, ago(t.endedAt || t.startedAt || t.createdAt))),
      backToYou(t, { compact: true })));
  }
  if (media.length) cards.push(imagesCard(media));
  for (const a of rest) cards.push(a.kind === 'try' ? tryCard(a) : askCard(a));
  return cards.length ? cards : [empty('Nothing needs you right now')];
}

function liveNow() {
  const rows = store.roles.map((r) => ({ r, st: roleStatus(r.id) })).filter((x) => x.st.state !== 'idle')
    .sort((a, b) => (a.st.state === 'working' ? 0 : 1) - (b.st.state === 'working' ? 0 : 1));
  return h('section', { class: 'card' },
    h('h2', { class: 'section-title' }, 'Live now'),
    rows.length ? h('ul', { class: 'live' }, rows.map(({ r, st }) => h('li', { class: 'live-row' + (st.task ? ' on' : ''), role: 'button', 'aria-label': 'Open the ' + r.label + ' chat', onclick: () => go('#/team/' + r.id), tabindex: '0', onkeydown: (e) => { if (e.key === 'Enter') go('#/team/' + r.id); } },
      avatar(r.id, 26),
      h('span', { class: 'live-role' }, r.label),
      h('span', { class: 'live-what muted' }, st.task ? 'On: ' + plain(st.task.title) : st.queued ? `${st.queued} task${st.queued === 1 ? '' : 's'} waiting` : 'Work is in review'),
      st.queued ? h('span', { class: 'muted small nowrap' }, st.queued + ' queued') : null)))
      : h('p', { class: 'muted' }, 'Everyone is idle.'));
}

function gamesCard() {
  const games = store.gameList.length ? store.gameList : store.games.map((g) => ({ slug: g.slug, name: g.name }));
  return h('section', { class: 'card stack sm' },
    h('h2', { class: 'section-title' }, 'Where each game is'),
    games.length ? games.map((g) => {
      const working = Array.isArray(g.working) ? g.working : store.tasks.filter((t) => t.game === g.slug && t.state === 'working').map((t) => t.role);
      return h('a', { class: 'game-row', href: '#/games/' + g.slug },
        h('div', { class: 'row gap between' }, h('strong', {}, g.name), h('span', { class: 'row gap' },
          g.version != null ? h('span', { class: 'tag ghost' }, 'v' + g.version) : null,
          g.stage ? h('span', { class: 'tag' }, STAGE_NAME[g.stage] || g.stage) : null)),
        g.nextStep ? h('p', { class: 'muted small' }, 'Now: ' + g.nextStep) : null,
        working.length ? h('div', { class: 'row gap' }, [...new Set(working)].map((id) => avatar(id, 22)), h('span', { class: 'muted small' }, [...new Set(working)].map(roleLabel).join(', ') + ' working'))
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

  const input = h('input', { class: 'input', type: 'text', maxlength: 20000, placeholder: 'Tell the Lead what you want, for example: add a daily bonus', 'aria-label': 'Ask the Lead', oninput: (e) => { leadDraft = e.target.value; } });
  input.value = leadDraft;
  const ask = h('form', { class: 'ask-lead', onsubmit: async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (await act(() => api('POST', '/api/messages', { role: 'lead', text }), 'Sent to the Lead')) { leadDraft = ''; input.value = ''; }
  } }, input,
  h('button', { type: 'submit', class: 'btn primary' }, ic('send', 14), 'Ask'),
  btn('New task', () => newTaskModal(), { icon: 'plus' }),
  btn(paused ? 'Resume all' : 'Pause all', () => act(() => api('POST', paused ? '/api/resume' : '/api/pause'), paused ? 'Resumed' : 'Paused'), { icon: paused ? 'play' : 'pause' }));

  return h('div', { class: 'page' },
    h('header', { class: 'greet' }, h('p', { class: 'eyebrow' }, g.when), h('h1', {}, g.text)),
    h('div', { class: 'chips' },
      h('a', { class: 'chip' + (open.length ? ' hot' : ''), href: '#/review' }, h('b', {}, open.length), ' need you'),
      h('a', { class: 'chip', href: '#/team' }, h('b', {}, working.length), ' working'),
      h('a', { class: 'chip', href: '#/tasks' }, h('b', {}, queued.length), ' queued'),
      h('span', { class: 'chip static' }, 'last change ', h('b', {}, agoText(new Date(store.lastChange).toISOString())))),
    h('div', { class: 'lanes-strip', 'aria-label': 'Worker lanes' }, LANES.map((l) => h('a', { class: 'lane-pill', href: '#/settings', title: l.how },
      h('span', { class: 'dot', 'data-on': laneCfg(l.id).enabled !== false && laneFresh(l.id) ? 'working' : 'idle' }), l.name,
      h('span', { class: 'muted' }, laneCfg(l.id).enabled === false ? 'paused' : 'last seen ' + lastSeen(l.id))))),
    ask,
    h('div', { class: 'home-grid' },
      h('section', { class: 'stack' }, h('h2', { class: 'section-title' }, 'Needs you'), needsYou()),
      h('aside', { class: 'stack' }, liveNow(), gamesCard(), studioCard(), freshnessCard())));
}

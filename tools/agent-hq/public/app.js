import { h, ic, store, api, act, subscribe, notify, loadState, startEvents, refreshAll, roleLabel, avatar, gameName, studioLocks, toast, empty, token, signOut, ago, agentSpend } from './views/core.js';
import * as home from './views/home.js';
import * as lead from './views/lead.js';
import * as team from './views/team.js';
import * as tasks from './views/tasks.js';
import * as review from './views/review.js';
import * as settings from './views/settings.js';
import { openPalette } from './views/palette.js';
import { newTaskModal } from './views/tasks.js';
import { isMediaAsk, needsDecision } from './views/review.js';
import { isBackToYou } from './views/tasks.js';
import { openLightbox } from './views/lightbox.js';

const views = { home, lead, team, tasks, review, settings };
// Pages built by another module owner load on their own, so one broken page never takes the shell down.
await Promise.all(['games', 'pitches', 'market', 'library', 'link', 'pro', 'help'].map(async (n) => {
  try { views[n] = await import(`./views/${n}.js`); } catch (e) {
    console.warn('page not available:', n, e.message);
    views[n] = { render: () => h('div', { class: 'page' }, empty(`The ${n} page is not available yet.`)) };
  }
}));

const SECTIONS = [
  ['Workspace', [['home', 'Home', 'home'], ['lead', 'Lead', 'sparkles'], ['team', 'Team', 'team'], ['tasks', 'Tasks', 'tasks'], ['review', 'Review', 'review']]],
  ['Studio', [['games', 'Games', 'games'], ['pitches', 'Pitches', 'pitches'], ['market', 'Market', 'market'], ['library', 'Library', 'library'], ['pro', 'Pro', 'gem'], ['link', 'HQ Link', 'team']]],
];
const PAGE_LABEL = { link: 'HQ Link', home: 'Home', lead: 'Lead', team: 'Team', tasks: 'Tasks', review: 'Review', games: 'Games', pitches: 'Pitches', market: 'Market', library: 'Library', pro: 'Pro', settings: 'Settings', help: 'Help' };
const PAGE_SUB = { link: 'Work with another HQ', home: 'Overview', lead: 'Chat with the Lead', team: 'Roster', tasks: 'All work', review: 'Images and stages', games: 'All games', pitches: 'Ideas', market: 'Charts and benchmarks', library: 'Assets and knowledge', pro: 'Rising games and ideas', settings: 'Preferences', help: 'How HQ works' };
const NAV_TONE = { home: 'amber', team: 'green', tasks: 'green', review: 'grey', pitches: 'grey' };
const NAV_WHAT = { home: ' need you', team: ' working', tasks: ' open', review: ' waiting', pitches: ' to decide' };
const LIVE_UPDATED = new Set(['home', 'lead', 'review']); // these pages say when the numbers last changed, the rest say "watching"
const TABS = [['home', 'Home', 'home', 'amber'], ['lead', 'Lead', 'sparkles'], ['tasks', 'Tasks', 'tasks', 'violet'], ['review', 'Review', 'review', 'grey']];
const MORE = [['team', 'Team', 'team'], ['games', 'Games', 'games'], ['pitches', 'Pitches', 'pitches'], ['market', 'Market', 'market'], ['library', 'Library', 'library'], ['pro', 'Pro', 'gem'], ['link', 'HQ Link', 'team'], ['settings', 'Settings', 'settings'], ['help', 'Help', 'help']];

const side = document.getElementById('side');
const topbar = document.getElementById('topbar');
const strip = document.getElementById('strip');
const tabsEl = document.getElementById('tabs');
const main = document.getElementById('main');

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const cut = raw.indexOf('/');
  const name = cut < 0 ? raw : raw.slice(0, cut);
  const rest = cut < 0 ? '' : raw.slice(cut + 1);
  let param = rest;
  try { param = decodeURIComponent(rest); } catch { /* keep raw */ }
  return { name: views[name] ? name : 'home', param };
}

function counts() {
  const openAsks = store.asks.filter(needsDecision);
  return {
    home: openAsks.length + store.tasks.filter(isBackToYou).length,
    team: store.tasks.filter((t) => t.state === 'working').length,
    tasks: store.tasks.filter((t) => ['queued', 'working', 'review'].includes(t.state)).length,
    review: openAsks.filter((a) => isMediaAsk(a) || a.kind === 'review').length,
    pitches: store.pitches.filter((p) => p.state === 'proposed').length,
  };
}

const games = () => (store.gameList.length ? store.gameList : store.games);
const money = (n) => '$' + (n >= 100 ? n.toFixed(0) : n.toFixed(2));
const sinceChange = () => { const a = ago(new Date(store.lastChange).toISOString()); return a === 'just now' ? a : a + ' ago'; };

function navItem([id, label, icon], name, c) {
  return h('a', { class: 'nav-item', href: '#/' + id, 'aria-current': id === name ? 'page' : null },
    ic(icon, 18), h('span', {}, label),
    c[id] ? h('span', { class: 'count nav-count', 'data-tone': NAV_TONE[id], 'aria-label': c[id] + NAV_WHAT[id] }, c[id]) : null);
}

function renderSide() {
  const { name, param } = route();
  const c = counts();
  const working = c.team;
  const locks = studioLocks();
  const paused = !!store.settings.paused;
  const owner = String(store.settings.ownerName || '').trim();
  const spend = agentSpend(7);
  side.replaceChildren(
    h('div', { class: 'brand' }, ic('rocket', 18), h('div', {}, h('div', { class: 'brand-name' }, 'Agent HQ'), h('div', { class: 'brand-tag muted' }, 'Your AI game studio'))),
    h('button', { type: 'button', class: 'search-box', onclick: openPalette, 'aria-label': 'Search or jump to, Control K' }, ic('search', 14), h('span', { class: 'grow' }, 'Search or jump to…'), h('kbd', {}, 'Ctrl K')),
    h('nav', { class: 'nav', 'aria-label': 'Main' }, SECTIONS.map(([title, items]) => [h('div', { class: 'nav-group' }, title), items.map((n) => navItem(n, name, c))])),
    h('div', { class: 'side-team' },
      h('div', { class: 'nav-group' }, 'Team'),
      h('div', { class: 'avatar-grid' }, store.roles.map((r) => {
        const unread = store.threads[r.id]?.unread || 0;
        return h('a', { class: 'avatar-link', href: '#/team/' + r.id, 'aria-label': r.label + (unread ? ', ' + unread + ' unread' : ''), 'aria-current': name === 'team' && param === r.id ? 'true' : null },
          avatar(r.id, 28), unread ? h('span', { class: 'unread-dot' }) : null);
      }))),
    h('div', { class: 'side-foot' },
      h('a', { class: 'spend', href: '#/settings', 'aria-label': `Agent spend in the last 7 days: ${money(spend)}. Open Settings` },
        h('span', { class: 'spend-text' }, h('span', { class: 'spend-label' }, 'Agent spend · last 7 days'), h('strong', { class: 'spend-amt' }, money(spend))), ic('chevron', 14)),
      h('a', { class: 'nav-item', href: '#/help', 'aria-current': name === 'help' ? 'page' : null }, ic('help', 18), h('span', {}, 'Help')),
      h('a', { class: 'nav-item', href: '#/settings', 'aria-current': name === 'settings' ? 'page' : null }, ic('settings', 18), h('span', {}, 'Settings')),
      h('div', { class: 'foot-line foot-chip' }, h('span', { class: 'dot', 'data-on': working ? 'working' : 'idle' }), `${working} agent${working === 1 ? '' : 's'} working`,
        store.connected ? null : h('span', { class: 'offline' }, 'offline'),
        h('button', { type: 'button', class: 'btn sm push', onclick: () => act(() => api('POST', paused ? '/api/resume' : '/api/pause')) }, ic(paused ? 'play' : 'pause', 12), paused ? 'Resume' : 'Pause')),
      h('div', { class: 'foot-line muted' }, ic('lock', 12), locks.length ? `${roleLabel(locks[0].role)} has Studio${locks.length > 1 ? ` (+${locks.length - 1})` : ''}` : 'Studio is free'),
      h('div', { class: 'account' }, h('span', { class: 'acct-av', 'aria-hidden': 'true' }, (owner[0] || 'Y').toUpperCase()),
        h('div', {}, h('div', { class: 'acct-name' }, owner || 'You'), h('div', { class: 'muted small' }, 'Owner')))));
}

function renderTop() {
  const { name, param } = route();
  let ctx = '';
  if (name === 'team' && param) ctx = roleLabel(param);
  if (name === 'games' && param) { const [slug, more] = param.split('/'); ctx = gameName(slug) + (more === 'gate' ? ' · Publish gate' : ''); }
  const n = games().length;
  const live = !store.connected ? 'Offline' : LIVE_UPDATED.has(name) ? 'Live · updated ' + sinceChange() : 'Live · watching';
  topbar.replaceChildren(
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' },
      h('a', { class: 'switcher', href: '#/games', 'aria-label': `All games, ${n}. Open Games` }, h('span', { class: 'sw-ic' }, ic('grid', 14)), h('span', { class: 'sw-name' }, 'All games'), h('span', { class: 'count' }, n), h('span', { class: 'sw-chev' }, ic('chevron', 14))),
      h('span', { class: 'slash', 'aria-hidden': 'true' }, '/'),
      h('strong', { class: 'page-title', title: PAGE_SUB[name] }, PAGE_LABEL[name]), ctx ? h('span', { class: 'muted page-ctx' }, ' · ' + ctx) : null),
    h('div', { class: 'top-right' },
      h('span', { class: 'live-ind', title: store.connected ? 'Connected to the HQ server' : 'Reconnecting' }, h('span', { class: 'dot', 'data-on': store.connected ? 'working' : 'failed' }), h('span', {}, live)),
      h('button', { type: 'button', class: 'btn sm refresh-btn', onclick: () => refreshAll().catch((e) => toast(e.message, 'error')) }, ic('refresh', 13), h('span', {}, 'Refresh numbers')),
      h('button', { type: 'button', class: 'btn primary sm', onclick: () => newTaskModal() }, ic('plus', 13), 'New task')));
}

// ---- phone shell: game strip on top, bottom tab bar, More sheet (hidden on desktop by shell.css) ----
function renderStrip() {
  const { name, param } = route();
  const cur = name === 'games' && param ? param.split('/')[0] : '';
  strip.replaceChildren(
    h('a', { class: 'strip-item', href: '#/games', 'aria-current': cur ? null : 'true' }, 'All games', h('span', { class: 'count' }, games().length)),
    games().map((g) => h('a', { class: 'strip-item', href: '#/games/' + encodeURIComponent(g.slug), 'aria-current': cur === g.slug ? 'true' : null }, g.name)),
    h('button', { type: 'button', class: 'strip-item', onclick: () => (views.games.addGame ? views.games.addGame() : (location.hash = '#/games')) }, ic('plus', 14), 'New game'));
}

let closeMore = null;
function renderTabs() {
  const { name } = route();
  const c = counts();
  const n = { home: c.home, tasks: c.tasks, review: c.review };
  tabsEl.replaceChildren(
    TABS.map(([id, label, icon, tone]) => h('a', { class: 'tab-item', href: '#/' + id, 'aria-current': id === name ? 'page' : null },
      h('span', { class: 'tab-ic' }, ic(icon, 24), n[id] ? h('span', { class: 'count', 'data-tone': tone }, n[id]) : null), h('span', {}, label))),
    h('button', { type: 'button', id: 'tab-more', class: 'tab-item', 'aria-haspopup': 'dialog', 'aria-expanded': String(!!closeMore), 'aria-current': !closeMore && MORE.some(([id]) => id === name) ? 'true' : null, onclick: openMore },
      h('span', { class: 'tab-ic' }, ic('menu', 24)), h('span', {}, 'More')));
}

function openMore() {
  if (closeMore) { closeMore(); return; }
  const { name } = route();
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'More pages' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('nav', { class: 'sheet-list', 'aria-label': 'More' }, MORE.map(([id, label, icon]) => h('a', { class: 'sheet-item', href: '#/' + id, 'aria-current': id === name ? 'page' : null }, ic(icon, 20), h('span', { class: 'grow' }, label), ic('chevron', 16)))));
  const back = h('div', { class: 'backdrop sheet-back', onmousedown: (e) => { if (e.target === back) closeMore(); } }, sheet);
  const onKey = (e) => { if (e.key === 'Escape') { closeMore(); document.getElementById('tab-more')?.focus(); } };
  closeMore = () => { document.removeEventListener('keydown', onKey); back.remove(); closeMore = null; renderTabs(); };
  document.getElementById('overlay').append(back);
  document.addEventListener('keydown', onKey);
  renderTabs();
  sheet.querySelector('a')?.focus();
}

let dirty = false;
let lastKey = '';
function typing() {
  const a = document.activeElement;
  return a && main.contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !['checkbox', 'button', 'submit', 'file'].includes(a.type)));
}

function renderMain() {
  const { name, param } = route();
  const key = name + '/' + param;
  if (key === lastKey && typing() && !views[name].live) { dirty = true; return; }
  dirty = false;
  const fresh = key !== lastKey;
  const top = fresh ? 0 : main.scrollTop;
  lastKey = key;
  let node;
  try {
    node = store.loaded ? views[name].render(param) : h('div', { class: 'empty' }, 'Reading the studio…');
  } catch (e) {
    console.error(e);
    node = h('div', { class: 'empty' }, 'This screen failed to render: ' + e.message);
  }
  if (!(main.childNodes.length === 1 && main.firstChild === node)) { main.replaceChildren(node); main.scrollTop = top; }
  main.classList.toggle('fill', !!views[name].live);
  main.classList.toggle('enter', fresh);
  document.title = 'Agent HQ';
}

function renderAll() { renderSide(); renderTop(); renderStrip(); renderTabs(); renderMain(); }

main.addEventListener('focusout', () => { setTimeout(() => { if (dirty && !typing()) renderMain(); }, 80); });
window.addEventListener('hashchange', () => { dirty = false; closeMore?.(); renderAll(); main.focus({ preventScroll: true }); });
window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'k') { e.preventDefault(); openPalette(); }
  else if (k === 'n') { e.preventDefault(); if (!document.querySelector('.modal .taskform')) newTaskModal(); }
});
// Any enlargeable image opens the lightbox, with its neighbours in the same container for prev/next.
const LB = 'img.md-img, img.ask-media, img.thumb, img.lb-able';
document.addEventListener('click', (e) => {
  const img = e.target.closest?.(LB);
  if (!img || img.closest('.lightbox')) return;
  e.preventDefault();
  const scope = img.closest('.chat-list, .drawer, .modal, .thumb-row, .small-prev, .attach-grid') || main;
  const all = [...scope.querySelectorAll(LB)];
  openLightbox(all.map((i) => ({ src: i.getAttribute('src'), title: i.getAttribute('alt') || '' })), Math.max(0, all.indexOf(img)));
});
subscribe(renderAll);
setInterval(() => { if (!document.hidden) notify(); }, 20000); // keeps "last change" and times fresh

if (!token) {
  // Not signed in: the page itself never carries a token, so ask the owner to open the signed-in link.
  for (const el of [side, strip, tabsEl]) el.replaceChildren();
  main.replaceChildren(h('div', { class: 'empty' },
    h('h2', {}, 'Sign in to Agent HQ'),
    h('p', {}, 'Open the dashboard with the Agent HQ shortcut on your desktop (or scripts/Agent HQ.bat in the project folder). It opens a signed-in link for this browser.')));
} else {
  renderAll();
  startEvents();
  loadState().catch((e) => {
    if (/401|unauthor/i.test(e.message)) signOut(); // stale token from an older owner-token file
    else toast('Could not load state: ' + e.message, 'error');
  });
}

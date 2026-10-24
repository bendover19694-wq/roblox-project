import { h, ic, store, api, act, subscribe, notify, loadState, startEvents, refreshAll, roleLabel, avatar, gameName, studioLocks, toast, empty, token, signOut } from './views/core.js';
import * as home from './views/home.js';
import * as lead from './views/lead.js';
import * as team from './views/team.js';
import * as tasks from './views/tasks.js';
import * as review from './views/review.js';
import * as settings from './views/settings.js';
import { openPalette } from './views/palette.js';
import { newTaskModal } from './views/tasks.js';
import { isMediaAsk } from './views/review.js';

const views = { home, lead, team, tasks, review, settings };
// Pages built by another module owner load on their own, so one broken page never takes the shell down.
await Promise.all(['games', 'pitches', 'market', 'library'].map(async (n) => {
  try { views[n] = await import(`./views/${n}.js`); } catch (e) {
    console.warn('page not available:', n, e.message);
    views[n] = { render: () => h('div', { class: 'page' }, empty(`The ${n} page is not available yet.`)) };
  }
}));

const SECTIONS = [
  ['Workspace', [['home', 'Home', 'home'], ['lead', 'Lead', 'lead'], ['team', 'Team', 'team'], ['tasks', 'Tasks', 'tasks'], ['review', 'Review', 'review']]],
  ['Studio', [['games', 'Games', 'games'], ['pitches', 'Pitches', 'pitches'], ['market', 'Market', 'market'], ['library', 'Library', 'library']]],
];
const PAGE_LABEL = { home: 'Home', lead: 'Lead', team: 'Team', tasks: 'Tasks', review: 'Review', games: 'Games', pitches: 'Pitches', market: 'Market', library: 'Library', settings: 'Settings' };
const PAGE_SUB = { home: 'Overview', lead: 'Chat with the Lead', team: 'Roster', tasks: 'All work', review: 'Images and stages', games: 'All games', pitches: 'Ideas', market: 'Charts and benchmarks', library: 'Assets and knowledge', settings: 'Preferences' };

const side = document.getElementById('side');
const topbar = document.getElementById('topbar');
const main = document.getElementById('main');

function route() {
  const [name, param] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: views[name] ? name : 'home', param: param ? decodeURIComponent(param) : '' };
}

function counts() {
  const openAsks = store.asks.filter((a) => a.state === 'open' && !a.superseded);
  return {
    home: openAsks.length,
    team: store.tasks.filter((t) => t.state === 'working').length,
    tasks: store.tasks.filter((t) => ['queued', 'working', 'review'].includes(t.state)).length,
    review: openAsks.filter((a) => isMediaAsk(a) || a.kind === 'review').length,
  };
}

function navItem([id, label, icon], name, c) {
  return h('a', { class: 'nav-item', href: '#/' + id, 'aria-current': id === name ? 'page' : null },
    ic(icon, 16), h('span', {}, label), c[id] ? h('span', { class: 'badge' + (id === 'home' || id === 'review' ? '' : ' quiet'), 'aria-label': c[id] + (id === 'team' ? ' working' : id === 'tasks' ? ' open' : ' waiting') }, c[id]) : null);
}

function renderSide() {
  const { name, param } = route();
  const c = counts();
  const working = c.team;
  const locks = studioLocks();
  const paused = !!store.settings.paused;
  const owner = String(store.settings.ownerName || '').trim();
  side.replaceChildren(
    h('div', { class: 'brand' }, ic('rocket', 18), h('div', {}, h('div', { class: 'brand-name' }, 'Agent HQ'), h('div', { class: 'brand-tag muted' }, 'Your AI game studio'))),
    h('button', { type: 'button', class: 'search-box', onclick: openPalette, 'aria-label': 'Search or jump to, Control K' }, ic('search', 14), h('span', { class: 'grow' }, 'Search or jump to…'), h('kbd', {}, 'Ctrl K')),
    h('nav', { class: 'nav', 'aria-label': 'Main' }, SECTIONS.map(([title, items]) => [h('div', { class: 'nav-group' }, title), items.map((n) => navItem(n, name, c))])),
    h('div', { class: 'side-team' },
      h('div', { class: 'nav-group' }, 'Team'),
      h('div', { class: 'avatar-grid' }, store.roles.map((r) => {
        const unread = store.threads[r.id]?.unread || 0;
        return h('a', { class: 'avatar-link', href: '#/team/' + r.id, 'aria-label': r.label + (unread ? ', ' + unread + ' unread' : ''), 'aria-current': name === 'team' && param === r.id ? 'true' : null },
          avatar(r.id, 30), unread ? h('span', { class: 'unread-dot' }) : null);
      }))),
    h('div', { class: 'side-foot' },
      h('div', { class: 'foot-line' }, h('span', { class: 'dot', 'data-on': working ? 'working' : 'idle' }), `${working} agent${working === 1 ? '' : 's'} working`,
        store.connected ? null : h('span', { class: 'offline' }, 'offline'),
        h('button', { type: 'button', class: 'btn sm push', onclick: () => act(() => api('POST', paused ? '/api/resume' : '/api/pause')) }, ic(paused ? 'play' : 'pause', 12), paused ? 'Resume' : 'Pause')),
      h('div', { class: 'foot-line muted' }, ic('lock', 12), locks.length ? `${roleLabel(locks[0].role)} has Studio${locks.length > 1 ? ` (+${locks.length - 1})` : ''}` : 'Studio is free'),
      h('a', { class: 'nav-item', href: '#/settings', 'aria-current': name === 'settings' ? 'page' : null }, ic('settings', 16), h('span', {}, 'Settings')),
      h('div', { class: 'account' }, h('span', { class: 'acct-av', 'aria-hidden': 'true' }, (owner[0] || 'Y').toUpperCase()),
        h('div', {}, h('div', { class: 'acct-name' }, owner || 'You'), h('div', { class: 'muted small' }, 'Owner')))));
}

function renderTop() {
  const { name, param } = route();
  let sub = PAGE_SUB[name];
  if (name === 'team' && param) sub = roleLabel(param);
  if (name === 'games' && param) sub = gameName(param);
  const project = (store.gameList[0] || store.games[0])?.name;
  topbar.replaceChildren(
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('strong', {}, PAGE_LABEL[name]), h('span', { class: 'muted' }, ' · ' + sub)),
    h('div', { class: 'top-right' },
      h('span', { class: 'live-ind', title: store.connected ? 'Connected to the HQ server' : 'Reconnecting' }, h('span', { class: 'dot', 'data-on': store.connected ? 'working' : 'failed' }),
        h('span', {}, store.connected ? 'Live' : 'Offline'), project ? h('span', { class: 'muted hide-narrow' }, ' · ' + project) : null),
      h('button', { type: 'button', class: 'btn sm', onclick: () => refreshAll().catch((e) => toast(e.message, 'error')) }, ic('refresh', 13), h('span', { class: 'hide-narrow' }, 'Refresh')),
      h('button', { type: 'button', class: 'btn primary sm', onclick: () => newTaskModal() }, ic('plus', 13), 'New task')));
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
  const top = key === lastKey ? main.scrollTop : 0;
  lastKey = key;
  let node;
  try {
    node = store.loaded ? views[name].render(param) : h('div', { class: 'empty' }, 'Loading');
  } catch (e) {
    console.error(e);
    node = h('div', { class: 'empty' }, 'This screen failed to render: ' + e.message);
  }
  if (!(main.childNodes.length === 1 && main.firstChild === node)) { main.replaceChildren(node); main.scrollTop = top; }
  main.classList.toggle('fill', !!views[name].live);
  document.title = 'Agent HQ';
}

function renderAll() { renderSide(); renderTop(); renderMain(); }

main.addEventListener('focusout', () => { setTimeout(() => { if (dirty && !typing()) renderMain(); }, 80); });
window.addEventListener('hashchange', () => { dirty = false; renderAll(); main.focus({ preventScroll: true }); });
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
});
subscribe(renderAll);
setInterval(() => { if (!document.hidden) notify(); }, 20000); // keeps "last change" and times fresh

if (!token) {
  // Not signed in: the page itself never carries a token, so ask the owner to open the signed-in link.
  document.getElementById('side').replaceChildren();
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

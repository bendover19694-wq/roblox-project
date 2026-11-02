// Team: Teams-style messenger. Roster on the left, one conversation on the right.
import { h, store, ic, roleStatus, avatar, ago, plain } from './core.js';
import { chatView } from './chat.js';

export const live = true; // app.js keeps this view mounted so typing is never interrupted

const PILL = { working: ['Working', 'green'], queued: ['Queued', 'blue'], review: ['Review', 'amber'], idle: ['Idle', 'grey'] };

function preview(text) {
  return String(text || '').replace(/[#*`>_\[\]!]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
}

function rosterRow(r, active) {
  const st = roleStatus(r.id);
  const th = store.threads[r.id];
  const last = th?.last;
  let detail;
  if (st.task) detail = 'On: ' + st.task.title;
  else if (last && last.from !== 'system') detail = (last.from === 'owner' ? 'You: ' : '') + preview(last.text);
  else if (st.queued) detail = `${st.queued} task${st.queued === 1 ? '' : 's'} waiting`;
  else detail = r.job;
  const done = store.tasks.filter((t) => t.role === r.id && t.state === 'done').sort((a, b) => String(b.endedAt || b.createdAt).localeCompare(String(a.endedAt || a.createdAt)))[0];
  const when = last?.createdAt || st.task?.startedAt || '';
  return h('a', { class: 'roster-row', href: '#/team/' + r.id, 'aria-current': active ? 'true' : null },
    avatar(r.id, 40),
    h('div', { class: 'roster-main' },
      h('div', { class: 'row gap between' },
        h('span', { class: 'roster-name' }, r.label, th?.unread ? h('span', { class: 'badge inline', 'aria-label': th.unread + ' unread' }, th.unread) : null),
        h('span', { class: 'spill', 'data-tone': PILL[st.state][1] }, PILL[st.state][0])),
      h('div', { class: 'row gap between' },
        h('span', { class: 'roster-detail muted clip' }, detail),
        h('span', { class: 'roster-side muted nowrap' }, when ? ago(when) : '')),
      done || st.queued ? h('div', { class: 'row gap between' },
        done ? h('span', { class: 'roster-last muted clip', title: plain(done.title) }, ic('clock', 12), 'Last job: ' + plain(done.title)) : h('span'),
        st.queued ? h('span', { class: 'spill', 'data-tone': 'blue' }, st.queued + ' queued') : null) : null));
}

const RANK = { working: 0, review: 1, queued: 1, idle: 2 };
function sortedRoles() {
  return store.roles.map((r, i) => ({ r, i, k: RANK[roleStatus(r.id).state] })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.r);
}

let shell = null;
let shellKey = null;

function build(param) {
  const roster = h('aside', { class: 'roster', 'aria-label': 'Team' });
  const conv = h('div', { class: 'conv' });
  const node = h('div', { class: 'messenger', 'data-open': param ? '1' : '0' }, roster, conv);
  let chat = null;
  if (param && store.roles.some((r) => r.id === param)) { chat = chatView(param, { back: true }); conv.append(chat.node); }
  else conv.append(h('div', { class: 'empty conv-empty' }, param ? 'Unknown teammate' : 'Pick a teammate to start a conversation.'));
  let sig = '';
  node.__update = () => {
    const working = store.tasks.filter((t) => t.state === 'working').length;
    const queued = store.tasks.filter((t) => t.state === 'queued').length;
    const need = store.asks.filter((a) => a.state === 'open').length;
    const s = JSON.stringify([working, queued, need, param, store.roles.map((r) => { const st = roleStatus(r.id); const l = store.threads[r.id]; return [r.id, st.state, st.queued, st.task?.title, l?.last?.id, l?.unread]; })]);
    if (s !== sig) {
      sig = s;
      roster.replaceChildren(
        h('div', { class: 'roster-head' }, h('h1', {}, 'Team'), h('p', { class: 'muted small' }, `${working} working · ${queued} queued · ${need} need you`)),
        h('div', { class: 'roster-list' }, sortedRoles().map((r) => rosterRow(r, r.id === param))));
    }
    if (chat) chat.update();
  };
  node.__update();
  return node;
}

export function render(param) {
  if (shell && shellKey === (param || '') && shell.isConnected) shell.__update();
  else { shell = build(param); shellKey = param || ''; }
  return shell;
}

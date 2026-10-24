// One conversation with one role: header, message list, typing row, composer.
// chatView() returns {node, update}; the owner view calls update() on every store change,
// so the composer is never rebuilt while you type.
import { h, store, api, act, ic, btn, empty, loadMessages, reloadMessages, markRead, avatar, roleById, roleLabel, roleStatus,
  engineOf, engineLabel, ago, fmtTime, statePill, openDrawer, upsert, notify, plain, imageFiles, mediaUrl, toast } from './core.js';
import { markdown } from './library.js';
import { openTaskDrawer, newTaskModal } from './tasks.js';
import { askCard, askUi } from './review.js';
import { attachments } from './taskform.js';

const drafts = {};
const draftAttach = {};
const STATUS_LABEL = { working: 'Working', queued: 'Queued', review: 'In review', idle: 'Idle' };

function taskChip(t) {
  const gate = t.createdBy === 'gate' || t.gateFor;
  return h('button', { type: 'button', class: 'inline-task', onclick: () => openTaskDrawer(t.id) },
    statePill(t.state),
    h('span', { class: 'grow clip' }, plain(t.title)),
    gate ? h('span', { class: 'tag ghost' }, 'gate') : null,
    t.attempt > 1 ? h('span', { class: 'tag ghost' }, 'attempt ' + t.attempt) : null,
    h('span', { class: 'muted nowrap' }, ago(t.endedAt || t.startedAt || t.createdAt)));
}

function openLessons(role) {
  const body = h('div', { class: 'stack' }, empty('Loading'));
  openDrawer(roleLabel(role) + ' lessons', body);
  api('GET', '/api/memory/' + encodeURIComponent(role)).then((r) => {
    const ls = r.lessons || [];
    body.replaceChildren(h('p', { class: 'muted' }, 'Short notes this agent recorded after earlier tasks. Every new brief for this role includes the newest ones.'),
      ls.length ? h('ul', { class: 'plain lessons' }, [...ls].reverse().map((l) => h('li', { class: 'lesson' }, h('span', { class: 'tag ghost' }, l.date), h('span', {}, l.text))))
        : empty('No lessons yet. Agents add them with hq_learn.'));
  }).catch((e) => body.replaceChildren(empty(e.message)));
}

export function chatView(role, { back = false } = {}) {
  const r = roleById(role);
  const label = roleLabel(role);
  const head = h('header', { class: 'chat-head' });
  const list = h('div', { class: 'chat-list', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation with ' + label });
  const typing = h('div', { class: 'typing-slot' });
  let arch = null; // a past chat being read: {id, label, messages}
  let headSig = ''; let listSig = ''; let typingSig = ''; let first = true; let stick = true;

  const attach = (draftAttach[role] ||= []);
  const chips = attachments(attach);
  const input = h('textarea', { class: 'textarea composer-input', rows: 1, maxlength: 20000, placeholder: `Message ${label}…`, 'aria-label': 'Message ' + label,
    oninput: (e) => { drafts[role] = e.target.value; grow(); },
    onpaste: (e) => { const f = imageFiles(e.clipboardData); if (f.length) { e.preventDefault(); chips.add(f); } },
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } } });
  input.value = drafts[role] || '';
  const picker = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, hidden: true, 'aria-hidden': 'true',
    onchange: (e) => { const f = [...e.target.files]; if (f.length) chips.add(f); e.target.value = ''; } });
  const dropOn = (el) => {
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', (e) => { const f = imageFiles(e.dataTransfer); if (f.length) { e.preventDefault(); chips.add(f); } });
  };
  dropOn(input);
  function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; }

  async function send() {
    const text = input.value.trim();
    if (!text && !attach.length) return;
    const body = { role, text: text || 'See the attached screenshot.' };
    if (attach.length) body.attachPaths = [...attach];
    const m = await act(() => api('POST', '/api/messages', body));
    if (!m) return;
    input.value = ''; drafts[role] = ''; attach.length = 0; chips.paint(); grow();
    if (m !== true && store.messages[role] && !store.messages[role].some((x) => x.id === m.id)) store.messages[role].push(m);
    stick = true;
    notify();
  }

  async function openPast() {
    const body = h('div', { class: 'stack' }, empty('Loading'));
    const close = openDrawer(label + ': past chats', body);
    try {
      const r = await api('GET', `/api/threads/${encodeURIComponent(role)}/archives`);
      const list2 = Array.isArray(r) ? r : r.archives || [];
      body.replaceChildren(list2.length ? h('div', { class: 'tlist' }, list2.map((a) => {
        const span = fmtTime(a.startedAt) + (a.endedAt ? ' to ' + fmtTime(a.endedAt) : '');
        return h('button', { type: 'button', class: 'trow', onclick: async () => {
          try {
            const m = await api('GET', `/api/messages?role=${encodeURIComponent(role)}&archive=${encodeURIComponent(a.id)}`);
            arch = { id: a.id, label: span, messages: Array.isArray(m) ? m : m.messages || [] };
            close(); listSig = ''; headSig = ''; update();
          } catch (e) { toast(e.message, 'error'); }
        } },
        h('span', { class: 'trow-main' }, h('span', { class: 'trow-title' }, plain(a.preview || 'Conversation')), h('span', { class: 'trow-meta muted' }, span + ' · ' + a.count + ' message' + (a.count === 1 ? '' : 's'))));
      })) : empty('No past chats yet. Start fresh archives the current conversation here.'));
    } catch (e) { body.replaceChildren(empty(e.message)); }
  }

  function paintHead() {
    const st = roleStatus(role);
    const e = engineOf(role);
    const sig = JSON.stringify([st.state, st.task?.id, st.task?.title, st.queued, e.engine, e.model, arch?.id || '']);
    if (sig === headSig) return;
    headSig = sig;
    head.replaceChildren(...[
      back ? h('a', { class: 'icon-btn back-btn', href: '#/team', 'aria-label': 'Back to the team list' }, ic('back', 18)) : null,
      avatar(role, 40),
      h('div', { class: 'chat-id' },
        h('h1', {}, label),
        h('div', { class: 'row gap muted small' }, h('span', { class: 'dot', 'data-on': st.state }), STATUS_LABEL[st.state],
          r?.job ? h('span', { class: 'clip hide-narrow' }, ' · ' + r.job) : null)),
      h('div', { class: 'chat-chips' },
        st.task ? h('button', { type: 'button', class: 'chip-btn cur', title: st.task.title, onclick: () => openTaskDrawer(st.task.id) }, ic('clock', 12), h('span', { class: 'clip' }, st.task.title)) : null,
        st.queued ? h('span', { class: 'chip-btn static' }, st.queued + ' queued') : null,
        h('span', { class: 'chip-btn static' }, ic('cpu', 12), engineLabel(e.engine) + (e.model ? ' / ' + e.model : ''))),
      h('div', { class: 'chat-actions' },
        btn('New task', () => newTaskModal(role), { kind: 'sm', icon: 'plus' }),
        btn('Lessons', () => openLessons(role), { kind: 'sm', icon: 'library' }),
        btn('Past chats', () => openPast(), { kind: 'sm', icon: 'clock' }),
        btn('Start fresh', async () => {
          if (await act(() => api('POST', `/api/messages/${encodeURIComponent(role)}/reset`, {}), 'Fresh conversation')) { await reloadMessages(role).catch(() => {}); stick = true; }
        }, { kind: 'sm', icon: 'refresh', title: 'Archives this conversation. It stays under Past chats.' }),
        st.task ? btn('Stop', () => { if (confirm('Stop the running task?')) act(() => api('POST', `/api/tasks/${st.task.id}/cancel`), 'Stopped'); }, { kind: 'sm danger', icon: 'stop' }) : null)].filter(Boolean));
  }

  function paintList() {
    if (arch) { paintArchive(); return; }
    const msgs = store.messages[role];
    if (!msgs) { if (listSig !== 'loading') { listSig = 'loading'; list.replaceChildren(empty('Loading')); } return; }
    const byMsg = new Map();
    for (const t of store.tasks) if (t.role === role && t.threadMessageId) (byMsg.get(t.threadMessageId) || byMsg.set(t.threadMessageId, []).get(t.threadMessageId)).push(t);
    const taskIds = new Map(store.tasks.map((t) => [t.id, t]));
    const asks = store.asks.filter((a) => a.state === 'open' && a.role === role && !a.superseded);
    const used = new Set();
    const rows = [];
    for (const m of msgs) {
      const cards = [...(byMsg.get(m.id) || [])];
      if (m.taskId && taskIds.has(m.taskId) && !cards.some((t) => t.id === m.taskId)) cards.push(taskIds.get(m.taskId));
      const fresh = cards.filter((t) => !used.has(t.id));
      fresh.forEach((t) => used.add(t.id));
      rows.push({ m, cards: fresh });
    }
    const sig = JSON.stringify([msgs.length, msgs[msgs.length - 1]?.id, rows.map((x) => x.cards.map((t) => [t.id, t.state, t.attempt, t.title])), asks.map((a) => a.id), askUi.v]);
    if (sig === listSig) return;
    listSig = sig;
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    const out = rows.map(({ m, cards }) => msgNode(m, cards));
    if (!out.length) out.push(empty(`No messages yet. Say what you need and ${label} picks it up in turn.`));
    for (const a of asks) out.push(h('div', { class: 'msg agent' }, avatar(role, 28), h('div', { class: 'msg-col wide' }, askCard(a))));
    list.replaceChildren(...out);
    if (first || stick || near) { list.scrollTop = list.scrollHeight; first = false; stick = false; }
  }

  function msgNode(m, cards) {
      if (m.from === 'system') return h('div', { class: 'divider' }, h('span', {}, m.text));
      const mine = m.from === 'owner';
      return h('div', { class: 'msg ' + (mine ? 'owner' : 'agent') },
        mine ? null : avatar(role, 28),
        h('div', { class: 'msg-col' },
          h('div', { class: 'bubble' }, mine ? h('div', { class: 'pre' }, m.text) : markdown(m.text),
            Array.isArray(m.attachPaths) && m.attachPaths.length ? h('div', { class: 'attach-grid' }, m.attachPaths.map((p) => h('a', { href: mediaUrl(p), target: '_blank', rel: 'noopener' }, h('img', { class: 'md-img', src: mediaUrl(p), alt: 'Attached screenshot', loading: 'lazy' })))) : null),
          cards.map(taskChip),
          h('div', { class: 'msg-meta muted' }, (mine ? 'You' : label) + ' · ' + ago(m.createdAt) + (ago(m.createdAt) === 'just now' ? '' : ' ago'))));
  }

  function paintArchive() {
    const sig = 'arch:' + arch.id + ':' + arch.messages.length;
    if (sig === listSig) return;
    listSig = sig;
    list.replaceChildren(h('div', { class: 'arch-banner' }, h('span', {}, 'Past chat: ' + arch.label), btn('Back to the current chat', () => { arch = null; listSig = ''; headSig = ''; stick = true; update(); }, { kind: 'sm primary', icon: 'back' })),
      ...(arch.messages.length ? arch.messages.map((m) => msgNode(m, [])) : [empty('This past chat is empty')]));
    list.scrollTop = 0;
  }

  function paintTyping() {
    const st = roleStatus(role);
    const sig = st.task ? st.task.id : '';
    if (sig === typingSig) return;
    typingSig = sig;
    typing.replaceChildren(st.task ? h('div', { class: 'typing', role: 'status' },
      h('span', { class: 'dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', {}, 'Working · a new message waits until the agent finishes')) : '');
    if (st.task) list.scrollTop = list.scrollHeight;
  }

  function update() {
    paintHead(); paintList(); paintTyping();
    input.disabled = !!arch; input.placeholder = arch ? 'Go back to the current chat to write' : `Message ${label}…`;
    if (node.isConnected && store.threads[role]?.unread > 0 && document.visibilityState === 'visible') markRead(role);
  }

  const node = h('section', { class: 'chat', 'aria-label': 'Conversation with ' + label }, head, list, typing,
    h('div', { class: 'composer-wrap' }, chips.node,
      h('div', { class: 'composer' },
        h('button', { type: 'button', class: 'btn icon', title: 'Add screenshots (or paste / drop them)', 'aria-label': 'Add screenshots (or paste / drop them)', onclick: () => picker.click() }, ic('image', 14)),
        picker, input, h('button', { type: 'button', class: 'btn primary', onclick: send, 'aria-label': 'Send' }, ic('send', 14), h('span', { class: 'hide-narrow' }, 'Send'))),
      h('div', { class: 'hint composer-hint' }, 'Enter or Ctrl+Enter to send · Shift+Enter for a new line · Ctrl+V pastes screenshots')));
  if (!store.messages[role]) loadMessages(role);
  update();
  setTimeout(() => { markRead(role); grow(); }, 0);
  return { node, update };
}

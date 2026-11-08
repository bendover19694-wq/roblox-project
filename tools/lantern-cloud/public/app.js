// DV Enterprises dashboard. Everything from the server or HQ is rendered with textContent, never innerHTML.
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  if (r.status === 401) {
    location.href = '/login';
    throw new Error('Signed out. Sign in again.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status}).`);
  return j;
}

let toastTimer;
function toast(msg, isErr = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast${isErr ? ' err' : ''}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4500);
}

function age(ms) {
  if (ms == null) return 'never';
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

function avatar(id) {
  const img = el('img', 'avatar');
  img.alt = '';
  img.width = 32;
  img.height = 32;
  img.src = /^[a-z0-9-]{1,40}$/.test(String(id)) ? `/avatars/${id}.png` : '/avatars/hq.png';
  img.addEventListener('error', () => { img.src = '/img/favicon.png'; }, { once: true });
  return img;
}

function empty(title, line) {
  const box = el('div', 'empty');
  box.append(el('strong', null, title), el('span', null, line));
  return box;
}

function emptyRow() {
  const li = el('li', 'empty-row');
  li.append(empty('No work in progress', 'Queue a task from the panel, or message the Lead.'));
  return li;
}

function fillSelect(sel, items, valueOf, labelOf, none) {
  const keep = sel.value;
  sel.replaceChildren(...(items.length ? items : [null]).map((it) => {
    const o = el('option', null, it ? labelOf(it) : none);
    o.value = it ? valueOf(it) : '';
    return o;
  }));
  if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

const money = (n) => (typeof n === 'number' && Number.isFinite(n) ? `$${n.toFixed(2)}` : '·');
const compact = (n) => (typeof n === 'number' ? (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(n)) : '·');

function render(s) {
  const snap = s.snapshot;
  const status = $('status');
  status.className = `status ${s.hqOnline ? 'on' : 'off'}`;
  status.lastElementChild.textContent = s.hqOnline ? `HQ online · ${age(s.snapshotAge)}` : snap ? `HQ offline · seen ${age(s.snapshotAge)}` : 'HQ not seen yet';

  const notes = [];
  if (s.missing?.length) notes.push(`Not configured yet: ${s.missing.join(', ')}.`);
  if (s.bot && !s.bot.connected) notes.push('The Discord bot is reconnecting.');
  $('notice').textContent = notes.join(' ');
  $('notice').hidden = !notes.length;

  const roles = snap?.roles || [];
  const roleName = (id) => roles.find((r) => r.id === id)?.label || id;
  const active = (snap?.tasks || []).filter((t) => ['working', 'queued', 'review'].includes(t.state));
  const working = active.filter((t) => t.state === 'working').length;
  const asks = snap?.asks || [];

  const h = $('headline');
  if (!snap) h.textContent = 'Waiting for HQ to check in';
  else if (asks.length) h.textContent = `${asks.length} ${asks.length === 1 ? 'thing needs' : 'things need'} you, ${working} ${working === 1 ? 'agent is' : 'agents are'} working`;
  else if (working) h.textContent = `${working} ${working === 1 ? 'agent is' : 'agents are'} working. Nothing needs you.`;
  else h.textContent = 'All quiet. Nothing needs you.';

  $('statWorking').textContent = snap ? String(working) : '·';
  $('statAsks').textContent = snap ? String(asks.length) : '·';
  $('statSpend').textContent = money(snap?.spend?.totalUsd);
  $('statTokens').textContent = compact(s.groq?.tokens ?? 0);
  $('asksCount').textContent = asks.length ? String(asks.length) : '';
  $('tasksCount').textContent = active.length ? String(active.length) : '';

  $('asks').replaceChildren(...(asks.length ? asks.map((a) => {
    const box = el('article', 'ask reveal');
    const top = el('div', 'ask-top');
    const who = el('div');
    who.append(el('div', 'ask-title', a.title), el('span', 't-role', roleName(a.role)));
    top.append(avatar(a.role), who);
    box.append(top);
    if (a.why) box.append(el('p', 'ask-why', String(a.why).slice(0, 400)));
    const row = el('div', 'options');
    const canAnswer = s.me?.role === 'owner';
    for (const o of a.options || []) {
      const b = el(canAnswer ? 'button' : 'div', canAnswer ? 'opt' : 'opt-ro', o.label + (o.recommended ? ' (Recommended)' : ''));
      if (o.description) b.append(el('span', 'opt-desc', String(o.description).slice(0, 300)));
      if (!canAnswer) { row.append(b); continue; }
      b.type = 'button';
      b.addEventListener('click', async () => {
        b.disabled = true;
        if (await send({ type: 'answer', askId: a.id, answer: o.id }, `Answered "${o.label}". HQ applies it when online.`)) row.querySelectorAll('button').forEach((x) => (x.disabled = true));
        else b.disabled = false;
      });
      row.append(b);
    }
    if (row.childElementCount) box.append(row);
    else box.append(el('p', 'fine', 'Answer this one in the agent\'s Discord thread.'));
    if ((a.options || []).some((o) => o.mediaPath)) box.append(el('p', 'fine', 'Preview images are in the Discord thread.'));
    if (!canAnswer) box.append(el('p', 'fine', 'Only Voltage can answer this.'));
    return box;
  }) : [empty('Nothing needs you', 'When an agent asks a question or wants a review, it shows up here and in Discord.')]));

  $('tasks').replaceChildren(...(active.length ? active.map((t) => {
    const li = el('li', 'reveal');
    const mid = el('div');
    mid.append(el('span', 't-title', t.title), el('span', 't-role', roleName(t.role) + (t.game ? ` · ${t.game}` : '')));
    li.append(avatar(t.role), mid, el('span', `flag ${t.state}`, t.state));
    return li;
  }) : [emptyRow()]));

  renderStudio(s, snap);
  fillSelect($('msgRole'), roles, (r) => r.id, (r) => r.label, 'Waiting for HQ');
  fillSelect($('taskRole'), roles, (r) => r.id, (r) => r.label, 'Waiting for HQ');
  fillSelect($('taskGame'), [{ slug: '', name: 'Any game' }, ...(snap?.games || [])], (g) => g.slug, (g) => g.name, 'Any game');
}

function renderStudio(s, snap) {
  const me = s.me || {};
  const isOwner = me.role === 'owner';
  $('who').textContent = me.name || '';
  $('hqVoltage').textContent = s.hqOnline ? 'Online' : snap ? `Offline · seen ${age(s.snapshotAge)}` : 'Not seen yet';
  const link = snap?.link;
  const log = Array.isArray(link?.log) ? link.log : [];
  const lastIn = log.filter((r) => r.dir === 'in').map((r) => Date.parse(r.at)).filter(Number.isFinite).sort((x, y) => y - x)[0];
  const paired = (link?.peers || []).length > 0;
  $('hqDitto').textContent = !link ? 'Not linked' : lastIn ? `Paired · last seen ${age(Date.now() - lastIn)}` : paired ? 'Paired · no messages yet' : 'Not paired';
  $('collabCount').textContent = log.length ? String(log.length) : '';
  $('feed').replaceChildren(...(log.length ? log.slice().reverse().map((r) => {
    return feedItem(r);
  }) : [empty('No shared work yet', 'Chat and shared tasks between the two HQs show up here.')]));
  $('linkPanel').hidden = !isOwner;
  $('proposePanel').hidden = me.role !== 'collab';
  for (const id of ['tabMsg', 'tabTask']) $(id).hidden = !isOwner;
  renderStudioBrief(snap, log);
  renderCollab(snap, log);
}

function feedItem(r) {
  const li = el('li', r.dir === 'in' ? 'in' : 'out');
  const t = r.kind === 'task' ? `Task: ${r.title || r.ref || ''}${r.state ? ` (${r.state})` : ''}` : r.kind === 'status' ? `Status: ${r.text || r.state || ''}` : r.text || '';
  li.append(el('span', 't-role', `${r.dir === 'in' ? r.from || "Ditto's HQ" : 'You'} · ${age(Date.now() - Date.parse(r.at))}`), el('span', 't-title', String(t).slice(0, 600)));
  return li;
}

function renderStudioBrief(snap, log) {
  const asks = snap?.asks || [];
  $('briefAsks').replaceChildren(...(asks.length ? asks.slice(0, 5).map((a) => {
    const li = el('li');
    li.append(el('span', 't-title', a.title), el('span', 't-role', String(a.role || '')));
    return li;
  }) : [empty('Nothing needs you', 'Questions and reviews from agents appear here.')]));
  $('briefFeed').replaceChildren(...(log.length ? log.slice(-5).reverse().map(feedItem) : [empty('No shared work yet', 'Chat and shared tasks show up here.')]));
}

function renderCollab(snap, log) {
  const pa = snap?.partnerAccess;
  const auto = Array.isArray(pa?.autoRoles) ? pa.autoRoles.filter((r) => typeof r === 'string') : [];
  const used = Number.isFinite(pa?.usedToday) ? pa.usedToday : 0;
  const limit = Number.isFinite(pa?.dailyLimit) ? pa.dailyLimit : 0;
  const left = Math.max(0, limit - used);
  const open = Boolean(pa?.enabled) && left > 0;
  $('accessLine').textContent = !pa ? 'Waiting for HQ to share how partner access is set.' : !pa.enabled ? "Partner access is off: every request waits for Voltage's OK." : `Runs right away: ${auto.join(', ') || 'none'}. Used today: ${used} of ${limit}. Voltage changes this in HQ Settings, partnerAccess.`;
  $('quota').textContent = pa ? `${used}/${limit} today` : '';
  const tasks = log.filter((r) => r.kind === 'task');
  $('ptCount').textContent = tasks.length ? String(tasks.length) : '';
  $('partnerTasks').replaceChildren(...(tasks.length ? tasks.slice().reverse().map(feedItem) : [empty('No partner tasks yet', 'Tasks sent either way show their status here.')]));
  const roles = (snap?.roles || []).map((r) => r?.id).filter((id) => typeof id === 'string' && id);
  const ids = [...new Set([...auto, ...roles])];
  const sel = $('proposeRole');
  const keep = sel.value;
  const opts = [{ id: '', note: 'Let Voltage choose' }, ...ids.map((id) => ({ id, note: open && auto.includes(id) ? `runs right away (${left} of ${limit} left today)` : "needs Voltage's OK" }))];
  sel.replaceChildren(...opts.map((r) => {
    const o = el('option', null, r.id ? `${r.id} · ${r.note}` : r.note);
    o.value = r.id;
    o.dataset.note = r.note;
    return o;
  }));
  if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
  $('roleNote').textContent = sel.selectedOptions[0]?.dataset.note || '';
}

async function send(cmd, okMsg) {
  try {
    await api(cmd.type === 'relay' ? '/api/propose' : '/api/command', cmd);
    toast(okMsg || 'Sent. HQ runs it as soon as it is online.');
    return true;
  } catch (e) {
    toast(e.message, true);
    return false;
  }
}

async function refresh() {
  try {
    render(await api('/api/state'));
  } catch (e) {
    $('status').lastElementChild.textContent = 'Connection problem';
  }
}

// tabs, with arrow-key movement
const tabs = ['tabChat', 'tabMsg', 'tabTask'].map($);
function select(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  }
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t));
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    select(next);
    next.focus();
  });
});

$('msgForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const b = e.submitter;
  if (b) b.disabled = true;
  if (await send({ type: 'message', role: $('msgRole').value, text: $('msgText').value.trim() }, 'Message sent to the agent.')) $('msgText').value = '';
  if (b) b.disabled = false;
});

$('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const b = e.submitter;
  if (b) b.disabled = true;
  const cmd = { type: 'task', role: $('taskRole').value, title: $('taskTitle').value.trim(), body: $('taskBody').value.trim() };
  if ($('taskGame').value) cmd.game = $('taskGame').value;
  if (await send(cmd, 'Task queued.')) {
    $('taskTitle').value = '';
    $('taskBody').value = '';
  }
  if (b) b.disabled = false;
});

const ROLE_ID = /^[a-z][a-z0-9-]{0,29}$/;
$('linkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (await send({ type: 'link-chat', text: $('linkText').value.trim() }, "Sent to Ditto's HQ.")) $('linkText').value = '';
});
$('askForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const role = $('askRole').value.trim().toLowerCase();
  if (role && !ROLE_ID.test(role)) return toast('Agent must be a role id like scout or designer.', true);
  const cmd = { type: 'link-task', title: $('askTitle').value.trim(), body: $('askBody').value.trim(), ...(role && { role }) };
  if (await send(cmd, "Asked Ditto's agents.")) { $('askTitle').value = ''; $('askBody').value = ''; }
});
$('proposeRole').addEventListener('change', () => { $('roleNote').textContent = $('proposeRole').selectedOptions[0]?.dataset.note || ''; });
$('proposeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const role = $('proposeRole').value;
  const note = $('roleNote').textContent;
  if (await send({ type: 'relay', text: $('proposeText').value.trim(), ...(role && { role }) }, `Sent. ${role ? `${role}: ${note}.` : 'Voltage decides who takes it.'}`)) $('proposeText').value = '';
});

// sections: hash routes, no reload
const SECTIONS = ['studio', 'hq', 'collab'];
function route() {
  const name = SECTIONS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'studio';
  for (const n of SECTIONS) {
    document.querySelector(`.sec[data-sec="${n}"]`).hidden = n !== name;
    const a = document.querySelector(`.nav a[data-sec="${n}"]`);
    if (n === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', route);
route();

function bubble(who, text) {
  const b = el('div', `bubble ${who}`, text);
  const chat = $('chat');
  chat.querySelector('.hint')?.remove();
  chat.append(b);
  chat.scrollTop = chat.scrollHeight;
  return b;
}

$('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('chatText').value.trim();
  if (!text) return;
  $('chatText').value = '';
  bubble('me', text);
  const wait = bubble('bot thinking', 'Thinking…');
  try {
    const r = await api('/api/chat', { text });
    wait.classList.remove('thinking');
    wait.textContent = r.reply;
    if (r.command) {
      const btn = el('button', 'primary act', `Do it: ${r.command.type}${r.command.role ? ` for ${r.command.role}` : ''}`);
      btn.type = 'button';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        if (await send(r.command)) btn.textContent = 'Sent';
        else btn.disabled = false;
      });
      wait.append(el('br'), btn);
    }
  } catch (err) {
    wait.classList.remove('thinking');
    wait.textContent = err.message;
  }
});

refresh();
setInterval(refresh, 10000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

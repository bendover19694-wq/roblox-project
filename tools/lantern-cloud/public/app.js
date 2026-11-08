// Dashboard client. All server and snapshot text is rendered with textContent, never innerHTML.
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (r.status === 401) {
    location.href = '/login';
    throw new Error('login required');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `request failed (${r.status})`);
  return j;
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4000);
}

function age(ms) {
  if (ms == null) return 'never';
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s ago`;
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

function avatar(id) {
  const img = el('img', 'avatar');
  img.alt = '';
  if (/^[a-z0-9-]{1,40}$/.test(String(id))) img.src = `/avatars/${id}.png`;
  img.addEventListener('error', () => (img.hidden = true));
  return img;
}

function fillSelect(sel, items, valueOf, labelOf, empty) {
  const keep = sel.value;
  sel.replaceChildren(...(items.length ? items : [null]).map((it) => {
    const o = el('option', null, it ? labelOf(it) : empty);
    o.value = it ? valueOf(it) : '';
    return o;
  }));
  if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

function render(s) {
  const snap = s.snapshot;
  const pill = $('status');
  pill.textContent = s.hqOnline ? `HQ online, updated ${age(s.snapshotAge)}` : snap ? `HQ offline, last seen ${age(s.snapshotAge)}` : 'HQ offline, no snapshot yet';
  pill.className = `pill ${s.hqOnline ? 'on' : 'off'}`;

  const notes = [];
  if (s.missing?.length) notes.push(`Not configured yet: ${s.missing.join(', ')}.`);
  if (!s.bot?.connected) notes.push('Discord bot is not connected.');
  $('notice').textContent = notes.join(' ');
  $('notice').hidden = !notes.length;

  const roles = snap?.roles || [];
  const roleName = (id) => roles.find((r) => r.id === id)?.label || id;
  const tasks = (snap?.tasks || []).filter((t) => t.state === 'working' || t.state === 'queued' || t.state === 'review');
  $('tasks').replaceChildren(...(tasks.length ? tasks : [null]).map((t) => {
    const li = el('li');
    if (!t) return Object.assign(li, { textContent: 'Nothing running.', className: 'muted' });
    li.append(avatar(t.role), el('span', 'grow', t.title), el('span', 'tag', `${roleName(t.role)} · ${t.state}`));
    return li;
  }));

  const asks = snap?.asks || [];
  $('asks').replaceChildren(...(asks.length ? asks : [null]).map((a) => {
    if (!a) return el('p', 'muted', 'No open asks.');
    const box = el('div', 'ask');
    box.append(el('strong', null, a.title), el('span', 'tag', roleName(a.role)));
    const row = el('div', 'row wrap');
    for (const o of a.options || []) {
      const b = el('button', null, o.label);
      b.type = 'button';
      b.addEventListener('click', () => send({ type: 'answer', askId: a.id, answer: o.id }, `Answered "${o.label}"`));
      row.append(b);
    }
    box.append(row);
    return box;
  }));

  fillSelect($('msgRole'), roles, (r) => r.id, (r) => r.label, 'No roles yet');
  fillSelect($('taskRole'), roles, (r) => r.id, (r) => r.label, 'No roles yet');
  fillSelect($('taskGame'), [{ slug: '', name: 'No game' }, ...(snap?.games || [])], (g) => g.slug, (g) => g.name, 'No game');

  const spend = snap?.spend ? JSON.stringify(snap.spend) : 'no HQ spend data';
  $('usage').textContent = `HQ spend: ${spend}. Groq: ${s.groq?.requests ?? 0} requests, ${s.groq?.tokens ?? 0} tokens${s.groq?.configured ? '' : ' (Groq not configured)'}.`;
}

async function send(cmd, okMsg) {
  try {
    await api('/api/command', cmd);
    toast(okMsg || 'Command sent. HQ runs it when it is online.');
    return true;
  } catch (e) {
    toast(e.message);
    return false;
  }
}

async function refresh() {
  try {
    render(await api('/api/state'));
  } catch (e) {
    $('status').textContent = e.message;
  }
}

$('msgForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (await send({ type: 'message', role: $('msgRole').value, text: $('msgText').value })) $('msgText').value = '';
});

$('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cmd = { type: 'task', role: $('taskRole').value, title: $('taskTitle').value, body: $('taskBody').value };
  if ($('taskGame').value) cmd.game = $('taskGame').value;
  if (await send(cmd)) {
    $('taskTitle').value = '';
    $('taskBody').value = '';
  }
});

function bubble(who, text) {
  const b = el('div', `bubble ${who}`, text);
  $('chat').append(b);
  $('chat').scrollTop = $('chat').scrollHeight;
  return b;
}

$('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('chatText').value.trim();
  if (!text) return;
  $('chatText').value = '';
  bubble('me', text);
  try {
    const r = await api('/api/chat', { text });
    const b = bubble('bot', r.reply);
    if (r.command) {
      const btn = el('button', null, `Send: ${r.command.type}`);
      btn.type = 'button';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await send(r.command);
      });
      b.append(el('br'), btn);
    }
  } catch (err) {
    bubble('bot', err.message);
  }
});

refresh();
setInterval(refresh, 10000);

// Phone chat view. Uses the same APIs as the desktop composer: /api/command (owner message), /api/propose (collaborator request), /api/chat (assistant).
// Agent replies are not exposed by any API, so the feed shows what you sent, the assistant's answers and delivery notes.
const ASSISTANT = 'assistant';
const KEEP = 40;
let target = ASSISTANT;
let who = { name: '', owner: false };
let agents = [];
const feeds = new Map();

const storeKey = (t) => `dvchat:${who.name}:${t}`;
function load(t) {
  const k = storeKey(t);
  if (!feeds.has(k)) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(k) || '[]'); } catch { /* storage blocked: memory only */ }
    feeds.set(k, Array.isArray(list) ? list.filter((m) => m && typeof m.text === 'string') : []);
  }
  return feeds.get(k);
}
function push(t, kind, text) {
  const list = load(t);
  list.push({ kind, text: String(text).slice(0, 2000), at: Date.now() });
  if (list.length > KEEP) list.splice(0, list.length - KEEP);
  try { localStorage.setItem(storeKey(t), JSON.stringify(list)); } catch { /* ignore */ }
  if (t === target) drawFeed();
}

function drawFeed() {
  const box = $('mfeed');
  const list = load(target);
  box.replaceChildren(...(list.length
    ? list.map((m) => el('div', `bubble ${m.kind === 'me' ? 'me' : m.kind === 'sys' ? 'sys' : 'bot'}`, m.text))
    : [empty('No messages yet', target === ASSISTANT ? 'Ask what is running, what needs you, or what HQ has spent.' : 'Write below. It lands in the agent thread.')]));
  box.scrollTop = box.scrollHeight; // newest at the bottom
}

function drawAgents() {
  const items = [{ id: ASSISTANT, label: 'Assistant' }, ...agents];
  if (!items.some((a) => a.id === target)) target = ASSISTANT;
  $('agentList').replaceChildren(...items.map((a) => {
    const b = el('button', 'agent', a.label);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(a.id === target));
    b.addEventListener('click', () => { target = a.id; drawAgents(); drawFeed(); $('mText').focus(); });
    if (a.id !== ASSISTANT) b.prepend(avatar(a.id));
    return b;
  }));
  const label = items.find((a) => a.id === target)?.label || '';
  $('chatWho').textContent = target === ASSISTANT
    ? 'Answers come from the latest HQ state, even while your PC is off.'
    : who.owner ? `Message goes to ${label}'s Discord thread. It runs as soon as HQ is online.` : `A request to ${label}. It runs right away or waits for Voltage's OK.`;
  $('mText').placeholder = target === ASSISTANT ? 'Ask the assistant' : `Message ${label}`;
}

window.mobileRender = (s, roles) => {
  const next = { name: s.me?.name || '', owner: s.me?.role === 'owner' };
  const changed = next.name !== who.name || roles.map((r) => r.id).join() !== agents.map((r) => r.id).join();
  who = next;
  agents = roles.map((r) => ({ id: r.id, label: r.label || r.id }));
  if (changed) { drawAgents(); drawFeed(); }
};
drawAgents();
drawFeed();

function fit() {
  const t = $('mText');
  t.style.height = 'auto';
  t.style.height = `${Math.min(t.scrollHeight, 140)}px`;
}

function offer(cmd) { // the assistant suggests an action; nothing runs until this button is pressed
  const b = el('button', 'primary act', `Do it: ${cmd.type}${cmd.role ? ` for ${cmd.role}` : ''}`);
  b.type = 'button';
  b.addEventListener('click', async () => {
    b.disabled = true;
    if (await send(cmd)) b.textContent = 'Sent';
    else b.disabled = false;
  });
  $('mfeed').lastElementChild?.append(el('br'), b);
}

async function submit() {
  const text = $('mText').value.trim();
  if (!text) return;
  const t = target;
  const btn = $('mSend');
  btn.disabled = true;
  $('mText').value = '';
  fit();
  push(t, 'me', text);
  try {
    if (t === ASSISTANT) {
      const r = await api('/api/chat', { text });
      push(t, 'bot', r.reply);
      if (r.command && t === target) offer(r.command);
    } else {
      await api(who.owner ? '/api/command' : '/api/propose', who.owner ? { type: 'message', role: t, text } : { type: 'relay', text, role: t });
      push(t, 'sys', who.owner ? 'Sent.' : 'Request sent.');
    }
  } catch (err) {
    push(t, 'sys', `Not sent: ${err.message}`);
    if (!$('mText').value) { $('mText').value = text; fit(); } // keep the draft so it can be retried
  }
  btn.disabled = false;
}

$('mText').addEventListener('input', fit);
$('mText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('mForm').requestSubmit(); }
});
$('mForm').addEventListener('submit', (e) => { e.preventDefault(); submit(); });

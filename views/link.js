// HQ Link page: pair with a friend's HQ, talk to it, and share tasks. Shared tasks land in the other owner's Review.
import { h, api, act, btn, empty, field, pageHead, ago, notify } from './core.js';

let data;
let timer = null;
const form = { botToken: '', channelId: '', name: '', invite: '', text: '', title: '', body: '' };

async function load() {
  try { data = await api('GET', '/api/link'); } catch { data = data ?? null; }
  notify();
}

const input = (key, attrs = {}) => h('input', {
  class: 'input', value: form[key], oninput: (e) => { form[key] = e.target.value; }, ...attrs,
});
const box = (key, attrs = {}) => h('textarea', {
  class: 'input', rows: 3, oninput: (e) => { form[key] = e.target.value; }, ...attrs,
}, form[key]);

async function send(path, body, clear, msg) {
  const r = await act(() => api('POST', path, body), msg);
  if (r) { clear.forEach((k) => { form[k] = ''; }); await load(); }
}

const setupCard = () => h('section', { class: 'card stack' },
  h('h2', {}, '1. Connect your bot'),
  h('p', { class: 'muted' }, 'Each HQ uses its own Discord bot, in a channel both bots can read. Turn on Message Content in the bot settings. The token stays on this PC.'),
  field('Your name', input('name', { placeholder: data.name || 'What the other HQ calls you' })),
  field('Bot token', input('botToken', { type: 'password', autocomplete: 'off', placeholder: data.hasToken ? 'Saved' : 'Paste the token' })),
  field('Channel id', input('channelId', { placeholder: data.channelId || 'Only needed by the first person' }), 'Right-click the channel in Discord, then Copy Channel ID.'),
  btn('Save', () => send('/api/link/setup', { botToken: form.botToken || undefined, channelId: form.channelId || undefined, name: form.name || undefined }, ['botToken'], 'Saved'), { kind: 'primary' }));

const pairCard = () => h('section', { class: 'card stack' },
  h('h2', {}, '2. Swap invites'),
  data.invite ? [
    field('Your invite', h('input', { class: 'input', readonly: true, value: data.invite }), 'Send this to your friend. It holds no secrets.'),
    btn('Copy', () => navigator.clipboard.writeText(data.invite)),
  ] : h('p', { class: 'muted' }, 'Your invite appears here once your bot and channel are saved.'),
  field("Your friend's invite", input('invite', { placeholder: 'HQL1...' })),
  btn('Pair', () => send('/api/link/join', { invite: form.invite }, ['invite'], 'Paired'), { kind: 'primary' }));

const entry = (e) => h('div', { class: 'row gap' },
  h('strong', {}, e.dir === 'in' ? e.from : `You (${e.from})`),
  h('span', { class: 'muted' }, e.kind === 'task' ? 'shared a task' : e.kind === 'status' ? 'update' : ''),
  h('span', {}, e.text),
  h('span', { class: 'muted' }, ago(e.at)));

const talkCard = () => h('section', { class: 'card stack' },
  h('h2', {}, 'Talk'),
  h('p', { class: 'muted' }, data.note),
  data.log.length ? data.log.slice(-40).reverse().map(entry) : empty('Nothing yet.'),
  field('Message', box('text')),
  btn('Send', () => send('/api/link/say', { text: form.text }, ['text']), { kind: 'primary' }));

const shareCard = () => h('section', { class: 'card stack' },
  h('h2', {}, 'Share a task'),
  h('p', { class: 'muted' }, "It goes to the other owner's Review. It only runs if they accept it, and you hear how it ends."),
  field('Title', input('title')),
  field('Details', box('body')),
  btn('Share', () => send('/api/link/share', { title: form.title, body: form.body }, ['title', 'body'], 'Shared'), { kind: 'primary' }));

const peersCard = () => h('section', { class: 'card stack' },
  h('h2', {}, 'Paired with'),
  data.peers.map((p) => h('div', { class: 'row gap' }, h('strong', {}, p.name),
    btn('Unpair', () => send('/api/link/unpair', { id: p.id }, [], 'Unpaired'), { kind: 'ghost' }))),
  h('p', { class: 'muted' }, data.error ? `Problem: ${data.error}` : data.lastPoll ? `Last checked ${ago(data.lastPoll)}` : 'Waiting for the first check.'));

export function render() {
  if (data === undefined) load();
  clearInterval(timer);
  timer = setInterval(() => {
    if (!location.hash.startsWith('#/link')) clearInterval(timer);
    else if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) load(); // never redraw under someone typing
  }, 15000);
  if (!data) return h('div', { class: 'page' }, pageHead('HQ Link', 'Work with another HQ'), empty('Loading.'));
  return h('div', { class: 'page' },
    pageHead('HQ Link', 'Work with another HQ over Discord. No ports are opened.', btn('Check now', () => send('/api/link/poll', {}, []))),
    data.peers.length ? [peersCard(), talkCard(), shareCard(), pairCard()] : [setupCard(), pairCard()]);
}

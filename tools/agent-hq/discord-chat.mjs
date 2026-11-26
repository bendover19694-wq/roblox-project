// Discord chat for the hub's Chat page: reads the text channels of the HQ Link server with the owner's own bot and returns
// a simplified conversation (mentions turned into names, markdown stripped, long posts shortened, HQ machine posts folded,
// one person's back-to-back messages grouped). Owner only: the bot token never leaves this process, and only channels of
// the HQ Link channel's own server can be read. Read only: nothing is posted from here.
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://discord.com/api/v10';
const SNOWFLAKE = /^\d{15,25}$/;
const GROUP_MS = 5 * 60_000;
const SHORT = 220;

const MACHINE = /^`?(HQ1|HQSTATE1)[ .]/;
const UPDATE = /^\*\*Agent HQ update\*\*/;

/** One Discord message -> { id, at, author, bot, kind: 'chat'|'sync'|'update', text, full, replyTo }. */
export function simplify(m, names = {}) {
  const author = m.member?.nick || m.author?.global_name || m.author?.username || 'someone';
  const base = { id: m.id, at: m.timestamp, author, authorId: m.author?.id ?? '', bot: !!m.author?.bot, replyTo: m.referenced_message ? (m.referenced_message.member?.nick || m.referenced_message.author?.global_name || m.referenced_message.author?.username || '') : '' };
  const raw = String(m.content || '');
  if (MACHINE.test(raw)) return { ...base, kind: 'sync', text: 'HQ sync message', full: '' };
  let t = raw || (m.embeds || []).map((e) => [e.title, e.description].filter(Boolean).join(': ')).join(' ');
  const users = Object.fromEntries((m.mentions || []).map((u) => [u.id, u.global_name || u.username]));
  t = t.replace(/<@!?(\d+)>/g, (_, id) => '@' + (users[id] || names[id] || 'someone'))
    .replace(/<@&(\d+)>/g, (_, id) => '@' + (names[id] || 'role'))
    .replace(/<#(\d+)>/g, (_, id) => '#' + (names[id] || 'channel'))
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*|__|~~/g, '')
    .replace(/https?:\/\/\S+/g, (u) => u.replace(/^https?:\/\/(www\.)?/, '').split(/[/?#]/)[0] + '/…')
    .replace(/\s+/g, ' ').trim();
  if (m.attachments?.length) t += `${t ? ' ' : ''}[${m.attachments.length} file${m.attachments.length > 1 ? 's' : ''}]`;
  const full = t.slice(0, 2000);
  let text = full;
  if (text.length > SHORT) { const cut = text.slice(0, SHORT); const dot = cut.search(/[.!?](\s|$)[^.!?]*$/); text = (dot > 80 ? cut.slice(0, dot + 1) : cut.replace(/\s+\S*$/, '')) + ' …'; }
  return { ...base, kind: UPDATE.test(raw) ? 'update' : 'chat', text: text || '(empty)', full: full !== text ? full : '' };
}

/** Oldest first; one author's messages within 5 minutes become one item, runs of HQ sync posts become one line. */
export function group(msgs) {
  const out = [];
  for (const s of msgs) {
    const prev = out.at(-1);
    if (prev && s.kind === 'sync' && prev.kind === 'sync') { prev.count += 1; prev.at = s.at; continue; }
    if (prev && s.kind !== 'sync' && prev.kind !== 'sync' && prev.authorId === s.authorId && Date.parse(s.at) - Date.parse(prev.at) < GROUP_MS) {
      const last = prev.lines.at(-1);
      if (last.text === s.text) { last.n = (last.n || 1) + 1; prev.at = s.at; continue; } // the same words again: one line, ×n
      prev.lines.push({ id: s.id, text: s.text, full: s.full, kind: s.kind, replyTo: s.replyTo }); prev.at = s.at; continue;
    }
    out.push(s.kind === 'sync' ? { kind: 'sync', at: s.at, count: 1, author: 'HQ sync', authorId: '', bot: true, lines: [] }
      : { kind: 'chat', at: s.at, author: s.author, authorId: s.authorId, bot: s.bot, lines: [{ id: s.id, text: s.text, full: s.full, kind: s.kind, replyTo: s.replyTo }] });
  }
  return out;
}

export function createDiscordChat({ db, D, stateDir, fetchImpl = globalThis.fetch, now = Date.now }) {
  const token = () => { try { const t = fs.readFileSync(path.join(stateDir, 'link-token'), 'utf8').trim(); if (t) return t; } catch { /* env */ } return process.env.DISCORD_BOT_TOKEN || ''; };
  const linkChannel = () => D.getSetting(db, 'link', {})?.channelId || '';
  async function discord(route) {
    const tok = token();
    if (!tok) throw new Error('HQ Link has no bot yet: set it up on the HQ Link page');
    const r = await fetchImpl(API + route, { headers: { Authorization: `Bot ${tok}`, 'User-Agent': 'DiscordBot (agent-hq, 1)' } });
    if (!r.ok) throw new Error(`Discord answered ${r.status}`);
    return r.json();
  }
  let cache = { at: 0, guild: '', channels: [], names: {} };
  async function channels() {
    if (now() - cache.at < 5 * 60_000 && cache.channels.length) return cache;
    const ch = linkChannel();
    if (!SNOWFLAKE.test(ch)) throw new Error('HQ Link is not set up yet');
    const guild = (await discord(`/channels/${ch}`)).guild_id;
    const all = await discord(`/guilds/${guild}/channels`);
    let roles = []; try { roles = await discord(`/guilds/${guild}/roles`); } catch { /* names only */ }
    const text = all.filter((c) => c.type === 0 || c.type === 5)
      .sort((a, b) => (BigInt(b.last_message_id || 0) > BigInt(a.last_message_id || 0) ? 1 : -1))
      .map((c) => ({ id: c.id, name: c.name, link: c.id === ch }));
    cache = { at: now(), guild, channels: text, names: Object.fromEntries([...all.map((c) => [c.id, c.name]), ...roles.map((r) => [r.id, r.name])]) };
    return cache;
  }
  async function chat(channelId, limit = 60) {
    const c = await channels();
    const id = channelId || (c.channels.find((x) => x.name === 'ditto-collab') || c.channels[0] || {}).id;
    const pick = c.channels.find((x) => x.id === id);
    if (!pick) throw new Error('that channel is not in the HQ Link server');
    const raw = await discord(`/channels/${pick.id}/messages?limit=${Math.min(100, Math.max(10, limit))}`);
    const msgs = raw.filter((m) => m.type === 0 || m.type === 19).reverse().map((m) => simplify(m, c.names));
    const me = D.getSetting(db, 'link', {})?.botId || '';
    return { channel: pick, channels: c.channels, items: group(msgs), me: me ? [me] : [], fetchedAt: new Date(now()).toISOString() };
  }
  return { channels, chat };
}

export function mountDiscordChat(route, chat, { HttpError }) {
  const run = async (fn) => { try { return await fn(); } catch (e) { throw new HttpError(502, e.message); } };
  route('GET', /^\/api\/discord\/channels$/, () => run(async () => (await chat.channels()).channels));
  route('GET', /^\/api\/discord\/chat$/, ({ query }) => run(() => chat.chat(SNOWFLAKE.test(query.get('channel') || '') ? query.get('channel') : '', Number(query.get('limit')) || 60)));
}

export const DISCORD_CHAT_OWNER_ONLY = [['GET', /^\/api\/discord\/(?:channels|chat)$/]];

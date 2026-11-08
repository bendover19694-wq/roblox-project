// Reads HQ's snapshot from Discord, and validates/posts commands per the wire contract.
import { randomBytes } from 'node:crypto';

const CACHE_MS = 60_000;
const ONLINE_MS = 10 * 60_000;
const MAX_BYTES = 512 * 1024;
const CDN_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net']);

export function createHqState({ discord, channelId, fetch: f = globalThis.fetch, now = Date.now } = {}) {
  let cache = null; // {snapshot, msgAt, fetchedAt}
  let lastFetchAt = 0;

  async function load() {
    const id = await discord.botId();
    const msgs = await discord.rest('GET', `/channels/${channelId}/messages?limit=50`);
    const msg = (msgs || []).find((m) => m?.author?.id === id && !m.webhook_id && typeof m.content === 'string' && m.content.startsWith('HQSTATE1 '));
    if (!msg) return { snapshot: null, msgAt: 0 };
    const att = (msg.attachments || []).find((a) => a?.filename === 'state.json');
    if (!att || Number(att.size) > MAX_BYTES) return { snapshot: null, msgAt: 0 };
    const url = new URL(att.url);
    if (url.protocol !== 'https:' || !CDN_HOSTS.has(url.hostname)) throw new Error('snapshot attachment host not allowed');
    const res = await f(url.href);
    if (!res.ok) throw new Error(`snapshot download failed (${res.status})`);
    // ponytail: reads the whole body before checking size; the attachment size is pre-checked above.
    const text = await res.text();
    if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('snapshot too large');
    const snapshot = JSON.parse(text);
    if (!snapshot || typeof snapshot !== 'object' || snapshot.v !== 1) throw new Error('bad snapshot');
    return { snapshot, msgAt: Date.parse(msg.timestamp) || 0 };
  }

  /** Returns {snapshot, online, ageMs}. Cached 60 s; on failure keeps the last good snapshot. */
  async function get() {
    if (!cache || now() - lastFetchAt >= CACHE_MS) {
      lastFetchAt = now();
      try {
        cache = await load();
      } catch (e) {
        console.error('hq-state:', e?.message);
      }
    }
    const snap = cache?.snapshot;
    if (!snap) return { snapshot: null, online: false, ageMs: null };
    const at = Date.parse(snap.at) || cache.msgAt;
    const ageMs = at ? Math.max(0, now() - at) : null;
    return { snapshot: snap, online: ageMs != null && ageMs < ONLINE_MS, ageMs };
  }

  return { get };
}

export const noHqState = { get: async () => ({ snapshot: null, online: false, ageMs: null }) };

const bad = (error) => ({ ok: false, error });
const isStr = (v, max, min = 1) => typeof v === 'string' && v.trim().length >= min && v.length <= max;

/** Validate a proposed command against the contract and the snapshot. Returns {ok, command} or {ok:false, error}. */
export function validateCommand(c, snapshot) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return bad('command must be an object');
  if (!snapshot) return bad('HQ state is not available yet');
  const roles = new Set((snapshot.roles || []).map((r) => r?.id));
  const id = `c_${randomBytes(6).toString('hex')}`;
  switch (c.type) {
    case 'message':
      if (!roles.has(c.role)) return bad('unknown role');
      if (!isStr(c.text, 2000)) return bad('text must be 1 to 2000 characters');
      return { ok: true, command: { id, type: 'message', role: c.role, text: c.text } };
    case 'task': {
      if (!roles.has(c.role)) return bad('unknown role');
      if (!isStr(c.title, 200)) return bad('title must be 1 to 200 characters');
      const body = c.body ?? '';
      if (!isStr(body, 2000, 0)) return bad('body must be at most 2000 characters');
      const command = { id, type: 'task', role: c.role, title: c.title, body };
      if (c.game != null && c.game !== '') {
        if (!isStr(c.game, 80)) return bad('bad game');
        command.game = c.game;
      }
      return { ok: true, command };
    }
    case 'answer':
      if (!isStr(c.askId, 80) || !(snapshot.asks || []).some((a) => a?.id === c.askId)) return bad('unknown ask');
      if (!isStr(c.answer, 2000)) return bad('answer must be 1 to 2000 characters');
      return { ok: true, command: { id, type: 'answer', askId: c.askId, answer: c.answer } };
    default:
      return bad('unknown command type');
  }
}

/** Post an HQCMD1 message as the bot. Discord caps content at 2000 chars, JSON overhead included. */
export async function postCommand(discord, channelId, command) {
  const content = `HQCMD1 ${JSON.stringify(command)}`;
  if (content.length > 2000) {
    const err = new Error('Command is too long for a Discord message (2000 characters including formatting). Shorten the text.');
    err.tooLong = true;
    throw err;
  }
  await discord.post(channelId, content);
  return command.id;
}

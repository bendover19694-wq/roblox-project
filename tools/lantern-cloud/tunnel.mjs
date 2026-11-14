// Outbound long-poll tunnel: the owner's PC polls this server; browser requests under /hq are queued for it and the replies streamed back.
// The PC opens no ports. Tunnel calls use a bearer secret (no cookies); /hq uses the owner session. Zero dependencies.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export const POLL_MS = 25_000;
export const ONLINE_MS = 40_000; // the PC counts as online if it polled this recently
export const FIRST_REPLY_MS = 30_000;
export const STREAM_MS = 10 * 60_000;
export const REPLY_LIMIT = 1024 * 1024; // body of one reply call
export const TOTAL_LIMIT = 16 * 1024 * 1024; // one whole response
const KEEP_REQ = ['content-type', 'accept', 'last-event-id'];
const KEEP_RES = ['content-type', 'cache-control', 'content-disposition'];
const ID = /^[a-f0-9]{32}$/;
// HQ's own UI needs inline style attributes and a few image hosts; scripts stay 'self' only.
export const HQ_CSP = "default-src 'self'; img-src 'self' data: https://cdn.polyhaven.com https://*.rbxcdn.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'";
const MEDIA_CSP = "default-src 'none'; sandbox";

const digest = (s) => createHash('sha256').update(String(s)).digest();
/** A path that may be forwarded to HQ: starts with one slash, no scheme, no `//`, no `..` (raw or decoded), no control characters. */
export function safePath(p) {
  if (typeof p !== 'string' || p.length > 2048 || !p.startsWith('/') || p.startsWith('//')) return false;
  if (/[\0-\x1f\\]/.test(p) || p.includes('//') || /^\/[a-z][a-z0-9+.-]*:/i.test(p)) return false;
  let d;
  try { d = decodeURIComponent(p); } catch { return false; }
  return !p.includes('..') && !d.includes('..') && !d.includes('//') && !/[\0-\x1f\\]/.test(d);
}
const pick = (h, keep) => {
  const out = {};
  for (const k of keep) {
    const v = h?.[k];
    if (typeof v === 'string' && v.length < 1024 && !/[\r\n\0]/.test(v)) out[k] = v;
  }
  return out;
};

export function createTunnel({ secret, now = Date.now } = {}) {
  const enabled = typeof secret === 'string' && secret.length >= 32;
  const want = enabled ? digest(secret) : null;
  const queue = []; // requests waiting for the PC
  const waiters = new Set(); // held polls: {res, timer}
  const live = new Map(); // id -> {res, started, bytes, timers, closed}
  let lastPoll = 0;
  const connected = () => enabled && lastPoll > 0 && now() - lastPoll < ONLINE_MS;

  const bearerOk = (req) => {
    if (!enabled) return false;
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    return Boolean(m) && timingSafeEqual(digest(m[1]), want);
  };

  function deliver() {
    while (queue.length && waiters.size) {
      const w = waiters.values().next().value;
      waiters.delete(w);
      clearTimeout(w.timer);
      lastPoll = now();
      const item = queue.shift();
      w.res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      w.res.end(JSON.stringify(item));
    }
  }
  function finish(id, e) {
    const l = live.get(id);
    if (!l) return;
    live.delete(id);
    l.timers.forEach(clearTimeout);
    const i = queue.findIndex((q) => q.id === id);
    if (i >= 0) queue.splice(i, 1);
    if (e === 'drop') l.res.destroy();
    else if (!l.res.writableEnded) l.res.end();
  }

  /** GET /tunnel/next (already authorised): hold up to 25 s, then 204. */
  function next(req, res) {
    lastPoll = now();
    const w = { res, timer: null };
    w.timer = setTimeout(() => {
      waiters.delete(w);
      lastPoll = now();
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
    }, POLL_MS);
    w.timer.unref?.();
    waiters.add(w);
    req.on('close', () => { waiters.delete(w); clearTimeout(w.timer); });
    deliver();
  }

  /** POST /tunnel/reply/<id> (already authorised) with the parsed JSON body. Returns [status, object]. */
  function reply(id, b) {
    const l = ID.test(id) && live.get(id);
    if (!l) return [404, { error: 'unknown or finished request' }];
    if (!l.started) {
      if (!Number.isInteger(b.status) || b.status < 200 || b.status > 599) return [400, { error: 'bad status' }];
      const h = pick(b.headers, KEEP_RES);
      if (l.mediaCsp) h['content-security-policy'] = MEDIA_CSP;
      l.timers.forEach(clearTimeout);
      l.timers = [setTimeout(() => finish(id, 'end'), STREAM_MS)]; // streams are cut after 10 minutes; the browser reconnects
      l.res.writeHead(b.status, { 'Cache-Control': 'no-store', 'Content-Security-Policy': l.mediaCsp ? MEDIA_CSP : HQ_CSP, 'X-Accel-Buffering': 'no', ...h });
      l.started = true;
    }
    if (b.chunkB64 != null) {
      if (typeof b.chunkB64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(b.chunkB64)) return [400, { error: 'bad chunk' }];
      const buf = Buffer.from(b.chunkB64, 'base64');
      if (buf.length > REPLY_LIMIT) return [413, { error: 'chunk too large' }];
      l.bytes += buf.length;
      if (l.bytes > TOTAL_LIMIT) { finish(id, 'drop'); return [413, { error: 'response too large' }]; }
      if (buf.length) l.res.write(buf);
    }
    if (b.done === true) finish(id, 'end');
    return [200, { ok: true }];
  }

  /** A browser request from the owner. `rest` is the path after /hq. */
  function proxy(req, res, rest, body, headers) {
    const send = (status, text) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(text); };
    if (!enabled || !connected()) return send(503, '<!doctype html><meta charset="utf-8"><title>Agent HQ offline</title><h1>Agent HQ on your PC is offline</h1><p>Start Agent HQ on your PC (it connects out to this site by itself), then <a href="/hq/">try again</a>. <a href="/">Back to the dashboard</a></p>');
    if (queue.length > 50) return send(503, '<!doctype html><meta charset="utf-8"><title>Busy</title><p>Too many requests are waiting. Try again.</p>');
    const id = randomBytes(16).toString('hex');
    const l = { res, started: false, bytes: 0, timers: [], mediaCsp: rest.startsWith('/media/') };
    l.timers.push(setTimeout(() => {
      live.delete(id);
      const i = queue.findIndex((q) => q.id === id);
      if (i >= 0) queue.splice(i, 1);
      send(504, '<!doctype html><meta charset="utf-8"><title>No answer</title><p>Agent HQ on your PC did not answer in time. <a href="/hq/">Try again</a></p>');
    }, FIRST_REPLY_MS));
    live.set(id, l);
    res.on('close', () => finish(id, 'end')); // the browser left
    queue.push({ id, method: req.method, path: rest, headers: pick(headers, KEEP_REQ), bodyB64: body.length ? body.toString('base64') : '' });
    deliver();
  }

  const stop = () => { for (const id of [...live.keys()]) finish(id, 'drop'); for (const w of waiters) { clearTimeout(w.timer); w.res.destroy(); } waiters.clear(); };
  return { enabled, connected, bearerOk, next, reply, proxy, stop };
}

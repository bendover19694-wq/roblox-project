// Remote access: this PC polls the DV Enterprises site outbound (no open port) and forwards the signed-in owner's
// requests to this HQ on 127.0.0.1, adding the owner token HERE so the browser never holds it.
// Runs only while <stateDir>/remote.json {url, secret} exists. Zero dependencies.
import fs from 'node:fs';
import path from 'node:path';

const MAX_ACTIVE = 6;
const MAX_BUFFER = 8 * 1024 * 1024;
const CHUNK = 512 * 1024;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']);
const KEEP_REQ = ['content-type', 'accept', 'last-event-id'];
const KEEP_RES = ['content-type', 'cache-control', 'content-disposition'];
const TEXTY = /html|json|javascript|text\/|xml/i;

/** Only a plain site path: one leading slash, no `//`, no `..` (raw or decoded), no scheme, no control characters. */
export function safeRemotePath(p) {
  if (typeof p !== 'string' || p.length > 2048 || !p.startsWith('/') || p.startsWith('//')) return false;
  if (/[\0-\x1f\\]/.test(p) || p.includes('//') || /^\/[a-z][a-z0-9+.-]*:/i.test(p)) return false;
  let d;
  try { d = decodeURIComponent(p); } catch { return false; }
  return !p.includes('..') && !d.includes('..') && !d.includes('//') && !/[\0-\x1f\\]/.test(d);
}

/** Replace the owner token anywhere in a text body, so it can never reach the browser. */
export function scrubToken(buf, headers, token) {
  if (!token || !TEXTY.test(headers['content-type'] || '')) return buf;
  const s = buf.toString('utf8');
  return s.includes(token) ? Buffer.from(s.split(token).join('')) : buf;
}

export function readRemoteConfig(stateDir) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(stateDir, 'remote.json'), 'utf8'));
    const u = new URL(c.url);
    if (!/^https?:$/.test(u.protocol) || typeof c.secret !== 'string' || c.secret.length < 32) return null;
    return { url: u.origin, secret: c.secret };
  } catch { return null; }
}

const pick = (h, keep) => Object.fromEntries(keep.filter((k) => typeof h?.[k] === 'string').map((k) => [k, h[k]]));

export function createRemoteTunnel({ stateDir, getPort, getOwnerToken, fetchFn = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), onError = () => {} } = {}) {
  let running = false;
  let ctl = null;
  let active = 0;

  async function reply(cfg, id, obj) {
    const r = await fetchFn(`${cfg.url}/tunnel/reply/${id}`, { method: 'POST', headers: { authorization: `Bearer ${cfg.secret}`, 'content-type': 'application/json' }, body: JSON.stringify(obj), signal: AbortSignal.timeout(30_000) });
    await r.arrayBuffer().catch(() => {});
    return r.status === 200;
  }
  async function sendBuffered(cfg, id, status, headers, body) {
    let first = true;
    for (let i = 0; first || i < body.length; i += CHUNK) {
      const part = body.subarray(i, i + CHUNK);
      const last = i + CHUNK >= body.length;
      if (!(await reply(cfg, id, { ...(first && { status, headers }), chunkB64: part.toString('base64'), done: last }))) return;
      first = false;
    }
  }

  async function handle(cfg, item) {
    const id = item?.id;
    if (typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) return;
    const fail = (status, msg) => reply(cfg, id, { status, headers: { 'content-type': 'text/plain; charset=utf-8' }, chunkB64: Buffer.from(msg).toString('base64'), done: true }).catch(() => {});
    try {
      const method = String(item.method || '').toUpperCase();
      if (!METHODS.has(method) || !safeRemotePath(item.path)) return await fail(400, 'refused');
      const port = getPort();
      const base = `http://127.0.0.1:${port}`;
      const url = new URL(item.path, base);
      if (url.origin !== base) return await fail(400, 'refused');
      const token = getOwnerToken();
      const events = method === 'GET' && url.pathname === '/api/events';
      if (events) url.searchParams.set('token', token); // the events route takes the token in the query
      const headers = { ...pick(item.headers, KEEP_REQ), 'x-hq-token': token };
      const body = method === 'GET' || method === 'HEAD' || !item.bodyB64 ? undefined : Buffer.from(String(item.bodyB64), 'base64');
      const abort = new AbortController();
      const timer = events ? null : setTimeout(() => abort.abort(), 60_000);
      const r = await fetchFn(url, { method, headers, body, redirect: 'manual', signal: abort.signal });
      const outHeaders = pick(Object.fromEntries(r.headers), KEEP_RES);
      if (events) {
        if (!(await reply(cfg, id, { status: r.status, headers: outHeaders }))) return abort.abort();
        try {
          for await (const c of r.body) if (!(await reply(cfg, id, { chunkB64: Buffer.from(c).toString('base64') }))) return abort.abort();
          await reply(cfg, id, { done: true });
        } catch { abort.abort(); }
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const c of r.body ?? []) {
        size += c.length;
        if (size > MAX_BUFFER) { abort.abort(); clearTimeout(timer); return await fail(502, 'response too large'); }
        chunks.push(c);
      }
      clearTimeout(timer);
      await sendBuffered(cfg, id, r.status, outHeaders, scrubToken(Buffer.concat(chunks), outHeaders, token));
    } catch (e) {
      onError(e);
      await fail(502, 'Agent HQ did not answer');
    }
  }

  async function loop() {
    let wait = 1000;
    while (running) {
      const cfg = readRemoteConfig(stateDir);
      if (!cfg) { running = false; break; } // remote.json removed or invalid: stop
      if (active >= MAX_ACTIVE) { await sleep(100); continue; }
      try {
        const r = await fetchFn(`${cfg.url}/tunnel/next`, { headers: { authorization: `Bearer ${cfg.secret}` }, signal: AbortSignal.any([ctl.signal, AbortSignal.timeout(35_000)]) });
        if (r.status === 204) { wait = 1000; await r.arrayBuffer().catch(() => {}); continue; }
        if (r.status !== 200) throw new Error(`tunnel poll answered ${r.status}`);
        const item = await r.json();
        wait = 1000;
        active++;
        handle(cfg, item).finally(() => { active--; });
      } catch (e) {
        if (!running) break;
        onError(e);
        await sleep(wait);
        wait = Math.min(wait * 2, 60_000);
      }
    }
  }

  return {
    start() {
      if (running || !readRemoteConfig(stateDir)) return false;
      running = true;
      ctl = new AbortController();
      loop();
      return true;
    },
    stop() { running = false; ctl?.abort(); },
    get active() { return active; },
  };
}

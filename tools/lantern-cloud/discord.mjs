// Discord REST helper and a small gateway client on the global WebSocket. The token never reaches logs or errors.
const API = 'https://discord.com/api/v10';
const GATEWAY = 'wss://gateway.discord.gg';
const INTENTS = (1 << 0) | (1 << 9) | (1 << 12) | (1 << 15); // GUILDS | GUILD_MESSAGES | DIRECT_MESSAGES | MESSAGE_CONTENT
const FATAL_CLOSE = new Set([4004, 4010, 4011, 4012, 4013, 4014]);

export function createDiscord({ token, fetch: f = globalThis.fetch, WebSocketImpl = globalThis.WebSocket } = {}) {
  const handlers = [];
  let me = null;
  let ws = null;
  let stopped = false;
  let connected = false;
  let seq = null;
  let sessionId = null;
  let resumeUrl = null;
  let hbTimer = null;
  let hbFirst = null;
  let acked = true;
  let retries = 0;
  let retryTimer = null;
  let lastError = null;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** REST call. Returns parsed JSON (null on 204). Throws Error with .status on failure. */
  async function rest(method, path, body, { form } = {}) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const headers = { Authorization: `Bot ${token}`, 'User-Agent': 'DiscordBot (lantern, 1)' };
      let payload;
      if (form) payload = form;
      else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
      const res = await f(`${API}${path}`, { method, headers, body: payload });
      if (res.status === 429) {
        const j = await res.json().catch(() => ({}));
        await sleep(Math.min(Math.max(Number(j.retry_after) || 1, 0.05), 30) * 1000);
        continue;
      }
      if (res.status === 204) return null;
      if (!res.ok) {
        const err = new Error(`Discord ${method} ${path.split('?')[0].replace(/\d{5,}/g, ':id')} failed (${res.status})`);
        err.status = res.status;
        throw err;
      }
      return res.json().catch(() => null);
    }
    const err = new Error('Discord rate limited');
    err.status = 429;
    throw err;
  }

  async function botId() {
    if (me) return me;
    const u = await rest('GET', '/users/@me');
    me = u?.id ?? null;
    return me;
  }

  const post = (channelId, content, extra = {}) =>
    rest('POST', `/channels/${channelId}/messages`, { content: String(content).slice(0, 2000), allowed_mentions: { parse: [] }, ...extra });

  // ---- gateway ----
  const send = (obj) => ws && ws.readyState === 1 && ws.send(JSON.stringify(obj));

  function heartbeat() {
    if (!acked) return ws?.close(4000, 'zombie');
    acked = false;
    send({ op: 1, d: seq });
  }

  function identifyOrResume() {
    if (sessionId && seq != null) send({ op: 6, d: { token, session_id: sessionId, seq } });
    else {
      send({
        op: 2,
        d: {
          token,
          intents: INTENTS,
          properties: { os: 'linux', browser: 'lantern', device: 'lantern' },
          presence: { since: null, activities: [{ name: 'Agent HQ', type: 3 }], status: 'online', afk: false },
        },
      });
    }
  }

  function onPayload(p) {
    if (p.s != null) seq = p.s;
    switch (p.op) {
      case 10: {
        const interval = Number(p.d?.heartbeat_interval) || 41250;
        acked = true;
        clearTimeout(hbFirst);
        clearInterval(hbTimer);
        hbFirst = setTimeout(() => {
          heartbeat();
          hbTimer = setInterval(heartbeat, interval);
          hbTimer.unref?.();
        }, interval * Math.random());
        hbFirst.unref?.();
        identifyOrResume();
        break;
      }
      case 1:
        send({ op: 1, d: seq });
        break;
      case 11:
        acked = true;
        break;
      case 7:
        ws?.close(4000, 'reconnect');
        break;
      case 9:
        if (!p.d) {
          sessionId = null;
          seq = null;
        }
        ws?.close(4000, 'invalid session');
        break;
      case 0:
        if (p.t === 'READY') {
          sessionId = p.d.session_id;
          resumeUrl = p.d.resume_gateway_url;
          me = p.d.user?.id ?? me;
          connected = true;
          retries = 0;
          lastError = null;
        } else if (p.t === 'RESUMED') {
          connected = true;
          retries = 0;
        } else if (p.t === 'MESSAGE_CREATE') {
          for (const h of handlers) Promise.resolve().then(() => h(p.d)).catch((e) => console.error('message handler failed:', e?.message));
        }
        break;
    }
  }

  function connect() {
    if (stopped) return;
    const base = sessionId && resumeUrl ? resumeUrl : GATEWAY;
    ws = new WebSocketImpl(`${base}/?v=10&encoding=json`);
    ws.onmessage = (e) => {
      try {
        onPayload(JSON.parse(typeof e.data === 'string' ? e.data : String(e.data)));
      } catch (err) {
        console.error('gateway payload error:', err?.message);
      }
    };
    ws.onerror = () => {};
    ws.onclose = (e) => {
      connected = false;
      clearTimeout(hbFirst);
      clearInterval(hbTimer);
      if (stopped) return;
      if (FATAL_CLOSE.has(e?.code)) {
        lastError = `gateway closed ${e.code}`;
        return;
      }
      if (e?.code === 4007 || e?.code === 4009) sessionId = null;
      const delay = Math.min(30_000, 1000 * 2 ** retries++) + Math.random() * 500;
      retryTimer = setTimeout(connect, delay);
      retryTimer.unref?.();
    };
  }

  return {
    rest,
    post,
    botId,
    onMessage: (fn) => handlers.push(fn),
    start() {
      stopped = false;
      connect();
    },
    stop() {
      stopped = true;
      connected = false;
      clearTimeout(hbFirst);
      clearInterval(hbTimer);
      clearTimeout(retryTimer);
      try {
        ws?.close(1000);
      } catch {}
    },
    get connected() {
      return connected;
    },
    get lastError() {
      return lastError;
    },
  };
}

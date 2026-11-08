import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiscord } from '../discord.mjs';

class FakeSocket {
  static all = [];
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.sent = [];
    FakeSocket.all.push(this);
  }
  send(s) {
    this.sent.push(JSON.parse(s));
  }
  close() {
    this.readyState = 3;
  }
  emit(obj) {
    this.onmessage({ data: JSON.stringify(obj) });
  }
}

test('gateway: identify with intents and presence, READY, MESSAGE_CREATE, no token in URL', async () => {
  const token = 'fake-token-not-real';
  const d = createDiscord({ token, WebSocketImpl: FakeSocket, fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }) });
  const got = [];
  d.onMessage((m) => got.push(m));
  d.start();
  const ws = FakeSocket.all[0];
  assert.match(ws.url, /^wss:\/\/gateway\.discord\.gg\/\?v=10&encoding=json$/);
  ws.emit({ op: 10, d: { heartbeat_interval: 1e9 } });
  const id = ws.sent.find((p) => p.op === 2);
  assert.equal(id.d.intents, 1 | 512 | 4096 | 32768);
  assert.equal(id.d.presence.activities[0].name, 'Agent HQ');
  assert.equal(d.connected, false);
  ws.emit({ op: 0, s: 1, t: 'READY', d: { session_id: 's1', resume_gateway_url: 'wss://resume.example', user: { id: 'BOT' } } });
  assert.equal(d.connected, true);
  assert.equal(await d.botId(), 'BOT');
  ws.emit({ op: 0, s: 2, t: 'MESSAGE_CREATE', d: { id: 'm1', content: 'hi' } });
  await new Promise((r) => setImmediate(r));
  assert.equal(got.length, 1);
  assert.equal(got[0].id, 'm1');
  d.stop();
  assert.equal(d.connected, false);
});

test('rest: honours 429 retry_after, sets User-Agent, error text has no token', async () => {
  let n = 0;
  const seen = [];
  const f = async (url, init) => {
    seen.push(init.headers);
    n++;
    if (n === 1) return { ok: false, status: 429, json: async () => ({ retry_after: 0.01 }) };
    if (n === 2) return { ok: true, status: 200, json: async () => ({ id: 'ok' }) };
    return { ok: false, status: 403, json: async () => ({}) };
  };
  const token = 'fake-token-not-real';
  const d = createDiscord({ token, fetch: f });
  assert.deepEqual(await d.rest('GET', '/users/@me'), { id: 'ok' });
  assert.equal(n, 2);
  assert.equal(seen[0]['User-Agent'], 'DiscordBot (lantern, 1)');
  await assert.rejects(d.rest('GET', '/channels/123456789/messages'), (e) => e.status === 403 && !e.message.includes(token));
});

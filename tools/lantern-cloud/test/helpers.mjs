// Fakes only. No real network, no real secrets.
export const FAKE_PASSWORD = 'correct horse battery';
export const BOT = '1555000000000000001';
export const OWNER = '821000000000000001';

export const snapshot = (over = {}) => ({
  v: 1,
  at: new Date().toISOString(),
  online: true,
  roles: [{ id: 'designer', label: 'Designer' }, { id: 'scripter', label: 'Scripter' }],
  games: [{ slug: 'space', name: 'Space', stage: 'build' }],
  tasks: [{ id: 't1', title: 'Build the HUD', role: 'designer', game: 'space', state: 'working', engine: 'x', costUsd: 0.1, updatedAt: 'now' }],
  asks: [{ id: 'a1', title: 'Pick a colour', role: 'designer', kind: 'choice', options: [{ id: 'red', label: 'Red' }] }],
  spend: { todayUsd: 1.5 },
  lanes: {},
  ...over,
});

const res = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

/** Fake Discord + CDN + Groq fetch. opts: {snap, groq: (body)=>response|throw, snapAt} */
export function fakeFetch({ snap = snapshot(), groq, stateMsgs } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    url = String(url);
    calls.push({ url, init });
    if (url.endsWith('/users/@me')) return res({ id: BOT });
    if (url.includes('/channels/STATE/messages') && (init.method || 'GET') === 'GET') {
      return res(stateMsgs ?? [{ id: 'm1', author: { id: BOT }, content: 'HQSTATE1 now', timestamp: new Date().toISOString(), attachments: [{ filename: 'state.json', size: 100, url: 'https://cdn.discordapp.com/attachments/1/2/state.json' }] }]);
    }
    if (url.startsWith('https://cdn.discordapp.com/')) return res(JSON.stringify(snap));
    if (url.includes('/channels/') && init.method === 'POST') return res({ id: 'posted' });
    if (url.startsWith('https://api.groq.com/')) {
      if (!groq) throw new Error('no groq');
      return groq(JSON.parse(init.body));
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  f.calls = calls;
  return f;
}

export const groqOk = (content, tokens = 42) => () => res({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }], usage: { total_tokens: tokens } });
export const groqFail = () => res({}, 500);

export const posts = (f) => f.calls.filter((c) => c.init.method === 'POST' && c.url.includes('/channels/'));

export const testEnv = (hash, extra = {}) => ({
  DISCORD_BOT_TOKEN: 'fake-token-not-real',
  GROQ_API_KEY: 'fake-groq-not-real',
  LANTERN_PASSWORD_HASH: hash,
  SESSION_SECRET: 'fake-session-secret',
  OWNER_IDS: OWNER,
  GUILD_ID: 'G',
  ASK_CHANNEL_ID: 'ASK',
  STATE_CHANNEL_ID: 'STATE',
  COMMANDS_CHANNEL_ID: 'CMD',
  ...extra,
});

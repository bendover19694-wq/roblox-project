import fs from 'node:fs';

// OpenAI-compatible model providers (Groq, NVIDIA NIM): model lists and chat calls. No dependencies.
// Keys live in .agent-hq/providers.json (owner-only, write-only through the API) and reach a task only through its child process env.

export const PROVIDERS = {
  groq: {
    // HQ_GROQ_BASE / HQ_NIM_BASE point at a proxy or a test double
    label: 'Groq', base: process.env.HQ_GROQ_BASE || 'https://api.groq.com/openai/v1', keyHint: 'gsk_...',
    // strongest tool-calling models first (research/exemplars/llm-providers.md); matched against the live list,
    // so renamed versions still work. Free tier is about 30 RPM and 8K tokens per minute per model.
    prefer: [/qwen3\.\d+-\d+b/, /qwen3/, /gpt-oss-120b/, /llama-3\.3-70b/, /gpt-oss-20b/],
    skip: /whisper|tts|guard|playai|orpheus|distil|allam|compound|minimax|muse/i, // last two are enterprise-only on Groq
    timeoutMs: 120000, ctxChars: 20000,
  },
  nim: {
    label: 'NVIDIA NIM', base: process.env.HQ_NIM_BASE || 'https://integrate.api.nvidia.com/v1', keyHint: 'nvapi-...',
    // about 40 requests per minute per key across all models; the list includes models no longer served, so test a pick first
    prefer: [/kimi-k2/, /laguna/, /glm-5\.\d+$/, /deepseek-v4/, /nemotron-3-super/, /gpt-oss/, /llama.*70b.*instruct/],
    timeoutMs: 90000, ctxChars: 90000,
    skip: /embed|rerank|clip|vision|vl\b|-vl-|guard|safety|reward|parse|retriever|bge|kosmos|fuyu|neva|paligemma|deplot|vila|cosmos|riva|nv-embed|nemoguard|detector|ocr/i,
  },
};
export const PROVIDER_IDS = Object.keys(PROVIDERS);

/** Whether an API key looks plausible (format only; the provider decides validity). */
export const keyLooksOk = (k) => typeof k === 'string' && k.length >= 20 && k.length <= 400 && !/\s/.test(k);

/** Chat model ids the provider offers this key, sorted, without speech/embedding/guard models. */
export async function listModels(id, key, fetchFn = fetch) {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`unknown provider ${id}`);
  // NIM lists its catalogue without a key; Groq needs one
  const r = await fetchFn(`${p.base}/models`, { headers: key ? { authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${p.label} /models -> ${r.status}${r.status === 401 ? ' (key rejected)' : ''}`);
  const j = await r.json();
  return (j?.data ?? []).map((m) => m?.id).filter((x) => typeof x === 'string' && !p.skip.test(x)).sort();
}

/** The best model in `ids` by the provider's preference list, else the first. */
export function pickModel(id, ids) {
  for (const re of PROVIDERS[id]?.prefer ?? []) { const hit = ids.find((m) => re.test(m)); if (hit) return hit; }
  return ids[0] ?? null;
}

export const CLAUDE_MODELS = ['opus', 'sonnet', 'haiku'];

/**
 * Model catalogue for the dashboard's pickers, cached in <stateDir>/models.json. NIM's public list is fetched at
 * boot and daily without a key; Groq's once a key is saved. keys() -> {groq: {apiKey}, nim: {apiKey}}.
 */
export function createCatalog({ stateDir, keys, fetchFn = fetch, now = Date.now }) {
  const file = `${stateDir}/models.json`;
  let state = {};
  try { state = JSON.parse(fs.readFileSync(file, 'utf8')) ?? {}; } catch { /* first run */ }
  const save = () => { try { fs.writeFileSync(file, JSON.stringify(state)); } catch { /* cache only */ } };
  async function refresh(id) {
    const key = keys()?.[id]?.apiKey ?? '';
    if (id === 'groq' && !key) { state.groq = { models: [], recommended: null, fetchedAt: null, error: 'Add a Groq key to list its models.' }; return state.groq; }
    try {
      const models = await listModels(id, key, fetchFn);
      // top: the good tool-calling models, best first, so the picker shows them above the long tail
      const top = [...new Set(PROVIDERS[id].prefer.flatMap((re) => models.filter((m) => re.test(m))))];
      state[id] = { models, top, recommended: pickModel(id, models), fetchedAt: new Date(now()).toISOString(), error: null };
    } catch (e) {
      state[id] = { ...(state[id] ?? { models: [], recommended: null, fetchedAt: null }), error: String(e.message ?? e).slice(0, 200) };
    }
    save();
    return state[id];
  }
  return {
    refresh,
    refreshAll: () => Promise.all(PROVIDER_IDS.map(refresh)),
    get: () => ({ claude: { models: CLAUDE_MODELS, recommended: 'sonnet' },
      ...Object.fromEntries(PROVIDER_IDS.map((id) => [id, { models: [], recommended: null, fetchedAt: null, error: null, ...(state[id] ?? {}), configured: !!keys()?.[id]?.apiKey }])) }),
    stale: (id, maxMs = 86400000) => !state[id]?.fetchedAt || now() - Date.parse(state[id].fetchedAt) > maxMs,
  };
}

/** Quick check that a model answers and accepts tools: one tiny call. */
export async function testModel({ provider, key, model, fetchFn = fetch }) {
  const t0 = Date.now();
  const tools = [{ type: 'function', function: { name: 'ping', description: 'Call this to answer.', parameters: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] } } }];
  const res = await chat({ provider, key, model, fetchFn, retries: 1, maxTokens: 64, tools,
    messages: [{ role: 'user', content: 'Call the ping tool with ok=true.' }] });
  const msg = res.choices?.[0]?.message ?? {};
  return { ok: true, tools: Array.isArray(msg.tool_calls) && msg.tool_calls.some((c) => c.function?.name === 'ping'), ms: Date.now() - t0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** One chat completion with retries on rate limits and overloads. Returns the parsed JSON. */
export async function chat({ provider, key, model, messages, tools, maxTokens = 2048, fetchFn = fetch, retries = 4 }) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`unknown provider ${provider}`);
  const body = { model, messages, temperature: 0.3, max_tokens: maxTokens };
  if (provider === 'groq' && /qwen3/.test(model)) body.reasoning_format = 'hidden'; // keep thinking out of content and history
  if (tools?.length) { body.tools = tools; body.tool_choice = 'auto'; }
  for (let attempt = 0; ; attempt++) {
    const r = await fetchFn(`${p.base}/chat/completions`, {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(p.timeoutMs ?? 120000),
    });
    if (r.ok) return r.json();
    const text = (await r.text()).slice(0, 600);
    // 429/5xx: back off; Groq's intermittent 400 tool_use_failed (a malformed call) is worth one retry
    if ((r.status === 429 || r.status >= 500 || (r.status === 400 && /tool_use_failed/.test(text) && attempt < 1)) && attempt < retries) {
      const after = Number(r.headers.get('retry-after'));
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 60) * 1000 : 2000 * 2 ** attempt + Math.random() * 1000);
      continue;
    }
    const err = new Error(`${p.label} ${r.status}: ${text}`);
    err.status = r.status;
    throw err;
  }
}

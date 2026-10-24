# Groq and NVIDIA NIM as agent backends (researched 2026-10-24)

## TL;DR
1. Neither is a safe drop-in for Claude on tool-heavy, long-horizon roles. Use them for read-only, bounded, retryable roles only.
2. Groq = fast, but tiny free budget: gpt-oss-120b / qwen3.8-27b free = 30 RPM, 1K RPD, 8K TPM, 200K TPD. 8K TPM means a single 20K-token prompt can never be sent on free tier. Verify in console Limits page.
3. Groq production models: llama-3.1-8b-instant, llama-3.3-70b-versatile, openai/gpt-oss-120b, openai/gpt-oss-20b. Preview: qwen/qwen3.8-27b (public), minimaxai/minimax-m2.7 and meta-models/muse-spark-open (Enterprise / contact sales only).
4. Groq best agentic coder: qwen/qwen3.8-27b (SWE-bench Pro 61.7, LCB v6 90.3, parallel tools, 16K max out) then openai/gpt-oss-120b (SWE-bench Verified 62.4, NO parallel tools, tool_use_failed reports).
5. NIM free tier = "up to 40 RPM" per account/key shared across all models; no published daily cap; credits (1,000) are legacy/unclear. Not for production per ToS (unverified).
6. NIM `/v1/models` DOES list models that fail: 404 "Function not found" (account lacks Public API Endpoints), 410 "gone" (kimi-k2.6, glm-5.2 reported), hangs with zero bytes, and 429 at low volume. Forum reports are anecdotal; no NVIDIA staff replies seen.
7. NIM best agentic coder (by published numbers): moonshotai/kimi-k2.6 (SWE-bench Verified 80.2, 256K) > z-ai/glm-5.3 (1M ctx, 128K out) > poolside/laguna-xs-2.1 (SWE-bench Verified 70.9, 256K). But Kimi availability on NIM is flaky.
8. Gotchas: strip reasoning (`reasoning_content` / `<think>`), keep tool_call ids verbatim, never leave a tool call to an unlisted tool in history (Groq 400s forever), set client timeout >= 300s and treat zero-byte stalls as failure, serialise to <= 1 in-flight NIM request.
9. Always build fallback chains: provider A model -> provider B model -> Claude. Retry only on 429/5xx/tool_use_failed, with jitter, honour Retry-After.
10. Rankings below rely on vendor-reported scores; third-party aggregators conflict. Items marked (unverified) must be probed live (one cheap test call per model on startup).

Method note: NIM build.nvidia.com model pages are JS-rendered and returned no data to the fetcher; NIM specs come from search snippets, aggregator pages, and HF cards. Groq data comes from console.groq.com docs fetched today. I could not call either API (no keys).

---

## 1. Rate limits and errors

### Groq (https://console.groq.com/docs/rate-limits, fetched 2026-10-24)
Limits are per ORGANISATION (not per key/user), whichever limit hits first applies. Cached tokens do not count. Some orgs also have separate ITPM/OTPM. Console "Limits" page is authoritative.

| Model | RPM | RPD | TPM | TPD | Plan shown | Source |
|---|---|---|---|---|---|---|
| openai/gpt-oss-120b | 30 | 1K | 8K | 200K | Free sample (docs page lists same values as base table; benchlm 2026-10-16 labels Free) | docs + https://benchlm.ai/free-tier/groq |
| openai/gpt-oss-20b | 30 | 1K | 8K | 200K | same table | docs |
| qwen/qwen3.8-27b | 30 | 1K | 8K | 200K | same | docs + benchlm |
| openai/gpt-oss-safeguard-20b | 3 | 1K | 2K | 200K | same | docs |
| meta-llama/llama-prompt-guard-2-* | 30 | 14.4K | 15K | 500K | same | docs |
| canopylabs/orpheus-* | 10 | 100 | 1.2K | 3.6K | same | docs |
| whisper-large-v3 / turbo | 20 | 2K | n/a | n/a | audio 7.2K s/h, 28.8K s/day | docs |
| llama-3.3-70b-versatile | not in current table (unverified; historic free ~30 RPM / 1K RPD / 12K TPM / 100K TPD) | | | | | memory, not re-verified |
| llama-3.1-8b-instant | not in current table (unverified; historic free ~30 RPM / 14.4K RPD / 6K TPM / 500K TPD) | | | | | memory, not re-verified |
| minimax-m2.7, muse-spark-open | Enterprise only, no public limits | | | | | model pages |

- The docs page has Free and Developer tabs but the fetch showed one table; treat it as Free-like. Developer tier is paid, higher limits, see console (unverified numbers).
- 429 headers: `retry-after` (seconds, only on 429); `x-ratelimit-limit-requests` (RPD), `x-ratelimit-limit-tokens` (TPM), `x-ratelimit-remaining-requests` (RPD), `x-ratelimit-remaining-tokens` (TPM), `x-ratelimit-reset-requests`, `x-ratelimit-reset-tokens`. Present on every response except retry-after.
- Practical: TPM 8K on free means prompt+max_tokens must stay under ~8K per call. Agents with big tool schemas or file reads will 413/429. Plan for Developer tier if using Groq for anything beyond tiny tasks.

### NVIDIA NIM hosted (integrate.api.nvidia.com/v1)
- Free for NVIDIA Developer Program members; phone verification; ~40 RPM, shown in dashboard as "Up to 40 RPM", one limit shared across ALL models on the key (https://freellm.net/providers/nvidia-nim, https://forums.developer.nvidia.com/t/is-nim-free/369368). Third-party, not official.
- Credits: forum posts through 2026 still cite "1,000 credits" and requests for 5,000 (https://forums.developer.nvidia.com/t/credit-rate-limit-increase-request-1-000-5-000-credits-40-200-rpm/380932). A Medium post says credits were phased out in 2025. Conflicting; treat as: no hard token cap known, but dynamic throttling exists.
- Increase requests (40 to 200 RPM) via forum are reportedly not granted; paid route = self-host NIM / NVIDIA AI Enterprise.
- Dynamic limits: users report per-model, per-time-of-day throttling, cooldowns of ~1 hour to 24 hours after 429 storms, 429 with a few requests, one model allowing only 4 requests before 429 (https://forums.developer.nvidia.com/t/persistent-nvidia-nim-api-instability-across-multiple-models-429-errors-timeouts-extremely-slow-responses-and-hanging-requests-despite-low-reques/382835, https://forums.developer.nvidia.com/t/i-got-rate-limit-error-every-time-i-use-nvidia-nim-api/373385).
- No documented `x-ratelimit-*` headers found (unverified). Assume Retry-After may be absent; use exponential backoff + jitter.
- Terms: a forum user claims ToS = evaluation/development, not production (unverified).
- `/v1/models` lists unservable models (YES, confirmed by multiple reports):
  - 404 "Function not found for account": listed but account lacks "Public API Endpoints" permission; reported on kimi-k2.6, llama-3.1-nemotron-ultra-253b-v1 (https://forums.developer.nvidia.com/t/request-to-enable-public-api-endpoints-for-my-account-moonshotai-kimi-k2-6-returns-404-function-not-found/378047).
  - 410 / "gone": reported for glm-5.2 and kimi-k2.6 while still listed.
  - Hangs with 0 bytes for newer models (kimi-k2.6, deepseek-v4-pro) (https://forums.developer.nvidia.com/t/newer-nim-models-kimi-k2-6-deepseek-v4-pro-hang-indefinitely-or-404-possible-missing-public-api-endpoints-permission/377777).
  - 403: model needs per-family registration; open model page and click "Try API" (freellm.net).
  - Live list today has 85 ids incl. many embeddings/vision/safety/legacy (llama2-70b, mixtral-8x22b, yi-large, dbrx, fuyu-8b...) that are likely stale. Only call with a per-model health probe.
- Latency: reports of 300 s timeouts with no chunk emitted; streamed tool calls stalling (DeepSeek V4 in Claude Code) per forum index. Gateway layer can time out even when GPUs are free.

## 2. Models

Conventions: ctx = context window, out = max output. "TC" = tool calling via OpenAI `tools`. Scores are vendor-reported unless noted.

### Groq

| Model id | Status | ctx / out | TC | Parallel TC | JSON | Reasoning | Code score |
|---|---|---|---|---|---|---|---|
| openai/gpt-oss-120b | Prod | 131,072 / 65,536 | yes | NO | object + schema | yes; low/medium/high; reasoning separate field (strip) | SWE-bench Verified 62.4 (model page) |
| openai/gpt-oss-20b | Prod | 131,072 / 65,536 | yes | NO | yes | yes | no number found (unverified; markedly weaker than 120b) |
| llama-3.3-70b-versatile | Prod | 131,072 / 32,768 | yes | yes | yes | none | no coding number found; mid-tier; known tool_use_failed |
| llama-3.1-8b-instant | Prod | 131,072 / 131,072 | yes | yes | yes | none | weak; summarising only |
| qwen/qwen3.8-27b | Preview | 131,072 / 16,384 | yes | yes | object + schema | yes; `reasoning_effort` default/none/low/medium/high; `reasoning_format` hidden/parsed | LCB v6 90.3, SWE-bench Pro 61.7, Terminal-Bench 2.1 73.0, GPQA 89.2 |
| minimaxai/minimax-m2.7 | Preview, Enterprise | 196,608 / 131,072 | yes | yes | object | interleaved thinking; keep thinking in history | SWE-Pro 56.2, Terminal-Bench 2 57.0 |
| meta-models/muse-spark-open | Preview, Enterprise | 131,072 / 131,072 | yes | yes | object + schema | always on; effort low..xhigh (default xhigh); leave temp/top_p unset | none listed |
| openai/gpt-oss-safeguard-20b | Preview | 131,072 / 65,536 | yes | no | yes | yes | safety classifier, not a coder |

Sources: https://console.groq.com/docs/models, https://console.groq.com/docs/tool-use, https://console.groq.com/docs/model/qwen/qwen3.8-27b, .../openai/gpt-oss-120b, .../minimaxai/minimax-m2.7, .../meta-models/muse-spark-open. Docs say all Groq models support tool use. gpt-oss has built-in browser search and code exec.

### NVIDIA NIM (ids from live /v1/models, 2026-10-24)

| Model id | ctx / out | TC | Reasoning / notes | Code score |
|---|---|---|---|---|
| moonshotai/kimi-k2.6 | 262,144 / ? (unverified) | yes (multi-turn loops; `preserve_thinking` option) | thinking model; reasoning field must be stripped | SWE-bench Verified 80.2 (HF card). Availability flaky: 404/410/hang reported |
| z-ai/glm-5.3 | 1M / 128K (Z.ai docs via aggregators) | yes (unverified on NIM) | thinking always on, effort low/high/max (default max) | SWE-bench figure unreliable (95.4 from one aggregator, unverified); Z.ai reports Terminal-Bench 3.0 / DeepSWE gains |
| z-ai/glm-5.3-flash | unknown (unverified) | likely | no public info found | unknown |
| deepseek-ai/deepseek-v4.1-flash | 1,048,576 / 384K (aggregators; one provider says otherwise) | yes + strict JSON schema (aggregators) | reasoning modes | DeepSWE v1.1 74.2 max effort (vendor, unverified); users advise avoiding DeepSeek on NIM (instability) |
| minimaxai/minimax-m3.1-flash | unknown (unverified) | likely | interleaved thinking family (m2.7 keeps thinking in history) | unknown |
| nvidia/nemotron-3-ultra-550b-a55b | 1M claimed (Requesty), 262,144 (HF listing); unverified / ~66K out | yes (unverified detail) | hybrid Mamba-MoE; reasoning toggle (flag name unverified) | Artificial Analysis Coding Index 37.6; GPQA 86.7 |
| nvidia/nemotron-3-super-120b-a12b | 256K (benchlm) or 1M (Requesty) | yes | reasoning; budget param unverified | SWE-bench Verified ~46 (benchlm, third party) |
| nvidia/llama-3.1-nemotron-ultra-253b-v1 | 128K (known from release; not re-verified) | yes | reasoning on/off via system prompt "detailed thinking on/off" (from release; unverified now) | older; below the 2026 models. 404 "Function not found" reported |
| openai/gpt-oss-20b | 131,072 (as on Groq) | yes | reasoning field | weak |
| stepfun-ai/step-5-preview | unknown | unknown | preview | unknown |
| poolside/laguna-xs-2.1 | 262,144 | yes (unverified detail) | 33B total / 3B active; coding-focused | SWE-bench Verified 70.9, SWE-bench Multilingual 63.1 (HF card) |
| mistralai/codestral-22b-instruct-v0.1 | 32K (unverified) | NO function calling in this old version (unverified) | code completion/FIM style | old, skip |
| google/gemma-4-31b-it | 256K | native tool use + thinking | | LiveCodeBench v6 80.0, tau2-bench retail 86.4 (vendor/review) |
| nvidia/nemotron-3.5-lightning-30b-a3b, nvidia/nemotron-nano-3-30b-a3b, nvidia/nemotron-3-nano-omni-30b-a3b-reasoning | unverified | probably | cheap fast MoE | unverified |

Sources: https://huggingface.co/poolside/Laguna-XS-2.1, https://docs.api.nvidia.com/nim/reference/google-gemma-4-31b-it, https://www.gmicloud.ai/en/blog/kimi-k2-6-architecture-benchmarks-and-what-it-means-for-production-ai, https://datanorth.ai/news/z-ai-releases-glm-5-3, https://requesty.ai/models/nvidia/nemotron-3-ultra-550b-a55b, https://requesty.ai/models/nvidia/nemotron-3-super-120b-a12b, https://www.requesty.ai/models/deepseek/deepseek-v4.1-flash.

### Top 3 picks

| Job | Groq | NIM |
|---|---|---|
| Agentic coding with tools | 1 qwen/qwen3.8-27b, 2 openai/gpt-oss-120b, 3 llama-3.3-70b-versatile | 1 moonshotai/kimi-k2.6 (if it responds), 2 poolside/laguna-xs-2.1, 3 z-ai/glm-5.3 (alt: google/gemma-4-31b-it for light tool tasks) |
| Cheap fast summarising / reading | 1 openai/gpt-oss-20b, 2 llama-3.1-8b-instant, 3 qwen/qwen3.8-27b with reasoning_effort=none | 1 nvidia/nemotron-3.5-lightning-30b-a3b (unverified), 2 google/gemma-4-31b-it, 3 z-ai/glm-5.3-flash (unverified) |
| Long-context reading | 1 llama-3.3-70b-versatile / gpt-oss-120b (131K, but free TPM 8K makes this unusable without Developer tier), 2 qwen/qwen3.8-27b (131K) | 1 deepseek-ai/deepseek-v4.1-flash (1M, flaky), 2 z-ai/glm-5.3 (1M), 3 nvidia/nemotron-3-super-120b-a12b (256K+) |

## 3. Gotchas for agent loops

Groq:
- `tool_use_failed` (400) happens when the model emits a call Groq's parser rejects (XML-ish `<function=...>`, raw Python, args not matching schema). Reported on llama-3.3-70b and gpt-oss; intermittent. Handle: retry same request 1-2x, then fall back to another model. Sources: https://community.groq.com/t/tool-calling-errors-on-both-gpt-oss-models/406, https://community.groq.com/t/tool-use-fail-rate-increases-recently/438, https://github.com/agno-agi/agno/issues/4090.
- A hallucinated tool call (tool not in `tools`) left in history makes EVERY later request 400 (https://community.groq.com/t/hallucinated-tool-request-throws-groqexception-if-in-message-history/953). Validate tool names before appending the assistant message; if invalid, drop that turn and re-ask.
- `function.arguments` is a JSON string; parse defensively. `role:"tool"` message `tool_call_id` must equal the assistant call id; content any string.
- gpt-oss: no parallel tool calls; send one call per turn.
- Local tool loop = 2 to 10+ inference calls per task; with 30 RPM / 8K TPM budgets, count them.
- Docs do not state max tools count, `tool_choice` or strict mode details (unverified). Keep tools small (<= ~10) and schemas flat.
- Reasoning: use `reasoning_format: hidden` (qwen) or drop the `reasoning` field (gpt-oss) before storing history; MiniMax is the opposite (keep thinking). Qwen thinking temp 1.0/top_p 0.95; instruct temp 0.7. Muse: leave temp unset.
- Streaming works (OpenAI SSE); tool-call deltas arrive chunked, accumulate by index.

NIM:
- Treat a request with no first byte after ~60 s as failed (reports of 300 s silent hangs); set client timeout, abort, fail over. Do not run parallel requests (429 storms from parallel workers).
- Streaming tool calls stall on some models (DeepSeek V4 reported); prefer non-streaming for tool turns.
- Thinking models return `reasoning_content` (and possibly `<think>` in content for some). Strip both before storing/printing; for Kimi consider keeping reasoning in history only if `preserve_thinking` is set (unverified how NIM exposes it).
- 403 = needs model registration; 404 "Function not found" = account missing Public API Endpoints or model removed; 410 = retired. Cache a per-model health result for ~10 min.
- Tool-call id format, null-vs-empty content for assistant messages with tool_calls, max tool count, unsupported JSON-schema keywords (oneOf/anyOf nesting, $ref): NO authoritative source found for either provider (unverified). Defensive defaults that work on OpenAI-compatible servers: keep ids exactly as returned (do not synthesise), send assistant `content: ""` or omit when tool_calls present (null is accepted by OpenAI; some vLLM-backed NIM models reject null, unverified), avoid oneOf/anyOf/$ref/format/pattern, use flat objects with `type`, `description`, `enum`, `required`, `additionalProperties:false`.
- Temperature: Kimi/GLM/DeepSeek thinking models want ~0.6 to 1.0 per their cards (Kimi thinking 1.0, unverified); for tool loops use 0.2 to 0.6 on non-thinking models and keep thinking models at vendor defaults.
- Models may hallucinate tool names more when given long tool lists; nothing model-specific measured here. Validate names client-side against the offered list.

## 4. Agent HQ role recommendations

Rule of thumb: Claude for anything that edits shared state, needs deep Roblox/Luau correctness, long multi-step tool loops, or judgment on design/economy. Free providers for read-only, short, retryable work with a Claude fallback.

| Role | Verdict | Model suggestion | Why |
|---|---|---|---|
| lead / planner | Stay on Claude | - | Long-horizon coordination, tool loops, tight budgets make free tiers fragile |
| scout (web research) | OK off Claude | NIM kimi-k2.6 or glm-5.3; Groq qwen3.8-27b | Read-only, fail-soft; Groq TPM 8K limits page size, so summarise in chunks |
| architect / docs | Partly | NIM glm-5.3 / Groq gpt-oss-120b for drafts; Claude for final decisions | Doc drafting tolerates retries; design bible must agree with code, needs reliability |
| builder (Luau code) | Stay on Claude (optional: kimi-k2.6 / laguna-xs-2.1 on a branch with tests) | | Luau strict typing, Rojo/Studio MCP, server-authoritative rules; benchmarks are Python/JS-heavy, no Luau data found; tool loops fragile |
| ui (Luau UI) | Stay on Claude | | Needs visual judgment and Theme/Icons/Motion conventions |
| economy / tuning + tests | Stay on Claude | | Money rules (no paid random, no paid power) and numeric correctness; errors are costly. Pure number crunching sub-steps could go to qwen3.8-27b |
| reviewer | Second opinion only | Groq gpt-oss-120b or NIM kimi-k2.6 as extra reviewer; Claude has final say | Read-only diff review is a good fit; false positives acceptable |
| kid-tester / text review | OK off Claude | Groq gpt-oss-20b / llama-3.1-8b-instant / NIM gemma-4-31b-it | Short text in, text out, no tools, cheap |
| producer / status | OK off Claude | Groq gpt-oss-20b, NIM nemotron-nano / lightning | Summaries of logs; tiny prompts |
| liveops / metrics | OK for summaries only | Groq llama-3.3-70b / qwen3.8-27b (reasoning none) | Numerical claims must be computed in code, not by the model |

Recommended fallback chains (hard-code):
- Tool-using: groq `qwen/qwen3.8-27b` -> groq `openai/gpt-oss-120b` -> nim `moonshotai/kimi-k2.6` -> nim `poolside/laguna-xs-2.1` -> nim `z-ai/glm-5.3` -> Claude.
- Text-only cheap: groq `openai/gpt-oss-20b` -> groq `llama-3.1-8b-instant` -> nim `google/gemma-4-31b-it` -> Claude.
- Long context: nim `deepseek-ai/deepseek-v4.1-flash` -> nim `z-ai/glm-5.3` -> groq `llama-3.3-70b-versatile` (dev tier only) -> Claude.
- Probe at startup: one 5-token chat call per candidate; mark dead on 403/404/410/timeout; re-probe every 10 min.

## 5. Open questions (could not verify)
- Groq current Free numbers for llama-3.3-70b and llama-3.1-8b (not shown in the table today).
- Exact NIM tool-call format limits, `tool_choice` support, max tools, null content handling.
- NIM context/output for glm-5.3-flash, minimax-m3.1-flash, step-5-preview, nemotron-3.5-*; NIM thinking toggle parameter names.
- Whether NIM sends `x-ratelimit-*` / `retry-after`.
- Any Luau-specific coding benchmark for these models (none found).

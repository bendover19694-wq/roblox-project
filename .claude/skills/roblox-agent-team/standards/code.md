# Code standard (builder, economy, merchant; ui and world when they write Luau; reviewer)

Read with `anti-slop.md` and the game's CLAUDE.md.

- `--!strict` in every module; one service per file; small modules.
- The server is authoritative for currency, saves, randomness and purchases. The client requests and renders; it never grants.
- Every remote is validated in its handler (types, ranges, string length), rate limited and size limited.
- Purchases: one idempotent ProcessReceipt; grant, save, then return PurchaseGranted.
- Tuning values live in Config, never inline. No magic numbers.
- Smallest complete change: reuse what exists; no speculative options or wrappers, no dead code, no TODO shipped as done.
- Pure logic gets a spec test that checks behaviour, not wiring. Run the game's test, lint and format commands and read the output.
- Studio: Edit mode, read the console, capture what changed, leave no stray test parts.

Sources: the game's CLAUDE.md and technical architecture; LihFolk Vault V2 (CC BY 4.0) Luau, networking and security chapters.

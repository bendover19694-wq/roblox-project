# Reusable systems

Systems that already exist in `src/` and can be reused by any new game or feature. Each entry says what it does, where it lives, and when to reuse it. Check here before writing something new. Every path below is a real file.

## Net validators and rate limiter
- **Does:** validates every client-to-server remote payload (`isFinite`, `isInt`, `isEnum`, `isVector`) and rate-limits each remote with a token bucket (`limiter(perSecond, burst, clock)`). The clock is injectable, so it is testable under Lune.
- **Lives in:** `src/shared/Net.luau`, remote names in `src/shared/Remotes.luau`, tests in `tests/Net.spec.luau`.
- **Reuse when:** you add any remote. Validate inside the handler, rate-limit it, and never trust the client for value.

## Receipts and ProcessReceipt idempotency
- **Does:** records handled developer-product receipts in the player's profile under the key `R_{UserId}_{PurchaseId}`, so a retried receipt never grants twice. The server grants, then saves, then reports granted.
- **Lives in:** `src/shared/Receipts.luau` (pure), the single `ProcessReceipt` in `src/server/Services/AgencyService.luau`, tests in `tests/Receipts.spec.luau`.
- **Reuse when:** you add any purchase. There must be exactly one `ProcessReceipt`; add a product case to it, never a second handler.

## ProfileSchema migrations
- **Does:** defines the saved player data, its defaults, and forward-only idempotent migrations (`default`, `migrate`).
- **Lives in:** `src/shared/ProfileSchema.luau`, tests in `tests/ProfileSchema.spec.luau`.
- **Reuse when:** you add or rename a saved field. Add the default and a migration step, bump the version, and add a spec.

## DataService session lock
- **Does:** loads and saves player profiles in DataStores with a simple session lock stored in the record. If loading fails the player still plays, saving is off, and the HUD says so.
- **Lives in:** `src/server/Services/DataService.luau`.
- **Reuse when:** you need persistence. Go through `load`, `get` and `save`; never call DataStores directly. Upgrade to ProfileStore if players report lost progress after server hops (decision D-007).

## Economy
- **Does:** all game math: trip time and profit, demand and competition labels, rating, career goals and stage progress, and offline catch-up values. Pure and tested.
- **Lives in:** `src/shared/Economy.luau`, tuning values in `src/shared/Config/Tuning.luau`, `Career.luau`, `Destinations.luau`, `Rockets.luau`, tests in `tests/Economy.spec.luau`.
- **Reuse when:** you change prices, rewards or pacing. Change `Config`, not inline numbers, and run the economy spec.

## Contracts
- **Does:** three small daily goals per UTC day, rolled deterministically from the day number so a rejoin never re-rolls. Includes progress bumping and claiming.
- **Lives in:** `src/shared/Contracts.luau`, tests in `tests/Contracts.spec.luau`.
- **Reuse when:** you want a daily reason to return that cannot be re-rolled or exploited.

## Launch and perfect launch
- **Does:** judges timing-based bonuses on the server using its own receive time (`window`, `judge`). A miss changes nothing; it is never a penalty.
- **Lives in:** `src/shared/Launch.luau`, tests in `tests/Launch.spec.luau`.
- **Reuse when:** you add a skill-timing bonus that must be server-judged.

## Mission clock and offline catch-up
- **Does:** the server mission clock completes trips on real time, and on join credits trips finished while the player was away, capped by `offlineCapSeconds`, then shows a Welcome summary. There is no separate MissionClock file; it is part of the agency service.
- **Lives in:** `src/server/Services/AgencyService.luau`, math in `src/shared/Economy.luau`, cap in `src/shared/Config/Tuning.luau`.
- **Reuse when:** progress should keep growing while the player is away, which is a documented return driver.

## Telemetry funnel
- **Does:** wraps `AnalyticsService` server-side with pcall so analytics can never break gameplay: onboarding funnel steps (logged once, in order), economy sources and sinks, and custom events.
- **Lives in:** `src/server/Services/Telemetry.luau`.
- **Reuse when:** you add a step to the first-session flow or a new currency. Every new funnel step and sink goes through here.

## Theme, Icons, Motion and Juice
- **Does:** `Theme` holds the design tokens (colors, fonts, radii). `Icons` draws every icon from Frames with no images or emoji. `Motion` has the 8 animation patterns and honours reduced motion. `Juice` adds coin bursts, confetti and floating text, cosmetic only.
- **Lives in:** `src/client/UI/Theme.luau`, `src/client/UI/Icons.luau`, `src/client/UI/Motion.luau`, `src/client/UI/Juice.luau`, plus shared pieces in `src/client/UI/Kit.luau`.
- **Reuse when:** you build any screen. Build from these; add a new icon to `Icons`, never an emoji or an image.

## Wizard
- **Does:** the three-step Plan Mission flow (destination, rocket, pricing) with a live preview of the numbers.
- **Lives in:** `src/client/UI/Wizard.luau`.
- **Reuse when:** a player must make a multi-step choice with a preview before committing.

## Toasts
- **Does:** small batched arrival pills, bigger milestone cards, and error notices.
- **Lives in:** `src/client/UI/Toasts.luau`.
- **Reuse when:** you need to tell the player something happened without blocking them.

## Advisor
- **Does:** the first-session guide: a speech bubble plus a pulsing ring on the exact control to press next. Steps are derived from game state, so it cannot get stuck out of sync.
- **Lives in:** `src/client/UI/Advisor.luau`.
- **Reuse when:** you add a first-session step. Add a derived step instead of a scripted tutorial.

## Gifts (playtime rewards)
- **Does:** minutes played per UTC day unlock reward tiers that open in order.
- **Lives in:** `src/shared/Gifts.luau`, tests in `tests/Gifts.spec.luau`.
- **Reuse when:** you want a daily play reward whose timer is truthful and never restarts.

## Research lab
- **Does:** three upgrade tracks bought with cash, with level costs and combined effects.
- **Lives in:** `src/shared/Research.luau`, tests in `tests/Research.spec.luau`.
- **Reuse when:** you want long-term upgrades that cost in-game currency only.

## Patches (collection)
- **Does:** a collection derived from visits and career stage, so nothing extra is saved.
- **Lives in:** `src/shared/Patches.luau`, tests in `tests/Patches.spec.luau`.
- **Reuse when:** you want a collection or completion goal that costs no save data.

## Format helpers
- **Does:** shared number formatting for money, integers and durations.
- **Lives in:** `src/shared/Format.luau`.
- **Reuse when:** you show any number to the player, on client or server.

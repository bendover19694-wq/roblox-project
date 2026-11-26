# Clip rarity, luck and the core loop (plan, 2026-11-22)

## Goal
Every clip a player records is a small surprise. The server rolls what sort of clip it is (Common to Mythic), the player sees the result at once, and rarer clips pay more when posted. Upgrades and rebirths shift the odds and the payout. All randomness is free: no paid random items, no paid luck, no paid odds.

## The loop
1. **Record**: each CLIP tap is one *take*. The server rolls the take's rarity, then adds `Tap Power` clips of that rarity to the drive. Clip Speed clips bank up and become one take per whole-clip batch.
2. **Clip reveal**: the client shows the take's rarity. Common and Uncommon: a coloured `+N` float. Rare: a coloured callout. Epic: a banner. Legendary and Mythic: a reveal card with a burst. A Mythic is announced to the whole server.
3. **Post**: POST sells the whole drive. Pay = sum over tiers of (clips of that tier x tier payout) x cash per clip, x5 if the post goes viral. Followers use the same tier weighting.
4. **Earn and upgrade**: cash buys upgrades; followers open setups down the street.
5. **Rebirth (Go Viral)**: resets cash, clips and upgrades for +1 Clout. Each Clout multiplies cash by 2.25 (stacking) and adds +10% luck forever.

## Rarity tiers (tuning in `Config.RARITIES`)
| Tier | Base odds | Pays |
|---|---|---|
| Common | the rest | x1 |
| Uncommon | 1 in 4 | x1.5 |
| Rare | 1 in 25 | x3 |
| Epic | 1 in 250 | x10 |
| Legendary | 1 in 2,500 | x40 |
| Mythic | 1 in 50,000 | x250 |

Odds are set for about 7 takes a second: median waits are 4 s (Rare), 0.4 min (Epic), 4 min (Legendary) and 82 min (Mythic).

Roll (pure, `Economy.odds(luck)` and `Economy.rollTier(luck, u)`), vault implementation A: base weight `1 / oneIn` per tier, Common takes the rest; luck multiplies Rare and up (`LUCK_FROM_TIER = 3`), then everything is renormalised. The odds always sum to 1, every label is exact at luck 1, and no tier ever vanishes. The Index shows each tier as "1 in N" at the player's current luck, so what the player reads is what the server rolls.

## Luck
`luck = min(25, (1 + 0.1 x Lucky Lens level) x (1 + 0.1 x Clout) x (2 during a Trailer Drop))`

- **Lucky Lens** (new upgrade): +10% luck per level, base $200, growth 1.5, max 40.
- **Editing Skill** stays the payout upgrade (cash per clip for every tier).
- The Trailer Drop now doubles luck as well as paying x3, so the free server-wide event is the luckiest time to clip.

## Collection
The profile keeps `found` (clips found per tier, ever) and `best` (rarest tier found). The odds panel shows them, and the first time a player finds a tier it says NEW. A goal past the zones: find a Mythic.

## Data
- `drive`: clips stored per tier (sum equals `clips`). Old saves migrate with all stored clips as Common.
- `found`, `best`: as above. `Economy.VERSION` goes to 2.

## Server rules
- Rolls use the server's `Random`; the client never sends a tier or a roll.
- Taps keep their existing cap (batches of 20, 12 per second budget); one roll per counted tap, so rolls per player are capped too.
- Reveals ride the existing `Celebrate` remote (`"clip"` kind with the best tier of a batch, so one batch makes one reveal).

## Tests
`tests/Rarity.spec.luau`: odds sum to 1, luck raises Rare and up (no tier vanishes, luck cap), median and p90 waits, rolls map to tiers, drive bookkeeping, post pays tier-weighted, migration of v1 saves. `tests/Pacing.spec.luau` runs a 3-hour bot with rebirths and seeded rolls.

## Not in this slice
Pity timers (median waits are short enough at 7 takes a second), trading. Paid luck of any kind is out for good.

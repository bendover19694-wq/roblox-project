# Top Eleven (working title): technical architecture and contracts

Luau, `--!strict` in every module. Server authoritative for coins, fans, players, ratings, results, randomness, purchases and saves. The client requests and renders; it never grants value. Design: `game-design-document.md`. Build order: `implementation-plan.md`. Why: `decisions.md`.

## 1. Project layout (T-001)
The game is a second, separate Rojo project. Nothing under the repo's root `src/` changes.
```
games/top-eleven/
  default.project.json     Rojo mapping (same tree shape as Space Agency's)
  selene.toml              std = "roblox" (copy of root)
  docs/                    this folder (architect owns)
  src/
    shared/                -> ReplicatedStorage.Shared
      Config/              Names, Looks, Players, Match, League, Economy, Academy, Tuning, Sounds (pure data)
      Net.luau             COPIED from src/shared/Net.luau (unchanged)
      Receipts.luau        COPIED from src/shared/Receipts.luau (unchanged)
      Format.luau          COPIED from src/shared/Format.luau (unchanged)
      Rng.luau             pure seeded PRNG (runs in Lune)
      NameGen.luau         names from Config/Names (pure)
      Player.luau          overall, value band, aging, generation (pure)
      Match.luau           match sim (pure)
      League.luau          fixtures, quick sim, table, promotion (pure)
      Academy.luau         scout odds and rolls (pure)
      Training.luau        slot checks and gains (pure)
      Market.luau          daily list (pure)
      Economy.luau         rewards, gate, offline, prices, facility costs (pure)
      NextMove.luau        hub suggestion (pure)
      Settle.luau          full-time rewards, exactly once (pure)
      ProfileSchema.luau   v1 schema, default, migrate (pattern copied from Space Agency)
      Remotes.luau         same shape as Space Agency's; adds no new remote types
    server/                -> ServerScriptService.Server
      Main.server.luau
      Services/
        DataService.luau   COPIED from src/server/Services/DataService.luau; store name "TopEleven_v1"
        ClubService.luau   Act handler, view, push, ProcessReceipt (owns all actions except match)
        MatchService.luau  kickoff, segment advance (1 s tick), rewards, end of season hand-off
        Telemetry.luau     COPIED pattern; FUNNEL list from the design doc
    client/                -> StarterPlayer.StarterPlayerScripts.Client
      Main.client.luau, App.luau, DeviceReport.luau (copied)
      UI/  Theme, Icons, Motion, Kit, Toasts, Sounds (COPIED then re-skinned), PlayerCard, Hub, Squad,
           MatchView, Academy, Market, Training, League, Club, Shop, Advisor
    first/Boot.client.luau  copied, re-labelled
  tests/
    run.luau               COPIED from tests/run.luau (it uses paths relative to the cwd)
    *.spec.luau
```
**Copy, not a shared package (T-002).** Net, Receipts, Format, DataService, Telemetry, Theme, Icons, Motion, Kit, Toasts, Sounds and Boot are copied once, with a first-line comment `-- Copied from <path> @ <commit>`. Reasons: Space Agency is in owner testing, so a shared change must never move under it; most of these files are tied to their game (ProfileSchema needs its Tuning, Kit and Theme carry the Space Agency look); the shared pure part is under 150 lines. Ceiling: fixes do not flow both ways. Upgrade path: when a third game starts or a fix is needed in both, move the pure modules to `packages/common/` and map them with a Rojo `$path`.

**Commands** (run from `games/top-eleven/`; tools come from the root `aftman.toml`, Aftman searches parent folders):
```bash
stylua src tests
selene src
lune run tests/run
rojo sourcemap default.project.json -o sourcemap.json && luau-lsp analyze --definitions=../../.types/globalTypes.d.luau --sourcemap=sourcemap.json src
rojo build -o TopEleven.rbxlx
```
`TopEleven.rbxlx` and `sourcemap.json` are git-ignored (add `games/top-eleven/*.rbxlx` to `.gitignore`; root `.gitignore` already covers `sourcemap.json`). The place is a **new private test place**; never the Space Agency place.

## 2. Pure module interfaces
All take plain tables and numbers; none touch Roblox services, so all run under Lune.

```lua
-- Rng: Park-Miller minimal standard, state in a table. Same seed => same sequence on every machine.
Rng.new(seed: number): Rng            -- seed is any integer; 0 is mapped to 1
Rng.next(r: Rng): number              -- float in [0, 1)
Rng.int(r: Rng, lo: number, hi: number): number   -- inclusive
Rng.pick<T>(r: Rng, weights: { [T]: number }): T  -- iterate keys in sorted order so it is deterministic

-- NameGen (reads only Config/Names)
NameGen.player(nameSeed: number): string          -- "First Last"; rerolls seed+1.. while blocked
NameGen.club(placeIdx: number, suffixIdx: number): string
NameGen.aiClub(seed: number, avoid: { number }?): (number, number)  -- placeIdx, suffixIdx; never equal to avoid = {place, suffix}
NameGen.isBlocked(name: string): boolean          -- lower-cased substring match against Names.blocked

-- Player
Player.overall(p: PlayerT, pos: Position?): number     -- pos defaults to p.pos; out of position x outOfPositionMult
Player.generate(r: Rng, opts: { age: number, pos: Position, rarity: Rarity, level: number }): PlayerT  -- id = "" (caller assigns)
Player.ageSeason(p: PlayerT): (PlayerT, boolean)      -- returns player and retired?
Player.autoLineup(players: { PlayerT }, formation: FormationId): { string }   -- 11 ids, best fit per slot
Player.lineupValid(players: { [string]: PlayerT }, slots: any): boolean  -- exactly keys 1..11, distinct owned ids, strings <= 8

-- Match
Match.kickoff(seed: number, home: SideT, away: SideT, tactic: TacticId, now: number): MatchT  -- simulates segment 1
Match.advance(m: MatchT, now: number): boolean        -- simulates every segment whose start time has passed; true if changed
Match.setTactic(m: MatchT, tactic: TacticId, now: number): boolean   -- false if final or no segment left
Match.finish(m: MatchT, now: number)                  -- resolves the rest at once with the current tactic (skip)
Match.isFinal(m: MatchT): boolean
Match.visible(m: MatchT, now: number): { MomentT }    -- moments whose real time <= now (what the client may show)
Match.side(club: { PlayerT }, lineup: { string }, formation: FormationId): SideT  -- strengths from the eleven
Match.aiSide(strength: number, seed: number): SideT   -- AI eleven generated from seed, never saved

-- League
League.new(division: number, season: number, seed: number, playerPair: { number }): LeagueT  -- club 1 = player
League.fixtures(clubCount: number): { { { number } } } -- [matchday] = { {homeIdx, awayIdx}, ... } circle method
League.quick(r: Rng, homeStrength: number, awayStrength: number): (number, number)
League.table(league: LeagueT): { RowT }                -- derived; sort points, goal diff, goals for, then club index
League.isOver(league: LeagueT): boolean
League.endSeason(league: LeagueT, rng: Rng): { division: number, place: number, outcome: "up" | "stay" | "down" | "champion" }
League.aiStrength(division: number, season: number): number

-- Academy
Academy.odds(level: number): { [Rarity]: number }      -- percentages, sum = 100 (shown to the player as-is)
Academy.recharge(a: AcademyT, now: number)             -- adds charges for whole periods passed, keeps the remainder in nextAt;
                                                       -- at the cap the clock stops; spending from the cap sets nextAt = now + rechargeSeconds
Academy.roll(r: Rng, level: number, firstEver: boolean): PlayerT   -- firstEver => rarity "rare"

-- Training
Training.check(p: ProfileT, slot: number, playerId: string, stat: Stat): (boolean, string?)
Training.cost(level: number, stat: number): (coins: number, seconds: number)
Training.apply(player: PlayerT, stat: Stat, gain: number)          -- capped at potential

-- Market
Market.daily(userId: number, day: number, division: number): { PlayerT }   -- deterministic

-- Economy
Economy.matchReward(result: "win" | "draw" | "loss", goals: number, division: number): number
Economy.gate(stadiumLevel: number, fans: number): number
Economy.offline(stadiumLevel: number, fans: number, seconds: number): number   -- seconds clamped to offline cap
Economy.fansDelta(result: "win" | "draw" | "loss", division: number): number
Economy.seasonPrize(division: number, place: number): number
Economy.playerValue(p: PlayerT): number
Economy.facilityCost(facility: FacilityId, nextLevel: number): number

-- Settle (pure; MatchService calls it every tick and on join)
Settle.run(p: ProfileT, now: number): MatchResultT?   -- advances the match; if final and not rewarded: credits coins and fans,
                                                       -- stores the result, quick-sims the matchday, sets rewarded; else nil

-- NextMove
NextMove.of(p: ProfileT, now: number): NextMoveId   -- "createClub"|"fixLineup"|"claimTraining"|"scout"|"nextSeason"|"playMatch"
```

## 3. Data contracts
```lua
type Position = "GK" | "DF" | "MF" | "FW"
type Stat = "pace" | "shooting" | "passing" | "defending" | "keeping"
type Rarity = "common" | "rare" | "epic" | "legendary"
type TacticId = "attack" | "balanced" | "defend" | "press"
type FormationId = "4-4-2" | "4-3-3" | "3-5-2" | "5-3-2" | "4-5-1"   -- slot positions in Config/Match.formations
type FacilityId = "stadium" | "training" | "academy"

type PlayerT = {
  id: string,              -- "p" .. n, unique per profile (profile.nextPlayerId)
  nameSeed: number,        -- name = NameGen.player(nameSeed); NEVER store the name string
  pos: Position,
  age: number,             -- 16..35
  potential: number,       -- 40..99, cap for every rating
  rarity: Rarity,
  r: { pace: number, shooting: number, passing: number, defending: number, keeping: number },  -- 1..99
  look: { skin: number, hair: number, hairColor: number, face: number },  -- indices into Config/Looks
  joined: number,          -- season number when signed (display)
}

type ClubT = { place: number, suffix: number, color: number, crest: number, founded: number }  -- word indices, unix time

type AiClubT = { place: number, suffix: number, color: number, crest: number, strength: number, seed: number }

type LeagueT = {
  division: number,        -- 5 (lowest) .. 1
  season: number,          -- 1..
  seed: number,            -- quick-sim seed for this season
  clubs: { AiClubT },      -- index 1 is always the player's club (fields unused for index 1 except strength=0)
  results: { { { number } } },  -- [matchday] = { {homeIdx, awayIdx, homeGoals, awayGoals}, ... } once played
  matchday: number,        -- next matchday to play, 1..#fixtures+1
}

type SideT = { attack: number, mid: number, defence: number, keeper: number,
               scorers: { { id: string, w: number } } }   -- weights for picking who takes a chance

type MomentT = { minute: number, at: number, kind: "goal" | "save" | "miss" | "bigChance",
                 side: "home" | "away", playerId: string }  -- AI ids are "ai" .. n, named via seed

type MatchT = {
  id: number, seed: number, matchday: number, homeIdx: number, awayIdx: number,
  home: SideT, away: SideT,
  startedAt: number,       -- server time (workspace:GetServerTimeNow())
  segment: number,         -- segments simulated so far, 1..3
  tactics: { TacticId },   -- tactic used for each simulated segment
  pending: TacticId,       -- tactic for the next segment
  moments: { MomentT },
  score: { number },       -- {home, away}
  final: boolean,
  rewarded: boolean,       -- set by MatchService after coins and fans are credited (idempotent guard)
}

type MatchResultT = { matchday: number, opponent: number, home: boolean, score: { number },
                      result: "win" | "draw" | "loss", coins: number, fans: number }   -- sent in Celebrate "fullTime"
```

### Profile schema v1 (DataStore `TopEleven_v1`, key `Player_{UserId}`)
```lua
{
  version = 1,
  club = { place = 0, suffix = 0, color = 1, crest = 1, founded = 0 },  -- place = 0 means not created
  coins = Tuning.startCoins,
  fans = Tuning.startFans,
  players = {} :: { [string]: PlayerT },
  nextPlayerId = 1,
  lineup = { formation = "4-4-2", slots = {} :: { string } },  -- 11 ids in formation slot order
  tactic = "balanced",
  league = LeagueT,           -- created with the club
  match = nil :: MatchT?,     -- active or last match; replaced at next kickoff
  nextMatchId = 1,
  training = { slots = {} :: { { playerId: string, stat: Stat, endsAt: number } | false } },
  academy = { level = 1, charges = 1, nextAt = 0, prospects = {} :: { PlayerT }, reports = 0 },
  facilities = { stadium = 1, training = 1, academy = 1 },
  market = { day = 0, bought = {} :: { number } },   -- list itself is derived from (UserId, day)
  legends = {} :: { { nameSeed: number, pos: Position, best: number } },  -- retired, display only, max 30
  stats = { played = 0, won = 0, drawn = 0, lost = 0, goals = 0, promotions = 0, titles = 0 },
  lastSeen = 0,
  funnel = 0,
  tips = {},
  settings = { reducedMotion = false, sound = true },
  receipts = {},              -- Receipts.luau, R_{UserId}_{PurchaseId}
  telemetry = { firstDay = 0, source = "" },
}
```
- `ProfileSchema.migrate` copies Space Agency's: v1 has one identity migration; `fill` supplies missing defaults. Forward-only and idempotent; tested.
- Training slot entries are `false` when empty (DataStore arrays must not have holes).
- Size: 24 players x ~200 bytes + league + match under 15 KB, far under 4 MB.

## 4. Remotes
Same as Space Agency: `Remotes.luau` creates `State`, `Toast`, `Celebrate`, `Welcome`, `Device` (RemoteEvents) and `Act` (RemoteFunction). The client never sends a result, a price, a rating or a time.

**S to C**
- `State(view)`: the whole view after any change (event-driven only; during a match that is kickoff and each segment start, and the client animates moments from their `at` against `serverNow`). The view contains `club`, `clubName`, `coins`, `fans`, `players` (with `name` and `overall` computed), `lineup`, `tactic`, `league` (with `table` computed and `fixtures`), `match` (only `id, matchday, homeIdx, awayIdx, startedAt, segment, tactics, pending, score-so-far, final` and `Match.visible` moments; **never `seed`, `home`, `away` or future moments**: Match.luau is replicated, so a leaked seed lets an exploiter pre-run the next segment under every tactic and pick the winner), `training`, `academy` (with `odds` and `nextAt`), `market` (today's list with prices), `facilities` (with next costs), `nextMove`, `settings`, `canSave`, `serverNow`.
- `Toast(text, kind)`.
- `Celebrate(kind, data)`: `goal {side, playerId, name}`, `fullTime MatchResultT`, `scout {player}`, `trained {playerId, stat, from, to}`, `season {division, place, outcome, prize}`, `upgrade {facility, level}`.
- `Welcome(summary)`: `{ seconds, coins, trainingReady: number, scoutCharges: number, matchFinished: MatchResultT? }`.

**C to S: `Act(action, ...) -> (ok: boolean, message: string?)`**
Global: `Net.limiter(8, 12)` per player for all actions (copied from Space Agency). The player comes from the remote, never the payload. The handler is `pcall`'d. Every action except `createClub`, `setFlag` and `seenTip` requires `club.place ~= 0`. Strings are rejected above `Net.MAX_STRING` (32). Tables are rejected unless they pass the exact checks below.

| Action | Args | Validation (in order) | Effect |
|---|---|---|---|
| `createClub` | place, suffix, color, crest | club not created; `Net.isInt(place, 1, #Names.places)`, `Net.isInt(suffix, 1, #Names.suffixes)`, `Net.isInt(color, 1, #Looks.kits)`, `Net.isInt(crest, 1, #Looks.crests)` | Club, 16 starting players, auto lineup 4-4-2, Division 5 league with fresh seed |
| `setFormation` | formation | `Net.isEnum(formation, FORMATIONS)`; no live match | Re-runs `Player.autoLineup` only for empty slots |
| `setLineup` | slots | `type(slots) == "table"`; exactly 11 keys 1..11 (count keys, reject extras); each `type == "string"`, `#s <= 8`, exists in `players`, all distinct; no live match | Saves lineup |
| `setTactic` | tactic | `Net.isEnum(tactic, TACTICS)` | Pre-match: sets `tactic`. Live match: `Match.setTactic` for the next segment |
| `playMatch` | none | no live match; `now >= lastMatch.startedAt + 3 * segmentSeconds` (skip shows the result early but never speeds up matches, so skip+replay cannot farm coins); season not over; lineup has 11 valid ids | `Match.kickoff` with seed from server `Random.new():NextInteger(1, 2^31-2)` |
| `skipMatch` | none | live match; `stats.played >= 1` | `Match.finish`; rewards credited by MatchService |
| `nextSeason` | none | `League.isOver`; no live match | `League.endSeason`, aging, retirements, prize, new AI clubs; then free common 17-year-olds are added until the squad has `squad.minAfterSeason` (14), so retirements can never leave fewer than 11 |
| `startTraining` | slot, playerId, stat | `Net.isInt(slot, 1, slotsForLevel)`; `type(playerId) == "string" and #playerId <= 8`; `Net.isEnum(stat, STATS)`; then `Training.check` (slot empty, player owned, not already training, rating below potential, coins >= cost) | Deducts coins, sets `endsAt = now + seconds` |
| `claimTraining` | slot | `Net.isInt(slot, 1, slotsForLevel)`; slot set and `now >= endsAt` | `Training.apply`, slot = false |
| `scout` | none | `Academy.recharge` first; `charges >= 1`; `#prospects < academy.maxProspects` | `Academy.roll` with a server-seeded Rng; prospect added |
| `promote` | index | `Net.isInt(index, 1, #prospects)`; squad below `squad.max` | Prospect moves to `players` with a new id |
| `release` | index | `Net.isInt(index, 1, #prospects)` | Prospect removed |
| `buyPlayer` | index | if `market.day ~= today` reset `market = {day = today, bought = {}}`; `Net.isInt(index, 1, Config market.size)`; index not in `market.bought` for today; squad below max; coins >= price | Player copied in with a new id |
| `sellPlayer` | playerId | string `#<=8`, owned; not in a live-match lineup; squad stays >= 11 after; not training | Coins += value x sellRate; removed from lineup slots (auto-filled) |
| `upgradeFacility` | facility | `Net.isEnum(facility, FACILITIES)`; below max level; coins >= cost | Level + 1 |
| `setFlag` | key, value | key in `{reducedMotion, sound}`; `type(value) == "boolean"` | Settings |
| `seenTip` | tipId | `Net.isEnum(tipId, TIPS)` | Tip remembered |

`Device(class)`: as Space Agency (`Net.isEnum`, `Net.limiter(0.2, 2)`), telemetry only.

**Match timing on the server.** `MatchService` runs a 1 s Heartbeat-accumulated tick over players with a live match: `Match.advance(m, serverNow)`; push State only when it returns true; then `Settle.run(p, now)`: when final and not `rewarded`, it credits `Economy.matchReward` + gate (home) + `fansDelta`, stores the result in `league.results`, quick-sims the rest of the matchday with `League.quick` seeded by `league.seed + matchday`, sets `rewarded = true`; MatchService then sends `Celebrate("fullTime")` and saves. The same function runs on load (catch-up), so a player who left mid-match gets the same rewards.

## 5. Purchases
Copy Space Agency's `processReceipt` (in `ClubService`): player not here -> `NotProcessedYet`; `Receipts.seen` -> `PurchaseGranted`; grant into profile; `Receipts.record`; save; then `PurchaseGranted`. Never grant on `PromptProductPurchaseFinished`. Products are cosmetic or approved convenience only (design doc, Monetization). No product touches `academy`, `Rng`, ratings or match strength.

## 6. Randomness
- Match: one seed per match from server `Random`, stored in `MatchT.seed`. All further rolls come from `Rng.new(seed + segment * 7919)`, so segments are reproducible from the saved record.
- Scout: `Rng.new(serverRandomInt)` per report; odds from `Academy.odds(level)` exactly as shown.
- Market: `Rng.new(userId * 100003 + day)`; same list all day, any server.
- AI clubs and AI elevens: from `league.seed` and `AiClubT.seed`; never saved as players.
- No paid input reaches any of these.

## 7. Naming (T-004)
- **One data file:** `src/shared/Config/Names.luau` holds every player and club word: `firstSyllables`, `lastSyllables`, `places`, `suffixes`, and `blocked` (lower-case substrings: real footballer surnames, real club names and words unsuitable for Mild content).
- No player name string is ever stored. Players store `nameSeed`; clubs store word indices. Swapping the data file renames everything in every save.
- **Lists are append-only.** Changing an entry in place is allowed (it renames); deleting or reordering breaks saved indices and is forbidden. The spec checks list lengths never shrink against `Names.MIN_LENGTHS`.
- Generator: first name = 2 syllables, last name = 2 or 3 syllables, capitalised, 3..12 letters each; if `isBlocked`, try `nameSeed + 1`, `+2`, ... (max 20, then a safe fallback from the first entries).
- Near-miss parodies of real players (e.g. the owner's "Juke Bellinghand") are **not** generated until the owner decides (T-003). Real crests and kits are never used; crests are drawn shapes from `Looks.crests`.

## 8. Tests (Lune, `games/top-eleven/tests/*.spec.luau`)
Rng, NameGen, Player, Match, League, Academy, Training, Market, Economy, NextMove, ProfileSchema, Net (copied spec), Receipts (copied spec). Each task in `implementation-plan.md` names its assertions.

## 9. Ownership
- builder: `src/shared/*.luau` except Config tuning numbers, `src/server/**`, `tests/**`, `default.project.json`.
- economy: `src/shared/Config/Economy.luau`, `Academy.luau` numbers, `League.luau` prizes; runs the time-to-upgrade simulation.
- ui: `src/client/**`, `src/first/**`, `Config/Looks.luau`, `Config/Sounds.luau`.
- architect: `docs/**`.
Changing a contract in sections 2 to 4 means updating this file in the same change.

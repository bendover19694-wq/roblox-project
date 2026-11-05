# Top Eleven (working title) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable first session of the football manager: found a club, play a 40 s server-simulated match, scout, train, upgrade, finish and get promoted from a 5-match season.

**Architecture:** A separate Rojo project in `games/top-eleven/`. Pure, Lune-tested shared modules (Rng, NameGen, Player, Match, League, Academy, Training, Market, Economy, NextMove, ProfileSchema) do all the logic; two server services wire them to one validated `Act` RemoteFunction; the client renders `State` with a copied, re-skinned Space Agency UI kit.

**Tech Stack:** Luau `--!strict`, Rojo 7.7, Lune 0.11, StyLua, Selene, luau-lsp (pinned in the root `aftman.toml`).

**Spec:** `games/top-eleven/docs/game-design-document.md` and `games/top-eleven/docs/technical-architecture.md` (contracts, sections 2 to 4, are binding). Decisions: `decisions.md`.

## Global Constraints
- All paths below are relative to `games/top-eleven/`. All commands run from there.
- Never edit the repo root `src/`, `tests/` or `default.project.json`. Copied files start with `-- Copied from <root path> @ <git short sha>`.
- `--!strict` first line of every module. One service per file. Files under 500 lines.
- Tuning numbers only in `src/shared/Config/*`. Pure modules never call Roblox services and take `now` as a parameter.
- One clock: server code uses `workspace:GetServerTimeNow()` for every saved time (match, training `endsAt`, academy `nextAt`, `lastSeen`).
- Every `Act` action validated with `Net` helpers exactly as the table in technical-architecture section 4; global `Net.limiter(8, 12)`.
- No paid random items, no paid odds or reports, no selling Coins, no paid match power. No free text. No em dashes in player text. Mild content: no injuries, cards or fouls.
- No real player, club, league, crest or kit names. Names only through `NameGen` + `Config/Names.luau`; never store a name string.
- Done means: `stylua src tests`, `selene src`, `lune run tests/run` (0 failed), luau-lsp analyze clean, and (from Task 9) a Studio playtest in a **new private test place** with the console read.

## Review Focus
1. **Malformed `setLineup` tables** (holes, 12 keys, string keys, duplicate ids, non-strings, ids longer than 8): must be rejected with no change. Test in Task 9 via a pure `Lineup.valid(players, slots)` in `Player.luau`.
2. **Leaving or a server shutdown mid-match:** rewards credited exactly once, on whichever server runs the catch-up. `rewarded` is saved with the profile; Task 9 test drives `Settle.run(p, now)` twice and checks coins once.
3. **Selling or promoting at the edges:** sell a starter, a player in training, or the 11th player; promote or buy with a full squad. All rejected or auto-filled as the table says. Task 9 tests.
4. **Timers never restart:** spending a scout charge at the cap starts the recharge from the spend time; a partial period is kept; the training timer survives a rejoin. Task 6 tests.
5. **Market day boundary:** `market.bought` resets when the UTC day changes, and an index bought yesterday is buyable today only from today's list. Task 6 test.

---

### Task 1: Project scaffold, copied modules, Rng

**Files:**
- Create: `default.project.json` (same tree as root, paths into this folder), `selene.toml` (`std = "roblox"`)
- Copy: `src/shared/Net.luau`, `Receipts.luau`, `Format.luau`; `tests/run.luau`, `tests/Net.spec.luau`, `tests/Receipts.spec.luau` from the root
- Create: `src/shared/Rng.luau`, `tests/Rng.spec.luau`
- Modify: root `.gitignore` add `games/top-eleven/*.rbxlx`

**Interfaces:** Produces `Rng.new/next/int/pick` (technical-architecture section 2).

- [ ] **Step 1: Copy the files and run** `lune run tests/run`. Expected: copied Net and Receipts specs pass.
- [ ] **Step 2: Write failing tests** in `tests/Rng.spec.luau`:
  - `Rng same seed same sequence`: two `Rng.new(42)` give equal first 100 `next` values.
  - `Rng range`: 10,000 `Rng.int(r, 1, 6)` all in 1..6 and each face 1,400..1,950 times.
  - `Rng seed 0 works`: `Rng.next(Rng.new(0))` is in [0, 1).
  - `Rng.pick deterministic`: `pick(r, {a=1,b=1,c=98})` with seed 7 returns the same value on two fresh rngs; over 10,000 picks `c` is 97-99%.
- [ ] **Step 3: Implement** Park-Miller (`state = state * 16807 % 2147483647`), seed mapped into 1..2147483646; `pick` sorts keys before walking weights.
- [ ] **Step 4: Run** `lune run tests/run`. Expected: `N passed, 0 failed`.
- [ ] **Step 5: Run** stylua, selene, `rojo build -o TopEleven.rbxlx` succeeds. Commit `top-eleven: scaffold, copied Net/Receipts, Rng`.

### Task 2: Names data file and NameGen

**Files:** Create `src/shared/Config/Names.luau`, `src/shared/NameGen.luau`, `tests/NameGen.spec.luau`

**Interfaces:** Consumes `Rng`. Produces `NameGen.player/club/aiClub/isBlocked`; `Names.MIN_LENGTHS`.

- [ ] **Step 1: Write failing tests:**
  - `same seed same name`: `NameGen.player(123) == NameGen.player(123)`.
  - `names are fictional`: for seeds 1..5,000 `not NameGen.isBlocked(name)` and each word 3..12 letters, letters only, capitalised.
  - `variety`: seeds 1..1,000 give at least 900 distinct names.
  - `blocked works`: put a test word into a copy and check `isBlocked` is case-insensitive (`isBlocked("x BELLINGHAM y")` true when "bellingham" is listed).
  - `lists never shrink`: `#Names.firstSyllables >= Names.MIN_LENGTHS.firstSyllables` (same for last, places, suffixes).
  - `club name`: `NameGen.club(1, 1)` equals `Names.places[1] .. " " .. Names.suffixes[1]`; `aiClub(seed)` never returns a pair equal to a given player's pair when passed as `avoid`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Names: at least 40 first syllables, 60 last syllables, 40 invented place words, 12 generic suffixes (Rovers, United, Athletic, Town, City, Albion, Wanderers, Rangers, Harriers, Olympic, Borough, Sporting), and `blocked` with at least 60 well-known real footballer surnames and club place names plus unsuitable words. `aiClub(seed, avoid: {number}?)`.
- [ ] **Step 4: Run, expect PASS.** Commit `top-eleven: fictional name generator`.

### Task 3: Player model, looks and lineup

**Files:** Create `src/shared/Config/Players.luau` (overall weights per position, rarity potential bands, `outOfPositionMult = 0.75`, `declineAge = 31`, `declinePerSeason = 2`, `retireAge = 36`), `src/shared/Config/Looks.luau` (builder creates it with these counts and placeholder colours; ui owns the colours afterwards: 6 skins, 10 hair, 8 hair colours, 6 faces, 8 kits, 6 crests), `src/shared/Config/Match.luau` (formations only for now), `src/shared/Player.luau`, `tests/Player.spec.luau`

**Interfaces:** Produces `Player.overall/generate/ageSeason/autoLineup`, `Player.lineupValid(players: {[string]: PlayerT}, slots: any): boolean`, types `PlayerT`, `Position`, `Stat`, `Rarity`, `FormationId`.

- [ ] **Step 1: Write failing tests:**
  - `overall GK uses keeping`: GK with keeping 80, others 20 has overall >= 70.
  - `out of position`: a FW played as `GK` has `overall(p, "GK") <= 0.75 * overall(p)` rounded.
  - `generate in bands`: 1,000 generated rare players have potential inside the rare band, all ratings <= potential, age as given, look indices inside `Looks` counts.
  - `ageSeason`: age 30 -> 31 no decline; 31 -> 32 pace drops by `declinePerSeason`; 35 -> retired true.
  - `autoLineup`: 16 players (2 GK, 5 DF, 5 MF, 4 FW) and "4-4-2" give 11 distinct ids with a GK in slot 1.
  - `lineupValid` rejects: `nil`, 10 ids, 12 entries, `{[1]=..., [12]=...}`, a key `"x"`, a duplicate id, a number, a 9-char string, an unknown id; accepts the autoLineup result.
- [ ] **Step 2: Run, FAIL. Step 3: Implement. Step 4: Run, PASS.** Commit `top-eleven: player model`.

### Task 4: Match sim

**Files:** Extend `src/shared/Config/Match.luau` (`segmentSeconds = 13`, segment minute ranges, tactic multipliers, chance base rates); create `src/shared/Match.luau`, `tests/Match.spec.luau`

**Interfaces:** Consumes `Rng`, `Player`. Produces `Match.kickoff/advance/setTactic/finish/isFinal/visible/side/aiSide`, types `MatchT`, `SideT`, `MomentT`, `TacticId`. AI player ids are `"ai" .. slot`; their names are `NameGen.player(aiSeed * 31 + slot)`.

- [ ] **Step 1: Write failing tests:**
  - `deterministic`: two `kickoff(99, h, a, "balanced", 0)` then `advance(m, 100)` give identical `moments` and `score`.
  - `no future`: after `kickoff(..., now=0)`, `m.segment == 1`; `visible(m, 0)` has no moment with `at > 0`; `advance(m, 12)` returns false; `advance(m, 13)` returns true and `segment == 2`.
  - `tactic per segment`: `setTactic(m, "attack", 5)` then `advance(m, 13)` gives `m.tactics[2] == "attack"`; `setTactic` after final returns false.
  - `finish`: `finish(m, 1)` makes `isFinal` true, `segment == 3`, and equals advancing with the same tactic (skip changes nothing).
  - `distribution` (2,000 seeds): mean goals 2.4..3.2; +10 overall side wins 60..75%; equal sides draw 22..32%; `attack` vs `defend` changes mean goals by at least 0.3.
  - `moments`: every moment's minute is inside its segment range, `kind` is one of the 4, `playerId` is in that side's eleven, goals in moments equal `score`.
- [ ] **Step 2: FAIL. Step 3: Implement** segments with `Rng.new(seed + segment * 7919)`; moment `at = startedAt + (minute - segStartMinute) / 30 * segmentSeconds + (segment - 1) * segmentSeconds`. **Step 4: PASS** (tune Config only to hit ranges). Commit `top-eleven: match sim`.

### Task 5: League

**Files:** Create `src/shared/Config/League.luau` (`divisions = 5`, `clubsPerDivision = 6`, `promote = 2`, `relegate = 1`, AI strength curve, first-match opponent gap), `src/shared/League.luau`, `tests/League.spec.luau`

**Interfaces:** Consumes `Rng`, `NameGen`. Produces `League.fixtures/quick/table/isOver/endSeason/aiStrength/new(division, season, seed, playerPair) -> LeagueT`, types `LeagueT`, `AiClubT`, `RowT = {club, played, won, drawn, lost, gf, ga, points}`.

- [ ] **Step 1: Write failing tests:**
  - `fixtures`: 6 clubs -> 5 matchdays, 3 games each, every pair exactly once, nobody twice in a matchday, club 1 alternates home and away at least twice.
  - `table derived`: given hand-written results, points 3/1/0 and the documented tie order.
  - `endSeason`: place 1 or 2 in div 5 -> "up" and division 4; place 6 in div 5 -> "stay"; place 6 in div 3 -> "down"; place 1 in div 1 -> "champion", stays 1, season + 1.
  - `quick` with the same seed is deterministic; mean goals 2.0..3.4 over 2,000.
  - `new`: club 1 is the player; AI names never equal the player's pair; first-matchday opponent of club 1 is the weakest AI club.
- [ ] **Step 2: FAIL. Step 3: Implement (circle method). Step 4: PASS.** Commit `top-eleven: league`.

### Task 6: Academy, Training, Market

**Files:** Create `src/shared/Config/Academy.luau` (`rechargeSeconds = 14400`, `maxCharges = 3`, `maxProspects = 5`, odds per level 1..5), `Config/Tuning.luau` (`startCoins`, `startFans`, `squad.max = 24`, `squad.minAfterSeason = 14`, `market.size = 6`, `market.sellRate = 0.7`, training slots per level, `training.gain`, first training seconds 30), `src/shared/Academy.luau`, `Training.luau`, `Market.luau`, `tests/Academy.spec.luau`, `tests/Training.spec.luau`, `tests/Market.spec.luau`

**Interfaces:** Produces the signatures in technical-architecture section 2 for these three modules.

- [ ] **Step 1: Write failing tests:**
  - `odds sum`: for every level `Academy.odds` sums to 100.
  - `odds truthful`: 20,000 `roll` at level 1 land within 1.5 points of each shown percentage.
  - `first report rare`: `roll(r, 1, true).rarity == "rare"` for 50 seeds.
  - `recharge keeps remainder`: charges 0, `nextAt = 100`; `recharge(a, 100 + 14400 + 50)` -> charges 2 and `nextAt == 100 + 2*14400`.
  - `cap does not bank time`: at 3 charges `recharge` far in the future keeps 3; after spending one at time T, `nextAt == T + 14400`.
  - `training check`: rejects occupied slot, unknown player, player already in another slot, rating at potential, not enough coins; accepts a valid one. `apply` never exceeds potential.
  - `market daily`: same (userId, day) -> same list; day + 1 -> different list; list length `market.size`; prices > 0.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.** Commit `top-eleven: academy, training, market`.

### Task 7: Economy and NextMove (economy role owns Config/Economy numbers)

**Files:** Create `src/shared/Config/Economy.luau`, `src/shared/Economy.luau`, `src/shared/NextMove.luau`, `tests/Economy.spec.luau`, `tests/NextMove.spec.luau`

**Interfaces:** Produces `Economy.*` and `NextMove.of` (section 2).

- [ ] **Step 1: Write failing tests:**
  - `offline cap`: `Economy.offline(1, 100, 99 * 3600) == Economy.offline(1, 100, 8 * 3600)`; negative or NaN seconds -> 0.
  - `win > draw > loss` reward in every division; higher division pays more.
  - `costs outgrow income`: for each facility, `facilityCost(f, n+1) / facilityCost(f, n)` > ratio of match income growth per level.
  - `time to next upgrade` (simulation helper in the spec): at stages 1, 2, 3 (div 5 start, div 4, div 3) minutes of play to afford the next stadium level are inside the targets the economy role writes in `Config/Economy.targets`.
  - `NextMove` order: no club -> "createClub"; 10 valid starters -> "fixLineup"; finished training -> "claimTraining"; charge ready -> "scout"; season over -> "nextSeason"; else "playMatch".
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.** Commit `top-eleven: economy and next move`.

### Task 8: ProfileSchema v1

**Files:** Create `src/shared/ProfileSchema.luau` (pattern from root `src/shared/ProfileSchema.luau`), `tests/ProfileSchema.spec.luau`

- [ ] **Step 1: Write failing tests:** `default()` matches the schema in technical-architecture section 3 (spot-check every top-level key); `migrate(nil)` -> default; `migrate({version=1, coins=5})` keeps coins 5 and fills the rest; `migrate` twice equals once; no array in the default has a hole.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS.** Commit `top-eleven: profile schema v1`.

### Task 9: Server services

**Files:** Copy `src/server/Services/DataService.luau` (store `TopEleven_v1`), `Telemetry.luau` (FUNNEL from the design doc), `src/shared/Remotes.luau`; create `src/server/Main.server.luau`, `src/server/Services/ClubService.luau`, `src/server/Services/MatchService.luau`, `src/shared/Settle.luau`, `tests/Settle.spec.luau`

**Interfaces:** Consumes every pure module. Produces the `Act` actions, `State`, `Toast`, `Celebrate`, `Welcome` exactly as technical-architecture section 4. `Settle.run(p: ProfileT, now: number): MatchResultT?` is pure: returns the result once, nil if already rewarded or not final.

- [ ] **Step 1: Write failing tests** in `tests/Settle.spec.luau` `Settle.run` twice after a final match credits coins once; a match left mid-way settles on a later `now` with the last tactic; the matchday's other results are stored once. Add to `tests/Settle.spec.luau` (or a `View` helper spec): the match part of the view has no `seed`, `home` or `away` key and no moment with `at > now`.
- [ ] **Step 2: Implement** ClubService actions in the order of the table (validation first, then the pure check, then the change), the per-player 1 s match tick and catch-up on join, the Welcome summary, `processReceipt` copied.
- [ ] **Step 3: Run all specs, PASS.** luau-lsp analyze clean.
- [ ] **Step 3b:** In the Studio check below also confirm `playMatch` right after `skipMatch` returns false until 39 s after kickoff, and `nextSeason` with 3 retirees tops the squad up to 14.
- [ ] **Step 4: Studio playtest** (new private place, `rojo serve` or build): create a club, play a match, set a tactic at the break, scout, train. Read the console: no errors. Fire each action from the command bar with bad arguments (nil, `{}`, 1e309, `"x":rep(40)`) and confirm `false` with no state change.
- [ ] **Step 5: Commit** `top-eleven: server services`.

### Task 10: UI kit and core screens (ui role)

**Files:** Copy and re-skin `src/client/UI/Theme.luau`, `Icons.luau`, `Motion.luau`, `Kit.luau`, `Toasts.luau`, `Sounds.luau`, `src/first/Boot.client.luau`, `src/client/DeviceReport.luau`; create `src/client/Main.client.luau`, `App.luau`, `UI/PlayerCard.luau`, `UI/Hub.luau`, `UI/Squad.luau`, `UI/MatchView.luau`, `UI/Advisor.luau`

**Interfaces:** Consumes `State` view and `Celebrate` kinds (section 4). `PlayerCard.new(player, opts: {size: "small"|"large", kitColor: number}) -> Frame` draws skin, hair, face and kit from `Looks` with Frames only (no images, no emoji).

- [ ] **Step 1:** Club creator (two word pickers, colour, crest), Hub with **Play Match** bottom-centre, Squad (pitch + bench, formation picker, tap two cards to swap, sends `setLineup`), MatchView (scoreboard, dot strip, moment ticker from `match.moments`, tactic buttons at breaks, Skip after first match).
- [ ] **Step 2: Studio check** desktop and `iphone_14` landscape: first goal within 90 s of joining; reduced motion on and off; no text under 14 pt on phone.
- [ ] **Step 3: Commit** `top-eleven: core screens`.

### Task 11: Remaining screens (ui role)

**Files:** `UI/Academy.luau` (odds shown on the button), `UI/Market.luau`, `UI/Training.luau`, `UI/League.luau`, `UI/Club.luau`, `UI/Shop.luau` (empty-state until products are approved), Welcome modal.

- [ ] **Step 1:** Build each against the view. **Step 2:** Studio check as Task 10. **Step 3:** Commit `top-eleven: secondary screens`.

### Task 12: First-session probe (playtester)

**Files:** Create `scripts/probes/ftue.py` under `games/top-eleven/` (adapted from the root probe).

- [ ] **Step 1:** Automate funnel steps 1 to 9 from the design doc with screenshots. **Step 2:** Pass when all steps are reached in under 5 minutes with no console errors. **Step 3:** Commit `top-eleven: ftue probe`.

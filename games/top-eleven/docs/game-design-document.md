# Top Eleven (working title): game design (v1, 2026-10-25)

> **Name is a placeholder.** "Top Eleven" is a Nordeus (Take-Two) trademark. It is never shown in game, in the place name or on store art until the owner picks a title (see `decisions.md` T-003). Code and folders use the slug `top-eleven` only.

Sources: owner goal (task t_8a722fec3b52), scout pitch `p_affb27599d84`, `research/exemplars/core-loops.md`, `research/run-an-airline-study.md`. Contracts live in `technical-architecture.md`; build order in `implementation-plan.md`.

## Pitch
A screen-based football club manager in the "Run a ___" format. Name a club, pick eleven, set a tactic, watch a 40 second match, earn coins and fans, train and sign players, climb from Division 5 to Division 1. Every club and player is fictional. Phone first.

## Core loop (one line)
**Pick lineup and tactic, play a match, earn, train or sign a player, climb the table.**
- One turn is one match: about 60 s including the pre-match screen (40 s match plus reward).
- Every turn ends with a choice that starts the next one: the result screen shows the next fixture *and* one suggested move (train X, claim scout, upgrade stadium) chosen by the server's "Next Move" rule (below).
- Side systems (Academy, Market, Training, Facilities) only feed lineup strength or coins. None replaces the match.

## First 5 minutes (each step is a funnel step, `Telemetry.FUNNEL`)
| Time | What happens | Funnel step |
|---|---|---|
| 0-15 s | Club creator: two word pickers (place word + suffix, e.g. "Harbourton" + "Rovers"), 8 kit colours, 6 crest shapes. One "Found club" button. No free text. | 1 Joined, 2 Club founded |
| 15-30 s | Squad reveal: 16 fictional players flip in as cards (11 starters in 4-4-2, 5 bench). Advisor bubble points at **Play Match**. | 3 Saw squad |
| 30-75 s | Match 1 vs the weakest club in Division 5 (rating gap set in `Config/League.luau`, not rigged). One tactic prompt at half time: Attack / Balanced / Defend. Goal = big number pop + crowd sound. | 4 First kickoff, 5 First match finished |
| 75-100 s | Result card: coins and fans count up. "Scout" glows: the first free scout is labelled "First report: guaranteed Rare" on screen, so it is truthful. Prospect card flips. | 6 First scout |
| 100-150 s | Advisor: "Train your striker". First training timer is 30 s (later timers are longer). | 7 First training started |
| 150-240 s | Match 2. Claim training, watch the player's overall tick up. | 8 Training claimed |
| 240-300 s | Coins now cover Stadium level 2 (more gate money). Promotion bar ("2 of 5 matches, top 2 go up") is the next goal. | 9 First upgrade |
Later steps: 10 Season finished, 11 Promoted, 12 Returned (offline summary).

## Season structure
- 5 divisions. Division N has `clubsPerDivision` clubs (6), so a season is 5 matchdays, single round robin. At ~1 min per match that is a 5 to 8 minute season: a natural stopping point.
- Only the player's matches are played in full. The other clubs' matches on the same matchday are quick-simmed from club strength when the player's match ends (seeded, deterministic).
- End of season: top 2 promote, bottom 1 relegates (no relegation from Division 5, no promotion from Division 1; winning Division 1 gives the "Champions" title and a bigger prize). Prize coins by finishing position. Players age by 1; growth and decline applied (see Players). A new set of AI clubs is generated for the new division.
- Division 1 has no end: seasons repeat with stronger AI clubs (`League.aiStrength(division, season)` grows slowly), so the top stays a chase.
- The league table is **derived** from stored results, never stored itself.

## Match sim
- **Server-side, seeded, deterministic, pure** (`Match.luau`, tested in Lune). Same seed, lineups and tactics always give the same match.
- Three segments: 1'-30', 31'-60' (starts after a half-time-style tactic prompt at 30'), 61'-90'. Each segment lasts `segmentSeconds` (13 s) of real time; total about 40 s.
- At kickoff the server simulates segment 1 only. Segments 2 and 3 are simulated when their real start time passes, using the tactic chosen at that moment. The client never sees an event before it happens and never sends a result.
- Per segment: chance count from midfield passing vs opponent's; each chance picks an attacker weighted by shooting and pace, then resolves goal / save / miss from shooting vs the opponent's defending and keeper. Outcomes are **key moments** with a minute and the player's id: `goal`, `save`, `miss`, `bigChance`.
- Tactics (`Config/Match.luau`): `attack` (+attack, -defence), `balanced`, `defend` (+defence, -attack), `press` (+chances for both sides). A tactic only changes multipliers; it never guarantees anything.
- Target feel (checked by a spec over 2,000 seeded matches): average 2.4 to 3.2 goals a match; a side 10 overall points stronger wins 60 to 75%; equal sides draw 22 to 32%.
- Out-of-position players count at `outOfPositionMult` (0.75) of their rating.
- A player may tap **Skip to full time** after their first match. The remaining segments resolve at once with the current tactic, so skipping never changes the odds. Skip shows the result early but the next kickoff still waits until the full match time has passed (meanwhile the player trains, scouts or shops), so skipping never earns faster.
- If the player leaves mid-match, the match finishes on its own with the last tactic and rewards are credited on the next load (truthful, nothing lost).
- Mild content: no injuries, no cards, no fouls. Celebrations are cartoon.

## Players
- Fictional only. Name comes from `nameSeed` through `NameGen` and the single data file `Config/Names.luau`, so a data swap renames every player in every save (see Naming rules).
- Position: `GK`, `DF`, `MF`, `FW`. Ratings 1-99: `pace`, `shooting`, `passing`, `defending`, `keeping`. **Overall** is a position-weighted average (`Config/Players.luau` weights), shown big on the card.
- Age 16-35, `potential` 40-99 = the cap any rating can be trained to. From age `declineAge` (31) each season removes `declinePerSeason` from pace and one other rating. At 36 a player retires at season end with a farewell toast (their card stays in a "Legends" list, display only).
- Rarity (`common`, `rare`, `epic`, `legendary`) only sets the card frame and the potential band. It is never sold.
- Appearance params drive the UI card builder (no real likenesses, no uploaded faces): skin tone, hair style, hair colour, face shape, plus the club kit colour. All small integer indices into `Config/Looks.luau` palettes.

## Academy (youth and scouting are one system)
- **Free scout reports** recharge one every `academy.rechargeSeconds` (4 h), stored up to `academy.maxCharges` (3). Timers are truthful and never restart.
- A report is a server-side roll. **Odds are shown on the button** before every report and depend only on the Academy level: e.g. level 1 = Common 70 / Rare 24 / Epic 5 / Legendary 1. No paid input touches the odds or the number of reports (hard rule).
- The result is a 16 to 18 year old prospect with a potential from the rarity band. Prospects wait in the Academy (up to `academy.maxProspects`) until promoted to the squad or released.
- First report ever is a guaranteed Rare and says so on screen.

## Transfers (market)
- A list of `market.size` (6) fictional players for sale, regenerated each UTC day from a seed of (UserId, day). Deterministic, not a gacha: everyone sees exactly what they buy, price shown.
- Price from overall, age and potential (`Economy.playerValue`). Selling pays `market.sellRate` (70%) of value.
- No player-to-player trading (no scams, no RMT).
- Squad cap `squad.max` (24). Minimum 11 to play; a squad below 14 shows a "Sign players" hint.

## Training
- `training.slots` slots (1 at Training Ground level 1, +1 per level, max 4).
- Pick a player and one rating. Cost in coins and a truthful timer; on claim the rating gains `training.gain` points, capped at potential. A player can be in one slot at a time.
- Timers keep running offline. Claim is a tap with a number pop.

## Facilities (coin sinks, all permanent)
- **Stadium**: raises gate money per home match and offline gate.
- **Training Ground**: more training slots, shorter timers.
- **Academy**: better shown odds and potential bands.
Costs grow faster than income per level (economy role checks time-to-next-upgrade at stages 1, 2 and 3 with a simulation).

## Economy (shape only; numbers belong to the economy role in `Config/Economy.luau`)
- One soft currency, **Coins**. **Fans** is a score that grows with wins and promotions and scales gate money.
- Sources: match reward (win/draw/loss + goals), home gate, season prize, offline gate, selling players.
- Sinks: training, transfers, facilities.
- **Offline**: gate income per hour from Stadium level and fans, capped at `offline.capHours` (8 h). Training timers and scout charges keep running. A Welcome back card shows exactly what happened.

## Next Move rule (server, pure `NextMove.luau`)
In order, the first that applies: create club, fix lineup (fewer than 11 fit), claim training, claim scout report, start next season, play match. Shown as the hub banner and on the result card.

## Screens (built from copied Theme / Icons / Motion / Kit, see `technical-architecture.md`)
Hub (club card, next fixture, primary **Play Match** bottom-centre), Squad (pitch with 11 cards + bench, formation picker), Match (scoreboard, top-down strip with dots, key-moment ticker, 3 tactic buttons at the breaks, skip after first match), Academy, Market, Training, League (table + fixtures), Club (facilities), Shop, Settings. Coins top-right, menu left, objective top-centre. One primary button per screen. No em dashes in player text.

## Monetization (constraints; the economy role proposes products)
- No paid random items, no paid packs, no paid scout reports, no paid odds, no selling Coins, no paid match power.
- Allowed shapes: cosmetics as known items (kit patterns, crest frames, stadium colours), and convenience that does not change match strength or odds (e.g. Auto-Lineup). Any pass that touches training speed or squad size needs an owner decision first (`NEEDS OWNER` in `decisions.md` T-005).
- Shop never auto-opens; neutral copy; one `ProcessReceipt`.

## Out of scope for v1
Cups, co-op, other players' clubs, injuries, wages, contracts, chemistry, 3D match, rankings. Each is added only after the loop is proven in a playtest.

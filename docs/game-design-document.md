# Run a Space Agency 🚀 — game design (v1, 2026-10-17)

**Format:** a screen-based management game in the rising "Run a ___" trend (Run an airline, Run a Restaurant, Run a Cheer Gym). It is played almost entirely through polished UI over a stylised solar-system map. The owner asked for this direction after studying *Run an airline* hands-on (see `../research/run-an-airline-study.md`). Fogbell Harbor is archived in `../archive/fogbell-harbor/`.

## Pitch
Found your own space agency. Launch rockets from your spaceport to orbit, the Moon, Mars and beyond. Every mission earns money: satellites to deploy, tourists to fly, science to bring home. Grow from a garage startup into a deep-space empire.

## Why this concept
- **Proven format, open theme.** The "Run a ___" UI-management loop works on Roblox now. No space-agency game in that format exists (Roblox search, 2026-10-17).
- **The art is geometry.** Planets are gradient circles, orbits are rings, flight paths are dotted arcs, and rockets are small 3D models built from parts and shown in ViewportFrames. That means a high-quality look with no image assets, which suits an AI-built game.
- **Space appeals to all ages** and is Mild-maturity safe.

## Core loop (minute to minute)
1. **Plan a mission** using a 3-step wizard: Destination → Rocket → Pricing.
2. The rocket launches. A countdown flashes, an icon arcs across the map, and the mission takes **30–120 real seconds**.
3. The rocket **arrives**. It pays out with a rising coin toast, then automatically repeats the mission.
4. Spend cash on more rockets, more missions, and bigger destinations.
5. Complete **career goals** to move up a stage. Each stage unlocks new rockets and destinations, shown with a celebration modal.
6. **Come back later:** missions keep running offline for up to 8 hours. A "Welcome back" summary shows the earnings, plus a 7-day operations reward streak.

## Destinations
Map positions are stylised, not to scale.

| Id | Destination | Distance | Demand mix | Unlocked at stage |
|---|---|---|---|---|
| leo | Low Earth Orbit | 1 | Satellites, tourists | 1 |
| station | Orbital Station | 1.4 | Tourists, cargo | 1 |
| geo | Geostationary Orbit | 2 | Satellites | 2 |
| moon | The Moon | 3 | Tourists, science | 2 |
| lagrange | Lagrange Outpost | 3.5 | Cargo, science | 3 |
| venus | Venus Flyby | 5 | Science | 3 |
| mars | Mars | 6 | Tourists, cargo, science | 4 |
| ceres | Ceres (asteroids) | 8 | Cargo (mining) | 4 |
| europa | Europa | 11 | Science | 5 |
| titan | Titan | 14 | Science, tourists | 6 |

## Rockets
Original bird names, so there are no real-world trademarks.

| Id | Name | Class | Capacity | Max distance | Speed | Price | Stage |
|---|---|---|---|---|---|---|---|
| sparrow | Sparrow | Light | 6 | 1.5 | 1.0 | starter (free) | 1 |
| kestrel | Kestrel | Light | 10 | 2 | 1.1 | $120K | 1 |
| heron | Heron | Medium | 18 | 3.5 | 1.2 | $260K | 2 |
| osprey | Osprey | Medium | 24 | 5 | 1.3 | $480K | 3 |
| albatross | Albatross | Heavy | 40 | 8 | 1.4 | $950K | 4 |
| condor | Condor | Heavy | 60 | 11 | 1.6 | $1.9M | 5 |
| phoenix | Phoenix | Super-heavy | 90 | 15 | 2.0 | $4.5M | 6 |

## Career stages (6)
Each stage has 3–4 goals that pay rewards. Finishing all of them promotes the agency, plays a celebration, and unlocks rockets and destinations.

1. **Garage Startup:** launch your first mission; own 2 rockets; earn $100K.
2. **Orbital Company:** serve 3 destinations; complete 50 missions; reach a 3.5★ rating.
3. **Lunar Agency:** fly to the Moon; own 5 rockets; earn $2M lifetime.
4. **Interplanetary:** reach Mars; complete 500 missions; carry 5,000 passengers.
5. **Deep Space:** reach Ceres and Europa; own 12 rockets.
6. **Galactic Pioneer:** reach Titan, which ends the stage track; prestige comes later.

## Economy (pure formulas in `src/shared/Economy.luau`, tested)
- **Demand per destination:** base demand × a stage multiplier. Competition takes a share.
- **Pricing tier:** Budget ×0.8 fare / ×1.15 demand; Standard ×1 / ×1; Premium ×1.25 / ×0.8.
- **Service tier:** Basic, Comfort or Luxury. Each costs more per seat and raises the rating.
- **Load factor** = min(1, effective demand ÷ capacity).
- **Profit per trip** = seats filled × fare − fuel (distance × rocket fuel cost) − service cost.
- **Trip time** = 30 s × distance ÷ speed, clamped to 30–180 s.
- **Rating** (1–5★) is a moving average of service and load-factor satisfaction.

## UI (light cards over a deep-space map, from the hands-on study)
- **Top left:** agency card with logo, name, stage and level bar, cash, and ★ rating.
- **Top centre:** a "Next move" banner with one action button.
- **Top right:** Shop, notifications bell (with badge), settings.
- **Bottom centre:** pill nav with Missions · Fleet · Agency · More.
- **Right-hand slide panels:** Missions list, Fleet, Career, More.
- **Centre modals:** Welcome back, Buy Rocket catalog (class tabs, a list on the left and details on the right), Plan Mission wizard, Rocket Delivered, Stage Achieved, Confirm purchase.
- **Advisor:** "Nova · Mission Control" speech bubbles, plus a highlight ring on the next control for a new player.
- **Toasts:** milestones ("100th launch!") and daily reward.
- **Map:** Earth spaceport hub, orbit rings, destination pins with names and tags (HIGH DEMAND, COMPETITION, LOCKED), animated dotted mission arcs, moving rocket icons.

## Monetization (owner direction: match top converters; no paid randomness)
- **Passes:** 2× Cash, +50% Launch Speed, Starter Pack (cash plus an exclusive livery), Cosmetic Livery Pack.
- **Developer products:** Server Boost (15 min of 2× cash for everyone in the server, which makes buying social), Instant Arrival.
- No paid random items. No fake timers.
- The single-player idle loop has no player-vs-player fairness to protect. Rankings, if added, use career stage and rating, not cash.
- Product IDs need a published place; until then the shop shows the products without buy buttons wired.

## Perfect Launch
Every new mission opens a liftoff card with a countdown (3, 2, 1, LIFTOFF) and a timing bar.
- **Window:** it opens 2.6 s after `departAt` and lasts 0.5 s, plus 0.3 s of grace for network delay (`Tuning.perfectLaunch`).
- **Reward:** a hit pays +25% on that mission's first trip only. A miss changes nothing else; it is never a penalty.
- **Judged on the server** with its own receive time (`Launch.judge`). The client only sends `perfectLaunch(missionId)`; it never sends a time.
- Skippable at any time. Under reduced motion the needle and countdown still run, because they carry the timing.

## Daily Contracts
- **Three contracts per UTC day**, rolled from the day number (Park-Miller RNG), so a rejoin never re-rolls. Kinds are distinct: trips, trips to one destination, passengers, earned from trips, missions planned.
- **Difficulty** `i` is 1 to 3. `target = targets[i]` (x `stageRewardMult[stage]` for passengers and earned). `reward = template.reward * i * stageRewardMult[stage]`.
- Base rewards: trips $6K (5, 10, 20), trips to X $7K (3, 6, 10), passengers $6K (60, 150, 300), earned $8K ($20K, $60K, $150K), planned $5K (1, 2, 3).
- `stageRewardMult = { 1, 2, 4, 8, 16, 32 }`. A "trips to" destination is always one unlocked at the player's stage.
- Collect with `claimContract(index)`. The Hud "Next move" banner offers COLLECT for a finished contract.

## Research
- **Research lab** unlocks at career stage 2. Three tracks, 5 levels each: Engines (+6% speed per level), Efficiency (8% less fuel per level), Comfort (+4% demand per level).
- **Cost** of the next level = `round(base * 2.2^level, to $1K)`. Bases: Engines $80K, Efficiency $60K, Comfort $70K. Cash is the only currency.
- Effects flow through `Economy.tripSeconds(..., speedMult)` and `Economy.trip(..., fx)`; the mission wizard previews them. Nothing is sold for Robux.

## Playtime Gifts
- Play time is counted per UTC day, not per session, so rejoining does not farm gifts.
- Tiers open in order at 5, 10, 20 and 40 minutes of play for $4K, $8K, $15K and $30K, times `stageRewardMult[stage]`. After the fourth, the pill is hidden until tomorrow.
- The Hud pill shows "Free gift in m:ss", then an OPEN GIFT button. Nothing opens by itself.

## Mission Patches
A collection derived from visits and career stage (nothing extra is saved): one patch per destination (earned when a trip has reached it) and one per career stage (earned at that stage). Unearned patches show as "???". The collection lives under More, Mission patches.

## Jackpot trips
About 1 arrival in 12 (`Tuning.jackpot.chance` = 0.08) pays triple. The server rolls it in `completeTrip`, so it also applies to offline trips. The client shows a gold "JACKPOT +$X" pop, a big coin burst and confetti. It is free: it is never sold, and no purchase changes the chance. The 2x Cash pass doubles the payout like any other cash. Logic: `Economy.jackpotBonus` (tested).

## Thrusters (tap a flying rocket)
Tap a rocket marker on the map to fire its thrusters. Each tap cuts `Tuning.thrust.seconds` (1.5 s) off the current trip, capped at `maxShare` (50%) of that trip. The cap resets on every new trip. Taps go through their own rate limiter, so fast tapping never blocks other actions. Feedback: smoke puffs, a "+1.5s" float, and a "THRUST xN" combo with rising pitch. At the cap the float reads "MAX THRUST". This gives active players something to do between arrivals, while idle players lose nothing. Logic: `Economy.thrust` (tested). A one-time tip appears once the first rocket is flying.

## Money and conversion notes
New cash sources: contract rewards, playtime gifts and the Perfect Launch bonus. New sink: research. All three sources scale with `stageRewardMult` so they stay meaningful at every stage.
- **Honest examples:** each shop card shows a number computed from the player's own best mission ("+$A to +$2A per trip", "<duration> to <duration> per trip"), never an inflated one.
- A "STARTER PACK" chip appears on the Next-move banner from stage 2 and only once; tapping it opens the shop. Nothing auto-opens, timers are truthful, and the first shop visit has a Nova note that everything is optional.

## Look and feel
- **Mission Control identity:** light cards stay readable; the character comes from navy console bands (`Kit.header`) with faint scanlines, cyan accents, mono numerals, soft shadows (UIShadow) and per-corner radii.
- **Drawn icons:** 34 icons are built in code from Frames, strokes and gradients (`UI/Icons.luau`), tinted per use. No emoji, no em dashes and no symbol glyphs in the UI.
- **Eight motion patterns** (`UI/Motion.luau`): enter, exit, pop, press, countUp, flyTo, pulse, shake. All jump to their end state under reduced motion.
- **Sounds:** short UI and event sounds (`UI/Sounds.luau`, ids in `Config/Sounds.luau`, built-in placeholders). More, Settings has a Sound toggle (saved in the profile).
- **Bootup:** a ReplicatedFirst screen with warp streaks, the title and a rising rocket, about 3 s, skippable, held until the client reports ready.
- **Liftoff:** the countdown card with the rocket, smoke and the Perfect Launch bar shown when a mission is launched.

## Data
One profile per player (`ProfileSchema`), saved through `DataService` (session-locked). Missions are stored as timestamps (`nextArrival`), so the server simulates nothing per frame and offline progress is exact.

## Build order (this session)
1. Pure Economy and ProfileSchema, with tests.
2. Server: AgencyService (create agency, buy rocket, plan mission, close mission, daily reward, career), MissionClock (arrivals, offline catch-up).
3. Client: map, HUD, panels, wizard, modals, advisor, toasts, rocket ViewportFrames.
4. Studio playtest through the MCP, then polish.

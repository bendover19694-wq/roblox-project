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

## Data
One profile per player (`ProfileSchema`), saved through `DataService` (session-locked). Missions are stored as timestamps (`nextArrival`), so the server simulates nothing per frame and offline progress is exact.

## Build order (this session)
1. Pure Economy and ProfileSchema, with tests.
2. Server: AgencyService (create agency, buy rocket, plan mission, close mission, daily reward, career), MissionClock (arrivals, offline catch-up).
3. Client: map, HUD, panels, wizard, modals, advisor, toasts, rocket ViewportFrames.
4. Studio playtest through the MCP, then polish.

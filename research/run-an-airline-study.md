# Hands-on study: "Run an airline ✈️" (2026-10-17)

- Place 89967070535099, universe 10768550253, by monkeytherobloxdev.
- Created 2026-09-29. On 2026-10-17: about 4,661 playing, 401K visits, 87% like, server size 8, genre Simulation/Idle.
- Played on the owner's account with their permission. No Robux spent; only free and in-game-cash actions.
- Screenshots: `captures/air_*.png` (local, gitignored).

## What we saw, in order
1. **Welcome back modal** ("You were away 2 days"). Offline earnings are capped at 8 h of flying: "+$31.7K, 8 flights, 576 passengers". Below it:
   - **Today's Operations Reward**, a 7-day streak (Day 1/7, +$10K). Claiming shows a toast, "Day 1 reward: +$10K", and previews tomorrow's reward.
   - **Next best move**, one recommended action with a button.
   - Quick links (Routes: "JFK→BOS demand is strong").
2. **Map hub.**
   - A stylised world map with airport pins ("JFK · New York"); the hub is highlighted orange.
   - Top left: an airline card with logo, name, tier ("Startup Airline", later "Regional Airline · Lv 3"), cash, and a ★ rating.
   - Top right: SHOP (dark pill), notifications bell, settings.
   - Bottom: a pill nav with Routes · Fleet · Airline · More.
   - Zoom buttons at bottom right.
3. **Advisor tutorial.**
   - "Mia · Cabin Crew" speech bubble ("We can afford a second plane! Let's grow."). An orange ring and arrow highlight the exact control.
   - It only advances when you click the highlighted control, which forces the flow.
4. **Fleet panel** (slides in from the right).
   - Each aircraft card shows a side-view livery render, model, tail number, status ("FLYING JFK→BOS 35%", "TURNING AROUND", "READY FOR ROUTE"), flights, and lifetime profit.
   - "Next to unlock" teaser.
5. **Buy Aircraft modal.**
   - Class tabs: Regional / Narrowbody / Widebody / Flagship, plus Sort.
   - A list on the left with price buttons; locked items show the career stage that unlocks them.
   - A detail pane on the right: render, seats, range, cost profile.
   - A confirm dialog ("It costs $110K and arrives right away"), then a **"New aircraft delivered"** reveal with an "Open a route" call to action.
6. **Route planning.**
   - Map "pick destination" mode: green rings mark in-range airports, tags read HIGH DEMAND and COMPETITION.
   - Then a 3-step wizard: **Route** (demand, competition, distance, about 43 s flight time, traveller type) → **Plane** → **Tickets**.
   - Tickets has Budget / Recommended / Premium fares, Basic / Comfort / Premium service, and expected load and profit per flight.
   - "Launch route".
7. **Milestones.**
   - Toast ("1,000th passenger! … is growing fast").
   - Stage-up modal ("REGIONAL AIRLINE · ACHIEVED", aircraft render, unlocked list, Career / Continue).
8. **Career panel.**
   - "Stage 2 of 6" with a segmented progress bar.
   - A goal list, each with progress, a cash reward, the unlock, and a jump button (PLAN / FLEET).
9. **Persistent "Next move" banner** at top centre ("Give your ATR 42 a route · PLAN ROUTE").
10. **More panel:** Career, Rankings (global leaderboards and rival airlines), Airline News, My Airlines (slots), Shop, How to Play.
11. **Shop** (full screen, dark), with tabs Game Passes / Server Boosts (15 min for everyone) / Quick Actions:
    - 2× Cash, R$199
    - +50% Flight Speed, R$149
    - Extra Airline Slot, R$99
    - Starter Pack, R$79 ($175K, a livery, a logo)

    Each card has a large illustration, a concrete example ("+$4,000 → +$8,000, one flight"), and "Works / Lasts" chips. The header reads "Optional extras. The whole game is free to play."

## Why it works (Inferred)
- **One obvious next action at every moment:** the advisor, the Next-move banner and Next best move.
- **Real-time short trips** (about 40 s) give constant small payoffs. Offline earnings plus the daily streak give reasons to return.
- **Clear numbers everywhere** (profit per flight, load %, demand tags), so the player feels smart without any spreadsheet.
- **Celebration moments** (delivery reveal, stage achieved) are spaced between routine ticks.
- **The shop explains value concretely**, without pressure.
- **Visual quality** comes from a consistent design system (rounded white cards, two accent colours, chunky buttons), not 3D art.

## What we take (pattern) vs. leave (expression)
- **Take:**
  - map hub plus right-hand panels
  - the 3-step planning wizard
  - advisor highlight tutorial
  - Next-move banner
  - welcome back with offline earnings and a 7-day streak
  - career stages with goals
  - delivery and stage reveals
  - a shop with example values and server boosts
- **Leave:** airlines and planes, the map, names, the Mia character, their visual identity and colours. Ours is space: a dark cosmic map, original rocket names, the "Nova" advisor, our own palette.

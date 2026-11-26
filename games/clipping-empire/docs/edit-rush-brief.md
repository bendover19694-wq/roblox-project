# Edit Rush: timed clip-editing event (brief for the Agent HQ Lead)

Owner request (2026-11-25): "Add realtime events in order to clip like you slice video, add effects, and if you time all of it perfectly you get more luck, or more luck based on the % you were close to achieving it."

Game: GT6 Clipping Empire, folder `games/clipping-empire`, branch `claude/confident-yonath-6d7817` (commit d8b7e0e or later). Read `README.md`, `docs/game-overview.md` and `docs/rng-and-loop.md` first.

## The feature
A short timing minigame that turns recording into editing.

1. **Trigger.** An **EDIT RUSH** button lights up beside CLIP once a charge fills. The charge fills from takes, about 1 rush a minute of active tapping. It never auto-opens and never interrupts a menu. The charge meter is always true and never resets on its own.
2. **The rush (about 4 s).** A video timeline strip slides up over the action bar. A playhead sweeps left to right across it. Three cue markers sit on the strip in order:
   - **CUT** (a scissors slice)
   - **ZOOM** (a punch-in)
   - **FX** (a flash or glitch effect)

   The player taps (anywhere on the strip; E or Space on PC; A or R2 on gamepad) as the playhead crosses each cue. Each tap plays its effect: a slice line across the strip, a camera punch, a colour flash.
3. **Scoring.** Per cue, `accuracy = clamp(1 - |tap - cue| / WINDOW, 0, 1)`, with WINDOW about 0.25 s. The labels are PERFECT (0.9 or more), GOOD (0.5 or more) and MISS. The rush score is the mean of the three, shown as a percentage.
4. **Reward: luck.** `Edit Boost = 1 + EDIT_LUCK_MAX x score^2` for EDIT_BOOST_SECONDS (about 30 s):
   - EDIT_LUCK_MAX is about 1.0, so a 100% rush doubles luck, 70% gives about x1.5 and 30% gives about x1.09.
   - A full PERFECT rush also says "PERFECT EDIT!" with a big effect.
   - The boost multiplies into `Economy.luck`, still under `LUCK_CAP`.
   - The HUD shows the boost and a true countdown.
   - It uses free RNG only. Nothing here may ever be sold (no paid luck, no paid retries).

## Rules it must follow (repo hard rules and vault)
- **Server authoritative for value.** Vault, *Teardown - Funky Friday*: "judge on the client, validate results".
  - The server creates each rush: cue times from its own `Random`, and the start time.
  - The client reports one tap offset per cue, relative to the rush start.
  - The server checks the rush id, the count (at most 3), monotonic finite offsets inside the rush length, and that the report arrives within the rush window plus a small grace on the server clock. It then scores the offsets itself with the pure function and grants the boost.
  - One open rush per player, `Net.limiter` on the remote, and `Net.isInt`/`Net.isFinite` validation.
  - Document the exploit ceiling: a cheater can at most fake 100% for a x2 luck boost about once a minute, which is bounded and grants no currency.
- **Timing.** Schedule the playhead from the clock (`os.clock` since start), never frame deltas. Add an "Edit timing offset" slider in Settings (vault: offset calibration for phones and Bluetooth audio).
- **Pure logic** in a new `src/shared/Edit.luau`:
  - `Edit.newRush(rng)` makes the cues.
  - `Edit.accuracy(cue, tap)`, `Edit.score(cues, taps)` and `Edit.boost(score)` do the maths.
  - Tuning goes in `Config.EDIT_*`.
  - Tests go in `tests/Edit.spec.luau`: perfect, partial, miss, too many taps, NaN, out of order, late report.
- **UI.** Build from `src/client/Kit.luau`, `Art.luau` and the LihFolk kit. Use the Folk Stud rules already used by the reveal card: burning colours, ink outlines, the stud texture.
  - Text is 12 px or larger on an iPhone 14, and tap targets are 44 px or larger.
  - The rush strip must not cover the top pills or an open menu.
  - Reduced Motion keeps the playhead (it is the game) but drops the camera punch and shake.
  - No emoji. No em dashes in player text.
- **Onboarding.** The first rush comes after the 3-step tutorial ends, with an objective of 8 words or fewer, for example "Tap as the line hits each cue". Log a funnel step, `first_edit`.
- **Docs.** Update `docs/game-overview.md` (loop, RNG, upgrades and UI sections) and `README.md` in the same change.

## Suggested roles (the Lead decides)
| Step | Role | Output |
|---|---|---|
| 1 | economy | `Edit.luau` maths, Config tuning, `Edit.spec.luau`, a luck and pacing check against `tests/Pacing.spec.luau` |
| 2 | builder | server rush lifecycle and the remote in `GameService.luau` (validated, rate-limited), client controller |
| 3 | ui | the rush strip, cue markers, slice, zoom and flash effects, result banner, boost chip on the HUD, Settings offset slider |
| 4 | playtester | Studio PC and iPhone 14 runs through `scripts/probes/ftue.py` (add a rush step), with screenshots and console |
| 5 | reviewer | independent review against the LihFolk quality rubric (8.5 or more) and the hard rules |

## Definition of done
- `lune run tests/run`, `stylua src tests`, `selene src` and `luau-lsp analyze --ignore "vendor/**"` are clean.
- A Studio playtest on PC and iPhone 14 shows a rush, a PERFECT result, a partial result and the boost countdown, with no console errors.
- The reviewer scores 8.5 or more.
- Committed on the game branch. Never publish, spend Robux or edit the live place 120193855698986.

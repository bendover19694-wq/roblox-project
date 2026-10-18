# UI and motion audit (2026-10-17)

**Reference set:** Huss Valley, Animal Hospital (Anomaly), 99 Nights in the Forest, Dress To Impress, and RIVALS. Steal An Egg is included only for the icon comparison.

**Evidence levels**
- **Observed: game page.** Icons and 16:9 thumbnails pulled from the Roblox thumbnails API, 2026-10-17.
- **Observed: video.** I watched only the first 4 minutes of two third-party videos, at one frame every 20 s:
  - Huss Valley: "Playing Huss Valley for the first time…" (c3f7dgdgP3A, 2026-10-12, a returning player's account)
  - Animal Hospital: "Animal Hospital [Anomaly] Gameplay Walkthrough" (rJdIo3NGDIU, 2026-06-11)

  Timings are approximate to ±20 s. Motion timing **cannot** be measured at this sampling.
- **Inferred:** 99 Nights, DTI, and RIVALS. These need a fresh-account playtest.

This file records what we learned and our own original standard. It does not copy any competitor's screens.

## 1. The click: game page (Observed)
| Game | Icon | 16:9 thumbnails |
|---|---|---|
| Huss Valley | Blocky default avatar sprinting, with an hourglass and "30 MIN" overlay | Two default avatars mid-sprint on a white lane line, speed lines, a "📍 huss valley" location tag |
| Animal Hospital | Toothy orange creature, hourglass and "2 HOURS" overlay | Cute patients in a waiting room, one of them monstrous. The second shows a doctor plus a "faceless" patient on a bed |
| 99 Nights | Dark creature, hourglass and "30 MINUTES" overlay | The monster looms over a sleeping player by the campfire. A camp under siege at night |
| Dress To Impress | Stylized glam avatar portrait, no text | Event art ("10B" celebration, "Summer in Brazil" theme) |
| RIVALS | Solid red silhouette holding a weapon on purple | The same red silhouette and weapon, plus an action shot |
| Steal An Egg | Player lifting a giant egg while a monster chases | "TREX EGG $89,121/s" with an arrow, and "YOU!" with an arrow next to a player carrying an egg past a snake |

**Findings:**
1. **One subject, one verb, readable at about 64 px.** RIVALS (a silhouette) and Huss Valley (a sprint) are the cleanest examples.
2. **Contrast between cute and threat** sells mild-horror co-op. Animal Hospital puts cute patients next to one wrong one. 99 Nights pairs a sleeping player with a looming creature.
3. **Three of the reference icons carry identical hourglass countdown overlays** ("30 MIN", "2 HOURS"). Inferred meaning: an **update-countdown icon** swapped in before a scheduled update drop. Third-party tools exist that automate this (RoControl docs).
   - For us: allowed **only if the timer is true**. The monetization page bans inaccurate or restarting countdowns, and we apply the same honesty rule to marketing.
4. DTI shows a portrait with no text. Its brand strength lets it skip explaining the game, which **a new game can't afford**.
5. Steal An Egg uses "YOU!" with an arrow and a dollar-per-second number. These are aggressive and work on young viewers, but they **conflict with our tone and honesty bar** if the numbers are inflated.

## 2. Journey maps
### Huss Valley (Observed video plus guides)
| Step | What happens | Time |
|---|---|---|
| Spawn | A pre-round lobby on an open playground court. A top banner reads "Enough players — match starting!" | ~0:00 |
| First interaction | A **chooser ritual**: one player is shown "choosing…", then picks **"HERO" or "CHICKEN"**. A huge floating label marks the choice, and a banner announces "X chose HERO — they run first!" | ~0:40–1:40 |
| First action | Banner "RUN! Reach the opposite safe side!" Everyone sprints across the court. | ~1:00 |
| First reward | Banner "X reached safety!" Coins and gems tick in the bottom-left corner. | ~1:20 |
| First failure | Banner "X was caught by Y!" The caught player switches side. | ~0:40 |
| Social | Emote wheel (radial menu), chat feed on the left, group lines of players waiting at the start line. | — |
| Return hook | Quests and Event buttons top-left, Update Log top-right. | — |
| First purchase surface | Not seen in 4 minutes, so there is no shop push early. | — |

**Information hierarchy:**
- **The top-centre banner is the single source of truth** for round state.
- Persistent UI is small: currencies bottom-left, one ability slot bottom-centre, three top buttons.
- Everything else is the world itself: lane lines and the safe zone are painted onto the court.

### Animal Hospital (Observed video)
| Step | What happens | Time |
|---|---|---|
| Spawn | A short spinning camera intro, "CAN YOU SURVIVE", which supports Tizzy's cutscene claim. Then the front desk with a computer. | 0:00–0:15 |
| First interaction | Register the patient on the in-world PC: the monitor shows "REGISTERED" and a printer outputs a form. | ~0:20 |
| Guidance | A top-right objective line ("Follow the patient to their room"). An overhead in-world sign: "CHECK IN PATIENTS 1". | ~0:40 |
| First task | The room monitor shows "TREATMENT 0/1" with a herb icon. You use a tool in hand, then "PATIENT RECOVERING…" with a green bar **on the in-world screen**. | ~1:00–1:40 |
| Story beat | An NPC mentor introduces himself in a paper-note dialogue box ("You must be the new hire…"). This comes **after** the first task, not before it. | ~2:40 |
| First reward | **SHIFT REPORT clipboard**: Patients Treated, Visitors Admitted, Anomalies Prevented, Animal Deaths, Hospital Performance. Money goes from $0 to $63. | ~3:00 |
| Escalation | "Shift 2": more check-ins (counter at 3), a security camera prop, an appointment dialogue. | ~3:20 |

**Information hierarchy:**
- Persistent HUD in the bottom-left: a sanity brain icon, money, and a rank title ("Intern").
- Shift name in the top centre.
- **All task feedback appears on in-world monitors and signs.**
- Dialogue appears in a paper-styled box at the bottom centre.

### 99 Nights in the Forest (Inferred)
- Spawn by the campfire with friends. The fire's light radius is the safety indicator.
- Minimal HUD: vitals, inventory, a night counter.
- The first scare at the first night is the hook.
- Class selection (bought with Diamonds) is the first purchase surface.

### Dress To Impress (Inferred)
- A theme banner and countdown timer are always visible during dressing.
- A dense grid inventory, where controller and touch navigation is the main cost.
- A runway camera sequence, then a star-voting overlay and a placement reveal.

### RIVALS (Inferred plus the official description)
- The lobby **is** the menu. You step onto a duel pad and get matched.
- The match HUD is minimal: score to 5, ammo.
- Contracts and keys appear in post-match screens.

## 3. Interaction cost by input (Inferred unless marked)
| Game | Mouse/keyboard | Touch | Controller | Small screen |
|---|---|---|---|---|
| Huss Valley | WASD plus a lateral dash key | Joystick plus a dash button. Momentum movement is forgiving to imprecise thumbs | Natural fit | The banner text is large. Chat feed overlaps the left third (Observed) |
| Animal Hospital | Click the world | Tap in-world objects. Proximity-prompt targets are large | Prompt-based. Interactions need focus handling | Dialogue boxes are readable. Small monitor text could be an issue on phones |
| 99 Nights | Pick up, craft, fight | Several buttons | OK | Dark scenes reduce readability, a low-end device risk |
| DTI | Grid clicking | Long scroll lists | **Highest cost**: grid navigation | Tiny item tiles |
| RIVALS | Precise aim | Aim assist needed | Aim assist needed | Small hit targets |

## 4. Motion grammar (implementation language; durations are proposed, not measured)
| Moment | Trigger | Property change | Duration and easing | Companion effects | Reference |
|---|---|---|---|---|---|
| Round-state banner | State change | Slide down from the top, plus fade; scale 0.9→1 | 180–250 ms in, Quad Out. Hold 1.5–2.5 s. 150 ms out | One short sting sound | Huss Valley |
| Role reveal label | Role chosen | Billboard text over the player pops: scale 0→1.15→1 | 300 ms, Back Out | Whoosh. Particles optional | Huss Valley |
| Diegetic progress | Task tick | Bar fill on an in-world SurfaceGui | Linear, matched to the task length | Soft beeps | Animal Hospital |
| End-of-run report | Run end | Clipboard slides up; lines fill in one by one | 120 ms per line, Quad Out. Total under 2 s, tap to skip | Pen-scratch tick per line | Animal Hospital |
| Currency tick | Earn | Number counts up; tiny icon pulse scale 1→1.1→1 | 120 ms, no particles | Quiet tick, rate-limited | All |
| Rare celebration | Rare unlock or first-ever discovery | Full-screen vignette, camera FOV punch +6°, item spin | 600–900 ms; can be interrupted after 300 ms | Fanfare and particles | Hatch-reveal genre (concept only) |
| Threat reveal | Wrong judgment | Camera shake (amplitude 0.3, 250 ms), light flicker, audio stinger | 250–500 ms | Stinger | Animal Hospital, 99 Nights |

**Rules we take from this:**
- Routine feedback must be cheap and quiet. Only firsts and rares earn celebrations.
- Every celebration can be skipped and has a reduced-motion fallback: a fade only, with no shake and no FOV change.

## 5. Cross-game findings
1. **One authoritative text channel for state.** Huss Valley's top-centre banner and Animal Hospital's top-centre shift label plus top-right objective. Never several competing popups.
2. **Diegetic-first UI** (in-world monitors, painted lanes, a fire radius, duel pads) lowers HUD load and suits mobile and console.
3. **Story beats come after the first action, not before.** Animal Hospital's mentor appears at about 2:40.
4. **The run-end report is the reward and return hook in one.** Animal Hospital's shift report is the clearest "how did I do, and what next".
5. **Rituals create social moments**: Huss Valley's chooser, and runway voting in DTI.
6. **A short intro cutscene of 15 s or less is used by a fast-growing game** (Animal Hospital). This is consistent with the A/B test we planned in `video-notes/takeaways.md`.
7. **No reference game pushed a shop in the first 4 minutes** (two observed).

## 6. Our UI standard (original; applies to whichever concept is approved)
### Screen zones (wireframe description, landscape; portrait mirrors it)
- **Top centre — state channel.** One banner at a time, queued, with a maximum of 2 lines.
- **Top left — objective line.** One sentence: what to do, why, and progress ("Check 2 more ships · 3/5").
- **Top right — 3 buttons maximum:** Menu (contains settings, codes, update log), Logbook/Collection, Shop.
- **Bottom left — identity strip:** rank title, primary currency, one key meter.
- **Bottom centre — action slot(s).** One primary contextual action; a second appears only when relevant.
- **Bottom right** — kept free for the mobile jump and action thumb zone.
- **World** — all task progress shown on in-world surfaces where possible.
- All zones sit inside the device safe area. Minimum touch target is 44 px equivalent; minimum body text 18 px at 1080p.

### UI state machine (generic)
```
Boot → Intro(≤8s, skippable; A/B: none) → Play
Play ⇄ Contextual tip (non-blocking, 1 at a time, auto-dismiss 6s)
Play → Menu (modal; input locked to UI; Back/B/Esc closes) → Play
Play → Shop (modal; never auto-opened in session 1) → Play
Play → Celebration (overlay; skippable after 300ms; input not locked) → Play
Play → Run end → Report (skippable) → Lobby/Next run
Any → Reconnecting (blocking overlay, retry status) → previous state | Error (retry/leave)
Debug/Admin UI: separate ScreenGui, never shipped to non-admins
```
- Single close/back rule: Esc, B, or the top-right ✕ always closes the top-most modal.
- Controller: every modal opens with a default `SelectedObject`.
- Layering: World < HUD < Tips < Modals < Celebration < Reconnect.

### Motion palette (maximum 6 patterns; native TweenService)
1. Banner (slide and fade, 200 ms Quad Out)
2. Pop (scale 0→1.15→1, 300 ms Back Out)
3. Tick (count-up and pulse, 120 ms)
4. Panel (slide 24 px and fade, 180 ms Quad Out in, 140 ms out)
5. Celebrate (vignette, spin, burst; 600–900 ms; can be interrupted)
6. Alarm (shake and flicker, 250–500 ms)

Reduced motion replaces 2, 5, and 6 with a 150 ms fade. No looping idle animations on the HUD.

## 7. Verification still needed
- Fresh-account playtests of all 5 games on a phone and a controller, timing each journey step.
- Frame-accurate motion timing: record at 60 fps and step through frames.

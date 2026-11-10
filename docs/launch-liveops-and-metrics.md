# Launch, live ops, and metrics

## 1. Name candidates
Checked with Roblox search on 2026-10-17. None of these titles currently exists as a game. Trademark checks are still to do.

| Name | Fit | Note |
|---|---|---|
| **Fogbell Harbor** | The verb (ring the bell) plus the place | Current working title |
| **Is That A Ship?** | The question *is* the gameplay; strong curiosity hook | Quirky; easy to make into clips |
| **Harbor Keepers** | Plain and clear | Generic |
| **Tidewatch** | Short and brandable | Says less about the game |
| **Foghorn Keepers** | Playful | Long |

**Recommendation:** test "Fogbell Harbor" against "Is That A Ship?" on the icon test (play-through rate) before launch.

## 2. Launch materials
- **Description:**
  > "Is that ship real? Check it, dock it, or ring the bell! Keep a foggy harbor with friends. Every night has new rules. Let the real ships in — and keep the mimics out."

  Followed by controls, then "Supports PC, mobile, tablet and console."
- **Icon brief:**
  - One ship coming half out of the fog, with one wrong detail (a googly eye in the sail).
  - A keeper raising a spyglass in the foreground.
  - Deep blue and brass palette. No text.
- **16:9 thumbnails (up to 10):**
  1. The mimic rampage, with a player bouncing off the pier.
  2. The Rules Board next to the ship.
  3. A crew ringing the bell at the last second.
  4. The Harbor Log ("Perfect Night!").

  Real gameplay only, as Roblox's thumbnail rules require.
- **Trailer / short-form hook (15 s):**
  - 0–3 s: "Is that ship real?"
  - 3–8 s: a player docks it, and it turns into a blob.
  - 8–12 s: chaos.
  - 12–15 s: the crew nets it, then the logo.
- **Update-countdown icons:** allowed only with a true time, and never restarted.
- **No misleading claims:** no "#1", no player counts we haven't reached, no fake rewards.

## 3. Closed-test thresholds (M3 go/no-go)
| Metric | Threshold | Informs |
|---|---|---|
| Players who make their first decision within 30 s | ≥ 80% | FTUE |
| Correct calls in Tide 1 | ≥ 60% | Rule difficulty |
| Players who leave within 60 s | < 30% | First minute |
| Night 1 completion | ≥ 70% | Pacing |
| Second session within 48 h | ≥ 25% | Proxy for D1 |
| "Would play with friends" | ≥ 4/5 | Co-op thesis |
| Rampage named as the funniest moment | ≥ 40% | Clip thesis |

## 4. Dashboard metrics (post-launch)
Sources: Creator Analytics plus our custom events. **We make no benchmark guarantees.** We compare only against our own previous weeks.

| Area | Metrics |
|---|---|
| Acquisition | Home impressions, play-through rate, sources split (organic Recommended For You vs. other) |
| Activation | Bounce in < 60 s and in 61–180 s; funnel steps 1–10; tutorial-equivalent completion (night 1) |
| Engagement | Session length, nights per session, playtime per user (60-minute cap aware), co-play days, party rate (≥ 2 friends in a server) |
| Retention | D1, D7, D30; rejoin rate; play days in D2–7 and D8–28 |
| Monetization | Conversion, ARPDAU, ARPPU, spend days, purchase funnel step drop-off |
| Economy | The health metrics in `economy-and-monetization.md` §8 |
| Quality | Crash and error counts, server heartbeat, client memory (sampled), like ratio, feedback themes |

## 5. Live-ops cadence (solo-sustainable)
- **Weekly (Saturday, a true time):** one small drop. Examples: 2 ship parts, 1 rule template, cosmetics, a weekly night condition, or bug fixes.
- **Monthly:** one larger drop. Examples: a new tell family, a special-visitor set, or a cosmetic collection.
- **Every 6–8 weeks:** a new coast (a map variant with new rule families). The early-access pass gives 3 days of early play, and the dates shown are true.
- **Every update** ships with a hypothesis and the metric expected to move. These are logged in `decisions.md`.

## 6. Experiment backlog
Run one experiment at a time per surface, for at least 7 days each, and read D1 and D7 for the cohorts.

1. Intro: none vs. an 8 s glide (both bounce windows).
2. A 2× XP first night of the day vs. a daily login gift (D1).
3. Fireworks priced at 15, 25, or 35 R (first-payer conversion and like ratio).
4. Tide 1 with 4 ships vs. 3 (night-1 completion and D1).
5. Pings with or without sound (co-play days).

## 7. Community, support, and moderation
- **Channels:** a Roblox group, plus an optional Discord later, opened only when the owner has time to moderate it. In-game feedback comes through a "Feedback" bottle-post prop: preset categories plus a short filtered text field, passed through `TextService` filtering and stored without personal data.
- **Support:** an FAQ page inside Menu → Help.
- **Moderation:** Roblox's own report tools. No user-generated content at launch.

## 8. Reaching the Kids and Select threshold (250–500 highly engaged, age-checked players)
1. Run the closed test with engaged testers aged 16+, who count toward the threshold.
2. A soft launch to friends-of-testers and DevForum.
3. Optionally, the Roblox Ads Manager "Engagement" objective, which targets age-checked highly engaged players. Use it only after the M3 thresholds are met.
4. Track progress in the **Audience Reach** tab.

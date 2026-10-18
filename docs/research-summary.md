# Research summary

Full evidence lives in `../research/`. Every claim there carries one of four labels: Observed, Documented, Inferred, or Unverified.

## What we learned
1. **The algorithm rewards retention over 28 days, counting organic users only.**
   - Signals: play-through rate, first-play bounce (<60 s and 61–180 s), play days, playtime (capped at 60 min per day), co-play days, qualified sessions, spend days, and Robux per user.
   - Ads and friend-referred players speed up consideration but are excluded from ranking.
   - Source: `video-notes/rasdev-algorithm.md` (Documented).
2. **Trend games spike and die.** Steal a Brainrot is down about 99% from its peak, Grow a Garden and Dead Rails are deep in decline, and a derivative of Tizzy's game died within about a month. Durable games share social rules plus skill or co-op: MM2, RIVALS, 99 Nights, DTI, Fisch. Source: `market-snapshot.md`.
3. **The platform is contracting.** DAU fell from 152M to 123M, and Roblox says it is promoting quality over slop. Source: `market-snapshot.md`.
4. **New games reach 16+ players only** until they pass the Kids and Select evaluation (250–500 highly engaged players). Source: `monetization-policy.md` (Documented).
5. **Paid random items carry heavy obligations:** odds shown for every outcome, PolicyService gating, and restrictions in the UK, Brazil, Australia, Belgium, and the Netherlands. Pricing honesty rules are explicit. Source: `monetization-policy.md`.
6. **What works in onboarding:**
   - the first fun action within 15 s
   - auto-equip
   - contextual tutorials
   - one amplified "wow" moment
   - story beats after the first action
   - an end-of-run report
   - no shop in the first minutes

   Sources: Tizzy video notes, `ui-motion-audit.md`.
7. **What works in UI:** one channel for state messages, interfaces built into the world itself, a 3-button top bar, cheap routine feedback, and skippable celebrations. Source: `ui-motion-audit.md`.
8. **Ethical monetization works at scale.** Jujutsu Shenanigans (cosmetic and QoL passes only), DTI (outfit sets), and Brookhaven (expression passes) are top-20 games. Source: `market-snapshot.md` §5.

## Decision trail
Five concepts were scored (`../research/concepts.md`):

| Concept | Outcome |
|---|---|
| Fogbell Harbor | **Recommended, 71/90** |
| Tide Runners | Lower-risk alternative, 66 |
| Skycatchers | 65 |
| Contraption Cup | 59 |
| Steal a Shooting Star | Rejected as saturated, 49 |

AI-feasibility review: `decisions.md` D-001.

## Known gaps
- No reference game was played on a fresh account. Their first-session experience is Inferred, apart from two observed videos.
- The Kids and Select threshold (500 or 250) is unconfirmed.
- Fogbell Harbor's own numbers (pacing, difficulty) are hypotheses until the closed test.

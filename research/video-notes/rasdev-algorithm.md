# The Most Valuable Roblox Algorithm Video You'll Ever Watch — rasdev

- URL: https://www.youtube.com/watch?v=e4o-ECkzDoI
- Published 2026-10-11, 12:14 runtime (yt-dlp metadata, checked 2026-10-17)
- Access confidence: **user-pasted auto-caption transcript** (no timestamps, no visuals). Notes are paraphrased. Screens the creator shows (charts, icons) were not seen.
- Conflict of interest: the creator promotes their own analytics site throughout. Treat tool recommendations as advertising.

Time ranges: the transcript has no timestamps, so each note gives its position in the video's segment order (1–8).

## 1. How Recommended For You works (segment 1)
- Paraphrased claim: An external spark (ads, search, friends, social video) gets a game tested on a small Home audience. If those players engage, Roblox expands distribution to similar players. Signals are averaged per player, so small games compete fairly. In June 2026 the window grew from 7 to 28 days. A game that starts slowly is not penalized.
- Evidence: cites Roblox's published docs. No numbers shown in the transcript.
- Verification (2026-10-17):
  - Signal list, per-user averaging, and the 7→28-day change: **Documented**. Creator Hub *Discovery*; DevForum announcement dated 2026-06-15.
  - "No penalty for a slow start": only partly **Documented**. The Discovery FAQ says new games need not wait 28 days. No explicit no-penalty statement was found, so that part is **Unverified**.
  - Omitted by the video, and important: ranking signals count **only users who joined organically from Recommended For You**. Users from ads, search, friends, or social are excluded from ranking. They can only speed up a game's *consideration*. **Documented** (Discovery page).
- Caveat: Roblox has not published how D1, D2–7, and D8–28 are weighted. Relative signal importance is shown only inside Creator Analytics.
- Implication for our game: optimize what organic Home players do in their **first 3 minutes** and across **28 days**. Paid or influencer traffic cannot fix a bad organic funnel.
- Follow-up: read the full Discovery FAQ, then check the weights in our own Creator Analytics after launch.

## 2. Finding an idea (segment 2)
- Paraphrased claim: Pure clones die, and fully novel ideas also usually die. Borrow the *reason people play* (the core loop or motivation), then change the theme or world. Examples given: Doors from Rooms, TDS from Tower Battles, and remakes like Pet Simulator X. Two questions to ask: what is the proven reason to play, and what is uniquely ours?
- Evidence: anecdotal lineage examples only.
- Caveat: survivorship bias, since failed derivatives are not shown. "Verb a noun" trend titles also feed the saturation the brief warns about.
- Implication: every concept must answer both questions in one line each. This becomes the first two columns of the concept scorecard and of `inspiration-ledger.md`.
- Follow-up: use Roblox Charts or a third-party tracker to find the rising genres, not just the incumbents.

## 3. The click: icon, title, thumbnails (segment 3)
- Paraphrased claim: Play-through rate (PTR) is the top signal. Players judge only the icon and name. Winning icons are simple, high-contrast, show one idea or the action, or use a big character. Switching sponsored ads to wide 16:9 thumbnails raised PTR by about 40%.
- Verification:
  - PTR as a top-tier signal: **Documented**.
  - Ad creatives display at 16:9, with up to 10 per campaign: **Documented** (Ads Manager docs).
  - "+40% PTR": **Unverified**. No source found.
- Caveat: PTR here means users who *saw the game in RFY* and played. It is not ad clicks.
- Implication: budget real art time for the icon and thumbnails. Test several icons. Thumbnail personalization tests with PTR are announced (DevForum 2026-06-15).
- Follow-up: Creator Hub *Thumbnails* guidelines (thumbnails must show real gameplay).

## 4. First minute and bounce (segment 4)
- Paraphrased claim: First-play bounce is a top negative signal. Skip loading menus, upfront tutorials, and character customization. The first thing a player does should be the fun thing, with teaching done during play. Example: a tag-style game where you are running on spawn and are never benched.
- Verification: the bounce segments (<60 s and 61–180 s) are **Documented**.
- Caveat: this conflicts with Tizzy's claim that adding a cutscene *reduced* bounce (see the Tizzy $119K note). Resolution to test: a short, skippable in-world intro that *is* the fantasy is fine. A menu or loading wall is not.
- Implication: spawn straight into the core action, with a target of a first meaningful action in 15 s or less. Tutorials are contextual only.

## 5. Coming back (segment 5)
- Paraphrased claim: The two signals are play days and playtime. Playtime is capped at 60 minutes. Return drivers: saved progress, things that happen while you are away (offline growth), daily rewards, weekly updates or events, and playing with friends. Solo-only games underperform.
- Verification: play days, playtime with a 60 min/user/game/day cap, and intentional co-play days are all **Documented**.
- Implication:
  - Sessions past about 60 minutes add nothing to ranking. Design satisfying 20–40 minute sessions with a *reason to return* rather than endless grind.
  - Co-play days is a ranking signal, so friend features are not optional.
  - Our cadence hypothesis: a weekly update, with fortnightly as the floor.

## 6. Monetization (segment 6)
- Paraphrased claim: The signals are spend days and Robux per user. Repeatable purchases (boosts, spins, cosmetics) do this. Avoid pay-to-unlock basics such as paid sprint, and avoid purchases that obstruct play.
- Verification: spend days and Robux spent per user are **Documented** signals. "Spins" (paid random rewards) need a separate current-policy check before use.
- Implication: prefer many small, repeatable, non-pay-to-win purchases across different days over one large purchase. Never gate core movement or fairness.

## 7. Ads (segment 7)
- Paraphrased claims:
  - Ads cannot buy Home ranking, but they bring real players and data.
  - 21 of 21 studied campaigns were incremental: about +14% play sessions and +10% more players retained at D7.
  - Better games pay less per play.
  - The Kids and Select gate dropped from 500 to 250 engaged players around August 2026.
  - Ad data lags up to 48 h, and plays are credited for up to 30 days.
- Verification:
  - Ads accelerate consideration but are excluded from ranking: **Documented**.
  - Kids and Select threshold of 250 highly engaged, age-checked players: **Documented** (DevForum). The August date is **Unverified**.
  - The 21/21, +14%, and +10% figures, plus the 48 h and 30-day attribution windows: **Unverified**.
- Caveat: ads amplify a broken funnel, so you pay to show more people a game that bounces them.
- Implication: no paid ads until the organic funnel (PTR, bounce, D1) clears our own thresholds in closed tests.

## 8. Iterating on data (segment 8)
- Paraphrased claim: Don't judge on day one. Find what caused spikes, then do more of it.
- Implication: every update ships with a hypothesis and the metric expected to move. This goes in `launch-liveops-and-metrics.md`.

# Market data sources and benchmarks (verified 2026-10-24, ~23:30 UTC, Saturday)

Scope: free, no-auth endpoints a Node 24 script can call with plain `fetch`, plus benchmark numbers with sources. Every endpoint below was called today; samples are real and trimmed. Labels: **Verified** (called today), **Not working** (called, failed), **Documented** (official doc), **Third-party** (unsourced or sampled data, treat as Unverified).

## 1. TL;DR: what to add to `tools/agent-hq/market.mjs`, ranked by value

1. **Page the sorts list and add `pageToken` to `get-sort-content`** (highest value, small change). `fetchCharts` today reads only the first `get-sorts` page, which holds 5 of 26 sorts. It misses `top-earning` (a revenue ranking, otherwise invisible), `top-rated`, `most-popular`, and `trending-in-simulation` / `-strategy` / other genre sorts. It also truncates each sort to 50 games, while sorts return 85 to 100 (`top-earning` pages to ~464). Fix: loop `sortsPageToken` on `get-sorts`, or call `get-sort-content?sortId=...` per sort and follow `nextPageToken` via `pageToken=`.
2. **Enrich `fetchGameDetails`** with fields the same `games/v1/games` call already returns and the code drops: `playing`, `favoritedCount`, `maxPlayers`, `genre_l2`, `creator.{name,type,id}`, `rootPlaceId`, `price`. Zero extra requests. Enables favorites-per-visit and a true all-games CCU for any universe (not only chart games).
3. **Badge stats as a free "new players per day" and funnel proxy** (`badges.roblox.com/v1/universes/{id}/badges`): `pastDayAwardedCount` of a "Welcome" badge is roughly unique new joiners in the last 24 h; milestone badges give a depth funnel. About half of games have no badges, so treat as optional.
4. **Rolimons `gamelist`** (one request, ~1 MB, ~7,850 games with CCU): finds rising games outside any Roblox chart. Keyed by **place id** (root place), cached 10 min, no auth. Misses some games (Run an Airline absent).
5. **`omni-search` for niche discovery** (e.g. every "Run a ..." game): `playerCount` + votes in one call, 40 per page, `pageToken` pages. Limit 4 req/s.
6. **Monetization surface listing**: `game-passes/v1/universes/{id}/game-passes` and `developer-products/v2/universes/{id}/developerproducts?limit=N` both public. Lists names, prices, `isForSale`. No sales counts. Developer products were NOT listable per `market-snapshot.md` section 5 ("not publicly listable"); that statement is now **wrong**: they are listable (verified for universe 9970645639, see section 3.10).
7. **`games/v1/games/recommendations/game/{universeId}`**: Roblox's own "similar games" for a seed game. Use it to enumerate a competitor cluster from one known title.
8. **Derived signals worth computing in `computeBreakouts`**: favorites per 1,000 visits, rank in `top-earning` minus rank in `top-playing-now` (monetization efficiency), count of sorts a game appears in (already computed as `sortsCount`), and `up-and-coming` membership.
9. Skip: servers/Public (3 requests per minute), groups (7 per minute), RoMonitor, RoProxy, user follower counts. Reasons in section 3.

Correct existing numbers: see section 4 ("What looks wrong in benchmarks.json / market-snapshot.md").

## 2. General facts (Verified)

- All Roblox hosts return `x-ratelimit-limit: N, N;w=W` and `x-ratelimit-remaining`, `x-ratelimit-reset` (seconds). Over-limit returns HTTP 429 (not provoked here). Limits per IP, per window `w` seconds.
- None of the endpoints in section 3 needed a cookie, API key, or `x-csrf-token` (all GET).
- Server timing is fast (explore-api upstream ~95 ms).
- `sessionId` for explore-api / search-api: any `crypto.randomUUID()` works. Reuse one per script run so pages are consistent.
- `device` accepts `computer`, `low_end_phone`, `high_end_phone`, `low_end_tablet`, `high_end_tablet`, `console`, `vr`, `all`. `country` accepts `all` or a 2-letter code (`us` changed ordering). The `age=` query parameter is ignored (response always says `age=all`).
- Wrong `sortId` returns HTTP 404 body `"Sort not found or not enabled"`. A garbage `sortsPageToken` silently returns page 1.
- Roblox can change any of these without notice. Code defensively (optional chaining, skip on non-OK).

## 3. Endpoints

### 3.1 Sorts list (charts) `get-sorts` (Verified, already used)
- `GET https://apis.roblox.com/explore-api/v1/get-sorts?sessionId={uuid}&device=computer&country=all[&sortsPageToken={tok}]`
- Auth: none. Rate: **120 per 60 s** (`x-ratelimit-limit: 120, 120;w=60`).
- Top-level keys: `header`, `sorts`, `nextSortsPageToken`. The token is base64 JSON `{"start":6,"count":6,"session_id":"...","device":"computer","country":"all","page_config_name":"with_alpha_location_filter_all"}`. Pass it back as `sortsPageToken`. 5 pages today, 26 sorts total, last page has no token.
- Page 1 contains a `filters_v5` pseudo-sort (`contentType:"Filters"`, no games). `normalizeCharts` already drops it because it has no games.
- Trimmed sort object:
```json
{"contentType":"Games","gameSetTypeId":23,"gameSetTargetId":691,"id":"Top_Trending_V6","sortId":"top-trending",
 "appliedFilters":"device=computer,age=all,country=all","sortDisplayName":"Top Trending",
 "topicLayoutData":{"infoText":"Top experiences with the largest relative increase in daily active users over the past week.","playButtonStyle":"Disabled"},
 "treatmentType":"Carousel","games":[ ... ]}
```
- Trimmed game object (all fields present on every row):
```json
{"universeId":66654135,"rootPlaceId":142823291,"name":"Murder Mystery 2","playerCount":1688187,
 "totalUpVotes":10845330,"totalDownVotes":1096629,"isSponsored":false,"nativeAdData":"",
 "minimumAge":0,"ageRecommendationDisplayName":"Maturity: Moderate","contentMaturity":"moderate","genreL1":"Survival"}
```
- Extract: `universeId`, `rootPlaceId`, `name`, `playerCount`, `totalUpVotes`, `totalDownVotes`, `genreL1`, `contentMaturity`, `isSponsored`. Plus rank = array index.
- All 26 sort ids seen today (with games returned on page 1) and Roblox's own definition (`infoText`):

| sortId | games | Definition from `infoText` |
|---|---|---|
| top-trending | 91 | Largest relative increase in daily active users over the past week |
| up-and-coming | 94 | Published within the last 28 days, sorted by user growth |
| top-playing-now | 95 | Concurrent users |
| fun-with-friends | 86 | At least 5,000 daily users, sorted by proportion of time in friend groups |
| top-revisited | 90 | At least 5,000 daily users, sorted by share who come back after a week |
| top-earning | 96 (pages to ~464) | **Total Robux spent in the last 7 days.** At least 5,000 daily users, or top 10% of DAU, or top 30 most played |
| top-paid-access | 76 | Paid-access experiences by daily revenue |
| top-rated | 100 | At least 5,000 daily users, high number and proportion of likes |
| most-popular | 98 | Daily users |
| trending-in-{rpg, sports-and-racing, shooter, action, adventure, entertainment, obby-and-platformer, party-and-casual, puzzle, roleplay-and-avatar-sim, shopping, simulation, strategy, survival} | 27 to 85 each | Genre-scoped trending (relative DAU increase over past week) |
| more-when-you-subscribe, learning-and-explore, trending-music-experiences, music-top-100 (Songs, 0 games) | | Minor |

- Failure modes: HTTP 200 with fewer sorts when a page config changes; `sorts` may include a `Songs` sort with `games` absent (guard with `s.games ?? []`, as the code does). Sponsored rows can appear (`isSponsored:true`); none seen today. Genre sorts are ranked lists, not time series: store them each run to compute velocity.
- Why the genre sorts matter: `trending-in-simulation` holds the "Run a ___"-style games. Today Build a Phone Empire sat at #13 and Eat Everything In A Grocery Store at #21.

### 3.2 Single sort with paging `get-sort-content` (Verified)
- `GET https://apis.roblox.com/explore-api/v1/get-sort-content?sessionId={uuid}&sortId=top-earning&device=computer&country=all[&pageToken={tok}]`
- Auth none. Rate: shares the explore-api limit (120 per 60 s observed on `get-sorts`; `get-sort-content` returned no rate header in my capture, assume the same).
- Keys: `contentType, gameSetTypeId, gameSetTargetId, primarySortId, secondarySortId, sortId, appliedFilters, sortDisplayName, topicLayoutData, treatmentType, nextPageToken, games`. Games have the same shape as 3.1.
- **Paging parameter is `pageToken`** (tested: `sortsPageToken`, `nextPageToken`, `cursor`, `gamesPageToken` are ignored and return page 1). Token is base64 JSON `{"start":100,"count":100,"sort_token":...}`. Only `top-earning` returned a `nextPageToken` today: 5 pages, 464 games total. Other sorts end after one page of 85 to 100 games.
- Counts today: top-earning 464, top-rated 100, most-popular 98, top-playing-now 95, up-and-coming 94, top-trending 91, top-revisited 90, fun-with-friends 86, trending-in-simulation 85, trending-in-strategy 30.
- `device=low_end_phone` returns a different top-earning order and count (98 vs 96), so phone-vs-PC ranking diffs are available (useful for our phone layout work).
- Failure modes: 404 for unknown sortId. `top-earning` gives **rank only, no Robux values**.
- Verified `top-earning` top 15 vs `top-playing-now` rank (23:30 UTC): RIVALS (earn 1, play 8), Murder Mystery 2 (2, 1), Steal An Egg (3, 2), Blox Fruits (4, 10), Bloodlines (5, not in top 95, 9,087 playing), Adopt Me! (6, 6), Fisch (7, 16), Jujutsu Shenanigans (8, 5), Evade (9, 27), Dress To Impress (10, 12), Tower Defense Simulator (11, 87), Pet Simulator 99 (12, 25), Tap Simulator REBORN (13, 34), Blade Ball (14, 93). Games earning far above their CCU rank (Bloodlines, TDS, Blade Ball) are the high-ARPDAU outliers worth studying.

### 3.3 Game details `games/v1/games` (Verified, already used, under-extracted)
- `GET https://games.roblox.com/v1/games?universeIds=1,2,...` (up to 50 ids). Auth none. **Rate 300 per 60 s.**
- Trimmed:
```json
{"data":[{"id":66654135,"rootPlaceId":142823291,"name":"Murder Mystery 2",
 "creator":{"id":1848960,"name":"Nikilis","type":"User","isRNVAccount":false,"hasVerifiedBadge":true},
 "price":null,"playing":1689806,"visits":31719849932,"maxPlayers":12,
 "created":"2014-01-18T10:07:51.557Z","updated":"2026-10-21T20:33:13.636Z",
 "genre":"Horror","genre_l1":"Survival","genre_l2":"1 vs All","favoritedCount":24647477,
 "canonicalUrlPath":"/games/142823291/Murder-Mystery-2","isContentRestricted":false}]}
```
- Extract (new vs what code keeps): **`playing`, `favoritedCount`, `maxPlayers`, `genre_l2`, `creator.name/type`, `price`**, plus existing `visits`, `created`, `updated`, `genre_l1`. `description` is long: do not store.
- Failure modes: unknown ids are simply omitted; ids over 50 return HTTP 400.

### 3.4 Votes `games/v1/games/votes` (Verified)
- `GET https://games.roblox.com/v1/games/votes?universeIds=1,2,...` Auth none. **Rate 200 per 60 s.**
- `{"data":[{"id":66654135,"upVotes":10845425,"downVotes":1096644}]}`. Useful for games not in a chart (chart rows already carry votes).

### 3.5 Favorites count (Verified, redundant)
- `GET https://games.roblox.com/v1/games/{universeId}/favorites/count` returns `{"favoritesCount":24647477}`. Rate 200 per 60 s. Use `favoritedCount` from 3.3 instead (batch of 50).

### 3.6 Search `omni-search` (Verified)
- `GET https://apis.roblox.com/search-api/omni-search?searchQuery={q}&sessionId={uuid}&pageType=all[&pageToken={tok}]`
- Auth none. **Rate 4 per second** (`x-ratelimit-limit: 4, 4;w=1`). Sleep ~350 ms between calls.
- Keys: `searchResults, nextPageToken, filteredSearchQuery, vertical, sorts, paginationMethod, sdui`. `searchResults[]` = `{contentGroupType:"Game", contents:[{...}], topicId:"Invalid"}`; each `contents[0]` is one game. 40 groups per page; `nextPageToken` is base64 `{"start":40,"count":40,...}`. 36 queries x 2 pages gave 1,515 unique games.
```json
{"universeId":9970645639,"name":"Run a Restaurant!","playerCount":6047,"totalUpVotes":547842,"totalDownVotes":7251,
 "rootPlaceId":77843161404023,"minimumAge":0,"ageRecommendationDisplayName":"Maturity: Minimal",
 "contentType":"Game","canonicalUrlPath":"/games/.../Run-a-Restaurant","creatorName":"","creatorId":0}
```
- `creatorName` and `creatorId` are blank here. Filter by `contentType === "Game"` (results can include other types). Search is fuzzy: query "run a" returns many non-matching names; filter names client-side with `/\brun\s+an?\s/i` after stripping `[...]` tags and emoji.
- No visits or created date: join with 3.3.

### 3.7 Badges `badges/v1/universes/{id}/badges` (Verified)
- `GET https://badges.roblox.com/v1/universes/{universeId}/badges?limit=100&sortOrder=Asc` (limit 10/25/50/100). Auth none. **Rate 100 per 60 s.** Paginate with `nextPageCursor`.
- Trimmed, Run a Restaurant (real):
```json
{"data":[{"id":..,"name":"Welcome!","enabled":true,"created":"2026-05-02T..","statistics":{"pastDayAwardedCount":18997,"awardedCount":21680867,"winRatePercentage":0.219}},
 {"name":"100 Customers","statistics":{"pastDayAwardedCount":5226,"awardedCount":5597868,"winRatePercentage":0.06}},
 {"name":"1k Customers","statistics":{"pastDayAwardedCount":2087,"awardedCount":1952115,"winRatePercentage":0.024}},
 {"name":"Millionaire","statistics":{"pastDayAwardedCount":1221,"awardedCount":306389,"winRatePercentage":0.014}},
 {"name":"1 Million Customers","statistics":{"pastDayAwardedCount":39,"awardedCount":6272,"winRatePercentage":0}}]}
```
- Cheer Gym (real): Welcome `pastDayAwardedCount` 30,745, `awardedCount` 1,195,888, `winRatePercentage` 0.985; Competition Winner 2,409 / 66,716 / 0.077; Haunted House Complete 1,410 / 46,385 / 0.045.
- Interpretation (Inferred, undocumented): the "Welcome" badge (awarded on first join) is a proxy for **new unique players per day**; `awardedCount` for it approximates lifetime unique players (Restaurant: 21.7M unique vs 131.9M visits, so about 6 visits per unique player). The ratio of a milestone's `awardedCount` to Welcome's is a **depth funnel** (Restaurant "100 Customers" = 25.8% of Welcome-ers, "1k Customers" = 9.0%, "Millionaire" = 1.4%). `winRatePercentage` appears to be a fraction (0.985 means ~98.5% on Cheer Gym) but the denominator is undocumented and inconsistent with the count ratios; do not rely on it. A badge awarded on a developer-chosen trigger may undercount.
- Coverage: of 25 up-and-coming games probed, 12 had no badges or had zero awards. Run a Hotel, Run an Airline and Run a Gym returned `data: []`. Treat as optional.
- Failure modes: empty `data`; badges disabled; caching (stats lag).
- Use for breakouts: `welcomePerDay / playing` shows how churny a game is (new players per concurrent player). The Hollow today: 418,027 per day Welcome vs 218,836 playing and 54.9M visits at age 11 days.

### 3.8 Game passes `apis.roblox.com/game-passes/v1/universes/{id}/game-passes` (Verified)
- `GET https://apis.roblox.com/game-passes/v1/universes/{universeId}/game-passes?passView=Full&pageSize=10`. Auth none. Rate **50 per 1 s**.
- `{"gamePasses":[{"id":2036403000,"productId":3719028433,"name":"BUNDLE: Mortal","isForSale":true,"price":3399,"creator":{"creatorType":"User","creatorId":1848960,"name":"Nikilis"},"created":"2026-10-16T19:19:39.712Z","updated":"2026-10-18T18:59:56.675Z"}, ...]}`. Not-for-sale passes have `price:null`.

### 3.9 Developer products (Verified, new)
- `GET https://apis.roblox.com/developer-products/v2/universes/{universeId}/developerproducts?limit=5`. Auth none. Rate 200 per 60 s. The query parameter is **`limit`** (an earlier call with `pageSize` returned `InvalidPageSize`).
- `{"developerProducts":[{"ProductId":3606612798,"Name":"10x Pet Crate","PriceInRobux":929,"IsForSale":true,"Created":"2026-06-26T03:38:50.377Z","Updated":"2026-07-09T21:35:36.139Z","UniverseId":9970645639}, ...]}` (Run a Restaurant). No sales or revenue counts. Extract: product names, `PriceInRobux`, `IsForSale`, count, `Updated` (cadence of new products). Useful for the price-ladder study in `market-snapshot.md` section 5.

### 3.10 Similar games `games/v1/games/recommendations/game/{universeId}` (Verified)
- `GET https://games.roblox.com/v1/games/recommendations/game/9970645639?maxRows=40`. Auth none. Rate 200 per 60 s. Returns `{games:[...], nextPaginationKey}`. For Run a Restaurant it returned 6 games: Own a Cafe (162 playing), Restaurant Tycoon 3 (7,943), Rent A Tent Tycoon (344), Build a Hotel (125), Airport Tycoon (416), My Dream Pizza Store (25).
```json
{"creatorId":1053923615,"creatorName":"Espresso Espresso","creatorType":"Group","totalUpVotes":106175,"totalDownVotes":3892,
 "universeId":8935993972,"name":"[☕] Own a Cafe","placeId":131906518201863,"playerCount":162,"isSponsored":false,
 "genre":"","minimumAge":0,"canonicalUrlPath":"/games/131906518201863/Own-a-Cafe"}
```
- Extract: competitor set (graph edges), creator names, `playerCount`. Small result sets (about 6), and the list is personalized to the "similar" model, not ranking.

### 3.11 Universe lookup and other develop/games endpoints (Verified)
- `GET https://apis.roblox.com/universes/v1/places/{placeId}/universe` returns `{"universeId":10390151142}`. Rate 60 per 60 s. Maps Rolimons place ids to universe ids.
- `GET https://develop.roblox.com/v1/universes/multiget?ids=a,b` (rate 10,000 per 60 s): `{"id","name","isArchived","rootPlaceId","isActive","privacyType":"Public","creatorType":"Group","creatorTargetId":75550158,"creatorName":"Burnt Toast Labs!","created","updated","audiences":[1,2,3,4]}`. Gives creator group id. `develop.roblox.com/v1/universes/{id}/permissions` is 401 (auth).
- `GET https://games.roblox.com/v2/users/{userId}/games?limit=10|25|50&sortOrder=Desc` and `GET https://games.roblox.com/v2/groups/{groupId}/gamesV2?limit=10|25|50|100`: list a creator's games (limit must be one of those values or HTTP 400). Group endpoint rate **3 per second**. Use to see a studio's portfolio (e.g. Espresso Espresso group 1053923615 returned Own a Cafe).
- `GET https://games.roblox.com/v1/games/{universeId}/media`: preview video and image asset ids (`assetType: GamePreviewVideo | Image`). Rate 200 per 60 s. Feeds the thumbnail study.
- `GET https://thumbnails.roblox.com/v1/games/icons?universeIds=...&size=150x150&format=Png` (already used). Rate 1,200 per 60 s.
- `GET https://groups.roblox.com/v1/groups/{id}`: `memberCount` (e.g. group 1 = 301,103). **Rate 7 per 60 s.** Too tight for bulk. `groups/v1/groups/search` rate 300 per 60 s is fine.
- `GET https://friends.roblox.com/v1/users/{id}/followers/count` returns `{"count":2922822}` (Nikilis). Rarely useful.
- `GET https://catalog.roblox.com/v1/search/items?keyword=...&limit=10` returns only `{id,itemType}` ids; rate **12 per 60 s**. Not worth it.
- `GET https://games.roblox.com/v1/games/{rootPlaceId}/servers/Public?limit=10` works (`{id, maxPlayers, playing, fps, ping}` per server) but rate is **3 per 60 s**; needs the **place** id (passing a universe id returns "The place is invalid"). Skip. `multiget-place-details` is 401.

### 3.12 Rolimons game list (Verified)
- `GET https://api.rolimons.com/games/v1/gamelist`. Auth none. `Cache-Control: public, max-age=600`; Cloudflare-fronted. Set a User-Agent; no rate limit published. Do not poll more than once per 10 min.
- Response (1.09 MB): `{"success":true,"game_count":7853,"games":{"142823291":["Murder Mystery 2",1651492,"https://tr.rbxcdn.com/180DAY-.../150/150/Image/Webp/noFilter"], ...}}`. **Key = root place id**, value = `[name, playing, iconUrl]`.
- Today: sum of CCU over listed games 12.27 M; 3,247 games with 100+ playing; 1,100 with 1,000+. Top: MM2 1,651,492; Steal An Egg 1,064,151; Brookhaven 422,211; Steal a Brainrot 257,053; Jujutsu Shenanigans 234,265; The Hollow 221,579; Adopt Me! 195,477; RIVALS 173,884.
- Not all games are present (Run an Airline's place 89967070535099 and Run a Dance Studio's 129244982349741 were absent), so use as a supplement. Other Rolimons paths tried (`/gameapi/gamelist`, `/games/v1/gameinfo`, `/games/v1/game`) return 404 or "Not found". Use case: snapshot ~2 to 3 times per day, diff to find fast risers with 300 to 5,000 CCU that never enter a chart.

### 3.13 Not working or not worth it
- RoMonitor Stats (`romonitorstats.com`): the site is an SPA; `/api/v1/games/{id}` and `api.romonitorstats.com` return the HTML shell. No documented public API found. **Not working.**
- RoProxy (`games.roproxy.com`): HTTP 403 Cloudflare challenge from this client. **Not working** (and unnecessary: Roblox APIs work directly).
- `rotrends.com/api/games`: 308 redirect to a Next.js HTML page. **Not working.**
- `games.roblox.com/v1/games/sorts` and `apis.roblox.com/discovery-api/omni-recommendation`: 404. `games/v1/games/list?model.keyword=`: 404.
- Bloxbiz / Gamefam: not queried (no public endpoint located; web search gave no free API). Do not plan on them.

## 4. Benchmarks

### 4.1 What Roblox itself publishes (Documented)
- Creator Hub Analytics: Roblox gives **no absolute D1/D7/D30, session, or payer targets**. It exposes **peer benchmark scorecards** inside Creator Analytics once a game has **100+ DAU**, updated daily. For overall KPIs the pool is the top 1,000 experiences by 30-day playtime, with Top 200 / Top 500 / Top 1000 tiers. "Roblox does not use these benchmarks as a direct signal in the discovery algorithm."
- Definitions: D1 = share of new users returning the next day; D7 = on day 7; D30 = on day 30; cohorts daily for 10 days, weekly for 10 weeks. Tracked: 7D playtime per user, **7D player conversion rate (cumulative)**, 7D / 30D revenue per user, ARPPU, play-through rate.
- Analytics-essentials guidance: reach the fun within ~5 minutes of entering; small updates every 2 to 4 weeks, large ones every 2 to 3 months.
- Discovery (Recommended For You) signal list, roughly in priority: play-through rate; first-play bounce (under 60 s, 61 to 180 s; negative); play days per user (D1, D2 to 7, D8 to 28); playtime per user capped at 60 min per user per game per day; intentional co-play days; qualified play sessions; spend days; Robux per user. Signals are per-user averages and count only users who joined organically from Recommended For You on Home. A custom thumbnail is required for Home recommendation impressions.
- Platform: Q2 2026 DAU 123M, bookings per DAU about $12.66 (down 2% year over year) (third-party summary of the 10-Q / earnings, consistent with `market-snapshot.md`). Q3 2026 results were not yet published when checked.

### 4.2 GameAnalytics 2025 Roblox Benchmark Report (best sourced numbers)
Source: GameAnalytics + Investgame, "The 2025 Roblox Benchmark Report." Data from Roblox titles integrated with GameAnalytics, Jan 2023 to Jul 2025, covering about 47% of platform engagement. Game-level tables use 2025 data, bucketed by **average session length**. No genre split, no payer % or ARPDAU or CCU/DAU. Sample size per bucket not disclosed. Retention here is game-level (each game's own D1/D7/D30), distribution across games.

| Avg session | D1 P50 | D1 P90 | D1 P98 | D7 P50 | D7 P90 | D7 P98 | D30 P50 | D30 P90 | D30 P98 | ARPPU/day P50 | Sessions/day P50 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 to 3 min | 4.31% | 9.25% | 12.33% | 0.41% | 1.78% | 3.16% | 0.13% | 0.62% | 0.81% | $0.48 | 1.3 |
| 4 to 6 min | 6.20% | 11.65% | 17.17% | 0.88% | 2.36% | 4.35% | 0.28% | 0.76% | 1.46% | $0.70 | 1.0 |
| 7 to 12 min | 7.91% | 11.55% | 15.81% | 0.90% | 2.04% | 3.57% | 0.24% | 0.75% | 1.49% | $0.77 | 1.0 |
| 13 to 18 min | 10.24% | 14.96% | 20.85% | 1.20% | 2.70% | 4.57% | 0.34% | 1.02% | 1.94% | $1.21 | 1.0 |
| 19 to 24 min | 11.46% | 18.20% | 32.30% | 1.61% | 5.15% | 8.54% | 0.46% | 1.44% | 2.99% | $1.71 | 1.8 |
| 25+ min | 10.76% | 18.86% | 25.41% | 1.82% | 5.86% | 7.01% | 0.50% | 1.45% | 2.87% | $2.12 | 2.2 |

- P95 values (same source): D1 10.72 / 13.17 / 13.37 / 15.91 / 23.60 / 24.79; D7 2.12 / 3.16 / 2.58 / 3.07 / 7.88 / 6.44; D30 0.74 / 1.05 / 0.90 / 1.25 / 1.94 / 1.92; ARPPU P95 $2.67 / 2.63 / 2.67 / 4.66 / 27.17 / 11.41 (buckets in the order above).
- Platform-wide player behavior (2025): session length P25 2.36, P50 6.62, P75 14.53, P90 26.38, P95 37.10 min; sessions per day P50 2.02, P90 6.0, P95 8.0; daily playtime P50 16.77, P75 34.6, P90 64.91, P95 93.84 min; ARPPU per day P50 $0.72, P75 $3.00, P90 $9.91, P95 $20.65; device mix: PC + mobile 48.4%, PC only 37.6%, mobile only 7 to 10%, console about 2%.
- Platform spend share (GameAnalytics 2023 report, as summarized by third parties): about **4.2% of players spend Robux**, over half of those under $1 per year. All genres. Third-party (Unverified in detail).
- No credible sourced numbers exist for ARPDAU, payer % by genre, or CCU/DAU by genre. Searches found only unsourced blog claims. Compute CCU/DAU yourself from Creator Analytics after launch (not obtainable from public APIs).

### 4.3 Third-party unsourced genre claims (do NOT use as targets)
- Rowatcher (`rowatcher.com/news/retention-benchmarks-by-roblox-genre-...`): obby D1 25 to 35%, D7 10 to 15%, D30 under 5%; roleplay D1 15 to 22%, D30 8 to 15%; tycoon/incremental D1 20 to 28%, D7 12 to 18%; shooter D1 22 to 30%, D7 12 to 16%. **No methodology or sample.** These are 2 to 5x higher than the GameAnalytics P90 values, so they are almost certainly aspirational or from other platforms. Only the qualitative note is reusable: tycoons show a "content wall" when D30 drops over 60% below D14 without prestige or updates.
- Rolearn.dev 2026 genre table (session 26 to 48 min, gamepass conversion 2.4% to 4.1%): columns unlabeled, collection method unstated.
- Profitable.app calculator: "1 to 3% payers" is a stated assumption.

### 4.4 Benchmark table for `benchmarks.json` (proposed values)

| id | Current target | Evidence | Assessment |
|---|---|---|---|
| d1 | 12 to 15% (stretch 16%) | GA game-level D1: P50 10 to 11% for 13+ min sessions, P90 15 to 19%, P98 25 to 32% | Reasonable. 12 to 15% sits between P50 and P90 for games with 13+ min sessions. Relabel from "Creator claim, Unverified" to "Third-party sampled (GameAnalytics 2025)". The stretch should read "P90 is 15 to 19%". |
| d1 closed test | 25% return in 48 h | No public source | Keep as team proxy. |
| d7 | 2 to 3% | GA D7: P50 0.4 to 1.8%, P90 1.8 to 5.9% | Reasonable (about P75 to P90). Now has a source. |
| d30 (missing) | none | GA D30: P50 0.13 to 0.50%, P90 0.6 to 1.45% | Add: target 0.5 to 1.5% (P50 to P90). |
| session-length | at least 10 min | GA platform session: P50 6.6, P75 14.5, P90 26.4 min | Reasonable. Hitting 10 min is about P60 of all sessions. Retention rises sharply when game-average session crosses 13 min (D1 P50 7.9% at 7 to 12 min, 10.2% at 13 to 18, 11.5% at 19 to 24). |
| paying-share | about 2% | 4.2% spend Robux platform wide (2023, GA); genre unknown | Plausible but Unverified. Planning range 2 to 4% with the 4% being a platform average, not a tycoon figure. |
| arpdau | n/a, creator claim 0.9 to 2.0 | GA gives **ARPPU per day** (per paying user), P50 $0.72 platform, $1.71 for 19 to 24 min games | The Tizzy "ARPDAU 0.9 to 2.0" is probably ARPPU-like (units unstated). Flag units. ARPDAU = ARPPU x payer share; at 2 to 4% payers and $1.2 to $2 ARPPU that is only about $0.02 to $0.08 per DAU. |
| like-ratio | at least 80% | Today: Run-a games 97 to 99% (restaurant cluster), the 25 up-and-coming games span 48 to 97% | Floor of 80% is fine (and below the median of top games, about 90%). |
| error/performance | team targets | none | Keep. |

### 4.5 What looks wrong or stale
- **`market-snapshot.md` section 5**: "Monetization is through developer products only (not publicly listable)". Developer products ARE listable through the public `developer-products/v2` endpoint (3.9). Prices and counts can be captured; only sales volume is hidden.
- **`market-snapshot.md` section 2 absolute CCU**: the 2026-10-17 numbers were taken near 16:29 UTC; today near 23:30 UTC the same games read very differently (Murder Mystery 2 about 1.69M vs 309K; Steal An Egg about 1.07M vs 3.58M; Brookhaven about 422K vs 672K; Steal a Brainrot about 257K vs 150K; Fisch about 86K vs 359K). Large differences (and Halloween events) mean single snapshots mislead. Compare same time of day or store several snapshots. The snapshot file already notes the weekly-peak caveat; add time-of-day.
- **`benchmarks.json` "paying-share"** label: "Unverified (third-party model)" is correct, but the evidence is now a sampled 4.2% platform figure, not only a calculator assumption.
- **`benchmarks.json` "d1" source**: Tizzy's "D1 about 6 to 8% rising to 16%" is consistent with the GA distribution (P50 4 to 11%), so it is plausible; the wording "Creator claim" should gain the GA reference.
- **`market.mjs` header comment / code**: `slice(0, 50)` per sort and the first-page-only fetch understate the chart coverage (see section 1). `computeBreakouts` thresholds (under 300K visits, over 500 playing) are fine for tycoon/management niches but miss games like Run a Restaurant, which crossed 131M visits at only about 6,000 CCU (see section 6); consider a second rule using a visits-to-CCU ratio.

## 5. Signals that predict a breakout game (with evidence)

Evidence base: Roblox's own sort definitions and ranking docs, plus today's data (25 up-and-coming games, top-earning, Run-a set). Correlation, not proven causation.

1. **Climbing in `up-and-coming` (age under 28 days) with 10K+ CCU** (Documented sort). Today's list shows 25 games under 28 days old with CCU from 3,652 to 218,836; The Hollow (created 2026-10-13) hit 218,836 CCU and 54.9M visits within 11 days.
2. **Appearing in several sorts at once** (`sortsCount` in `velocity`): Eat Everything In A Grocery Store sits in top-trending #38, up-and-coming #47, top-playing-now #88, most-popular #89 and trending-in-simulation #21 simultaneously, with 17,339 CCU at 12 days old.
3. **Favorites per visit** (`favoritedCount / visits`), a love-over-tourist signal. Steel Fighters 862,452 / 8.03M = 10.7%; Save the Krusty Krab 175,034 / 14.0M = 1.3%; Cat Battles 145,001 / 65.5M = 0.2% (73% like ratio, at risk). Versus Run a Restaurant 785,596 / 131.9M = 0.6% after 6.5 months. Treat above 2% in a young game as strong, below 0.3% as spiky.
4. **Like ratio at the time of surge**: Cat Battles 73%, +1 Upgrade Per Kill 48%, A Long Flight 75% (all young and rising) vs breakouts that hold 89 to 97% (Venom Evolution 97%, Pinkie Promise 95%, Krusty Krab 94%). Roblox's "top-rated" sort also requires proportion of likes. Low ratio during a spike is a decay warning (matches the 90 to 99% decay of low-quality viral games in `market-snapshot.md` section 3).
5. **Top-earning rank much better than CCU rank**: Bloodlines (earning #5, not in top 95 for playing, 9,087 playing), Tower Defense Simulator (#11 vs #87), Blade Ball (#14 vs #93). High spend per player; note `top-earning` is a 7-day Robux measure so older events can inflate.
6. **Badge funnel depth** (3.7): Run a Restaurant's milestones fall 100 Customers 25.8%, 1k 9.0%, Millionaire 1.4% of Welcome awards; a flat or gently-sloped funnel indicates a progression loop that holds players. Compare new-players-per-day to CCU: Restaurant 18,997 per day vs 6,045 CCU (3.1 : 1); Cheer Gym 30,745 per day vs 1,333 CCU (23 : 1, extreme churn or a promotion burst, plus a 98.5% welcome rate); The Hollow 418,027 per day vs 218,836 CCU (1.9 : 1).
7. **Staying power markers (evergreens)**: low new-per-CCU and a visits-per-unique ratio above 5 (Restaurant: 131.9M visits / 21.7M uniques = 6.1). The snapshot's evergreens (MM2, Brookhaven, 99 Nights) are all social-rule or co-op loops.
8. **Update cadence**: all 25 recent fast risers show `updated` within the last 1 to 8 days; Roblox docs recommend small updates every 2 to 4 weeks. Stale tycoons in the Run-a set (Run a Cafe, last updated 2026-09-30 with 0 playing) lose their audience.
9. **Server size matches the loop** (`maxPlayers`): Run-a games almost all use 6 to 8 per server (private-ish co-op); the original viral steals use 7 to 8; social games 25 to 50.
10. **Documented Home-ranking inputs** (Discovery docs): play-through rate, first-play bounce, D1 / D2 to 7 / D8 to 28 play days, playtime (cap 60 min), co-play days. These are the actual mechanism; public APIs can only observe outcomes (CCU growth, votes, favorites).

## 6. The "Run a ___" genre and management/tycoon games (fetched 2026-10-24 ~23:30 UTC)

Method: 36 omni-search queries (2 pages each), name filter `/\brun\s+an?\s/i` after removing `[...]` tags and emoji, then `games/v1/games` + `votes` by universe id. "Like %" = up / (up + down). Visits and favorites are lifetime. Cutting off at what the search surfaced; there may be others. 33 "Run a/an" games found; combined CCU 21,327; only 5 exceed 1,000 playing.

### 6.1 "Run a ..." games (sorted by playing now)

| Universe id | Name | Playing | Visits | Like % | Favorites | Created | Updated | Max players | Genre (l1/l2) |
|---|---|---|---|---|---|---|---|---|---|
| 9970645639 | Run a Restaurant! | 6,045 | 131.9M | 99 | 785,596 | 2026-04-01 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10448094761 | Run a Hotel | 4,338 | 776K | 98 | 33,067 | 2026-07-04 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10126644530 | Run a Sari-Sari Store! | 4,026 | 10.0M | 97 | 60,348 | 2026-05-05 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10768550253 | Run an Airline | 3,717 | 2.50M | 90 | 19,021 | 2026-09-29 | 2026-10-24 | 8 | Simulation/Idle |
| 10765494545 | Run a Cheer Gym | 1,333 | 3.63M | 97 | 166,307 | 2026-09-07 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10768565158 | Run a Monster Tavern | 696 | 311K | 82 | 10,979 | 2026-09-29 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10750231909 | Run a Library | Shelf Life | 407 | 2.78M | 88 | 35,415 | 2026-08-21 | 2026-10-24 | 8 | Simulation/Tycoon |
| 10390151142 | Run a Dance Studio | 239 | 12.4M | 79 | 39,706 | 2026-06-25 | 2026-10-20 | 10 | Simulation |
| 10767926415 | Run a Driveway Business | 158 | 1.20M | 73 | 22,949 | 2026-09-24 | 2026-10-24 | 20 | Simulation/Incremental |
| 10417862026 | Run a Mail Office! | 63 | 631K | 68 | 21,592 | 2026-06-29 | 2026-10-14 | 50 | Simulation/Tycoon |
| 10769339371 | Run A Haunted House | 62 | 88K | 89 | 1,213 | 2026-10-04 | 2026-10-24 | 5 | Simulation/Tycoon |
| 10768558548 | Run A Farm! | 57 | 22.7K | 88 | 90 | 2026-09-29 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10028240558 | Run a Brainrot Shop! | 37 | 3.70M | 84 | 8,489 | 2026-04-12 | 2026-08-21 | 30 | Simulation/Tycoon |
| 10664602858 | Run a Hospital (Doctor's Orders) | 23 | 463K | 95 | 3,542 | 2026-08-09 | 2026-09-29 | 6 | Simulation/Tycoon |
| 10548372846 | Run a Hospital (Hospital Interactive) | 21 | 460K | 78 | 2,107 | 2026-07-22 | 2026-10-22 | 6 | Roleplay/Life |
| 10671365516 | Run a Restaurant Together | 16 | 217K | 82 | 2,455 | 2026-08-10 | 2026-09-03 | 50 | Simulation |
| 10766064569 | Run a Puppy Spa | 14 | 20.0K | 72 | 266 | 2026-09-11 | 2026-10-22 | 6 | Simulation/Tycoon |
| 10307579167 | Run A Kiosk 2 | 13 | 1.17M | 43 | 7,164 | 2026-06-11 | 2026-08-11 | 6 | Simulation |
| 10769212378 | Run A Business | 13 | 35K | 76 | 1,347 | 2026-10-03 | 2026-10-24 | 6 | Simulation/Tycoon |
| 10168706860 | Run a Matcha Shop! | 11 | 834K | 77 | 8,397 | 2026-05-14 | 2026-08-31 | 8 | Simulation/Tycoon |
| 10770238682 | Run a Salon! | 13 | 13.9K | 81 | 146 | 2026-10-10 | 2026-10-23 | 6 | Simulation/Tycoon |
| 7628753636 | Run a Gym! | 8 | 12.1M | 98 | 80,224 | 2025-05-01 | 2026-09-25 | 7 | Simulation/Tycoon |
| 10064981815 | Run a Gas Station Tycoon | 5 | 1.21M | 97 | 73,905 | 2026-04-21 | 2026-10-04 | 4 | Simulation/Tycoon |
| 10546004662 | Run a Store | 4 | 1.01M | 95 | 5,766 | 2026-07-22 | 2026-10-22 | 6 | Simulation/Tycoon |
| 10262021964 | Run a Black Market | 4 | 1.22M | 68 | 4,776 | 2026-06-02 | 2026-08-10 | 6 | Simulation/Tycoon |
| 10678601557 | Run a Prison | 3 | 53K | 83 | 240 | 2026-08-11 | 2026-10-16 | 7 | Simulation/Tycoon |
| 10767584538 | Run An Airport Tycoon! | 1 | 53K | 61 | 215 | 2026-09-22 | 2026-10-24 | 6 | Simulation/Tycoon |
| 7935894251 | Run a Business! | 0 | 1.74M | 60 | 4,653 | 2025-06-17 | 2026-07-27 | 6 | Simulation/Tycoon |
| 10767264005 | Run a Bakery | 0 | 13.7K | 72 | 454 | 2026-09-20 | 2026-10-23 | 6 | Simulation/Tycoon |
| 10769903837 | Run a Haunted Hotel | 0 | 28K | 58 | 1,240 | 2026-10-08 | 2026-10-18 | 6 | Simulation/Tycoon |
| 10080721898 | Run a Cafe | 0 | 2.20M | 88 | 49,020 | 2026-04-25 | 2026-09-30 | 6 | Simulation/Tycoon |
| 10753447421 | Run a Magic Shop! | 0 | 73K | 52 | 1,802 | 2026-08-22 | 2026-10-14 | 6 | Simulation/Tycoon |
| 10651847124 | Run a Museum! | 0 | 26K | 47 | 977 | 2026-08-07 | 2026-09-23 | 8 | Simulation/Tycoon |

Read (Inferred):
- Winners are few and concentrated. Run a Restaurant is 28% of the genre's CCU, with 99% likes and updates today (6 months old). Three of the five above-1,000 titles are less than 4 months old.
- The "Run a" **name** is saturated (33+ titles, many with 0 playing); the **winning core** is a 6-player co-op tycoon with a shop/venue fantasy, near-daily updates, and 97 to 99% likes.
- Like ratio separates winners (97 to 99%) from the rest; most sub-100-CCU titles sit at 43 to 84%.
- Original "Run an Airline" appears (as "[CARGO] Run an Airline") at #65 up-and-coming and #80 top-trending, 3,717 playing, 90% likes.
- Run a Restaurant is #21 in `top-rated`.

### 6.2 Other management / tycoon / shop-fantasy games (selected, by playing now)

| Universe id | Name | Playing | Visits | Like % | Favorites | Created | Updated | Max | Genre |
|---|---|---|---|---|---|---|---|---|---|
| 1202096104 | Driving Empire | 24,907 | 3.38B | 93 | 31.8M | 2019-06-23 | 2026-10-23 | 22 | Vehicle Sim |
| 10769188452 | Eat Everything In A Grocery Store | 17,339 | 11.9M | 89 | 164K | 2026-10-03 | 2026-10-24 | 12 | Incremental |
| 10767582899 | Build a Phone Empire | 15,022 | 9.68M | 87 | 69.4K | 2026-09-22 | 2026-10-24 | 8 | Tycoon |
| 10282097014 | Pet Store Tycoon | 9,584 | 17.5M | 96 | 210K | 2026-06-06 | 2026-10-22 | 8 | Tycoon |
| 7094518649 | Restaurant Tycoon 3 | 7,943 | 384M | 95 | 920K | 2025-01-16 | 2026-10-24 | 6 | Tycoon |
| 605887098 | Car Dealership Tycoon | 7,222 | 2.54B | 93 | 3.74M | 2018-03-27 | 2026-10-24 | 15 | Tycoon |
| 10768458048 | Army Commander Tycoon | 6,484 | 6.11M | 93 | 34.6K | 2026-09-28 | 2026-10-24 | 8 | Tycoon |
| 10698216738 | Military Army Tycoon | 5,714 | 38.0M | 98 | 135K | 2026-08-13 | 2026-10-24 | 6 | Tycoon |
| 10436530264 | Build An Ant Empire | 5,404 | 28.2M | 96 | 489K | 2026-07-03 | 2026-10-24 | 6 | Tycoon |
| 10643795368 | Idle Mafia Game | 3,589 | 16.0M | 88 | 66.4K | 2026-08-06 | 2026-10-24 | 15 | Incremental |
| 10771507608 | My Small Business | 2,919 | 282K | 96 | 3.25K | 2026-10-17 | 2026-10-24 | 6 | Tycoon |
| 10767912502 | Trading Tycoon | 2,658 | 4.93M | 94 | 23.3K | 2026-09-24 | 2026-10-24 | 6 | Tycoon |
| 10769452915 | Build a PC Empire | 1,786 | 549K | 75 | 12.5K | 2026-10-05 | 2026-10-24 | 8 | Tycoon |
| 9948575164 | Merge Shop | 1,566 | 58.0M | 96 | 255K | 2026-03-27 | 2026-10-24 | 6 | Match & Merge |
| 10553704684 | Own a Grocery Store | 1,350 | 11.9M | 92 | 586K | 2026-07-23 | 2026-10-24 | 8 | Tycoon |
| 10765541201 | 2 Player Pizza Tycoon | 1,318 | 5.70M | 91 | 21.3K | 2026-09-07 | 2026-10-23 | 8 | Tycoon |
| 10324001605 | My Flower Shop | 1,271 | 22.9M | 98 | 532K | 2026-06-14 | 2026-10-22 | 4 | Tycoon |
| 31970568 | Theme Park Tycoon 2 | 3,463 | 1.63B | 89 | 6.11M | 2012-01-02 | 2026-08-31 | 6 | Tycoon |

Read (Inferred):
- A wave of "Build/Own/Run a [business]" co-op tycoons from Sept to Oct 2026 is rising: Phone Empire (15K CCU at 32 days), My Small Business (2.9K CCU after 7 days, 96% likes), Trading Tycoon (2.7K), PC Empire (1.8K, 75% likes).
- Longevity examples: Restaurant Tycoon 3 and Car Dealership Tycoon (seven-year-old) still hold 7K CCU with daily updates.
- 4 to 8 max players is the dominant server size.

## 7. Suggested implementation notes for market.mjs (spec only, no code written)

- `fetchCharts`: after the first `get-sorts` response, follow `nextSortsPageToken` until absent (max 6 pages, sleep 250 ms). Then for sorts where the first page returned a `nextPageToken`... only `top-earning` pages today; loop `get-sort-content` with `pageToken` up to 5 pages for it (400 to 500 games).
- Remove `.slice(0, 50)` or raise it to 100; keep the first 100 per sort.
- Allowed `device` values and a `country` option make a phone-vs-PC comparison possible (`low_end_phone`).
- `fetchGameDetails`: add the six fields in 3.3 to the output object.
- New helper `fetchBadgeStats(universeId)` (3.7), `fetchRolimonsList()` (3.12, cache 10 min on disk), `fetchSimilar(universeId)` (3.10), `searchGames(query)` (3.6, 4 req/s), `fetchMonetization(universeId)` (3.8, 3.9).
- Concurrency: keep requests sequential with 250 to 350 ms spacing; budgets: explore-api 120/min, games 300/min, badges 100/min, omni-search 4/s.
- Cache policy: Roblox charts refresh minutes-scale; Rolimons 10 min; badge stats daily.

## 8. Sources

Roblox live APIs (called 2026-10-24):
- https://apis.roblox.com/explore-api/v1/get-sorts and https://apis.roblox.com/explore-api/v1/get-sort-content
- https://games.roblox.com/v1/games, /v1/games/votes, /v1/games/{id}/favorites/count, /v1/games/{id}/media, /v1/games/recommendations/game/{id}, /v1/games/{placeId}/servers/Public, /v2/users/{id}/games, /v2/groups/{id}/gamesV2
- https://apis.roblox.com/search-api/omni-search
- https://badges.roblox.com/v1/universes/{id}/badges
- https://apis.roblox.com/game-passes/v1/universes/{id}/game-passes
- https://apis.roblox.com/developer-products/v2/universes/{id}/developerproducts
- https://apis.roblox.com/universes/v1/places/{placeId}/universe and https://develop.roblox.com/v1/universes/multiget
- https://thumbnails.roblox.com/v1/games/icons, https://groups.roblox.com/v1/groups/{id}, https://friends.roblox.com/v1/users/{id}/followers/count, https://catalog.roblox.com/v1/search/items
- https://api.rolimons.com/games/v1/gamelist

Docs and reports:
- Roblox Creator Hub, Analytics: https://create.roblox.com/docs/production/analytics
- Roblox Creator Hub, Retention: https://create.roblox.com/docs/production/analytics/retention
- Roblox Creator Hub, Discovery: https://create.roblox.com/docs/production/promotion/discovery
- Roblox Creator Hub, Analytics essentials: https://create.roblox.com/docs/production/game-design/analytics-essentials
- GameAnalytics / Investgame, 2025 Roblox Benchmark Report: https://investgame.net/news/pdf/the-2025-roblox-benchmark-report/ and https://www.gameanalytics.com/reports/2025-roblox-report
- GameAnalytics 2023 Roblox report summary (4.2% spenders): https://investgame.net/news/pdf/2023-roblox-report-behind-the-data-with-gameanalytics/
- Rowatcher genre retention (unsourced, not used for targets): https://rowatcher.com/news/retention-benchmarks-by-roblox-genre-what-good-actually-looks-like
- Profitable.app revenue calculator (assumption only): https://profitable.app/tools/roblox-revenue-calculator
- Roblox Q2 2026 filings (DAU 123M): https://www.sec.gov/Archives/edgar/data/0001315098/000162828026051059/ex991-robloxq22026earnin.htm

Not reached: obby.fun analytics guide (HTTP 429), Bloxbiz / Gamefam reports (no free endpoint found), RoMonitor and RoProxy (no usable API).

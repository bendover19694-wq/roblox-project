# Co-op plan: Run a Space Agency (v1, 2026-10-17)

The owner asked for co-op. Today, Run a Space Agency is a single-player idle loop that runs in a shared server. This plan turns that shared server into a reason to play together, one shippable slice at a time. Each slice stands on its own. The order is cheapest and highest-value first.

## Why co-op matters here (evidence)
- Discovery rewards co-play days and 28-day retention (`research/monetization-policy.md`, `research/market-snapshot.md`).
- Durable top games combine social play with a persistent meta layer: 99 Nights, MM2, RIVALS, DTI (`research/competitive-patterns.md`).
- The 16+ launch gate needs 250 to 500 engaged players. Friend groups are the cheapest way to get there.
- Management and idle games rarely do co-op well, so it is also a way to stand apart from *Run an airline*, which is solo.

## Rules for every slice (from CLAUDE.md)
- The server is authoritative. All contributions come from real, server-computed trips. No player sends a number the server trusts.
- No trading or gifting of cash between players: it invites alt-account farming and breaks the economy.
- No paid randomness. Paid items never speed up another player's progress beyond the existing Server Boost.
- Content stays Mild. Agency names are already filtered by TextService. Co-op adds no new free text (no custom alliance chat; Roblox chat already exists).

## Slice C1: Shared sky (presence) [small]
**Goal:** you can see you're not alone.
- The map shows other players' active missions in this server as thin arcs in their agency colour, with a small marker and their agency name on hover or tap.
- A Mission Control feed shows a 3-line ticker with other players' milestones: "Nova Orbital reached Mars", "Bluebird Aero bought a Condor".
- **Server:** `AgencyService` broadcasts a capped public summary (agency name, colour, up to 8 mission destinations, stage) through a new `Remotes.Sky` RemoteEvent, about once every 2 s and only when it changes. No private data.
- **Client:** `Map.luau` draws the others' arcs under your own, at 35% opacity.
- **Done when:** 2 Studio test clients (Test > Clients and Servers > 2 players) each see the other's arcs and feed lines.

## Slice C2: Server Megaproject [medium, best dopamine]
**Goal:** the whole server builds something huge together.
- Each server runs one megaproject, for example "Build the Lunar Gateway" or "Mars Relay Network". It is a big progress bar at the top of the map.
- Every completed trip by anyone adds 1 point. Rarer destinations count more (`Config/Megaprojects.luau`: target, weights, reward).
- Milestones at 25/50/75/100% fire a server-wide celebration (Juice confetti plus a toast). Everyone who contributed at least 1 trip gets a cash reward that scales with their stage. At 100% the server gets a free 10-minute 2x boost, and contributors earn the project's Mission Patch.
- Then the next project starts, and the target scales with the number of players.
- A contributor list shows the top 5 for the current project (social proof: "you're #2").
- **Server:** a new `Megaproject.luau` service with in-memory per-server state. The reward is granted at completion to players present who contributed. Patch award goes through `Patches`. Pure logic (`shared/Megaproject.luau`: points per trip, milestone crossing, reward per stage) is tested.
- **Truthful:** progress is real and never fake-filled. If the server empties, the project resets with the server, and the UI says "This server's project".
- **Done when:** unit tests pass, and a 2-client Studio test shows both bars moving and both players rewarded at a milestone.

## Slice C3: Crew bonus and invites [small]
**Goal:** bring friends in, and keep them.
- Playing in the same server as a Roblox friend gives +10% trip cash to both, with a "Crew x2" chip on the HUD. It stacks up to +30% with 3 friends. The server checks `Player:IsFriendsWithAsync` on join and caches the result.
- An "Invite crew" button (More panel and the Megaproject card) calls `SocialService:PromptGameInvite`, guarded by `CanSendGameInviteAsync`.
- The first time a friend joins through your invite, both get the Crew patch.
- **Analytics:** `crew_size` on sessions, invites sent, and invite joins. These feed the co-play D7 comparison.
- **Done when:** the bonus is unit-tested in `Economy` (crew multiplier), and with 2 Studio clients marked as friends (mocked in Studio) the chip shows.

## Slice C4: Joint contracts [medium]
**Goal:** a reason to coordinate with one specific person.
- A Joint Contract is a 2-player version of the Daily Contracts: "Together, fly 30 trips to the Moon in 20 minutes". It is offered when 2+ players are in the server.
- One player proposes it from the Contracts card by picking a player in the server. The other accepts with a single-tap prompt (no free text). Both players' trips count toward it. The reward goes to both and is higher than a solo contract.
- The timer is truthful and visible to both. It ends as "completed" or "expired", with no punishment.
- **Server:** a `JointContracts` service holds the pairing, the progress and the deadline (server time), and validates proposer, target and accept. Every request goes through the Act handler with the existing rate limiter.
- **Done when:** pure logic is tested (progress, expiry, rewards), and a 2-client Studio test completes one.

## Slice C5: Alliances (persistent, cross-server) [large, later]
**Goal:** a long-term group identity for 2 to 6 friends.
- Create an alliance (a filtered name, plus a patch made from preset shapes and colours), and invite friends.
- An alliance weekly goal (total trips) and an alliance leaderboard (OrderedDataStore, weekly key).
- Each alliance gets a shared Alliance Station on the map that levels up from members' contributions and gives members a small permanent bonus (capped at +10%).
- **Server:** a DataStore for alliance records (member list, weekly totals), and MessagingService to update members in other servers. Session-lock rules match DataService.
- **Risks:** moderation (alliance names are filtered, and there is no free text beyond the name), and DataStore budgets (batch contributions, write every 60 s).
- **Done when:** a published private test place with 2 accounts shows an alliance surviving a rejoin.

## Order and effort
| Slice | Effort | Why this order |
|---|---|---|
| C1 Shared sky | about 1 session | Presence makes everything after it feel social |
| C2 Megaproject | 1 to 2 sessions | Biggest dopamine; works with strangers |
| C3 Crew bonus and invites | about 1 session | Growth loop; co-play retention signal |
| C4 Joint contracts | 1 to 2 sessions | Deeper coordination |
| C5 Alliances | 3+ sessions | Long-term retention; needs a published place |

## Metrics to watch
- Co-play rate: sessions with 2+ friends in the server.
- D1 and D7 retention for co-play versus solo players.
- Session length when a megaproject is active versus not.
- Invite to join conversion.

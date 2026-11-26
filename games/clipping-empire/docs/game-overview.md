# GT6 Clipping Empire: full game overview

State as of 2026-11-25, branch `claude/confident-yonath-6d7817` (commit 645f134). All numbers come from `src/shared/Config.luau` and `src/shared/Economy.luau`. If they change, this file is out of date. The rarity plan is in `docs/rng-and-loop.md`.

---

## 1. What the game is

**Pitch:** you are a clipper riding the hype for **GT6**, an open-world game about to launch. Tap to record clips of the hype, post them for cash and followers, upgrade your gear, move into bigger creator setups down a neon street, and "Go Viral" (rebirth) for permanent Clout.

- **Genre:** tap-and-upgrade simulator (the classic YouTube/streamer simulator pattern), plus a free gacha-style twist: every clip has a rarity.
- **Hook:** the real-world "clipping economy" (people paid per view to cut clips of streams and trailers), applied to the biggest gaming hype cycle. No Roblox game owned "clipping simulator" when this was researched (see the README research summary).
- **Session shape:** short, tappy and number-goes-up, with a surprise on every tap and a server-wide hype event every 10 minutes.
- **Content rating target:** Mild. No violence, no free-text user content.
- **Name and IP:** the hype game is called `Config.HYPE_GAME = "GT6"`, and changing that one value renames it everywhere. "GTA" and "Grand Theft Auto" are Rockstar/Take-Two trademarks and are never used, nor any logo or art. "GT6" is also a common name for Gran Turismo 6, so thumbnails stay free of any real game's look.
- **Place:** the owner published the game as place 120193855698986. Development uses the local file `place/ClippingEmpire.rbxlx` only.

---

## 2. Core loop

```
 RECORD (tap CLIP / auto)  ->  server rolls the clip's RARITY  ->  clips fill the DRIVE
        ^                                                            |
        |                                                            v
   UPGRADE (cash)  <-  EARN cash + followers  <-  POST (sell the whole drive, viral roll)
        |                                                            |
        v                                                            v
 GO VIRAL (rebirth): reset for +1 Clout        FOLLOWERS open bigger SETUPS down the street
```

1. **Record.** Each counted tap is one *take*. The server rolls the take's rarity, then puts `Tap Power` clips of that rarity on the drive. Clip Speed adds clips by itself: one take per 0.5 s tick, holding `rate x 0.5` clips.
2. **Reveal.** The player sees what they got straight away, with an effect that scales with the rarity (section 4.5).
3. **Drive.** Clips pile up to the Hard Drive capacity. When the drive is full, the bar turns gold, says POST, and the POST button pulses. Tapping on a full drive shows "Drive full! Tap POST".
4. **Post.** Sells every stored clip. Pay is each clip's rarity payout x cash per clip, and the post can go viral for x5.
5. **Earn.** Cash buys upgrades. Followers are never spent: they unlock setups.
6. **Upgrade.** Seven upgrades, covering tap, auto, storage, payout, luck, viral chance and an auto-poster.
7. **Move up the street.** Each new setup multiplies what clips pay. You earn the bonus of the setup you stand in, up to the best one you have unlocked.
8. **Go Viral.** Reset cash, clips and upgrades for +1 Clout: +50% cash and +10% luck forever.
9. **Trailer Drop.** Every 10 minutes, for 90 seconds, the whole server pays x3 and has double luck.

---

## 3. Currencies and stats

| Thing | What it is | Spent? | Kept on rebirth? |
|---|---|---|---|
| **Cash** | Main currency, from posts | Yes: upgrades, rebirth | No (reset to 0) |
| **Clips** | Stored on the drive, tracked per rarity (`drive[tier]`) | Sold on post | No (reset) |
| **Followers** | Earned with each post | Never | Yes |
| **Clout** | Prestige count, +1 per rebirth | Never | Yes |
| **Luck** | Derived stat that raises rare-clip odds | n/a | From Clout: yes. From Lucky Lens: no |
| **Collection** (`found`, `best`) | How many takes of each rarity were ever found, and the rarest | Never | Yes |

### Formulas (Economy.luau)
- **Cash per clip** = `Editing x Setup x TrailerDrop x FollowerBonus x CloutMult`
  - Editing = `1 + 0.25 x level`
  - Setup = x1, x2, x4, x8, x16 (section 6)
  - Trailer Drop = x3 while active
  - Follower bonus = `1 + 0.25 x log10(1 + followers)`. For example, 1M followers gives about x2.5.
  - Clout = `1 + 0.5 x clout`
- **Post cash** = `floor(driveWorth x cashPerClip x viral)`, where `driveWorth = sum(clips of tier x tier payout)` and viral = x5 or x1.
- **Followers per post** = `driveWorth x 0.2 x viral`. Fractions carry over, so ten 1-clip posts earn the same as one 10-clip post.
- **Tap Power** = `1 + level` clips per take
- **Clip Speed** = `0.6 x level` clips per second
- **Capacity** = `floor(25 x 1.35^level)`
- **Viral chance** = `3% + 0.5% x level`
- **Luck** = `(1 + 0.1 x Lucky Lens) x (1 + 0.1 x Clout) x (2 during a Trailer Drop)`
- **Upgrade cost** = `floor(base x growth^level)`
- **Rebirth cost** = `250,000 x 4^rebirths`

---

## 4. RNG: clip rarity (free, server-rolled)

### 4.1 Tiers
| # | Tier | Base odds | Real chance at luck 1 | Pays | Colour | Reveal |
|---|---|---|---|---|---|---|
| 1 | Common | the remainder | 75.1% | x1 | grey-lilac | coloured float |
| 2 | Uncommon | 1 in 5 | 18.8% (1 in 5.3) | x1.5 | green | coloured float |
| 3 | Rare | 1 in 20 | 4.9% (1 in 20) | x3 | blue | big coloured callout with a clip title |
| 4 | Epic | 1 in 100 | 1.0% | x8 | purple | studded banner card |
| 5 | Legendary | 1 in 500 | 0.2% | x25 | gold | full card, spinning rays, "Pays x25 when posted" |
| 6 | Mythic | 1 in 5,000 | 0.02% | x100 | hot pink | full card, plus a server-wide toast: "<name> found a MYTHIC clip!" |

At luck 1, the average take is worth **x1.33** a plain clip.

**Clip titles** (flavour, picked by the client): each tier has 3 or 4 GT6-hype names. For example, Common "Shaky phone clip", Rare "Hidden easter egg", Epic "Dev stream highlight", Legendary "Trailer 3 first look", Mythic "The release date reveal". They live in `Config.RARITIES[i].titles`.

### 4.2 How the roll works
`Economy.odds(luck)`: going from Mythic down, tier *i* takes `min(1, luck / oneIn_i)` of the probability that is left. Common gets whatever remains. Properties:
- The odds always sum to exactly 1.
- Luck only moves weight toward rarer tiers.
- At luck 1, the top tier is exactly "1 in N".

`Economy.rollTier(luck, u)` maps a uniform roll `u` in [0, 1) to a tier, rarest first. The server's `Random` makes `u`. The client never sends a tier, a roll or a luck value.

### 4.3 Luck: what moves the odds
| Source | Effect | Range |
|---|---|---|
| Lucky Lens upgrade | +10% per level | x1 to x5 (40 levels) |
| Clout | +10% per Clout, forever | x1.1 at 1 Clout, x2 at 10 |
| Trailer Drop | x2 while it runs | 90 s in every 10 min |

Odds and average payout at different luck levels:

| Luck | Common | Uncommon | Rare | Epic | Legendary | Mythic | Avg payout |
|---|---|---|---|---|---|---|---|
| x1 | 75% | 1 in 5.3 | 1 in 20 | 1 in 100 | 1 in 500 | 1 in 5,000 | x1.33 |
| x2 | 53% | 1 in 2.8 | 1 in 10 | 1 in 50 | 1 in 250 | 1 in 2,500 | x1.65 |
| x5 | 0% | 70% | 1 in 4.3 | 1 in 20 | 1 in 100 | 1 in 1,000 | x2.51 |
| x10 | 0% | 44% | 44% | 1 in 10 | 1 in 50 | 1 in 500 | x3.46 |
| x20 | 0% | 0% | 76% | 1 in 5.2 | 1 in 25 | 1 in 250 | x5.22 |

x20 is the realistic maximum: maxed Lens (x5), 10 Clout (x2) and a Trailer Drop (x2).

### 4.4 Roll volume and caps
- Taps: up to 20 per batch, a server budget of 12 taps per second, and one roll per counted tap. So at most about 12 rolls a second per player from tapping.
- Auto: one roll per 0.5 s tick.
- One reveal per batch: the rarest tier in that batch. Tap batches reveal Uncommon and up. Auto ticks reveal Rare and up, so idle play stays calm. A tier found for the first time always reveals, with a **NEW!** tag.

### 4.5 Reveal ladder (Hud.luau, `api.reveal`)
- **Float** (Common, Uncommon): coloured "+UNCOMMON CLIP", rising and fading.
- **Callout** (Rare): bigger coloured float with the clip title.
- **Banner** (Epic): a 400 x 104 sticker card with the tier colour, ink outline, stud texture and a hard shadow, for 1.8 s.
- **Card** (Legendary, Mythic): a 440 x 170 card with light rays spinning behind it, the title, "Pays xN when posted", a pop-in animation and a tilted NEW! tag, for 2.6 s.
- If a menu is open, the banner and card become a toast that waits until the menu closes. Nothing covers an open menu.
- Reduced Motion: no pop-in and no spinning rays. The text and colours stay.

### 4.6 Collection: the Clip Index
The **INDEX** launcher (lime star) opens the Clip Index:
- your current luck (with "(Trailer Drop x2!)" during a drop)
- for each tier: a studded colour swatch, the name, live odds at your luck ("1 in N", or "% of takes" for Common), the payout, and "Found N"
- tiers you haven't found show as a black swatch named **???**, but their odds and payout are always shown, so there are no hidden odds

The long-term goal past the zones is to find a Mythic.

### 4.7 Second RNG layer: viral posts
Each post rolls once: with probability `3% + 0.5% x Viral Hooks level` (maximum 16%), the whole post pays **x5** cash and x5 followers.

### 4.8 RNG rules (hard)
- **Free RNG only.** No paid random items, no paid luck, no paid odds, ever.
- The server rolls everything. The odds shown are the odds rolled.
- Pacing tests use a seeded generator (Park-Miller), so results repeat run to run.

---

## 5. Upgrades

All bought with cash, one level per click. All except Auto Poster reset on rebirth.

| Order | Upgrade | Gives | Base | Growth | Max | Cost at L10 | Cost at L25 | Last level | At max |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Tap Power | +1 clip per take | $10 | 1.30 | 60 | $106 | $5.4K | $52.8M | 61 per take |
| 2 | Clip Speed | +0.6 auto clips/s | $25 | 1.32 | 60 | $304 | $19.6K | $325M | 36 per second |
| 3 | Hard Drive | capacity x1.35 per level | $40 | 1.38 | 50 | $726 | $91K | $286M | 82.2M clips |
| 4 | Editing Skill | +0.25x cash per clip | $60 | 1.42 | 50 | $1.4K | $271K | $1.74B | x13.5 |
| 5 | **Lucky Lens** (new) | +10% luck | $200 | 1.50 | 40 | $7.7K | $3.4M | $1.47B | x5 luck |
| 6 | Viral Hooks | +0.5% viral chance | $150 | 1.60 | 26 | $10.3K | $11.9M | $19M | 16% |
| 7 | Auto Poster | posts when the drive is full | $2,500 | one-off | 1 | n/a | n/a | $2,500 | on, kept on rebirth |

In the Upgrades panel, each card shows the name, "blurb: current effect", the level as "LV x / max", and a button reading BUY $cost (green), NEED $cost (dark and locked: the word NEED is there, so it never relies on colour alone) or MAXED.

An "!" badge appears on the Upgrades launcher when something is affordable, but never during the tutorial.

---

## 6. Setups (zones) down the street

| # | Setup | Followers needed | Clips pay | Colour |
|---|---|---|---|---|
| 1 | Bedroom Setup | 0 | x1 | pink |
| 2 | Gamer Cafe | 300 | x2 | cyan |
| 3 | Clip Studio | 5,000 | x4 | green |
| 4 | Hype Plaza | 60,000 | x8 | gold |
| 5 | Trailer Tower | 600,000 | x16 | violet |

- The street runs along X. Each zone is 90 studs wide and 70 deep, and zone 1 starts at X = 0.
- The server works out your zone from your character's position, limited to your highest unlocked zone.
- Locked gates are solid and lit for you only, through client-side walls. Even if a client removes its wall, the server still pays only the unlocked rate.
- Opening a new setup triggers a big toast, "Gamer Cafe open! Clips pay x2", and the `zone_2` funnel step.
- Once the tutorial is done, the objective bar shows "Next setup: 120 / 300 followers".

---

## 7. Rebirth: "Go Viral"

- **Cost:** $250K, then $1M, $4M, $16M, $64M, $256M and so on (x4 each time).
- **Resets:** cash, clips and the drive, and every upgrade except Auto Poster.
- **Keeps:** followers (so unlocked setups stay open), Auto Poster, the Clip Index collection and settings.
- **Gives:** +1 Clout: +50% cash per clip and +10% luck, forever.
- **UX:** the panel compares Clout now with Clout next (for example x1 to x1.5) and shows a progress bar of cash against the cost. The button reads NEED CASH or GO VIRAL. Pressing it once changes it to TAP TO CONFIRM (red) for 3 seconds, because a reset always asks twice.
- After a rebirth there's a "YOU WENT VIRAL! Clout N" celebration and an immediate save checkpoint.

---

## 8. Trailer Drop (server-wide live event)

- A fixed clock: `os.time() % 600`. The first 90 seconds of every 10 minutes are a drop. Every server and every player agrees, and the countdown is always true: it never restarts or fakes urgency.
- During a drop, clips pay x3 cash and luck doubles, so it is the best time to tap.
- Banner: "Next trailer drop in 7m 12s", or during a drop "TRAILER DROP! x3 cash: 1m 04s left" in gold.
- A toast goes to everyone when a drop starts.

---

## 9. Pacing (measured by `tests/Pacing.spec.luau`)

The test is a bot that taps 5 times a second, posts when the drive is full, always buys the cheapest upgrade and never goes viral (a floor), with seeded rarity rolls.

| Milestone | Now (with rarity) | Before rarity | Guard in the test |
|---|---|---|---|
| Gamer Cafe (zone 2) | 40 s | 50 s | at most 10 min |
| Clip Studio (zone 3) | 2.8 min | 3.9 min | at most 30 min |
| Hype Plaza (zone 4) | about 15 min | about 23 min | none |
| First rebirth affordable | about 15 min | about 23 min | at most 60 min |

Rarity made progress about 35% faster. Raising the zone 3 to 5 thresholds and the rebirth cost barely moved the bot's times, because growth is steep at that point. If the goal is about 20 minutes to the first rebirth, retune the drive and upgrade curves rather than the thresholds.

---

## 10. First session and onboarding

The tutorial has three steps. Each is one verb, one target and a pulsing gold glow around the target button, and the wording follows the input in use:

| Step | Touch | PC | Gamepad | Ends when |
|---|---|---|---|---|
| 1 | Tap CLIP to record clips | Click CLIP or press E | Press R2 to record clips | 10 clips stored, or you have cash and clips |
| 2 | Tap POST to sell clips | Click POST or press Q | Press X to sell clips | you can afford Tap Power |
| 3 | Buy Tap Power in Upgrades | same | same | Tap Power is level 1 or more |

- Then: the toast "Nice! Followers open new setups", and the objective switches to the next-setup follower goal.
- **Measured in Studio:** first tap at 10 s, first post at about 17 s, first upgrade at about 25 s. That is under the 20 s first-action and 60 s first-reward targets.
- Skip Tutorial is in Settings and hides once the tutorial is done.
- The first rarity reveal teaches itself: the card says "Pays xN when posted".
- No shop, no badges and no offers during the tutorial.
- **Funnel events** (`AnalyticsService:LogOnboardingFunnelStepEvent`): 1 joined, 2 first_tap, 3 first_post, 4 first_upgrade, 5 zone_2, 6 first_rebirth, 7 tutorial_skipped. Steps 2 to 4 fire only while the tutorial runs, so returning players don't re-fire them.

---

## 11. UI and HUD

The HUD is built in a 1000 x 560 design space and scaled by one UIScale: `clamp(min(w/1000, h/560), 0.5, 1.1)`. Text is at least 21 design px, which is 12 px or more on the smallest phone (iPhone 14 HUD at scale 0.59).

- **Top:** three stat pills (CASH, FOLLOWERS, CLOUT with its multiplier), the Trailer Drop banner, and the current setup line ("Bedroom Setup: clips pay x1").
- **Left rail:** four image launchers on Vice-sunset vector plates, leaning 8 degrees, each with a live label:
  - UPGRADES (orange, up arrow)
  - GO VIRAL (violet, flame)
  - INDEX (lime, star)
  - SETTINGS (night, gear)
- **Bottom:** the objective pill, the drive bar ("CLIPS 40 / 80   3 RARE+", or "DRIVE FULL ... POST!" in gold), the big CLIP (pink) and POST (teal) buttons, and an info line: `+2/tap  0.6/s  $1.15/clip  3% viral  x1.0 luck`.
- **Feedback:** coloured "+N clip" floats on every tap (predicted on the client, corrected by the server), green "+$cash +followers" floats on post, a gold "VIRAL! x5" float, rarity reveals, and toasts (two at a time, queued while a menu is open).
- **Menus:** Upgrades, Go Viral, Clip Index and Settings, built with the LihFolk UI kit "Ink and Candy" (vendored in `vendor/LihFolkUI`, CC BY 4.0, credit "LihFolk Vault V2"). The kit handles fitting, the 44 px touch floor, open and close motion, one menu at a time, gamepad focus and B to close. While a menu is open, the action bar and rail hide.
- **Settings:** Reduced Motion, Sound Effects, Skip Tutorial, a save status line ("Progress saves automatically." or "Saving is off here (test server)."), and a key hint shown only on keyboard or gamepad.
- **Art:** button plates come from `scripts/buttons/make_buttons.py` (SVG rendered by headless Chrome). Stat icons are Antigravity art (Agent HQ task t_be0c31c715f5) cut by `scripts/cut_magenta.py`. All ids are in `src/client/Art.luau`. The reveal cards follow Folk Stud UI construction rules (burning colours, ink outlines, stud texture 3014551673, light rays 101267161684975). No Folk Stud or Stud UI kit code is in the repo, because those packs are personal-use only.

---

## 12. Map and world

`src/server/World.luau` builds the map at server start:
- a neon street of five setups along X, each with a desk, neon trim, a sign and a tier colour
- gates between setups, each with a lock billboard, solid only for players who haven't unlocked them
- a skyline with neon posters, palms and lamps along both kerbs, a spawn pad and a night lighting preset

Free Creator Store props from verified creators are saved in the place under `ServerStorage.Props`. All their scripts were removed. If Props is missing, the map falls back to part-built chairs and lamps.

| Prop | Asset | Creator | Use |
|---|---|---|---|
| Chair2 "gaming chair" | 9435226454 | Equinexes | one per setup |
| Lamp2 "Street Lamp" | 14212653287 | 9bsts | along both kerbs |
| StreamerSetup | 9543104349 | Ssundee27w | desk, green screen and cameras in each zone |
| Tower1, Tower2 "Miami Building 6 / 15" | 89419318, 89419742 | ag4Official | every 4th skyline slot |
| Car_red, Car_blue, Car_white (from "Sports Car") | 6433323089 | Roblox | one parked per zone |

The whole street has about 4,787 parts, measured in Play.

---

## 13. Saving and data

- DataStore `ClipEmpire_v1`, key `Player_<UserId>` (matches the RTBF deletion template).
- **Profile v2:** cash, clips, drive[6], followers, clout, rebirths, totalClips, totalPosts, levels{7}, found[6], best, tutorialDone, settings{reducedMotion, sound}.
- **Session lock** inside the record through `UpdateAsync`, with a 180 s TTL refreshed by autosave every 60 s. Loading retries 5 times. `BindToClose` waits for running saves.
- **Migration** (`Economy.migrate`): repairs NaN, infinite, negative and wrong-type values, clamps levels to their max, clamps clips to capacity, turns v1 clips into Common, and resets a drive that doesn't sum to `clips`. Unknown tiers in `found` are zeroed, and `best` is clamped.
- **Outage mode:** if loading fails, the player still plays on a stand-in profile, and Settings says saving is off. A late successful load replaces it with the toast "Your save loaded. Welcome back!".
- Saving only works in a published place. The local Studio file has no DataStore access.

---

## 14. Server authority and security

- The server owns every number: cash, clips, followers, rarity rolls, viral rolls, zone, upgrades and rebirth. The client only asks and renders.
- **Remotes** (`Remotes.luau`):
  - Server to client: `State(view)`, `Toast(text, kind)`, `Celebrate(kind, data)`. The kinds are post, zone, rebirth and clip.
  - Client to server: `Tap(count)`, a RemoteEvent. `count` must be a whole number from 1 to 20. It is limited to 4 batches a second (burst 6), and a 12-taps-per-second budget drops anything above it.
  - Client to server: `Act(action, arg)`, a RemoteFunction limited to 6 a second (burst 10). `action` is checked with `Net.isEnum` against post, buy, rebirth, setting and tutorialDone, and `buy` and `setting` args are checked with `Net.isEnum` too. Handlers run in `pcall`, so a bad request returns "Something went wrong" and never crashes the server.
- Rate-limit buckets are cleared when a player leaves.
- The client checks a `clip` reveal's tier against `Config.RARITIES` before showing it.
- No purchases exist yet, so there is no ProcessReceipt.

---

## 15. Monetization

**Current state: none.** No passes, no products, no shop.

Rules that any future monetization must follow (owner hard rules):
- No paid random items, no paid luck or odds, no paid viral chance, no selling cash or clips, no paid power that beats free players in a contest.
- One `ProcessReceipt`, idempotent by receipt key. Grant, then save, then return `PurchaseGranted`. Never grant on `PromptProductPurchaseFinished`.
- Neutral shop copy. The shop never auto-opens, and no offers appear before the tutorial ends.
- Timers are always true.

Planned options from the README, with notes:

| Idea | Type | Note |
|---|---|---|
| 2x Cash pass | GamePass | Fine. A cash multiplier, not luck. Stacks with Clout |
| Auto Poster pass | GamePass | Conflicts with the $2,500 in-game upgrade. Either drop the upgrade, or sell something different (for example "post at 80% full") |
| Cosmetic shop (chairs, desks, setup skins, neon colours) | Products/passes | Safe and fits the setups. Purely visual |
| Extra drive skins or a clip-reveal effect skin | Cosmetic | Fits the rarity system without touching odds |
| Private server | Roblox built-in | Zero risk |

Not allowed: "luck potion", "x2 luck pass", "Mythic guarantee", or any paid reroll.

---

## 16. Audio and accessibility

- **Sound:** built-in Roblox client sounds only for now (`volume_slider.ogg` at two pitches for click and cash, `action_get_up.mp3` for big moments). No music yet. Sound can be turned off.
- **Reduced Motion:** cuts button bounces, the tutorial glow pulse, reveal pop-ins and spinning rays. State is never shown by motion alone.
- **Colour:** locked buttons say NEED and use a darker slab. Rarity is always written out, not shown by colour alone.
- **Input:** touch, mouse, keyboard (E clip, Q post) and gamepad (R2 clip, X post, B closes menus, kit gamepad focus).
- **Phone:** the rail sits clear of the thumbstick. Menus hide the HUD while open, and tap targets are 44 px or more.

---

## 17. Code map, tests and tools

| Path | Role |
|---|---|
| `src/shared/Config.luau` | all tuning: upgrades, zones, rarities, luck, hype, rebirth |
| `src/shared/Economy.luau` | pure math: profile, migrate, costs, stats, odds, rollTier, take, post, buy, rebirth |
| `src/shared/Net.luau` | remote validators and token-bucket rate limiter |
| `src/shared/Format.luau` | number and time formatting (always rounds down) |
| `src/shared/Remotes.luau` | remote list |
| `src/server/Services/GameService.luau` | authoritative loop: taps, rolls, auto tick, posts, zones, Trailer Drop, funnel |
| `src/server/Services/DataService.luau` | saves, session lock, outage mode |
| `src/server/World.luau` | builds the street |
| `src/client/Main.client.luau` | state, tap batching (every 0.4 s), input, tutorial, gates, celebrations |
| `src/client/Hud.luau` | HUD, toasts, floats, rarity reveal, tutorial pointer |
| `src/client/Panels.luau` | Upgrades, Go Viral, Clip Index and Settings windows |
| `src/client/Kit.luau`, `Art.luau` | small UI helpers, sounds and art ids |
| `vendor/LihFolkUI` | LihFolk UI kit (CC BY 4.0) |

- **Tests:** `lune run tests/run`, 30 passing: Economy, Format, Net, Pacing and Rarity.
- **Checks:** `stylua src tests`, `selene src`, and `luau-lsp analyze --ignore "vendor/**"` (src is clean).
- **Studio:** `scripts/sync_studio.py <id>` pushes the code into the open place. `scripts/probes/ftue.py <id> pc|phone` plays the first session, opens every menu, forces Epic and Mythic reveals, and saves screenshots to `captures/`.

---

## 18. Known issues and open questions

1. **High luck wipes out low tiers.** At luck x5 (maxed Lens alone), Common is 0%. At x20, Uncommon is 0% too. That's mathematically sound but may feel odd, and it inflates the average payout to x5. Options: apply luck only to Rare and up, or use `luck^0.5` for the low tiers.
2. **The Mythic card's light rays didn't show** in the PC capture. Check that asset 101267161684975 loads (assetaudit) and its ZIndex.
3. **The reveal card covers the setup line** under the top pills. Consider moving the card higher or shrinking it.
4. **Pacing is about 35% faster** since rarity was added. Decide whether about 15 minutes to the first rebirth is the target.
5. The phone layout for the new INDEX launcher and the Clip Index hasn't been checked on an iPhone 14 simulator yet.
6. Settings and Go Viral headers still use the kit's drawn letter icons.
7. The console shows `rbxassetid://203785492` failing to load. It is not in this game's code; it looks like Studio's own or the test avatar's.
8. luau-lsp reports about 100 strict-mode errors inside the vendored kit (upstream code, ignored by the check).

## 19. Not built yet (backlog ideas)

- **Onboarding:** a 4th beat after the tutorial: "Open Index to see your odds".
- **Retention:** daily reward (free, fixed, never random-paid), a playtime gift, quests ("Find 3 Epic clips", "Post 50 times"), achievements tied to the Clip Index.
- **Social:** global leaderboards (followers, Clout, best clip), a friend boost, Mythic announcements (already done).
- **RNG extras:** a pity counter (guaranteed Rare after N takes without one), clip "editions" or shiny variants, rarity-tiered posters that appear on your setup.
- **Map:** the planned pass through the world.md pipeline (style, references, a 4ghouls prompt, Blender map builder). The setups could become more distinct landmarks.
- **Audio:** music and a rarity-tiered reveal sound ladder.
- **Monetization:** the compliant options in section 15, once the owner chooses.

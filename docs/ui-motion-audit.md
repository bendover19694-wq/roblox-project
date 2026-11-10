# UI/UX and audio-visual direction — Fogbell Harbor

The competitor audit and evidence live in `../research/ui-motion-audit.md`. This file applies the generic standard from §6 of that audit to our game. Every layout here is original.

## 1. Component inventory
| Component | Type | Notes |
|---|---|---|
| **Rules Board** | Diegetic (SurfaceGui on a pier signboard) plus a HUD mini-copy | Icon cards (shape plus colour). New rules slide in. The mini-copy sits under the objective line so it's readable from anywhere |
| **Gate Lever / Fog Bell** | Diegetic plus ProximityPrompt (hold 1 s) | Large prompt targets. Undo is allowed until the last buoy (the lever glows amber while undo is possible) |
| **Last buoy light** | Diegetic | Turns red when a ship passes the point of no return |
| **Harbor Integrity** | Diegetic (lighthouse lamp brightness and a pier gauge) plus a small HUD meter | Shared "health" |
| **State banner** | HUD, top centre | The single channel for state messages. Queued, maximum 2 lines |
| **Objective line** | HUD, top left | One sentence: "Tide 2 · Check 3 more ships" |
| **Top-right buttons** | HUD | Menu · Logbook · Shop. No more than these three |
| **Identity strip** | HUD, bottom left | Rank title, Coins, an XP sliver |
| **Action slot** | HUD, bottom centre | The tool in hand (Spyglass / Net / Trumpet / Lamp). One slot, plus a swap button |
| **Ping wheel** | HUD radial menu (hold G / LB / long-press) | 5 preset pings. Each ping shows in the world for 4 s |
| **Spyglass view** | Overlay | A vignette with zoom. The part names appear as icons when you look at them (accessibility) |
| **Tide-break pads** | Diegetic | 3 pads with hologram icons and a vote count |
| **Harbor Log** | Modal (clipboard) | The dawn report. Skippable. Shows "Next: Rank X / Logbook gaps / daily bounties" |
| **Keeper's Cabin** | A diegetic room | Cosmetics wall, Logbook shelf, mirror (equip), and a shop terminal |
| **Logbook** | Modal | A grid of stamps with silhouettes for unseen entries |
| **Shop** | Modal | Tabs: Outfits · Lanterns · Extras · Coin Market. Prices are fetched on the client |
| **Settings** | Modal (inside Menu) | Reduced motion, colourblind patterns (always on) and strength, music/SFX volume, ping sounds, camera shake toggle |
| **Contextual tip** | Toast above the action slot | One at a time. Dismissed automatically after 6 s. Never blocks input |
| **Reconnect / error** | Blocking overlay | Shows retry status, then a "Rejoin" button |
| **Admin / debug** | A separate ScreenGui | Created only for allow-listed admins. Never cloned into player GUIs |

## 2. Screen-state table
| State | Enter | Exit | Input lock | Layer | Motion / sound | Data dependencies | Loading / error | Mobile / controller |
|---|---|---|---|---|---|---|---|---|
| Intro (A/B) | First join, variant B | 8 s, or skip | Movement locked; a skip button is shown | Overlay | Camera glide, title fade, soft swell | — | Skip if assets are slow (> 3 s) | Tap or A to skip |
| Play | Default | Any modal or the report | None | HUD | — | Profile loaded (with a fallback) | Profile not loaded: play continues, saving is blocked, and the banner says so | Safe-area aware; thumb zone kept clear |
| Spyglass | Equip and aim / right-click / LT | Release | Movement slowed | Overlay | Zoom 120 ms | — | — | LT aims; on touch, a hold button |
| Tide break | Tide ends | 20 s, or all players have voted | None | HUD and world | Banner and a pad glow | Supplies | — | Walk onto a pad |
| Harbor Log | Dawn | Skip, or after 10 s | Movement locked; skip available | Modal | Lines tick in at 120 ms each | Night stats, payout | If the payout fails to save: retry, plus the banner "Saving…" | A / tap skips |
| Menu / Logbook / Shop / Settings | Button | Back / B / Esc / ✕ | UI focus only | Modal | Panel 180 ms | Profile, product info | Shop: "Prices unavailable, try again" | `SelectedObject` set on open |
| Celebration | First mimic, rank-up, Logbook milestone | 600–900 ms, interruptible after 300 ms | None | Celebration | Vignette, burst, fanfare | — | — | — |
| Reconnecting | Connection lost | Restored, or timeout | All | Top | Spinner | — | After 30 s, show "Rejoin" | — |

## 3. Design tokens (v0)
- **Typography:** Builder Sans (Roblox built-in). Bold for headings. Sizes are 14 / 18 / 24 / 32 / 48 px at a 1080p reference, scaled with `UIScale`. Body text is never below 18.
- **Spacing:** a 4-based scale (4, 8, 12, 16, 24, 32, 48).
- **Corner radius:** 8 (chips), 12 (panels), 999 (pills).
- **Colour roles** (dark-on-fog palette):
  - Ink `#0F1B2A` (panels, 90% opacity)
  - Paper `#F3EBDD` (Harbor Log and notes)
  - Brass `#C9A54A` (primary actions and the rank)
  - Sea `#2E6F8E` (info)
  - Signal Green `#3FB37F` (correct)
  - Signal Red `#E0533D` (alarm or wrong)
  - Fog `#B8C4CC` (secondary text)
  - Each must reach contrast of at least 4.5:1 on its background.
- **Rule and part identity is never colour alone:** every flag colour pairs with a pattern (stripe, dot, cross), and every rule card pairs an icon shape with its colour. The colourblind pattern overlay is on by default.
- **Icon style:** thick-outline flat glyphs with a 2 px stroke, one colour each, readable at 32 px.
- **Localization ready:** no text baked into images. All strings go through a string table, with layouts that allow +40% text length.

## 4. Motion system (6 patterns, native TweenService)
| Pattern | Used for | Spec | Reduced motion |
|---|---|---|---|
| Banner | State channel | Slide 24 px + fade, 200 ms Quad Out; hold 1.5–2.5 s; out 150 ms | Fade only |
| Pop | New rule card, ping marker | Scale 0 → 1.15 → 1, 300 ms Back Out | Fade 150 ms |
| Tick | Coins, XP, crate count | Count-up and icon pulse 1 → 1.1 → 1, 120 ms. Rate-limited to 4 per second | Number only |
| Panel | Modals | Slide 24 px + fade, 180 ms in / 140 ms out | Fade only |
| Celebrate | First mimic, rank-up, milestone | Vignette, item spin, particle burst, FOV +6°; 600–900 ms; interruptible after 300 ms | Fade card, no FOV change |
| Alarm | Mimic docked, integrity hit | Camera shake (amplitude 0.3, 250 ms), lamp flicker, stinger sound | Lamp flicker only |

**Rules:**
- Nothing on the HUD loops or idles.
- Particles are capped at 2 active emitters per celebration.
- All tweens are cancelled when their GUI is destroyed.
- Each kind of motion has its own home:
  - **World feedback:** mimic reveal, rampage, splashes
  - **Character animation:** wave, carry, ragdoll on bounce
  - **Camera feedback:** spyglass zoom, alarm shake
  - **UI motion:** the table above

## 5. Audio-visual brief
- **Art style:** chunky low-poly harbor at dusk and night, in a limited palette. Ships are **built from primitives** (hull, sail, flag, figurehead, lantern) so they compose procedurally. Fog density hides distance detail and caps the art burden.
- **Mimic:** one jelly-blob mesh (or a sphere-based soft body) with googly eyes. It wobbles using physics and tween squash, so it needs no rigged animation.
- **Characters:** default Roblox avatars plus a keeper outfit. Animations: built-in avatar animations, plus 3 custom ones (carry, bell ring, net swing) made in the Animation Editor.
- **VFX:** water splashes, lantern glow, the mimic "blorp" reveal, fireworks.
- **Sound:**
  - Creator Store audio that is Roblox-licensed or uploaded by us, with the licence checked for each asset
  - fog bell, harbor ambience, gulls, ship horns (an original synthesized set), mimic "blorp", and a calm accordion and sea-shanty-lite music loop
- **Map:** one harbor. It has:
  - lighthouse, pier, gate channel, warehouse, Keeper's Cabin
  - 2 ladders out of the water
  - the last-buoy line
  - the sea fading into fog

## 6. Assets and licences
| Asset | Vertical-slice source | Final source | Licence check |
|---|---|---|---|
| Ship parts | Primitives built in code (Claude) | Primitives plus a few owner-made meshes | Ours |
| Harbor map | Greybox parts | Owner build or a commissioned builder, following a style guide written first | Ours or contract |
| Mimic blob | A sphere with squash tweens | A custom mesh | Ours |
| Icons | Unicode and simple vector placeholders | Commissioned or owner-made SVG-style decals | Ours |
| Sound | Placeholder clips from the Roblox-licensed Creator Store | The same library, plus an original horn set | Check each asset's licence and creator |
| Music | None in the slice | A licensed track or a commission | Contract |
| Thumbnail and icon | Studio screenshot plus an overlay | Commissioned key art | Contract; the work must be our own |

**Placeholders allowed in the vertical slice:**
- Every visual except the ship parts and the Rules Board icons, because readability is the thesis being tested.

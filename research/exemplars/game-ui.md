# Game UI exemplars for Run a Space Agency

Reference for UI agents. Extends `research/ui-motion-audit.md` (zones, state machine, motion patterns) and `.claude/skills/roblox-concept-art-ui/SKILL.md` (concept-to-Luau flow); it does not repeat them. Builds on `src/client/UI/Theme.luau` tokens (ink/navy/cyan/orange, BuilderSans + BuilderExtended + BuilderMono, radius card 18 / button 14 / chip 10) and the 8 Motion patterns (enter, exit, pop, press, countUp, flyTo, pulse, shake).

**Evidence tags:** `[SRC]` = fetched or searched this session (URLs in section 8). `[MEM]` = my recollection of a game or genre, not verified this session; treat as a hypothesis and confirm with a playtest. `[INF]` = my inference or proposal. Per-game layouts are mostly `[MEM]` because the search tools returned almost no per-game UI write-ups (tried Grow a Garden, Pet Simulator 99, Egg Inc / AdVenture Capitalist / Idle Miner, Game UI Database, Interface In Game). Do not cite them as observed. Several Creator Hub pages 404ed on direct fetch, so some platform facts come from search excerpts; re-check the live page before relying on exact wording.

---

## 1. TL;DR: 15 rules

1. **One state channel.** A top-centre banner/toast queue carries transient news; no competing popups; one modal at a time. [SRC creation.dev + audit]
2. **Numbers are the hero.** Currency, rate and the next-action button are the largest, highest-contrast text on screen. [MEM genre]
3. **Phone first.** Third-party reports put mobile at roughly 70-80% of Roblox users (Roblox's own letters did not show a split). Design phone, then widen. Close button top-right of every modal, same corner always. [SRC secondary]
4. **Touch targets 44x44 px minimum, 48 preferred**, 8 px gaps. Roblox docs give no number; 44 (Apple) and 48dp (Android) are the working standards. [SRC secondary]
5. **Text floors on the ~1000x520 compact canvas:** body 16, captions 14, absolute floor 12 (badges only), key numbers 24+. Respect `GuiService.PreferredTextSize`; TextScaled text does not follow it, AutomaticSize does. [SRC accessibility + INF]
6. **`ScreenInsets = CoreUISafeInsets` (default) for anything interactive**; DeviceSafeInsets only for deliberately full-bleed art. Never hard-code a top-bar height. [SRC]
7. **Scale for layout, Offset for strokes/radii/icons**; always add `UISizeConstraint` and `UITextSizeConstraint` so 4K TVs and tiny phones stay sane. [SRC cross-platform]
8. **Three-level hierarchy per screen:** one hero, one primary button, the rest muted. Two equal saturated buttons means one is wrong. [INF]
9. **State is colour AND shape coded:** green ready/claim, orange primary/buy, cyan info/selected, red blocked/danger, grey locked; always add an icon or word (5%+ of people are colour blind). [SRC accessibility]
10. **Juice scales with rarity:** routine 0.1-0.2 s, milestone 0.3-0.5 s, first/rare at most 0.9 s and skippable after 0.3 s. Everything collapses to a fade under `GuiService.ReducedMotionEnabled`. [SRC + audit]
11. **Tween, don't poll.** TweenService for one-shots; one shared Heartbeat loop for countdowns/bars; never one connection per element. [INF]
12. **Instance budget:** pool list rows, reuse card templates, avoid CanvasGroup unless clipping rotated/rounded content, split HUD and modals into separate ScreenGuis. [SRC DevForum anecdotal]
13. **Gamepad parity:** every modal sets a default selection (`GuiService:Select` or `SelectedObject`), has visible focus, shows glyphs from `GetImageForKeyCode`. [SRC]
14. **Honest timers, honest odds.** Countdowns end when they say and never restart. Paid random outcomes require all outcomes and numeric odds before spend; we ship none. [SRC policy + repo rules]
15. **Rate-limit delight.** One celebration at a time, queue the rest into a summary, no looping idle animation on HUD, cap coin-tick sounds (about 8/s). [INF + audit]

---

## 2. Roblox platform UI facts

### 2.1 Safe areas, insets, notches
- `ScreenGui.ScreenInsets` enum: **CoreUISafeInsets** (default) = device safe area plus Roblox core UI (top bar); docs recommend it for any ScreenGui with buttons or status messages. **DeviceSafeInsets** = avoids cutouts only. **TopbarSafeInsets** = just the top-bar strip, dynamic. **None** = ignore all. [SRC ScreenGui docs via search]
- `IgnoreGuiInset = true` is the legacy switch and flips CoreUISafeInsets to DeviceSafeInsets. Prefer the enum. [SRC]
- `SafeAreaCompatibility` controls automatic transforms for "fullscreen" descendant GuiObjects on cutout displays (values `FullscreenExtension` / `None` from memory [MEM]). Keep full-bleed backgrounds as fullscreen children so art extends under the notch while content stays inside insets.
- `GuiService:GetGuiInset()` returns two Vector2 (top-left, bottom-right inset); `GuiService.TopbarInset` is a Rect for sizing beside the top bar. Docs state no fixed top-bar height. **Rule:** read the property, never write 36 or 58 into code. [SRC GuiService docs]
- Our D-013 compact canvas (~1000x520 with `CoreUISafeInsets`) matches this. Verify with `StudioDeviceSimulatorService:SetDeviceAsync("iphone_14")` (repo CLAUDE.md).

### 2.2 Device share
- No clean Roblox-published split surfaced. Third party: Newzoo/Gamefam (Oct 2025) says about 80% of daily users primarily play on mobile; a 2026 blog claims about 80% of sessions mobile / 17% PC / 3% console (unverified); the 2025 Roblox Benchmark Report (GA-tracked games) shows the biggest player group splits PC and mobile, mobile-only 7-10%, console about 2% of players; creation.dev says "over 70%" mobile. These measure different things (users, sessions, players). [SRC secondary]
- **Implication:** mobile majority but many players switch devices; desktop must not look stretched; console is small but cheap if Selectable is right.
- Measure our own mix: log `TouchEnabled` / `GamepadEnabled` and a `ViewportSize` bucket server-side. [INF]

### 2.3 Touch targets and text
- Adaptive-design doc is qualitative: test on real devices at the smallest supported size, avoid thin/decorative fonts, use strong contrast, collapse secondary buttons into a menu on small screens, support landscape and portrait, make panels resize with their parent. [SRC]
- Secondary numbers: 44x44 px minimum (about 0.06 scale of 1080p height); status info in top corners; action buttons bottom-centre; close in the same corner in every menu; at most 5 persistent HUD elements; tabs when more than 5 sections. [SRC creation.dev]
- Roblox gives no minimum text px. Working numbers [INF]: phone body 16, secondary 14, floor 12, headings 20-28, hero numbers 28-44. Use `UITextSizeConstraint`.
- `GuiService.PreferredTextSize` is client-side and read-only; re-measure on `GetPropertyChangedSignal("PreferredTextSize")` and size containers with AutomaticSize. [SRC]

### 2.4 UIScale and AspectRatio patterns [INF unless noted]
- Root Frame + `UIScale` = `ViewportSize / designCanvas` clamped to [0.6, 1.6]; design on 1000x520 compact and 1920x1080 wide; recompute on the camera ViewportSize change.
- `UIAspectRatioConstraint` for square tiles (icons, rocket cards) so grids do not distort; `UISizeConstraint.MaxSize` on modals (for example 760x460 compact, 980x620 wide). Roblox's own warning: a 75%-width container becomes huge on a 4K TV. [SRC cross-platform]
- `UIListLayout` / `UIGridLayout` with AutomaticSize and `UIPadding` instead of hand-computed offsets; columns by width (2 phone, 3 compact landscape, 4 wide).
- Style queries exist (`@ViewportDisplaySizeSmall`, `@PreferredInputTouch`) for swapping tokens per device. [SRC cross-platform]

### 2.5 Reserved / core GUI areas
- Roblox core UI occupies top-left (menu, chat) and the top bar (player list, emotes); mobile jump/thumbstick sit in the bottom-left and bottom-right thumb zones. Our audit keeps bottom-right free. For a screen-based game with no avatar movement, consider disabling default movement controls so bottom corners are usable. [MEM + audit]
- Do not hide the Roblox menu/chat buttons. [MEM]

### 2.6 Gamepad
- `GuiService:Select(container)` picks the descendant with the lowest `SelectionOrder` (ties: topmost, then leftmost); `SelectionGroup` property keeps focus inside a dialog; `AutoSelectGuiEnabled` toggles auto-select; a DevForum thread reports flaky selection when changing pages, so set the selection after the panel tween ends. `IsTenFootInterface` is listed as deprecated; use input-preference signals instead. [SRC DevForum + GuiService doc]
- Glyphs: `UserInputService:GetImageForKeyCode(Enum.KeyCode.ButtonA)` and `GetStringForKeyCode`; swap hints when the active input changes. Test with Studio's Controller Emulator. [SRC cross-platform]
- Fix grid wrap with `NextSelectionUp/Down/Left/Right`. Focus must be visible: 2-3 px cyan stroke + 1.04 scale, not the default white box. B / Esc closes the top-most modal (audit). [INF]

### 2.7 Accessibility
- Players can set preferred transparency, preferred text size and reduced motion; `ReducedMotionEnabled` true means reduce or remove UI tween motion. Over 5% of people have some colour blindness: pair colour with symbols. Do not rely on sound alone. [SRC accessibility via search]
- Ours: Motion.luau jumps to end state under reduced motion; blend panel backgrounds toward opaque under high preferred transparency; never encode state in red/green alone (add check / lock / clock / x); prefer blue-vs-orange for good-vs-bad pairs. [INF]

### 2.8 UI performance
- DevForum (anecdotal, no benchmarks found): CanvasGroup costs extra time and memory, may look blurry on low graphics levels, and can flicker when first shown; its best use is clipping content that `ClipsDescendants` cannot handle (rotated, rounded). Changes in one element may re-render a whole ScreenGui, so split by update frequency. Frames + UICorner + UIGradient avoid asset loading versus images. [SRC DevForum]
- Our budget [INF]: HUD ScreenGui small and fast; modals in separate ScreenGuis toggled by `Enabled`, not rebuilt on open; roughly 300-500 visible descendants per screen; pool rows past about 40; avoid animating more than about 20 elements at once (creation.dev notes many simultaneous animations hurt low-end devices). Profile with the MicroProfiler on a low-end Android.
- TweenService for fixed-duration property changes. One Heartbeat accumulator for count-ups and countdowns; update text only when the displayed value changes. Do not animate text character by character.
- Each UIStroke / UIGradient is a render cost: one shadow on the container, not per list card.
- ViewportFrames (rocket cards) are the heaviest UI element: cap about 6 visible, keep them static until selected.

---

## 3. Screen-by-screen exemplars

Entries are `[MEM]` unless a source is named; sizes are rough proportions, not measurements. Use as direction, then verify on a fresh account.

### 3.1 HUD / currency bar
- **Pet Simulator 99** [MEM]: currency pills (Coins, Diamonds, event currency) at the top corners, rounded dark pill, large icon at left, bold white number with black outline; numbers tick up on pickup; menu buttons in a left rail. Reads fast: icon + number only, colour = currency identity.
- **Grow a Garden** [MEM]: one prominent Sheckles counter with abbreviated numbers; shops tie to a restock countdown. [SRC: seed/gear shops restock every 5 minutes server-wide, countdown visible when the shop is open]
- **Adopt Me** [MEM]: bucks top-left, low HUD density, large rounded kid-friendly type.
- **Run an airline** [MEM, repo study]: top strip with cash, daily profit and rank over light cards; closest to our model.
- **Egg Inc** [MEM]: top bar with stock and per-second rate, rate smaller and muted beneath. **AdVenture Capitalist** [MEM]: a huge centred cash number with per-second subtext. **Airline Manager** [MEM]: cash, reputation, fleet counters.
- **Takeaways:** hero number 28-44 px bold on a dark pill or 1-2 px outline; rate beneath at 60-70% size and muted; icon first; 3-4 pills max. **Ours:** Credits pill (hero), Supplies, rank/XP ring, plus the Next move banner. Missions pay on arrival, so show an "est. per min" label and say it is an estimate.

### 3.2 Main menu buttons (left/right rails)
- **Pet Simulator 99 / Bee Swarm** [MEM]: vertical rail of square icon buttons with small labels and a red dot badge at the top-right of each. **Blox Fruits** [MEM]: bottom-left cluster of Stats / Inventory / Shop / Settings icon buttons.
- **Dress to Impress** [MEM]: large colourful buttons, gradient per category.
- **Toilet Tower Defense / Steal a Brainrot** [MEM]: candy buttons, thick outlines, coloured bottom ledge, event buttons slightly tilted.
- **Takeaways:** 4-6 squares, icon about 60% of tile, label 12-14 px, badge 10-14 px; selected = brighter fill + 2 px outline; hover 1.06 / press 0.95 over 0.1 s. **Ours:** max 3 top-right buttons (audit), extras in "More". On phone a left rail eats vertical space: use a bottom tab bar in portrait and a slim right rail in landscape. [INF]

### 3.3 Shop
- **Pet Simulator 99** [MEM]: tabs (Gems, Boosts, Passes), card grid with big art and a Robux price button at the base, one "best value" ribbon. **Blox Fruits** [MEM]: long card lists with large Robux buttons and heavy marketing treatment (we do not copy this).
- **Grow a Garden** [MEM]: simple lists with stock counts and prices, greyed when sold out, restock timer; Seeds / Gear / Eggs tabs (mirrored by a third-party tracker). [SRC secondary]
- **Takeaways:** card = image about 55%, name, one-line benefit, price button; sticky category tabs; 3 columns max on phone landscape. **Ours:** no paid random, no paid power, no auto-open, no fake scarcity. Each Robux item gets a "What it does" line and a "Does not change" line. Price button states: default / disabled (shows the missing amount) / owned (check) / pending (spinner, 10 s timeout).

### 3.4 Inventory / collection
- **Pet Simulator 99 / Adopt Me** [MEM]: square-tile grid with rarity borders and glow, equipped badge top-left, lock/favourite star, quantity bottom-right, search and sort on top, detail pane at right.
- **Dress to Impress** [MEM]: category tabs plus dense grid, the highest controller cost (audit s3).
- **Idle Miner / Egg Inc** [MEM]: rows with progress "Collected 7/20".
- **Takeaways:** rarity by border weight and shape, not colour alone; "New" dot until viewed; undiscovered slots as dashed silhouettes. **Ours:** Logbook per body with silhouettes and a completion bar; master-detail (list left, detail right) as in the Buy Rocket catalog.

### 3.5 Upgrade panel
- **Egg Inc** [MEM]: research cards with title, effect line, level "3/10", cost button at right, explicit MAX state. **AdVenture Capitalist** [MEM]: one row per business, big buy button with cost, a Buy x1/x10/x100/Max selector, a progress bar for the income cycle. **Idle Miner Tycoon** [MEM]: level button, x10/x100 toggles, milestone ticks.
- **Takeaways:** each row: icon, name, "current -> next" stat diff in green, right-aligned cost button; one number change per row; multiplier toggle; milestone markers; disabled shows how much more is needed. **Ours:** Research rows using `Economy.tripSeconds` preview ("Trip 4:10 -> 3:45") and a locked row naming its unlock.

### 3.6 Daily rewards / streak
- **Pet Simulator 99 / Adopt Me** [MEM]: 7-day (or 30-day) calendar, claimed days ticked, today glowing and pulsing, future days dimmed, a larger day-7 prize tile, one big Claim button.
- **Marketplace kits** [SRC]: four common layouts: 7-wide calendar grid, horizontal timeline with progress bar, hero card with side mini-cards, compact corner widget; grace periods and 3/7/14-day milestones are standard options.
- **Takeaways:** show the whole ladder, one-tap claim, streak counter, write the reset rule plainly, never sell a streak-save at the moment of loss. **Ours:** the "Free gift in m:ss" Hud pill is the compact-widget variant; its countdown must be server-derived and never restart.

### 3.7 Quest / contract board
- **Pet Simulator 99** [MEM]: list of quests with progress bars "0/500", reward chip at right, claim glows when complete. **Airline Manager** [MEM]: goals with bonuses. **Huss Valley** [audit]: Quests button top-left.
- **Takeaways:** 3-5 visible; verb + target; progress bar with numerals; reward icon at right; state chip (In progress / Ready / Claimed); Ready rows rise to the top and pulse once. **Ours:** daily contracts as 3 cards; COLLECT in the Next move banner; add progress bar and reward preview.

### 3.8 Leaderboard
- **Pet Simulator 99 / Blox Fruits** [MEM]: in-world boards plus a menu tab; top 3 with gold/silver/bronze, avatar headshots, own rank pinned at the bottom with highlight.
- **Takeaways:** rank, headshot (`GetUserThumbnailAsync`), display name, stat; sticky "You" row; reset countdown. No free-text content. **Ours (next phase):** server-validated `OrderedDataStore`, top 10 + you.

### 3.9 Settings
- **Most Roblox games** [MEM]: gear icon, modal with rows (label left, toggle right, about 48 px tall): Music, SFX, Show others, Low graphics, text size, codes. Roblox already ships its own menu, so in-game settings cover game-specific options only.
- **Ours:** More > Settings has Sound. Add Reduced motion (default from `ReducedMotionEnabled`), compact vs full numbers, colour-blind marks, "confirm purchases". Toggles at least 52x28 px with a 0.12 s slide.

### 3.10 Purchase prompt framing
- Roblox shows its own dialog from `MarketplaceService:PromptProductPurchase` / `PromptGamePassPurchase`; our pre-prompt is a rationale card at most. [MEM]
- Good [INF]: item art, one-line effect, what stays the same, exact Robux price, plain "Not now". Show success only after the server returns `PurchaseGranted` (grant, save, return).
- Avoid: restarting countdowns, "only 2 left" untruths, stacked upsells after a loss, hidden close buttons, paid loot boxes without odds.

### 3.11 FTUE / tutorial arrows
- **Animal Hospital / Huss Valley** [audit, observed]: objective line plus in-world signs; story beat after the first action.
- **Pet Sim 99 / Adopt Me** [MEM]: bouncing arrow and glow on the next target; dimmed overlay with a hole on one tappable element; 8-12 word tooltip; blocking only for the first 1-2 steps.
- **Takeaways:** one step at a time; arrow bob 0.6 s, 8-12 px (static plus glow under reduced motion); tooltip near target; Skip always visible; resume if interrupted. **Ours:** spotlight steps for pick destination, pick rocket, launch, collect; Next move banner as the persistent hint instead of modal tutorials.

### 3.12 Popups / celebrations
- **Pet Simulator 99** [MEM]: hatch sequence with egg shake, flash, reveal, particles; rarer results run longer; auto-hatch / skip exists. **Blox Fruits** [MEM]: level-up text and sound only. **Egg Inc** [MEM]: confetti + summary card on prestige. **Adopt Me** [MEM]: "New pet" card with sparkle ring.
- **Takeaways:** anticipation 0.4-0.6 s, burst 0.2 s, hold, tap to continue; one big card with name, rarity ribbon, one stat; length by rarity. **Ours:** Rocket Delivered / Stage Achieved use `pop` + `pulse`, 12-20 UI-frame particles (not ParticleEmitters), reduced-motion fade only.

### 3.13 Notifications / toasts
- **Pet Sim 99 / Blox Fruits** [MEM]: small top-centre or side toasts, 2-3 s, up to 3 stacked. **Huss Valley** [audit]: the banner is the single source of round state.
- **Takeaways:** slide 24 px + fade 0.2 s, hold 2.5 s (4 s for rewards), exit 0.15 s; coalesce duplicates ("+120 x3"); severity via left colour bar and icon; max 3; actionable toasts stay until acted on or 8 s. **Ours:** milestones and daily reward; blocking errors go inline, not toast.

### 3.14 Offline earnings / "Welcome back"
- **Idle genre** [MEM] plus design guidance [SRC]: cap offline payout so there is a reason to return; reveal earnings gradually instead of hiding what happened behind an instant modal; keep the screen clean; restrain notifications; offline rate is often reduced.
- **Layout [INF]:** centre card, "Welcome back", away time, big earned figure counting up 0.8-1.2 s, one primary Collect. **Ours:** Welcome back modal exists (GDD); add per-mission breakdown ("Lunar Run x3, +4.2K"), a plain cap explainer, auto-focused Collect for gamepad, no upsell on this screen, no paid multiplier (repo rule).

### 3.15 Map / world selection
- **Run an airline** [MEM]: stylised map with route lines. **Pocket Planes** [MEM]: city map with job board, planes as small icons on routes. **Airline Manager** [MEM]: map + route table. **Pet Sim 99 / Blox Fruits** [MEM]: zone cards with lock + requirement, sea/island selector.
- **Takeaways:** nodes as discs of at least 48 px hit area; name shown for selected; state ring (locked grey, available cyan, active orange pulse); route preview as a dotted arc with distance/time chips; bottom sheet for the selection. **Ours:** enlarge hit rects invisibly, no hover-only info, put Travel time / Payout chips in the sheet, not on the map.

### 3.16 Loading screen
- **Roblox games** [MEM]: ReplicatedFirst screen with logo, tips and a progress bar; long loads without progress hurt retention.
- **Ours:** bootup about 3 s, skippable (GDD); drive the bar from real `ContentProvider:PreloadAsync` progress, add a rotating tip line (one per 3 s), no marketing. [INF]

---

## 4. Visual language

### 4.1 Colour
- Keep the Mission Control scheme: light cards on navy, cyan accent, orange primary, green success, amber warning, red danger. At most 3 accent hues per screen. [SRC creation.dev suggests 3 colours]
- Contrast at least 4.5:1 for text. `ink` on white is very high; `muted` is borderline, so never use `faint` (A3AABB) for text, only dividers and disabled. Put text over busy backgrounds on a solid panel. [SRC + INF]
- Rarity ladder [MEM, genre standard]: grey, green, blue, purple, gold. Map to Theme: muted / green / blue / new purple token if needed / amber.

### 4.2 Outline / stroke
- Genre look is a 2-4 px dark outline. Ours is softer: 1-2 px `line` strokes on cards, 2-3 px darker-shade stroke on primary buttons, text outline only on HUD numbers over the world (UIStroke about 1.5 px in `shadow` colour). [INF]

### 4.3 Gradients
- Subtle: top-lighter to bottom-darker on buttons (lightness delta about 8-12%), navy to navy2 on bands, planet gradients. No rainbow gradients except rare celebration. Gradients must not reduce text contrast. [INF]

### 4.4 Shadows
- Soft UIShadow on cards; modal backdrop `shadow` at about 0.45 transparency. Button "ledge": a 3-4 px darker bottom strip, press moves the button down by the ledge height in 0.08 s. [MEM + INF]

### 4.5 Button states (all required)
| State | Visual | Timing |
|---|---|---|
| Default | gradient fill, ledge | n/a |
| Hover (mouse) | +6% brightness, scale 1.03 | 0.1 s Quad Out |
| Pressed | scale 0.96, ledge collapses | 0.08 s Quad Out |
| Disabled | desaturate, no ledge, text 55% alpha, says why ("Need 2,400 more") | instant |
| Focused (gamepad/keyboard) | 2-3 px cyan stroke, scale 1.04 | 0.12 s |
| Pending | label replaced by spinner, input locked, 10 s timeout | n/a |

### 4.6 Iconography
- Drawn in code (repo rule), 24/32/48 px grid, one stroke weight, flat fill plus one highlight, rounded caps, tinted per use. One metaphor per concept (rocket = fleet, coin = Credits, crate = Supplies). Test at 24 px; simplify if unreadable. Badge corners: dot (new), number (count), lock, check. No emoji. [INF]

### 4.7 Typography
- Families via `rbxasset://fonts/families/*.json`: BuilderSans (body), BuilderExtended (headline), BuilderMono (numerals); the Font enum also offers Gotham-style, FredokaOne, SourceSans, Roboto, Montserrat, Oswald, Bangers and others [MEM, check the enum]. Use one or two families. [SRC creation.dev]
- Ours: headline BuilderExtended Heavy; body BuilderSans Medium/Bold; numbers BuilderMono Bold (stable widths avoid jitter on count-up).
- Scale (compact canvas): H1 24-28, H2 20, body 16, caption 14, micro 12. Line height 1.15-1.25. ALL CAPS only for button verbs of 12 characters or fewer. [INF]

### 4.8 Number formatting
- Under 1,000 show whole ("842"). Then 1.2K, 12K, 123K, 1.2M, B, T, Qa, Qi; past that use "1.2e18". Aim for 5 characters or fewer. Drop trailing ".0". No separators below 10,000 except exact money on confirmation screens. Full value on tap/tooltip and in purchase confirmations.
- Floor costs and compare against exact values so a rounded number never makes an unaffordable item look affordable. Time: "4:10", "1h 12m", "2d 3h" (two units max). Percentages as integers; odds with decimals only in odds tables. [INF]

### 4.9 Juice timings and easing
Starting points; first four from creation.dev [SRC], rest [INF]:
| Effect | Duration | Easing |
|---|---|---|
| Menu transition (slide/fade/scale) | 0.2-0.3 s in, 0.15 s out | Quad Out / Quad In |
| Button press feedback | 0.08-0.1 s | Quad Out |
| Currency count-up | about 0.5 s (up to 1.0 s on welcome-back) | Quad Out |
| Pop (title, badge) | 0.3 s, scale 0 -> 1.15 -> 1 | Back Out |
| Toast in / hold / out | 0.2 / 2.5 / 0.15 s | Quad Out / n/a / Quad In |
| Pulse (ready CTA) | 0.8 s, scale 1.0-1.05, 3 loops then rest | Sine InOut |
| Shake (error) | 0.25 s, 4 oscillations of 4-6 px | Linear |
| Celebration | 0.6-0.9 s, skippable after 0.3 s | Back / Quint Out |
| Tab content swap | 0.15 s fade + 8 px slide | Quad Out |

Rules: animate Position / Size / Transparency / Rotation / UIScale only; stagger lists 0.03-0.05 s per item, max 8; never block input during routine tweens; cancel running tweens before replaying.

### 4.10 Sound feedback
- Click: soft 0.05-0.1 s tick. Confirm/buy: two-note rise. Error: short low buzz. Coin/collect: pitch rises over consecutive pops (cap 5 steps), rate-limited. Celebration: 1-2 s sting, duck music about 6 dB. Never audio-only feedback. Sound toggle in Settings (exists). [SRC accessibility + INF]

---

## 5. Copy and honesty rules (shop / timers)

Sources: Roblox paid-random-items policy [SRC], repo `research/monetization-policy.md` and CLAUDE.md hard rules. Re-read the live policy before relying on details (two page versions differed on rounding of odds).
- **Paid random items:** any random outcome bought with Robux, or with currency bought with Robux, must list every possible outcome and its actual numeric odds before the player spends. A long list can sit behind a popup, but its button needs a descriptive word such as "Info" or "Details" (a lone "(i)" is not enough). Odds-changing items need numeric effects stated; one-time outcomes need updated odds. **We ship none** (repo: no paid random items, no paid power or luck).
- **Timers must be true.** A countdown ends when it says, never restarts or loops per visit. Use server time; if unavailable show "--:--", not an invented number.
- **No fake scarcity:** no "only N left", "limited time" or "N viewing" unless real; no strikethrough "was" prices unless it was sold at that price.
- **Neutral shop copy:** say what it is and costs ("Rocket skin, cosmetic only. R$ 99"). No guilt, fear, shouting or dark patterns (hidden close, shifting buttons, shaming decline text). Decline = "Not now".
- **Never auto-open the shop;** no purchase prompts after failure or loss; no purchase surfaces in session 1 screens.
- **Real price and currency:** Robux icon + exact amount; state what changes ("Adds 1 launch slot").
- **Welcome-back / offline:** state the cap and rate honestly; Collect is primary; no paid multiplier.
- **Text rules:** no em dashes in player-facing text, no emoji, Mild content, no free-text user content.
- **Grant flow:** show success only after `PurchaseGranted` (idempotent receipt key `R_{UserId}_{PurchaseId}`); on failure say "didn't go through" and "not charged" only when true.

---

## 6. Per-screen checklist and 1-5 rubric

Score each line 1 (fails) to 5 (excellent). Ship at 4 or higher on every line; any 1-2 blocks.

| # | Check | 1 | 3 | 5 |
|---|---|---|---|---|
| 1 | Hero in 1 s (squint test) | competing | okay | single obvious hero |
| 2 | One primary action, at least 44 px, saturated, verb label | none/many | present | unmistakable |
| 3 | Hierarchy: at most 3 text sizes, 3 accent hues | chaos | mostly | clean |
| 4 | Phone fit at 844x390 and 1000x520: insets, targets 44+, text 14+ | clipped | fits | fits with room |
| 5 | Desktop/TV: max sizes constrained, not stretched | stretched | okay | designed |
| 6 | Gamepad: default selection, visible focus, B closes | none | works | polished with glyphs |
| 7 | States: default / hover / press / disabled / focus / loading / empty / error | under 3 | 5 | 8 with reasons |
| 8 | Numbers: formatted, stable width, server-sourced, no overflow at 999.9T | raw | formatted | formatted + full value on tap |
| 9 | Motion uses a Motion pattern, at most 0.3 s, reduced-motion tested | none/long | present | with fallback |
| 10 | Colour semantics also encoded by icon/shape; contrast at least 4.5:1 | colour only | mostly | verified |
| 11 | Honesty: true timers, neutral copy, no paid random/power | violations | borderline | clean |
| 12 | Perf: instance count noted, no per-element Heartbeat, CanvasGroup justified, ViewportFrames limited | heavy | ok | measured |
| 13 | Feedback within 100 ms of tap; server result shown after confirm | silent | partial | instant + confirmed |
| 14 | Empty/error copy says what happened and what to do | blank | generic | specific |
| 15 | One memorable detail that serves the game, cheap and skippable | none | some | yes |

Workflow: capture at PC and `iphone_14` (`scripts/probes/viewport.luau`), score, fix anything under 4, recapture, note scores in the report.

---

## 7. 12 improvement ideas for Run a Space Agency

1. **Hero + estimated-rate HUD pill** (Egg Inc / AdVenture Capitalist, 3.1): Credits in BuilderMono 32-36 px, muted "about X/min" beneath; Supplies and rank secondary.
2. **Bottom tab bar on portrait/phone, slim right rail in landscape** (Pet Sim 99 rails, 3.2): 10-14 px badge dots for ready contract/gift.
3. **Next move banner as the only tutorial plus spotlight arrows for four first steps** (Animal Hospital objective line, 3.11): bob 0.6 s, static glow under reduced motion.
4. **Buy multiplier and stat diff on Research rows** (AdVenture Capitalist, 3.5): x1 / x10 / Max, green "Trip 4:10 -> 3:45", disabled shows the missing amount.
5. **Daily ladder preview behind the gift pill** (Pet Sim 99 / kits, 3.6): 7 tiles, today pulses 3 times, day-7 larger, plain reset rule, no paid streak saves.
6. **Welcome-back breakdown with cap explainer** (idle guidance, 3.14): per-mission lines counting up, "Missions pause after N h", Collect auto-focused, no upsell.
7. **Contract cards with progress bar and reward chip** (Pet Sim 99 quests, 3.7): Ready cards rise to top and pulse once; chip text, not colour only.
8. **Logbook silhouettes, border weight by tier, New dots, completion bar per body** (Adopt Me / PS99 inventory, 3.4).
9. **Map bottom sheet with trip chips** (Pocket Planes / Run an airline, 3.15): Travel time, Payout, Risk chips; 48 px invisible hit rects; cyan selected ring, orange pulse for active flight.
10. **Rocket Delivered celebration scaled by rarity** (PS99 hatch, 3.12): first-ever 0.9 s with spin and 16 UI particles; repeats 0.3 s pop; reduced motion fade; skip after 0.3 s.
11. **Toast coalescing** (3.13): "Mission paid +4.2K x3" in one toast, max 3 stacked, rewards hold 4 s, errors inline.
12. **Honest shop cards with "Does / Does not change" lines** (Roblox policy + 3.3): pending spinner state, "Not now" decline, never auto-opened.
Bonus (perf): static captured poses for rocket ViewportFrames except the selected card; separate HUD ScreenGui from modals.

---

## 8. Sources

Accessed 2026-10-24 (fetch or search excerpts; some Creator Hub pages 404ed on direct fetch, re-check live).
- Roblox Creator Hub, Adaptive design guidelines: https://create.roblox.com/docs/production/publishing/adaptive-design
- Roblox Creator Hub, Cross-platform development: https://create.roblox.com/docs/projects/cross-platform
- Roblox Creator Hub, Accessibility guidelines: https://create.roblox.com/docs/production/publishing/accessibility
- ScreenGui reference: https://create.roblox.com/docs/reference/engine/classes/ScreenGui
- ScreenInsets enum: https://create.roblox.com/docs/reference/engine/enums/ScreenInsets
- GuiService reference: https://create.roblox.com/docs/reference/engine/classes/GuiService
- Paid random items policy: https://create.roblox.com/docs/production/monetization/paid-random-items
- Engagement rewards feature package: https://create.roblox.com/docs/resources/feature-packages/engagement-rewards
- DevForum, New Gamepad UI Selection APIs: https://devforum.roblox.com/t/new-gamepad-ui-selection-apis/1791278
- DevForum, GUI Optimization tips: https://devforum.roblox.com/t/gui-optimization-tips/3986563
- DevForum, What is CanvasGroup: https://devforum.roblox.com/t/1797885
- DevForum, CanvasGroup flickers when initially shown: https://devforum.roblox.com/t/canvasgroup-flickers-when-initially-shown/4015258
- creation.dev, Roblox UI design best practices (secondary; 44 px, timings, 70% mobile): https://www.creation.dev/blog/roblox-ui-design-best-practices
- Can I Play That, Roblox global text size setting: https://caniplaythat.com/2025/08/27/roblox-introduces-global-text-size-accessibility-setting/
- Rowatcher, Mobile vs Desktop 2026 (secondary, unverified): https://rowatcher.com/news/mobile-vs-desktop-on-roblox-who-s-playing-what-in-2026
- 2025 Roblox Benchmark Report (third party): https://investgame.net/news/pdf/the-2025-roblox-benchmark-report/
- Roblox Q4 2025 Shareholder Letter (no device mix found in excerpts): https://s27.q4cdn.com/984876518/files/doc_financials/2025/q4/Q4-2025-Shareholder-Letter.pdf
- Mind Studios, idle game design and monetization: https://themindstudios.com/blog/idle-clicker-game-design-and-monetization
- Grow a Garden stock guide (5 minute restock): https://deltiasgaming.com/?p=207402
- Grow a Garden Stocks extension (tabs, third party): https://chromewebstore.google.com/detail/clcamndfcfimaajhikbanmagmffgiijl
- Daily reward kit layouts (marketplace listing): https://builtbybit.com/resources/daily-rewards-login-streak-system.105963/
- Repo: `research/ui-motion-audit.md`, `research/monetization-policy.md`, `docs/game-design-document.md`, `docs/decisions.md` (D-013).
- Not reached: Game UI Database (https://www.gameuidatabase.com) and Interface In Game (https://interfaceingame.com); searches returned no entries. Follow-up: browse them for Egg Inc, AdVenture Capitalist, Idle Miner Tycoon and Pocket Planes screens and replace the `[MEM]` entries in section 3.

# Thumbnails and game icons that drive click-through (reference for Run a Space Agency)

Compiled 2026-10-24. Builds on, and does not repeat, `.agents/rules/agent-hq-art-direction.md` and `research/video-notes/roblox-art-direction-sources.md` (16:9 / 1920x1080, 10 images, personalization 2 to 5 thumbnails, +8.5 % QPTR, CallMeDogey / gfxrhino style notes, hard content limits).

Evidence labels used below:
- **Documented** = read on a Roblox Creator Hub or DevForum page this session.
- **Observed** = I downloaded the live icon/thumbnail from Roblox's public thumbnails API on 2026-10-24 and looked at the actual pixels (contact sheets). Many icons carry a **Halloween event skin**, so what they show now is not their year-round look. The image-to-name pairing for a few is marked "mapping unverified" because the API returns icons in its own order.
- **Creator claim** = blog/forum opinion with no measured data. **Unverified** = treat as a hypothesis to test.

## 1. TL;DR: the 12 rules that matter most
1. Icon and thumbnail are ads for a 150 px tile. If the idea is not obvious at 150 px wide it does not exist (Documented: icons shrink to about 150x150).
2. One subject, one action, one mood. Every observed winner has a single dominant focal object or face filling 50 to 80 % of the frame.
3. Put a big readable face or creature in the icon when the game allows it. Observed: Adopt Me dragon, Pet Sim cat, Finn face (Candy Kingdom Defense), grinning face (Airport Security), cartoon chicken.
4. The subject touches or crops at the frame edge (bleed). Floating small subjects in empty space lose.
5. Background is a flat, saturated, single-hue field or a simple gradient that contrasts with the subject (sky blue/green, purple radial, red, black). No busy scene behind the subject.
6. Text is 1 to 3 words or a number, huge, with a thick stroke, bottom third of an icon. Observed: ADOPT ME!, BROOKHAVEN, BLOX FRUITS, DOORS, BEAR, AIRPORT SECURITY. Avoid sentences.
7. For tycoon/idle games the icon often shows the reward: a giant upgraded tool/item plus big green or white money numbers. Observed: Wood Farm axe with "+69,000", Ring Farm "$9,329,653/s". That is honest only if the game really shows those numbers (ours must use real, achievable values).
8. Thumbnail = scene with a hero in the foreground, a huge payoff object behind it, and one number or one short label. 16:9, important content in the top 85 % (player count covers the bottom).
9. Warm saturated accents (orange, red, yellow) pop against Roblox's dark home page; use cool navy as the field and a warm object as the hook (Documented advice: color expresses theme; creator claim: warm stands out).
10. Use the platform's own test: 2 to 5 active thumbnails, keep your current winner in every new test, judge on QPTR not clicks (Documented).
11. Be honest. Roblox moderates misrepresented gameplay, artificially enhanced visuals, ads/"50% off"-style claims; seasonal event frames and fake timers are what other games do, not what we copy.
12. Refresh on a schedule: thumbnail CTR decays (CallMeDogey claim, about 0.8 points in a week, already in repo notes); ship a new set per major update, keep the previous winner live.

## 2. Official Roblox specs and testing (Documented unless noted)

### 2.1 Icon (https://create.roblox.com/docs/production/promotion/game-icons)
- Square, at least 512x512 px. One icon per locale. Preview shows how it appears; icon can scale down to about 150x150 on site and app, so check details at that size.
- Roblox auto-generates a default icon on first publish; do not leave the default if it does not match the theme.
- Set at Creator Dashboard > Configurations > Places > start place (star) > Icon > Image > Change > Save. Icon is separate from thumbnails.
- Must pass moderation before anyone else sees it.
- Design tips on the page: sharp, not blurry; relevant, unique imagery that matches what players will find; avoid ambiguous graphics (a vague symbol in a corner); convey theme through color (bright saturated for fantasy/dreamy, muted for somber, strong contrast for horror).
- Roblox staff replies (DevForum 3793665) show users asking when personalization will extend to icons. As of that thread it covers thumbnails only. Icon A/B is not native; use ads or sequential swaps (see section 6).

### 2.2 Thumbnails (https://create.roblox.com/docs/production/promotion/thumbnails and /promotional-thumbnails)
- Image: 16:9, ideally 1920x1080. Accepts .jpg .gif .png .tga .bmp. Non-16:9 is stretched, not cropped.
- Up to 10 images or videos per detail page. Personalization uploads must be under 3 MB.
- Videos: free, 3 uploads per month quota; rejected videos still use quota; not shown on Xbox, PlayStation or VR; approved videos appear first on the detail page and can appear on Home.
- Auto-generated thumbnail: made from the Studio camera at the latest publish. Free camera in a solo test: Left Shift + P.
- Safe zone: keep essential text and elements out of the bottom; player count and other metadata can cover them. (Repo rule: keep nothing important in the bottom 15 % or outer 5 %.)
- Moderation: all media checked against Community Rules and Terms of Use. Video-specific rejection reasons: misrepresented gameplay or UI, artificially enhanced visuals, real-life or external footage, voiceover/lyrics, ads/promotions/subjective claims ("50% off", "Free UGC!"). Allowed: varied camera angles, minor brightness/contrast tweaks, your logo, curated real-gameplay highlights, in-game UI text. Overlay text must be sparing and describe gameplay. The page gives no separate list of image rejection reasons.

### 2.3 Thumbnail personalization (Roblox's A/B-style feature)
- Roblox's page does not use the words "A/B test"; the closest feature is personalization (Fortnite has an actual "A/B thumbnail test" doc, useful for method only).
- Needs 2 or more active thumbnails (2 to 5 recommended). One active = everyone sees it.
- How to run: Creator Dashboard > Configurations > Places > place > Thumbnails > Home Page tab > tick Active on 2 to 5 images > Save changes > Start.
- Algorithm: random user groups see different thumbnails, the best one per user segment gets more impressions, the others keep minimal traffic so exploration continues.
- Metric is QPTR (qualified play-through rate) = qualified plays / Home recommendation impressions. Table (impressions, qualified plays, average playtime, QPTR, winning segment) fills after a few hours.
- Roblox-reported results: average +8.5 % QPTR, some games +50 %.
- Update (DevForum 3793665): starting a new test no longer resets traffic to an even split. If the test includes your current winner it keeps most traffic and new ones get a small measuring share; traffic shifts within hours. Roblox reports +0.19 % QPTR and 21 % fewer impressions wasted on non-winners (read as: small average gain, big saving of wasted exposure). Advice: always include your highest-QPTR thumbnail in a new test. Do not delete a runner-up too early.
- Community feedback in that thread: QPTR alone may favor clicky but low-retention thumbnails; track playtime and Robux too. Roblox says it is piloting video-based discovery (detail page and Home hover).
- No official minimum sample size or duration is published. Unverified guesses are in section 6.

## 3. Icon patterns and exemplars

Observed 2026-10-24 from the live icon API (512 px, viewed small). Most top games wear a seasonal Halloween variant now; the structural pattern is what matters.

### 3.1 Pattern catalogue
- **Mascot close-up**: one creature/character face, centered, bleeding off the frame, big eyes, bright field.
- **Hero + payoff object**: Roblox avatar small, giant item big. Used by idle/tycoon.
- **Rewards-in-icon**: floating "+69,000" and "$X/s" numbers. Honest only if in-game.
- **Logo-lockup**: title bottom-center in chunky stroked type, art above.
- **Single object icon**: one weapon/tool filling the square (very high clarity).
- **Event frame**: ornate red border and a header logo ("The Hollow") plus hourglass timers like "2 HOURS", "24 HRS", "NOW!". This is a Roblox event-wide layer. Note: timers in icons are the exact "fake urgency" our repo rules ban; do not copy.
- **Notification dot**: small red "!" badge in the corner (Steal An Egg, Chicken Farm, Pickaxe Tycoon). It mimics an unread badge; borderline manipulative, skip.

### 3.2 Exemplars (28)
Format: game | genre | what it shows | text | outline | why it works.

1. **Adopt Me!** | pet RPG/sim | huge cute dragon head, big eyes, purple/navy glow, bottom-left | "ADOPT ME!" white heavy sans with dark stroke, bottom | thick dark outline on lettering | creature face is the whole icon; text is the brand; reads at 150 px.
2. **Brookhaven RP** | roleplay | blocky girl in witch hat holding a jack-o-lantern, standing in an open double door with a house behind, red banner label | "BROOKHAVEN" white on red banner, large | banner | doorway framing says "home"; red banner plus white text is highest-contrast element.
3. **Blox Fruits** | anime RPG | armored spiky warrior face in blue/ice, flames, dark | "BLOX FRUITS" gold/blue stylized logo bottom-right | glow/outline | fantasy-power face; logo big and legible.
4. **Dress To Impress** | fashion roleplay | stylized glam girl portrait in purple/gothic palette | "NEW QUEST" metallic text, bottom | soft glow | face + event hook; one subject; text is two words. (Quest text is an update label; ok because it is real.)
5. **Sell Lemons** | idle tycoon | "$ Sell Lemons" logo top, Roblox avatar from behind walking into a huge pile of colorful candy-like items | logo top, event frame | event border | "pile of stuff" = reward imagery; avatar from behind adds depth and a destination.
6. **Sell Fries!** | idle/job sim | avatar with pumpkin hat holding a giant carton of fries, red restaurant interior | none | thick lighting contrast | single huge prop; one-second read ("sell fries").
7. **Flee the Facility** | survival | black-red event frame with a hammer, title lettering | game title in red block letters, small | frame | event wrapper dominates; hammer is the only game cue.
8. **DOORS** | horror | red logo letters over a dark corridor with a creature; event frame | "DOORS" huge red/black lettering | glow | big red word on dark = maximum contrast; a creature face adds fear. (Not Mild; do not copy the horror.)
9. **Steal An Egg** | simulation | giant blocky white chicken with sunglasses on a bright green/blue field, red notification dot | none | no outline, flat colors | cartoon animal face + flat bright field; humor from the sunglasses; strong silhouette.
10. **Chicken Farm** | idle tycoon | (mapping unverified) similar blocky chicken icon in a bright field | none | flat | same lesson: animal mascot as the tycoon "product".
11. **Wood Farm** (My Wood Farm, mapping reasonably confident) | idle | huge ornate axe, bright green sky-field, floating gold "+67,000 / +70,000 / +69,000", "$967,345,747/s" in green/cyan at top | numbers only | black outline on numbers | the number IS the hook; item is a giant upgraded tool; sparkle highlights. High-numbers pattern.
12. **Build A Ring Farm** (mapping likely) | idle tycoon | avatar standing on a red platform in a colorful farm of flowers, "$9,329,653/s" huge white at top | number | stroke | same hook: income per second.
13. **Pickaxe Tycoon** | mining tycoon | one glowing lava-red pickaxe filling the square on grey stone, red "!" dot | none | dark outline | single object, 4 colors, readable in a second.
14. **Wash the Car** | sim | glossy red sports car in a car wash tunnel, foam, bright blue/yellow | none | gloss | clear job fantasy; shiny hero object; bright primaries.
15. **Fix My Phone!** | sim | cracked phone held by giant white gloved hands on a purple radial burst, moon and bats | none | thick | big cracked object = the task; hands show action.
16. **Candy Kingdom Defense** | tower defense | big grinning cartoon hero face, "CANDY KINGDOM DEFENSE" logo at bottom, pink/purple event sparkles | logo | outline glow | known-face style (licensed look; do not copy), shows how a face plus logo works.
17. **Missiles vs Cities** | strategy sim | blocky avatar running from a huge orange explosion over a colorful block city | none | thick outline | action moment + fire + bright sky; one reaction.
18. **Merge Shop** | puzzle/shop | a brown paper bag filled with items on a grid tile with a dragon plush, popsicle, donut and strawberry in the corners | none | rounded border | "full grid of goodies" = shop fantasy; items arranged radially; soft pastel field. Closest to a management/inventory game.
19. **Create a Robot Fighter** | sim/fighting | (mapping unverified) a big orange-red armored golem face, dark red background | none | rim light | strong robot silhouette; warm vs dark.
20. **Airport Security (Anomaly)** | sim/horror-lite | extreme close-up of a smiling pilot-like character with dark spiky hair and odd eyes on dark teal grid | none | dark | a uncanny face is the click; mild alternative: a smiling friendly face.
21. **LifeTogether RP** | family roleplay | smiling girl holding a baby and phone, outdoor bokeh | none | none | warm photoreal-ish 3D; faces and warmth; very low clutter.
22. **BEAR (Alpha)** | horror | pale creature head over a red/black room, "BEAR" in big white block letters bottom | "BEAR" | stroke | one-word title bottom; creature face; not Mild.
23. **Pet Simulator 99** | collect sim | blue-grey cat face peeking up from the bottom with tiger and green dino behind, bright sky gradient | none | outline | mascot trio, big eyes, blue/orange complementary.
24. **Don't Splash** | horror survival | small avatar running on white tiles in blue water, monster behind with water spray | none | dramatic light | clear "run away" action; small enough subjects but strong spray silhouette.
25. **Volleyball Legends** | sports | anime boy grinning, holding a "Tournament Schedule" clipboard, volleyball flying above a net | none | outline | face plus relevant prop; tells the content update (honest because it is a real feature).
26. **Fisch / Fish It! / Dead Rails style** | fishing/adventure | event frames with hourglass+timer text over dimmed art ("NOW!", "2 HOURS", "24 HRS") | timer text | white hourglass | purely event messaging; strong, but fake-urgency; skip.
27. **Steal a Brainrot / Anime Dice style spin-offs** | sim | meme character stacks with "$997,151,167/s" at top and "SECRET" rarity tag | text | heavy | shows "income per second" + rarity; our game must not show paid-random rarity.
28. **Sol's RNG** | RNG idle | dark galaxy art, title lettering low-contrast | text | none | counter-example: dark on dark and small text reads badly at 150 px (see section 5).

Name-to-pixels caveat: items 10, 19 and parts of 5 to 6 could be mixed up where noted; shapes and lessons are still valid.

### 3.3 Icon color and layout rules that hold across exemplars
- **Color families that dominate**: sky blue/green (sim, farm), purple radial (halloween/fantasy), red/black (horror), orange/yellow (fire, loot). Space-agency analog: navy field plus orange rocket plus cyan accent.
- **Value structure**: darkest part is the outer corners or the frame, lightest/most saturated is the subject center. The subject separates by value, not just hue.
- **Outline**: top icons use a dark outline on the lettering and a soft or no outline on the subject (3D renders). Flat blocky ones (chicken, pickaxe) rely on clean silhouette instead.
- **Face rule**: top-chart icons with a face or creature are the majority in the sample above; eyes sit in the upper half, big, looking at the viewer.
- **Text rule**: title text sits in the bottom 25 %, height at least about 12 % of the icon, letters at least 40 px at 512 px (Creator claim: below roughly 40 px in the source image becomes unreadable at tile size; consistent with what I saw at 200 px).
- **Number rule**: "$.../s" numbers sit at the very top, huge, with stroke; they are the second headline.
- **Corner clutter**: badges in corners (red "!", pumpkin tags) are tiny and ignored at 150 px; skip them.

## 4. Thumbnail patterns and exemplars

Observed 2026-10-24 (768x432 pulls of the first gallery image). Descriptions are of what I actually looked at; "memory" marks anything from prior knowledge.

### 4.1 Composition templates
- **T1 Reaction + giant payoff + number** (idle/tycoon): avatar or worker reacting (shock/joy) at one side, a huge item/animal in the center, a very large "$X/s" or "LVL" number at the top. Observed in Chicken Farm, Ring Farm, My Wood Farm.
- **T2 Before/after split**: left "LVL 1" weak tools and sad avatar, right "LVL 9,999,999" huge arsenal and happy avatar, diagonal divider. Observed (Wood Farm). Strong for progression games; honesty rule: the numbers must be achievable in game.
- **T3 Tier ladder / catalogue wall**: rows of labeled progressive items (24 tiers of pickaxes) plus avatar holding the best one and a red arrow. Observed (Pickaxe Tycoon). Perfect analog: a rocket tier ladder.
- **T4 Two-sides conflict**: two player portraits ("Bacon" vs "Kate"), "IN COMBAT" banner, missile arc between two city blocks. Observed (Missiles vs Cities).
- **T5 Cozy portrait**: character with food and a friendly creature in a warm night scene, lantern light. Observed (Forest Market). Warmth plus depth-of-field.
- **T6 Close face + logo wordmark**: large character face left, big title right (Airport Security). Simple and clean.
- **T7 Game-world hero shot with logo corner**: family on a lawn, small logo pill top-left (LifeTogether).
- **T8 Action hero with sports effect lines**: speed lines, ball overhead, armored player (Volleyball Legends).
- **T9 Loot reveal**: floating huge winged egg/pet, "1/4,000,000 Secret", cursor hand and "HATCH" label (Tap Simulator). This is paid-luck imagery; do not use.
- **T10 Funny mid-action**: muscle character carrying a block up a pyramid, red "!" alert, brick ground (Build the Pyramid). Humor beats polish.

### 4.2 Exemplars (22)
1. **Run a Restaurant!** (relevant "Run a" game) | chef avatar in front, slicing a glistening roast on a plate in a bright white-gold kitchen, a second cook flaming a pan behind | no text | warm light, depth of field | one hero, one action, food = payoff; white/gold palette stands out against the dark Home page.
2. **Pickaxe Tycoon** | see T3: wall of tiered pickaxes with name labels, avatar swinging a golden pickaxe, red arrow | tier labels small but the pattern is the point | sky blue field | gives scale of progression in one frame.
3. **Build A Ring Farm** | field of yellow-green crops on a brown platform, "$671,549,324/s" in rainbow gradient across top | huge number | stroke | the money counter as the headline.
4. **My Wood Farm** | T2 split with "LVL 1" vs "LVL 9,999,999", floating "+69,000" | big LVL text | comic outline | progression promise.
5. **Chicken Farm** | giant white chicken center, shelves of animals behind, "$997,874,672/s" top, shocked king avatar bottom-right | number | heavy | reaction + payoff + number template exactly.
6. **Missiles vs Cities** | T4 | "IN COMBAT" yellow hazard banner | bold | two clear teams, bright cyan sky.
7. **Merge Shop** | two chibi characters, one holding a phone, one with a magnifying glass, a glowing orange fruit icon inside a spotlight, red arrow | none | anime outline | curiosity gap: arrow points at the thing.
8. **Forest Market** | T5 | small corner logo | warm lighting | cozy management feel.
9. **Create a Robot Fighter** | two mechs punching in a blue boxing ring, red/yellow hero mech left, rusted dark mech right | none | 3D rim light | complementary red vs orange-brown vs blue floor.
10. **Airport Security (Anomaly)** | pilot face left, "AIRPORT SECURITY" big grey/white serif-less title, "[ANOMALY]" in orange small under it | title | dark brown vignette | typographic simplicity.
11. **Build the Pyramid!** | T10 | red exclamation | none | slapstick fun.
12. **Sol's RNG** | blue galaxy burst, title text small and low contrast | counter-example, see mistakes.
13. **Tap Simulator REBORN** | T9 loot reveal with "HATCH" and "1/4,000,000 Secret" | text | lava palette | click-bait for luck; banned for us.
14. **Volleyball Legends** | T8 | none | purple/blue | dynamic action.
15. **Dead Rails** | a real in-game screenshot of a steam locomotive on tracks in pale desert, small avatar on top | none | untouched | counter-example: low saturation, tiny subject, but still honest. Works only because the game is already famous (memory: this game has a large following).
16. **LifeTogether RP** | T7 | pink pill logo | soft | friendliness.
17. **BEAR (Alpha)** | overexposed black-and-white scene, "BEAR" in white block letters bottom-right | title | high contrast | a mood poster; not Mild.
18. **DOORS** | title letters left, creature right inside red event frame | title | glow | event frame again.
19. **Candy Kingdom Defense** | hero face holding a glowing red sword at camera, purple lightning, ghost monsters, castle behind | none | glow | bold central face and a sword leading the eye.
20. **+1 Speed Keyboard Escape** | avatar running on keyboard keys with a rainbow trail, floating "+1" numbers, event frame | numbers | bright | the "+1" mechanic shown in the thumbnail.
21. **Run a Restaurant style: Merge Shop vs Forest Market** | note management games favor warm food/shop objects rather than rockets or numbers. (Interpretation.)
22. **Sell Lemons / Sell Fries** | job-sim: avatar with huge product pile (memory + icon observation).

### 4.3 Thumbnail rules that held across exemplars
- **One horizon, three layers**: foreground hero (largest), midground payoff, background simple gradient. Max two competing focal points.
- **Number placement**: top center, huge (at least 12 % of frame height), white or yellow with dark stroke or rainbow; avoids the bottom UI overlay.
- **Face**: at least one face or reaction visible; mouths open (excited or shocked) are most common.
- **Color contrast**: complementary pair (blue sky vs orange object; navy vs orange). Keep saturated areas bigger than muted ones.
- **Mobile readability test**: shrink to 384x216 and 192x108 (a phone tile is about that wide). Anything under about 40 px tall at 1920 wide disappears (creator claim, consistent here).
- **Text**: at most 3 words; capitals; stroke; name a mechanic or reward (creator claim) not the title. Logo pill in a corner is accepted.
- **Arrows and circles**: a red arrow pointing at the payoff appears often (Pickaxe Tycoon, Merge Shop). They work, they also tilt toward click-bait if overdone; use at most one.
- **Gallery order**: first image is the Home candidate; the remaining 9 serve the detail page. Use a progression: hook, core loop, progression, social/offline earnings, update.

## 5. Common mistakes and moderation/rejection evidence
- **Too much text / title only**: a DevForum creator's RoPong icon (red/blue title text over cups and a ball) got 0.134 % CTR on sponsored ads (22 visits for 1,360 Robux); replies said text-only icons carry no emotion and the title only helps if the name is already known (Documented, https://devforum.roblox.com/t/is-my-game-icon-actually-this-bad-horrible-click-rate/2625742). Caveat in the same thread: mixed PC/mobile CTR hides big differences; the number is not a clean icon test.
- **Dark on dark and small type**: Sol's RNG-style thumbnails and the Dead Rails screenshot are low-contrast; works only with an existing audience (Observed).
- **Default or ambiguous icon**: Roblox says unclear corner symbols and default art confuse (Documented).
- **Blurry or low-resolution**: Documented.
- **Corner badges and tiny event stickers**: vanish at 150 px (Observed).
- **Stretched 16:9**: uploads of other ratios are stretched (Documented); always export 1920x1080.
- **Essential content in the bottom strip**: covered by player count (Documented).
- **Moderation false positives**: a DevForum creator got an "Illegal and Regulated Content" account warning for a 1920x1080 thumbnail that was the same image as an icon that passed; the image had guns and title text and replies suggested removing elements or editing pixels (Documented anecdote, https://devforum.roblox.com/t/thumbnail-got-me-a-warning-while-icon-didnt/2643599). Outcome not stated. Lesson: avoid weapons, even in cartoons, and expect moderation to be inconsistent between icon and thumbnail. Re-uploading an already-rejected image unchanged is rejected again; edit it first (forum reply, unverified).
- **Video thumbnails rejected for**: misrepresented gameplay, artificial visuals, external footage, voiceover, promotions, subjective claims (Documented). These also make a good checklist for still images.
- **Misleading hooks** ("FREE", "50% OFF", "LIMITED", fake timers, fake player counts): prohibited by Roblox for video and by our own rules for all images. Observed competitors use hourglass timers and rarity odds like "1/4,000,000 Secret". We do not.
- **Loot/rarity imagery**: our game has no paid random items; avoid egg-hatch, "SECRET", spin wheels.
- **Showing a mechanic the game lacks**: e.g. combat, PvP, multiplayer base building. Our game is management only.

## 6. A/B testing playbook

### 6.1 What to test first (priority order; one variable at a time)
1. **Subject**: close-up face/creature vs object vs scene. Highest impact (creator advice; unverified).
2. **Crop**: tight 80 % subject vs wide scene (creator claim: wide scenic shots lose to tight crops).
3. **Text**: none vs a 2 to 3 word hook vs a number.
4. **Color**: navy+orange vs bright sky blue+orange vs purple radial.
5. **Reaction face**: calm vs wide-eyed excited.
6. **Progression number**: with vs without "$/s" style numbers (only real values).
7. Then thumbnail order in the gallery and the video trailer.

### 6.2 How to run it on Roblox
- Thumbnails: personalization, 2 to 5 active images, always keep your best existing one live, compare QPTR (Documented). Wait at least until each image has several thousand impressions before judging (unverified guideline; Roblox publishes no minimum; table updates after hours).
- Icons: no native test (Documented gap). Options: (a) swap the icon and compare CTR for the same weekday over 7 days; (b) run sponsored ads with different icons to a fixed audience (see numbers below; ads showed poor value in forum reports, so use it only for relative comparison); (c) show icons to 5 friends at 150 px and ask "what is this game?".
- Do not change both icon and thumbnails at once; you cannot attribute the lift.
- Weekday/weekend and mobile/PC split the audience (forum reply): compare like with like.

### 6.3 Reported numbers (all weak evidence; label as such)
| Number | Source | Strength |
|---|---|---|
| +8.5 % average QPTR from thumbnail personalization, some games +50 % | Roblox Creator Hub thumbnails page | Documented (vendor-reported) |
| +0.19 % QPTR and 21 % fewer impressions on non-winners after the "remember winners" update | Roblox staff post, https://devforum.roblox.com/t/thumbnail-personalization-now-remembers-your-existing-winning-thumbnails/3793665 | Documented (vendor-reported) |
| 20 to 40 % click lift for single-subject high-contrast thumbnails vs busy scenes | https://rowatcher.com/news/the-roblox-thumbnail-is-a-conversion-ad-stop-designing-it-like-art (blog citing informal creator reports) | Creator claim, unverified |
| About 3 % CTR "very good" for Roblox ad thumbnails, about 4 % excellent, under 2 % needs work | DevForum commenter in https://devforum.roblox.com/t/need-advice-on-my-games-ad-performance-and-next-steps/4760265 (search snippet) and CallMeDogey (repo notes) | Creator opinion |
| 2.7 % CTR on two ad thumbnails with similar clicks but very different plays | same DevForum thread | Anecdote; says CTR is not the whole story |
| 0.134 % CTR on a sponsored-ad icon | DevForum 2625742 | Anecdote, mixed devices |
| Typical test length: 2 weeks per variable | rowatcher.com suggestion | Creator advice |
| YouTube thumbnail tests: 37 % to 110 % CTR lifts in case studies; the YouTube tool weighs watch time share over CTR | https://www.toptal.com/creator/post/youtube-thumbnail-ab-testing | Not Roblox; method only |
| Fortnite's thumbnail A/B: 90 % confidence threshold, one thumbnail per user, tests run days to weeks, 90-day cap | Epic docs, https://dev.epicgames.com/documentation/fortnite/ab-thumbnail-testing-in-fortnite-creative | Not Roblox; useful method |

### 6.4 Decision rules (my synthesis, unverified)
- Promote a thumbnail only if QPTR beats the incumbent for 3 or more days and it is not worse on average playtime.
- If a new image has high impressions but low QPTR, it is clicky and misleading; remove it and re-check the honesty rules.
- Keep a 5-image rotation: current winner + 4 challengers. Replace the worst each update.

## 7. Concepts for Run a Space Agency
All follow `.agents/rules/agent-hq-art-direction.md`: Mission Control cartoon space, navy `#0B1026`/`#1E1650`, cyan `#2EE6D6`, rocket orange `#FF6B2C`, cash green `#19B46B`, amber `#F5A524`, ink `#1B2333` outline; only things that exist in the game (rockets, spaceport, Earth, orbit rings, Moon, Mars, planets to Titan, mission control panels, satellites, tourists in capsules, cash, supply crates); no real agencies/brands/flags; Mild; no timers, "FREE" or rarity. Text 4 words or fewer. Use real Roblox-blocky style.

### 7.1 Ten icon concepts (512 px, subject fills about 70 %, tested at 150 px)
1. **Giant rocket nose-cone portrait**: orange-and-white cartoon rocket tip rising from the bottom, round porthole with a smiling blocky pilot's face, deep navy radial background, cyan rim light. Text: none. Pattern: mascot + one object.
2. **Rocket + Earth horizon**: chunky blocky rocket mid-launch with a bold orange flame, curve of blue Earth at the bottom, starfield top. Pattern: hero object on dark-to-bright gradient; flame is the warm hook.
3. **Pilot closeup**: friendly blocky avatar in a white suit and glass helmet, huge eyes, cash-green glow reflecting in the visor, orange rocket behind. Pattern: big face.
4. **Rocket tier ladder icon**: three rockets of rising size on a stair, smallest bottom-left, largest top-right, golden shine on the largest. Pattern: progression in one frame; no text.
5. **Run-a-Space-Agency lockup**: "SPACE AGENCY" in two stacked lines, white with thick dark stroke bottom third, rocket above. Pattern: logo lockup; words are the actual game name.
6. **Mission-control hero**: small avatar at a glowing console, giant green launch button with a rocket silhouette on the screen. Pattern: hero + payoff object.
7. **Cash-and-rocket**: rocket with a stack of cash/coin heap at its base, a sprinkle of sparkles. Text: none. Pattern: reward imagery. Only real in-game coins.
8. **Titan journey**: small rocket on a dotted arc approaching a big gradient ringed planet (Saturn-like Titan), bright navy field. Pattern: single dramatic destination; text-free.
9. **Tourist capsule surprise**: capsule with a wide-eyed blocky tourist waving through the window, orange flame below, lunar surface bottom. Pattern: face + humor; Mild slapstick.
10. **Satellite mascot**: a cute satellite with big eyes and solar panel wings on a purple radial burst. Pattern: mascot (creature face) in an unexpected object; fits "tycoon-simulator" icon trends.

### 7.2 Ten thumbnail concepts (1920x1080, nothing important in the bottom 15 %)
1. **Reaction + giant rocket + cash number**: left, wide-eyed blocky avatar; center, a huge orange rocket lifting off; top, a big "+$12,400" in green (real mission payout style). Template T1.
2. **Tier ladder wall**: eight rockets of increasing size labelled by tier icons, avatar proudly holding a model of the biggest, one red-orange arrow pointing at the top rocket. Template T3 (like Pickaxe Tycoon).
3. **Before/after split**: left, tiny single-pad spaceport with one small rocket and a sleepy intern; right, big busy spaceport with multiple rockets and a happy avatar; short label "1 PAD / 10 PADS" or none. Template T2.
4. **Earth to Titan route**: a dotted orbit path across the frame with planets as clean gradient circles (Earth, Moon, Mars, Titan) and a rocket mid-arc; avatar at the left at a console. Shows the map without clutter.
5. **Offline earnings morning**: a bright sunrise over the spaceport, cash pile and a surprised avatar looking at a screen; text "WHILE YOU SLEEP" (4 words or fewer; only if the game gives real offline earnings; it does per the brief).
6. **Mission control control-room**: wide shot of a bright console with panels, avatar pressing a big green launch button, rocket visible through a window. Template T7/T6 hybrid.
7. **Launch day slapstick**: small avatar flipped upside down by the rocket exhaust puff, comic stars and a big grin; humor beats polish (like Build the Pyramid). Mild only.
8. **Rocket factory**: close-up of a half-built rocket with parts floating in and a cartoon wrench; text "BUILD ROCKETS". Template simple crop. Only if rocket purchase/upgrade is the real flow.
9. **Career stages montage**: six small badges along an arc from intern to chief, avatar's outfit changes (only if the six stages exist); label "6 CAREER STAGES".
10. **Tourist capsule close-up**: capsule window with a giggling blocky tourist, Earth huge behind, rocket thrusters glow; humor + warmth. Template T5 (cozy portrait).

### 7.3 Test plan for our first 5-image set
Order: (1) concept 1, (2) concept 2, (3) concept 5, (4) concept 4, (5) concept 3. Always keep the best-performing one active when adding the next. For the icon, start with icon concepts 1, 3, 8 as a sequential swap test.

## 8. Self-check list (before showing the owner)
- Shrink to 150 px: can you name the subject in 1 second?
- Face or creature present? Warm accent against the navy field?
- Text 4 words or fewer, 40 px or taller at 512 px, with dark stroke?
- Nothing in the bottom 15 % that matters, nothing in the outer 5 %?
- Every item exists in the game? No fake numbers, timers, "FREE", rarity, real brands, flags?

## 9. Sources (every URL used)
Official or staff:
- https://create.roblox.com/docs/production/promotion/thumbnails
- https://create.roblox.com/docs/production/promotion/game-icons
- https://create.roblox.com/docs/production/promotion/promotional-thumbnails
- https://devforum.roblox.com/t/thumbnail-personalization-now-remembers-your-existing-winning-thumbnails/3793665
Creator/community:
- https://devforum.roblox.com/t/is-my-game-icon-actually-this-bad-horrible-click-rate/2625742
- https://devforum.roblox.com/t/thumbnail-got-me-a-warning-while-icon-didnt/2643599
- https://devforum.roblox.com/t/need-advice-on-my-games-ad-performance-and-next-steps/4760265 (via search snippet only)
- https://rowatcher.com/news/the-roblox-thumbnail-is-a-conversion-ad-stop-designing-it-like-art
Method references from other platforms:
- https://www.toptal.com/creator/post/youtube-thumbnail-ab-testing
- https://dev.epicgames.com/documentation/fortnite/ab-thumbnail-testing-in-fortnite-creative (via search result)
Live data pulled and inspected (public APIs, 2026-10-24):
- https://apis.roblox.com/explore-api/v1/get-sort-content (top-playing-now, top-trending, up-and-coming, top-revisited, top-earning, top-rated sorts)
- https://thumbnails.roblox.com/v1/games/icons (512 and 256 px icons, all 100 queried universe IDs returned Completed)
- https://thumbnails.roblox.com/v1/games/multiget/thumbnails (768x432 gallery images)
- https://games.roblox.com/v1/games?universeIds=... (names)
Existing repo notes (not re-summarized): `.agents/rules/agent-hq-art-direction.md`, `research/video-notes/roblox-art-direction-sources.md`.
Low-quality SEO pages surfaced by search and not relied on: several mirror domains (compagnie-des-sens.fr, lpc.events, ccar-nyc.org, otoy.com).
Not verified: Roblox's official thumbnail-rejection list for still images; any minimum sample size for personalization; live CTR numbers for specific top games (Roblox does not publish them).

# UI standard (ui, designer, thumbnails; kid-tester and playtester when judging screens)

Read with `anti-slop.md`. House kit: `lihfolk:lihfolk-ui` and the game's Theme tokens.

- Every colour, size and timing comes from the Theme. Change the Theme, never a hex inside a component.
- Text is at least 15 design units; `TextScaled` only with a size cap or truncation; contrast meets AA; bright slabs keep the ink stroke.
- Tap targets are at least 44 px drawn (52 units with the hit pad) and 8 px apart. Interactive UI sits in the safe-area layer.
- States are complete: default, hover, pressed, disabled, locked, claimed, loading, empty, error. Locked and claimed never differ only in hue.
- Motion: pop with Scale, never Size tweens; never animate stroke thickness on text; everything stops under Reduced Motion.
- Layout is checked at all five viewports, phone first. One primary action per screen.
- Icons are drawn assets from the kit, never emoji. Shop copy is neutral: no "FREE", fake timers, paid luck or power.
- Another game's screenshot is not a spec: extract its grid, sizes, colours and states, then draw ours.
- Concepts and mockups come from Claude Design (PC and phone artboards) or the Antigravity lane, never drawn in code first.

Sources: LihFolk Vault V2 (CC BY 4.0): "LihFolk UI Spec", "LihFolk UI Design System"; the owner's taste-skill rules.

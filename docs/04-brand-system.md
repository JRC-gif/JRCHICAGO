# Brand System: v0 (provisional)

Built for the first site build on Oct 19, 2026. Revisit after the "Junior" story and the dream motif are decided. Everything here maps to CSS variables in `public/assets/styles.css`.

## Idea

Chicago at full gloss. The Chicago flag's light blue and red star, rendered the way Jeff Koons renders a balloon: oversized, glossy, a little absurd. The star is the one loud thing. Everything around it stays quiet and disciplined.

## Color

| Token | Hex | Use |
|---|---|---|
| --sky | #BCE2F6 | Flag blue. Hero, page headers, header bar |
| --red | #D7192C | The star and the primary action. Use sparingly |
| --red-deep | #A30F1F | Pressed/hover states, red text on sky |
| --ink | #0F1F3D | Text, rules, footer |
| --ink-soft | #3B4B6A | Secondary text |
| --mist | #EEF7FC | Quiet alternate sections |
| --white | #FFFFFF | Base background |

Contrast: white on red and ink on sky both pass WCAG AA. Avoid --red for small text on --sky; use --red-deep instead.

## Type

One family: **Bricolage Grotesque** (Google Fonts, variable). Headlines use it condensed (width 75–78) and heavy (800), set tight. Body uses it at normal width with optical size 14. Sentence case everywhere. No all-caps labels.

Scale: 0.875 / 1.125 (body) / 1.375 / 2 / 3.5 / 8rem (display), fluid with clamp().

## Mark

Wordmark: a red six-pointed Chicago star plus "Junior Chicago" set in the condensed heavy cut. A real logo is still to be designed.

## Signature interaction

"Press the star." A glossy, inflatable Chicago star. Each press inflates and squishes it, and floats a "+1". Messages fire at milestones. At 24 presses it pops into a burst of small stars and says: "Pop. That's the idea: bigger than it needs to be." followed by an inquiry link. A lifetime counter shows "Stars popped: N". Keyboard accessible, and it respects reduced motion.

## Voice

Confident, specific, a little playful. Short sentences. Say what something does, not how great it is.

- Yes: "Three vendors. One studio." / "Got something that should be bigger?"
- No: "Elevate your brand." / "Innovative solutions." / "Let's create magic."

## Layout principles

- Left-aligned, big type, generous space.
- Work is shown as an index of rows (title, hook, pillar), not a card grid.
- Thick ink rules carry structure; no drop shadows except the form card and the star.
- Numbering only where content is truly a sequence (the "How a project starts" steps).
- Yellow placeholder highlights are deliberate, so nothing unconfirmed ships.

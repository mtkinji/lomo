# Floating Object-Detail Header Exploration

## Current experiment

Arc, Goal, and To-do detail pages keep their existing, intentionally different
cover treatments:

- Arc keeps its tall identity-oriented cover and parallax behavior.
- Goal keeps its medium-height cover and current sheet transition.
- To-do keeps its compact cover so executable content arrives sooner.

The experiment changes only the fixed control treatment shared by those pages.
Back, star/share, and overflow controls remain fixed and retain their individual
material pills while the page scrolls. The cover may still fade or collapse, but
the header must not introduce an empty, opaque, full-width strip behind the
controls. Page content remains visible behind the floating controls.

## Why this is the first step

The three pages currently demonstrate useful differences in cover height and
object hierarchy. Testing the transparent floating-control treatment across all
three isolates the header decision from the later question of which cover
treatment best fits another object type.

## Runtime acceptance checks

- At the top, controls remain legible over each cover image.
- During and after cover fade, controls stay fixed.
- No full-width white or blurred header strip appears.
- Scrolling content remains visible behind the controls.
- Existing Arc and Goal parallax/fade behavior remains intact.
- To-do retains the smallest first-viewport image footprint.
- Back, share/star, and overflow actions remain tappable and accessible.

## Deferred category decision

Money Category Detail is not changed in this experiment. If the floating header
proves successful across Arc, Goal, and To-do, review whether Category should use
the same control treatment and separately choose its cover height. The current
working preference is the To-do-sized compact cover, but that is a subsequent
prototype rather than part of this branch's first change.

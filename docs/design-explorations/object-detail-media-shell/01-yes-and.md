# Yes-And: Object Detail Media Shell

## Original idea

Extract Kwilt's existing hero-to-sheet behavior into a shared body component,
then use it on Recipe Home with dignified missing-photo states, multiple Meal
photos, full-width practical facts, one relationship-prioritized Reviews
stream, and explained recommendations at the end.

## Adjacencies

**Yes, and what if it could...** make adding a Meal photo feel like preserving
something worth remembering rather than completing a missing field?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: turns an optional image from catalog maintenance into a small
  act of keeping family food knowledge.
- New value: a contextual invitation after cooking or from the cover itself can
  add a photo without interrupting reading, planning, or cooking.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the invitation is quiet, dismissible, and never
  framed as an incomplete profile or required task.

**Yes, and what if it could...** let a Meal's photos accumulate across real
cooks while one selected image remains the calm cover?

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the Recipe can retain a lived visual history without turning
  its hero into a noisy album.
- New value: multiple photos become useful evidence and memory; cover selection
  remains deliberate and reversible.
- Cost delta vs. original: medium
- Anti-pattern check: pass if capture ownership and visibility stay explicit
  and the default hero presents one focused image rather than a collage.

**Yes, and what if it could...** prioritize Reviews from people the reader
knows without splitting the page into social categories?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: practical cooking experience becomes more relevant because
  trusted relationships influence ordering, not because Kwilt manufactures a
  social feed.
- New value: one stream can rank the reader's own review first, then eligible
  visible reviews from connections, then other useful reviews.
- Cost delta vs. original: medium
- Anti-pattern check: pass only if relationship affects ordering after
  visibility checks; it must never reveal a private Cook note or household
  relationship through review placement.

**Yes, and what if it could...** distinguish reviews grounded in a completed
Kwilt Cook session from reviews submitted without a Cook receipt?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: review evidence becomes more interpretable without forbidding
  useful experience that happened outside Kwilt.
- New value: a restrained "Cooked in Kwilt" provenance cue can improve trust;
  it is evidence of a recorded session, not proof that the opinion is correct.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it remains provenance rather than a status badge,
  gate, score multiplier, or gamified achievement.

**Yes, and what if it could...** explain each recommended alternative in the
language of the decision the person is making now?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: "this one is not right" becomes a quick continuation toward a
  plausible Meal rather than a dead end or generic content rail.
- New value: reasons such as "quicker tonight," "another French dinner," or
  "similar ingredients" make the alternative inspectable.
- Cost delta vs. original: medium
- Anti-pattern check: pass if reasons come from authorized, current evidence and
  the rail is not ranked by engagement, public popularity, or pressure.

**Yes, and what if it could...** preserve the person's browsing context when
they open an alternative and return?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: exploration becomes reversible and calm instead of repeatedly
  dropping Maya at the top of a catalog.
- New value: return restores the prior Recipe and scroll position; the
  recommendation rail behaves like considered browsing, not navigation churn.
- Cost delta vs. original: low to medium
- Anti-pattern check: pass; this reduces repeated work and adds no new concept.

**Yes, and what if it could...** make every cover-capable object prove the same
motion, fallback, accessibility, and large-text contract?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: consistency becomes dependable behavior rather than visual
  resemblance.
- New value: one state matrix can cover photo, curated artwork, generated
  artwork, intentional fallback, one/many media, Reduce Motion, large text,
  attribution, and header/sheet thresholds across Arc, Goal, To-do, and Meal.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the shared shell standardizes behavior while each
  object retains its appropriate meaning, content, and scale.

## Job elevation

The larger opportunity is not a generic object-page framework or a social
Recipe network. It is a dependable media-bearing object grammar that helps a
person recognize what matters, preserve lived evidence, and continue a decision
without requiring every object to look identical or every Meal to have a photo.

## Frame recommendation

**Run the design-thinking loop with the original frame.** The frame already
contains the right system boundary and the meaningful Meals extensions. Carry
forward quiet post-cook photo capture, relationship-aware review ordering,
explained alternatives, context restoration, and a shared state matrix as
design requirements. Do not expand the work into a universal object-detail
component, a public social graph, or engagement-ranked discovery.

# Pet Engine Study 22 — Life Echoes

## Frame and system alignment

> The things I do in Kwilt that represent progress in life should matter inside
> this beautiful tiny world too.

When Charlie completes something, focuses, or plays with someone, they want the
meadow to remember that kind of life in a warm, recognizable way, so returning
to Moss feels connected to who they are becoming rather than detached pet play.

- **Audience:** `audience-aspirational-family-organizers`
- **Representative persona:** Maya, pressure-tested through Charlie as a
  provisional teen participant
- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active JTBDs:** `jtbd-carry-intentions-into-action`,
  `jtbd-see-who-im-becoming`, `jtbd-help-us-enjoy-being-together`, and
  `jtbd-trust-this-app-with-my-life`
- **Job-flow gap:** Family participation is 2/5 and continued use is 3/5.
- **Constraint posture:** Extend the existing bounded habitat-memory system.

The prototype already gives each meaningful action an immediate consequence:
a To-do opens a bloom, Focus becomes shared stillness, and Play stirs wind and
invites wildlife. Only the To-do bloom survives a return visit. The world can
therefore feel more responsive to productivity than to attention or connection,
which is not the intended value system.

**Design challenge:** How might we help Charlie see that doing, focusing, and
being together all leave beautiful traces in Moss's world, while preserving
privacy, one daily care moment, calm recovery, and no score or task history?

## Yes-and decision

This is a bounded system completion, so broader expansion is intentionally
skipped. The job elevation is from “one action rewards the Pet” to “different
ways of living gently shape a place we share.” Keep the existing Pet capability,
fake prototype receipts, and renderer-neutral scenery boundary.

## Divergence

### 1. One recolored flower

Every qualifying action opens the same flower with a source-specific color.
This is simple and coherent, but Focus and shared Play would still read as
variants of task completion rather than meaningfully different parts of life.

### 2. Three small habitat memories

A completed To-do opens the existing upright bloom. Focus leaves one pale
stilllight near the old tree. Playing together opens two seedheads leaning
toward one another. All use the same bounded, privacy-safe memory contract and
can be revisited by Moss. Difference lives in silhouette and behavior, not a
legend, count, or label in the consumer world.

### 3. No persistence; stronger episodes only

Keep every source transient but make its immediate scene more cinematic. This
protects simplicity, yet fails the requested connection between real-life
progress and a world that changes over time.

All alternatives leave Arc, Goal, Activity, and Chapter ownership unchanged.
They never block capture, expose private content, auto-anchor an Activity,
score Forces, create a chores economy, or make the Pet dependent on completion.

## Convergence

Choose **three small habitat memories**.

The smallest elegant version extends the existing `WorldBloom` contract to
three source classes without storing names, text, duration, people, Goal/Arc
links, or timestamps. The last four memories survive locally; older scenery
falls away quietly. To-do, Focus, and Play each create at most one new visual
trace when their simulated receipt fires. Moss can notice and revisit any trace
through the existing memory behavior and living-day director.

No gallery, map, journal, streak, counter, filter, tooltip, legend, collection,
rarity, inventory, or source badge is added to the consumer surface. Prototype
inspector text may expose source classes for diagnosis. The daily care rule is
unchanged: additional actions can alter bounded scenery but cannot create more
food, care days, or evolution progress.

We are betting that distinct persistent traces for attention, action, and
connection will make the world feel meaningfully linked to life without turning
it into a gamified activity log. If users read the traces as rewards to grind,
the next revision should reduce frequency and persistence rather than add
explanatory UI.

## Learning release

The private site gains one renderer-neutral life-echo source union and three
Canvas silhouettes. Existing version-one To-do memories restore unchanged.
Focus completion plants a stilllight after the shared session. Play plants a
paired seedhead while retaining its breeze-and-visitor episode. The living-day
director continues to receive only bounded scenery positions.

## Evaluation

At phone scale:

1. reset, complete one To-do, and watch the upright bloom open;
2. finish Focus and confirm one pale stilllight remains near the old tree;
3. Play together and confirm paired seedheads grow while the visitor episode
   still occurs;
4. tap or wait for Moss to revisit each kind;
5. reload and confirm only source class, position, and completed growth return;
6. exceed the memory bound and confirm old scenery retires quietly;
7. confirm one-care-moment-per-day and evolution thresholds do not change;
8. repeat under rain and Reduce Motion.

Supporting evidence is immediate source-specific scenery, persistence without
private receipt content, unchanged care availability, one bounded memory list,
and calm generic revisit behavior. Disconfirming evidence is an apparent task
score, clutter, a second progress track, source text exposure, Play losing its
visitor, Focus planting before completion, or a missed day removing scenery.

## Spec refinement

Source validation, bounded persistence, placement, and command sequencing are
logic and require tests first. Pixel silhouettes and subtle stilllight pulse
are implementation-led. The first release stores only `todo`, `focus`, or
`play`; actual Kwilt receipt integration, people, task text, dates, analytics,
cross-device sync, source legends, and more memory species are deliberately
deferred. No user-owned decision remains before implementation.

## Observed prototype evidence

Browser QA at a 390 x 844 mobile viewport confirmed the full command sequence:
To-do added an upright trace, Play retained its breeze and sky-moth episode
while adding a paired trace, and Focus added its stilllight only after the
fifteen-second session completed. The inspector ended with the bounded source
order `todo · todo · play · focus`; the fifth write retired the oldest memory.
No receipt text, person, duration, date, Goal, Arc, camera, Pet position, or
visitor state appeared in serialized memory tests.

The first visual pass was coherent but too quiet against the higher-fidelity
painted meadow. The silhouettes were enlarged within the same crisp-pixel
vocabulary so they read as small habitat objects rather than loose pixels. This
is desktop-browser proof at a phone viewport, not signed iPhone proof or Kwilt
receipt integration.

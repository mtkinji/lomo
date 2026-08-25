# Frame: Onboarding-Informed Capability Pins

## Review cadence

Check in after each phase. This is an early product decision about whether first-install intent
should configure the capability menu, not an implementation request.

## What the user said

> We could choose which capabilities are pinned or unpinned based on some user preferences during
> onboarding. We could start with our default recommendation and then let the user choose. That
> could help the app feel more personalized when they land.

## Restated in user voice

When I first arrive in Kwilt, help the parts of the app that matter to me feel close at hand, so I
can recognize this as my place without first learning or maintaining Kwilt's navigation system.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

Maya is the strongest pressure test because several Kwilt capabilities may genuinely matter to
her, but she does not want to configure another productivity system before it becomes useful.

## Representative persona

Maya, arriving with one immediate reason to try Kwilt while remaining open to other ways it may
help her family.

- Current situation: One household need is salient enough to bring her into Kwilt.
- What she is trying to become/do: Make ordinary family life easier without adopting a system she
  must constantly organize.
- Emotional state or tension: Interested, but unwilling to do speculative setup.
- What would make this feel wrong: A long capability checklist, unexplained disappearing
  destinations, or a first-run choice that permanently narrows what Kwilt appears able to do.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to
grow.

## Job flow step

This most directly affects step 8 of `job-flow-maya-move-family-life-forward`: keep using the
system because it feels helpful, not fussy. That step currently scores 3/5, with explicit risk
that too much configuration makes adoption fragile. It also affects the earlier recognition and
next-action moments by changing what the shell makes immediately visible.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - The menu should make the user's current area of intent
  easy to return to.
- `jtbd-trust-this-app-with-my-life` - Personalization must be legible, reversible, and must not
  make capabilities seem deleted.

## serves snippet

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

The capability drawer is intentionally broad. Its default primary area currently contains
Budgets, Chores, Recipes, Groceries, To-dos, Plans, and Goals, while Arcs, Chapters, Games, and
Explore sit under More. A new person can land in a relevant capability but still open a menu that
looks like the same generic Kwilt setup for everyone.

The danger is that solving this with an onboarding configuration step makes Maya curate the app
before she has enough experience to know what she values. A one-time preference answer is also a
weak basis for hiding durable navigation destinations.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: The capability side sheet has a primary area and a collapsible More area.
- Existing user flow: Long-pressing any capability exposes Pin or Unpin, with a brief receipt.
- Existing domain/data model: Per-user persisted pin overrides store only deviations from the
  product defaults.
- Existing default: Budgets, Chores, Recipes, Groceries, To-dos, Plans, and Goals are pinned;
  Arcs, Chapters, Games, and Explore are in More.
- Existing onboarding signal: Capability-routed onboarding asks the person to choose an outcome,
  persists the selected path, and hands off into the real capability.
- Existing onboarding principle: The universal layer should help the person recognize the success
  they came for without making them understand or configure the portfolio.
- Existing analytics: Pin-menu opens and pin changes are already observable.

Constraints to preserve:

- Start from a useful recommended menu, not a blank or user-assembled shell.
- Ask about desired outcomes in ordinary language, not capability or navigation terminology.
- Keep every capability discoverable and make any personalization reversible.
- Do not add another onboarding question when an existing choice already supplies enough signal.
- First value belongs to the chosen capability; arranging the drawer is not onboarding success.

Constraints we may challenge:

- Every new user needs exactly the same primary capability set.
- A pin change must always begin with a long press in the drawer.
- A first-run preference should remain fixed when later behavior provides better evidence.

Design implication:

The promising version is not a dedicated "choose your pinned capabilities" onboarding screen.
It is to let the existing outcome choice produce a small, visible starter-menu recommendation,
while retaining the accepted defaults and ordinary Pin/Unpin controls. The onboarding signal may
promote the chosen capability or cluster, but should not silently demote unrelated defaults based
on one answer. A more aggressive custom set should require an explicit preview and confirmation.

## Aspirational design challenge

How might we help Maya see the part of Kwilt she came for reflected in her first landing and menu,
while preserving a calm recommended structure and keeping the rest of Kwilt easy to discover?

## Out of scope

- Implementing new onboarding screens or pin logic.
- Reordering capabilities independently of pinning.
- Server-synced preferences or household-wide menu configuration.
- Automatically inferring interests from sensitive content.
- Changing which capabilities are available or release-ready.

## Open question

Should the onboarding outcome only promote its matching capability cluster within the recommended
menu, or should Kwilt show a one-screen preview where the user can explicitly replace the
recommended set?

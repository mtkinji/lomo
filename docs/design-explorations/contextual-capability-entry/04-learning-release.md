# Learning Release: Contextual Capability Entry

## Concept To Build

Build a polished, development-gated first-start reel in which a person swipes through ranked,
illustrated Kwilt value doors, starts the displayed capability immediately, or enters the real app
with its capability navigation already open and unobscured.

## Capability Delta

Today, the user cannot:

- move from the balanced Welcome into a sequence of spacious, actionable value stories;
- swipe left or right anywhere across every onboarding page;
- start Money, Meals, Goals, or Chat from the value moment that explains it;
- understand the budget-linked app-control wedge during first start; or
- skip directly into the real shell while seeing the navigation they will use later.

After this release, the user can:

- move through four ranked value doors after Welcome;
- choose **Try it now** or **Open Chat** from the relevant story;
- swipe backward and forward without finding a small gesture target;
- choose **Explore Kwilt** from any value door;
- see the onboarding indicators end as the real capability menu appears; and
- follow each door into a real existing capability route or setup path.

Still intentionally not supported:

- normal production first-launch replacement;
- all six eventual doors;
- unready Chores or Games promotion;
- per-user ranking or dynamic experimentation;
- a production claim that Money-linked Screen Time enforcement has passed signed-device,
  TestFlight, or longitudinal-use proof;
- a full redesign of each capability's FTUX; or
- automatic completion based on route arrival.

## User Experience

### Entry

Andrew launches **Capability onboarding** from Developer Tools. The existing persisted development
record can be reset there for repeated evaluation. Normal first launch remains unchanged.

### Sequence

The development reel contains:

1. **Welcome to Kwilt**
2. **Put spending apps behind your budget**
3. **Make meals easier**
4. **Set goals and make a plan**
5. **Ask Kwilt for help across the app**

This four-door set is enough to test:

- the lead-position Money hypothesis;
- a coordinated cross-capability promise;
- a familiar household value loop;
- the accepted original Kwilt creation journey; and
- Chat as a dedicated connective moment.

It deliberately omits Chores and Games until their first-start journeys and visual stories meet the
same quality bar. The release tests the architecture with a credible range of doors rather than
filling the six-door budget.

### Page anatomy

Each value door contains only:

- the small Kwilt mark;
- one illustration in the established Kwilt art direction;
- one direct headline;
- one short explanation;
- one primary action;
- **Explore Kwilt** as a quiet secondary action; and
- page indicators.

There is no eyebrow, feature list, progress bar, instruction to swipe, back button, capability
card, or bottom guide.

### Interaction

- A horizontal swipe that clearly exceeds vertical movement can begin anywhere on the page.
- Left moves forward; right moves backward.
- A partial swipe tracks the finger and either settles to the neighboring page or returns.
- Vertical scrolling wins when large text or a compact viewport makes the page scrollable.
- Tapping an indicator region provides an accessible next-page equivalent without introducing a
  visible Continue button.
- VoiceOver exposes previous/next accessibility actions and announces page position.
- Reduce Motion changes pages without full horizontal travel.

### Direct doors

#### Money and Screen Time

**Try it now** enters a coordinated development path:

- an account with an existing Money category goes directly to that category's app-control setup;
- an account without the minimum Money state enters the current Money first-use setup and resumes
  toward app control afterward;
- the person chooses an app through Apple's opaque picker and a condition such as **At 95% used**,
  **When over**, or **When this category is hot**; and
- the path lands on the native Money category with the active policy visible.

The learning release must not record first value merely because Money opened. First value requires
an active budget-linked policy with authoritative Money and Screen Time state. Actual enforcement
remains a separately named signed-device gate.

#### Meals

**Try it now** enters the existing Food onboarding and meal loop, then opens the real Recipes list
for the person's first meal choice. It does not introduce an onboarding-only meal picker.

#### Goals and Plans

**Try it now** enters the accepted original question-led Arc/Goal journey. It does not flatten that
journey into the illustrated setup archetype.

#### Chat

**Open Chat** enters a fresh mobile Chat surface. The value story explains supported cross-
capability help; it does not insert a synthetic conversation, auto-send a prompt, or imply that
unsupported operations are available.

### Explore handoff

Choosing **Explore Kwilt**, or swiping left from the last door, ends the onboarding pager and opens
the existing `CapabilitySideSheet`:

- the real menu is fully visible;
- no overlay, guide, or scrim obscures lower rows or footer actions;
- page indicators disappear;
- the ordinary menu gesture contract takes over; and
- no capability first-value event is emitted.

The app uses its ordinary initial destination behind the open side sheet. The learning release does
not add a temporary onboarding home screen.

## Existing Product Relationship

This release replaces the development-only `CapabilityPathChooserScreen` with a value-door pager.
It keeps and extends:

- `CapabilityWelcomeScreen` for the first page;
- `CapabilityOnboardingHost` for orchestration and resumption;
- the existing onboarding contract and readiness filter;
- Food onboarding and the Recipes-list handoff;
- the original question-led Goal/Arc FTUX;
- Money category and app-control surfaces;
- unified Chat;
- `CapabilitySideSheet` and `CapabilityMenu`; and
- the existing accessibility and Reduce Motion conventions.

Normal production FTUX, the native capability menu, capability domain ownership, and first-value
definitions remain unchanged.

## Buildable Slice

### Must be real

- A single horizontal pager that owns Welcome and all value doors rather than coordinating
  separate animated screens.
- Full-surface bidirectional gesture recognition with vertical-scroll arbitration.
- Correct settle, cancellation, interruption, rotation/viewport, and Reduce Motion behavior.
- Persistent current-door state and honest resume after relaunch.
- The exact editorial order listed above, derived from readiness-qualified development contracts.
- Four visually complete door compositions at iPhone 17 Pro size and accepted behavior at supported
  compact and large-text layouts.
- A final-quality reuse of the current Welcome illustration.
- Purpose-made or approved existing illustration treatments for Money/app control, Meals, and Chat;
  the Goals story may reuse an original Kwilt illustration when it remains semantically accurate.
- Direct handoffs to Money/app control, Food onboarding, original Goal FTUX, and Chat.
- **Explore Kwilt** opening the real capability menu without an overlay.
- VoiceOver labels/actions, Dynamic Type behavior, and Reduce Motion parity.
- Bounded analytics for door viewed, position, direct start, Explore, and authoritative capability
  completion where that capability currently emits it.
- No private Goal, financial, app-selection, recipe, or Chat content in onboarding analytics.

### Can be thin or temporary

- The door story and illustration fields may live in the development onboarding contract rather
  than a generalized remote-content system.
- Ranking remains a checked-in constant; no experiment service or remote configuration is needed.
- The Money coordinator may reuse current first-use and category app-control screens with minimal
  routing glue rather than receiving a new visual FTUX.
- Analytics may be inspected through development logs/PostHog development events before a formal
  funnel exists.
- The menu entry for revisiting **What Kwilt can help with** may wait until the first-start reel is
  accepted.
- Only the active development user's persisted pager state needs migration handling.

### Intentionally excluded

- New backend tables or migrations.
- Production entry-policy changes.
- Chores, Games, generic Screen Time, Groceries-only, Explore-only, or separate Money destination
  doors.
- A/B testing, adaptive ordering, acquisition campaigns, or App Store attribution.
- New permissions before a person starts the relevant capability.
- Onboarding checklists, badges, completion percentages, reminders, or unread indicators.
- A bottom guide over navigation.
- Sample financial values or a fake successful Screen Time receipt presented as real.
- New illustrations for excluded doors.

## Release Channel

**TestFlight build**, with the reel reachable only through Developer Tools.

A Simulator/local build is sufficient for layout and pager iteration, but it cannot prove the most
important lead-door behavior: Apple's Screen Time selection, shield, handoff, and threshold-driven
restriction on a signed physical device. An internal TestFlight build provides a real installed
bundle and entitlement environment while keeping the experiment invisible to ordinary first
launch and external users.

The evaluation sequence is:

1. source and focused tests;
2. iPhone 17 Pro Simulator visual and interaction review;
3. signed physical-device Money/app-control exercise;
4. internal TestFlight installation and full dev-tool rehearsal; and
5. repeated Andrew dogfood sessions before any production-entry discussion.

These are separate evidence gates; passing one does not imply the next.

## Brand-Goodwill Guardrails

- The reel is invisible outside Developer Tools.
- Every included page is visually complete enough to evaluate as Kwilt, not framed as placeholder
  onboarding.
- No door advertises a result whose button leads only to an empty or unrelated home screen.
- Money copy names a user-chosen threshold and reversible pause; it does not use tough-love,
  failure, punishment, or “zero willpower” framing.
- Money screens distinguish plan, actual spending, freshness, threshold, selected app, desired
  policy, applied restriction, and temporary-open state.
- The Money door is not declared proven until a signed device actually enforces the selected rule.
- Chat copy names supported capability actions and confirmation boundaries.
- **Explore Kwilt** is always available and never sounds like abandoning setup.
- No new illustration is commissioned merely to fill an unready capability slot.

## Reversibility

- Keep the reel behind the existing development release stage and Developer Tools entry.
- Preserve the production entry policy and current FTUX fallback.
- Store no new server data and perform no irreversible migration.
- Keep story metadata and ranking in the development contract so the pager can be removed without
  changing capability records.
- Capability data created after **Try it now** follows ordinary native ownership and deletion rules;
  removing the reel does not orphan it.
- A failed TestFlight build can hide the Developer Tools entry or restore the development card
  chooser without touching production onboarding.

## Permanent Product Threshold

The concept can move toward accepted production capability only when:

- the reel feels balanced, clear, and energetic in Simulator and installed-device review;
- full-page gesture, Dynamic Type, VoiceOver, and Reduce Motion behavior pass;
- people can identify each value story and understand that the page is also a door;
- Goals and Meals reach their authoritative native first values through the new handoff;
- Chat opens with an accurate understanding of its supported scope;
- Money produces a durable budget-linked app-control policy and signed-device enforcement;
- the real-menu transition is understandable without a bottom guide;
- interruption and relaunch resume honestly;
- no included door depends on fake data or an unproven success receipt; and
- the evaluation plan yields enough evidence to decide whether one-outcome-per-page and Money-first
  should survive.

Production default still requires a separately reviewed entry-policy change and sufficient
production-qualified doors. A successful internal TestFlight rehearsal does not authorize that
promotion by itself.

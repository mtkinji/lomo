# Diverge: tag-groups

Axis of variation: user-driven retrieval vs. AI-shaped vocabulary vs. structural model change.

## Alternative 1: Tag Groups As Saved Single-Tag Views

Turn meaningful tags into openable groups in the Activities list. A group is backed by one tag filter, not by multi-tag list sectioning. The user sees common/recent tags like Groceries, opens one, and gets a focused list. Quick Add inside that group inherits the tag.

- Audience/persona fit: Strong for Maya because it makes family errands findable without teaching her filter logic.
- Design-challenge answer: It helps her pull up a familiar group at the moment of action while preserving capture-first simplicity.
- System-fit note: Reuses `Activity.tags`, `activityTagHistory`, `FilterGroup`, and existing Quick Add defaults from tag filters.
- Best when: Users have practical recurring groups like Groceries, School, Church, Returns, Calls, or Appointments.
- Fails when: Users expect nested tags, multiple tag facets, or every tag to become a visible section.
- Primer anti-pattern check: Pass; it touches Activities only, blocks no capture, and avoids dashboard language.

## Alternative 2: Primary Tag Plus Secondary Tags

Keep multiple tags on an Activity, but teach the system to treat one as the primary grouping tag. AI suggestions can include a primary tag for retrieval and optional secondary tags for context. Group displays use only the primary tag, avoiding duplicate placement.

- Audience/persona fit: Good if AI keeps creating useful secondary tags, but it may introduce a concept Maya has to understand.
- Design-challenge answer: It reduces multi-tag ambiguity while preserving richer metadata.
- System-fit note: Requires either a new `primaryTag` field or a convention in tag ordering. That is a larger model change than V1 needs.
- Best when: Kwilt needs both retrieval groups and metadata tags to power AI/planning.
- Fails when: The UI exposes too much taxonomy maintenance or AI picks a primary tag the user disagrees with.
- Primer anti-pattern check: Pass only if primary tag is optional and reviewable; auto-changing group identity would violate trust.

## Alternative 3: Tag Inventory And Reuse-First Editing

Improve the tag field itself: show existing tag chips from history, recent/frequent suggestions, and a clearer compact input. AI and deterministic fallback prefer existing tags, exact user terms, and one or two reusable tags.

- Audience/persona fit: Strong as a supporting improvement because it reduces tag drift and weird spacing.
- Design-challenge answer: It makes the grouping vocabulary stable, but does not by itself give Maya a one-tap Groceries group.
- System-fit note: Reuses `activityTagHistory` and Activity detail tags. Mostly UI plus prompt/fallback changes.
- Best when: The current tag field feels immature and users are creating variants like groceries, grocery, shopping, and errands.
- Fails when: Users need the retrieval path more than better editing.
- Primer anti-pattern check: Pass; optional suggestions preserve capture-first behavior.

## Alternative 4: Full Multi-Tag Grouping

Add "Group by tags" to list grouping and show each to-do under every tag it has, or choose a deterministic rule for which tag wins.

- Audience/persona fit: Weak for Maya because it exposes complexity that belongs inside the system.
- Design-challenge answer: It technically groups by tags, but creates confusion around duplicates, ordering, collapsed state, and "None."
- System-fit note: Extends `ActivityGroupingField` and `activityGrouping.ts`, but the product semantics are not settled.
- Best when: Users explicitly want tag analytics or tag-by-tag reviewing.
- Fails when: Activities have several AI tags, which is the current problem.
- Primer anti-pattern check: Risky; it trends toward productivity-app taxonomy management.

## Alternative 5: Natural-Language Tag Search

Let the user type or ask "show groceries" and resolve that to a tag-filtered list when the term matches tag history. No visible tag group browser is needed.

- Audience/persona fit: Good for AI-native users, weaker for Maya if she wants a predictable group she can tap while shopping.
- Design-challenge answer: It makes retrieval easy but less visible.
- System-fit note: Could reuse global search and view creation, but needs a stronger disambiguation path.
- Best when: The user already expects AI command/search behavior.
- Fails when: The user wants a saved place rather than a one-off query.
- Primer anti-pattern check: Pass if AI does not pretend to know intent when multiple matches exist.

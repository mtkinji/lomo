# Reference Loops

These references are interaction evidence, not visual templates.

## Loop 1: Browse → choose → plan

- [Paprika iOS user guide](https://paprikaapp.com/help/ios/) — a recipe exposes
  direct actions into the meal planner and grocery list; secondary actions live
  elsewhere.
- [AnyList meal planning](https://www.anylist.com/meal-planning) — recipes open
  directly from the plan; notes cover leftovers and eating out; the plan can
  generate the relevant ingredients.
- [AnyList Meal Plan Queue](https://help.anylist.com/articles/meal-plan-queue/) —
  adding a recipe to the plan begins from the recipe already in view.
- [Plan to Eat basics](https://learn.plantoeat.com/en/help/getting-started-the-basics)
  — the product teaches one Save → Plan → Shop relationship.

Kwilt adaptation: keep direct add/remove in inventory and detail, then make the
durable Plan drawer advance into the active plan. Do not import the competitors’
calendar-first assumption.

## Loop 2: Decide → review → shop

- [Apple grocery lists in Reminders](https://support.apple.com/en-us/105086) —
  categorized items are the main surface; corrections teach later grouping.
- [Paprika iOS user guide](https://paprikaapp.com/help/ios/) — pantry items are
  excluded during ingredient review and combined items stay inspectable.
- [Plan to Eat shopping-list organization](https://learn.plantoeat.com/help/sort-group-and-combine-items-on-your-shopping-list)
  — combined quantities retain recipe attribution and expand for detail.
- [Plan to Eat shopping-list overview](https://learn.plantoeat.com/en/help/shopping-list)
  — adding custom items, removing what is already at home, and retailer handoff
  remain list behaviors rather than a separate workflow.

Kwilt adaptation: show review only when needed, keep aisle items primary, retain
Why? provenance, and reveal savings and household extras after the list.

## Loop 3: Shop through interruption → recover without doubt

- [Paprika offline access](https://paprikaapp.com/windows/) — recipes and other
  core data remain available from local storage; cloud sync is an enhancement,
  not a prerequisite for using the object already in hand.
- [AnyList weekly shopping](https://help.anylist.com/articles/weekly-shopping/)
  — the durable grocery list is reused and remembers the user's list-specific
  organization instead of treating every trip as disposable output.
- [Apple grocery lists in Reminders](https://support.apple.com/en-euro/guide/iphone/iph80ba26e1f/ios)
  — checkable items and remembered categorization remain the primary, familiar
  interaction; account-backed features do not replace the list itself.
- [Apple typography guidance](https://developer.apple.com/design/human-interface-guidelines/typography)
  — Dynamic Type needs scalable text and layouts that adapt when content grows,
  including meaningful icons rather than fixed single-line compression.

Kwilt adaptation: keep the saved list fully checkable without connectivity,
label queued device-local changes plainly, and reconcile them against the latest
authoritative revision on refresh. Separate checkbox and provenance controls so
assistive technology receives one role and result per focus target. Stack the
row when width or text scale makes the side-by-side layout compete with the
ingredient name. Do not queue final review, plan rebuild, or retailer handoff:
those consequences require current server authority.

## Loop 4: Keep the cycle intact when the interface is constrained

- [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility/)
  — support enlarged text, label controls for assistive technologies, test the
  real interface, and respond to Reduce Motion instead of treating accessibility
  as metadata added after layout.
- [Apple VoiceOver guidance](https://developer.apple.com/design/human-interface-guidelines/voiceover)
  — each visible control needs a meaningful focus target and changing visible
  content must remain understandable when navigated nonvisually.
- [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout)
  — adaptable interfaces respect safe areas and system margins rather than
  preserving a preferred composition at the cost of readable content.
- [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) — content
  and functionality should survive a narrow viewport without requiring
  two-dimensional scrolling; repositioning into one column is preferable to
  truncating the action that explains or changes an item.

Kwilt adaptation: the Meals inventory, active plan, meal detail, Cook Mode,
grocery list, and shopping handoff must preserve their one-next-move hierarchy
on the smallest supported phone. On compact widths, move Shop into scrollable
content and stack ingredient, state, and provenance instead of squeezing the
last control offscreen. Bound navigation and editorial heading growth while
leaving body copy and controls scalable. Use the existing accessibility-motion
preference path for shared drawers and transient UI; add no decorative Meals
animation that needs a separate reduced-motion experience.

## Loop 5: Revise the plan → preserve shopping work

- [Plan to Eat shopping-list basics](https://learn.plantoeat.com/help/how-to-use-the-shopping-list)
  — the list remains connected to a defined planner range, while removed items
  remain restorable and manually added staples remain distinguishable from
  generated ingredients.
- [Plan to Eat app shopping list](https://learn.plantoeat.com/help/create-a-shopping-list-app)
  — plan ingredients generate the list, then the shopper explicitly removes
  what is already at home rather than treating that review as disposable.
- [AnyList meal-plan ingredient selection](https://help.anylist.com/articles/meal-planning-calendar-add-recipe-ingredients/)
  — moving from a plan to a list is an explicit selection/addition step, which
  keeps plan changes from silently rewriting the shopping object in hand.
- [AnyList recipe-ingredient release notes](https://help.anylist.com/articles/release-notes-anylist-feb-2020/)
  — ingredients already added to a list retain a live relationship to their
  meal-plan entry when that entry moves, while user-specific item properties
  are reused from recent and favorite items.

Kwilt adaptation: a finalized grocery list is a versioned projection, not a
live view that silently mutates. Revising its meal plan immediately marks the
list stale. Opening groceries shows the saved list read-only, explains why it
changed, and offers one **Refresh and preserve my changes** action only after
the revised plan is final. Rebase matches immutable recipe provenance, carries
manual items and the latest user correction—including Already Have state—and
reports the preserved and conflicted counts before the new list can become
ready.

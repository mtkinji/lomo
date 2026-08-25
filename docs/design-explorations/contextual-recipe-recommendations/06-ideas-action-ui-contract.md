# Ideas action UI contract

## What I See

The action is correctly placed between the Ideas and Planned sections, but its
ghost treatment and manual left offset make it look like an unowned list label.
The failure is visual hierarchy plus alignment, not product behavior.

## The Anchor In Play

This serves Maya's **Prepare a plausible short list** step under
`jtbd-move-the-few-things-that-matter`. The action should feel like an obvious,
reversible way to ask Kwilt for help while leaving the household's current
Ideas as the dominant content.

Design principle: make AI help plainly available without making the drawer feel
AI-owned or adding another planning surface.

## References Worth Knowing

- Kwilt `Button` behavior: provides complete loading/disabled states and a
  44-point effective touch target while allowing domain-owned offer styling.
- Kwilt inventory/list pattern: orientation and scannable rows remain primary;
  contextual actions stay quiet and local.
- Kwilt full-width action-dock pattern: confirms full-width alignment, but is
  intentionally not used because this action belongs in scrolling content and
  is not persistent.

## Three Sketches

1. **Borderless offer card** — a thin, softly filled card spanning the drawer
   content column with left-aligned sparkles and copy. Best balance of obvious
   affordance and quiet hierarchy without reading as a command button.
2. **Divider-owned action row** — full-width row with hairlines above and below.
   More list-native, but likely to read as navigation rather than an immediate
   add action.
3. **Full-width secondary button** — fixes alignment and affordance, but its
   pill shape reads as a command rather than an offer.

## Recommendation

Ship the borderless offer card. We are betting the card-shaped containment can
make Kwilt's help discoverable without competing with the household's meal
rows. If it still feels too prominent, reduce fill contrast before reducing
width or touch area.

## UI contract

Job: When Maya has a few meal ideas but wants more options, she needs to ask
Kwilt for recommendations without leaving the Plan, so she can build a plausible
short list quickly.

Authority chain: explicit user decision -> Kwilt UI constitution and semantic
tokens -> local `Button` -> Ideas drawer production behavior.

Three-second read: Kwilt can add more ideas here.

Primary action: Get ideas from Kwilt.

Primary information: existing meal Ideas. Secondary information: Planned meals.
Reveal later: recommendation details remain in the added rows.

Scan order: current Ideas -> full-width Kwilt action -> Planned.

Must not add: new copy, a card, persistence, confirmation, navigation, or a
second AI surface.

Reuse map: behavior and states -> canonical `Button`; icon -> existing Kwilt
`sparkles`; visual containment -> feature-local borderless offer card aligned
to the drawer content column.

Nearest precedent: an inline list action, differing from `FullWidthActionDock`
because it scrolls with its section and is not a persistent primary action.

External exemplar ledger: N/A; local authority is sufficient.

Behavior sources: placement and add-up-to-three behavior remain the accepted
Ideas drawer contract; full-width banner treatment is the user's current
decision.

Unresolved decisions: none that change product behavior.

Required states: normal, pressed, loading, disabled, successful relabel to
**Get more ideas**, and the existing empty drawer invitation.

Proof path: Recipes -> Ideas drawer on the current iPhone Simulator; verify
normal action, successful recommendation addition, and resulting relabel.

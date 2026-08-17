# Diverge: Household People And Meal Count

## Fixed frame

Help Maya set the real meal quantity immediately and let Kwilt gradually
remember people she cares for, without requiring accounts, turning family life
into roster administration, or using sensitive person data as commerce bait.

## Axis of variation

**Where does a remembered Person become explicit?**

1. After an immediate count, through progressive optional identification.
2. Up front, in a Household roster that becomes the source of truth.
3. Only in the context where the person matters, without a primary roster.

This capability is supporting context rather than a fifth object beside Arc,
Goal, Activity, and Chapter. A birthday may optionally lead to an Activity, but
a Person is not a planning object and an occasion is not a replacement for an
Activity.

## Alternative A — Count First, Know People Gradually

### Sketch

The Meals drawer leads with one calm quantity control:

```text
Usually cooking for

           −     7 people     +

Known diners                              2
Andrew, Charlie                            >

                                  Save
```

The count is authoritative for quantity. Known diners are optional and supply
only person-specific context such as recorded food needs. The Settings row says
`7 people`, not the number of selected names.

Household gains a simple **People** section. `Add person` offers `Enter
manually` and `Import one contact`. A Person begins with a name and optional
relationship; birthday and postal address are reviewed separately. Existing
Household participants appear there, but participation controls remain
distinct from person details.

Ordinary moments can progressively enrich the same Person: recording a food
need, remembering a birthday in Chat, or starting gift help can attach an
explicit fact without requiring a full edit form. Person detail is the quiet
place to review, correct, or delete what Kwilt knows.

### Audience and persona fit

Strong for Maya because dinner is never blocked by Household completeness. The
surface acknowledges all seven people now and becomes more helpful only as she
chooses to identify them.

### Design-challenge answer

It separates immediate truth (`7 people`) from optional knowledge (`2 known`),
while establishing one durable Person model for later household and occasion
value.

### System fit

Constraint posture: `Extend the system`.

- Adds `usualDinerCount` beside `usualDinerPersonIds`.
- Extends canonical `kwilt_people` with user-controlled person details and a
  non-participating household relationship.
- Reconciles relationship-memory People with canonical People instead of
  exposing a second People product.
- Reuses Settings → Household and Settings → Meals.
- Adds a contextual one-contact import path; no global permission prompt.

### Four-object and capture-first stance

- Touches no Arc, Goal, or Chapter.
- A birthday can suggest an optional Activity only when follow-through is
  useful.
- Meal count and person capture are never blocked on categorization or profile
  completeness.

### Best when

Immediate meal truth matters most and the Person foundation should grow through
real use rather than a setup campaign.

### Fails when

The `known diners` concept is visually overemphasized, creating pressure to
complete the roster, or if duplicate Person reconciliation remains unsolved.

### Primer anti-pattern check

Pass. No dashboard, streak, forced setup, public graph, or anthropomorphic AI.
Keep enrichment prompts sparse and dismissible so progressive capture does not
become a hidden checklist.

## Alternative B — The Household Roster Is The Count

### Sketch

Opening `Usually cooking for` shows the two known people and five lightweight
placeholders:

```text
Your usual table                              7

Andrew                                      ✓
Charlie                                     ✓
Person 3                              Add name
Person 4                              Add name
Person 5                              Add name
Person 6                              Add name
Person 7                              Add name
```

Increasing the count creates placeholders; naming or importing a contact
converts one placeholder into a Person. Household becomes a clear roster whose
active `Usually eats with us` members derive the Meals default. Birthdays,
addresses, food needs, invitations, and child capability activation all begin
from each person row.

### Audience and persona fit

Moderate. It creates a legible household model and makes the missing five people
visible, but it risks turning a two-second quantity correction into household
administration.

### Design-challenge answer

It makes count and identity converge over time while allowing unnamed places
temporarily.

### System fit

Constraint posture: `Bend the system`.

- Replaces selected person IDs as the default source with roster membership and
  an `usuallyEatsWithUs` flag.
- Requires placeholder identities or seats that the current `kwilt_people`
  model does not support cleanly.
- Pulls meal behavior, person data, and participation administration into one
  Household surface.

### Four-object and capture-first stance

- Touches no Arc, Goal, or Chapter.
- Quantity capture remains possible, but every increment creates durable
  Household state.
- Birthday follow-through may become an Activity, not a roster task.

### Best when

Most households are willing to establish a stable complete roster early and
many capabilities immediately benefit from it.

### Fails when

Household composition changes often, guests are common, or placeholders feel
like missing work. A baby represented as `Person 7` is especially impersonal.

### Primer anti-pattern check

Conditional pass. It avoids the named instant-fail patterns, but the roster can
become a family-management dashboard and violate the calm UX bar. Fixing that
would weaken the model's central premise.

## Alternative C — Contextual People, No Roster Destination

### Sketch

Meals contains only the count stepper. Names appear solely when a capability
needs them:

- Food needs asks `Who is this for?` and can create/import one Person.
- Chat remembers `Lily's birthday` as a private Person-linked event.
- Gift help asks for or imports the recipient at the start of a gift session.
- Invitations create or bind a Person during acceptance.

There is no People or Household roster to maintain. Search and correction are
available from the capability that owns the fact: Meals for food needs, Chat for
remembered facts, and gift history for gift context.

### Audience and persona fit

Strong for users who reject setup and think of people only through the thing
they are currently doing. Weak for Maya when she wants to answer the broader
question, “What does Kwilt know about my family?”

### Design-challenge answer

It maximizes just-in-time capture and minimizes visible administration, while
still permitting a shared internal identity layer.

### System fit

Constraint posture: `Fit the system` at the surface and `Extend the system`
underneath.

- Meals adds only `usualDinerCount`.
- Existing capability-owned surfaces keep their current responsibilities.
- A hidden identity-resolution layer must reconcile Household members,
  relationship-memory People, imported contacts, and gift recipients.
- Whole-person correction and deletion become difficult without a primary
  review surface.

### Four-object and capture-first stance

- Strongest capture-first option: the current action always comes first.
- Touches no Arc, Goal, or Chapter.
- Optional occasion follow-through remains an Activity.

### Best when

The Person model is mostly invisible infrastructure and cross-capability reuse
can be made reliable without user-visible identity management.

### Fails when

Maya encounters duplicates, stale addresses, conflicting birthdays, or cannot
see and remove everything attached to one person. Privacy controls become
fragmented across capabilities.

### Primer anti-pattern check

Conditional pass. It is calm and non-administrative, but hidden identity
resolution can undermine transparency. A universal privacy review surface would
quietly recreate the roster it tried to avoid.

## Comparison summary

| Dimension | A: Count first | B: Roster is count | C: Context only |
| --- | --- | --- | --- |
| Honest meal quantity now | Strong | Strong after placeholder creation | Strong |
| Setup burden | Low | High | Lowest |
| Household legibility | Strong but quiet | Strongest | Weak |
| Person-data correction | Strong | Strong | Fragmented |
| Contact import fit | Contextual Add person | Central roster setup | Capability-specific |
| Privacy transparency | Strong | Strong but broad | Weakest |
| Current-system fit | Strong | Weak | Moderate |
| Future birthday/gift reuse | Strong | Strong | Moderate |
| Risk of family admin UI | Low | High | Low |
| Risk of hidden identity errors | Low | Low | High |

## Divergence takeaway

Alternative A best preserves the immediate counter request while earning a
durable Person foundation. Alternative B over-couples quantity and identity—the
same mistake as the current drawer, only with placeholders. Alternative C is
elegant until correction, deletion, and cross-capability identity become real;
then its hidden model becomes harder to trust than a quiet People surface.

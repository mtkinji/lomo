# Converge: Household People And Meal Count

## Decision

Choose **Count First, Know People Gradually**.

Meals will store an authoritative usual people count independently from the
optional named diners Kwilt can check for person-specific context. Household
will later provide one quiet, canonical Person home for explicit details such
as relationship, birthday, food needs, and a purpose-limited postal address.
Contact import, occasions, gifting, and affiliate commerce build on that Person
contract in later releases; they do not enter the Meals drawer.

The user accepted **People** as a separate Settings destination. It is the
future management home for remembered people and their explicit details;
Household participation and capability authority remain distinct concepts
within or adjacent to that destination.

## Qualitative scoring

| Criterion | A: Count first | B: Roster is count | C: Context only |
| --- | --- | --- | --- |
| Maya / household-organizer fit | High | Medium | Medium-high |
| Honest quantity with incomplete roster | High | Medium | High |
| `jtbd-move-the-few-things-that-matter` | High | Medium | High |
| `jtbd-trust-this-app-with-my-life` | High | Medium | Medium-low |
| `jtbd-invite-the-right-people-in` | High | Medium | Medium |
| Current surface and flow fit | High | Low | Medium |
| Domain-model clarity | High | Low | Medium-low |
| Migration risk | Low for first slice | High | Medium-high |
| Privacy and deletion legibility | High | High | Low |
| Risk of family administration | Low | High | Low |
| Future birthday / gift reuse | High | High | Medium |

Alternative A wins because it removes today's false coupling without hiding the
long-term Person model or forcing that model into the immediate action.

## Capability delta

### Today, the user cannot

- Save `7 people` when only Andrew and Charlie exist in the Household roster.
- Use the real household size as the starting recipe quantity without creating
  more profiles or participants.
- Distinguish “how many am I feeding?” from “which known people should Kwilt
  check?”
- Maintain one coherent, reviewable Person record across Household and private
  relationship memory.

### After the chosen concept ships

- Maya can save a usual count of seven while keeping Andrew and Charlie as the
  only named diners.
- Recipes and Meal Planning can start at seven servings while preserving the
  two named diner IDs for recorded food-need checks.
- A later Household People release can add a baby or adult as a Person without
  creating an app profile, auth identity, paid seat, or authority grant.
- A later one-contact import can add only the selected, reviewed fields to that
  Person.

### Still intentionally not possible

- Inferring the missing five people or their needs from a count.
- Treating seven people as seven complete Household profiles.
- Claiming seven identical serving needs; each recipe or dish remains
  adjustable.
- Uploading the address book, discovering contacts, or inviting people
  automatically.
- Using a birthday or address for gift recommendations without a user-requested
  gift action.
- Ranking products by affiliate payout or sending an address through an
  ordinary affiliate URL.

## Chosen interaction

### Meals Settings row

```text
Usually cooking for                         7 people  >
```

The summary always uses the numeric default, not the number of named diners.

### Usually cooking for drawer

```text
Usually cooking for                              ×

                 [ − ]    7 people    [ + ]

People (optional)
Andrew                                            ✓
Charlie                                           ✓

                                                Save
```

Copy rationale:

- The title and counter explain the action without a second line of copy.
- `People (optional)` makes identity subordinate without explaining the entire
  data model.
- No `known`, `modeled`, `serving-size classes`, setup progress, or missing-five
  language appears.

Interaction rules:

- The count supports 1–20, matching the existing recipe default clamp.
- The count cannot be reduced below the number of selected people. The decrease
  control becomes disabled at that boundary and exposes the accessibility hint
  `Remove a selected person to choose fewer than 2.`
- Selecting a person above the current count raises the count to the number of
  selected people; it never removes another person.
- Deselecting someone does not lower the count.
- Save persists count and selected IDs atomically.
- Per-recipe and per-dish serving adjustments remain authoritative after the
  default is applied.
- The drawer does not contain Add person, Contacts permission, birthdays,
  addresses, gift ideas, or commerce.

## Data and system implications

### First slice

Add `usual_diner_count` to `kwilt_meal_planner_preferences` and
`usualDinerCount` to the client projection/cache/store.

Migration behavior:

- Existing rows initialize the count from the number of unique selected diner
  IDs when at least one exists.
- Rows with no selected diners initialize to the existing default of four.
- Clamp values to 1–20 in both the domain layer and server command.
- Preserve `usual_diner_person_ids` unchanged.
- The write command accepts count and IDs together and rejects a count smaller
  than the number of unique IDs.
- Existing authorization remains owner/caregiver scoped. Adding the field must
  not broaden table or function access.

Consumption behavior:

- Recipe and Meal Planning defaults use `usualDinerCount` before falling back
  to selected-ID count or four.
- Food-need checks continue to use only named diner IDs.
- Finalized meal occurrences retain their explicit servings and diner IDs; a
  later settings change never rewrites them.

Supabase boundary:

- Keep writes behind the existing owner-scoped command rather than exposing
  direct table mutation.
- Any changed `SECURITY DEFINER` function must retain explicit permanent-user
  and household-authority checks, an empty `search_path`, and revoked default
  `PUBLIC` execution.
- RLS and grants must remain no broader than the current authorized read model.

### Person foundation, later release

Do not overload `kwilt_household_memberships` to mean “someone I remember.” A
membership remains participation and authority context. The later schema needs
a purpose-built Household-to-Person context that can represent a person without
auth or capability access and can bind to participation later without changing
the Person ID.

Person details should be decomposed by sensitivity and purpose:

- shared/basic: display name and explicit household relationship;
- optional occasion: birthday month/day, year separately optional;
- capability-owned: food needs and explicit gift context;
- private/sensitive: postal address, visible only to the person who saved it by
  default and projected only into a reviewed delivery action.

The later design must reconcile existing canonical `kwilt_people` records with
the separate relationship-memory People model before exposing a general People
surface. It must not create a third identity system.

## Reductive design decisions

- Add one numeric field; do not create placeholder people.
- Reuse the existing first-use Recipes setup sheet; do not add another
  education flow.
- Retain the name picker as optional context; do not make it the count.
- Use the existing recipe quantity controls; do not add serving classes for
  adults, children, or babies.
- Do not show `2 of 7 people added`, setup completion, progress, or prompts to
  finish the household.
- Do not add Contacts permission or `Add person` to Meals.
- Reserve a separate Settings → People destination for person management; do
  not bury it inside Meals or make the Meals drawer navigate through setup.
- Do not expose the existing relationship-memory tables as a provisional People
  screen.
- Do not monetize household size, stored People, or participation seats.
- Do not add gifting navigation, birthday reminders, or affiliate links in this
  release.

## Activation path

On first entry to Recipes, the existing skippable setup sheet introduces the
two useful household defaults: `Usually cooking for` and `Food needs`. Opening
the first row reveals the count-first drawer. This is the onboarding moment;
there is no tour, carousel, progress indicator, or roster-completion nudge.

Outside first use, the feature also activates exactly where the current model
fails: Maya opens `Usually cooking for` from Recipes or Settings, changes 2 to
7, and saves.

The first recipe or Meal Plan action after that uses seven as its starting
quantity, making the value visible through the work Maya was already doing. The
two selected names continue to power food-need context. That is sufficient
education.

The later Person foundation should activate only from meaningful moments:

- `Add person` in Household;
- recording a food need for someone not yet represented;
- explicitly asking Kwilt to remember a birthday;
- beginning user-requested gift help.

Contacts access appears only after `Import one contact`. Birthday or address
fields are previewed before save and can be omitted independently.

## Accepted trade-offs

- `7 people` does not tell Kwilt who the other five people are.
- Food-need checks cover only selected named diners and must say so truthfully.
- The first release improves quantity but does not yet deliver the broader
  Person, birthday, contact, or gifting value.
- The count is a practical starting quantity, not a nutritional serving model.

## Rejected trade-offs

- Requiring all seven people to be added before saving.
- Creating five anonymous Person rows behind the scenes.
- Removing named diners and losing person-scoped food-need context.
- Shipping a hidden identity resolver without a future review/deletion home.
- Collecting addresses early because they may create affiliate value later.
- Allowing affiliate revenue to influence which gift appears best.

## Stated bet

We're betting that separating quantity from identity will immediately make
Meals feel truthful, and that users will value a Person foundation more when it
grows from meaningful household moments than when it begins as mandatory roster
setup.

If users frequently expect the count to create people, cannot understand why
only selected names receive food-need checks, or never return to add person
context, we would revisit the relationship between Meals and Household People—
without returning to count-equals-roster coupling.

## Success signal

For the first slice, success means Andrew can:

1. save `7 people` with only Andrew and Charlie selected;
2. leave and reopen Settings and still see `7 people`;
3. start a recipe or Meal Plan action at seven servings;
4. still see food-need evaluation scoped only to Andrew and Charlie; and
5. change an individual recipe quantity without altering the household default.

No Person, birthday, Contacts, address, gifting, or monetization metric is used
to declare the first slice successful.

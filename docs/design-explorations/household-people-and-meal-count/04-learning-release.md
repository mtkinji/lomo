# Learning Release: Household Meal Count

## Concept To Build

Let a household save an honest usual people count independently from the named
people Kwilt can check for food needs.

## Capability Delta

Today, the user cannot:

- save seven as the usual quantity when only two Household people exist;
- carry that seven-person default into Recipes and Meal Planning without
  creating more profiles.

After this release, the user can:

- save `7 people` with Andrew and Charlie selected;
- start recipe and Meal Planning quantities at seven;
- keep food-need checks scoped to Andrew and Charlie;
- adjust a specific recipe without changing the shared default.

Still intentionally not supported:

- People creation or editing in Meals;
- Contacts, birthdays, addresses, gift help, or affiliate commerce;
- inferred people, food needs, or serving classes.

## User Experience

First entry to Recipes presents the existing skippable household-fit sheet with
`Usually cooking for` and `Food needs`. Settings → Meals exposes the same two
defaults later. Opening `Usually cooking for` reveals a count stepper first and
`People (optional)` second, without explanatory subtitle copy. Save writes both values.
The next recipe or Meal Plan addition begins at seven servings while preserving
the selected diner IDs for person-specific checks.

People management is reserved for a separate Settings destination. No link or
setup prompt for that future surface appears in this release.

## Existing Product Relationship

This enhances the existing Usually cooking for drawer, household meal
preferences, recipe quantity default, and Meal Planning finalization. It
replaces selected-ID count as the numeric authority but leaves existing member
selection and Food needs behavior intact.

The existing Recipes overflow quantity control must edit the same household
count when household preferences are available; it must not remain a competing
profile-scoped source of truth.

## Buildable Slice

Must be real:

- migrated Supabase column and authority-preserving RPC update;
- validated repository, cache, and optimistic store projection;
- count-first drawer with accessible increment/decrement behavior;
- Settings and Meal setup summaries based on the count;
- Recipes and Meal Planning use of the count;
- preserved diner-specific food-need checks and explicit per-dish servings;
- persistence and rollback tests.

Can be thin or temporary:

- Andrew-only local/Simulator learning;
- the existing member rows remain the only optional named-person source;
- no analytics event is required for the first local proof.

Intentionally excluded:

- a People screen, Person schema reconciliation, contact ingestion, occasion
  prompts, addresses, product search, affiliate links, or monetization.

## Release Channel

**Local build.** Exercise the real Settings → Meals and Recipe/Meal Plan paths
on the iPhone 17 Pro Simulator against the current development backend only if
the migration is available there. Do not deploy the migration or submit a build
without separate authorization.

## Brand-Goodwill Guardrails

- Never suggest that the other five people are missing setup.
- Never claim unnamed diners were checked for food needs.
- Let the title and count explain the drawer; keep only `People (optional)` as
  supporting copy.
- Do not mention future gifting or monetization in Meals.

## Reversibility

The new column is additive. Client fallback continues to resolve selected-ID
count, then four, when the field is absent from cached or older projections.
The UI can revert to the current name picker without deleting diner IDs or
finalized meal quantities. No Person or Contacts data is created.

## Permanent Product Threshold

Promote the behavior after Andrew can save seven with two named diners, reopen
the app, observe seven as the next recipe/plan quantity, preserve correct
food-need scope, and adjust one recipe independently without confusion or data
loss.

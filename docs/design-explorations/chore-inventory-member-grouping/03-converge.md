# Converge: Chore Inventory Member Grouping

## Chosen alternative

**B. Group control with Member as the default.** It matches the user's expected first read, makes grouping discoverable in the established inventory rail, and retains a flat list without creating a settings concept.

## Capability delta

Today, a caregiver can filter to one assignee but cannot see the complete inventory as explicit Charlie, Olive, and Household groups.

After this change, the caregiver can:

- see the inventory grouped by member immediately;
- switch between **Member** and **None** grouping;
- combine either grouping state with the existing assignee filter.

Still unsupported: custom grouping fields, manual group order, collapsed groups, saved views, rotations, and workload comparisons.

## Reductive decisions

- Add one adjacent layers control; do not add a toolbar label, helper text, or settings row.
- Hide per-row assignee pills when the section header already supplies that information.
- Keep section headers informational and non-collapsible.
- Preserve child-member order from Household data and place Household last.

## Activation

No teaching prompt is needed. The grouped default demonstrates the behavior, while the familiar layers icon makes the reversible choice available at the point of use.

## Bet and success signal

We're betting that member sections make the whole household inventory faster to understand than repeated assignee pills, while a visible **None** option prevents the structure from feeling imposed. Revisit the default if caregivers routinely turn grouping off or mistake grouping for filtering.

Success is a caregiver accurately identifying Charlie's, Olive's, and Household's recurring work from one screen without applying three filters.

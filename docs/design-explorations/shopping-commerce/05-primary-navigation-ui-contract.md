# Groceries primary navigation UI contract

Job: When someone needs to capture or shop household needs, they need to reach the shared Grocery List directly, so they can act without first entering Recipes or committing a Meal Plan.

Authority chain: Andrew's explicit primary-object decision -> `03-converge.md` Grocery Flywheel -> Kwilt UI constitution -> existing capability-menu row grammar.

Three-second read: The Food group contains two distinct places: Meals and Groceries.

Primary action: Choose the place that matches the current job. The global menu does not visually privilege either destination.

Primary information: Meals opens recipe discovery; Groceries opens the active household Grocery List.

Secondary information: Selected state and familiar capability icons.

Reveal later: Plan remains contextual inside Meals; retailer choices remain behind `Shop this list` after the list contains useful intent.

Scan order: Food group label -> Meals -> Groceries.

Must not add: A Food dashboard destination, Meal Plan row, green CTA, explanatory helper copy, commerce badge, retailer branding, or a third Food destination.

Reuse map: Existing `CapabilityMenu` group header and capability-row pattern; existing `cart` icon; existing capability route projection.

Nearest precedent: The Money group exposes its independently useful places as direct rows. Food differs by containing only two primary objects and retaining Plan contextually inside Meals.

External exemplar ledger: N/A.

Behavior sources: Direct Groceries navigation and two visible Food destinations come from `03-converge.md`; feature-flag hiding and selected-state behavior come from the current capability menu contract.

Unresolved decisions: Whether the Recipes label should later change from `Meals` to `Recipes` remains outside this correction.

Required states: Food feature disabled; Food expanded; Food collapsed; Meals selected; Groceries selected.

Proof path: Open the global left navigation -> confirm Food contains Meals and Groceries only -> tap Groceries -> land on `GroceryList` -> reopen the menu and confirm Groceries is selected.

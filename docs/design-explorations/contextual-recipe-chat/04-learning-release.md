# Learning Release: Contextual Recipe Chat

## Concept To Build
Recipe Home opens the shared Chat drawer with four one-tap recipe-shaped conversation offers and exact Recipe evidence.

## Capability Delta
Today, the user cannot:
- launch a recipe-scoped Chat from Recipe Home;
- choose a concrete adaptation job without inventing the prompt;
- rely on the exact Recipe version as Chat evidence.

After this release, the user can:
- launch Chat from the standard Action Dock;
- choose substitution, personal variation, tonight-fit, or food-on-hand help;
- edit before sending and receive recipe-grounded assistance.

Still intentionally not supported:
- applying a Recipe mutation from the starter card;
- inferring pantry state or dietary needs not authorized as evidence;
- replacing Meal Plan, Groceries, or Cook Mode.

## User Experience
The Action Dock keeps Meal Plan left and adds one circular Chat control right. Fresh Chat shows a 2×2 card grid. Tapping a card submits its full prompt, shows the request in the timeline, creates the durable thread, and attaches the exact recipe context.

## Existing Product Relationship
Enhances Recipe Home and the shared Unified Chat workbench. It does not create a recipe-only assistant.

## Buildable Slice
Must be real:
- native Recipe launch context and exact evidence projection;
- shared snapshot protocol for bounded contextual offers;
- hosted workbench validation and rendering;
- Action Dock affordance, fresh/durable thread behavior, and focused tests.

Can be thin:
- static first ranking of the four cards;
- analysis-only personal variation until Recipe write proposals are fully wired.

Intentionally excluded:
- new persistence schema, migration, settings, analytics payload, or automatic send.

## Release Channel
Local build for Andrew-only interaction and visual evaluation before promotion.

## Brand-Goodwill Guardrails
- Cards make honest conversation offers, not action claims.
- Original Recipe remains untouched.
- No pantry, preference, safety, or allergy inference without evidence.

## Reversibility
The Recipe launch and optional snapshot field can be removed without data migration. Threads remain ordinary Unified Chat threads.

## Permanent Product Threshold
Promote when the real drawer is visually calm, the exact recipe is used in answers, starter taps are understood, and no answer or card implies an unapplied change was saved.

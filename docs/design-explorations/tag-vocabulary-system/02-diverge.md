# Diverge: tag-vocabulary-system

## Axis of variation

The alternatives vary by where the system puts the weight:

- capture-time reuse
- retrieval-time browsing
- maintenance-time cleanup
- data-model-first inventory

## Alternative A: Reuse-First Tag Input

Every place a user adds tags becomes a searchable "find or create" chip picker. Existing tags appear first, ranked by current Activity use, recent use, and text match. New tag creation is still allowed, but visually secondary to reuse.

Audience/persona fit: strong for Maya because it prevents future drift without asking her to manage tags separately.

Design-challenge answer: helps tags stay familiar by making reuse the easiest action at the moment she is already adding context.

System fit: high. Reuses `activityTagHistory`, Activity tags, the Filter drawer tag picker pattern, and Activity detail.

Best when: the main failure is duplicate or inconsistent tag creation.

Fails when: the vocabulary is already messy enough that autocomplete only exposes the mess.

Primer anti-pattern check: passes. It does not block capture, does not auto-anchor, and avoids dashboard language.

## Alternative B: Tag Browser As Lightweight Inventory

The Activities tag drawer becomes a richer "All tags" browser: search, top/recent tags, active counts, and tag rows that open a filtered group. A small row action can hide or rename a tag in a later version, but V1 stays retrieval-first.

Audience/persona fit: strong when Maya is trying to retrieve a group such as Groceries or School and the top five are no longer enough.

Design-challenge answer: gives her one place to find the right tag without learning custom views or filter syntax.

System fit: high. Extends the current Tag Groups drawer rather than adding a new top-level Tags section.

Best when: the user has many tags and needs scalable retrieval.

Fails when: the user needs cleanup and aliasing, not just browsing.

Primer anti-pattern check: passes if the browser is practical and quiet, not an analytics dashboard.

## Alternative C: Gentle Cleanup Suggestions

Kwilt detects likely duplicate tags such as Grocery/Groceries or school/School and occasionally offers a simple cleanup action: "Use Groceries for both?" This creates aliases or updates selected items only after confirmation.

Audience/persona fit: medium. Helpful, but it introduces a maintenance interaction Maya may not want unless drift is painful.

Design-challenge answer: preserves familiar groups over time by reducing duplicate labels.

System fit: medium. Requires a canonical tag concept, alias mapping, and careful no-surprise behavior.

Best when: a user already has many near-duplicate tags.

Fails when: suggestions feel like chores or when AI overconfidently proposes merges.

Primer anti-pattern check: passes only if optional, reversible, and not framed as correcting the user.

## Alternative D: First-Class Tag Inventory

Introduce a `Tag` object with id, label, normalized key, aliases, hidden status, total use, last used, and optional description. Activity tags can migrate from raw strings to tag ids over time, while display preserves labels.

Audience/persona fit: indirect. It makes the system more durable but does not by itself improve Maya's daily flow.

Design-challenge answer: creates the substrate for reliable reuse, rename, merge, hide, and AI constraints.

System fit: medium to low. It changes persistence, sync expectations, AI snapshots, filters, and migrations.

Best when: the team is ready to support tag lifecycle management as a product surface.

Fails when: it delays simpler UX improvements that would already help Maya.

Primer anti-pattern check: passes as infrastructure, but risks overbuilding if exposed as a setup project.

## Alternative E: Tags Become Saved Views

Frequently used tags can be pinned as view shortcuts. "Groceries" behaves like a saved view with the tag filter preconfigured; the user can open it from Activities without touching the filter builder.

Audience/persona fit: strong for repeated household contexts.

Design-challenge answer: makes recurring tag groups feel like familiar places in the app.

System fit: medium. It builds on Activity views and tag groups, but needs clear rules so it does not blur view configuration and tag vocabulary.

Best when: certain tags are stable contexts with repeated use.

Fails when: every tag tries to become a view and the interface gets crowded.

Primer anti-pattern check: passes if pinning is user-driven or usage-suggested, not automatic clutter.

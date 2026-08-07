# Yes-And: Global Recipe Catalog

## Original idea

Move all 500 OOTB meals into a database-backed catalog available to every user, with private hearts, public comments and ratings, private local revisions, and a recipe-book-quality image pipeline.

**Yes, and what if it could...** make every OOTB recipe independently correctable and publishable without waiting for an app release?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the shared cookbook becomes durable knowledge rather than bundled content.
- New value: reviewed version replacement, withdrawal, correction, and exact history.
- Cost delta vs. original: low
- Anti-pattern check: pass; changes are editorial and inspectable, not ambient AI mutation.

**Yes, and what if it could...** let Maya make “our version” while always preserving where it came from?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: inspiration becomes reusable household knowledge.
- New value: a private Recipe fork with exact-version lineage, family notes, substitutions, and future edits.
- Cost delta vs. original: medium
- Anti-pattern check: pass; private adaptation does not become default-public content.

**Yes, and what if it could...** prioritize image generation by the meals most likely to help someone choose, not by source-file order?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the most consequential discovery gaps become appetizing first.
- New value: a deterministic queue using visible shelf placement, editorial collections, search/open demand, meal-plan usage, missing/mismatched media, and category/cuisine coverage.
- Cost delta vs. original: medium
- Anti-pattern check: pass if private behavior is aggregated and not used to create manipulative popularity ranking.

**Yes, and what if it could...** turn comments into concise cooking notes rather than a generic conversation feed?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: shared experience answers “did this work in a real kitchen?”
- New value: version-bound notes, optional “cooked it” context, useful report categories, and clear author deletion.
- Cost delta vs. original: high
- Anti-pattern check: pass only if Recipe Home stays recipe-first and comments never become a feed, notification loop, or engagement target.

**Yes, and what if it could...** make ratings more truthful by distinguishing a personal score from public evidence?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: stars become a compact memory and cautious signal, not popularity theater.
- New value: private “your rating,” server-calculated distribution, minimum-count threshold, and no AI/anonymous ratings.
- Cost delta vs. original: medium
- Anti-pattern check: pass if ranking does not collapse diverse household fit into a universal quality score.

**Yes, and what if it could...** create a coherent visual cookbook rather than 500 unrelated generated thumbnails?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: visual recognition becomes calm, pleasurable, and trustworthy.
- New value: one art direction, recipe-derived prompts, contact sheets, similarity checks, cultural/ingredient accuracy review, and versioned replacements.
- Cost delta vs. original: medium
- Anti-pattern check: pass; imagery supports recognition without turning Meals into advertising.

**Yes, and what if it could...** give editorial Collections and recommendations a stable public source instead of copying recipe snapshots throughout the app?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: every surface refers to the same reviewed recipe version and media.
- New value: consistent Recipe Home, Collections, Search, Meal Plan candidates, and Groceries lineage.
- Cost delta vs. original: medium
- Anti-pattern check: pass; capability ownership becomes clearer.

**Yes, and what if it could...** remain useful offline without keeping the catalog authoritative inside the bundle?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: a network gap does not erase the cookbook or show misleading fallback art.
- New value: cached catalog editions, image CDN caching, last-known-good records, and a small bootstrap fallback.
- Cost delta vs. original: medium
- Anti-pattern check: pass; state is truthful about freshness and never silently swaps versions.

## Frame recommendation

**Run the design-thinking loop with the expanded frame.** The image pipeline is one operational subsystem of a larger global-catalog capability. The coherent product unit is a versioned shared cookbook with private adaptation and bounded public evidence—not a set of remote thumbnails layered over bundled recipes.

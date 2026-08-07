# Converge: Global Recipe Catalog

## Qualitative comparison

| Alternative | Maya/job fit | Authority clarity | Existing model reuse | Offline/freshness | Blast radius | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. Publish the Core | Strong | Strong if public reads are projection-only | Strongest | Strong with last-known-good cache | Medium | Choose |
| B. Separate Kwilt Cookbook | Strong | Strongest | Weak; duplicates Recipe semantics | Strong | High | Reject for now |
| C. Edition-first Catalog Service | Good | Strong | Medium | Strongest | Medium-high | Preserve as later delivery optimization |

## Chosen alternative

**Publish the Core.** Import each OOTB meal as a Kwilt-system-owned immutable Recipe and publish one exact Recipe version through a public catalog projection. Person state and public participation attach to the publication; **Make my version** creates a private Recipe fork with exact lineage.

The boundary is non-negotiable: mobile clients do not receive broad read access to system-owned rows in the private aggregate. A reviewed database function or security-invoker projection returns only the fields declared public for active publications.

## Capability delta

### Today, the user cannot

- receive the canonical 500-meal catalog from Supabase;
- see catalog corrections or recipe-specific images without a JavaScript/app release;
- attach durable public evidence to a canonical recipe version;
- create a private editable Recipe from a catalog item while preserving exact lineage;
- trust that different named meals have different, accurate imagery.

### After this concept ships, the user can

- browse the same current catalog across supported Kwilt clients;
- privately heart any catalog or private Recipe;
- assign or change one personal 1–5 star rating to the current published version;
- see a cautious aggregate rating after enough independent ratings exist;
- post, edit, delete, and report a public cooking note under an adult public profile;
- create a private local version that starts from an exact canonical snapshot and remains independently editable;
- receive corrected content and reviewed recipe-specific imagery through data refresh.

### Still intentionally not supported

- changing the canonical recipe through a local revision;
- public comments from child or anonymous accounts;
- public user Recipe publishing in the initial migration;
- engagement-ranked discovery, follower graphs, direct messages, or creator feeds;
- AI-generated ratings, comments, cook evidence, rights attestations, or automatic publication.

## Domain decisions

### Canonical catalog

- Every canonical Recipe and RecipeVersion uses UUID identity.
- The authored `rosterId` remains a unique external/source key for idempotent import, analytics joins, and migration from existing string refs.
- A Kwilt system person/profile owns canonical records; users cannot update that owner through client APIs.
- A publication pins one exact immutable version and selected media.
- Republish creates a new current publication version; prior versions, ratings, and version-bound comments remain historically attributable.

### Hearts

- Existing private `kwilt_recipe_favorites` remains the owner.
- During migration, favorite refs accept legacy `kwilt-recipe-<roster>` and canonical publication UUID, with an idempotent remap path.
- Heart totals are not exposed publicly.

### Ratings

- One current rating per person per published RecipeVersion, integer 1–5.
- A person may update or remove their rating.
- Public projection shows count and average only at a minimum threshold of five ratings; below that it says **Not enough ratings yet**.
- New canonical versions begin new aggregates. Old ratings are not silently inherited.
- Rating is available on Recipe Home and gently invited after Cook Complete; cooking is not falsely claimed as a prerequisite unless a verified cook receipt exists.

### Comments

- Product label: **Cooking notes**, not Comments feed.
- A note attaches to the publication and exact published version.
- Initial authors require a permanent adult account and an active chosen public profile.
- Authors can edit or delete their own note. Everyone eligible to read can report it.
- Moderation state, report reason, takedown, appeal/audit boundary, rate limits, and blocked-profile behavior are launch gates.
- Recipe Home loads a bounded page ordered for usefulness/recency; no global feed, likes, reply tree, or push-notification loop in the first release.

### Local revisions

- **Make my version** creates a new private Recipe and version owned by the person.
- `RecipeLineage.relationship = adaptation` points to the exact canonical RecipeVersion and publication.
- Title, ingredients, instructions, time, notes, and private media can change independently.
- Future canonical corrections never overwrite the private version. Recipe Home may later offer an inspectable comparison, but no automatic merge ships now.

## Image-generation and publication pipeline

### State machine

```text
missing -> queued -> generating -> generated -> editorial_review
        -> approved -> published
        -> rejected -> queued (new attempt)
        -> failed -> queued (bounded retry)
```

Every attempt records publication version, prompt version, model, cost/usage metadata, output asset, QA results, reviewer decision, and replacement lineage. Generated output is never public merely because generation succeeded.

### Eligibility

A publication version enters the queue when it is active and has no approved recipe-specific hero image, or when its current image is explicitly marked inaccurate, duplicate, low-quality, or retired.

### Priority

Use hard editorial coverage constraints first, then a deterministic score:

1. Keep at least one queued candidate in every under-covered category/cuisine cluster.
2. Finish an active editorial Collection once its first meal enters production.
3. Within those constraints, score:
   - current discovery visibility and top-three shelf position;
   - active editorial Collection membership;
   - severity of missing or mismatched imagery;
   - aggregated opens, Meal Plan additions, completed cooks, and searches with no useful image;
   - category/cuisine/visual-form coverage deficit;
   - attempt age and bounded retry penalty.
4. Never use private household text, comments, or individual identity in generation prompts or priority analytics.

The first target is a balanced 48-image cookbook set: every currently visible discovery position, every active editorial Collection, and enough category/cuisine/visual-form breadth to judge the art direction. After acceptance, process the remaining catalog in complete waves.

### Recipe-book art direction

- Beautiful modern cookbook photography, not stock-photo advertising.
- Realistic home-cooked texture and portions; natural window light; quiet warm tableware and surfaces.
- One unmistakable finished dish derived from the exact title, description, ingredients, method, cuisine, and serving form.
- Composition must survive shelf-card, grid, Collection hero, and Recipe Home cover crops.
- Varied plates, angles, and backgrounds within one coherent tonal family; no 500-image template monotony.
- No people, hands, text, logos, packaging, impossible ingredients, excessive garnish, synthetic gloss, or culturally careless substitutions.
- Meaningful alt text is authored from the reviewed image and Recipe, not copied blindly from the prompt.

### Quality gates

Automated:

- valid format, dimensions, file size, and crop-safe subject placement;
- semantic match against recipe title/key ingredients/serving form;
- near-duplicate and perceptual-similarity detection across the catalog;
- policy/safety scan and forbidden text/logo detection;
- prompt/asset/version provenance completeness.

Editorial:

- dish identity and key ingredients are visually truthful;
- cultural presentation is plausible and respectful;
- the image is appetizing, believable, and coherent with the cookbook contact sheet;
- mobile crops remain legible;
- rights basis, attribution, and alt text are complete.

Review happens in 12-image contact sheets plus individual full-resolution inspection. Rejection names one reason so regeneration changes one variable rather than drifting the whole art direction.

## Reductive design decisions

- Keep the heart on meal cards; do not add rating counts or comment counts to discovery shelves.
- Put the rating summary and **Cooking notes** on Recipe Home after the core recipe facts.
- Put **Make my version** in the existing Recipe actions menu and explain lineage once at creation.
- Do not add a social tab, creator feed, rating leaderboard, review badge system, or catalog settings screen.
- Do not expose image-generation status in the consumer app; missing media uses a quiet, truthful fallback.
- Replace bundled catalog authority and eventually retire atlas code after remote catalog caching/offline proof, rather than maintaining two permanent sources of truth.

## Activation path

- Heart: immediately available on cards and Recipe Home; learned by direct affordance.
- Rating: available on Recipe Home, contextually invited after Cook Complete.
- Cooking note: discovered on Recipe Home after recipe content; no promotional prompt before the user has useful experience.
- Make my version: available from Recipe actions when the user wants to edit a canonical recipe.
- No onboarding carousel or notification campaign.

## Accepted trade-offs

- Public comments ship later than catalog read/hearts/private forks because moderation is a product requirement, not polish.
- The first 48 images improve visible quality before all 500 are complete.
- Aggregate ratings reset across canonical version changes to preserve evidence truth.
- A system-owned Recipe row is operationally unusual but avoids duplicating Recipe semantics.

## Rejected trade-offs

- No direct public read policy on all system-owned private Recipe tables.
- No all-at-once 500-image generation without an accepted visual contact sheet.
- No anonymous or child public posting to accelerate participation.
- No ranking home shelves by star average or comment volume.

## Stated bet

We're betting that a durable shared cookbook with recipe-specific imagery, quiet personal memory, bounded real-cook evidence, and private adaptation will help Maya choose and reuse meals more confidently without turning Kwilt into a social content feed. If people mainly use hearts and private versions while public notes or ratings add noise, we will keep the cookbook and reduce or remove the public participation projection rather than manufacturing engagement.

## Success signal

Maya can open Meals on a fresh account, recognize distinct accurate dishes, heart one, create a private version, add it to a Meal Plan, and later rate or leave a useful cooking note without any action leaking private household content or changing the canonical recipe.

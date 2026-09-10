# Home feed item review set

Status: review candidates, September 9, 2026. These examples use current native components and fictional data. They are not a declaration that those components are canonical. The purpose is to refine a reusable item grammar through specific, recognizable moments.

## The design question

Home should help Maya feel included in ordinary household life and chosen relationships. Each item should make the person, moment, audience, and available response understandable quickly. Capability context should explain the moment without turning Home into an administrative log.

Authority: the [Connected Moments PRD](../../feature-briefs/kwilt-home-connected-moments.md), current user decisions, and Kwilt’s component inventory and pattern atlas. Home’s plus and ellipsis placement, neutral controls, 16-point text gutters and 32-point inter-item spacing remain the baseline.

## Four candidate patterns

The [four-pattern contract](four-pattern-contract.md) now governs this review set: **Moment**, **Contribution**, **Personal message**, **Invitation / request**. Shared identity, context, overflow and response anatomy keeps them coherent. The existing DeliveryCard is a compatibility router to message/request, not a fifth pattern.

## Complete current inventory

The shared catalog contains **4 feed patterns, 11 content categories, and 46 representative variants**. Text and photo are two review formats of the same ordinary moment type.

| Review group | Variants | Coverage |
| --- | ---: | --- |
| Text moment | 3 | Short, long, already saved/appreciated |
| Photo moment | 5 | Landscape, portrait, square/no caption, four-photo gallery, unavailable media |
| Goal completed | 3 | Reflection, photo, already appreciated |
| Discovered place | 3 | Text, photo, already saved to Explore |
| Explore outing | 3 | Text, photos, followers |
| Chore update | 4 | Single completed, pending approval, grouped mixed status, late report |
| Encouragement note | 5 | All delivery states |
| Goal check-in | 5 | All delivery states |
| Goal invitation | 5 | All delivery states |
| Game turn | 5 | All delivery states |
| Meal-choice request | 5 | All delivery states |

Delivery states are pending, available, settled, expired, and unavailable. These exercise the current renderer contract; they do not claim every producer emits every combination today. Audience, media, social, and chore combinations are representative rather than exhaustive. Portrait/square metadata deliberately stress the same local illustrative asset. Accessibility sizes and every device size still require separate acceptance review.

## Review workflow

Open the [review manager](http://127.0.0.1:8934/). Select a pattern or content category, search content or state, and open a variant to see its native screenshot, review question and fixture data. Select two to four variants for comparison. Assign a review status, priority and notes. Filter to outstanding changes or high priorities.

Reviews save in this browser. **Export all reviews** provides a durable JSON backup; selected export includes recorded reviews for the selected IDs. Import validates the whole file before an explicit merge, replaces matching IDs and preserves unrelated reviews. A changed fixture revision flags its previous review for recheck. Review approval is not canonical design-system promotion. Management applies to the review inventory, not live household posts.

A useful sequence is text → photo → attached goal/place/outing → chores → source messages/requests, then mixed-feed rhythm. Review person, audience, meaning, natural response, hierarchy, empty/populated responses, and edge states against stable variant IDs.

## Current review observations

- Content and source context now precede responses. All four patterns use a soft content card with smaller metadata beneath it; contribution density is explicitly compact.
- Personal messages emphasize the sender’s words; requests offer one neutral outline action. Source state controls availability and known outcomes, rather than primary-button urgency.
- The gallery now uses its measured width and height without a competing aspect ratio, so photos fill the soft card. Photo loading/failure and multi-photo variants remain in the review set.
- Review pattern hierarchy together in **Four patterns → Mixed feed** before canonical promotion. Native screenshots are initial viewports; use the lab for expansion and gallery interaction.

## Native and development entry points

Dev tools → **Review Home feed items**. Content-category and variant selectors provide direct access; Previous/Next isolates variants and Mixed feed shows the selected group. Cheer and Save change only in-memory fixture state. Media viewing and grouped-chore expansion use existing components. Source callbacks show a fictional-preview message; the existing map link can open the fictional coordinates in Maps. No household content is published.

Native screenshots live in [the artifact directory](../../../artifacts/home-sharing-review/feed-item-lab/). The browser displays these actual native renders, not HTML recreations. The same catalog drives both surfaces at `src/features/dev/homeFeedItemCatalog.json`. Increment a variant revision whenever its fixture or relevant visual behavior changes, recapture it, then rebuild the manager.

Rebuild: `node scripts/home-feed-review/build.mjs`. Serve the artifact directory over HTTP (ES modules require HTTP): `python3 -m http.server 8934 --bind 127.0.0.1 --directory artifacts/home-sharing-review/feed-item-lab`. Capture all with `python3 scripts/home-feed-review/capture.py` while the dev client and Metro are running. The capture script uses the configured Simulator UDID; review it before running on another machine.

Promotion remains a later decision: agree the anatomy, refine examples, cover accessibility/failure behavior, and record accepted scope in Storybook and the component inventory/pattern atlas.

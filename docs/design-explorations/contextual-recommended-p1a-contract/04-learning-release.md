# Learning Release: Contextual Recommended P1A Contract

## Release Channel

`Local build` first, then `TestFlight build` if the local slice feels coherent.

This release is not a disposable mockup. It should be a real bundled path through the existing Activities Recommended section, but constrained enough that it can be removed or revised without product debt.

## Learning Audience

Primary evaluator: Andrew using realistic Kwilt Activity data.

Target persona represented: Maya, an aspirational family organizer opening Kwilt to find the next doable action without configuring a system.

## Minimum Real Scope

The learning release should prove the smarter recommendation model, not a new UI concept.

Must be real:

- Existing Activities Recommended remains the delivery surface.
- A componentized scoring layer separates:
  - urgency;
  - importance;
  - readiness;
  - effort/shape;
  - context fit;
  - confidence.
- Context fit can influence ranking only as a bounded component of the score.
- Contextual framing only appears when confidence is high enough.
- The first implementation can support current-surface evidence where available, explicit place evidence, Activity type, title/notes cues, tags, schedule/reminder timing, and normal actionability.
- Contextual recommendations remain capped at one to three Activities.
- Deterministic reason labels explain why an item fits the moment.
- `Not now` removes an item from the current session/context without durable Activity metadata changes.

## Thin Or Temporary Scope

Can be thin in the first learning release:

- Context confidence can use explicit thresholds and deterministic scoring before any AI involvement.
- Evidence logging can be console/dev-only or test-visible before analytics are added.
- Reason labels can be simple and deterministic.
- Session dismissal can be in-memory only.
- Mobile contextual modules can be rare if confidence is genuinely low.

## Intentional Exclusions

Do not include:

- context chips or user-facing mode selector;
- standalone category-only global boosts;
- context grouping;
- context drilldown / Show more;
- saved or learned places;
- new geolocation persistence;
- new location permission request;
- widgets;
- notifications;
- automation;
- durable `actionContexts` field on Activity;
- AI rewriting tags, Goals, schedules, or location triggers.

## Brand-Goodwill Guardrails

The release should feel like Kwilt is quietly more aware, not like it is asking Maya to operate a recommendation system.

Guardrails:

- If confidence is weak, keep the normal Recommended framing.
- Do not label a module with contextual copy unless the scoring model has enough confidence.
- Avoid productivity language such as optimize, crush, or focus mode unless it already belongs to the surface.
- Keep the info popover honest about the signals used.
- Never imply Kwilt knows the user's location or situation when it does not.

## Rollback Path

The release should be reversible by:

- keeping the richer score components internal to the existing recommender;
- preserving the current `getRecommendedPriorityActivities` defaults for existing callers;
- keeping session dismissal in memory;
- avoiding migrations or durable metadata writes;
- hiding contextual labels behind confidence gates.

Rollback should mean disabling the context input and returning to existing Recommended behavior.

## What Would Justify Permanent Product Work

Turn the learning release into accepted product capability if:

- contextual modules appear only in moments that feel justified;
- the top one to three recommendations are observably easier to act on than normal Recommended;
- `Not now` is used as occasional correction, not constant cleanup;
- normal Recommended remains predictable when no context exists;
- the architecture clearly supports P1B/P2/P3 signals later without rewriting the UI.

## What Would Force Revision

Revise before shipping broadly if:

- the scoring model still behaves like category weighting;
- mobile rarely has enough context and desktop is the only coherent case;
- reason labels feel like false certainty;
- `Not now` becomes necessary for trust;
- implementation pressure reintroduces chips, grouping, or saved places to compensate for weak inference.

## Next Step Into Spec

Before implementation continues, update the P1A spec/brief with this learning-release contract:

- componentized recommendation model first;
- Recommended as delivery;
- no chips by default;
- no standalone category-only boosts;
- confidence-gated contextual copy;
- normal Recommended unchanged without context;
- `Not now` session correction.

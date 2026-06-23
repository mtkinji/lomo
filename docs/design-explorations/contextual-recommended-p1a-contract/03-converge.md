# Converge: Contextual Recommended P1A Contract

## Scoring

| Alternative | Maya fit | Strategy fit | Trust | Implementation fit | Verdict |
| --- | --- | --- | --- | --- | --- |
| A: Manual Context Selector | Medium | Low-medium | Medium | Strong | Reject for P1A default; too much mode switching. |
| B: Category-Weighted Recommended | Weak | Weak | Weak | Strong | Reject; this is not actual context. |
| C: Surface-Context First | Medium-strong | Strong | Strong | Strong | Use as the first implementation posture. |
| D: Componentized Next-Action Scorer | Strong | Strong | Strong | Medium | Choose as the P1A contract. |
| E: P1B-First Explicit Place Delivery | Medium | Medium | Strong for place tasks | Medium | Keep as P1B, not P1A replacement. |

## Chosen Direction

Choose **Richer Next-Action Scoring inside the existing Recommended section**.

The UI layer should remain mostly unchanged. The product work is the recommendation model: split scoring into urgency, importance, readiness, effort/shape, context fit, and confidence so Recommended can become smarter without turning context into a new user-facing mode.

## P1A Contract

P1A should introduce a richer recommendation model with three separate concepts:

1. **Core next-action score** - urgency, importance, readiness, and effort/shape.
2. **Context-fit score** - why an Activity might fit a real-world situation such as out-and-about, at a computer, or at a place.
3. **Confidence policy** - whether context evidence is strong enough to affect labels or framing.

Context fit may influence ranking as one bounded component of the model. Contextual labels or framing should appear only when confidence is high enough. If confidence is not high enough, Kwilt keeps the normal Recommended framing.

## P1A Inputs

P1A may use existing signals:

- current surface: mobile app or desktop app;
- title and notes cues;
- tags when present;
- Activity type;
- schedule/reminder timing;
- priority/rank/actionability state;
- existing explicit location metadata;
- existing explicit location-trigger state where available;
- session-scoped dismissal state for `Not now`.

P1A should not add:

- new geolocation persistence;
- learned/saved places;
- new location reminder suggestions;
- widgets;
- notifications;
- automation;
- context grouping;
- user-facing context taxonomy.

## P1A Context Hypotheses

Recommended P1A hypotheses:

- `desktopReady` - strong when Kwilt Desktop is open; Activity fit can use title/notes/tags/type cues for writing, admin, email, research, file, planning, or computer work.
- `outAndAbout` - mobile-only and conservative; should require stronger evidence than just a shopping-list Activity. Existing explicit location metadata or explicit location-trigger state can contribute moment/candidate evidence.
- `callsMessages` - allowed by the ClickUp strategy, but should be treated carefully. If Kwilt does not have enough real evidence or product language for calls/messages, it should be deferred or implemented only as a candidate-fit reason under a higher-confidence context.

## Reductive Design Decisions

- Do not ship context chips in P1A unless explicitly re-accepted later.
- Do not use standalone category boosts that can overpower urgency, importance, readiness, or confidence.
- Do not add a new Context grouping.
- Do not add a context drilldown.
- Do not persist context labels on Activities.
- Do not ask for location permission.
- Do not create learned places.

## Activation Path

P1A activates inside the existing Recommended-eligible Activities surface. The scorer can rank better immediately, while contextual copy still requires high confidence.

Desktop has the clearest activation path: opening Kwilt Desktop is meaningful surface context.

Mobile should be conservative with contextual framing. If confidence is low, keep the normal Recommended label and explanation.

## Stated Bet

We're betting that Recommended can become the first delivery vehicle for contextual next action if its scoring model gets smarter, componentized, and confidence-aware. If this only works when the user manually selects a mode, we should revisit whether context chips belong in a later explicit-control layer.

## Success Signal

Qualitative: Maya says the top recommendations feel more like the right next action, not merely that Kwilt prefers certain task categories.

Behavioral: users open contextual recommendations, act on them, and use `Not now` rarely enough that the module does not feel noisy.

Trust: when Kwilt lacks context, it stays quiet and the normal Activities experience remains predictable.

## Spec Delta Needed

Update the P1A spec so implementation cannot collapse into static scoring:

- Define the componentized scoring contract before changing scorer weights.
- Require context fit to remain bounded relative to urgency, importance, readiness, and effort/shape.
- State that standalone category-only boosts are rejected.
- State that chips are out of P1A unless explicitly re-accepted.
- Define fallback as normal Recommended/list, not a prompt asking the user to choose a context.
- Add tests for unchanged normal Recommended behavior when no high-confidence context exists.

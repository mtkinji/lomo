# Frame: job-delivery-map

## What the user said

> Yes, and now run this whole concept through a design loop

Earlier context:

> I feel like the app should maintain some sort of job -> job steps -> UX flow map. The intent would be that I can routinely ask the question, "How good is the app at delivering against its promised outcomes?" or "What should we improve next to do better?" or "Which UX workflows need to be improved next?" and those questions can be added to an automated daily build loop, or an ad hoc build loop.

> Yes, and it will be important to run through design loops during the improvement cycles. So for example, we have current in-app surfaces for answering the user question, "What spending area am I trying to keep intentional?" but a design loop should be able to uncover that we don't have an iOS widget yet, which might make Maya's job even easier and better done.

Review cadence: run end to end.

## Restated in user voice

When I am improving Kwilt Money, I want a durable map from promised user outcomes to job steps, current UX flows, evidence, and surface opportunities, so that daily and ad hoc build loops can decide what to improve next based on Maya's real job rather than on whichever screen is most visible.

## Target audience

`audience-aspirational-family-organizers` - households trying to become more organized without adopting a productivity methodology.

## Representative persona

Maya: a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: Maya is trying to avoid accidental spending drift without running a finance dashboard.
- What she is trying to become/do: Keep family spending choices aligned with a few chosen lanes.
- Emotional state or tension: She wants support at the spending moment, but she does not want to be managed, judged, or forced into budget administration.
- What would make this feel wrong to her: A system that optimizes internal feature work while missing the real moment where her job becomes hard.

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - the map exists to keep build effort aimed at real progress in the household spending behavior Maya cares about.

## Job Flow Step

Primary job flow: `job-flow-maya-review-budget-reality-before-spending`.

Most relevant current steps:

- Step 1: Name the spending lanes that often drift.
- Step 3: See the relevant lane meter before opening a connected app.
- Step 4: Understand the spend reality in plain language.
- Step 5: Choose whether to open the app for now.
- Step 7: Keep the household pattern because the pause feels helpful, not punitive.

The current app has in-app flows for creating/editing budget lanes, viewing meters, reviewing transactions, connecting accounts, and configuring Screen Time controls. The missing operating capability is a product-development artifact that can say whether those flows actually deliver the promised job, and when the next improvement should be an in-app refinement versus a new surface such as an iOS widget.

## Active JTBDs

- `jtbd-put-intention-before-impulse` - the map should keep improvement work focused on putting budget reality before drift moments.
- `jtbd-carry-intentions-into-action` - the map should reveal which UX flows carry a household intention into follow-through.
- `jtbd-trust-this-app-with-my-life` - the review loop must be evidence-based and honest about weak or unverified flows.
- `jtbd-review-budget-reality-before-spending` - the first mapped local sub-job for Kwilt Money.

## serves snippet

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
```

## Friction We Are Addressing

The app can accumulate feature briefs, screenshots, routes, and experiments without retaining a single source of truth for "how well do we deliver the promised outcome?" That makes the build loop vulnerable to local optimization: improving the budget detail screen when the job may actually need an ambient widget, a Screen Time gate, a notification, or a different onboarding moment. The design loop needs a job-step review surface that can start with current UX flows but is allowed to discover missing surfaces.

## System Alignment

Constraint posture: `Extend the system`.

Current system facts:

- Existing docs: `docs/jtbd/_index.md`, `docs/personas/_index.md`, `docs/job-flows/`, `docs/feature-briefs/`, and `docs/design-explorations/`.
- Existing design-loop grammar: exploration folders with `00-frame.md` through `05-evaluate-learning.md`, then a feature brief.
- Existing product surfaces: Budget tab, budget detail, Transactions, Accounts, onboarding, review screen, app controls, Screen Time controls, Ask.
- Existing related exploration: `ios-budget-widgets`, which already shows that job-step improvement may require surfaces outside the main app.
- Existing app state: the app has moved beyond the original hard-coded flow in some areas, so job-flow docs can become stale unless the review process compares docs, code, and runtime evidence.
- Existing automation habit: Kwilt work already benefits from repeatable finish gates and truth-surface checks.

Constraints to preserve:

- Do not turn the map into a generic product requirements database.
- Do not treat screens as jobs.
- Do not update delivery scores without evidence or an explicit assumption.
- Keep the first map readable enough for daily use.
- Keep design loops as the way to evaluate non-trivial improvements.

Constraints we may challenge:

- Job-flow docs should not stay prose-only if build loops need structured queries.
- Feature briefs should not be the only planning artifact; they need to point back to the job step they improve.
- Existing UX surfaces should not be assumed sufficient just because they exist.

Design implication:

Build a thin structured map first, then add a small review runner that can produce daily/ad hoc recommendations. The map should explicitly track `surface_opportunities` and `design_loop_status`, so missing surfaces like iOS widgets can emerge as legitimate next steps instead of as side ideas.

## Aspirational Design Challenge

How might we help Andrew and Codex routinely improve Kwilt Money by asking how well Maya can traverse each job step, while preserving a lightweight, evidence-based design loop that can discover better surfaces beyond the current app screens?

## Out of Scope

- Building a production analytics dashboard.
- Auto-generating perfect scores from code alone.
- Replacing feature briefs or design explorations.
- Implementing iOS widgets as part of this slice.
- Building a user-facing admin UI for the map.

## Open Question

Should the first review runner be a scripted CLI/report, a Codex prompt template, or both?

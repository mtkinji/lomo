# Converge: Home as continuity after onboarding

Status: developed recommendation for review, September 10, 2026. No implementation or production promotion implied.

## Decision

Choose a short visible outcome sequence on Home with one recommended invitation/action and an optional full Getting started page, powered by the same capability-owned progress used during onboarding. The existing Welcome and value-door reel remain the orientation surface. Home makes space for authorized shared life independently of whether guidance is active or settled; completion never unlocks the feed. The deeper review in `06-deeper-review.md` refines the earlier single-card approach.

## Alternatives reassessed against the broader system

| Alternative | First use | Interruption | Existing onboarding fit | Mature Home | Trade-off |
| --- | --- | --- | --- | --- | --- |
| Full checklist as default | Clear breadth but repeats the reel's job | Strong overview | Weak unless explicitly opened | Persistent admin burden | Reject as default; retain on demand |
| Short sequence + one recommended action | Reuses intent and explains scope | Strong with visible parked steps | Strong; no second selection | Adapts independently of feed count | Choose; adds quiet context without multiple dominant actions |
| Conversation-led setup | Helpful for ambiguous needs | Depends on conversation continuity | Would conflict with direct capability doors if mandatory | Risks an agent/status hub | Optional existing Chat route only |

## Capability delta

Today someone can choose or start native work and later reach an empty Home whose dominant suggestion is to post. Progress exists in several owner-specific forms but Home does not join them.

After this concept, an eligible adult can see the next action for a chosen path, understand a relevant household handoff, take an independent step while waiting, and resume without replaying orientation. Actual posts and source-owned arrivals remain immediately available.

Home still cannot configure a bank, authorize another device, publish a post, activate a child capability, or infer success on behalf of its owner. Setup produces no synthetic social posts and no compulsory personal Goals/To-dos.

## Reductive decisions

- Reuse the Welcome/reel for optional discovery and the native capability UI for action.
- One private guidance region; no second task inbox, capability tiles, readiness dashboard, progress ring grid or daily setup reminder.
- No second global question when intent is known. After Skip tour, preserve the open-menu exit; on the next unobscured Home view, offer an inline starting invitation when needed.
- Add a Home overflow destination, Getting started, rather than a new top-level tab.
- Existing source celebrations retain precedence. Completing setup does not trigger a second celebration or automatic sharing offer.
- Each proposed setup or adoption step has an explicit invitation; optional participation must still be offered. Ordinary recurring app work stays in its capability. Home guidance has finite setup/first-use boundaries; it does not expand into every unfinished task.

## Activation

Chosen intent, a factual prerequisite, or a declared contextual value trigger activates guidance. A user need not discover a path before being invited into it. Known new users can receive a starting invitation. Lack of posts alone, elapsed time, sibling configuration, marketing guesses, and new feature releases do not justify a specific setup diagnosis.

Teach one first useful cycle where already accepted, such as Food. Treat longer adoption as a measured outcome, not a checklist duty. A new household can be useful with one caregiver; a child profile can be useful without its own email or phone.

## Bet and trade-offs

We are betting that preserving intent and making the next doable action legible increases first useful outcomes and later independent use. We accept a small typed projection layer to eliminate competing setup state. We reject simplifying household readiness to one boolean because it would produce misleading next actions and privacy errors.

If users overlook the continuation, first improve placement and concrete labels. If they repeatedly dismiss it, shorten the path or suppress it rather than add urgency. If they complete setup but do not use the capability, examine the payoff instead of expanding the checklist.

## Recommended scope decisions

- Future promoted new-user unscoped shell landing: Home, preserving Skip tour's open-menu exit and direct destinations.
- Existing users: no blanket landing change and no migration-triggered onboarding. Home remains reachable normally.
- Adult personal Home only. Child/shared-device guidance stays in approved child/Household surfaces.
- Household, Money and Meals receive complete concept contracts. Screen Time has a distinct per-child/device readiness contract and cannot be promoted from pairing alone.
- Numeric progress is path-specific, with a stable finite denominator. No global percentage of Kwilt configured.

The exact behaviors, state table, selection policy and acceptance criteria are in the [draft brief](../../feature-briefs/home-getting-started.md).

## Deeper-review refinements

The product brief now defines benefit-led ordering, a short visible sequence, Later versus Not for me/help, recipient-first-value choreography and a deliberate first shared interaction. Guidance maturity is independent of feed population. These replace any earlier implication that one post settles setup or that deferral must hide a step until a new event occurs.

## Continuation and discovery refinement

Home must independently invite meaningful unused capabilities, not rank them permanently behind current setup. The proposed shared region can feature discovery with a quiet continuation row, or feature continuation with an explicit discovery row. Detailed setup sequences remain part of continuation. The inline region above the feed is a placement recommendation to compare with a contextual native card and on-load bottom guide; see `07-recommendation-placement-and-discovery.md`. Earlier wording that makes discovery depend on current payoff is superseded.

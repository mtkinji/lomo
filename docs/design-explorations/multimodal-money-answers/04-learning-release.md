# Learning Release: Multimodal Money Answers

## Concept To Build
Make the user's monthly income spending limit visible in Money and answer the
same limit question plainly in Chat, with one optional private scheduled check.

## Capability Delta
Today, the user cannot:
- see the 70% limit and dollar basis from Summary;
- ask Chat whether the plan fits that limit using a complete Money read contract;
- receive a scheduled answer derived from the same current evidence.

After this release, the user can:
- see the current monthly spending limit and plan room on Summary;
- ask `Am I within my income spending limit?` in Chat;
- receive an evidence-backed answer with freshness and a Money return target;
- save that exact supported check for a private weekly in-app notification.

Still intentionally not supported:
- SMS delivery or reply-by-text;
- arbitrary saved questions;
- Chat-authored SQL;
- category-plan writes from Chat;
- detailed lock-screen financial values;
- autonomous rebalancing.

## User Experience
Summary adds one calm plan-contract block:

`Monthly spending limit`
`$3,360 · 70% of $4,800 income`
`$3,264 planned · $96 left`

Category amount review uses the same language and shows the resulting percentage,
dollar variance, and every category that changes before save.

In Chat, the user asks `Am I within my income spending limit?` and receives the
same answer in one or two sentences. `See Money details` opens the authoritative
Summary or plan destination. After the answer, `Check this for me` offers a
weekly cadence and creates a private notification whose visible text contains no
amounts. Opening it reruns the saved typed question against current evidence.

## Existing Product Relationship
This enhances Money Summary, the existing category-change preview, Unified Chat's
`money.read`, and native notification delivery. It does not add a parallel Money
database, financial reasoning engine, Chat-owned receipt, or reporting dashboard.

## Buildable Slice
Must be real:
- Extend the Money read projection with living percentage, trustworthy planning
  basis, target amount, planned amount, unassigned room, over-target amount,
  freshness, and refusal status.
- Derive UI and Chat limit answers from one tested domain formatter/result.
- Make the limit block discoverable and accessible on Summary.
- Show resulting plan percentage and changed categories before a category save.
- Deep-link Chat and notification results to the authoritative Money destination.
- Persist one typed saved-check kind with cadence, timezone, disclosure level,
  active state, and last-run status.
- Schedule and cancel the private native notification without recording amounts
  in analytics.

Can be thin or temporary:
- Support only the current-month plan-versus-limit question.
- Offer one weekly cadence rather than a general scheduler.
- Use in-app/native notification delivery only.
- Keep scheduled-check management inside the answer flow or Money Plan rather
  than introducing a dedicated automation destination.

Intentionally excluded:
- SMS, voice, arbitrary natural-language schedules, reply continuation, condition
  triggers, household-shared delivery, financial advice, and plan mutation.

## Release Channel
Start in an Andrew-only local build, then use TestFlight with a small invited set
that includes people with different levels of UI fluency. This needs real phone,
Dynamic Type, notification, background timing, and comprehension evidence;
simulator/source proof alone is insufficient.

## Brand-Goodwill Guardrails
- Lead with the answer and use familiar words.
- Never expose exact financial values in notification text by default.
- Show when evidence was last refreshed.
- Refuse clearly when income evidence is stale or incomplete.
- Do not offer scheduling until after the user receives a useful answer.
- Make every saved check visible, pausable, and removable.

## Reversibility
The Summary block and Chat answer can remain if scheduled checks are disabled.
Saved checks are additive, carry no financial authority, and can be paused or
deleted without changing the plan. A feature flag can hide scheduling while
preserving the underlying Money read improvements.

## Permanent Product Threshold
Promote the capability when users can explain the same limit result from Summary
and Chat, trust the return path, and find the private scheduled check helpful
rather than surprising or noisy.

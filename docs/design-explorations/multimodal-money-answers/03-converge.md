# Converge: Multimodal Money Answers

## Chosen direction
Choose **Shared Money Answer System**.

UI is the authoritative record. Chat is the conversational doorway. Scheduled
notification or SMS is a delivery channel. Money owns the calculation and the
result must remain consistent across all three.

## Why this direction

| Direction | Comprehension | Low UI fluency | Inspectability | System fit | Trust risk |
| --- | --- | --- | --- | --- | --- |
| UI-first | High in UI | Low | High | High | Low |
| Chat-first | High in conversation | High | Medium | Medium | Medium |
| Shared answer system | High across modalities | High | High | Medium-high | Low-medium |
| SMS-first | Medium-high | High | Low-medium | Low-medium | High |

The shared system is the only direction that serves users who prefer texting
without treating the native product as a fallback or leaving UI users with the
same comprehension problem.

## Capability delta
Today, the user cannot reliably:
- see the chosen income spending limit and remaining plan room on Summary;
- ask whether the current plan fits that limit and receive the exact target facts;
- preview a category change in ordinary language from Chat;
- save a Money question and receive a fresh answer later.

After this concept ships, the user can:
- see `70% of income` and its dollar basis in the authoritative Money UI;
- ask `Am I within my limit?` and receive the same result in Chat;
- inspect the evidence and return to the relevant Money object;
- save a supported question as a private scheduled check.

Still intentionally unsupported:
- arbitrary model-generated database queries;
- financial advice or claims that a category amount is universally correct;
- plan writes from outbound messages;
- money transfers;
- unrestricted detailed SMS;
- a full user-authored query builder.

## Shared answer contract
The first contract should stay conceptual and small:

- **Question meaning:** a bounded kind such as plan-versus-limit, category state,
  category-change preview, or forecast risk; a period; and an optional category.
- **Answer:** one decision-ready headline, the few facts required to support it,
  freshness/confidence, and an authoritative return target.
- **Saved check:** the typed question meaning, cadence or condition, timezone,
  channel, disclosure level, and active state.

The user's original words can remain as the display label. Execution uses the
typed meaning, not stored SQL or a frozen natural-language interpretation.

## Example projection
One underlying result:

- UI: `68% of income planned · $96 left`
- Chat: `You are within your 70% limit. You have $96 of room.`
- Private delivery: `Your weekly Money check is ready.`
- Summary delivery: `Your plan is still within its limit.`
- Detailed delivery, only when chosen: `Your plan uses 68% of income. $96 remains.`

## Reductive decisions
- Add no dashboard, AI score, or general query-builder screen.
- Keep one visible plan contract on Summary rather than a grid of financial KPIs.
- Rename primary copy to `monthly spending limit`; retain `living target` as a
  domain concept where useful.
- Support a bounded catalog of high-value questions before open-ended analysis.
- Show one answer and at most one useful next move.
- Reuse Money's preview and receipt paths; do not create Chat-owned financial math.
- Start with private in-app delivery. Defer SMS replies and detailed lock-screen
  content until consent and comprehension are proven.

## Activation path
1. Summary makes the monthly spending limit visible without requiring setup education.
2. A user who asks a supported Money question in Chat receives a short answer and
   can inspect its Money source.
3. After a useful answer, Kwilt may offer `Check this for me` rather than promote
   scheduled reporting before value is demonstrated.
4. The user chooses cadence, condition, and disclosure before delivery begins.

## Accepted trade-offs
- The first question catalog is narrower than arbitrary database Q&A.
- SMS comes later than in-app Chat and notifications.
- Some questions return `Kwilt cannot check this yet` when evidence is stale or
  the planning-income basis is not trustworthy.

## Rejected trade-offs
- Hiding a weak UI behind Chat.
- Making people configure a reporting system before asking one question.
- Letting the language model independently compute or mutate the plan.
- Sending detailed financial information by default.

## Bet
We are betting that the dominant barrier is translation and navigation, not a
lack of financial detail. If the same plain, capability-owned answer is visible
in UI and available through conversation, more users will understand and trust
their plan without learning a budgeting interface. If that is not true, revisit
the question catalog and guided UI flow before expanding automation or SMS.

## Success signal
A user with low familiarity with Money can answer three questions without help:
what limit they chose, whether the current plan fits, and what a proposed
category change would affect. They can do this from either Summary or Chat and
recognize that both answers come from the same Money evidence.

# Frame: Money First Counsel

## Consolidated planning outcome — 2026-09-15

Andrew subsequently requested a comprehensive onboarding plan from the full Origin walkthrough.
The [Kwilt first-run brief](../../feature-briefs/kwilt-first-run-onboarding.md) integrates this
frame into the connected/sync transition, optional contextual composer, evidence-backed first
look, and explicit budget/rule action handoff. It resolves the recommended journey without
requiring additional phase checkpoints. The original frame below remains the provenance;
the integrated behavior is proposed, not implemented or released.

## Review cadence

Check in after each phase. Andrew is actively co-designing this experience, and the proposal adds
new AI behavior at the most trust-sensitive point in Money onboarding.

## What the user said

> I actually think we could kind of replicate that screen. I think we could also do AI-generated
> advice. That could be relatively high quality. And I think we could do it in a screen like this.
> And I think people could love it.

## Restated in user voice

Andrew's stated product objective is to help people see and control their spending.

When I have connected enough financial evidence and told Kwilt what is changing in my life, help me
see a small number of clear, useful observations and next moves grounded in both, so I can feel that
Kwilt understands my situation without having to trust unexplained AI or configure a finance system.

## Target audience

`audience-aspirational-family-organizers` - people coordinating ordinary household life who want
useful financial truth without turning budgeting into a hobby.

## Representative persona

Maya has connected a main spending institution and Kwilt has enough transaction evidence to show a
provisional household picture. She may also know about a near-term change—income, a major purchase,
or a family commitment—that transactions cannot reveal.

- Current situation: Kwilt can see recent spending but does not yet know the important change behind
  the numbers.
- What she is trying to do: Understand what matters in the evidence and choose one practical next
  move.
- Emotional state or tension: She is interested in personalized help but alert to confident,
  intrusive, or generic financial claims.
- What would make this feel wrong: A generic AI summary, invented causality, hidden evidence scope,
  securities or investment recommendations, more intake questions, or a plan change applied without
  her confirmation.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Money matters when it helps Maya make one real household
choice rather than merely presenting a financial dashboard.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`, especially:

- Understand the evidence: current delivery score 4, but personalized synthesis is not yet a first-
  use contract.
- Make the intentional choice: current delivery score 3.
- Trust and repeat the pattern: current delivery score 2.

The product can calculate and display transaction-backed reality, but the acquisition-to-first-
decision seam still does not prove that Kwilt can combine that truth with relevant life context and
produce counsel the person understands well enough to use again.

## Active anchors

- `jtbd-review-budget-reality-before-spending` - counsel must begin with current, inspectable Money
  evidence.
- `jtbd-get-help-without-retelling-my-life` - the person should add only the context that transactions
  cannot reveal, not reconstruct their entire life.
- `jtbd-understand-why-ai-suggested-this` - the result must distinguish user context, financial fact,
  inference, and uncertainty.
- `jtbd-stay-in-control-of-ai-actions` - any proposed budget change remains a proposal until the
  person inspects and confirms it in the owning Money or Screen Time surface.

## serves snippet

```yaml
serves: [jtbd-review-budget-reality-before-spending, jtbd-get-help-without-retelling-my-life, jtbd-understand-why-ai-suggested-this, jtbd-stay-in-control-of-ai-actions]
```

## Friction we're addressing

Kwilt's current Money onboarding can show a deterministic recent-spending receipt and then asks the
person to choose among three directions. It does not yet let the person supply one piece of ordinary
language context and receive an immediate synthesis that visibly uses it. Adding a new questionnaire
would deepen setup fatigue; a single optional composer followed by earned counsel can replace that
choice burden with a demonstration of how Kwilt works.

The Origin reference adds an important distinction: a finding can be valuable before it is
actionable. “We found 19 recurring charges totaling $4,394/month” may not tell the person what to do,
but it is a legible proof point that the product inspected multiple accounts, recognized a pattern,
and can surface something the person would not readily calculate alone. That earned “this app is
smart” reaction is a trust-building job of the sequence, not yet counsel and not yet activation.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- `MoneySetupScreen` already connects accounts, runs deterministic analysis, produces a recent-
  spending assessment, and presents `MoneyPlanningIntentScreen`.
- The canonical `ChatComposer` already supports expanding text, voice recording, transcription,
  waveform feedback, accessible actions, and send-state handling.
- Unified Chat, onboarding workflows, and Money context-loading already provide agent and bounded-
  context infrastructure.
- Money owns authoritative transaction, plan, forecast, correction, and receipt truth.
- Existing full-screen interstitial and atmospheric-image patterns can carry a short synthesis
  sequence without introducing a second visual system.
- `MoneyFirstTrustedDecision` is not satisfied by viewing advice. It still requires an authoritative
  `continue`, `adjust_plan`, `keep_blocked`, or `correct_truth` outcome.

Constraints to preserve:

- Deterministic Money logic computes amounts, periods, coverage, freshness, and plan impact. The
  model interprets supplied facts; it does not invent or recalculate financial truth.
- Freeform context is optional and bounded to the current counsel run. The UI states what context is
  active and does not silently turn sensitive prose into a permanent global profile.
- Every generated item identifies the evidence that shaped it and distinguishes observation from
  recommendation.
- A high-salience finding may earn its place without an immediate call to action, but it must be
  deterministic, inspectable, and labeled as a finding rather than advice. Recurring-charge totals in
  particular must exclude or clearly classify transfers, card payments, housing, and other repeating
  transactions that could make the number technically true but misleading.
- Missing, partial, or stale account coverage reduces confidence visibly.
- Counsel stays within budgeting, spending, savings-buffer, and household-plan tradeoffs. Personalized
  securities, portfolio, asset-allocation, or investment recommendations are excluded. U.S. investor
  guidance describes apps providing automated investment advice as robo-adviser activity that is
  typically subject to investment-adviser regulation.
- AI cannot directly mutate a budget or control. It may propose one inspectable change; the person
  confirms a budget change in Money or an app-access rule in the canonical Screen Time composer.
- The experience remains calm, optional, non-shaming, and usable without voice.
- The copy does not call a spending fact `advice` and does not call Kwilt a financial adviser.

Constraints we may challenge:

- Replace or collapse the current post-analysis three-choice intent screen rather than adding First
  Counsel as another onboarding step.
- Let one canonical composer teach the agentic model inside capability onboarding instead of
  reserving that interaction model for the general Chat surface.
- Use a brief, presentation-led synthesis moment when it earns attention, while keeping the durable
  result and actions in Money.

Design implication:

First Counsel should be a payoff, not another intake funnel. Its sequence can do three different
jobs: prove that Kwilt found something non-obvious, interpret why it may matter in light of the
person's optional context, and offer one next move. Only the final job needs to be actionable. Across
the sequence, context, evidence, inference, and action remain visibly distinct. It should enhance or
replace the current Money intent choice rather than extend the sequence.

### Candidate final offer: pause apps at a spending limit

Andrew's next Origin reference turns the third card into an offer for Origin's own cash account,
preceded by a personalized projected benefit. The Kwilt counterpart is a contextual invitation to
pause selected spending apps when a relevant budget is fully used. This connects the first-run
findings to the existing lead offer, Control your spending.

The sequence need not mechanically contain one finding, one interpretation, and one action. Two
useful findings followed by a relevant offer may work better. Keep the functions distinct without
fixing the number or content of cards before reviewing all the reference material.

Proposed copy, when a supported Shopping finding makes this relevant:

> Pause shopping apps when you reach your budget.
>
> Choose which apps Kwilt pauses.
>
> Set up app pauses
>
> Not now

After acceptance, show the relevant budget and its limit, request Screen Time access when needed,
let the person choose apps with Apple's picker, then review and save one rule. Reuse the canonical
Screen Time sentence composer. If a budget limit is not yet established, let the person confirm it
before saving the rule. Return to the first-run flow after save or cancellation.

Current source evidence:

- `MoneyCategoryDetailScreen.tsx` opens `SettingsScreenTimeRuleBuilder` with the current category's
  source ID, name, and `when_over` preset.
- `PersonalScreenTimeRuleBuilderScreen.tsx` supports a budget being fully used and 95% used.
- `ios/Kwilt/KwiltScreenTimeProtection.swift` uses `FamilyActivityPicker` for app selection.
- The accepted `screen-time-rule-system-consolidation` brief assigns rule storage, editing, and
  enforcement to Screen Time; Money supplies budget truth. This supersedes the imported Money-only
  editor design. Source inspection is not fresh signed-device enforcement proof.

Recommendation and app-selection boundaries:

- Transactions can support a merchant finding, such as purchases at Amazon or Target. They do not
  prove the corresponding app is installed or that the purchases occurred through that app.
- Apple's standard picker returns private selection tokens. The user chooses the actual apps;
  Kwilt can prefill the budget condition, not silently select merchant apps from transaction data.
- Known URL-scheme queries can sometimes detect an app handler. They are limited and do not provide
  Screen Time selection tokens, so they are unnecessary for the first version of this offer.
- Present this as an optional fit for the person's spending intent. High spend alone does not prove
  impulse buying, overspending, or a desire for restrictions. Use another next move when this offer
  is irrelevant, already configured, or unsupported.
- Do not promise a savings amount or that app pauses prevent all purchases. Rule evaluation depends
  on available transaction data; the product must not imply instant checkout interception.

Apple references checked 2026-09-15:
[FamilyActivityPicker](https://developer.apple.com/documentation/familycontrols/familyactivitypicker),
[canOpenURL](https://developer.apple.com/documentation/uikit/uiapplication/canopenurl(_:)).

### Closing promise: useful actions

The next Origin reference says it found 16 actions to strengthen a financial health score. Andrew
values the expectation created by the word actions and its italic emphasis: the application will
help something happen. Kwilt's outcome is seeing and controlling spending; a financial health score
does not belong in this frame.

Candidate closing copy:

> A few *actions* to help you control your spending.
>
> Show me

The destination must contain the actions promised. Depending on the available evidence and current
setup, examples could include reviewing recurring charges, confirming a Shopping budget, or setting
up app pauses at that budget's limit. Each action opens the relevant evidence or a prepared proposal
in its existing owning surface. Do not create generic to-dos merely to populate an action list.

Surface one recommended next step and let the person return to other relevant options later. This
does not require completing several actions during onboarding. Any count must equal the actual,
distinct, available actions; use singular copy if there is only one. Never invent missing problems
or promise completed changes when only suggestions have been prepared.

The closing moment should hand off into Money with that next step visible. Explore combining it
with the final offer rather than adding another mandatory interstitial. A short headline with one
emphasized word can carry the promise; no long financial summary or extra inline icons are needed.

### Arrival must feel complete

Andrew's final Origin screenshots show a notification invitation after the dashboard handoff,
followed by the unobstructed app. He repeatedly says finally and describes the overall process as
long. Preserve that observation alongside his enthusiasm for the individual screens.

First Counsel should become available around the earliest useful Money view. Explore optional,
revisitable findings within that view, with one prepared next step visible, rather than requiring
completion of every candidate presentation before the person can use Money. The final CTA must
arrive at that destination without another automatic modal or permission request.

Notification permission should follow an explicit choice of a relevant supported alert or reminder.
The preview should illustrate that specific benefit. General notification setup is not a condition
of seeing the spending result or taking the first action.

The first visible Money content should fulfill the preceding promise: personal spending evidence
and the recommended action. Candidate finding, app-pause offer, and action-summary concepts may be
combined. Treat reduced overall setup effort and continuity into the usable app as criteria when
comparing those concepts, not just the polish of each individual screen.

## Aspirational design challenge

How might we help Maya feel that Kwilt understands both her household numbers and the change behind
them, while preserving financial truth, explainable AI, user control, and a fast path to one real
decision?

## Out of scope

- Personalized investment, securities, portfolio, tax, credit, or debt-product recommendations.
- A persistent universal financial profile assembled from freeform onboarding prose.
- More account connections, credit-score collection, or a multi-question financial intake.
- Autonomous budget writes, transfers, purchases, or Screen Time changes.
- More than one recommendation requiring action in the initial counsel sequence.
- Treating counsel views, composer submission, or AI generation as activation.

## Open question

What threshold makes a finding feel impressively specific without becoming noisy, misleading, or a
mere financial-statistics slideshow?

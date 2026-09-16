# Reference Study: Origin First Run

## Source context

Andrew shared a series of first-run screens from Origin in the order he encountered them. Between
the fourth and fifth initial screenshots, he authenticated with Google. The observed sequence was:

1. An iOS App Tracking Transparency prompt over an atmospheric full-screen surface.
2. A sparse value promise with one `Next` action.
3. A sparse account-setup transition with one `Next` action; the sentence typed onto the screen.
4. The actual account-creation surface.
5. A post-authentication Face ID choice.
6. The native Face ID permission request.
7. A dismissible introductory-offer paywall.
8. A post-purchase account-connection introduction.
9. An in-app institution chooser headed `Start with your main spending account`, with a short
   featured list and search.
10. Plaid Link's co-branded consent and returning-user phone-number experience.
11. A branded connection-progress sheet followed by a connected-institutions review.
12. An optional credit-score connection requiring phone number, date of birth, and ZIP code.
13. A financial-profile review covering dependents, tax filing status, and annual gross income.
14. An investment-profile review covering credit score, connected accounts, risk profile, and
    retirement contribution.
15. An optional freeform personalization screen with examples and a large text/voice composer.
16. A return to the atmospheric brand surface while Origin analyzes the connected data.
17. A three-card `Advice` sequence beginning with a transaction-backed top-spending-category fact.
18. A recurring-charge finding, followed by an offer for Origin's own cash account, complete that
    three-card sequence.
19. A closing summary promises 16 actions and offers `Take me to my dashboard`.
20. A notification invitation overlays the app, showing example spending, expense, and advice
    notifications. Andrew reports accepting the subsequent notification permission request.
21. The unobstructed Home screen shows Overview, Net worth, and Advice tabs; the first viewport
    leads with a daily market brief and a net-worth card whose history will take time to populate.

The screenshot clocks span approximately 4:42 to 5:06 PM. This includes Andrew's narration,
screenshots, and optional detours; it is not a measured uninterrupted onboarding duration. His
repeated use of finally at the handoff is direct evidence of fatigue in this individual walkthrough,
not population-level conversion evidence.

This is a task-scoped external reference. It informs hierarchy, pacing, motion, and commitment
sequencing. It does not supply Kwilt's colors, typefaces, logo, product promises, permission
timing, account providers, or production assets.

## What creates the feeling

### One thought at a time

The first two authored screens contain one short thought and one action. They are not product
tours, feature lists, or forms. Negative space makes each sentence feel deliberate.

### Atmosphere before transaction

The opening feels like entering a product world before it feels like creating an account. Origin
uses a full-screen sky image, a small persistent mark, centered editorial type, and a bottom action
to establish that world.

### A commitment ladder

The user says yes to understanding the promise and yes to beginning setup before being asked to
authenticate. Account creation therefore feels like the next step in an action already underway,
not the price of discovering what the app does.

### Motion that makes the product feel present

The typed sentence turns a static transition into a moment of attention. The motion works because
the sentence is short, the screen has no competing content, and the user is not being asked to
read while completing a form.

### Security at the moment it becomes relevant

Face ID appears after the account exists and is explained as a faster, safer way to return. The
request has context and a clear consequence.

## Preserve, translate, reject

| Origin quality | Kwilt decision |
| --- | --- |
| One short thought and one action per authored story screen | **Preserve.** Use only where a distinct transition earns a screen. |
| Engagement before authentication | **Translate.** Let the person choose a useful Kwilt path before account creation, then resume that exact path after authentication. |
| Full-screen atmospheric imagery | **Translate.** Kwilt already has moving sign-in wallpapers and a launch moment; use Kwilt-owned imagery, Parchment, Pine, or a subtle textile/illustration treatment rather than copying the sky. |
| Persistent small brand mark | **Preserve through Kwilt's canonical `BrandLockup`.** |
| Typed sentence | **Translate.** Reveal one short complete sentence once; do not use continuous rotating copy or make the person wait to act. |
| Large editorial serif typography | **Reject as a direct style copy.** Use Kwilt's loaded Inter and Urbanist faces and achieve confidence through weight, scale, and spacing. |
| Immediate App Tracking Transparency prompt | **Reject.** A system tracking prompt before value is the weakest moment in the reference and should not become part of Kwilt's first impression. |
| Authentication form after two small commitments | **Preserve as a sequencing principle.** Keep Kwilt's existing provider and email workflow unless a separate auth issue is identified. |
| Global Face ID immediately after authentication | **Translate only where truthful.** Kwilt already has Money privacy-lock infrastructure. Offer device authentication when the selected path is about to hold sensitive financial data, not as generic security theater for every path. |
| Paywall before financial account connection | **Preserve for a paid Money path.** Explain the value first, ask for the purchase, and only then ask the person to connect sensitive accounts. |
| One dominant price and a quiet renewal line | **Translate with full clarity.** Keep the hierarchy calm, but use StoreKit's localized eligibility and pricing and keep the renewal disclosure plainly readable. |
| Five short, non-interactive benefit rows | **Preserve.** Describe the paid unlocks, not every capability available in the app. |
| Laurels, star rating, and member count | **Use only with substantiated Kwilt evidence.** Do not manufacture social proof to reproduce the composition. |
| Mark-only branding | **Preserve.** The Kwilt mark can carry the brand on a focused purchase screen without repeating the company name. |
| A focused institution chooser before full Link | **Preserve through Plaid Embedded Institution Search.** Keep the guidance in Kwilt's shell while Plaid owns institution results and the secure handoff. |
| `Start with your main spending account` | **Preserve the job clarity.** It turns `connect accounts` into one understandable first choice. |
| `The average member connects 9+ accounts` | **Reject until Kwilt has verified evidence, and probably soften even then.** The first task is one useful account, not matching another member's setup burden. |
| Branded connection progress naming the institution | **Translate.** Preserve context while data arrives, but tie progress to real work rather than decorative waiting. |
| Connected-account review with `Link another account` | **Translate as a secondary action.** One useful connection is enough to begin; adding coverage must not become the dominant next task. |
| Credit-score connection during first run | **Reject.** Kwilt does not need a credit score to deliver its first Money promise. Do not collect high-sensitivity data because another finance app does. |
| Financial and investment profile questionnaires | **Reject as onboarding.** Infer what Kwilt can, ask only questions that materially change the immediate answer, and defer enrichment until its benefit is visible. |
| ACH backup-payment authorization on the account-review screen | **Reject.** Connecting transaction data must not silently become payment authorization. Kwilt has no need for this contract in Money onboarding. |
| A real composer inside onboarding | **Preserve.** Teach the agentic interaction model by letting the person use it, not by explaining that Kwilt has AI. |
| `Share anything that could impact your financial life` | **Translate into a bounded evidence-gap prompt.** Ask specifically for context transactions cannot reveal, and keep the step optional. |
| Atmospheric analysis transition | **Translate.** Return to a recognizable Kwilt brand surface while real analysis runs, with concise truthful status copy. |
| Three full-screen advice cards | **Translate as evidence-backed insights.** Each card should connect a fact to the person's stated context and offer a useful next action. |
| Calling a category total `advice` | **Reject.** A spending fact is an insight or observation; advice must recommend a choice and explain why. |

## Current Kwilt system facts

- `App.tsx` currently renders `SignInInterstitial` whenever the auth state is signed out. A new
  user cannot reach universal or capability onboarding before authentication.
- `SignInInterstitial` already owns full-screen Kwilt imagery, subtle Ken Burns movement,
  crossfades, rotating short promises, Apple and Google providers, email sign-in, legal links, and
  Reduce Motion handling.
- The present surface combines the atmospheric promise and the authentication transaction in one
  moment. Origin's strongest lesson is to separate those jobs.
- Kwilt's capability-onboarding coordinator and selected path are user-scoped today. A pre-auth
  choice would need a small install-scoped pending intent that is claimed or cleared after sign-in.
- Kwilt already includes `expo-local-authentication` and a Money-specific privacy lock. Face ID
  must remain capability-scoped unless a separately approved app-wide protection contract exists.
- Kwilt's free foundation already includes Arcs, Goals, To-dos, Focus, attachments, and everyday
  planning views. Those capabilities should not be presented as benefits that require Pro.
- The paid contract currently centers on connected Money, advanced Screen Time, and advanced AI.
- A founding lifetime product already exists in the entitlement model as the non-consumable
  `pro_lifetime`, granting the same `pro` entitlement without renewal. Its current operating copy
  is `All Kwilt Pro features with one payment. No renewal.`
- The founding lifetime product is configured but is not yet a proven live offer. App Review,
  purchase and restore proof, backend reconciliation, and release evidence remain separate gates.
- Kwilt currently shows a generic connection illustration and `Connect accounts` action before
  presenting full-screen Plaid Link.
- The installed React Native Plaid SDK exposes `PlaidEmbeddedSearchView`. Plaid supports Embedded
  Institution Search for Transactions, and Kwilt's installed SDK is newer than Plaid's documented
  minimum React Native version for the feature.
- Embedded Institution Search uses the ordinary Link token. It can show Plaid's automatically
  personalized institutions or a Dashboard-configured list, supports search for other institutions,
  and hands the selected institution into the rest of Link.
- Embedded Institution Search is not compatible with Multi-Item Link or update mode. Kwilt's
  existing one-institution-at-a-time setup followed by `add another` is compatible; repair should
  continue using ordinary update-mode Link.

## Institution-connection decision

Origin's first institution screen appears to combine a custom branded shell with Plaid-powered
institution selection. The typography, background, heading, social-proof statement, and vertical
composition are clearly Origin-owned. The bank results and seamless transition into Plaid are
consistent with Plaid's Embedded Institution Search, although screenshots alone cannot prove
whether Origin used that component or a custom directory.

For Kwilt, use Plaid's embedded component rather than maintaining a separate bank directory:

```text
Kwilt mark                                      Close

Start with your main
spending account

Choose the account you use for everyday spending.
You can add more later.

[ Plaid Embedded Institution Search ]
  featured institutions + search
```

Selecting an institution should continue directly into Plaid's consent, credential, or OAuth flow.
Do not add a separate `Continue` button after institution selection. Preserve the existing token
exchange, duplicate-Item warning, reconciliation, cancellation, diagnostics, and repair contracts.

Use Plaid's automatic institution list first. It is localized using signals such as location, and
Plaid warns that manually curating the featured list can lower conversion. A custom list should be
an evidence-backed optimization, not a branding preference.

Do not copy `The average member connects 9+ accounts`. Kwilt has no evidence for that claim, and it
works against the calmer activation instruction. After the first connection, Kwilt already has a
better progressive question: whether anything important is missing. That is the right point to
invite another institution.

## Post-connection fatigue decision

Origin's connection-progress treatment is strong: it keeps the selected institution visible,
explains that transactions are arriving, and preserves branded continuity during provider work.
The friction begins immediately afterward. The experience asks the person to consider more
accounts, connect a credit score, verify a financial profile, and personalize an investment profile
before showing the value that all of this setup is meant to create. Each request is individually
defensible for a comprehensive financial adviser; together they feel like an intake form.

The connected-account review also includes authorization to debit eligible ACH accounts as a
backup subscription payment method. That is a separate financial consent, not a harmless account
connection detail. Kwilt should keep data access and payment authorization categorically separate.

Kwilt should use a stricter activation threshold:

```text
first useful spending institution connected
  -> truthful analysis progress
  -> first provisional budget view
  -> one consequential confirmation or correction
  -> optional improvement prompts later, in context
```

After the first successful connection:

- Treat the connected data as enough to start, even if household coverage is incomplete.
- Make `Build my first budget` or the resulting budget view the dominant continuation.
- Keep `Add another bank` secondary and available later from the resulting Money surface.
- Do not ask for a target account count or imply that complete financial aggregation is required.
- Infer income, fixed costs, transfers, and everyday spending from transaction evidence before
  asking profile questions.
- Ask a question only when the answer materially changes a number or recommendation the person can
  see now. Explain that consequence in the question.
- Do not add a credit-score step. Kwilt's initial budgeting and spending-control job does not need
  it.
- Defer household composition, tax status, risk preference, retirement contributions, and similar
  enrichment until Kwilt offers a feature whose accuracy clearly depends on that information.

The current Kwilt setup is already directionally better than Origin here: after a connection it can
analyze immediately, and its coverage screen asks whether anything important is missing rather than
requiring exhaustive aggregation. The refinement is to make `enough to start` unmistakable and pay
off the connection with a visible budget before asking for more setup.

There is a product-contract conflict to resolve before implementation. Current source gates Plaid
connection behind Pro, while the accepted Money Progressive Activation brief says monetization
should follow the first trusted decision. The Origin reference does not settle that question. Pick
one explicit contract—or define a real pre-purchase sample experience—before building the new
first-run sequence.

## Reusable questionnaire grammar

Origin's risk assessment is not a reason for Kwilt to add a risk profile. It is a strong reference
for any later, bounded Kwilt subflow that genuinely needs several consequential answers.

### What works

- The assessment opens as a tall rounded sheet over a dimmed parent. The person retains context and
  understands that this is a finite task they can close.
- A quiet uppercase eyebrow names the task while the close action remains fixed at the top right.
- Each step asks one question in large, confident type.
- Full-width answer rows make the complete choice target tappable. The selected row changes both
  border and radio state, so selection is not communicated by color alone.
- `Back` and `Next` stay in a fixed bottom action area. The reversible action is visually secondary;
  the forward action is unmistakable and remains in the thumb zone.
- The final screen turns answers into a named result (`Moderate`) with a short plain-language
  explanation. Completion therefore produces an artifact, not just a checkmark.
- Returning to the investment profile shows completed and incomplete components together. This
  makes the captured profile legible and gives later enrichment a home.

### What to change for Kwilt

- If a questionnaire has more than two or three questions, show `Step x of y` or a quiet progress
  bar. Origin's assessment does not disclose its length, which compounds the broader onboarding
  fatigue.
- Mark optional profile items as `Optional`, not merely empty. An empty credit-score row creates
  completion pressure even after the person chose to skip it.
- Use a completion image only when it reinforces the result or Kwilt's brand world. Do not add a
  scenic image as generic celebration.
- State what a result will change before asking the questions. For example: `These three answers
  change the monthly amount Kwilt recommends.`
- Keep the result editable and show where it will be used. A profile label should never become an
  unexplained permanent judgment.
- Build this anatomy from Kwilt's canonical `BottomGuide`, decision-row, and fixed-action-dock
  patterns rather than introducing a separate one-off modal system.

### Best Kwilt uses

1. A short, contextual budget-preference adjustment after the first budget is visible.
2. A Screen Time rule builder whose answers visibly change the resulting rule.
3. A later household-planning profile where every question unlocks or materially improves a named
   capability.

Do not use this polished container to justify more onboarding. The interaction grammar is reusable;
the investment questionnaire is not.

## Agentic-promise decision

The freeform personalization moment is strategically stronger than another profile form because it
teaches the product model through use. The person can type or speak in ordinary language, submit
once, watch the app synthesize, and receive a response. This begins to fulfill Origin's earlier
promise of a proactive adviser.

The visible sequence does not yet prove that the freeform context affected the result. The person
described a job change and an aspiration toward small-business ownership; the first response was a
top-spending-category total. That proves transaction analysis, but not personalized agentic
reasoning. Kwilt should make the causal bridge explicit.

### Recommended Kwilt version

Do not ask `Tell us anything about yourself` before showing value. First show one concrete result
from the connected evidence, then ask for the important context that transactions cannot reveal:

```text
We found your recent spending.

Anything changing that the numbers won't show?
A new job, a major purchase, or something you're saving for.

[ canonical Kwilt Chat composer with text and voice ]

Nothing else
```

Then synthesize the answer with the evidence:

```text
You're changing jobs and working toward business ownership.
Your recent spending averages $X a month, with $Y in flexible categories.

For now, I'd protect a larger cash buffer before tightening the rest of the plan.

[ Review the suggested budget ]
```

This response has three layers:

1. **User context:** reflect the stated change without embellishment or psychoanalysis.
2. **Evidence:** name the connected-data fact supporting the recommendation and its coverage.
3. **Action:** offer one concrete next move that the person can inspect or change.

The first response should not claim causality the model cannot support. If Kwilt cannot safely
connect the context to a recommendation, say what it understood, show the independent evidence, and
ask one clarifying question or defer the advice.

### Existing Kwilt advantage

Kwilt already has a canonical `ChatComposer` with expanding text entry, voice recording,
transcription states, waveform feedback, accessible actions, and send-state handling. Unified Chat
and onboarding also already have agent and workflow infrastructure. The opportunity is sequencing
and proof, not inventing another feature-local composer.

Use no more than three short examples, avoid the repeated fading-pill field shown by Origin, and
keep `Skip` or `Nothing else` honest. The user's freeform answer may contain sensitive financial,
employment, family, or health context; it must follow Kwilt's existing privacy and authorized-context
contracts rather than becoming an unbounded profile field.

### Advice-card grammar

- Use a familiar Kwilt atmospheric surface to mark synthesis, but never let atmosphere obscure
  freshness, coverage, or uncertainty.
- Label deterministic facts as `What we found`, `Recent spending`, or `Pattern` rather than
  `Advice`.
- Reserve `Suggestion` or `Next move` for an actual recommendation.
- Keep the `1 of 3` progress treatment when there are exactly three earned, distinct insights.
- Pair every amount with its time period and evidence scope.
- A finding may use `Continue` without requiring another task. Its evidence should remain available
  to inspect. A final offer should use a specific setup action and an easy decline.

### Third card: a relevant product offer

The supplied `Advice 3 of 3` screenshot proposes moving idle savings into Origin's own high-yield
cash account and displays projected annual earnings of $1,645. This is the screen's claim; the
screenshot does not establish the calculation assumptions or incremental benefit over the person's
current account. The useful interaction pattern is two personal findings followed by an offer
connected to the evidence.

Andrew proposes Kwilt's own equivalent: invite the person to pause apps such as Amazon or Target
based on spending limits. That provides a concrete use for Money and Screen Time together.

Candidate offer: `Pause shopping apps when you reach your budget.` Primary action:
`Set up app pauses`. Secondary: `Not now`. Show this when the evidence and person's intent make it
relevant, then open the canonical Screen Time composer with the budget condition prefilled. The
person grants access, chooses actual apps using Apple's picker, and confirms the rule.

Merchant transactions do not establish app installation or purchase channel. Apple's standard
FamilyActivityPicker keeps app selections private through opaque tokens; the product should guide
the selection rather than claim it discovered the person's installed shopping apps. Known
URL-scheme checks are limited and cannot supply the tokens needed to configure a pause.

Detailed proposal and current source pointers:
[First Counsel frame](../money-first-counsel/00-frame.md#candidate-final-offer-pause-apps-at-a-spending-limit).
Apple reference:
[FamilyActivityPicker](https://developer.apple.com/documentation/familycontrols/familyactivitypicker).

### Closing summary: a promise of actions

The next supplied screen says Origin found 16 actions to strengthen the user's financial health
score, with italic emphasis on actions and financial health score. A stacked summary card sits
underneath and the CTA reads `Take me to my dashboard`. The screenshot establishes the promise of
actions, but does not yet show their contents or whether any can be executed by the app.

Andrew's response: actions makes it feel as though the app will help something happen. Kwilt's
objective is to help the person see and control spending. Translate the promise into that outcome.

Candidate copy: `A few actions to help you control your spending.` Emphasize actions once. CTA:
`Show me`. The destination should put a useful next action in view. Possible actions, when supported
by evidence and setup state, include reviewing recurring charges, confirming a category budget, and
setting up app pauses at its limit.

Preserve the sense of assistance while keeping the workload small: recommend one first step and
make other relevant options available later. Any advertised count must match real available actions.
No score, sixteen-item completion requirement, new generic task list, or long summary paragraph is
needed to convey the value. Proposed actions remain distinguishable from changes already made.

This is a candidate closing handoff into Money, potentially combined with the preceding offer; the
reference does not commit Kwilt to adding another screen.

### Arrival and notification timing

The notification preview makes the benefit concrete: examples show what messages may arrive before
the person grants access. However, it follows the promise of entering the dashboard. Andrew
describes another delay at the moment he expects setup to have ended, then relief once the app is
finally usable. The invitation has a visible close control, but it still interrupts arrival.

The first unobstructed viewport prioritizes market news and net worth. The previously promised
actions are not visible in that viewport; the Advice tab provides a possible route, but its contents
have not been supplied. Do not infer that the actions are missing from the product.

Kwilt translation:

- The last onboarding CTA should open the usable Money destination immediately, with the relevant
  spending picture and next action visible. Do not automatically cover it with another request.
- Earn notification permission when the person chooses a concrete ongoing service, such as a
  supported budget alert or a review reminder. Show an example of that specific service. Permission
  follows the user's choice; declining leaves Money usable.
- Give the person a usable financial view as soon as sufficient evidence is ready. Findings and
  prepared actions can live in that view or an optional presentation they can leave and revisit.
  Additional personalization can happen during use.
- Preserve the calm pacing within individual screens while compressing the total sequence. The
  candidate finding, offer, and closing-summary designs are functions that can share a surface;
  they are not a requirement for three more gates before entry.
- The first view must continue the chosen spending intent. A general news card or an unpopulated
  graph should not displace the concrete financial result and action promised moments before.

This updates the earlier provisional sequence: the recommendation is early usable Money access with
progressive help, and a direct final handoff. No new notification implementation is specified by
this reference note.

## Commercial decision

### Recommended lead offer

Lead with a limited **Founding Perpetual** offer rather than a free first year:

```text
Founding offer

$19.99
One payment. No renewal.

Get Kwilt Pro
```

Keep annual and monthly subscriptions available behind a quiet `See subscription options` action.
This is more distinctively Kwilt than matching another app's introductory discount, it is already
represented in the entitlement model, and the promise is easier to understand than `free now,
possibly expensive much later`.

This recommendation is conditional on unit economics. The lifetime entitlement includes services
with continuing costs, including AI and connected financial infrastructure. Before making it the
default public offer, establish the expected long-term service cost, support burden, refund and
restore behavior, and the conditions under which the offer can be retired for new purchasers.

Do not say `forever, as long as Kwilt is in business`. The plainer and more precise promise is:
`One payment. No renewal.`

### Why not lead with a free year

A one-year free introductory offer is technically possible, but it postpones willingness-to-pay
learning for a full year, creates a large renewal cliff, and incurs a year of variable service cost
before collecting revenue. It can be a later acquisition experiment with StoreKit eligibility and
unit economics in place; it should not become the initial default merely to beat another app's
headline.

A `$1 for the first year` offer has the same basic trade-off at a smaller extreme. If tested, it
must be a real StoreKit introductory offer shown only to eligible customers, with the actual
localized renewal price—not a hard-coded visual promise.

## Proposed purchase-screen anatomy

```text
Kwilt mark                                      Close

Founding offer

$19.99
One payment. No renewal.

  Budgets kept current with real transactions
  App controls tied to your spending plan
  AI across your money, goals, calendar, and files
  Advanced Screen Time rules

Get Kwilt Pro

See subscription options
Restore purchases  ·  Terms  ·  Privacy
```

The exact price must come from StoreKit. The benefits are deliberately plain, short, and
non-interactive. They describe the paid contract. Recipes, chores, Goals, To-dos, and other broad
Kwilt capabilities belong in the preceding brand/value story unless their entitlement policy is
explicitly changed.

Avoid unsupported bundle language such as `household sharing` or family Screen Time until the
shipped entitlement and end-to-end behavior support it. Avoid claims like `proactive AI` unless the
experience reliably initiates useful work without a prompt; `AI across your money, goals, calendar,
and files` describes the current benefit more concretely.

## Permission and disclosure constraints

- App Tracking Transparency is not a universal first-launch requirement. It applies when Kwilt
  tracks a person across other companies' apps or websites for advertising or measurement, or
  shares data with a data broker. If Kwilt does not perform that tracking, it should not reproduce
  Origin's opening prompt.
- If a current or future SDK does require tracking permission, request it before that tracking
  begins, after explaining the relevant benefit. Do not gate normal app functionality or reward a
  person for granting permission.
- Introductory pricing must reflect StoreKit eligibility. A customer generally receives one
  introductory offer per subscription group, so the UI needs a truthful non-eligible state.
- The amount billed, duration, renewal price, restore path, Terms, and Privacy must remain clear on
  the purchase screen. `Quiet` cannot mean faint or easy to miss.

## Provisional Kwilt sequence

```text
Kwilt launch moment
  -> pre-auth starter screen
       Control your spending
       Build my budget
       three quiet alternate paths
       Just look around
  -> one short path-specific transition, if it earns its place
       e.g. Let's build a budget from your real spending.
  -> existing sign-in workflow, framed as preserving the chosen setup
  -> resume the selected capability-owned onboarding
  -> for a paid Money path, present the paid offer before financial account connection
  -> offer device authentication as protection for the Money data the person is about to connect
  -> request account access and other permissions only after the user accepts the relevant step
  -> authoritative first value
```

The starter choice is the first meaningful commitment. The optional transition is the second. The
account request then explains why it is needed: to save and safely continue the setup the person
already chose.

## Motion contract

- Keep the entire phrase available to accessibility APIs; do not announce individual characters.
- With Reduce Motion on, render the complete sentence immediately.
- With motion enabled, use one quick word or phrase reveal, approximately 500-900ms for the full
  line, rather than a slow literal keystroke effect.
- Never delay button availability until the animation finishes.
- A tap during the reveal completes it immediately; the next tap activates the action.
- Do not rotate multiple promises while the person is deciding or authenticating.

## Critical open questions

1. What should `Just look around` do before authentication? The current app shell is auth-gated.
   Showing an auth screen immediately after this choice would break the promise; a genuine guest or
   read-only browse mode would be a larger product and architecture decision.
2. Does every starter path need a separate typed transition, or only paths whose next step would
   otherwise feel abrupt?
3. Does the Money-specific Face ID offer belong immediately after purchase or after the first
   successful account connection? The current recommendation is after purchase and before account
   connection, when the person understands what the lock will protect but has not exposed the data
   yet.
4. Should the founding perpetual offer be visible to every eligible new user or be time-, cohort-,
   or quantity-limited while Kwilt learns the long-term service cost?
5. What verified proof can eventually replace Origin's rating-and-member-count composition without
   manufacturing confidence—App Store rating, active households, a press quote, or no social proof
   at all?

## Working principle

**Let the person begin a useful Kwilt intention before asking them to create the account that will
preserve it.**

The bet is that authentication will feel like continuity rather than a gate. If the added story
moments reduce completion or feel ornamental, collapse them back into the selected capability's
first real setup screen rather than adding more explanation.

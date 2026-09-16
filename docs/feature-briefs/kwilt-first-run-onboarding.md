---
id: brief-kwilt-first-run-onboarding
title: Kwilt first run — a clear offer, a personal first look, a useful next step
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves:
  - jtbd-review-budget-reality-before-spending
  - jtbd-put-intention-before-impulse
  - jtbd-get-help-without-retelling-my-life
  - jtbd-understand-why-ai-suggested-this
  - jtbd-stay-in-control-of-ai-actions
  - jtbd-trust-this-app-with-my-life
related_briefs:
  - brief-capability-routed-onboarding
  - brief-money-capability-first-entry
  - brief-money-progressive-activation
  - brief-budget-app-unlock-review
  - brief-screen-time-controls
  - brief-food-capability-onboarding
  - brief-repeatable-onboarding-testing
owner: andrew
last_updated: 2026-09-15
---

# Kwilt first-run onboarding plan

## Recommendation

Build a brief, atmospheric guided start: **choose a practical offer → sign in → connect the minimum → see something personal → take one useful action**. Lead with **Control your spending**, keep Goals, Chores, and Meals visible, and let people look around without committing to setup.

Borrow Origin's visual confidence, invitation before authentication, coherent transitions, and personal reveal. Change its completion contract: Kwilt does not need a complete financial profile before it becomes useful. Once the first account is connected, the person can enter Money; the remaining guidance is skippable, resumable, and available inside the app.

The distinguishing experience is not another financial health score. It is: **Kwilt shows me what is happening, helps me make a budget, and can put that budget in front of me when I open a spending app.**

This is a proposed product and implementation sequence, not an implementation or release claim. It consolidates the [Quiet Compass exploration](../design-explorations/budget-led-quiet-compass/03-converge.md), [Origin reference catalogue](../design-explorations/budget-led-quiet-compass/origin-first-run-reference.md), and [first-counsel frame](../design-explorations/money-first-counsel/00-frame.md). The existing reference catalogue preserves Andrew's observations; this brief resolves them into one recommended journey.

## Context

Kwilt's current signed-out entry presents authentication before a person chooses what they want to do. Its normal first-run flow still leads into Goal/Arc creation. A newer capability coordinator exists as a development rehearsal, but it is not the production entry. The broader product now needs an entry that explains its practical capabilities and delivers on the selected one.

Andrew's real-time Origin walkthrough gives two equally important observations: the restrained branding, atmospheric scenes, and personal findings felt excellent; connecting more accounts, completing profiles, and encountering another permission request after the promised finish felt increasingly tiring. The screenshots span roughly 24 minutes, but include narration and capture time: they are not a controlled benchmark of Origin's onboarding duration or conversion performance.

## Target audience

Aspirational family organizers who want household life to run more smoothly without becoming administrators of a productivity or finance system. Money is the recommended start, not a claim that every person downloaded Kwilt for budgeting. People arriving for goals, chores, or meals must immediately recognize a valid entrance.

## Representative persona

Maya has just downloaded Kwilt. She wants understandable spending, less household coordination, or help following through. She is curious but has not yet decided to trust the app with accounts, permissions, or payment. She should never have to explain her life before Kwilt can explain its offer.

## Aspirational design challenge

How might we help Maya feel understood and make one useful change in her first visit, while making Kwilt's broader capabilities discoverable and keeping the setup burden proportionate to the thing she chose?

## Hero JTBD

`jtbd-move-the-few-things-that-matter`: help the person make practical progress, rather than complete onboarding for its own sake.

## Job flow step

The [Money job flow](../job-flows/maya-review-budget-reality-before-spending.md) records weak delivery at recognizing/entering the job (2), minimum setup/resumption (2), and trust/repetition (2); intentional choice is 3. This plan addresses those seams. It does not claim to improve the scores until users can perform the job in the delivered app.

## JTBD framing

“Show me a useful place to begin. Once I choose it, ask for only what you need, show me what you learned, and help me do something with it. Let me see why your suggestion makes sense, change my mind, and return without starting over.” Spending truth, intentional app use, contextual help, explainable suggestions, and user control are supporting jobs, not separate onboarding lessons.

## Design

### 1. The decisions this plan makes

| Question | Recommended decision |
| --- | --- |
| What comes before sign-in? | One calm starter screen with a Money lead and three visible alternatives. No introductory carousel. |
| Where does Kwilt show breadth? | Visible starter rows, a restrained free-essentials note at the Pro offer, and normal navigation. Not a mandatory feature tour. |
| When does payment appear? | After sign-in, before starting Pro-backed connected Money setup. Free starter paths do not receive a launch paywall. |
| Which offer leads? | Existing founding one-time Pro purchase, subject to verified availability and localized Store price. No new free-year promise in this release. |
| How much financial setup is required? | One institution is enough to begin examining available data. More accounts and broader budget inputs are requested only when the selected decision needs them. |
| Where does the AI become tangible? | Optional context during the connection-to-first-look transition, followed by evidence-backed findings and a prepared next step. |
| How many findings? | One to three earned cards, not always three. Never invent an insight to fill a slot. |
| When are app controls introduced? | Teased in the offer; explained with a relevant budget proposal; enabled only after the person confirms a budget, chooses apps, and authorizes Screen Time. |
| What is the finish? | A usable capability screen showing the selected work and its next action. No final permission wall. |
| What does “Just look around” do? | Opens a clearly labeled, read-only preview without sign-in. Starting real work requests authentication and preserves the selected destination. |

### 2. What we borrow, and what we make Kwilt's

| Origin reference | Kwilt translation |
| --- | --- |
| Tiny recurring brand mark | Real Kwilt mark throughout, with an accessible app name. No fabricated logo or repeated large wordmark. |
| Sky scenes before and after setup | One original daylight/cloud visual family on the invitation, synthesis, and findings. Forms stay white or Parchment. |
| Large editorial copy and ample space | Heavy, compact Kwilt headline; short findings with deliberate line breaks; very little supporting copy. |
| Typed/revealed statements | Brief word/phrase reveals that never delay navigation or announce every character to a screen reader. |
| Early yeses before account creation | A meaningful starter choice before existing authentication. No extra “Next” screens solely to accumulate taps. |
| Clear subscription offer with feature rows | Existing Pro offer, readable terms, a short noninteractive list, and an honest distinction between paid capabilities and free essentials. |
| Main-spending-account guidance | Institution chooser headed “Start with your main spending account.” One connection is a successful start. |
| Three personal advice scenes | Earned spending findings followed by a relevant budget/app-pause proposal. Call them “Your first look,” not automatically “advice.” |
| Actions waiting after setup | A real prepared budget or next action in Money, not a count of generic tasks. |
| Notifications at the threshold of the app | Contextual alert offer after the person creates something worth receiving an alert about. |

Do not carry over Origin's claimed membership count, ratings, certifications, annual-savings projections, financial health score, cash-account offer, or claims about the typical number of connected accounts. Use laurels only if they represent substantiated Kwilt recognition; omit them at launch. Do not reuse Origin screenshots or imagery as production assets.

### 3. Visual system: Parchment daylight

The new onboarding should feel like a more confident expression of Kwilt, not a reskin of the old illustrated onboarding and not a separate finance brand.

- **Canvas:** White or existing Parchment (`#FAF7ED`). Atmospheric moments add pale daylight blue and cloud imagery that fades into the light canvas. Let the image occupy space without filling the interface with containers.
- **Content:** Sumi (`#1C1A19`) headings and primary controls. Pine stays in the small real brand mark or an existing semantic status; no Pine headline, full-screen green fill, or green bottom-button group.
- **Typography:** Use existing `Inter_900Black` for the lead, starting at 46–48 logical points at the default text size, with optical adjustment after device review. Narrative findings start around 30–34 with generous line height. Use existing supported weights rather than faux serif or faux italic. Preserve `Urbanist_900Black` for the actual wordmark when needed. A future editorial font exploration is not a prerequisite for this release.
- **Hierarchy:** One dominant message, at most one short supporting thought, one primary action. Numeric evidence can be prominent without becoming a dashboard chart.
- **Surfaces:** The lead offer is placed directly on the canvas. Alternate offers are flat rows. A finding may have one quiet evidence strip. Forms use owned fields. Do not put every paragraph inside a card.
- **Icons:** None beside the lead headline or each text fragment. Use only real `src/ui/Icon` assets where recognition helps; bank logos remain functional. No red feature icons, repeated sparkles, decorative shields, or icon pairs on every row.
- **Footer:** Reuse the canonical action dock, safe-area handling, Button, and accessible touch targets. Bottom actions do not move as text reveals, the keyboard opens, or a request becomes busy.
- **Motion:** Short phrase reveals, approximately 500–900 ms as an initial design target, with a quiet image transition. All buttons work on the first tap. Reduced Motion shows completed text immediately. Loading reflects actual work; no artificial “thinking” delay to make the app appear smarter.
- **Accessibility:** Dynamic Type may increase height and require scrolling. Never shrink essential copy to preserve a mockup. Maintain readable contrast over imagery, stable reading order, status announcements, and visible focus. Decorative imagery is excluded from the accessibility tree.

Reuse `Logo`, `BrandLockup`, `Button`, `Icon`, `SearchField`, and `ChatComposer`. The [input guidance](../design-system/input-guidance.md) remains authoritative: use the filled-field family and canonical composer, not Origin's outlined fields or feature-local raw inputs. Introduce a reviewed **editorial variant** of the shared onboarding presentation; do not silently stretch the old title/illustration slots or change unrelated flows.

Asset brief: one original or appropriately licensed daylight sky, its still fallback, and restrained motion variants. Frame Sumi text against a calm light region. Use the same visual family at the beginning and personal reveal so the return feels intentional. No image generation is required to approve the workflow in this document.

### 4. The default Money journey

```text
Starter → Existing sign-in → Pro access offer, if needed → Main account connection
                                                               ↓
                                         Connected + optional context, during sync
                                                               ↓
                                          Your first look: 1–3 earned findings
                                                               ↓
                                         Review a prepared budget → Money
                                                                      ↓ optional
                                                              Choose apps / alerts
```

After connection, “Go to Money” is a genuine exit into a usable capability, including honest loading or insufficient-data states. It does not skip to a generic Home page or reopen another onboarding modal. Returning to the first look is possible from Money. The sequence is a guided route through the app, not a locked corridor before the app.

#### S0 — Invitation and starter choice

Use the actual Kwilt mark, light atmospheric canvas, and this deliberately short composition:

```text
                  [Kwilt mark]

        Control your
        spending

        Build a budget. Add app controls if you want.

        [ Build my budget ]

        Set goals and manage to-dos                 ›
        Keep up with household chores              ›
        Plan meals and groceries                   ›

                Just look around
```

These are proposed visible strings, not a requirement to introduce new primitives. At default text size on the target phone, keep all four offers and the exit visible without scrolling. Use space and type scale, not a section heading, to distinguish the alternatives. Keep a restrained returning-user “Sign in” affordance in the top chrome. Exact invitations and deep links take precedence over this screen.

Tapping an offer records only install-scoped intent, then opens existing authentication. It does not create a budget, Goal, Household, subscription, or analytics profile containing financial data. No notifications, tracking, Screen Time, bank, or microphone permission appears here.

#### S1 — Existing authentication, with continuity

Keep the working Apple, Google, and email flows. Use a short heading such as “Create your Kwilt account,” with returning sign-in clearly available. No second capabilities pitch. After authentication, retain the intended destination while resolving whether this is a returning account with existing work or an entitlement.

Back returns to the starter choice. Cancellation, email verification, provider browser round trips, and app relaunch must preserve the intent. If the account already has a usable destination, open it rather than repeating setup. A valid invitation or exact destination is never replaced by a Money upsell.

#### S2 — The access offer

For a new Money starter without the required Pro access, show the focused offer described in section 7. Owned access skips this screen. A pending entitlement shows a truthful pending state, not a second purchase invitation. Dismissal offers the free app/preview or another starter; it does not pretend connected Money is available for free.

Goals, Chores, and Meals starters proceed directly to their free first-use route. Advanced AI or other paid actions keep their existing contextual access policy.

#### S3 — Start with your main spending account

Headline: **“Start with your main spending account.”** Supporting line: **“You can add more later.”** Show a short relevant institution list and canonical search. Tapping an institution enters the supported Plaid experience; searching exposes the broader set. Maintain a standard Link fallback and a clear exit.

Use a compact “Connected through Plaid” explanation and an accessible information link for what data is shared. Do not say Kwilt can see all finances after a single institution, or imply that bank access grants payment authority. Do not implement a bank-credential form in Kwilt.

**Face ID:** Make the post-authentication offer a small optional action associated with protecting Money, not a mandatory extra page. “Use Face ID for Money” is a proposed product behavior, not a claim that an installed authentication library already implements secure locking. Show it only once an audited app-lock/session policy exists; otherwise omit it from this release. Never replace the provider login with a cosmetic biometric check.

#### S4 — Connected, with optional context

Confirm the connection immediately: **“Your account is connected.”** Then distinguish ongoing import: **“Getting your recent transactions…”** Show the institution and actual connection status. An “Add another account” action is available but secondary; do not ask the person to match a nine-account norm.

In this same transition, offer the canonical composer:

- Prompt: **“Anything to plan around?”**
- Placeholder: **“A change in income, a big purchase…”**
- At most two brief examples, if testing shows they help. No wall of floating example bubbles.
- Primary navigation: **“See my spending.”** It works without entering context.
- Sending text or voice saves the user's confirmed context and proceeds; do not require another confirmation screen or a follow-up interview. Offer an edit route later.

This is the teaching moment for conversational Kwilt: the person can speak naturally and see that context reflected in a later suggestion. Voice uses the existing composer and permission timing; denied microphone access leaves typing available. Do not collect birth date, credit score, investment risk, tax filing status, or a general financial biography.

If import is slow, keep “Go to Money” available. If the person proceeds with no context, do not invent personal context. If they skip, do not return an “incomplete profile” warning later.

#### S5 — Your first look

Use the same daylight scene as the welcome, now with one specific finding. A small “Your first look · 1 of N” label can orient the person. The actual N is determined from available evidence before presentation; never promise three when only one is defensible.

| Position | Purpose | Example template, bound to real data | Action |
| --- | --- | --- | --- |
| First | Prove Kwilt inspected the evidence | “Your largest spending category last month was {category}.” Evidence strip: `{amount} · {purchaseCount} purchases`. | “Next” if another finding exists; otherwise the relevant next action. Evidence strip opens the underlying transactions. |
| Second, if useful | Reveal a pattern that was hard to see | “We found {seriesCount} recurring charges, about {monthlyEstimate} a month.” Use an estimate label and show the covered accounts. | “Next”; optional evidence inspection returns to the same position. |
| Final | Offer a practical move | “Put a limit on {category}.” A budget draft, period, rationale, and optional app-pause benefit are shown only where supported. | “Review budget,” or “Choose a budget” if no defensible draft can be prepared. |

The templates are examples, not invented findings about Andrew. Category ranking is not itself overspending. Recurring payments are not automatically subscriptions, waste, or money that can be saved. The final proposal cannot assume which apps the person has installed.

Keep **“Go to Money”** available throughout. Do not insert a separate “We found actions” marketing screen after the three cards. Give the final card the action promise, then honor it. Do not add tasks merely to make an action count impressive.

#### S6 — Review the budget, inside Money

Open the existing Money-owned review/edit surface with the proposed budget or next setup checkpoint. Show the actual category/scope, period, proposed amount, and a compact reason. Let the person change it. The commit action is **“Save budget”**, not “Continue” concealing a write.

Keep the budget engine's required evidence and plan invariants. A selected category limit is not a complete household plan, and observed historical spending is not automatically an appropriate target. Where required inputs are missing, ask for the smallest missing piece in context. Do not silently bypass the current assessment gate to make onboarding shorter. If a valid plan cannot yet be produced, Money still shows available spending and a plainly named next step.

After persistence succeeds, show **“Budget saved.”** The updated Money surface is the destination. If the save fails, preserve the draft and offer retry; do not show success or move on. No forced Goal/Arc association.

#### S7 — Optional app pauses, connected to the saved budget

Present a contextual next-action card: **“Pause shopping apps at your limit.”** Supporting sentence: **“Choose which apps pause when this budget is used up.”** Action: **“Choose apps.”** The person can ignore it and use Money normally.

Route into the canonical Screen Time rule builder with the real budget/category reference and the chosen threshold. For the first version, use the existing `when_over` rule for a fully used budget; expose the existing near-limit option in the owning editor rather than adding a threshold questionnaire to onboarding.

The person authorizes Screen Time and selects apps in Apple's picker. Review explains which apps, which budget condition, how to open temporarily if supported, and how to disable the rule. Save only after explicit confirmation. Budget observations can suggest shopping-app controls; they cannot identify an installed Amazon or Target app.

Show **“App pause is ready”** only after the app can verify the relevant authorization, selection, rule persistence, and device configuration. Differentiate “Rule saved,” “Needs permission,” and “Active.” If a selected app cannot be identified outside Apple's protected UI, render its native label where supported rather than inventing a bundle identifier or brand.

#### S8 — The landing fulfills the offer

Money's first viewport should lead with the person's spending, the saved/provisional budget state, and one relevant action. The findings are revisit-able. Transactions and scope remain inspectable. Do not lead with market news, net worth, empty long-term charts, or a generic welcome checklist.

There is no mandatory “All done” page. If a completion transition is useful, it is a short truthful state on the owning screen. Once an action says it opens Money, Money opens without another modal.

Only offer notifications when the person opts into a budget alert or another specific reminder. Example: **“Get budget alerts”** with a preview tied to the actual alert feature. The action invokes the system request; “Not now” leaves the app usable. Do not promise real-time alerts unless delivery and transaction freshness support that claim.

### 5. The other starter paths are first-class

They share the invitation, authentication continuity, calm presentation, and actual-result landing. They do not share Money's bank, Pro, or Screen Time prerequisites.

| Starter | First task | First useful result and landing | Explicitly later |
| --- | --- | --- | --- |
| Set goals and manage to-dos | Offer a concise “Add a to-do” or “Set a goal” choice; accept ordinary language. Reuse owned creation rather than running every user through the identity survey. | The saved to-do in the actual list, or a saved Goal with one clear next step in its detail. | Arcs, deeper identity work, more goals, scheduling automation, sharing. |
| Keep up with household chores | Fulfill the real household prerequisite in the smallest owned setup, then add one chore and optional repeat schedule. | A persisted chore with a clear assignee or household scope in Chores. | Invitations, child devices, rewards, token systems, detailed household setup. |
| Plan meals and groceries | Pick or add one real recipe and place it on a day. Use the existing Food onboarding adapter. | A persisted meal on the plan; show the next grocery-list action where available. | A week of planning, pantry intake, preferences survey, shopping integrations. |

Current Chores requires household membership: a purely solo route is not already established. The implementation must let the owner establish the required household without waiting for another person to accept an invitation, or explicitly surface the real prerequisite. Do not ship a visible Chores offer that routes to `null`, a dead end, or a compulsory unrelated setup tour.

For goals/to-dos, provide the simple creation route as new adapter work; the present `identity-workflow` handoff is not evidence that this shortened route exists. Retain deeper Goal/Arc onboarding for people who deliberately choose that kind of help.

Measure first-value events in the owning capability. Opening RecipeLibrary, Chores, a creation composer, or a Goal survey is not activation.

### 6. “Just look around” and return behavior

The recommended guest experience is a **bounded read-only preview**, not a broad anonymous-account platform. It opens without authentication and provides navigable previews of Money, goals/to-dos, Chores, and Food, using approved example states and familiar app navigation. Display “Preview” and “Sample data” clearly. No real money, fake user-owned goals, background mutation, or bank connection is possible.

“Start here” from a preview records the chosen capability, opens the existing authentication flow, and starts real setup after resolving the account. Do not copy example budgets or chores into the user's account. A signed-in person choosing to look around goes to their real shell instead of a demo.

This requires explicit preview isolation because today's root gates the shell behind authentication. It is not a one-line skip flag. Reuse presentation components where safe; do not mount live repositories and merely disable their visible buttons. Keep previews disconnected from write-capable services, analytics payloads containing sample financial facts, and user stores.

Entry precedence:

1. Managed child/device enrollment and exact invitation/deep-link contracts retain their owners and required authentication.
2. Returning accounts and restored work go to the intended existing destination; no onboarding reset because the installation is new.
3. A genuinely new, signed-out adult receives the starter.
4. Interrupted new-user setup resumes the selected capability and owned checkpoint.
5. A completed or explicitly dismissed first run does not reopen automatically.

Do not automatically navigate away while the person is reading, inspecting a transaction, editing, or choosing another capability because a background import finishes.

### 7. Commercial offer and permissions

#### Recommended commercial treatment

Lead with the existing founding one-time Pro option, **not** an invented free year. A perpetual offer is a more distinctive hypothesis for Kwilt than beating another app's introductory discount by one dollar. It also avoids creating a new introductory entitlement policy as part of this UX release. This is a recommendation, not a claim that it will convert better.

The source runbook records `pro_lifetime` as a non-consumable with Pro entitlement and an initial US price of $19.99. That is a source configuration, not a fresh verification of App Store availability or today's sell price. Production displays the localized price and terms from the actual product. Retain existing monthly/annual alternatives in a quiet “Other plans” route and Restore Purchases.

Suggested paywall anatomy:

```text
                        [Kwilt mark]             [Close]

                          Kwilt Pro
                        {store price}
                       One-time purchase
                     No subscription renewal.

          Spend and budget tracking
          App pauses tied to your budget
          Advanced AI help

          Free essentials are included:
          Goals, to-dos, household chores, and meal planning.

               [ Get Kwilt Pro · {store price} ]
                    Other plans · Restore
                       Terms · Privacy
```

The three paid rows are informational, not buttons. Use no more than one small existing icon per row, and prefer no icons if the typography is clear. The free-essentials note explains breadth without suggesting that free capabilities require purchase. Household participation and ordinary organization should not be sold as newly locked Pro features.

State the included AI allowance using the live entitlement policy; current source specifies 1,000 monthly credits. Do not promise unlimited AI, unlimited bank connections, all future services, perpetual third-party availability, or “forever” without qualified license terms. Explain the service-lifetime scope in plain, accessible purchase details before confirmation. Recurring plans must show price, period, renewal, and cancellation terms legibly; “light” styling is not permission to hide them.

Use the existing approved in-app purchase/RevenueCat path for digital Pro access. Do not reproduce Origin's Apple Pay control just because it appears in a screenshot. Failed, canceled, pending, restored, and already-owned purchases each have distinct states. Do not re-offer the paywall after dismissal at every subsequent step.

If a free-year experiment is considered later, decide its cost and eligibility separately. Apple's introductory-offer rules and subscription-group eligibility must be checked against the real configured product. It is not approved by this plan. [Apple introductory offers](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions), [subscription presentation](https://developer.apple.com/app-store/subscriptions/).

#### Permission order

| Permission | Trigger | Decline behavior |
| --- | --- | --- |
| Tracking/ATT | Only if the audited SDK/data behavior actually requires tracking authorization, before that tracking occurs. Not a universal first-launch step. | No tracking without permission; no blocked core onboarding. |
| Face ID | Explicit optional security action, after the actual lock policy is implemented. | Existing account authentication remains usable. |
| Bank connection | Person chooses connected Money and an institution. | Leave setup; revisit or use another capability/preview. |
| Microphone | Person taps voice in the optional composer. | Keep text entry. |
| Screen Time | Person chooses budget-linked app controls. | Keep the budget; show controls need permission. |
| Notifications | Person opts into a concrete alert/reminder, after useful app access. | Keep the app and action usable; no immediate nag. |

ATT is required for qualifying cross-company tracking, such as targeted advertising/measurement or data-broker sharing; it is not a general requirement for every new installation. Whether Kwilt needs it requires an SDK/data-use audit, not an inference from Origin's launch screen. [Apple privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/).

### 8. Evidence-backed AI: useful, inspectable, and bounded

The first look is a small delivery pipeline, not an open-ended chatbot asked to analyze raw finances and invent an impressive narrative.

1. **Money computes facts.** Derive scoped totals, periods, categories, recurrence candidates, coverage, pending/import state, and confidence using authoritative Money logic. Normalize transfers, card payments, refunds, duplicates, and account overlap before producing summaries.
2. **Build evidence objects.** Each candidate includes an identifier, data revision, as-of time, covered accounts, period, calculation basis, confidence, and an inspectable source route. Recurrence needs a validated series detector; an LLM count is not sufficient.
3. **Add confirmed context.** Only the user's supplied context and authorized existing context are eligible. Treat it as private user data, not a new instruction to tools. Explain where it will be retained and allow editing/removal; do not silently share it with household members.
4. **Rank for relevance.** Select one or two reliable observations and at most one useful proposal. Do not infer missing insurance, no will, excessive spending, app installation, or household cash safety from absent records.
5. **Generate a constrained explanation.** The model can summarize supported facts and connect a stated life change to a bounded proposal. It cannot change amounts, manufacture savings, claim certainty beyond coverage, or select an arbitrary risk profile.
6. **Validate the result.** Check referenced facts, numbers, allowed action types, access, and current data revision. Reject unsupported content. Use deterministic prose when the model fails, takes too long, lacks access, or returns an invalid result.
7. **Hand off, do not silently act.** Opening the budget/rule editor can prepare a draft. Only the owning capability commits after explicit user confirmation and reports success. Creating a task is not a substitute for applying a budget or configuring a rule.

Separate three labels in the data and behavior: **finding** (observed), **interpretation** (qualified), and **proposal** (not yet applied). The interface need not expose this taxonomy as three badges; its wording and action state must preserve the distinction.

The paid AI allocation and any onboarding credit reservation must be handled through the existing policy, not an unmetered second pathway. A model failure must not erase the deterministic first value or force the user into a purchase loop.

| Evidence condition | User experience |
| --- | --- |
| One connected institution | Findings explicitly refer to connected accounts; no “your whole financial life” claim. |
| Sparse or short history | Show the period available; offer a simple next step, not monthly extrapolation presented as fact. |
| Recurrence confidence insufficient | Omit that card; do not call repeated purchases confirmed recurring bills. |
| Import still running | Usable Money loading state with honest status, exit, and retry; first-look invitation when ready. |
| No transactions | Explain that nothing is available yet; do not display a fabricated or zero-spending success. |
| Model unavailable or quota exhausted | Fact-backed deterministic card and manual budget route remain available. |
| Important correction changes the evidence | Recompute or invalidate the proposal; do not apply a stale amount. |
| No safe budget proposal | Present findings, then “Choose a budget” or the precise missing setup requirement. |

Spending analysis is distinct from safe-to-spend cash. Cash timing, obligations, coverage, and balance uncertainty still constrain the latter. Preserve the [Money documentation and proof boundaries](../capabilities/money/README.md).

### 9. Plaid and Screen Time feasibility

Plaid documents **Embedded Institution Search** for a bank-selection surface before the full Link flow. It supports React Native and Transactions; the repo currently declares `react-native-plaid-link-sdk` 13.0.3. Use the supported native embedding and normal token flow, retaining standard Link as a fallback. Respect documented minimum embedded dimensions and accessibility rather than shrinking it to fit a mockup. It is incompatible with Multi-Item Link and update mode, so reconnect/repair stays on its supported route. Origin's screenshots are consistent with this pattern, but do not prove its implementation. [Plaid Embedded Institution Search](https://plaid.com/docs/link/embedded-institution-search/).

Apple's `FamilyActivityPicker` lets the person choose apps through a privacy-preserving interface. Do not plan an installed-app inventory or use bank merchant names as evidence that specific apps are installed. Known URL-scheme checks are not a substitute for Screen Time selection tokens. Kwilt supplies the budget condition; Screen Time owns authorization, selection, rule persistence, and enforcement. [Apple FamilyActivityPicker](https://developer.apple.com/documentation/familycontrols/familyactivitypicker).

Native availability, entitlements, linking behavior, and enforcement still require signed-device evidence. Documentation plus installed package versions do not establish production readiness.

### 10. State and continuity contract

Do not represent this journey with one `hasOnboarded` boolean. Keep the following states separate:

- Install-scoped anonymous starter intent and preview state, with a schema version and safe expiry/clear behavior.
- Account-scoped first-run dismissal/completion and selected capability.
- Capability-owned durable setup checkpoint and first-value receipt.
- Independent purchase/entitlement resolution, bank connection/import state, and native authorization state.
- Evidence revision and seen/unseen first-look cards.
- Budget draft versus persisted budget; proposed app rule versus persisted/device-ready rule.

Transitions must be idempotent. Double taps, relaunches, OAuth returns, provider callbacks, background import completion, and restore must not duplicate budgets, chores, goals, meal plans, actions, or purchases. Reject callbacks belonging to an older account/session. Clear private drafts and visible data on account switch; retain only genuinely anonymous intent if appropriate.

Resume into the owning capability's next necessary step, not the last illustration. Changing starter intent never deletes previously saved work. A user who skips the reveal still gets the findings in Money. A returning user's new install is not evidence of a new account.

Failure recovery must preserve drafts, let the person retry or leave, and state what actually succeeded. “Connected,” “transactions imported,” “budget saved,” and “app pause active” are different receipts. No congratulatory success if only a route opened.

## Implementation sequence and ownership

### Current source findings

Read-only inspection on 2026-09-15 used `/Users/andrewwatanabe/Kwilt`, branch `main`, HEAD `915bd3b5f8e686d88f1250af329978c577c1c0fd`, with existing unrelated modifications. These are source findings, not Simulator, backend deployment, TestFlight, Store, or device proof.

| Surface | Existing owner | Required delta |
| --- | --- | --- |
| Signed-out launch | `App.tsx`; `src/features/onboarding/SignInInterstitial.tsx` | Starter before auth; preserve returning/deep-link/managed-device precedence; safe preview isolation. |
| Capability routing | `src/features/capability-onboarding/capabilityOnboardingEntryPolicy.ts`, `capabilityOnboardingContracts.ts`, `capabilityOnboardingNavigationTarget.ts`, `CapabilityOnboardingHost.tsx` | Replace rehearsal-only entry with reviewed production eligibility; all four visible offers need actual handoffs and resumption. |
| Legacy first run | `src/features/onboarding/FirstTimeUxFlow.tsx` and first-time UX store | Stop universal Goal/Arc routing; preserve an intentional deeper-identity path. |
| Money setup | `src/capabilities/money/screens/MoneySetupScreen.tsx`; `domain/moneyOnboarding.ts`, `moneyOnboardingAssessment.ts`, `moneyOnboardingFollowThrough.ts` | Consolidate presentation; progressive required inputs; keep evidence/coverage constraints and explicit action receipts. `MoneyPlanningIntentScreen` currently lives inside `MoneySetupScreen.tsx`. |
| Money destination | `src/capabilities/money/screens/MoneySummaryScreen.tsx` | First-look reentry, scoped facts, budget continuity, useful next action, and honest asynchronous states. |
| Bank connection | `src/capabilities/money/native/moneyPlaidLink.native.ts`; existing Money Plaid API | Supported institution-search integration, standard Link fallback, success/import distinction, repair path. |
| Personal explanation | Money facts/repository plus existing agent/context services and canonical `ChatComposer` | New bounded evidence-to-copy pipeline, context retention policy, validator, deterministic fallback, proposal routing. |
| Budget-aware app control | `MoneyCategoryDetailScreen.tsx`; `src/features/screen-time/rule-builder/PersonalScreenTimeRuleBuilderScreen.tsx`; `ios/Kwilt/KwiltScreenTimeProtection.swift` | Contextual rule-builder entry and device-ready receipts; reuse `when_over`, FamilyActivityPicker, and canonical enforcement ownership. |
| Other first values | `src/capabilities/chores/screens/ChoresScreen.tsx`; `src/capabilities/recipes/screens/RecipeLibraryScreen.tsx`; existing Goal/Activity creation owners | Real Chores adapter/prerequisite, simple Goal/to-do entry, meal-to-plan receipt. |
| Pro access | `src/domain/proAccessPolicy.ts`; `src/features/paywall/`; existing paywall services/stores | Existing entitlement policy and purchase flow in the new presentation; no new free-year entitlement. |
| Rehearsal/reset | `src/features/dev/DevToolsScreen.tsx`; existing test-account/reset work | Extend scoped replay for new routing, context, and reveal state without erasing real Money or purchases. |

**Production blockers already visible in source:** the coordinator release stage is development rehearsal; the no-budget Money handoff currently adds `demoScenario: 'connected-household'`; the Chores handoff has no navigation target. Remove/gate fixture injection from production and complete every visible offer before promoting the new entry. A polished starter cannot ship over these gaps.

### Delivery slices

1. **Approve the visual sequence.** Make one connected prototype of starter → authentication transition → Pro → connection/context → first look → budget review → Money, plus one alternate path and preview. Reuse actual assets/components. Review defaults and keyboard-open states on the target viewport before visual polish expands.
2. **Establish routing and rehearsal first.** Introduce account/install state separation, production-safe handoffs, all four destinations, preview isolation, and reset presets. Add regression-first tests for legacy-route leakage and demo-data injection. Keep new entry behind the existing release/promotion mechanism.
3. **Ship a complete deterministic Money vertical slice internally.** One connection, scoped computed fact, valid budget review, saved budget on Money, no mandatory notifications. Cover cancellation, empty data, delay, restore, and return. This is the minimum useful end-to-end path, not a production rollout by itself.
4. **Add the personal reveal and bounded AI.** Optional composer, evidence selector, brief explanations, proposal validation, context editing, metering, fallbacks, and revisit. Do not block the underlying deterministic path on model availability.
5. **Close the differentiated control loop.** Budget-linked rule setup, permissions, native app selection, inspectable rule, and signed-device enforcement/reversal evidence. Complete the other starter paths and verify their first-value receipts.
6. **Run moderated first-use testing, revise, then promote.** Verify commercial configuration, route matrix, privacy behavior, accessibility, device/build provenance, and actual release candidate. Roll out gradually through the project's existing controls with a safe rollback to compatible account state.

Do not schedule parallel implementation or create worktrees by default. These are sequential ownership slices in the ordinary checkout. Any later parallel work requires explicit coordination, especially for root routing, shared onboarding state, and Simulator ownership.

## Repeatable onboarding testing

Build on the [accepted reset brief](repeatable-onboarding-testing.md), not a destructive “start over” toggle. A reset is an explicit action with scope and consequences; it is not an always-on preference.

| Dev Tools action | Changes | Must preserve |
| --- | --- | --- |
| Replay welcome and chosen path | Clears only presentation, intent, seen-card, and appropriate onboarding-checkpoint state; recomputes readiness from real owners. | Authentication unless sign-out was explicitly selected; real bank links, budgets, purchases, rules, household data, native permissions. |
| Reset test scenario | Restores a named isolated fixture or dedicated marked test-account scenario; permits narrowly specified test-data deletion with confirmation. | Unrelated account data and all production-linked financial resources. |
| Fresh-install rehearsal | Reinstall/reset the relevant app container and use the intended clean backend test account; independently handle keychain/session persistence. | Does not silently cancel subscriptions, delete backend accounts, revoke banks, or claim OS prompts were reset. |

Suggested presets: new free user; owned Pro; purchase pending/canceled; no bank; one bank importing; sparse history; reliable findings; AI unavailable; budget saved; Screen Time denied; rule saved but not device-ready; returning account; each alternate capability. Preview fixtures must be clearly separated from live account mode.

The existing replay can remove the recorded onboarding-created Arc/Goal graph under its accepted scope. It does not already reset the new Money reveal, bank/backend state, store purchases, or native permissions. Extend it deliberately and document each scope. Never relabel replay as a totally fresh account.

Use the simple dedicated local testing login already configured; this plan does not invent credentials or reset authentication. Production bank and Screen Time tests use separate authorized resources. Store Sandbox purchase state, backend account state, app storage, keychain, and native authorization require independent test controls.

### Acceptance matrix

- Every visible starter reaches a real owned first-use flow. No global legacy Goal/Arc funnel for Money, Chores, or Meals.
- Preview does not mount live write-capable services or leak demo data into authenticated accounts.
- Returning sign-in, restore, invitation, deep link, child/device flow, relaunch, and account switch retain correct precedence.
- First connection is enough to proceed; “Add another” is optional. Import delay does not lock the entire app.
- No invented category, recurrence count, savings claim, installed app, or safe-to-spend amount appears when evidence is incomplete.
- Skipping context or AI failure preserves a useful path. Voice and keyboard remain usable with permission denial, Dynamic Type, and small screens.
- Budget save and action application use actual successful receipts; duplicated callbacks cannot create duplicates.
- App controls require confirmed user selection, authorization, and native readiness; declining them never destroys the budget.
- Finish opens the promised destination without an unrelated paywall, notification request, or welcome overlay.
- Pro-owned, unowned, restoring, pending, canceled, and failed states match existing entitlement policy.
- Replay is predictable and nondestructive outside its explicitly named test scope.

## Success signal

The activation hypothesis is that a clear invitation plus early personal evidence and a usable action will outperform both the universal identity questionnaire and a long comprehensive financial intake. It is a hypothesis to test, not a conversion claim derived from attractive screenshots.

Keep the measurement layers separate:

| Layer | What it establishes | Not a substitute for |
| --- | --- | --- |
| Offer chosen / authentication completed | Intent and funnel progress | Product value |
| Account connected / data ready | Technical setup | A useful spending decision |
| First grounded finding viewed and understood | First-value evidence: “Kwilt can show me something about my spending” | Budget/control activation |
| Budget saved / optional rule device-ready | Capability setup accomplished | Proof the person made a trusted decision |
| `MoneyFirstTrustedDecision` | Authoritative `continue`, `adjust_plan`, `keep_blocked`, or `correct_truth` outcome in the existing Money contract | Long-term retention |
| A relevant return during days 8–14 | Early repeat use of the same useful job | Durable retention beyond that interval |

Also measure route-specific first value: a persisted and rediscovered to-do/Goal, a real chore, and a scheduled meal. Do not compare a bank-link funnel's time directly with a one-field to-do path as if their necessary work were equal.

Proposed instrumentation: starter exposure/choice, auth resume, access outcome, connection/import milestones, context skipped/submitted, finding shown/inspected/skipped, proposal opened, owner-confirmed save, control authorization/readiness, actual landing, trusted-decision receipt, and meaningful return. Reuse canonical events where they exist. Record durations and error classes, not raw account names, balances, transaction descriptions, voice transcripts, or private life context in general analytics.

Initial learning targets, not launch promises:

- At least five of six moderated participants can identify a relevant starter and explain what the main CTA begins without help.
- People who came for chores or meals find that offer immediately and do not think Kwilt requires a bank or subscription for it.
- At least five of six can explain one personal finding and locate its evidence; nobody is led to believe an unconfirmed proposal is already active.
- With ready test data, target at most 90 seconds of Kwilt-controlled interaction from successful authentication to the first grounded finding, excluding time spent reading optional terms or completing provider auth/purchase/bank flows. Report those external waits separately and report total elapsed time too.
- No mandatory Kwilt-owned page between the promised app entry and the actual destination.
- Observe whether people independently revisit the saved budget, use an app pause, or make another relevant decision during days 8–14. A small moderated sample is qualitative learning, not statistical proof of retention lift.

Run the first study on the complete flow, not only the appealing starter screenshot. Include at least one non-Money arrival, a skeptical permission decliner, and a person with sparse bank data. Ask “What do you think will happen?” before the tap and “What changed?” after the result; avoid coaching.

## Verification and release boundaries

Implementation verification follows the repository's tiered lifecycle: focused regression/TDD for branching logic, state, facts, AI prompt builders, validation, and permission scheduling; native visual review for presentation; scoped `npm run verify:local -- --run` at slice handoff; uncached `npm run verify:changed -- --run` on the integration candidate. Backend functions require their own tests and deployment evidence.

Simulator proof covers layout, navigation, most entry/error branches, and mocked provider behavior. Signed-device proof is required for relevant real Plaid handoff, Face ID/app-lock policy if included, Screen Time authorization/picker/enforcement, notification delivery, and purchase/restore in the appropriate environment. TestFlight/Store approval and commercial availability remain separate gates.

Record source checkout, branch, commit, dirty state, build/install provenance, and Metro/runtime port for native review. This document's creation did not rebuild or install the app, alter accounts, change pricing, or verify native behavior.

## Open questions and acceptance decisions

The recommended journey is resolved enough for the next mockup; these items need evidence before release rather than more general onboarding ideation:

1. **Commercial readiness:** verify which existing Pro products are actually available, localized terms, allowances, and the intended service-lifetime wording. Default remains existing founding one-time Pro; do not invent a free-year promotion.
2. **Security readiness:** determine whether a real biometric lock/session policy can meet its promise in this slice. If not, omit the Face ID offer rather than delay or fake it.
3. **Minimum budget truth:** confirm the current engine's smallest valid setup and which missing inputs must be asked before a plan can be recommended. A scoped spending preview remains available regardless.
4. **Recurrence quality:** validate series detection against labeled examples. Omit the recurrence card until reliable; the reveal supports fewer cards.
5. **Four-route readiness:** prove the Chores prerequisite/handoff, simple Goal/to-do adapter, and Food outcome alongside Money before promoting the common entry.

## Next design review

Produce the connected **Money happy-path mockup first**, using the actual Kwilt mark, fonts, controls, and fixture labels. Review these seven frames together: starter; Pro offer; institution chooser; connected/context with keyboard shown; first finding; actionable final finding/budget review; populated Money landing. Include auth continuity without redesigning the working providers.

Then review “Just look around,” one complete non-Money path, sparse-data/slow-import states, and optional Screen Time setup. The test is whether each transition feels like the same calm product and whether every promise lands in a real, inspectable result.

## Spec-refine: why this is the recommended scope

- **Work retained:** choose intent, authenticate when starting real work, resolve paid access where required, authorize actual data, review and confirm meaningful changes.
- **Work removed or deferred:** generic tour, repeated welcome, mandatory all-account coverage, credit/risk/profile intake, required freeform reflection, universal Goal/Arc formation, preemptive permissions, and a second finish interruption.
- **New work justified:** safe pre-auth intent/preview, production-ready route adapters, the reusable editorial presentation, and a bounded first-look pipeline. These directly close the observed entry, trust, and action gaps.
- **Complexity bounded:** existing Pro policy, existing capability stores and mutations, existing Screen Time rules, existing input/composer anatomy; no financial health score, new financial product, installed-app discovery, or autonomous budget mutation.
- **Learning release:** evaluate a complete, credible first-use loop before adding more insight types, surveys, promotions, or new brand assets. See the [learning release](../design-explorations/budget-led-quiet-compass/04-learning-release.md) and [evaluation plan](../design-explorations/budget-led-quiet-compass/05-evaluate-learning.md).

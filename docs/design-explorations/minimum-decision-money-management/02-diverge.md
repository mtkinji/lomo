# Diverge: Minimum-Decision Money Management

## Phase boundary

This phase turns the Yes-And orchard into five coherent product systems. They
are deliberately different answers to the same challenge, not five visual
styles or a list of features to combine automatically. No alternative is
selected here, and nothing authorizes implementation.

## Fixed design challenge

How might we give customers comprehensive, trustworthy budget management while
asking them to make only the decisions that genuinely require their values or
judgment—and have Kwilt handle everything else automatically, transparently,
and reversibly within its established shell and navigation?

## Axis of variation

Each alternative places the primary burden-reduction mechanism somewhere
different:

1. **Access:** eliminate translation from a real-life question into app actions.
2. **Interpretation:** compress Money into one decision-ready conclusion.
3. **Maintenance:** operate the routine budget within customer-owned guardrails.
4. **Mental model:** translate one financial truth into a familiar budget dialect.
5. **Decision:** let customers safely rehearse choices before acting.

## Lifecycle coverage

| Lifecycle stage | Conversational Budget | One-Answer Budget | Guardrailed Autopilot | Adaptive Dialect | Decision Simulator |
| --- | --- | --- | --- | --- | --- |
| Recognize and enter | Question | Material change | Exception | Familiar language | Pending choice |
| Receive early value | Partial answer | Provisional summary | Draft policy | Model mirror | First scenario |
| Establish the plan | Progressive questions | Confirm summary basis | Confirm guardrails | Choose dialect | Approve baseline |
| Maintain transaction truth | Explain on demand | Surface only material uncertainty | Maintain by policy | Translate ambiguity | Correct scenario inputs |
| Stay oriented | Ask when needed | Continuous one-answer state | Quiet unless exception | Familiar explanation | Rehearse when needed |
| Spend or rebalance | Conversational preview | Summary-led action | Policy proposal | Dialect-shaped trade-off | Core experience |
| Coordinate household | Shared question | Scoped status | Shared authority policy | Role-specific explanations | Shared proposal |
| Adapt over time | Saved questions | Changed-since-last-time | Policy renewal | Dialect and rhythm adaptation | Rehearse new reality |

## Alternative 1: The Conversational Budget

### Sketch

The customer’s question becomes the primary unit of Money. They ask “Are my
bills covered?”, “Can we buy this?”, “Why was July so high?”, or “What happens
if Groceries becomes $800?” through Unified Chat or a contextual Ask Money entry
inside existing Money surfaces. Money maps the wording to a bounded,
deterministic calculation and returns one plain answer, its time period,
freshness, assumptions, and supporting evidence. If evidence is incomplete,
Kwilt gives the best truthful partial answer and asks only for the one fact that
would materially improve it. Useful questions can be saved and rerun; later,
the customer may explicitly schedule delivery through an approved channel.

### Signature lifecycle

- Entry: ask the question already in mind.
- Setup: progressively supply evidence as real questions require it.
- Daily use: ask only when uncertainty or a decision arises.
- Rebalance: describe the desired outcome and inspect a non-mutating preview.
- Repeat: saved questions become the customer’s personal Money repertoire.

### Decisions eliminated

- Where to navigate for a particular answer.
- Which report, date scope, or categories to assemble.
- How to translate familiar language into Money terminology.
- Repeating the same analytical setup for recurring questions.

### Decisions that remain human-owned

- Values and priorities behind a plan change.
- Material ambiguity Money cannot resolve from evidence.
- Authority to save, schedule, share, spend, or change a policy.

### Audience and persona fit

Strong for Maya when a concrete question is hot and for people who are more
comfortable texting than exploring an application. It respects idiosyncratic
phrasing and can deliver useful depth without requiring interface mastery.

### Design-challenge answer

It minimizes decisions by removing the need to operate the budget as an
information system. The customer states intent; Money owns query construction,
calculation, and explanation.

### System fit

- Reuses Unified Chat, existing Money destinations, bounded `money.read`, plan
  previews, receipts, and capability-owned privacy.
- Chat remains an access and explanation layer. Money owns arithmetic, policy,
  mutations, and authoritative receipts.
- Requires a typed question/answer contract, question-history policy, saved
  question model, and explicit delivery consent.
- Does not add a Money-local shell or replace Summary, Transactions, or Accounts.

### Four-object and capture-first check

This is a Money capability layer and does not reinterpret Arc, Goal, Activity,
or Chapter. It never blocks transaction capture or connected-data ingestion;
questions can be answered provisionally while evidence continues to arrive.

### Best when / fails when

- Best when customers arrive with concrete questions and natural language is
  easier than navigation.
- Fails when customers do not know what to ask, when an answer requires too much
  hidden setup, or when conversational flexibility implies capabilities Money
  cannot safely support.

### Anti-pattern check

Passes if answers are bounded, non-anthropomorphic, evidence-led, calm, and
plain about uncertainty. Fails if Chat becomes a financial oracle, improvises
advice, hides calculations, invents emotional intimacy, or encourages endless
conversation instead of resolving the decision.

## Alternative 2: The One-Answer Budget

### Sketch

The existing Money Summary becomes a calm interpretation layer. It continuously
reduces all current evidence to one household-specific conclusion: “Everything
important is covered, with $420 of room,” “Your plan is still under its 70%
limit,” or “One thing needs your decision.” A changed-since-last-time sentence
explains only material movement. Details, uncertainty, arithmetic, and actions
sit immediately underneath through progressive disclosure. The same conclusion
can be privacy-minimized for a widget or delivered as a calm notification, but
the app does not manufacture an insight when nothing meaningful changed.

### Signature lifecycle

- Entry: see the current answer without formulating a question.
- Setup: improve the answer one missing input at a time.
- Daily use: glance or ignore; silence is valid.
- Rebalance: see how the headline answer would change before saving.
- Repeat: return only when the answer changes materially.

### Decisions eliminated

- What to inspect first.
- How to reconcile actual, plan, forecast, outside-plan, and freshness evidence.
- Whether ordinary movement requires investigation.
- Which detail is relevant to the present moment.

### Decisions that remain human-owned

- The governing definition of “okay,” including limits and protected cushions.
- Responses to material exceptions.
- Any action that changes the plan or household authority.

### Audience and persona fit

Strong for Maya’s desire for calm confidence and for customers who cannot or do
not want to formulate analytical questions. It offers the simplest default UI
while retaining comprehensive depth beneath it.

### Design-challenge answer

It minimizes interpretation decisions: Money decides which conclusion is most
material, while the customer decides only when that conclusion exposes a real
trade-off.

### System fit

- Primarily reshapes the existing Summary and reuses category detail, forecast,
  plan preview, widgets, freshness, and receipts.
- Requires a deterministic answer-priority model and rules for material change.
- Can improve presentation without adding new navigation or depending on Chat.
- The Summary remains a truthful Money destination rather than a generic feed.

### Four-object and capture-first check

Money remains separate from Arc, Goal, Activity, and Chapter. New transactions
are accepted immediately; incomplete or stale ingestion changes the conclusion’s
confidence rather than blocking capture or displaying false certainty.

### Best when / fails when

- Best when a small number of user-confirmed rules can define what “okay” means.
- Fails when compression conceals important nuance, selects the wrong concern,
  or feels generic across households with different financial rhythms.

### Anti-pattern check

Passes if there is one specific, traceable answer with optional depth. Fails if
it becomes a composite health score, KPI dashboard, red-alert system, streak,
or manipulative engagement surface.

## Alternative 3: The Guardrailed Autopilot

### Sketch

Money becomes an exception-driven operating system for the household plan. The
customer confirms a small set of protected values: perhaps a 70% living limit,
fixed obligations, reserve contributions, and a minimum cushion. Kwilt drafts
and maintains only the flexible, system-owned portions of the plan. It settles
high-confidence categorization, carries immaterial uncertainty, anticipates
known seasonal costs, and proposes bounded adjustments when reality moves. It
stays quiet when policy still holds, leaves customer-set amounts untouched, and
surfaces one material exception with the proposed consequence and a reversible
receipt.

### Signature lifecycle

- Entry: confirm what the household wants protected.
- Setup: review drafted guardrails and ownership boundaries.
- Daily use: Kwilt performs routine maintenance silently within authority.
- Rebalance: Kwilt proposes the smallest policy-compliant adjustment.
- Repeat: inspect receipts or respond only to material exceptions.

### Decisions eliminated

- Routine category allocation and low-consequence classification.
- Repeated confirmation that ordinary spending is ordinary.
- Manual maintenance caused by predictable income or seasonal rhythms.
- Searching for the smallest viable rebalance.

### Decisions that remain human-owned

- Values, protected amounts, policy boundaries, and household authority.
- Material ambiguity and exceptions outside the confirmed policy.
- Permanent plan changes and difficult-to-reverse consequences.

### Audience and persona fit

Strongest expression of Maya’s wish not to become the finance administrator.
Potentially transformative for stable households, but demanding of trust and
dangerous for customers whose income, authority, or preferences are volatile.

### Design-challenge answer

It minimizes maintenance decisions by moving routine work into deterministic,
bounded policies and reserving customer attention for exceptions.

### System fit

- Extends governed plan projections, user overrides, assignment provenance,
  confidence, versions, receipts, and reversal.
- Requires explicit ownership semantics for user-set versus system-owned plan
  values, materiality policy, exception rules, and durable automation receipts.
- Fits existing Summary and plan workflows but creates the largest domain and
  trust expansion.
- Must not treat Chat or widgets as mutation authorities.

### Four-object and capture-first check

This remains within Money and does not auto-anchor financial activity to Arcs
or Goals. Transaction ingestion never waits for classification; uncertain
activity remains provisional until policy or human judgment can resolve it.

### Best when / fails when

- Best when a household has clear guardrails and most variation is routine.
- Fails when inferred maintenance encodes values, mistakes instability for a
  pattern, hides plan drift, or requires so many policy choices that “autopilot”
  becomes another configuration system.

### Anti-pattern check

Passes only with explicit authority, protected user values, visible provenance,
correction, receipts, and reversal. Fails with silent rebalancing, coercive
defaults, confident life-event inference, surveillance, or AI decision-making
disguised as convenience.

## Alternative 4: The Adaptive Budget Dialect

### Sketch

Money preserves one canonical financial truth but explains it through the
customer’s familiar mental model and financial clock. A customer may primarily
think in categories, bills and paychecks, safe-to-spend, envelopes, account
cushion, or a personal rule such as “stay under 70%.” Setup identifies the
dialect through one or two concrete examples rather than a personality quiz.
The Summary, Chat answers, plan previews, and household explanations translate
the same evidence accordingly. Different household members can receive
role-appropriate explanations without receiving different arithmetic or
unnecessary access.

### Signature lifecycle

- Entry: speak or select familiar language.
- Setup: show a mirror of the customer’s existing method and reconcile gaps.
- Daily use: explain current truth in the chosen dialect and financial rhythm.
- Rebalance: translate consequences into the rules the customer already trusts.
- Repeat: adapt language cautiously while preserving confirmed terms.

### Decisions eliminated

- Translating personal concepts into category and forecast terminology.
- Learning one prescribed budgeting methodology.
- Re-explaining the household’s financial language at each interaction.
- Forcing every household member to interpret the operator’s preferred view.

### Decisions that remain human-owned

- Which familiar rules are values worth preserving.
- When two mental models express genuinely different household priorities.
- Privacy, role, and authority for household-specific explanations.

### Audience and persona fit

Especially strong for people attached to long-used methods, people with low app
fluency, retired households with deposit-based rhythms, and partners who reason
about the same money differently.

### Design-challenge answer

It minimizes cognitive translation decisions. Kwilt adapts the explanation and
timing while keeping calculations, limits, and authority consistent.

### System fit

- Reuses canonical Money projections, Summary, Chat, widgets, plan preview, and
  household/privacy boundaries.
- Requires a presentation-dialect contract strictly separated from calculation
  semantics, plus explicit persistence and correction of customer terminology.
- Does not require new navigation, but it touches copy and presentation across
  nearly every Money surface.
- Must never create separate incompatible budget truths.

### Four-object and capture-first check

The dialect affects only Money interpretation and does not rename or remap Arc,
Goal, Activity, or Chapter. Capture remains unconditional; dialect determines
how incomplete evidence is explained, not whether it is accepted.

### Best when / fails when

- Best when unfamiliar terminology and financial rhythms are the main burden.
- Fails when personalization becomes inconsistent, patronizing, difficult to
  support, or masks material distinctions customers actually need to learn.

### Anti-pattern check

Passes if language is respectful, concrete, user-correctable, and mathematically
identical underneath. Fails if age becomes a proxy for ability, the UI creates
an infantilized “simple mode,” AI memory becomes opaque, or personalization
changes financial meaning.

## Alternative 5: The Decision Simulator

### Sketch

Money is organized around safe rehearsal. The customer enters a possible
purchase, category amount, income change, reserve use, or household request by
typing, speaking, selecting a transaction, or photographing a price or bill.
Kwilt shows the full consequence chain before any mutation: configured income
limit, new percentage, cash cushion, affected categories, reserves, forecast,
and what remains protected. It offers a small number of genuinely different
paths—wait, use a reserve, reduce flexible capacity, accept a temporary
exception, or revise the enduring plan—without choosing among values. Confirmed
changes produce an authoritative receipt; abandoned rehearsals disappear.

### Signature lifecycle

- Entry: begin with a pending choice.
- Setup: establish only the baseline needed to simulate it honestly.
- Daily use: rehearse purchases or anomalies at moments of consequence.
- Rebalance: compare complete alternatives in a non-mutating state.
- Repeat: learn which kinds of decisions benefit from a preview.

### Decisions eliminated

- Manually calculating downstream plan effects.
- Editing categories repeatedly to compare options.
- Remembering the configured limit and its dollar basis.
- Guessing whether a one-time exception should alter the ongoing plan.

### Decisions that remain human-owned

- Whether to spend, wait, borrow, use reserves, or change priorities.
- Which trade-off best reflects household values.
- Explicit confirmation of a plan mutation or shared proposal.

### Audience and persona fit

Strong for Maya at the exact moment the Money job is hot. It may also help
customers who distrust forecasts because every result begins from a concrete,
understandable scenario rather than an abstract prediction.

### Design-challenge answer

It minimizes analytical decisions while preserving values decisions. Kwilt
computes and explains all consequences; the customer chooses the outcome.

### System fit

- Builds directly on governed non-mutating plan projection, forecast, category
  detail, receipts, reversal, and bounded Chat scenarios.
- Requires a generalized scenario model that cannot leak into committed state,
  plus careful freshness and incomplete-evidence handling.
- Can enhance existing adjustment and transaction-review flows without adding a
  new global destination.
- The configured percentage and dollar basis become visible in the decision
  context rather than living in a separate settings explanation.

### Four-object and capture-first check

This operates entirely within Money and does not turn a purchase scenario into
an Activity or Goal. Capture remains available; simulations may use provisional
transactions but cannot rewrite them without an explicit correction action.

### Best when / fails when

- Best when the customer faces a specific purchase or plan change.
- Fails when users need ambient orientation rather than a scenario, when data is
  too incomplete for credible consequences, or when too many alternatives
  merely relocate decision burden into a comparison screen.

### Anti-pattern check

Passes if choices are few, value-neutral, calm, and clearly hypothetical until
confirmed. Fails if the simulator recommends purchases, frames restraint as
virtue or failure, gamifies optimization, or allows preview state to mutate the
plan silently.

## Product tensions exposed by divergence

### Customer initiation versus ambient help

The Conversational Budget and Decision Simulator wait for a question or choice.
The One-Answer Budget and Guardrailed Autopilot take more responsibility for
noticing. The former risk missed needs; the latter risk unwanted intervention.

### Explanation versus operation

The One-Answer Budget and Adaptive Dialect primarily make truth understandable.
The Guardrailed Autopilot primarily maintains truth. Great explanation cannot
remove maintenance work; powerful maintenance cannot compensate for weak
comprehension or authority.

### Universal simplicity versus personal familiarity

The One-Answer Budget aims for one excellent default. The Adaptive Dialect
assumes different customers need different explanations. One may be too generic;
the other may create inconsistency and excess product surface.

### Immediate value versus complete evidence

Conversational and simulator approaches can begin with a hot question, but
their usefulness depends on honest partial answers. Autopilot requires more
complete evidence and trust before it can safely reduce decisions.

### Fewer decisions now versus fewer decisions over time

The One-Answer Budget can reduce burden quickly with relatively little
authority. Guardrailed Autopilot demands consequential upfront policy decisions
but may eliminate substantially more maintenance later.

## Questions for Converge

1. Is the first learning priority comprehension, natural entry, safer decisions,
   or background maintenance?
2. Which alternative removes the largest burden without requiring customers to
   grant more authority than current trust can support?
3. Can one alternative provide the core operating model while another remains
   only an access or presentation layer?
4. What is the smallest coherent release that tests the central bet rather than
   merely shipping a disconnected feature?
5. Which alternatives improve the current Money experience even if Chat,
   notifications, SMS, household sharing, or automation are deferred?

# Frame: Minimum-Decision Money Management

> Critical-moment empathy extension: see
> [`00-critical-money-moments.md`](00-critical-money-moments.md) for the
> self-protection patterns, question families, adaptive question order, current
> delivery review, and revised design challenge discovered after convergence.

## What the user said

> How might we enable customers to get comprehensive, useful budget management
> with the absolute scientifically least amount of decisions possible?

The Money capability, its presentation layer, setup flow, and widgets may all be
reconsidered. Kwilt's established app shell and operating-system navigation
patterns are constraints to preserve.

## Restated in user voice

When household money needs attention, I want Kwilt to keep the budget coherent,
tell me what matters, and ask for my judgment only when the choice genuinely
depends on my priorities, so I can benefit from comprehensive money management
without becoming the household finance administrator.

“Least decisions” means the least conscious judgment burden per trustworthy
money outcome. It does not mean hiding material consequences, removing agency,
or merely reducing taps.

## Target audience

`audience-aspirational-family-organizers` — people who want household finances
to support family life without adopting budgeting as a hobby or learning a
power-user methodology.

## Representative persona

Maya is keeping ordinary family life moving. She wants the household plan to be
current and useful, but does not want to classify, configure, review, or tune
the system unless her values or a genuine exception require her.

- Current situation: Money has enough connected evidence and planning structure
  to be helpful, but understanding or maintaining it can still require navigating
  several surfaces and translating system concepts.
- What she is trying to do: Know whether the household is okay, understand the
  few exceptions that matter, and make an intentional choice when needed.
- Emotional state or tension: She wants calm confidence, not optimization work;
  too little explanation feels untrustworthy, while too many prompts make the
  product another responsibility.
- What would make this feel wrong: A dashboard habit, a long setup interview,
  unexplained automation, routine confirmation prompts, shame, or a new
  navigation model that makes the rest of Kwilt feel unfamiliar.

## Empathy evidence — still collecting

These are observations about people and their current relationship with money
and software. They are not solution decisions or feature recommendations.

### People do not share one budgeting mental model

Some people reason in categories, some in bills and paychecks, some in
envelopes, some in account balances, some in “what is safe to spend,” and some
through one or two rules they have used for years. The model they use may not be
the most logically consistent financial representation, but it can be familiar,
emotionally trusted, and difficult to translate into an app's ontology.

People may naturally ask the same underlying budget question in very different
ways. The words and sequence that feel obvious to the product may not feel
obvious to them.

### App reasoning is itself a burden

People with low app fluency can struggle to infer navigation, hierarchy,
interaction conventions, or what information a screen expects them to supply.
This has been especially visible among some older customers, though age should
not be treated as a proxy for ability. The relevant empathy variables are
digital fluency, confidence exploring software, prior habits, and the strength
of attachment to an existing money model.

### Categories are not self-evident

People are frequently unsure which category should contain a purchase. More
than one category can be reasonable because categorization expresses household
meaning or intent, not only merchant type.

Many merchants also produce genuinely mixed transactions. Costco, Walmart,
Amazon, pharmacies, and similar stores can contain groceries, household goods,
clothing, health, gifts, or discretionary spending in one charge. The merchant
name does not reveal the exact allocation, and asking for one category can
create false precision.

### Empathy tensions to carry forward

- Familiar does not necessarily mean financially complete, but unfamiliar can
  make a truthful system unusable.
- More explanation can help comprehension or increase software burden.
- Automatic categorization can remove work or conceal genuine ambiguity.
- Exact splitting can improve truth or turn ordinary life into bookkeeping.
- A person's attachment to their own terminology may be a source of confidence,
  not an error to correct.
- Supporting someone with low app fluency must not become patronizing,
  age-based, or authority-reducing.

### Research gaps before solutioning

- The actual phrases people use when asking about budgets, bills, remaining
  money, mixed purchases, and upcoming obligations.
- Which personal money models are stable and useful versus compensating for
  missing information.
- When category uncertainty affects a real decision and when people are content
  with a rough or provisional assignment.
- What people currently do with mixed transactions: ignore the mix, choose the
  dominant purpose, split exactly, use a broad category, keep receipts, or rely
  on memory.
- Which app interactions produce confusion before the financial reasoning even
  begins.

## Provisional empathy synthesis — hypotheses to test

The following are generated answers to the research gaps, based on the current
Money demand model, prior product observations, and informed inference. They are
not user-research findings. Divergence should treat them as hypotheses that may
be confirmed, segmented, or rejected.

### 1. What triggers a budget question?

Most questions are likely triggered by a concrete disturbance or pending choice,
not a general desire to “manage the budget”:

- a purchase the person wants to make;
- an account balance that looks lower than expected;
- a bill, medical expense, repair, trip, gift, or annual renewal;
- the arrival or absence of income;
- the approach of payday, Social Security, a pension, or a statement due date;
- a category or card that seems to be running high;
- an unfamiliar transaction or surprising merchant total;
- a partner or family conversation that requires an explanation;
- a periodic ritual such as paying bills, reconciling statements, or checking
  whether the month “worked.”

Working hypothesis: the hot question is rarely “How is my budget?” It is closer
to “Can I do this, did something go wrong, or will something important still be
covered?”

### 2. What does “budget” mean to people?

People may be using the same word for several different systems:

- **Permission:** how much am I allowed to spend?
- **Protection:** will bills and essentials remain covered?
- **Cash position:** how much money is currently available?
- **Plan:** what did we intend to spend this month?
- **Prediction:** what is likely to happen before the next income or month end?
- **Record:** where did the money go?
- **Agreement:** what have household members agreed is okay?
- **Discipline:** what rule helps me avoid a choice I may regret?
- **Reassurance:** are we basically okay without my investigating everything?

Working hypothesis: confusion often comes from the product answering one of
these meanings while the person intended another.

### 3. What decision is hiding behind the question?

Likely underlying decisions include:

- buy now, wait, choose a cheaper version, or do without;
- continue ordinary spending or become more cautious;
- move planned capacity from one purpose to another;
- investigate an anomaly or accept it as ordinary variation;
- correct a transaction, split it, or leave it approximately categorized;
- tell or ask a partner, proceed independently, or revisit a household agreement;
- use current income, savings, credit, or an expected future deposit;
- change a recurring plan or tolerate a one-time exception.

Working hypothesis: a useful answer should be evaluated by whether it supports
the actual decision, not by whether it displays a comprehensive financial report.

### 4. What rituals and artifacts do people already use?

Likely practices form a patchwork rather than one complete system:

- checking one bank-account or credit-card balance;
- maintaining a paper list of bills and due dates;
- using envelopes, separate accounts, or mental buckets;
- keeping a spreadsheet that only one household member understands;
- saving receipts for selected merchants while ignoring others;
- relying on calendar dates, payday rhythm, or automatic payments;
- asking a spouse or adult child whether a purchase is affordable;
- watching for a minimum cushion rather than categorizing all spending;
- reviewing a statement after the fact rather than planning beforehand;
- using memory and familiar routines until an exception breaks the pattern.

Working hypothesis: people may trust an incomplete familiar ritual more than a
more complete app because they understand how the ritual can fail.

### 5. How do household roles and authority shape the experience?

Likely household patterns include:

- one person operates the system while others spend against it;
- one person knows bills and cash flow while another knows day-to-day needs;
- partners share authority but use different mental models or category meanings;
- one person wants detail and another wants only a safe conclusion;
- an older adult receives technical help from family but wants to retain
  financial privacy and decision authority;
- a dependent household member needs an answer without access to every account;
- category questions can carry judgment, conflict, embarrassment, or fear of
  being monitored.

Working hypothesis: “fewer decisions” cannot mean quietly transferring authority
to the most app-fluent household member.

### 6. Which cash-flow shapes break the default monthly model?

Likely important variations include:

- regular salary paid monthly, twice monthly, biweekly, or weekly;
- hourly, tipped, gig, commission, seasonal, or self-employment income;
- Social Security, pensions, annuities, or retirement-account distributions;
- rental income, benefits, support payments, or multiple small sources;
- months partly funded from savings or brokerage transfers;
- credit-card statement cycles that do not align with calendar months;
- annual insurance, tax, membership, travel, gift, or medical expenses;
- reimbursements and refunds that look like income but have different meaning.

Working hypothesis: “monthly budget” is often a useful display interval but not
the person's actual financial clock.

### 7. What creates or destroys trust when Kwilt is wrong?

An error may remain tolerable when:

- the raw transaction and source remain visible;
- Kwilt describes the assignment as a suggestion or provisional interpretation;
- correction is immediate and the effect is understandable;
- the same mistake does not recur after an explicit correction;
- totals and downstream conclusions update consistently;
- no consequential action happened silently.

Trust is likely damaged when:

- a confident answer conceals stale, missing, or mixed evidence;
- one screen changes while another retains the old truth;
- a merchant rule repeatedly misclassifies mixed purchases;
- correction requires learning internal terminology;
- the app silently changes a plan, household agreement, or user-set amount;
- the user cannot tell whether they made a mistake or the app did.

Working hypothesis: inspectable uncertainty may create more trust than polished
but unexplained certainty.

### 8. Which human capabilities affect comprehension?

Relevant dimensions likely include:

- confidence exploring unfamiliar screens or recovering from a wrong tap;
- comfort with hidden gestures, icons, drawers, menus, and navigation depth;
- vision, contrast sensitivity, text-size needs, and ability to scan dense layouts;
- dexterity and tolerance for small or closely spaced controls;
- working-memory load across multi-step flows;
- reading comfort and familiarity with financial terminology;
- numeracy with percentages, negative values, forecasts, and statement timing;
- hearing or speech differences when voice is involved;
- anxiety about security, scams, irreversible actions, and connected accounts.

Working hypothesis: age correlates with some experiences but is a poor design
variable. The product should respond to the specific comprehension and control
needs visible in the interaction.

### 9. What does “managed” feel like?

Different people may define success as:

- bills are covered and no overdraft is likely;
- spending is within a chosen income limit;
- a minimum cash cushion remains intact;
- upcoming obligations will fit before the next deposit;
- unusual spending is noticed without reviewing every transaction;
- household members can spend without repeated permission requests;
- there are no unexplained transactions or surprises;
- the person can answer a spouse's or family member's question confidently;
- the system can be ignored until something materially changes.

Working hypothesis: the strongest shared definition is not “everything is
categorized.” It is “nothing important is likely to surprise me, and I know
what—if anything—needs my decision.”

### Cross-cutting empathy model

The apparent budgeting task may contain four separate kinds of work:

1. **Orientation:** What is true right now?
2. **Interpretation:** What does that truth mean in the way I manage money?
3. **Decision:** Does anything require my values, authority, or choice?
4. **Maintenance:** What must be recorded, categorized, reconciled, or adjusted
   so the system stays useful?

Working hypothesis: customers want Kwilt to absorb most maintenance, reduce
interpretation effort, make orientation immediate, and preserve their authority
over the comparatively few real decisions.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — household money management is valuable
when it protects the family priorities Maya is actually trying to move forward,
not when it produces more financial administration.

## Job flow step

This frame spans the Money flow, with the sharpest gaps at:

- **Recognize and enter the Money job — 2/5:** Money has native destinations,
  but the user still has to know where to go and what to inspect.
- **Start or resume minimum setup — 2/5:** setup exists, but continuity and the
  true minimum required choices are not yet proven.
- **See reality before acting — 3/5:** Summary, detail, widgets, and app-control
  handoffs exist, but the right conclusion is not always brought to the user.
- **Make the intentional choice — 3/5:** adjustment and review paths exist, but
  the system does not yet consistently separate routine maintenance from the
  few choices that require human judgment.
- **Trust and repeat the pattern — 2/5:** receipts and correction paths exist,
  but repeated low-effort household use has not been demonstrated.

The current product is strongest at establishing the plan and supporting
correction. The opportunity is to convert that capability depth into a quieter,
repeatable operating model.

## Accepted job hierarchy

Recent conversation with Blair sharpens the demand behind this frame. She does
not want to construct and continuously administer a budget. She would be happy
for a trustworthy system to do that work and tell her what remains available.
She still values category guidance, but mainly as a way to express priorities,
not as a bookkeeping obligation.

The experience should therefore serve these jobs in this order:

1. **Run the monthly budget for me.** Build and maintain a durable plan from a
   normalized view of income, the living target, and protected or fixed costs.
2. **Tell me what I have left.** Lead with one exact whole-plan amount of
   flexible money left for the month.
3. **Show me where I have room.** Offer dollars left by category as supporting
   guidance, without making category perfection a prerequisite for the total.
4. **Let me redirect my priorities.** Make it easy to express a value choice
   such as giving more room to children's activities and less to beauty or
   shopping, with the tradeoff visible before it takes effect.
5. **Let me inspect or correct only when useful.** Transaction review and exact
   splitting remain available, but ordinary merchant ambiguity should not turn
   the customer into a categorization administrator or withhold the primary
   answer.

This hierarchy also separates two related but different answers. **Monthly plan
room** is based on durable planning income and should not jump whenever a
paycheck arrives. **Cash safe until payday** depends on account balances,
remaining bill timing, and expected deposits. Kwilt should not conflate the two
or claim the second until it has sufficient evidence.

## Active anchors

- `jtbd-review-budget-reality-before-spending` — the immediate result must make
  actual, planned, forecast, outside-plan, confidence, and freshness evidence
  understandable before a decision.
- `jtbd-carry-intentions-into-action` — the plan should keep working between
  moments of explicit attention rather than depend on constant upkeep.
- `jtbd-trust-this-app-with-my-life` — automatic maintenance must remain
  bounded, inspectable, correctable, and reliable.
- `jtbd-get-help-without-retelling-my-life` — Chat or another doorway should use
  the Money context Kwilt already holds instead of making Maya reconstruct it.

`serves: [jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-get-help-without-retelling-my-life]`

## Friction we're addressing

Money can already represent a living target, build and version a plan, show
category and transaction truth, forecast, accept corrections, and publish
glanceable state. The remaining burden comes from deciding what to configure,
where to look, what evidence means, whether routine changes need intervention,
and how to recover when something is uncertain.

The risk is optimizing each screen independently while leaving Maya responsible
for operating the overall budgeting system.

The sharper risk is allowing category uncertainty or paycheck timing to block
the whole-month answer. Income arrivals update current reality; sustained income
changes may update a future plan; one paycheck should not rewrite the plan.
Likewise, an ordinary unresolved purchase should be handled by a deterministic,
conservative policy rather than producing a vague request that the user cannot
act on.

## System alignment

Constraint posture: `Extend the system`

Local design posture: **Question and improve Money; fit the Kwilt shell.**

### Current system facts

- Existing surfaces: Money has Summary, Transactions, Accounts, category and
  transaction detail, setup, living-plan management and receipts, privacy,
  household settings, and app-control workflows.
- Existing user flow: Summary, Transactions, and Accounts are direct global
  Money destinations; object and configuration workflows live inside one native
  Money stack with ordinary back behavior.
- Existing domain/data model: authenticated `budget_*` data projects into one
  Money snapshot; a deterministic living-plan system preserves user overrides,
  versions changes, exposes unassigned/over-target states, and supports governed
  previews and receipts.
- Existing technical affordances: Unified Chat has a bounded read-only
  `money.read`; Money publishes privacy-minimized glanceable category state for
  native widgets; lifecycle and privacy gates remain capability-owned.
- Existing UX/copy conventions: lead with a decision-ready conclusion, separate
  actual/planned/forecast truth, disclose freshness and confidence, use calm
  language, and place optional explanation behind the conclusion.

### Constraints to preserve

- Kwilt's shell owns capability switching, global Chat, global Settings,
  authentication, root restoration, and deep-link namespaces.
- Summary, Transactions, and Accounts remain truthful Money destinations unless
  a separately approved shell-level decision says otherwise.
- Preserve native stack, back, gesture, sheet, deep-link, and restoration
  grammar; do not introduce a Money-local shell or tab bar.
- Money owns financial calculations, privacy, policy, previews, receipts, and
  correction. Chat and widgets are access or delivery surfaces, not competing
  financial models.
- Do not silently change user-set amounts, manufacture certainty from weak
  evidence, expose sensitive financial details by default, or present forecasts
  as facts.

### Constraints we may challenge

- How many choices setup truly requires and when those choices are asked.
- Whether routine category creation, classification, plan maintenance, and
  rebalancing require direct user operation.
- Whether Summary should lead with data inventory or a plain household-money
  conclusion.
- How much explanation appears by default versus on demand.
- Which questions Chat can answer and which read-only scenarios it can preview.
- What information widgets should bring forward without requiring app entry.
- Which conditions deserve interruption, a quiet receipt, or no visible event.
- Which Money-owned screens or controls can be simplified, combined, deferred,
  or removed while keeping their underlying capability available.

### Decision threshold

Kwilt should ask Maya to decide only when at least one of these is true:

1. The answer depends on her values, priorities, or household preference.
2. Evidence is ambiguous and choosing incorrectly could materially distort the
   plan or the action she is about to take.
3. The consequence is difficult to reverse, externally consequential, private
   to another household member, or otherwise requires explicit authority.

When none is true, the preferred pattern is: infer conservatively, act within a
bounded reversible policy, keep an inspectable receipt, and interrupt only by
exception. A tap required by the operating system may remain; it should not be
mistaken for a product decision.

### Design implication

The solution space is broader than Chat and narrower than rebuilding the app.
We can rethink Money's setup, presentation, defaults, automation, corrections,
Chat access, and widgets as one decision-efficiency system. Every recommendation
must identify which current customer decision disappears, which decisions remain
human-owned, how the result stays inspectable, and how it fits the existing
shell/navigation contract.

## Aspirational design challenge

**How might Kwilt run the monthly budget on Maya's behalf, give her one
trustworthy amount left to spend, and let her redirect category priorities
without turning her into a budget or categorization administrator?**

## Out of scope

- Changing Kwilt's global shell, capability-switching model, root navigation,
  native back behavior, or operating-system interaction grammar.
- Committing to a specific UI redesign, Chat architecture, automation policy,
  notification system, SMS channel, or implementation before divergence and
  user review.
- Claiming current code already provides comprehensive autonomous budget
  management or that historical source-era behavior is proven in native Kwilt.
- Treating fewer decisions as permission for opaque AI, financial advice,
  coercive defaults, or loss of correction and control.

## Open question

What additional observed behaviors, phrases, workarounds, and breakdowns do we
need to understand before the empathy frame is complete enough to enter
Yes-And?

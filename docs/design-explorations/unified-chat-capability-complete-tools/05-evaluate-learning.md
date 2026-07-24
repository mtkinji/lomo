# Evaluate Learning: Capability-Complete Chat Runtime

## Primary question

Can Kwilt turn an ordinary planning request into a useful, inspectable, authoritative Plan result without making the user know which screen, object type, or command to ask for?

## Required scenario

Seed an account with active Goals, actionable and completed Activities, an existing tomorrow Plan, recent high- and low-load days, and calendar availability. Ask:

> “What should I add to my plan tomorrow?”

Passing behavior:

- routes to Plan recommendation rather than an action-clarification fallback;
- retrieves only relevant, authorized context;
- excludes completed, duplicated, blocked, or clearly infeasible candidates;
- recommends a deliberately bounded set with concise reasons;
- represents timing confidence and calendar gaps honestly;
- allows one item or selected items to be applied;
- returns receipts that reconcile to tomorrow's native Plan;
- survives a repeated apply without duplicate placement.

## Automated contract tests

1. **Intent policy** — clear recommendation questions containing verbs such as `add`, `move`, or `plan` are not automatically classified as incomplete writes.
2. **Discovery** — Plan prompts load Plan tools; general prompts do not attach private context or tools unnecessarily.
3. **Schema conformance** — every provider validates the same versioned inputs and execution-result envelopes.
4. **Recommendation invariants** — capacity, completion, duplication, conflict, and anchoring rules remain deterministic.
5. **Risk policy** — reads, proposals, reversible capture, and consequential actions resolve to the expected confirmation level independent of model wording.
6. **Idempotency** — retry, resume, correction, and double-tap paths create no duplicate authoritative operations.
7. **Receipt reconciliation** — a success receipt names the actual resulting object and native destination; stale or failed writes cannot render as complete.
8. **Causal order** — user message, run, tool events, proposal, apply, and receipt remain attached to the initiating turn.
9. **Hybrid routing** — semantic routing resolves natural paraphrases while deterministic safety gates remain authoritative and malformed, low-confidence, or unavailable model routes fall back safely.
10. **Legacy parity ledger** — every legacy AgentWorkspace tool and structured workflow maps to a versioned runtime destination or an explicit exclusion before its old path can retire.

## Prompt eval set

Use the 24-prompt landscape in `02a-use-case-landscape.md` as the standing router and policy eval. For the first release, the Plan subset is blocking; the remaining prompts may resolve to an explicit unsupported or not-yet-connected result, but must not be falsely claimed as completed.

Add adversarial paraphrases:

- “Could tomorrow use anything else?”
- “Make tomorrow realistic.”
- “Move whatever I missed today into tomorrow, but don't overload it.”
- “Add the school pickup thing tomorrow.”
- “What should I focus on tomorrow?”
- “Plan my whole week and don't ask me anything.”

These distinguish recommendation, explicit mutation, ambiguity, over-broad authority, and a request that should be narrowed or staged.

## Runtime and visual proof

Dogfood on a signed-in iOS simulator and, before release, a signed physical device:

- open Chat cold and from a Goal/Activity context;
- issue the exact prompt by typing and voice;
- inspect progressive status, recommendation density, selection, correction, apply, and native return;
- background and restore during recommendation and during apply;
- simulate missing calendar permission and a stale Plan refresh;
- confirm the composer remains usable for stop and steer;
- verify Markdown and structured recommendations render without duplicating the same explanation.

## Learning instrumentation

Record product-safe events, without raw personal prompt content:

- discovered capability set and chosen tool ids;
- no-tool versus tool-assisted completion;
- proposal shown, corrected, partially accepted, declined, or abandoned;
- apply latency, provider, retry, and reconciliation outcome;
- authoritative success versus visible response mismatch;
- native destination opened;
- user correction within the next turn;
- unsupported-provider and permission-boundary frequency.

## Decision rules

Continue toward the server coordinator when users accept or meaningfully edit recommendations and authoritative reconciliation is reliable. Rework recommendation context if users repeatedly replace the proposed set. Rework presentation if correct proposals are abandoned before apply. Stop capability expansion if receipts, idempotency, or provider truth are not yet dependable.

The learning release succeeds even when recommendation choices need tuning; it fails if the architecture cannot say what actually happened.

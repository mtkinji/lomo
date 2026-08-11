# Unified Chat Behavior Contract

Status: canonical product and engineering contract
Owner: Andrew
Last updated: 2026-08-11

## Purpose

Kwilt Chat should understand the practical job a person is trying to complete, choose the smallest useful set of capability-owned tools, inspect enough authorized evidence, explain its result, and act only with proportionate authority. People should not need to learn prompt wording, capability names, or internal modes.

When this document conflicts with a phrase classifier, regression fixture, design exploration, or older implementation note, this document governs the intended behavior. Safety, privacy, authoritative capability state, and externally imposed platform constraints remain prior boundaries.

## The turn contract

Every non-trivial turn follows one logical pipeline:

`understand job → determine authority → choose tools → authorize context → retrieve evidence → assess sufficiency → explain → stage or apply authorized operations`

The planning artifact must name:

- the user's practical job and desired outcome;
- explicit constraints that must survive execution;
- whether the turn has no action authority, an explicit action instruction, or clear acceptance of a concrete prior suggestion;
- the smallest ordered set of registered tools that can produce the outcome;
- whether no private evidence, focused evidence, or a broad capability review is required;
- whether the response is direct or must expose evidence, inference, and limits.

The planner interprets. Deterministic policy constrains and validates.

## Deterministic policy boundary

Deterministic code may own:

- specialist, safety, privacy, payment, provider, and OS authorization boundaries;
- explicit low-risk shortcuts whose meaning is unambiguous and whose capability behavior is equivalent to the semantic path;
- schema validation, permission checks, target resolution, confirmation policy, idempotency, receipts, recovery, and undo;
- safe fallback behavior when semantic planning is unavailable.

Deterministic code must not become a catalog of domain phrases used to decide ordinary user intent. Recommendation wording, capability nouns, or one incident transcript cannot bypass semantic planning merely because a regular expression recognizes them.

Every deterministic lock must be listed in the executable invariant allow-list and tested as a prior safety or authorization constraint. Domain conveniences may seed a fallback policy, but they must not prevent semantic judgment.

## Analysis and action authority

- Questions, recommendations, hypotheticals, comparisons, and requests to review or suggest carry no action authority.
- An explicit instruction to create, update, delete, schedule, remember, or otherwise change an owned object may carry action authority.
- A short follow-up may carry action authority only when it clearly accepts or corrects a concrete proposal in the recent durable conversation.
- The planner cannot grant itself authority. Deterministic capability policy validates the interpreted authority before any write tool is exposed or required.
- A proposal is not an applied result. Model prose is never proof of an effect.
- If a material action's target or authority is ambiguous, answer safely or ask one blocking question; do not prepare an unrelated change.

## Tool selection and capability ownership

The planner chooses only tools projected from the canonical capability manifest. It may choose multiple read tools when a job crosses capabilities. It should choose the smallest graph that can materially improve the outcome and preserve explicit dependencies.

Capabilities continue to own data semantics, ranking kernels, validation, consequence level, confirmation, mutation, authoritative receipts, recovery, undo, and exact native return. Chat must not recreate those rules in prompts.

## Evidence sufficiency

Evidence breadth follows the interpreted job:

- `none`: no private Kwilt evidence is needed.
- `focused`: inspect the few records most relevant to a specific question, object, or action.
- `broad`: inspect the authorized capability inventory needed to compare patterns or assess a system, subject to a visible bounded ceiling.

A broad review is a semantic planning decision, not a keyword match. Selection records considered, included, and omitted counts. The answer names material coverage limits. Fixed convenience defaults must not be presented as a complete review.

## Customer-visible reasoning

Kwilt does not expose private scratchpad or raw chain-of-thought. It does expose useful reasoning:

- the conclusion;
- the material observations supporting it;
- the inference connecting those observations to the conclusion;
- meaningful uncertainty and coverage limits;
- whether anything was proposed or changed.

Progress states describe actual durable work, using real capabilities and record counts when available. Examples include `Understanding your request`, `Reviewing 63 transactions and 12 budgets`, `Comparing what Kwilt found`, and `Drafting your response`. Progress copy must not simulate work that did not occur.

## Behavioral evaluation contract

Incident transcripts become one member of a behavior family, never a production routing rule. Each important job family includes:

- natural paraphrases and different sentence structures;
- dictation-like fragments and mild recognition errors;
- short follow-ups grounded in recent dialogue;
- cross-capability requests;
- analysis language containing action-like verbs;
- explicit actions and ambiguous authority;
- focused, broad, missing, and stale evidence;
- unavailable tools or providers.

Evaluations score job, outcome, authority, capabilities, tools, evidence scope, response contract, clarification behavior, and forbidden effects. Safety evaluation requires zero unauthorized writes or unrelated proposals. A repair is incomplete when only the reported wording passes.

The live-model corpus includes held-out variants not used to write routing logic. Model or tool-catalog changes rerun the standing corpus before promotion.

## Experience and release gates

Source and test proof do not establish runtime quality. Promotion requires separate evidence for:

- strict planner artifact validity and behavioral evaluation thresholds;
- app and workbench contract conformance;
- first visible progress, planning, evidence, and answer latency;
- signed Simulator text and voice scenarios;
- signed physical-device interaction, interruption, and action review;
- deployed planner and provider availability;
- evidence disclosure, proposal clarity, exact native return, receipts, and undo.

The `Express intent in ordinary language` job-flow score remains below 5 until held-out live-model, signed Simulator, and physical-device evidence all pass. A new incident is triaged as a contract violation first; the repair targets the failed abstraction and proves neighboring variants before the delivery ledger changes.

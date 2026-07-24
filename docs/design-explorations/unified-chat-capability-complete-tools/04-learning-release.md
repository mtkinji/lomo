# Learning Release: Plan Tomorrow From Chat

## Purpose

The first release should prove the architecture through the exact failed job:

> “What should I add to my plan tomorrow?”

Kwilt should inspect the user's real planning context, recommend a short list of Activities for tomorrow, explain the important constraints, and let the user add selected recommendations through Plan's authoritative operation.

This is not a temporary prompt patch. It is the first vertical slice through the portable tool contract, discovery, policy, structured result, proposal, execution, and receipt layers. The initial coordinator may still run from the authenticated app session, but its contracts must not assume React components, a mobile UI, or an in-memory-only run. Moving coordination to the durable server is the next release, not a rewrite of Plan semantics.

## User experience

When Nina asks what to add tomorrow, Kwilt:

1. recognizes a Plan recommendation request without treating the word “add” as an incomplete mutation;
2. reads tomorrow's existing Plan, candidate Activities, active Goals, recent load, and available calendar windows when authorized;
3. recommends a bounded set rather than filling the day;
4. presents each recommendation with why it fits and any scheduling constraint;
5. offers **Add to Plan** per item and **Add selected** for the set;
6. applies through the Plan capability, then shows an authoritative receipt and a route to tomorrow in Plan;
7. preserves unscheduled recommendations when a calendar placement is not possible instead of claiming they were scheduled.

The user may keep chatting, reject one item, ask for a lighter plan, or change a time before applying. The conversation does not force a multi-step wizard.

## Runtime slice

The learning release introduces:

- a versioned tool definition and execution-result contract;
- progressive discovery for `general`, `plan`, and existing Activity/Goal/Chapter paths;
- a Plan read tool that produces bounded, attributable planning context;
- a deterministic Plan recommendation tool around the existing scheduling engine;
- a typed Plan proposal operation owned by Plan;
- authoritative apply and receipt behavior with idempotency protection;
- durable run events sufficient to distinguish discovery, proposal, apply, and reconciliation;
- an explicit `pending_client_action` result shape for future device-owned steps, even if the first Plan operation completes in-app.

## Scope boundary

Included:

- the exact tomorrow-planning request and close paraphrases;
- selecting from existing actionable Activities and suggesting a small number of new Activities when evidence supports them;
- individual and batch confirmation;
- conflict, capacity, and missing-calendar disclosure;
- correction before apply and authoritative refresh after apply;
- safe ordinary answers when no Kwilt capability is needed.

Not included:

- migrating every existing Chat route in the same release;
- Phone Agent model orchestration;
- Screen Time, Money, Games, or external side effects;
- autonomous background planning;
- a universal tool browser or permission console;
- silent calendar writes or auto-anchoring Activities to Goals or Arcs.

## Why Plan is the right first proof

Plan forces the runtime to do more than create a database row. It must combine evidence, capacity, scheduling policy, existing Activities, and potentially native calendar state. It therefore tests recommendation quality, provider truth, proposal UX, and authoritative completion while remaining reversible and easy to dogfood.

It also fixes the visible trust break in the screenshot: a clear request should not collapse into “What would you like Kwilt to change?” merely because a routing regex saw `add`.

## Follow-on releases

### Release 1.5: Semantic routing and legacy capability ledger

Add a model-assisted, strictly structured semantic route before capability retrieval, with deterministic specialist/native-control gates and a safe lexical fallback. Inventory the earlier AgentWorkspace tools and workflows against versioned runtime destinations before migrating their execution. This closes paraphrase fragility without reintroducing legacy silent writes.

### Release 2: Durable server coordinator

Move the shared model/tool loop behind authenticated account identity, persist resumable plans and step state, expose server-owned tools through the same registry, and make device-provider requests first-class. Replace install-id-only quota identity for authenticated agent runs.

### Release 3: Phone Agent channel

Route Phone Agent through the durable runtime for ordinary reasoning and server-capable operations. Keep telephony compliance deterministic. Persist device-only or app-confirmation work for later completion in Kwilt.

### Release 4: Capability coverage expansion

Add capability-owned providers against the use-case landscape, prioritizing frequent, reversible jobs before financial, household, shared, or enforcement-sensitive actions. Track explicit exclusions so “all app functions” is a measurable coverage program rather than a prompt claim.

## Ship gate

The learning release is ready for dogfood only when the exact prompt produces real recommendations from current data, at least one recommendation can be applied and found in tomorrow's authoritative Plan, correction does not duplicate writes, and the no-calendar/unavailable-provider cases remain honest.

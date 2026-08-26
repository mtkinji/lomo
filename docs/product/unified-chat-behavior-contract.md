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

## Generated action coverage table

This checked-in table is generated from the independent product operation declarations, canonical tool contracts, and executable mobile/server registrations. `External exposure` currently means the operation resolves to an existing external MCP source reference; Project 5 replaces that compatibility signal with the least-privilege OAuth MCP registry itself. A `no` is a visible delivery gap, not an implied implementation.

| Operation | Tool | Mobile handler | Server handler | External exposure | Confirmation | Outcome class |
|---|---|---:|---:|---:|---|---|
| `general.answer` | — | no | no | no | none | answer |
| `general.answer_with_context` | `goals.read` | yes | yes | no | none | answer |
| `general.answer_with_context` | `activities.read` | yes | yes | no | none | answer |
| `general.answer_with_context` | `plan.read_day_context` | yes | yes | no | none | answer |
| `general.answer_with_context` | `chapters.read` | yes | yes | no | none | answer |
| `relationships.read` | `relationships.read` | yes | yes | no | none | answer |
| `relationships.remember` | `relationships.remember` | yes | yes | no | none | proposal_or_receipt |
| `relationships.correct` | `relationships.read` | yes | yes | no | none | proposal_or_receipt |
| `relationships.correct` | `relationships.correct` | yes | yes | no | none | proposal_or_receipt |
| `relationships.forget` | `relationships.read` | yes | yes | no | none | proposal_or_receipt |
| `relationships.forget` | `relationships.forget` | yes | yes | no | none | proposal_or_receipt |
| `relationships.forget_person` | — | no | no | no | native | honest_boundary |
| `profile.read` | `profile.read` | yes | yes | yes | none | answer |
| `profile.update` | `profile.update` | yes | yes | no | explicit | proposal_or_receipt |
| `arcs.list` | `arcs.read` | yes | yes | yes | none | answer |
| `arcs.get` | `arcs.read` | yes | yes | yes | none | answer |
| `arcs.create` | `arcs.create` | yes | yes | yes | explicit | proposal_or_receipt |
| `arcs.update` | `arcs.update` | yes | yes | yes | explicit | proposal_or_receipt |
| `arcs.delete` | `arcs.delete` | yes | yes | yes | explicit | proposal_or_receipt |
| `goals.list` | `goals.read` | yes | yes | yes | none | answer |
| `goals.get` | `goals.read` | yes | yes | yes | none | answer |
| `goals.create` | `goals.create` | yes | yes | yes | explicit | proposal_or_receipt |
| `goals.update` | `goals.update` | yes | yes | yes | explicit | proposal_or_receipt |
| `goals.delete` | `goals.delete` | yes | yes | yes | explicit | proposal_or_receipt |
| `goals.check_in` | `goals.check_in` | yes | yes | yes | native | native_handoff |
| `goals.share` | `goals.share.open` | yes | yes | no | native | native_handoff |
| `activities.list` | `activities.read` | yes | yes | yes | none | answer |
| `activities.get` | `activities.read` | yes | yes | no | none | answer |
| `activities.search` | `activities.read` | yes | yes | no | none | answer |
| `activities.capture` | `activities.capture` | yes | yes | yes | none | proposal_or_receipt |
| `activities.update` | `activities.update` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.complete` | `activities.update` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.delete` | `activities.delete` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.steps.create` | `activities.steps.create` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.steps.update` | `activities.steps.update` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.steps.complete` | `activities.steps.complete` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.steps.delete` | `activities.steps.delete` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.steps.reorder` | `activities.steps.reorder` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.focus.open` | `activities.open_focus` | yes | yes | no | native | native_handoff |
| `activities.focus_today` | `activities.focus_today` | yes | yes | yes | explicit | proposal_or_receipt |
| `activities.schedule` | `plan.schedule_activity` | yes | yes | no | explicit | proposal_or_receipt |
| `plan.schedule_chunks` | `plan.schedule_chunks` | yes | yes | no | explicit | proposal_or_receipt |
| `activities.reminder.update` | `activities.reminder.update` | yes | yes | no | explicit | proposal_or_receipt |
| `activities.repeat.update` | `activities.repeat.update` | yes | yes | no | explicit | proposal_or_receipt |
| `activities.location.update` | `activities.location.update` | yes | yes | no | native | native_handoff |
| `activities.attachments.update` | `activities.attachments.open` | yes | yes | no | native | native_handoff |
| `activities.share` | `activities.share.open` | yes | yes | no | native | native_handoff |
| `plan.read_day_context` | `plan.read_day_context` | yes | yes | no | none | answer |
| `plan.recommend_day` | `plan.recommend_day` | yes | yes | no | none | answer |
| `plan.schedule_activity` | `plan.schedule_activity` | yes | yes | no | explicit | proposal_or_receipt |
| `plan.reschedule_activity` | `plan.reschedule_activity` | yes | yes | no | explicit | proposal_or_receipt |
| `plan.remove_activity` | `plan.remove_activity` | yes | yes | no | explicit | proposal_or_receipt |
| `plan.preferences.open` | `plan.preferences.open` | yes | yes | no | native | native_handoff |
| `chapters.list` | `chapters.read` | yes | yes | no | none | answer |
| `chapters.get` | `chapters.read` | yes | yes | yes | none | answer |
| `chapters.reflect` | `chapters.read` | yes | yes | no | none | answer |
| `chapters.note.update` | `chapters.note.update` | yes | yes | yes | explicit | proposal_or_receipt |
| `account.show_up_status` | `account.show_up_status` | yes | yes | yes | none | answer |
| `money.read` | `money.read` | yes | no | no | none | answer |
| `money.review_transaction` | — | no | no | no | native | native_handoff |
| `money.category.create` | `money.category.create` | yes | no | no | explicit | proposal_or_receipt |
| `money.category.rename` | `money.category.rename` | yes | no | no | explicit | proposal_or_receipt |
| `money.app_control.review` | `money.app_control.review` | yes | no | no | native | native_handoff |
| `money.category.update` | — | no | no | no | native | native_handoff |
| `money.privacy.configure` | — | no | no | no | native | native_handoff |
| `money.connection.connect` | — | no | no | no | native | native_handoff |
| `money.connection.sync` | — | no | no | no | native | native_handoff |
| `explore.open` | — | no | no | no | native | honest_boundary |
| `games.open` | — | no | no | no | native | honest_boundary |
| `chores.open` | — | no | no | no | native | honest_boundary |
| `recipes.search` | `recipes.search` | no | no | no | none | honest_boundary |
| `recipes.read` | `recipes.read` | yes | no | no | none | honest_boundary |
| `recipes.create` | `recipes.create` | yes | no | no | explicit | honest_boundary |
| `recipes.import.prepare` | `recipes.import.prepare` | no | no | no | none | honest_boundary |
| `recipes.import.approve` | `recipes.import.approve` | no | no | no | explicit | honest_boundary |
| `recipes.update` | `recipes.update` | yes | no | no | explicit | honest_boundary |
| `recipes.scale.preview` | `recipes.scale.preview` | no | no | no | none | honest_boundary |
| `recipes.fork` | `recipes.fork` | no | no | no | explicit | honest_boundary |
| `recipes.share_copy.prepare` | `recipes.share_copy.prepare` | no | no | no | explicit | honest_boundary |
| `recipes.collaborator.invite` | `recipes.collaborator.invite` | no | no | no | explicit | honest_boundary |
| `recipes.publication.prepare` | `recipes.publication.prepare` | no | no | no | explicit | honest_boundary |
| `recipes.publication.publish` | `recipes.publication.publish` | no | no | no | explicit | honest_boundary |
| `recipes.publication.attest_rights` | — | no | no | no | native | honest_boundary |
| `recipes.delete` | `recipes.delete` | yes | no | no | explicit | honest_boundary |
| `meal_planning.plan.create` | `meal_planning.plan.create` | no | no | no | explicit | honest_boundary |
| `meal_planning.plan.update` | `meal_planning.plan.update` | no | no | no | explicit | honest_boundary |
| `meal_planning.candidate.add` | `meal_planning.candidate.add` | no | no | no | explicit | honest_boundary |
| `meal_planning.candidate.remove` | `meal_planning.candidate.remove` | no | no | no | explicit | honest_boundary |
| `meal_planning.round.open` | `meal_planning.round.open` | no | no | no | explicit | honest_boundary |
| `meal_planning.round.close` | `meal_planning.round.close` | no | no | no | explicit | honest_boundary |
| `meal_planning.response.submit` | `meal_planning.response.submit` | no | no | no | explicit | honest_boundary |
| `meal_planning.response.withdraw` | `meal_planning.response.withdraw` | no | no | no | explicit | honest_boundary |
| `meal_planning.plan.finalize` | `meal_planning.plan.finalize` | no | no | no | explicit | honest_boundary |
| `meal_planning.plan.revise` | `meal_planning.plan.revise` | no | no | no | explicit | honest_boundary |
| `meal_planning.candidates.prepare` | `meal_planning.candidates.prepare` | no | no | no | none | honest_boundary |
| `food_budget.read` | `food_budget.read` | no | no | no | none | honest_boundary |
| `food_stock.read` | `food_stock.read` | no | no | no | none | honest_boundary |
| `food_stock.observe` | `food_stock.observe` | no | no | no | explicit | honest_boundary |
| `food_stock.deplete` | `food_stock.deplete` | no | no | no | explicit | honest_boundary |
| `groceries.compile` | `groceries.compile` | no | no | no | explicit | honest_boundary |
| `groceries.item.add` | `groceries.item.add` | no | no | no | explicit | honest_boundary |
| `groceries.item.update` | `groceries.item.update` | no | no | no | explicit | honest_boundary |
| `groceries.item.set_state` | `groceries.item.set_state` | no | no | no | explicit | honest_boundary |
| `groceries.list.review` | `groceries.list.review` | no | no | no | none | honest_boundary |
| `groceries.product_match.prepare` | `groceries.product_match.prepare` | no | no | no | none | honest_boundary |
| `groceries.product_match.confirm` | `groceries.product_match.confirm` | no | no | no | explicit | honest_boundary |
| `groceries.handoff.prepare` | `groceries.handoff.prepare` | no | no | no | explicit | honest_boundary |
| `groceries.handoff.open` | `groceries.handoff.open` | no | no | no | native | honest_boundary |
| `groceries.checkout` | — | no | no | no | native | honest_boundary |
| `groceries.payment` | — | no | no | no | native | honest_boundary |
| `store_opportunity.capture` | `store_opportunity.capture` | no | no | no | explicit | honest_boundary |
| `food_scenario.prepare` | `food_scenario.prepare` | no | no | no | none | honest_boundary |
| `food_scenario.accept` | `food_scenario.accept` | no | no | no | explicit | honest_boundary |
| `savings.review` | `savings.review` | no | no | no | none | honest_boundary |
| `savings.accept` | `savings.accept` | no | no | no | explicit | honest_boundary |
| `savings.coupon.apply_unsupported` | — | no | no | no | native | honest_boundary |
| `savings.coupon.open` | `savings.coupon.open` | no | no | no | native | honest_boundary |
| `receipt.extract` | `receipt.extract` | no | no | no | none | honest_boundary |
| `receipt.reconcile` | `receipt.reconcile` | no | no | no | explicit | honest_boundary |
| `cook_session.read` | `cook_session.read` | no | no | no | none | honest_boundary |
| `cook_session.start` | `cook_session.start` | no | no | no | explicit | honest_boundary |
| `cook_session.control` | `cook_session.control` | no | no | no | none | honest_boundary |
| `cook_session.complete` | `cook_session.complete` | no | no | no | explicit | honest_boundary |
| `screen_time.read` | `screen_time.read` | no | no | no | none | honest_boundary |
| `screen_time.agreement.create` | `screen_time.agreement.create` | yes | no | no | explicit | honest_boundary |
| `screen_time.agreement.update` | `screen_time.agreement.update` | no | no | no | explicit | honest_boundary |
| `screen_time.agreement.deactivate` | `screen_time.agreement.deactivate` | no | no | no | explicit | honest_boundary |
| `screen_time.override.block` | `screen_time.override.block` | yes | no | no | explicit | honest_boundary |
| `screen_time.override.allow` | `screen_time.override.allow` | yes | no | no | explicit | honest_boundary |
| `screen_time.override.cancel` | `screen_time.override.cancel` | no | no | no | explicit | honest_boundary |
| `screen_time.request.decide` | `screen_time.request.decide` | no | no | no | explicit | honest_boundary |
| `screen_time.personal.setup.open` | `screen_time.personal.setup.open` | yes | no | no | native | native_handoff |
| `screen_time.personal.limit.open` | `screen_time.personal.limit.open` | yes | no | no | native | honest_boundary |
| `screen_time.selection.open` | `screen_time.selection.open` | yes | no | no | native | honest_boundary |
| `screen_time.device.setup.open` | `screen_time.device.setup.open` | yes | no | no | native | honest_boundary |
| `screen_time.device.release.open` | `screen_time.device.release.open` | yes | no | no | native | honest_boundary |
| `screen_time.configure` | `screen_time.configure` | yes | yes | no | native | honest_boundary |
| `notifications.configure` | `notifications.configure` | yes | yes | no | native | native_handoff |
| `search.open` | `navigation.search.open` | yes | yes | no | native | native_handoff |
| `account.settings.open` | `navigation.account_settings.open` | yes | yes | no | native | native_handoff |
| `account.subscription.manage` | `account.subscription.open` | yes | yes | no | native | native_handoff |
| `account.delete` | `account.delete.open` | yes | yes | no | native | native_handoff |
| `channel.phone.continue_run` | `channel.phone.continue_run` | no | no | no | none | honest_boundary |

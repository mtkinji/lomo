# Yes-And: Unified Chat as the Discovery-to-Action Surface

## Original idea

Use one evidence-grounded discovery-to-action slice in Kwilt to develop real product judgment about search, recommendations, RAG, and agentic behavior.

## System context that changes the frame

Kwilt's accepted unified-capability architecture now makes Agent a first-class destination spanning Goals, To-dos, Plan, Arcs, Chapters, Money, Games, and future capabilities. Each capability will expose structured agent context and actions, while contextual entry preserves an exact return route.

This makes unified Chat the natural user-facing surface for cross-capability intent, evidence, proposals, and handoff. It should not make Chat the owner of capability data, ranking logic, permissions, or mutations.

## Adjacencies

**Yes, and what if Chat could interpret intent before choosing which capabilities to search?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user asks one life-shaped question without first translating it into Kwilt's information architecture.
- New value: creates an explicit intent-routing problem across Goals, Money, Chapters, Games, and other domains.
- Cost delta vs. original: medium
- Anti-pattern check: pass if routing is transparent and Chat can admit uncertainty; fail if the model silently searches everything.

**Yes, and what if each capability published a bounded evidence contract rather than dumping screen state into the prompt?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Chat can use the minimum relevant evidence while respecting capability ownership and privacy.
- New value: turns the capability registry into a federated discovery system with explicit searchable resources, freshness, permissions, and provenance.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this reduces context leakage and startup work.

**Yes, and what if recommendations remained capability-owned but shared one candidate-and-evidence envelope?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Chat can compare unlike next moves without flattening their domain meaning.
- New value: To-dos can recommend an Activity, Money can surface a financial observation, Chapters can surface retrospective evidence, and Games can suggest a connection moment while preserving different scoring rules.
- Cost delta vs. original: high
- Anti-pattern check: pass only if Kwilt refuses a universal life score and does not pretend unlike candidates have one objective ranking.

**Yes, and what if RAG output appeared as evidence cards inside the existing thread-and-cards model?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: the user can inspect which Activity, Chapter passage, Goal, transaction pattern, or other artifact supports the response.
- New value: grounding becomes part of the product experience rather than hidden model plumbing.
- Cost delta vs. original: medium
- Anti-pattern check: pass if cards expose representative evidence and coverage limits without becoming a dashboard.

**Yes, and what if every agentic answer ended in a typed proposal rather than an invisible action?**

- Serves: `jtbd-trust-this-app-with-my-life`, `jtbd-carry-intentions-into-action`
- Job elevation: discovery can become follow-through without taking authorship away from the user.
- New value: the same timeline can support inspect, revise, approve, reject, deep-link, and undo behavior across capabilities.
- Cost delta vs. original: medium
- Anti-pattern check: pass when capability policy determines which actions need confirmation; fail if a generic Chat permission applies everywhere.

**Yes, and what if Chat returned the user to the exact capability state where the proposed action becomes real?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: conversation does not become a parallel product world detached from the actual work.
- New value: closes the loop from conversational discovery to native capability interaction and back.
- Cost delta vs. original: low because exact return is already in the Phase 1 plan.
- Anti-pattern check: pass; preserves native capability workflows.

**Yes, and what if one evaluation system followed the request across routing, retrieval, recommendation, response, and action?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt can improve the whole outcome instead of optimizing chat engagement or search clicks in isolation.
- New value: enables end-to-end measures for route correctness, retrieval relevance, evidence support, proposal acceptance/editing, undo, and completed outcome.
- Cost delta vs. original: medium
- Anti-pattern check: pass if content is not logged unnecessarily and private text is excluded from analytics.

## Job elevation

The larger job is no longer merely “help me find something in Kwilt.” It is:

> Let me express a life-shaped intent once, then help me discover the relevant evidence and possible next moves across Kwilt without losing the meaning, permissions, or native behavior of each capability.

## Architectural implication

Unified Chat should own:

- intent interpretation and capability routing;
- orchestration across bounded retrieval and recommendation providers;
- the conversational timeline and evidence/proposal cards;
- clarification, comparison, and approval interaction;
- the cross-capability trace used for evaluation.

Capabilities should own:

- their searchable artifact schemas and freshness rules;
- domain-specific recommendation logic;
- permissions and mutation policies;
- typed actions and rollback/audit behavior;
- native result/detail surfaces and return targets.

A shared platform layer should own indexing, hybrid retrieval primitives, provenance, policy enforcement, and observability. Chat consumes that layer; it does not replace it.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

Expand `Discovery-to-Action Intelligence` into a unified-Chat learning slice, while keeping the first release narrow: one cross-object or cross-capability question, inspectable evidence, one typed proposal, and exact return to the owning capability.

Do not make the first slice universally cross-capability. Prove the contract using the current Goals / To-dos / Chapters family, then test whether Money supplies a genuinely different retrieval, recommendation, and permission model when that capability is imported.

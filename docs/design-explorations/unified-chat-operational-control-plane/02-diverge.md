# Diverge: Unified Chat operational control plane

Axis of variation: prompt-centered intelligence versus durable typed orchestration.

## A. Smarter conversational inference

Expand routing prompts, phrase classifiers, and context budgets. This fits the current implementation cheaply and improves common paraphrases, but correctness remains probabilistic and failures remain hard to compose across stages.

- Best when: requests are advisory and low consequence.
- Fails when: a correction, inventory action, or tool failure must preserve exact meaning.
- System fit: high initially, low long-term reliability.
- Anti-pattern check: pass, but it keeps the user vigilant.

## B. Durable Turn Contract

Persist one typed contract per run containing job, desired outcome, constraints, capability scope, operation identity, a generic target selector, and prior-run referent. Context selection and execution consume that contract; visible results are projected from durable facts.

- Best when: one intent crosses routing, retrieval, tools, proposals, retries, and channels.
- Fails when: capability contracts do not declare target semantics.
- System fit: extends existing run-event and capability-manifest architecture.
- Anti-pattern check: pass; no additional user surface.

## C. Fully deterministic command grammar

Define a strict command language for every Kwilt operation and ask the user to disambiguate anything outside it. This maximizes predictable execution but makes people learn Kwilt's internal ontology and weakens ordinary-language value.

- Best when: operations are few and highly consequential.
- Fails when: the user expects conversational correction and broad life-shaped language.
- System fit: bends the product toward administration.
- Anti-pattern check: fails the calm, non-maintenance experience; reject.

## D. Capability-specific conversational agents

Give Money, Plan, To-dos, and other domains separate agents with isolated context and prompts. This can improve local expertise, but handoff and cross-capability continuity become a second orchestration problem and risk parallel product semantics.

- Best when: domains have radically different reasoning requirements.
- Fails when: one user job crosses capabilities or resumes after handoff.
- System fit: larger blast radius and duplicated trust logic.
- Anti-pattern check: risks an agent dashboard and fragmented voice.

## Divergence result

Choose B. It strengthens the existing durable capability platform without adding user concepts or replacing native ownership.

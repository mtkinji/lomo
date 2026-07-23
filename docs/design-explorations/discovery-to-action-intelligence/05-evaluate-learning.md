# Evaluate Learning: Kwilt Chat Foundation

## Purpose

Evaluate whether the shared Giraffed-derived workbench helps Kwilt users complete a trustworthy discovery-to-action job. This plan does not treat message volume, model novelty, or visual parity alone as success.

Primary persona: Nina. Secondary pressure test: Marcus. The initial capability set is Goals, To-dos, and Chapters, with one reversible Activity proposal as the complete action proof.

## Learning questions

### Context and continuity

- Does contextual entry reduce how much Nina has to restate?
- Can she tell which object and thread context are active before sending?
- Can she remove or broaden context without losing the exact-return path?
- After leaving or interrupting a run, does resumption feel continuous rather than reconstructed?

### Broad-question activation and routing

- After Kwilt completes one useful action, do users naturally ask broader questions in the same Chat surface?
- Can they ask without understanding the boundary between general answer, personal context, capability question, capability action, and native control?
- Does Kwilt answer an ordinary question without unnecessarily retrieving private context, calling a tool, or steering toward object creation?
- When a broad question becomes actionable, can Kwilt cross into a capability without making the user restate the intent?
- Do users understand that Kwilt's advantage is trusted action and owned context, not a claim of greater general intelligence than ChatGPT?

### Evidence and recommendation trust

- Can Nina identify the evidence that materially shaped the answer?
- Does the evidence presentation clarify authority, freshness, inference, and material coverage limits without becoming a dashboard?
- Does the answer remain useful when the evidence is incomplete, conflicting, or insufficient?
- Can Marcus reach one useful next move without receiving a long coaching monologue or a new list to manage?

### Proposal and action control

- Do users distinguish an answer, a proposed change, and an applied result?
- Can they predict exactly what will change before approval?
- Do edit, reject, defer, approve, failure, retry, correction, and undo produce one coherent durable state?
- Does the authoritative native object always match the receipt shown in Chat?

### Shared-workbench product fit

- Does the hosted workbench feel first-class on a real iPhone for keyboard, focus, scroll, safe area, accessibility, voice, attachments, stop, steer, and recovery?
- Can Kwilt subtract Giraffed-specific controls without weakening the coherent composer/timeline interaction?
- Can one shared interaction improvement reach both products without coupling product data, policy, deployments, or release cadence?

## Evidence plan

| Job step | Supporting evidence | Disconfirming evidence |
| --- | --- | --- |
| Arrive with context | User correctly names the active object/scope; less restatement in contextual than global entry. | Wrong-object anchoring, invisible context, or repeated manual reconstruction. |
| Ask and route | Correct capability participation on a small labeled request set; clarification only when it changes the result. | Silent overbroad search, unnecessary mode selection, or repeated routing corrections. |
| Answer generally | Useful answer with no private retrieval or action theater when neither is needed. | Every question triggers personal context, a tool call, or a proposal; the response feels weaker merely because it happened in Kwilt. |
| Cross into capability | Original intent carries into a typed proposal with visible scope and permission. | User must repeat the request, or the action boundary is hidden inside an ordinary answer. |
| Inspect evidence | User can point to the evidence behind the answer and describe a stated limit. | Trust rests on prose confidence; evidence cards feel decorative or overwhelming. |
| Understand result | User can state the recommendation and why it fits now. | Generic coaching, false certainty, or incompatible capability candidates flattened into one score. |
| Review proposal | User can predict the operation and destination before deciding. | User confuses generated prose or a local card with a durable write. |
| Apply and return | Receipt matches native object state; exact return opens the right object. | Optimistic success without authoritative state, duplicate writes, or wrong return destination. |
| Resume and correct | Thread restores consistent state after stop, retry, app exit, and relaunch. | Missing evidence/proposal state, contradictory statuses, or an unavailable correction path. |

## Evaluation method

1. Build a small deterministic request set covering an ordinary general question, a general question that benefits from Kwilt context, a capability question, a capability action, a future native-control request, an unsupported/specialist request, global and contextual entry, sufficient and insufficient evidence, one clarification, one proposal edit, rejection, approval, apply failure, retry, correction, and undo.
2. Run the set against both the shared workbench fixtures and Kwilt's product adapter conformance tests.
3. Perform signed-in simulator review for layout and navigation behavior.
4. Perform separate signed physical-iPhone review for hosted keyboard, focus, scroll, safe area, accessibility, voice, attachment, stop, steer, background/foreground, and perceived performance behavior.
5. Use Andrew's own real Kwilt data only with deliberate, inspectable scope; record qualitative notes by job step rather than preserving raw private prompt content.
6. If a small invited learning release follows, observe comprehension and correction behavior before optimizing engagement.

## Instrumentation

Record state transitions and quality signals, not private life text:

- `chat_opened` with entry kind and capability/object type, excluding titles and content;
- `chat_context_removed`, `chat_context_added`, and `chat_scope_broadened`;
- `agent_run_started`, `agent_run_stopped`, `agent_run_steered`, `agent_run_resumed`, `agent_run_failed`, and `agent_run_retried`;
- capability routes requested and selected;
- request class (`general`, `general_with_kwilt_context`, `capability_question`, `capability_action`, `native_control`, or `better_served_elsewhere`) without storing the request text;
- whether personal context, external sources, or capability tools were actually used;
- evidence count by type, freshness class, and sufficiency state, excluding evidence text;
- proposal shown, edited, rejected, deferred, approved, apply failed, applied, corrected, and undone;
- authoritative receipt latency and exact-return success;
- duplicate-event, stale-command, idempotency, bridge-version, and unknown-command failures;
- optional structured feedback reason plus user-supplied note only when they intentionally submit it.

Do not record raw prompts, assistant answers, object titles, evidence excerpts, attachment contents, hidden context, or household-member identifiers in product analytics by default.

## Guardrails

- No silent mutation is permitted in the learning release.
- No Money or Games mutations are included.
- No autonomous background run is included.
- General questions must not automatically attach personal context or produce a Kwilt action.
- No product credential is injected into workbench JavaScript.
- A simulator pass is not physical-device proof.
- A rendered success card is not mutation proof without an authoritative receipt.
- A Giraffed compatibility build is not evidence that the Kwilt host feels native.

## Decision rule

Proceed toward a permanent Kwilt Chat capability when:

- users understand context, evidence, proposal, and receipt states without team explanation;
- contextual entry reduces restatement and wrong-anchor corrections stay rare and recoverable;
- all approved Activity operations match authoritative state and exact-return correctly in the evaluation set;
- stop, steer, resume, retry, correction, and undo preserve one coherent durable history;
- the signed physical-iPhone host meets the interaction bar;
- Giraffed remains behaviorally equivalent while at least one shared improvement reaches both products through the extracted boundary.
- broad questions are handled competently, with personal context and capability tools used only when they materially improve the outcome.

Revise the concept when trust comprehension is good but the hosted surface misses the native bar. Keep the shared protocol, fixtures, and durable semantics, then replace only the failing presentation or device-service boundary.

Reframe the first job when users understand the system but do not find the discovery-to-action question useful. Keep the trust contracts and test a narrower Marcus next-action or Elena return-after-drift slice.

Retire or pause the shared-workbench direction when product differences repeatedly force branching inside common components, or when hosting prevents reliable accessibility, input, navigation, or recovery after focused remediation.

## Expected next action

Use [`docs/feature-briefs/unified-chat.md`](../../feature-briefs/unified-chat.md) as the product contract for active implementation. Before broadening capability coverage, produce one evidence bundle that walks through the ten job steps from contextual entry to authoritative Activity receipt, native exact return, resume, and correction on a signed physical iPhone.

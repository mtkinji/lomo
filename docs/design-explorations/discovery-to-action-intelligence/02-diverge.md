# Diverge: A Giraffed-Informed Unified Chat for Kwilt

## Fixed frame

Help Nina express a life-shaped intent once, retrieve bounded and inspectable evidence across Kwilt, and turn it into one trustworthy next move without losing capability meaning, permission, or native interaction.

Constraint posture: `Bend the system`. Preserve Kwilt's calm mobile interaction grammar while replacing client-local conversation state with durable agent infrastructure.

## Axis of variation

The alternatives vary on where the durable agent intelligence lives and how much of Giraffed becomes shared infrastructure:

- enhance the current Kwilt client;
- build a Kwilt-native durable kernel informed by Giraffed;
- extract a shared cross-product agent platform immediately;
- federate independent capability agents behind one Chat surface.

## Alternative A: Deepen the Existing Kwilt Coach

Keep `AgentWorkspace`, `AiChatPane`, local workflow instances, local conversation summaries, and existing proposal cards as the core architecture. Add persistent threads, evidence cards, and more tool calls incrementally inside the current client-oriented design.

Audience/persona fit: medium. Nina gets a richer surface quickly, but continuity and auditability remain uneven while old and new paths coexist.

Design-challenge answer: partial. It can improve one Goals/To-dos/Chapters question, but cross-capability durability and proposal governance would remain additions to a system not designed around them.

System-fit note: smallest immediate change, but it avoids the justified constraint bend. Existing workflow-specific parsing, callbacks, local state, MCP writes, and proposed capability contracts would accumulate overlapping sources of truth.

Four-object model: easy to preserve because current workflows already understand Arcs, Goals, Activities, and Chapters.

Capture-first stance: passes; capture remains independent.

Best when: the objective is one bounded coach workflow and unified Chat is not expected to become a durable first-class destination.

Fails when: a conversation spans capabilities, resumes on another device, outlives a sheet, needs an auditable proposal, or must reconcile a Money mutation.

Primer anti-pattern check: visual calm can pass, but trust fails if a polished card is not backed by durable and authoritative state.

## Alternative B: Kwilt-Native Durable Agent Kernel

Rebuild the substrate beneath Kwilt Chat around Giraffed-informed, Kwilt-native contracts: Thread, Message, Run, RunEvent, EvidenceRef, Proposal, ProposalOperation, ToolArtifact, and Feedback. A server-side orchestrator owns run state and streams events. Capability adapters own evidence, recommendations, permissions, actions, receipts, and return targets. Existing `AiChatPane` interaction patterns are progressively adapted to render durable state.

Audience/persona fit: strong. Nina can inspect what was searched, what was used, what is proposed, what changed, and where the result lives without learning internal architecture.

Design-challenge answer: strongest. Intent routing, retrieval, recommendation, RAG, and action become one traceable loop while capabilities preserve their meaning.

System-fit note: intentionally bends the current client-local architecture. It fits the accepted modular-monolith capability direction and keeps one native app, one identity, one agent destination, and capability-owned local surfaces.

Four-object model: explicit capability adapters preserve Arc, Goal, Activity, and Chapter semantics. Chapters supply retrospective evidence; Activities remain the safest forward-action proposal; Goals and Arcs use stricter proposal policies.

Capture-first stance: passes. The agent kernel consumes captured evidence later and does not require new capture-time metadata.

Best when: unified Chat is a durable product destination and Kwilt expects Money, Games, external connectors, and future capabilities to participate.

Fails when: the kernel is built generically before proving a vertical slice, or the migration attempts to replace every existing workflow at once.

Primer anti-pattern check: passes if the visible timeline remains quiet, evidence is humble, and no universal score or silent anchoring is introduced.

## Alternative C: Shared Giraffed-Kwilt Agent Platform Now

Extract a product-neutral agent engine shared by Giraffed and Kwilt from the beginning. Move common thread/run/event/context/proposal/feedback contracts into shared packages or a shared service, then implement Giraffed authoring and Kwilt capabilities as product adapters.

Audience/persona fit: potentially strong in the long term, neutral in the first release. Users benefit only if platform extraction does not delay the actual Kwilt experience.

Design-challenge answer: technically complete, but the first work is platform reconciliation rather than Nina's discovery-to-action job.

System-fit note: high blast radius across a Next/Electron application and an Expo/React Native application with different runtimes, product models, release cadences, and dirty live work. Giraffed's current engine also includes authoring and compatibility assumptions that have not yet been isolated into a stable product-neutral seam.

Four-object model: supportable through adapters, but the neutral schema could flatten Kwilt or overfit Giraffed if extracted prematurely.

Capture-first stance: neutral; depends on the Kwilt adapter.

Best when: both products have independently proven the same durable contracts and duplication is causing material drift.

Fails when: “shared” becomes the objective, forcing product differences into generic vocabulary or blocking either product's learning loop.

Primer anti-pattern check: product UX can pass, but platform work risks becoming infrastructure theater disconnected from the user job.

## Alternative D: Capability-Local Agents Behind One Chat

Give Goals, To-dos, Chapters, Money, Games, and other capabilities independent agent runtimes, retrieval systems, proposal models, and histories. Unified Chat routes requests to the relevant capability agent and combines their answers in one visible timeline.

Audience/persona fit: medium. Domain behavior can be excellent, but Nina may experience fragmented memory, repeated clarification, inconsistent permissions, and multiple notions of what a proposal or completed action means.

Design-challenge answer: partial. Capability meaning is protected, but cross-capability intent and evaluation become orchestration across incompatible engines.

System-fit note: aligns with capability ownership but violates the unified app's single-owner infrastructure principle. It would likely recreate separate Money, Games, and Goals assistants behind one visual facade.

Four-object model: strongly preserved within current Kwilt capabilities, but cross-capability relationships may remain shallow.

Capture-first stance: passes where each capability preserves it; consistency is not guaranteed.

Best when: capabilities are operationally independent products with little shared identity or action flow.

Fails when: the value is precisely “ask once across my life” or when the same Activity, person, household, permission, or outcome crosses domains.

Primer anti-pattern check: risks a generic Chat facade over inconsistent recommendation behavior and unclear authority.

## Comparative read

| Alternative | Nina trust | Cross-capability coherence | Time to first slice | Long-term durability | Migration risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| A. Deepen current Coach | Medium | Low-medium | Fast | Low-medium | Medium through accumulated debt | Useful only as a narrow interim path. |
| B. Kwilt-native durable kernel | Strong | Strong | Medium | Strong | Medium-high but bounded | Leading direction. |
| C. Shared platform now | Medium later | Strong later | Slow | Potentially strong | Very high across products | Premature extraction. |
| D. Capability-local agents | Medium | Weak-medium | Variable | Medium within domains | High integration drift | Reject for unified Chat. |

## Divergence conclusion

Alternative B best answers the product challenge and makes productive use of Giraffed's learning without turning Kwilt into Giraffed or forcing a cross-product platform prematurely.

The essential move is to transplant contracts and operating lessons while treating Giraffed's composer as the visual reference baseline. Kwilt should reproduce that interaction grammar through native components, then remove authoring-specific controls deliberately rather than falling back to a generic mobile input. The first proof should remain a narrow Goals/To-dos/Chapters slice, but it must exercise the real durable kernel so the learning applies to future Money and Games participation.

## Post-divergence refinement: shared destination, staged extraction

The user clarified that Giraffed and Kwilt will remain separate products but will continue evolving in parallel, with substantial agent overlap and an explicit desire for each to inherit the other's improvements.

That reveals a stronger synthesis between Alternatives B and C:

- Alternative C is the desired destination: a shared, headless agent foundation that prevents important semantics from drifting.
- Alternative B is the migration strategy: build the Kwilt-native vertical slice against intentionally portable seams, then extract only what has two real product consumers.
- Product UI, product policy, capability/domain adapters, data, auth, and deployments remain independent.
- “Shared platform” means versioned contracts, headless logic, fixtures, and conformance—not one universal product, a direct UI component library, or one coupled production service.

This refined direction should be evaluated in convergence as `B -> C`, rather than choosing between permanent duplication and immediate platform extraction.

A further convergence question remains: whether “shared” should stop at the headless protocol or include the mature web workbench itself. Because the composer, timeline, run controls, evidence, proposal, and feedback interactions already exist as a coherent Giraffed system, rebuilding all of them natively in Kwilt may create more product drift than value. A shared, configurable workbench surface—rendered directly in Giraffed and hosted by Kwilt—must therefore be compared against two independent UI implementations before the learning release is specified.

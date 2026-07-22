# Frame: Discovery-to-Action Intelligence

## What the user said

> I'm exploring a new job opportunity with Adobe focused on search, recommendations, RAG, and agentic experiences. I'm wondering whether I ought to invest more time and attention in those areas across Kwilt so I can form a deeper opinion.

## Restated in user voice

When I ask Kwilt about the life I have recorded, I want it to find the few pieces of evidence that actually answer my intent, explain why they matter, and offer a next move I can inspect and control, so that AI helps me continue my life rather than merely summarize or rearrange my data.

## Target audience

`audience-ai-native-life-operators` - AI-native life operators.

## Representative persona

Nina already uses AI to think and operate, but she will only let it work near intimate life data when retrieval is appropriately scoped and every proposed change is inspectable and reversible.

- Current situation: she has accumulated Arcs, Goals, Activities, and Chapters across time and wants to ask for help without manually navigating the object hierarchy first.
- What she's trying to become/do: use AI as a trustworthy operator over her life system, across mobile, desktop, and external AI tools.
- Emotional state or tension: excited by leverage, wary of confident synthesis built on incomplete or irrelevant evidence.
- What would make this feel wrong to her: a generic chat answer, opaque recommendations, silent writes, broad context exposure, or an agent that acts before showing its evidence.

## Hero anchor

`jtbd-trust-this-app-with-my-life` - Help me trust this place enough to keep coming back.

## Job flow step

`job-flow-nina-trust-ai-with-my-life-system`, spanning steps 2-5:

1. Ask questions about Arcs, Goals, Activities, and Chapters - delivery score 2.
2. Let AI suggest changes - delivery score 2.
3. Inspect exactly what would change - delivery score 1.
4. Approve, reject, or edit the changes - delivery score 1.

Kwilt has architectural direction for each step, but not yet one mature experience that joins retrieval quality, recommendation quality, evidence, and permissioned action.

## Active anchors

- `jtbd-trust-this-app-with-my-life` - The quality bar is not only relevance; Nina must understand what evidence was used, what is uncertain, and what an action would change.
- `jtbd-carry-intentions-into-action` - Discovery earns value when it reduces the activation energy of a real next step while preserving Nina's authorship.
- `jtbd-capture-and-find-meaning` - Retrieval should make accumulated Activities and Chapters useful without adding capture-time classification work.

## serves snippet

`serves: [jtbd-trust-this-app-with-my-life, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning]`

## Friction we're addressing

Kwilt currently has several adjacent intelligence systems, but they stop at different layers. Global search is primarily lexical and client-side. Recommended ranks Activities with deterministic urgency, importance, readiness, effort, and bounded context signals. Chapter recommendations are deterministic and evidence-linked. The agent and MCP layers can read and mutate domain objects, while the external connector brief names semantic search but the current MCP tool registry does not expose it.

The missing learning surface is the seam between them: interpreting intent, retrieving the right evidence across object types and time, ranking or composing a recommendation, showing provenance and uncertainty, then converting it into a safe proposed action with preview, confirmation, and auditability.

## System alignment

Constraint posture: `Bend the system`

Frame revision after the Giraffed comparison: preserve Kwilt's calm mobile timeline, workflow cards, contextual launch, and native capability surfaces, but replace the assumption that client-local messages and workflow state are the durable agent record. A unified cross-capability Chat requires server-backed threads, runs, evidence, proposals, operations, and event history.

Current system facts:

- Existing surface: `GlobalSearchDrawer` searches Activities, Goals, Arcs, and fetched Chapters, with scope controls and recents.
- Existing retrieval model: local lexical matching over titles, notes, tags, and parent labels; the external connector brief proposes `search_kwilt`, but it is not present in the implemented MCP read-tool registry.
- Existing recommendation model: `activityPriority.ts` componentizes urgency, importance, readiness, effort/shape, context fit, and confidence for the existing Recommended surface.
- Existing reflective suggestions: Chapter recommendations use deterministic triggers, evidence ids, evidence summaries, and typed payloads.
- Existing agentic affordance: `AgentWorkspace`, workflow definitions, a tool registry, and the hosted MCP function establish domain-level read/write operations.
- Existing trust convention: AI suggestions must be scoped, humble, permissioned, previewable, and reversible; Activities are the safest action surface for standing permission.

Constraints to preserve:

- Capture remains frictionless and does not require better metadata for the intelligence layer to work.
- Search, recommendations, and agent behavior remain capabilities inside existing Kwilt surfaces, not new top-level product silos.
- Arcs are never silently created or reshaped; Goal changes are proposed; external actions remain draft-first.
- Results expose enough evidence and data-coverage limits for the user to judge them.
- Retrieval uses least-privilege context and does not send the user's whole life to every model call.
- Chapters remain retrospective; action proposals are separate from the Chapter narrative itself.

Constraints we may challenge:

- Global search currently treats object types as parallel lexical result lists rather than a unified evidence corpus shaped by intent.
- The current agent modes launch with prepared context rather than retrieving the minimum relevant context on demand.
- Recommendations are currently separated by surface and use case rather than sharing a common evaluation and provenance contract.

Design implication:

The strongest learning opportunity is not a broad “AI search” initiative. It is one vertical slice that crosses the whole system: a user expresses an intent, Kwilt retrieves and ranks evidence from the four-object model, provides an answer or recommendation with inspectable provenance, and offers at most one reversible next action. That slice would force real opinions about hybrid retrieval, relevance, personalization, RAG grounding, recommendation confidence, agent boundaries, evaluation, privacy, latency, and business value.

## Aspirational design challenge

How might we help Nina recover the few pieces of her lived evidence that matter to her present intent and turn them into one trustworthy next move, while preserving capture-first behavior, least-privilege context, and her authority over every change?

## Out of scope

- Building generic vector infrastructure before choosing a user question and evaluation set.
- Replacing deterministic recommendation logic with an LLM.
- A general autonomous life agent or long-running background agent.
- Multimodal creative-asset search; Kwilt should learn the shared product principles without pretending its corpus is Adobe's.
- A new search destination, AI dashboard, recommendation inbox, or settings taxonomy.
- Using Kwilt primarily as a portfolio demo when the proposed behavior does not improve an authentic Kwilt job.

## Open question

Should the first learning slice focus on a retrospective-to-action question such as “What have I already learned or tried that could help me move this Goal now?”

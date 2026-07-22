# Reference Audit: What Kwilt Should Learn From Giraffed

## Purpose

This audit treats Giraffed as a working reference architecture for Kwilt's substantially new unified Chat experience. It separates the durable interaction grammar worth adopting from authoring-specific concepts and implementation shapes that should remain in Giraffed.

This is a code-level audit of the current `/Users/andrewwatanabe/Documents/Orchard` checkout, including uncommitted work. It does not claim fresh production or packaged-app verification.

## The core lesson

Giraffed's strongest idea is not “a more capable composer.” It is this state relationship:

```text
Thread
  -> Messages
  -> Runs
      -> ordered Run Events
      -> Evidence / Tool Artifacts
      -> Proposal
          -> typed Operations
          -> Findings
          -> Accept / Reject / Apply state
```

The timeline is a calm projection of that state. It is not the only copy of the state.

Kwilt currently inverts that relationship: the visible message/card timeline and local workflow instance carry most of the session truth, while durable conversation summaries, Arc drafts, MCP writes, and app data live in separate mechanisms. That is workable for bounded creation sheets but insufficient for a first-class Chat destination spanning capabilities and devices.

## Giraffed's reusable layers

### 1. Durable conversation substrate

Giraffed persists:

- agent threads with project and optional Work scope;
- user and assistant messages;
- agent runs tied to the initiating and resulting messages;
- ordered run events;
- partial assistant output;
- stop and steer state;
- proposals, operations, skill findings, and tool artifacts;
- structured message feedback.

This creates continuity across reload, navigation, interruption, and later audit. A run can finish, stop, partially succeed, require review, or expose a visible failure without pretending the last assistant bubble is the complete record.

### 2. Run protocol and visible work

The server route streams newline-delimited events such as:

- user message;
- activity/status change;
- assistant delta;
- assistant checkpoint;
- run result;
- completed message plus proposal;
- error.

Persisted run events are converted into timeline items. This is materially stronger than inserting ad hoc “Thinking” rows because the same event trace supports rendering, resumption, debugging, evaluation, and audit.

The product lesson is restraint: Giraffed already learned that overlapping streaming placeholders and working rows feel awkward. Kwilt should record a rich internal event trace while projecting only user-relevant progress.

### 3. Context selection as a product contract

Giraffed's shared authoring runtime does more than concatenate a workspace snapshot. It:

- assigns context roles and authority;
- follows explicit dependencies and references;
- considers target Work and ancestor relationships;
- uses `useFor` and `doNotUseFor` rules;
- scores lexical relevance;
- works within a context budget;
- records why artifacts were selected or omitted;
- warns when primary or source context is insufficient;
- builds a structured context bundle;
- is shared by the app and MCP surface.

This is the closest Giraffed analogue to the retrieval, recommendation, and RAG judgment Kwilt needs. The transferable idea is not its authoring vocabulary; it is explicit selection, omission, authority, provenance, sufficiency, and traceability.

### 4. Proposal-first mutation grammar

Giraffed separates an assistant response from a proposed durable change. A proposal can contain typed operations, findings, and tool artifacts. The user can inspect, reject, revise, or apply it, and the result persists independently of the prose response.

That makes “Save to Work” meaningful: it is not a button that copies generated text from a bubble. It is an approval transition over a known proposal and known operations.

For Kwilt, the equivalent must be capability-owned actions such as:

- create or update an Activity;
- propose a Goal change;
- suggest—but never silently make—an Arc change;
- apply a Money categorization or budget mutation only under Money's stricter reconciliation policy;
- create or join a game session only under the Games consent model.

### 5. Composer as contextual input, not only text

Giraffed's composer supports:

- optimistic new-thread creation and immediate focus;
- text and voice input;
- visual attachments;
- explicit Work mentions;
- selected draft excerpts;
- model, depth, run-mode, and web-search controls;
- stop and steer during a run;
- composer-attached one-decision cards.

The composer itself should be Kwilt's visual and interaction starting point. Its layered card, context tray, growing input body, secondary-action rail, and unmistakable send/stop control already solve more of the agent interaction than Kwilt's current minimal text composer. Kwilt should preserve that coherent implementation through extraction and then subtract deliberately, rather than rebuilding a generic mobile chat box and later accumulating controls around it.

The valuable grammar is the ability to attach explicit context, steer active work, and place one immediate decision next to the input. Model, depth, and authoring-mode controls can be hidden without discarding the visual system that holds those behaviors together.

#### Subtractive adaptation for Kwilt

| Giraffed composer element | Kwilt treatment | Reason |
| --- | --- | --- |
| Layered composer card and expanding input body | Keep | This is the coherent visual baseline, not desktop-only decoration. |
| Pending context/attachment tray | Keep | The person must be able to see what the next request is grounded in. |
| Add-context control | Keep | It creates an intentional path to capability objects, images, receipts, and other supported evidence. |
| Voice input | Keep | It matches capture-first, mobile use and life-shaped requests. |
| Round send control that becomes stop | Keep | One primary action makes run state legible without adding a status dashboard. |
| Steer while a run is active | Keep, simplify | Typing and sending during a run should redirect it; a separate steer control appears only if needed for clarity. |
| One composer-attached decision card | Keep | A single missing choice belongs beside the input rather than as another assistant monologue. |
| Selected draft excerpt | Adapt | Becomes a selected Activity, Goal, Chapter passage, transaction, game session, or other capability object. |
| `@Work` mention menu | Adapt progressively | Start with the launch object and a capability/object picker; add rich mentions when the object vocabulary is ready. |
| Visual references | Adapt by capability | Images, receipts, photos, and documents appear only where a capability can interpret them responsibly. |
| Web toggle | Hide initially | Source selection belongs to agent policy and explicit permission unless the user needs to constrain it. |
| Model selector | Remove from ordinary Chat | Model choice is an implementation policy, not part of the life job. |
| Depth/reasoning selector | Remove from ordinary Chat | Kwilt should infer effort or ask a human-sized scoping question. |
| Auto, Loop, Teach, and authoring modes | Remove | These are Giraffed product concepts, not shared agent primitives. |
| Arbitrary file/folder and desktop drag-drop behavior | Defer | Begin with capability-owned objects plus image/document types that have a clear evidence contract. |
| Writer-specific placeholders | Replace | Prompts should reflect the current capability, object, and life context. |

This means the new composer should replace the current minimal composer as a designed unit. Generic suggestion chips, a separate expanded editor, and future context controls should not be layered around the old input until it becomes an accidental cockpit.

The preferred reuse path is now extraction, not visual reimplementation: carve the composer and its surrounding timeline/run/proposal surface into a configurable Giraffed web workbench, then let Kwilt host that same surface inside its native Chat destination. Rebuild individual pieces in React Native only where device testing proves that the hosted surface cannot meet a first-class mobile interaction bar.

### 6. Feedback as retrievable guidance

Giraffed stores structured negative-feedback reasons and notes, then retrieves recent human feedback into later prompt assembly. It is not model fine-tuning; it is an inspectable context source.

Kwilt can adapt this by scoping feedback to:

- the person or household;
- a capability;
- an object or conversation;
- a recommendation kind;
- stable preferences such as “do not suggest weekday mornings.”

Feedback must remain correctable and should not silently become permanent identity inference.

### 7. Visible-text boundary

Giraffed treats internal-dialog leakage as one boundary spanning streamed rendering, persistence, read-aloud, and speech generation. The shared sanitizer is more important than any single UI fix.

Kwilt needs an equivalent rule for:

- streamed Chat text;
- stored assistant messages;
- notifications;
- text-to-speech;
- external connector responses;
- proposal summaries.

Internal tool traces, chain-of-thought-like planning, policy notes, raw JSON, and hidden context must never become visible merely because a new output surface is added.

### 8. Product work remains primary

Giraffed's strongest writer-first correction was to keep the document primary and move agent/system controls out of the always-visible path. Chat and Workbench are peers; Chat does not absorb the document.

Kwilt should preserve the same principle across capabilities: Money remains the trustworthy money surface, Games remains immersive, To-dos remains a usable list, and Chapters remains a reflective reading surface. Unified Chat helps users cross into and act through those capabilities; it does not replace them.

## Mapping Giraffed concepts into Kwilt

| Giraffed | Kwilt adaptation |
| --- | --- |
| Project | Account/household conversation scope |
| Work or Piece | Capability-owned object reference |
| Project/Work-scoped thread | Global, capability, or object-anchored Chat thread |
| Authoring run | Agent run with intent, route, policy, and capability participation |
| Context bundle | Evidence bundle with selected, omitted, freshness, authority, and coverage |
| Work frame | Capability evidence contract and object metadata |
| Tool artifact | Evidence or action artifact with provenance |
| Agent proposal | Typed cross-capability proposal envelope |
| Proposal operation | Capability-owned action plus approval/undo policy |
| Save to Work | Apply in owning capability, then exact-return/deep-link |
| Library mention | Explicit capability/object mention or attachment |
| Workbench pane | Native capability surface |
| Agent feedback guidance | Correctable person/household/capability guidance |

## Adopt, adapt, avoid

### Adopt as first-class concepts

- durable Thread, Message, Run, RunEvent, EvidenceRef, Proposal, ProposalOperation, and Feedback records;
- server-owned run lifecycle;
- ordered event streaming and persistence;
- proposal-first durable mutations;
- context selection with inclusion, omission, sufficiency, and trace;
- stop, steer, partial, failed, and needs-review states;
- one visible-text boundary;
- optimistic thread creation and immediate composer readiness;
- timeline as a projection of durable state.

### Adapt for Kwilt

- replace authoring scope with account, household, capability, and object scope;
- replace Work roles with capability-specific evidence schemas and a shared evidence envelope;
- replace one project policy with per-capability permissions and mutation policy;
- keep the visible mobile progress vocabulary much quieter than the internal run trace;
- support exact return into the native capability after an answer or proposal;
- allow contextual launch without forcing every conversation to remain tied to its launch object;
- let a thread broaden capability participation explicitly when the user's intent changes;
- use the Giraffed composer as the visual baseline, preserving its hierarchy while progressively subtracting or adapting product-specific controls.

### Avoid copying

- the 10,000-line workbench component as a reusable architecture;
- Giraffed's project/Work compatibility layers;
- authoring modes such as Draft, Review, Repurpose, Auto, Loop, or Teach as global Kwilt concepts;
- exposed model and reasoning controls in ordinary mobile Chat;
- always-on web search;
- verbose status/event rows that compete with the user's request;
- a universal domain vocabulary shown to users;
- a single cross-capability score or recommendation ranking;
- Chat becoming the only place durable work can be inspected or corrected;
- copying the monolithic Giraffed workbench into Kwilt; extract one shared surface from its current source instead.

## Structural risks to learn from

- Giraffed's operational substrate is strong, but much of its visible workbench behavior remains concentrated in one very large component. Kwilt should separate engine state, event projection, cards, composer capabilities, and capability adapters before visual complexity accumulates.
- Some Giraffed paths still bridge legacy Project/Work models and newer workspace records. Kwilt should define capability and object references before persisting unified threads, rather than migrating scope semantics later.
- A proposal UI can look successful while a connected database migration is missing. Kwilt's apply state must be driven by authoritative mutation receipts, not optimistic card appearance alone.
- Rich agent activity can become noisy or expose internal detail. Persist more than is shown, and give every visible event a user job.
- Composer controls can become a cockpit. Add explicit context or control only when it improves the current request.

## Revised system posture

`Bend the system`.

Preserve Kwilt's mobile interaction grammar and capability-native surfaces. Replace the current client-local durability assumption with a Giraffed-informed agent kernel. The existing `AgentWorkspace` and `AiChatPane` should no longer be the source of truth and may be retired where the hosted shared workbench replaces them.

Design that kernel as the second consumer of a shared foundation and workbench surface. Giraffed and Kwilt should remain separate products and data planes, while portable contracts, run semantics, context/evidence logic, visible-text boundaries, fixtures, conformance tests, composer, timeline, and common agent cards move behind versioned shared boundaries. Giraffed renders the web workbench directly; Kwilt hosts it inside a native destination and supplies product behavior through a typed bridge.

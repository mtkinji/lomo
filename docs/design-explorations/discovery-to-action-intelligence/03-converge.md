# Converge: Shared Agent Workbench With Product-Native Capabilities

## Chosen direction

Choose a stronger `B -> C`: extract Giraffed's mature agent workbench into a configurable shared web surface, then make Kwilt the second host of that surface inside its native unified Chat destination.

Giraffed and Kwilt remain permanently separate products with independent product policy, data, auth, deployments, domain adapters, capability surfaces, and release cadence. They share the parts whose meaning and interaction quality should not drift: the Chat workbench, agent protocols, state machines, context/evidence envelopes, proposal grammar, visible-output boundaries, portable algorithms, fixtures, and conformance tests.

This is one product decision, not an infrastructure choice followed by an unrelated UI exercise. The shared durable foundation makes context, runs, evidence, proposals, and outcomes trustworthy in both products. The shared workbench preserves the mature composer, timeline, run controls, evidence, proposal, feedback, and recovery interactions instead of asking Kwilt to rebuild them. Native Kwilt capabilities remain responsible for the life-shaped work behind the conversation.

## Why this direction wins

| Criterion | A. Deepen current Coach | B. Kwilt-native workbench | C. Shared workbench extraction | B -> C. Headless only | D. Capability-local agents |
| --- | ---: | ---: | ---: | ---: | ---: |
| Nina can ask once across her life | 2/5 | 5/5 | 5/5 | 5/5 | 2/5 |
| Evidence and changes are inspectable | 2/5 | 5/5 | 5/5 | 5/5 | 3/5 |
| Preserves capability meaning | 3/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| Produces a coherent first experience | 3/5 | 5/5 | 5/5 | 5/5 | 2/5 |
| Transfers learning between products | 2/5 | 2/5 | 5/5 | 4/5 | 2/5 |
| Keeps independent release cadence | 4/5 | 5/5 | 4/5 | 5/5 | 4/5 |
| Avoids rebuilding mature interaction | 2/5 | 1/5 | 5/5 | 2/5 | 2/5 |
| Keeps the first migration bounded | 4/5 | 2/5 | 3/5 | 3/5 | 2/5 |

Shared workbench extraction earns its migration cost because it improves continuity, action safety, and the felt quality of Kwilt Chat while preserving years of interaction learning already embodied in Giraffed. It avoids both permanent UI duplication and the opposite mistake of copying Giraffed's entire authoring application into Kwilt.

## What “shared” means

The platform boundary is below the product experience and above any particular database, framework, or domain vocabulary.

```text
Shared agent workbench
  Composer and context tray
  Timeline and run projection
  Evidence, proposal, decision, feedback, and recovery cards
  Stop, steer, resume, and visible-progress interaction

Shared agent foundation
  Protocol and schemas
  Run state machine and event semantics
  Context and evidence envelopes
  Proposal and mutation-receipt grammar
  Visible-output boundary
  Portable selection/projection algorithms
  Fixtures, evaluations, and conformance tests

Giraffed product
  Authoring context and policy
  Work and project adapters
  Direct Next/Electron workbench host
  Giraffed data, auth, deployment, and release cadence

Kwilt product
  Life/capability context and policy
  Goals, To-dos, Chapters, Money, and Games adapters
  Expo native shell with hosted workbench destination
  Kwilt data, auth, deployment, and release cadence
```

The products can evolve independently because the workbench calls a product adapter contract rather than a single shared application backend.

## Sharing boundary

### Share first

- the extracted composer, context tray, timeline, run projection, evidence/proposal cards, decision cards, feedback, errors, and recovery states;
- serializable Thread, Message, Run, RunEvent, EvidenceRef, Proposal, ProposalOperation, MutationReceipt, ToolArtifact, and Feedback contracts;
- run status transitions, stop/steer semantics, idempotency expectations, and event ordering;
- context/evidence selection inputs and outputs, including authority, freshness, inclusion, omission, sufficiency, and trace;
- proposal lifecycle and the boundary between a proposal, an applied mutation, and an authoritative receipt;
- the visible-output contract spanning streaming, persistence, render, speech, notifications, and external surfaces;
- deterministic fixtures and conformance tests that both products can run;
- headless timeline projection rules where the desired behavior is actually the same.

### Share after both products prove the same need

- the context-ranking implementation;
- generic orchestration-loop helpers;
- provider-neutral model and tool adapters;
- persistence interfaces and migration helpers;
- reusable client state machines or hooks with no DOM, React Native, authoring, or Kwilt dependency.

### Keep product-native

- product prompts, product voice, personas, policies, and recommendation judgment;
- Work, Arc, Goal, Activity, Chapter, transaction, and game-session semantics;
- capability tools and mutation authorization;
- physical database schemas, user data, auth, privacy policy, deployment, and operations;
- product navigation, exact return, notifications, and release cadence;
- device-sensitive operations such as microphone capture, image/document picking, haptics, and native deep links, exposed to the shared controls through the host bridge.

The pixels and interaction behavior should be shared unless mobile proof identifies a real first-class experience failure. Native hosting must remain invisible to the person using Kwilt.

## Hosting model

```text
Giraffed
  -> renders SharedAgentWorkbench directly
  -> supplies GiraffedProductAdapter

Kwilt native Chat destination
  -> hosts the same SharedAgentWorkbench in a full-screen web container
  -> supplies KwiltProductAdapter through a typed native bridge
  -> opens native capability details outside the workbench
```

The adapter boundary carries:

- product identity, theme, density, safe-area, and supported-control configuration;
- current user, thread, launch capability, object context, and exact-return target;
- product agent endpoint and authenticated request mechanism;
- available object types and context-picker requests;
- proposal capabilities and permission policy;
- native requests for microphone, image/document picking, haptics, sharing, and deep links;
- workbench events for analytics, navigation, apply state, errors, and recovery.

The bridge should use a versioned message schema and request identifiers. It must reject unknown messages, avoid injecting long-lived credentials into page JavaScript, and make every mutation travel through a product-owned capability adapter.

## Why extraction must be staged

The live Giraffed checkout already contains much of the desired behavior, but its reusable semantics are not yet a clean product-neutral package:

- the shared-looking context runtime still speaks in Work types, authoring roles, projects, canon, drafts, and reviews;
- core run and proposal types live alongside Supabase row mappings in the large Orchard repository module;
- orchestration behavior and persistence are concentrated in the large server route;
- the visible composer lives inside the monolithic workbench component;
- Kwilt runs in Expo/React Native while Giraffed runs in Next/Electron.

Copying the existing implementation directly into Kwilt would preserve its accidental boundaries and immediately fork it. Rebuilding it independently would discard mature behavior. The right transformation is a strangler extraction inside Giraffed:

1. Move `CompactAgentComposer` behind a product-neutral prop contract without changing its visible behavior.
2. Extract the agent timeline projection and common cards from `AgentPanel`.
3. Move workbench run state and transport behind an adapter interface.
4. Render the extracted workbench in Giraffed with a compatibility adapter.
5. Add a standalone hosted route/build that uses the same component.
6. Host that route/build in Kwilt with the Kwilt adapter and native bridge.

The existing Giraffed experience stays operational throughout extraction, making the mature workbench the migration harness rather than discarded reference material.

## Cross-product goodness loop

Every meaningful agent improvement should be classified when it ships in either product:

1. **Product insight:** keep it product-native and record the interaction lesson.
2. **Shared semantic:** update the shared contract and conformance fixtures.
3. **Shared algorithm:** extract it only after both products need materially the same behavior.
4. **Adoption:** implement the native product expression and run the common fixture suite.
5. **Parity review:** record whether the other product should adopt, adapt, intentionally differ, or defer.

A lightweight cross-product ledger should track capabilities such as durable runs, stop/steer, context trace, visible-text safety, proposal lifecycle, composer decisions, feedback, and evidence presentation. The shared workbench makes interaction parity the default; the ledger concentrates on product-specific policy and deliberate divergence.

## The composer decision

Giraffed's composer is the actual starting implementation for Kwilt, not merely a feature inventory or visual reference.

Kwilt should preserve:

- one layered, calm composer card;
- a context tray that appears only when something is attached or selected;
- a growing multi-line input body;
- a compact action rail;
- voice and add-context affordances;
- one circular primary control that changes from send to stop;
- the ability to steer active work;
- one immediate decision attached to the composer when the agent truly cannot continue.

Kwilt should initially subtract:

- model choice;
- reasoning-depth choice;
- Auto, Loop, Teach, and other authoring modes;
- an always-visible web toggle;
- arbitrary desktop file and folder attachment;
- drag-and-drop behavior;
- a full object-mention browser before capability object contracts are ready.

The visual shell stays even when those controls disappear. Subtraction creates breathing room; it does not justify returning to the current generic input.

## Extraction, not source-code fork

The existing 10,000-line workbench component should not be copied into Kwilt. Its mature agent experience should be extracted into separable web components backed by shared protocol state:

```text
AgentComposer
  ContextTray
    CapabilityObjectChip
    AttachmentChip
    PendingDecision
  ComposerInput
  ComposerActionRail
    AddContext
    VoiceCapture
    SendStop
```

Giraffed consumes these components directly. Kwilt hosts the same built surface and supplies native/device behavior through the bridge. This preserves the actual visual and interaction implementation while avoiding a permanent source fork.

## Composer behavior contract

### Resting

- The card is visually present but quiet.
- The input grows in place for ordinary multi-line requests.
- `Add context`, voice, and send are the only persistent controls.
- Context inherited from the launch surface appears as a removable object chip, not hidden prompt state.
- Empty-state teaching happens in the timeline or placeholder, not through a permanent horizontal rail of generic suggestion chips.

### With explicit context

- Selected objects and attachments occupy a compact tray above the input.
- Each item names its capability and object in human terms.
- Removing a chip removes it from the next request without changing the underlying object.
- The composer can broaden beyond its launch object, but the person can always see the current scope.

### During a run

- Send becomes stop.
- The input remains available; a new instruction steers the active run or clearly starts the next turn according to run state.
- Rich internal events persist, while the timeline shows only meaningful progress, evidence, decisions, and outcomes.
- A missing human choice may appear as one compact composer-attached card. It disappears as soon as the choice is made.

### After a run

- Evidence and proposals remain durable timeline objects.
- Applied actions show an authoritative receipt and an exact-return path into the owning capability.
- The composer returns to a calm ready state without duplicating the result or holding stale decision UI.

## Context transformations

| Giraffed input concept | Kwilt equivalent |
| --- | --- |
| `@Work` | Capability object: Activity, Goal, Chapter, transaction, game session, person, or supported future object |
| Selected draft excerpt | Selected passage, list item, transaction, recommendation, or object-local evidence |
| Visual reference | Photo, receipt, document, or other capability-supported attachment |
| Web on/off | Source-scope permission or an agent-selected source policy |
| Model and depth | Invisible orchestration policy |
| Run mode | Intent and capability route inferred from the request, with a human-sized clarification only when necessary |

## Durable system contract

Both products' composers and timelines project the same logical records, even when each product owns its physical persistence:

- `AgentThread`: global, capability, or object-anchored scope;
- `AgentMessage`: durable user and visible assistant content;
- `AgentRun`: intent, route, status, policy, interruption, and completion;
- `AgentRunEvent`: ordered internal and user-visible run history;
- `EvidenceRef`: selected source, authority, freshness, sufficiency, and provenance;
- `AgentProposal`: a reviewable candidate change;
- `AgentProposalOperation`: capability-owned typed action;
- `ToolArtifact`: durable supporting output;
- `MutationReceipt`: authoritative applied result and undo/return information;
- `AgentFeedback`: correctable guidance scoped to person, household, capability, object, or recommendation kind.

Product adapters, not the shared foundation, remain responsible for evidence schemas, permissions, mutations, receipts, and native return targets.

## First vertical slice

Prove the complete experience through Goals, To-dos, and Chapters:

1. Enter unified Chat globally or from a Goal, Activity, or Chapter.
2. See any launch object as explicit composer context.
3. Ask by text or voice.
4. Stream a durable run with restrained visible progress.
5. Inspect the evidence used and any meaningful omission or insufficiency.
6. Receive at most one primary recommendation or proposal.
7. Apply a safe Activity mutation, receive an authoritative receipt, and return exactly to the owning capability.
8. Leave and resume the same thread without losing messages, run state, evidence, or proposal state.

This slice is intentionally narrower than the eventual capability set but must use the real kernel and extracted workbench. Giraffed remains the compatibility host while Kwilt becomes the second host; the two products keep their own data and domain policies.

## Reductive design pass

### Replace

- Replace Kwilt's current minimal floating input and generic prompt-chip rail with the hosted shared workbench as one unit.
- Replace ad hoc working rows with a projection of persisted run events.
- Replace hidden launch context with removable, visible context chips.
- Replace successful-looking local cards with proposal state and authoritative mutation receipts.

### Preserve

- Preserve native capability surfaces as the best place to inspect and correct durable work.
- Preserve Kwilt's calm mobile density and capture-first behavior.
- Preserve native capability screens, navigation, and platform services around the hosted Chat destination.

### Do not add yet

- model, depth, or run-mode controls;
- a universal capability browser;
- autonomous background execution;
- a universal recommendation score;
- direct hidden writes;
- Money or Games mutations before their stricter policies and receipts are proven.

## Activation paths

### Broad questions after demonstrated capability

Once Kwilt has completed a concrete, trustworthy action, users will reasonably broaden their mental model and ask general questions in the same composer. Kwilt should allow that without requiring a request-mode choice and should answer competently when no personal context or capability is needed.

This does not change the competitive bet. Kwilt is not trying to outcompete ChatGPT on general-purpose breadth. Its differentiated value begins when a broad question benefits from the person's durable Kwilt context or becomes a permissioned native action. Future Screen Time controls are a strong example: Chat can understand the request, while the Kwilt capability owns authorization, device/app scope, conditions, enforcement, receipts, and correction.

The routing principle is **broad input, specific advantage**. Do not force ordinary questions into Kwilt objects or call tools merely to demonstrate agent behavior.

### Global Chat

The composer opens without an object anchor and can route across participating capabilities. Context discovered by retrieval appears as evidence after the request; it is not falsely represented as user-attached context.

### Contextual Chat

Launching from a Goal, Activity, Chapter, transaction, or other supported object pre-attaches that object to the composer and records an exact return target. The user may remove the object or broaden the request.

### Capability-owned follow-through

The timeline can explain and propose. The owning capability confirms durable state, renders its full detail, supports correction, and supplies the exact-return destination.

## Rejected directions

- **A minimal mobile composer built from scratch:** it discards Giraffed's solved hierarchy and would likely re-accumulate context, voice, decisions, stop, and steer as unrelated controls.
- **The full Giraffed cockpit:** model, depth, authoring mode, and desktop attachment controls expose implementation and product concepts that do not serve Kwilt's life job.
- **A copied component fork:** it would preserve the web code once, then make every later Giraffed improvement a manual Kwilt port.
- **A shared Giraffed-Kwilt application service now:** it would couple auth, data, deployments, and failure domains that should remain independent.
- **Permanent Kwilt-only semantics:** they would guarantee drift and make every future cross-product improvement a manual rediscovery exercise.
- **A full React Native rebuild before device proof:** it would spend heavily to replace mature behavior before establishing that a hosted surface cannot feel first-class.

## Accepted trade-offs

- A hosted workbench introduces a native/web boundary and requires careful keyboard, focus, scrolling, accessibility, safe-area, attachment, voice, and authentication proof.
- A durable kernel slows the first visual release, but prevents the new Chat destination from being another client-local workflow shell.
- Extracting Giraffed without changing it visibly adds refactoring work now, but eliminates the much larger cost of rebuilding and maintaining two agent workbenches.
- Sharing the workbench constrains some product-specific visual divergence; explicit product configuration and native capability surfaces provide the safe variation points.
- Hiding expert controls reduces explicit user tuning, but keeps the interface aligned to the person's job and leaves orchestration policy evolvable.
- Starting with three capabilities does not prove every permission model, but it proves the cross-capability seam without risking Money or Games trust.

## Stated bet

If Giraffed and Kwilt share the mature agent workbench plus a headless foundation while keeping capability experiences and domain policies native, then each product can inherit the other's durable and interaction improvements without converging into one app. Kwilt can subtract Giraffed-specific controls through configuration so Nina experiences unified Chat as one trustworthy place to ask, think, and act across her life—without pretending general conversation is the differentiated product or turning Chat into a control panel.

## Success signals

- People resume threads and understand their context without restating it.
- Contextual launches require less restatement than global launches without causing accidental anchoring.
- Users can identify what evidence informed a recommendation and what capability owns a proposed change.
- Stop and steer work reliably without duplicate or contradictory timeline state.
- Applied proposals match authoritative capability state and exact-return correctly.
- The hosted workbench matches native expectations for keyboard, focus, scrolling, accessibility, safe areas, attachments, voice, and perceived performance on a real iPhone.
- The composer supports context and voice without becoming visually busier than Giraffed's baseline after subtracting expert controls.
- The native capability remains the place people trust to inspect and correct the final result.
- A shared agent or workbench improvement appears in the other product without reimplementation or copying product-specific code.
- Either product can release, roll back, or change a native experience without requiring the other product to deploy.

## Next artifact

The accepted first extraction and hosting proof is defined in [`04-learning-release.md`](04-learning-release.md). The executable Giraffed-first refactoring sequence lives at `/Users/andrewwatanabe/Documents/Orchard/docs/superpowers/plans/2026-07-21-shared-agent-workbench-extraction.md` and must not begin until the current Orchard work is resolved into a clean baseline/worktree.

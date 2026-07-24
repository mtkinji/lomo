---
id: brief-unified-chat
title: Kwilt Chat — evidence-grounded, permissioned conversation across capabilities
status: accepted
audiences:
  - audience-ai-native-life-operators
  - audience-burned-out-productivity-power-users
personas: [Nina, Marcus]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves:
  - jtbd-get-help-without-retelling-my-life
  - jtbd-understand-why-ai-suggested-this
  - jtbd-stay-in-control-of-ai-actions
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
related_briefs:
  - brief-external-ai-connector
  - brief-kwilt-phone-agent
  - brief-background-agents-weekly-planning
owner: andrew
last_updated: 2026-07-23
---

# Kwilt Chat

## MVP reset — conversational app control

The MVP is not the completeness of the agent runtime or the presentation of its timeline. The MVP is that a user can control capabilities already present in Kwilt using ordinary language.

The acceptance contract is user-outcome-first:

- “Create a to-do called Take out the trash and remind me every Tuesday night” reaches Activity creation, recurrence, and reminder, asking only for a missing exact time when necessary.
- “What's on my Plan tomorrow?” reads the authoritative Plan date and reports what is actually scheduled or officially planned.
- “Create a Goal to walk every day for the next week” creates or reviews the Goal and offers the repeating linked Activity that turns it into reliable follow-through.
- When a future capability such as Screen Time exists, its registered operation becomes available to the same interpreter while the capability retains native household and device authorization.

Mobile Chat is the first completion target. Timeline polish, Phone Agent parity, background coordination, and new native capabilities cannot block this MVP. Existing operation-registry, routing, proposal, receipt, and server work remains useful implementation inventory, but it is not itself evidence that the user job is complete.

## Context

Kwilt is actively replacing its bounded, mostly client-local Coach experience with a first-class Chat destination for the unified capability platform. The chosen direction starts from Giraffed's mature composer, timeline, run, evidence, proposal, feedback, and recovery interaction, but Kwilt remains a separate product with its own life-domain context, policies, data, native capabilities, and release cadence.

The architecture direction is already well developed in [`docs/design-explorations/discovery-to-action-intelligence/`](../design-explorations/discovery-to-action-intelligence/). This brief supplies the missing product foundation: which people and situations Chat serves, the job steps it must help complete, the capability ownership contract, and the evidence required before the new experience can be called successful.

## Target audience

Primary: `audience-ai-native-life-operators`. Nina already uses AI to think and act, and she will grant Kwilt more context and authority only when the experience is inspectable, permissioned, correctable, and durable.

Secondary: `audience-burned-out-productivity-power-users`. Marcus benefits when Chat reduces decision and maintenance work. It fails him when it becomes another console, inbox, planning layer, or stream to manage.

## Representative persona

**Nina** opens Chat from a current Goal, to-do, Chapter, or the global Kwilt shell. She expects relevant context to come with her, but she wants to see and change the scope. She may ask a broad question, inspect the evidence behind the answer, accept one useful next move, leave, and resume later on another surface.

- Current situation: her life system contains enough accumulated context that manually finding and restating it has become friction.
- What she is trying to do: ask once, recover the few relevant facts or patterns, and carry one trustworthy next move into the owning capability.
- Emotional tension: excited by leverage, alert to opaque retrieval, confident synthesis, or silent writes.
- What would make this feel wrong: hidden context, generic coaching, a verbose activity feed, ambiguous permissions, a success-looking card without an authoritative result, or a conversation that replaces the native capability.

## Aspirational design challenge

How might we help Nina express a life-shaped intent once, recover the relevant evidence, and carry one trustworthy next move into Kwilt, while preserving visible scope, least-privilege context, capability meaning, and her authority over every change?

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — Chat sits close to intimate life data and durable action. Relevance is not enough; the experience must earn continued trust through continuity, evidence, permission, correction, and restraint.

## Job flow step

Primary job flow: `job-flow-nina-trust-ai-with-my-life-system`.

The first vertical slice spans four currently underserved steps:

| Nina's job step | Current score | What Chat must improve |
| --- | ---: | --- |
| Ask questions about Arcs, Goals, Activities, and Chapters | 4 | Global and visible-object questions now use bounded Goals, To-dos, and Chapters evidence; signed runtime proof remains. |
| Let AI act proportionately | 4 | Explicit reversible To-do creates auto-apply; updates retain one typed capability-owned proposal. Signed runtime proof remains. |
| Inspect exactly what would change | 4 | Evidence, operation, permission, uncertainty, and destination are durable and visible; signed runtime proof remains. |
| Approve, decline, or correct the changes | 4 | Compact update confirmation, conversational correction, atomic decisions, authoritative inventory rows, exact return, and swipe Delete are implemented; signed runtime proof remains. |

These implementation scores are governed by `docs/delivery-evidence/unified-chat.yml`; they cannot reach 5 without the required signed simulator and physical-device proof.

## JTBD framing

When the user asks Kwilt for help with something personal and potentially actionable, they want the system to carry the right context forward, show why it reached its answer, and let them control any resulting change, so AI reduces the work of moving life forward without taking authorship away.

This brief serves:

- `jtbd-get-help-without-retelling-my-life` — carry explicit and retrieved context across surfaces and time without hidden anchoring.
- `jtbd-understand-why-ai-suggested-this` — expose material evidence, provenance, freshness, inference, and coverage limits.
- `jtbd-stay-in-control-of-ai-actions` — use proposals, approvals, authoritative receipts, correction, and undo rather than silent writes.
- `jtbd-carry-intentions-into-action` — help one meaningful intention become a native Kwilt action.
- `jtbd-capture-and-find-meaning` — make accumulated life evidence useful without adding capture-time administration.

## Product definition

Kwilt Chat is the conversational entry point inside Kwilt. It can answer an ordinary question directly; when the person's intent benefits from Kwilt context or capability, it retrieves bounded evidence, explains or recommends, and may offer one reviewable next move that becomes real only through the owning capability.

Chat is not:

- a replacement for Goals, To-dos, Plan, Chapters, Money, Games, or other native capability surfaces;
- a claim that Kwilt can outcompete ChatGPT on the breadth or quality of general-purpose conversation;
- a dashboard of AI activity;
- a universal automation permission;
- the physical owner of capability data, ranking policy, mutations, or rollback;
- Giraffed embedded unchanged, including its authoring vocabulary and expert controls.

The public surface is **Chat**. `Agent`, `Run`, `EvidenceRef`, and `Proposal` remain useful internal product and system concepts; they should appear in user copy only when a human-readable equivalent genuinely helps.

## Broad input, specific advantage

Once a person has watched Kwilt complete a useful action, they will reasonably ask it questions beyond the capability that first trained the behavior. Chat should accept that broadening. The person should not need to decide whether a question is “for Kwilt” before typing it.

Kwilt should provide a competent, honest response to ordinary questions when it can. It should not intentionally add friction, force every answer into a Goal or Activity, or send the person to ChatGPT merely because the question is general. But general-purpose answer quality is table stakes, not the product's competitive thesis.

Kwilt's specific advantage is the transition from conversation into trusted capability:

- use bounded, private Kwilt context when it materially improves the answer;
- retrieve evidence from the person's actual life system rather than asking them to restate it;
- propose, apply, verify, correct, and sometimes undo changes through native capability contracts;
- manage device, household, and OS-integrated behavior that a general chatbot does not own;
- return the person to the authoritative native surface where the result remains inspectable.

Future Screen Time controls are the clearest example. Chat may understand a request such as “let Olive use games after she finishes her reading,” but the Screen Time capability must own family authorization, app/category selection, conditions, schedules, shield state, caregiver roles, enforcement, receipts, and correction. The value is not a better paragraph about parental controls; it is a trustworthy path from intent to real device behavior.

### Request classes

| Request class | Example | Default behavior | Competitive posture |
| --- | --- | --- | --- |
| General question | “What are some good rainy-day activities for kids?” | Answer directly with no private Kwilt context or capability action unless the user asks for it. | Useful table stakes; do not optimize the product around beating general chatbots here. |
| General question with personal context | “Given what this week looks like, what is a realistic rainy-day plan?” | Ask for or retrieve the minimum relevant Kwilt context and make the scope visible. | Differentiated when Kwilt's durable context makes the answer meaningfully better. |
| Kwilt capability question | “Which of my current Goals is actually moving?” | Retrieve capability-owned evidence, explain the result, and offer at most one appropriate next move. | Core differentiated job. |
| Kwilt capability action | “Move the unfinished errands to Saturday morning.” | Preview a typed Plan/Activity proposal, apply only under the owning permission policy, then return a receipt. | Core differentiated job. |
| Native or household control | “Block games until reading is done.” | Hand off to the future Screen Time capability for authorization, configuration, enforcement, and authoritative state. | Defensible Kwilt-only territory. |
| Better served elsewhere | A request requiring unsupported specialist, current-source, or high-stakes capability. | Answer within safe limits, use an allowed current source when appropriate, or name the boundary and suggest the right destination. | Trust is more important than pretending universal competence. |

Routing should be invisible when confidence is high and legible when it changes context, permissions, sources, or durable state. Tool use is not success by itself; sometimes the correct route is an ordinary answer with no Kwilt data attached.

## Voice and response depth

Chat inherits Kwilt's existing copy voice rather than introducing a separate AI personality. It should sound like a smart, warm coworker who helps the person make progress on what matters: clear, practical, honest, grounded, and human without becoming a therapist, guru, productivity coach, or academic lecturer.

Visible prose should:

- think deeply, speak plainly, and stop when it has helped;
- lead with the answer and use familiar words, short sentences, concrete nouns, and active verbs;
- avoid jargon, unnecessary frameworks, formal transitions, repeated questions, narrated reasoning, and redundant recaps;
- preserve material uncertainty, evidence limits, risks, and trade-offs even when the answer should be brief;
- offer at most one useful next move in ordinary chat unless the user requests options or the workflow requires structured choices;
- avoid repeating information already rendered in a proposal, receipt, inventory row, or other structured surface.

Response depth is adaptive rather than one fixed word count:

- **Brief** for confirmations, simple questions, completed actions, and receipts: usually one to three sentences or one compact structured result.
- **Standard** for explanations, comparisons, and recommendations: direct answer first, followed only by the support needed to understand or act.
- **Deep** for complex planning, meaningful reflection, high-stakes choices, conflicting evidence, or an explicit request for detail: still plain and well organized.

The current message always outranks a stored tone or detail preference. Stored preferences tune the default but do not replace Kwilt's voice, workflow schemas, or the needs of the current request. Prompt-level brevity is a soft response contract, not a hard truncation rule. Kwilt must never cut off a response or omit a material caveat merely to meet a word target.

## Persona and situation map

Nina and Marcus are the accepted initial audiences. The other canonical Kwilt personas are product-review lenses: their rows prevent the shared surface from quietly optimizing for an AI power user while becoming wrong for ordinary Kwilt situations.

| Persona | Hot situation | Active job step | What good Chat does | Failure mode to guard against |
| --- | --- | --- | --- | --- |
| **Nina** | She wants AI help across accumulated life records. | Ask, inspect evidence, review action, resume. | Carries visible scope, retrieves the minimum useful evidence, and produces a durable proposal/receipt trail. | Opaque RAG, hidden context, or a polished local card that is not authoritative. |
| **Marcus** | He is overloaded and cannot tell what deserves action now. | Decide the next action; capture progress without maintenance. | Narrows toward one honest next move and hands it to To-dos or Plan. | Another planning layer, long coaching monologue, or task-volume pressure. |
| **Maya** | Family work is scattered and she needs a practical answer. | See what matters; know the next doable action; hand off when appropriate. | Uses ordinary language, distinguishes personal from shared context, and avoids power-user setup. | Assuming family visibility, universal household context, or admin-heavy configuration. |
| **Sarah** | She wants to understand what recent actions say about a direction she values. | Notice non-metric progress; reflect and adjust. | Grounds reflection in lived evidence and keeps identity language humble. | Turning identity into a score, inventing meaning, or forcing a future plan. |
| **Elena** | She is returning after drift and is unsure what still fits. | Understand what changed; let go; choose one small step; rebuild trust. | Creates relief before action and lets her reject stale assumptions. | Shame, streak language, urgency, or treating old intentions as current commitments. |
| **David** | He is considering sharing a Goal or progress signal with one trusted person. | Decide visibility; send; later adjust or end sharing. | Explains exactly what another person would see and routes sharing through the native permission surface. | Drafting or sending to another person without explicit review, or broadening visibility silently. |

## Core conversation job map

The steps below are the stable user journey. A single request may skip steps, but the system must not collapse a skipped trust decision into hidden behavior.

| Step | Person's question | Chat responsibility | Durable or visible artifact |
| ---: | --- | --- | --- |
| 1. Arrive | “What does Chat already know about where I came from?” | Carry global, capability, or object launch context as visible, removable scope. Preserve an exact-return target separately. | Context chip plus thread scope and return target. |
| 2. Express intent | “Can I ask this in my own words even if it is not obviously a Kwilt question?” | Accept text or voice without requiring the person to choose an internal mode, request class, or capability first. | Durable user message. |
| 3. Establish scope | “Does this need a general answer, my context, or a Kwilt action?” | Classify the request, infer a bounded route, keep private context detached when it is unnecessary, ask one human-sized clarification only when it changes the result, and request capability-specific permission at the decision point. | Request class, run policy, participating capabilities, optional decision card. |
| 4. Retrieve evidence | “Did it find the right things?” | Retrieve the minimum useful evidence with authority, freshness, inclusion, omission, and sufficiency metadata. | `EvidenceRef` records and a restrained evidence presentation. |
| 5. Understand the result | “What is the answer, and how sure should I be?” | Separate grounded facts from inference, state material limits, and avoid pretending all capabilities share one ranking model. | Visible answer or one primary recommendation. |
| 6. Act or review proportionately | “Do the obvious reversible thing; ask me only when the risk earns it.” | Treat explicit To-do creation as authorization, but retain typed proposals for updates and higher-risk operations. | Authoritative inventory result or compact proposal, depending on risk. |
| 7. Open or decide | “Can I open, delete, correct, decline, or approve it?” | Reuse the inventory row, native detail, and capability policy; never recreate its editor inside Chat. | Direct-open inventory row or durable decision state with exact return. |
| 8. Apply | “Did it actually happen?” | Send an idempotent operation through the capability adapter and wait for authoritative confirmation. | Mutation receipt or honest failure/recovery state. |
| 9. Return | “Where can I see or correct the real thing?” | Deep-link to the exact native destination and preserve the conversation state. | Native return target linked from the receipt. |
| 10. Resume and correct | “Can I pick this up later or undo a mistake?” | Restore messages, run state, evidence, proposals, and receipts; accept correctable feedback and offer undo where the domain supports it. | Durable thread, feedback record, correction or undo receipt. |

## Entry models

### Global Chat

The user begins with no object anchor. Chat interprets intent and routes only to participating capabilities. Retrieved objects appear as evidence after the request; they must not be misrepresented as context the user explicitly attached.

### Contextual Chat

The user begins from a Goal, Activity, Chapter, transaction, game session, or other supported object. That object appears as a removable chip. Removing it changes the next request's scope but does not delete or mutate the object. The exact-return target remains available for the current handoff unless the user clearly moves elsewhere.

### Resumed Chat

The thread reopens with its durable message and run history. The composer must distinguish thread history from context active for the next request so stale objects do not remain silently attached forever.

## Capability participation contract

Each capability may provide only the roles it can support responsibly:

- **Context provider** — serializes an explicit object reference for launch or attachment.
- **Evidence provider** — retrieves bounded records with provenance, freshness, authority, and coverage notes.
- **Recommendation provider** — ranks or composes domain candidates without exporting a universal life score.
- **Action provider** — validates and applies typed operations under capability-owned permission and idempotency rules.
- **Receipt provider** — returns authoritative object ids, resulting state, correction/undo availability, and native destination.
- **Return provider** — opens the owning capability at the right object and local state.

A capability does not become Chat-enabled merely because its screen text can be put in a model prompt.

### Shared agent runtime and tool providers

Chat is the first in-app channel over a channel-independent Kwilt Agent Runtime. The destination architecture is one durable coordinator for threads, runs, tool discovery, policy, interruption, proposals, and receipts, with execution delegated to typed providers:

- `server` for durable Supabase-owned data and operations;
- `device` for iOS/native state such as Screen Time, Focus, local authorization, and app navigation;
- `channel` for SMS/voice delivery and compliance behavior;
- `connector` for an authorized external system such as a calendar provider.

The mobile app does not call Kwilt's external MCP server. MCP is an external-client projection of the server-capable catalog. In-app Chat calls authenticated server operations and native adapters through the same versioned tool semantics. Phone Agent should ultimately use the same coordinator and server tools, while persisting device-only or app-confirmation steps for later completion in Kwilt.

Capability completeness is a coverage contract, not a promise that every schema is loaded into every prompt. Each meaningful user operation across Kwilt must eventually have a capability-owned tool or an explicit exclusion. The runtime discovers a small relevant tool set per turn, applies deterministic consequence-based policy, and treats only authoritative provider results as success.

Capability ownership includes presentation. When Plan, Goals, Arcs, Activities, or Chapters already have a trusted prioritization method, review card, approval surface, receipt, recovery path, or native layout, Chat projects that durable contract into the conversation. The model may explain or connect the result, but it must not independently reprioritize the same objects or invent a parallel AI-only card and mutation path. Improving the capability-owned method should improve both its deterministic home and every conversational channel that reuses it.

Current implementation checkpoint (2026-07-23): the mobile coordinator has hybrid semantic routing and bounded tools for the core Arc, Goal, Activity, Plan, Chapter, Profile, account-status, and native-handoff paths. The server coordinator can answer an ordinary cross-domain question by combining multiple authoritative capability reads in one bounded turn; its prompt requires capability-owned priority and status to survive synthesis. Plan recommendation turns persist the exact unplaced authoritative priority as a typed run-event referent; follow-up tools enforce its Activity id and optimistic version until a matching proposal is staged. Typed “never mind” cancellation rejects the one pending proposal or device action without sending the command back through the model. Goal check-ins prepare a persistent draft and open the existing audience-aware native review; they are never sent directly. Mobile chunk scheduling creates grouped, separately reviewable proposals with sequential provider apply, one tracked calendar binding and durable receipt per event, crash recovery, and event-specific undo. Phone stages all 2–10 chunk proposals through one service-only transaction before that same mobile review path can see the group. The product-level `KWILT_OPERATION_REGISTRY` now owns the user-meaningful operation inventory outside Chat. The executable Chat manifest must match that registry exactly and inherits its capability owner; prompt-eval execution expectations must resolve to those same manifest operations and mobile outcome classes. This removes the former Chat-only native-intent checklist. The deterministic fast path is limited to a clearly single To-do; compound syntax is sent through semantic routing and the bounded tool loop so multiple Activity proposals remain separate. The executable capability manifest records mobile and Phone state, outcome, boundary, and proof independently; evaluation cases are generated from it and Phone success must resolve to the actual server catalog. Twenty-three cross-channel reviewed-write intents are now implemented: Profile display-field update; Arc create/update/delete; Goal create/update/delete; Activity update/complete/delete, stable step create/update/complete/delete/reorder, recurrence, reminder, and focus-today; Chapter private-note update; and Plan schedule/reschedule/remove plus grouped chunk scheduling. Phone stages these through the same durable proposal path mobile Chat consumes, while existing native owners retain review, authoritative apply, receipts, recovery, and undo where supported. The local coaching Profile remains the authority: native sync emits an owner-scoped projection containing only profile id, display name, age range, and optimistic version; Phone can read it or stage a version-checked native Profile proposal, never persist a parallel full Profile. Activity-to-Goal reassignment validates the parent owner, step operations retain stable ids instead of replacing a model-authored whole array, and Plan writes validate the Activity owner/version plus the configured active provider calendar before staging. Reminder approval updates the Activity; the native notification service remains the only owner that schedules or cancels a device notification, subject to device settings. Focus-today reuses the soft Plan signal. Focus, Activity location, attachment selection, Activity sharing, Goal sharing, and Plan preference management are owner-scoped pending device actions that open the existing native review surfaces and never claim the effect already happened. The server coordinator replaces any model-authored success claim with deterministic staged or pending-action truth, including the exact unapplied proposal count for chunk groups. The authenticated server endpoint and queued Phone worker share one persistence adapter. Phone Plan read and recommendation use the exact `@kwilt/plan-core` priority and eligibility kernel used by native Plan, with linked-user timezone context grounding `today` and `tomorrow`; results explicitly remain unplaced when calendar availability is unavailable. The migration/functions remain undeployed pending authorization and runtime proof.

The prior Phone relationship extractor is also now represented explicitly rather than hidden after Activity capture. The same server tools serve mobile and Phone: they read the existing owner-scoped People/Memory/Event/Cadence records and interpret an explicitly stated fact, date, or cadence into a strict one-person payload. A dedicated `remember_relationships` permission gates Phone writes; the atomic RPC records the existing relationship rows, an applied proposal/operation, mutation receipt, and Phone action log in one transaction, then suppresses the legacy compatibility extractor for that job. Mobile calls an authenticated relationship endpoint with the already persisted thread, run, and user-message identifiers rather than creating a second store or coordinator. Conversational correction and forgetting require a preceding read, exact record id, and optimistic version; they soft-correct or deactivate only that owner-scoped record and produce the same durable trust evidence. Exact corrections and individual memory/event/cadence forgetting carry a restore operation; the existing receipt Undo command calls the same authenticated endpoint, which restores the owner-scoped row and marks the receipt and proposal undone atomically. Remembering is compensatable by forgetting the exact records returned by the write, but does not yet have one-tap receipt Undo. Whole-person forgetting is an explicit excluded capability on mobile and Phone until every dependent relationship record can be reviewed and restored safely, and the internal model deliberately does not become a CRM-style People screen.

The earlier `AgentWorkspace` is part of that coverage program. Its contextual Activity tools, profile tools, Arc/Goal workflows, workspace grounding, and proposal cards are migration inputs. Their domain behavior should be preserved behind versioned providers, while direct store writes, prompt-only approval, hidden mode selection, and non-durable execution are retired. A legacy `ChatMode` may bias discovery from a focused surface, but it must not prevent broad interpretation or become a second conversation backend.

## Initial capability policy

| Capability | Evidence use | Proposal policy | Apply policy in first vertical slice |
| --- | --- | --- | --- |
| Arcs | Identity direction and relevant context. | Suggest or draft only; never silently create or reshape. | Not applied from Chat in the first slice. |
| Goals | Commitment, desired outcome, status, and relevant history. | Reviewable create/update proposal. | Requires explicit confirmation; native Goal remains authoritative. |
| To-dos / Activities | Concrete actions, status, timing, and completion evidence. | Explicit low-risk creation auto-applies and silently selects all available Quick Add AI enrichments; updates remain reviewable. | Deterministic Activity mutation with an authoritative inventory row, row-tap native return, and swipe Delete. |
| Plan | Availability, placement constraints, and candidate slots. | Proposed placement with conflict disclosure. | Native Plan confirmation remains authoritative. |
| Chapters | Retrospective evidence and cited passages. | May suggest a next move, but must not rewrite the Chapter into a plan. | Read-only evidence in the first slice. |
| Money | Financial evidence under stricter privacy and reconciliation rules. | Typed, previewable operation with source/destination/total truth. | Deferred until Money-specific policy and receipts are proven. |
| Games | Session, seat, and invitation context. | Consent- and session-scoped action only. | Deferred until Games-specific consent and real-device flows are proven. |
| Screen Time | Device, app/category, allowance, condition, caregiver, and enforcement state under Apple's native permission model. | Plain-language proposal that names the condition, access, affected device scope, and caregiver authority. | Deferred until the native capability exists and passes signed physical-device proof; Chat never substitutes prose for enforcement. |

## Durable interaction contract

The shared workbench projects product-owned durable records. These are logical contracts, not a mandate for one cross-product database:

- `AgentThread` — conversation scope and continuity.
- `AgentMessage` — durable user and visible assistant content.
- `AgentRun` — one orchestrated attempt with route, policy, status, interruption, and outcome.
- `AgentRunEvent` — ordered internal history, only some of which is suitable for visible progress.
- `EvidenceRef` — the sources materially used, with provenance, freshness, authority, and sufficiency.
- `AgentProposal` and `AgentProposalOperation` — a reviewable candidate change and its typed capability operation.
- `MutationReceipt` — authoritative applied result, resulting object, return path, and correction or undo availability.
- `AgentFeedback` — correctable guidance scoped to the person, household, capability, object, or recommendation kind.

The timeline is a projection of these records. A rendered card is never the sole source of truth for evidence, proposal, or apply state.

## Composer and timeline behavior

Adopt Giraffed's mature interaction as the shared baseline, then subtract for Kwilt:

- Keep a calm layered composer, growing text input, visible context tray, voice, add-context, send/stop, steer, and at most one attached decision.
- Hide ordinary model, depth, authoring-mode, and always-on web controls.
- Persist a rich event trace but display only useful progress, evidence, decisions, outcomes, and honest failures.
- Keep the composer available during a run so the user can stop or steer without entering a separate control surface.
- Let evidence and proposals remain durable in the timeline after the run; clear temporary decision UI once resolved.
- Route microphone, attachment picking, haptics, sharing, and deep links through the native host rather than browser-specific Giraffed services.

## Trust and language rules

- Apply the shared Kwilt voice and adaptive response-depth contract to every visible assistant path, including tool-follow-up replies.
- State what Kwilt found, inferred, could not verify, and would change.
- Do not expose chain-of-thought-like reasoning, internal policy, raw tool traces, or hidden context.
- Do not claim feelings, pride, disappointment, certainty, or relationship intimacy.
- Do not shame drift, celebrate task volume, or pressure action.
- Do not imply a proposal succeeded until the authoritative receipt arrives.
- Do not make a permission global when only one capability granted it.
- Do not treat conversation retention as permission to attach every old object to every new request.
- Do not send to another person, spend money, reshape an Arc, or expose household data without the owning product flow's explicit policy.

## Thread cleanup controls

Active Chat rows in the capability menu support two deliberately distinct swipe actions:

- Swipe right reveals **Archive**. Archiving removes the thread from the active list and offers a compact **Undo** action.
- Swipe left reveals **Delete**. Deletion is permanent, cascades through the thread-owned conversation records, and always requires explicit confirmation before the repository is called.

Neither direction executes merely because the row crossed a full-swipe threshold. A failed archive, restore, or delete leaves the user's local list truthful and produces concise recovery feedback. This first slice does not add bulk management, retention settings, or a persistent archived-thread browser.

## Intelligent thread titles

New threads begin as `New chat`, then receive a short model-suggested title from the first completed exchange. Titles do not update on every turn. When the existing conversation-compression path produces a materially new durable summary, it may suggest a refined title based on that compressed understanding.

Thread title ownership is durable:

- `default` — the placeholder may be replaced by an opening suggestion;
- `generated` — compression may refine it;
- `user` — a manual rename is authoritative and automatic naming must never overwrite it.

Title generation is background maintenance: it cannot delay or fail a Chat response, and an invalid or failed suggestion leaves the current title untouched. Generated titles are short, specific, plain-language labels—not summaries, dates, quoted user text, or generic labels such as “Conversation.”

## Shipped foundation slice

Prove the full job map with Goals, To-dos, and Chapters:

1. Enter globally or from a Goal, Activity, or Chapter.
2. See launch context and remove or broaden it.
3. Ask by text or voice.
4. Leave and resume without losing the durable run.
5. Inspect representative evidence and any material coverage limit.
6. Receive at most one primary Activity proposal.
7. Edit, reject, or approve it.
8. Apply through the Activity capability, receive an authoritative receipt, and exact-return to the native object.
9. Correct or undo the change if the capability contract supports it.

The slice should also include one ordinary general question that correctly receives a useful answer without personal retrieval or an action proposal. This is a routing and restraint check, not an attempt to benchmark Kwilt against ChatGPT.

## Next learning release: Plan tomorrow

The next vertical proof is the ordinary request, “What should I add to my plan tomorrow?” Chat must use current Plan context to return a short, realistic set of recommendations and let the user add selected items through Plan's authoritative operation. It must not reinterpret `add` as an ownerless mutation and answer with a generic clarification.

This release establishes the portable tool definition/result contract, progressive Plan discovery, Plan recommendation provider, typed Plan proposal, idempotent apply, receipt reconciliation, and native return. The authenticated app coordinator and queued server coordinator now share those tool/result semantics. This remains delivery code rather than deployed Phone Agent proof: migrations, Edge Functions, scheduler behavior, signed-provider traffic, device resume, and duplicate-free cross-channel continuity must still be verified before the backend claim is complete.

The architectural decision, scope boundary, and evaluation plan live in [`unified-chat-capability-complete-tools/`](../design-explorations/unified-chat-capability-complete-tools/).

## Activation loop

Chat's expansion moment comes after demonstrated capability, not before it:

1. The user asks for or accepts one concrete Kwilt action.
2. Kwilt previews it, completes it, and shows an authoritative receipt.
3. The user learns, through outcome rather than tutorial copy, that Kwilt can help.
4. The user begins asking broader questions in the same surface.
5. Kwilt answers generally when that is enough and introduces context or capability only when it creates real value.

Do not market the empty state as “ask anything” before Kwilt has earned that interpretation. Teach breadth through a mix of useful answers, capability outcomes, and restrained follow-through—not through an exhaustive capability catalog.

## Success signal

The first release succeeds when the end-to-end job becomes more trustworthy, not merely when people send more messages:

- Nina can identify the active context before sending and the evidence that materially shaped the result after receiving it.
- Contextual entry reduces restatement without increasing wrong-anchor corrections.
- Users distinguish an answer, a proposal, and an applied result without explanation from the team.
- Accepted Activity proposals match authoritative native state and exact-return to the right object.
- Stop, steer, leave, resume, failure, retry, correction, and undo do not create duplicate or contradictory timeline state.
- Marcus reaches one useful native next move with less planning effort, rather than accumulating another list inside Chat.
- The hosted workbench meets native expectations for keyboard, focus, scrolling, safe area, accessibility, voice, attachments, and perceived performance on a real iPhone.
- One shared workbench improvement reaches both Giraffed and Kwilt without sharing product data, policy, or release ownership.
- A general question receives a useful answer without unnecessary private-context retrieval, tool calls, or pressure to create a Kwilt object.
- Responses use ordinary human language, lead with the answer, and are no longer than the request requires without losing material context.
- Feedback can distinguish "too long," "too brief," and "unclear" so length is evaluated separately from correctness and usefulness.
- When a broad question naturally becomes a Kwilt action, the user can cross that boundary without restating the intent or losing permission clarity.

The detailed evidence plan and decision rules live in [`05-evaluate-learning.md`](../design-explorations/discovery-to-action-intelligence/05-evaluate-learning.md).

## Spec refinement

### Accepted assumptions

- The first product proof uses Nina as the primary persona and Marcus as the secondary pressure test.
- Goals, To-dos, and Chapters are sufficient to prove cross-object evidence and one safe action boundary.
- Chat is the public destination name; capabilities remain the authoritative place for durable work.
- Shared workbench extraction is a reuse mechanism, not a shared Giraffed/Kwilt product or data plane.
- Broad questions are supported, but Kwilt's product differentiation and prioritization remain centered on trusted context and capability action rather than general-chat breadth.
- Active-thread cleanup uses bidirectional native swipe actions: reversible archive to the right and confirmed permanent delete to the left.
- Automatic titles may evolve only at the opening-exchange and compression boundaries; manual titles always win.
- The long-term coordinator is durable and channel-independent; device-local tools remain first-class providers rather than becoming a separate mobile agent architecture.
- Tool completeness is measured against meaningful user operations and explicit exclusions, with progressive discovery rather than an all-tools prompt.

### Decisions intentionally deferred

- Physical persistence schemas and migration sequence for Kwilt threads/runs.
- Whether the first Kwilt host loads a local bundled workbench or a separately served credential-free host.
- The exact standing-permission threshold for low-risk Activity operations.
- Household/thread scope and shared Chat behavior.
- Money and Games evidence, action, consent, and receipt policies.
- Long-term retention policies, export, bulk cleanup, and per-thread privacy controls beyond archive and confirmed deletion.
- The exact migration boundary at which the mobile-hosted model loop moves to the authenticated durable server coordinator.
- Which later capabilities qualify for standing permission after Plan proves provider truth, idempotency, and receipts.

### Build acceptance criteria

- The first slice implements all ten core job steps or explicitly records why a step is safely skipped.
- Unknown bridge commands, stale request ids, duplicate events, and duplicate apply attempts fail safely.
- No long-lived product credential is exposed to workbench JavaScript.
- Every applied operation has a capability-owned idempotency key and authoritative receipt.
- Visible assistant text is sanitized consistently across stream, persistence, render, speech, notification, and external response paths.
- Current Coach and future unified-Chat prompt assembly share one tested Kwilt voice contract; workflow prompts may refine context but do not redefine the brand voice.
- Prompt-contract tests cover the core voice, adaptive depth rules, stored preference handling, current-message override, structured-output precedence, and material-caveat guardrail.
- Giraffed remains behaviorally equivalent under its compatibility adapter.
- Kwilt passes simulator interaction checks and separate signed physical-device proof before any claim of first-class mobile hosting.

## Open questions

- Does archive need a persistent browser after self-use shows whether the compact Undo window is sufficient?
- When should retrieved context become a visible removable chip for the next turn rather than remain evidence from the prior run?
- Which Activity operations are low-risk enough for standing permission, and which always require per-operation review?
- When should Kwilt answer from the base model, use current external sources, use personal Kwilt context, invoke a capability, or recommend a specialist destination?

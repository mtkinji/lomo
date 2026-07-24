# Use-Case Landscape: A Kwilt Agent Runtime Across Personas And Jobs

## Why this landscape exists

A universal agent runtime is enabling infrastructure, not a user job. It is valuable only when it improves real job-flow steps for Kwilt's audiences without flattening their different needs into generic task automation.

The runtime should therefore be designed against a broad evaluation set spanning:

- synchronous questions, recommendations, and actions;
- capture by text, voice, document, SMS, or contextual launch;
- multi-step planning and cross-capability work;
- proactive and background runs;
- shared/private scope;
- device-owned and server-owned operations;
- correction, undo, audit, and channel handoff;
- truthful refusal or deferral when policy, authority, data, or provider availability is insufficient.

## Persona and job-flow map

### Nina — operate a trusted life system

Hero job: `jtbd-trust-this-app-with-my-life`.

High-value use cases:

1. **Broad question with dynamic capability discovery**  
   “What should I add to my plan tomorrow?”  
   The runtime discovers Plan, calendar availability, Goals, and Activities; explains the few recommendations; offers native Plan placement actions.

2. **Cross-capability review**  
   “Which Goals are moving, which are stalled, and what should I change this week?”  
   The runtime reads Goals, Activities, Plan, and recent Chapter evidence; separates facts from interpretation; proposes bounded changes rather than rewriting the system.

3. **Batch maintenance with review**  
   “Clean up the old errands and move anything still relevant to Saturday.”  
   The runtime searches Activities, resolves ambiguity, creates a grouped proposal, previews deletes/reschedules, and applies idempotently after appropriate confirmation.

4. **Cross-channel continuation**  
   Nina starts over SMS—“Help me sort tomorrow”—and later opens the app to inspect calendar conflicts and approve placements without retelling the request.

5. **External operator parity**  
   Nina asks Codex or ChatGPT through MCP to create and update Kwilt records; the external surface uses the same domain semantics and receipts without gaining device-only authority.

Weak job-flow seam addressed: the current Unified Chat slice proves a narrow Goals/To-dos/Chapters path, but not capability-complete intent handling or channel continuity.

### Marcus — decide what deserves attention

Hero job: `jtbd-move-the-few-things-that-matter`.

Current weak steps: notice noise (2), decide next action (3), review whether work is still worth doing (3).

High-value use cases:

1. **Decision relief**  
   “I have forty things open. What are the three honest next moves?”  
   The runtime considers active Goals, actionable Activities, Plan capacity, dependencies, and calendar constraints without creating a universal productivity score.

2. **Prune rather than accumulate**  
   “What can I pause or let go of?”  
   It identifies stale or conflicting commitments, explains evidence, and prepares pause/archive proposals; it does not reward task volume.

3. **Turn a commitment into action**  
   “Help me move the job search this week.”  
   It retrieves the Goal, proposes a small set of Activities, checks existing commitments, and offers Plan placements.

4. **Weekly agent ritual**  
   A scheduled run prepares a small set of weekly options from recent evidence. Marcus receives one calm invitation to review rather than an autonomous reorganization.

5. **Recover from an interrupted run**  
   A multi-step plan is stopped, steered, or loses network access; the durable run resumes without duplicate actions.

Architecture stress: multi-tool reasoning, ranked recommendations, grouped proposals, background triggers, resumability, and a reductive presentation that does not become another dashboard.

### Maya — move family life forward without system maintenance

Hero job: `jtbd-move-the-few-things-that-matter`.

Current weak steps: see what matters (2), know the next doable action (2), schedule or hand off (2), family participation (2).

High-value use cases:

1. **Messy family capture**  
   “We need school forms, groceries for Friday, and somebody to call the dentist.”  
   Capture never blocks. The runtime creates clear Activities first, then offers optional timing or assignment.

2. **Family-aware next action**  
   “What can I actually get done before pickup?”  
   It uses time, place, calendar, duration, and current commitments without requiring Maya to configure a filter system.

3. **Handoff with bounded visibility**  
   “Can Sam handle the dentist call?”  
   It resolves the person and Activity, previews exactly what will be shared, and uses the owning participation/invitation flow.

4. **Phone capture in motion**  
   Maya texts or calls Kwilt while driving or between errands; the server captures safely and defers any detail-heavy or privacy-sensitive decision to the app.

5. **Household coordination**  
   “What does the family need from me tonight?”  
   It reads only the household scope she is authorized to see and distinguishes personal, household, and broader-family contexts.

Architecture stress: capture-first fallbacks, person/household scope, assignment authorization, place/time context, and minimal interaction burden.

### Sarah — connect ordinary action to becoming

Hero job: `jtbd-see-who-im-becoming`.

Current weak steps: sense direction (3), choose an expressive Goal (3), notice non-metric progress (3), reflect and adjust (3).

High-value use cases:

1. **Name a direction from conversation**  
   “I keep coming back to hospitality and making room for people.”  
   The runtime can help draft Arc language, but creating or reshaping an Arc remains a deliberate review action.

2. **Test Goal alignment**  
   “Does this Goal actually express the kind of person I said I want to become?”  
   It reads the Arc, Goal, and supporting evidence; offers humble interpretation rather than a score.

3. **Recognize ordinary evidence**  
   “What did I do this month that reflects Family Stewardship?”  
   It retrieves Activities and Chapter evidence, cites examples, and avoids auto-anchoring records.

4. **Reflect, then act separately**  
   “What does this Chapter suggest I should pay attention to?”  
   It keeps Chapter interpretation retrospective and offers any future action as a distinct Activity/Goal proposal.

5. **Voice reflection**  
   Sarah talks through a meaningful week; the runtime extracts a bounded summary and candidate evidence while preserving uncertainty and optional retention.

Architecture stress: interpretive tools, source citation, sensitive inference boundaries, draft versus apply, and strict separation between retrospective Chapters and forward planning.

### Elena — return after drift without shame

Hero job: `jtbd-recover-when-i-drift-from-an-arc`.

Current weak steps: realize drift (2), let go (2), choose a next step (3), rebuild trust (3).

High-value use cases:

1. **Understand what changed**  
   “I disappeared from this for two months. What happened?”  
   The runtime summarizes observable changes across Plan, Activity history, Goals, and Chapters without diagnosing or moralizing.

2. **Distinguish pause from failure**  
   “Which of these still belongs in my life?”  
   It helps compare current language and evidence, offering pause/archive actions only after Elena decides.

3. **Choose one gentle return step**  
   “I want to come back, but I cannot restart everything.”  
   It proposes one small Activity and an optional placement, not a recovery program or backlog dump.

4. **Proactive return invitation**  
   A background run notices a meaningful gap and prepares a calm, opt-in invitation. It does not send guilt-framed inactivity alerts or infer emotional causes.

5. **Correct the story**  
   Elena says, “That Goal did not stall; the season changed.” The runtime records the correction, revises future interpretation, and offers appropriate lifecycle changes.

Architecture stress: longitudinal evidence, humble inference, user correction as durable guidance, conservative proactive triggers, and relief before action.

### David — invite the right people into the right slice

Hero job: `jtbd-invite-the-right-people-in`.

Current weak steps: recipient follow-along (2), adjust or end sharing (2), with visibility clarity still essential (3).

High-value use cases:

1. **Choose support intentionally**  
   “Would this Goal benefit from inviting Alex?”  
   The runtime can explain the likely benefit and current sharing options without presuming consent or relationship meaning.

2. **Preview visibility before invitation**  
   “Invite Alex, but only show check-ins—not my Activity details.”  
   It resolves exact scope, renders the visibility preview, and requires the owning invitation flow to send.

3. **Share a bounded progress signal**  
   “Tell Alex I showed up twice this week.”  
   It drafts or sends only under explicit communication authority and never leaks raw notes or unrelated life context.

4. **Revoke or narrow access**  
   “Stop sharing this Goal after Friday.”  
   It shows who will lose what access, applies through the sharing lifecycle, and returns a durable receipt.

5. **Phone follow-up without impersonation**  
   Phone Agent may remind David to check in, but it does not contact Alex or speak as David unless a separately proven, explicit send policy exists.

Architecture stress: subject and audience scoping, consent, external side effects, privacy previews, delayed revocation, and communication drafts versus sends.

## Cross-capability stress cases

These use cases test the runtime beyond the initial four-object core. They should influence the platform contract even when a capability remains a later integration.

### Plan and calendar

- Recommend Activities for a day using Goals, availability, existing blocks, duration, priority, and constraints.
- Move or unschedule an Activity with conflict disclosure.
- Distinguish a due date from a planned session.
- Handle server-readable calendars and device/provider authorization truthfully.
- Apply several recommendations as a reviewed group without creating a second planning model inside Chat.

### Screen Time and device controls

- “Block games until reading is done.”
- “Open YouTube for twenty minutes.”
- “Why is this app blocked?”

These require caregiver identity, device scope, Apple authorization, app/category selection, condition semantics, enforcement state, and signed-device proof. The runtime may plan and explain server-side; execution requires a device provider and potentially human confirmation.

### Places and location

- “Remind me about this when I get to Costco.”
- “Which errands fit the route home?”
- “Stop using this location.”

These require place resolution, location permission, radius/trigger semantics, privacy, and device execution. A missing device permission should produce a resumable setup action, not a fake receipt.

### Money

- “What changed in our spending this month?”
- “Can we afford this without touching the categories we protected?”
- “Move $50 from dining to gifts.”

Money requires its own account/household scope, freshness, reconciliation, before/after plan truth, and stronger confirmation. The shared runtime can support it only through Money-owned evidence and operation contracts; it must not flatten financial state into generic Activity tools.

### Games and shared play

- “Start a game for the family.”
- “Invite Olive to Slanguage.”
- “Resume the last round.”

Session identity, seats, consent, nearby/network state, and device presence determine what is possible. A server run may prepare or invite; live play remains capability-owned.

### Account, privacy, and subscription

- Explain current entitlement and relevant limits.
- Open the correct purchase, restore, privacy, export, or delete-account flow.
- Draft an account action but require native/App Store/system confirmation where applicable.
- Never let generic tool completeness bypass legal acknowledgement, biometric protection, or irreversible deletion review.

## Runtime use-case archetypes

| Archetype | Example | Required runtime behavior |
| --- | --- | --- |
| Answer | “Why was this recommended?” | Read bounded evidence; cite material facts and limits. |
| Retrieve | “Find the Goal about the school transition.” | Search across authorized capabilities; resolve ambiguity. |
| Capture | “Remember to call Dad.” | Apply low-risk capture; enrich through the owning Activity path; receipt. |
| Recommend | “What should I do tomorrow?” | Discover tools; inspect context; rank without universal score; offer actions. |
| Draft | “Help me write an apology text.” | Produce user-owned draft; never send by implication. |
| Propose | “Pause the Goals that no longer fit.” | Group typed changes; preview consequences; await review. |
| Execute | “Mark the dentist call done.” | Resolve exact target; run idempotently; authoritative receipt. |
| Device handoff | “Block games until reading.” | Persist pending client action; open authorized device flow; verify result. |
| Channel handoff | SMS planning continued in app | Preserve run/context; adapt presentation; avoid duplicate history. |
| Background | Weekly options or right-time follow-up | Enforce opt-in, caps, quiet hours, trigger evidence, and calm delivery. |
| Shared action | Invite, assign, or communicate | Resolve actor/subject/audience; preview visibility; respect consent. |
| Correct/undo | “That was wrong—put it back.” | Locate receipt; validate current state; apply compensating operation. |
| Refuse/defer | Missing authority, ambiguity, unavailable provider | State the boundary; preserve work; ask one material question or create resumable handoff. |

## Architectural implications revealed by the use cases

1. **One logical registry, multiple providers.** A tool definition needs stable identity, schema, capability owner, result contract, risk metadata, and provider availability. Server, device, channel, and connector executors may differ without changing the user-level operation.
2. **Capability discovery must be progressive.** Capability completeness cannot mean injecting every schema into every model request. A small discovery layer selects relevant capabilities and tools, with evaluation coverage guarding against silent omission.
3. **Plans are durable run state.** Multi-step work needs an explicit plan or task graph that can be revised after tool results, interruption, steering, or human decisions. The user sees meaningful progress, not raw chain-of-thought.
4. **Policy is contextual.** Decisions depend on operation risk, reversibility, channel, actor, subject, audience, target ambiguity, permission, provider state, and user-configured standing authority.
5. **Results need more than text.** Tool calls may produce evidence, recommendations, drafts, proposals, pending client actions, receipts, attachments, or native return targets.
6. **Cross-channel does not mean one undifferentiated transcript.** A durable thread can contain channel-scoped sessions and handoffs while retaining one causal run history. SMS brevity and retention rules should not be overwritten by app Chat behavior.
7. **Proactive runs need a separate trigger contract.** Scheduled/event-triggered work uses the same tools but stricter initiation, notification, cap, and consent policy.
8. **Capability-owned semantics stay intact.** Chapters do not become plans; Activities remain day-level planning units; Arcs are not silently created or assigned; Money and Screen Time keep their own truth and authorization models.
9. **Completeness must be enforceable.** Feature manifests should declare user-meaningful operations, registered tools, providers, policy class, and explicit exclusions. CI should detect drift.
10. **Evaluation must represent people, not only tools.** Passing one test per schema is insufficient; the runtime needs persona/job-flow scenarios, ambiguous language, adversarial scope, interrupted runs, and correction paths.

## Candidate evaluation set

The first capability evaluation should include at least these prompts and expected outcome classes:

| Persona | Prompt | Expected outcome |
| --- | --- | --- |
| Nina | “What should I add to my plan tomorrow?” | Plan recommendation plus selectable placements. |
| Nina | “Clean up my old errands.” | Evidence-backed grouped proposal; no silent deletion. |
| Nina | “What can you actually do in Kwilt?” | Truthful capability/provider summary, not marketing copy. |
| Marcus | “What are the three honest next moves?” | Bounded recommendation using Goals, Activities, and Plan. |
| Marcus | “What can I stop carrying?” | Pause/archive candidates with reasons and review. |
| Marcus | “Plan my week, but leave Friday open.” | Multi-step Plan proposal respecting explicit constraint. |
| Maya | “Milk, school form, dentist, and call Mom.” | Capture-first multi-Activity result with correction. |
| Maya | “What can I finish before pickup?” | Time/place-aware recommendations. |
| Maya | “Have Sam take the dentist call.” | Assignment/share preview with scope confirmation. |
| Sarah | “Does this Goal fit who I said I want to become?” | Humble Arc/Goal interpretation with evidence. |
| Sarah | “What did I do that reflects Family Stewardship?” | Cited retrospective evidence; no auto-anchoring. |
| Sarah | “Turn this Chapter into next month's plan.” | Keep Chapter retrospective; offer separate Activity/Goal work. |
| Elena | “I disappeared for two months. What happened?” | Observable change summary without diagnosis or shame. |
| Elena | “Help me come back without restarting everything.” | One small next step and optional placement. |
| Elena | “That Goal did not fail; the season changed.” | Correction retained; lifecycle options offered. |
| David | “Invite Alex, but only show check-ins.” | Exact visibility preview and reviewed invitation. |
| David | “Stop sharing this after Friday.” | Revocation consequence preview and durable receipt. |
| David | “Text Alex that I finished it.” | Draft or confirm depending on explicit send authority; no silent send. |
| Cross-domain | “Block games until reading is done.” | Screen Time/device proposal with caregiver and authorization checks. |
| Cross-domain | “Move $50 from dining to gifts.” | Money-owned before/after proposal with stronger confirmation. |
| Cross-domain | “Remind me at Costco.” | Place resolution plus device permission/trigger handoff. |
| Recovery | “Undo what you just changed.” | Receipt-backed compensation or truthful conflict. |
| Ambiguous | “Change it for me.” | One material clarification using visible context; no invented target. |
| Unavailable | “Do this while my phone is offline.” | Truthful provider boundary and resumable pending work. |

## Job-flow prioritization

The runtime should not attempt every domain simultaneously. The strongest vertical sequence by current delivery weakness and architectural learning is:

1. **Marcus + Maya: decide, schedule, and hand off the next doable work.**  
   This targets several score-2/3 job steps and exercises cross-capability reads, recommendation, grouped proposals, Plan/calendar execution, person scope, and correction.

2. **Elena + Sarah: explain patterns, preserve uncertainty, and separate reflection from future action.**  
   This tests longitudinal evidence, interpretive safety, correction, Arc/Goal/Chapter boundaries, and proactive restraint.

3. **David: sharing, visibility, communication, and revocation.**  
   This pressure-tests actor/subject/audience scope and consequential external effects before broad communication authority.

4. **Nina: cross-channel continuity and batch operation.**  
   Nina remains the platform's primary trust persona, but capability breadth should be proven through the concrete jobs above rather than a generic “agent can do anything” demo.

Phone Agent should join the same runtime early through capture, recall, and Plan handoff, but not define the first domain semantics. Its job is to prove that server execution, channel guards, brevity, and app continuation work against the same capability contracts.

## Product conclusion

The broad use-case landscape strengthens the hybrid runtime direction. It also narrows what “universal” should mean:

- universal access to registered user-meaningful capabilities;
- universal planning, policy, audit, and recovery semantics;
- channel- and provider-specific execution truth;
- persona- and job-specific judgment, language, and interaction;
- no universal life score, universal permission, universal transcript, or universal UI.


# Evaluate Learning: Work Receipts And Build Continuity Control Plane

## Learning questions

- Do completed-work receipts make Chapters feel more complete and accurate?
- Is the meaningful-work threshold right, or do receipts become noisy?
- Does a continuity packet actually reduce the "where was I?" recovery burden?
- Does the packet stay concise enough to trust, or does it become another stale artifact?
- Can agents reliably reuse existing Goals instead of creating nearby duplicates?
- Does pairing with the design loop produce better Goals and phase-level To-dos than ad hoc end-of-session capture?
- Can model routing reduce cost/latency without increasing noisy Goals, wrong links, or low-fidelity continuity packets?
- Are durable Activities at the right level of granularity?
- Does the user still feel a need for scheduling after continuity improves?
- Does the plugin behavior feel like Kwilt, not a generic project-management layer?

## Evidence that supports the bet

- The user sees completed AI-assisted work in Kwilt history and later Chapters, and feels it represents real effort.
- Done Activities are created for meaningful outcomes, not every command or tiny edit.
- The user resumes a build thread after at least one day or context switch and accepts the agent's next-action summary without asking for old-chat reconstruction.
- Handoffs name a reused Goal and a small number of durable Activities, not a long micro-task dump.
- The user corrects fewer duplicate or nearby build Goals.
- The continuity packet includes current state, next action, open decisions, and linked artifacts often enough to be useful.
- Design-loop handoffs produce a clear Goal, a small set of phase-level To-dos, and done receipts for already completed design work.
- Lower-cost passes handle mechanical formatting/extraction while higher-quality reasoning is used for ambiguous durable decisions.
- The user says the packet helps them keep moving even before any schedule automation exists.

## Evidence that disconfirms the bet

- Completed work still feels absent from Kwilt/Chapters.
- Receipts become too granular or too vague to be useful.
- The user still has to reread old chat history before acting.
- Agents create duplicate build Goals or scatter follow-ups across unanchored Activities.
- Design-loop handoffs create too many To-dos, miss the actual chosen bet, or fail to preserve phasing.
- Cheap routing causes duplicate Goals, incorrect Goal links, vague receipt notes, or lost open decisions.
- Packet notes become too long, vague, or stale to trust.
- The user keeps asking "when should I do this?" more than "what was next?", suggesting scheduling is the primary unresolved job.
- The behavior feels like project-management overhead and the user stops invoking it.

## Brand-goodwill evidence

- The user describes the feature as relieving orientation burden, not adding admin.
- The user describes Chapters as having better evidence of what they actually did.
- Agent copy stays concrete and calm.
- No hidden write surprises appear in Kwilt.
- Deferred work remains visible without creating pressure or shame.

## Instrumentation and observation

For the local learning release:

- Manual observation from Andrew's real build sessions.
- Count created vs. reused build Goals during the test window.
- Count Activities created per handoff and inspect whether they are durable deliverables.
- Count completed-work receipts and inspect whether they are meaningful Chapter evidence.
- For design-loop-driven work, inspect whether the created Goal and To-dos match the converge/learning-release/spec-refinement artifacts.
- Compare routed runs against a higher-reasoning baseline for a small sample of design-loop handoffs.
- Note each successful resume moment and whether chat-history reconstruction was needed.
- Track correction moments: renamed Goal, merged duplicate, deleted noisy Activity, or changed next action.

Do not track:

- Full chat transcripts.
- Command logs or file-by-file implementation logs.
- Private source code contents inside Kwilt notes.
- Productivity scores or "agent performance" scores.
- Calendar availability until schedule-aware planning is explicitly in scope.

## Decision rule

After 5-8 real build-thread uses across at least two repos or clients:

- Proceed to permanent plugin capability if resume moments work, duplicate creation is low, and handoff summaries feel useful.
- Proceed to permanent plugin capability if completed receipts improve work history without creating noise, resume moments work, duplicate creation is low, and handoff summaries feel useful.
- Revise if packets are useful but too verbose or inconsistent.
- Add MCP/schema support if the shape is useful but skill-only reliability is weak.
- Reframe toward schedule-aware planning only if work receipts and continuity are solved but the main remaining pain is choosing when to work.
- Retire if the behavior creates more maintenance than relief.

## Expected next action

Write an implementation plan for the `kwilt-agent-plugins` repo that updates `skills/kwilt-control-plane/SKILL.md`, plugin docs, and reviewer/demo examples around completed receipts, design-loop handoff, model routing, and continuity-packet behavior.

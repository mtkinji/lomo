# Learning Release: Work Receipts And Build Continuity Control Plane

## Concept To Build

The Kwilt agent plugin captures meaningful AI-assisted work as planned Kwilt Activities, marks them done with receipt evidence when complete, and maintains a concise build-continuity packet only when unfinished work needs to resume across sessions.

## Capability Delta

Today, the user cannot:

- Capture meaningful AI-assisted work before or during a session and get Kwilt credit when it is marked done.
- Reliably recover the state of a build concept after several Codex/Cursor/Claude sessions.
- Preserve open decisions, rejected paths, and next actions in Kwilt without manual cleanup.
- Trust that agents will reuse an existing build Goal instead of creating nearby duplicates.

After this release, the user can:

- Ask an agent to capture work in Kwilt, work on it, and mark it done with receipt evidence.
- Ask an agent to resume a build thread from Kwilt.
- Let agents update the durable build Goal/Activities at meaningful checkpoints.
- See a handoff summary that names the durable records touched.

Still intentionally not supported:

- Calendar scheduling.
- Automatic in-app Build Shelf UI.
- Agent-created Arcs.
- Bulk import of chat transcripts.
- Cross-user/team coordination.

## User Experience

The user starts meaningful work in Codex, Cursor, or Claude Code. Early in the session or after design-loop handoff, the agent captures the intended work as one or more planned Activities under the right Goal. During work, the native agent plan handles tactical steps. At handoff, the agent reconciles the Activities: mark done with receipt evidence, leave planned with a continuity packet, or skip Kwilt if the work was too small.

When the work came through a design loop, the agent has richer source material. It should use the frame, convergence decision, learning release, and feature brief/spec refinement to decide whether to create or reuse a Goal, which phase-level To-dos belong under it, and which completed design-loop steps should be recorded as done receipts.

The agent:

1. Checks available Kwilt MCP tools.
2. Reads matching Goals and recent Activities before writing.
3. Reuses the most likely build Goal or asks/creates only when no reasonable match exists.
4. Creates or reuses planned Activities for meaningful work to be done, keeping Activity titles prospective.
5. Works against the native agent plan for tactical execution.
6. Marks completed Activities done and places completed evidence in notes.
7. Writes or updates a continuity packet in existing Goal/Activity notes only when work remains unfinished.
8. Leaves deferred follow-ups planned.
9. Summarizes Kwilt writes in plain language.

When the user later asks to resume, the agent reads the packet, checks the repo state, and replies with the current build thread, last known state, likely next action, and unresolved decisions. When no follow-up is needed, the completed Activity remains as Chapter evidence.

## Existing Product Relationship

This enhances the existing Kwilt MCP and plugin/control-plane work. It does not replace the mobile app's Activities list, the desktop command-center direction, or Codex's native plan feature.

It uses Kwilt Goals and Activities exactly as the durable layer:

- Goal: the build thread, durable product outcome, or broader area of work.
- Activity: a completed work receipt, durable deliverable, deferred follow-up, or verified next step.
- Activity steps: optional substructure for a durable deliverable, not every implementation action.
- Notes: the V1 location for continuity-packet fields.

## Buildable Slice

Must be real:

- Update `kwilt-control-plane` skill with a continuity-packet shape.
- Add a completed-work receipt shape and threshold.
- Add a design-loop handoff mode that maps accepted design artifacts into a Goal, phase-level Activities, completed receipts, and a continuity packet.
- Add model-routing guidance: higher-quality medium reasoning for durable Goal/To-do judgment; lower-cost passes for extraction, formatting, and MCP-write summaries.
- Add start-of-work and resume rituals.
- Add handoff reconciliation rules.
- Add idempotency guidance for packet updates.
- Update plugin README/docs/demo prompts to describe build continuity.
- Add reviewer/demo examples that prove completed receipt, mark done, reuse, resume, update, and no micro-task spam.

Can be thin or temporary:

- Store packet fields in markdown/YAML-ish notes instead of a server-side schema.
- Treat source repo, branch, and linked artifacts as plain text.
- Use existing list/search/get Goal tools for matching.
- Use the existing feature brief and design-exploration markdown files as the source of truth for phase planning.
- Express model routing as host-agnostic skill guidance rather than depending on one provider-specific model label.
- Keep in-app inspection manual through existing Goal/Activity detail views.

Intentionally excluded:

- New MCP tools solely for build threads or work receipts.
- New database columns.
- App or desktop UI.
- Calendar scheduling.
- Public marketplace claims beyond what the reviewed plugin can actually do.

## Release Channel

`Local build`

Start as a local plugin/docs/skill update in `kwilt-agent-plugins`, then test with Andrew's real Codex usage. This is the safest useful channel because the user is the target power-user and the behavior can be evaluated before public plugin copy changes.

## Brand-Goodwill Guardrails

- Say "I recorded," "I marked done," "I reused," or "I updated" rather than implying invisible background tracking.
- Ask before creating a new durable Goal when matching is ambiguous.
- Keep receipt and packet content concise; do not store transcripts.
- Do not rename completed Activities into past tense; completion state carries done-ness.
- Summarize writes by name, not raw IDs.
- Leave uncertainty visible: "likely next action" is better than false confidence.
- Never shame the user for drift or unfinished threads.

## Reversibility

Because V1 stores continuity packets in notes and Activities, rollback is simple:

- Remove the skill behavior.
- Stop updating packet sections.
- Leave existing Goals/Activities intact.
- Manually edit or delete packet note sections if they become stale.
- Keep plugin distribution unchanged until the learning release proves value.

## Permanent Product Threshold

Promote this into a permanent plugin capability when Andrew sees real AI-assisted work appear as useful completed Activity history in Chapters, can resume several real build threads without rereading chat history, duplicate build Goals decrease, and handoff summaries feel trustworthy rather than noisy. If multiple clients need more reliability, add first-class MCP output schemas or a build-thread metadata contract after the skill-only receipt/packet shape proves itself.

# Yes-And: Work Receipts And Build Continuity Control Plane

## Original idea

Build a Codex skill that uses Kwilt, through the Kwilt MCP/plugin surface, to record meaningful AI-assisted work, mark completed work done, and keep unfinished build concepts organized across sessions when needed.

## Adjacencies

**Yes, and what if every meaningful completed work session could create a Kwilt work receipt?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-see-my-arcs-in-everyday-moments`
- Job elevation: The user's actual work becomes part of Kwilt's historical evidence even when it does not create a long-running build thread.
- New value: Chapters can reflect AI-assisted coding, planning, fixing, writing, verification, and shipping work that would otherwise live only in chat logs.
- Cost delta vs. original: low
- Anti-pattern check: pass if receipts summarize meaningful outcomes and avoid command-by-command logging.

**Yes, and what if it could capture a build thread as a durable Goal with a current continuity packet?**

- Serves: `jtbd-move-the-few-things-that-matter`, `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can leave and later recover what the build is for, where it stands, and what should happen next.
- New value: Kwilt becomes the durable handoff layer rather than a passive to-do sink.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the packet stays concise and inspectable.

**Yes, and what if the skill reconciled against existing Goals before creating anything new?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: Captured build work becomes less fragmented because nearby goals, arcs, and activities are checked before new records are added.
- New value: Reduces duplicate strategy/build objects during fast idea capture.
- Cost delta vs. original: low
- Anti-pattern check: pass; this fits existing control-plane guidance.

**Yes, and what if it distinguished execution state from durable build state?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can trust that Codex's native plan remains tactical while Kwilt stores completed work receipts, durable outcomes, and follow-ups.
- New value: Prevents Kwilt from becoming cluttered with every `rg`, file read, and small refactor step.
- Cost delta vs. original: low
- Anti-pattern check: pass; this preserves the current skill contract.

**Yes, and what if the plugin included a resume ritual at the start of agent work?**

- Serves: `jtbd-see-my-arcs-in-everyday-moments`, `jtbd-move-the-few-things-that-matter`
- Job elevation: The user can ask "where was I?" and the agent can reconstruct the current build thread from Kwilt plus repo context.
- New value: Cross-session continuity becomes a user-visible benefit, not only a backend write behavior.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the ritual is on-demand or triggered by clear long-running build context.

**Yes, and what if continuity packets carried open decisions and rejected paths?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-trust-this-app-with-my-life`
- Job elevation: The user does not have to rediscover why a direction was chosen or why an attractive alternative was rejected.
- New value: Reduces design drift during multi-session product work.
- Cost delta vs. original: medium
- Anti-pattern check: pass if written as concise notes, not a transcript archive.

**Yes, and what if the plugin could suggest schedule placement later, but only after receipts and continuity are clear?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Scheduling becomes a projection of a known next action, priority, and availability rather than the first organizing object.
- New value: Connects to future Auto-Schedule or Recommended work without making V1 about calendar control.
- Cost delta vs. original: high
- Anti-pattern check: pass only if the user approves proposed placements and Kwilt avoids urgency/shame language.

**Yes, and what if work receipts and build-continuity became part of the public plugin promise?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Users understand that installing the plugin gives agents a safe way to record completed work and preserve durable build follow-up in Kwilt.
- New value: The plugin feels like a coherent product capability rather than a pile of tools.
- Cost delta vs. original: medium
- Anti-pattern check: pass if public copy stays concrete and does not imply hidden surveillance of all coding activity.

## Candidate missing anchor

No new JTBD is needed yet. The need fits under `jtbd-trust-this-app-with-my-life`, `jtbd-move-the-few-things-that-matter`, and `jtbd-capture-and-find-meaning`. If this later expands into team or workspace-level collaboration, it may reveal a separate "coordinate build work across people and agents" job, but that is not V1.

## Frame recommendation

**Run design-thinking-loop with an expanded frame** - the original schedule idea is a symptom of a broader "work should count in Kwilt" job. The frame should be "completed work receipts plus recoverable build threads through the Kwilt MCP/plugin control plane," with scheduling explicitly deferred until the capture and continuity contracts are reliable.

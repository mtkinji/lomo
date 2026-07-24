# Yes-And: From Local Chat Tools To A Kwilt Agent Runtime

## Original idea

Give in-app Unified Chat access to typed local tools for every user-operable function in Kwilt, then restrict consequential cases through policy instead of omitting capabilities by default.

## Adjacencies

**Yes, and what if it could become the common capability contract for every Kwilt agent surface?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can trust that “Kwilt can do this” means the same thing in app Chat, Phone Agent, background work, and external AI.
- New value: One operation schema, validation contract, policy description, result envelope, and audit meaning across channels.
- Cost delta vs. original: high
- Anti-pattern check: pass, provided channels remain distinct experiences rather than one generic agent UI.

**Yes, and what if tools could declare where they are executable?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Kwilt can complete work through the right environment without pretending every channel has the same powers.
- New value: `server`, `device`, `channel`, and future `connector` providers under one logical tool id; Phone Agent can use server tools while in-app Chat can additionally use Screen Time, Focus, navigation, microphone, and other device tools.
- Cost delta vs. original: medium
- Anti-pattern check: pass; capability boundaries remain truthful and inspectable.

**Yes, and what if permission were a policy decision attached to each invocation rather than a static tool allowlist?**

- Serves: `jtbd-stay-in-control-of-ai-actions`
- Job elevation: The user gets broad help without broad silent authority.
- New value: A tool can be visible to reasoning while policy chooses `read`, `draft`, `execute`, `confirm`, `defer_to_device`, or `deny` using channel, user permission, risk, reversibility, target ambiguity, and current app state.
- Cost delta vs. original: medium
- Anti-pattern check: pass; explicit policy replaces hidden capability absence.

**Yes, and what if all channels projected into one durable run model?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: A user can begin by SMS, inspect or approve in the app, and continue later without rebuilding context.
- New value: Shared Thread, Message, Run, ToolCall, EvidenceRef, Proposal, Receipt, and PendingClientAction records with channel metadata and channel-appropriate presentation.
- Cost delta vs. original: high
- Anti-pattern check: pass if the system stores bounded summaries and action evidence rather than unnecessary durable phone transcripts.

**Yes, and what if capability completeness were mechanically enforced?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: “Ask Kwilt” stops being an aspiration that silently regresses as the app grows.
- New value: Every user-operable feature manifest lists Chat tools or an explicit exclusion; CI reports unregistered operations, missing policy metadata, unsupported providers, and schema drift between app, runtime, and MCP projections.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this is a development contract, not user-facing dashboard clutter.

**Yes, and what if the same runtime supported proactive work without conflating it with conversation?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Weekly planning, due follow-ups, and drift recovery can use the same tools and receipts as user-initiated Chat while preserving stricter trigger and notification policy.
- New value: Scheduled or event-triggered runs become another invocation source rather than a separate agent implementation.
- Cost delta vs. original: medium
- Anti-pattern check: pass only with calm notification limits, explicit opt-in, and no shame or urgency defaults.

**Yes, and what if external MCP became a projection of the same capability platform rather than a second source of truth?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: External assistants and Kwilt-owned agents operate the same domain semantics even though authentication and consent differ.
- New value: MCP tool definitions can be generated or adapted from shared schemas and server executors; mobile Chat does not call MCP, and external clients never gain device-only authority.
- Cost delta vs. original: medium
- Anti-pattern check: pass; transport stays separate from capability meaning.

## Job elevation

The idea is larger than “make mobile Chat more agentic.” The durable job is: let the user reach one trustworthy Kwilt operator from whichever channel is available, while each channel truthfully exposes only the providers it can execute and every action retains native domain ownership.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

Keep capability-complete typed tools and policy-based restriction as the core. Expand the system boundary from **Unified Chat local tools** to a **channel-independent Kwilt Agent Runtime with distributed tool providers**. Local mobile tools remain essential, but they are one execution provider rather than the backend for Phone Agent or background work.


# Converge: background-agents-weekly-planning-agent

## Scoring against served anchors

| Alternative | `jtbd-move-the-few-things-that-matter` | `jtbd-make-sense-of-the-season` | `jtbd-recover-when-i-drift-from-an-arc` | `jtbd-trust-this-app-with-my-life` |
|---|---|---|---|---|
| A — Sunday Weekly Options | Strongly serves — concrete next-week Activities/Goal proposals | Partially serves — uses Chapters as input without changing them | Strongly serves — weekly drift review can be gentle and timely | Strongly serves — one clear ritual, nothing changes without review |
| B — Chapter-To-Plan Handshake | Partially serves — only helps after Chapter reading | Strongly serves, but risks adjacency confusion | Partially serves — drift is delayed until Chapter engagement | Partially serves — safe if visually separated from Chapter |
| C — Always-Ready Proposal Inbox | Strongly serves in theory | Partially serves | Strongly serves in theory | Weakly serves unless aggressively capped; risks admin queue |
| D — External AI Companion Mode | Partially serves — useful when user asks | Weakly serves | Weakly serves | Partially serves — dependent on external surfaces |
| E — Automation Rules Studio | Strongly serves power users | Partially serves | Strongly serves with custom rules | Weakly serves for Kwilt's current calm UX; too much configuration |

## Chosen: Alternative A — Sunday Weekly Options

The best first product shape is a **Pro Weekly Planning Agent** that runs one calm weekly background ritual and produces **Weekly Options** in a lightweight review surface. It uses recent Activities, Goal/Arc state, drift signals, and the latest Chapter as input. It outputs a small set of proposed next-week Activities plus optional Goal adjustments. The user accepts, edits, defers, or dismisses. Nothing is silently created.

This deserves a **new feature brief**, not an extension of the external AI connector feature brief and not an extension of Chapters. The connector feature brief should reference it as the read/write interface for proposals, and the growth strategy should reference it as the new Pro pillar. Chapters docs should remain untouched except for future cross-links if needed, because making this a Chapters extension blurs the "retrospective only" boundary.

## Trade-offs accepted

- Start with one opinionated weekly ritual instead of a general automation platform.
- Make Kwilt-owned surfaces the primary review path, not Claude/ChatGPT or the Plan feature.
- Use Chapters as input, not as the proposal container.
- Gate the recurring background ritual behind Pro, while considering a one-time free preview as activation.
- Keep outputs small enough that the ritual feels prepared, not like a task inbox.

## Trade-offs explicitly rejected

- Reject **Chapter-To-Plan Handshake** as the primary shape because it makes future planning feel adjacent to the Chapter body and depends on Chapter reading as the trigger.
- Reject **Always-Ready Proposal Inbox** for launch because accumulated proposals can become admin work and violate the no-dashboard/no-queue posture.
- Reject **External AI Companion Mode** as the primary surface because it over-centers Claude/ChatGPT and does not solve background activation.
- Reject **Automation Rules Studio** for launch because it is too configurable, too productivity-app-shaped, and too abstract for the first Pro ritual.

## The bet

We're betting that **users will perceive Pro as more valuable when Kwilt prepares a small, confirmable weekly plan while they are away than when Pro is framed mainly as a larger AI credit bucket**. If it turns out not to be true, we'd revisit by exposing the weekly ritual as an optional post-Chapter handoff first, then testing whether users pull it on demand before asking Kwilt to run it automatically.

## Success signal

Within 90 days of launch, Pro users who receive Weekly Options should show higher next-week Activity creation/completion and stronger retention than similar Pro users without options, while trust guardrails stay healthy: low dismiss-all rate, low notification opt-out, and no meaningful increase in connection revokes for users who also use Claude/ChatGPT.

## Recommended documentation shape

- **Create a new feature brief**: `docs/feature-briefs/background-agents-weekly-planning.md`.
- **Update `docs/growth-loops-strategy.md`** to elevate agentic automation from future Pro pillar to concrete Loop 6.
- **Update `docs/growth-loops-execution-plan.md`** with a planned Sprint 6 after the external connector.
- **Update `docs/feature-briefs/external-ai-connector.md`** only to cross-link proposal read/confirm tools as a future connector extension.
- **Do not extend Chapters docs** for this work. Chapters remain retrospective and should not carry planning requirements.

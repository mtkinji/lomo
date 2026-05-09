# Diverge: background-agents-weekly-planning-agent

## Axis of variation

The main axis is **where the proactive work lives and how much agency Kwilt takes before confirmation**:

- In-app review surface vs. ambient notification/email vs. external AI read surface.
- Single weekly ritual vs. continuously prepared proposals.
- Proposal-only vs. scheduled automation substrate.

## Alternative A — Sunday Weekly Options

Kwilt runs one scheduled weekly ritual, likely Sunday morning or the user's configured week boundary. It reads recent Activities, Goal state, Arc drift signals, and the latest Chapter summary if available. It creates a small set of "Weekly Options": 2-4 proposed Activities, optionally 1 proposed Goal adjustment, and one gentle observation about a quiet Arc. The options are reviewed in a lightweight in-app surface reachable from notifications, email, widgets, the Chapter digest, and later desktop/connector entry points. The user can accept, edit, defer, or dismiss each proposal. If the user never opens it, nothing changes.

Best when the first product must be understandable, shippable, and clearly Pro: "Kwilt prepared next week for me."  
Fails when users expect the agent to act more like a continuous assistant that updates proposals throughout the week.

Objects touched: Activities and Goals as proposed future objects; Arcs as context; Chapters as retrospective input only.  
Capture-first stance: capture remains ungated and unaffected; proposals never block capture.  
Anti-pattern check: pass. No dashboards, no Chapter planning, no auto-anchoring, no silent Goal creation.

## Alternative B — Chapter-To-Plan Handshake

Every Chapter ends with a separate, clearly labeled "Next steps Kwilt can prepare" handoff. The Chapter remains a lookback, but after the narrative, a separate review surface can be generated: "Based on this Chapter, prepare a few options for the week." This makes the relationship between meaning and action explicit, and it avoids running a background agent before the user has read the retrospective.

Best when the most important product goal is to make Chapters feel actionable without mutating their purpose.  
Fails when the user does not read Chapters reliably; the planning loop becomes dependent on a reflective surface rather than running while the user is away.

Objects touched: Chapter as input and entry point; Activities/Goals as proposed output.  
Capture-first stance: no capture impact.  
Anti-pattern check: partial. It can pass only if the planning affordance is visually outside the Chapter body; otherwise it risks making Chapters feel like planning containers.

## Alternative C — Always-Ready Proposal Inbox

Kwilt maintains a quiet background proposal queue. Any time it sees enough signal — Arc drift, a finished Goal, repeated unanchored Activities, a missed routine, a Chapter closing — it adds a proposal to a "Prepared for you" review surface. The user can review proposals whenever they open Kwilt. Weekly planning is just one proposal type in a broader background-agent substrate.

Best when the strategic goal is to build the long-term Pro automation platform immediately.  
Fails when the queue starts to feel like admin work, or when proposal accumulation turns into a dashboard/inbox anti-pattern.

Objects touched: Activities, Goals, Arcs, Chapters as proposal sources; no new user-facing object required if proposals are ephemeral.  
Capture-first stance: safe, but repeated "please classify this" nudges could threaten capture-first unless capped.  
Anti-pattern check: risky. Needs strong caps and expiry, or it becomes a pending-decision queue.

## Alternative D — External AI Companion Mode

Kwilt's background job generates weekly proposals, but the main interaction is through Claude/ChatGPT. The connector exposes `list_pending_proposals`, `accept_proposal`, and `edit_proposal`, so users can ask Claude, "What did Kwilt prepare for next week?" This leans into the new connector and makes external AI the conversational review layer.

Best when the goal is to make the connector feel immediately valuable to users who already live in Claude/ChatGPT.  
Fails when proactive delivery is needed; Claude/ChatGPT cannot be assumed to push messages into old threads, and the core habit risks moving out of Kwilt.

Objects touched: proposals are Kwilt-owned; external AI only reads or confirms when asked.  
Capture-first stance: safe.  
Anti-pattern check: pass as an extension, but not as the primary product. It makes the connector too central and undercuts Kwilt-owned surfaces.

## Alternative E — Automation Rules Studio

Pro users configure background rituals: "Every Sunday, propose next week's Activities"; "When an Arc is quiet for 3 weeks, prepare a re-entry option"; "When a Chapter is generated, draft a Goal adjustment." This is the most explicit agentic automation product and could become the full Pro pillar.

Best when targeting power users who want control and understand automation rules.  
Fails when it makes Kwilt feel like Zapier for personal growth, introduces settings burden, or shifts language toward productivity tooling.

Objects touched: rules as a new configuration layer; Activities/Goals/Arcs/Chapters as triggers and outputs.  
Capture-first stance: safe if rules never block capture.  
Anti-pattern check: risky. "Rules studio" vocabulary and configuration density conflict with Kwilt's calm, no-dashboard posture.

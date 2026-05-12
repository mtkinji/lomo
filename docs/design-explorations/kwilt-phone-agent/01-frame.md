# Frame: kwilt-phone-agent

## What the user said

> I'm revising my thinking a bit here to where I want a way to have an SMS / phone number accessible agent service that helps users with their JTBD for Kwilt.

After a narrowing question, the chosen wedge was a full phone-number agent: users can text or call the number, and the first version should behave like an AI-native command center rather than SMS-only capture.

## Restated in user voice

When life happens away from the app, I want to text or call Kwilt and trust it to capture, recall, suggest, and carry forward what matters, so the life system I am building is available in the moment without giving an AI silent control over it.

## Target audience

`audience-ai-native-life-operators` — AI-native life operators who want Kwilt to be available where they already think and act.

## Representative persona

Nina wants Kwilt to operate near her life system, but only if it remains inspectable, permissioned, and reversible.

- Current situation: she uses AI and messaging surfaces constantly, but Kwilt still depends mainly on explicit app sessions and planned connector work.
- What she's trying to become/do: operate her Arcs, Goals, Activities, and Chapters from the channel closest to the moment.
- Emotional state or tension: she wants leverage, but not at the cost of privacy, surprise mutations, or vague agent behavior.
- What would make this feel wrong to her: phone prompts that nag, calls that over-interpret, transcripts stored without consent, or AI actions without preview and undo.

## Hero JTBD

`jtbd-trust-this-app-with-my-life` — Nina will only let a phone agent operate near her Kwilt system if it is transparent, permissioned, reversible, and calm.

## Job flow step

Job flow: `job-flow-nina-trust-ai-with-my-life-system`.

Underserved steps:

- Capture from tools / channels where she already thinks — score 2.
- Ask questions about Arcs, Goals, Activities, and Chapters — score 2.
- Inspect exactly what would change — score 1.
- Approve, reject, or edit changes — score 1.
- Undo or audit past actions — score 1.

Current Kwilt offering points in this direction through mobile capture, desktop strategy, MCP, and Text Coach, but full permission/preview/undo patterns remain future work.

## Active JTBDs

- `jtbd-trust-this-app-with-my-life` — the trust contract is the feature, not just a quality bar.
- `jtbd-capture-and-find-meaning` — phone input must be capture-first and never require Arc/Goal selection.
- `jtbd-carry-intentions-into-action` — the old Keep wedge proves value when Kwilt carries a thread forward.
- `jtbd-move-the-few-things-that-matter` — phone-origin loops should become Activity evidence that moves real Goals and Arcs.
- `jtbd-see-my-arcs-in-everyday-moments` — phone captures and recall should gently reconnect daily moments to identity context.

## Friction we're addressing

Kwilt currently has strong direction around mobile, desktop, Text Coach, and external AI connectors, but the owned phone-number surface is not yet framed as a parent strategy. Without that frame, SMS follow-through, voice calls, MCP tools, and Weekly Options can fork into separate agent models.

## Aspirational design challenge

How might we help Nina reach Kwilt by text or call when life happens, while preserving capture-first behavior, explicit permission, private-by-default trust, and app-canvas governance over anything the agent changes?

## Out of scope

- No autonomous outreach to third parties.
- No outbound voice calls in beta.
- No household/shared memory model in v1.
- No durable group-thread transcript capture.
- No first-class People/CRM surface before evidence demands it.
- No dashboard as the main interface.
- No auto-anchoring Activities to Arcs or Goals without confirmation.

## Open question

Should beta voice calls store full transcripts, structured summaries only, or only the resulting confirmed actions?

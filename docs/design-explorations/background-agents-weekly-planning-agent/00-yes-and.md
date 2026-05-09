# Yes-And: background-agents-weekly-planning-agent

## Original idea (restated)

Kwilt should turn the external AI connector's "bring your own LLM" pressure into a stronger Pro pillar: background agents that run Kwilt-owned rituals, especially a weekly planning agent that reviews the user's week and proposes next week's Goals or Activities for confirmation.

## Yes, and...

**Yes, and...** the weekly agent can be the forward-looking counterpart to Chapters without making Chapters planning objects.

- Serves: `jtbd-move-the-few-things-that-matter`, `jtbd-make-sense-of-the-season`
- New value: Chapters keep their retrospective identity while their observations become useful input for next-step proposals.
- Cost delta vs. original: low
- Anti-pattern check: pass, if Chapters stay read-only input and proposals live in a lightweight review surface that does not depend on the Plan feature.

**Yes, and...** the agent can turn "showing up" into a weekly ritual instead of only a daily streak.

- Serves: `jtbd-recover-when-i-drift-from-an-arc`, `jtbd-trust-this-app-with-my-life`
- New value: drift is noticed gently at the week boundary, while it is still recoverable.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if copy avoids shame, red badges, urgency styling, and forced recommitment.

**Yes, and...** Pro can become "Kwilt does quiet prep work for me" rather than "Kwilt gives me more AI calls."

- Serves: `jtbd-trust-this-app-with-my-life`, `jtbd-move-the-few-things-that-matter`
- New value: the Pro story shifts from capacity to leverage, which is harder for Claude/ChatGPT plus MCP to substitute.
- Cost delta vs. original: low
- Anti-pattern check: pass, if pricing remains honest and the agent never withholds capture or basic review.

**Yes, and...** the connector can expose proposals to Claude/ChatGPT, but not depend on Claude/ChatGPT for the proactive moment.

- Serves: `jtbd-see-my-arcs-in-everyday-moments`, `jtbd-trust-this-app-with-my-life`
- New value: external agents can read and act on pending Kwilt proposals when asked, while Kwilt owns the background schedule, notification policy, and confirmation loop.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if old Claude/ChatGPT threads are not treated as proactive delivery channels.

**Yes, and...** proposals can be scoped to existing objects: create Activities freely, propose Goals carefully, and never create Arcs silently.

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-move-the-few-things-that-matter`
- New value: the agent can help the user move without bloating the object model with a separate "plan" object.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if Activities remain the day-level plan and every Goal/Arc change requires confirmation.

**Yes, and...** the weekly ritual can reuse existing surfaces: weekly recap, Chapter digest email, push, widget, desktop later, and a dedicated in-app review surface.

- Serves: `jtbd-trust-this-app-with-my-life`, `jtbd-move-the-few-things-that-matter`
- New value: the agent feels native to Kwilt's calm ambient system rather than like a chatbot bolted onto the app.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if each surface respects app shell vs. app canvas layering and avoids dashboard summaries.

**Yes, and...** the same agent substrate can later support other background rituals, but the launch should keep one ritual narrow.

- Serves: `jtbd-trust-this-app-with-my-life`
- New value: the architecture can generalize to drift review, birthday/anniversary preparation, inbox cleanup, or collaborator nudges without making the first product feel abstract.
- Cost delta vs. original: high if generalized immediately; low if designed as an internal substrate.
- Anti-pattern check: pass, if the feature brief launches the weekly planning ritual first and treats "agent platform" as non-goal.

## Candidate-missing anchors

None recommended yet. "Help me have Kwilt prepare next steps while I'm away" is a real user need, but it fits the existing `jtbd-move-the-few-things-that-matter` anchor when proposals become Activities/Goals, and `jtbd-trust-this-app-with-my-life` when background work must be calm, transparent, and reversible.

## Frame recommendation

**Run design-thinking-loop with an expanded frame**: not "add a weekly planning agent to Chapters," but "give Kwilt a Pro background-ritual surface that uses Chapters as retrospective input and returns confirmable next-step options through a lightweight review flow."

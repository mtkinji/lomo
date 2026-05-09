# Frame: kwilt-text-coach-action-agent

## What the user said

> I already have Kwilt-keep as a separate repo that was getting into this space. Maybe now it's to fully bake this into a Kwilt-native concept? Run the design-thinking skill again on this concept.

The preceding concept was: Kwilt texts the user and becomes like a text-based coach, creating monetizable WOW moments.

## Restated in user voice

When I notice something I want to follow through on, especially in the middle of real life, I want to text Kwilt and trust it to remember, prompt, help me act, and close the loop later, so the person I want to become does not depend on me constantly opening an app and managing myself.

## JTBDs served

- `jtbd-carry-intentions-into-action` — candidate new sub-job. This is the cleanest demand-side home: the user wants trusted follow-through across time, not just planning, capture, or reflection.
- `jtbd-capture-and-find-meaning` — texting Kwilt lets intentions, commitments, and outcomes enter the system with less friction than opening the app.
- `jtbd-move-the-few-things-that-matter` — the agent turns captured intentions into real Activities and loop-closure evidence tied to important Goals and Arcs.
- `jtbd-trust-this-app-with-my-life` — the feature is only viable if permissions, outbound prompts, and action logs are transparent and reversible.
- `jtbd-invite-the-right-people-in` — relational follow-through, drafts, and future household memory sit near this job, but v1 should stay private-by-default and avoid messaging others autonomously.

```yaml
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-capture-and-find-meaning
  - jtbd-move-the-few-things-that-matter
  - jtbd-trust-this-app-with-my-life
```

## Primary design persona

**The overextended intention-holder**: someone who genuinely wants to show up for people and long-horizon priorities, but whose best intentions appear in fragments: a thought while driving, a text thread, a hard conversation, a Chapter insight, a "I should..." moment.

- Current situation: they have meaningful intentions but no reliable low-friction way to carry them forward.
- What they're trying to become/do: someone who follows through with care, especially in relationships and identity-bearing commitments.
- Emotional state or tension: they feel the weight of what matters, but managing reminders/lists/calendars feels like a second job.
- What would make this feel wrong to them: nagging, manipulative coaching, auto-sent messages, surprise data capture, or an AI pretending to be emotionally intimate.

## Friction we're addressing

Kwilt captures and reflects, but the monetizable WOW lives in the middle: the system notices an intention, turns it into a lightweight next action, prompts at the right time, helps with the activation energy, and records whether it happened. Kwilt-keep proved the channel thesis: if this works over text, it can feel magical without a dashboard.

## Aspirational design challenge

How might we help the overextended intention-holder carry meaningful intentions into trusted follow-through through a text-native Kwilt agent, while preserving capture-first, explicit permission, privacy, and the user's authorship over external actions?

## Out of scope

- No autonomous outreach to third parties in v1.
- No group-thread surveillance or durable transcript capture.
- No therapy, crisis support, or manipulative relationship coaching.
- No calendar scheduling unless the user gives Kwilt real calendar context.
- No silent Arc creation or reshaping.
- No dashboard as the primary interface.

## Open question

Should the first Kwilt-native wedge focus broadly on personal follow-through across all Arcs, or deliberately start with relational follow-through because Kwilt-keep already found the strongest SMS-native WOW moments there?

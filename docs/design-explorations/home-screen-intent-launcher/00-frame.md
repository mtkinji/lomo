# Frame: Home Screen Intent Launcher

## What the user said

> The ChatGPT widget does a great job with one primary action and several quick actions. I would like something similar that could replace Kwilt's current Chat and Focus widgets and perhaps quick-launch other parts of the app.

## Restated in user voice

When something becomes worth my attention, I want one calm place on my Home Screen that helps me ask, capture, or begin without navigating Kwilt first, so the intention survives the gap between noticing and acting.

## Target audience

`audience-burned-out-productivity-power-users` — people who already have enough tools and want less distance between deciding what matters and doing the next honest thing.

## Representative persona

Marcus has tried task managers, planning systems, and AI chats. He is capable, but every extra place to choose, classify, or maintain makes the system feel like work again.

- Current situation: a question, task, or readiness to focus becomes salient while his phone is already in hand.
- What he's trying to do: move directly from that intention into a trusted Kwilt action.
- Emotional state or tension: ready to act, but sensitive to navigation, setup, and productivity clutter.
- What would make this feel wrong: a miniature app menu, a grid of unrelated capabilities, hidden defaults, or a replacement that removes useful Focus-session state.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the surface matters when it reduces the distance between choosing what deserves attention and taking the next honest action.

## Job flow step

Step 5 in `job-flow-marcus-move-the-few-things-that-matter`: decide what to do next. It is currently scored 3. Plan and recommendations help inside Kwilt, while the Home Screen currently offers separate Chat and Focus launchers rather than one coherent answer to the moment of intent.

## Active anchors

- `jtbd-carry-intentions-into-action` — a live intention should cross into trusted follow-through before it disappears.
- `jtbd-capture-and-find-meaning` — quick capture must stay lighter than maintaining another system and must never require Arc or Goal selection first.
- `jtbd-trust-this-app-with-my-life` — the launcher must be calm, predictable, private, and truthful about what each action will do.

## Friction we're addressing

Kwilt's small Chat and Focus widgets each provide one good doorway, but together they consume the same Home Screen area as a medium widget without expressing a shared mental model. Adding more standalone launch widgets would increase choice and maintenance. The opportunity is to collapse the most common moments of intent into one coherent surface without turning it into a miniature version of the app.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: separate small Chat and Focus Home Screen widgets in the generated `KwiltWidgetsBundle`.
- Existing user flow: Chat opens `kwilt://chat?entry=fresh&mode=conversation&source=widget`; Focus opens `kwilt://focus?source=widget` into the deliberate duration-and-audio setup, then returns to the existing active Focus experience.
- Existing domain/data model: Chat delays durable thread creation until first valid send; standalone Focus uses the existing Focus runtime without fabricating an Activity or Goal.
- Existing technical affordances: WidgetKit generation, App Group state, multiple deep-link routes, widget attribution, live Focus state, and `Link`-based destinations already exist. A medium system widget can contain multiple deep links without adding mutation-capable App Intents.
- Existing UX/copy conventions: one authoritative destination per capability, explicit microphone and Focus starts, capture-first behavior, private content kept inside the app, and calm non-productivity language.

Constraints to preserve:

- The top-level surface has one clear promise; it is not a grid of Kwilt tabs.
- Chat remains the existing fresh, unsent Unified Chat entry and never auto-records or creates an empty thread.
- Focus preserves deliberate duration/audio choice before Start, plus active countdown and return-to-controls continuity.
- Quick capture never requires Arc or Goal selection.
- No private titles, prompts, financial data, household details, badges, urgency, or AI-generated suggestions appear on the Home Screen.
- Replacing the two small widgets must be a net reduction in Home Screen concepts, not merely a larger third widget added beside them.

Constraints we may challenge:

- The current one-widget-per-capability model.
- Chat's current small-card visual grammar, if a wider dominant affordance better communicates the unified job.
- Static resting content, if a bounded active-Focus state makes the combined surface more useful and truthful.

Design implication:

The ChatGPT screenshot should be treated as a hierarchy donor, not a content template: one dominant intent doorway with a few supporting modes that all serve the same job. For Kwilt, the coherent job is moving from a live intention into one of a very small number of trusted next actions. Configurable upper shortcuts should be judged by that job, not by whether every capability receives a place in the list.

## Aspirational design challenge

How might we help Marcus move from a live intention into asking, capturing, or beginning in one calm Home Screen surface, while preserving explicit choice, Focus continuity, and Kwilt's non-dashboard mental model?

## Out of scope

- A launcher for every Kwilt capability.
- User-configurable shortcut grids in the first release.
- Private or personalized content previews.
- In-widget Chat, text entry, recording, Focus start, or capability mutations.
- Replacing capability-owned screens or editors.
- Android widgets in the first learning release.

## Frame clarification

The surface's enduring promise is broader than Chat: **quick entry into the parts of Kwilt that matter most**. Chat remains the dominant visual doorway because it can interpret many kinds of intent, while Focus and Calendar provide deterministic shortcuts when the user already knows exactly where they want to go. “Calendar” means Kwilt's existing Plan day/calendar surface, not a handoff to an external calendar app.

This is therefore a Kwilt launcher, not a Chat widget with secondary modes. The coherence test is whether each destination frequently helps the user act on a live intention; capability coverage for its own sake is not a reason to earn a slot.

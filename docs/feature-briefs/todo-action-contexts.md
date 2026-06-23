---
id: brief-todo-action-contexts
title: To-Do Action Contexts
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-list-grouping-config, todo-organization-triage, dynamic-next-best-action, desktop-app]
owner: andrew
last_updated: 2026-06-23
---

# To-Do Action Contexts

## Context

A customer responding to recent organization prototypes said she wants to know what tasks fit the mode she is in: away from home, leaving the house, or sitting at a computer. This feedback does not invalidate the grouping work on the current branch. Grouping remains a good presentation feature for scanning a visible list. The new signal is that Kwilt also needs a context-of-action layer that helps the user identify the next thing to do with the least friction, whether that happens inside the app or through another surface.

## Target audience

Aspirational family organizers need Kwilt to help ordinary personal and household to-dos become doable without setup work. Context matters for this audience because real life is mode-based: errands, computer work, calls, home tasks, and waiting-on-others work become actionable at different times, and the best help may not require opening a list.

## Representative persona

Maya has a crowded Activity list with a mix of errands, household work, computer tasks, calls, scheduled items, and unanchored captures. She does not want to tune a view builder before she can act. She wants Kwilt to match the way she naturally moves through contexts and help her get to the next doable thing.

## Aspirational design challenge

How might we help Maya identify the next thing she should do with the least amount of friction based on her current context, whether Kwilt knows that context automatically or she supplies it lightly, while preserving capture-first behavior and keeping grouping as a valid scan lens rather than a new setup system?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Context-aware next actions matter because they reduce noise around the few things that can move in the user's current situation.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "See what matters" and "Know the next doable action" as 2. Kwilt can capture Activities and now has grouping work for scanning by Goal, Schedule, and Status, but it does not yet help the user identify the lowest-friction next action from practical context.

## JTBD framing

When I enter a real-life mode, I want Kwilt to help me identify the next thing I should do with the least friction, based on what the app knows or what I quickly tell it, so that captured intentions turn into action without me having to scan the whole pile or maintain a complex organization system. This primarily serves `jtbd-carry-intentions-into-action`, under the broader `jtbd-move-the-few-things-that-matter`, with support from `jtbd-capture-and-find-meaning` and `jtbd-trust-this-app-with-my-life`.

## Design

### Core behavior

Add a layered contextual action system for common situations. The system can be comprehensive without exposing every layer as visible UI. The first visible output should be one or a small number of low-friction next actions. A context-oriented Activity view is the fallback when the user wants to inspect the larger set. The existing grouping control can still organize that visible subset.

V1 context candidates:

- `Away` or `Errands`: tasks that make sense while out of the house, using tags, shopping-list type, and location metadata where available.
- `At saved place`: tasks that fit a user-confirmed place context, such as grocery, school, church, pickup/dropoff, or a frequently used store.
- `At computer`: tasks that need a computer, desk, writing, admin, browser, or focused digital work. V1 can treat opening Kwilt Desktop as the clearest context signal rather than trying to detect Mac activity from mobile.
- `Calls/messages`: follow-ups, calls, texts, emails, and reply tasks.
- `At home`: only if enough signal exists to make it useful without becoming a generic catch-all.

Context is not a grouping in V1. Context helps choose or recommend the next action; grouping sections a visible result set when a list is the right delivery channel. A user should be able to inspect `At computer` and then group those Activities by Goal, Schedule, or Status, but opening that list is not the only success path.

### System layers

1. **Signals**: tags, Activity type, location metadata, saved places, future privacy-preserving place priors, schedule, title/notes cues, priority state, current Kwilt surface such as mobile or desktop, and recent behavior.
2. **Context**: lightweight modes such as `Away`, `At saved place`, `Errands`, `At computer`, `Calls/messages`, and possibly `At home`.
3. **Next action**: one or a few low-friction Activities that fit the current context.
4. **Delivery**: Recommended card, widget/shortcut, opt-in notification, desktop prompt, agent response, or in-app view.
5. **Inspection**: context view when the user asks to see more.
6. **Scan**: grouping inside the visible list by Goal, Schedule, or Status.
7. **Correction**: "not now," "not here," remove a context, or add a lightweight signal.

Potential delivery surfaces:

- in-app Recommended card
- widget or shortcut result
- calm notification when the user has opted into a trigger
- default or prominent Kwilt Desktop surface for `At computer`
- context view when the user asks to inspect more

### Signals

Use existing Activity signals first:

- `tags`
- `type`
- `location`
- user-confirmed saved places
- title and notes cues
- schedule and reminder timing when relevant
- explicit saved-view filters
- current Kwilt surface, especially desktop vs mobile

Tags are optional evidence, not the system. A user may tag `errands`, `computer`, `calls`, or `home`, and those tags should help. But V1 should not assume users will consistently tag Activities, create tag-filtered views, remember to switch views, or maintain a personal taxonomy while they are busy.

Do not require every Activity to have a context. Unclassified Activities remain first-class in All to-dos. If a context surface shows unclassified work, use neutral language such as `No context yet`; do not imply the user failed to file it correctly. If Kwilt does not know enough about the user's current context, it should ask lightly or fall back to a general Recommended/action list rather than pretending certainty.

### Saved place suggestions

Kwilt may suggest a saved place when there is repeated task-place evidence. For example, if the user often completes or receives grocery/shopping-related Activities at the same location, Kwilt can ask: "You often do grocery tasks here. Remember this as a grocery place?" The user must confirm before the place becomes durable context.

Do not query or classify every new address just because the user dwells there. Address/place lookup should be tied to a visible value moment: an explicit location trigger, a user-selected place, or repeated task evidence that makes a saved-place suggestion useful.

### Future place priors

Kwilt may eventually learn privacy-preserving cross-user place priors, such as "users commonly do grocery-related tasks at this kind of place." This is not V1. If it ships, it should be clearly disclosed, thresholded, coarse enough to avoid exposing any individual's routine, and secondary to the user's own confirmed places.

Do not use raw cross-user coordinate/task pairs, low-sample places, household-scale patterns, or anything that could reveal that a specific user visits or completes certain kinds of tasks at a sensitive location.

### Relationship to grouping

The current grouping branch should remain valid:

- `Goal`, `Schedule`, and `Status` grouping remain presentation controls.
- Grouping should work inside context views when the user chooses to inspect a list.
- `Context` should not be added to the grouping drawer until context labels and membership rules are proven.
- If users repeatedly ask for one master list sectioned by context, revisit `Context` grouping as a follow-on.
- Tag-filtered saved views can exist as a power-user path, but they should not be the primary answer to contextual action.

### Sequencing

V1 should not ship the whole system as visible UI. A reasonable sequence:

1. Start with contextual Recommended for `Away/Errands` on mobile and computer-ready recommendations in Kwilt Desktop, powered by existing signals.
2. Add a lightweight "not now / not here" correction path.
3. Add saved-place suggestions only after repeated evidence, for example grocery/shopping tasks at the same location, and require user confirmation.
4. Add inspect-more context views after the next-action surface has credible recommendations.
5. Promote context to a durable `actionContexts` field only if widgets, desktop, agents, or recommendation logic need a shared contract.
6. Consider `Context` grouping only if users ask to scan one master list by context.

### Relationship to location triggers

Location triggers and contextual next-action help solve adjacent but different problems:

- A location trigger can surface a next action when entering or leaving a place.
- Contextual next-action help lets the user answer "what should I do while I am out?" without needing a trigger, notification, OS location permission, or perfectly timed app open.

V1 should not require location permission to make contextual next-action help useful. Location metadata can improve `Away` or place-specific suggestions when present.

### Correction path

The user needs a low-friction way to correct context membership or a wrong next-action suggestion. V1 can start with tags, saved-view filters, or recommendation feedback, but the surface should not feel like taxonomy maintenance. Candidate correction affordances:

- Add or remove a simple tag from Activity detail.
- Use an inline "Not for this context" action inside a context view.
- Use "Not now / not here" on a contextual recommendation.
- Let AI suggest a context tag, but only apply it with user confirmation.

## Success signal

Qualitatively, users say Kwilt helped them know what to do in the situation they were in, especially while away from home or sitting at a computer, without having to open the app and set up a system. Behaviorally, users act on context-aware recommendations, widgets, prompts, or context views without first editing filters, and still use grouping inside context views when they need scanability.

## Open questions

- Should V1 start as an in-app Recommended card, system views, saved-view templates, mode chips, widget/shortcut, or desktop prompt?
- Should context membership be represented only through tags/filters at first, or should Kwilt introduce an optional `actionContexts` Activity field?
- How far can Kwilt get using tags as noisy evidence before tag maintenance starts to feel like homework?
- What is the simplest correction gesture when Kwilt suggests the wrong action for a context?
- What evidence threshold should be required before suggesting "Remember this as a grocery/school/church/store place?"
- Should cross-user place priors ever be used, and if so what minimum threshold, granularity, disclosure, and opt-in model would make them trustworthy?
- What is the smallest useful `At computer` surface inside Kwilt Desktop before any Mac activity sensing or desktop presence infrastructure?
